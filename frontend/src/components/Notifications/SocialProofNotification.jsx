import React, { useState, useEffect } from 'react';
import './SocialProofNotification.css';

// Danh sách các hoạt động thực khách nhộn nhịp mô phỏng real-time
const SOCIAL_EVENTS = [
  { icon: '🍕', name: 'Tuấn Anh', location: 'TP.HCM', action: 'vừa đặt 2x Pizza Hải Sản viên phô mai', time: 'Vài giây trước' },
  { icon: '🍜', name: 'Thùy Linh', location: 'Q. Bình Thạnh', action: 'vừa đặt 1x Phở Bò Đặc Biệt', time: '1 phút trước' },
  { icon: '🔥', name: '18 Thực khách', location: 'Khắp nơi', action: 'đang xem thực đơn Món Bán Chạy hôm nay!', time: 'Real-time' },
  { icon: '🛵', name: 'Shipper Hoàng Phúc', location: 'Quận 1', action: 'vừa giao thành công đơn #10026 siêu tốc trong 15 phút!', time: 'Vừa xong' },
  { icon: '🍔', name: 'Đức Minh', location: 'Hà Nội', action: 'vừa áp dụng voucher miễn phí ship và đặt Combo Burger', time: '2 phút trước' },
  { icon: '⭐', name: 'Mai Hương', location: 'Quận 7', action: 'vừa để lại đánh giá 5⭐ cho dịch vụ AI Chatbot!', time: '3 phút trước' },
  { icon: '🍹', name: 'Quang Vinh', location: 'TP. Thủ Đức', action: 'vừa thêm 3x Trà Đào Sài Gòn vào giỏ hàng', time: 'Vừa xong' },
];

export default function SocialProofNotification() {
  const [currentEventIndex, setCurrentEventIndex] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // 5 giây sau khi mở web, hiển thị thông báo đầu tiên
    const initialTimer = setTimeout(() => {
      triggerNotification(0);
    }, 5000);

    // Chu kỳ: cứ 35 - 45 giây hiển thị một thông báo ngẫu nhiên tiếp theo
    const interval = setInterval(() => {
      const randomIdx = Math.floor(Math.random() * SOCIAL_EVENTS.length);
      triggerNotification(randomIdx);
    }, 38000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, []);

  const triggerNotification = (idx) => {
    setCurrentEventIndex(idx);
    setIsVisible(true);

    // Tự động tắt thông báo sau 6.5 giây
    setTimeout(() => {
      setIsVisible(false);
    }, 6500);
  };

  if (!isVisible || currentEventIndex === null) return null;

  const event = SOCIAL_EVENTS[currentEventIndex];

  return (
    <div className="social-proof-toast" onClick={() => setIsVisible(false)} title="Bấm để ẩn thông báo">
      <div className="social-icon-badge">
        {event.icon}
      </div>
      <div className="social-content">
        <p className="social-text">
          <strong>{event.name} ({event.location})</strong> <span className="social-highlight">{event.action}</span>
        </p>
        <span className="social-time">
          <span className="social-dot" /> {event.time} • Trực tiếp từ hệ thống FIVEFOOD
        </span>
      </div>
    </div>
  );
}
