import React, { useState, useRef, useEffect } from 'react';
import { apiFetch } from '../../utils/apiFetch';
import { useCart } from '../../context/CartContext';
import './Chatbot.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const STORAGE_KEY_MESSAGES = 'chatbot_messages';
const STORAGE_KEY_SESSION = 'chatbot_session_id';

const Chatbot = () => {
  const { user, isLoggedIn } = useCart();
  const prevUserRef = useRef(user);
  const [isOpen, setIsOpen] = useState(false);
  // Khôi phục lịch sử chat từ localStorage (giữ khi reload trang)
  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_MESSAGES);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  // hasInitialized = true nếu đã có lịch sử từ localStorage hoặc đã init rồi
  const [hasInitialized, setHasInitialized] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_MESSAGES);
      const parsed = saved ? JSON.parse(saved) : [];
      return parsed.length > 0;
    } catch { return false; }
  });
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  // Khôi phục sessionId từ localStorage
  const [sessionId, setSessionId] = useState(() => localStorage.getItem(STORAGE_KEY_SESSION) || '');

  const toggleChatbot = () => {
    setIsOpen(!isOpen);
  };

  // Xóa toàn bộ lịch sử chat
  const clearHistory = () => {
    localStorage.removeItem(STORAGE_KEY_MESSAGES);
    localStorage.removeItem(STORAGE_KEY_SESSION);
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

  // Lưu messages vào localStorage mỗi khi thay đổi
  useEffect(() => {
    if (messages.length > 0) {
      try {
        localStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify(messages));
      } catch (e) {
        console.error('Không thể lưu lịch sử chat:', e);
      }
    }
  }, [messages]);

  // Lưu sessionId vào localStorage mỗi khi thay đổi
  useEffect(() => {
    if (sessionId) {
      localStorage.setItem(STORAGE_KEY_SESSION, sessionId);
    }
  }, [sessionId]);

  useEffect(() => {
    const initChatbot = async () => {
      if (isOpen && !hasInitialized) {
        setHasInitialized(true);
        setIsLoading(true);
        
        // Khi chưa đăng nhập thì hiển thị đúng câu chào theo yêu cầu
        let welcomeMsg = 'Chào bạn! Mình là trợ lý ảo của FIVEFOOD. Mình có thể giúp gì cho bạn hôm nay?';
        try {
          if (isLoggedIn && user && user.fullName) {
            welcomeMsg = `Chào ${user.fullName}! Mình là trợ lý ảo của FIVEFOOD. Mình có thể giúp gì cho bạn hôm nay?`;
            const res = await apiFetch(`${API_BASE_URL}/recommendations`);
            if (res && res.data && res.data.length > 0) {
              // Top 3 gợi ý cho khách đã có tài khoản
              const top3 = res.data.slice(0, 3);
              const itemsList = top3.map(item => `- ${item.ProductName} (${item.Price.toLocaleString('vi-VN')}đ)`).join('\n');
              welcomeMsg = `Chào ${user.fullName}! Dựa trên sở thích và lịch sử của bạn, mình gợi ý các món ăn sau:\n${itemsList}\n\nBạn muốn gọi món nào hay cần mình tư vấn thêm gì không?`;
            }
          }
          // Khi chưa đăng nhập (hoặc khách vãng lai), giữ nguyên câu chào gọn gàng
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

  // Tự động chuyển đổi lời chào tức thì khi khách thực hiện đăng nhập hoặc đăng xuất mà KHÔNG cần reload trang!
  useEffect(() => {
    if (user && user.fullName && (!prevUserRef.current || prevUserRef.current.fullName !== user.fullName)) {
      prevUserRef.current = user;
      const updateWelcomeOnLogin = async () => {
        let newWelcomeMsg = `Chào ${user.fullName}! Mình là trợ lý ảo của FIVEFOOD. Mình có thể giúp gì cho bạn hôm nay?`;
        try {
          const res = await apiFetch(`${API_BASE_URL}/recommendations`);
          if (res && res.data && res.data.length > 0) {
            const top3 = res.data.slice(0, 3);
            const itemsList = top3.map(item => `- ${item.ProductName} (${item.Price.toLocaleString('vi-VN')}đ)`).join('\n');
            newWelcomeMsg = `Chào ${user.fullName}! Dựa trên sở thích của bạn, mình gợi ý các món sau:\n${itemsList}\n\nBạn muốn gọi món nào hay cần mình tư vấn thêm gì không?`;
          }
        } catch (err) {
          console.error(err);
        }

        setMessages(prev => {
          // Nếu trong khung chat chỉ có câu chào lúc chưa đăng nhập -> Thay thế luôn bằng lời chào tên khách
          if (prev.length <= 1) {
            return [{ sender: 'bot', text: newWelcomeMsg }];
          } else {
            // Nếu khách đã trò chuyện từ trước -> Đẩy tiếp 1 câu chào tên khách vào dòng chat mới
            return [...prev, { sender: 'bot', text: `🎉 Chào mừng **${user.fullName}** đã đăng nhập! Bạn có thể yêu cầu mình đặt món hoặc thanh toán tự động ngay bây giờ nhé.` }];
          }
        });
      };

      if (hasInitialized || isOpen) {
        updateWelcomeOnLogin();
      }
    } else if (!user && prevUserRef.current) {
      // Khách đăng xuất -> trở về lời chào mặc định
      prevUserRef.current = null;
      if (hasInitialized || isOpen) {
        const defaultWelcome = 'Chào bạn! Mình là trợ lý ảo của FIVEFOOD. Mình có thể giúp gì cho bạn hôm nay?';
        setMessages(prev => (prev.length <= 1 ? [{ sender: 'bot', text: defaultWelcome }] : [...prev, { sender: 'bot', text: defaultWelcome }]));
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
