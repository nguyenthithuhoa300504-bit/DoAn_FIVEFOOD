import React, { useState, useEffect, useRef } from 'react';
import { Store } from 'lucide-react';
//, { useState, useEffect, useRef } from 'react';
import { apiFetch } from '../../utils/apiFetch';

export default function LiveChatModal({ socket, user, onClose }) {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [adminId, setAdminId] = useState(1);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const history = await apiFetch(`http://localhost:3000/api/chat/history/1`);
        setMessages(history || []);
        scrollToBottom();
      } catch (err) {
        console.error('Lỗi lấy lịch sử chat', err);
      }
    };
    fetchHistory();
  }, []);

  useEffect(() => {
    if (!socket) return;
    
    const handleReceiveMessage = (msg) => {
      setMessages((prev) => [...prev, msg]);
      setIsTyping(false);
      scrollToBottom();
    };

    const handleTypingStatus = (data) => {
      if (data.senderId === adminId) {
        setIsTyping(data.isTyping);
        if (data.isTyping) {
          scrollToBottom();
        }
      }
    };

    socket.on('receiveMessage', handleReceiveMessage);
    socket.on('typingStatus', handleTypingStatus);
    return () => {
      socket.off('receiveMessage', handleReceiveMessage);
      socket.off('typingStatus', handleTypingStatus);
    };
  }, [socket, adminId]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputValue.trim() || !socket) return;

    socket.emit('sendMessage', {
      receiverId: adminId,
      text: inputValue
    });
    setInputValue('');
  };

  return (
    <div className="contact-page-container fade-in" style={{
      display: 'flex',
      gap: '40px',
      maxWidth: '1200px',
      width: '100%',
      margin: '0 auto',
      padding: '40px 20px',
      minHeight: '650px',
      flexWrap: 'wrap'
    }}>
      {/* Cột trái: Thông tin nhà hàng */}
      <div className="contact-info-column" style={{
        flex: '1',
        minWidth: '350px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <div style={{ 
          padding: '40px', 
          borderRadius: '30px', 
          height: '100%', 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'center',
          background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.9), rgba(255, 243, 230, 0.8))',
          boxShadow: '0 20px 40px rgba(255, 112, 67, 0.08)',
          border: '1px solid rgba(255, 112, 67, 0.1)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Watermark icon */}
          <div style={{ position: 'absolute', top: '-20px', right: '-20px', fontSize: '150px', opacity: '0.04', transform: 'rotate(15deg)' }}>🍕</div>
          
          <div style={{ display: 'inline-block', padding: '8px 16px', background: 'rgba(255, 112, 67, 0.1)', color: '#e64a19', borderRadius: '20px', fontWeight: 'bold', fontSize: '14px', width: 'max-content', marginBottom: '15px' }}>
            Luôn Sẵn Sàng Phục Vụ
          </div>
          
          <h2 style={{ fontSize: '36px', marginBottom: '15px', color: '#2d3436', fontWeight: '800', lineHeight: '1.2' }}>
            Kết nối với gian bếp <br/>
            <span style={{ background: 'linear-gradient(90deg, #ff5722, #ff9800)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>FIVEFOOD</span>
          </h2>
          
          <p style={{ color: '#636e72', fontSize: '16px', marginBottom: '35px', lineHeight: '1.7' }}>
            Bạn đang thèm một món ăn nóng hổi? Cần đặt bàn cho buổi hẹn hò hay khiếu nại về dịch vụ? Đừng ngần ngại, đầu bếp và nhân viên của chúng tôi luôn trực máy!
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative', zIndex: 1 }}>
            <div className="contact-item" style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '15px 20px', background: '#fff', borderRadius: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
              <div style={{ width: '55px', height: '55px', borderRadius: '16px', background: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 99%, #fecfef 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', boxShadow: '0 4px 10px rgba(255, 154, 158, 0.3)' }}><Store color="#FF7A00" size={28} /></div>
              <div>
                <h4 style={{ margin: '0 0 4px 0', color: '#2d3436', fontSize: '16px', fontWeight: '700' }}>Nhà Hàng Chính</h4>
                <p style={{ margin: 0, color: '#636e72', fontSize: '14px' }}>123 Đường Ẩm Thực, Quận 1, TP. HCM</p>
              </div>
            </div>

            <div className="contact-item" style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '15px 20px', background: '#fff', borderRadius: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
              <div style={{ width: '55px', height: '55px', borderRadius: '16px', background: 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', boxShadow: '0 4px 10px rgba(253, 160, 133, 0.3)' }}>🛵</div>
              <div>
                <h4 style={{ margin: '0 0 4px 0', color: '#2d3436', fontSize: '16px', fontWeight: '700' }}>Đường Dây Nóng (Giao Hàng)</h4>
                <p style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#e64a19' }}>1900 1234 - Bấm phím 1</p>
              </div>
            </div>

            <div className="contact-item" style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '15px 20px', background: '#fff', borderRadius: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
              <div style={{ width: '55px', height: '55px', borderRadius: '16px', background: 'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', boxShadow: '0 4px 10px rgba(132, 250, 176, 0.3)' }}>⏰</div>
              <div>
                <h4 style={{ margin: '0 0 4px 0', color: '#2d3436', fontSize: '16px', fontWeight: '700' }}>Giờ Phục Vụ</h4>
                <p style={{ margin: 0, color: '#636e72', fontSize: '14px' }}>08:00 Sáng - 10:30 Tối (Cả tuần)</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cột phải: Khung Chat Trực Tuyến */}
      <div className="chat-column" style={{
        flex: '1',
        minWidth: '350px',
        display: 'flex'
      }}>
        <div style={{ 
          width: '100%', 
          height: '100%', 
          minHeight: '600px', 
          display: 'flex', 
          flexDirection: 'column', 
          padding: 0, 
          overflow: 'hidden', 
          borderRadius: '30px', 
          boxShadow: '0 25px 50px rgba(255, 87, 34, 0.15)',
          background: '#fff',
          border: '4px solid rgba(255, 255, 255, 0.4)'
        }}>
          {/* Header */}
          <div style={{ 
            padding: '25px', 
            background: 'url("https://www.transparenttextures.com/patterns/food.png"), linear-gradient(135deg, #ff5722 0%, #e64a19 100%)', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            color: '#fff',
            position: 'relative'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
              <div style={{ position: 'relative' }}>
                <div style={{ width: '55px', height: '55px', borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', boxShadow: '0 6px 12px rgba(0,0,0,0.15)' }}>👨‍🍳</div>
                <span style={{ width: '14px', height: '14px', borderRadius: '50%', background: '#00e676', border: '3px solid #e64a19', position: 'absolute', bottom: '2px', right: '0' }}></span>
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '800', textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>Bếp Trưởng Trực Tuyến</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '14px', opacity: 0.9, fontWeight: '500' }}>Đang chờ để phục vụ bạn...</p>
              </div>
            </div>
            {/* Decoration */}
            <div style={{ fontSize: '30px', opacity: '0.5', transform: 'rotate(15deg)' }}>🍔</div>
          </div>

          {/* Message List */}
          <div style={{ flex: 1, padding: '25px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '18px', background: '#fdfbfb' }}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', marginTop: 'auto', marginBottom: 'auto', padding: '20px' }}>
                <div style={{ fontSize: '60px', marginBottom: '15px', animation: 'bounce 2s infinite' }}>🍜</div>
                <h4 style={{ margin: '0 0 10px 0', color: '#2d3436', fontSize: '20px', fontWeight: '800' }}>Đói bụng chưa {user?.fullName || 'bạn'} ơi?</h4>
                <p style={{ color: '#636e72', fontSize: '15px', margin: 0, lineHeight: '1.6' }}>Hãy nhắn tin cho chúng mình để chốt món ngay,<br/> đồ ăn nóng hổi sẽ tới liền tay!</p>
              </div>
            )}
            
            {messages.map((msg, idx) => {
              const isMe = msg.SenderID === user?.userId;
              return (
                <div key={idx} className="message-bubble-wrapper" style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '75%', animation: 'fadeIn 0.3s ease-out' }}>
                  <div style={{
                    background: isMe ? 'linear-gradient(135deg, #ff9800 0%, #ff5722 100%)' : '#fff',
                    border: isMe ? 'none' : '1px solid #ffe0b2',
                    padding: '14px 18px',
                    borderRadius: isMe ? '22px 22px 6px 22px' : '22px 22px 22px 6px',
                    color: isMe ? '#fff' : '#2d3436',
                    fontSize: '15px',
                    lineHeight: '1.5',
                    wordBreak: 'break-word',
                    boxShadow: isMe ? '0 5px 15px rgba(255, 87, 34, 0.3)' : '0 4px 15px rgba(0,0,0,0.04)',
                    fontWeight: '500'
                  }}>
                    {msg.MessageText}
                  </div>
                  <div style={{ fontSize: '11px', color: '#b2bec3', marginTop: '8px', textAlign: isMe ? 'right' : 'left', padding: '0 6px', fontWeight: '600' }}>
                    {new Date(msg.SentAt).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}
                  </div>
                </div>
              );
            })}
            {isTyping && (
              <div style={{ alignSelf: 'flex-start', padding: '10px 15px', color: '#888', fontStyle: 'italic', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span className="typing-dots">Cửa hàng đang phản hồi...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form onSubmit={handleSend} style={{ padding: '20px 25px', borderTop: '1px solid #ffe0b2', background: '#fff', display: 'flex', gap: '15px', alignItems: 'center' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <input 
                type="text" 
                style={{ 
                  width: '100%', 
                  margin: 0, 
                  borderRadius: '30px', 
                  padding: '16px 25px', 
                  background: '#f8f9fa', 
                  border: '2px solid transparent', 
                  fontSize: '15px',
                  color: '#2d3436',
                  transition: 'all 0.3s',
                  outline: 'none'
                }}
                placeholder="Ví dụ: Lên cho mình 1 Phở Bò thêm quẩy..." 
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onFocus={(e) => e.target.style.border = '2px solid #ff9800'}
                onBlur={(e) => e.target.style.border = '2px solid transparent'}
              />
            </div>
            <button type="submit" style={{ 
              width: '55px', height: '55px', borderRadius: '50%', background: 'linear-gradient(135deg, #ff5722 0%, #e64a19 100%)', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 6px 20px rgba(230, 74, 25, 0.4)'
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px) scale(1.05)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0) scale(1)'}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
