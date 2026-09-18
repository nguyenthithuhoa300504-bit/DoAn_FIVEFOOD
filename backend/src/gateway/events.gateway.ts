import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../database/database.service';
import { ChatService } from '../chat/chat.service';
@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private lastAutoReplyTime: Map<number, number> = new Map();

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private dbService: DatabaseService,
    private chatService: ChatService,
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
  async startDeliverySimulation(
    orderId: number,
    userId: number,
    startLat: number,
    startLng: number,
    endLat: number,
    endLng: number,
  ) {
    console.log(`Bắt đầu giao đơn hàng #${orderId} cho User #${userId}...`);
    
    let routeCoords: [number, number][] = [];
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;
      const res = await fetch(url);
      const data = await res.json();
      if (data && data.code === 'Ok' && data.routes && data.routes.length > 0) {
        routeCoords = data.routes[0].geometry.coordinates; // OSRM trả về [lon, lat]
      }
    } catch (err) {
      console.error('Lỗi lấy tuyến đường OSRM, dùng fallback đường chim bay:', err);
    }

    if (routeCoords.length > 0) {
      // Đảm bảo điểm cuối cùng chính xác là điểm giao hàng
      routeCoords.push([endLng, endLat]);
      const steps = routeCoords.length;
      let currentStep = 0;
      
      // Giới hạn tổng thời gian chạy mô phỏng khoảng 30s để Khách không phải đợi lâu
      let intervalMs = Math.floor(30000 / steps);
      if (intervalMs < 800) intervalMs = 800;
      if (intervalMs > 3000) intervalMs = 3000;

      const interval = setInterval(() => {
        if (currentStep < steps) {
          const coord = routeCoords[currentStep];
          this.server.to(`room_user_${userId}`).emit('shipperLocation', {
            orderId,
            lat: coord[1],
            lng: coord[0],
            progress: (currentStep / steps) * 100,
          });
          currentStep++;
        } else {
          clearInterval(interval);
          this.finishDelivery(orderId, userId);
        }
      }, intervalMs);
    } else {
      // Fallback: Đường chim bay như cũ
      const steps = 20;
      const stepLat = (endLat - startLat) / steps;
      const stepLng = (endLng - startLng) / steps;
      let currentStep = 0;
  
      const interval = setInterval(() => {
        currentStep++;
        const currentLat = startLat + stepLat * currentStep;
        const currentLng = startLng + stepLng * currentStep;
  
        this.server.to(`room_user_${userId}`).emit('shipperLocation', {
          orderId,
          lat: currentLat,
          lng: currentLng,
          progress: (currentStep / steps) * 100,
        });
  
        if (currentStep >= steps) {
          clearInterval(interval);
          this.finishDelivery(orderId, userId);
        }
      }, 1500); // Nhích nhanh hơn chút để khách không đợi lâu
    }
  }

  private finishDelivery(orderId: number, userId: number) {
    // Tự động cập nhật DB sang Hoàn thành (và Đã thanh toán) khi đến nơi
    this.dbService
      .query(
        `UPDATE Orders SET Status = 'Hoàn thành', PaymentStatus = CASE WHEN PaymentStatus = 'Chưa thanh toán' THEN 'Đã thanh toán' ELSE PaymentStatus END WHERE OrderID = @OrderID`,
        [{ name: 'OrderID', value: orderId }],
      )
      .then(() => {
        // Phát cho tất cả mọi người (bao gồm Admin) để đồng bộ trạng thái "Hoàn thành"
        this.server.emit('orderStatusUpdate', {
          orderId,
          status: 'Hoàn thành',
        });
        this.server
          .to(`room_user_${userId}`)
          .emit('deliveryCompleted', { orderId });
        console.log(
          `Đơn hàng #${orderId} đã giao thành công và cập nhật DB.`,
        );
      })
      .catch((err) => {
        console.error(
          `Lỗi cập nhật đơn hàng #${orderId} thành Hoàn thành:`,
          err,
        );
      });
  }

  // Gửi thông báo cập nhật trạng thái đơn hàng
  notifyOrderStatusUpdate(
    userId: number,
    orderId: number,
    status: string,
    cancelReason?: string,
  ) {
    this.server.to(`room_user_${userId}`).emit('orderStatusUpdate', {
      orderId,
      status,
      cancelReason,
    });

    // Ghi vào DB thông báo luôn
    let msg = `Đơn hàng #${orderId} của bạn đã chuyển sang trạng thái: ${status}`;
    if (status === 'Đã hủy' && cancelReason) {
      msg = `Đơn hàng #${orderId} của bạn đã bị hủy với lý do: ${cancelReason}`;
    }

    this.chatService.addNotification(userId, 'Cập nhật đơn hàng', msg);
    this.server.to(`room_user_${userId}`).emit('newNotification');
  }

  // ============================================
  // CHAT REALTIME EVENTS
  // ============================================

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { receiverId: number; text: string },
  ) {
    try {
      const token = client.handshake.auth.token;
      const secret = this.configService.get<string>('JWT_SECRET');
      const decoded = this.jwtService.verify(token, { secret });
      const senderId = parseInt(decoded.sub);

      // Lưu tin nhắn vào Database
      const result = await this.chatService.saveMessage(
        senderId,
        payload.receiverId,
        payload.text,
      );

      const messageObj = {
        MessageID: result.MessageID,
        SenderID: senderId,
        ReceiverID: payload.receiverId,
        MessageText: payload.text,
        SentAt: result.SentAt,
        IsRead: false,
      };

      // Gửi lại cho người gửi (để hiển thị luôn lên UI của họ)
      client.emit('receiveMessage', messageObj);

      // Gửi cho người nhận
      this.server
        .to(`room_user_${payload.receiverId}`)
        .emit('receiveMessage', messageObj);

      // --- AUTOMATIC REPLY LOGIC ---
      if (payload.receiverId === 1 && senderId !== 1) {
        const now = Date.now();
        const lastReply = this.lastAutoReplyTime.get(senderId) || 0;

        // Gửi tự động phản hồi nếu chưa gửi trong vòng 5 phút (300000ms)
        if (now - lastReply > 300000) {
          this.lastAutoReplyTime.set(senderId, now);

          // Giả lập độ trễ đánh máy của Admin (3 giây)
          setTimeout(async () => {
            const autoReplyMsg =
              'Cảm ơn bạn đã liên hệ FIVEFOOD! Hiện tại các tư vấn viên đang bận, chúng tôi sẽ phản hồi bạn trong vài phút tới nhé. Chúc bạn một ngày vui vẻ! ❤️';
            try {
              const autoReplyResult = await this.chatService.saveMessage(
                1,
                senderId,
                autoReplyMsg,
              );
              const autoObj = {
                MessageID: autoReplyResult.MessageID,
                SenderID: 1,
                ReceiverID: senderId,
                MessageText: autoReplyResult.MessageText,
                SentAt: autoReplyResult.SentAt,
                IsRead: false,
              };

              // Gửi tin nhắn tự động tới khách hàng
              this.server
                .to(`room_user_${senderId}`)
                .emit('receiveMessage', autoObj);
              // Gửi cả tới phòng của Admin để giao diện Admin cũng cập nhật
              this.server.to(`room_user_1`).emit('receiveMessage', autoObj);
            } catch (err) {
              console.error('Error sending auto reply:', err);
            }
          }, 3000);
        }
      }
      // -----------------------------
    } catch (err) {
      console.error('Error handling sendMessage event:', err);
    }
  }

  @SubscribeMessage('typing')
  async handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { receiverId: number; isTyping: boolean },
  ) {
    try {
      const token = client.handshake.auth.token;
      const secret = this.configService.get<string>('JWT_SECRET');
      const decoded = this.jwtService.verify(token, { secret });
      const senderId = parseInt(decoded.sub);

      // Chuyển tiếp trạng thái typing đến phòng của người nhận
      this.server.to(`room_user_${payload.receiverId}`).emit('typingStatus', {
        senderId,
        isTyping: payload.isTyping,
      });
    } catch (err) {
      console.error('Error handling typing event:', err);
    }
  }
}
