import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './OrderProgressStepper.css';

const STEPS = [
  { label: 'Chờ xác nhận', icon: '📝' },
  { label: 'Đang chuẩn bị', icon: '🍳' },
  { label: 'Đang giao', icon: '🛵' },
  { label: 'Hoàn thành', icon: '🎉' },
];

export default function OrderProgressStepper({ status, shipperLat, shipperLng }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markerInstance = useRef(null);

  useEffect(() => {
    // Only init map if we are delivering
    if (status === 'Đang giao' && mapRef.current) {
      const lat = shipperLat || 10.9333; // Fallback to store lat
      const lng = shipperLng || 108.1000; // Fallback to store lng

      if (!mapInstance.current) {
        mapInstance.current = L.map(mapRef.current, {
          zoomControl: false,
          dragging: false,
          scrollWheelZoom: false,
          doubleClickZoom: false
        }).setView([lat, lng], 15);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap'
        }).addTo(mapInstance.current);

        const customIcon = L.divIcon({
          html: `<div style="font-size: 30px; animation: bounce 1s infinite alternate; filter: drop-shadow(0 4px 5px rgba(0,0,0,0.3));">🛵</div>`,
          className: 'shipper-icon-marker',
          iconSize: [30, 30],
          iconAnchor: [15, 30]
        });

        markerInstance.current = L.marker([lat, lng], { icon: customIcon }).addTo(mapInstance.current);
      } else {
        // Update position smoothly
        mapInstance.current.setView([lat, lng]);
        if (markerInstance.current) {
          markerInstance.current.setLatLng([lat, lng]);
        }
      }
    }
  }, [status, shipperLat, shipperLng]);

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
  else if (status === 'Đang nấu' || status === 'Đã duyệt' || status === 'Đang chuẩn bị' || status === 'Cooking') currentStep = 1;
  else if (status === 'Đang giao' || status?.includes('ang giao') || status === 'Delivering' || status === 'Shipping') currentStep = 2;
  else if (status === 'Hoàn thành' || status === 'Completed' || status === 'Success' || status === 'Đã thanh toán') currentStep = 3;

  // Tính toán chiều dài thanh kết nối (0%, 33%, 66%, 100%)
  const fillPercentage = currentStep === 0 ? '0%' : currentStep === 1 ? '33%' : currentStep === 2 ? '66%' : '100%';

  return (
    <div className="stepper-container">
      <div className="stepper-track">
        <div className="stepper-progress-fill" style={{ width: `calc(${fillPercentage} - 70px)` }} />
        
        {STEPS.map((step, idx) => {
          const isCompleted = idx < currentStep;
          const isActive = idx === currentStep;
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
      
      {/* Live Map Tracking for Shipper */}
      {status === 'Đang giao' && (
        <div style={{ marginTop: '25px', borderRadius: '16px', overflow: 'hidden', border: '3px solid #00e676', position: 'relative', boxShadow: '0 12px 24px rgba(0, 230, 118, 0.25)' }}>
          <div style={{ position: 'absolute', top: '12px', left: '12px', zIndex: 1000, background: 'rgba(255, 255, 255, 0.95)', padding: '6px 14px', borderRadius: '20px', fontWeight: 'bold', color: '#00c853', fontSize: '14px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', gap: '6px', backdropFilter: 'blur(4px)' }}>
            <span style={{ width: '10px', height: '10px', background: '#00e676', borderRadius: '50%', display: 'inline-block', animation: 'pulse 1.5s infinite' }}></span>
            Shipper đang di chuyển
          </div>
          <div ref={mapRef} style={{ width: '100%', height: '280px', background: '#e9ecef' }}></div>
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes pulse { 0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(0, 230, 118, 0.7); } 70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(0, 230, 118, 0); } 100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(0, 230, 118, 0); } }
          `}} />
        </div>
      )}
    </div>
  );
}
