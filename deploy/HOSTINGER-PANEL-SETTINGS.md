# Hostinger hPanel — Copy-Paste Settings

**Website:** paleturquoise-stork-447573.hostingersite.com  
**Mode:** Combined (API + Web on one Node.js app)

## Add Website → Node.js Web App → Import Git Repository

| Field | Value |
|-------|-------|
| Repository | `sheriweb/inventory-urdu` |
| Branch | `main` |
| Node.js version | **20** |
| Root directory | `.` |
| Install command | `npm ci` |
| Build command | `npm run hostinger:build` |
| Start command | `npm run hostinger:start` |

## Environment Variables (hPanel → Node.js → Environment)

Run locally to print: `bash scripts/print-hostinger-env.sh`

Required keys:
- `NODE_ENV=production`
- `DATABASE_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `JWT_ACCESS_EXPIRATION=15m`
- `JWT_REFRESH_EXPIRATION=7d`
- `API_PREFIX=api/v1`
- `CORS_ORIGINS` (your web URL)
- `SUPER_ADMIN_EMAIL`
- `SUPER_ADMIN_PASSWORD`
- `SUPER_ADMIN_NAME`
- `NEXT_PUBLIC_API_URL` (same domain + `/api/v1`)
- `HOSTINGER_COMBINED=1`
- `INTERNAL_API_URL=http://127.0.0.1:4001`
- `API_INTERNAL_PORT=4001`

## After first deploy

Database tables (SSH or Hostinger terminal if available):
```bash
npm run hostinger:db:push
npm run hostinger:db:seed
```

Or run from your Mac with remote MySQL if Hostinger allows remote DB access.

## Login after live

- URL: https://paleturquoise-stork-447573.hostingersite.com/login
- Super admin: see `deploy/secrets.env` → `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD`
