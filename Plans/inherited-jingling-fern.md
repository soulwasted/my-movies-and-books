# Plán: UX/UI revize Media Diary → nové ISA `ISA-kompas.md`

## Context

Master `ISA.md` řeší *chytrost* nabídky (model vkusu, AI profil, historie). Nikdo ale neřešil, jestli se v appce dá orientovat, jestli je objevování zábava a jestli uživatel výsledkům věří. pepę chce revizi ze dvou pohledů (UI/UX kritik + uživatel, který chce objevovat, mít přehled o knihovně, věřit výsledkům, orientovat se, jednoduše navigovat) a z ní nové ISA.

Revize vznikla z kódu a textů (`messages/cs.json`, `src/components/*`, `src/app/[locale]/*`). Živé proklikání neproběhlo: Chrome rozšíření není připojené a přihlášení přes Clerk dělá pepę sám. Proto má ISA v Test Strategy browser kontrolu, kterou spustíme jako první krok buildu.

**Jméno:** `ISA-kompas.md`, slug `media-diary-kompas`. Kompas = orientace + objevování, dvě věci, které revize řeší. Master `ISA.md` zůstává pravdou pro chytrost, Kompas pro chování a rozhraní.

## Nálezy revize (to, co ISA převede na ISC)

### Kritické
1. **Rozhodnutí mají tři různá jména a ISA lže.** `decision-buttons.tsx` (necommitnuté) ukazuje 4 rovnocenná tlačítka *Chci vidět / Viděl jsem / Nechci vidět / Možná později*. Master ISA má ISC-10 `[x]`: „3 tlačítka + odkaz Přeskočit, Nezajímá mě“. Knihovna píše *Nezajímá mě, Přeskočeno*, `swipe.*` má nepoužívané *Viděl, Přeskočit*. Ten samý stav má tři názvy a ověřené kritérium neplatí.
2. **Navigace má 6 položek s popisky 10 px** (`app-nav.tsx`). Statistiky a Nastavení jsou vedle denních akcí. „Objevovat“ je ve skutečnosti jen vyhledávání; objevuje se na „Domů“. Ikona Film u „Domů“.
3. **Knihy jsou mrtvé, ale na hlavní ploše.** Google Books vrací 403, přitom záložka Knihy je na Domů, v Hledání, v AI, v Knihovně, ve Statistikách a v onboardingu (povinné 3 kategorie). Je to slepá ulička na nejviditelnějším místě.
4. **Knihovna má tři úrovně navigace a duplicity.** Filmy/Knihy/Lidé → Historie/Viděno/Chci vidět → filtrační chipy (zase Viděno, Chci vidět…). Výchozí je Historie (surový log), ne „Chci vidět“, kam člověk jde s otázkou „co si dnes pustím“. Chybí řazení, hledání a filtr podle hodnocení.

### Důvěra
5. **Každý důvod má stejnou ikonu ✨** (`ReasonChip`), takže se AI tip nedá odlišit od důvodu z modelu („Sedí tvému vkusu“) ani od objevování. Důvod se nedá rozkliknout („Proč?“).
6. **Učení není vidět.** Model se přepočítává a AI profil vzniká po 20 rozhodnutích, ale uživatel o tom neví. Profil (text vkusu) se nikde nezobrazuje, ačkoliv je to nejsilnější důkaz, že appka rozumí.
7. **Konec fronty slibuje nepravdu.** „Pro dnešek to stačí, zítra přidáme další!“ + tlačítko „Zkusit znovu“, přitom fronta se přepočítá hned při dalším načtení.
8. **„Prošlo nabídkou“** (stav SEEN) je technický pojem, uživatel ho nepochopí.

### Plynulost a zábava
9. **„Swipe · hodnoť · objevuj“, ale gesto swipe neexistuje**, jsou jen tlačítka (framer-motion dělá jen fade). Na desktopu nejsou klávesové zkratky.
10. **Karta ve frontě je dlouhý dokument**: popis, režie, scénář, hudba, celé obsazení. Na mobilu odsouvá rozhodnutí pod sticky lištu. Potřebuje hierarchii: plakát, název, rok, žánry, hodnocení, důvod, 3 řádky popisu, „Víc“.
11. **„Viděl jsem“ otevře dialog** s volbou Hvězdičky/1–10, poznámkou a štítky při každém kliknutí. Hodnocení má být na jeden tap, zbytek sbalený a preferovaná škála zapamatovaná.
12. **Po rozhodnutí chybí potvrzení**, co se uložilo. Undo je jen tlačítko na 12 s bez kontextu.
13. **Konec várky není odměna.** Chybí shrnutí sezení („12 rozhodnutí, 3 do Chci vidět, AI profil se přepočítá za 4“).

### Hledání, AI, statistiky, nastavení
14. **Hledání** (`discover-client.tsx`) volá API na každý stisk bez debounce, takže starší odpovědi přepisují novější. Loading je „…“, prázdný výsledek nemá stav a výsledek neukazuje, jestli film už mám ani jak se rychle rozhodnout.
15. **AI chat** začíná prázdnou plochou a tlačítkem bez ukázkových dotazů. Historie zmizí při odchodu ze stránky.
16. **Statistiky** jsou tři čísla. Mělo by to být „Tvůj vkus“: top žánry a dekády z modelu, AI profil, rozložení hodnocení. Spojuje důvěru (bod 6) s přehledem.
17. **Nastavení**: „Upravit žánry“ i „Upravit knižní kategorie“ vedou na stejný krok 1 onboardingu. Jazyk je jako Badge. Odhlášení je velké červené tlačítko. 10 stylů loaderu je hezká hračka, ale šum.

### Konzistence a přístupnost
18. **❤️ znamená dvě věci**: „Chci vidět“ i „oblíbený tvůrce“.
19. Ikonová tlačítka v mřížce knihovny mají jen `title`. Na mobilu je skrytý popisek „Nahlásit chybu“. Natvrdo je „No poster“ a anglický název „Media Diary“ v české appce.

## Struktura nového ISA (`ISA-kompas.md`, 17 sekcí podle ISA skillu)

- **Frontmatter:** task „Media Diary: orientace, důvěra a radost z objevování“, phase `climbing`, progress 0/N, `principal_stated_goal` = pepova věta z této konverzace.
- **Problem / Vision:** do 3 s vím, kde jsem a co tu dělám. U každé karty vím, proč tu je. Vidím, že se appka učí. Konec várky je odměna, ne zeď.
- **Out of Scope:** nový design systém, nativní appka, změny modelu vkusu (patří do master ISA), sociální funkce.
- **Language:** kanonická slovníková tabulka rozhodnutí (jedno jméno na stav napříč frontou, detailem, knihovnou a statistikami) + *Nabídka, Várka, Důvod, Tvůj vkus*.
- **Principles:** jedno jméno pro jednu věc; důvod před doporučením; učení musí být vidět; mrtvé funkce se schovají, ne zobrazí; rozhodnutí na jeden tap.
- **Features → ISC** (zhruba 30 kritérií, každé binárně ověřitelné):
  - F0 Slovník a konzistence (body 1, 8, 18, 19) + anti: žádný stav nemá dvě jména.
  - F1 Navigace: 4 položky Nabídka · Hledat · Knihovna · AI, popisky ≥ 12 px, Vkus + Nastavení přes hlavičku/profil (body 2, 17).
  - F2 Knihy schované za flag, dokud Google Books neodpoví 200 (bod 3).
  - F3 Nabídka: hierarchie karty, gesto + klávesy, rychlé hodnocení, potvrzení s undo, konec várky se shrnutím (body 7, 9–13).
  - F4 Důvěra: typy důvodů vizuálně odlišené, „Proč?“ rozklik, indikátor učení (body 5, 6).
  - F5 Knihovna: jedna úroveň, výchozí Chci vidět, řazení + hledání (bod 4).
  - F6 Hledat: debounce + zahazování starých odpovědí, stavy loading/prázdno, odznak stavu a rychlé rozhodnutí u výsledku (bod 14).
  - F7 AI: ukázkové dotazy z profilu, historie přežije navigaci (bod 15).
  - F8 Tvůj vkus: náhrada Statistik (bod 16).
- **Not yet specified (fog s mým doporučením):**
  - Kanon rozhodnutí: 4 rovnocenná (současný kód) vs. 3 + odkaz Přeskočit (master ISA). Doporučuji 3 + odkaz, protože „Možná později“ jako rovnocenné tlačítko ředí signál, přesně jak to tvrdí master ISA.
  - Gesto swipe ano/ne. Doporučuji ano na mobilu, šipky na desktopu.
  - Kam s Nastavením: avatar v hlavičce, nebo položka uvnitř „Vkus“.
- **Test Strategy:** tabulka isc/type/check/threshold/tool. Typy `ui` (browser read_page), `grep` (texty v `messages/*.json`), `bun-test` (debounce/race v hledání), `e2e` (konec várky).
- **Decisions:** 2026-11-01, revize z kódu, živé proklikání čeká na Chrome + login.
- **Learning, Verification, Remaining Work:** Learning začíná prázdný. Remaining Work obsahuje první krok „projít appku v prohlížeči a potvrdit/vyvrátit nálezy 9–14“.

## Kroky

1. Načíst `Skill("ISA")` a jeho šablonu (`~/.claude/skills/ISA/`), aby sekce a formát ISC seděly s master `ISA.md`.
2. Napsat `/Users/swd/DEV/MY-Books-and-movies/ISA-kompas.md` podle struktury výše. Česky, ISC očíslované od ISC-K1, aby se nepletly s master ISC.
3. V master `ISA.md` jen aditivně:
   - do `## Decisions` řádek, že UX/UI chování vede `ISA-kompas.md`;
   - u ISC-10 poznámku o rozporu s kódem (neodškrtávat, nepřepisovat, jen upozornit).
4. Bez commitu a bez změn kódu. Kód se mění až po pepově rozhodnutí fogu.

## Ověření

- `ISA-kompas.md` má všech 17 sekcí v pořadí master ISA (`grep '^## '` porovnat s `ISA.md`).
- Každý nález 1–19 má aspoň jedno ISC (křížová kontrola v Test Strategy, sloupec `anchors_to`).
- Každé ISC je binární a má nástroj v Test Strategy.
- `git diff ISA.md` ukazuje jen přidané řádky.
