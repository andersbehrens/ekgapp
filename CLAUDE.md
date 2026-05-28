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

## Anatomiska landmärken

- Statisk vy, zoomar direkt till `VB_LANDMARKS` (bröstkorgsområdet)
- Klickbara linjer/punkter öppnar informationskort i panelen nedtill
- Koordinater för linjerna baseras på samma SVG-koordinatrymb som elektroderna

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
# Bumpa CACHE_NAME i sw.js (t.ex. v23 → v24)
git add index.html sw.js
git commit -m "beskrivning"
git push origin main
# GitHub Pages deployar automatiskt från main-branchen
# Testa i inkognitoläge: https://andersbehrens.github.io/ekgapp/
```
