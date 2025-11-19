import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { configSchema } from './config/config.schema';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (config) => configSchema.parse(config),
    }),
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
