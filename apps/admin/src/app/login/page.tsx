'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { login } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email, password);
      router.push('/shops');
    } catch {
      setError('Invalid credentials or not a super admin');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      <div className="relative hidden flex-1 flex-col justify-between bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 p-12 text-white lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/20">
            <Shield className="h-6 w-6 text-emerald-400" />
          </div>
          <span className="text-xl font-semibold">Inventory Urdu Admin</span>
        </div>
        <div className="max-w-md space-y-4">
          <h1 className="text-3xl font-bold leading-snug">Super admin control panel</h1>
          <p className="leading-relaxed text-slate-300">Provision shops, manage tenants, and keep the platform running smoothly.</p>
        </div>
        <p className="text-sm text-slate-500">Platform administration</p>
      </div>

      <main className="flex flex-1 items-center justify-center bg-slate-50 p-6">
        <Card className="w-full max-w-md border-slate-200 shadow-md">
          <CardHeader className="space-y-2 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 lg:hidden">
              <Shield className="h-6 w-6 text-emerald-700" />
            </div>
            <CardTitle className="text-2xl">Sign in</CardTitle>
            <p className="text-sm text-slate-500">Super admin credentials only</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Email</label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Password</label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              {error ? <p className="text-sm text-red-600">{error}</p> : null}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
