import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import * as sql from 'mssql';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  // ============================================
  // QUẢN LÝ CHAT
  // ============================================

  async saveMessage(senderId: number, receiverId: number, text: string) {
    try {
      const query = `
        INSERT INTO ChatMessages (SenderID, ReceiverID, MessageText)
        OUTPUT INSERTED.MessageID, INSERTED.SentAt
        VALUES (@SenderID, @ReceiverID, @MessageText)
      `;
      const result = await this.databaseService.query(query, [
        { name: 'SenderID', type: sql.Int, value: senderId },
        { name: 'ReceiverID', type: sql.Int, value: receiverId },
        { name: 'MessageText', type: sql.NVarChar, value: text },
      ]);
      return result.recordset[0];
    } catch (error) {
      this.logger.error('Error saving chat message', error);
      throw error;
    }
  }

  async getChatHistory(user1Id: number, user2Id: number) {
    try {
      const query = `
        SELECT MessageID, SenderID, ReceiverID, MessageText, SentAt, IsRead
        FROM ChatMessages
        WHERE (SenderID = @U1 AND ReceiverID = @U2)
           OR (SenderID = @U2 AND ReceiverID = @U1)
        ORDER BY SentAt ASC
      `;
      const result = await this.databaseService.query(query, [
        { name: 'U1', type: sql.Int, value: user1Id },
        { name: 'U2', type: sql.Int, value: user2Id },
      ]);
      return result.recordset;
    } catch (error) {
      this.logger.error('Error fetching chat history', error);
      throw error;
    }
  }

  // Danh sách các user đã từng chat với Admin
  async getChatUsers(adminId: number) {
    try {
      const query = `
        SELECT DISTINCT u.UserID, u.FullName, u.Email
        FROM Users u
        INNER JOIN ChatMessages c ON u.UserID = c.SenderID OR u.UserID = c.ReceiverID
        WHERE u.UserID != @AdminID
      `;
      const result = await this.databaseService.query(query, [
        { name: 'AdminID', type: sql.Int, value: adminId },
      ]);
      return result.recordset;
    } catch (error) {
      this.logger.error('Error fetching chat users', error);
      throw error;
    }
  }

  // Lấy 1 AdminID bất kỳ để khách hàng gửi tin nhắn tới
  async getFirstAdminId() {
    try {
      const query = `
        SELECT TOP 1 u.UserID 
        FROM Users u
        INNER JOIN Roles r ON u.RoleID = r.RoleID
        WHERE r.RoleName = 'Admin'
      `;
      const result = await this.databaseService.query(query);
      if (result.recordset.length > 0) {
        return result.recordset[0].UserID;
      }
      return null;
    } catch (error) {
      this.logger.error('Error finding admin', error);
      throw error;
    }
  }

  // ============================================
  // QUẢN LÝ THÔNG BÁO (NOTIFICATIONS)
  // ============================================

  async addNotification(userId: number, title: string, message: string) {
    try {
      const query = `
        INSERT INTO Notifications (UserID, Title, Message)
        VALUES (@UserID, @Title, @Message)
      `;
      await this.databaseService.query(query, [
        { name: 'UserID', type: sql.Int, value: userId },
        { name: 'Title', type: sql.NVarChar, value: title },
        { name: 'Message', type: sql.NVarChar, value: message },
      ]);
    } catch (error) {
      this.logger.error('Error adding notification', error);
    }
  }

  async getNotifications(userId: number) {
    try {
      const query = `
        SELECT NotificationID, Title, Message, IsRead, CreatedAt
        FROM Notifications
        WHERE UserID = @UserID
        ORDER BY CreatedAt DESC
      `;
      const result = await this.databaseService.query(query, [
        { name: 'UserID', type: sql.Int, value: userId },
      ]);
      return result.recordset;
    } catch (error) {
      this.logger.error('Error fetching notifications', error);
      throw error;
    }
  }

  async markAsRead(notificationId: number, userId: number) {
    try {
      const query = `
        UPDATE Notifications 
        SET IsRead = 1 
        WHERE NotificationID = @NotifID AND UserID = @UserID
      `;
      await this.databaseService.query(query, [
        { name: 'NotifID', type: sql.Int, value: notificationId },
        { name: 'UserID', type: sql.Int, value: userId },
      ]);
      return { success: true };
    } catch (error) {
      this.logger.error('Error marking notification as read', error);
      throw error;
    }
  }
}
