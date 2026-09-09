const fs = require('fs');
let content = fs.readFileSync('src/components/AIChatbot/Chatbot.jsx', 'utf8');

// fix useState for messages
content = content.replace(
  'const uid = getUserId(user);\n      if (uid) {\n        const saved = localStorage.getItem(`chatbot_messages_user_${uid}`);',
  'const uid = getUserId(user) || \'guest\';\n      const saved = localStorage.getItem(`chatbot_messages_user_${uid}`);'
);
content = content.replace(
  '          if (Array.isArray(parsed) && parsed.length > 0 && !isGuestWelcomeMessage(parsed[0]?.text)) {\n            return parsed;\n          }\n        }\n      }\n      return [];\n    } catch { return []; }\n  });',
  '          if (Array.isArray(parsed) && parsed.length > 0 && !isGuestWelcomeMessage(parsed[0]?.text)) {\n            return parsed;\n          }\n        }\n      return [];\n    } catch { return []; }\n  });'
);

// fix useState for hasInitialized
content = content.replace(
  'const uid = getUserId(user);\n      if (uid) {\n        const saved = localStorage.getItem(`chatbot_messages_user_${uid}`);',
  'const uid = getUserId(user) || \'guest\';\n      const saved = localStorage.getItem(`chatbot_messages_user_${uid}`);'
);
content = content.replace(
  '          return Array.isArray(parsed) && parsed.length > 0 && !isGuestWelcomeMessage(parsed[0]?.text);\n        }\n      }\n      return false;\n    } catch { return false; }\n  });',
  '          return Array.isArray(parsed) && parsed.length > 0 && !isGuestWelcomeMessage(parsed[0]?.text);\n        }\n      return false;\n    } catch { return false; }\n  });'
);

// fix useState for sessionId
content = content.replace(
  '  const [sessionId, setSessionId] = useState(() => {\n    const uid = getUserId(user);\n    if (uid) {\n      return localStorage.getItem(`chatbot_session_user_${uid}`) || \'\';\n    }\n    return \'\';\n  });',
  '  const [sessionId, setSessionId] = useState(() => {\n    const uid = getUserId(user) || \'guest\';\n    return localStorage.getItem(`chatbot_session_user_${uid}`) || \'\';\n  });'
);

// fix useEffect for messages
content = content.replace(
  '  // CHỈ LƯU messages vào localStorage KHI KHÁCH HÀNG ĐÃ ĐĂNG NHẬP (hoặc nếu là phiên chat guest được merge)\n  useEffect(() => {\n    const uid = getUserId(user);\n    if (isLoggedIn && uid && messages.length > 0 && (messages.length > 1 || !isGuestWelcomeMessage(messages[0]?.text))) {',
  '  // CHỈ LƯU messages vào localStorage KHI KHÁCH HÀNG ĐÃ ĐĂNG NHẬP (hoặc nếu là phiên chat guest được merge)\n  useEffect(() => {\n    const uid = getUserId(user) || \'guest\';\n    if (messages.length > 0 && (messages.length > 1 || !isGuestWelcomeMessage(messages[0]?.text))) {'
);

// fix useEffect for sessionId
content = content.replace(
  '  // CHỈ LƯU sessionId vào localStorage KHI KHÁCH HÀNG ĐÃ ĐĂNG NHẬP\n  useEffect(() => {\n    const uid = getUserId(user);\n    if (isLoggedIn && uid && sessionId) {',
  '  // CHỈ LƯU sessionId vào localStorage KHI KHÁCH HÀNG ĐÃ ĐĂNG NHẬP\n  useEffect(() => {\n    const uid = getUserId(user) || \'guest\';\n    if (sessionId) {'
);

fs.writeFileSync('src/components/AIChatbot/Chatbot.jsx', content, 'utf8');
console.log('Fixed guest localStorage persistence');
