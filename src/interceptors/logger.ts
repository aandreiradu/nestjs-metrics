import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';

interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
  };
}

@Injectable()
export class LoggerInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggerInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (context.getType() === 'http') {
      return this.logHttpCall(context, next);
    }
  }

  private logHttpCall(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const userAgent = request.get('user-agent') || '';
    const { ip, method, path: url } = request;
    const CID = uuidv4();
    const userId = request?.user?.userId;

    this.logger.log(
      `[${CID}] ${method} ${url} ${userId} ${userAgent} ${ip}: ${
        context.getClass().name
      } ${context.getHandler().name}`,
    );

    const now = Date.now();
    return next.handle().pipe(
      tap(() => {
        const response = context.switchToHttp().getResponse<Response>();
        const { statusCode } = response;
        const contentLength = response.get('content-length');
        this.logger.log(
          `[${CID}] ${method} ${url} ${statusCode} ${contentLength}: ${
            Date.now() - now
          }ms`,
        );
      }),
    );
  }
}
