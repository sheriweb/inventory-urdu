import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/** After deploy, Hostinger CDN must not serve stale HTML pointing at deleted JS chunks. */
export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  response.headers.set('CDN-Cache-Control', 'no-store');
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon.svg|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|js|css)$).*)',
  ],
};
