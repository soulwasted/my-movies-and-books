# Media Diary

Osobní filmový a knižní deník s swipe UI, CZDB/ČSFD daty, Google Books a AI doporučeními (Claude).

## Funkce (MVP)

- **Clerk** přihlášení
- Onboarding výběrem žánrů
- Swipe karty: filmy (Viděl / Chci vidět) a knihy (Přečteno / Chci číst)
- Hodnocení hvězdičkami (1–5) nebo 1–10 + poznámky a štítky
- Detail filmu: TMDB + **[CZDB API](https://api.czdb.cz)** (ČSFD skóre, české názvy, trailery)
- Detail knihy: Google Books + Open Library + Wikidata enrichment + odkaz na Databázi knih
- AI chat a doporučení (filmy i knihy)
- CS/EN lokalizace, PWA

## Rychlý start

```bash
npm install
cp .env.example .env
# Vyplňte DATABASE_URL (Postgres) a API klíče
npx prisma db push
npm run dev
```

[http://localhost:3000/cs](http://localhost:3000/cs)

## Proměnné prostředí

| Proměnná | Popis |
|----------|--------|
| `DATABASE_URL` | Postgres (Neon doporučeno pro Vercel) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk dashboard |
| `CLERK_SECRET_KEY` | Clerk dashboard |
| `TMDB_API_KEY` nebo `TMDB_ACCESS_TOKEN` | [TMDB API](https://www.themoviedb.org/settings/api) |
| `GOOGLE_BOOKS_API_KEY` | [Google Books API](https://console.cloud.google.com/) — povolit Books API |
| `ANTHROPIC_API_KEY` | AI doporučení |

CZDB nevyžaduje klíč — `https://api.czdb.cz/search?q=...`
Open Library a Wikidata nevyžadují klíč.

## Stack

Next.js 16 · Clerk · Prisma · Postgres · TMDB · CZDB · Google Books · Open Library · Claude · next-intl

## Deploy (Vercel)

- **GitHub:** https://github.com/soulwasted/my-movies-and-books
- **Vercel project:** `project-awkht` (`prj_AFYR5k3IiOrEFw4D6zeVkjGLJrFU`)

### 1. Propojit GitHub repo (doporučeno)

V [Vercel → project-awkht → Settings → Git](https://vercel.com/peps-projects-58d012fb/project-awkht/settings/git) připojte repo `soulwasted/my-movies-and-books`.

### 2. Env proměnné na Vercel

| Klíč | Poznámka |
|------|----------|
| `DATABASE_URL` | Neon Postgres connection string |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk |
| `CLERK_SECRET_KEY` | Clerk |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/cs/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/cs/sign-up` |
| `TMDB_ACCESS_TOKEN` | TMDB |
| `GOOGLE_BOOKS_API_KEY` | Google Books |
| `ANTHROPIC_API_KEY` | Claude |

Po prvním deployi spusťte `npx prisma db push` proti produkční DB (nebo přidejte do build command).

### 3. Clerk — production URLs

V Clerk dashboard přidejte doménu Vercel deploye do allowed redirect URLs.

### Alternativa: GitHub Actions

Workflow `.github/workflows/vercel-deploy.yml` — vyžaduje GitHub secret `VERCEL_TOKEN`.
