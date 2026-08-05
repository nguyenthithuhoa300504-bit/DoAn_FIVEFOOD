import React, { useState, useEffect } from 'react';
import { MessageSquare, QrCode, ExternalLink, X, ShieldCheck } from 'lucide-react';
import './ZaloWidget.css';

// 🟢 CẤU HÌNH THÔNG TIN ZALO TẠI ĐÂY:
// 1. Số điện thoại Zalo của bạn (Dùng cho nút Mở nhanh App Zalo và mã QR dự phòng):
export const MY_ZALO_PHONE = "0335043005"; // (Bạn có thể sửa lại cho khớp 100% với SĐT thật của bạn)

// 2. Đường dẫn file hình ảnh Mã QR Zalo cá nhân thật của bạn:
// (Bạn hãy chụp mã QR từ app Zalo trên điện thoại, đặt tên file là 'zalo_qr.png' (hoặc jpg) rồi bỏ vào thư mục: frontend/public/images/)
export const MY_ZALO_QR_IMAGE = "/images/zalo_qr.png";

const ZaloWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [imgSrc, setImgSrc] = useState(MY_ZALO_QR_IMAGE);

  const toggleModal = () => setIsOpen(!isOpen);

  // Xử lý sự kiện bấm phím Esc để đóng Modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Fallback: Nếu bạn chưa kịp thả ảnh QR thật vào folder, hệ thống tự động tạo mã QR chuẩn dẫn tới Zalo của số điện thoại trên
  const handleImageError = () => {
    setImgSrc(`https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=https://zalo.me/${MY_ZALO_PHONE}&color=0058b8&margin=10`);
  };

  return (
    <>
      {/* Nút bấm nổi phía dưới bên trái */}
      <div className="zalo-widget-wrapper">
        <button 
          className="zalo-floating-btn" 
          onClick={toggleModal} 
          title="Kết nối qua Zalo / Quét mã QR"
          type="button"
        >
          <span className="zalo-logo-text">Zalo</span>
          <span className="zalo-chat-badge">QR</span>
        </button>
        
        <div className="zalo-tooltip" onClick={toggleModal}>
          💬 Quét mã Zalo / Chat trực tiếp
        </div>
      </div>

      {/* Cửa sổ Modal quét QR */}
      {isOpen && (
        <div className="zalo-modal-overlay" onClick={() => setIsOpen(false)}>
          <div className="zalo-modal-content" onClick={(e) => e.stopPropagation()}>
            
            {/* Header Modal */}
            <div className="zalo-modal-header">
              <div className="zalo-header-title">
                <div className="zalo-header-icon">
                  Zalo
                </div>
                <div className="zalo-header-text">
                  <h3>Kết Nối Zalo Chính Chủ</h3>
                  <p>Quẹt mã QR để trò chuyện trực tiếp ngay</p>
                </div>
              </div>
              <button className="zalo-close-btn" onClick={() => setIsOpen(false)} title="Đóng">
                ×
              </button>
            </div>

            {/* Nội dung QR Code */}
            <div className="zalo-qr-body">
              <div className="qr-box-frame">
                <img 
                  src={imgSrc} 
                  alt="Mã QR Zalo FIVEFOOD" 
                  className="qr-image" 
                  onError={handleImageError}
                />
              </div>

              <p className="qr-instruction">
                📱 Mở máy ảnh (Camera) hoặc tính năng Quét QR trên ứng dụng <strong>Zalo</strong> để kết nối với chủ quán & nhân viên hỗ trợ 24/7!
              </p>

              <a 
                href={`https://zalo.me/${MY_ZALO_PHONE}`} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="zalo-direct-link-btn"
                title="Mở trò chuyện ngay trên trình duyệt/app Zalo"
              >
                <span>🚀 Hoặc Bấm Để Mở App Zalo Ngay</span>
              </a>
            </div>
            
          </div>
        </div>
      )}
    </>
  );
};

export default ZaloWidget;
