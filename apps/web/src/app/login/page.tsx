'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Boxes } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchMe, login } from '@/lib/auth';
import { hasStoredSession } from '@/lib/api';
import { defaultPathAfterLogin } from '@/lib/roles';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDemoHints, setShowDemoHints] = useState(false);

  useEffect(() => {
    setShowDemoHints(true);
    if (!hasStoredSession()) return;
    fetchMe(true).then((user) => {
      if (user) {
        router.replace(defaultPathAfterLogin(user));
      }
    });
  }, [router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const user = await login(email, password);
      router.push(defaultPathAfterLogin(user));
    } catch {
      setError('ای میل یا پاس ورڈ درست نہیں ہے');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      <div className="relative hidden flex-1 flex-col justify-between bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 p-12 text-white lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/20">
            <Boxes className="h-6 w-6 text-emerald-400" />
          </div>
          <span className="text-xl font-semibold">انوینٹری اردو</span>
        </div>
        <div className="max-w-md space-y-4">
          <h1 className="text-3xl font-bold leading-snug">قسط اور انوینٹری کا جدید نظام</h1>
          <p className="text-slate-300 leading-relaxed">
            گاہک، کھاتے، عملہ اور رپورٹس — سب ایک پیشہ ورانہ پینل میں۔
          </p>
        </div>
        <p className="text-sm text-slate-500">© انوینٹری اردو</p>
      </div>

      <main className="flex flex-1 items-center justify-center bg-slate-50 p-6">
        <Card className="w-full max-w-md border-slate-200 shadow-md">
          <CardHeader className="space-y-2 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 lg:hidden">
              <Boxes className="h-6 w-6 text-emerald-700" />
            </div>
            <CardTitle className="text-2xl">داخل ہوں</CardTitle>
            <p className="text-sm text-slate-500">ای میل اور پاس ورڈ سے — role کے مطابق ڈیش بورڈ کھلے گا</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">ای میل</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  dir="ltr"
                  className="text-left"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">پاس ورڈ</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  dir="ltr"
                  className="text-left"
                />
              </div>
              {error ? <p className="text-sm text-red-600">{error}</p> : null}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'براہ کرم انتظار کریں...' : 'داخل ہوں'}
              </Button>
            </form>
            {showDemoHints ? (
              <p className="mt-4 rounded-lg border border-emerald-100 bg-emerald-50/80 p-3 text-center text-sm text-slate-600" dir="ltr">
                <span className="block">Shop 1: shop1@inventory.local / Shop1Demo!</span>
                <span className="block">Shop 2: shop2@inventory.local / Shop2Demo!</span>
              </p>
            ) : null}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
