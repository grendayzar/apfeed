# Road Watch — Accident Professionals

An always-on wall display for the Sandy Springs office. It shows road-safety and
industry conditions for Georgia and the United States: a live running estimate of
today's crash toll, current driving conditions across five Georgia metros, active
National Weather Service alerts, crash volume by county, a rolling news wire, and a
rotating strip of Georgia injury-law facts.

Built as one static HTML file. No build step, no framework, no server.

---

## Run it

**On a screen, right now.** Open `index.html` in a browser and press `F` for
fullscreen. Everything except the news wire works straight from the file.

**On GitHub Pages** (recommended — the wire needs this):

1. Push this folder to a repository.
2. Settings → Pages → Source: **Deploy from a branch**, branch `main`, folder `/ (root)`.
3. Settings → Actions → General → Workflow permissions: **Read and write permissions**.
4. Actions tab → **Refresh wire** → **Run workflow** to fill the wire immediately.

The site lands at `https://<user>.github.io/<repo>/`. No Vercel needed — there is
nothing to build and nothing to run server-side.

**On the display itself.** Point any smart TV browser, Chromecast, Fire Stick or
Raspberry Pi at that URL and set the browser to fullscreen kiosk mode. The page
reloads itself every six hours and nudges its own pixels every four minutes so a
screen left on all day does not burn in.

Keys: `F` fullscreen · `R` force a data refresh.

---

## Where the numbers come from

**Live, fetched by the browser on a timer.** Both are keyless and allow
cross-origin requests, so they work from a plain static page.

| Panel | Source | Refresh |
|---|---|---|
| Driving conditions, five metros | Open-Meteo | 10 min |
| Active weather alerts, Georgia | api.weather.gov (NWS) | 5 min |

**Live, fetched by GitHub Actions.** Google News RSS blocks browsers but not
servers, so `.github/workflows/refresh.yml` runs `scripts/refresh.mjs` every 20
minutes, writes `data/live.json`, and commits it. The page just reads that file.

**Fixed, from published statistics.** These are hard-coded near the top of the
`<script>` block in `index.html` and are the figures behind the hero counters:

- 367,523 Georgia crashes in 2024 — Georgia Governor's Office of Highway Safety
- 1,307 Georgia road deaths in 2025, down from 1,403 — NHTSA preliminary
- 36,640 U.S. road deaths in 2025, a record-low rate of 1.10 per 100M VMT — NHTSA
- U.S. deaths 2019–2025 and county crash counts — NHTSA / GOHS

The hero counters divide those annual totals across the day and count up from
local midnight. The panel says so on screen: they are modelled estimates, not
live incident reports. Refresh the constants once a year when NHTSA publishes.

**The road-risk index is ours, not an official measure.** It blends live
precipitation, wind gusts, temperature, fog and thunderstorm codes, daylight, and
weekday rush hour into a 0–100 score. The weighting sits in the `roadRisk()`
function — adjust it freely, it is a house heuristic.

---

## Changing things

| Want to change | Where |
|---|---|
| Which headlines appear | `FEEDS` in `scripts/refresh.mjs` |
| How often the wire refreshes | `cron` in `.github/workflows/refresh.yml` |
| Cities in the conditions row | `METROS` in `index.html` |
| Counties shown | `COUNTIES` in `index.html` |
| Facts in the bottom ticker | `RIGHTS` in `index.html` |
| Annual statistics | `RATES`, `US_DEATHS` in `index.html` |
| Panel refresh timings | `CFG` in `index.html` |

Every panel keeps its last good data and falls back to the fixed statistics if a
feed fails, so nothing on the wall ever goes blank. The dot beside the clock reads
**Live** while at least one feed is answering and **Cached** when none are.

---

## Brand

Palette, type and structure follow `BRANDBOOK_ACC_ING`. Base `#000000`, principal
`#ffbd15`, complementary `#e29f0a` / `#f7daa1`, greys `#686867` / `#606060`.
Montserrat carries the page, which the brandbook names as the family alongside
Gotham; it is on Google Fonts, so nothing needs licensing for a screen.

Severity is shown by inverting to a solid amber block rather than by introducing a
red, since the manual lists off-palette colour as an incorrect use. The cut corners
come from the badge on the brandbook page furniture, and the thin rule with an
amber segment under each panel title is the footer rule from the same pages.

The two logo files are inlined into `index.html` as base64, so the file works on
its own with no missing images. Originals are in `assets/` if you need them for
anything else.

---

## Georgia legal facts on screen

The bottom ticker states Georgia's two-year limitation period, the 25/50/25
minimum liability limits, the 50% modified comparative negligence bar, and the
2025 SB 68 changes to seat-belt evidence and medical damages. These are general
statements of law for display, not advice on any case, and SB 68's provisions have
different effective-date rules. Have counsel read the strip before it goes on a
public-facing screen.
