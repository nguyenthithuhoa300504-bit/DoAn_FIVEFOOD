import React, { useState, useEffect, useRef } from 'react';
import { apiFetch } from '../../utils/apiFetch';

export default function AdminLiveChat({ socket, user }) {
  const [chatUsers, setChatUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Lấy danh sách user đã chat
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const data = await apiFetch('http://localhost:3000/api/chat/users');
        setChatUsers(data || []);
      } catch (err) {
        console.error('Lỗi lấy danh sách user chat', err);
      }
    };
    fetchUsers();
  }, []);

  // Lấy lịch sử chat khi chọn 1 user
  useEffect(() => {
    if (!selectedUserId) return;
    const fetchHistory = async () => {
      try {
        const history = await apiFetch(`http://localhost:3000/api/chat/history/${selectedUserId}`);
        setMessages(history || []);
        scrollToBottom();
      } catch (err) {
        console.error('Lỗi lấy lịch sử chat', err);
      }
    };
    fetchHistory();
  }, [selectedUserId]);

  // Lắng nghe socket
  useEffect(() => {
    if (!socket) return;
    
    const handleReceiveMessage = (msg) => {
      // Nếu tin nhắn thuộc về cuộc hội thoại đang mở
      if (msg.SenderID === selectedUserId || msg.ReceiverID === selectedUserId) {
        setMessages((prev) => [...prev, msg]);
        scrollToBottom();
      } else if (msg.ReceiverID === user.userId) {
        // Tin nhắn từ user khác gửi tới Admin, có thể load lại danh sách user để hiện lên đầu
        // Tạm thời bỏ qua logic sort lại list
      }
    };

    socket.on('receiveMessage', handleReceiveMessage);
    return () => {
      socket.off('receiveMessage', handleReceiveMessage);
    };
  }, [socket, selectedUserId, user.userId]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleTypingChange = (e) => {
    setInputValue(e.target.value);
    
    if (socket && selectedUserId) {
      socket.emit('typing', { receiverId: selectedUserId, isTyping: true });
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing', { receiverId: selectedUserId, isTyping: false });
      }, 2000);
    }
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputValue.trim() || !socket || !selectedUserId) return;

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    socket.emit('typing', { receiverId: selectedUserId, isTyping: false });

    socket.emit('sendMessage', {
      receiverId: selectedUserId,
      text: inputValue
    });
    setInputValue('');
  };

  return (
    <div className="glass-panel fade-in" style={{ display: 'flex', height: '600px', padding: 0, overflow: 'hidden' }}>
      
      {/* Cột trái: Danh sách khách hàng */}
      <div style={{ width: '300px', borderRight: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '15px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <h3 style={{ margin: 0 }}>👥 Khách hàng ({chatUsers.length})</h3>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {chatUsers.length === 0 && <p style={{ textAlign: 'center', color: '#888', marginTop: '20px' }}>Chưa có tin nhắn nào</p>}
          
          {chatUsers.map(u => (
            <div 
              key={u.UserID}
              style={{ 
                padding: '15px', 
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                cursor: 'pointer',
                background: selectedUserId === u.UserID ? 'rgba(255, 87, 34, 0.1)' : 'transparent'
              }}
              onClick={() => setSelectedUserId(u.UserID)}
            >
              <div style={{ fontWeight: 'bold' }}>{u.FullName}</div>
              <div style={{ fontSize: '12px', color: '#aaa' }}>{u.Email}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Cột phải: Nội dung Chat */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {!selectedUserId ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888' }}>
            <p>👈 Chọn một khách hàng để bắt đầu chat</p>
          </div>
        ) : (
          <>
            {/* Header chat */}
            <div style={{ padding: '15px', borderBottom: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)' }}>
              <h3 style={{ margin: 0 }}>💬 Đang chat với: {chatUsers.find(u => u.UserID === selectedUserId)?.FullName}</h3>
            </div>
            
            {/* Messages */}
            <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {messages.map((msg, idx) => {
                const isMe = msg.SenderID === user.userId;
                return (
                  <div key={idx} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '70%' }}>
                    <div style={{
                      background: isMe ? 'var(--primary-color)' : 'rgba(255,255,255,0.1)',
                      padding: '12px 16px',
                      borderRadius: isMe ? '15px 15px 0 15px' : '15px 15px 15px 0',
                      color: '#fff',
                      fontSize: '15px',
                      wordBreak: 'break-word'
                    }}>
                      {msg.MessageText}
                    </div>
                    <div style={{ fontSize: '11px', color: '#888', marginTop: '6px', textAlign: isMe ? 'right' : 'left' }}>
                      {new Date(msg.SentAt).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSend} style={{ padding: '15px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', gap: '10px' }}>
              <input 
                type="text" 
                className="form-control" 
                style={{ margin: 0, flex: 1 }}
                placeholder="Nhập phản hồi cho khách hàng..." 
                value={inputValue}
                onChange={handleTypingChange}
              />
              <button type="submit" className="btn btn-primary" style={{ padding: '0 30px' }}>Gửi</button>
            </form>
          </>
        )}
      </div>

    </div>
  );
}
