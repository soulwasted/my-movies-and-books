---
task: "Media Diary Kompas: orientace, důvěra a radost z objevování"
slug: media-diary-kompas
project: Media Diary
parent: media-diary
phase: climbing
progress: 7/39
started: 2026-11-01T00:00:00Z
updated: 2026-11-01T12:00:00Z
principal_stated_goal: "podívej se na appku jako 1. UI/UX kritik, 2. jako uživatel, co chce objevovat filmy, mít přehled o své knihovně, bavit se objevováním, věřit výsledkům, mít jasnou orientaci v appce a mít jednoduchou navigaci"
principal_stated_goal_source: prompt
principal_stated_goal_signal: 1
principal_stated_goal_locked: 2026-11-01T00:00:00Z
---

## Problem

Master ISA (`ISA.md`) udělal nabídku chytrou, ale rozhraní kolem ní za tou chytrostí zaostává. Jedno rozhodnutí má v appce tři jména: fronta říká „Nechci vidět“ a „Možná později“, knihovna „Nezajímá mě“ a „Přeskočeno“, texty `swipe.*` „Viděl“ a „Přeskočit“. Ověřené ISC-10 v master ISA navíc popisuje jiná tlačítka, než jaká jsou v kódu. Spodní lišta má šest položek s popisky 10 px. „Objevovat“ je přitom jen vyhledávání a objevuje se na „Domů“. Knihy nefungují (Google Books 403), a přesto jsou na každé obrazovce i v povinném onboardingu. Knihovna má tři úrovně navigace a začíná surovým logem. Důvody u karet mají všechny stejnou ikonu, takže AI tip nejde odlišit od výpočtu modelu, a appka nikde neukáže, že se učí. Konec fronty slibuje „zítra přidáme další“, i když nová várka je k dispozici hned.

## Vision

Otevřu appku a do tří vteřin vím, kde jsem a co tu dělám: přede mnou je karta, pod ní tři jasná rozhodnutí. U karty je vidět, proč tu je („AI tip“ vypadá jinak než „podobné jako Příchozí“) a na jeden tap se dozvím víc. Rozhodnu se gestem nebo šipkou, krátce mi blikne „Uloženo do Chci vidět · Vrátit“ a hned je tu další film. Po várce dostanu shrnutí: 14 rozhodnutí, 3 nové do Chci vidět, AI tě přepočítá za 6. V Knihovně je nahoře „Chci vidět“, takže otázka „co si dnes pustím“ má odpověď na jedno kliknutí. Na stránce „Tvůj vkus“ si přečtu, co si o mně AI myslí, a trefí se. Euforické překvapení: popis vkusu je přesnější, než bych ho napsal sám.

## Out of Scope

- **Žádné změny modelu vkusu ani AI profilu.** Patří do master `ISA.md`; Kompas jen zobrazuje, co už existuje.
- **Žádný nový design systém ani rebrand.** Zůstávají shadcn komponenty, Tailwind a témata z Invoicingu.
- **Žádná nativní appka**, jen web + PWA.
- **Žádné sociální funkce** (sdílení, přátelé).
- **Žádná oprava Google Books.** Kompas knihy jen schová, dokud nefungují.

## Language

**Rozhodnutí** — odpověď na kartu, která nese signál vkusu. Kanonické názvy pro filmy: *Chci vidět*, *Viděl jsem*, *Nezajímá mě*. Pro knihy: *Chci číst*, *Přečetl jsem*, *Nezajímá mě*.
_Avoid_: „Nechci vidět“, „Nechci číst“, „Viděno“, „Viděl“.

**Přeskočit** — neutrální odložení bez signálu (stav `SKIPPED`), čtvrté rovnocenné tlačítko vedle tří rozhodnutí. V knihovně se stav jmenuje *Přeskočeno*.
_Avoid_: „Možná později“ (slibuje návrat, o kterém se ještě nerozhodlo, viz master fog), „Neviděl“.

**Ukázáno** — film prošel nabídkou a nepadlo o něm rozhodnutí (stav `SEEN`).
_Avoid_: „Prošlo nabídkou“.

**Nabídka** — swipe fronta jako místo v appce (položka navigace). **Várka** — jedno načtení nabídky (20 karet).
_Avoid_: „Domů“, „Dnešní tipy“.

**Důvod** — věta u karty, proč tam je. Má tři druhy: *z vkusu* (model), *AI tip* (AI profil), *objevování* (mimo bublinu).

**Tvůj vkus** — stránka, která ukazuje, co se appka naučila (váhy modelu + text AI profilu). Nahrazuje Statistiky.

## Principles

- **Jedna věc, jedno jméno.** Stav, který se jinde jmenuje jinak, člověk čte jako dva různé stavy.
- **Důvod před doporučením.** Doporučení bez důvodu je reklama, doporučení s důvodem je rada.
- **Učení musí být vidět.** Když nevidím, že se appka učí, nemám důvod se pečlivě rozhodovat.
- **Mrtvé se schová, neukazuje.** Nefunkční funkce na hlavní ploše bere důvěru všemu ostatnímu.
- **Rozhodnutí na jeden pohyb.** Cokoliv navíc (poznámka, štítky, škála) je volitelné a sbalené.
- **Konec je odměna, ne zeď.**

## Constraints

- Všechny Constraints master `ISA.md` platí (stack, aditivní schéma, Claude jen na serveru, 209+ záznamů se nemaže).
- Odezva z master ISA zůstává: další karta do 200 ms po rozhodnutí (ISC-2). Žádný UX prvek ji nesmí zpomalit.
- Každý text je v `messages/cs.json` i `messages/en.json`. Žádné natvrdo psané řetězce v komponentách.
- Pořadí a význam rozhodnutí drží dál jediné místo: `src/components/decision-buttons.tsx`.
- Mobil (šířka 375 px) je primární, desktop nesmí být horší.

## Dependencies

- requires: media-diary — AI profil uložený v DB (F3, ISC-20), váhy modelu vkusu (`buildTasteModel` v `src/lib/taste-model.ts`) a typy důvodů (`QueueReason` v `src/lib/queue-types.ts`). Kompas je čte, nemění.

## Goal

„Mít jasnou orientaci v appce, jednoduchou navigaci, přehled o knihovně, věřit výsledkům a bavit se objevováním.“ Hotovo znamená: navigace má 4 položky a Nastavení je pod avatarem v hlavičce. Každý stav rozhodnutí má jedno jméno všude. Knihy jsou skryté, dokud nefungují. Každý důvod u karty má rozlišitelný druh a rozklik „Proč?“. Appka ukazuje postup učení a stránku Tvůj vkus. Knihovna má jednu úroveň s výchozím Chci vidět. Konec várky ukáže shrnutí a nabídne další várku. Odezva swipe zůstává pod 200 ms.

## Bridge Criteria

- [ ] ISC-K36: Bridge: Text AI profilu na stránce Tvůj vkus je přesně ten, který uložil master F3 (ISC-20). Žádná druhá generace pro zobrazení.
- [ ] ISC-K37: Bridge: Druh důvodu na kartě se odvozuje jen z `QueueReason.type`. Nový typ v master ISA bez vizuálu = build selže (exhaustivní `switch`).
- [ ] ISC-K38: Bridge: Ukazatel „AI tě přepočítá za N“ počítá se stejným prahem (10, pak každých 20), jaký používá `taste-profile.ts`. Práh je sdílená konstanta, ne kopie čísla.

## Test Strategy

| isc | type | check | threshold | tool | anchors_to | severity |
|-----|------|-------|-----------|------|------------|----------|
| ISC-K1 | ui | 4 rovnocenná tlačítka v pořadí Chci vidět · Viděl jsem · Nezajímá mě · Přeskočit ve všech pohledech | 4/4 pohledy | browser read_page | principal_stated_goal | critical |
| ISC-K2 | grep | zakázané názvy (Nechci vidět, Prošlo nabídkou, Možná později, Viděno) v messages | 0 výskytů | rg messages/ | ISC-K1 | |
| ISC-K3 | ui | stejný stav má stejný název ve frontě, detailu, knihovně a na Tvém vkusu | 4/4 shoda | browser get_page_text | ISC-K1 | |
| ISC-K4 | grep | natvrdo psané řetězce v JSX („No poster“…) | 0 | rg src/components | derived: ISC-K3 | |
| ISC-K5 | grep | Heart ikona jen u jednoho významu | 1 význam | rg lucide Heart | ISC-K3 | |
| ISC-K6 | ui | počet položek spodní navigace | přesně 4 | browser read_page | principal_stated_goal | critical |
| ISC-K7 | ui | velikost popisku v navigaci | ≥ 12 px | browser computed style | ISC-K6 | |
| ISC-K8 | ui | avatar v hlavičce na každé stránce otevře Nastavení a Tvůj vkus | 1 tap, 4/4 stránek | browser | ISC-K6 | |
| ISC-K9 | ui | aktivní položka navigace má vizuální stav + `aria-current` | 4/4 stránek | browser read_page | ISC-K6 | |
| ISC-K10 | ui | u každé hlavní stránky je H1 se jménem shodným s položkou navigace | 4/4 | browser read_page | ISC-K6 | |
| ISC-K11 | ui | Knihy nejsou vidět, když `NEXT_PUBLIC_BOOKS_ENABLED` není true | 0 výskytů záložky Knihy | browser read_page | principal_stated_goal | |
| ISC-K12 | ui | onboarding bez knižního kroku, když jsou knihy vypnuté | 1 krok | browser | ISC-K11 | |
| ISC-K13 | e2e | zapnutí flagu vrátí knihy bez dalších změn kódu | záložky zpět | browser | ISC-K11 | |
| ISC-K14 | ui | karta na 375 px: tlačítka rozhodnutí viditelná bez scrollu | ano | browser resize 375×812 + screenshot | principal_stated_goal | critical |
| ISC-K15 | ui | karta ukazuje plakát, název, rok, žánry, hodnocení, důvod, ≤ 3 řádky popisu; zbytek za „Víc“ | přesně tento obsah | browser read_page | ISC-K14 | |
| ISC-K16 | e2e | gesto swipe uloží správný stav | 4/4 směry | browser drag + SELECT | ISC-K14 | |
| ISC-K17 | e2e | šipky/klávesy na desktopu uloží správný stav | 4/4 klávesy | browser key + SELECT | ISC-K14 | |
| ISC-K18 | e2e | Viděl jsem → tap na levou/pravou půlku hvězdy → uloženo s půlhvězdou | 1 tap, 0,5 krok | browser | ISC-K14 | |
| ISC-K19 | ui | poznámka a štítky sbalené pod „Přidat poznámku“ | sbaleno | browser read_page | ISC-K18 | |
| ISC-K39 | sql | staré hodnocení `SCALE` se zobrazí jako hvězdy a nepřepíše se | 0 změněných řádků | browser + SELECT | ISC-K18 | critical |
| ISC-K20 | ui | po rozhodnutí potvrzení se jménem stavu a Vrátit | text obsahuje název stavu | browser read_page | ISC-K14 | |
| ISC-K21 | timing | swipe s potvrzením a gestem | < 200 ms | browser performance | cross: media-diary | critical |
| ISC-K22 | ui | konec várky: shrnutí (počty podle stavu) + „Další várka“ | obě přítomné | browser | principal_stated_goal | |
| ISC-K23 | grep | text „zítra přidáme další“ | 0 výskytů | rg messages/ | ISC-K22 | |
| ISC-K24 | ui | fronta má 4 render-stavy: loading (skeleton), error (+ zkusit znovu), konec várky, karta | 4/4 | browser + vynucená chyba | ISC-K22 | |
| ISC-K25 | ui | tři druhy důvodu mají odlišnou ikonu i barvu | 3 různé | browser screenshot | principal_stated_goal | critical |
| ISC-K26 | ui | tap na důvod otevře „Proč?“ s top 1–2 váhami nebo textem AI tipu | otevře se, má obsah | browser | ISC-K25 | |
| ISC-K27 | ui | ukazatel učení „AI tě přepočítá za N rozhodnutí“ | N = práh − počet od posledního přepočtu | browser + SELECT | ISC-K25 | |
| ISC-K28 | ui | Knihovna: jedna úroveň segmentů, výchozí Chci vidět | 1 úroveň, default WANT | browser read_page | principal_stated_goal | critical |
| ISC-K29 | ui | Knihovna: řazení (naposledy, hodnocení, rok) a hledání v názvu | 3 řazení + hledání | browser | ISC-K28 | |
| ISC-K30 | ui | Knihovna: loading/error/prázdno/naplněno | 4/4 stavy | browser | ISC-K28 | |
| ISC-K31 | bun-test | hledání: debounce a zahození starší odpovědi | starší odpověď nepřepíše novější | bun test search | principal_stated_goal | |
| ISC-K32 | ui | výsledek hledání ukazuje můj stav a nabízí rozhodnutí | stav + 3 akce | browser | ISC-K31 | |
| ISC-K33 | ui | hledání: stav „nic nenalezeno“ a loading skeleton | oba přítomné | browser | ISC-K31 | |
| ISC-K34 | ui | AI: prázdný chat ukazuje 3 ukázkové dotazy; historie přežije přechod na jinou stránku a zpět | 3 dotazy + historie zachovaná | browser | principal_stated_goal | |
| ISC-K35 | ui | Tvůj vkus: top 5 žánrů a dekád z modelu, text AI profilu, rozložení hodnocení, počty | všechny 4 bloky | browser + SELECT | principal_stated_goal | |
| ISC-K36 | sql | text na stránce = `TasteProfile` v DB | shoda | browser + SELECT | cross: media-diary | |
| ISC-K37 | build | exhaustivní switch přes `QueueReason.type` | `tsc` projde, nový typ selže | bun run build | cross: media-diary | |
| ISC-K38 | grep | práh přepočtu je jedna exportovaná konstanta | 1 definice | rg taste-profile | cross: media-diary | |

## Features

### F0 · Slovník a konzistence
Why: jedno jméno pro jednu věc. Bez toho se nedá orientovat ani věřit.
- [x] ISC-K1: Fronta, detail, AI karta i knihovna mají 4 rovnocenná tlačítka v tomto pořadí: Chci vidět · Viděl jsem · Nezajímá mě · Přeskočit. Pro knihy: Chci číst · Přečetl jsem · Nezajímá mě · Přeskočit.
- [x] ISC-K2: Anti: `messages/*.json` neobsahuje žádný z vyřazených názvů (Nechci vidět, Nechci číst, Prošlo nabídkou, Možná později, Viděno, Viděl).
- [x] ISC-K3: Stav `SEEN` se v UI jmenuje „Ukázáno“ a všechny stavy mají stejné jméno ve frontě, detailu, knihovně i na Tvém vkusu.
- [x] ISC-K4: Anti: Komponenty neobsahují natvrdo psaný uživatelský text („No poster“ apod.), všechno jde přes `messages`.
- [x] ISC-K5: Ikona srdce znamená jen jednu věc. „Chci vidět“ dostane vlastní ikonu (např. záložku), srdce zůstane oblíbeným tvůrcům.

### F1 · Navigace
Why: do tří vteřin vím, kde jsem, a každé místo je na jeden tap.
- [ ] ISC-K6: Spodní navigace má přesně 4 položky: Nabídka, Hledat, Knihovna, AI.
- [ ] ISC-K7: Popisky v navigaci mají ≥ 12 px a ikony odpovídají významu (Nabídka ≠ ikona filmu pro „Domů“).
- [ ] ISC-K8: Každá hlavní stránka má v hlavičce avatar, který otevře menu Tvůj vkus · Nastavení · Odhlásit.
- [ ] ISC-K9: Aktivní položka má vizuální stav a `aria-current="page"`.
- [ ] ISC-K10: Každá hlavní stránka má H1 shodné s názvem položky v navigaci.

### F2 · Knihy za vypínačem
Why: mrtvá funkce na hlavní ploše bere důvěru všemu ostatnímu.
- [x] ISC-K11: Při vypnutém flagu `NEXT_PUBLIC_BOOKS_ENABLED` zmizí záložky Filmy/Knihy z Nabídky, Hledání, AI, Knihovny i Tvého vkusu a stránky ukazují rovnou filmy.
- [x] ISC-K12: Onboarding má při vypnutých knihách jen krok s filmovými žánry.
- [ ] ISC-K13: Zapnutí flagu vrátí knihy všude, bez dalších úprav kódu.

### F3 · Nabídka
Why: rozhodnutí jedním pohybem, potvrzení, které nezdržuje, a konec várky jako odměna.
- [ ] ISC-K14: Na šířce 375 px jsou tlačítka rozhodnutí vidět bez scrollu, i u filmu s dlouhým popisem.
- [ ] ISC-K15: Karta ukazuje plakát, název (+ originál), rok, délku, žánry, TMDB/ČSFD, důvod a nejvýš 3 řádky popisu. Režie, scénář, hudba a obsazení jsou za „Víc“ nebo v detailu.
- [ ] ISC-K16: Gesto swipe na dotykové obrazovce uloží rozhodnutí (→ Chci vidět, ↑ Viděl jsem, ← Nezajímá mě, ↓ Přeskočit). Během tahu se ukazuje nápověda se jménem stavu a puštění pod prahem kartu vrátí.
- [ ] ISC-K17: Na desktopu fungují klávesy (← Nezajímá mě, → Chci vidět, ↑ Viděl jsem, ↓ Přeskočit, Z Vrátit) a nápověda se ukáže při prvním použití.
- [ ] ISC-K18: Po „Viděl jsem“ je jen 5 hvězd: tap na levou půlku dá půlhvězdu, na pravou celou, a hodnocení se rovnou uloží bez tlačítka Uložit. Slider a záložka 1–10 zmizí.
- [ ] ISC-K19: Poznámka a štítky jsou sbalené pod „Přidat poznámku“.
- [ ] ISC-K39: Anti: Existující hodnocení typu `SCALE` se zobrazují přepočtené na hvězdy (`normalizeToScale`) a žádný řádek se kvůli odstranění slideru nepřepíše.
- [ ] ISC-K20: Po rozhodnutí se na 4 s ukáže potvrzení „Uloženo: <stav> · Vrátit“ a nahradí dnešní holé tlačítko undo.
- [ ] ISC-K21: Anti: Gesto, potvrzení ani shrnutí nezpomalí další kartu nad 200 ms (master ISC-2).
- [ ] ISC-K22: Konec várky ukáže shrnutí sezení (počty podle stavu a ukazatel učení) a tlačítko „Další várka“, které načte novou frontu.
- [ ] ISC-K23: Anti: Žádný text neslibuje „zítra“ ani jiný čas, který appka nedodrží.
- [ ] ISC-K24: Fronta rozlišuje 4 render-stavy: skeleton při načítání, chybu s „Zkusit znovu“, konec várky a kartu.

### F4 · Důvěra
Why: vím, proč mi to appka nabízí, a vidím, že se učí z toho, co dělám.
- [ ] ISC-K25: Tři druhy důvodu (z vkusu, AI tip, objevování) mají odlišnou ikonu i barvu. Hvězdičky ✨ jsou vyhrazené pro AI.
- [ ] ISC-K26: Tap na důvod otevře „Proč tenhle film?“: u modelu top 1–2 váhy lidsky („Dáváš 8+/10 sci-fi z 80. let“), u AI tipu celý důvod, u objevování věta, že jde o záměrný krok mimo bublinu.
- [ ] ISC-K27: V Nabídce je nenápadný ukazatel učení „AI tě přepočítá za N rozhodnutí“. Po přepočtu se jednou ukáže „Tvůj vkus je aktualizovaný“ s odkazem.

### F5 · Knihovna
Why: přehled o tom, co mám, a rychlá odpověď na „co si dnes pustím“.
- [ ] ISC-K28: Knihovna má jednu řadu segmentů (Chci vidět · Viděl jsem · Nezajímá mě · Přeskočeno · Ukázáno · Vše) s počty. Výchozí je Chci vidět. Oblíbení tvůrci jsou samostatný segment, ne další úroveň.
- [ ] ISC-K29: Knihovnu lze řadit (naposledy přidané, moje hodnocení, rok) a hledat v názvech. Volba přežije přechod na detail a zpět.
- [ ] ISC-K30: Knihovna rozlišuje loading (skeleton mřížky), error, prázdný segment s výzvou k akci a naplněný segment.

### F6 · Hledat
Why: najít konkrétní film, rovnou vidět, jestli ho mám, a rozhodnout bez proklikání.
- [ ] ISC-K31: Hledání má debounce (≈ 250 ms) a zahazuje odpovědi starších dotazů.
- [ ] ISC-K32: Výsledek ukazuje můj stav (odznak) a nabízí rozhodnutí přímo na kartě výsledku.
- [ ] ISC-K33: Hledání má skeleton při načítání, stav „Nic nenalezeno“ a prázdný stav před prvním dotazem (např. naposledy hledané).

### F7 · AI asistent
Why: prázdný chat je zeď. Asistent má začít konverzaci sám.
- [ ] ISC-K34: Prázdný chat nabídne 3 ukázkové dotazy (aspoň jeden odvozený z AI profilu) a konverzace přežije přechod na jinou stránku a zpět během sezení.

### F8 · Tvůj vkus
Why: nejsilnější důkaz, že appka rozumí, je, když mi řekne, co si o mně myslí.
- [ ] ISC-K35: Stránka Tvůj vkus nahrazuje Statistiky a ukazuje top 5 žánrů a dekád z modelu (kladné i záporné), text AI profilu s datem přepočtu, rozložení mých hodnocení a počty podle stavů.

## Decisions

- 2026-11-01 — Kompas je samostatné ISA (`parent: media-diary`) a ne další F-blok v `ISA.md`. Master řeší, *co* se nabízí; Kompas, *jak* se to ukazuje. Zaměňovat je nebudu.
- 2026-11-01 — Revize vznikla z kódu a textů, ne z živého proklikání: Chrome rozšíření nebylo připojené a přihlášení přes Clerk dělá pepę sám. Nálezy o vizuálu (karta na mobilu, sticky lišta, kontrast) jsou proto hypotézy pro první browser průchod.
- 2026-11-01 — Statistiky se nerozšiřují, nahradí je Tvůj vkus. Tři čísla bez kontextu nedávají přehled ani důvěru.
- 2026-11-01 — Fog → rozhodnuto pepou: 4 rovnocenná tlačítka. Čtvrté se jmenuje *Přeskočit*, ne „Možná později“ (rozhodla MAI: „později“ slibuje návrat, který master ISA nemá). Gesto ve 4 směrech + klávesy na desktopu. Nastavení pod avatarem v hlavičce. Hodnocení jen hvězdami s půlkami přímo tapem, slider a 1–10 pryč.
- 2026-11-01 — refined: ISC-K11 — flag se jmenuje `NEXT_PUBLIC_BOOKS_ENABLED` (`src/lib/features.ts`), protože ho čtou klientské komponenty. Bez proměnné = knihy vypnuté. Onboarding při vypnutých knihách posílá `favoriteBookCategoryIds: undefined`, takže uložené kategorie v DB zůstanou.
- 2026-11-01 — Knihy se schovají za flag a nemažou se. Kód i data zůstávají, vrátí se jedním přepnutím.

## Verification

- ISC-K2: `rg "Nechci|Prošlo nabídkou|Možná později|Viděno|\"Viděl\"|Maybe later|In feed" messages/` → 0 výskytů.
- ISC-K4: `No poster`/`No cover` → `movie.noPoster`/`book.noCover`; `rg` v `src/components` bez dalších natvrdo psaných textů (kromě sr-only „Close“ v shadcn `ui/`).
- ISC-K5: `rg "\bHeart\b" src` → jen `favorite-person-button.tsx`; Chci vidět má `Bookmark` (rozhodovací tlačítka i odznak na stránce tvůrce).
- ISC-K3 (Chrome, přihlášený, 1512 px): knihovna ukazuje filtr i odznaky „Ukázáno (86)“, žádné „Prošlo nabídkou“.
- ISC-K11 (Chrome): `/`, `/discover`, `/ai`, `/library`, `/stats`, `/settings` bez záložky nebo tlačítka Knihy; Statistiky jen sekce Filmy, Nastavení jen „Upravit žánry“.
- ISC-K12 (Chrome): `/onboarding` má jeden krok s filmovými žánry, bez ukazatele kroků, tlačítko „Dokončit“.
- ISC-K1 (Chrome + Simulátor): fronta, karta v knihovně a detail filmu (`/cs/movie/1598`) mají Chci vidět · Viděl jsem · Nezajímá mě · Přeskočit. AI karta renderuje stejnou `DecisionButtons` (`ai-recommendation-card.tsx`), naživo jsem ji nepouštěl kvůli volání Claude.
- Build stav F0 + F2: `tsc --noEmit` čisté, eslint čistý, `bun test` 18 pass. ISC-K1, K3, K11–K13 jsou v kódu, čekají na průchod v prohlížeči (Clerk vrací nepřihlášenému curl 404).

## Remaining Work

- [x] ISC-K1: ověřit 4 tlačítka v detailu filmu a na AI kartě.
- [ ] ISC-K13: ověřit knihy s flagem `true` (potřebuje restart dev serveru s proměnnou).
- [x] Mobil v iOS Simulátoru (iPhone 16e, Safari, 390 px): Nabídka, Knihovna, Hledat a AI nafocené, karta i knihovna prorolované přes `idb` (`idb-companion` 1.7.7, brew trust jen na tuto formuli, pepę schválil 2026-11-01).
- [ ] Nález z mobilu: obsah při rolování jede pod stavový řádek iOS (text přes hodiny). Chybí pozadí nebo `safe-area-inset-top` nahoře. Patří do F1 (hlavička).
- [ ] Nález z mobilu: karty v knihovně mají 4 ikony bez popisků. Na dotyku se `title` nezobrazí, takže z ikon nepoznáš, co dělají ani který stav je aktivní. Patří do F5 (ISC-K28) a F0.
- [ ] Nález z mobilu: v knihovně se pořád ukazuje „8/10“ vedle hvězd. Hodnocení je tak na dvou škálách naráz, ověří to ISC-K39 při F3.
- [ ] Nález z mobilu: Nabídka ukazuje skeleton přes 7 s, než se objeví první karta. Patří do F3 (ISC-K24, stavy načítání) a stojí za změření.
- [ ] Nález z mobilu: popis filmu začíná těsně nad sticky lištou tlačítek a je z poloviny schovaný. Potvrzuje F3 (ISC-K15, kompaktní karta).
- [ ] Nález z mobilu: popisek „AI asistent“ se láme na dva řádky a 6 položek se do 390 px tak tak vejde. Potvrzuje F1 (ISC-K6, 4 položky).
- [ ] Nález z mobilu: Knihovna má nad první kartou tři řady přepínačů a odstavec, takže první karty začínají až ve 40 % výšky. Potvrzuje F5 (ISC-K28).
- [x] Dev ikonka Next.js („N“) zakrývala v Simulátoru položku Domů → `devIndicators: false` v `next.config.ts` (pepę schválil 2026-11-01).
- [ ] Nález z průchodu: přihlašovací stránka Clerku říká „Sign in to Body Vault“, anglicky a se jménem jiné appky. Clerk instance je sdílená, název appky se mění v Clerk dashboardu (dělá pepę).
- [ ] Nález z průchodu: odkazy spodní navigace nemají v a11y stromu jméno (čtečka slyší jen „odkaz“). Patří do F1 (ISC-K7).

- [ ] Potvrdit nebo vyvrátit vizuální nálezy F3 a F5 na mobilu (Simulátor) a 1280 px (Chrome).
