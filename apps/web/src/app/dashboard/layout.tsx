import { AppShell } from '@/components/layout/app-shell';
import { ToastProvider } from '@/components/ui/toast';
import { RomanUrduProvider } from '@/lib/roman-urdu-settings';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      <RomanUrduProvider>
        {children}
        <ToastProvider />
      </RomanUrduProvider>
    </AppShell>
  );
}
