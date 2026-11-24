# Kjøreklar

En app som gjør deg klar til oppkjøring for klasse B. Den dekker alt fra skilt og vikepliktregler til krevende trafikksituasjoner som påkjøring på motorveg, glidelås og forbikjøring. Alt er laget for norske regler og forhold.

## Innhold

| Del | Hva du får |
| --- | --- |
| **Lær** | 16 moduler som dekker pensum: grunnregler, vegoppmerking, vikeplikt, rundkjøring, motorveg, feltskifte og glidelås, fart og stopplengde, myke trafikanter, forbikjøring, mørke og vilt, vinter, kjøretøyet, ulykke, miljø, parkering og selve oppkjøringen. Hver modul har «Husk»-punkter og «Sensor ser etter». |
| **Skilt** | Over 50 norske skilt tegnet som vektorgrafikk, med betydning og hva du skal gjøre. |
| **Øv** | Over 160 spørsmål med forklaring. Repetisjonen er spredt i tid, slik at spørsmål du kan kommer sjeldnere og feil kommer raskt igjen. Det finnes også en teoriprøve med 45 spørsmål og maks 7 feil. |
| **Trafikkbilder** | 14 situasjoner tegnet ovenfra: hvem kjører først, og hva gjør du? |
| **Kjør** | En 3D-simulator med 10 kjøreøvelser (se under). |
| **Sikkerhetskontroll** | 26 typiske sensorspørsmål om lys, dekk, bremser, motorrom, styring, sikt og utstyr. Du kan trekke spørsmål tilfeldig, slik sensor gjør. |
| **Oppkjøringen** | Hva som skjer på prøvedagen, en sjekkliste og en **prøveoppkjøring**: sikkerhetskontroll og tre kjøreøvelser uten tips, med samlet vurdering til slutt. |

Fremgangen lagres lokalt i nettleseren (localStorage).

## Kjøresimulatoren

- **Førerperspektiv** med A-stolper, dashbord og ratt. Du kan bytte til kamera bak bilen eller ovenfra.
- **Ekte speil:** innvendig speil og sidespeil viser hva som faktisk er bak deg. **Blindsonen er reell**, så en bil ved siden av deg ses bare med skulderblikk.
- **Trafikk som reagerer på deg:** bilene følger IDM-modellen (Intelligent Driver Model). De skifter felt med blinklys, slipper inn annenhver i glidelås og stopper for gående. Noen gjør plass for deg ved påkjøring, andre gjør det ikke.
- **Sensorvurdering:** etter hver øvelse får du en kjøreprotokoll med *bra*, *anmerkning*, *alvorlig* og *farlig*. Den sorteres etter kompetanseområde (observasjon, kommunikasjon, plassering, fart, samhandling, vikeplikt og risiko) og forklarer hvorfor.

| Øvelse | Hva vurderes |
| --- | --- |
| Høyreregelen i boligfelt | Vikeplikt fra høyre, fart ved skjult sikt og nøling når du har forkjørsrett |
| Gangfelt og skjult sikt | Vikeplikt for gående, fart forbi parkerte biler og stopplassering |
| Rundkjøring med trafikk | Vikeplikt inn, fart, blinklys ut, riktig avkjøring og gående ved utkjøring |
| Glidelås | Brukte feltet helt fram, annenhver, blinklys og skulderblikk |
| Påkjøring på motorveg (lett, middels, tett) | Fart inn, luke foran og bak, speil, blinklys, skulderblikk og sperreområde |
| Avkjøring fra motorveg | Ikke brems i motorvegfeltet, tidlig skifte til retardasjonsfeltet og rampefart |
| Forbikjøring av traktor | Sperrelinje, margin til møtende, fartsgrense og innkjøring foran |
| Mørkekjøring og elg | Fjernlys, avblending og reaksjon på vilt |

### Kontroller

| Handling | Tastatur | Mobil |
| --- | --- | --- |
| Gass / brems | ↑ / ↓ (W / S) | GASS / BREMS |
| Styring | ← / → (A / D) | Dra i rattfeltet |
| Blinklys venstre / høyre | Q / E | ◀ Blink / Blink ▶ |
| Speilsjekk | R | Speil |
| Skulderblikk venstre / høyre | hold Z / C | hold Skulder |
| Fjernlys (mørkekjøring) | F | Fjernlys |
| Kamera, pause, horn | V, P, H | Knapper øverst |

Gamepad støttes også: venstre stikke styrer, RT/LT er gass og brems, og LB/RB er blinklys.

## Kjøre appen

Den trenger ingen bygging. Åpne `index.html` gjennom en enkel webserver:

```bash
python3 -m http.server 8000
# åpne http://localhost:8000
```

Eller bruk den ferdigpakkede enkeltfilen `dist/kjoreklar.html`, som kan åpnes direkte i nettleseren.

Three.js (r128) lastes fra cdnjs. Simulatoren krever WebGL.

### Bygge enkeltfil

```bash
python3 tools/build.py              # dist/kjoreklar.html
python3 tools/build.py --fragment   # dist/kjoreklar-fragment.html (uten html/head/body)
```

## Struktur

```
index.html            app-skall og navigasjon
css/style.css         design (lys og mørk modus)
js/data/              signs.js, modules.js, questions.js, situations.js, safety.js
js/sim/core.js        baner, veggeometri og 3D-modeller (biler, skilt, trær, hus)
js/sim/engine.js      fysikk, trafikk-AI, speil og blindsone, HUD, kjøreprotokoll
js/sim/scenarios.js   de 10 kjøreøvelsene med vurderingsregler
js/app.js             visninger, quiz, fremgang og prøveoppkjøring
tools/build.py        pakker alt i én fil
```

## Ansvarsfraskrivelse

Appen er et øvingsverktøy og erstatter ikke opplæring hos trafikkskole. Regler kan endres. Sjekk alltid oppdatert informasjon hos Statens vegvesen.
