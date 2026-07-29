import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { ConfigService } from '@nestjs/config';
import { OrdersService } from '../orders/orders.service';
import * as sql from 'mssql';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ChatbotService {
  private readonly logger = new Logger(ChatbotService.name);
  private apiKey: string | undefined;

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly configService: ConfigService,
    private readonly ordersService: OrdersService,
  ) {
    this.apiKey = this.configService.get<string>('GROQ_API_KEY');
    if (!this.apiKey) {
      this.logger.warn('GROQ_API_KEY is not configured in .env');
    }
  }

  async processMessage(userId: number | null, message: string, sessionId?: string) {
    if (!this.apiKey) {
      throw new InternalServerErrorException('AI Chatbot is currently unavailable due to missing API key.');
    }

    try {
      // 1. Lấy danh sách sản phẩm
      const productsQuery = `
        SELECT p.ProductID, p.ProductName, p.Price, c.CategoryName
        FROM Products p
        INNER JOIN Categories c ON p.CategoryID = c.CategoryID
        WHERE p.IsActive = 1
      `;
      const productsResult = await this.databaseService.query(productsQuery);
      const productsContext = productsResult.recordset.map(
        p => `- [ID: ${p.ProductID}] ${p.ProductName} (${p.CategoryName}): ${p.Price} đ`
      ).join('\n');

      // 2. Lấy lịch sử đơn hàng của User (nếu đã đăng nhập)
      let historyContext = '';
      if (userId) {
        const historyQuery = `
          SELECT TOP 5 p.ProductName 
          FROM OrderDetails od
          INNER JOIN Orders o ON od.OrderID = o.OrderID
          INNER JOIN Products p ON od.ProductID = p.ProductID
          WHERE o.UserID = @UserID
          ORDER BY o.OrderDate DESC
        `;
        const historyResult = await this.databaseService.query(historyQuery, [{ name: 'UserID', type: sql.Int, value: userId }]);
        if (historyResult.recordset.length > 0) {
          const pastItems = historyResult.recordset.map(r => r.ProductName).join(', ');
          historyContext = `\nKhách hàng này đã từng đặt các món sau gần đây: ${pastItems}. Bạn có thể dựa vào đây để gợi ý nếu họ hỏi hôm nay ăn gì.`;
        }
      }

      // 3. Xây dựng System Prompt
      const systemPrompt = `Bạn là trợ lý ảo thân thiện của nhà hàng FIVEFOOD. Bạn sẽ giúp khách hàng chọn món ăn, giải đáp thắc mắc và ĐẶT HÀNG.
Dưới đây là thực đơn hiện tại của nhà hàng:
${productsContext}
${historyContext}

Yêu cầu QUAN TRỌNG:
- Trả lời ngắn gọn, thân thiện, và tự nhiên bằng tiếng Việt.
- Dựa trên danh sách món ăn trên để tư vấn. Nếu khách yêu cầu món KHÔNG CÓ trong thực đơn, HÃY TỪ CHỐI LỊCH SỰ. TUYỆT ĐỐI KHÔNG tự ý thay thế bằng món khác (Ví dụ: khách gọi Pepsi nhưng menu không có, phải báo quán không bán, không được tự thay bằng Soda). Phân loại đúng món ăn theo Category.
- TUYỆT ĐỐI KHÔNG hiển thị chuỗi "[ID: ...]" hoặc mã ID món ăn trong nội dung chat với khách.
- Khi khách hàng muốn ĐẶT MÓN (hoặc thêm vào giỏ hàng), BẮT BUỘC phải xuất ra chuỗi sau ở CUỐI tin nhắn của bạn để hệ thống tự động đưa món vào giỏ hàng: 
[CART_INTENT: {"items": [{"id": <ProductID>, "qty": <số lượng>}]}]
- VÍ DỤ MẪU (BẮT BUỘC LÀM THEO NẾU CÓ YÊU CẦU ĐẶT MÓN):
Khách: "Cho mình 1 trà sữa (có ID là 3) và 2 pizza (có ID là 5)"
Bạn: "Dạ vâng, mình đã thêm món vào giỏ hàng cho bạn rồi nhé. Bạn vui lòng vào Giỏ hàng để thanh toán nha.
[CART_INTENT: {"items": [{"id": 3, "qty": 1}, {"id": 5, "qty": 2}]}]"
- CHỈ xuất chuỗi CART_INTENT khi xác định được ID món ăn. Đừng bao giờ giải thích về chuỗi này cho khách.`;

      // 3.5 Lấy lịch sử chat (nếu có sessionId) để AI nhớ ngữ cảnh
      const chatMessages: any[] = [
        { role: 'system', content: systemPrompt }
      ];

      if (sessionId) {
        const chatLogsQuery = `
          SELECT TOP 6 ConversationData
          FROM ChatbotLogs
          WHERE SessionID = @SessionID
          ORDER BY CreatedAt DESC
        `;
        const chatLogsResult = await this.databaseService.query(chatLogsQuery, [{ name: 'SessionID', type: sql.VarChar(100), value: sessionId }]);
        if (chatLogsResult.recordset.length > 0) {
          // Lật ngược lại để đưa vào AI theo đúng thứ tự thời gian (cũ nhất -> mới nhất)
          const historyRows = chatLogsResult.recordset.reverse();
          for (const row of historyRows) {
            try {
              const parsed = JSON.parse(row.ConversationData);
              if (parsed.userMessage) chatMessages.push({ role: 'user', content: parsed.userMessage });
              if (parsed.botResponse) chatMessages.push({ role: 'assistant', content: parsed.botResponse });
            } catch(e) {}
          }
        }
      }
      chatMessages.push({ role: 'user', content: message });

      // 4. Gọi AI
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: chatMessages,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        this.logger.error(`Groq API Error: ${errorData}`);
        throw new Error('Groq API returned an error');
      }

      const data = await response.json();
      let responseText = data.choices[0].message.content;
      let isOrderPlaced = false;

      // 5. Kiểm tra và Xử lý Thêm vào giỏ hàng tự động
      const cartMatch = responseText.match(/\[CART_INTENT:\s*(\{.*\})\]/s);
      if (cartMatch && userId) {
        try {
          const intentData = JSON.parse(cartMatch[1]);
          if (intentData.items && intentData.items.length > 0) {
            
            // Thêm các món vào giỏ hàng (Cộng dồn nếu đã có)
            for (const item of intentData.items) {
              const checkCart = await this.databaseService.query(
                'SELECT CartItemID, Quantity FROM CartItems WHERE UserID = @UserID AND ProductID = @ProductID',
                [
                  { name: 'UserID', type: sql.Int, value: userId },
                  { name: 'ProductID', type: sql.Int, value: item.id }
                ]
              );
              
              if (checkCart.recordset.length > 0) {
                // Đã có -> cộng dồn
                const newQty = checkCart.recordset[0].Quantity + item.qty;
                await this.databaseService.query(
                  'UPDATE CartItems SET Quantity = @Quantity, UpdatedAt = GETDATE() WHERE UserID = @UserID AND ProductID = @ProductID',
                  [
                    { name: 'Quantity', type: sql.Int, value: newQty },
                    { name: 'UserID', type: sql.Int, value: userId },
                    { name: 'ProductID', type: sql.Int, value: item.id }
                  ]
                );
              } else {
                // Chưa có -> thêm mới
                await this.databaseService.query(
                  'INSERT INTO CartItems (UserID, ProductID, Quantity, UpdatedAt) VALUES (@UserID, @ProductID, @Quantity, GETDATE())',
                  [
                    { name: 'UserID', type: sql.Int, value: userId },
                    { name: 'ProductID', type: sql.Int, value: item.id },
                    { name: 'Quantity', type: sql.Int, value: item.qty }
                  ]
                );
              }
            }

            isOrderPlaced = true; // Vẫn giữ nguyên tên biến cờ để Frontend kích hoạt event 'cartUpdated'
            // Thay thế đoạn code ẩn bằng thông báo thành công cho người dùng
            responseText = responseText.replace(cartMatch[0], '\n\n✅ **Đã thêm món vào giỏ hàng thành công!** Vui lòng bấm vào biểu tượng Giỏ hàng để hoàn tất thanh toán nhé.');
          }
        } catch (err) {
          this.logger.error('Lỗi khi tự động thêm giỏ hàng từ Chatbot', err);
          responseText = responseText.replace(cartMatch[0], '\n\n❌ Xin lỗi bạn, quá trình tự động thêm vào giỏ hàng đã xảy ra lỗi. Vui lòng thử lại bằng tay trên website nhé!');
        }
      } else if (cartMatch && !userId) {
        // Có ý định đặt hàng nhưng khách chưa đăng nhập
        responseText = responseText.replace(cartMatch[0], '\n\n❌ Bạn cần **Đăng nhập** để AI có thể tự động thêm vào giỏ hàng cho bạn nhé!');
      }

      // 6. Lưu vào Log
      const currentSessionId = sessionId || uuidv4();
      const conversationData = JSON.stringify({
        userMessage: message,
        botResponse: responseText,
        timestamp: new Date().toISOString(),
        orderPlaced: isOrderPlaced
      });

      const insertQuery = `
        INSERT INTO ChatbotLogs (UserID, SessionID, ConversationData)
        VALUES (@UserID, @SessionID, @ConversationData)
      `;
      
      await this.databaseService.query(insertQuery, [
        { name: 'UserID', type: sql.Int, value: userId || null },
        { name: 'SessionID', type: sql.VarChar(100), value: currentSessionId },
        { name: 'ConversationData', type: sql.NVarChar(sql.MAX), value: conversationData }
      ]);

      return {
        reply: responseText,
        sessionId: currentSessionId,
        orderPlaced: isOrderPlaced
      };
    } catch (error) {
      this.logger.error('Error in processMessage', error);
      throw new InternalServerErrorException('Failed to process message with AI');
    }
  }

  async getLogs() {
    try {
      const query = `
        SELECT c.LogID, c.SessionID, c.ConversationData, c.CreatedAt, u.FullName, u.Email
        FROM ChatbotLogs c
        LEFT JOIN Users u ON c.UserID = u.UserID
        ORDER BY c.CreatedAt DESC
      `;
      const result = await this.databaseService.query(query);
      return result.recordset.map(row => {
        let parsedData = {};
        try {
          parsedData = JSON.parse(row.ConversationData);
        } catch (e) {
          parsedData = { userMessage: '', botResponse: 'Lỗi đọc dữ liệu' };
        }
        return {
          LogID: row.LogID,
          SessionID: row.SessionID,
          CreatedAt: row.CreatedAt,
          FullName: row.FullName || 'Khách vãng lai',
          Email: row.Email || '',
          ...parsedData
        };
      });
    } catch (error) {
      this.logger.error('Error fetching chatbot logs', error);
      throw new InternalServerErrorException('Failed to fetch chatbot logs');
    }
  }
}
