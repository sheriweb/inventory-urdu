import type { Metadata } from 'next';
import { Noto_Nastaliq_Urdu } from 'next/font/google';
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
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ur" dir="rtl" className={notoNastaliq.variable} suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
