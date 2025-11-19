import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3001); // Running on 3001 to avoid conflict with Next.js on 3000
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
