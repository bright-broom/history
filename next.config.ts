import type { NextConfig } from "next";

/**
 * セキュリティヘッダー設定
 * OWASP推奨のHTTPセキュリティヘッダーを設定
 */
const securityHeaders = [
  {
    // クリックジャッキング防止
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    // MIMEスニッフィング防止
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    // XSSフィルター有効化（レガシーブラウザ向け）
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
  {
    // リファラー情報の制御
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    // DNS プリフェッチ制御
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
  {
    // HTTPS強制（本番環境用）
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains',
  },
  {
    // パーミッションポリシー（機能制限）
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
  {
    // Content Security Policy
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Next.js requires unsafe-inline/eval
      "style-src 'self' 'unsafe-inline'", // Tailwind requires unsafe-inline
      "img-src 'self' data: blob:",
      "font-src 'self'",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests",
    ].join('; '),
  },
];

const nextConfig: NextConfig = {
  outputFileTracingIncludes: { '/*': ['./src/data/**/*.yaml'] },
  // セキュリティヘッダーを全ルートに適用
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },

  // 本番環境での最適化
  poweredByHeader: false, // X-Powered-By ヘッダーを無効化

  // 厳格なモード
  reactStrictMode: true,

  // 型付きルートの有効化
  typedRoutes: true,
};

export default nextConfig;
