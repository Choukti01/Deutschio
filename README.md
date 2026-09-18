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

- Netlify builds the React app from this repository using `netlify.toml`.
- Render builds and starts the API from this repository using `render.yaml`.

### Render API

Create a Render Web Service from this repository's `main` branch. The included
`render.yaml` supplies the build command, start command, health check, and safe
production defaults. Add the remaining values in Render's Environment page:

```text
DATABASE_URL=<Supabase PostgreSQL connection string>
JWT_SECRET=<unique random value, at least 32 characters>
APP_URL=https://api.ddeutschio.online
WEB_URL=https://www.ddeutschio.online
CORS_ORIGINS=https://www.ddeutschio.online,https://ddeutschio.online
RESEND_API_KEY=<Resend API key>
EMAIL_FROM=<verified Deutschio sending address>
```

Set `api.ddeutschio.online` as the Render service's custom domain. Do not
commit secrets or connection strings to this repository.

### Netlify web app

Set the following Netlify build environment variable, then redeploy the site:

```text
VITE_API_URL=https://api.ddeutschio.online/api/v1
```

Use `www.ddeutschio.online` as the primary web domain and redirect
`ddeutschio.online` to it.
