import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { configSchema } from './config/config.schema';
import { PrismaModule } from './prisma/prisma.module';
import { TwilioModule } from './twilio/twilio.module';
import { CallsModule } from './calls/calls.module';
import { VoiceModule } from './voice/voice.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (config) => configSchema.parse(config),
    }),
    PrismaModule,
    TwilioModule,
    CallsModule,
    VoiceModule, // CallOS Voice System
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
