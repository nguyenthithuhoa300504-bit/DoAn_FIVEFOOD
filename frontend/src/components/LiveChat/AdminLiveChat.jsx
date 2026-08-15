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
      if (msg.SenderID === selectedUserId || msg.ReceiverID === selectedUserId) {
        setMessages((prev) => [...prev, msg]);
        scrollToBottom();
      }
    };

    socket.on('receiveMessage', handleReceiveMessage);
    return () => {
      socket.off('receiveMessage', handleReceiveMessage);
    };
  }, [socket, selectedUserId]);

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

  const activeUser = chatUsers.find(u => u.UserID === selectedUserId);

  return (
    <div className="glass-panel fade-in live-chat-container">
      
      {/* Cột trái: Danh sách khách hàng */}
      <div className={`chat-sidebar ${selectedUserId ? 'hidden-on-mobile' : ''}`}>
        <div className="chat-sidebar-header">
          <h3>Hộp Thư ({chatUsers.length})</h3>
        </div>
        <div className="chat-sidebar-list">
          {chatUsers.length === 0 && <p className="chat-empty-list">Chưa có tin nhắn nào</p>}
          
          {chatUsers.map(u => {
            const isActive = selectedUserId === u.UserID;
            const initial = u.FullName ? u.FullName.charAt(0).toUpperCase() : '?';
            return (
              <div 
                key={u.UserID}
                className={`chat-user-item ${isActive ? 'active' : ''}`}
                onClick={() => setSelectedUserId(u.UserID)}
              >
                <div className="chat-avatar">
                  {initial}
                </div>
                <div className="chat-user-info">
                  <div className="chat-user-name">{u.FullName}</div>
                  <div className="chat-user-email">{u.Email}</div>
                </div>
                {isActive && <div className="chat-active-indicator"></div>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Cột phải: Nội dung Chat */}
      <div className={`chat-main ${!selectedUserId ? 'hidden-on-mobile' : ''}`}>
        {!selectedUserId ? (
          <div className="chat-empty-state">
            <div className="chat-empty-icon">💬</div>
            <h2>Sẵn sàng hỗ trợ!</h2>
            <p>Chọn một khách hàng bên trái để bắt đầu trò chuyện</p>
          </div>
        ) : (
          <>
            {/* Header chat */}
            <div className="chat-main-header">
              <button 
                className="btn-back-mobile" 
                onClick={() => setSelectedUserId(null)}
              >
                ⬅
              </button>
              <div className="chat-avatar small">
                {activeUser?.FullName?.charAt(0).toUpperCase()}
              </div>
              <div className="chat-header-info">
                <h3 style={{ margin: 0 }}>{activeUser?.FullName}</h3>
                <span className="online-status">● Đang hoạt động</span>
              </div>
            </div>
            
            {/* Messages */}
            <div className="chat-messages-area">
              {messages.map((msg, idx) => {
                const isMe = msg.SenderID === user.userId;
                return (
                  <div key={idx} className={`chat-bubble-wrapper ${isMe ? 'is-me' : 'is-other'}`}>
                    <div className="chat-bubble">
                      {msg.MessageText}
                    </div>
                    <div className="chat-time">
                      {new Date(msg.SentAt).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="chat-input-area">
              <input 
                type="text" 
                className="chat-input-field" 
                placeholder="Viết tin nhắn cho khách hàng..." 
                value={inputValue}
                onChange={handleTypingChange}
              />
              <button type="submit" className="chat-send-btn">
                ➤
              </button>
            </form>
          </>
        )}
      </div>

    </div>
  );
}
