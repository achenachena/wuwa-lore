export const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  "X-DNS-Prefetch-Control": "off",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-site",
  "Content-Security-Policy": [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://static.wikia.nocookie.net",
    "font-src 'self'",
    "connect-src 'self'",
    "upgrade-insecure-requests",
  ].join("; "),
};

export function productionSecurityHeaders(): Record<string, string> {
  if (!isProduction()) {
    return SECURITY_HEADERS;
  }
  return {
    ...SECURITY_HEADERS,
    "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  };
}

const PROBE_PATH =
  /^\/(?:\.env|\.git|wp-admin|wp-login|phpmyadmin|administrator|server-status|actuator|\.well-known\/security\.txt)(?:\/|$)/i;

export function isProbePath(pathname: string): boolean {
  return PROBE_PATH.test(pathname);
}

export function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host) {
    return true;
  }
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export function applySecurityHeaders(response: Response): void {
  for (const [key, value] of Object.entries(productionSecurityHeaders())) {
    response.headers.set(key, value);
  }
  response.headers.delete("x-powered-by");
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}
