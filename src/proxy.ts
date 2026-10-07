import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const path = request.nextUrl.pathname;
  // API handlers verify the current Auth user and role themselves. Do not repeat
  // both remote lookups here for every read, scan and projector tick.
  if (path.startsWith('/api/')) {
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return path === '/login' ? response : NextResponse.redirect(new URL('/login', request.url));
  }
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(items) {
        items.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        items.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  const { data: verified } = await supabase.auth.getClaims();
  const user = verified?.claims?.sub ? { id: verified.claims.sub } : null;
  const finish = (result: NextResponse) => { response.cookies.getAll().forEach(c => result.cookies.set(c)); result.headers.set('Cache-Control', 'private, no-store'); return result; };
  if (path.startsWith('/api/auth/')) return finish(response);
  if (!user) return finish(path.startsWith('/api/') ? NextResponse.json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 }) : path === '/login' ? response : NextResponse.redirect(new URL('/login', request.url)));
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (!profile) return finish(path.startsWith('/api/') ? NextResponse.json({ error: 'บัญชียังไม่มีสิทธิ์ใช้งาน' }, { status: 403 }) : path === '/login' ? response : NextResponse.redirect(new URL('/login?error=profile', request.url)));
  const home = `/${profile.role.toLowerCase()}`;
  const allowed = path.startsWith('/admin') || path.startsWith('/display') ? profile.role === 'ADMIN' : path.startsWith('/staff') ? ['STAFF', 'ADMIN'].includes(profile.role) : path.startsWith('/student') ? profile.role === 'STUDENT' : true;
  if (!allowed || path === '/login') return finish(NextResponse.redirect(new URL(home, request.url)));
  return finish(response);
}
export const config = { matcher: ['/login', '/admin/:path*', '/student/:path*', '/staff/:path*', '/display/:path*', '/api/:path*'] };
