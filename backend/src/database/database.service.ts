import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sql from 'mssql';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private pool: sql.ConnectionPool;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const config: sql.config = {
      user: this.configService.get<string>('DB_USER') || 'sa',
      password: this.configService.get<string>('DB_PASSWORD') || '',
      server: this.configService.get<string>('DB_HOST') || '127.0.0.1',
      database: this.configService.get<string>('DB_NAME') || 'DOAN_H',
      port: parseInt(this.configService.get<string>('DB_PORT') || '1433', 10),
      options: {
        encrypt: this.configService.get<string>('DB_ENCRYPT') === 'true',
        trustServerCertificate: this.configService.get<string>('DB_TRUST_SERVER_CERTIFICATE') === 'true',
      },
      connectionTimeout: 15000,
      requestTimeout: 30000,
      pool: {
        max: 10,
        min: 2,
        idleTimeoutMillis: 60000,
        acquireTimeoutMillis: 30000,
      },
    };

    const maxRetries = 5;
    const retryDelayMs = 5000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.logger.log(`Connecting to SQL Server (attempt ${attempt}/${maxRetries})...`);
        this.pool = await new sql.ConnectionPool(config).connect();
        this.logger.log('Connected to SQL Server successfully (Database: ' + config.database + ').');
        return; // Kết nối thành công, thoát vòng lặp
      } catch (err) {
        this.logger.warn(`Connection attempt ${attempt} failed: ${err.message}`);
        if (attempt === maxRetries) {
          this.logger.error('All connection attempts failed. Could not connect to SQL Server.');
          throw err;
        }
        this.logger.log(`Retrying in ${retryDelayMs / 1000}s...`);
        await new Promise(resolve => setTimeout(resolve, retryDelayMs));
      }
    }
  }

  async onModuleDestroy() {
    if (this.pool) {
      await this.pool.close();
      this.logger.log('SQL Server connection pool closed.');
    }
  }

  getPool(): sql.ConnectionPool {
    return this.pool;
  }

  /**
   * Thực thi câu lệnh SQL với các tham số đầu vào (Inputs)
   */
  async query(queryText: string, params?: { name: string; type: any; value: any }[]) {
    try {
      const request = this.pool.request();
      if (params) {
        params.forEach(p => {
          request.input(p.name, p.type, p.value);
        });
      }
      return await request.query(queryText);
    } catch (err) {
      this.logger.error(`Query execution failed: ${queryText}`, err);
      throw err;
    }
  }

  /**
   * Gọi Stored Procedure với các tham số đầu vào và đầu ra
   */
  async executeProcedure(
    procedureName: string,
    inputs?: { name: string; type: any; value: any }[],
    outputs?: { name: string; type: any }[]
  ) {
    try {
      const request = this.pool.request();
      if (inputs) {
        inputs.forEach(p => {
          request.input(p.name, p.type, p.value);
        });
      }
      if (outputs) {
        outputs.forEach(p => {
          request.output(p.name, p.type);
        });
      }
      return await request.execute(procedureName);
    } catch (err) {
      this.logger.error(`Stored Procedure execution failed: ${procedureName}`, err);
      throw err;
    }
  }
}
