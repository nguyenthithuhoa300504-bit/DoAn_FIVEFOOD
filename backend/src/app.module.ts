import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ProductsModule } from './products/products.module';
import { CartModule } from './cart/cart.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentModule } from './payment/payment.module';
import { GatewayModule } from './gateway/gateway.module';
import { ChatbotModule } from './chatbot/chatbot.module';
import { RecommendationsModule } from './recommendations/recommendations.module';
import { FavoritesModule } from './favorites/favorites.module';
import { ReviewsModule } from './reviews/reviews.module';
import { ChatModule } from './chat/chat.module';
import { UserActionsModule } from './user-actions/user-actions.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Cho phép sử dụng ConfigService ở mọi nơi mà không cần import ConfigModule lại
    }),
    DatabaseModule,
    UsersModule,
    AuthModule,
    ProductsModule,
    CartModule,
    OrdersModule,
    PaymentModule,
    GatewayModule,
    ChatbotModule,
    RecommendationsModule,
    FavoritesModule,
    ReviewsModule,
    ChatModule,
    UserActionsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
