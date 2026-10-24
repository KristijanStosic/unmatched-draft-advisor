# Unmatched Draft Advisor — Netlify

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
