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
      // 1. Lấy toàn bộ danh sách sản phẩm kèm thành phần (Ingredients) và tồn kho (Inventory) để AI tư vấn theo giá, vị cay, chay, đồ uống...
      const productsQuery = `
        SELECT p.ProductID, p.ProductName, p.Price, p.Ingredients, p.Inventory, c.CategoryName
        FROM Products p
        INNER JOIN Categories c ON p.CategoryID = c.CategoryID
        WHERE p.IsActive = 1
        ORDER BY p.ProductID ASC
      `;
      const productsResult = await this.databaseService.query(productsQuery);
      // Format gọn gàng nhưng đầy đủ thuộc tính cho AI tư vấn chi tiết
      const productsContext = productsResult.recordset.map(
        p => `ID=${p.ProductID} | ${p.ProductName} (${p.CategoryName}) | Giá:${p.Price}đ | Thành phần/Mô tả:${p.Ingredients || 'Không ghi rõ'} | Tình trạng:${p.Inventory > 0 ? 'Còn hàng' : 'Tạm hết hàng'}`
      ).join('\n');

      // 1.5 Lấy thông tin tài khoản khách hàng (nếu đã đăng nhập) để AI biết tên và xưng hô thân thiết
      let userContext = '\nKHÁCH HÀNG HIỆN TẠI: Khách vãng lai (Chưa đăng nhập tài khoản).';
      if (userId) {
        try {
          const userQuery = `SELECT FullName, Email FROM Users WHERE UserID = @UserID`;
          const userResult = await this.databaseService.query(userQuery, [{ name: 'UserID', type: sql.Int, value: userId }]);
          if (userResult.recordset.length > 0) {
            const u = userResult.recordset[0];
            userContext = `\nKHÁCH HÀNG HIỆN TẠI: Khách hàng thành viên của quán, tên là "${u.FullName}" (Email: ${u.Email}).\n👉 YÊU CẦU BẮT BUỘC CHO AI: Bạn hãy LUÔN chào hỏi và gọi khách bằng tên "${u.FullName}" (hoặc tên riêng ngắn gọn của khách) khi trò chuyện để thể hiện sự chu đáo, thân thiết (Ví dụ: "Dạ chào ${u.FullName}!", "${u.FullName} muốn dùng món gì ạ?"). TUYỆT ĐỐI KHÔNG xem khách này là khách vãng lai!`;
          }
        } catch (e) {
          this.logger.warn('Không thể tải thông tin user cho chatbot:', e.message);
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
          const historyResult = await this.databaseService.query(historyQuery, [{ name: 'UserID', type: sql.Int, value: userId }]);
          if (historyResult.recordset.length > 0) {
            const pastItems = historyResult.recordset.map(r => r.ProductName).join(', ');
            historyContext = `\nLỊCH SỬ ĐƠN HÀNG ĐÃ MUA TRONG QUÁ KHỨ (KHÔNG PHẢI GIỎ HÀNG HIỆN TẠI): ${pastItems}. Chỉ dùng để gợi ý món ăn khi khách hỏi "hôm nay ăn gì", KHÔNG PHẢI món đang nằm trong giỏ hàng hiện tại.`;
          }
        } catch (e) {
          this.logger.warn('Không thể tải lịch sử đơn hàng cho chatbot:', e.message);
        }
      }

      // 2.5 Lấy thông tin Giỏ hàng hiện tại của User
      let cartContext = '';
      if (userId) {
        try {
          const cartQuery = `
            SELECT p.ProductID, p.ProductName, c.Quantity, p.Price
            FROM CartItems c
            INNER JOIN Products p ON c.ProductID = p.ProductID
            WHERE c.UserID = @UserID
          `;
          const cartResult = await this.databaseService.query(cartQuery, [{ name: 'UserID', type: sql.Int, value: userId }]);
          if (cartResult.recordset.length > 0) {
            // Liệt kê rõ từng món kèm ID để AI đọc đúng
            const cartLines = cartResult.recordset.map(r => `- ${r.Quantity}x ${r.ProductName} (ID sản phẩm=${r.ProductID}, Giá:${r.Price}đ)`).join('\n');
            const subtotal = cartResult.recordset.reduce((sum, r) => sum + (r.Price * r.Quantity), 0);
            const shippingFee = 15000;
            const totalAmount = subtotal + shippingFee;
            cartContext = `\n\n=== GIỎ HÀNG HIỆN TẠI (${cartResult.recordset.length} món) ===\n${cartLines}\nTổng: ${subtotal}đ | Ship: ${shippingFee}đ | Tổng TT: ${totalAmount}đ\n===================================`;
          } else {
            cartContext = `\n\n=== GIỎ HÀNG HIỆN TẠI: TRỐNG ===`;
          }
        } catch (e) {
          this.logger.warn('Không thể tải giỏ hàng cho chatbot:', e.message);
        }
      }

      // 2.6 Lấy danh sách Khuyến mãi (Voucher)
      let promoContext = '';
      try {
        const promoQuery = `
          SELECT PromoCode, Description, MinOrderValue
          FROM Promotions
          WHERE GETDATE() BETWEEN StartDate AND EndDate
            AND UsedCount < UsageLimit
        `;
        const promoResult = await this.databaseService.query(promoQuery);
        if (promoResult.recordset.length > 0) {
          const promos = promoResult.recordset.map(p => `- Mã "${p.PromoCode}": ${p.Description} (Áp dụng cho đơn từ ${p.MinOrderValue} đ)`).join('\n');
          promoContext = `\nDANH SÁCH MÃ GIẢM GIÁ HIỆN CÓ:\n${promos}\n👉 NHIỆM VỤ CỦA AI: Khi khách bày tỏ ý muốn đặt hàng, thanh toán hoặc hỏi về giỏ hàng (mà chưa đưa địa chỉ), BẮT BUỘC bạn phải dựa vào Tổng tiền giỏ hàng hiện tại để đề xuất ngay cho khách mã giảm giá phù hợp nhất và chủ động hỏi: "Bạn có muốn áp dụng mã giảm giá [Tên mã] này cho đơn hàng không ạ? Nếu có, hãy nhắn cho mình địa chỉ giao hàng kèm tên mã nhé!"`;
        }
      } catch (e) {
        this.logger.warn('Không thể tải khuyến mãi cho chatbot:', e.message);
      }

      // 2.7 Lấy trạng thái đơn hàng gần nhất (Order Tracking)
      let orderTrackingContext = '';
      if (userId) {
        try {
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
        } catch (e) {
          this.logger.warn('Không thể tải trạng thái đơn hàng cho chatbot:', e.message);
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

      // 2.9 Thông tin FAQ & Chính sách Quán (FAQ Context)
      const faqContext = `\n\n=== THÔNG TIN & CÂU HỎI THƯỜNG GẶP VỀ FIVEFOOD (FAQ) ===
- Giờ mở cửa: Từ 07:00 sáng đến 22:00 tối hàng ngày (T2 - CN).
- Thời gian giao hàng: Trung bình khoảng 20 - 35 phút tùy địa điểm nội thành.
- Phí vận chuyển (Phí ship): Mặc định 15.000đ cho tất cả đơn hàng nội thành.
- Phương thức thanh toán: Hỗ trợ Tiền mặt khi nhận hàng (COD) và Chuyển khoản online qua cổng VNPay/ATM/QR Code tiện lợi.
- Chính sách hoàn/đổi: Cam kết đổi món mới hoặc hoàn tiền 100% trong vòng 30 phút nếu món ăn bị đổ vỡ, hư hỏng hoặc làm sai đơn.
- Hỗ trợ tư vấn món: Sẵn sàng gợi ý các món cay, món không hành, món chay, đồ uống, combo, hoặc món rẻ theo mức giá khách chọn dựa theo bảng THỰC ĐƠN.`;

      // 3. Xây dựng System Prompt
      const systemPrompt = `Bạn là AI trợ lý của FIVEFOOD. Hỗ trợ khách chọn món, đặt hàng và giải đáp thắc mắc (FAQ) bằng tiếng Việt.

THỰC ĐƠN (dùng cột "ID=" để lấy ID khi thêm giỏ hàng):
${productsContext}
${userContext}${historyContext}${cartContext}${promoContext}${orderTrackingContext}${timeContext}${faqContext}

📌 QUY TẢC CHUNG:
1. Trả lời ngắn gọn, thân thiện, tự nhiên. Chỉ tư vấn món trong thực đơn và thông tin FAQ hợp lệ. KHÔNG in "ID=" ra cho khách thấy.
2. Nếu khách hỏi món ăn chung chung (ví dụ "hôm nay ăn gì", "quán có gì ngon"), có thể gợi ý 1 món bán chạy + 1 món khác. TUYỆT ĐỐI KHÔNG tự ý liệt kê món hay viết thêm các nhãn lạ khi đang trao đổi về giỏ hàng.
3. GIỎ HÀNG HIỆN TẠI ở trên là nơi DUY NHẤT chứa thông tin món đang có trong giỏ. Nếu GIỎ HÀNG HIỆN TẠI là TRỐNG, TUYỆT ĐỐI KHÔNG nói khách đã có món trong giỏ.
4. Ghi nhớ yêu cầu ăn chay/dị ứng/không cay/ngân sách của khách và dùng thông tin Thành phần, Giá, Tình trạng để tư vấn. Nếu khách hỏi về phí ship, thanh toán, thời gian giao hàng, giờ mở cửa... trả lời chính xác theo mục FAQ.

📌 QUY TẮC GIỎ HÀNG (BẮT BUỘC TUÂN THEO):
A. Khi khách muốn thêm món mà KHÔNG CÓ CON SỐ cụ thể: BẮT BUỘC CHỈ HỎI NGẮN GỌN về số lượng, ví dụ "Dạ, bạn muốn thêm bao nhiêu phần Phở Bò Đặc Biệt ạ?". TUYỆT ĐỐI KHÔNG tự gán số lượng hay tạo mã lệnh khi chưa có số.
B. Khi đã có TÊN MÓN VÀ SỐ LƯỢNG (hoặc khi khách trả lời đồng ý/xác nhận sau lời nhắc từ hệ thống): Tạo mã [CART_INTENT] ngay lập tức.
   - Khi tin nhắn trước đó của Hệ thống là câu hỏi xác nhận món trùng (ví dụ "⚠️ Giỏ hàng của bạn đang có sẵn... Bạn có muốn thêm vào không?"):
     + Nếu khách trả lời đồng ý ("có", "ừ", "thêm", "ok", "dạ có"...): BẮT BUỘC bạn CHỈ xuất mã lệnh [CART_INTENT: {"items": [{"id": <ID món đó>, "qty": <số lượng khách muốn thêm>}]}], KHÔNG thêm văn bản tự tác nào khác.
     + Nếu khách TỪ CHỐI ("không", "thôi", "hủy"...): TUYỆT ĐỐI KHÔNG tạo mã [CART_INTENT], chỉ thông báo nhẹ nhàng đã hủy thao tác.
C. qty trong [CART_INTENT] LÀ SỐ LƯỢNG MÓN MỚI KHÁCH MUỐN THÊM TRONG LẦN NÀY (VD: 1). TUYỆT ĐỐI KHÔNG TỰ CỘNG VỚI SỐ LƯỢNG ĐANG CÓ TRONG GIỎ HÀNG.
D. Sau khi xuất [CART_INTENT], có thể gợi ý thêm đồ uống hoặc mã giảm giá.
E. *** KHÔNG nói "đã thêm", "mình thêm xong". Chỉ xuất mã lệnh. ***
F. Dùng đúng ID từ cột "ID=" trong THỰC ĐƠN.

📌 QUY TẮC THANH TOÁN / CHECKOUT (TUYỆT ĐỐI TUÂN THỦ):
1. Ngay khi khách hàng cung cấp ĐỊA CHỈ GIAO HÀNG (ví dụ: "Giao tới 123 Lê Duẩn", "địa chỉ tôi là...", "ship qua phố X", hoặc có kèm mã voucher như "áp dụng mã GIAM20K"):
   👉 BẮT BUỘC CHỈ IN RA DUY NHẤT MÃ LỆNH: [CHECKOUT_INTENT: {"address": "<địa chỉ giao hàng>", "promoCode": "<mã voucher nếu khách có nhắc đến, không có để rỗng>"}]
2. TUYỆT ĐỐI KHÔNG được tự ý bịa đặt hay giả lập thông báo "Đơn hàng đã được tạo thành công, vui lòng xác nhận Có hoặc Đồng ý". Ký ức về đơn hàng, thông báo thanh toán và xác nhận ĐỀU LÀ VIỆC CỦA HỆ THỐNG BACKEND. Nhiệm vụ duy nhất của bạn khi thấy địa chỉ là xuất mã [CHECKOUT_INTENT] và im lặng! Bất kỳ việc nào khác đều là vi phạm nặng nề.

MÃ LỆNH (chỉ in ra mã này, không kèm lời giải thích lúc thanh toán hay xác nhận):
Thêm giỏ: [CART_INTENT: {"items": [{"id": <số ID>, "qty": <số lượng>}]}]
Xóa giỏ: [CLEAR_CART_INTENT]
Thanh toán (xuất ngay khi có địa chỉ): [CHECKOUT_INTENT: {"address": "<địa chỉ>", "promoCode": "<mã hoặc rỗng>"}]
Hủy đơn: [CANCEL_ORDER_INTENT: {"orderId": <ID đơn>}]

VÍ DỤ CÁCH TRẢ LỜI ĐÚNG:
Khách: "Thêm phở" → Bạn: "Dạ, bạn muốn thêm bao nhiêu phần Phở Bò Đặc Biệt ạ?"
Khách: "1 tô" → Bạn: "[CART_INTENT: {"items": [{"id": 5, "qty": 1}]}]"
Khách: "thêm 1 phở nữa" → Bạn: "[CART_INTENT: {"items": [{"id": 5, "qty": 1}]}]"
Khách: "có nha" (xác nhận sau khi được hỏi) → Bạn: "[CART_INTENT: {"items": [{"id": 5, "qty": 1}]}]"
Khách: "không thêm nữa" (từ chối xác nhận) → Bạn: "Dạ vâng, mình đã hủy thêm món này ạ. Bạn có cần tư vấn món khác không?"
Khách: "Giao tới 123 Lê Duẩn, áp dụng mã GIAM20K" → Bạn: "[CHECKOUT_INTENT: {"address": "123 Lê Duẩn", "promoCode": "GIAM20K"}]"
Khách: "Giao tới 456 Quang Trung" → Bạn: "[CHECKOUT_INTENT: {"address": "456 Quang Trung", "promoCode": ""}]"`;

      // 3.5 Lấy lịch sử chat (nếu có sessionId) để AI nhớ ngữ cảnh - giới hạn 3 lượt để tiết kiệm token
      const chatMessages: any[] = [
        { role: 'system', content: systemPrompt }
      ];

      let lastBotResponse = '';
      if (sessionId) {
        const chatLogsQuery = `
          SELECT TOP 3 ConversationData
          FROM ChatbotLogs
          WHERE SessionID = @SessionID
          ORDER BY CreatedAt DESC
        `;
        const chatLogsResult = await this.databaseService.query(chatLogsQuery, [{ name: 'SessionID', type: sql.VarChar(100), value: sessionId }]);
        if (chatLogsResult.recordset.length > 0) {
          try {
            const lastRow = JSON.parse(chatLogsResult.recordset[0].ConversationData);
            lastBotResponse = lastRow.botResponse || '';
          } catch (e) {}

          // Lật ngược lại để đưa vào AI theo đúng thứ tự thời gian (cũ nhất -> mới nhất)
          const historyRows = [...chatLogsResult.recordset].reverse();
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

      // 4. Gọi AI (có retry tự động khi bị rate limit)
      const callGroqAPI = async (retryCount = 0): Promise<any> => {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          },
          body: JSON.stringify({
            model: 'llama-3.1-8b-instant',
            messages: chatMessages,
            temperature: 0.7,
            max_tokens: 512, // Giới hạn output để tiết kiệm token
          })
        });

        if (res.status === 429 && retryCount < 3) {
          // Rate limit: chờ 3s rồi thử lại
          const delay = 3000 * (retryCount + 1);
          this.logger.warn(`Rate limit hit, retrying in ${delay / 1000}s... (attempt ${retryCount + 1}/3)`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return callGroqAPI(retryCount + 1);
        }
        return res;
      };

      const response = await callGroqAPI();

      if (!response.ok) {
        const errorData = await response.text();
        this.logger.error(`Groq API Error: ${errorData}`);
        if (response.status === 429) {
          return {
            reply: '⚡ Hệ thống AI đang bận xử lý nhiều yêu cầu cùng lúc. Vui lòng bấm gửi lại sau vài giây nhé!',
            sessionId: sessionId || uuidv4(),
            orderPlaced: false
          };
        }
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

            // === Kiểm tra từng món xem đã có trong giỏ chưa ===
            const duplicateItems: { name: string; currentQty: number; addQty: number; id: number }[] = [];
            const newItems: { id: number; qty: number }[] = [];

            for (const item of intentData.items) {
              const checkCart = await this.databaseService.query(
                'SELECT ci.CartItemID, ci.Quantity, p.ProductName FROM CartItems ci INNER JOIN Products p ON ci.ProductID = p.ProductID WHERE ci.UserID = @UserID AND ci.ProductID = @ProductID',
                [
                  { name: 'UserID', type: sql.Int, value: userId },
                  { name: 'ProductID', type: sql.Int, value: item.id }
                ]
              );
              if (checkCart.recordset.length > 0) {
                duplicateItems.push({
                  name: checkCart.recordset[0].ProductName,
                  currentQty: checkCart.recordset[0].Quantity,
                  addQty: item.qty,
                  id: item.id
                });
              } else {
                newItems.push(item);
              }
            }

            // Kiểm tra xem tin nhắn trước đó của Bot có phải là câu hỏi xác nhận hay không
            const wasAskingConfirmation = lastBotResponse.includes('Giỏ hàng của bạn đang có') || lastBotResponse.includes('bạn có chắc muốn thêm') || lastBotResponse.includes('trong giỏ đang có');

            if (duplicateItems.length > 0 && !wasAskingConfirmation) {
              // Hỏi xác nhận thay vì thêm ngay
              const confirmLines = duplicateItems.map(d =>
                `**${d.name}** (trong giỏ đang có **${d.currentQty}** rồi, bạn có chắc muốn thêm **${d.addQty}** nữa không?)`
              ).join('\n');
              responseText = `⚠️ Giỏ hàng của bạn đang có sẵn:\n${confirmLines}\n\nBạn có muốn thêm vào không? (Trả lời **"có"** hoặc **"ừ thêm"** để xác nhận)`;
              isOrderPlaced = false;
            } else {
              // Thêm toàn bộ (món mới + món đã xác nhận trùng)
              const itemsToProcess = [
                ...newItems,
                ...(duplicateItems.map(d => ({ id: d.id, qty: d.addQty })))
              ];

              for (const item of itemsToProcess) {
                const checkCart = await this.databaseService.query(
                  'SELECT CartItemID, Quantity FROM CartItems WHERE UserID = @UserID AND ProductID = @ProductID',
                  [
                    { name: 'UserID', type: sql.Int, value: userId },
                    { name: 'ProductID', type: sql.Int, value: item.id }
                  ]
                );
                if (checkCart.recordset.length > 0) {
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

              isOrderPlaced = true;

              // Tự động kiểm tra tổng giỏ hàng và tư vấn mã giảm giá thông minh cho khách
              const updatedCartResult = await this.databaseService.query(
                'SELECT SUM(c.Quantity * p.Price) as Subtotal FROM CartItems c INNER JOIN Products p ON c.ProductID = p.ProductID WHERE c.UserID = @UserID',
                [{ name: 'UserID', type: sql.Int, value: userId }]
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
                [{ name: 'Subtotal', type: sql.Decimal(18, 2), value: subtotal }]
              );

              // Lấy voucher có giá trị gần nhất mà khách chưa đủ điều kiện để kích thích upsale
              const nextPromos = await this.databaseService.query(
                `SELECT TOP 1 PromoCode, Description, MinOrderValue 
                 FROM Promotions 
                 WHERE GETDATE() BETWEEN StartDate AND EndDate 
                   AND UsedCount < UsageLimit 
                   AND MinOrderValue > @Subtotal
                 ORDER BY MinOrderValue ASC`,
                [{ name: 'Subtotal', type: sql.Decimal(18, 2), value: subtotal }]
              );

              let promoMsg = '';
              if (validPromos.recordset.length > 0) {
                const codes = validPromos.recordset.map(p => `**${p.PromoCode}** (${p.Description})`).join(', ');
                promoMsg = `\n🎁 **Ưu đãi phù hợp cho giỏ hàng của bạn:** ${codes}.\n💡 Bạn có muốn áp dụng mã này không? Chỉ cần nhắn địa chỉ giao hàng kèm tên mã (Ví dụ: *"Giao tới 123 Lê Duẩn, dùng mã ${validPromos.recordset[0].PromoCode}"*).`;
              } else if (nextPromos.recordset.length > 0) {
                const nextP = nextPromos.recordset[0];
                const diff = nextP.MinOrderValue - subtotal;
                promoMsg = `\n🔥 **Mẹo ưu đãi:** Bạn chỉ cần mua thêm **${diff.toLocaleString('vi-VN')}đ** nữa là đủ điều kiện dùng mã **${nextP.PromoCode}** (${nextP.Description})! Bạn có muốn chọn thêm món hoặc đồ uống không?`;
              } else {
                promoMsg = `\n💡 Bạn có thể tiếp tục chọn món hoặc nhắn cho mình **Địa chỉ giao hàng** để AI tự động đặt đơn ngay nhé!`;
              }

              responseText = `✅ **Đã thêm món vào giỏ hàng thành công!** (Tổng tiền tạm tính: **${subtotal.toLocaleString('vi-VN')}đ**)${promoMsg}`;
            }
          }
        } catch (err) {
          this.logger.error('Lỗi khi tự động thêm giỏ hàng từ Chatbot', err);
          responseText = '❌ Xin lỗi bạn, quá trình tự động thêm vào giỏ hàng đã xảy ra lỗi. Vui lòng thử lại bằng tay trên website nhé!';
        }
      } else if (cartMatch && !userId) {
        // Có ý định đặt hàng nhưng khách chưa đăng nhập
        responseText = '❌ Bạn cần **Đăng nhập** để AI có thể tự động thêm vào giỏ hàng cho bạn nhé!';
      }

      // 5.2 Xử lý Xóa giỏ hàng tự động
      const clearCartMatch = responseText.match(/\[CLEAR_CART_INTENT\]/);
      if (clearCartMatch && userId) {
        try {
          await this.databaseService.query('DELETE FROM CartItems WHERE UserID = @UserID', [{ name: 'UserID', type: sql.Int, value: userId }]);
          isOrderPlaced = true;
          responseText = '✅ **Đã dọn sạch giỏ hàng thành công!**';
        } catch (err) {
          this.logger.error('Lỗi khi xóa giỏ hàng từ Chatbot', err);
          responseText = '❌ Quá trình xóa giỏ hàng đã xảy ra lỗi.';
        }
      } else if (clearCartMatch && !userId) {
        responseText = '❌ Bạn cần **Đăng nhập** để AI thao tác nhé!';
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
              responseText = '❌ **Giỏ hàng của bạn đang trống!** Vui lòng thêm món trước khi thanh toán.';
            } else {
              const appliedPromo = intentData.promoCode ? intentData.promoCode : null;
              await this.ordersService.createOrder(userId, intentData.address, null, null, 'Tiền mặt', appliedPromo, 15000);
              isOrderPlaced = true;
              let successMsg = '✅ **Đặt hàng thành công!** Đơn hàng của bạn sẽ sớm được giao đến: ' + intentData.address;
              if (appliedPromo) {
                successMsg += ` (Đã áp dụng mã giảm giá ${appliedPromo}).`;
              }
              responseText = successMsg;
            }
          }
        } catch (err) {
          this.logger.error('Lỗi khi checkout từ Chatbot', err);
          responseText = '❌ Quá trình thanh toán xảy ra lỗi, bạn vui lòng tự bấm nút Thanh Toán nhé!';
        }
      } else if (checkoutMatch && !userId) {
        responseText = '❌ Bạn cần **Đăng nhập** để AI đặt hàng nhé!';
      }

      // 5.4 Xử lý Hủy đơn hàng tự động
      const cancelMatch = responseText.match(/\[CANCEL_ORDER_INTENT:\s*(\{.*\})\]/s);
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
