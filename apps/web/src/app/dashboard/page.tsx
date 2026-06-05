import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import {
  MapPin,
  Users,
  Building2,
  Package,
  UserCircle,
  CreditCard,
  Wallet,
  Warehouse,
  Truck,
  BookOpen,
  ListOrdered,
  AlertTriangle,
  Settings,
  PieChart,
  Receipt,
  TrendingUp,
  Percent,
  Banknote,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { DashboardOverview } from '@/components/dashboard/dashboard-overview';
import { cn } from '@/lib/utils';

type DashboardCard = {
  label: string;
  href: string;
  icon: LucideIcon;
  desc: string;
  accent?: 'brand' | 'slate';
};

const DAILY_LINKS: DashboardCard[] = [
  { label: 'گاہک', href: '/dashboard/customers', icon: UserCircle, desc: 'گاہک اور ضمانتی شامل / تلاش' },
  { label: 'کھاتے', href: '/dashboard/accounts', icon: CreditCard, desc: 'قسطی کھاتے، فلٹر اور نیا کھاتہ' },
  { label: 'وصولی', href: '/dashboard/recovery', icon: Wallet, desc: 'ریکوری لسٹ، قسط وصولی، ادائیگیاں' },
  { label: 'قسطیں', href: '/dashboard/installments', icon: ListOrdered, desc: 'شارٹ لسٹ اور شیڈول اپڈیٹ' },
  { label: 'اسٹاک', href: '/dashboard/stock', icon: Warehouse, desc: 'گودام اسٹاک دیکھیں اور شامل کریں' },
  { label: 'لوڈنگ', href: '/dashboard/load-mgmt', icon: Truck, desc: 'سیلزمین لوڈ، ان لوڈ اور اسٹاک' },
  { label: 'روزنامچہ', href: '/dashboard/roznamcha', icon: BookOpen, desc: 'روزانہ خرچہ، وصولی اور رجسٹر' },
  { label: 'کلیم', href: '/dashboard/claims', icon: AlertTriangle, desc: 'کلیم درج کریں اور ریکارڈ دیکھیں' },
];

const REPORT_LINKS: DashboardCard[] = [
  { label: 'شارٹ بیلنس', href: '/dashboard/reports/short-balance', icon: PieChart, desc: 'بقایا اور شارٹ بیلنس کا خلاصہ' },
  { label: 'ریکوری تفصیل', href: '/dashboard/reports/recovery-detail', icon: Receipt, desc: 'وصولیوں کی تفصیلی رپورٹ' },
  { label: 'ریکوری مین', href: '/dashboard/reports/recovery-man', icon: Users, desc: 'ہر ریکوری مین کی کارکردگی' },
  { label: 'شارٹ لسٹ', href: '/dashboard/reports/short-list', icon: ListOrdered, desc: 'مقررہ قسط سے کم ادائیگی' },
  { label: 'سیل رپورٹ', href: '/dashboard/reports/sales', icon: TrendingUp, desc: 'مدت کے حساب سے فروخت' },
  { label: 'بل منافع', href: '/dashboard/reports/bill-profit', icon: Percent, desc: 'کھاتوں کا منافع' },
  { label: 'ایڈوانس تفصیل', href: '/dashboard/reports/advance', icon: Banknote, desc: 'ایڈوانس وصولیوں کی تفصیل' },
];

const SETUP_LINKS: DashboardCard[] = [
  { label: 'علاقے', href: '/dashboard/areas', icon: MapPin, desc: 'علاقے اور شہر', accent: 'slate' },
  { label: 'عملہ', href: '/dashboard/staff', icon: Users, desc: 'سیلز مین، ریکوری مین', accent: 'slate' },
  { label: 'کمپنیاں', href: '/dashboard/companies', icon: Building2, desc: 'مصنوعات کی کمپنیاں', accent: 'slate' },
  { label: 'آئٹمز', href: '/dashboard/items', icon: Package, desc: 'آئٹم انٹری اور ریٹ', accent: 'slate' },
  { label: 'دکان کی ترتیبات', href: '/dashboard/settings', icon: Settings, desc: 'نام، لوگو، پتہ اور رابطہ', accent: 'slate' },
];

function DashboardActionCard({ label, href, icon: Icon, desc, accent = 'brand' }: DashboardCard) {
  const iconClass =
    accent === 'brand'
      ? 'bg-[rgba(var(--shop-brand-rgb),0.1)] text-[var(--shop-brand)] ring-[rgba(var(--shop-brand-rgb),0.18)]'
      : 'bg-slate-100 text-slate-600 ring-slate-200';

  return (
    <Link href={href} className="group block h-full">
      <Card className="h-full overflow-visible transition hover:border-[rgba(var(--shop-brand-rgb),0.35)] hover:shadow-md group-hover:shadow-md">
        <CardContent className="flex min-h-[5.75rem] flex-col gap-2 p-3.5 sm:min-h-[6rem]">
          <div className="flex items-start gap-2.5">
            <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1 transition group-hover:scale-105', iconClass)}>
              <Icon className="h-4 w-4" />
            </div>
            <p className="min-w-0 flex-1 text-sm font-semibold leading-7 text-slate-900">{label}</p>
          </div>
          <p className="text-xs leading-6 text-slate-500">{desc}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <DashboardOverview />

      <section>
        <h2 className="mb-1 text-sm font-semibold text-slate-600">روزمرہ کام</h2>
        <p className="mb-3 text-xs text-slate-500">سب سے زیادہ استعمال ہونے والے صفحات</p>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {DAILY_LINKS.map((link) => (
            <DashboardActionCard key={link.href} {...link} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-1 text-sm font-semibold text-slate-600">رپورٹس</h2>
        <p className="mb-3 text-xs text-slate-500">وصولی، فروخت اور بیلنس کی رپورٹس</p>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {REPORT_LINKS.map((link) => (
            <DashboardActionCard key={link.href} {...link} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-1 text-sm font-semibold text-slate-600">سیٹ اپ</h2>
        <p className="mb-3 text-xs text-slate-500">دکان، عملہ اور بنیادی ڈیٹا</p>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {SETUP_LINKS.map((link) => (
            <DashboardActionCard key={link.href} {...link} accent="slate" />
          ))}
        </div>
      </section>
    </div>
  );
}
