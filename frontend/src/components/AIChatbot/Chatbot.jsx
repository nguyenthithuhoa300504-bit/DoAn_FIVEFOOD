import React, { useState, useRef, useEffect } from 'react';
import { apiFetch } from '../../utils/apiFetch';
import './Chatbot.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const [sessionId, setSessionId] = useState('');

  const toggleChatbot = () => {
    setIsOpen(!isOpen);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  useEffect(() => {
    const initChatbot = async () => {
      if (isOpen && !hasInitialized) {
        setHasInitialized(true);
        setIsLoading(true);
        
        let welcomeMsg = 'Chào bạn! Mình là trợ lý ảo của FIVEFOOD. Mình có thể giúp gì cho bạn hôm nay?';
        try {
          const userStr = localStorage.getItem('user');
          const token = localStorage.getItem('token');
          
          if (token && userStr) {
            const user = JSON.parse(userStr);
            const res = await apiFetch(`${API_BASE_URL}/recommendations`);
            if (res && res.data && res.data.length > 0) {
              // Top 3 gợi ý
              const top3 = res.data.slice(0, 3);
              const itemsList = top3.map(item => `- ${item.ProductName} (${item.Price.toLocaleString('vi-VN')}đ)`).join('\n');
              welcomeMsg = `Chào ${user.FullName}! Dựa trên sở thích và lịch sử của bạn, mình gợi ý các món ăn sau:\n${itemsList}\n\nBạn muốn gọi món nào hay cần mình tư vấn thêm gì không?`;
            } else {
              welcomeMsg = `Chào ${user.FullName}! Mình là trợ lý ảo của FIVEFOOD. Hôm nay bạn muốn ăn gì?`;
            }
          } else {
            // Không đăng nhập cũng có thể lấy gợi ý top bán chạy
            const res = await apiFetch(`${API_BASE_URL}/recommendations`);
            if (res && res.data && res.data.length > 0) {
              const top3 = res.data.slice(0, 3);
              const itemsList = top3.map(item => `- ${item.ProductName} (${item.Price.toLocaleString('vi-VN')}đ)`).join('\n');
              welcomeMsg = `Chào bạn! Mình là trợ lý ảo của FIVEFOOD. Dưới đây là các món đang bán chạy nhất:\n${itemsList}\n\nBạn có muốn mình tư vấn thêm không?`;
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
  }, [isOpen, hasInitialized]);

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

      if (response && response.data) {
        setMessages(prev => [...prev, { sender: 'bot', text: response.data.reply }]);
        if (!sessionId) {
          setSessionId(response.data.sessionId);
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
            <button className="close-btn" onClick={toggleChatbot}>×</button>
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
