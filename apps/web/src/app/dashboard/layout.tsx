import { AppShell } from '@/components/layout/app-shell';
import { ToastProvider } from '@/components/ui/toast';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      {children}
      <ToastProvider />
    </AppShell>
  );
}
