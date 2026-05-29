# EKG Träning — CLAUDE.md

PWA för EKG-elektrodplacering, riktad till sjuksköterskestudenter.
Deployad på: `https://andersbehrens.github.io/ekgapp/`
Repo: `https://github.com/andersbehrens/ekgapp`

---

## Arkitektur

Hela appen är **en enda fil**: `index.html` innehåller all HTML, CSS och JavaScript.
Ingen byggprocess, inga dependencies, inga npm-paket.

- `sw.js` — service worker, versionshanterar cache (bumpa `CACHE_NAME` vid varje deploy)
- `manifest.json` — PWA-manifest för hemskärmsinstallation
- `body.jpg` — Wikipedia CC BY 3.0, 1069×1769px, används i alla lägen
- `body-clean.jpg` — version med röda markeringspunkter bortplockade (inpaint.py), används ej aktivt just nu
- `icons/` — app-ikoner genererade via `generate-icons.html`

---

## Koordinatsystem

SVG-koordinatrymden är **320×530 enheter**. Bilden placeras alltid som:
```html
<image href="body.jpg" x="0" y="0" width="320" height="530" preserveAspectRatio="xMidYMid meet"/>
```

body.jpg är 1069×1769px. Proportionerna 320:530 ≈ 1069:1769 (≈0.604) — bilden fyller rymden utan letterboxing.

Elektrodpositionerna **kalibrerades via Python PIL** (se `inpaint.py`) genom att hitta de röda prickarna i originalbilden och skala till SVG-rymden. Ändra inte dessa koordinater utan att mäta om mot bilden.

### ViewBox-konstanter
```javascript
const VB_FULL      = [40, 0, 240, 490];    // helkropp (standard)
const VB_TORSO     = [108, 32, 138, 125];  // zoom bröstkorgen (V1–V6)
const VB_LANDMARKS = [65, 55, 200, 200];   // zoom för anatomiska landmärken
```

SVG-elementen har `width="320" height="530"` som HTML-attribut — detta låser deras layoutstorlek oberoende av viewBox, vilket krävs för att zoom-animationen ska fungera på iOS utan layout-reflow.

### Zoom-animation
`_animateVB(svgId, target, ms)` — interpolerar viewBox med ease-in-out via `requestAnimationFrame`.
`_zoomFor(svgId, electrode)` — väljer VB_TORSO för V-avledningar, annars VB_FULL.

---

## ELECTRODES-arrayen

Ordningen spelar roll i träningsläget (V4 placeras före V3 — klinisk standard).

```javascript
const ELECTRODES = [
  { id, label, color, desc, hint, x, y }
  // Extremiteter: RA, LA, RL, LL
  // Bröstavledningar: V1, V2, V4, V3, V5, V6
]
```

- `label` — visas som rubrik i träningskortet (extremiteter: "Röd elektrod" etc.)
- `desc` — anatomisk plats, visas under rubriken
- `hint` — extra ledtråd, visas i grått under desc
- `color` — hex-färg, styr cirkelns färg i träning + prickens färg i testinstruktion

---

## Träningsläget

- Visar en elektrod i taget (CSS `data-state`: `active` | `done` | `future`)
- Placerade elektroder → liten grön punkt; aktiv → pulserande blå cirkel
- CSS styr synlighet: `svg[data-mode="train"] .electrode-target[data-state="future"] { opacity:0 }`
- Instruktionskort visas **ovanför** SVG-bilden

## Testläget

- Slumpad ordning: extremiteter först, sedan bröstavledningar
- Instruktion: extremiteter = "Placera den gula elektroden" (färg+prick), bröstavledningar = "Placera V3"
- **Nearest-centre-logik**: en enda `pointerup`-lyssnare på hela SVG:n konverterar trycket till SVG-koordinater och hittar närmaste oplacerade elektrodcentrum. Löser överlappsproblem för V1–V6 och tillåter att man gör fel
- Godkänt = 0 fel; underkänt = ≥1 fel. Alla elektroder måste placeras rätt på första försöket
- Använder `body.jpg` (inte body-clean.jpg) tills bättre inpainting finns

## Quiz

- 10 flervalsfrågor om EKG-teori (anatomi, färger, placering)
- Fråga 8 visar en SVG-bild med midklavikulärlinjen markerad (inline SVG med body.jpg)
- Godkänt = 0 fel; underkänt = ≥1 fel. Alla frågor måste besvaras rätt på första försöket
- `quiz_perfect`-achievement låser upp stjärna på startsidan
- `QUIZ_QUESTIONS`-arrayen: `{ q, opts[], correct, image? }`

---

## Kända fallgropar

**Service worker-cache**: Bumpa alltid `CACHE_NAME` i `sw.js` vid deploy, annars ser användare gammal version. Testa alltid i inkognitoläge på telefon.

**Dubbel-tap på mobil**: Använd `pointerup` (inte `click`+`touchend`) för tap-hantering i testläget. `touchend` + `click` avfyrar båda på iOS och ger dubbel-räkning.

**SVG-höjd på iOS**: SVG-elementen måste ha `width="320" height="530"` som HTML-attribut. Utan detta beräknar iOS layouthöjden från viewBox-proportionerna, vilket ger layout-reflow vid zoom-animationen.

**JS-referenser till borttagna HTML-element**: Om du tar bort ett element ur HTML, sök igenom JS efter `getElementById` på samma id och ta bort dessa rader. Annars kraschar funktionen tyst (returnerar null → TypeError) utan att visa felmeddelande.

**`100vh` på iOS Safari**: Inkluderar area under webbläsarens adressfält. Använd `100dvh` (dynamic viewport height) för `max-height` på element som ska passa skärmen.

---

## Deploy-process

```bash
# Bumpa CACHE_NAME i sw.js (t.ex. v24 → v25)
git add index.html sw.js
git commit -m "beskrivning"
git push origin main
# GitHub Pages deployar automatiskt från main-branchen
# Testa i inkognitoläge: https://andersbehrens.github.io/ekgapp/
```

---

## Manuell testchecklista

Kör igenom dessa scenarios i **inkognitoläge på mobil (iOS Safari)** efter varje deploy. Inkognito säkerställer att service worker-cachen är ren.

### Startsida
- [ ] Appen laddas och startsidan visas utan fel
- [ ] Stjärnorna visas som tomma (☆) om inga achievements är upplåsta
- [ ] Stjärnorna visas som fyllda (★) med gul bakgrund om achievements är upplåsta

### Träning
- [ ] Träningsknappen öppnar träningsskärmen
- [ ] Korten visas ovanför kroppen med rätt elektrodnamn ("Röd elektrod" etc.)
- [ ] Varje elektrod zoomar in/ut korrekt — bröstavledningar zoomar till bröstkorgen, extremiteter visar helkropp
- [ ] Zoom-animationen orsakar inget layout-hopp (fötterna ska inte försvinna)
- [ ] Placerade elektroder visar grön prick; aktiv elektrod pulsar blått
- [ ] Genomförd träning (alla 10) går tillbaka till startsidan utan fel

### Test
- [ ] Testknappen öppnar testskärmen med instruktion överst
- [ ] Instruktionen visar rätt färg/elektrod beroende på om det är extremitet eller bröstavledning
- [ ] Man kan trycka fel — fel registreras och rätt position markeras grönt ändå
- [ ] Man kan inte trycka på samma elektrod två gånger
- [ ] V1–V6 kan tryckas nära varandra utan att fel elektrod väljs (nearest-centre-logik)
- [ ] "Tryck igen"-knappen startar om testet med ny slumpad ordning och nollställer felräknaren
- [ ] Godkänt-skärm visas vid 0 fel; underkänt vid ≥1 fel
- [ ] Stjärnan för Test tänds på startsidan efter godkänt test

### Quiz
- [ ] Quizknappen öppnar quizskärmen med fråga 1 av 10
- [ ] Rätt svar markeras grönt, fel svar markeras rött, sedan går det automatiskt vidare
- [ ] Man kan inte klicka igen efter svar (knapparna inaktiveras)
- [ ] Fråga 8 visar en bild med en markerad linje
- [ ] Resultatskärmen visar rätt antal fel
- [ ] "Försök igen" nollställer allt och börjar om från fråga 1
- [ ] Stjärnan för Quiz tänds på startsidan efter godkänt quiz (0 fel)

### Allmänt
- [ ] Tillbaka-pilen (‹) från alla skärmar tar tillbaka till startsidan
- [ ] Appen fungerar offline efter första laddning (stäng av WiFi och ladda om)
- [ ] Inga JavaScript-fel i konsolen (Safari → Develop → Web Inspector)
