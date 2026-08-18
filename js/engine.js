/* ============================================================================
   BASELINE — simulation engine
   The match model is a point-level Markov chain, the approach used by most
   open-source tennis simulators: derive a serve-point win probability from the
   two players' ratings, then walk games -> tiebreaks -> sets from it. Everything
   above that layer (draws, seeding, points, rankings) is bookkeeping.
   ==========================================================================*/

/* --- deterministic RNG so a save file replays identically ---------------- */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
let RNG = mulberry32(Date.now() % 2147483647);
function setSeed(seed) { RNG = mulberry32(seed); }
function rnd()            { return RNG(); }
function rndInt(n)        { return Math.floor(RNG() * n); }
function pick(arr)        { return arr[rndInt(arr.length)]; }
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = rndInt(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
// normal-ish noise without the tails
function jitter(spread) { return (RNG() + RNG() + RNG() - 1.5) * spread; }

/* --- player construction ------------------------------------------------ */
let _uid = 1;
function makePlayer(name, country, attrs, opts = {}) {
  return {
    id: opts.id || ('p' + (_uid++)),
    name, country,
    hand: opts.hand || 'R',
    bh: opts.bh || 2,
    age: opts.age || (21 + rndInt(11)),
    attrs: Object.assign({}, attrs),
    isUser: !!opts.isUser,
    form: 1.0,           // 0.93 - 1.07, drifts week to week
    fatigue: 0,          // 0 - 100, shaves stamina-linked output
    res: {},             // points won this season, by event id
    prev: {},            // last season's points, for the 52-week roll
    career: { titles: 0, slams: 0, masters: 0, finals: 0, w: 0, l: 0, weeksNo1: 0, prize: 0, bestRank: 999 },
    season: { w: 0, l: 0, titles: 0 },
    history: []
  };
}

function buildTour(TOUR_RAW) {
  return TOUR_RAW.map(r => makePlayer(r[0], r[1], {
    serve: r[4], forehand: r[5], backhand: r[6], ret: r[7],
    movement: r[8], net: r[9], stamina: r[10], mental: r[11]
  }, { hand: r[2], bh: r[3] }));
}

// fills the bottom of the rankings so there is always someone to qualify against
function buildJourneymen(count, FIRST_NAMES, LAST_NAMES, COUNTRIES) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const base = 62 - Math.floor(i / 6);
    const a = {};
    ['serve','forehand','backhand','ret','movement','net','stamina','mental']
      .forEach(k => { a[k] = clamp(Math.round(base + jitter(9)), 40, 82); });
    out.push(makePlayer(
      pick(FIRST_NAMES) + ' ' + pick(LAST_NAMES),
      pick(COUNTRIES), a, { hand: rnd() < 0.14 ? 'L' : 'R', bh: rnd() < 0.2 ? 1 : 2 }
    ));
  }
  return out;
}

/* --- rating -> match indices -------------------------------------------- */
function effAttrs(p) {
  const f = p.fatigue || 0;
  const tired = 1 - (f / 100) * 0.13;                     // legs go first
  const formMul = p.form || 1;
  const out = {};
  for (const k in p.attrs) {
    let v = p.attrs[k] * formMul;
    if (k === 'movement' || k === 'stamina') v *= tired;
    else v *= (1 - (f / 100) * 0.05);
    out[k] = v;
  }
  return out;
}

// Per-surface weight sets. Each set sums to 1 so index magnitudes stay
// comparable across surfaces — the surface changes *what matters*, while the
// base hold rate below changes *how much* serving is worth.
const W = {
  serve: {
    hard:   { serve:.70, forehand:.10, mental:.08, net:.07, stamina:.05 },
    clay:   { serve:.58, forehand:.16, mental:.08, net:.06, stamina:.12 },
    grass:  { serve:.78, forehand:.07, mental:.06, net:.07, stamina:.02 },
    indoor: { serve:.74, forehand:.09, mental:.07, net:.07, stamina:.03 }
  },
  ret: {
    hard:   { ret:.52, movement:.18, backhand:.16, stamina:.08, mental:.06 },
    clay:   { ret:.44, movement:.24, backhand:.16, stamina:.12, mental:.04 },
    grass:  { ret:.60, movement:.14, backhand:.14, stamina:.06, mental:.06 },
    indoor: { ret:.54, movement:.17, backhand:.16, stamina:.07, mental:.06 }
  },
  rally: {
    hard:   { forehand:.30, backhand:.26, movement:.22, stamina:.12, net:.10 },
    clay:   { forehand:.28, backhand:.24, movement:.26, stamina:.18, net:.04 },
    grass:  { forehand:.28, backhand:.22, movement:.20, stamina:.08, net:.22 },
    indoor: { forehand:.32, backhand:.26, movement:.18, stamina:.10, net:.14 }
  }
};

// how much a hold is worth before either player's quality is considered
const BASE_HOLD = { hard: 0.645, clay: 0.612, grass: 0.678, indoor: 0.657 };
// Serve quality matters most on grass, least on clay. Return quality is the
// mirror image — this is what actually makes a surface specialist.
const SERVE_INF = { hard: 0.0034, clay: 0.0024, grass: 0.0042, indoor: 0.0038 };
const RET_INF   = { hard: 0.0032, clay: 0.0040, grass: 0.0022, indoor: 0.0030 };
const RALLY_INF = { hard: 0.0014, clay: 0.0022, grass: 0.0009, indoor: 0.0013 };
const TOUR_MEAN = 85;

function weigh(a, w) { let t = 0; for (const k in w) t += a[k] * w[k]; return t; }

function indices(p, surface) {
  const a = effAttrs(p);
  return {
    serve:   weigh(a, W.serve[surface]),
    ret:     weigh(a, W.ret[surface]),
    rally:   weigh(a, W.rally[surface]),
    mental:  a.mental,
    aceBase: a.serve,
    netSkill: a.net,
    stamina: a.stamina
  };
}

function servePointProb(srv, ret, surface) {
  const p = BASE_HOLD[surface]
    + SERVE_INF[surface] * (srv.serve - TOUR_MEAN)
    - RET_INF[surface]   * (ret.ret   - TOUR_MEAN)
    + RALLY_INF[surface] * (srv.rally - ret.rally);
  return clamp(p, 0.44, 0.84);
}

/* --- match simulation ---------------------------------------------------- */
const BLANK_STATS = () => ({ aces: 0, df: 0, winners: 0, ue: 0, bpWon: 0, bpFaced: 0, ptsWon: 0, ptsPlayed: 0, svPtsWon: 0, svPts: 0 });

function simMatch(A, B, cfg) {
  const surface = cfg.surface;
  const bestOf = cfg.bestOf || 3;
  const finalSetTB = cfg.finalSetTB !== false;

  // form on the day — the reason upsets happen at all
  const ia = indices(A, surface), ib = indices(B, surface);
  // day form: usually small, occasionally someone turns up flat
  let dayA = jitter(3.4), dayB = jitter(3.4);
  if (rnd() < 0.07) dayA -= 4 + rnd() * 4;
  if (rnd() < 0.07) dayB -= 4 + rnd() * 4;
  ia.serve += dayA; ia.ret += dayA; ia.rally += dayA;
  ib.serve += dayB; ib.ret += dayB; ib.rally += dayB;

  const pA = servePointProb(ia, ib, surface);   // A holding serve
  const pB = servePointProb(ib, ia, surface);   // B holding serve
  const clutch = clamp((ia.mental - ib.mental) * 0.0011, -0.035, 0.035);   // applied on big points, A's favour

  const st = { A: BLANK_STATS(), B: BLANK_STATS() };
  const sets = [];
  let setsA = 0, setsB = 0;
  let server = rnd() < 0.5 ? 'A' : 'B';
  let games = 0, totalPoints = 0;
  let fatigueA = 0, fatigueB = 0;

  function point(isServerA, big) {
    const base = isServerA ? pA : pB;
    let p = base + (big ? (isServerA ? clutch : -clutch) : 0);
    // deep in the match the fitter player starts winning the long ones
    const fatEdge = clamp((isServerA ? ia.stamina - ib.stamina : ib.stamina - ia.stamina) * 0.000012 * totalPoints, -0.045, 0.045);
    p = clamp(p + fatEdge, 0.35, 0.90);
    totalPoints++;
    const srv = isServerA ? st.A : st.B, retr = isServerA ? st.B : st.A;
    const sIdx = isServerA ? ia : ib;
    srv.svPts++; srv.ptsPlayed++; retr.ptsPlayed++;
    const won = rnd() < p;
    if (won) {
      srv.svPtsWon++; srv.ptsWon++;
      const aceP = clamp((sIdx.aceBase - 68) / 190, 0.02, 0.24) * (surface === 'grass' ? 1.25 : surface === 'clay' ? 0.7 : 1);
      if (rnd() < aceP) srv.aces++; else if (rnd() < 0.34) srv.winners++;
    } else {
      retr.ptsWon++;
      if (rnd() < 0.055) srv.df++;
      else if (rnd() < 0.42) retr.winners++; else srv.ue++;
    }
    return won;
  }

  function playGame(isServerA) {
    let s = 0, r = 0;
    const srvStats = isServerA ? st.A : st.B, retStats = isServerA ? st.B : st.A;
    for (;;) {
      const bp = (r >= 3 && r >= s);                    // break point for the returner
      const big = bp || (s >= 3 && s > r) || (s >= 3 && r >= 3);
      if (bp) { srvStats.bpFaced++; }
      const won = point(isServerA, big);
      if (won) s++; else { r++; }
      if (bp && !won) { retStats.bpWon++; }
      if (s >= 4 && s - r >= 2) return true;
      if (r >= 4 && r - s >= 2) return false;
    }
  }

  function playTiebreak(firstServerA, target) {
    let a = 0, b = 0, srvA = firstServerA, served = 0;
    for (;;) {
      const big = (a >= target - 2 || b >= target - 2);
      const won = point(srvA, big);
      if (srvA) { won ? a++ : b++; } else { won ? b++ : a++; }
      served++;
      if (served === 1 || served % 2 === 1) srvA = !srvA;   // 1, then every 2
      if (a >= target && a - b >= 2) return { winner: 'A', a, b };
      if (b >= target && b - a >= 2) return { winner: 'B', a, b };
    }
  }

  const setsNeeded = bestOf === 5 ? 3 : 2;
  while (setsA < setsNeeded && setsB < setsNeeded) {
    let ga = 0, gb = 0, tb = null;
    const isDecider = (setsA === setsNeeded - 1 && setsB === setsNeeded - 1);
    for (;;) {
      if (ga === 6 && gb === 6) {
        const target = (isDecider && finalSetTB) ? 10 : 7;
        tb = playTiebreak(server === 'A', target);
        if (tb.winner === 'A') ga++; else gb++;
        server = (server === 'A') ? 'B' : 'A';   // receiver of the TB serves first next set
        break;
      }
      const serverIsA = server === 'A';
      const held = playGame(serverIsA);
      const wonByA = serverIsA ? held : !held;
      if (wonByA) ga++; else gb++;
      games++;
      server = serverIsA ? 'B' : 'A';
      if (ga >= 6 && ga - gb >= 2) break;
      if (gb >= 6 && gb - ga >= 2) break;
    }
    sets.push({ a: ga, b: gb, tb: tb ? { a: tb.a, b: tb.b } : null });
    if (ga > gb) setsA++; else setsB++;
    // swap first server of the next set correctly (server already alternated)
  }

  const aWon = setsA > setsB;
  const load = (games * 0.9 + totalPoints * 0.035 + (bestOf === 5 ? 6 : 0)) * 0.45;
  fatigueA = load * (1 - (ia.stamina - 70) / 260);
  fatigueB = load * (1 - (ib.stamina - 70) / 260);

  return {
    winner: aWon ? A : B,
    loser:  aWon ? B : A,
    winnerId: aWon ? A.id : B.id,
    sets,
    scoreline: sets.map(s => `${s.a}-${s.b}` + (s.tb ? `(${Math.min(s.tb.a, s.tb.b)})` : '')).join(' '),
    scorelineFor(id) {
      const flip = (id === B.id);
      return sets.map(s => (flip ? `${s.b}-${s.a}` : `${s.a}-${s.b}`) + (s.tb ? `(${Math.min(s.tb.a, s.tb.b)})` : '')).join(' ');
    },
    stats: st,
    fatigue: { [A.id]: fatigueA, [B.id]: fatigueB },
    points: totalPoints,
    minutes: Math.round(games * 4.1 + totalPoints * 0.22 + 8),
    pA, pB
  };
}

/* --- draws --------------------------------------------------------------- */
function seedOrder(n) {
  let arr = [1];
  while (arr.length < n) {
    const m = arr.length * 2 + 1;
    const next = [];
    arr.forEach(x => { next.push(x, m - x); });
    arr = next;
  }
  return arr;
}

function buildDraw(field) {
  // field arrives ranked best-first. Top 8 are placed by seed, rest are drawn.
  const n = field.length;
  const order = seedOrder(n);
  const seeded = field.slice(0, 8);
  const rest = shuffle(field.slice(8));
  const pool = seeded.concat(rest);
  const slots = new Array(n);
  for (let i = 0; i < n; i++) slots[i] = pool[order[i] - 1];
  return slots;
}

/* --- tournament ---------------------------------------------------------- */
class Tournament {
  constructor(ev, field, ctx) {
    this.ev = ev;
    this.ctx = ctx;                          // { SURFACES, PTS, ROUND_NAMES_32 }
    this.slots = buildDraw(field);
    this.rounds = [];                        // [[{a,b,result}]]
    this.alive = this.slots.slice();
    this.roundIndex = 0;
    this.totalRounds = Math.log2(field.length);
    this.wins = {};                          // playerId -> matches won
    field.forEach(p => { this.wins[p.id] = 0; });
    this.champion = null;
    this.log = [];
  }
  roundName(i) {
    const left = this.totalRounds - i;
    if (this.ev.cat === 'qual') return left === 1 ? 'Qualifying final' : 'Qualifying round 1';
    if (left === 1) return 'Final';
    if (left === 2) return 'Semi-final';
    if (left === 3) return 'Quarter-final';
    return 'Round of ' + Math.pow(2, left);
  }
  playRound() {
    if (this.champion) return null;
    const ms = [];
    for (let i = 0; i < this.alive.length; i += 2) {
      const a = this.alive[i], b = this.alive[i + 1];
      const res = simMatch(a, b, {
        surface: this.ev.surface, bestOf: this.ev.bestOf, finalSetTB: true
      });
      ms.push({ a, b, res, round: this.roundName(this.roundIndex) });
    }
    this.rounds.push(ms);
    ms.forEach(m => {
      this.wins[m.res.winnerId]++;
      m.res.winner.season.w++; m.res.winner.career.w++;
      m.res.loser.season.l++;  m.res.loser.career.l++;
      m.res.winner.fatigue = clamp(m.res.winner.fatigue + m.res.fatigue[m.res.winner.id], 0, 100);
      m.res.loser.fatigue  = clamp(m.res.loser.fatigue  + m.res.fatigue[m.res.loser.id], 0, 100);
    });
    this.alive = ms.map(m => m.res.winner);
    this.roundIndex++;
    if (this.alive.length === 1) this.champion = this.alive[0];
    return ms;
  }
  playAll() { while (!this.champion) this.playRound(); return this.champion; }
  matchFor(playerId, roundIdx) {
    const r = this.rounds[roundIdx];
    if (!r) return null;
    return r.find(m => m.a.id === playerId || m.b.id === playerId) || null;
  }
  awardPoints() {
    const table = this.ctx.PTS[this.ev.cat];
    this.slots.forEach(p => {
      const w = this.wins[p.id];
      const pts = table[Math.min(w, table.length - 1)];
      p.res[this.ev.id] = Math.max(p.res[this.ev.id] || 0, pts);
      const reached = w >= this.totalRounds ? 'Champion'
        : this.roundName(w);
      p.history.push({ ev: this.ev.id, name: this.ev.name, result: reached, pts });
      if (w >= this.totalRounds) {
        p.career.titles++; p.season.titles++;
        if (this.ev.cat === 'gs') p.career.slams++;
        if (this.ev.cat === 'm1000') p.career.masters++;
      }
    });
  }
}

/* --- round robin for the Tour Finals ------------------------------------- */
function simTourFinals(ev, field, ctx) {
  const groups = [[], []];
  // snake the top 8 into two groups so both are balanced
  field.forEach((p, i) => groups[[0,1,1,0,0,1,1,0][i]].push(p));
  const table = {}, rr = [];
  field.forEach(p => { table[p.id] = { p, w: 0, l: 0, setsW: 0, setsL: 0, pts: 200 }; });
  groups.forEach((g, gi) => {
    for (let i = 0; i < g.length; i++) for (let j = i + 1; j < g.length; j++) {
      const res = simMatch(g[i], g[j], { surface: ev.surface, bestOf: 3 });
      rr.push({ group: gi, a: g[i], b: g[j], res, round: 'Group ' + (gi === 0 ? 'A' : 'B') });
      const wid = res.winnerId, lid = res.winner.id === g[i].id ? g[j].id : g[i].id;
      table[wid].w++; table[lid].l++; table[wid].pts += 200;
      res.winner.season.w++; res.winner.career.w++;
      res.loser.season.l++;  res.loser.career.l++;
    }
  });
  const standings = groups.map(g => g.slice().sort((x, y) => table[y.id].w - table[x.id].w || rnd() - 0.5));
  const sf = [
    { a: standings[0][0], b: standings[1][1] },
    { a: standings[1][0], b: standings[0][1] }
  ].map(m => {
    const res = simMatch(m.a, m.b, { surface: ev.surface, bestOf: 3 });
    res.winner.season.w++; res.winner.career.w++; res.loser.season.l++; res.loser.career.l++;
    table[res.winnerId].pts += 400;
    return { a: m.a, b: m.b, res, round: 'Semi-final' };
  });
  const fin = simMatch(sf[0].res.winner, sf[1].res.winner, { surface: ev.surface, bestOf: 3 });
  fin.winner.season.w++; fin.winner.career.w++; fin.loser.season.l++; fin.loser.career.l++;
  table[fin.winnerId].pts += 500;
  fin.winner.career.titles++; fin.winner.season.titles++; fin.winner.career.finals++;
  const matches = rr.concat(sf, [{ a: sf[0].res.winner, b: sf[1].res.winner, res: fin, round: 'Final' }]);
  field.forEach(p => {
    p.res[ev.id] = table[p.id].pts;
    p.history.push({ ev: ev.id, name: ev.name, result: p.id === fin.winnerId ? 'Champion' : (table[p.id].w >= 2 ? 'Semi-final' : 'Group stage'), pts: table[p.id].pts });
  });
  return { matches, champion: fin.winner, table, groups };
}

/* --- rankings ------------------------------------------------------------ */
function rankingPoints(p, CALENDAR) {
  let t = 0;
  CALENDAR.forEach(ev => { t += (ev.id in p.res) ? p.res[ev.id] : (p.prev[ev.id] || 0); });
  return t;
}
// order a subset without touching anyone's global rank
function orderByPoints(players, CALENDAR) {
  return players.slice()
    .map(p => ({ p, pts: rankingPoints(p, CALENDAR) }))
    .sort((a, b) => b.pts - a.pts || a.p.name.localeCompare(b.p.name))
    .map(r => r.p);
}
function rankAll(players, CALENDAR) {
  const list = players.map(p => ({ p, pts: rankingPoints(p, CALENDAR) }));
  list.sort((a, b) => b.pts - a.pts || a.p.name.localeCompare(b.p.name));
  list.forEach((r, i) => { r.p.rank = i + 1; r.p.rankPts = r.pts; if (r.p.career.bestRank > i + 1) r.p.career.bestRank = i + 1; });
  return list;
}
function racePoints(p) { let t = 0; for (const k in p.res) t += p.res[k]; return t; }

/* --- week-to-week upkeep -------------------------------------------------- */
function passWeeks(players, weeks) {
  players.forEach(p => {
    p.fatigue = clamp(p.fatigue - weeks * 13, 0, 100);
    p.form = clamp(p.form + jitter(0.035), 0.92, 1.08);
  });
}

function ageOne(p) {
  p.age++;
  const peak = 26;
  for (const k in p.attrs) {
    let d;
    if (p.age <= peak) d = 1.6 + rnd() * 2.2;
    else if (p.age <= 29) d = -0.2 + rnd() * 1.2;
    else if (p.age <= 32) d = -1.6 + rnd() * 1.4;
    else d = -3.4 + rnd() * 1.6;
    if (k === 'mental') d += 1.1;                      // experience keeps paying
    if ((k === 'movement' || k === 'stamina') && p.age > 30) d -= 1.2;
    p.attrs[k] = clamp(Math.round(p.attrs[k] + d), 40, 99);
  }
}

const OVR_W = { serve: 0.17, forehand: 0.16, backhand: 0.14, ret: 0.15, movement: 0.13, net: 0.07, stamina: 0.09, mental: 0.09 };
function overall(p) {
  let t = 0; for (const k in OVR_W) t += p.attrs[k] * OVR_W[k];
  return Math.round(t);
}

if (typeof module !== 'undefined') {
  module.exports = { mulberry32, setSeed, rnd, rndInt, pick, shuffle, clamp, jitter, makePlayer,
    buildTour, buildJourneymen, indices, servePointProb, simMatch, seedOrder, buildDraw,
    Tournament, simTourFinals, rankingPoints, rankAll, orderByPoints, racePoints, passWeeks, ageOne, overall, effAttrs };
}
