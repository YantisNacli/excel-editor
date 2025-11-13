# Excel Editor (Next.js)

A small Next.js + TypeScript starter that lets you upload multiple Excel files, edit them in a data grid, and export edited files.

## Setup

```powershell
npm install
npm run dev
```

Open `http://localhost:3000`.

## Deploying (Vercel) + Persistent Storage (Supabase)

This project currently writes user names to a persistent database using Supabase. Follow these steps to deploy the app and keep names saved permanently:

1. Create a free Supabase project at https://app.supabase.com.
2. In Supabase SQL Editor run the following to create the table:

```sql
create table public.user_names (
	id bigserial primary key,
	name text not null,
	timestamp timestamptz default now()
);
```

3. In the Supabase project settings get the `URL` and a service role key (or a key with insert permissions). Keep this secret.
4. Deploy to Vercel and set environment variables in the Vercel project settings:
	 - `SUPABASE_URL` = your Supabase project URL
	 - `SUPABASE_SERVICE_ROLE_KEY` = the service role key (server-only)

5. Connect your GitHub repo to Vercel and deploy. The API route will write names to the `user_names` table.

Security note: Do not expose service role keys in client-side code. Keep them as server environment variables.

