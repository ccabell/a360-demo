# Deploy Source — a360-demo

**Platform:** GitHub Pages  
**Repo:** ccabell/a360-demo  
**Canonical URL:** https://ccabell.github.io/a360-demo  
**This directory:** C:\Projects\a360_demo  

## What this deploys

Static buyer-facing prototype for Boulevard/PE demos. Content is curated static HTML — no live Supabase connection.

## Deploy command

```powershell
# GitHub Pages deploys automatically from the main branch
git push origin main
```

## ⚠️ Rules

- Static files only — no live database connections
- This is the buyer-facing demo surface — treat as production
- No Vercel project exists for this. Do not run `vercel` from this directory.
- Data snapshots from Mid-Stream committed here as static JSON
