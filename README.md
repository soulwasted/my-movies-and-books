# Media Diary

Osobní filmový deník s swipe UI, CZDB/ČSFD daty a AI doporučeními (Claude).

## Funkce (MVP)

- **Clerk** přihlášení
- Onboarding výběrem žánrů
- Swipe karty: Viděl jsem / Chci vidět / Neviděl
- Hodnocení hvězdičkami (1–5) nebo 1–10 + poznámky a štítky
- Detail filmu: TMDB + **[CZDB API](https://api.czdb.cz)** (ČSFD skóre, české názvy, trailery)
- AI chat a doporučení
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
| `ANTHROPIC_API_KEY` | AI doporučení |

CZDB nevyžaduje klíč — `https://api.czdb.cz/search?q=...`

## Stack

Next.js 16 · Clerk · Prisma · Postgres · TMDB · CZDB · Claude · next-intl

## Deploy (Vercel)

Projekt: `prj_AFYR5k3IiOrEFw4D6zeVkjGLJrFU`

Po pushi na GitHub propojte repo ve Vercel dashboardu a nastavte env proměnné.
