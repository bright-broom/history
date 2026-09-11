/**
 * セキュアロギングユーティリティ
 * 環境に応じたログ出力と情報漏洩防止
 * @module infrastructure/logger
 */

/** ログレベル */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/** ログレベルの優先度 */
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/** 現在の環境 */
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

/** 最小ログレベル（本番では warn 以上のみ） */
const MIN_LOG_LEVEL: LogLevel = IS_PRODUCTION ? 'warn' : 'debug';

/**
 * エラーオブジェクトをサニタイズ
 * 本番環境では詳細情報を隠蔽
 */
function sanitizeError(error: unknown): Record<string, unknown> {
  if (!(error instanceof Error)) {
    return { message: 'Unknown error' };
  }

  if (IS_PRODUCTION) {
    // 本番環境: 最小限の情報のみ
    return {
      name: error.name,
      message: error.message.replace(/\/[^\s]+/g, '[PATH_HIDDEN]'), // ファイルパスを隠蔽
    };
  }

  // 開発環境: 詳細情報を含める
  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
  };
}

/**
 * ログメッセージをサニタイズ
 */
function sanitizeMessage(message: string): string {
  if (!IS_PRODUCTION) return message;

  return message
    .replace(/\/[^\s:]+/g, '[PATH]') // ファイルパスを隠蔽
    .replace(/\b\d{4}-\d{2}-\d{2}\b/g, '[DATE]') // 日付パターンは維持（年号なので）
    .replace(/password[=:]\S+/gi, 'password=[REDACTED]')
    .replace(/token[=:]\S+/gi, 'token=[REDACTED]')
    .replace(/key[=:]\S+/gi, 'key=[REDACTED]')
    .replace(/secret[=:]\S+/gi, 'secret=[REDACTED]');
}

/**
 * ログ出力可能かチェック
 */
function shouldLog(level: LogLevel): boolean {
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[MIN_LOG_LEVEL];
}

/**
 * タイムスタンプ生成
 */
function getTimestamp(): string {
  return new Date().toISOString();
}

/**
 * 構造化ログ出力
 */
function formatLog(
  level: LogLevel,
  message: string,
  context?: Record<string, unknown>
): void {
  if (!shouldLog(level)) return;

  const sanitizedMessage = sanitizeMessage(message);
  const logEntry = {
    timestamp: getTimestamp(),
    level,
    message: sanitizedMessage,
    ...(context && { context }),
  };

  // 本番環境ではJSON形式で出力（ログ収集ツール向け）
  if (IS_PRODUCTION) {
    const logString = JSON.stringify(logEntry);
    switch (level) {
      case 'error':
        console.error(logString);
        break;
      case 'warn':
        console.warn(logString);
        break;
      default:
        console.log(logString);
    }
    return;
  }

  // 開発環境では読みやすい形式で出力
  const prefix = `[${logEntry.timestamp}] [${level.toUpperCase()}]`;
  switch (level) {
    case 'error':
      console.error(prefix, sanitizedMessage, context ?? '');
      break;
    case 'warn':
      console.warn(prefix, sanitizedMessage, context ?? '');
      break;
    case 'info':
      console.info(prefix, sanitizedMessage, context ?? '');
      break;
    default:
      console.log(prefix, sanitizedMessage, context ?? '');
  }
}

/**
 * セキュアロガー
 */
export const logger = {
  /**
   * デバッグログ（開発環境のみ）
   */
  debug(message: string, context?: Record<string, unknown>): void {
    formatLog('debug', message, context);
  },

  /**
   * 情報ログ
   */
  info(message: string, context?: Record<string, unknown>): void {
    formatLog('info', message, context);
  },

  /**
   * 警告ログ
   */
  warn(message: string, context?: Record<string, unknown>): void {
    formatLog('warn', message, context);
  },

  /**
   * エラーログ
   */
  error(message: string, error?: unknown, context?: Record<string, unknown>): void {
    const errorContext = error ? { error: sanitizeError(error), ...context } : context;
    formatLog('error', message, errorContext);
  },

  /**
   * セキュリティイベントログ（常に出力）
   */
  security(message: string, context?: Record<string, unknown>): void {
    const securityContext = {
      ...context,
      securityEvent: true,
      timestamp: getTimestamp(),
    };
    console.warn(`[SECURITY] ${message}`, IS_PRODUCTION ? JSON.stringify(securityContext) : securityContext);
  },
};

export default logger;
