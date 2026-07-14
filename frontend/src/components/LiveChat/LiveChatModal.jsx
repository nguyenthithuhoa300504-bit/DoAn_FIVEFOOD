import React, { useState, useEffect, useRef } from 'react';
import { apiFetch } from '../../utils/apiFetch';

export default function LiveChatModal({ socket, user, onClose }) {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [adminId, setAdminId] = useState(1); // Mặc định ID admin là 1 (có thể lấy động từ API)
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Tạm giả định Admin luôn là ID 1. Thực tế có thể gọi API getFirstAdminId.
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
      scrollToBottom();
    };

    socket.on('receiveMessage', handleReceiveMessage);
    return () => socket.off('receiveMessage', handleReceiveMessage);
  }, [socket]);

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
    <div className="modal-overlay">
      <div className="modal-content glass-panel fade-in" style={{ width: '400px', height: '500px', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '15px', background: 'rgba(255, 87, 34, 0.2)', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#4caf50', display: 'inline-block' }}></span>
            Hỗ trợ trực tuyến (Admin)
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '20px', cursor: 'pointer' }}>✖</button>
        </div>

        {/* Message List */}
        <div style={{ flex: 1, padding: '15px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', color: '#aaa', marginTop: '20px' }}>
              Hãy gửi tin nhắn để bắt đầu trò chuyện với hỗ trợ viên.
            </div>
          )}
          
          {messages.map((msg, idx) => {
            const isMe = msg.SenderID === user.userId;
            return (
              <div key={idx} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
                <div style={{
                  background: isMe ? 'var(--primary-color)' : 'rgba(255,255,255,0.1)',
                  padding: '10px 14px',
                  borderRadius: isMe ? '15px 15px 0 15px' : '15px 15px 15px 0',
                  color: '#fff',
                  fontSize: '14px',
                  wordBreak: 'break-word'
                }}>
                  {msg.MessageText}
                </div>
                <div style={{ fontSize: '10px', color: '#888', marginTop: '4px', textAlign: isMe ? 'right' : 'left' }}>
                  {new Date(msg.SentAt).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <form onSubmit={handleSend} style={{ padding: '15px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', gap: '10px' }}>
          <input 
            type="text" 
            className="form-control" 
            style={{ margin: 0, flex: 1 }}
            placeholder="Nhập tin nhắn..." 
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
          <button type="submit" className="btn btn-primary" style={{ padding: '0 20px' }}>Gửi</button>
        </form>
      </div>
    </div>
  );
}
