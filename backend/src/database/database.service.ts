import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, PoolConfig } from 'pg';

const keyMapping: { [key: string]: string } = {
  productid: 'ProductID',
  productname: 'ProductName',
  categoryid: 'CategoryID',
  categoryname: 'CategoryName',
  price: 'Price',
  unitprice: 'UnitPrice',
  inventory: 'Inventory',
  imageurl: 'ImageURL',
  ingredients: 'Ingredients',
  isactive: 'IsActive',
  description: 'Description',
  roleid: 'RoleID',
  rolename: 'RoleName',
  userid: 'UserID',
  fullname: 'FullName',
  email: 'Email',
  passwordhash: 'PasswordHash',
  phone: 'Phone',
  islocked: 'IsLocked',
  createdat: 'CreatedAt',
  orderid: 'OrderID',
  orderdate: 'OrderDate',
  shippingaddress: 'ShippingAddress',
  status: 'Status',
  latitude: 'Latitude',
  longitude: 'Longitude',
  totalamount: 'TotalAmount',
  cartid: 'CartID',
  cartitemid: 'CartItemID',
  quantity: 'Quantity',
  subtotal: 'Subtotal',
  conversationdata: 'ConversationData',
  reviewid: 'ReviewID',
  rating: 'Rating',
  comment: 'Comment',
  ishidden: 'IsHidden',
  promocode: 'PromoCode',
  discountpercentage: 'DiscountPercentage',
  maxdiscountamount: 'MaxDiscountAmount',
  minordervalue: 'MinOrderValue',
  usagelimit: 'UsageLimit',
  usedcount: 'UsedCount',
  startdate: 'StartDate',
  enddate: 'EndDate',
  totalcount: 'TotalCount',
  soldcount: 'SoldCount',
  averagerating: 'AverageRating',
  reviewcount: 'ReviewCount',
  messageid: 'MessageID',
  senderid: 'SenderID',
  receiverid: 'ReceiverID',
  messagetext: 'MessageText',
  sentat: 'SentAt',
  isread: 'IsRead',
  actionid: 'ActionID',
  actiontype: 'ActionType',
  searchquery: 'SearchQuery',
  promotionid: 'PromotionID',
  branchid: 'BranchID',
  branchname: 'BranchName',
  sysstarttime: 'SysStartTime',
  sysendtime: 'SysEndTime',
  count: 'count',
  valid: 'valid',
  discountamount: 'DiscountAmount',
  shippingfee: 'ShippingFee',
  finalamount: 'FinalAmount',
  paymentmethod: 'PaymentMethod',
  paymentstatus: 'PaymentStatus',
  callcount: 'CallCount',
};

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private pool: Pool;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const config: PoolConfig = {
      user: this.configService.get<string>('DB_USER') || 'postgres',
      password: this.configService.get<string>('DB_PASSWORD') || '',
      host: this.configService.get<string>('DB_HOST') || '127.0.0.1',
      database: this.configService.get<string>('DB_NAME') || 'postgres',
      port: parseInt(this.configService.get<string>('DB_PORT') || '5432', 10),
      max: 10,
      idleTimeoutMillis: 60000,
      connectionTimeoutMillis: 15000,
    };

    // Supabase requires SSL usually
    if (
      this.configService.get<string>('DB_ENCRYPT') === 'true' ||
      config.host?.includes('supabase.co')
    ) {
      config.ssl = { rejectUnauthorized: false };
    }

    const maxRetries = 5;
    const retryDelayMs = 5000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.logger.log(
          `Connecting to PostgreSQL (attempt ${attempt}/${maxRetries})...`,
        );
        this.pool = new Pool(config);
        await this.pool.query('SELECT 1');
        this.logger.log(
          'Connected to PostgreSQL successfully (Database: ' +
            config.database +
            ').',
        );
        return; // Kết nối thành công, thoát vòng lặp
      } catch (err) {
        this.logger.warn(
          `Connection attempt ${attempt} failed: ${err.message}`,
        );
        if (attempt === maxRetries) {
          this.logger.error(
            'All connection attempts failed. Could not connect to PostgreSQL.',
          );
          throw err;
        }
        this.logger.log(`Retrying in ${retryDelayMs / 1000}s...`);
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
      }
    }
  }

  async onModuleDestroy() {
    if (this.pool) {
      await this.pool.end();
      this.logger.log('PostgreSQL connection pool closed.');
    }
  }

  getPool(): Pool {
    return this.pool;
  }

  /**
   * Thực thi câu lệnh SQL với các tham số đầu vào (Inputs)
   * Giữ nguyên cấu trúc params cũ của mssql để giảm lỗi ở các service: { name: string, type: any, value: any }[]
   * Hàm này sẽ tự động chuyển đổi params sang array của PostgreSQL ($1, $2, ...)
   */
  async query(
    queryText: string,
    params?: { name: string; type?: any; value: any }[],
  ) {
    try {
      let pgQueryText = queryText;
      const pgParams: any[] = [];

      if (params && params.length > 0) {
        params.forEach((p, index) => {
          // Replace @ParamName with $1, $2, etc.
          // Note: This relies on simple string replacement, in complex queries this might be tricky,
          // but works for most standard queries.
          // We use global regex replacement with word boundary to avoid partial replacements.
          const paramRegex = new RegExp(`@${p.name}\\b`, 'g');
          pgQueryText = pgQueryText.replace(paramRegex, `$${index + 1}`);
          pgParams.push(p.value);
        });
      }

      const result = await this.pool.query(pgQueryText, pgParams);
      const mappedRows = result.rows.map((row: any) => {
        const newRow: any = {};
        for (const key in row) {
          const pascalKey = keyMapping[key] || key;
          let val = row[key];
          if (
            (pascalKey === 'Price' ||
              pascalKey === 'TotalAmount' ||
              pascalKey === 'FinalAmount' ||
              pascalKey === 'DiscountAmount' ||
              pascalKey === 'ShippingFee' ||
              pascalKey === 'Subtotal' ||
              pascalKey === 'MaxDiscountAmount' ||
              pascalKey === 'MinOrderValue' ||
              pascalKey === 'Latitude' ||
              pascalKey === 'Longitude' ||
              pascalKey === 'UnitPrice') &&
            typeof val === 'string'
          ) {
            val = Number(val);
          }
          newRow[pascalKey] = val;
        }
        return newRow;
      });
      return { recordset: mappedRows, rowsAffected: [result.rowCount] };
    } catch (err) {
      this.logger.error(`Query execution failed: ${queryText}`, err);
      throw err;
    }
  }

  /**
   * Gọi Stored Procedure / Function
   */
  async executeProcedure(
    procedureName: string,
    inputs?: { name: string; type?: any; value: any }[],
    outputs?: { name: string; type?: any }[], // Bỏ qua outputs trong PostgreSQL function call
  ) {
    try {
      let queryText = `SELECT * FROM ${procedureName}()`;
      const pgParams: any[] = [];

      if (inputs && inputs.length > 0) {
        const placeholders = inputs.map((_, i) => `$${i + 1}`).join(', ');
        queryText = `SELECT * FROM ${procedureName}(${placeholders})`;
        inputs.forEach((p) => {
          pgParams.push(p.value);
        });
      }

      const result = await this.pool.query(queryText, pgParams);
      const mappedRows = result.rows.map((row: any) => {
        const newRow: any = {};
        for (const key in row) {
          const pascalKey = keyMapping[key] || key;
          let val = row[key];
          if (
            (pascalKey === 'Price' ||
              pascalKey === 'TotalAmount' ||
              pascalKey === 'FinalAmount' ||
              pascalKey === 'DiscountAmount' ||
              pascalKey === 'ShippingFee' ||
              pascalKey === 'Subtotal' ||
              pascalKey === 'MaxDiscountAmount' ||
              pascalKey === 'MinOrderValue' ||
              pascalKey === 'Latitude' ||
              pascalKey === 'Longitude' ||
              pascalKey === 'UnitPrice') &&
            typeof val === 'string'
          ) {
            val = Number(val);
          }
          newRow[pascalKey] = val;
        }
        return newRow;
      });
      return { recordset: mappedRows, rowsAffected: [result.rowCount] };
    } catch (err) {
      this.logger.error(`Function execution failed: ${procedureName}`, err);
      throw err;
    }
  }
}
