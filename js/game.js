/* ============================================================================
   BASELINE — career layer
   Owns the season loop: who enters what, qualifying, ranking points, the
   off-season, and the save file.
   ==========================================================================*/

/* How often the life layer interrupts the tennis, and how much of it you can
   live through in one season. Kept low deliberately — it is punctuation. */
const LIFE_EVENT_CHANCE = 0.34;
const LIFE_EVENTS_PER_SEASON = 3;

const SAVE_PREFIX = 'baseline.career.slot';
const SAVE_SLOTS = 3;
function slotKey(slot) { return SAVE_PREFIX + slot + '.v1'; }

/* --- the builder --------------------------------------------------------- */
class Builder {
  constructor(poolRaw, attrKeys) {
    this.attrKeys = attrKeys;
    this.pool = shuffle(poolRaw.map((r, i) => ({
      idx: i, name: r[0], country: r[1], tier: r[2],
      attrs: { serve: r[3], forehand: r[4], backhand: r[5], ret: r[6], movement: r[7], net: r[8], stamina: r[9], mental: r[10] },
      signature: r[11]
    })));
    this.cursor = 0;
    this.slots = {};                 // attrKey -> { value, from, tier }
    this.respins = 3;
    this.current = null;
    this.taken = [];                 // log of picks, in order
  }
  get filled()    { return this.attrKeys.filter(k => this.slots[k]).length; }
  get remaining() { return this.attrKeys.filter(k => !this.slots[k]); }
  get done()      { return this.filled === this.attrKeys.length; }
  spin() {
    if (this.done) return null;
    if (this.cursor >= this.pool.length) { this.pool = shuffle(this.pool); this.cursor = 0; }
    this.current = this.pool[this.cursor++];
    return this.current;
  }
  respin() {
    if (this.respins <= 0 || !this.current) return null;
    this.respins--;
    return this.spin();
  }
  take(attrKey) {
    if (!this.current || this.slots[attrKey]) return false;
    this.slots[attrKey] = { value: this.current.attrs[attrKey], from: this.current.name, tier: this.current.tier, signature: this.current.signature };
    this.taken.push({ attr: attrKey, from: this.current.name, value: this.current.attrs[attrKey] });
    this.current = null;
    return true;
  }
  attrs() {
    const a = {};
    this.attrKeys.forEach(k => { a[k] = this.slots[k] ? this.slots[k].value : 55; });
    return a;
  }
}

/* --- the rookie-year wheel ------------------------------------------------
   Same shape as the skill wheel: the spin lands on a season, and you choose
   one of three routes into it. Respins throw away both the season and the
   routes, so a respin is a real gamble rather than a reroll of the small half.
------------------------------------------------------------------------- */
const ROUTE_CHOICES = 3;

class RookieSpinner {
  constructor(eras, routes) {
    this.eraPool = shuffle(eras.slice());
    this.routes = routes;
    this.cursor = 0;
    this.respins = 2;
    this.current = null;   // { era, routes: [...] }
    this.picked = null;    // { era, route } once locked in
  }
  spin() {
    if (this.cursor >= this.eraPool.length) { this.eraPool = shuffle(this.eraPool); this.cursor = 0; }
    const era = this.eraPool[this.cursor++];
    this.current = { era, routes: shuffle(this.routes.slice()).slice(0, ROUTE_CHOICES) };
    return this.current;
  }
  respin() {
    if (this.respins <= 0 || !this.current) return null;
    this.respins--;
    return this.spin();
  }
  take(routeId) {
    if (!this.current) return null;
    const route = this.current.routes.find(r => r.id === routeId);
    if (!route) return null;
    this.picked = { era: this.current.era, route };
    return this.picked;
  }
}

/* A route's head-start on the attributes it implies. `all` lifts everything,
   `lowest` patches the single worst rating — everything else is by name. */
function applyRouteBonus(attrs, route) {
  const out = { ...attrs };
  if (!route || !route.bonus) return out;
  const b = route.bonus;
  const bump = (k, n) => { if (out[k] != null) out[k] = Math.min(99, out[k] + n); };
  Object.keys(b).forEach(k => {
    if (k === 'all') Object.keys(out).forEach(x => bump(x, b.all));
    else if (k === 'lowest') {
      const worst = Object.keys(out).sort((x, y) => out[x] - out[y])[0];
      bump(worst, b.lowest);
    } else bump(k, b[k]);
  });
  return out;
}

/* --- legacy verdict, checked top-down at retirement ----------------------- */
function legacyTier(c, seasons) {
  if (c.slams >= 8 && c.weeksNo1 >= 150) return {
    label: 'GOAT Territory',
    blurb: `${c.slams} Grand Slams and ${Math.round(c.weeksNo1 / 52)}+ years at world No. 1 — this is a career people build eras around.`
  };
  if (c.slams >= 3 || (c.titles >= 15 && c.masters >= 5)) return {
    label: 'Hall of Famer',
    blurb: `A genuine great of the game: ${c.slams} Grand Slam${c.slams === 1 ? '' : 's'}, ${c.masters} Masters 1000 title${c.masters === 1 ? '' : 's'}, a career that gets remembered.`
  };
  if (c.slams >= 1) return {
    label: 'Grand Slam Champion',
    blurb: `You won a major. Whatever else this career was, that line never gets erased.`
  };
  if (c.masters >= 3) return {
    label: 'Masters Champion',
    blurb: `No Slam, but ${c.masters} Masters 1000 titles is a career most tour pros never get close to.`
  };
  if (c.titles >= 1) return {
    label: 'Tour Winner',
    blurb: `${c.titles} ATP title${c.titles === 1 ? '' : 's'} on the board. You made a living beating some of the best players alive.`
  };
  if (c.bestRank <= 100) return {
    label: 'Tour Professional',
    blurb: `You cracked the top ${c.bestRank <= 50 ? '50' : '100'} across ${seasons} season${seasons === 1 ? '' : 's'} on tour. Most people who pick up a racquet never get within a mile of that.`
  };
  return {
    label: 'Journeyman',
    blurb: seasons === 0
      ? `The tour is brutal, and it doesn't wait for anyone. You called it before your first season even finished.`
      : `The tour is brutal, and it doesn't wait for anyone. ${seasons} season${seasons === 1 ? '' : 's'} on the road is still a full career.`
  };
}

/* --- career -------------------------------------------------------------- */
class Career {
  constructor(opts) {
    this.seed = opts.seed || (Date.now() % 2147483647);
    setSeed(this.seed);
    const era = opts.era || eraById('2026');
    const route = opts.route || null;
    this.eraId = era.id;
    this.eraName = era.name;
    this.routeId = route ? route.id : null;
    this.routeName = route ? route.name : null;
    // main-draw entries the route bought you — spent instead of qualifying
    this.wildcards = route ? (route.wildcards || 0) : 0;
    // how well known you are, 0-100. Life events move it, titles move it, and
    // it is what the end-of-season endorsement cheque is priced off.
    this.fame = route ? (route.fame || 0) : 3;
    // seen: life events already lived through, so none ever repeats
    // pending: the event waiting to be answered, if any
    this.life = { seen: [], log: [], thisSeason: 0, pending: null };
    this.year = opts.year || era.year;
    this.startYear = this.year;
    this.seasonsCompleted = 0;
    this.slot = opts.slot || null;   // which save slot this career writes to
    this.eventIndex = 0;
    this.week = 0;
    this.messages = [];
    this.seasonLog = [];
    this.honours = [];
    this.injuryWeeks = 0;
    // cash on hand is career prize money minus whatever's been spent on
    // lifestyle purchases — the prize total itself never moves, so career-long
    // "money earned" stats stay accurate even after you've spent plenty of it
    // `seed` is the money the rookie route arrived with; it sits alongside
    // prize money so career earnings stay a clean record of what was won
    this.finances = { seed: route ? (route.cash || 0) : 0, spent: 0, owned: { house: null, car: null, team: null } };

    this.user = opts.user;
    this.tour = buildTour(era.tour);
    this.field = buildJourneymen(64, FIRST_NAMES, LAST_NAMES, COUNTRIES);
    this.players = [this.user].concat(this.tour, this.field);

    // seed the rolling ranking so the pecking order exists on day one and the
    // rookie has to climb through it
    // Shares sum to 1 across the calendar, so a player's rolling total lands on
    // their intended level. The curve is fitted to a real year-end ATP spread:
    // ~11.9k at No.1, ~3.7k at No.5, ~2.3k at No.10, ~1.2k at No.50.
    const SHARE = { gs: 0.145, m1000: 0.0333, finals: 0.05, atp500: 0.035 };
    const seedPoints = (p, base) => {
      CALENDAR.forEach(ev => {
        p.prev[ev.id] = Math.round(base * SHARE[ev.cat] * (0.55 + rnd() * 0.9));
      });
    };
    this.tour.forEach((p, i) => seedPoints(p, 900 + 11000 / Math.pow(1 + i * 0.55, 1.15)));
    this.field.forEach((p, i) => seedPoints(p, Math.max(20, 1000 - i * 14)));
    // the route's ranking total, spread across the calendar with no randomness
    // so the number on the card is the number you actually start on
    const startPts = route ? (route.pts || 0) : 0;
    const shareSum = CALENDAR.reduce((t, ev) => t + SHARE[ev.cat], 0);
    CALENDAR.forEach(ev => { this.user.prev[ev.id] = Math.round(startPts * SHARE[ev.cat] / shareSum); });

    rankAll(this.players, CALENDAR);
    this.entries = {};                 // eventId -> true/false (user's choice)
    this.current = null;               // live SeasonEvent
  }

  get nextEvent() { return CALENDAR[this.eventIndex] || null; }
  get standings() { return rankAll(this.players, CALENDAR); }
  raceStandings() {
    return this.players.map(p => ({ p, pts: racePoints(p) }))
      .sort((a, b) => b.pts - a.pts).slice(0, 40);
  }

  say(msg, kind) { this.messages.unshift({ msg, kind: kind || 'info', week: this.week, year: this.year }); this.messages = this.messages.slice(0, 60); }

  /* who turns up ---------------------------------------------------------- */
  entrantsFor(ev) {
    const ranked = rankAll(this.players, CALENDAR);
    const out = [];
    ranked.forEach(({ p }) => {
      if (p.isUser) return;                                 // handled separately
      if (p.fatigue > 84 && rnd() < 0.45) return;           // shut it down
      if (!ev.mandatory) {
        const r = p.rank;
        const chance = r <= 10 ? 0.4 : r <= 30 ? 0.65 : 0.85;
        if (rnd() > chance) return;
      } else if (rnd() < 0.04) return;                      // late withdrawal
      out.push(p);
    });
    return out;
  }

  startEvent(userEnters) {
    const ev = this.nextEvent;
    if (!ev) return null;
    const gap = Math.max(0, ev.week - this.week);
    passWeeks(this.players, gap);
    this.week = ev.week;
    rankAll(this.players, CALENDAR);

    if (ev.cat === 'finals') return this.startFinals(ev, userEnters);

    const pool = this.entrantsFor(ev);
    const size = ev.draw;
    let main, qual = null, userInMain = false;

    if (!userEnters) {
      main = pool.slice(0, size);
    } else if (this.user.rank <= size - 1) {
      main = orderByPoints(pool.slice(0, size - 1).concat([this.user]), CALENDAR);
      userInMain = true;
    } else if (this.wildcards > 0) {
      // a route wildcard buys the last main-draw seat outright
      this.wildcards--;
      main = orderByPoints(pool.slice(0, size - 1).concat([this.user]), CALENDAR);
      userInMain = true;
      this.say(`Wildcard into the ${ev.name} main draw. ${this.wildcards} left.`, 'good');
    } else {
      // qualifying: a 4-player mini-draw for the last main-draw seat. Two
      // rivals come from around your own ranking; the third is deliberately
      // dangerous — a genuine tour-level name in the qualifying draw, same
      // as real tennis, so a strong build can't just walk through journeymen.
      const myPts = rankingPoints(this.user, CALENDAR);
      let idx = pool.findIndex(p => rankingPoints(p, CALENDAR) <= myPts);
      if (idx < 0) idx = pool.length;
      const from = clamp(idx - 8, size - 1, Math.max(size - 1, pool.length - 16));
      const near = pool.slice(from, from + 16);
      const rivals = shuffle(near).slice(0, 2);
      const dangerPool = pool.slice(0, Math.max(size - 1, Math.floor(pool.length / 2)))
        .filter(p => !rivals.includes(p));
      if (dangerPool.length) rivals.push(pick(dangerPool));
      let back = pool.length - 1;
      while (rivals.length < 3 && back >= 0) { if (!rivals.includes(pool[back])) rivals.push(pool[back]); back--; }
      qual = new Tournament({ ...ev, draw: 4, bestOf: 3, cat: 'qual' },
        orderByPoints([this.user].concat(rivals), CALENDAR),
        { SURFACES, PTS: { qual: [0, 0, 0] }, ROUND_NAMES_32 });
      main = pool.slice(0, size - 1);
    }

    this.current = {
      ev, phase: qual ? 'qual' : 'main', qual, main: null, mainField: main,
      userInMain, userEnters, roundIdx: 0, finished: false, finals: null
    };
    if (!qual) this.buildMain();
    return this.current;
  }

  buildMain() {
    const c = this.current;
    const field = orderByPoints(c.mainField, CALENDAR);
    c.main = new Tournament(c.ev, field, { SURFACES, PTS, ROUND_NAMES_32 });
    c.phase = 'main';
    c.roundIdx = 0;
  }

  startFinals(ev, userEnters) {
    const race = this.raceStandings().filter(r => userEnters || !r.p.isUser).slice(0, 8);
    const field = race.map(r => r.p);
    const qualified = field.some(p => p.isUser);
    const out = simTourFinals(ev, field, { SURFACES });
    this.current = { ev, phase: 'finals', finals: out, finished: true, userInMain: qualified, userEnters, mainField: field };
    this.say(`${out.champion.name} wins the ${ev.name}.`, out.champion.isUser ? 'good' : 'info');
    let userResult = 'Did not qualify';
    if (qualified) {
      const row = out.table[this.user.id];
      userResult = out.champion.isUser ? 'Champion' : (row.w >= 2 ? 'Semi-final' : 'Group stage');
      this.user.career.prize += out.champion.isUser ? PRIZE_BY_CAT.finals : 1200000;
    }
    this.seasonLog.push({ ev: ev.id, name: ev.name, surface: ev.surface, result: userResult, pts: this.user.res[ev.id] || 0 });
    if (out.champion.isUser) this.honours.push({ year: this.year, text: 'Tour Finals champion' });
    rankAll(this.players, CALENDAR);
    return this.current;
  }

  /* one round at a time so the UI can watch the user's match ------------- */
  // overrideResult: { playerId, res } — pass a result the user already
  // played by hand (InteractiveMatch) instead of letting simMatch resolve it
  advance(overrideResult) {
    const c = this.current;
    if (!c || c.finished) return null;
    if (c.phase === 'qual') {
      const ms = c.qual.playRound(overrideResult);
      const userMatch = ms.find(m => m.a.isUser || m.b.isUser) || null;
      const userThrough = userMatch ? userMatch.res.winnerId === this.user.id : false;
      if (c.qual.champion) {
        const qualifier = c.qual.champion;
        c.mainField = c.mainField.concat([qualifier]);
        c.userInMain = qualifier.isUser;
        if (!c.userInMain) this.say(`Lost in qualifying at ${c.ev.name}. No main draw, no points.`, 'bad');
        else this.say(`Qualified for the ${c.ev.name} main draw.`, 'good');
        this.buildMain();
      }
      return { phase: 'qual', matches: ms, userMatch, userThrough, qualDone: !!c.qual.champion };
    }
    const ms = c.main.playRound(overrideResult);
    const userMatch = ms.find(m => m.a.isUser || m.b.isUser) || null;
    const userThrough = userMatch ? userMatch.res.winnerId === this.user.id : false;
    c.roundIdx = c.main.roundIndex;
    // overuse risk doesn't care whether you won the point — check every
    // match played, not just losses, or a dominant player who rarely loses
    // also never faces the downside of entering every single event
    if (userMatch) this.checkInjury();
    if (c.main.champion) this.finishEvent();
    return { phase: 'main', matches: ms, userMatch, userThrough, eventDone: !!c.main.champion };
  }

  simRestOfEvent() {
    const c = this.current;
    while (c && !c.finished) {
      if (c.phase === 'qual' && c.qual && !c.qual.champion) { this.advance(); continue; }
      if (c.main && !c.main.champion) { this.advance(); continue; }
      break;
    }
    return this.current;
  }

  finishEvent() {
    const c = this.current;
    c.main.awardPoints();
    c.finished = true;
    const champ = c.main.champion;
    const money = PRIZE_BY_CAT[c.ev.cat] || PRIZE_DEFAULT;
    champ.career.prize += money;
    const label = champ.isUser ? 'good' : 'info';
    this.say(`${champ.name} wins ${c.ev.name} (${c.ev.city}).`, label);
    if (champ.isUser) {
      this.honours.push({ year: this.year, text: `${c.ev.name} champion` });
      this.fame = clamp(this.fame + (c.ev.cat === 'gs' ? 9 : c.ev.cat === 'm1000' ? 4 : 2), 0, 100);
    }
    const userWins = c.main.wins[this.user.id];
    if (userWins !== undefined) {
      const res = userWins >= c.main.totalRounds ? 'Champion' : c.main.roundName(userWins);
      this.seasonLog.push({ ev: c.ev.id, name: c.ev.name, surface: c.ev.surface, result: res, pts: this.user.res[c.ev.id] || 0 });
      this.user.career.prize += Math.round(money * Math.pow(0.55, Math.max(0, c.main.totalRounds - userWins)));
    } else {
      this.seasonLog.push({ ev: c.ev.id, name: c.ev.name, surface: c.ev.surface, result: c.userEnters ? 'Lost in qualifying' : 'Did not play', pts: 0 });
    }
    rankAll(this.players, CALENDAR);
  }

  checkInjury() {
    const u = this.user;
    const risk = Math.max(0, (u.fatigue - 40) / 100) * 0.22 + (u.age > 31 ? 0.012 : 0.004);
    if (rnd() < risk) {
      this.injuryWeeks = 2 + rndInt(5);
      const kinds = ['a wrist strain', 'an abdominal tear', 'a rolled ankle', 'a hip flexor problem', 'a back spasm', 'shoulder soreness'];
      this.say(`You picked up ${pick(kinds)} — out for ${this.injuryWeeks} weeks.`, 'bad');
      u.fatigue = Math.min(100, u.fatigue + 12);
    }
  }

  closeEvent() {
    this.eventIndex++;
    this.current = null;
    if (this.injuryWeeks > 0) {
      // burn through events that fall inside the lay-off
      while (this.injuryWeeks > 0 && this.nextEvent) {
        const gapWeeks = this.nextEvent.week - this.week;
        if (gapWeeks >= this.injuryWeeks) { this.injuryWeeks = 0; break; }
        this.entries[this.nextEvent.id] = false;
        this.seasonLog.push({ ev: this.nextEvent.id, name: this.nextEvent.name, surface: this.nextEvent.surface, result: 'Injured', pts: 0 });
        this.say(`Missed ${this.nextEvent.name} through injury.`, 'bad');
        this.simEventWithoutUser(this.nextEvent);
        this.injuryWeeks -= gapWeeks;
        this.eventIndex++;
      }
      this.injuryWeeks = 0;
    }
    return this.nextEvent;
  }

  simEventWithoutUser(ev) {
    passWeeks(this.players, Math.max(0, ev.week - this.week));
    this.week = ev.week;
    if (ev.cat === 'finals') { this.startFinals(ev, false); this.current = null; return; }
    const pool = this.entrantsFor(ev).slice(0, ev.draw);
    const t = new Tournament(ev, pool, { SURFACES, PTS, ROUND_NAMES_32 });
    t.playAll(); t.awardPoints();
    this.say(`${t.champion.name} wins ${ev.name}.`, 'info');
    rankAll(this.players, CALENDAR);
  }

  get seasonOver() { return this.eventIndex >= CALENDAR.length; }

  endSeason() {
    this.seasonsCompleted++;
    const table = rankAll(this.players, CALENDAR);
    const no1 = table[0].p;
    no1.career.weeksNo1 += 52;
    const summary = {
      year: this.year,
      no1: no1.name,
      userRank: this.user.rank,
      userPts: this.user.rankPts,
      titles: this.user.season.titles,
      w: this.user.season.w, l: this.user.season.l,
      log: this.seasonLog.slice(),
      top10: table.slice(0, 10).map(r => ({ name: r.p.name, pts: r.pts, isUser: r.p.isUser }))
    };
    if (no1.isUser) {
      this.honours.push({ year: this.year, text: 'Year-end world No. 1' });
      this.fame = clamp(this.fame + 10, 0, 100);
    }
    // the year's endorsement cheque, priced off how well known you now are
    const endorsements = this.endorsementIncome();
    if (endorsements > 0) {
      this.finances.seed = (this.finances.seed || 0) + endorsements;
      this.say(`Endorsements paid ${Math.round(endorsements / 1000)}k for the year.`, 'good');
    }
    summary.fame = this.fame;
    summary.endorsements = endorsements;
    summary.stage = this.stageInfo().name;
    return summary;
  }

  newSeason(trainingSpend) {
    // fame fades unless the results keep renewing it — a year outside the top
    // 100 costs you far more of it than a year at the top
    const earned = this.user.rank <= 5 ? 26 : this.user.rank <= 20 ? 16
                 : this.user.rank <= 50 ? 8 : this.user.rank <= 100 ? 3 : 0;
    this.fame = clamp(Math.round(this.fame * 0.88 + earned * 0.12), 0, 100);
    this.life.thisSeason = 0;
    this.players.forEach(p => {
      p.prev = Object.assign({}, p.prev, p.res);
      p.res = {};
      p.season = { w: 0, l: 0, titles: 0 };
      p.history = [];
      ageOne(p);
      p.fatigue = 0;
      p.form = 1;
    });
    if (trainingSpend) {
      for (const k in trainingSpend) {
        this.user.attrs[k] = clamp(this.user.attrs[k] + trainingSpend[k], 40, 99);
      }
    }
    this.year++;
    this.eventIndex = 0;
    this.week = 0;
    this.seasonLog = [];
    this.entries = {};
    this.current = null;
    rankAll(this.players, CALENDAR);
  }

  trainingPoints() {
    const a = this.user.age;
    const base = a <= 23 ? 6 : a <= 26 ? 5 : a <= 29 ? 4 : 3;
    const teamTier = this.finances.owned.team;
    const bonus = teamTier != null ? (LIFESTYLE_CATALOG.team[teamTier].trainingBonus || 0) : 0;
    return base + bonus;
  }

  /* --- the life ----------------------------------------------------------
     Where the career sits on the ladder, and the events that reach you there.
     Stage is derived rather than stored, so it tracks the career on its own
     as the ranking and the birthdays move. */
  stageContext() {
    return {
      age: this.user.age,
      seasons: this.seasonsCompleted,
      rank: this.user.rank || 999,
      slams: this.user.career.slams || 0
    };
  }
  stage() { return stageFor(this.stageContext()); }
  stageInfo() { const id = this.stage(); return LIFE_STAGES.find(s => s.id === id) || LIFE_STAGES[0]; }

  /* Which events could still reach you where you are now. */
  eligibleLifeEvents() {
    const st = this.stage();
    return LIFE_EVENTS.filter(e => e.stages.indexOf(st) >= 0 && this.life.seen.indexOf(e.id) < 0);
  }

  /* Rolled after a tournament closes. Capped per season so the life layer
     stays punctuation rather than the main text. */
  rollLifeEvent() {
    if (this.life.pending) return this.life.pending;
    if (this.life.thisSeason >= LIFE_EVENTS_PER_SEASON) return null;
    if (this.injuryWeeks > 0) return null;
    if (rnd() > LIFE_EVENT_CHANCE) return null;
    const pool = this.eligibleLifeEvents();
    if (!pool.length) return null;
    this.life.pending = pick(pool).id;
    return this.life.pending;
  }
  pendingLifeEvent() {
    return this.life.pending ? LIFE_EVENTS.find(e => e.id === this.life.pending) || null : null;
  }
  /* Can this choice be paid for? A cost you cannot cover is offered but
     locked, rather than quietly hidden — the trade-off is the point. */
  canAffordChoice(choice) {
    const cost = (choice.fx && choice.fx.cash) || 0;
    return cost >= 0 || this.cashOnHand() >= -cost;
  }
  answerLifeEvent(choiceIdx) {
    const ev = this.pendingLifeEvent();
    if (!ev) return null;
    const choice = ev.choices[choiceIdx];
    if (!choice || !this.canAffordChoice(choice)) return null;
    const fx = choice.fx || {};
    if (fx.cash) this.finances.seed = (this.finances.seed || 0) + fx.cash;
    if (fx.fame) this.fame = clamp(this.fame + fx.fame, 0, 100);
    if (fx.fatigue) this.user.fatigue = clamp(this.user.fatigue + fx.fatigue, 0, 100);
    if (fx.form) this.user.form = clamp(this.user.form + fx.form, 0.92, 1.08);
    for (const k in (fx.attrs || {})) {
      this.user.attrs[k] = clamp(this.user.attrs[k] + fx.attrs[k], 40, 99);
    }
    this.life.seen.push(ev.id);
    this.life.thisSeason++;
    this.life.pending = null;
    this.life.log.unshift({ year: this.year, stage: this.stage(), title: ev.title, choice: choice.label, outcome: choice.outcome });
    this.life.log = this.life.log.slice(0, 60);
    this.say(`${ev.title} — ${choice.label}.`, 'info');
    return { ev, choice };
  }

  /* Fame is priced into a yearly endorsement cheque. It rises superlinearly,
     so the gap between a known player and a famous one is enormous. */
  endorsementIncome() { return Math.round(this.fame * this.fame * 450); }

  /* --- lifestyle: what prize money buys off the court --------------------
     cashOnHand is prize money minus what's been spent — career.prize itself
     never moves, so "career earnings" stats stay accurate after a purchase.
     netWorth adds back the sticker price of everything currently owned. */
  cashOnHand() { return (this.finances.seed || 0) + this.user.career.prize - this.finances.spent; }
  netWorth() {
    let owned = 0;
    for (const cat in this.finances.owned) {
      const tier = this.finances.owned[cat];
      if (tier != null) owned += LIFESTYLE_CATALOG[cat][tier].price;
    }
    return this.cashOnHand() + owned;
  }
  buyItem(category, tierIndex) {
    const tiers = LIFESTYLE_CATALOG[category];
    if (!tiers || !tiers[tierIndex]) return { ok: false, reason: 'no such item' };
    const item = tiers[tierIndex];
    const currentTier = this.finances.owned[category];
    if (currentTier === tierIndex) return { ok: false, reason: 'already owned' };
    const resale = currentTier != null ? Math.round(tiers[currentTier].price * LIFESTYLE_RESALE_PCT) : 0;
    const netCost = item.price - resale;
    if (netCost > this.cashOnHand()) return { ok: false, reason: 'not enough cash' };
    if (currentTier != null) {
      const old = tiers[currentTier];
      for (const k in (old.attrBonus || {})) this.user.attrs[k] = clamp(this.user.attrs[k] - old.attrBonus[k], 40, 99);
    }
    for (const k in (item.attrBonus || {})) this.user.attrs[k] = clamp(this.user.attrs[k] + item.attrBonus[k], 40, 99);
    this.finances.spent += netCost;
    this.finances.owned[category] = tierIndex;
    return { ok: true, netCost, resale };
  }

  /* --- retirement: the actual end of the game ----------------------------
     There's no forced cutoff — attributes just keep declining with age — but
     the player can call time whenever they want. This is where the run gets
     judged and turned into a verdict, then the save is cleared: a retired
     career is over, the only way forward is building someone new. */
  retire() {
    const u = this.user;
    const c = u.career;
    const winPct = (c.w + c.l) > 0 ? c.w / (c.w + c.l) : 0;
    const summary = {
      name: u.name, country: u.country, age: u.age,
      seasons: this.seasonsCompleted, w: c.w, l: c.l, winPct,
      titles: c.titles, slams: c.slams, masters: c.masters, finals: c.finals,
      weeksNo1: c.weeksNo1, bestRank: c.bestRank, prize: c.prize,
      honours: this.honours.slice(),
      tier: legacyTier(c, this.seasonsCompleted),
      fame: this.fame,
      lifeLog: this.life.log.slice()
    };
    if (this.slot) Career.clear(this.slot);
    return summary;
  }

  /* --- save/load ----------------------------------------------------------
     Up to SAVE_SLOTS independent careers can be parked at once. Each save
     carries a small `meta` block alongside the full payload so the slot
     picker can show a name/year/OVR without reviving all ~110 players. */
  toJSON() {
    const slim = p => ({
      id: p.id, name: p.name, country: p.country, hand: p.hand, bh: p.bh, age: p.age,
      attrs: p.attrs, isUser: p.isUser, form: p.form, fatigue: p.fatigue,
      res: p.res, prev: p.prev, career: p.career, season: p.season
    });
    return {
      v: 3, seed: this.seed, year: this.year, startYear: this.startYear,
      eraId: this.eraId, eraName: this.eraName, fame: this.fame, life: this.life,
      routeId: this.routeId, routeName: this.routeName, wildcards: this.wildcards,
      seasonsCompleted: this.seasonsCompleted, eventIndex: this.eventIndex, week: this.week,
      messages: this.messages, seasonLog: this.seasonLog, honours: this.honours,
      entries: this.entries, injuryWeeks: this.injuryWeeks, finances: this.finances,
      user: slim(this.user), tour: this.tour.map(slim), field: this.field.map(slim),
      meta: {
        name: this.user.name, country: this.user.country, age: this.user.age,
        year: this.year, era: this.eraName, route: this.routeName, stage: this.stageInfo().name,
        ovr: overall(this.user), rank: this.user.rank || null,
        titles: this.user.career.titles, slams: this.user.career.slams,
        savedAt: Date.now()
      }
    };
  }
  save() {
    if (!this.slot) return false;
    try { localStorage.setItem(slotKey(this.slot), JSON.stringify(this.toJSON())); return true; }
    catch (e) { return false; }
  }
  static hasSave(slot) { try { return !!localStorage.getItem(slotKey(slot)); } catch (e) { return false; } }
  static clear(slot)   { try { localStorage.removeItem(slotKey(slot)); } catch (e) {} }
  /* every slot's summary, for the "your careers" screen — cheap, no revival */
  static listSlots() {
    const out = [];
    for (let s = 1; s <= SAVE_SLOTS; s++) {
      let raw = null; try { raw = localStorage.getItem(slotKey(s)); } catch (e) {}
      if (!raw) { out.push({ slot: s, meta: null }); continue; }
      let d = null; try { d = JSON.parse(raw); } catch (e) {}
      out.push({ slot: s, meta: (d && d.meta) || null });
    }
    return out;
  }
  static anySaved() { return Career.listSlots().some(s => s.meta); }
  static firstEmptySlot() {
    const s = Career.listSlots().find(x => !x.meta);
    return s ? s.slot : null;
  }
  static load(slot) {
    let raw; try { raw = localStorage.getItem(slotKey(slot)); } catch (e) { return null; }
    if (!raw) return null;
    let d; try { d = JSON.parse(raw); } catch (e) { return null; }
    const revive = o => {
      const p = makePlayer(o.name, o.country, o.attrs, { id: o.id, hand: o.hand, bh: o.bh, age: o.age, isUser: o.isUser });
      p.form = o.form; p.fatigue = o.fatigue; p.res = o.res || {}; p.prev = o.prev || {};
      p.career = o.career; p.season = o.season; p.history = [];
      return p;
    };
    const c = Object.create(Career.prototype);
    c.slot = slot;
    c.seed = d.seed; setSeed(d.seed + d.eventIndex * 977 + d.year);
    c.year = d.year; c.startYear = d.startYear || d.year; c.seasonsCompleted = d.seasonsCompleted || 0;
    c.eraId = d.eraId || '2026'; c.eraName = d.eraName || eraById(c.eraId).name;
    c.routeId = d.routeId || null; c.routeName = d.routeName || null;
    c.wildcards = d.wildcards || 0;
    c.fame = d.fame || 0;
    c.life = d.life || { seen: [], log: [], thisSeason: 0, pending: null };
    if (!c.life.seen) c.life.seen = [];
    if (!c.life.log) c.life.log = [];
    if (c.life.thisSeason == null) c.life.thisSeason = 0;
    if (c.life.pending === undefined) c.life.pending = null;
    c.eventIndex = d.eventIndex; c.week = d.week;
    c.messages = d.messages || []; c.seasonLog = d.seasonLog || []; c.honours = d.honours || [];
    c.entries = d.entries || {}; c.injuryWeeks = d.injuryWeeks || 0;
    c.finances = d.finances || { seed: 0, spent: 0, owned: { house: null, car: null, team: null } };
    if (c.finances.seed == null) c.finances.seed = 0;
    c.user = revive(d.user);
    c.tour = d.tour.map(revive);
    c.field = d.field.map(revive);
    c.players = [c.user].concat(c.tour, c.field);
    c.current = null;
    rankAll(c.players, CALENDAR);
    return c;
  }
}

if (typeof module !== 'undefined') { module.exports = { Builder, RookieSpinner, applyRouteBonus, Career, SAVE_SLOTS,
  LIFE_EVENT_CHANCE, LIFE_EVENTS_PER_SEASON }; }
