import type { NextConfig } from 'next';

const apiPort = process.env.API_INTERNAL_PORT || '4001';
// Browser always calls /api/v1 — proxy to Nest in dev and production.
const internalApi = process.env.INTERNAL_API_URL || `http://127.0.0.1:${apiPort}`;

const nextConfig: NextConfig = {
  transpilePackages: ['@inventory-urdu/shared'],
  allowedDevOrigins: ['*.trycloudflare.com'],
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  async rewrites() {
    if (!internalApi) return [];
    return [
      {
        source: '/api/v1/:path*',
        destination: `${internalApi}/api/v1/:path*`,
      },
    ];
  },
  async redirects() {
    return [
      { source: '/dashboard/stock/add', destination: '/dashboard/stock', permanent: false },
      { source: '/dashboard/stock/view', destination: '/dashboard/stock', permanent: false },
      { source: '/dashboard/stock/status', destination: '/dashboard/stock', permanent: false },
      { source: '/dashboard/claims/new', destination: '/dashboard/claims', permanent: false },
      { source: '/dashboard/recovery/list', destination: '/dashboard/recovery', permanent: false },
      { source: '/dashboard/recovery/collect', destination: '/dashboard/recovery', permanent: false },
      { source: '/dashboard/recovery/advance', destination: '/dashboard/recovery', permanent: false },
      { source: '/dashboard/recovery/payments', destination: '/dashboard/recovery', permanent: false },
      { source: '/dashboard/load-mgmt/assign', destination: '/dashboard/load-mgmt', permanent: false },
      { source: '/dashboard/load-mgmt/unload', destination: '/dashboard/load-mgmt', permanent: false },
      { source: '/dashboard/load-mgmt/inventory', destination: '/dashboard/load-mgmt', permanent: false },
      { source: '/dashboard/installments/short', destination: '/dashboard/installments', permanent: false },
      { source: '/dashboard/schedules/edit', destination: '/dashboard/installments', permanent: false },
      { source: '/dashboard/roznamcha/entry', destination: '/dashboard/roznamcha', permanent: false },
      { source: '/dashboard/leases', destination: '/dashboard/accounts', permanent: false },
    ];
  },
};

export default nextConfig;
