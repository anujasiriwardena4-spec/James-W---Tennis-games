/* ============================================================================
   BASELINE — career layer
   Owns the season loop: who enters what, qualifying, ranking points, the
   off-season, and the save file.
   ==========================================================================*/

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
    this.year = opts.year || 2026;
    this.startYear = this.year;
    this.seasonsCompleted = 0;
    this.slot = opts.slot || null;   // which save slot this career writes to
    this.eventIndex = 0;
    this.week = 0;
    this.messages = [];
    this.seasonLog = [];
    this.honours = [];
    this.injuryWeeks = 0;

    this.user = opts.user;
    this.tour = buildTour(TOUR_RAW);
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
    CALENDAR.forEach(ev => { this.user.prev[ev.id] = 0; });

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
      this.user.career.prize += out.champion.isUser ? 4800000 : 1200000;
    }
    this.seasonLog.push({ ev: ev.id, name: ev.name, surface: ev.surface, result: userResult, pts: this.user.res[ev.id] || 0 });
    if (out.champion.isUser) this.honours.push({ year: this.year, text: 'Tour Finals champion' });
    rankAll(this.players, CALENDAR);
    return this.current;
  }

  /* one round at a time so the UI can watch the user's match ------------- */
  advance() {
    const c = this.current;
    if (!c || c.finished) return null;
    if (c.phase === 'qual') {
      const ms = c.qual.playRound();
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
    const ms = c.main.playRound();
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
    const money = { gs: 3000000, m1000: 1100000, atp500: 500000 }[c.ev.cat] || 400000;
    champ.career.prize += money;
    const label = champ.isUser ? 'good' : 'info';
    this.say(`${champ.name} wins ${c.ev.name} (${c.ev.city}).`, label);
    if (champ.isUser) this.honours.push({ year: this.year, text: `${c.ev.name} champion` });
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
    if (no1.isUser) this.honours.push({ year: this.year, text: 'Year-end world No. 1' });
    return summary;
  }

  newSeason(trainingSpend) {
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
    return a <= 23 ? 6 : a <= 26 ? 5 : a <= 29 ? 4 : 3;
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
      tier: legacyTier(c, this.seasonsCompleted)
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
      v: 2, seed: this.seed, year: this.year, startYear: this.startYear,
      seasonsCompleted: this.seasonsCompleted, eventIndex: this.eventIndex, week: this.week,
      messages: this.messages, seasonLog: this.seasonLog, honours: this.honours,
      entries: this.entries, injuryWeeks: this.injuryWeeks,
      user: slim(this.user), tour: this.tour.map(slim), field: this.field.map(slim),
      meta: {
        name: this.user.name, country: this.user.country, age: this.user.age,
        year: this.year, ovr: overall(this.user), rank: this.user.rank || null,
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
    c.eventIndex = d.eventIndex; c.week = d.week;
    c.messages = d.messages || []; c.seasonLog = d.seasonLog || []; c.honours = d.honours || [];
    c.entries = d.entries || {}; c.injuryWeeks = d.injuryWeeks || 0;
    c.user = revive(d.user);
    c.tour = d.tour.map(revive);
    c.field = d.field.map(revive);
    c.players = [c.user].concat(c.tour, c.field);
    c.current = null;
    rankAll(c.players, CALENDAR);
    return c;
  }
}

if (typeof module !== 'undefined') { module.exports = { Builder, Career, SAVE_SLOTS }; }
