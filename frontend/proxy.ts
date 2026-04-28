import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { TOKEN_KEY } from './lib/constants';

export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const publicPaths = ['/login', '/signup'];
  const privatePaths = ['/', '/projects', '/projects/:id', '/project-invitations', '/settings'];
  const isPublicPath = publicPaths.includes(path);
  const isPrivatePath = privatePaths.includes(path);

  const token = request.cookies.get(TOKEN_KEY)?.value || '';

  if (isPrivatePath && token) return NextResponse.next();

  if (isPublicPath && token) return NextResponse.redirect(new URL('/', request.nextUrl));

  if (!isPublicPath && !token) return NextResponse.redirect(new URL('/login', request.nextUrl));
}

export const config = {
  matcher: ['/', '/login', '/signup', '/projects', '/projects/:id', '/project-invitations', '/settings'],
};
