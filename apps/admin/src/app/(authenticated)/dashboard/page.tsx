import Link from 'next/link';
import { Store, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/layout/page-header';

export default function AdminDashboardPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Manage tenant shops and platform access from one place."
      />
      <Link href="/shops">
        <Card className="max-w-md transition hover:border-emerald-300 hover:shadow-md">
          <CardContent className="flex items-center justify-between p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                <Store className="h-6 w-6" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">Shops</p>
                <p className="text-sm text-slate-500">Create and activate shop tenants</p>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-slate-300" />
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}
