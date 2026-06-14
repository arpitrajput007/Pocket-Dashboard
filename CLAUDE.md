# Pocket Dashboard - Project Guide

## Project Structure

```
D2C-Analytics-SaaS/
├── src/                    # React frontend (Vite)
├── server/                 # Express.js backend
│   ├── index.js           # Main API server
│   ├── syncService.js     # Shopify data sync
│   └── cryptoUtils.js     # Encryption utilities
├── public/                # Static assets
├── dist/                  # Build output (Vercel)
├── supabase/             # Supabase migrations
├── vercel.json           # Vercel config
└── package.json          # Frontend dependencies
```

## Key Files

- **Backend Entry:** `server/index.js` - Express API, Shopify webhooks, Supabase integration
- **Frontend:** `src/` - React components, pages, utilities
- **Database:** Supabase (PostSQL) with RLS for security
- **APIs:** OpenAI integration, Shopify REST API

## Deployment

- **Frontend:** Vercel (auto-deploys from GitHub)
- **Backend:** Render (auto-deploys from GitHub)
- **Database:** Supabase (hosted, migrations in `supabase/`)

## Environment Variables

Required in Vercel & Render dashboards:
- `VITE_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (backend only)
- `OPENAI_API_KEY`
- `SHOPIFY_*` keys

## Development

```bash
npm run dev          # Frontend + Vite dev server
npm run build        # Build for Vercel
cd server && npm start  # Run backend locally
```

## Workflow

1. **Request:** User describes feature/fix
2. **Implementation:** Code changes in relevant files
3. **Testing:** Run locally if needed
4. **Commit:** Clear, descriptive commit message
5. **Push:** `git push origin main`
6. **Deploy:** Vercel & Render auto-deploy within minutes

---

**Note:** All updates go directly to GitHub main. No PR review needed unless specified.
