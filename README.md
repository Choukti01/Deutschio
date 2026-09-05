# DDeutschio

One modern repository for the Deutschio learning product.

- `src/` — React + TypeScript learner web app
- `apps/api/` — Node.js, Express + TypeScript API

## Start locally

```powershell
pnpm install
Copy-Item apps/api/.env.example apps/api/.env
pnpm dev:all
```

The web app runs at `http://127.0.0.1:5173` and proxies `/api` to the API at
`http://127.0.0.1:3000`.

## Production

- Netlify builds the React app from this repository using `netlify.toml`.
- Railway starts the API from this repository using `railway.toml`.

Configure API secrets and database connection strings in Railway; never commit
them to this repository.
