---
task: "Media Diary — chytré nabízení filmů a knih, které se učí z rozhodnutí"
slug: media-diary
project: Media Diary
phase: climbing
progress: 34/35
started: 2026-06-07T00:00:00Z
updated: 2026-10-31T20:00:00Z
principal_stated_goal: "Musí to být chytré nabízení filmů či knih. Jakoby AI na pozadí."
principal_stated_goal_source: conversation
principal_stated_goal_signal: 2
principal_stated_goal_locked: 2026-10-31T19:55:00Z
---

## Problem

Swipe fronta je dnes ruleta: trendy + top rated + discover podle žánrů z onboardingu, zamíchané náhodně. Rozhodnutí (Viděl + hodnocení, Chci vidět, Nezajímá mě) se ukládají, ale nabídku vůbec neovlivňují — po 209 rozhodnutích dostává pepę stejně náhodné karty jako první den. AI existuje jen jako chat na vyžádání, ne jako vrstva, která by nabídku tiše zlepšovala. K tomu tlačítka míchají dvě různé věci („Neviděl“ vs. „Nechci vidět“), takže signál z nich je mlhavý.

## Vision

Otevřu appku a první tři karty jsou filmy, o kterých jsem nevěděl, že je chci vidět — a u jedné stojí „AI tip: protože jsi dal 9/10 Příchozím a nesnášíš romantické komedie“. Každé rozhodnutí se projeví už při příštím načtení fronty. Nic nečekám: karta je tam do 200 ms po swipe. Euforické překvapení: po týdnu používání mi deník doporučí film, který mi nikdo jiný nedoporučil, a trefí se.

## Out of Scope

- **Žádný vlastní ML trénink ani embeddings infrastruktura.** Model vkusu je deterministické vážení + LLM profil, ne neuronová síť.
- **Žádné LLM volání na každou kartu.** AI běží na pozadí v dávkách, swipe nikdy nečeká na model.
- **Žádné sociální funkce** (sdílení, přátelé, společné seznamy).
- **Žádné streamingové „kde to běží“** v této iteraci.
- **Žádná nativní mobilní appka** — web + PWA.
- **Knihy se nestaví samostatně** — dostanou stejnou logiku jako filmy, ale až když Google Books znovu funguje.

## Language

**Rozhodnutí** — jedna ze tří odpovědí na kartu: *Viděl* (s hodnocením), *Chci vidět*, *Nezajímá mě*. Nese signál vkusu.
_Avoid_: „swipe“ jako synonymum rozhodnutí.

**Přeskočit** — neutrální odložení karty bez signálu; film se může později vrátit.
_Avoid_: „Neviděl“ — to bylo dvojznačné (neviděl a chci? neviděl a nechci?) a vedlo k návrhu se čtyřmi tlačítky, který pepę odmítl.
Vztah: legacy stav `SKIPPED` = Přeskočit (neutrální).

**Model vkusu** — deterministický výpočet vah (žánry, dekády, jazyk, režiséři, herci) z rozhodnutí; přepočítá se při každém načtení fronty.

**AI profil** — textový popis vkusu + konkrétní tituly, který Claude generuje na pozadí po dávce rozhodnutí; uložený v DB, sdílený frontou i chatem.

## Principles

- **Odezva před chytrostí.** Chytrost, která zdrží kartu, je špatná chytrost — drahé věci běží mimo swipe.
- **Každé rozhodnutí musí být znát.** Signál, který nic nezmění, uživatele učí, že na rozhodnutí nezáleží.
- **Vysvětlitelnost.** Doporučení s důvodem je důvěryhodnější než doporučení bez něj.
- **Nebublina.** Část nabídky vždy patří objevování mimo dosavadní vkus.

## Constraints

- Stack zůstává: Next.js 16, Prisma + Neon Postgres (us-east-1), Clerk, TMDB, CZDB, Claude API (`claude-sonnet-5-5`, structured outputs, effort `low`).
- Schéma DB se mění jen aditivně; `prisma db push` na produkční DB spouští pepę sám.
- Claude volání pouze na serveru, klíč nikdy na klientu; náklad AI profilu řádově haléře za přepočet.
- Existujících 209 záznamů se nemaže ani nepřepisuje; `SKIPPED` se reinterpretuje jako neutrální.
- TMDB/CZDB volání mají timeouty; výpadek externí služby nesmí shodit frontu.

## Goal

"Musí to být chytré nabízení filmů či knih. Jakoby AI na pozadí." Hotovo znamená: pořadí swipe fronty určuje model vkusu spočítaný z rozhodnutí (Viděl + hodnocení, Chci vidět, Nezajímá mě), do fronty se přimíchávají AI tipy s důvodem z profilu, který Claude přepočítává na pozadí, a 15 % fronty zůstává objevování — vše bez zpomalení swipe pod 200 ms.

## Not yet specified

- fog: Má se „Přeskočený“ film sám vracet do fronty, a po jaké době? pepę rozhodne později, až bude mít historii nabídky (F4) v ruce. Do té doby se přeskočené do fronty nevrací.

## Test Strategy

| isc | type | check | threshold | tool | anchors_to |
|-----|------|-------|-----------|------|------------|
| ISC-10 | ui | na kartě 4 rovnocenná tlačítka | přesně 4 | browser read_page | principal_stated_goal |
| ISC-11 | sql | `NOT_INTERESTED` v obou enumech | 2 hodnoty | prisma migrate diff = prázdný | principal_stated_goal |
| ISC-12 | bun-test | Přeskočit nezmění váhy modelu | Δ = 0 | bun test taste-model | principal_stated_goal |
| ISC-14 | bun-test | 9/10 film zvedne váhu svých žánrů, Nezajímá mě sníží | znaménko | bun test taste-model | principal_stated_goal |
| ISC-15 | bun-test | fronta seřazená podle skóre, ne náhodně | Spearman > 0.8 vůči skóre | bun test queue | principal_stated_goal |
| ISC-16 | bun-test | podíl objevování | 15 % ± 1 karta | bun test queue | ISC-15 |
| ISC-17 | curl | kandidáti z TMDB recommendations nejlépe hodnocených | ≥ 40 % poolu | curl /api/movies/queue + log | principal_stated_goal |
| ISC-18 | e2e | rozhodnutí → nové načtení fronty → změněné pořadí | změna ≥ 1 pozice | browser + DB | principal_stated_goal |
| ISC-19 | timing | `/api/movies/queue` s modelem | p95 < 1500 ms teplá | browser performance | ISC-2 |
| ISC-20 | sql | AI profil uložen po dávce rozhodnutí | řádek existuje, `updatedAt` > poslední dávka | SELECT | principal_stated_goal |
| ISC-21 | ui | AI tip má štítek a jednovětý důvod | 100 % AI tipů | browser read_page | principal_stated_goal |
| ISC-22 | e2e | swipe nečeká na Claude | swipe < 200 ms i během přepočtu | browser timing | ISC-2 |
| ISC-23 | bun-test | AI tip nikdy nevrátí viděný / chci / nezajímá titul | 0 úniků | bun test ai-tips | principal_stated_goal |
| ISC-24 | curl | chat dostává AI profil v system promptu | profil přítomen | log /api/ai | principal_stated_goal |
| ISC-29 | ui | historie obsahuje SEEN + SKIPPED | počet = DB count | browser + SELECT | principal_stated_goal |
| ISC-30 | ui | filtr „jen přeskočené“ | 0 jiných stavů | browser read_page | ISC-29 |
| ISC-31 | e2e | změna rozhodnutí v historii změní váhy | Δ ≠ 0 | browser + bun test | ISC-14 |
| ISC-25 | ui | „Proč tenhle film?“ u běžné karty z modelu | důvod z top vah | browser | ISC-21 |

## Features

### F0 · Cross-cutting
Why: aby chytrost nestála rychlost a nerozbila to, co už funguje.
- [x] ISC-1: Fronta se načte jednou při mountu; první karta se po zobrazení nevymění.
- [x] ISC-2: Po rozhodnutí se další karta zobrazí do 200 ms (naměřeno 166 ms).
- [x] ISC-3: Karty se prefetchují 3 dopředu včetně plakátu `w342` přímo z TMDB.
- [x] ISC-4: CZDB/Open Library bez shody se nedotazují znovu při každém zobrazení (cache 7 dní).
- [x] ISC-5: Prisma má `connect_timeout`/`pool_timeout` 20 s kvůli probouzení Neonu.
- [x] ISC-6: AI chat funguje na `claude-sonnet-5-5` se structured outputs a historií konverzace.
- [x] ISC-7: Přihlášení nevede na onboarding; onboarding z Nastavení je předvyplněný.
- [x] ISC-8: Témata a světlý/tmavý režim z Invoicingu v Nastavení.
- [x] ISC-9: Karta zobrazuje české žánry z TMDB (záloha CZDB).
- [x] ISC-26: Anti: Swipe fronta neobsahuje titul, který má uživatel ve stavu WATCHED, WANT ani NOT_INTERESTED.
- [x] ISC-27: Anti: Žádné volání Claude API v request path `/api/movies/queue` ani `/api/movies/[id]`.
- [x] ISC-28: Anti: Žádná existující řádka `UserMovie`/`UserBook` se při zavedení modelu nesmaže ani nepřepíše.

### F1 · Tři rozhodnutí + Přeskočit
Why: čistý signál — každé tlačítko říká jednu věc o vkusu, odložení neříká nic.
- [x] ISC-10: Karta má 4 rovnocenná tlačítka Chci vidět, Viděl jsem, Nezajímá mě, Přeskočit; knihy obdobně (Chci číst, Přečetl jsem, Nezajímá mě, Přeskočit). Názvy sjednocuje `ISA-kompas.md` ISC-K1.
- [x] ISC-11: Enum `NOT_INTERESTED` existuje v `MovieStatus` i `BookStatus` v produkční DB.
- [x] ISC-12: Přeskočit ukládá `SKIPPED` a model vkusu ho bere jako neutrální.
- [x] ISC-13: Knihovna zobrazuje stav „Nezajímá mě“ a umí ho vrátit (změnit rozhodnutí).

### F2 · Model vkusu
Why: aby každé rozhodnutí okamžitě změnilo, co uvidím příště — levně a vysvětlitelně.
- [x] ISC-14: Váhy žánrů/dekád/jazyka (režiséři/herci odloženi, viz Decisions): WATCHED škálované hodnocením (vysoké +, nízké −), WANT +, NOT_INTERESTED −.
- [x] ISC-15: `/api/movies/queue` řadí kandidáty podle skóre modelu.
- [x] ISC-16: 15 % fronty tvoří objevování (kandidáti s nízkou podobností, ale vysokým hodnocením TMDB).
- [x] ISC-17: Pool kandidátů čerpá z TMDB `recommendations` top hodnocených filmů, doplněných discover podle top žánrů.
- [x] ISC-17.1: Z jednoho zdrojového filmu nejvýš 4 karty ve frontě (žádná franšízová lavina).
- [ ] ISC-18: Rozhodnutí se projeví v pořadí při dalším načtení fronty.
- [x] ISC-19: Fronta s modelem odpoví p95 < 1500 ms (teplá cache).
- [x] ISC-25: Karta z modelu umí ukázat „Proč tenhle film?“ (top 1–2 váhy, které ho vynesly).

### F3 · AI profil na pozadí
Why: najít to, co čísla nenajdou — souvislosti, nálady, autorský styl — a říct proč.
- [x] ISC-20: Po každých 20 rozhodnutích (spuštěno přes `after()` po server action, bez cronu) Claude přepočítá AI profil (text vkusu + 10 konkrétních titulů s důvodem) a uloží ho do DB.
- [x] ISC-21: AI tipy se přimíchají do fronty se štítkem „AI tip“ a jednovětým důvodem — max 3 z 20 karet, nejvýš jeden v prvních pěti.
- [x] ISC-22: Přepočet běží mimo swipe; swipe zůstává < 200 ms i během něj.
- [x] ISC-23: AI tipy jsou filtrované proti WATCHED/WANT/NOT_INTERESTED (stejně jako chat).
- [x] ISC-24: AI chat a „Doporuč mi“ dostávají uložené shrnutí AI profilu v system promptu (vedle profilu skládaného za běhu).
- [x] ISC-23.1: Tipy AI se dohledávají v TMDB přesnou shodou anglického/originálního názvu a rokem ±1; bez shody se tip zahodí.

### F4 · Historie nabídky
Why: nic, co mi fronta ukázala, se neztratí — můžu se vrátit a rozhodnout znovu.
- [x] ISC-29: Záložka Historie v Knihovně ukazuje všechny dříve nabídnuté filmy (SEEN i SKIPPED) seřazené od nejnovějších.
- [x] ISC-30: Historii lze filtrovat jen na přeskočené.
- [x] ISC-29.1: Historie se načte do 2,5 s (metadata jedním requestem z `MovieCache`, pole vytažená v SQL).
- [x] ISC-31: U filmu v historii jde rozhodnout znovu (Viděl, Chci vidět, Nezajímá mě) a rozhodnutí se propíše do modelu vkusu.
- [x] ISC-32: Anti: Přeskočený film se do swipe fronty sám nevrací, dokud pepę nerozhodne pravidlo návratu (fog).

## Decisions

- 2026-10-31 — Model `claude-sonnet-4-20250514` vrací 404 → `claude-sonnet-5-5`; vynucený `tool_choice` na něm vrací 400 → structured outputs (`output_config.format` + Zod).
- 2026-10-31 — Clerk: lokální klíče patřily ke dvěma instancím. pepę zvolil instanci `awaited-lemming-75`; uživatel převeden `UPDATE "User" SET id` s ON UPDATE CASCADE (záloha `.backups/`).
- 2026-10-31 — Vercel image optimizer vypnutý; TMDB posílá zmenšené obrázky sám.
- 2026-10-31 — DEAD END: čtyři tlačítka (Neviděl, Nechci vidět, Viděl, Chci vidět). pepę: „Neviděl“ neříká, co chci → tři rozhodnutí + neutrální Přeskočit.
- 2026-10-31 — Fog → rozhodnuto pepou: AI profil se přepočítá po 20 rozhodnutích (`after()`); AI tipy max 3 z 20, nejvýš 1 v prvních pěti; 209 starých `SKIPPED` se chová jako Přeskočit (data beze změny).
- 2026-10-31 — Návrat přeskočených zůstává fog; místo něj historie nabídky s filtrem na přeskočené (F4).
- 2026-10-31 — refined: ISC-14 bez režisérů a herců — seznamové položky TMDB je nemají a dotahovat detaily ke 100+ kandidátům by rozbilo ISC-19. Lidi zůstávají pro „Proč tenhle film?“ jako budoucí rozšíření.
- 2026-10-31 — Rysy rozhodnutých filmů se čtou z `MovieCache` přes `data::jsonb` přímo v Postgresu, ne parsováním celých JSONů v Node.
- 2026-10-31 — F4 postavena na existující záložce Historie v Knihovně (ne nová stránka): filtr podle stavu + tři ikony rozhodnutí na kartě. Knihy zatím bez inline rozhodnutí (Google Books mrtvé).
- 2026-10-31 — refined: ISC-24 — chat profil doplňuje, nenahrazuje; dynamický profil (seznamy, zakázané tituly) dál chrání před doporučením viděného.
- 2026-10-31 — AI profil: `claude-sonnet-5-5`, effort `medium` (běží na pozadí, kvalita před rychlostí), první profil od 10 rozhodnutí, pak každých 20; ochrana proti souběhu per instance.
- 2026-11-01 — UX/UI chování (navigace, slovník rozhodnutí, důvěra, knihovna, hledání) vede samostatné `ISA-kompas.md` (`parent: media-diary`). Revize našla rozpor: necommitnutý `decision-buttons.tsx` má 4 rovnocenná tlačítka (Chci vidět, Viděl jsem, Nechci vidět, Možná později), ne 3 + odkaz Přeskočit, jak tvrdí ISC-10. ISC-10 se opraví po rozhodnutí kanonu (fog v Kompasu).
- 2026-11-01 — refined: ISC-10 — pepę zvolil 4 rovnocenná tlačítka (Chci vidět, Viděl jsem, Nezajímá mě, Přeskočit). Rozhodnutí z 2026-10-31 o 3 + odkazu je tím nahrazené; Přeskočit zůstává neutrální.
- 2026-10-31 — Dvouvrstvá architektura doporučování: deterministický model vkusu (rychlý, každé načtení) + AI profil (pomalý, na pozadí). LLM per karta zamítnuto kvůli odezvě a ceně.

## Learning

- conjectured: Pomalost appky způsobují velké obrázky. refuted by: měření (plakát w500 80 kB) vs. log serveru (Clerk API na každém requestu, CZDB 1,5 s opakovaně bez cache, Neon cold start > 5 s timeout). learned: hlavní zdržení bylo na serveru, obrázky byly vedlejší. criterion now: ISC-4, ISC-5 + měřit request časy dřív než optimalizovat assety.
- conjectured: Problikávání karty je animace. refuted by: kód — fronta se načítala znovu při změně identity `t()` a první film se mezitím zapsal jako SEEN, takže druhá fronta ho vyřadila. learned: efekty závislé na referencích z providerů jsou křehké. criterion now: ISC-1.
- conjectured: TMDB recommendations k oblíbeným filmům dají pestrou frontu. refuted by: první běh — 7 z 20 karet z doporučení ke Spider-Manovi (Marvel lavina). learned: recommendations jedné franšízy mají vysoké skóre všechny naráz a model je sám nerozředí. criterion now: ISC-17.1.
- conjectured: Knihovnu stačí zrychlit sloučením 213 requestů do jednoho. refuted by: jediný `/api/movies/meta` trval 4,8 s — přenášel celé detaily filmů (megabajty JSONu) z Neonu v us-east. learned: u vzdálené DB rozhoduje objem dat, ne jen počet dotazů. criterion now: ISC-29.1 (pole extrahovaná v SQL, 0,9 s).
- conjectured: `resolveMovieTmdbId` spolehlivě přiřadí AI tip k filmu. refuted by: první AI profil — „Mother (2009)“ → *Mother and Child*, „A Prophet“ → dokument o kapele; hledání s filtrem roku + první výsledek bez kontroly názvu, navíc v cs-CZ, kde názvy neodpovídají anglickým. learned: shoda musí být přes název (en + originál), rok jen jako tolerance ±1, popularita rozhoduje mezi jmenovci. criterion now: ISC-23.1 (`resolve-movie.test.ts`).

## Verification

- ISC-12, ISC-14, ISC-15, ISC-16, ISC-17.1: `bun test src/lib/taste-model.test.ts` (10 pass).
- ISC-20..ISC-24, ISC-23.1: `bun test` 18 pass; profil spočten za 13–15 s (druhé volání bez přepočtu), 8/10 tipů dohledáno správně, ve frontě AI tipy na pozicích 3/9/15, chat cituje profil, fronta teplá 0,7–1,2 s.
- ISC-27, ISC-28: `rg` — žádné AI importy ani mazání v `src/app/api/movies` a modelu.
- ISC-10, ISC-11, ISC-13, ISC-29..ISC-32: prohlížeč 2026-10-31 — 3 tlačítka + Přeskočit, `NOT_INTERESTED` uložen v DB a vrácen, filtr historie, meta 891 ms, migrate diff prázdný.
- ISC-17, ISC-19, ISC-25, ISC-26: prohlížeč 2026-10-31 — fronta 1138 ms studená / 693 ms teplá, 86 rozhodnutí v modelu, důvody na kartě, zdroje ≤ 4.
- ISC-1..ISC-8: commit 60c6012; swipe 166 ms, undo 167 ms naměřeno v prohlížeči 2026-10-31.
- ISC-9: lokálně ověřeno v prohlížeči, necommitnuto.

## Remaining Work

- [ ] Vercel env: Clerk klíče z `awaited-lemming-75` — jinak produkce nenajde převedeného uživatele.
- [ ] Google Books API klíč vrací 403 (Books API zablokované na klíči) — opravit v Google Cloud; do té doby knihy mrtvé.
- [ ] Commit F3 (AI profil, AI tipy, oprava dohledávání) — F1, F2, F4 jsou v 687a2bb.
- [ ] Push na GitHub + Vercel deploy — až budou na Vercelu nové Clerk klíče.
