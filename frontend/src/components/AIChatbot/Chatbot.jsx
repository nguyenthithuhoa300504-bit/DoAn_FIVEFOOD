import React, { useState, useRef, useEffect } from 'react';
import { apiFetch } from '../../utils/apiFetch';
import { useCart } from '../../context/CartContext';
import { Send, Trash2, X, Sparkles, MessageCircle, Bot, Zap } from 'lucide-react';
import './Chatbot.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Các hàm bổ trợ rút trích thông tin Khách hàng chuẩn xác
const getUserId = (u) => u && (u.userId || u.UserID || u.id || u.email);
const getUserName = (u) => u && (u.fullName || u.FullName || u.name || u.email || 'Quý khách');
const isGuestWelcomeMessage = (text) => typeof text === 'string' && (text.includes('Hôm nay quán có các món bán chạy nhất') || text.includes('Chào bạn! Mình là AI trợ lý') || text.includes('FIVEFOOD AI'));

// Danh sách gợi ý thao tác nhanh (Quick Action Chips)
const QUICK_CHIPS = [
  { icon: '🔥', text: 'Món bán chạy', prompt: 'Món nào bán chạy nhất ở quán vậy?' },
  { icon: '📦', text: 'Đơn tới đâu rồi?', prompt: 'Đơn hàng mình đang tới đâu rồi' },
  { icon: '🛵', text: 'Vị trí Shipper', prompt: 'Shipper đang chạy tới đâu rồi?' },
  { icon: '🎁', text: 'Mã ưu đãi', prompt: 'Quán có mã giảm giá hay khuyến mãi nào không?' }
];

// Bộ xử lý hiển thị Markdown đơn giản (chuyển đổi **text** sang font chữ in cẩm thanh lịch)
const formatInlineText = (text) => {
  if (typeof text !== 'string') return text;
  const parts = [];
  const boldRegex = /\*\*(.*?)\*\*/g;
  const matches = [...text.matchAll(boldRegex)];
  let lastIdx = 0;

  if (matches.length === 0) {
    // Thử làm sạch dấu * nháy nháy nếu có
    return text.replace(/\*(.*?)\*/g, '$1');
  }

  matches.forEach((match, idx) => {
    if (match.index > lastIdx) {
      parts.push(text.slice(lastIdx, match.index));
    }
    parts.push(
      <strong key={`bold-${idx}`} className="chat-bold-highlight">
        {match[1]}
      </strong>
    );
    lastIdx = match.index + match[0].length;
  });

  if (lastIdx < text.length) {
    parts.push(text.slice(lastIdx));
  }

  return parts;
};

const renderFormattedText = (text) => {
  if (typeof text !== 'string') return text;
  const lines = text.split('\n');
  return lines.map((line, idx) => (
    <div key={idx} className="chat-line">
      {formatInlineText(line)}
    </div>
  ));
};

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

  // Xóa lịch sử chat hiện tại
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
  }, [messages, isOpen, isLoading]);

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
            welcomeMsg = `Chào mừng **${userName}** đến với nhà hàng FIVEFOOD! 👑\n\nMình là Trợ lý AI, siêu thần tốc 0ms luôn sẵn sàng hỗ trợ bạn chọn món, đặt hàng, và theo dõi lộ trình Shipper nhé!`;
            const res = await apiFetch(`${API_BASE_URL}/recommendations`);
            if (res && res.data && res.data.length > 0) {
              const top3 = res.data.slice(0, 3);
              const itemsList = top3.map(item => `👉 **${item.ProductName}** — ${item.Price.toLocaleString('vi-VN')}đ`).join('\n');
              welcomeMsg = `Chào mừng **${userName}** trở lại với FIVEFOOD! 👑\n\nDựa trên sở thích của bạn, mình đề xuất danh sách món ngon cực đỉnh hôm nay:\n${itemsList}\n\n💡 Bạn cần gọi món, mã ưu đãi hay kiểm tra đơn hàng cứ ra lệnh cho mình nhé!`;
            }
          } else {
            const res = await apiFetch(`${API_BASE_URL}/recommendations`);
            if (res && res.data && res.data.length > 0) {
              const top3 = res.data.slice(0, 3);
              const itemsList = top3.map(item => `🔥 **${item.ProductName}** — ${item.Price.toLocaleString('vi-VN')}đ`).join('\n');
              welcomeMsg = `Chào bạn! Mình là AI Trợ lý ẩm thực của **FIVEFOOD** 🍲\n\nHôm nay quán có các món bán chạy nhất mời bạn thưởng thức:\n${itemsList}\n\n💡 Bạn hãy Đăng nhập để AI có thể hỗ trợ bạn thêm đồ ăn vào giỏ và theo dõi vị trí Shipper trực tiếp nhé!`;
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
          } else {
            localStorage.removeItem(`chatbot_messages_user_${uid}`);
            localStorage.removeItem(`chatbot_session_user_${uid}`);
          }
        } catch (e) {}
      }

      setSessionId('');
      const updateWelcomeOnLogin = async () => {
        const userName = getUserName(user);
        let newWelcomeMsg = `Chào mừng **${userName}**! Trợ lý AI FIVEFOOD rất hân hạnh được phục vụ bạn hôm nay! 🌟`;
        try {
          const res = await apiFetch(`${API_BASE_URL}/recommendations`);
          if (res && res.data && res.data.length > 0) {
            const top3 = res.data.slice(0, 3);
            const itemsList = top3.map(item => `👉 **${item.ProductName}** — ${item.Price.toLocaleString('vi-VN')}đ`).join('\n');
            newWelcomeMsg = `Chào mừng **${userName}** trở lại! 👑\n\nDựa trên khẩu vị của bạn, mình gợi ý thực đơn hấp dẫn sau:\n${itemsList}\n\nBạn muốn thưởng thức món nào hôm nay ạ?`;
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
      prevUserRef.current = null;
      setSessionId('');
      localStorage.removeItem('chatbot_messages');
      localStorage.removeItem('chatbot_session_id');

      if (hasInitialized || isOpen) {
        const updateWelcomeOnLogout = async () => {
          let defaultWelcome = 'Chào bạn! Mình là trợ lý AI FIVEFOOD. Mình có thể giúp gì cho bạn hôm nay? 🍲';
          try {
            const res = await apiFetch(`${API_BASE_URL}/recommendations`);
            if (res && res.data && res.data.length > 0) {
              const top3 = res.data.slice(0, 3);
              const itemsList = top3.map(item => `🔥 **${item.ProductName}** — ${item.Price.toLocaleString('vi-VN')}đ`).join('\n');
              defaultWelcome = `Chào bạn! Mình là AI Trợ lý ẩm thực của **FIVEFOOD** 🍲\n\nHôm nay quán có các món bán chạy nhất:\n${itemsList}\n\n💡 Hãy Đăng nhập để mình hỗ trợ thêm món vào giỏ và kiểm tra tình trạng giao hàng nhé!`;
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

  const sendPromptToBot = async (promptText) => {
    if (!promptText.trim()) return;

    const userMessage = promptText.trim();
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
        if (data.sessionId) {
          setSessionId(data.sessionId);
        }
        const isCartAction = data.orderPlaced || (typeof data.reply === 'string' && (data.reply.includes('Đã thêm') || data.reply.includes('Đã dọn sạch') || data.reply.includes('Đã xóa') || data.reply.includes('trống') || data.reply.includes('giảm')));
        if (isCartAction) {
          setTimeout(() => {
            window.dispatchEvent(new Event('cartUpdated'));
          }, 200);
        }
      }
    } catch (error) {
      setMessages(prev => [...prev, { sender: 'bot', text: '❌ Xin lỗi bạn, hệ thống AI đang quá tải đôi chút. Bạn vui lòng thử lại sau giây lát nhé!' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    sendPromptToBot(inputMessage);
  };

  const handleChipClick = (promptText) => {
    sendPromptToBot(promptText);
  };

  return (
    <div className="chatbot-wrapper">
      {isOpen && (
        <div className="chatbot-window">
          {/* Header */}
          <div className="chatbot-header">
            <div className="chatbot-header-info">
              <div className="chatbot-avatar-container">
                🤖
                <div className="online-indicator-dot" title="Online - Phản hồi 0ms" />
              </div>
              <div className="chatbot-title-box">
                <h3>
                  FIVEFOOD AI <Sparkles size={16} style={{ color: '#FEF08A' }} />
                </h3>
                <span className="chatbot-subtext">
                  <Zap size={13} style={{ fill: '#FEF08A', color: '#FEF08A' }} /> Online • Trợ lý AI Phản xạ 0ms
                </span>
              </div>
            </div>
            <div className="chatbot-header-actions">
              <button className="header-action-btn" onClick={clearHistory} title="Làm mới cuộc hội thoại">
                <Trash2 size={16} />
              </button>
              <button className="header-action-btn" onClick={toggleChatbot} title="Đóng cửa sổ">
                <X size={18} />
              </button>
            </div>
          </div>
          
          {/* Quick Action Chips */}
          <div className="chatbot-quick-actions">
            {QUICK_CHIPS.map((chip, idx) => (
              <button
                key={idx}
                className="quick-chip"
                onClick={() => handleChipClick(chip.prompt)}
                disabled={isLoading}
                title="Bấm để hỏi ngay"
              >
                <span>{chip.icon}</span>
                <span>{chip.text}</span>
              </button>
            ))}
          </div>

          {/* Messages */}
          <div className="chatbot-messages">
            {messages.map((msg, index) => (
              <div key={index} className={`message-row ${msg.sender}`}>
                <div className="msg-avatar">
                  {msg.sender === 'bot' ? '🤖' : '👤'}
                </div>
                <div className="message-content">
                  {msg.sender === 'bot' ? renderFormattedText(msg.text) : msg.text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="message-row bot">
                <div className="msg-avatar">🤖</div>
                <div className="message-content typing-bubble">
                  <div className="typing-indicator">
                    <span /><span /><span />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Form */}
          <form className="chatbot-input-area" onSubmit={handleSendMessage}>
            <input 
              type="text" 
              placeholder="Nhập tin nhắn..." 
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              disabled={isLoading}
            />
            <button type="submit" className="send-btn" disabled={isLoading || !inputMessage.trim()} title="Gửi tin nhắn">
              <Send size={18} />
            </button>
          </form>
        </div>
      )}
      
      {!isOpen && (
        <div className="chatbot-toggle-container">
          <div className="chatbot-ai-badge">
            <Sparkles size={13} style={{ fill: '#FFF' }} /> AI Trợ Lý 0ms
          </div>
          <button className="chatbot-toggle-btn" onClick={toggleChatbot} title="Trò chuyện với AIFIVEFOOD">
            🤖
          </button>
        </div>
      )}

      {isOpen && (
        <button className="chatbot-toggle-btn" style={{ background: '#374151', borderColor: '#6B7280', boxShadow: '0 4px 15px rgba(0,0,0,0.3)' }} onClick={toggleChatbot} title="Thu nhỏ">
          <X size={28} />
        </button>
      )}
    </div>
  );
};

export default Chatbot;
