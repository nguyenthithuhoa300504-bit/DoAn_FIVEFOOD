# 🎬 HƯỚNG DẪN DEMO TRỰC TIẾP - FIVEFOOD
*(Dành cho phần thuyết trình, thời gian demo khoảng 5-7 phút)*

> **Chuẩn bị trước khi demo:**
> - Mở sẵn 2 cửa sổ trình duyệt (1 Khách hàng + 1 Admin)
> - Mở sẵn trang `http://localhost:5173`
> - Backend và Frontend đang chạy (`npm run start:dev` + `npm run dev`)

---

## 🟢 PHẦN 1: DEMO GÓC NHÌN KHÁCH HÀNG (~3 phút)

### Bước 1 — Trang chủ & Duyệt món ăn
> *"Đây là trang chủ của FIVEFOOD, thiết kế theo hướng hiện đại với giao diện tối/sáng..."*
- Vào `http://localhost:5173`
- Cuộn xuống cho thầy cô thấy danh sách món ăn theo danh mục
- Bấm vào ô tìm kiếm, gõ tên một món (VD: "Bò") → kết quả lọc hiện ra tức thì

### Bước 2 — Đăng nhập tài khoản Khách hàng
> *"Khách hàng đăng nhập bằng email và mật khẩu, hệ thống xác thực bằng JWT Token..."*
- Bấm nút **Đăng nhập**
- Nhập: Email `client@fivefood.com` / Mật khẩu `123456`
- Bấm **Đăng nhập** → Hệ thống chào tên khách hàng

### Bước 3 — Xem chi tiết món & Thêm vào giỏ
> *"Khách hàng xem chi tiết món ăn, bao gồm thành phần, giá và đánh giá từ người mua trước..."*
- Click vào một món ăn bất kỳ
- Chỉ vào phần mô tả, giá, sao đánh giá
- Nhấn **Thêm vào giỏ hàng**
- Thêm thêm 1-2 món nữa

### Bước 4 — Giỏ hàng & Áp dụng mã giảm giá
> *"Đây là tính năng nổi bật: hệ thống kiểm tra mã giảm giá trực tiếp tại Backend với đầy đủ điều kiện ràng buộc..."*
- Bấm vào biểu tượng **Giỏ hàng**
- Điều chỉnh số lượng món
- Gõ mã voucher vào ô (hỏi trước Admin mã nào đang active)
- Bấm **Đặt hàng** → Nhập địa chỉ giao hàng

### Bước 5 — Thanh toán
> *"Hệ thống hỗ trợ 2 hình thức: COD và thanh toán online VNPay..."*
- Chọn **Thanh toán khi nhận hàng (COD)**
- Bấm **Xác nhận đặt hàng** → Thông báo thành công hiện ra
- Bấm vào **Lịch sử đơn hàng** → Thấy đơn mới với trạng thái "Chờ xác nhận"

### Bước 6 — Chat với cửa hàng *(Tính năng Realtime)*
> *"Đây là tính năng Chat Realtime bằng Socket.IO. Khách hàng nhắn tin và sẽ thấy dấu hiệu cửa hàng đang phản hồi..."*
- Bấm vào icon **Chat / Liên hệ**
- Gõ một tin nhắn (VD: "Mình muốn hỏi về món Bò lúc lắc")
- *(Lúc này chuyển sang cửa sổ Admin để phản hồi, khách hàng sẽ thấy "Cửa hàng đang phản hồi...")*

---

## 🔴 PHẦN 2: DEMO GÓC NHÌN ADMIN (~2 phút)

*(Mở cửa sổ trình duyệt thứ 2 ở chế độ ẩn danh hoặc tab mới)*

### Bước 7 — Đăng nhập Admin
- Vào `http://localhost:5173`
- Đăng nhập: Email `admin@fivefood.com` / Mật khẩu `123456`
- Hệ thống tự chuyển sang giao diện **Quản trị**

### Bước 8 — Duyệt đơn hàng
> *"Admin nhìn thấy ngay đơn hàng vừa khách đặt ở bước 5, và có thể chuyển trạng thái..."*
- Bấm vào tab **Quản lý Đơn hàng**
- Thấy đơn hàng mới với trạng thái "Chờ xác nhận"
- Bấm **Duyệt đơn** → Trạng thái chuyển sang "Đang giao"

### Bước 9 — Quản lý sản phẩm & Lịch sử giá *(Temporal Table)*
> *"Đây là điểm nhấn kỹ thuật: SQL Server Temporal Table tự động lưu toàn bộ lịch sử thay đổi giá..."*
- Bấm vào tab **Quản lý Sản phẩm**
- Click nút **Sửa** trên một sản phẩm → Đổi giá sang giá mới → **Lưu**
- Bấm vào biểu tượng **Lịch sử** của sản phẩm đó
- *(Bảng lịch sử hiện ra ghi rõ giá cũ, giá mới, thời điểm thay đổi)*

### Bước 10 — Phản hồi Chat Realtime
> *"Admin gõ phản hồi, ngay lập tức bên phía Khách hàng thấy chữ 'Cửa hàng đang phản hồi...' xuất hiện theo thời gian thực."*
- Bấm vào tab **Live Chat**
- Chọn tên Khách hàng ở Bước 6 trong danh sách
- Bắt đầu gõ tin nhắn phản hồi
- *(Yêu cầu thầy cô nhìn sang cửa sổ Khách hàng bên cạnh — thấy ngay dòng chữ "Cửa hàng đang phản hồi..." xuất hiện tức thì)*
- Bấm **Gửi** → Tin nhắn hiện đồng thời ở cả 2 màn hình

---

## 💬 CÂU NÓI KẾT THÚC DEMO

> *"Như vậy, em vừa demo xong toàn bộ luồng nghiệp vụ từ góc nhìn Khách hàng lẫn Quản trị viên. Tất cả các giao tiếp giữa Frontend và Backend đều thông qua REST API và WebSocket chạy ổn định. Em xin kết thúc phần demo. Thầy cô có câu hỏi nào muốn làm rõ thêm về kỹ thuật hoặc tính năng không ạ?"*

---

## ❓ MỘT SỐ CÂU HỎI THẦY CÔ HAY HỎI & GỢI Ý TRẢ LỜI

| Câu hỏi | Gợi ý trả lời |
|---------|--------------|
| **JWT là gì, dùng để làm gì?** | JWT (JSON Web Token) là chuẩn xác thực phi trạng thái. Sau khi đăng nhập, Server trả về một Token mã hóa. Mọi Request sau đó đều phải đính kèm Token này trong Header. Server xác minh Token mà không cần truy vấn DB → hiệu năng cao. |
| **Temporal Table khác gì so với tự tạo bảng lịch sử?** | Temporal Table là tính năng tích hợp sẵn trong SQL Server 2022. Hệ thống tự động ghi vào bảng lịch sử mà không cần Trigger hay code ứng dụng can thiệp → an toàn và không thể bỏ sót. |
| **Tại sao dùng Socket.IO thay vì HTTP polling?** | HTTP polling phải liên tục gửi Request hỏi Server (lãng phí băng thông). Socket.IO duy trì một kết nối 2 chiều liên tục, Server tự đẩy dữ liệu khi có sự kiện → độ trễ gần như bằng 0, phù hợp cho Chat. |
| **Stored Procedure an toàn hơn query thông thường?** | Đúng. SP được biên dịch sẵn, chống SQL Injection vì không nhúng chuỗi vào câu lệnh SQL. Đặc biệt, SP trong dự án này bọc toàn bộ quy trình tạo đơn hàng trong một Transaction ACID, đảm bảo hoặc tất cả thành công hoặc tất cả hoàn tác. |
| **Tại sao dùng NestJS thay vì Express thuần?** | NestJS xây dựng trên nền Express nhưng có thêm kiến trúc Module hóa rõ ràng (Module, Controller, Service), hỗ trợ Dependency Injection và Decorator — giúp code dễ bảo trì và mở rộng hơn nhiều so với Express thuần. |
