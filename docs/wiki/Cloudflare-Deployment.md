# Cloudflare Full-Stack Deployment Guide

AeroSphere 360 can run either as a **100% static web app** (GitHub Pages / Vercel / Netlify) or as a **high-scalability serverless platform** powered by Cloudflare.

---

## Architecture Stack on Cloudflare
- **Hosting:** Cloudflare Pages (Global edge CDN)
- **API Backend:** Cloudflare Pages Functions (`functions/api/`)
- **Database:** Cloudflare D1 (Serverless SQLite at the edge)
- **Media Storage:** Cloudflare R2 (S3-compatible zero-egress object storage)

---

## Step-by-Step Setup

### 1. Create Cloudflare D1 Database
Install the Wrangler CLI if you haven't already:
```bash
npm install -g wrangler
wrangler login
```

Create a new D1 database:
```bash
wrangler d1 create aerosphere-db
```
Note the database ID printed in the console.

### 2. Apply Schema & Seed Data
Execute the master schema to create all tables (panoramas, views, shares, comments):
```bash
wrangler d1 execute aerosphere-db --file=schema.sql
```

Insert the 5 sample public panoramas:
```bash
wrangler d1 execute aerosphere-db --file=d1_seed_sample.sql
```

### 3. Bind D1 to Cloudflare Pages
In your `wrangler.toml` or Cloudflare Pages dashboard:
```toml
[[d1_databases]]
binding = "DB"
database_name = "aerosphere-db"
database_id = "<your-d1-database-id>"
```

### 4. Deploy Frontend
Build and publish:
```bash
cd frontend
npm run build
wrangler pages deploy dist --project-name=aerosphere-360
```
