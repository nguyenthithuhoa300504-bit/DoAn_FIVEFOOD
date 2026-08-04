import React, { useState, useRef, useEffect } from 'react';
import { apiFetch } from '../../utils/apiFetch';
import { useCart } from '../../context/CartContext';
import './Chatbot.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Các hàm bổ trợ rút trích thông tin Khách hàng chuẩn xác
const getUserId = (u) => u && (u.userId || u.UserID || u.id || u.email);
const getUserName = (u) => u && (u.fullName || u.FullName || u.name || u.email || 'Quý khách');
const isGuestWelcomeMessage = (text) => typeof text === 'string' && (text.includes('Hôm nay quán có các món bán chạy nhất') || text.includes('Chào bạn! Mình là AI trợ lý'));

const Chatbot = () => {
  const { user, isLoggedIn } = useCart();
  const prevUserRef = useRef(user);
  const [isOpen, setIsOpen] = useState(false);
  
  // Khôi phục lịch sử chat TỪNG TÀI KHOẢN (Chỉ khôi phục cho thành viên nếu tin nhắn KHÔNG BỊ LẪN lời chào vãng lai cũ)
  const [messages, setMessages] = useState(() => {
    try {
      const uid = getUserId(user);
      if (uid) {
        const saved = localStorage.getItem(`chatbot_messages_user_${uid}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0 && !isGuestWelcomeMessage(parsed[0]?.text)) {
            return parsed;
          }
        }
      }
      return [];
    } catch { return []; }
  });
  
  const [hasInitialized, setHasInitialized] = useState(() => {
    try {
      const uid = getUserId(user);
      if (uid) {
        const saved = localStorage.getItem(`chatbot_messages_user_${uid}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          return Array.isArray(parsed) && parsed.length > 0 && !isGuestWelcomeMessage(parsed[0]?.text);
        }
      }
      return false;
    } catch { return false; }
  });
  
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  
  // Khôi phục sessionId từ localStorage nếu đã đăng nhập
  const [sessionId, setSessionId] = useState(() => {
    const uid = getUserId(user);
    if (uid) {
      return localStorage.getItem(`chatbot_session_user_${uid}`) || '';
    }
    return '';
  });

  const toggleChatbot = () => {
    setIsOpen(!isOpen);
  };

  // Xóa lịch sử chat hiện tại (và trong localStorage nếu là user đăng nhập)
  const clearHistory = () => {
    const uid = getUserId(user);
    if (uid) {
      localStorage.removeItem(`chatbot_messages_user_${uid}`);
      localStorage.removeItem(`chatbot_session_user_${uid}`);
    }
    setMessages([]);
    setSessionId('');
    setHasInitialized(false);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  // Bộ tự sửa chữa (Self-Healing): Tự động xóa lịch sử vãng lai bị mắc kẹt lại khi thành viên đang đăng nhập
  useEffect(() => {
    const uid = getUserId(user);
    if (uid && messages.length > 0) {
      const firstText = messages[0]?.text || '';
      if (isGuestWelcomeMessage(firstText)) {
        localStorage.removeItem(`chatbot_messages_user_${uid}`);
        localStorage.removeItem(`chatbot_session_user_${uid}`);
        setMessages([]);
        setSessionId('');
        setHasInitialized(false);
      }
    }
  }, [messages, user, isLoggedIn]);

  // CHỈ LƯU messages vào localStorage KHI KHÁCH HÀNG ĐÃ ĐĂNG NHẬP VÀ KHÔNG CHỨA LỜI CHÀO VÃNG LAI
  useEffect(() => {
    const uid = getUserId(user);
    if (isLoggedIn && uid && messages.length > 0 && !isGuestWelcomeMessage(messages[0]?.text)) {
      try {
        localStorage.setItem(`chatbot_messages_user_${uid}`, JSON.stringify(messages));
      } catch (e) {
        console.error('Không thể lưu lịch sử chat:', e);
      }
    }
  }, [messages, isLoggedIn, user]);

  // CHỈ LƯU sessionId vào localStorage KHI KHÁCH HÀNG ĐÃ ĐĂNG NHẬP
  useEffect(() => {
    const uid = getUserId(user);
    if (isLoggedIn && uid && sessionId) {
      localStorage.setItem(`chatbot_session_user_${uid}`, sessionId);
    }
  }, [sessionId, isLoggedIn, user]);

  useEffect(() => {
    const initChatbot = async () => {
      if (isOpen && !hasInitialized) {
        setHasInitialized(true);
        setIsLoading(true);
        
        let welcomeMsg = 'Chào bạn! Mình là trợ lý ảo của FIVEFOOD. Mình có thể giúp gì cho bạn hôm nay?';
        try {
          const userName = getUserName(user);
          const uid = getUserId(user);
          if (uid && userName && userName !== 'Quý khách') {
            welcomeMsg = `Chào ${userName}! Mình là trợ lý ảo của FIVEFOOD. Mình có thể giúp gì cho bạn hôm nay?`;
            const res = await apiFetch(`${API_BASE_URL}/recommendations`);
            if (res && res.data && res.data.length > 0) {
              const top3 = res.data.slice(0, 3);
              const itemsList = top3.map(item => `- ${item.ProductName} (${item.Price.toLocaleString('vi-VN')}đ)`).join('\n');
              welcomeMsg = `Chào ${userName}! Dựa trên sở thích và lịch sử của bạn, mình gợi ý các món ăn sau:\n${itemsList}\n\nBạn muốn gọi món nào hay cần mình tư vấn thêm gì không?`;
            }
          } else {
            // Khách vãng lai: Tự động giới thiệu Top món Bán Chạy Nhất
            const res = await apiFetch(`${API_BASE_URL}/recommendations`);
            if (res && res.data && res.data.length > 0) {
              const top3 = res.data.slice(0, 3);
              const itemsList = top3.map(item => `👉 ${item.ProductName} (${item.Price.toLocaleString('vi-VN')}đ)`).join('\n');
              welcomeMsg = `Chào bạn! Mình là AI trợ lý của FIVEFOOD 🍲\n🔥 Hôm nay quán có các món bán chạy nhất mời bạn thưởng thức:\n${itemsList}\n\n💡 Bạn có thể nhờ mình tư vấn món theo giá, vị cay, món chay, hoặc hỏi thông tin giao hàng/phí ship nhé!`;
            }
          }
        } catch (err) {
          console.error('Error fetching recommendations for chatbot:', err);
        } finally {
          setMessages([{ sender: 'bot', text: welcomeMsg }]);
          setIsLoading(false);
        }
      }
    };
    
    initChatbot();
  }, [isOpen, hasInitialized, isLoggedIn, user]);

  // Xử lý chuyển đổi khi đăng nhập hoặc đăng xuất
  useEffect(() => {
    const uid = getUserId(user);
    const prevUid = getUserId(prevUserRef.current);

    if (uid && (!prevUserRef.current || prevUid !== uid)) {
      prevUserRef.current = user;
      
      const savedMessages = localStorage.getItem(`chatbot_messages_user_${uid}`);
      const savedSession = localStorage.getItem(`chatbot_session_user_${uid}`);
      if (savedMessages) {
        try {
          const parsed = JSON.parse(savedMessages);
          if (Array.isArray(parsed) && parsed.length > 0 && !isGuestWelcomeMessage(parsed[0]?.text)) {
            setMessages(parsed);
            setSessionId(savedSession || '');
            setHasInitialized(true);
            return;
          }
        } catch (e) {}
      }

      setSessionId('');
      const updateWelcomeOnLogin = async () => {
        const userName = getUserName(user);
        let newWelcomeMsg = `Chào ${userName}! Mình là trợ lý ảo của FIVEFOOD. Mình có thể giúp gì cho bạn hôm nay?`;
        try {
          const res = await apiFetch(`${API_BASE_URL}/recommendations`);
          if (res && res.data && res.data.length > 0) {
            const top3 = res.data.slice(0, 3);
            const itemsList = top3.map(item => `- ${item.ProductName} (${item.Price.toLocaleString('vi-VN')}đ)`).join('\n');
            newWelcomeMsg = `Chào ${userName}! Dựa trên sở thích của bạn, mình gợi ý các món sau:\n${itemsList}\n\nBạn muốn gọi món nào hay cần mình tư vấn thêm gì không?`;
          }
        } catch (err) {
          console.error(err);
        }

        setMessages([{ sender: 'bot', text: newWelcomeMsg }]);
        setHasInitialized(true);
      };

      if (hasInitialized || isOpen) {
        updateWelcomeOnLogin();
      } else {
        setMessages([]);
        setHasInitialized(false);
      }
    } else if (!uid && prevUserRef.current) {
      // Khách ĐĂNG XUẤT -> Trở về Khách vãng lai: KHÔNG khôi phục và KHÔNG lưu lịch sử
      prevUserRef.current = null;
      setSessionId('');
      localStorage.removeItem('chatbot_messages');
      localStorage.removeItem('chatbot_session_id');

      if (hasInitialized || isOpen) {
        const updateWelcomeOnLogout = async () => {
          let defaultWelcome = 'Chào bạn! Mình là trợ lý ảo của FIVEFOOD. Mình có thể giúp gì cho bạn hôm nay?';
          try {
            const res = await apiFetch(`${API_BASE_URL}/recommendations`);
            if (res && res.data && res.data.length > 0) {
              const top3 = res.data.slice(0, 3);
              const itemsList = top3.map(item => `👉 ${item.ProductName} (${item.Price.toLocaleString('vi-VN')}đ)`).join('\n');
              defaultWelcome = `Chào bạn! Mình là AI trợ lý của FIVEFOOD 🍲\n🔥 Hôm nay quán có các món bán chạy nhất mời bạn thưởng thức:\n${itemsList}\n\n💡 Bạn có thể nhờ mình tư vấn món theo giá, vị cay, món chay, hoặc hỏi thông tin giao hàng/phí ship nhé!`;
            }
          } catch (e) {
            console.error(e);
          }
          setMessages([{ sender: 'bot', text: defaultWelcome }]);
          setHasInitialized(true);
        };
        updateWelcomeOnLogout();
      } else {
        setMessages([]);
        setHasInitialized(false);
      }
    }
  }, [user, isOpen, hasInitialized]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const userMessage = inputMessage.trim();
    setMessages(prev => [...prev, { sender: 'user', text: userMessage }]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await apiFetch(`${API_BASE_URL}/chatbot`, {
        method: 'POST',
        body: JSON.stringify({ message: userMessage, sessionId })
      });

      const data = response?.data || response;
      if (data && data.reply) {
        setMessages(prev => [...prev, { sender: 'bot', text: data.reply }]);
        // Lưu sessionId từ server (dùng để backend nhớ ngữ cảnh hội thoại)
        if (data.sessionId) {
          setSessionId(data.sessionId);
        }
        // Chỉ dispatch cartUpdated khi backend xác nhận đã xử lý giỏ hàng thành công
        if (data.orderPlaced) {
          // Đảm bảo dispatch sau khi state messages đã cập nhật
          setTimeout(() => {
            window.dispatchEvent(new Event('cartUpdated'));
          }, 300);
        }
      }
    } catch (error) {
      setMessages(prev => [...prev, { sender: 'bot', text: 'Xin lỗi, hệ thống AI đang bảo trì. Vui lòng thử lại sau!' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="chatbot-wrapper">
      {isOpen && (
        <div className="chatbot-window glass-panel fade-in">
          <div className="chatbot-header">
            <h3>🤖 FIVEFOOD AI</h3>
            <div className="chatbot-header-actions">
              <button className="clear-history-btn" onClick={clearHistory} title="Xóa lịch sử chat">🗑️</button>
              <button className="close-btn" onClick={toggleChatbot}>×</button>
            </div>
          </div>
          
          <div className="chatbot-messages">
            {messages.map((msg, index) => (
              <div key={index} className={`message-bubble ${msg.sender}`}>
                <div className="message-content">{msg.text}</div>
              </div>
            ))}
            {isLoading && (
              <div className="message-bubble bot">
                <div className="message-content typing-indicator">
                  <span>.</span><span>.</span><span>.</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form className="chatbot-input-area" onSubmit={handleSendMessage}>
            <input 
              type="text" 
              placeholder="Nhập tin nhắn..." 
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              disabled={isLoading}
            />
            <button type="submit" disabled={isLoading || !inputMessage.trim()}>Gửi</button>
          </form>
        </div>
      )}
      
      <button className="chatbot-toggle-btn" onClick={toggleChatbot}>
        {isOpen ? '💬' : '🤖'}
      </button>
    </div>
  );
};

export default Chatbot;
