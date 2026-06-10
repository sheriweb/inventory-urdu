'use client';

import { useCallback, useEffect, useState } from 'react';

type ClientError = {
  id: string;
  at: string;
  type: string;
  level?: string;
  message: string;
  stack?: string;
  url?: string;
  userEmail?: string;
  source?: string;
};

const KEY_STORAGE = 'demo-monitor-key';

export default function DemoMonitorPage() {
  const [key, setKey] = useState('');
  const [inputKey, setInputKey] = useState('demo-monitor');
  const [errors, setErrors] = useState<ClientError[]>([]);
  const [status, setStatus] = useState('');

  useEffect(() => {
    const saved = sessionStorage.getItem(KEY_STORAGE);
    if (saved) setKey(saved);
  }, []);

  const load = useCallback(async (monitorKey: string) => {
    try {
      const res = await fetch(`/api/v1/monitoring/client-errors?key=${encodeURIComponent(monitorKey)}&limit=80`);
      if (!res.ok) {
        setStatus('Monitor key galat hai');
        return;
      }
      const json = await res.json();
      setErrors(json.data as ClientError[]);
      setStatus(`آخری اپڈیٹ: ${new Date().toLocaleTimeString('ur-PK')}`);
    } catch {
      setStatus('کنکشن نہیں — demo chal rahi hai?');
    }
  }, []);

  useEffect(() => {
    if (!key) return;
    void load(key);
    const id = setInterval(() => void load(key), 3000);
    return () => clearInterval(id);
  }, [key, load]);

  function unlock() {
    sessionStorage.setItem(KEY_STORAGE, inputKey);
    setKey(inputKey);
    setStatus('');
  }

  if (!key) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white" dir="ltr">
        <div className="w-full max-w-sm space-y-4 rounded-xl border border-slate-700 bg-slate-900 p-6">
          <h1 className="text-xl font-semibold">Client Error Monitor</h1>
          <p className="text-sm text-slate-400">Sirf aap ke liye — client ki errors yahan live aayengi.</p>
          <input
            className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm"
            value={inputKey}
            onChange={(e) => setInputKey(e.target.value)}
            placeholder="Monitor key"
          />
          <button
            type="button"
            onClick={unlock}
            className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500"
          >
            Open monitor
          </button>
          <p className="text-xs text-slate-500">Default key: demo-monitor</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-4 text-white" dir="ltr">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-semibold text-emerald-400">🔴 Live Client Errors</h1>
          <p className="text-sm text-slate-400">{status || 'Polling every 3s…'}</p>
        </div>
        <button
          type="button"
          onClick={() => void load(key)}
          className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm hover:bg-slate-800"
        >
          Refresh
        </button>
      </header>

      {errors.length === 0 ? (
        <p className="rounded-lg border border-slate-800 bg-slate-900 p-6 text-center text-slate-400">
          Abhi koi error nahi — client jab test karega yahan dikhega.
        </p>
      ) : (
        <ul className="space-y-3">
          {errors.map((err) => (
            <li key={err.id} className="rounded-lg border border-red-900/50 bg-slate-900 p-4">
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                <span className="rounded bg-red-950 px-2 py-0.5 text-red-300">{err.type}</span>
                <span>{new Date(err.at).toLocaleString('ur-PK')}</span>
                {err.userEmail ? <span className="text-emerald-400">{err.userEmail}</span> : null}
              </div>
              <p className="font-medium text-red-200">{err.message}</p>
              {err.url ? <p className="mt-1 truncate text-xs text-slate-500">{err.url}</p> : null}
              {err.source ? <p className="mt-1 text-xs text-slate-500">{err.source}</p> : null}
              {err.stack ? (
                <pre className="mt-2 max-h-32 overflow-auto rounded bg-black/40 p-2 text-xs text-slate-400">
                  {err.stack}
                </pre>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
