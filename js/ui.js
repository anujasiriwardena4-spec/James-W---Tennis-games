/* ============================================================================
   BASELINE — interface
   ==========================================================================*/
const $  = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));

let career = null;
let builder = null;
let identity = { name: '', country: 'AUS', age: 19, hand: 'R', bh: 2 };
let rankMode = 'live';
let busy = false;

/* ---------- chrome ------------------------------------------------------- */
function show(id) {
  $$('.screen').forEach(s => s.classList.toggle('active', s.id === id));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function toast(msg, kind) {
  const el = document.createElement('div');
  el.className = 'toast ' + (kind || '');
  el.textContent = msg;
  $('#toast-wrap').appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .4s'; }, 2600);
  setTimeout(() => el.remove(), 3100);
}
function vClass(v) { return v >= 93 ? 'v-elite' : v >= 86 ? 'v-great' : v >= 76 ? 'v-ok' : 'v-meh'; }
function surfTag(s) { return `<span class="surf-tag s-${s}">${SURFACES[s].label}</span>`; }
function catLabel(c) { return { gs: 'Grand Slam', m1000: 'Masters 1000', atp500: 'ATP 500', finals: 'Tour Finals' }[c] || c; }
function fmtPts(n) { return n.toLocaleString('en-US'); }

/* ---------- home --------------------------------------------------------- */
$('#btn-new').addEventListener('click', () => {
  if (Career.hasSave() && !confirm('Starting a new build wipes your saved career. Continue?')) return;
  show('screen-identity');
  $('#in-name').focus();
});
$('#btn-continue').addEventListener('click', () => {
  const c = Career.load();
  if (!c) { toast('Save file could not be read', 'bad'); return; }
  career = c;
  renderHub(); show('screen-hub');
});
$$('[data-goto]').forEach(b => b.addEventListener('click', () => show(b.dataset.goto)));
if (Career.hasSave()) $('#btn-continue').hidden = false;

/* ---------- identity ----------------------------------------------------- */
(function initIdentity() {
  $('#in-country').innerHTML = COUNTRIES.map(c => `<option value="${c}"${c === 'AUS' ? ' selected' : ''}>${c}</option>`).join('');
  const ages = []; for (let a = 16; a <= 24; a++) ages.push(a);
  $('#in-age').innerHTML = ages.map(a => `<option value="${a}"${a === 19 ? ' selected' : ''}>${a}</option>`).join('');
  $$('.seg').forEach(seg => seg.addEventListener('click', e => {
    const b = e.target.closest('.seg-btn'); if (!b) return;
    $$('.seg-btn', seg).forEach(x => x.classList.toggle('active', x === b));
    if (seg.id === 'seg-rank') { rankMode = b.dataset.v; renderRankings(); }
  }));
})();

$('#btn-to-builder').addEventListener('click', () => {
  identity.name    = ($('#in-name').value || '').trim() || 'Your Player';
  identity.country = $('#in-country').value;
  identity.age     = parseInt($('#in-age').value, 10);
  identity.hand    = $('.seg-btn.active', $('#seg-hand')).dataset.v;
  identity.bh      = parseInt($('.seg-btn.active', $('#seg-bh')).dataset.v, 10);
  builder = new Builder(POOL_RAW, ATTR_KEYS);
  renderBuilder();
  show('screen-builder');
});

/* ---------- builder ------------------------------------------------------ */
function renderBuilder() {
  $('#slot-list').innerHTML = ATTRS.map(a => {
    const s = builder.slots[a.key];
    return `<li class="slot ${s ? 'filled' : ''}">
      <span class="sk">${a.short}</span>
      <span class="sv ${s ? vClass(s.value) : ''}">${s ? s.value : '—'}</span>
      <span class="sf ${s ? '' : 'empty'}">${s ? esc(s.from) : 'open'}</span>
    </li>`;
  }).join('');
  const filledVals = ATTRS.map(a => builder.slots[a.key] ? builder.slots[a.key].value : null).filter(v => v !== null);
  $('#ovr-preview').textContent = filledVals.length
    ? Math.round(filledVals.reduce((x, y) => x + y, 0) / filledVals.length) + (builder.done ? '' : '*')
    : '—';
  $('#respin-pips').innerHTML = [0, 1, 2].map(i => `<span class="pip ${i < builder.respins ? '' : 'spent'}"></span>`).join('');
  $('#respin-count').textContent = `(${builder.respins})`;
  $('#btn-respin').disabled = builder.respins <= 0;
}

function renderCard(p) {
  $('#spin-empty').hidden = true;
  $('#spin-card').hidden = false;
  const tierWord = { legend: 'legend', spec: 'specialist', current: 'on tour' }[p.tier] || p.tier;
  $('#card-tier').textContent = tierWord;
  $('#card-tier').className = 'tier-tag ' + p.tier;
  $('#card-name').textContent = p.name;
  $('#card-country').textContent = p.country;
  $('#card-sig').textContent = '“' + p.signature + '”';
  $('#attr-choices').innerHTML = ATTRS.map(a => {
    const taken = !!builder.slots[a.key];
    const v = p.attrs[a.key];
    return `<button class="attr-btn" data-k="${a.key}" ${taken ? 'disabled' : ''} title="${esc(a.blurb)}">
      <span class="v ${vClass(v)}">${v}</span>
      <span class="k">${a.label}</span>
    </button>`;
  }).join('');
  $('#spin-card').classList.remove('rolling');
  void $('#spin-card').offsetWidth;
  $('#spin-card').classList.add('rolling');
}

async function doSpin(isRespin) {
  if (busy) return;
  busy = true;
  $('#btn-spin').disabled = true; $('#btn-respin').disabled = true;
  const target = isRespin ? builder.respin() : builder.spin();
  if (!target) { busy = false; return; }
  // roll through a few names before settling
  const reel = shuffle(builder.pool).slice(0, 7);
  $('#spin-empty').hidden = true;
  $('#spin-card').hidden = false;
  for (let i = 0; i < reel.length; i++) {
    $('#card-name').textContent = reel[i].name;
    $('#card-country').textContent = reel[i].country;
    $('#card-sig').textContent = '';
    $('#attr-choices').innerHTML = '';
    $('#card-tier').textContent = '···';
    $('#card-tier').className = 'tier-tag';
    await sleep(60 + i * 26);
  }
  renderCard(target);
  renderBuilder();
  busy = false;
}

$('#btn-spin').addEventListener('click', () => doSpin(false));
$('#btn-respin').addEventListener('click', () => {
  if (builder.respins <= 0) return;
  doSpin(true);
});
$('#attr-choices').addEventListener('click', e => {
  const b = e.target.closest('.attr-btn');
  if (!b || b.disabled || busy) return;
  const key = b.dataset.k;
  const label = ATTRS.find(a => a.key === key).label;
  const from = builder.current.name;
  builder.take(key);
  toast(`${label} taken from ${from}`, 'good');
  renderBuilder();
  if (builder.done) { revealPlayer(); return; }
  $('#spin-card').hidden = true;
  $('#spin-empty').hidden = false;
  $('#spin-empty').querySelector('p').textContent =
    `${builder.remaining.length} slot${builder.remaining.length === 1 ? '' : 's'} left: ` +
    builder.remaining.map(k => ATTRS.find(a => a.key === k).label).join(', ') + '.';
  $('#btn-spin').disabled = false;
  $('#btn-spin').textContent = 'Spin again';
});

/* ---------- reveal ------------------------------------------------------- */
function playerCardHTML(p, opts) {
  opts = opts || {};
  const ovr = overall(p);
  const rows = ATTRS.map(a => {
    const v = p.attrs[a.key];
    const src = opts.sources && opts.sources[a.key];
    return `<div class="bar-row">
        <span class="bl">${a.label}</span>
        <span class="bar-track"><span class="bar-fill" style="width:${(v - 35) / 0.64}%"></span></span>
        <span class="bv ${vClass(v)}">${v}</span>
      </div>${src ? `<div class="bar-from">from ${esc(src.from)}</div>` : ''}`;
  }).join('');
  return `<div class="pcard">
    <div class="pcard-top">
      <div>
        <div class="pcard-name">${esc(p.name)}</div>
        <div class="pcard-meta">${p.country} · ${p.age} yrs · ${p.hand === 'L' ? 'Left' : 'Right'}-handed · ${p.bh === 1 ? 'one' : 'two'}-handed backhand</div>
      </div>
      <div class="pcard-ovr"><b>${ovr}</b><span>Overall</span></div>
    </div>
    <div class="bars">${rows}</div>
  </div>`;
}

function makeUserPlayer() {
  return makePlayer(identity.name, identity.country, builder.attrs(), {
    id: 'user', isUser: true, hand: identity.hand, bh: identity.bh, age: identity.age
  });
}

function revealPlayer() {
  const p = makeUserPlayer();
  $('#reveal-card').innerHTML = playerCardHTML(p, { sources: builder.slots });
  show('screen-reveal');
  requestAnimationFrame(() => $$('.bar-fill').forEach(b => { const w = b.style.width; b.style.width = '0'; requestAnimationFrame(() => b.style.width = w); }));
}
$('#btn-rebuild').addEventListener('click', () => {
  builder = new Builder(POOL_RAW, ATTR_KEYS);
  renderBuilder();
  $('#spin-card').hidden = true; $('#spin-empty').hidden = false;
  $('#btn-spin').disabled = false; $('#btn-spin').textContent = 'Spin';
  $('#spin-empty').querySelector('p').textContent = 'Eight slots. Eight different players. Pick the skill you want off each one.';
  show('screen-builder');
});
$('#btn-start-career').addEventListener('click', () => {
  career = new Career({ user: makeUserPlayer(), year: 2026 });
  career.say(`${career.user.name} turns pro.`, 'good');
  career.save();
  renderHub(); show('screen-hub');
});

/* ---------- hub ---------------------------------------------------------- */
function renderHub() {
  const u = career.user;
  const ovr = overall(u);
  $('#hub-header').innerHTML = `
    <div>
      <div class="hh-name">${esc(u.name)}</div>
      <div class="hh-sub">${u.country} · ${u.age} yrs · OVR ${ovr} · ${career.year} season</div>
    </div>
    <div class="hh-stats">
      <div class="hh-stat"><b>${u.rank}</b><span>Rank</span></div>
      <div class="hh-stat"><b>${fmtPts(u.rankPts)}</b><span>Points</span></div>
      <div class="hh-stat"><b>${u.season.w}-${u.season.l}</b><span>Season</span></div>
      <div class="hh-stat"><b>${u.career.titles}</b><span>Titles</span></div>
      <div class="hh-stat"><b>${u.career.slams}</b><span>Slams</span></div>
      <div class="hh-stat meter">
        <div class="meter-lab"><span>Form</span><span>${Math.round((u.form - 0.9) * 500)}%</span></div>
        <span class="bar-track"><span class="bar-fill fill-form" style="width:${Math.round((u.form - 0.9) * 500)}%"></span></span>
        <div class="meter-lab" style="margin-top:8px"><span>Fatigue</span><span>${Math.round(u.fatigue)}%</span></div>
        <span class="bar-track"><span class="bar-fill fill-fat" style="width:${Math.round(u.fatigue)}%"></span></span>
      </div>
    </div>`;
  $('#hub-year').textContent = career.year;
  $('#ovr-sub').textContent = 'OVR ' + ovr;
  $('#hub-attrs').innerHTML = '<div class="bars">' + ATTRS.map(a => {
    const v = u.attrs[a.key];
    return `<div class="bar-row">
      <span class="bl">${a.label}</span>
      <span class="bar-track"><span class="bar-fill" style="width:${(v - 35) / 0.64}%"></span></span>
      <span class="bv ${vClass(v)}">${v}</span>
    </div>`;
  }).join('') + '</div>' +
  (career.honours.length ? '<ul class="honours">' + career.honours.slice(-6).map(x => `<li>${x.year} · ${esc(x.text)}</li>`).join('') + '</ul>' : '');
  renderCalendar();
  renderRankings();
  $('#news-list').innerHTML = career.messages.slice(0, 14)
    .map(m => `<li class="${m.kind}">${esc(m.msg)}</li>`).join('') || '<li>Season not started.</li>';
}

function renderCalendar() {
  const done = career.eventIndex;
  $('#cal-list').innerHTML = CALENDAR.map((ev, i) => {
    const logged = career.seasonLog.find(l => l.ev === ev.id);
    const isNext = i === done;
    const cls = i < done ? 'past' : isNext ? 'next' : '';
    let right = '';
    if (logged) {
      right = `<div class="cal-res ${logged.result === 'Champion' ? 'win' : ''}">
                 <b>${logged.pts ? fmtPts(logged.pts) : '—'}</b>${esc(logged.result)}</div>`;
    } else if (isNext) {
      right = `<div class="cal-actions">
          <button class="btn btn-primary" data-enter="${ev.id}">Enter</button>
          ${ev.cat === 'finals' ? '' : `<button class="btn btn-ghost" data-skip="${ev.id}">Skip</button>`}
        </div>`;
    }
    return `<li class="cal-row ${cls}">
      <span class="cal-wk">WK ${ev.week}</span>
      <div>
        <div class="cal-name">${esc(ev.name)}</div>
        <div class="cal-sub">${surfTag(ev.surface)}<span class="${ev.cat === 'gs' ? 'cat-gs' : ''}">${catLabel(ev.cat)}</span><span>${esc(ev.city)}</span>${ev.bestOf === 5 ? '<span>best of 5</span>' : ''}</div>
      </div>
      ${right}
    </li>`;
  }).join('');

  $$('[data-enter]').forEach(b => b.addEventListener('click', () => openEvent(true)));
  $$('[data-skip]').forEach(b => b.addEventListener('click', () => {
    const ev = career.nextEvent;
    career.startEvent(false);
    career.simRestOfEvent();
    career.say(`You sat out ${ev.name}. Legs feel better for it.`, 'info');
    toast(`Skipped ${ev.name}`);
    afterEvent();
  }));
}

function renderRankings() {
  if (!career) return;
  const rows = rankMode === 'live'
    ? career.standings.slice(0, 25).map(r => ({ p: r.p, pts: r.pts }))
    : career.raceStandings().slice(0, 25);
  const me = career.user;
  let html = rows.map((r, i) => `<li class="rank-row ${r.p.isUser ? 'me' : ''}">
      <span class="rn">${i + 1}</span>
      <span class="pn"><span class="flag">${r.p.country}</span>${esc(r.p.name)}</span>
      <span class="pp">${fmtPts(r.pts)}</span>
    </li>`).join('');
  if (!rows.some(r => r.p.isUser)) {
    const pts = rankMode === 'live' ? me.rankPts : racePoints(me);
    const pos = rankMode === 'live' ? me.rank : career.raceStandings().findIndex(r => r.p.isUser) + 1;
    html += `<li class="rank-row me"><span class="rn">${pos > 0 ? pos : '—'}</span>
      <span class="pn"><span class="flag">${me.country}</span>${esc(me.name)}</span>
      <span class="pp">${fmtPts(pts)}</span></li>`;
  }
  $('#rank-list').innerHTML = html;
}

/* ---------- event -------------------------------------------------------- */
function openEvent(userEnters) {
  career.startEvent(userEnters);
  renderEventHeader();
  $('#match-view').innerHTML = '';
  renderBracket();
  if (career.current.phase === 'finals') { renderFinals(); show('screen-event'); return; }
  if (!career.current.userInMain && career.current.phase === 'main' && !career.current.qual) {
    // user isn't in this draw at all
    simThroughNoUser();
  } else {
    $('#ev-actions').innerHTML = `<button class="btn btn-primary btn-lg" id="btn-play">${career.current.phase === 'qual' ? 'Play qualifying' : 'Play first round'}</button>`;
    $('#btn-play').addEventListener('click', playRound);
    $('#match-view').innerHTML = `<div class="round-label">${career.current.phase === 'qual'
      ? `Ranked #${career.user.rank} — you have to qualify` : 'Main draw'}</div>
      <p style="text-align:center;color:var(--muted)">Draw is out. ${career.current.phase === 'qual'
        ? 'Two wins gets you into the main draw.' : 'Win five matches and the trophy is yours.'}</p>`;
  }
  show('screen-event');
}

function renderEventHeader() {
  const ev = career.current.ev;
  $('#ev-header').innerHTML = `
    <div>
      <h2>${esc(ev.name)}</h2>
      <div class="ev-meta">${surfTag(ev.surface)}<span>${catLabel(ev.cat)}</span><span>${esc(ev.city)}</span><span>Week ${ev.week}</span><span>Best of ${ev.bestOf}</span></div>
    </div>`;
  $('#draw-sub').textContent = career.current.phase === 'qual' ? 'Qualifying' : `${career.current.ev.draw} draw`;
}

async function playRound() {
  if (busy) return;
  busy = true;
  $('#ev-actions').innerHTML = '';
  const out = career.advance();
  if (!out) { busy = false; return; }
  const um = out.userMatch;
  if (um) {
    await revealMatch(um, out);
  } else {
    $('#match-view').innerHTML = `<div class="round-label">Round complete</div>`;
    showOtherResults(out.matches, null);
  }
  renderBracket();
  renderEventActions(out);
  busy = false;
}

async function revealMatch(m, out) {
  const meIsA = m.a.isUser;
  const me = meIsA ? m.a : m.b, them = meIsA ? m.b : m.a;
  const res = m.res;
  const mv = $('#match-view');
  mv.innerHTML = `
    <div class="round-label">${esc(m.round)}</div>
    <div class="matchup">
      <div class="mp you"><div class="mp-name">${esc(me.name)}</div><div class="mp-sub">${me.country} · #${me.rank || '—'} · OVR ${overall(me)}</div></div>
      <div class="vs">VS</div>
      <div class="mp"><div class="mp-name">${esc(them.name)}</div><div class="mp-sub">${them.country} · #${them.rank || '—'} · OVR ${overall(them)}</div></div>
    </div>
    <div class="score-strip" id="score-strip"></div>
    <div id="match-outcome"></div>`;
  const strip = $('#score-strip');
  for (let i = 0; i < res.sets.length; i++) {
    await sleep(620);
    const s = res.sets[i];
    const mine = meIsA ? s.a : s.b, theirs = meIsA ? s.b : s.a;
    const tb = s.tb ? `<sup>${Math.min(s.tb.a, s.tb.b)}</sup>` : '';
    const box = document.createElement('div');
    box.className = 'set-box ' + (mine > theirs ? 'won' : '');
    box.innerHTML = `<div class="sg">${mine}–${theirs}${tb}</div><div class="sl">Set ${i + 1}</div>`;
    strip.appendChild(box);
  }
  await sleep(420);
  const won = res.winnerId === me.id;
  const ms = meIsA ? res.stats.A : res.stats.B, ts = meIsA ? res.stats.B : res.stats.A;
  const pct = (a, b) => b ? Math.round(100 * a / b) + '%' : '—';
  $('#match-outcome').innerHTML = `
    <div class="match-result ${won ? 'win' : 'loss'}">${won ? 'You win' : 'You lose'} · ${res.minutes} minutes</div>
    <table class="stat-table">
      <tr><td>${ms.aces}</td><td>Aces</td><td>${ts.aces}</td></tr>
      <tr><td>${ms.df}</td><td>Double faults</td><td>${ts.df}</td></tr>
      <tr><td>${pct(ms.svPtsWon, ms.svPts)}</td><td>Serve points won</td><td>${pct(ts.svPtsWon, ts.svPts)}</td></tr>
      <tr><td>${ms.bpWon}/${ts.bpFaced}</td><td>Break points</td><td>${ts.bpWon}/${ms.bpFaced}</td></tr>
      <tr><td>${ms.winners}</td><td>Winners</td><td>${ts.winners}</td></tr>
      <tr><td>${ms.ptsWon}</td><td>Total points</td><td>${ts.ptsWon}</td></tr>
    </table>`;
  showOtherResults(out.matches, me.id);
}

function showOtherResults(matches, meId) {
  const others = matches.filter(m => m.a.id !== meId && m.b.id !== meId).slice(0, 8);
  if (!others.length) return;
  const html = `<div class="other-results"><h4>Elsewhere in the draw</h4>${others.map(m => {
    const w = m.res.winner, l = m.res.loser;
    return `<div class="orow"><span><b>${esc(w.name)}</b> d. ${esc(l.name)}</span><span>${m.res.scorelineFor(w.id)}</span></div>`;
  }).join('')}</div>`;
  $('#match-view').insertAdjacentHTML('beforeend', html);
}

function renderEventActions(out) {
  const c = career.current;
  const box = $('#ev-actions');
  const backBtn = `<button class="btn btn-ghost" id="btn-back-hub">Back to the tour</button>`;

  if (c.phase === 'qual' && !c.qual.champion) {
    box.innerHTML = `<button class="btn btn-primary btn-lg" id="btn-play">Play qualifying final</button>`;
  } else if (out && out.qualDone && !c.userInMain) {
    box.innerHTML = `<button class="btn btn-primary" id="btn-sim">Watch the main draw</button>` + backBtn;
  } else if (c.main && c.main.champion) {
    box.innerHTML = backBtn;
    announceEventEnd();
  } else if (out && out.userMatch && !out.userThrough) {
    box.innerHTML = `<button class="btn btn-primary" id="btn-sim">Play out the rest</button>` + backBtn;
  } else if (c.main && !c.main.champion) {
    const nextName = c.main.roundName(c.main.roundIndex);
    box.innerHTML = `<button class="btn btn-primary btn-lg" id="btn-play">Play ${nextName.toLowerCase()}</button>`;
  } else {
    box.innerHTML = backBtn;
  }
  if ($('#btn-play')) $('#btn-play').addEventListener('click', playRound);
  if ($('#btn-sim'))  $('#btn-sim').addEventListener('click', simThrough);
  if ($('#btn-back-hub')) $('#btn-back-hub').addEventListener('click', afterEvent);
}

async function simThrough() {
  if (busy) return;
  busy = true;
  $('#ev-actions').innerHTML = '';
  career.simRestOfEvent();
  renderBracket();
  announceEventEnd();
  $('#ev-actions').innerHTML = `<button class="btn btn-ghost" id="btn-back-hub">Back to the tour</button>`;
  $('#btn-back-hub').addEventListener('click', afterEvent);
  busy = false;
}

function simThroughNoUser() {
  career.simRestOfEvent();
  renderBracket();
  announceEventEnd();
  $('#ev-actions').innerHTML = `<button class="btn btn-ghost" id="btn-back-hub">Back to the tour</button>`;
  $('#btn-back-hub').addEventListener('click', afterEvent);
}

function announceEventEnd() {
  const c = career.current;
  if (!c.main || !c.main.champion) return;
  const champ = c.main.champion;
  const fin = c.main.rounds[c.main.rounds.length - 1][0];
  const wins = c.main.wins[career.user.id];
  const mine = wins === undefined ? null : (wins >= c.main.totalRounds ? 'Champion' : c.main.roundName(wins));
  $('#match-view').insertAdjacentHTML('beforeend', `
    <div class="other-results">
      <h4>Final</h4>
      <div class="orow"><span><b>${esc(champ.name)}</b> d. ${esc(fin.res.loser.name)}</span><span>${fin.res.scorelineFor(champ.id)}</span></div>
      ${mine ? `<div class="orow" style="margin-top:8px"><span>Your run</span><span><b>${esc(mine)}</b> · ${fmtPts(career.user.res[c.ev.id] || 0)} pts</span></div>` : ''}
    </div>`);
}

function renderFinals() {
  const c = career.current, f = c.finals;
  const rows = f.matches.map(m => `<div class="orow"><span>${esc(m.round)}: <b>${esc(m.res.winner.name)}</b> d. ${esc(m.res.loser.name)}</span><span>${m.res.scorelineFor(m.res.winner.id)}</span></div>`).join('');
  $('#match-view').innerHTML = `
    <div class="round-label">Round robin · top 8 of the race</div>
    ${c.userInMain ? '' : '<p style="text-align:center;color:var(--muted);margin-bottom:14px">You did not qualify — top eight only.</p>'}
    <div class="matchup"><div class="mp you"><div class="mp-name">${esc(f.champion.name)}</div><div class="mp-sub">Tour Finals champion</div></div></div>
    <div class="other-results">${rows}</div>`;
  $('#ev-actions').innerHTML = `<button class="btn btn-ghost" id="btn-back-hub">Back to the tour</button>`;
  $('#btn-back-hub').addEventListener('click', afterEvent);
  $('#bracket').innerHTML = '';
}

function renderBracket() {
  const c = career.current;
  if (!c) return;
  const t = c.phase === 'qual' ? c.qual : c.main;
  $('#draw-sub').textContent = c.phase === 'qual' ? 'Qualifying' : c.ev.draw + ' draw';
  if (!t) { $('#bracket').innerHTML = ''; return; }
  const meId = career.user.id;
  const cols = t.rounds.map((round, ri) => {
    const cells = round.map(m => {
      const w = m.res.winner, l = m.res.loser;
      const setsWon = p => m.res.sets.filter(s => (p.id === m.a.id ? s.a > s.b : s.b > s.a)).length;
      const line = (p, isW) => `<div class="bp ${isW ? 'w' : ''} ${p.id === meId ? 'me' : ''}">
          <span class="nm">${esc(p.name)}</span><span class="bs">${setsWon(p)}</span>
        </div>`;
      return `<div class="bmatch">${line(m.a, m.a.id === w.id)}${line(m.b, m.b.id === w.id)}</div>`;
    }).join('');
    return `<div class="bcol"><h5>${t.roundName(ri)}</h5>${cells}</div>`;
  });
  if (!t.champion) {
    const pend = [];
    for (let i = 0; i < t.alive.length; i += 2) {
      const a = t.alive[i], b = t.alive[i + 1];
      pend.push(`<div class="bmatch">
        <div class="bp ${a.id === meId ? 'me' : ''}"><span class="nm">${esc(a.name)}</span><span class="bs">–</span></div>
        <div class="bp ${b && b.id === meId ? 'me' : ''}"><span class="nm">${b ? esc(b.name) : '—'}</span><span class="bs">–</span></div>
      </div>`);
    }
    if (pend.length) cols.push(`<div class="bcol"><h5>${t.roundName(t.roundIndex)}</h5>${pend.join('')}</div>`);
  } else {
    cols.push(`<div class="bcol"><h5>Champion</h5><div class="bmatch"><div class="bp w ${t.champion.id === meId ? 'me' : ''}"><span class="nm">${esc(t.champion.name)}</span><span class="bs">🏆</span></div></div></div>`);
  }
  $('#bracket').innerHTML = cols.join('');
}

function afterEvent() {
  career.closeEvent();
  career.save();
  if (career.seasonOver) { renderSeasonEnd(); show('screen-season-end'); return; }
  renderHub(); show('screen-hub');
}

/* ---------- season end --------------------------------------------------- */
let pendingSummary = null;
function renderSeasonEnd() {
  const s = career.endSeason();
  pendingSummary = s;
  career.save();
  const u = career.user;
  const rows = s.log.map(l => `<tr class="${l.result === 'Champion' ? 'hl' : ''}">
      <td>${esc(l.name)}</td><td>${SURFACES[l.surface].label}</td>
      <td>${esc(l.result)}</td><td style="text-align:right">${l.pts ? fmtPts(l.pts) : '—'}</td></tr>`).join('');
  const top = s.top10.map((t, i) => `<tr class="${t.isUser ? 'hl' : ''}">
      <td>${i + 1}</td><td>${esc(t.name)}</td><td style="text-align:right">${fmtPts(t.pts)}</td></tr>`).join('');
  $('#season-end-body').innerHTML = `
    <h2 class="screen-title">${s.year} season review</h2>
    <div class="summary-grid">
      <div class="sum-tile"><b>#${s.userRank}</b><span>Year-end rank</span></div>
      <div class="sum-tile"><b>${fmtPts(s.userPts)}</b><span>Points</span></div>
      <div class="sum-tile"><b>${s.w}-${s.l}</b><span>Win-loss</span></div>
      <div class="sum-tile"><b>${s.titles}</b><span>Titles</span></div>
      <div class="sum-tile"><b>${u.career.slams}</b><span>Career slams</span></div>
      <div class="sum-tile"><b>$${(u.career.prize / 1e6).toFixed(1)}m</b><span>Career prize</span></div>
    </div>
    <p style="color:var(--muted);margin-bottom:16px">World No. 1: <strong style="color:var(--txt)">${esc(s.no1)}</strong></p>
    ${career.honours.length ? `<ul class="honours">${career.honours.map(h => `<li>${h.year} · ${esc(h.text)}</li>`).join('')}</ul>` : ''}
    <h3 style="margin:26px 0 6px;font-size:20px;text-transform:uppercase;letter-spacing:.06em">Your season</h3>
    <table class="season-table"><thead><tr><th>Event</th><th>Surface</th><th>Result</th><th style="text-align:right">Pts</th></tr></thead><tbody>${rows}</tbody></table>
    <h3 style="margin:26px 0 6px;font-size:20px;text-transform:uppercase;letter-spacing:.06em">Year-end top 10</h3>
    <table class="season-table"><tbody>${top}</tbody></table>
    <div class="row-end"><button class="btn btn-primary btn-lg" id="btn-offseason">Pre-season training</button></div>`;
  $('#btn-offseason').addEventListener('click', renderOffseason);
}

/* ---------- off-season --------------------------------------------------- */
function renderOffseason() {
  const u = career.user;
  const budget = career.trainingPoints();
  const spend = {}; ATTR_KEYS.forEach(k => spend[k] = 0);
  const draw = () => {
    const used = ATTR_KEYS.reduce((t, k) => t + spend[k], 0);
    $('#offseason-body').innerHTML = `
      <h2 class="screen-title">Pre-season</h2>
      <p style="color:var(--muted);margin-bottom:6px">Winter block. You have <strong style="color:var(--acc)">${budget - used}</strong> of ${budget} training points left.
      Age also moves your numbers on its own — ${u.age} going on ${u.age + 1}.</p>
      <div style="margin-top:18px">${ATTRS.map(a => {
        const v = u.attrs[a.key], nv = v + spend[a.key];
        return `<div class="train-row">
          <span class="bl" style="font-size:12px;text-transform:uppercase;letter-spacing:.1em;color:var(--muted)">${a.label}</span>
          <span class="bar-track"><span class="bar-fill" style="width:${(nv - 35) / 0.64}%"></span></span>
          <span class="bv ${vClass(nv)}" style="font-family:'Barlow Condensed';font-size:20px;font-weight:700;text-align:right">${nv}</span>
          <span class="train-btns">
            <button class="tbtn" data-dec="${a.key}" ${spend[a.key] <= 0 ? 'disabled' : ''}>−</button>
            <button class="tbtn" data-inc="${a.key}" ${used >= budget || nv >= 99 ? 'disabled' : ''}>+</button>
          </span>
        </div>`;
      }).join('')}</div>
      <div class="row-end"><button class="btn btn-primary btn-lg" id="btn-next-season">Start ${career.year + 1}</button></div>`;
    $$('[data-inc]').forEach(b => b.addEventListener('click', () => { spend[b.dataset.inc]++; draw(); }));
    $$('[data-dec]').forEach(b => b.addEventListener('click', () => { spend[b.dataset.dec]--; draw(); }));
    $('#btn-next-season').addEventListener('click', () => {
      career.newSeason(spend);
      career.say(`${career.year} season begins.`, 'info');
      career.save();
      renderHub(); show('screen-hub');
    });
  };
  draw();
  show('screen-offseason');
}
