import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
@Injectable()
export class UserActionsService {
  private readonly logger = new Logger(UserActionsService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  async logAction(
    userId: number,
    actionType: string,
    productId?: number,
    searchQuery?: string,
  ) {
    try {
      const query = `
        INSERT INTO UserActionLogs (UserID, ActionType, ProductID, SearchQuery)
        VALUES (@UserID, @ActionType, @ProductID, @SearchQuery)
      `;
      await this.databaseService.query(query, [
        { name: 'UserID',  value: userId },
        { name: 'ActionType',  value: actionType },
        { name: 'ProductID',  value: productId || null },
        {
          name: 'SearchQuery',
          
          value: searchQuery || null,
        },
      ]);
      return { success: true };
    } catch (error) {
      this.logger.error('Error logging user action', error);
      throw error;
    }
  }
}
