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
// where a completed build should land: 'career' (default) or a doubles seat
let builderTarget = 'career';
let rookie = null;
let doublesSlots = [null, null, null, null];
let singlesSlots = [null, null];

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
/* ---------- modal ---------------------------------------------------------
   Published pages run in a sandboxed iframe where window.confirm() is
   silently suppressed — it returns false without ever showing anything, so
   any "if (!confirm(...)) return" gate becomes a dead click the moment it's
   reachable. These replace every such gate with a real in-page dialog. */
function modalConfirm(title, body, confirmLabel, danger) {
  return new Promise(resolve => {
    const backdrop = $('#modal-backdrop');
    $('#modal-box').innerHTML = `
      <h3 class="modal-title">${esc(title)}</h3>
      <p class="modal-body">${esc(body)}</p>
      <div class="modal-actions">
        <button class="btn btn-ghost" id="modal-cancel">Cancel</button>
        <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" id="modal-ok">${esc(confirmLabel || 'Confirm')}</button>
      </div>`;
    backdrop.hidden = false;
    const close = val => { backdrop.hidden = true; resolve(val); };
    $('#modal-cancel').addEventListener('click', () => close(false));
    $('#modal-ok').addEventListener('click', () => close(true));
    backdrop.addEventListener('click', e => { if (e.target === backdrop) close(false); }, { once: true });
  });
}
function modalPickSlot(title, body, slots) {
  return new Promise(resolve => {
    const backdrop = $('#modal-backdrop');
    const rows = slots.map(s => `
      <button class="modal-slot-btn" data-slot="${s.slot}">
        <span class="msn">${esc(s.meta.name)}</span>
        <span class="mss">${s.meta.year} · OVR ${s.meta.ovr}${s.meta.titles ? ` · ${s.meta.titles} title${s.meta.titles === 1 ? '' : 's'}` : ''}</span>
      </button>`).join('');
    $('#modal-box').innerHTML = `
      <h3 class="modal-title">${esc(title)}</h3>
      <p class="modal-body">${esc(body)}</p>
      <div class="modal-slots">${rows}</div>
      <div class="modal-actions"><button class="btn btn-ghost" id="modal-cancel">Cancel</button></div>`;
    backdrop.hidden = false;
    const close = val => { backdrop.hidden = true; resolve(val); };
    $('#modal-cancel').addEventListener('click', () => close(null));
    $$('.modal-slot-btn').forEach(b => b.addEventListener('click', () => close(parseInt(b.dataset.slot, 10))));
    backdrop.addEventListener('click', e => { if (e.target === backdrop) close(null); }, { once: true });
  });
}

function vClass(v) { return v >= 93 ? 'v-elite' : v >= 86 ? 'v-great' : v >= 76 ? 'v-ok' : 'v-meh'; }
function surfTag(s) { return `<span class="surf-tag s-${s}">${SURFACES[s].label}</span>`; }
function catLabel(c) { return { gs: 'Grand Slam', m1000: 'Masters 1000', atp500: 'ATP 500', finals: 'Tour Finals' }[c] || c; }
function fmtPts(n) { return n.toLocaleString('en-US'); }
function fmtMoney(n) {
  const s = n < 0 ? '-' : '';
  n = Math.abs(n);
  if (n >= 1e6) return s + '$' + (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + 'm';
  if (n >= 1e3) return s + '$' + Math.round(n / 1e3) + 'k';
  return s + '$' + n;
}

/* ---------- home --------------------------------------------------------- */
$('#btn-new').addEventListener('click', () => {
  show('screen-identity');
  $('#in-name').focus();
});
$('#btn-careers').addEventListener('click', () => { renderSaves(); show('screen-saves'); });
$$('[data-goto]').forEach(b => b.addEventListener('click', () => show(b.dataset.goto)));

/* ---------- save slots ---------------------------------------------------- */
function renderSaves() {
  const slots = Career.listSlots();
  $('#saves-list').innerHTML = slots.map(s => {
    if (!s.meta) return `<div class="save-slot empty">
        <div class="save-slot-main"><span class="save-slot-empty-label">Slot ${s.slot} — empty</span></div>
      </div>`;
    const m = s.meta;
    return `<div class="save-slot">
        <div class="save-slot-main">
          <div class="save-slot-name">${esc(m.name)}</div>
          <div class="save-slot-meta">${m.country} · ${m.year} season${m.era ? ` · ${esc(m.era)}` : ''} · OVR ${m.ovr}${m.rank ? ` · #${m.rank}` : ''}${m.titles ? ` · ${m.titles} title${m.titles === 1 ? '' : 's'}` : ''}</div>
        </div>
        <div class="save-slot-actions">
          <button class="btn btn-primary" data-load="${s.slot}">Continue</button>
          <button class="btn btn-danger" data-delete="${s.slot}">Delete</button>
        </div>
      </div>`;
  }).join('');
  $$('[data-load]').forEach(b => b.addEventListener('click', () => {
    const c = Career.load(parseInt(b.dataset.load, 10));
    if (!c) { toast('That save could not be read', 'bad'); return; }
    career = c;
    renderHub(); show('screen-hub');
  }));
  $$('[data-delete]').forEach(b => b.addEventListener('click', async () => {
    const slot = parseInt(b.dataset.delete, 10);
    const s = slots.find(x => x.slot === slot);
    const ok = await modalConfirm('Delete this career?', `${s.meta.name}'s career will be gone for good. This can't be undone.`, 'Delete', true);
    if (!ok) return;
    Career.clear(slot);
    renderSaves();
    toast('Career deleted');
  }));
}

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

function resetBuilder() {
  builder = new Builder(POOL_RAW, ATTR_KEYS);
  rookie = new RookieSpinner(ERAS, ROOKIE_ROUTES);
  resetRookieScreen();
  renderBuilder();
  $('#spin-card').hidden = true; $('#spin-empty').hidden = false;
  $('#btn-spin').disabled = false; $('#btn-spin').textContent = 'Spin';
  $('#spin-empty').querySelector('p').textContent = 'Eight slots. Eight different players. Pick the skill you want off each one.';
}

$('#btn-to-builder').addEventListener('click', () => {
  identity.name    = ($('#in-name').value || '').trim() || 'Your Player';
  identity.country = $('#in-country').value;
  identity.age     = parseInt($('#in-age').value, 10);
  identity.hand    = $('.seg-btn.active', $('#seg-hand')).dataset.v;
  identity.bh      = parseInt($('.seg-btn.active', $('#seg-bh')).dataset.v, 10);
  resetBuilder();
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
  if (builder.done) {
    if (builderTarget !== 'career') {
      const target = builderTarget;
      builderTarget = 'career';
      const built = makePlayer(target.name, 'AUS', builder.attrs(), { age: 19 + rndInt(8) });
      if (target.mode === 'singles') {
        singlesSlots[target.slot] = built;
        renderSinglesSetup();
        show('screen-singles-setup');
      } else {
        doublesSlots[target.slot] = built;
        renderDoublesSetup();
        show('screen-doubles-setup');
      }
      return;
    }
    show('screen-rookie');
    return;
  }
  $('#spin-card').hidden = true;
  $('#spin-empty').hidden = false;
  $('#spin-empty').querySelector('p').textContent =
    `${builder.remaining.length} slot${builder.remaining.length === 1 ? '' : 's'} left: ` +
    builder.remaining.map(k => ATTRS.find(a => a.key === k).label).join(', ') + '.';
  $('#btn-spin').disabled = false;
  $('#btn-spin').textContent = 'Spin again';
});

/* ---------- rookie year --------------------------------------------------
   The wheel lands on a season; you choose one of three routes into it. Same
   deal as the skill wheel — the choice is yours, the options are not.
------------------------------------------------------------------------- */
function resetRookieScreen() {
  $('#rookie-card').hidden = true;
  $('#rookie-empty').hidden = false;
  $('#btn-rookie-spin').disabled = false;
  renderRookiePips();
}

function renderRookiePips() {
  const left = rookie ? rookie.respins : 0;
  $('#rookie-pips').innerHTML = [0, 1].map(i => `<span class="pip ${i < left ? '' : 'spent'}"></span>`).join('');
  $('#rookie-respin-count').textContent = `(${left})`;
  $('#btn-rookie-respin').disabled = left <= 0;
}

/* the three biggest names in the era's field — what the year actually feels
   like to walk into */
function eraFacesHTML(era) {
  return era.tour.slice(0, 3).map(r =>
    `<span class="era-face"><b>${esc(r[0])}</b><i>${r[1]}</i></span>`).join('');
}

function routeEffectsHTML(route) {
  const bits = [];
  bits.push(`<span class="fx"><b>${route.pts || 0}</b> pts</span>`);
  bits.push(`<span class="fx"><b>${fmtMoney(route.cash || 0)}</b></span>`);
  if (route.wildcards) bits.push(`<span class="fx"><b>${route.wildcards}</b> wildcard${route.wildcards === 1 ? '' : 's'}</span>`);
  const b = route.bonus || {};
  Object.keys(b).forEach(k => {
    const label = k === 'all' ? 'everything' : k === 'lowest' ? 'weakest rating'
      : (ATTRS.find(a => a.key === k) || {}).label || k;
    bits.push(`<span class="fx up"><b>+${b[k]}</b> ${esc(label)}</span>`);
  });
  return bits.join('');
}

function renderRookieCard(cur) {
  $('#rookie-empty').hidden = true;
  $('#rookie-card').hidden = false;
  $('#rookie-year').textContent = cur.era.year;
  $('#rookie-era-name').textContent = cur.era.name;
  $('#rookie-era-blurb').textContent = cur.era.blurb;
  $('#rookie-era-faces').innerHTML =
    `<span class="era-faces-label">Top of the field</span>` + eraFacesHTML(cur.era);
  $('#route-choices').innerHTML = cur.routes.map(r => `
    <button class="route-btn" data-route="${r.id}">
      <span class="route-name">${esc(r.name)}</span>
      <span class="route-blurb">${esc(r.blurb)}</span>
      <span class="route-fx">${routeEffectsHTML(r)}</span>
    </button>`).join('');
  $('#rookie-card').classList.remove('rolling');
  void $('#rookie-card').offsetWidth;
  $('#rookie-card').classList.add('rolling');
  renderRookiePips();
}

async function doRookieSpin(isRespin) {
  if (busy || !rookie) return;
  busy = true;
  $('#btn-rookie-spin').disabled = true;
  $('#btn-rookie-respin').disabled = true;
  const cur = isRespin ? rookie.respin() : rookie.spin();
  if (!cur) { busy = false; renderRookiePips(); return; }
  // roll through a few seasons before settling, same as the skill wheel
  $('#rookie-empty').hidden = true;
  $('#rookie-card').hidden = false;
  $('#route-choices').innerHTML = '';
  $('#rookie-era-faces').innerHTML = '';
  const reel = shuffle(ERAS.slice()).slice(0, 5);
  for (let i = 0; i < reel.length; i++) {
    $('#rookie-year').textContent = reel[i].year;
    $('#rookie-era-name').textContent = reel[i].name;
    $('#rookie-era-blurb').textContent = '';
    await sleep(70 + i * 32);
  }
  renderRookieCard(cur);
  busy = false;
}

$('#btn-rookie-spin').addEventListener('click', () => doRookieSpin(false));
$('#btn-rookie-respin').addEventListener('click', () => {
  if (!rookie || rookie.respins <= 0) return;
  doRookieSpin(true);
});
$('#route-choices').addEventListener('click', e => {
  const b = e.target.closest('.route-btn');
  if (!b || busy || !rookie) return;
  const picked = rookie.take(b.dataset.route);
  if (!picked) return;
  toast(`${picked.route.name} — turning pro in ${picked.era.year}`, 'good');
  revealPlayer();
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
  const route = rookie && rookie.picked ? rookie.picked.route : null;
  return makePlayer(identity.name, identity.country, applyRouteBonus(builder.attrs(), route), {
    id: 'user', isUser: true, hand: identity.hand, bh: identity.bh, age: identity.age
  });
}

function revealPlayer() {
  const p = makeUserPlayer();
  const pick = rookie && rookie.picked;
  const banner = pick ? `<div class="reveal-rookie">
      <span class="rr-year">${pick.era.year}</span>
      <div>
        <b>${esc(pick.route.name)}</b>
        <span>${esc(pick.era.name)} · starting on ${pick.route.pts || 0} pts with ${fmtMoney(pick.route.cash || 0)}${pick.route.wildcards ? ` and ${pick.route.wildcards} wildcard${pick.route.wildcards === 1 ? '' : 's'}` : ''}</span>
      </div>
    </div>` : '';
  $('#reveal-card').innerHTML = banner + playerCardHTML(p, { sources: builder.slots });
  show('screen-reveal');
  requestAnimationFrame(() => $$('.bar-fill').forEach(b => { const w = b.style.width; b.style.width = '0'; requestAnimationFrame(() => b.style.width = w); }));
}
$('#btn-rebuild').addEventListener('click', () => {
  resetBuilder();
  show('screen-builder');
});
$('#btn-start-career').addEventListener('click', async () => {
  let slot = Career.firstEmptySlot();
  if (!slot) {
    slot = await modalPickSlot(
      'All three slots are full',
      'Pick a career to end early and overwrite with this new build — or cancel and manage saves from Your Careers instead.',
      Career.listSlots().filter(s => s.meta)
    );
    if (!slot) return;
  }
  const picked = (rookie && rookie.picked) || { era: eraById('2026'), route: null };
  career = new Career({ user: makeUserPlayer(), era: picked.era, route: picked.route, slot });
  career.say(`${career.user.name} turns pro in ${picked.era.year}${picked.route ? ` — ${picked.route.name}` : ''}.`, 'good');
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
      <div class="hh-sub">${u.country} · ${u.age} yrs · OVR ${ovr} · ${career.year} season${career.eraName ? ` · ${esc(career.eraName)}` : ''}${career.wildcards ? ` · ${career.wildcards} wildcard${career.wildcards === 1 ? '' : 's'}` : ''}</div>
      <div class="hh-btnrow">
        <button class="btn btn-ghost hh-lifestyle" id="btn-lifestyle-now">Lifestyle</button>
        <button class="btn btn-ghost hh-retire" id="btn-retire-now">Retire</button>
      </div>
    </div>
    <div class="hh-stats">
      <div class="hh-stat"><b>${u.rank}</b><span>Rank</span></div>
      <div class="hh-stat"><b>${fmtPts(u.rankPts)}</b><span>Points</span></div>
      <div class="hh-stat"><b>${u.season.w}-${u.season.l}</b><span>Season</span></div>
      <div class="hh-stat"><b>${u.career.titles}</b><span>Titles</span></div>
      <div class="hh-stat"><b>${u.career.slams}</b><span>Slams</span></div>
      <div class="hh-stat"><b>${fmtMoney(career.netWorth())}</b><span>Net worth</span></div>
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
  $('#btn-retire-now').addEventListener('click', doRetire);
  $('#btn-lifestyle-now').addEventListener('click', () => { renderLifestyle(); show('screen-lifestyle'); });
}

/* ---------- retirement ---------------------------------------------------- */
async function doRetire() {
  const ok = await modalConfirm('Retire ' + career.user.name + '?',
    "This ends the career for good — there's no undo.", 'Retire', true);
  if (!ok) return;
  const summary = career.retire();
  renderRetirement(summary);
  show('screen-retirement');
}

function renderRetirement(s) {
  const rows = [
    ['Seasons played', s.seasons],
    ['Career record', `${s.w}-${s.l} (${Math.round(s.winPct * 100)}%)`],
    ['Titles', s.titles],
    ['Grand Slams', s.slams],
    ['Masters 1000s', s.masters],
    ['Tour Finals', s.finals],
    ['Weeks at world No. 1', s.weeksNo1],
    ['Best ranking', '#' + s.bestRank],
    ['Career prize money', '$' + (s.prize / 1e6).toFixed(1) + 'm']
  ];
  $('#retirement-body').innerHTML = `
    <div class="retire-hero">
      <div class="retire-name">${esc(s.name)} · retired at ${s.age}</div>
      <div class="retire-tier">${esc(s.tier.label)}</div>
      <p class="retire-blurb">${esc(s.tier.blurb)}</p>
    </div>
    <table class="season-table"><tbody>${rows.map(([k, v]) =>
      `<tr><td>${k}</td><td style="text-align:right;font-family:var(--font-cond);font-size:18px">${v}</td></tr>`
    ).join('')}</tbody></table>
    ${s.honours.length ? `<h3 style="margin:26px 0 6px;font-size:20px;text-transform:uppercase;letter-spacing:.06em">Honours</h3>
      <ul class="honours">${s.honours.map(h => `<li>${h.year} · ${esc(h.text)}</li>`).join('')}</ul>` : ''}
    <div class="retire-actions"><button class="btn btn-primary btn-lg" id="btn-new-after-retire">Build a new player</button></div>`;
  $('#btn-new-after-retire').addEventListener('click', () => {
    career = null;
    show('screen-identity');
    $('#in-name').focus();
  });
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
        <div class="cal-sub">${surfTag(ev.surface)}<span class="${ev.cat === 'gs' ? 'cat-gs' : ''}">${catLabel(ev.cat)}</span><span>${esc(ev.city)}</span>${ev.bestOf === 5 ? '<span>best of 5</span>' : ''}<span class="cal-prize">${fmtMoney(PRIZE_BY_CAT[ev.cat] || PRIZE_DEFAULT)} to win</span></div>
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
    $('#ev-actions').innerHTML = playButtonsHTML(career.current.phase === 'qual' ? 'Play qualifying' : 'Play first round');
    wirePlayButtons();
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

/* ---------- play it yourself ----------------------------------------------
   Not real-time control — this engine is a point-probability model, not a
   physics one — but a genuine per-game tactical choice instead of watching
   the whole match auto-resolve. The user is always side 'A' here, since the
   InteractiveMatch is constructed with them first. */
async function playRoundInteractive() {
  if (busy) return;
  busy = true;
  $('#ev-actions').innerHTML = '';
  const c = career.current;
  const t = c.phase === 'qual' ? c.qual : c.main;
  const opp = userOpponentIn(t);
  if (!opp) { busy = false; playRound(); return; }   // shouldn't happen; fall back safely
  const im = new InteractiveMatch(career.user, opp, { surface: c.ev.surface, bestOf: c.ev.bestOf });
  await runInteractiveMatch(im, opp);
  const res = im.result();
  showInteractiveResult(im, opp, res);
  const out = career.advance({ playerId: career.user.id, res });
  renderBracket();
  showOtherResults(out.matches, career.user.id);
  renderEventActions(out);
  busy = false;
}

function runInteractiveMatch(im, opp) {
  const me = career.user;
  return new Promise(resolve => {
    function render() {
      const meServing = im.server === 'A';
      const tactics = meServing ? TACTIC.serve : TACTIC.ret;
      const keys = meServing ? ['power', 'standard', 'safe'] : ['aggressive', 'standard', 'safe'];
      const setBoxes = im.sets.map((s, i) => {
        const tb = s.tb ? `<sup>${Math.min(s.tb.a, s.tb.b)}</sup>` : '';
        return `<div class="set-box ${s.a > s.b ? 'won' : ''}"><div class="sg">${s.a}–${s.b}${tb}</div><div class="sl">Set ${i + 1}</div></div>`;
      }).join('');
      const liveLabel = im.isTiebreakNext ? 'Tiebreak' : 'Current game';
      $('#match-view').innerHTML = `
        <div class="round-label">Playing it yourself</div>
        <div class="matchup">
          <div class="mp you"><div class="mp-name">${esc(me.name)}</div><div class="mp-sub">${me.country} · OVR ${overall(me)}</div></div>
          <div class="vs">VS</div>
          <div class="mp"><div class="mp-name">${esc(opp.name)}</div><div class="mp-sub">${opp.country} · OVR ${overall(opp)}</div></div>
        </div>
        <div class="score-strip">${setBoxes}<div class="set-box live"><div class="sg">${im.ga}–${im.gb}</div><div class="sl">${liveLabel}</div></div></div>
        <div class="tactic-panel">
          <p class="tactic-lead">${meServing ? 'You’re serving' : 'You’re returning'} — pick your approach for this game</p>
          <div class="tactic-choices">
            ${keys.map(k => `<button class="tactic-btn" data-tactic="${k}">
                <span class="tb-label">${esc(tactics[k].label)}</span>
                <span class="tb-hint">${esc(tactics[k].hint)}</span>
              </button>`).join('')}
          </div>
          <button class="btn btn-ghost" id="btn-sim-rest-interactive">Sim the rest of this match</button>
        </div>`;
      $$('.tactic-btn').forEach(b => b.addEventListener('click', () => {
        const tactic = b.dataset.tactic;
        if (im.isTiebreakNext) im.playTiebreak('A', tactic); else im.playGame('A', tactic);
        if (im.over) { resolve(); return; }
        render();
      }));
      $('#btn-sim-rest-interactive').addEventListener('click', () => {
        let guard = 0;
        while (!im.over && guard++ < 500) {
          if (im.isTiebreakNext) im.playTiebreak('A', 'standard'); else im.playGame('A', 'standard');
        }
        resolve();
      });
    }
    render();
  });
}

function showInteractiveResult(im, opp, res) {
  const me = career.user;
  const won = res.winnerId === me.id;
  const ms = res.stats.A, ts = res.stats.B;
  const pct = (a, b) => b ? Math.round(100 * a / b) + '%' : '—';
  $('#match-view').innerHTML = `
    <div class="round-label">Playing it yourself</div>
    <div class="matchup">
      <div class="mp you"><div class="mp-name">${esc(me.name)}</div><div class="mp-sub">${me.country} · OVR ${overall(me)}</div></div>
      <div class="vs">VS</div>
      <div class="mp"><div class="mp-name">${esc(opp.name)}</div><div class="mp-sub">${opp.country} · OVR ${overall(opp)}</div></div>
    </div>
    <div class="score-strip">${res.sets.map((s, i) => {
      const tb = s.tb ? `<sup>${Math.min(s.tb.a, s.tb.b)}</sup>` : '';
      return `<div class="set-box ${s.a > s.b ? 'won' : ''}"><div class="sg">${s.a}–${s.b}${tb}</div><div class="sl">Set ${i + 1}</div></div>`;
    }).join('')}</div>
    <div class="match-result ${won ? 'win' : 'loss'}">${won ? 'You win' : 'You lose'} · ${res.minutes} minutes</div>
    <table class="stat-table">
      <tr><td>${ms.aces}</td><td>Aces</td><td>${ts.aces}</td></tr>
      <tr><td>${ms.df}</td><td>Double faults</td><td>${ts.df}</td></tr>
      <tr><td>${pct(ms.svPtsWon, ms.svPts)}</td><td>Serve points won</td><td>${pct(ts.svPtsWon, ts.svPts)}</td></tr>
      <tr><td>${ms.winners}</td><td>Winners</td><td>${ts.winners}</td></tr>
      <tr><td>${ms.ptsWon}</td><td>Total points</td><td>${ts.ptsWon}</td></tr>
    </table>`;
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
    box.innerHTML = playButtonsHTML('Play qualifying final');
  } else if (out && out.qualDone && !c.userInMain) {
    box.innerHTML = `<button class="btn btn-primary" id="btn-sim">Watch the main draw</button>` + backBtn;
  } else if (c.main && c.main.champion) {
    box.innerHTML = backBtn;
    announceEventEnd();
  } else if (out && out.userMatch && !out.userThrough) {
    box.innerHTML = `<button class="btn btn-primary" id="btn-sim">Play out the rest</button>` + backBtn;
  } else if (c.main && !c.main.champion) {
    const nextName = c.main.roundName(c.main.roundIndex);
    box.innerHTML = playButtonsHTML('Play ' + nextName.toLowerCase());
  } else {
    box.innerHTML = backBtn;
  }
  wirePlayButtons();
  if ($('#btn-sim'))  $('#btn-sim').addEventListener('click', simThrough);
  if ($('#btn-back-hub')) $('#btn-back-hub').addEventListener('click', afterEvent);
}

// "Play it yourself" only makes sense when the user actually has a match
// coming up in the live tournament — not every ev-actions state reaches here
// with one (e.g. after elimination), so it's a no-op button-set otherwise.
function playButtonsHTML(simLabel) {
  const c = career.current;
  const t = c && (c.phase === 'qual' ? c.qual : c.main);
  const hasUserMatch = t && !t.champion && userOpponentIn(t);
  return `<button class="btn btn-primary btn-lg" id="btn-play">${esc(simLabel)}</button>` +
    (hasUserMatch ? `<button class="btn btn-ghost btn-lg" id="btn-play-yourself">Play it yourself</button>` : '');
}
function wirePlayButtons() {
  if ($('#btn-play')) $('#btn-play').addEventListener('click', playRound);
  if ($('#btn-play-yourself')) $('#btn-play-yourself').addEventListener('click', playRoundInteractive);
}
function userOpponentIn(t) {
  const idx = t.alive.findIndex(p => p.isUser);
  if (idx < 0) return null;
  const partnerIdx = idx % 2 === 0 ? idx + 1 : idx - 1;
  return t.alive[partnerIdx] || null;
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

/* ---------- lifestyle ------------------------------------------------------
   What prize money buys off the court. Houses and the coaching team carry a
   small permanent attribute nudge (see LIFESTYLE_CATALOG); cars are flex. */
const LIFESTYLE_CAT_LABEL = { house: 'Housing', car: 'Cars', team: 'Team & Coaching' };

function lifestylePerkText(item) {
  const bits = [];
  for (const k in (item.attrBonus || {})) {
    bits.push('+' + item.attrBonus[k] + ' ' + ATTRS.find(a => a.key === k).label);
  }
  if (item.trainingBonus) bits.push('+' + item.trainingBonus + ' training pt/season');
  return bits.length ? bits.join(', ') : 'Pure flex — no gameplay bonus';
}

function renderLifestyle() {
  const owned = career.finances.owned;
  const cash = career.cashOnHand(), net = career.netWorth();
  const sections = Object.keys(LIFESTYLE_CATALOG).map(cat => {
    const tiers = LIFESTYLE_CATALOG[cat];
    const currentTier = owned[cat];
    const cards = tiers.map((item, i) => {
      const isOwned = currentTier === i;
      const resale = currentTier != null ? Math.round(tiers[currentTier].price * LIFESTYLE_RESALE_PCT) : 0;
      const netCost = item.price - resale;
      const afford = isOwned || netCost <= cash;
      let btnLabel = 'Buy · ' + fmtMoney(item.price);
      if (isOwned) btnLabel = 'Owned';
      else if (currentTier != null && i > currentTier) btnLabel = 'Upgrade · ' + fmtMoney(netCost) + ' net';
      else if (currentTier != null && i < currentTier) btnLabel = 'Switch · ' + fmtMoney(netCost) + ' net';
      return `<div class="shop-card ${isOwned ? 'owned' : ''}">
          <div class="shop-card-name">${esc(item.name)}</div>
          <p class="shop-card-blurb">${esc(item.blurb)}</p>
          <div class="shop-card-perk">${esc(lifestylePerkText(item))}</div>
          <button class="btn ${isOwned ? 'btn-ghost' : 'btn-primary'}" ${isOwned || !afford ? 'disabled' : ''}
            data-buy-cat="${cat}" data-buy-tier="${i}">${isOwned ? 'Owned' : (afford ? btnLabel : 'Can’t afford')}</button>
        </div>`;
    }).join('');
    return `<div class="shop-section">
        <h3 class="shop-section-title">${LIFESTYLE_CAT_LABEL[cat]}</h3>
        <div class="shop-grid">${cards}</div>
      </div>`;
  }).join('');

  $('#lifestyle-body').innerHTML = `
    <div class="panel-head">
      <h2 class="screen-title" style="margin:0">Lifestyle</h2>
      <span class="panel-sub">${fmtMoney(cash)} cash · ${fmtMoney(net)} net worth</span>
    </div>
    <p class="saves-intro">Houses and coaching staff nudge your attributes a little — the same clamp
      training already uses. Cars are just for showing off. Upgrading sells the old one back at half price.</p>
    ${sections}
    <div class="row-end"><button class="btn btn-ghost" id="btn-lifestyle-back">Back to the tour</button></div>`;

  $('#btn-lifestyle-back').addEventListener('click', () => { renderHub(); show('screen-hub'); });
  $$('[data-buy-cat]').forEach(b => b.addEventListener('click', async () => {
    const cat = b.dataset.buyCat, tier = parseInt(b.dataset.buyTier, 10);
    const item = LIFESTYLE_CATALOG[cat][tier];
    const currentTier = career.finances.owned[cat];
    const resale = currentTier != null ? Math.round(LIFESTYLE_CATALOG[cat][currentTier].price * LIFESTYLE_RESALE_PCT) : 0;
    const netCost = item.price - resale;
    const body = currentTier != null
      ? `Sell ${LIFESTYLE_CATALOG[cat][currentTier].name} back for ${fmtMoney(resale)} and buy ${item.name} for ${fmtMoney(item.price)} — ${fmtMoney(netCost)} net.`
      : `Buy ${item.name} for ${fmtMoney(item.price)}?`;
    const ok = await modalConfirm('Confirm purchase', body, 'Buy', false);
    if (!ok) return;
    const r = career.buyItem(cat, tier);
    if (!r.ok) { toast(r.reason === 'not enough cash' ? "Can't afford that" : 'Purchase failed', 'bad'); return; }
    career.save();
    toast(`Bought ${item.name}`, 'good');
    renderLifestyle();
  }));
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
      ${u.age >= 34 ? `<p style="color:var(--dim);font-size:13px;margin-top:6px">The legs go first at this age. Plenty of players your age are already thinking about what comes after.</p>` : ''}
      <div style="margin-top:18px">${ATTRS.map(a => {
        const v = u.attrs[a.key], nv = v + spend[a.key];
        return `<div class="train-row">
          <span class="bl" style="font-size:12px;text-transform:uppercase;letter-spacing:.1em;color:var(--muted)">${a.label}</span>
          <span class="bar-track"><span class="bar-fill" style="width:${(nv - 35) / 0.64}%"></span></span>
          <span class="bv ${vClass(nv)}" style="font-family:var(--font-cond);font-size:20px;font-weight:700;text-align:right">${nv}</span>
          <span class="train-btns">
            <button class="tbtn" data-dec="${a.key}" ${spend[a.key] <= 0 ? 'disabled' : ''}>−</button>
            <button class="tbtn" data-inc="${a.key}" ${used >= budget || nv >= 99 ? 'disabled' : ''}>+</button>
          </span>
        </div>`;
      }).join('')}</div>
      <div class="row-end">
        <button class="btn btn-ghost" id="btn-retire-offseason">Retire instead</button>
        <button class="btn btn-primary btn-lg" id="btn-next-season">Start ${career.year + 1}</button>
      </div>`;
    $$('[data-inc]').forEach(b => b.addEventListener('click', () => { spend[b.dataset.inc]++; draw(); }));
    $$('[data-dec]').forEach(b => b.addEventListener('click', () => { spend[b.dataset.dec]--; draw(); }));
    $('#btn-retire-offseason').addEventListener('click', doRetire);
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

/* ---------- local 2v2 ----------------------------------------------------
   A stateless exhibition mode, independent of any career or save slot:
   fill four seats (spin the wheel for a real build, or drop in a random
   tour pro), then simulate a doubles match on this device. */
const DOUBLES_SEAT_LABEL = ['Team A · P1', 'Team A · P2', 'Team B · P1', 'Team B · P2'];

$('#btn-doubles').addEventListener('click', () => { renderDoublesSetup(); show('screen-doubles-setup'); });

function randomProPlayer() {
  const row = pick(TOUR_RAW);
  return makePlayer(row[0], row[1], {
    serve: row[4], forehand: row[5], backhand: row[6], ret: row[7],
    movement: row[8], net: row[9], stamina: row[10], mental: row[11]
  }, { hand: row[2], bh: row[3], age: 20 + rndInt(12) });
}

/* Shared seat grid for both exhibition modes. Queries are scoped to the
   owning screen — singles and doubles use the same data-attributes, so an
   unscoped $$ would wire both screens' buttons to whichever rendered last. */
function renderSeatGrid(cfg) {
  const screen = $(cfg.screenSel);
  cfg.slots.forEach((p, i) => {
    const el = $('#' + cfg.slotPrefix + '-' + i);
    if (!el) return;
    if (!p) {
      el.className = 'doubles-slot';
      el.innerHTML = `
        <div class="dslot-empty">
          <input type="text" class="dslot-name-input" id="${cfg.namePrefix}-${i}" placeholder="${esc(cfg.labels[i])}" maxlength="18">
          <div class="dslot-btns">
            <button class="btn btn-primary" data-build="${i}">Build</button>
            <button class="btn btn-ghost" data-random="${i}">Random pro</button>
          </div>
        </div>`;
    } else {
      el.className = 'doubles-slot filled';
      el.innerHTML = `
        <div class="dslot-card">
          <div class="dslot-card-info">
            <div class="dslot-card-name">${esc(p.name)}</div>
            <div class="dslot-card-meta">${p.country} · ${p.hand === 'L' ? 'Left' : 'Right'}-handed</div>
          </div>
          <div class="dslot-card-ovr">${overall(p)}</div>
          <button class="dslot-clear" data-clear="${i}" title="Clear this seat">&times;</button>
        </div>`;
    }
  });
  $$('[data-build]', screen).forEach(b => b.addEventListener('click', () => {
    const i = parseInt(b.dataset.build, 10);
    const input = $('#' + cfg.namePrefix + '-' + i);
    builderTarget = { slot: i, mode: cfg.mode, name: (input.value || '').trim() || cfg.labels[i] };
    resetBuilder();
    show('screen-builder');
  }));
  $$('[data-random]', screen).forEach(b => b.addEventListener('click', () => {
    cfg.slots[parseInt(b.dataset.random, 10)] = randomProPlayer();
    cfg.rerender();
  }));
  $$('[data-clear]', screen).forEach(b => b.addEventListener('click', () => {
    cfg.slots[parseInt(b.dataset.clear, 10)] = null;
    cfg.rerender();
  }));
}

function renderDoublesSetup() {
  renderSeatGrid({
    screenSel: '#screen-doubles-setup', slotPrefix: 'dslot', namePrefix: 'dname',
    slots: doublesSlots, labels: DOUBLES_SEAT_LABEL, mode: 'doubles', rerender: renderDoublesSetup
  });
  $('#btn-play-doubles').disabled = !doublesSlots.every(Boolean);
}

$('#btn-play-doubles').addEventListener('click', () => {
  const surface = $('.seg-btn.active', $('#seg-dsurface')).dataset.v;
  playDoublesMatch(surface);
});

async function playDoublesMatch(surface) {
  const teamA = [doublesSlots[0], doublesSlots[1]];
  const teamB = [doublesSlots[2], doublesSlots[3]];
  show('screen-doubles-match');
  $('#doubles-match-view').innerHTML = `
    <div class="doubles-scoreboard">
      <div class="dteam-box" id="dbox-a"><div class="dt-names">${esc(teamA[0].name)} &amp; ${esc(teamA[1].name)}</div><div class="dt-sub">Team A</div></div>
      <div class="vs">VS</div>
      <div class="dteam-box" id="dbox-b"><div class="dt-names">${esc(teamB[0].name)} &amp; ${esc(teamB[1].name)}</div><div class="dt-sub">Team B</div></div>
    </div>
    <div class="score-strip" id="dscore-strip"></div>
    <div id="doubles-outcome"></div>`;
  $('#doubles-match-actions').innerHTML = '';

  const res = simDoublesMatch(teamA, teamB, { surface, bestOf: 3 });
  const strip = $('#dscore-strip');
  for (let i = 0; i < res.sets.length; i++) {
    await sleep(620);
    const s = res.sets[i];
    const tb = s.tb ? `<sup>${Math.min(s.tb.a, s.tb.b)}</sup>` : '';
    const box = document.createElement('div');
    box.className = 'set-box ' + (s.a > s.b ? 'won' : '');
    box.innerHTML = `<div class="sg">${s.a}–${s.b}${tb}</div><div class="sl">Set ${i + 1}</div>`;
    strip.appendChild(box);
  }
  await sleep(400);
  const aWon = res.winnerSide === 'A';
  $('#dbox-a').classList.toggle('dwin', aWon);
  $('#dbox-b').classList.toggle('dwin', !aWon);
  const pct = (a, b) => b ? Math.round(100 * a / b) + '%' : '—';
  const winners = aWon ? teamA : teamB;
  $('#doubles-outcome').innerHTML = `
    <div class="match-result win">${esc(winners[0].name)} &amp; ${esc(winners[1].name)} win · ${res.minutes} minutes</div>
    <table class="stat-table">
      <tr><td>${res.stats.A.aces}</td><td>Aces</td><td>${res.stats.B.aces}</td></tr>
      <tr><td>${res.stats.A.df}</td><td>Double faults</td><td>${res.stats.B.df}</td></tr>
      <tr><td>${pct(res.stats.A.svPtsWon, res.stats.A.svPts)}</td><td>Serve points won</td><td>${pct(res.stats.B.svPtsWon, res.stats.B.svPts)}</td></tr>
      <tr><td>${res.stats.A.winners}</td><td>Winners</td><td>${res.stats.B.winners}</td></tr>
      <tr><td>${res.stats.A.ptsWon}</td><td>Total points</td><td>${res.stats.B.ptsWon}</td></tr>
    </table>`;
  $('#doubles-match-actions').innerHTML = `
    <button class="btn btn-ghost" id="btn-doubles-rematch">Rematch, same teams</button>
    <button class="btn btn-primary" id="btn-doubles-newsetup">New 2v2</button>`;
  $('#btn-doubles-rematch').addEventListener('click', () => playDoublesMatch(surface));
  $('#btn-doubles-newsetup').addEventListener('click', () => {
    doublesSlots = [null, null, null, null];
    renderDoublesSetup();
    show('screen-doubles-setup');
  });
}

/* ---------- quick singles --------------------------------------------------
   A one-off 1v1 with no career attached. Either sim it outright, or play it
   yourself as Player 1 using the same InteractiveMatch tactic loop the career
   mode uses. */
const SINGLES_SEAT_LABEL = ['Player 1', 'Player 2'];

$('#btn-singles').addEventListener('click', () => { renderSinglesSetup(); show('screen-singles-setup'); });

function renderSinglesSetup() {
  renderSeatGrid({
    screenSel: '#screen-singles-setup', slotPrefix: 'sslot', namePrefix: 'sname',
    slots: singlesSlots, labels: SINGLES_SEAT_LABEL, mode: 'singles', rerender: renderSinglesSetup
  });
  const ready = singlesSlots.every(Boolean);
  $('#btn-play-singles').disabled = !ready;
  $('#btn-singles-play-self').disabled = !ready;
}

function singlesConfig() {
  return {
    surface: $('.seg-btn.active', $('#seg-ssurface')).dataset.v,
    bestOf: parseInt($('.seg-btn.active', $('#seg-sformat')).dataset.v, 10)
  };
}

$('#btn-play-singles').addEventListener('click', () => runSinglesSim(singlesConfig()));
$('#btn-singles-play-self').addEventListener('click', () => runSinglesInteractive(singlesConfig()));

function singlesHeaderHTML(p1, p2, cfg) {
  return `
    <div class="matchup">
      <div class="mp you"><div class="mp-name">${esc(p1.name)}</div><div class="mp-sub">${p1.country} · OVR ${overall(p1)}</div></div>
      <div class="vs">VS</div>
      <div class="mp"><div class="mp-name">${esc(p2.name)}</div><div class="mp-sub">${p2.country} · OVR ${overall(p2)}</div></div>
    </div>
    <div class="round-label">${SURFACES[cfg.surface].label} · best of ${cfg.bestOf}</div>`;
}

function singlesStatsHTML(res, p1, p2) {
  const a = res.stats.A, b = res.stats.B;
  const pct = (x, y) => y ? Math.round(100 * x / y) + '%' : '—';
  const won = res.winnerId === p1.id;
  return `
    <div class="match-result ${won ? 'win' : 'loss'}">${esc(res.winner.name)} wins · ${res.minutes} minutes</div>
    <table class="stat-table">
      <tr><td>${a.aces}</td><td>Aces</td><td>${b.aces}</td></tr>
      <tr><td>${a.df}</td><td>Double faults</td><td>${b.df}</td></tr>
      <tr><td>${pct(a.svPtsWon, a.svPts)}</td><td>Serve points won</td><td>${pct(b.svPtsWon, b.svPts)}</td></tr>
      <tr><td>${a.winners}</td><td>Winners</td><td>${b.winners}</td></tr>
      <tr><td>${a.ptsWon}</td><td>Total points</td><td>${b.ptsWon}</td></tr>
    </table>`;
}

function singlesEndActions(replay) {
  $('#singles-match-actions').innerHTML = `
    <button class="btn btn-ghost" id="btn-singles-rematch">Rematch</button>
    <button class="btn btn-primary" id="btn-singles-new">New singles</button>`;
  $('#btn-singles-rematch').addEventListener('click', replay);
  $('#btn-singles-new').addEventListener('click', () => {
    singlesSlots = [null, null];
    renderSinglesSetup();
    show('screen-singles-setup');
  });
}

async function runSinglesSim(cfg) {
  if (busy) return;
  busy = true;
  const [p1, p2] = singlesSlots;
  show('screen-singles-match');
  $('#singles-match-actions').innerHTML = '';
  $('#singles-match-view').innerHTML = singlesHeaderHTML(p1, p2, cfg) +
    `<div class="score-strip" id="ssim-strip"></div><div id="ssim-outcome"></div>`;
  const res = simMatch(p1, p2, { surface: cfg.surface, bestOf: cfg.bestOf });
  const strip = $('#ssim-strip');
  for (let i = 0; i < res.sets.length; i++) {
    await sleep(600);
    const s = res.sets[i];
    const tb = s.tb ? `<sup>${Math.min(s.tb.a, s.tb.b)}</sup>` : '';
    const box = document.createElement('div');
    box.className = 'set-box ' + (s.a > s.b ? 'won' : '');
    box.innerHTML = `<div class="sg">${s.a}–${s.b}${tb}</div><div class="sl">Set ${i + 1}</div>`;
    strip.appendChild(box);
  }
  await sleep(380);
  $('#ssim-outcome').innerHTML = singlesStatsHTML(res, p1, p2);
  singlesEndActions(() => runSinglesSim(cfg));
  busy = false;
}

async function runSinglesInteractive(cfg) {
  if (busy) return;
  busy = true;
  const [p1, p2] = singlesSlots;
  show('screen-singles-match');
  $('#singles-match-actions').innerHTML = '';
  const im = new InteractiveMatch(p1, p2, { surface: cfg.surface, bestOf: cfg.bestOf });
  await runTacticLoop(im, p1, p2, cfg, '#singles-match-view');
  const res = im.result();
  $('#singles-match-view').innerHTML = singlesHeaderHTML(p1, p2, cfg) +
    `<div class="score-strip">${res.sets.map((s, i) => {
      const tb = s.tb ? `<sup>${Math.min(s.tb.a, s.tb.b)}</sup>` : '';
      return `<div class="set-box ${s.a > s.b ? 'won' : ''}"><div class="sg">${s.a}–${s.b}${tb}</div><div class="sl">Set ${i + 1}</div></div>`;
    }).join('')}</div>` + singlesStatsHTML(res, p1, p2);
  singlesEndActions(() => runSinglesInteractive(cfg));
  busy = false;
}

/* The same per-game tactic loop the career mode uses, pointed at any container.
   Player 1 is always side 'A' in an InteractiveMatch built here. */
function runTacticLoop(im, me, opp, cfg, containerSel) {
  return new Promise(resolve => {
    function render() {
      const meServing = im.server === 'A';
      const tactics = meServing ? TACTIC.serve : TACTIC.ret;
      const keys = meServing ? ['power', 'standard', 'safe'] : ['aggressive', 'standard', 'safe'];
      const setBoxes = im.sets.map((s, i) => {
        const tb = s.tb ? `<sup>${Math.min(s.tb.a, s.tb.b)}</sup>` : '';
        return `<div class="set-box ${s.a > s.b ? 'won' : ''}"><div class="sg">${s.a}–${s.b}${tb}</div><div class="sl">Set ${i + 1}</div></div>`;
      }).join('');
      $(containerSel).innerHTML = singlesHeaderHTML(me, opp, cfg) +
        `<div class="score-strip">${setBoxes}<div class="set-box live"><div class="sg">${im.ga}–${im.gb}</div><div class="sl">${im.isTiebreakNext ? 'Tiebreak' : 'Current game'}</div></div></div>
        <div class="tactic-panel">
          <p class="tactic-lead">${meServing ? 'You’re serving' : 'You’re returning'} — pick your approach for this game</p>
          <div class="tactic-choices">
            ${keys.map(k => `<button class="tactic-btn" data-tactic="${k}">
                <span class="tb-label">${esc(tactics[k].label)}</span>
                <span class="tb-hint">${esc(tactics[k].hint)}</span>
              </button>`).join('')}
          </div>
          <button class="btn btn-ghost" id="btn-tactic-simrest">Sim the rest of this match</button>
        </div>`;
      $$('.tactic-btn', $(containerSel)).forEach(b => b.addEventListener('click', () => {
        const t = b.dataset.tactic;
        if (im.isTiebreakNext) im.playTiebreak('A', t); else im.playGame('A', t);
        if (im.over) { resolve(); return; }
        render();
      }));
      $('#btn-tactic-simrest').addEventListener('click', () => {
        let guard = 0;
        while (!im.over && guard++ < 500) {
          if (im.isTiebreakNext) im.playTiebreak('A', 'standard'); else im.playGame('A', 'standard');
        }
        resolve();
      });
    }
    render();
  });
}

/* ---------- tennis trivia --------------------------------------------------
   Ten questions a round, drawn at random from the bank. Options are shuffled
   at render time: the stored answer positions are lopsided (nothing is ever
   the last option), and shuffling makes that irrelevant instead of having to
   hand-balance the data every time a question is added. */
const TRIVIA_ROUND_LEN = 10;
let triviaState = null;

$('#btn-trivia').addEventListener('click', startTrivia);

function startTrivia() {
  const picked = shuffle(TRIVIA.slice()).slice(0, Math.min(TRIVIA_ROUND_LEN, TRIVIA.length));
  triviaState = {
    questions: picked.map(q => {
      const opts = q[1].map((text, i) => ({ text, correct: i === q[2] }));
      return { q: q[0], opts: shuffle(opts), explain: q[3] };
    }),
    i: 0, score: 0, answered: false
  };
  renderTrivia();
  show('screen-trivia');
}

function renderTrivia() {
  const s = triviaState;
  if (s.i >= s.questions.length) return renderTriviaResult();
  const cur = s.questions[s.i];
  $('#trivia-body').innerHTML = `
    <div class="trivia-head">
      <h2 class="screen-title" style="margin:0">Tennis trivia</h2>
      <span class="panel-sub">Question ${s.i + 1} of ${s.questions.length} · ${s.score} correct</span>
    </div>
    <div class="trivia-progress"><span style="width:${(s.i / s.questions.length) * 100}%"></span></div>
    <p class="trivia-q">${esc(cur.q)}</p>
    <div class="trivia-opts">
      ${cur.opts.map((o, i) => `<button class="trivia-opt" data-opt="${i}">${esc(o.text)}</button>`).join('')}
    </div>
    <div id="trivia-feedback"></div>`;
  $$('.trivia-opt').forEach(b => b.addEventListener('click', () => answerTrivia(parseInt(b.dataset.opt, 10))));
}

function answerTrivia(idx) {
  const s = triviaState;
  if (s.answered) return;
  s.answered = true;
  const cur = s.questions[s.i];
  const right = cur.opts[idx].correct;
  if (right) s.score++;
  $$('.trivia-opt').forEach((b, i) => {
    b.disabled = true;
    if (cur.opts[i].correct) b.classList.add('correct');
    else if (i === idx) b.classList.add('wrong');
  });
  $('#trivia-feedback').innerHTML = `
    <div class="trivia-feedback ${right ? 'good' : 'bad'}">
      <strong>${right ? 'Correct' : 'Not quite'}</strong>
      <p>${esc(cur.explain)}</p>
    </div>
    <div class="row-end"><button class="btn btn-primary" id="btn-trivia-next">${s.i + 1 >= s.questions.length ? 'See your score' : 'Next question'}</button></div>`;
  $('#btn-trivia-next').addEventListener('click', () => {
    s.i++; s.answered = false;
    renderTrivia();
  });
}

function renderTriviaResult() {
  const s = triviaState;
  const pct = Math.round(100 * s.score / s.questions.length);
  const verdict = pct === 100 ? 'Perfect round. Nothing left to teach you.'
    : pct >= 80 ? 'Strong. You clearly watch a lot of tennis.'
    : pct >= 50 ? 'Respectable — a few gaps to close.'
    : 'Room to grow. Worth another round.';
  $('#trivia-body').innerHTML = `
    <div class="retire-hero">
      <div class="retire-name">Tennis trivia</div>
      <div class="retire-tier">${s.score} / ${s.questions.length}</div>
      <p class="retire-blurb">${esc(verdict)}</p>
    </div>
    <div class="retire-actions">
      <button class="btn btn-primary btn-lg" id="btn-trivia-again">Play again</button>
      <button class="btn btn-ghost" data-goto="screen-home">Back to menu</button>
    </div>`;
  $('#btn-trivia-again').addEventListener('click', startTrivia);
  $$('#trivia-body [data-goto]').forEach(b => b.addEventListener('click', () => show(b.dataset.goto)));
}
