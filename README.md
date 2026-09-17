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
- Railway starts the API from this repository using `railway.toml`.

Configure API secrets and database connection strings in Railway; never commit
them to this repository.
