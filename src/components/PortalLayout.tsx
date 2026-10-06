import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import type { Role } from '@/types';
import Navbar from './Navbar';
export default async function PortalLayout({ children, roles }: { children: React.ReactNode; roles: Role[] }) {
  const user = await requireUser().catch(()=>null); if(!user) redirect('/login');
  if(!roles.includes(user.role)) redirect(`/${user.role.toLowerCase()}`);
  return <><Navbar user={user}/><main className="mx-auto w-full max-w-7xl flex-1 px-5 py-8 lg:px-8 lg:py-10">{children}</main><footer className="mx-auto flex w-full max-w-7xl flex-wrap justify-between gap-2 border-t border-border px-5 py-5 text-[11px] text-muted-foreground"><span>ARU Event Pass · มหาวิทยาลัยราชภัฏพระนครศรีอยุธยา</span><span>ออกแบบและพัฒนาโดย จิรายุทธ บุตรชานนท์</span></footer></>;
}
