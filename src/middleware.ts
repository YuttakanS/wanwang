import { NextRequest, NextResponse } from 'next/server';

function originOf(url: string | undefined): string {
  try {
    return url ? new URL(url).origin : '';
  } catch {
    return '';
  }
}

const storageOrigin = originOf(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL);

function buildCsp(nonce: string): string {
  const isDev = process.env.NODE_ENV !== 'production';

  return [
    "default-src 'self'",
    // Inline scripts need the nonce; files load only from this origin. No 'strict-dynamic':
    // it would let a trusted script create inline or external scripts, and nothing here needs that.
    // Webpack's dev bundles need eval.
    `script-src 'self' 'nonce-${nonce}'${isDev ? " 'unsafe-eval'" : ''}`,
    // Next's own pages and React style attributes need inline styles.
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self'",
    "img-src 'self' data:",
    // Attached files are sent straight to Supabase Storage: Vercel caps request bodies at 4.5 MB.
    `connect-src 'self'${storageOrigin ? ` ${storageOrigin}` : ''}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isDev ? [] : ['upgrade-insecure-requests']),
  ].join('; ');
}

export function middleware(req: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const csp = buildCsp(nonce);

  // Next reads the nonce from this request header and adds it to its own scripts.
  const headers = new Headers(req.headers);
  headers.set('content-security-policy', csp);

  const res = NextResponse.next({ request: { headers } });
  res.headers.set('Content-Security-Policy', csp);
  return res;
}

export const config = {
  matcher: [
    {
      source: '/((?!api|_next/static|_next/image|favicon.ico).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
