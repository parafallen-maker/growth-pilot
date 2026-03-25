import type { ReactNode } from 'react';
import { AppShell } from '@/components/business/app-shell';
import { getCurrentUser } from '@/lib/current-user';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const currentUser = await getCurrentUser();
  return <AppShell currentUser={currentUser}>{children}</AppShell>;
}
