/**
 * セキュリティユーティリティ
 * 入力検証・サニタイズ・エスケープ処理
 * @module infrastructure/security
 */

/**
 * 文字列が安全かどうかチェック
 * 制御文字やnullバイトを検出
 */
export function isSafeString(value: unknown): value is string {
  if (typeof value !== 'string') return false;

  // Nullバイト検出
  if (value.includes('\0')) return false;

  // 制御文字検出（改行・タブ以外）
  const controlCharRegex = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/;
  if (controlCharRegex.test(value)) return false;

  return true;
}

/**
 * 文字列をサニタイズ
 * 危険な文字を除去
 */
export function sanitizeString(value: unknown, maxLength = 10000): string {
  if (typeof value !== 'string') return '';

  return value
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // 制御文字除去
    .slice(0, maxLength) // 長さ制限
    .trim();
}

/**
 * 配列が安全な文字列配列かチェック
 */
export function isSafeStringArray(value: unknown): value is string[] {
  if (!Array.isArray(value)) return false;
  return value.every(isSafeString);
}

/**
 * 文字列配列をサニタイズ
 */
export function sanitizeStringArray(value: unknown, maxItems = 100): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .slice(0, maxItems)
    .filter((item): item is string => typeof item === 'string')
    .map((item) => sanitizeString(item));
}

/**
 * オブジェクトかどうかチェック
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * 安全なオブジェクト配列かチェック
 */
export function isRecordArray(value: unknown): value is Record<string, unknown>[] {
  if (!Array.isArray(value)) return false;
  return value.every(isRecord);
}

/**
 * HTMLエスケープ（XSS防止）
 * Reactは自動エスケープするが、念のため用意
 */
export function escapeHtml(value: string): string {
  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };

  return value.replace(/[&<>"'/]/g, (char) => htmlEscapes[char] ?? char);
}

/**
 * パストラバーサル攻撃を検出
 */
export function hasPathTraversal(value: string): boolean {
  const dangerousPatterns = [
    /\.\./,           // 親ディレクトリ参照
    /^[/\\]/,         // 絶対パス
    /[/\\]$/,         // 末尾スラッシュ
    /%2e%2e/i,        // URLエンコードされた..
    /%252e%252e/i,    // ダブルエンコードされた..
    /\0/,             // Nullバイト
  ];

  return dangerousPatterns.some((pattern) => pattern.test(value));
}

/**
 * 安全なファイル名かチェック
 */
export function isSafeFilename(value: string): boolean {
  if (!isSafeString(value)) return false;
  if (hasPathTraversal(value)) return false;

  // 許可された文字のみ（英数字、ハイフン、アンダースコア、ドット）
  const safeFilenameRegex = /^[a-zA-Z0-9_\-\.]+$/;
  return safeFilenameRegex.test(value);
}

/**
 * 入力値を数値に安全に変換
 */
export function toSafeInteger(value: unknown, min?: number, max?: number): number | null {
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || !Number.isInteger(value)) return null;
  } else if (typeof value === 'string') {
    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) return null;
    value = parsed;
  } else {
    return null;
  }

  const num = value as number;
  if (min !== undefined && num < min) return null;
  if (max !== undefined && num > max) return null;

  return num;
}

/**
 * レート制限用のシンプルなメモリストア
 * 本番環境ではRedis等を使用することを推奨
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * レート制限チェック
 */
export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetTime) {
    // 新しいウィンドウ開始
    const resetTime = now + windowMs;
    rateLimitStore.set(key, { count: 1, resetTime });
    return { allowed: true, remaining: maxRequests - 1, resetTime };
  }

  if (entry.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetTime: entry.resetTime };
  }

  entry.count++;
  return { allowed: true, remaining: maxRequests - entry.count, resetTime: entry.resetTime };
}

/**
 * CSRFトークン生成（将来のフォーム対応用）
 */
export function generateCsrfToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * 安全な比較（タイミング攻撃対策）
 */
export function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

const security = {
  isSafeString,
  sanitizeString,
  isSafeStringArray,
  sanitizeStringArray,
  isRecord,
  isRecordArray,
  escapeHtml,
  hasPathTraversal,
  isSafeFilename,
  toSafeInteger,
  checkRateLimit,
  generateCsrfToken,
  safeCompare,
};

export default security;
