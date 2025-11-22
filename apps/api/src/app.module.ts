import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { configSchema } from './config/config.schema';
import { PrismaModule } from './prisma/prisma.module';
import { TwilioModule } from './twilio/twilio.module';
import { CallsModule } from './calls/calls.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (config) => configSchema.parse(config),
    }),
    PrismaModule,
    TwilioModule,
    CallsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
