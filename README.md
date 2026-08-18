# BASELINE — build a tennis player, then play the season

A build-a-player game in the spirit of the "build a hooper" wheel, but for tennis, with a
full season simulation bolted on behind it.

## How it plays

**1 — Build.** You have eight attribute slots: serve, forehand, backhand, return, movement,
net play, stamina, mental. The wheel lands on a player from a pool of legends, specialists
and current tour names. You take **exactly one** of their eight ratings and that player is
gone from the pool — so Sinner's backhand costs you his return, and Isner's serve costs you
everything else he has. **Three respins for the whole build.**

**2 — Play.** Your player joins the tour ranked outside the top 100, which means qualifying
draws before you see a main draw. The calendar runs four Grand Slams (best of five), nine
Masters 1000s, two ATP 500s and the Tour Finals. Enter or skip each week — skipping costs
points but recovers your legs.

**3 — Keep going.** Ranking points roll off after 52 weeks, so last season's title has to be
defended. Between seasons you age (up until about 26 it helps, after 30 it doesn't) and get
a handful of training points to spend.

**4 — Retire.** There's no forced ending — attributes just keep declining with age — but you
can call it from the hub or the off-season screen whenever you want. Retiring judges the
career against seven tiers (Journeyman up through GOAT Territory) based on Slams, Masters,
weeks at No. 1 and best ranking, and clears that save slot. Building a new player is the
replay loop.

## Running it

It's a static site with no build step and no dependencies:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

Up to three careers save to `localStorage` at once, under `baseline.career.slot1.v1` through
`.slot3.v1`. Manage them from the "Your careers" screen off the home page.

## Deploying

There is no build step — Vercel serves the repo root as a static site as-is.
A Vercel project (`baseline-tennis`) is already created and linked to this
repository; connecting a deployment is a single click in the dashboard, or
from a checkout:

```bash
npx vercel --prod
```

`standalone.html` is the whole game inlined into one file — open it directly
from disk with no server, or host it anywhere that serves a single HTML file.
Regenerate it after changing any source file:

```bash
node tools/build-standalone.js
```

## How the simulation works

The match engine is a **point-level Markov chain** — the standard approach in open-source
tennis simulators, and the same maths behind published serve/return win-probability models.

1. Each player's ratings collapse into three indices — **serve**, **return**, **rally** —
   using per-surface weights. The weights change what matters: clay leans on movement and
   stamina, grass leans on the first strike.
2. Those indices give a probability that the server wins a single point:

   ```
   p = base(surface)
     + serveInfluence(surface) * (serverServeIndex - tourMean)
     - returnInfluence(surface) * (returnerReturnIndex - tourMean)
     + rallyInfluence(surface) * (serverRally - returnerRally)
   ```

   Base hold value and the two influence terms are what make a surface specialist: serve
   quality is worth most on grass and least on clay, return quality the other way round.
3. Points walk into games (with deuce), games into sets, sets into tiebreaks and matches.
   Break points and tiebreak-end points are flagged as "big" and get a clutch adjustment
   from the mental rating; a stamina edge slowly compounds as the point count climbs.
4. Day-to-day form jitter — plus a ~7% chance either player simply turns up flat — is what
   produces upsets.

Calibration targets, checked against the model: serve points won lands near 64% on hard,
63% on clay and 69% on grass; a world No. 1 beats a top-20 player about 87% of the time
and someone ranked ~50 about 94%.

Draws are seeded properly (standard bracket order, top 8 placed, the rest drawn at random).
Rankings are a genuine 52-week roll — points sit in the event slot they were won in and are
replaced only when that event comes round again.

## Layout

| File | What's in it |
| --- | --- |
| `js/data.js` | Ratings, the spin pool, the calendar, points tables |
| `js/engine.js` | RNG, match simulation, draws, tournaments, rankings, ageing |
| `js/game.js` | The builder, career state, entries, qualifying, saves |
| `js/ui.js` | Screens, spin animation, match playback, brackets |

## Notes

Unofficial fan project, not affiliated with any tour, event or player. Ratings are one
person's opinion expressed as numbers, and no more than that.

## Getting the site into search results

Being deployed is not the same as being indexed. The markup is already in place —
canonical URL, Open Graph, Twitter cards, `VideoGame` JSON-LD, `robots.txt`,
`sitemap.xml`, and a crawlable text footer describing the game. What is missing is
*discovery*: search engines have no reason to visit a brand-new URL that nothing
links to.

**Google** — the only path is Google Search Console. Verify ownership of
`baseline-tennis-tau.vercel.app`, submit `sitemap.xml`, then use the URL Inspection
tool on `https://baseline-tennis-tau.vercel.app/` and press *Request Indexing*.
Expect days to weeks, not minutes.

**Bing / DuckDuckGo / Yahoo / Ecosia** — these accept IndexNow, which needs no
account. The key file `7887e9d8bc6f10bdf4380920d4363287.txt` is served from the site
root, so opening this URL in a browser submits the page:

```
https://api.indexnow.org/indexnow?url=https://baseline-tennis-tau.vercel.app/&key=7887e9d8bc6f10bdf4380920d4363287
```

A `200` or `202` response means it was accepted.

**Inbound links matter more than either.** One link from a page that already gets
crawled — a Reddit post, a Discord with link previews on, a school page, a YouTube
description — is what usually triggers first discovery.
