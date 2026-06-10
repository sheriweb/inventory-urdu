import type { Metadata } from 'next';
import { Noto_Nastaliq_Urdu } from 'next/font/google';
import { ClientErrorReporter } from '@/components/client-error-reporter';
import './globals.css';

const notoNastaliq = Noto_Nastaliq_Urdu({
  subsets: ['arabic'],
  variable: '--font-noto-nastaliq',
  weight: ['400'],
  display: 'swap',
  preload: true,
});

export const metadata: Metadata = {
  title: 'انوینٹری اردو',
  description: 'قسطوں پر انوینٹری مینجمنٹ',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: 'انوینٹری اردو',
    statusBarStyle: 'default',
  },
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
};

export const viewport = {
  themeColor: '#059669',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ur" dir="rtl" className={notoNastaliq.variable} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ClientErrorReporter />
        {children}
      </body>
    </html>
  );
}
