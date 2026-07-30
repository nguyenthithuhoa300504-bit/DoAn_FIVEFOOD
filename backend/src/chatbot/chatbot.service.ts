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
      // 1. Lấy danh sách sản phẩm kèm lượt bán (TotalSold) để AI biết món nào Best-seller
      const productsQuery = `
        SELECT p.ProductID, p.ProductName, p.Price, c.CategoryName, 
               COALESCE(SUM(od.Quantity), 0) AS TotalSold
        FROM Products p
        INNER JOIN Categories c ON p.CategoryID = c.CategoryID
        LEFT JOIN OrderDetails od ON p.ProductID = od.ProductID
        WHERE p.IsActive = 1
        GROUP BY p.ProductID, p.ProductName, p.Price, c.CategoryName
        ORDER BY TotalSold DESC
      `;
      const productsResult = await this.databaseService.query(productsQuery);
      const productsContext = productsResult.recordset.map(
        p => `- [ID: ${p.ProductID}] ${p.ProductName} (${p.CategoryName}): ${p.Price} đ | Đã bán: ${p.TotalSold}`
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

      // 2.5 Lấy thông tin Giỏ hàng hiện tại của User
      let cartContext = '';
      if (userId) {
        const cartQuery = `
          SELECT p.ProductName, c.Quantity, p.Price
          FROM CartItems c
          INNER JOIN Products p ON c.ProductID = p.ProductID
          WHERE c.UserID = @UserID
        `;
        const cartResult = await this.databaseService.query(cartQuery, [{ name: 'UserID', type: sql.Int, value: userId }]);
        if (cartResult.recordset.length > 0) {
          const currentCart = cartResult.recordset.map(r => `${r.Quantity}x ${r.ProductName} (Giá: ${r.Price} đ)`).join(', ');
          const subtotal = cartResult.recordset.reduce((sum, r) => sum + (r.Price * r.Quantity), 0);
          const shippingFee = 15000;
          const totalAmount = subtotal + shippingFee;
          cartContext = `\nGiỏ hàng HIỆN TẠI của khách đang có: ${currentCart}.\nTổng tiền món: ${subtotal} đ. Phí vận chuyển: ${shippingFee} đ. TỔNG THANH TOÁN (chưa trừ voucher): ${totalAmount} đ.`;
        } else {
          cartContext = `\nGiỏ hàng HIỆN TẠI của khách đang TRỐNG.`;
        }
      }

      // 2.6 Lấy danh sách Khuyến mãi (Voucher)
      const promoQuery = `
        SELECT PromoCode, Description, MinOrderValue
        FROM Promotions
        WHERE GETDATE() BETWEEN StartDate AND EndDate
          AND UsedCount < UsageLimit
      `;
      const promoResult = await this.databaseService.query(promoQuery);
      let promoContext = '';
      if (promoResult.recordset.length > 0) {
        const promos = promoResult.recordset.map(p => `- Mã "${p.PromoCode}": ${p.Description} (Áp dụng cho đơn từ ${p.MinOrderValue} đ)`).join('\n');
        promoContext = `\nCửa hàng đang có các mã giảm giá sau:\n${promos}\nAI hãy tư vấn mã giảm giá phù hợp với Tổng tiền món hiện tại của khách.`;
      }

      // 2.7 Lấy trạng thái đơn hàng gần nhất (Order Tracking)
      let orderTrackingContext = '';
      if (userId) {
        const trackingQuery = `
          SELECT TOP 2 OrderID, OrderDate, FinalAmount, Status
          FROM Orders
          WHERE UserID = @UserID
          ORDER BY OrderDate DESC
        `;
        const trackingResult = await this.databaseService.query(trackingQuery, [{ name: 'UserID', type: sql.Int, value: userId }]);
        if (trackingResult.recordset.length > 0) {
          const trackingInfo = trackingResult.recordset.map((o, index) => {
            const time = new Date(o.OrderDate).toLocaleString('vi-VN');
            const label = index === 0 ? "ĐƠN HÀNG MỚI NHẤT" : "ĐƠN HÀNG TRƯỚC ĐÓ";
            return `- [${label}] Mã đơn: #${o.OrderID} | Đặt lúc: ${time} | Tổng tiền: ${o.FinalAmount} đ | TRẠNG THÁI HIỆN TẠI: ${o.Status}`;
          }).join('\n');
          orderTrackingContext = `\nTình trạng các đơn hàng của khách (Real-time Database):\n${trackingInfo}\nTUYỆT ĐỐI DỰA VÀO ĐÂY ĐỂ BÁO CÁO TRẠNG THÁI ĐƠN HÀNG MỚI NHẤT NẾU KHÁCH HỎI, KHÔNG SỬ DỤNG TRÍ NHỚ TỪ CÁC CÂU CHAT CŨ.`;
        }
      }

      // 2.8 Thời gian thực (Time Context)
      const now = new Date();
      const timeString = now.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
      const hour = now.getHours();
      let sessionOfDay = 'Tối';
      if (hour >= 5 && hour < 11) sessionOfDay = 'Sáng';
      else if (hour >= 11 && hour < 14) sessionOfDay = 'Trưa';
      else if (hour >= 14 && hour < 18) sessionOfDay = 'Chiều';
      const timeContext = `\nBây giờ là: ${timeString} (Buổi ${sessionOfDay}). Hãy dựa vào đây để chào hỏi và gợi ý món ăn phù hợp với thời gian.`;

      // 3. Xây dựng System Prompt
      const systemPrompt = `Bạn là trợ lý ảo thân thiện của nhà hàng FIVEFOOD. Bạn sẽ giúp khách hàng chọn món ăn, giải đáp thắc mắc và ĐẶT HÀNG.
Dưới đây là thực đơn hiện tại của nhà hàng:
${productsContext}
${historyContext}
${cartContext}
${promoContext}
${orderTrackingContext}
${timeContext}

Yêu cầu QUAN TRỌNG:
- Trả lời ngắn gọn, thân thiện, và tự nhiên bằng tiếng Việt.
- TÂM LÝ GỢI Ý MÓN ĂN: Khi khách nhờ tư vấn, hãy đan xen 50/50: Đề xuất 1 món "Bán chạy" (lượt "Đã bán" cao) để tạo cảm giác an toàn, VÀ 1 món bán chậm hơn kèm lời giới thiệu hấp dẫn (ví dụ: "hương vị độc đáo", "rất đáng thử") để giúp đẩy hàng. KHÔNG bao giờ chê món bán ít.
- BÁN CHÉO (UPSELL): Khi khách vừa chọn 1 món chính (VD: Pizza, Phở), hãy luôn khéo léo mời thêm 1 món nước uống hoặc ăn vặt phù hợp để tăng doanh thu.
- NHẮC NHỞ GIỎ HÀNG CŨ: Khi khách yêu cầu đặt món mới, hãy để ý xem "Giỏ hàng HIỆN TẠI" của khách có đang chứa món ăn nào khác từ trước không. Nếu có, sau khi nhận lệnh thêm món mới, hãy nhắc khéo khách: "Trong giỏ hàng của bạn đang có sẵn [tên món cũ], bạn có muốn thanh toán tất cả luôn không?".
- TÔN TRỌNG KHẨU VỊ & DỊ ỨNG: Ghi nhớ tuyệt đối các yêu cầu về ăn chay, không cay, dị ứng... của khách. KHÔNG BAO GIỜ gợi ý các món vi phạm yêu cầu đó.
- Dựa trên danh sách món ăn trên để tư vấn. Nếu khách yêu cầu món KHÔNG CÓ trong thực đơn, HÃY TỪ CHỐI LỊCH SỰ. TUYỆT ĐỐI KHÔNG tự ý thay thế bằng món khác.
- TUYỆT ĐỐI KHÔNG hiển thị chuỗi "[ID: ...]" hoặc mã ID món ăn trong nội dung chat với khách.
- Khi khách hàng muốn ĐẶT MÓN hoặc CHỌN MÓN TỪ GỢI Ý (thêm vào giỏ), BẮT BUỘC xuất ra ở cuối: 
[CART_INTENT: {"items": [{"id": <ProductID>, "qty": <số lượng>}]}]
- Khi khách hàng muốn XÓA/DỌN SẠCH giỏ hàng, xuất ra ở cuối: 
[CLEAR_CART_INTENT]
- Khi khách hàng muốn THANH TOÁN / CHỐT ĐƠN / ĐẶT HÀNG, nếu trong câu nói khách ĐÃ CUNG CẤP ĐỊA CHỈ, BẠN PHẢI NGAY LẬP TỨC XUẤT RA CHUỖI NÀY Ở CUỐI TIN NHẮN (để hệ thống tạo đơn): 
[CHECKOUT_INTENT: {"address": "<địa chỉ giao hàng>", "promoCode": "<mã giảm giá>"}]
(promoCode có thể để rỗng "" nếu khách không xài mã. TUYỆT ĐỐI KHÔNG HỎI LẠI ĐỂ XÁC NHẬN! PHẢI XUẤT MÃ [CHECKOUT_INTENT] NGAY LẬP TỨC ĐỂ CHỐT ĐƠN). Nếu khách chưa cho địa chỉ, hãy hỏi xin địa chỉ.
- Khi khách hàng yêu cầu HỦY ĐƠN HÀNG, hãy xác định mã Hóa đơn và xuất ra ở cuối:
[CANCEL_ORDER_INTENT: {"orderId": <Mã đơn>}]

VÍ DỤ MẪU (BẮT BUỘC LÀM THEO):
Khách: "Cho 1 trà sữa (có ID là 3)" -> Bạn: "Dạ vâng... [CART_INTENT: {"items": [{"id": 3, "qty": 1}]}]"
Khách: "Xóa hết giỏ hàng đi" -> Bạn: "Dạ vâng... [CLEAR_CART_INTENT]"
Khách: "Thanh toán giao tới 123 ABC, xài mã GIAMGIA10" -> Bạn: "Dạ vâng... [CHECKOUT_INTENT: {"address": "123 ABC", "promoCode": "GIAMGIA10"}]"
Khách: "Hủy cho tôi đơn 10015" -> Bạn: "Dạ vâng... [CANCEL_ORDER_INTENT: {"orderId": 10015}]"

CHỈ xuất mã ngầm khi chắc chắn. Đừng bao giờ giải thích về mã ngầm này cho khách.`;

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

      // 5.2 Xử lý Xóa giỏ hàng tự động
      const clearCartMatch = responseText.match(/\[CLEAR_CART_INTENT\]/);
      if (clearCartMatch && userId) {
        try {
          await this.databaseService.query('DELETE FROM CartItems WHERE UserID = @UserID', [{ name: 'UserID', type: sql.Int, value: userId }]);
          isOrderPlaced = true;
          responseText = responseText.replace(clearCartMatch[0], '\n\n✅ **Đã dọn sạch giỏ hàng thành công!**');
        } catch (err) {
          this.logger.error('Lỗi khi xóa giỏ hàng từ Chatbot', err);
          responseText = responseText.replace(clearCartMatch[0], '\n\n❌ Quá trình xóa giỏ hàng đã xảy ra lỗi.');
        }
      } else if (clearCartMatch && !userId) {
        responseText = responseText.replace(clearCartMatch[0], '\n\n❌ Bạn cần **Đăng nhập** để AI thao tác nhé!');
      }

      // 5.3 Xử lý Thanh toán (Checkout) tự động
      const checkoutMatch = responseText.match(/\[CHECKOUT_INTENT:\s*(\{.*\})\]/s);
      if (checkoutMatch && userId) {
        try {
          const intentData = JSON.parse(checkoutMatch[1]);
          if (intentData.address) {
            // Check nếu giỏ hàng rỗng
            const cartCheck = await this.databaseService.query('SELECT COUNT(*) as count FROM CartItems WHERE UserID = @UserID', [{ name: 'UserID', type: sql.Int, value: userId }]);
            if (cartCheck.recordset[0].count === 0) {
              responseText = responseText.replace(checkoutMatch[0], '\n\n❌ **Giỏ hàng của bạn đang trống!** Vui lòng thêm món trước khi thanh toán.');
            } else {
              const appliedPromo = intentData.promoCode ? intentData.promoCode : null;
              await this.ordersService.createOrder(userId, intentData.address, null, null, 'Tiền mặt', appliedPromo, 15000);
              isOrderPlaced = true;
              let successMsg = '\n\n✅ **Đặt hàng thành công!** Đơn hàng của bạn sẽ sớm được giao đến: ' + intentData.address;
              if (appliedPromo) {
                successMsg += ` (Đã áp dụng mã giảm giá ${appliedPromo}).`;
              }
              responseText = responseText.replace(checkoutMatch[0], successMsg);
            }
          }
        } catch (err) {
          this.logger.error('Lỗi khi checkout từ Chatbot', err);
          responseText = responseText.replace(checkoutMatch[0], '\n\n❌ Quá trình thanh toán xảy ra lỗi, bạn vui lòng tự bấm nút Thanh Toán nhé!');
        }
      } else if (checkoutMatch && !userId) {
        responseText = responseText.replace(checkoutMatch[0], '\n\n❌ Bạn cần **Đăng nhập** để AI đặt hàng nhé!');
      }

      // 5.4 Xử lý Hủy đơn hàng tự động
      const cancelMatch = responseText.match(/\[CANCEL_ORDER_INTENT:\s*(\{.*\})\]/s);
      if (cancelMatch && userId) {
        try {
          const intentData = JSON.parse(cancelMatch[1]);
          if (intentData.orderId) {
            await this.ordersService.cancelOrder(userId, intentData.orderId);
            responseText = responseText.replace(cancelMatch[0], `\n\n✅ **Hủy đơn hàng thành công!** Đơn hàng #${intentData.orderId} của bạn đã được hủy.`);
            // Emit signal to frontend if necessary, although it might just rely on normal polling/websocket.
          }
        } catch (err) {
          responseText = responseText.replace(cancelMatch[0], `\n\n❌ **Không thể hủy đơn hàng!** Lý do: ${err.message || 'Chỉ có thể hủy đơn khi đang Chờ xác nhận.'}`);
        }
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
