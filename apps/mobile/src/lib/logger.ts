import { trackEvent } from './posthog';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const formatMessage = (level: LogLevel, message: string) => 
  `[${level.toUpperCase()}] ${new Date().toISOString()} ${message}`;

const logger = {
  debug: (message: string, data?: Record<string, unknown>) => {
    if (__DEV__) {
      console.log(formatMessage('debug', message), data ?? '');
    }
  },
  
  info: (message: string, data?: Record<string, unknown>) => {
    if (__DEV__) {
      console.log(formatMessage('info', message), data ?? '');
    }
  },
  
  warn: (message: string, data?: Record<string, unknown>) => {
    console.warn(formatMessage('warn', message), data ?? '');
  },
  
  error: (message: string, error?: Error, data?: Record<string, unknown>) => {
    console.error(formatMessage('error', message), error ?? '', data ?? '');
    trackEvent('app_error', { message, stack: error?.stack ?? null, ...data });
  },
};

export default logger;
