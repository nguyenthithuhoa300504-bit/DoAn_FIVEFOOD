const fs = require('fs');
let content = fs.readFileSync('chatbot.service.ts', 'utf8');

const targetStr = `      const isUserConfirming = [`;
const insertStr = `
      // DEBUG LOG
      try {
        const fs = require('fs');
        fs.appendFileSync('C:\\\\Users\\\\Admin\\\\Desktop\\\\DoAn\\\\backend\\\\debug-process.log', 
          '\\n--- NEW MESSAGE ---\\n' +
          'Time: ' + new Date().toISOString() + '\\n' +
          'Message: ' + message + '\\n' +
          'lastBotResponse: ' + lastBotResponse + '\\n' +
          'wasAskingConfirmation: ' + wasAskingConfirmation + '\\n' +
          'userId: ' + userId + '\\n'
        );
      } catch (e) {}
`;

if (!content.includes('DEBUG LOG')) {
  content = content.replace(targetStr, insertStr + targetStr);
  fs.writeFileSync('chatbot.service.ts', content);
  console.log("Injected log 1");
}

const targetStr2 = `        if (intentItems.length > 0) {
          isLocalHandled = true;
        }`;
const insertStr2 = `
        try {
          const fs = require('fs');
          fs.appendFileSync('C:\\\\Users\\\\Admin\\\\Desktop\\\\DoAn\\\\backend\\\\debug-process.log', 
            '1.1 executed.\\n' +
            'isUserConfirming: ' + isUserConfirming + '\\n' +
            'intentItems: ' + JSON.stringify(intentItems) + '\\n'
          );
        } catch (e) {}
`;

if (!content.includes('1.1 executed')) {
  content = content.replace(targetStr2, insertStr2 + targetStr2);
  fs.writeFileSync('chatbot.service.ts', content);
  console.log("Injected log 2");
}

const targetStr3 = `      if (
        !isLocalHandled &&
        intentItems.length === 0 &&`;
const insertStr3 = `
      try {
          const fs = require('fs');
          fs.appendFileSync('C:\\\\Users\\\\Admin\\\\Desktop\\\\DoAn\\\\backend\\\\debug-process.log', 
            'Before AI:\\n' +
            'isLocalHandled: ' + isLocalHandled + '\\n' +
            'intentItems: ' + JSON.stringify(intentItems) + '\\n'
          );
      } catch (e) {}
`;

if (!content.includes('Before AI:')) {
  content = content.replace(targetStr3, insertStr3 + targetStr3);
  fs.writeFileSync('chatbot.service.ts', content);
  console.log("Injected log 3");
}
