import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { ConfigService } from '@nestjs/config';
import { OrdersService } from '../orders/orders.service';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ChatbotService {
  private readonly logger = new Logger(ChatbotService.name);
  private apiKey: string | undefined;

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly configService: ConfigService,
    private readonly ordersService: OrdersService,
  ) {
    this.apiKey = this.configService.get<string>('DEEPSEEK_API_KEY');
    if (!this.apiKey) {
      this.logger.warn('DEEPSEEK_API_KEY is not configured in .env');
    }
  }

  async processMessage(
    userId: number | null,
    message: string,
    sessionId?: string,
    localCart?: any[],
  ) {
    if (!this.apiKey) {
      throw new InternalServerErrorException(
        'AI Chatbot is currently unavailable due to missing API key.',
      );
    }

    try {
      let newLocalCartToReturn: any[] | null = null;
      let richContent: any = null;

      // 1. Lấy toàn bộ danh sách sản phẩm kèm thành phần (Ingredients) và tồn kho (Inventory) để AI tư vấn theo giá, vị cay, chay, đồ uống...
      const productsQuery = `
        SELECT p.ProductID, p.ProductName, p.Price, p.Ingredients, p.Inventory, p.ImageURL, c.CategoryName
        FROM Products p
        INNER JOIN Categories c ON p.CategoryID = c.CategoryID
        WHERE p.IsActive = 1
        ORDER BY p.ProductID ASC
      `;
      const productsResult = await this.databaseService.query(productsQuery);
      // Format siêu gọn nhưng đầy đủ thuộc tính cho AI tư vấn chi tiết (Tiết kiệm 60% Token cho Groq)
      const productsContext = productsResult.recordset
        .map((p) => {
          const ing = p.Ingredients
            ? p.Ingredients.length > 50
              ? p.Ingredients.substring(0, 50) + '...'
              : p.Ingredients
            : 'N/A';
          const status = p.Inventory <= 0 ? ' [HẾT HÀNG]' : '';
          return `ID=${p.ProductID}|${p.ProductName}|Giá:${p.Price}đ|Thành phần:${ing}${status}`;
        })
        .join('\n');

      // 1.5 Lấy thông tin tài khoản khách hàng (nếu đã đăng nhập) để AI biết tên và xưng hô thân thiết
      let userContext =
        '\nKHÁCH HÀNG HIỆN TẠI: Khách vãng lai (Chưa đăng nhập tài khoản).';
      if (userId) {
        try {
          const userQuery = `SELECT FullName, Email FROM Users WHERE UserID = @UserID`;
          const userResult = await this.databaseService.query(userQuery, [
            { name: 'UserID',  value: userId },
          ]);
          if (userResult.recordset.length > 0) {
            const u = userResult.recordset[0];
            userContext = `\nKHÁCH HÀNG HIỆN TẠI: "${u.FullName}" (Email: ${u.Email}).\n👉 YÊU CẦU XƯNG HÔ CỦA AI: Khi trò chuyện bình thường hoặc tư vấn món, hãy gọi khách bằng tên "${u.FullName}". TUY NHIÊN, khi khách xuất hiện ý định THÊM MÓN VÀO GIỎ, THANH TOÁN hoặc XÓA GIỎ, bạn BẮT BUỘC CHỈ XUẤT ĐÚNG MÃ LỆNH KỸ THUẬT ([CART_INTENT], [CHECKOUT_INTENT], [CLEAR_CART_INTENT]) VÀ IM LẶNG, TUYỆT ĐỐI KHÔNG CHÀO HỌA HAY GIẢI THÍCH DỀ DÀ!`;
          }
        } catch (e) {
          this.logger.warn(
            'Không thể tải thông tin user cho chatbot:',
            e.message,
          );
        }
      }

      // 2. Lấy lịch sử đơn hàng của User (nếu đã đăng nhập)
      let historyContext = '';
      if (userId) {
        try {
          const historyQuery = `
            SELECT TOP 5 p.ProductName 
            FROM OrderDetails od
            INNER JOIN Orders o ON od.OrderID = o.OrderID
            INNER JOIN Products p ON od.ProductID = p.ProductID
            WHERE o.UserID = @UserID
            ORDER BY o.OrderDate DESC
          `;
          const historyResult = await this.databaseService.query(historyQuery, [
            { name: 'UserID',  value: userId },
          ]);
          if (historyResult.recordset.length > 0) {
            const pastItems = historyResult.recordset
              .map((r) => r.ProductName)
              .join(', ');
            historyContext = `\nLỊCH SỬ ĐƠN HÀNG ĐÃ MUA TRONG QUÁ KHỨ (KHÔNG PHẢI GIỎ HÀNG HIỆN TẠI): ${pastItems}. Chỉ dùng để gợi ý món ăn khi khách hỏi "hôm nay ăn gì", KHÔNG PHẢI món đang nằm trong giỏ hàng hiện tại.`;
          }
        } catch (e) {
          this.logger.warn(
            'Không thể tải lịch sử đơn hàng cho chatbot:',
            e.message,
          );
        }
      }

      // 2.5 Lấy thông tin Giỏ hàng hiện tại của User
      let cartContext = '';
      let cartItemsData: any[] = [];
      let subtotalData: number = 0;
      if (userId) {
        try {
          const cartQuery = `
            SELECT p.ProductID, p.ProductName, c.Quantity, p.Price
            FROM CartItems c
            INNER JOIN Products p ON c.ProductID = p.ProductID
            WHERE c.UserID = @UserID
          `;
          const cartResult = await this.databaseService.query(cartQuery, [
            { name: 'UserID',  value: userId },
          ]);
          if (cartResult.recordset.length > 0) {
            // Liệt kê rõ từng món kèm ID để AI đọc đúng
            const cartLines = cartResult.recordset
              .map(
                (r) =>
                  `- ${r.Quantity}x ${r.ProductName} (ID sản phẩm=${r.ProductID}, Giá:${r.Price}đ)`,
              )
              .join('\n');
            cartItemsData = cartResult.recordset;
            subtotalData = cartResult.recordset.reduce(
              (sum, r) => sum + r.Price * r.Quantity,
              0,
            );
            const shippingFee = 15000;
            const totalAmount = subtotalData + shippingFee;
            cartContext = `\n\n=== GIỎ HÀNG HIỆN TẠI ĐANG CÓ SẴN (${cartResult.recordset.length} món) ===\n${cartLines}\nTổng: ${subtotalData}đ | Ship: ${shippingFee}đ | Tổng TT: ${totalAmount}đ\n⚠️ LƯU Ý TỐI QUAN TRỌNG CHO AI: Đây là danh sách món ĐÃ CÓ SẴN trong giỏ từ trước. Khi khách nhắn xin THÊM MÓN MỚI (ví dụ: "thêm 1 phở bò"), bạn TUYỆT ĐỐI KHÔNG mang các món trong bảng này ra xuất lại vào lệnh [CART_INTENT], mà chỉ xuất DUY NHẤT món mới khách vừa nhắn ở câu hiện tại!\n===================================`;
          } else {
            cartContext = `\n\n=== GIỎ HÀNG HIỆN TẠI: TRỐNG ===`;
          }
        } catch (e) {
          this.logger.warn('Không thể tải giỏ hàng cho chatbot:', e.message);
        }
      } else if (localCart && localCart.length > 0) {
        const cartLines = localCart
          .map(
            (r) =>
              `- ${r.Quantity}x ${r.ProductName} (ID sản phẩm=${r.ProductID}, Giá:${r.Price}đ)`,
          )
          .join('\n');
        cartItemsData = localCart;
        subtotalData = localCart.reduce(
          (sum, r) => sum + r.Price * r.Quantity,
          0,
        );
        const shippingFee = 15000;
        const totalAmount = subtotalData + shippingFee;
        cartContext = `\n\n=== GIỎ HÀNG TẠM (GUEST) ĐANG CÓ SẴN (${localCart.length} món) ===\n${cartLines}\nTổng: ${subtotalData}đ | Ship: ${shippingFee}đ | Tổng TT: ${totalAmount}đ\n⚠️ LƯU Ý TỐI QUAN TRỌNG CHO AI: Đây là danh sách món ĐÃ CÓ SẴN trong giỏ tạm từ trước. Khi khách nhắn xin THÊM MÓN MỚI, bạn TUYỆT ĐỐI KHÔNG xuất lại món cũ vào lệnh [CART_INTENT]!\n===================================`;
      } else {
        cartContext = `\n\n=== GIỎ HÀNG TẠM: TRỐNG ===`;
      }

      // 2.6 Lấy danh sách Khuyến mãi (Voucher)
      let promoContext = '';
      let availablePromos: any[] = [];
      try {
        const promoQuery = `
          SELECT PromoCode, Description, MinOrderValue
          FROM Promotions
          WHERE GETDATE() BETWEEN StartDate AND EndDate
            AND UsedCount < UsageLimit
        `;
        const promoResult = await this.databaseService.query(promoQuery);
        if (promoResult.recordset.length > 0) {
          availablePromos = promoResult.recordset;
          const promos = availablePromos
            .map(
              (p) =>
                `- Mã "${p.PromoCode}": ${p.Description} (Áp dụng cho đơn từ ${p.MinOrderValue} đ)`,
            )
            .join('\n');
          promoContext = `\nDANH SÁCH MÃ GIẢM GIÁ HIỆN CÓ:\n${promos}\n👉 NHIỆM VỤ CỦA AI:\n- Khi khách yêu cầu "Xem danh sách mã giảm giá": BẮT BUỘC liệt kê mã phù hợp nhất và CHẮC CHẮN dùng biểu tượng 🎁. Ví dụ: "🎁 Mình gợi ý cho bạn mã giảm giá..."\n- Khi khách NÓI MỘT MÃ GIẢM GIÁ CỤ THỂ (ví dụ khách chat "GIAMGIA50" hoặc "Dùng mã GIAMGIA50"): Hãy xác nhận đã ghi nhận mã và HỎI XIN ĐỊA CHỈ GIAO HÀNG. TUYỆT ĐỐI KHÔNG dùng biểu tượng 🎁 và KHÔNG dùng từ "mã giảm giá" trong câu trả lời này (ví dụ chỉ nói: "Dạ, mình đã ghi nhận voucher GIAMGIA50. Bạn cho mình xin địa chỉ giao hàng nhé!").`;
        }
      } catch (e) {
        this.logger.warn('Không thể tải khuyến mãi cho chatbot:', e.message);
      }

      // 2.7 Lấy trạng thái đơn hàng gần nhất (Order Tracking)
      let orderTrackingContext = '';
      let recentOrders: any[] = [];
      if (userId) {
        try {
          const trackingQuery = `
            SELECT TOP 2 OrderID, OrderDate, FinalAmount, Status
            FROM Orders
            WHERE UserID = @UserID
            ORDER BY OrderDate DESC
          `;
          const trackingResult = await this.databaseService.query(
            trackingQuery,
            [{ name: 'UserID',  value: userId }],
          );
          recentOrders = trackingResult.recordset;
          if (recentOrders.length > 0) {
            const trackingInfo = recentOrders
              .map((o) => {
                const time = new Date(o.OrderDate).toLocaleString('vi-VN');
                return `• Đơn #${o.OrderID} (${time}): Tổng ${Number(o.FinalAmount || 0).toLocaleString('vi-VN')}đ -> Trạng thái: ${o.Status}`;
              })
              .join('\n');
            orderTrackingContext = `\nDanh sách đơn hàng gần đây của khách:\n${trackingInfo}\nNếu khách hỏi về đơn hàng, hãy trả lời tự nhiên, thân thiện và lịch sự bằng Tiếng Việt.`;
          }
        } catch (e) {
          this.logger.warn(
            'Không thể tải trạng thái đơn hàng cho chatbot:',
            e.message,
          );
        }
      }

      // 2.8 Thời gian thực (Time Context)
      const now = new Date();
      const timeString = now.toLocaleString('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
      });
      const hour = now.getHours();
      let sessionOfDay = 'Tối';
      if (hour >= 5 && hour < 11) sessionOfDay = 'Sáng';
      else if (hour >= 11 && hour < 14) sessionOfDay = 'Trưa';
      else if (hour >= 14 && hour < 18) sessionOfDay = 'Chiều';
      const timeContext = `\nBây giờ là: ${timeString} (Buổi ${sessionOfDay}). Hãy dựa vào đây để chào hỏi và gợi ý món ăn phù hợp với thời gian.`;

      // 2.9 Thông tin FAQ & Chính sách Quán (FAQ Context)
      const faqContext = `\n\n=== THÔNG TIN & CÂU HỎI THƯỜNG GẶP VỀ FIVEFOOD (FAQ) ===
- Giờ mở cửa: Từ 07:00 sáng đến 22:00 tối hàng ngày (T2 - CN).
- Thời gian giao hàng: Trung bình khoảng 20 - 35 phút tùy địa điểm nội thành.
- Phí vận chuyển (Phí ship): Mặc định 15.000đ cho tất cả đơn hàng nội thành.
- Phương thức thanh toán: Hỗ trợ Tiền mặt khi nhận hàng (COD) và Chuyển khoản online qua cổng VNPay/ATM/QR Code tiện lợi.
- Chính sách hoàn/đổi: Cam kết đổi món mới hoặc hoàn tiền 100% trong vòng 30 phút nếu món ăn bị đổ vỡ, hư hỏng hoặc làm sai đơn.
- Hỗ trợ tư vấn món: Sẵn sàng gợi ý các món cay, món không hành, món chay, đồ uống, combo, hoặc món rẻ theo mức giá khách chọn dựa theo bảng THỰC ĐƠN.`;

      // 3. Xây dựng System Prompt (Tối ưu từ ngữ để tiết kiệm token và tăng tốc xử lý)
      const systemPrompt = `Bạn là AI trợ lý của FIVEFOOD. Hỗ trợ chọn món, đặt hàng và giải đáp FAQ bằng tiếng Việt thân thiện, ngắn gọn.
THỰC ĐƠN (dùng cột "ID=" khi thêm giỏ):
${productsContext}
${userContext}${historyContext}${cartContext}${promoContext}${orderTrackingContext}${timeContext}${faqContext}

QUY TẮC BẮT BUỘC:
1. Chỉ tư vấn món trong THỰC ĐƠN và FAQ hợp lệ. KHÔNG in "ID=" ra cho khách thấy.
2. Khi khách hỏi chung chung ("hôm nay ăn gì"), gợi ý 1 món bán chạy + 1 món khác. KHÔNG tự tạo mã lạ.
3. Nếu GIỎ HÀNG là TRỐNG, tuyệt đối không nói khách đã có món trong giỏ.
4. Nhờ yêu cầu chay/không cay/ngân sách để tư vấn món có giá và thành phần phù hợp.
5. LUÔN TRẢ LỜI NGẮN GỌN, SÚC TÍCH, CHUYÊN NGHIỆP. Tránh dài dòng rườm rà (Tối đa 1-3 câu hoặc gạch đầu dòng ngắn).
6. Khi khách hỏi về đơn hàng hay việc giao đồ ăn (dù dùng từ ngữ tự nhiên nào), hãy đọc trạng thái thực từ CSDL. Nếu đơn đang "Đang giao", hướng dẫn khách mở hóa đơn trên web để xem Bản đồ định vị Shipper trực tuyến!

🔥 QUY TẮC THÊM GIỎ HÀNG (NGUYÊN TẮC VÀNG BẮT BUỘC TUÂN THỦ 100%):
1. CHỈ ĐƯA VÀO [CART_INTENT] ĐÚNG DUY NHẤT MÓN MÀ KHÁCH YÊU CẦU TRONG TIN NHẮN HIỆN TẠI! TUYỆT ĐỐI KHÔNG ĐƯA CÁC MÓN KHÁCH ĐÃ ĐẶT Ở CÁC CÂU CHAT TRƯỚC HẠO MÓN ĐANG CÓ SẴN TRONG GIỎ VÀO LẠI BẢNG LỆNH!
   (Ví dụ: Trong giỏ đang có sẵn Pizza và Phở, khi khách nhắn câu mới "thêm 1 Phở Bò", bạn CHỈ được xuất duy nhất ID Phở Bò với qty = 1. TUYỆT ĐỐI KHÔNG kèm theo Pizza hay sửa qty thành con số khác!).
2. GIÁ TRỊ "qty" CHÍNH BẰNG ĐÚNG SỐ LƯỢNG KHÁCH NÓI Ở CÂU CHAT HIỆN TẠI (Khách nói "thêm 1" thì qty = 1). TUYỆT ĐỐI KHÔNG TỰ CỘNG DỒN HAY BỊA ĐẶT SỐ LƯỢNG MÓN!
3. KHI KHÁCH YÊU CẦU MỘT MÓN CỤ THỂ NHƯNG CHƯA NÓI RÕ SỐ LƯỢNG (Ví dụ khách chỉ nhắn: "pizza hải sản", "mì quảng"):
   - Bước 1: KIỂM TRA NGAY trong phần "GIỎ HÀNG HIỆN TẠI" xem tên món khách vừa nhắn đã có trong giỏ chưa.
   - Bước 2: NẾU ĐÃ CÓ SẴN (Trùng khớp tên món): BẮT BUỘC phải nhắc nhở khách bằng câu sau: "Giỏ hàng của bạn hiện đang có sẵn [X] phần [Tên món]. Bạn có chắc chắn muốn mua thêm không, và thêm bao nhiêu phần ạ?".
   - Bước 3: NẾU CHƯA CÓ TRONG GIỎ: Hãy hỏi trực tiếp: "Dạ, bạn muốn đặt bao nhiêu phần [Tên món] ạ?".
5. Khi được hỏi xác nhận món trùng (có/không): Nếu khách trả lời đồng ý/ok -> xuất ngay [CART_INTENT]. Nếu từ chối -> hủy thao tác.
6. *** KHÔNG nói "đã thêm", "mình thêm xong". Chỉ xuất đúng mã lệnh [CART_INTENT]. ***

🔥 QUY TẮC CHECKOUT / THANH TOÁN / GIẢM & XÓA MÓN:
- Khi khách báo "thanh toán", "chốt đơn": NẾU khách chưa cung cấp địa chỉ, BẮT BUỘC phải hỏi: "Bạn kiểm tra lại giỏ hàng xem đã đúng chưa nhé. Nếu OK thì cho mình xin Địa chỉ giao hàng ạ!".
- Khi khách ĐÃ cung cấp ĐỊA CHỈ nhưng CHƯA chọn phương thức thanh toán: BẮT BUỘC hỏi: "Dạ, bạn muốn chọn phương thức thanh toán nào ạ?" (Câu này sẽ tự động kích hoạt bảng nút chọn thanh toán).
- Khi khách đã cung cấp ĐẦY ĐỦ CẢ ĐỊA CHỈ LẪN PHƯƠNG THỨC THANH TOÁN (Tiền mặt hoặc VNPay): CHỈ IN RA DUY NHẤT MÃ LỆNH: [CHECKOUT_INTENT: {"address": "<địa chỉ từ lịch sử chat>", "paymentMethod": "<Tiền mặt hoặc VNPay>", "promoCode": "<mã nếu có>"}] và im lặng! TUYỆT ĐỐI KHÔNG tự nói xác nhận!
- Khi muốn giảm số lượng hoặc xóa 1 món cụ thể khỏi giỏ: [REMOVE_ITEM_INTENT: {"name": "<Tên món>", "qty": 1}]
- TUYỆT ĐỐI KHÔNG dùng [CLEAR_CART_INTENT] khi khách chỉ muốn bớt 1 phần!
- Khi muốn hủy đơn: [CANCEL_ORDER_INTENT: {"orderId": <ID đơn>}]

VÍ DỤ CÁCH TRẢ LỜI ĐÚNG:
Khách: "cho 1 Phở Bò Đặc Biệt" (hoặc "đặt 1 phở bò") → Bạn: "[CART_INTENT: {"items": [{"id": <ID phở bò>, "qty": 1}]}]"
Khách: "Cho mình đặt 1 Phở Bò Đặc Biệt và 2 Pizza Margherita" → Bạn: "[CART_INTENT: {"items": [{"id": <ID phở bò>, "qty": 1}, {"id": <ID pizza>, "qty": 2}]}]"
Khách: "pizza phô mai" (TRONG GIỎ CHƯA CÓ MÓN NÀY) → Bạn: "Dạ, bạn muốn đặt bao nhiêu phần ạ?"
Khách: "pizza phô mai" (TRONG GIỎ ĐÃ CÓ SẴN 4 PHẦN) → Bạn: "Giỏ hàng hiện tại đang có sẵn 4 phần Pizza Phô Mai. Bạn có muốn đặt thêm không?"
Khách: "có" (Trả lời sau khi bạn hỏi có muốn đặt thêm không) → Bạn: "Dạ, bạn muốn đặt thêm bao nhiêu phần ạ?"
Khách: "1 tô" (hoặc "1 phần" sau khi được hỏi) → Bạn: "[CART_INTENT: {"items": [{"id": <ID phở bò>, "qty": 1}]}]"
Khách: "thêm 1 phở nữa" → Bạn: "[CART_INTENT: {"items": [{"id": <ID phở bò>, "qty": 1}]}]"
Khách: "xóa 1 phần khỏi giỏ" (hoặc "bớt 1 phở") → Bạn: "[REMOVE_ITEM_INTENT: {"name": "phở", "qty": 1}]"
Khách: "xóa giỏ hàng cho mình" (hoặc "xóa giỏ", "dọn sạch giỏ hàng") → Bạn: "[CLEAR_CART_INTENT]"
Khách: "Giao tới 123 Lê Duẩn" → Bạn: "Dạ, bạn muốn chọn phương thức thanh toán nào ạ?"
Khách: "Thanh toán bằng VNPay, mã GIAM20K" (đã có địa chỉ ở câu trước) → Bạn: "[CHECKOUT_INTENT: {"address": "123 Lê Duẩn", "paymentMethod": "VNPay", "promoCode": "GIAM20K"}]"`;

      // 3.5 Lấy lịch sử chat (nếu có sessionId) để AI nhớ ngữ cảnh - giới hạn 3 lượt để tiết kiệm token
      const chatMessages: any[] = [{ role: 'system', content: systemPrompt }];

      let lastBotResponse = '';
      if (sessionId) {
        const chatLogsQuery = `
          SELECT TOP 2 ConversationData
          FROM ChatbotLogs
          WHERE SessionID = @SessionID
          ORDER BY CreatedAt DESC
        `;
        const chatLogsResult = await this.databaseService.query(chatLogsQuery, [
          { name: 'SessionID',  value: sessionId },
        ]);
        if (chatLogsResult.recordset.length > 0) {
          try {
            const lastRow = JSON.parse(
              chatLogsResult.recordset[0].ConversationData,
            );
            lastBotResponse = lastRow.botResponse || '';
          } catch (e) {}

          // Lật ngược lại để đưa vào AI theo đúng thứ tự thời gian (cũ nhất -> mới nhất)
          const historyRows = [...chatLogsResult.recordset].reverse();
          for (const row of historyRows) {
            try {
              const parsed = JSON.parse(row.ConversationData);
              if (parsed.userMessage)
                chatMessages.push({
                  role: 'user',
                  content: parsed.userMessage,
                });
              if (parsed.botResponse) {
                // Rút gọn bớt tin nhắn lịch sử của Bot nếu quá dài để tiết kiệm Token
                let botRep = parsed.botResponse;
                if (botRep.length > 200)
                  botRep = botRep.substring(0, 200) + '...';
                chatMessages.push({ role: 'assistant', content: botRep });
              }
            } catch (e) {}
          }
        }
      }
      chatMessages.push({ role: 'user', content: message });

      let responseText = '';
      let isOrderPlaced = false;
      let intentItems: { id: number; qty: number }[] = [];
      let isLocalHandled = false;
      let cartMatch: RegExpMatchArray | null = null;

      const wasAskingConfirmation =
        lastBotResponse.includes('Giỏ hàng của bạn đang có') ||
        lastBotResponse.includes('bạn có chắc muốn thêm') ||
        lastBotResponse.includes('trong giỏ đang có') ||
        lastBotResponse.includes('Món đã có trong giỏ');
      const wasAskingQuantity =
        lastBotResponse.includes('bạn muốn đặt bao nhiêu phần') ||
        lastBotResponse.includes('đặt thêm bao nhiêu phần') ||
        lastBotResponse.includes('muốn đặt bao nhiêu') ||
        lastBotResponse.includes('bao nhiêu phần ạ');
      const isUserConfirming = [
        'có',
        'ừ',
        'ok',
        'dạ có',
        'thêm',
        'ừ thêm',
        'đồng ý',
        'có nhé',
        'mình đồng ý',
        'ok nhé',
        'ừm',
        'có nha',
        'ok e',
        'ok shop',
      ].some(
        (w) =>
          message.toLowerCase().trim() === w ||
          message.toLowerCase().trim().startsWith(w),
      );
      const lowerMsg = message.toLowerCase();

      // ====================================================================================================
      // TẦNG 1: XỬ LÝ NỘI BỘ SIÊU TỐC (LOCAL INTENTS) - KHÔNG CẦN GỌI GROQ AI ĐỂ TIẾT KIỆM TOKENS & CHỐNG LỖI 429
      // ====================================================================================================

      // 1.1 Xác nhận thêm món trùng (Khách vừa được hỏi và trả lời "có / ừ / ok") -> Xử lý ngay tức khắc 0ms không gọi AI!
      if (
        wasAskingConfirmation &&
        isUserConfirming &&
        userId &&
        productsResult.recordset.length > 0
      ) {
        for (const prod of productsResult.recordset) {
          const escapedName = prod.ProductName.replace(
            /[-/\\^$*+?.()|[\]{}]/g,
            '\\$&',
          );
          const regex = new RegExp(
            `${escapedName}[\\s\\S]*?muốn thêm\\s*\\**(\\d+)\\**`,
            'i',
          );
          const match = regex.exec(lastBotResponse);
          if (match) {
            intentItems.push({
              id: prod.ProductID,
              qty: parseInt(match[1], 10) || 1,
            });
          }
        }
        if (intentItems.length > 0) {
          isLocalHandled = true;
        }
      }

      // 1.2 Lệnh Giảm / Xóa số lượng từng món trong giỏ (Chống hiểu nhầm thành Xóa toàn bộ giỏ) -> Xử lý ngay 0ms!
      const isUserAskingReduceOrRemoveItem =
        !isLocalHandled &&
        ([
          'bớt',
          'giảm',
          'xóa 1',
          'xóa 2',
          'xóa 3',
          'xóa một',
          'phần khỏi giỏ',
          'tô khỏi giỏ',
          'ly khỏi giỏ',
          'bỏ món',
          'hủy món',
        ].some((kw) => lowerMsg.includes(kw)) ||
          (lowerMsg.includes('xóa') &&
            ![
              'xóa giỏ',
              'dọn giỏ',
              'xóa hết giỏ',
              'dọn sạch',
              'làm trống giỏ',
            ].some((c) => lowerMsg.includes(c))));

      if (isUserAskingReduceOrRemoveItem) {
        isLocalHandled = true;
        if (userId) {
          try {
            const currentCart = await this.databaseService.query(
              'SELECT ci.CartItemID, ci.ProductID, ci.Quantity, p.ProductName FROM CartItems ci INNER JOIN Products p ON ci.ProductID = p.ProductID WHERE ci.UserID = @UserID',
              [{ name: 'UserID',  value: userId }],
            );

            if (currentCart.recordset.length === 0) {
              responseText =
                '❌ **Giỏ hàng trống!** Hiện không có món nào để bớt hoặc xóa.';
              isOrderPlaced = false;
            } else {
              let targetItem: any = null;
              let removeQty = 1;

              for (const item of currentCart.recordset) {
                const iName = item.ProductName.toLowerCase();
                const shortName = iName.split(' ')[0]; // VD "pizza" từ "pizza hải sản"
                if (
                  lowerMsg.includes(iName) ||
                  (lowerMsg.includes(shortName) && shortName.length >= 4)
                ) {
                  targetItem = item;
                  break;
                }
              }

              if (!targetItem && currentCart.recordset.length === 1) {
                targetItem = currentCart.recordset[0];
              }

              if (targetItem) {
                const qtyMatch = lowerMsg.match(/(\d+)/);
                if (
                  qtyMatch &&
                  !lowerMsg.includes('xóa hết') &&
                  !lowerMsg.includes('bỏ hết')
                ) {
                  removeQty = parseInt(qtyMatch[1], 10);
                } else if (
                  lowerMsg.includes('xóa hết') ||
                  lowerMsg.includes('bỏ hết') ||
                  lowerMsg.includes('hủy món') ||
                  (!lowerMsg.includes('bớt') &&
                    !lowerMsg.includes('giảm') &&
                    !qtyMatch &&
                    !lowerMsg.includes('1 phần'))
                ) {
                  removeQty = targetItem.Quantity;
                }

                if (targetItem.Quantity <= removeQty || removeQty <= 0) {
                  await this.databaseService.query(
                    'DELETE FROM CartItems WHERE CartItemID = @CartItemID',
                    [
                      {
                        name: 'CartItemID',
                        
                        value: targetItem.CartItemID,
                      },
                    ],
                  );
                  responseText = `✅ **Đã xóa ${targetItem.ProductName}** khỏi giỏ hàng!`;
                } else {
                  const newQty = targetItem.Quantity - removeQty;
                  await this.databaseService.query(
                    'UPDATE CartItems SET Quantity = @Quantity, UpdatedAt = GETDATE() WHERE CartItemID = @CartItemID',
                    [
                      { name: 'Quantity',  value: newQty },
                      {
                        name: 'CartItemID',
                        
                        value: targetItem.CartItemID,
                      },
                    ],
                  );
                  responseText = `✅ **Đã bớt ${removeQty} ${targetItem.ProductName}!** (Hiện trong giỏ còn: **${newQty}** phần).`;
                }

                isOrderPlaced = true;
              } else if (currentCart.recordset.length > 1) {
                const itemsList = currentCart.recordset
                  .map((i) => `- **${i.ProductName}** (${i.Quantity} phần)`)
                  .join('\n');
                responseText = `⚠️ **Giỏ hàng đang có nhiều món:**\n${itemsList}\n\n👉 Bạn muốn bớt món nào? *(VD: "Bớt 1 ${currentCart.recordset[0].ProductName}")*`;
                isOrderPlaced = false;
              }
            }
          } catch (err) {
            this.logger.error('Lỗi khi giảm/xóa món từ Chatbot', err);
            responseText =
              '❌ Lỗi khi thao tác giảm món. Vui lòng kiểm tra trên giao diện giỏ hàng!';
          }
        } else {
          responseText =
            '❌ Vui lòng **Đăng nhập** để AI thao tác giỏ hàng của bạn!';
        }
      }

      // 1.3 Lệnh Xóa toàn bộ giỏ hàng -> Xử lý ngay 0ms!
      const isUserAskingClear =
        !isLocalHandled &&
        [
          'xóa giỏ',
          'dọn giỏ',
          'xóa hết giỏ',
          'làm trống giỏ',
          'dọn sạch giỏ',
          'xóa toàn bộ giỏ',
        ].some((kw) => lowerMsg.includes(kw));
      if (isUserAskingClear) {
        isLocalHandled = true;
        if (userId) {
          try {
            await this.databaseService.query(
              'DELETE FROM CartItems WHERE UserID = @UserID',
              [{ name: 'UserID',  value: userId }],
            );
            isOrderPlaced = true;
            responseText =
              '✅ **Đã dọn sạch giỏ hàng!** Bạn muốn dùng món gì tiếp theo?';
          } catch (err) {
            this.logger.error('Lỗi khi xóa giỏ hàng từ Chatbot', err);
            responseText = '❌ Lỗi hệ thống khi xóa giỏ hàng.';
          }
        } else {
          newLocalCartToReturn = [];
          isOrderPlaced = true;
          responseText = '✅ **Đã dọn sạch giỏ hàng tạm!** Bạn muốn dùng món gì tiếp theo?';
        }
      }

      // 1.32 Lệnh Đặt hàng / Thanh toán (Nếu chưa đăng nhập thì bắt đăng nhập ngay lập tức)
      const isUserAskingCheckout =
        !isLocalHandled &&
        [
          'thanh toán',
          'đặt hàng',
          'chốt đơn',
          'mua hàng',
          'tính tiền',
        ].some((kw) => lowerMsg.includes(kw));
      if (isUserAskingCheckout && !userId) {
        isLocalHandled = true;
        responseText = '❌ Vui lòng **Đăng nhập** để AI hỗ trợ bạn thanh toán và theo dõi đơn hàng nhé!';
      }

      // 1.35 Lệnh Tra cứu trạng thái đơn hàng & Shipper di chuyển -> Xử lý ngay 0ms!
      const isOrderInquiry =
        !isLocalHandled &&
        [
          'đơn hàng',
          'đơn của mình',
          'đơn của tôi',
          'tới đâu rồi',
          'đang ở đâu',
          'trạng thái đơn',
          'giao chưa',
          'đang giao',
          'khi nào giao',
          'theo dõi đơn',
          'chưa tới',
          'bao lâu nữa',
          'mới nhất',
          'shipper',
          'ship',
          'di chuyển',
          'chạy tới đâu',
          'giao tới đâu',
          'tới đâu',
          'đi tới đâu',
          'đến đâu',
          'ở đâu rồi',
          'khúc nào',
          'đang chạy',
          'bao lâu',
        ].some((kw) => lowerMsg.includes(kw));
      if (
        isOrderInquiry &&
        !lowerMsg.includes('đặt') &&
        !lowerMsg.includes('hủy') &&
        !lowerMsg.includes('xóa')
      ) {
        isLocalHandled = true;
        if (!userId) {
          responseText =
            '❌ Vui lòng **Đăng nhập** để theo dõi trạng thái đơn hàng của bạn nhé!';
        } else if (!recentOrders || recentOrders.length === 0) {
          responseText =
            'ℹ️ Bạn hiện chưa có đơn hàng nào trong lịch sử. Hãy khám phá thực đơn và đặt những món yêu thích nhé! 😊';
        } else {
          const o = recentOrders[0];
          const time = new Date(o.OrderDate).toLocaleString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          });
          const amount = Number(o.FinalAmount || 0).toLocaleString('vi-VN');

          if (o.Status === 'Chờ xác nhận') {
            responseText = `⏳ **Đơn hàng #${o.OrderID}** (Đặt lúc ${time}) hiện đang **Chờ xác nhận**.\n\n💰 Tổng tiền: **${amount}đ**\n📌 Nhà hàng đang chuẩn bị tiếp nhận đơn, bạn đợi trong giây lát nhé!`;
          } else if (
            o.Status === 'Đang nấu' ||
            o.Status === 'Đã duyệt' ||
            o.Status === 'Chờ chế biến'
          ) {
            responseText = `🍳 **Đơn hàng #${o.OrderID}** (Đặt lúc ${time}) đã được duyệt và **Đang chế biến** trong bếp.\n\n💰 Tổng tiền: **${amount}đ**\n👨‍🍳 Món ăn đang được nấu ráo riết, sắp xong để bàn giao cho Shipper nhé!`;
          } else if (o.Status === 'Đang giao' || o.Status === 'Shipping') {
            responseText = `🛵 **Đơn hàng #${o.OrderID}** (Đặt lúc ${time}) hiện **Đang được Shipper di chuyển giao tới bạn**!\n\n💰 Tổng tiền: **${amount}đ**\n📍 **Theo dõi vị trí:** Bạn hãy bấm vào **Hóa Đơn / Chi tiết đơn** trên màn hình chính để mở **Bản Đồ Định Vị (Live GPS Map)** xem xe của Shipper đang di chuyển trực tuyến đến nhà mình nhé!\n📞 Shipper có thể gọi cho bạn trong vài phút tới, bạn để ý chuông nhé!`;
          } else if (o.Status === 'Hoàn thành' || o.Status === 'Đã giao') {
            responseText = `✅ **Đơn hàng #${o.OrderID}** (Đặt lúc ${time}) đã **Hoàn thành**!\n\n💰 Tổng tiền: **${amount}đ**\n🎉 Chúc bạn ngon miệng! Cảm ơn bạn đã đồng hành và ủng hộ nhà hàng! ❤️`;
          } else if (o.Status === 'Đã hủy') {
            responseText = `❌ **Đơn hàng #${o.OrderID}** (Đặt lúc ${time}) đang ở trạng thái **Đã hủy**.\n\nNếu bạn cần hỗ trợ đặt lại đơn hàng mới, hãy nhắn cho mình nhé! 😊`;
          } else {
            responseText = `📦 **Đơn hàng #${o.OrderID}** (Đặt lúc ${time}):\n• Trạng thái: **${o.Status}**\n• Tổng tiền: **${amount}đ**`;
          }
        }
      }

      // 1.4 NLP Parser Bóc tách đặt món trực tiếp (Hỗ trợ số lượng chính xác & hỏi làm rõ nếu món bị trùng tên) -> Xử lý ngay 0ms!
      if (!isLocalHandled && userId && productsResult.recordset.length > 0) {
        const isExcluded = [
          'xóa',
          'dọn',
          'hủy',
          'bớt',
          'giảm',
          'bỏ',
          'đừng',
          'không lấy',
          'mấy giờ',
          'phí ship',
          'ở đâu',
          'chữa',
          'tại sao',
          'giới thiệu',
          'gì ngon',
          'tư vấn',
          'có món gì',
          'là gì',
          'bảo hành',
          'hotline',
          'chính sách',
        ].some((kw) => lowerMsg.includes(kw));

        if (!isExcluded) {
          const singleKeywords = [
            'phở',
            'bún',
            'cơm',
            'mì',
            'hủ tiếu',
            'pizza',
            'burger',
            'sushi',
            'salad',
            'soda',
            'cà phê',
            'trà sữa',
            'trà',
            'lẩu',
            'bánh mì',
            'bánh',
            'kem',
            'chè',
            'gà rán',
            'gà',
            'khoai tây',
            'canh',
            'bò bít tết',
            'nước ép',
            'sinh tố',
            'bia',
            'pepsi',
            'coca',
          ];

          const phraseSet = new Set<string>();
          for (const prod of productsResult.recordset) {
            const pName = prod.ProductName.toLowerCase().trim();
            phraseSet.add(pName);

            const words = pName.split(/\s+/);
            for (let len = words.length - 1; len >= 1; len--) {
              const prefix = words.slice(0, len).join(' ');
              if (len >= 2 || singleKeywords.includes(prefix)) {
                phraseSet.add(prefix);
              }
            }
          }
          for (const kw of singleKeywords) {
            phraseSet.add(kw);
          }

          const sortedPhrases = Array.from(phraseSet).sort(
            (a, b) => b.length - a.length,
          );
          let tempMsg = lowerMsg;

          const foundTerms: { keyword: string; qty: number; idx: number }[] =
            [];
          const notLetterBefore =
            '(?:^|[^a-zA-ZàáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđĐ])';
          const notLetterAfter =
            '(?:$|[^a-zA-ZàáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđĐ])';

          for (const phrase of sortedPhrases) {
            if (
              phrase.length < 2 &&
              !['mì', 'gà', 'bò', ' trà', 'chè', 'kem'].includes(phrase)
            )
              continue;

            const regex = new RegExp(
              `${notLetterBefore}${phrase.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}${notLetterAfter}`,
              'i',
            );
            if (regex.test(tempMsg)) {
              const matchIdx = tempMsg.indexOf(phrase);
              if (matchIdx !== -1) {
                let qty = 1;
                const beforeStr = tempMsg.substring(0, matchIdx).trim();
                const afterStr = tempMsg
                  .substring(matchIdx + phrase.length)
                  .trim();

                // Khớp số lượng chính xác NGAY TRƯỚC hoặc NGAY SAU tên món (chống lấy nhầm số lượng của món khác!)
                const beforeRegex =
                  /(\d+)\s*(?:phần|tô|ly|cốc|cái|suất|dĩa|đĩa|hộp|túi|combo|chai|lon|món|chiếc|bát)?\s*$/i;
                const afterRegex =
                  /^(\d+)\s*(?:phần|tô|ly|cốc|cái|suất|dĩa|đĩa|hộp|túi|combo|chai|lon|món|chiếc|bát)?/i;

                const bMatch = beforeStr.match(beforeRegex);
                const aMatch = afterStr.match(afterRegex);

                if (bMatch) {
                  qty = parseInt(bMatch[1], 10);
                } else if (aMatch && !afterStr.match(/^[đd\.,000]/)) {
                  qty = parseInt(aMatch[1], 10);
                } else {
                  // KHÔNG TÌM THẤY CON SỐ (Có thể nhập bằng chữ "hai", "ba" hoặc không nhập)
                  // -> Bỏ qua Fast Handler, để cho AI Deepseek phân tích ngữ nghĩa hoặc chặn hỏi số lượng!
                  continue;
                }
                
                if (qty <= 0) qty = 1;

                foundTerms.push({ keyword: phrase, qty: qty, idx: matchIdx });

                tempMsg =
                  tempMsg.substring(0, matchIdx) +
                  ' '.repeat(phrase.length) +
                  tempMsg.substring(matchIdx + phrase.length);
              }
            }
          }

          if (foundTerms.length > 0) {
            const ambiguousList: {
              keyword: string;
              qty: number;
              matches: any[];
            }[] = [];
            const wasJustAskedToClarify =
              lastBotResponse.includes('Trong thực đơn có nhiều món') ||
              lastBotResponse.includes('Với từ khóa');
            const isUserSayingThuong = [
              'thường',
              'cơ bản',
              'truyền thống',
              'gốc',
              'thôi',
              'nhé',
            ].some((w) => lowerMsg.includes(w));

            for (const term of foundTerms) {
              const matchingProducts = productsResult.recordset.filter(
                (prod) => {
                  const pLower = prod.ProductName.toLowerCase().trim();
                  return (
                    pLower === term.keyword || pLower.includes(term.keyword)
                  );
                },
              );

              if (matchingProducts.length === 0) continue;

              const exactMatch = matchingProducts.find(
                (prod) =>
                  prod.ProductName.toLowerCase().trim() === term.keyword,
              );

              if (matchingProducts.length === 1) {
                const prod = matchingProducts[0];
                if (prod.Inventory <= 0) {
                  responseText = `❌ Rất tiếc, món **${prod.ProductName}** hiện đã tạm hết hàng!`;
                  isLocalHandled = true;
                  intentItems = [];
                  ambiguousList.length = 0;
                  break;
                } else {
                  intentItems.push({ id: prod.ProductID, qty: term.qty });
                  isLocalHandled = true;
                }
              } else if (
                exactMatch &&
                (wasJustAskedToClarify || isUserSayingThuong)
              ) {
                if (exactMatch.Inventory <= 0) {
                  responseText = `❌ Rất tiếc, món **${exactMatch.ProductName}** hiện đã tạm hết hàng!`;
                  isLocalHandled = true;
                  intentItems = [];
                  ambiguousList.length = 0;
                  break;
                } else {
                  intentItems.push({ id: exactMatch.ProductID, qty: term.qty });
                  isLocalHandled = true;
                }
              } else if (wasJustAskedToClarify) {
                // If just asked to clarify but still no exact match, don't loop ambiguous list locally.
                // Let it fall through to Groq AI (by not setting isLocalHandled) so AI can handle pronouns like "cái đó"
                continue;
              } else {
                ambiguousList.push({
                  keyword: term.keyword,
                  qty: term.qty,
                  matches: matchingProducts,
                });
                isLocalHandled = true;
              }
            }

            if (ambiguousList.length > 0) {
              let msg = '';
              if (intentItems.length > 0) {
                for (const item of intentItems) {
                  const checkProd = productsResult.recordset.find(
                    (p) => p.ProductID === item.id,
                  );
                  if (checkProd) {
                    const checkCart = await this.databaseService.query(
                      'SELECT CartItemID, Quantity FROM CartItems WHERE UserID = @UserID AND ProductID = @ProductID',
                      [
                        { name: 'UserID',  value: userId },
                        { name: 'ProductID',  value: item.id },
                      ],
                    );
                    const currentQty =
                      checkCart.recordset.length > 0
                        ? checkCart.recordset[0].Quantity
                        : 0;

                    if (currentQty + item.qty > checkProd.Inventory) {
                      msg += `⚠️ Không thể thêm **${checkProd.ProductName}** vì số lượng vượt quá tồn kho (còn ${checkProd.Inventory})!\n\n`;
                    } else {
                      if (checkCart.recordset.length > 0) {
                        const newQty = currentQty + item.qty;
                        await this.databaseService.query(
                          'UPDATE CartItems SET Quantity = @Quantity, UpdatedAt = GETDATE() WHERE CartItemID = @CartItemID',
                          [
                            { name: 'Quantity',  value: newQty },
                            {
                              name: 'CartItemID',
                              
                              value: checkCart.recordset[0].CartItemID,
                            },
                          ],
                        );
                      } else {
                        await this.databaseService.query(
                          'INSERT INTO CartItems (UserID, ProductID, Quantity, UpdatedAt) VALUES (@UserID, @ProductID, @Quantity, GETDATE())',
                          [
                            { name: 'UserID',  value: userId },
                            {
                              name: 'ProductID',
                              
                              value: item.id,
                            },
                            {
                              name: 'Quantity',
                              
                              value: item.qty,
                            },
                          ],
                        );
                      }
                      msg += `✅ Đã thêm trước **${item.qty}x ${checkProd.ProductName}** vào giỏ!\n\n`;
                      isOrderPlaced = true;
                    }
                  }
                }
              }

              msg +=
                '⚠️ **Trong thực đơn có nhiều món liên quan đến yêu cầu của bạn:**\n';
              for (const amb of ambiguousList) {
                msg += `\n• Với từ khóa **"${amb.keyword}"** (bạn muốn đặt **${amb.qty}** phần):\n`;
                for (const m of amb.matches) {
                  msg += `  - **${m.ProductName}** (${m.Price.toLocaleString('vi-VN')}đ)\n`;
                }
              }
              msg += '\n👉 Bạn muốn đặt cụ thể loại nào và bao nhiêu phần ạ?';

              responseText = msg;
              intentItems = [];
            }
          }
        }
      }

      // ====================================================================================================
      // TẦNG 2: GỌI GROQ AI CHO HỘI THOẠI HẠY CHECKOUT NẾU KHÔNG THAO TÁC GIỏ HÀNG NỘI BỘ
      // ====================================================================================================
      if (
        !isLocalHandled &&
        intentItems.length === 0 &&
        !responseText.startsWith('❌ Rất tiếc')
      ) {
        const callGroqAPI = async (retryCount = 0): Promise<any> => {
          const res = await fetch(
            'https://api.deepseek.com/chat/completions',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${this.apiKey}`,
              },
              body: JSON.stringify({
                model: 'deepseek-chat',
                messages: chatMessages,
                temperature: 0.7,
                max_tokens: 350,
              }),
            },
          );

          if (res.status === 429 && retryCount < 3) {
            const delay = 3000 * (retryCount + 1);
            this.logger.warn(
              `Rate limit hit, retrying in ${delay / 1000}s... (attempt ${retryCount + 1}/3)`,
            );
            await new Promise((resolve) => setTimeout(resolve, delay));
            return callGroqAPI(retryCount + 1);
          }
          return res;
        };

        const response = await callGroqAPI();

        if (!response.ok) {
          const errorData = await response.text();
          this.logger.error(`Deepseek API Error: ${errorData}`);
          if (response.status === 429) {
            return {
              reply:
                '⚡ Hệ thống AI đang bận xử lý nhiều yêu cầu cùng lúc. Vui lòng bấm gửi lại sau vài giây nhé!',
              sessionId: sessionId || uuidv4(),
              orderPlaced: false,
            };
          }
          throw new Error('Deepseek API returned an error');
        }

        const data = await response.json();
        responseText = data.choices[0].message.content;

        cartMatch =
          typeof responseText === 'string'
            ? responseText.match(/\[CART_INTENT:\s*(\{.*\})\]/s)
            : null;
        if (cartMatch) {
          try {
            const parsedData = JSON.parse(cartMatch[1]);
            if (parsedData && Array.isArray(parsedData.items)) {
              // --- KIỂM TRA ÉP BUỘC SỐ LƯỢNG ---
              const hasQtyWord = /\d|một|hai|ba|bốn|năm|sáu|bảy|tám|chín|mười|chục|tá|nửa|ly\b|\btô\b|phần|chén|đĩa|dĩa|chiếc|\bcái\b|lon|chai|\bổ\b|cuốn|bát|cốc/i.test(lowerMsg);
              
              const fs = require('fs');
              const logLine = `[${new Date().toISOString()}] msg: "${lowerMsg}", hasQtyWord: ${hasQtyWord}, parsedData: ${JSON.stringify(parsedData)}\n`;
              fs.appendFileSync('C:\\Users\\Admin\\Desktop\\DoAn\\backend\\interceptor.log', logLine);

              if (!hasQtyWord) {
                this.logger.log(`DEBUG INTERCEPTOR: Bypassed CART_INTENT because hasQtyWord is FALSE. msg: ${lowerMsg}`);
                responseText = 'Dạ, bạn muốn đặt bao nhiêu phần ạ?';
                cartMatch = null;
                intentItems = [];
              } else {
                intentItems = parsedData.items.map((i: any) => ({
                  id: parseInt(i.id),
                  qty: parseInt(i.qty) || parseInt(i.quantity) || 1
                }));
              }
            }
          } catch (e) {}
        }

        const clearCartMatch =
          typeof responseText === 'string' &&
          responseText.match(/\[CLEAR_CART_INTENT\]/);
        if (clearCartMatch && userId) {
          try {
            await this.databaseService.query(
              'DELETE FROM CartItems WHERE UserID = @UserID',
              [{ name: 'UserID',  value: userId }],
            );
            isOrderPlaced = true;
            responseText =
              '✅ **Đã dọn sạch giỏ hàng thành công!**\nGiỏ hàng của bạn hiện tại đã hoàn toàn trống trải! Bạn có muốn đặt món gì mới không ạ? 😊';
          } catch (err) {
            this.logger.error('Lỗi khi xóa giỏ hàng từ Chatbot', err);
            responseText = '❌ Quá trình xóa giỏ hàng đã xảy ra lỗi.';
          }
        } else if (clearCartMatch && !userId) {
          newLocalCartToReturn = [];
          isOrderPlaced = true;
          responseText = '✅ **Đã dọn sạch giỏ hàng tạm thành công!**\nGiỏ hàng của bạn hiện tại đã hoàn toàn trống trải! Bạn có muốn đặt món gì mới không ạ? 😊';
        }
      }

      if (intentItems.length > 0 && userId) {
        try {
          // === Kiểm tra tồn kho và từng món xem đã có trong giỏ chưa ===
          const duplicateItems: {
            name: string;
            currentQty: number;
            addQty: number;
            id: number;
          }[] = [];
          const newItems: { id: number; qty: number; name: string }[] = [];
          const outOfStockItems: string[] = [];

          for (const item of intentItems) {
            const prodCheck = await this.databaseService.query(
              'SELECT ProductName, Inventory FROM Products WHERE ProductID = @ProductID AND IsActive = 1',
              [{ name: 'ProductID',  value: item.id }],
            );
            if (prodCheck.recordset.length === 0) continue;
            const product = prodCheck.recordset[0];

            const checkCart = await this.databaseService.query(
              'SELECT ci.CartItemID, ci.Quantity, p.ProductName FROM CartItems ci INNER JOIN Products p ON ci.ProductID = p.ProductID WHERE ci.UserID = @UserID AND ci.ProductID = @ProductID',
              [
                { name: 'UserID',  value: userId },
                { name: 'ProductID',  value: item.id },
              ],
            );

            const currentQty =
              checkCart.recordset.length > 0
                ? checkCart.recordset[0].Quantity
                : 0;

            // Lỗi #4: Kiểm tra giới hạn tồn kho trước khi thêm hoặc tăng số lượng
            if (
              product.Inventory <= 0 ||
              currentQty + item.qty > product.Inventory
            ) {
              outOfStockItems.push(
                `${product.ProductName} (Tồn kho hiện chỉ còn: ${product.Inventory})`,
              );
              continue;
            }

            if (checkCart.recordset.length > 0) {
              duplicateItems.push({
                name: checkCart.recordset[0].ProductName,
                currentQty: checkCart.recordset[0].Quantity,
                addQty: item.qty,
                id: item.id,
              });
            } else {
              newItems.push({
                id: item.id,
                qty: item.qty,
                name: product.ProductName,
              });
            }
          }

          if (
            outOfStockItems.length > 0 &&
            newItems.length === 0 &&
            duplicateItems.length === 0
          ) {
            responseText = `❌ Rất tiếc, các món sau không đủ tồn kho:\n${outOfStockItems.map((m) => `- **${m}**`).join('\n')}\nVui lòng chọn số lượng ít hơn hoặc món khác nhé!`;
            isOrderPlaced = false;
          } else if (duplicateItems.length > 0 && !wasAskingConfirmation && !wasAskingQuantity) {
            // Lỗi #2: Nếu có món mới (newItems), thực hiện thêm ngay lập tức vào giỏ hàng trước để không bị nuốt mất món khi dừng lại hỏi xác nhận
            let addedNewMsg = '';
            if (newItems.length > 0) {
              for (const nItem of newItems) {
                await this.databaseService.query(
                  'INSERT INTO CartItems (UserID, ProductID, Quantity, UpdatedAt) VALUES (@UserID, @ProductID, @Quantity, GETDATE())',
                  [
                    { name: 'UserID',  value: userId },
                    { name: 'ProductID',  value: nItem.id },
                    { name: 'Quantity',  value: nItem.qty },
                  ],
                );
              }
              isOrderPlaced = true;
              const names = newItems
                .map((ni) => `**${ni.qty}x ${ni.name}**`)
                .join(', ');
              addedNewMsg = `✅ Đã thêm trước ${names} vào giỏ!\n\n`;
            } else {
              isOrderPlaced = false;
            }

            // Hỏi xác nhận cho các món trùng
            const confirmLines = duplicateItems
              .map(
                (d) =>
                  `• **${d.name}** (trong giỏ đang có **${d.currentQty}** phần. Bạn có chắc muốn thêm **${d.addQty}** nữa không?)`,
              )
              .join('\n');

            let outOfStockMsg = '';
            if (outOfStockItems.length > 0) {
              outOfStockMsg = `\n⚠️ Lưu ý: ${outOfStockItems.join(', ')} không đủ tồn kho nên chưa thêm.`;
            }

            responseText = `${addedNewMsg}⚠️ **Món đã có trong giỏ:**\n${confirmLines}${outOfStockMsg}\n\n👉 Bạn muốn cộng dồn không? (*"Có"* hoặc *"Không"*)`;
          } else {
            // Thêm toàn bộ (món mới + món đã xác nhận trùng)
            const itemsToProcess = [
              ...newItems,
              ...duplicateItems.map((d) => ({
                id: d.id,
                qty: d.addQty,
                name: d.name,
              })),
            ];

            for (const item of itemsToProcess) {
              const checkCart = await this.databaseService.query(
                'SELECT CartItemID, Quantity FROM CartItems WHERE UserID = @UserID AND ProductID = @ProductID',
                [
                  { name: 'UserID',  value: userId },
                  { name: 'ProductID',  value: item.id },
                ],
              );
              if (checkCart.recordset.length > 0) {
                const newQty = checkCart.recordset[0].Quantity + item.qty;
                await this.databaseService.query(
                  'UPDATE CartItems SET Quantity = @Quantity, UpdatedAt = GETDATE() WHERE UserID = @UserID AND ProductID = @ProductID',
                  [
                    { name: 'Quantity',  value: newQty },
                    { name: 'UserID',  value: userId },
                    { name: 'ProductID',  value: item.id },
                  ],
                );
              } else {
                await this.databaseService.query(
                  'INSERT INTO CartItems (UserID, ProductID, Quantity, UpdatedAt) VALUES (@UserID, @ProductID, @Quantity, GETDATE())',
                  [
                    { name: 'UserID',  value: userId },
                    { name: 'ProductID',  value: item.id },
                    { name: 'Quantity',  value: item.qty },
                  ],
                );
              }
            }

            isOrderPlaced = true;

            // Tự động kiểm tra tổng giỏ hàng và tư vấn mã giảm giá thông minh cho khách
            const updatedCartResult = await this.databaseService.query(
              'SELECT SUM(c.Quantity * p.Price) as Subtotal FROM CartItems c INNER JOIN Products p ON c.ProductID = p.ProductID WHERE c.UserID = @UserID',
              [{ name: 'UserID',  value: userId }],
            );
            const subtotal = updatedCartResult.recordset[0]?.Subtotal || 0;

            // Lấy danh sách voucher đủ điều kiện áp dụng
            const validPromos = await this.databaseService.query(
              `SELECT TOP 2 PromoCode, Description, MinOrderValue 
                 FROM Promotions 
                 WHERE GETDATE() BETWEEN StartDate AND EndDate 
                   AND UsedCount < UsageLimit 
                   AND MinOrderValue <= @Subtotal
                 ORDER BY MinOrderValue DESC`,
              [{ name: 'Subtotal',  value: subtotal }],
            );

            // Lấy voucher có giá trị gần nhất mà khách chưa đủ điều kiện để kích thích upsale
            const nextPromos = await this.databaseService.query(
              `SELECT  PromoCode, Description, MinOrderValue 
                 FROM Promotions 
                 WHERE GETDATE() BETWEEN StartDate AND EndDate 
                   AND UsedCount < UsageLimit 
                   AND MinOrderValue > @Subtotal
                 ORDER BY MinOrderValue ASC`,
              [{ name: 'Subtotal',  value: subtotal }],
            );

            let promoMsg = '';
            if (validPromos.recordset.length > 0) {
              const codes = validPromos.recordset
                .map((p) => `**${p.PromoCode}** (${p.Description})`)
                .join(', ');
              promoMsg = `\n🎁 **Mã ưu đãi khả dụng:** ${codes}\n💡 Nhắn **Địa chỉ kèm tên mã** để đặt đơn *(VD: "Giao tới 123 Lê Duẩn, mã ${validPromos.recordset[0].PromoCode}")*`;
            } else if (nextPromos.recordset.length > 0) {
              const nextP = nextPromos.recordset[0];
              const diff = nextP.MinOrderValue - subtotal;
              promoMsg = `\n🔥 **Mẹo ưu đãi:** Mua thêm **${diff.toLocaleString('vi-VN')}đ** để đủ ĐK dùng mã **${nextP.PromoCode}** (${nextP.Description})!`;
            } else {
              promoMsg = `\n💡 Nhắn **Địa chỉ giao hàng** khi bạn sẵn sàng đặt đơn nhé!`;
            }

            let outOfStockMsg = '';
            if (outOfStockItems.length > 0) {
              outOfStockMsg = `\n⚠️ Lưu ý: ${outOfStockItems.join(', ')} không đủ tồn kho nên chưa được thêm.`;
            }

            responseText = `✅ **Đã thêm vào giỏ hàng!** (Tạm tính: **${subtotal.toLocaleString('vi-VN')}đ**)${promoMsg}${outOfStockMsg}`;
          }
        } catch (err) {
          this.logger.error('Lỗi khi tự động thêm giỏ hàng từ Chatbot', err);
          responseText =
            '❌ Lỗi tự động thêm giỏ hàng. Vui lòng thao tác trực tiếp trên giao diện!';
        }
      } else if (
        (intentItems.length > 0 || cartMatch) &&
        !userId &&
        !responseText.startsWith('❌ Rất tiếc')
      ) {
        // AI thêm món vào giỏ hàng vãng lai (Local Cart)
        try {
          let tempLocalCart = localCart ? [...localCart] : [];
          let addedNames: string[] = [];
          
          for (const item of intentItems) {
            const prodCheck = await this.databaseService.query(
              'SELECT ProductName, Price, ImageURL, Inventory FROM Products WHERE ProductID = @ProductID AND IsActive = 1',
              [{ name: 'ProductID',  value: item.id }]
            );
            if (prodCheck.recordset.length === 0) continue;
            
            const product = prodCheck.recordset[0];
            
            // Xử lý tồn kho cơ bản
            const existingIndex = tempLocalCart.findIndex((i: any) => parseInt(i.ProductID) === item.id);
            const currentQty = existingIndex > -1 ? tempLocalCart[existingIndex].Quantity : 0;
            
            if (product.Inventory <= 0 || currentQty + item.qty > product.Inventory) {
              continue; // Bỏ qua nếu hết tồn kho
            }

            if (existingIndex > -1) {
              tempLocalCart[existingIndex].Quantity += item.qty;
            } else {
              tempLocalCart.push({
                ProductID: item.id,
                ProductName: product.ProductName,
                Price: product.Price,
                ImageURL: product.ImageURL,
                Inventory: product.Inventory,
                Quantity: item.qty
              });
            }
            addedNames.push(`**${item.qty}x ${product.ProductName}**`);
          }
          
          if (addedNames.length > 0) {
            isOrderPlaced = true;
            const subtotal = tempLocalCart.reduce((sum, r) => sum + r.Price * r.Quantity, 0);
            responseText = `✅ **Đã thêm vào giỏ hàng tạm!** (Tạm tính: **${subtotal.toLocaleString('vi-VN')}đ**)\nĐã thêm: ${addedNames.join(', ')}\n\n💡 Bạn có thể tiếp tục hỏi thêm món, hoặc báo "Thanh toán" để chốt đơn nhé!`;
            newLocalCartToReturn = tempLocalCart;
          } else if (intentItems.length > 0) {
            responseText = `❌ Không thể thêm món (Có thể do món đã hết hàng). Bạn chọn món khác nhé!`;
          }
        } catch (e) {
          this.logger.error('Lỗi khi tự động thêm giỏ hàng vãng lai từ Chatbot', e);
          responseText = '❌ Vui lòng **Đăng nhập** để AI thao tác nhé!';
        }
      }

      // 5.3 Xử lý Thanh toán (Checkout) tự động
      const checkoutMatch = responseText.match(
        /\[CHECKOUT_INTENT:\s*(\{.*\})\]/s,
      );
      if (checkoutMatch && userId) {
        try {
          const intentData = JSON.parse(checkoutMatch[1]);
          if (intentData.address) {
            // Check nếu giỏ hàng rỗng
            const cartCheck = await this.databaseService.query(
              'SELECT COUNT(*) as count FROM CartItems WHERE UserID = @UserID',
              [{ name: 'UserID',  value: userId }],
            );
            if (cartCheck.recordset[0].count === 0) {
              responseText =
                '❌ **Giỏ hàng trống!** Vui lòng thêm món trước khi thanh toán.';
            } else {
              const appliedPromo = intentData.promoCode
                ? intentData.promoCode
                : null;
              await this.ordersService.createOrder(
                userId,
                intentData.address,
                null,
                null,
                intentData.paymentMethod || 'Tiền mặt',
                appliedPromo,
                15000,
              );
              isOrderPlaced = true;
              let successMsg =
                '✅ **Đặt hàng thành công!** Đơn sẽ được giao tới: **' +
                intentData.address +
                '**';
              if (appliedPromo) {
                successMsg += ` *(Mã giảm giá: ${appliedPromo})*`;
              }
              responseText = successMsg;
            }
          }
        } catch (err) {
          this.logger.error('Lỗi khi checkout từ Chatbot', err);
          responseText =
            '❌ Lỗi thanh toán tự động, bạn vui lòng sử dụng nút Thanh Toán trên website!';
        }
      } else if (checkoutMatch && !userId) {
        responseText = '❌ Vui lòng **Đăng nhập** để AI đặt hàng cho bạn!';
      }

      // 5.4 Xử lý Hủy đơn hàng tự động
      const cancelMatch = responseText.match(
        /\[CANCEL_ORDER_INTENT:\s*(\{.*\})\]/s,
      );
      if (cancelMatch && userId) {
        try {
          const intentData = JSON.parse(cancelMatch[1]);
          if (intentData.orderId) {
            await this.ordersService.cancelOrder(userId, intentData.orderId);
            responseText = `✅ **Hủy đơn hàng thành công!** Đơn hàng #${intentData.orderId} của bạn đã được hủy.`;
            // Emit signal to frontend if necessary, although it might just rely on normal polling/websocket.
          }
        } catch (err) {
          responseText = `❌ **Không thể hủy đơn hàng!** Lý do: ${err.message || 'Chỉ có thể hủy đơn khi đang Chờ xác nhận.'}`;
        }
      }

      // Làm sạch văn bản AI: Không để lộ nhãn ID kỹ thuật ra ngoài cho khách thấy
      let hasCheckoutIntent = false;
      if (typeof responseText === 'string') {
        if (responseText.includes('[CHECKOUT_INTENT')) hasCheckoutIntent = true;
        responseText = responseText
          .replace(/\s*\(\s*ID=\d+\s*\)/gi, '')
          .replace(/\s*ID=\d+\s*\|/gi, '')
          .replace(/\[[A-Z_]+_INTENT:?.*?\]/gs, '') // Remove all [INTENT_NAME: ...] tags
          .trim();
      }

      // Tự động nhận diện Món ăn (Food Cards)
      if (typeof responseText === 'string') {
        const recommendedFoods: any[] = [];
        // Extract product IDs by matching names in the text
        // Only trigger if we are not summarizing cart
        if (!responseText.includes('Giỏ hàng hiện tại đang có') && !responseText.includes('Món đã có trong giỏ')) {
          for (const prod of productsResult.recordset) {
            // Regex to check if ProductName is mentioned (surrounded by word boundaries or formatting)
            if (responseText.includes(prod.ProductName)) {
                recommendedFoods.push({
                  ProductID: prod.ProductID,
                  ProductName: prod.ProductName,
                  Price: prod.Price,
                  ImageURL: prod.ImageURL,
                  Ingredients: prod.Ingredients,
                  Inventory: prod.Inventory
                });
            }
          }
        }
        
        const uniqueFoods = Array.from(new Set(recommendedFoods.map(f => f.ProductID)))
          .map(id => recommendedFoods.find(f => f.ProductID === id))
          .slice(0, 4); // Show max 4 cards
          
        if (uniqueFoods.length > 0) {
          richContent = { type: 'food_recommendation', data: uniqueFoods };
        }
      }

      // Tự động nhận diện Yêu cầu nhập số lượng (Quantity Selector)
      if (typeof responseText === 'string' && responseText.includes('bao nhiêu phần')) {
        // Không ghi đè nếu đã có Food Cards chứa nhiều hơn 1 món (vì khách cần phải chọn món trước)
        const hasMultipleFoods = richContent && richContent.type === 'food_recommendation' && richContent.data.length > 1;
        
        if (!hasMultipleFoods) {
          const qtyMatch = responseText.match(/bao nhiêu phần (.*?)(?:\?|ạ|$)/i);
          let pName = '';
          if (qtyMatch && qtyMatch[1] && qtyMatch[1].trim().length > 0 && !qtyMatch[1].includes('ạ')) {
             pName = qtyMatch[1].trim();
          } else {
             // Nếu không match được tên món, lấy tên món cuối cùng được nhắc đến trong text
             for (const prod of productsResult.recordset) {
               if (responseText.includes(prod.ProductName)) {
                 pName = prod.ProductName;
                 break;
               }
             }
          }
          richContent = { type: 'quantity_selector', data: { productName: pName } };
        }
      }

      // Tự động nhận diện Mã giảm giá (Promo Codes)
      if (!hasCheckoutIntent && typeof responseText === 'string' && (responseText.includes('🎁') || responseText.toLowerCase().includes('mã giảm giá') || message.toLowerCase().includes('mã giảm giá'))) {
         if (availablePromos && availablePromos.length > 0) {
           // Lấy tất cả mã khuyến mãi nếu khách yêu cầu xem danh sách, ngược lại lấy mã được nhắc đến
           let mentionedPromos = availablePromos;
           if (!message.toLowerCase().includes('xem danh sách')) {
               mentionedPromos = availablePromos.filter(p => responseText.includes(p.PromoCode));
               if (mentionedPromos.length === 0) mentionedPromos = availablePromos; // Fallback to all if none explicitly matched but keyword was triggered
           }
           if (mentionedPromos.length > 0) {
              richContent = { type: 'promotions', data: mentionedPromos };
           }
         }
      }

      // Tự động nhận diện Tóm tắt giỏ hàng (Cart Summary)
      // CHỈ hiển thị thẻ Giỏ hàng nếu không bị đè bởi Mã Giảm Giá
      if (!richContent || richContent.type !== 'promotions') {
        const lowerRes = typeof responseText === 'string' ? responseText.toLowerCase() : '';
        if (
          lowerRes.includes('kiểm tra lại') || 
          lowerRes.includes('giỏ hàng hiện tại') || 
          lowerRes.includes('tóm tắt lại') || 
          lowerRes.includes('tổng cộng') ||
          lowerRes.includes('danh sách món') ||
          (lowerRes.includes('giỏ hàng') && lowerRes.includes('có'))
        ) {
           if (cartItemsData && cartItemsData.length > 0) {
               richContent = { type: 'cart_summary', data: { items: cartItemsData, subtotal: subtotalData } };
           }
        }
      }

      // Tự động nhận diện Phương thức thanh toán
      if (typeof responseText === 'string' && responseText.includes('phương thức thanh toán')) {
         richContent = { type: 'payment_options' };
      }

      // 6. Lưu vào Log
      const currentSessionId = sessionId || uuidv4();
      const conversationData = JSON.stringify({
        userMessage: message,
        botResponse: responseText,
        timestamp: new Date().toISOString(),
        orderPlaced: isOrderPlaced,
      });

      const insertQuery = `
        INSERT INTO ChatbotLogs (UserID, SessionID, ConversationData)
        VALUES (@UserID, @SessionID, @ConversationData)
      `;

      await this.databaseService.query(insertQuery, [
        { name: 'UserID',  value: userId || null },
        { name: 'SessionID',  value: currentSessionId },
        {
          name: 'ConversationData',
          
          value: conversationData,
        },
      ]);

      return {
        reply: responseText,
        sessionId: currentSessionId,
        orderPlaced: isOrderPlaced,
        newLocalCart: newLocalCartToReturn,
        richContent: richContent
      };
    } catch (error) {
      this.logger.error('Error in processMessage', error);
      throw new InternalServerErrorException(
        'Failed to process message with AI',
      );
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
      return result.recordset.map((row) => {
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
          ...parsedData,
        };
      });
    } catch (error) {
      this.logger.error('Error fetching chatbot logs', error);
      throw new InternalServerErrorException('Failed to fetch chatbot logs');
    }
  }

  async generatePromotionContent(data: {
    productName: string;
    type: string;
    discount?: string;
    event?: string;
    platform: string;
    style: string;
    length: string;
    description?: string;
  }) {
    if (!this.apiKey)
      throw new InternalServerErrorException('Missing API key.');
    const prompt = `Bạn là một chuyên gia Marketing cho nhà hàng FIVEFOOD. Hãy viết nội dung quảng cáo dựa trên các yêu cầu sau:

THÔNG TIN ĐẦU VÀO:
- Tên món / Sản phẩm: ${data.productName}
- Loại bài viết: ${data.type}
- Giảm giá / Ưu đãi: ${data.discount || 'Không có'}
- Sự kiện: ${data.event || 'Không có'}
- Nền tảng hiển thị: ${data.platform}
- Phong cách viết: ${data.style}
- Yêu cầu độ dài: ${data.length}

QUY TẮC BẮT BUỘC (TUYỆT ĐỐI TUÂN THỦ):
1. CHỈ SỬ DỤNG DỮ LIỆU ĐƯỢC CUNG CẤP. TUYỆT ĐỐI KHÔNG TỰ BỊA ĐẶT NGUYÊN LIỆU, GIÁ TIỀN HAY ƯU ĐÃI KHÁC.
2. NẾU nền tảng là "Website Banner": Viết cực kỳ ngắn gọn (khoảng 15-25 từ). KHÔNG dùng hashtag. BẮT BUỘC phải có Call to Action (CTA) thật kích thích ở cuối câu (ví dụ: 👉 Đặt ngay!, 🎉 Xem ngay!).
3. NẾU nền tảng là "Facebook": Viết dài hơn (khoảng 80-150 từ tùy độ dài yêu cầu). Sử dụng Emoji tự nhiên. BẮT BUỘC có CTA hấp dẫn (VD: 👉 Thưởng thức hôm nay!) và hashtag liên quan (#FIVEFOOD #${data.productName.replace(/\s+/g, '')} ...).
4. NẾU nền tảng là "Zalo": Viết ngắn gọn, thân thiện (khoảng 40-70 từ). Ít hashtag. Có lời chào hoặc CTA gần gũi.
5. NẾU nền tảng là "Popup Website": Viết trực diện vào khuyến mãi, gây chú ý mạnh (khoảng 20-40 từ). Có CTA rõ ràng.
6. Luôn kết thúc bằng 1 lời kêu gọi hành động (CTA) phù hợp.

KẾT QUẢ ĐẦU RA:
Bạn phải sáng tạo ra chính xác 3 phiên bản nội dung (Version 1, Version 2, Version 3) mang sắc thái hơi khác nhau nhưng đều tuân thủ các quy tắc trên.
TRẢ VỀ ĐÚNG ĐỊNH DẠNG JSON SAU (KHÔNG THÊM BẤT KỲ VĂN BẢN NÀO BÊN NGOÀI JSON):
{
  "versions": [
    "Nội dung phiên bản 1...",
    "Nội dung phiên bản 2...",
    "Nội dung phiên bản 3..."
  ]
}`;

    return this.callGroq(prompt, true);
  }

  async generateProductDescription(productName: string, ingredients: string) {
    if (!this.apiKey)
      throw new InternalServerErrorException('Missing API key.');
    const prompt = `Bạn là một chuyên gia ẩm thực chuyên viết mô tả món ăn cho menu nhà hàng FIVEFOOD.
Hãy viết mô tả thật hấp dẫn, kích thích vị giác cho món ăn sau:
- Tên món: ${productName}
- Nguyên liệu/Thành phần: ${ingredients}
Yêu cầu: Viết thành 1 đoạn văn ngắn (dưới 50 chữ), sử dụng những tính từ miêu tả sự tươi ngon, đậm đà, nóng hổi. Trả về đúng nội dung mô tả, không cần giải thích hay thêm thắt.`;

    return this.callGroq(prompt);
  }

  private async callGroq(prompt: string, expectJson: boolean = false) {
    const res = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: expectJson ? 1500 : 500,
        temperature: 0.7,
        ...(expectJson && { response_format: { type: 'json_object' } }),
      }),
    });
    if (!res.ok) {
      const errorText = await res.text();
      this.logger.error(`Deepseek API Error: ${errorText}`);
      throw new Error('Failed to call Deepseek API');
    }
    const data = await res.json();
    return data.choices[0].message.content.trim();
  }

  async setWebsiteAnnouncement(content: string, productId?: number) {
    const filePath = path.join(process.cwd(), 'announcement.json');
    fs.writeFileSync(
      filePath,
      JSON.stringify({
        content,
        productId,
        timestamp: new Date().toISOString(),
      }),
    );
    return { success: true };
  }

  async getWebsiteAnnouncement() {
    const filePath = path.join(process.cwd(), 'announcement.json');
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      return { content: data.content, productId: data.productId };
    }
    return { content: '', productId: null };
  }
}
