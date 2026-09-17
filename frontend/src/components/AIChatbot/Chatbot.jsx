import React, { useState, useRef, useEffect } from 'react';
import { apiFetch } from '../../utils/apiFetch';
import { useCart } from '../../context/CartContext';
import { Send, Trash2, X, Sparkles, MessageCircle, Bot, Zap, Mic } from 'lucide-react';
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

const QuantitySelector = ({ productName, sendPromptToBot }) => {
  const [qty, setQty] = useState(1);
  return (
    <div className="quantity-selector-container">
      <div className="qty-controls">
        <button className="qty-btn" onClick={() => setQty(q => Math.max(1, q - 1))}>-</button>
        <span className="qty-display">{qty}</span>
        <button className="qty-btn" onClick={() => setQty(q => q + 1)}>+</button>
      </div>
      <button className="qty-confirm-btn" onClick={() => sendPromptToBot(`Thêm ${qty} phần ${productName}`.trim())}>
        Xác nhận
      </button>
    </div>
  );
};

const renderRichContent = (richContent, sendPromptToBot, setInputMessage) => {
  if (!richContent) return null;

  switch (richContent.type) {
    case 'food_recommendation':
      return (
        <div className="rich-message food-cards-container">
          {richContent.data.map((food, idx) => (
            <div key={idx} className="food-card">
              {food.ImageURL && (food.ImageURL.startsWith('http') || food.ImageURL.startsWith('/') || food.ImageURL.length > 5) ? (
                <img src={food.ImageURL} alt={food.ProductName} />
              ) : (
                <div style={{ fontSize: '50px', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '90px', background: 'rgba(255, 122, 0, 0.1)' }}>
                  {food.ImageURL || '🍔'}
                </div>
              )}
              <div className="food-card-info">
                <h4>{food.ProductName}</h4>
                {food.Ingredients && <div className="food-desc">{food.Ingredients.length > 30 ? food.Ingredients.substring(0, 30) + '...' : food.Ingredients}</div>}
                <div className="food-meta">
                  <span className="price">{food.Price.toLocaleString('vi-VN')}đ</span>
                  <span className={`stock ${food.Inventory > 0 ? 'in-stock' : 'out-stock'}`}>
                    {food.Inventory > 0 ? `Còn ${food.Inventory}` : 'Hết hàng'}
                  </span>
                </div>
                <button 
                  onClick={() => sendPromptToBot(food.ProductName)}
                  disabled={food.Inventory <= 0}
                  style={food.Inventory <= 0 ? {background: '#ccc', cursor: 'not-allowed', color: '#666'} : {}}
                >
                  {food.Inventory > 0 ? 'Thêm vào giỏ' : 'Hết hàng'}
                </button>
              </div>
            </div>
          ))}
        </div>
      );
    case 'quantity_selector':
      return <QuantitySelector productName={richContent.data?.productName || ''} sendPromptToBot={sendPromptToBot} />;
    case 'promotions':
      return (
        <div className="rich-message promo-cards-container">
          {richContent.data.map((promo, idx) => (
            <div key={idx} className="promo-card">
              <div className="promo-icon">🎁</div>
              <div className="promo-info">
                <h4>{promo.PromoCode}</h4>
                <p>{promo.Description}</p>
                <button onClick={() => sendPromptToBot(promo.PromoCode)}>Dùng mã này</button>
              </div>
            </div>
          ))}
        </div>
      );
    case 'payment_options':
      return (
        <div className="rich-message payment-options-container">
          <button className="payment-btn vnpay" onClick={() => sendPromptToBot('Thanh toán bằng VNPay')}>
            💳 VNPay (Ví điện tử)
          </button>
          <button className="payment-btn vietqr" onClick={() => sendPromptToBot('Thanh toán bằng VietQR')} style={{ background: '#4caf50', color: 'white', marginTop: '8px', border: 'none', padding: '12px', borderRadius: '12px', width: '100%', cursor: 'pointer', fontWeight: 'bold' }}>
            🏦 VietQR (Chuyển khoản)
          </button>
          <button className="payment-btn cod" onClick={() => sendPromptToBot('Thanh toán Tiền mặt')} style={{ marginTop: '8px' }}>
            💵 Thanh toán Tiền mặt (COD)
          </button>
        </div>
      );
    case 'vnpay_link':
      return (
        <div className="rich-message vnpay-card" style={{ marginTop: '10px', textAlign: 'center', background: 'white', padding: '15px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
          <h4 style={{ color: '#005baa' }}>Thanh toán qua VNPay</h4>
          <p style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>Đơn hàng #{richContent.orderId} đã được tạo. Vui lòng bấm nút bên dưới để thanh toán.</p>
          <a href={richContent.url} className="payment-btn vnpay" style={{ display: 'inline-block', textDecoration: 'none', padding: '12px 20px', borderRadius: '12px', fontWeight: 'bold' }}>
            Thanh toán ngay
          </a>
        </div>
      );
    case 'cart_summary':
      return (
        <div className="rich-message cart-summary-card">
          <div className="cart-summary-header">🛒 Hóa Đơn Tạm Tính</div>
          <div className="cart-summary-items">
            {richContent.data.items.map((item, idx) => (
              <div key={idx} className="cart-item-row">
                <span className="cart-item-name">{item.Quantity}x {item.ProductName}</span>
                <span className="cart-item-price">{(item.Price * item.Quantity).toLocaleString('vi-VN')}đ</span>
              </div>
            ))}
          </div>
          <div className="cart-summary-divider"></div>
          <div className="cart-total-row">
            <span>Tổng cộng:</span>
            <span className="cart-total-price">{richContent.data.subtotal.toLocaleString('vi-VN')}đ</span>
          </div>
          <button className="cart-promo-btn" onClick={() => sendPromptToBot('Xem danh sách mã giảm giá')}>
            🎁 Áp dụng mã giảm giá
          </button>
        </div>
      );
    case 'vietqr_link':
      return (
        <div className="rich-message vietqr-card" style={{ marginTop: '10px', textAlign: 'center', background: 'white', padding: '15px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#1F2937' }}>Quét mã để thanh toán</h4>
          <img 
            src={richContent.url} 
            alt="VietQR" 
            style={{ width: '100%', maxWidth: '250px', borderRadius: '8px', border: '1px solid #E5E7EB' }} 
          />
          <div style={{ marginTop: '15px' }}>
            <button 
              onClick={() => sendPromptToBot(`Tôi đã chuyển khoản cho đơn hàng #${richContent.orderId}`)}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                color: 'white',
                padding: '12px',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 'bold',
                cursor: 'pointer',
                boxShadow: '0 4px 10px rgba(16, 185, 129, 0.3)'
              }}
            >
              ✅ TÔI ĐÃ CHUYỂN KHOẢN
            </button>
          </div>
        </div>
      );
    default:
      return null;
  }
};

const Chatbot = () => {
  const { user, isLoggedIn } = useCart();
  const prevUserRef = useRef(user);
  const [isOpen, setIsOpen] = useState(false);
  
  // Trạng thái thu âm (Voice-to-Text)
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'vi-VN'; 

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputMessage(prev => prev ? prev + ' ' + transcript : transcript);
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Lỗi nhận diện giọng nói:', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const toggleListening = (e) => {
    e.preventDefault();
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      try {
        recognitionRef.current?.start();
        setIsListening(true);
      } catch (err) {
        console.error('Không thể bắt đầu thu âm', err);
      }
    }
  };
  
  // Trạng thái kéo thả
  const [position, setPosition] = useState({ bottom: 28 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({ startY: 0, startBottom: 28, isMoved: false });

  // Tự động điều chỉnh vị trí nếu Chatbot bị đẩy ra ngoài màn hình (khi mở lên hoặc resize)
  useEffect(() => {
    const handleResize = () => {
      setPosition(prev => {
        const maxBottom = Math.max(20, window.innerHeight - (isOpen ? 640 : 100));
        return prev.bottom > maxBottom ? { bottom: maxBottom } : prev;
      });
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isOpen]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      const deltaY = dragRef.current.startY - e.clientY;
      if (Math.abs(deltaY) > 3) {
        dragRef.current.isMoved = true;
      }
      const maxBottom = window.innerHeight - (isOpen ? 560 : 100);
      const newBottom = Math.max(20, Math.min(maxBottom, dragRef.current.startBottom + deltaY));
      setPosition({ bottom: newBottom });
    };
    const handleMouseUp = () => setIsDragging(false);
    
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    
    // Ngăn chặn kéo thả nếu đang tương tác với vùng chứa nội dung chính
    if (e.target.closest('.chatbot-messages') || 
        e.target.closest('.chatbot-input-area') ||
        e.target.closest('.chatbot-quick-actions') ||
        e.target.closest('.header-action-btn')) {
      return;
    }
    
    setIsDragging(true);
    dragRef.current.startY = e.clientY;
    dragRef.current.startBottom = position.bottom;
    dragRef.current.isMoved = false;
  };

  const [messages, setMessages] = useState(() => {
    try {
      const uid = getUserId(user) || 'guest';
      const saved = localStorage.getItem(`chatbot_messages_user_${uid}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            if (parsed.length > 1 || !isGuestWelcomeMessage(parsed[0]?.text)) {
              return parsed;
            }
          }
        }
      return [];
    } catch { return []; }
  });
  
  const [hasInitialized, setHasInitialized] = useState(() => {
    try {
      const uid = getUserId(user) || 'guest';
      const saved = localStorage.getItem(`chatbot_messages_user_${uid}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.length > 1 || !isGuestWelcomeMessage(parsed[0]?.text);
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
    const uid = getUserId(user) || 'guest';
    return localStorage.getItem(`chatbot_session_user_${uid}`) || '';
  });

  const toggleChatbot = (e) => {
    if (dragRef.current.isMoved) {
      dragRef.current.isMoved = false;
      return;
    }
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

  // CHỈ LƯU messages vào localStorage KHI KHÁCH HÀNG ĐÃ ĐĂNG NHẬP (hoặc nếu là phiên chat guest được merge)
  useEffect(() => {
    const uid = getUserId(user) || 'guest';
    if (messages.length > 0 && (messages.length > 1 || !isGuestWelcomeMessage(messages[0]?.text))) {
      try {
        localStorage.setItem(`chatbot_messages_user_${uid}`, JSON.stringify(messages));
      } catch (e) {
        console.error('Không thể lưu lịch sử chat:', e);
      }
    }
  }, [messages, isLoggedIn, user]);

  // CHỈ LƯU sessionId vào localStorage KHI KHÁCH HÀNG ĐÃ ĐĂNG NHẬP
  useEffect(() => {
    const uid = getUserId(user) || 'guest';
    if (sessionId) {
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
              
              if (res.type === 'personalized') {
                welcomeMsg = `Chào mừng **${userName}** trở lại với FIVEFOOD! 👑\n\nDựa trên sở thích của bạn, mình đề xuất danh sách món ngon cực đỉnh hôm nay:\n${itemsList}\n\n💡 Bạn cần gọi món, mã ưu đãi hay kiểm tra đơn hàng cứ ra lệnh cho mình nhé!`;
              } else {
                welcomeMsg = `Chào mừng **${userName}** đến với FIVEFOOD! 👑\n\nHôm nay quán có các món bán chạy nhất mời bạn thưởng thức:\n${itemsList}\n\n💡 Bạn cần gọi món, mã ưu đãi hay kiểm tra đơn hàng cứ ra lệnh cho mình nhé!`;
              }
              
              setMessages([{ sender: 'bot', text: welcomeMsg, richContent: { type: 'food_recommendation', data: top3 } }]);
              setIsLoading(false);
              return;
            }
          } else {
            const res = await apiFetch(`${API_BASE_URL}/recommendations`);
            if (res && res.data && res.data.length > 0) {
              const top3 = res.data.slice(0, 3);
              const itemsList = top3.map(item => `🔥 **${item.ProductName}** — ${item.Price.toLocaleString('vi-VN')}đ`).join('\n');
              welcomeMsg = `Chào bạn! Mình là AI Trợ lý ẩm thực của **FIVEFOOD** 🍲\n\nHôm nay quán có các món bán chạy nhất mời bạn thưởng thức:\n${itemsList}\n\n💡 Bạn có thể hỏi mình về món ăn, hoặc thử yêu cầu đặt món nhé!`;
              setMessages([{ sender: 'bot', text: welcomeMsg, richContent: { type: 'food_recommendation', data: top3 } }]);
              setIsLoading(false);
              return;
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
  const messagesRef = useRef(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Xử lý chuyển đổi khi đăng nhập hoặc đăng xuất
  useEffect(() => {
    const uid = getUserId(user);
    const prevUid = getUserId(prevUserRef.current);

    if (uid && (!prevUserRef.current || prevUid !== uid)) {
      prevUserRef.current = user;
      
      // KHI ĐĂNG NHẬP:
      // Nếu khách vãng lai đã có lịch sử chat (tức là nhắn ít nhất 1 câu ngoài câu chào)
      // -> Giữ nguyên phiên trò chuyện hiện tại (Merge AI Session)
      if (messagesRef.current && messagesRef.current.length > 1) {
        return; // Không load lịch sử cũ đè lên, giữ nguyên session
      }

      const savedMessages = localStorage.getItem(`chatbot_messages_user_${uid}`);
      const savedSession = localStorage.getItem(`chatbot_session_user_${uid}`);
      if (savedMessages) {
        try {
          const parsed = JSON.parse(savedMessages);
          if (Array.isArray(parsed) && parsed.length > 0) {
            if (parsed.length > 1 || !isGuestWelcomeMessage(parsed[0]?.text)) {
              setMessages(parsed);
              setSessionId(savedSession || '');
              setHasInitialized(true);
              return;
            } else {
              localStorage.removeItem(`chatbot_messages_user_${uid}`);
              localStorage.removeItem(`chatbot_session_user_${uid}`);
            }
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
              
              if (res.type === 'personalized') {
                newWelcomeMsg = `Chào mừng **${userName}** trở lại! 👑\n\nDựa trên khẩu vị của bạn, mình gợi ý thực đơn hấp dẫn sau:\n${itemsList}\n\nBạn muốn thưởng thức món nào hôm nay ạ?`;
              } else {
                newWelcomeMsg = `Chào mừng **${userName}**! 👑\n\nHôm nay quán có các món bán chạy nhất mời bạn thưởng thức:\n${itemsList}\n\nBạn muốn thưởng thức món nào hôm nay ạ?`;
              }
              
              setMessages([{ sender: 'bot', text: newWelcomeMsg, richContent: { type: 'food_recommendation', data: top3 } }]);
              setHasInitialized(true);
              return;
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
              defaultWelcome = `Chào bạn! Mình là AI Trợ lý ẩm thực của **FIVEFOOD** 🍲\n\nHôm nay quán có các món bán chạy nhất:\n${itemsList}\n\n💡 Bạn có thể hỏi mình về món ăn, hoặc thử yêu cầu đặt món nhé!`;
              setMessages([{ sender: 'bot', text: defaultWelcome, richContent: { type: 'food_recommendation', data: top3 } }]);
              setHasInitialized(true);
              return;
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
      const uid = getUserId(user);
      const localCart = !uid ? (JSON.parse(localStorage.getItem('local_cart')) || []) : [];

      const response = await apiFetch(`${API_BASE_URL}/chatbot`, {
        method: 'POST',
        body: JSON.stringify({ message: userMessage, sessionId, localCart })
      });

      const data = response?.data || response;
      if (data && data.reply) {
        setMessages(prev => [...prev, { sender: 'bot', text: data.reply, richContent: data.richContent }]);
        if (data.sessionId) {
          setSessionId(data.sessionId);
        }
        
        // Cập nhật local_cart nếu có
        if (data.newLocalCart) {
          localStorage.setItem('local_cart', JSON.stringify(data.newLocalCart));
          window.dispatchEvent(new Event('cartUpdated'));
        }

        const isCartAction = data.orderPlaced || (typeof data.reply === 'string' && (data.reply.includes('Đã thêm') || data.reply.includes('Đã dọn sạch') || data.reply.includes('Đã xóa') || data.reply.includes('trống') || data.reply.includes('giảm')));
        if (isCartAction && !data.newLocalCart) {
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
    if (isLoading) return;
    sendPromptToBot(inputMessage);
  };

  const handleChipClick = (promptText) => {
    sendPromptToBot(promptText);
  };

  return (
    <div 
      className="chatbot-wrapper" 
      style={{ bottom: `${position.bottom}px`, cursor: isDragging ? 'grabbing' : 'auto' }}
      onMouseDown={handleMouseDown}
    >
      {isOpen && (
        <div className="chatbot-window">
          {/* Header */}
          <div className="chatbot-header">
            <div className="chatbot-header-info">
              <div className="chatbot-avatar-container">
                🤖
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
                  {msg.sender === 'bot' && msg.richContent && renderRichContent(msg.richContent, sendPromptToBot, setInputMessage)}
                  {msg.sender === 'bot' && msg.text.includes('Đăng nhập') && msg.text.includes('❌') && (
                    <div style={{ marginTop: '12px' }}>
                      <button 
                        className="chatbot-login-btn"
                        onClick={() => {
                          window.dispatchEvent(new Event('openLoginTab'));
                          setIsOpen(false);
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
                        Đăng nhập ngay
                      </button>
                    </div>
                  )}
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
            <button 
              type="button" 
              className="mic-btn" 
              onClick={toggleListening}
              title={isListening ? "Đang thu âm..." : "Bấm để nói"}
              disabled={isLoading || !recognitionRef.current}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 8px', color: isListening ? '#EF4444' : '#6B7280' }}
            >
              <Mic size={18} className={isListening ? 'pulse-anim' : ''} />
            </button>
            <input 
              type="text" 
              placeholder={isListening ? "Đang nghe..." : "Nhập tin nhắn..."}
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
