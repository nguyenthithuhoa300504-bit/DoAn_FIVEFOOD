import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
// Force restart 2
import { Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Cho phép CORS để Frontend kết nối
  app.enableCors();

  // Thiết lập prefix mặc định là /api cho tất cả endpoints
  app.setGlobalPrefix('api');

  // Cấu hình Swagger API Documentation
  const config = new DocumentBuilder()
    .setTitle('FIVEFOOD API')
    .setDescription('Tài liệu API phân hệ Backend của dự án FIVEFOOD')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  logger.log(`Application is running on: http://localhost:${port}/api`);
  logger.log(
    `Swagger Documentation is running on: http://localhost:${port}/api/docs`,
  );
}
bootstrap();
