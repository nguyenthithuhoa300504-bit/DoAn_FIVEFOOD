import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
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
        VALUES (@SenderID, @ReceiverID, @MessageText)
        RETURNING MessageID, SentAt
      `;
      const result = await this.databaseService.query(query, [
        { name: 'SenderID', value: senderId },
        { name: 'ReceiverID', value: receiverId },
        { name: 'MessageText', value: text },
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
        { name: 'U1', value: user1Id },
        { name: 'U2', value: user2Id },
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
        { name: 'AdminID', value: adminId },
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
        SELECT  u.UserID 
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
        { name: 'UserID', value: userId },
        { name: 'Title', value: title },
        { name: 'Message', value: message },
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
        { name: 'UserID', value: userId },
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
        SET IsRead = true 
        WHERE NotificationID = @NotifID AND UserID = @UserID
      `;
      await this.databaseService.query(query, [
        { name: 'NotifID', value: notificationId },
        { name: 'UserID', value: userId },
      ]);
      return { success: true };
    } catch (error) {
      this.logger.error('Error marking notification as read', error);
      throw error;
    }
  }
}
