# KỊCH BẢN VÀ NỘI DUNG THUYẾT TRÌNH SLIDE - FIVEFOOD
*(Thời lượng dự kiến: 10 - 15 phút)*

Dưới đây là chi tiết nội dung bạn cần copy vào PowerPoint và phần Kịch bản lời nói (Speaker Notes) để bạn tập thuyết trình.

---

## Slide 1: Tổng quan đề tài và thành viên tham gia thực hiện

**1. Nội dung hiển thị trên Slide (Copy vào PPT):**
*   **Đề tài:** FIVEFOOD - Hệ thống đặt và giao đồ ăn trực tuyến.
*   **Môn học:** Lập trình ứng dụng web.
*   **Giảng viên hướng dẫn:** [Tên Giảng Viên]
*   **Sinh viên thực hiện:** 
    *   Nguyễn Thị Thu Hòa - [Mã sinh viên] - [Vai trò: VD: Fullstack Developer]

**2. Hướng dẫn thêm hình ảnh:**
*   Chèn Logo trường đại học của bạn.
*   Chèn một ảnh minh họa về đồ ăn/delivery cho sinh động.

**3. Kịch bản thuyết trình (Speaker Notes):**
> *"Kính chào thầy cô và các bạn. Hôm nay, em xin phép được trình bày đề tài cuối kỳ môn Lập trình ứng dụng Web. Dự án của em mang tên FIVEFOOD - là một Hệ thống đặt và giao đồ ăn trực tuyến. Dự án do em là Nguyễn Thị Thu Hòa phụ trách toàn bộ từ khâu phân tích cơ sở dữ liệu, thiết kế giao diện đến lập trình hệ thống backend."*

---

## Slide 2: Bài toán thực tế và đối tượng người dùng

**1. Nội dung hiển thị trên Slide (Copy vào PPT):**
*   **Bài toán cần giải quyết:**
    *   Đáp ứng nhu cầu đặt đồ ăn trực tuyến tiện lợi, nhanh chóng của khách hàng.
    *   Cung cấp giải pháp phần mềm toàn diện cho chủ cửa hàng: tự động hóa quản lý kho, áp dụng mã giảm giá, theo dõi doanh thu.
    *   Khắc phục tình trạng sai sót khi ghi nhận đơn hàng thủ công.
*   **Đối tượng người dùng (3 nhóm chính):**
    *   🧑 **Khách hàng:** Tìm kiếm, xem chi tiết món ăn, đặt hàng, thanh toán và đánh giá.
    *   👨‍💻 **Quản trị viên (Admin):** Quản lý thực đơn, duyệt đơn hàng, theo dõi lịch sử thay đổi giá và tồn kho.
    *   🛵 **Người giao hàng (Shipper):** Nhận và cập nhật trạng thái chuyến giao hàng.

**2. Hướng dẫn thêm hình ảnh:**
*   Sử dụng các icon (biểu tượng) nhỏ bên cạnh mỗi đối tượng người dùng (Khách hàng, Admin, Shipper) để slide bớt nhàm chán.

**3. Kịch bản thuyết trình (Speaker Notes):**
> *"Lý do em chọn đề tài này xuất phát từ nhu cầu rất lớn của thị trường F&B hiện nay. Ứng dụng giải quyết được 2 vấn đề lớn: Thứ nhất là mang lại sự tiện lợi cho khách hàng khi đặt món; Thứ hai là giúp chủ cửa hàng số hóa quy trình quản lý. Hệ thống của em hướng tới 3 đối tượng chính: Khách hàng để mua sắm, Quản trị viên để quản lý toàn bộ hệ thống, và Shipper để quản lý quá trình giao nhận."*

---

## Slide 3: Sơ đồ kiến trúc công nghệ và Mô hình dữ liệu (Quan trọng)

**1. Nội dung hiển thị trên Slide (Copy vào PPT):**
*   **Kiến trúc phân tầng (Decoupled Architecture):**
    *   `ReactJS (Vite)` – Xây dựng giao diện SPA mượt mà, thân thiện.
    *   `NestJS` – Cung cấp hệ thống API RESTful bảo mật, chuẩn hóa.
    *   `Microsoft SQL Server 2022` - Quản trị Cơ sở dữ liệu.
*   **Điểm nhấn Cơ sở dữ liệu (15 bảng):**
    *   **Temporal Table:** Tự động lưu lịch sử thay đổi giá và số lượng tồn kho theo thời gian.
    *   **Database Triggers:** Tự động trừ tồn kho khi có đơn đặt hàng thành công và tự động hoàn trả kho/Voucher khi đơn bị hủy.
    *   **Stored Procedures & ACID:** Đóng gói logic tính tiền, kiểm tra kho, áp dụng mã giảm giá thành một khối Giao dịch an toàn.

**2. Hướng dẫn thêm hình ảnh (Bắt buộc phải có):**
*   **Hình ảnh 1:** Vẽ sơ đồ khối kiến trúc 3 thành phần: `ReactJS ↔ NestJS ↔ SQL Server`.
*   **Hình ảnh 2:** Chụp sơ đồ mô hình quan hệ ERD của 15 bảng trong CSDL.
*   *Mẹo:* Khoanh đỏ hoặc highlight bảng `Products`, `Orders` và `OrderDetails` trên hình để dễ dàng chỉ tay vào phân tích khi thuyết trình.

**3. Kịch bản thuyết trình (Speaker Notes):**
> *"Về mặt công nghệ, em sử dụng kiến trúc phân tầng: Frontend dùng ReactJS để tối ưu trải nghiệm người dùng, Backend dùng framework NestJS mạnh mẽ. Điểm nhấn lớn nhất trong dự án của em nằm ở Cơ sở dữ liệu SQL Server. Em đã áp dụng Temporal Table để hệ thống tự động track được lịch sử biến động giá của món ăn. Đồng thời, mọi nghiệp vụ phức tạp như trừ kho, hoàn voucher đều được tự động hóa thông qua Triggers và Stored Procedures với chuẩn ACID để đảm bảo dữ liệu không bao giờ bị sai lệch."*

---

## Slide 4: Quy trình ứng dụng phương pháp Vibe Coding

**1. Nội dung hiển thị trên Slide (Copy vào PPT):**
*   **Vibe Coding:** Phương pháp tương tác và cộng tác lập trình cùng AI (AI Agent/Copilot) để tối ưu thời gian phát triển.
*   **Các bước ứng dụng trong dự án:**
    *   **Thiết kế Database:** Dùng Prompt mô tả nghiệp vụ để AI sinh ra script SQL chuẩn xác gồm 15 bảng, Trigger và Procedure.
    *   **Xây dựng Backend (NestJS):** Tận dụng AI để khởi tạo nhanh các module, controller, middleware xác thực (JWT/Bcrypt).
    *   **Thiết kế UI/UX (ReactJS):** Yêu cầu AI tạo bộ khung component, layout hiện đại, có hiệu ứng mà không tốn nhiều giờ viết CSS thủ công.
    *   **Gỡ lỗi (Debugging):** Xử lý nhanh các lỗi khó bằng cách cung cấp log cho AI phân tích.

**2. Kịch bản thuyết trình (Speaker Notes):**
> *"Điểm đặc biệt trong quá trình làm dự án là em đã ứng dụng phương pháp Vibe Coding – làm việc chặt chẽ cùng với AI. Thay vì gõ thủ công toàn bộ code, em tập trung vào việc thiết kế nghiệp vụ và sử dụng Prompt để AI hỗ trợ generate cấu trúc Database, viết các Trigger phức tạp cũng như xây dựng các Component ReactJS. Điều này giúp em tiết kiệm được rất nhiều thời gian code lặp lại để tập trung vào logic cốt lõi của hệ thống."*

---

## Slide 5: Demo các tính năng cốt lõi của hệ thống

**1. Nội dung hiển thị trên Slide (Copy vào PPT):**
*(Ghi tiêu đề ngắn gọn)*
*   Giao diện Trang chủ và Tìm kiếm món ăn.
*   Luồng Đặt hàng: Thêm giỏ hàng, Thanh toán và Áp dụng mã giảm giá (Voucher).
*   Trang Quản trị viên (Admin): Quản lý món ăn, Xem lịch sử giá, Quản lý đơn hàng.

**2. Hướng dẫn thêm hình ảnh (Bắt buộc phải có):**
*   **Hình ảnh 1:** Chụp màn hình trang chủ đẹp mắt.
*   **Hình ảnh 2:** Chụp màn hình bước Giỏ hàng / Thanh toán thành công có áp dụng Voucher.
*   **Hình ảnh 3:** Chụp màn hình trang Admin Dashboard hiển thị thông tin thay đổi giá hoặc đơn hàng.
*   *(Lưu ý: Nếu tự tin, bạn hãy mở sẵn localhost để demo trực tiếp thay vì chỉ chiếu ảnh).*

**3. Kịch bản thuyết trình (Speaker Notes):**
> *"Tiếp theo, em xin phép được demo trực tiếp các tính năng chính của hệ thống. Đầu tiên là giao diện trang chủ dành cho khách hàng với trải nghiệm mượt mà... Tiếp đến là quá trình khách hàng đặt đồ ăn và áp dụng thành công mã giảm giá... Cuối cùng, xin mời thầy cô xem giao diện dành cho Admin, nơi em có thể quản lý được sự thay đổi giá cả của món ăn theo thời gian nhờ vào cơ sở dữ liệu đã thiết kế."*

---

## Slide 6: Biểu đồ đóng góp công việc và Kết luận

**1. Nội dung hiển thị trên Slide (Copy vào PPT):**
*   **Đóng góp công việc:** (Thể hiện bằng biểu đồ).
*   **Kết luận:**
    *   Giải quyết tốt quy trình đặt và quản lý đồ ăn trực tuyến.
    *   Xây dựng thành công kiến trúc phần mềm hiện đại và CSDL tối ưu.
*   **Hướng phát triển tương lai:**
    *   Tích hợp bản đồ Leaflet theo dõi Shipper thời gian thực.
    *   Phát triển hệ thống AI gợi ý món ăn dựa vào lịch sử mua hàng.
*   **Lời cảm ơn!**

**2. Hướng dẫn thêm hình ảnh (Bắt buộc phải có):**
*   Vào Insert -> Chart -> Pie trong PowerPoint để vẽ một **Biểu đồ tròn (Pie Chart)**.
*   Chia tỷ lệ phần trăm (Ví dụ: Frontend 35%, Backend 40%, Database 25%) và ghi tất cả là Nguyễn Thị Thu Hòa (hoặc chia cho các bạn cùng nhóm nếu có).

**3. Kịch bản thuyết trình (Speaker Notes):**
> *"Về phần đóng góp, do dự án làm cá nhân nên em đảm nhiệm 100% các khâu từ phân tích đến lập trình. Kết luận lại, dự án FIVEFOOD đã xây dựng thành công một quy trình hoàn chỉnh áp dụng công nghệ mới. Trong tương lai, em định hướng sẽ tích hợp thêm bản đồ thời gian thực để theo dõi Shipper và ứng dụng AI để gợi ý món ăn. Em xin chân thành cảm ơn thầy cô và các bạn đã chú ý lắng nghe. Em rất mong nhận được câu hỏi và góp ý từ hội đồng ạ!"*
