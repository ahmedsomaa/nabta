import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { ResponseTransformInterceptor } from './common/interceptors/response-transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  app.enableCors({
    origin: [
      process.env.WEB_URL ?? 'http://localhost:5173',
      process.env.MARKETING_URL ?? 'http://localhost:5174',
      process.env.SYSTEM_ADMIN_URL ?? 'http://localhost:5175',
    ],
    credentials: true,
  });
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new ResponseTransformInterceptor());
  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Nabta API listening on http://localhost:${port}/api/v1`);
}

bootstrap();
