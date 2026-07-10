import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { ConfigService } from '@nestjs/config';
import * as sql from 'mssql';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ChatbotService {
  private readonly logger = new Logger(ChatbotService.name);
  private apiKey: string | undefined;

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly configService: ConfigService,
  ) {
    this.apiKey = this.configService.get<string>('GROQ_API_KEY');
    if (!this.apiKey) {
      this.logger.warn('GROQ_API_KEY is not configured in .env');
    }
  }

  async processMessage(userId: number | null, message: string, sessionId?: string) {
    if (!this.apiKey) {
      throw new InternalServerErrorException('AI Chatbot is currently unavailable due to missing API key.');
    }

    try {
      // 1. Fetch products from database to provide context to AI
      const productsQuery = `
        SELECT p.ProductID, p.ProductName, p.Price, c.CategoryName
        FROM Products p
        INNER JOIN Categories c ON p.CategoryID = c.CategoryID
        WHERE p.IsActive = 1
      `;
      const productsResult = await this.databaseService.query(productsQuery);
      const productsContext = productsResult.recordset.map(
        p => `- ${p.ProductName} (${p.CategoryName}): ${p.Price} đ`
      ).join('\n');

      const systemPrompt = `Bạn là trợ lý ảo thân thiện của nhà hàng FIVEFOOD. Bạn sẽ giúp khách hàng chọn món ăn, giải đáp thắc mắc.
Dưới đây là thực đơn hiện tại của nhà hàng:
${productsContext}

Yêu cầu:
- Trả lời ngắn gọn, thân thiện, và tự nhiên bằng tiếng Việt.
- Dựa trên danh sách món ăn trên để tư vấn (không bịa ra món khác).
- Nếu không chắc chắn, hãy xin lỗi và bảo họ có thể liên hệ hotline.`;

      // 2. Call Groq API
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message }
          ],
          temperature: 0.7
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        this.logger.error(`Groq API Error: ${errorData}`);
        throw new Error('Groq API returned an error');
      }

      const data = await response.json();
      const responseText = data.choices[0].message.content;

      // 3. Save to ChatbotLogs
      const currentSessionId = sessionId || uuidv4();
      
      const conversationData = JSON.stringify({
        userMessage: message,
        botResponse: responseText,
        timestamp: new Date().toISOString()
      });

      const insertQuery = `
        INSERT INTO ChatbotLogs (UserID, SessionID, ConversationData)
        VALUES (@UserID, @SessionID, @ConversationData)
      `;
      
      await this.databaseService.query(insertQuery, [
        { name: 'UserID', type: sql.Int, value: userId || null },
        { name: 'SessionID', type: sql.VarChar(100), value: currentSessionId },
        { name: 'ConversationData', type: sql.NVarChar(sql.MAX), value: conversationData }
      ]);

      return {
        reply: responseText,
        sessionId: currentSessionId
      };
    } catch (error) {
      this.logger.error('Error in processMessage', error);
      throw new InternalServerErrorException('Failed to process message with AI');
    }
  }

  async getLogs() {
    try {
      const query = `
        SELECT c.LogID, c.SessionID, c.ConversationData, c.CreatedAt, u.FullName, u.Email
        FROM ChatbotLogs c
        LEFT JOIN Users u ON c.UserID = u.UserID
        ORDER BY c.CreatedAt DESC
      `;
      const result = await this.databaseService.query(query);
      return result.recordset.map(row => {
        let parsedData = {};
        try {
          parsedData = JSON.parse(row.ConversationData);
        } catch (e) {
          parsedData = { userMessage: '', botResponse: 'Lỗi đọc dữ liệu' };
        }
        return {
          LogID: row.LogID,
          SessionID: row.SessionID,
          CreatedAt: row.CreatedAt,
          FullName: row.FullName || 'Khách vãng lai',
          Email: row.Email || '',
          ...parsedData
        };
      });
    } catch (error) {
      this.logger.error('Error fetching chatbot logs', error);
      throw new InternalServerErrorException('Failed to fetch chatbot logs');
    }
  }
}
