# Unmatched Draft Advisor — Netlify

## Random Hero Generator

1. Otvori **Random Hero Generator** pored **Random Map Generatora**. Upiši naziv i klikni **Add Tier**.
2. Klikni slike heroja da ih dodaš u aktivni tier ili ukloniš iz njega. **Active tier** menja tier iz kog izvlačiš.
3. Izaberi **Spin the Wheel** ili **Hero Roulette** i pokreni izvlačenje. Oba režima dele istoriju aktivnog tiera. Svaki preostali heroj ima jednaku šansu, a animacija prikazuje unapred izvučenog pobednika.
4. **Reset Draw** briše istoriju samo aktivnog tiera i vraća sve njegove trenutne članove u izvlačenje. Tierovi i istorija čuvaju se u lokalnom skladištu pregledača.

Za lokalno pokretanje raspakuj ZIP i u folderu projekta pokreni `npm ci` i `npm run dev`. Za Netlify Drop možeš odmah da upotrebiš folder `dist/` iz ZIP-a.

## Hero vs Available Pool

U Matchup Exploreru izaberi zasebnu opciju **Hero vs Available Pool**, zatim heroja iz dropdowna. Tabela prikazuje Opponent, dinamičku kolonu `<selected hero> WR`, Opponent WR i Games. Protivnici su trenutno selektovani Available Heroes iz rostera, bez izabranog heroja i banova iz aktivnog simulatora (pre-ban, opponent ban i self-ban). Dropdown prikazuje samo heroje iz trenutnog Available Heroes poola, bez banovanih. Ako izabrani heroj više nije u poolu, prikaz se vraća na izbor heroja.

Rezultati koriste postojeći dvosmerni CSV indeks: Hero B perspektiva dobija preostale pobede, a Opponent WR je 100 minus WR izabranog heroja. Sortiranje je po neobrađenom WR opadajuće; nedostajući rezultati su poslednji i prikazuju N/A u obe WR kolone i Games. Promene rostera, banovi, Undo i Reset Draft osvežavaju pool. Izlazak iz simulatora resetuje njegove banove kao i sam simulator.

Select All i sve prethodne funkcije su zadržane. ZIP uključuje kompletan izvorni projekat, podatke, slike i spreman `dist/` build; `node_modules` nije uključen.

Provera ove verzije: `npm test` — 23/23 uspešno; `npm run build` — uspešno. `npm run lint` prijavljuje pet postojećih grešaka u neizmenjenim UI fajlovima (badge, button, card, dialog, input); izmenjeni fajlovi prolaze ESLint proveru.

## Pokretanje i build
Node.js 22.12+ (preporuka: Node 22 LTS).

    npm install
    npm test
    npm run build
    npm run preview

## Prvi deploy
Najlakše: raspakuj unmatched-netlify-dist.zip i prevuci raspakovani dist folder u Netlify Drop. U njemu mora biti index.html direktno na prvom nivou. Drop ne izvršava build.

Za Git deploy: postavi izvorni projekat u svoj repozitorijum, poveži ga sa Netlify, build komanda je npm run build, publish folder dist. netlify.toml već sadrži podešavanja. Fajlovi public/_headers i public/_redirects ulaze u dist i važe i za Drop i za Git deploy. SPA fallback ne prepisuje postojeće statičke fajlove.

## Buduće ažuriranje podataka
Samo vlasnik sa pristupom Netlify nalogu/repozitorijumu objavljuje promene:
1. Zameni public/data/hero-matchups-unmatched.csv i/ili public/data/hero-win-rates-unmatched.csv. Zadrži tačna imena, CSV kolone i format postojećih datoteka.
2. Pokreni npm run build (preporučeno i npm test).
3. Za Drop objavi ceo nov dist folder na ISTOM Netlify sajtu; za Git deploy commit/push pokreće novi build.
4. Posle završenog deploya osveži stranicu. Već otvorena stranica zadržava podatke u memoriji do ponovnog učitavanja.

CSV se učitava iz BASE_URL + data/ uz fetch cache: no-store. Za /data/* isključeni su browser i Netlify CDN cache; index.html se revalidira. CSV se ne čuva u localStorage; lokalno se čuva samo korisnikov roster. Statički sajt ne može da prepiše objavljene fajlove: svaka izmena CSV-a zahteva novi deploy. Posetioci mogu da čitaju javni CSV, ali nema javnog upload interfejsa ili backenda.

## Funkcije
Roster, Draft Simulator sa pre-banovima, preporukama i WR, generator mapa, Overall Statistics i Matchup Explorer su zadržani. Zaseban Draft/Pre-ban ekran i javna CSV upload dugmad su uklonjeni. Statistika aktivnog drafta ostaje u simulatoru.

- 4 heroja: po dva pre-bana, snake 1–2–2–2–1, opponent ban i self ban, završni 2v2. Potrebno najmanje 12 heroja u rosteru.
- 5 heroja: po dva pre-bana, snake 1–2–2–2–2–1, opponent ban i self ban, završni 3v3. Potrebno najmanje 14 heroja.
- 6 heroja: ručni pre-banovi pre početka, mora ostati najmanje 12 heroja, 12 naizmeničnih pickova, završni 6v6.

Undo i Reset Draft ostaju dostupni. Preporuke koriste postojeće formule i postojeće Overall WR fallback ponašanje.



## Matchup ratings (final project update)

Small colour-and-text badges appear in Hero vs Hero, Hero vs Available Pool (selected hero WR only), simulator matchup details, and opponent details in Statistics. The Close matchups view has one Balanced range header; low-sample results remain Unknown. A collapsed legend in Matchup Explorer explains every category. Aggregate WR and roster cards are unchanged.

Ratings use unrounded WR: Counter >75%; Favoured >60–75%; Slightly Favoured >55–60%; Balanced 45–55%; Slightly Losing 40–<45%; Losing 25–<40%; Nightmare <25%. Missing data or fewer than 4 games produces Unknown. Recorded WR and Games remain visible for small samples; missing data remains N/A. These are descriptive result bands, not guarantees.

Validation: 26/26 tests pass; production build passes; ESLint passes for all changed/new files. Browser visual verification was unavailable because the embedded browser could not reach the local app.
