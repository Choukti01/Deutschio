# Deutschio

One modern repository for the Deutschio learning product.

- `src/` — React + TypeScript learner web app
- `apps/api/` — Node.js, Express + TypeScript API

## Start locally

```powershell
npm install
Copy-Item apps/api/.env.example apps/api/.env
npm run dev
```

`npm run dev` starts the web app at `http://127.0.0.1:5173` and the API at
`http://127.0.0.1:3000`. Press `Ctrl+C` once to stop both.

## Production

- Netlify deploys the React app and the Node/Express API together from this
  repository using `netlify.toml`.
- `/api/*` is routed internally to the Netlify Function, so the web app and
  authenticated API share `www.ddeutschio.online`.

### Netlify production configuration

In Netlify, add these values with the **Functions** runtime scope. Do not commit
any secret to the repository:

```text
DATABASE_URL=<Supabase PostgreSQL connection string>
JWT_SECRET=<unique random value, at least 32 characters>
NODE_ENV=production
APP_URL=https://www.ddeutschio.online
WEB_URL=https://www.ddeutschio.online
CORS_ORIGINS=https://www.ddeutschio.online,https://ddeutschio.online
COOKIE_SECURE=true
COOKIE_SAME_SITE=lax
TRUST_PROXY=1
RESEND_API_KEY=<Resend API key>
EMAIL_FROM=Deutschio <noreply@ddeutschio.online>
```

For production signup verification, add `ddeutschio.online` in Resend, publish
the exact DNS records Resend provides in Spaceship, wait for verification, then
create a least-privilege sending API key. The API returns a clear retryable
error if delivery is unavailable; it never claims an email was sent when it was
not.

### Health check

After deployment, verify `https://www.ddeutschio.online/health`. The expected
response identifies the API and PostgreSQL connection without exposing any
secret.
