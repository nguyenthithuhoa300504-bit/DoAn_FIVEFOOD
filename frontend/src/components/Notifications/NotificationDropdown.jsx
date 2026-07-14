import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/apiFetch';

export default function NotificationDropdown({ socket }) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = async () => {
    try {
      const data = await apiFetch('http://localhost:3000/api/chat/notifications');
      setNotifications(data || []);
      setUnreadCount((data || []).filter(n => !n.IsRead).length);
    } catch (err) {
      console.error('Lỗi tải thông báo:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();

    if (socket) {
      socket.on('newNotification', () => {
        fetchNotifications();
      });
    }

    return () => {
      if (socket) socket.off('newNotification');
    };
  }, [socket]);

  const handleMarkAsRead = async (id) => {
    try {
      await apiFetch(`http://localhost:3000/api/chat/notifications/${id}/read`, { method: 'PUT' });
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button 
        className="nav-btn" 
        style={{ position: 'relative', padding: '8px 12px' }}
        onClick={() => setIsOpen(!isOpen)}
      >
        🔔
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: '-5px', right: '-5px', background: 'red', color: 'white',
            borderRadius: '50%', padding: '2px 6px', fontSize: '10px', fontWeight: 'bold'
          }}>
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="glass-panel fade-in" style={{
          position: 'absolute', top: '45px', right: '0', width: '300px', 
          maxHeight: '400px', overflowY: 'auto', zIndex: 1000, padding: '10px'
        }}>
          <h4 style={{ margin: '0 0 10px 0', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '5px' }}>
            Thông báo của bạn
          </h4>
          
          {notifications.length === 0 ? (
            <p className="text-muted" style={{ textAlign: 'center', fontSize: '14px' }}>Chưa có thông báo nào</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {notifications.map(n => (
                <div 
                  key={n.NotificationID} 
                  style={{ 
                    padding: '10px', 
                    background: n.IsRead ? 'rgba(255,255,255,0.02)' : 'rgba(255,152,0,0.1)',
                    borderLeft: n.IsRead ? 'none' : '3px solid #ff9800',
                    borderRadius: '4px', cursor: 'pointer'
                  }}
                  onClick={() => !n.IsRead && handleMarkAsRead(n.NotificationID)}
                >
                  <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '4px' }}>{n.Title}</div>
                  <div style={{ fontSize: '13px', color: '#ccc' }}>{n.Message}</div>
                  <div style={{ fontSize: '11px', color: '#888', marginTop: '4px', textAlign: 'right' }}>
                    {new Date(n.CreatedAt).toLocaleString('vi-VN')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
