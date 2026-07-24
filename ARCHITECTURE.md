# Sơ đồ Kiến trúc Hệ thống - FiveFood

Dưới đây là sơ đồ mô tả kiến trúc tổng thể của toàn bộ hệ thống dự án **FiveFood**. Sơ đồ này trình bày cách thức các thành phần từ Frontend (Giao diện), Backend (Máy chủ API) đến Database (Cơ sở dữ liệu) và các Dịch vụ bên ngoài giao tiếp với nhau.

## Sơ đồ Kiến trúc (Mermaid)

*Bạn có thể xem trực tiếp hình ảnh sơ đồ này bằng cách nhấn `Ctrl + Shift + V` trong VS Code (giống như cách bạn đã xem ER Diagram).*

```mermaid
graph TD
    %% Define styles
    classDef client fill:#e1f5fe,stroke:#03a9f4,stroke-width:2px,color:#000;
    classDef frontend fill:#fff3e0,stroke:#ff9800,stroke-width:2px,color:#000;
    classDef backend fill:#e8f5e9,stroke:#4caf50,stroke-width:2px,color:#000;
    classDef db fill:#fce4ec,stroke:#e91e63,stroke-width:2px,color:#000;
    classDef external fill:#eceff1,stroke:#607d8b,stroke-width:2px,color:#000;

    %% Actors
    User((🧑‍💻 Khách Hàng)):::client
    Admin((👨‍💼 Quản Trị Viên)):::client

    %% Frontend Layer
    subgraph FrontendLayer [Tầng Giao Diện - Frontend Layer]
        direction TB
        WebApp[Ứng dụng Web FiveFood<br/>(ReactJS / Vite)]:::frontend
    end

    %% Backend Layer
    subgraph BackendLayer [Tầng Ứng Dụng - Backend Layer]
        direction TB
        NestAPI[NestJS API Server<br/>(Xử lý Logic & HTTP REST)]:::backend
        SocketGateway[WebSocket Gateway<br/>(Socket.IO - Realtime Chat)]:::backend
    end

    %% Data Layer
    subgraph DataLayer [Tầng Dữ Liệu - Data Layer]
        SQLServer[(Microsoft SQL Server<br/>Database)]:::db
    end

    %% External Services
    subgraph ExternalServices [Các Dịch vụ Bên ngoài]
        direction TB
        VNPay[Cổng thanh toán VNPay]:::external
        AI[Dịch vụ AI Chatbot]:::external
    end

    %% Client to Frontend Connections
    User -->|Truy cập, Đặt hàng| WebApp
    Admin -->|Quản lý cửa hàng| WebApp

    %% Frontend to Backend Connections
    WebApp <-->|Gọi HTTP Request (REST API)| NestAPI
    WebApp <-->|Kết nối 2 chiều (Realtime)| SocketGateway

    %% Backend to Database Connections
    NestAPI <-->|Truy vấn dữ liệu (TypeORM)| SQLServer
    SocketGateway <-->|Lưu trữ tin nhắn| SQLServer

    %% Backend to External
    NestAPI <-->|Tạo URL & Xác minh| VNPay
    NestAPI <-->|Gửi/Nhận tin nhắn tự động| AI
```

## Giải thích chi tiết các Tầng (Layers) để viết Báo cáo Đồ án

Khi đưa sơ đồ này vào báo cáo, bạn có thể diễn giải theo 4 khối chính sau:

1. **Khối Người dùng (Actors):**
   - Bao gồm Khách hàng và Quản trị viên truy cập vào hệ thống thông qua trình duyệt web trên máy tính hoặc điện thoại.

2. **Tầng Giao diện (Frontend Layer):**
   - Xây dựng bằng công nghệ **ReactJS (Vite)**. 
   - Đóng vai trò hiển thị giao diện, tiếp nhận thao tác của người dùng và gửi yêu cầu (Request) xuống Backend.

3. **Tầng Ứng dụng (Backend Layer):**
   - Xây dựng bằng framework **NestJS (Node.js)**. Được chia làm 2 luồng chính:
     - **NestJS API Server:** Xử lý các logic nghiệp vụ nặng (Đăng nhập, Thêm giỏ hàng, Thanh toán, Quản lý sản phẩm) thông qua giao thức HTTP REST.
     - **WebSocket Gateway (Socket.IO):** Xử lý các tác vụ yêu cầu tốc độ thời gian thực (Real-time) như: Chat trực tuyến giữa Khách hàng và Cửa hàng, đẩy Thông báo (Notification).

4. **Tầng Dữ liệu (Data Layer):**
   - Sử dụng hệ quản trị **Microsoft SQL Server**. Nơi lưu trữ toàn bộ thông tin hệ thống (Sản phẩm, Người dùng, Đơn hàng...). Backend sẽ giao tiếp với Database qua bộ ánh xạ đối tượng `TypeORM`.

5. **Dịch vụ bên ngoài (External Services):**
   - **VNPay:** Xử lý các giao dịch thanh toán điện tử của khách hàng.
   - **AI Chatbot:** Dịch vụ AI tích hợp để tự động trả lời khách hàng khi cửa hàng không online.
