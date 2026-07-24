# ❓ BỘ CÂU HỎI ĐỒ ÁN - FIVEFOOD
*(Tổng hợp từ các chủ đề trong KichBan_ThuyetTrinh.md)*

---

## 🔷 NHÓM 1: Câu hỏi về CSDL & SQL Server (Slide 3)
*Đây là nhóm câu hỏi thầy cô HỎI NHIỀU NHẤT vì đây là điểm kỹ thuật nổi bật nhất của đồ án.*

---

**Q1: Temporal Table là gì? Tại sao em dùng nó thay vì tự tạo bảng lịch sử?**

> **Trả lời:** Temporal Table (Bảng Xuyên Thời Gian) là tính năng tích hợp sẵn trong SQL Server 2016 trở lên. Khi khai báo `WITH (SYSTEM_VERSIONING = ON)`, SQL Server tự động tạo một bảng lịch sử (History Table) và tự động copy dòng dữ liệu cũ vào bảng đó mỗi khi có thao tác UPDATE hoặc DELETE, kèm theo dấu thời gian chính xác. 
>
> So với việc tự viết Trigger để lưu lịch sử: Temporal Table an toàn hơn vì không thể bỏ qua (Trigger có thể bị disable), chính xác hơn về thời gian (dùng giờ UTC của Server), và có cú pháp truy vấn lịch sử chuyên dụng `FOR SYSTEM_TIME AS OF '2026-01-01'` rất tiện lợi.

---

**Q2: Stored Procedure trong dự án của em làm gì? Có thể thay bằng code ở tầng Backend không?**

> **Trả lời:** SP `sp_TaoHoaDon` đảm nhiệm toàn bộ quy trình tạo đơn hàng: kiểm tra giỏ hàng có trống không, kiểm tra tồn kho từng sản phẩm, validate mã giảm giá (hạn dùng, lượt dùng, giá trị tối thiểu), tính tổng tiền, tạo bản ghi Orders và OrderDetails, rồi xóa giỏ hàng. Tất cả nằm trong một Transaction ACID duy nhất.
>
> Về lý thuyết có thể viết logic đó ở Backend (Node.js), nhưng lợi thế của SP là: (1) Toàn bộ xử lý xảy ra tại Database Server, giảm độ trễ mạng; (2) ROLLBACK tự động nếu có lỗi giữa chừng; (3) Chống Race Condition khi nhiều người cùng đặt hàng một lúc.

---

**Q3: Trigger trong dự án hoạt động như thế nào?**

> **Trả lời:** Dự án có 2 Trigger chính:
> - `trg_ChiTietHoaDon_Insert`: Kích hoạt sau khi INSERT vào `OrderDetails`. Tự động trừ số lượng tồn kho (`Inventory`) của sản phẩm tương ứng.
> - `trg_HoaDon_UpdateStatus`: Kích hoạt khi trạng thái đơn hàng trong `Orders` được UPDATE. Nếu đơn bị HỦY, Trigger sẽ tự động hoàn trả lại tồn kho và tăng lại lượt dùng của Voucher (nếu có).
>
> Việc dùng Trigger đảm bảo dữ liệu luôn nhất quán dù ai (Backend hay DBA) thực hiện thao tác.

---

**Q4: ACID là gì? Dự án em đảm bảo ACID ở đâu?**

> **Trả lời:** ACID là 4 tính chất của giao dịch CSDL:
> - **A - Atomicity (Nguyên tử):** Tất cả các bước trong giao dịch hoặc thành công cùng nhau, hoặc thất bại và hoàn tác toàn bộ.
> - **C - Consistency (Nhất quán):** Dữ liệu trước và sau giao dịch đều tuân thủ các ràng buộc.
> - **I - Isolation (Cô lập):** Các giao dịch song song không ảnh hưởng lẫn nhau.
> - **D - Durability (Bền vững):** Dữ liệu đã COMMIT được lưu vĩnh viễn dù Server có sự cố.
>
> Trong dự án, SP `sp_TaoHoaDon` bọc toàn bộ logic trong `BEGIN TRANSACTION ... COMMIT ... ROLLBACK`, đảm bảo tính Atomicity và Consistency khi tạo đơn hàng.

---

**Q5: Tại sao bảng Orders lại có cột Latitude và Longitude?**

> **Trả lời:** Đây là thiết kế hướng tới hướng phát triển tương lai của hệ thống. Khi khách hàng nhập địa chỉ giao hàng và cho phép lấy vị trí, hệ thống sẽ lưu tọa độ GPS. Dữ liệu này phục vụ cho tính năng bản đồ theo dõi Shipper thời gian thực bằng thư viện Leaflet.js mà em đề cập trong phần hướng phát triển tương lai.

---

## 🔷 NHÓM 2: Câu hỏi về Kiến trúc hệ thống (Slide 3)

---

**Q6: Tại sao em chọn NestJS cho Backend thay vì Express thuần hoặc các framework khác?**

> **Trả lời:** NestJS xây dựng trên nền Express nhưng bổ sung kiến trúc Module hóa theo phong cách Angular: mỗi chức năng (Auth, Orders, Products...) là một Module độc lập với Controller và Service riêng, kết nối nhau qua Dependency Injection. Điều này giúp code có cấu trúc rõ ràng, dễ mở rộng và bảo trì hơn nhiều so với Express thuần (không có kiến trúc chuẩn). NestJS cũng hỗ trợ WebSocket (Gateway) rất tự nhiên, rất phù hợp cho tính năng Chat realtime.

---

**Q7: JWT là gì? Nó bảo mật hơn Session như thế nào?**

> **Trả lời:** JWT (JSON Web Token) là một chuỗi mã hóa chứa thông tin người dùng (userId, role) được ký bằng khóa bí mật. Sau khi đăng nhập thành công, Server trả về JWT. Mọi request sau đó, Client đính kèm JWT vào Header `Authorization: Bearer <token>`, Server chỉ cần xác minh chữ ký mà **không cần truy vấn Database**.
>
> So với Session: Session phải lưu trên Server (bộ nhớ hoặc DB), tốn tài nguyên và khó mở rộng ngang (scale out). JWT là phi trạng thái (stateless), bất kỳ server nào cũng xác minh được chỉ cần có cùng khóa bí mật.

---

**Q8: Socket.IO khác WebSocket thuần như thế nào?**

> **Trả lời:** WebSocket là giao thức nền tảng cho kết nối 2 chiều liên tục. Socket.IO là thư viện xây dựng trên WebSocket nhưng có thêm nhiều tính năng: tự động fallback sang polling nếu WebSocket bị chặn (tường lửa công ty), hỗ trợ Room/Namespace để gửi tin nhắn nhóm chính xác, và tự động reconnect. Trong dự án, em dùng tính năng Room để đảm bảo tin nhắn gõ từ Admin chỉ gửi đúng đến phòng của Khách hàng đó, không bị lộ sang người khác.

---

## 🔷 NHÓM 3: Câu hỏi về Vibe Coding & Quy trình (Slide 4)

---

**Q9: Vibe Coding có nghĩa là em copy code từ AI về không? Bản thân em hiểu code đó không?**

> **Trả lời:** Không phải copy nguyên xi. Phương pháp Vibe Coding là dùng AI như một "lập trình viên cấp dưới" – em cung cấp yêu cầu nghiệp vụ chi tiết, AI đề xuất cấu trúc, em review, chỉnh sửa và tích hợp vào hệ thống. Bản thân em phải hiểu rõ logic để có thể kiểm tra AI đề xuất đúng hay sai. Ví dụ: em phải hiểu ACID thì mới biết SP cần bọc trong Transaction; phải hiểu JWT thì mới cấu hình Middleware Guard đúng. AI giúp em viết nhanh hơn, nhưng em là người ra quyết định kiến trúc và nghiệp vụ.

---

## 🔷 NHÓM 4: Câu hỏi về Tính năng (Slide 5)

---

**Q10: Nếu 2 người cùng đặt mua sản phẩm cuối cùng cùng lúc thì hệ thống xử lý thế nào?**

> **Trả lời:** Vấn đề này gọi là Race Condition. Nhờ Stored Procedure chạy trong Transaction với cơ chế khóa dòng (Row Lock) của SQL Server, chỉ một giao dịch được phép đọc và trừ tồn kho tại một thời điểm. Giao dịch đến sau sẽ phải chờ. Ngoài ra, trong SP có kiểm tra điều kiện `Quantity > Inventory` và sẽ THROW lỗi với thông báo cụ thể nếu hàng không đủ.

---

**Q11: Typing Indicator ("Cửa hàng đang phản hồi...") hoạt động như thế nào về mặt kỹ thuật?**

> **Trả lời:** Khi Admin gõ phím trong ô Chat, Frontend phát sự kiện `typing` qua Socket.IO kèm `{receiverId, isTyping: true}`. Backend (Gateway) nhận sự kiện này và phát tiếp sự kiện `typingStatus` vào đúng phòng (Room) của Khách hàng tương ứng. Phía Khách hàng đang lắng nghe sự kiện `typingStatus`, khi nhận được sẽ hiển thị dòng chữ đó. Để tối ưu, em dùng kỹ thuật Debounce: nếu Admin ngừng gõ quá 2 giây, hệ thống tự gửi `isTyping: false` để ẩn dòng chữ đó đi.

---

**Q12: Tại sao không cho Admin hủy đơn hàng?**

> **Trả lời:** Đây là quyết định nghiệp vụ có chủ đích. Trong thực tế, đơn hàng thuộc về quyền lợi của khách hàng. Nếu Admin có thể tự ý hủy đơn, sẽ không có sự minh bạch và khách hàng có thể bị thiệt thòi. Vì vậy, hệ thống chỉ cho phép Khách hàng (người đặt) mới có quyền hủy đơn của chính mình. Admin chỉ có quyền chuyển trạng thái (duyệt, đang giao, hoàn thành).

---

## 🔷 NHÓM 5: Câu hỏi về Hướng phát triển (Slide 6)

---

**Q13: Em định tích hợp AI gợi ý món ăn như thế nào?**

> **Trả lời:** Trong CSDL đã có View `v_RecommendedProducts` lưu thống kê số lượng từng món ăn mà từng khách hàng đã mua. Dựa vào dữ liệu này, em có thể áp dụng thuật toán Collaborative Filtering (Lọc cộng tác): "Những khách hàng có lịch sử mua giống bạn cũng thích món này". Nếu muốn nhanh hơn, em có thể gọi API của Gemini AI, truyền vào lịch sử đặt hàng và nhờ AI gợi ý món phù hợp theo ngữ cảnh.

---

**Q14: Tại sao lại cảnh báo Shipper gọi > 3 lần thay vì tự động hủy đơn?**

> **Trả lời:** Đây cũng là quyết định nghiệp vụ thực tế. Việc tự động hủy đơn hàng có thể gây thiệt hại cho cả cửa hàng lẫn Shipper (đã chuẩn bị hàng, đã đến nơi). Thay vào đó, hệ thống ghi nhận số lần gọi và gửi thông báo cảnh báo cho Khách hàng. Việc ra quyết định hủy hay không thuộc về Khách hàng và cửa hàng thỏa thuận, phù hợp với thực tế hơn.
