import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../database/database.service';
import { ChatService } from '../chat/chat.service';
import * as sql from 'mssql';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private dbService: DatabaseService,
    private chatService: ChatService
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token;
      if (!token) {
        client.disconnect();
        return;
      }
      
      const secret = this.configService.get<string>('JWT_SECRET');
      const payload = this.jwtService.verify(token, { secret });
      const userId = payload.sub; // UserID
      
      // Cho user join vào một room riêng để gửi dữ liệu cá nhân
      client.join(`room_user_${userId}`);
      console.log(`Client connected: ${client.id} - UserID: ${userId}`);
    } catch (err) {
      console.log('Client connected with invalid token, disconnecting...');
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  // Bắt đầu mô phỏng Shipper chạy
  startDeliverySimulation(orderId: number, userId: number, startLat: number, startLng: number, endLat: number, endLng: number) {
    const steps = 20; // Tổng số bước
    const stepLat = (endLat - startLat) / steps;
    const stepLng = (endLng - startLng) / steps;
    let currentStep = 0;
    
    console.log(`Bắt đầu giao đơn hàng #${orderId} cho User #${userId}...`);

    const interval = setInterval(() => {
      currentStep++;
      const currentLat = startLat + (stepLat * currentStep);
      const currentLng = startLng + (stepLng * currentStep);

      // Phát sự kiện tọa độ mới tới phòng user
      this.server.to(`room_user_${userId}`).emit('shipperLocation', {
        orderId,
        lat: currentLat,
        lng: currentLng,
        progress: (currentStep / steps) * 100
      });

      if (currentStep >= steps) {
        clearInterval(interval);
        
        // Tự động cập nhật DB sang Hoàn thành (và Đã thanh toán) khi đến nơi
        this.dbService.query(
          `UPDATE Orders SET Status = N'Hoàn thành', PaymentStatus = CASE WHEN PaymentStatus = N'Chưa thanh toán' THEN N'Đã thanh toán' ELSE PaymentStatus END WHERE OrderID = @OrderID`,
          [{ name: 'OrderID', type: sql.Int, value: orderId }]
        ).then(() => {
          this.server.to(`room_user_${userId}`).emit('orderStatusUpdate', {
            orderId,
            status: 'Hoàn thành'
          });
          this.server.to(`room_user_${userId}`).emit('deliveryCompleted', { orderId });
          console.log(`Đơn hàng #${orderId} đã giao thành công và cập nhật DB.`);
        }).catch(err => {
          console.error(`Lỗi cập nhật đơn hàng #${orderId} thành Hoàn thành:`, err);
        });
      }
    }, 3000); // Cứ mỗi 3 giây nhích 1 đoạn, 20 bước -> 60 giây
  }

  // Gửi thông báo cập nhật trạng thái đơn hàng
  notifyOrderStatusUpdate(userId: number, orderId: number, status: string) {
    this.server.to(`room_user_${userId}`).emit('orderStatusUpdate', {
      orderId,
      status
    });
    
    // Ghi vào DB thông báo luôn
    this.chatService.addNotification(userId, 'Cập nhật đơn hàng', `Đơn hàng #${orderId} của bạn đã chuyển sang trạng thái: ${status}`);
    this.server.to(`room_user_${userId}`).emit('newNotification');
  }

  // ============================================
  // CHAT REALTIME EVENTS
  // ============================================

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { receiverId: number; text: string }
  ) {
    try {
      const token = client.handshake.auth.token;
      const secret = this.configService.get<string>('JWT_SECRET');
      const decoded = this.jwtService.verify(token, { secret });
      const senderId = parseInt(decoded.sub);

      // Lưu tin nhắn vào Database
      const result = await this.chatService.saveMessage(senderId, payload.receiverId, payload.text);

      const messageObj = {
        MessageID: result.MessageID,
        SenderID: senderId,
        ReceiverID: payload.receiverId,
        MessageText: payload.text,
        SentAt: result.SentAt,
        IsRead: false
      };

      // Gửi lại cho người gửi (để hiển thị luôn lên UI của họ)
      client.emit('receiveMessage', messageObj);
      
      // Gửi cho người nhận
      this.server.to(`room_user_${payload.receiverId}`).emit('receiveMessage', messageObj);
    } catch (err) {
      console.error('Error handling sendMessage event:', err);
    }
  }

  @SubscribeMessage('typing')
  async handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { receiverId: number; isTyping: boolean }
  ) {
    try {
      const token = client.handshake.auth.token;
      const secret = this.configService.get<string>('JWT_SECRET');
      const decoded = this.jwtService.verify(token, { secret });
      const senderId = parseInt(decoded.sub);

      // Chuyển tiếp trạng thái typing đến phòng của người nhận
      this.server.to(`room_user_${payload.receiverId}`).emit('typingStatus', {
        senderId,
        isTyping: payload.isTyping
      });
    } catch (err) {
      console.error('Error handling typing event:', err);
    }
  }
}
