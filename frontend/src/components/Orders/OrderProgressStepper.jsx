import React from 'react';
import './OrderProgressStepper.css';

const STEPS = [
  { label: 'Chờ xác nhận', icon: '📝' },
  { label: 'Bếp đang nấu', icon: '🍳' },
  { label: 'Đang giao', icon: '🛵' },
  { label: 'Hoàn thành', icon: '🎉' },
];

export default function OrderProgressStepper({ status }) {
  // Nếu đơn bị hủy
  if (status === 'Đã hủy' || status === 'Canceled' || status === 'Hủy') {
    return (
      <div className="stepper-container">
        <div className="step-canceled-banner">
          <span>❌ Đơn hàng này đã được hủy bỏ</span>
        </div>
      </div>
    );
  }

  // Chuyển đổi trạng thái chuỗi thành số bước (0 đến 3)
  let currentStep = 0;
  if (status === 'Chờ xác nhận' || status === 'Pending') currentStep = 0;
  else if (status === 'Đang nấu' || status === 'Đã duyệt' || status === 'Cooking') currentStep = 1;
  else if (status === 'Đang giao' || status === 'Delivering' || status === 'Shipping') currentStep = 2;
  else if (status === 'Hoàn thành' || status === 'Completed' || status === 'Success' || status === 'Đã thanh toán') currentStep = 3;

  // Tính toán chiều dài thanh kết nối (0%, 33%, 66%, 100%)
  const fillPercentage = currentStep === 0 ? '0%' : currentStep === 1 ? '33%' : currentStep === 2 ? '66%' : '100%';

  return (
    <div className="stepper-container">
      <div className="stepper-track">
        <div className="stepper-progress-fill" style={{ width: `calc(${fillPercentage} - 70px)` }} />
        
        {STEPS.map((step, idx) => {
          const isCompleted = idx < currentStep || (idx === 3 && currentStep === 3);
          const isActive = idx === currentStep && currentStep < 3;
          let itemClass = 'step-item';
          if (isCompleted) itemClass += ' completed';
          if (isActive) itemClass += ' active';

          return (
            <div key={idx} className={itemClass}>
              <div className="step-icon-circle" title={step.label}>
                {step.icon}
              </div>
              <span className="step-title">
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
