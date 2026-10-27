(() => {
'use strict';
const NS = 'http://www.w3.org/2000/svg';
const $ = (s, r) => (r || document).querySelector(s);
function S(tag, attrs, parent) {
  const e = document.createElementNS(NS, tag);
  if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}
function H(tag, cls, text, parent) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  if (parent) parent.appendChild(e);
  return e;
}
function B(cls, text, parent, onClick) { const b = H('button', cls, text, parent); b.type = 'button'; if (onClick) b.addEventListener('click', onClick); return b; }
const de = (x, d = 2) => x.toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d });
const deMax = (x, d = 2) => x.toLocaleString('de-DE', { maximumFractionDigits: d });
const bin = (n, w) => n.toString(2).padStart(w, '0');
const hex2 = (n) => n.toString(16).toUpperCase().padStart(2, '0');
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const mix = (v) => `color-mix(in srgb, var(--hi) ${Math.round(clamp01(v) * 100)}%, var(--lo))`;
const SUPM = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
const sup = (n) => String(n).split('').map((c) => SUPM[c] || c).join('');
const SUBD = '₀₁₂₃₄₅₆₇₈₉';
const sub = (n) => String(n).split('').map((c) => SUBD[+c]).join('');
const now = () => performance.now();
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const sig = (x, k) => 1 / (1 + Math.exp(k * (x - 0.5)));   // Inverter-Kennlinie, Schwelle ½
const f10 = (x) => sig(x, 10);
const lampH = (x) => 1 - f10(x);   // Lampen-Kennlinie (steigend), Schwelle ½
function gauss(sd) { const u = 1 - Math.random(), v = Math.random(); return sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

/* Fortschritt */
const store = {
  ok: true,
  /* v3: neues Level 5 (Speicher) eingefügt; Fortschritt aus v2 wird übernommen, Level ab 5 rücken um eins nach hinten */
  load() {
    try {
      const shiftFrom = (o, from) => { const n = {}; for (const k in o || {}) { const i = +k; n[i >= from ? i + 1 : i] = o[k]; } return n; };
      const r4 = localStorage.getItem('vbzb.v4'); if (r4) return JSON.parse(r4);
      const r3 = localStorage.getItem('vbzb.v3'); if (r3) { const d = JSON.parse(r3); return { done: d.done || [], cards: shiftFrom(d.cards, 6), found: shiftFrom(d.found, 6) }; }
      const r2 = localStorage.getItem('vbzb.v2'); if (!r2) return null;
      const d = JSON.parse(r2), shift = (o) => { const n = {}; for (const k in o || {}) { const i = +k; n[i >= 5 ? i + 1 : i] = o[k]; } return n; };
      return { done: d.done || [], cards: shiftFrom(shift(d.cards), 6), found: shiftFrom(shift(d.found), 6) };
    } catch (e) { this.ok = false; return null; }
  },
  save(d) { try { localStorage.setItem('vbzb.v4', JSON.stringify(d)); } catch (e) { this.ok = false; $('#storeNote').hidden = false; } },
  wipe() { try { localStorage.removeItem('vbzb.v4'); localStorage.removeItem('vbzb.v3'); localStorage.removeItem('vbzb.v2'); } catch (e) { /* egal */ } },
};
const G = { done: new Set(), cards: {}, found: {} };
function save() { store.save({ done: [...G.done], cards: G.cards, found: G.found }); }

/* Missions-Engine */
const M = { levels: [], total: 0 };
/* Die Leerlauf-Uhr der Hinweise läuft erst, wenn das Level im Bild war */
const seenObs = 'IntersectionObserver' in window ? new IntersectionObserver((es) => es.forEach((e) => {
  if (!e.isIntersecting) return;
  const L = M.levels.find((x) => x.el.section === e.target);
  if (L && !L.seen) { L.seen = true; if (L.ctx) L.ctx.lastChange = now(); }
  seenObs.unobserve(e.target);
}), { rootMargin: '0px 0px -30% 0px' }) : null;
M.define = function (def) {
  const L = { def, n: def.n, ctx: null, found: {}, idx: -1, timer: null, seen: !seenObs };
  L.touch = (auto) => M.notify(L, auto);
  L.api = def.build(L);
  if (seenObs) seenObs.observe(L.el.section);
  M.levels.push(L);
  return L;
};
M.newCtx = function () { return { fails: 0, hintLevel: 0, hintAvail: false, lastChange: now(), hintAt: now(), bitClicks: 0, measures: 0, answer: null, chipsShown: false, status: '', statusClass: '', wrong: new Set(), failKey: null }; };
/* Einen abgeschlossenen Lauf (oder anderen Versuch) genau einmal als Fehlprüfung zählen */
M.fail = function (ctx, key, text) { if (ctx.failKey !== key) { ctx.failKey = key; ctx.fails++; } return text; };
M.active = (L) => (L.idx >= 0 && L.idx < L.def.missions.length ? L.def.missions[L.idx] : null);
M.startMission = function (L, idx, status) {
  L.idx = idx;
  L.ctx = M.newCtx();
  if (status) { L.ctx.status = status; L.ctx.statusClass = 'ok'; }
  const m = M.active(L);
  if (m) m.start(L.api, L.ctx, L);
  M.renderMission(L);
  M.renderSchema();
};
/* auto = Änderung ohne Zutun des Spielers (z. B. automatische Auffrischung): zählt nicht als Aktivität, löscht keine Meldung */
M.notify = function (L, auto) {
  if (!L.ctx) return;
  if (auto) {
    if (L.timer) return;   // eine Prüfung des Spielers steht ohnehin an
    clearTimeout(L.qtimer);
    L.qtimer = setTimeout(() => { L.qtimer = null; M.tryCheck(L, false, true); }, 600);
    return;
  }
  L.ctx.lastChange = now();
  clearTimeout(L.timer); clearTimeout(L.qtimer); L.qtimer = null;
  L.timer = setTimeout(() => { L.timer = null; M.tryCheck(L, false, false); }, 600);
};
M.tryCheck = function (L, manual, quiet) {
  const m = M.active(L);
  if (!m || !L.ctx) return;
  const ctx = L.ctx;
  if (m.chipsWhen && !ctx.chipsShown && m.chipsWhen(L.api, ctx)) { ctx.chipsShown = true; ctx.status = m.chipsText || 'Jetzt die Frage unten beantworten.'; ctx.statusClass = 'ok'; M.renderMission(L); if (!manual) return; }
  if (m.instant && !manual) {
    if (!ctx.chipsShown && !quiet) { const s = m.peek ? m.peek(L.api, ctx) : false; ctx.status = typeof s === 'string' ? s : ''; ctx.statusClass = ''; M.renderMission(L); }
    return;
  }
  const r = m.check(L.api, ctx);
  if (r === true) { M.success(L); return; }
  if (r && typeof r === 'object') { ctx.status = r.text; ctx.statusClass = r.cls || ''; M.renderMission(L); return; }   // neutrale Meldung: weder Erfolg noch Fehlversuch
  if (manual) { ctx.fails++; if (ctx.answer != null) ctx.wrong.add(ctx.answer); ctx.status = typeof r === 'string' ? r : 'Noch nicht. Versuch es weiter.'; ctx.statusClass = 'bad'; }
  else if (typeof r === 'string') { ctx.status = r; ctx.statusClass = ''; }
  else if (!quiet) { ctx.status = ''; ctx.statusClass = ''; }
  M.renderMission(L);
};
M.success = function (L) {
  const m = M.active(L), ctx = L.ctx;
  G.done.add(m.id);
  if (m.found) Object.assign(L.found, m.found(L.api, ctx));
  const parOk = m.par ? m.par(L.api, ctx) : null;
  if (parOk != null) L.found['par_' + m.id] = parOk;
  G.found[L.n] = L.found;
  const next = L.idx + 1;
  if (next < L.def.missions.length) {
    const txt = m.doneText ? m.doneText(L.api, ctx) : `${m.stageLabel || 'Mission'} geschafft.`;
    save();
    M.startMission(L, next, txt + (parOk === true ? ' Par erreicht.' : ''));
  } else {
    M.levelDone(L, parOk);
  }
  M.renderProgress();
};
M.levelDone = function (L) {
  const c = L.def.card(L.api, L.found);
  G.cards[L.n] = c;
  save();
  L.idx = L.def.missions.length;
  L.ctx = null;
  if (L.def.freeplay) L.def.freeplay(L.api, false);
  M.renderMission(L);
  M.renderCard(L);
  M.renderSchema();
  M.renderGallery();
};
M.replay = function (L) {
  L.def.missions.forEach((m) => G.done.delete(m.id));
  delete G.cards[L.n]; delete G.found[L.n]; L.found = {};
  save();
  M.renderCard(L);
  M.startMission(L, 0);
  M.renderProgress(); M.renderGallery();
};
M.renderMission = function (L) {
  const el = L.el.mission, m = M.active(L), ctx = L.ctx;
  el.classList.toggle('all-done', !m);
  el.replaceChildren();
  const head = H('div', 'm-head', null, el);
  if (!m) {
    H('p', 'm-label', `Level ${L.n} abgeschlossen`, head);
    H('p', 'm-text', 'Alle Missionen geschafft. Die Arbeitsfläche bleibt frei bespielbar; die Erkenntniskarte steht unten.', el);
    const acts = H('div', 'm-acts', null, el);
    B('btn', 'Level erneut spielen', acts, () => M.replay(L));
    return;
  }
  const groups = [...new Set(L.def.missions.map((x) => x.m))];
  const gi = groups.indexOf(m.m) + 1;
  const stages = L.def.missions.filter((x) => x.m === m.m);
  const st = stages.length > 1 ? ` · Stufe ${stages.indexOf(m) + 1} von ${stages.length}` : '';
  H('p', 'm-label', `Mission ${gi} von ${groups.length}${st}`, head);
  if (m.counters) { const cs = H('div', 'm-counters', null, head); m.counters(L.api, ctx).forEach((t) => H('span', 'chip dim', t, cs)); }
  H('p', 'm-text', m.text, el);
  const stat = H('p', 'm-status ' + (ctx.statusClass || ''), ctx.status || '', el);
  stat.setAttribute('aria-live', 'polite');
  const acts = H('div', 'm-acts', null, el);
  if (m.chips && (!m.chipsWhen || ctx.chipsShown)) {
    m.chips.forEach((t, i) => {
      const b = B('btn', t, acts, () => { ctx.answer = i; M.tryCheck(L, true); });
      b.setAttribute('aria-pressed', ctx.answer === i ? 'true' : 'false');
      if (ctx.wrong.has(i)) b.classList.add('wrong');
    });
  }
  if (m.instant === 'check') B('btn primary', m.checkLabel || 'Prüfen', acts, () => M.tryCheck(L, true));
  if (ctx.hintAvail && ctx.hintLevel < m.hints.length) B('btn', ctx.hintLevel ? 'Noch ein Hinweis' : 'Hinweis', acts, () => { ctx.hintLevel++; ctx.hintAt = now(); ctx.hintAvail = ctx.hintLevel < m.hints.length && false; M.renderMission(L); });
  if (ctx.hintLevel > 0) m.hints.slice(0, ctx.hintLevel).forEach((h, i) => H('p', 'm-hint', (m.hints.length > 1 ? `Hinweis ${i + 1}: ` : '') + h, el));
};
/* Hinweise freischalten: nach 2 Fehlprüfungen oder 45 s ohne Zustandsänderung, Stufe 2 ebenso nach dem ersten Hinweis */
setInterval(() => {
  M.levels.forEach((L) => {
    const ctx = L.ctx, m = M.active(L);
    if (!ctx || !m || ctx.hintAvail || ctx.hintLevel >= m.hints.length) return;
    const since = now() - Math.max(ctx.lastChange, ctx.hintAt);
    const failsNeeded = 2 * (ctx.hintLevel + 1);
    if (ctx.fails >= failsNeeded || (L.seen && since > 45000)) { ctx.hintAvail = true; M.renderMission(L); }
  });
}, 1000);
M.renderCard = function (L) {
  const c = G.cards[L.n], el = L.el.card;
  el.hidden = !c;
  el.replaceChildren();
  if (!c) return;
  M.fillCard(el, L.n, c);
};
M.fillCard = function (el, n, c) {
  H('p', 'c-label', `Erkenntnis · Level ${n} · ${M.levels.find((x) => x.n === n).def.name}`, el);
  H('p', null, c.text, el);
  if (c.nums) { const d = H('div', 'c-nums', null, el); d.innerHTML = c.nums; }
  const hw = H('p', 'c-hw', null, el); H('b', null, 'Im echten Chip: ', hw); hw.append(c.hw);
};
M.renderGallery = function () {
  const g = $('#gallery'); g.replaceChildren();
  const ns = Object.keys(G.cards).map(Number).sort((a, b) => a - b);
  const NL = M.levels.length; $('#finalIntro').textContent = ns.length === NL ? `Alle ${NL} Bauteile sind eingesetzt. Das ist deine Maschine.` : ns.length ? `${ns.length} von ${NL} Bauteilen eingesetzt.` : `Der Abschluss öffnet sich, sobald alle ${NL} Bauteile eingesetzt sind. Du kannst ihn auch jetzt schon lesen.`;
  if (!ns.length) { H('p', 'caption', 'Hier erscheinen die Erkenntniskarten der Level, die du abgeschlossen hast.', g); return; }
  ns.forEach((n) => { if (!M.levels.find((x) => x.n === n)) return; const el = H('div', 'card', null, g); M.fillCard(el, n, G.cards[n]); });
};
M.renderProgress = function () {
  const all = M.levels.flatMap((L) => L.def.missions);
  const groups = new Map();
  all.forEach((m) => { const k = `${m.id.slice(0, 2)}${m.m}`; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(m.id); });
  const doneGroups = [...groups.values()].filter((ids) => ids.every((id) => G.done.has(id))).length;
  $('#progText').textContent = `${doneGroups} von ${groups.size} Missionen`;
  $('#progBar').style.width = `${(100 * all.filter((m) => G.done.has(m.id)).length) / all.length}%`;
};
M.renderSchema = function () {
  const cur = M.levels.find((L) => !G.cards[L.n]);
  M.levels.forEach((L) => { L.slot.classList.toggle('done', !!G.cards[L.n]); L.slot.classList.toggle('cur', L === cur); });
  const n = Object.keys(G.cards).length;
  $('#schemaNote').textContent = n === 0 ? 'Noch kein Bauteil eingesetzt. Klick auf einen Platz, um zum Level zu springen.' : n === M.levels.length ? 'Vollständig: Deine Maschine rechnet.' : `${n} von ${M.levels.length} Bauteilen eingesetzt. Als Nächstes: ${cur.def.part.split(':')[0]}.`;
};

/* Bauteil-Icons im Maschinen-Schema */
const ICONS = {
  0: '<path class="p" d="M5 13v14M10 16v8M10 20h5l2-5 3 10 3-10 3 10 3-10 2 5h4"/>',
  1: '<path class="p" d="M8 20h10M18 12v16M18 20l8-6M26 14v-6M18 20l8 6M26 26v6"/><circle class="f" cx="30" cy="8" r="2"/>',
  2: '<path class="p" d="M10 12h8M10 28h8M18 10v20h6a10 10 0 0 0 0-20z"/><circle class="p" cx="31" cy="20" r="2.5"/>',
  3: '<path class="p" d="M12 14l10 6-10 6z M28 26l-10-6 10-6z"/><path class="p" d="M22 20h6M12 14v-4h16v4M12 26v4h16v-4"/>',
  4: '<rect class="p" x="6" y="14" width="7" height="12" rx="1"/><rect class="p" x="15" y="14" width="7" height="12" rx="1"/><rect class="p" x="24" y="14" width="7" height="12" rx="1"/><rect class="f" x="33" y="14" width="2" height="12"/>',
  5: '<rect class="p" x="4" y="8" width="13" height="24" rx="2"/><rect class="p" x="23" y="8" width="13" height="24" rx="2"/><path class="p" d="M4 16h13M4 24h13M23 16h13M23 24h13M17 20h6"/><circle class="f" cx="29.5" cy="12" r="1.8"/><circle class="f" cx="29.5" cy="28" r="1.8"/>',
  6: '<path class="p" d="M6 14h8M6 26h8M14 10v20h4a10 10 0 0 0 0-20zM24 20h4M28 14v12M22 20h12"/>',
  7: '<path class="p" d="M8 12l8 8-8 8M24 12l8 8-8 8M16 20h8"/><path class="p" d="M20 8v4M20 28v4"/>',
  8: '<rect class="p" x="8" y="10" width="24" height="20" rx="2"/><path class="p" d="M14 16h12M14 20h12M14 24h6"/><path class="f" d="M30 4l3 4h-6z"/>',
  9: '<path class="p" d="M8 30V10h8v20M8 20h8M24 30l8-10-8-10"/><circle class="f" cx="20" cy="20" r="3"/>',
  10: '<rect class="p" x="6" y="10" width="28" height="18" rx="2"/><path class="p" d="M12 24v-8M18 24V14M24 24v-6M30 24V12"/><path class="p" d="M14 34h12"/>',
};
function buildSlots() {
  const host = $('#slots');
  M.levels.forEach((L) => {
    const b = B('slot', null, host, () => L.el.section.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'start' }));
    b.setAttribute('aria-label', `Level ${L.n}: ${L.def.name}`);
    b.innerHTML = `<svg viewBox="0 0 40 40" aria-hidden="true">${ICONS[L.n]}</svg>`;
    H('span', 'sn', String(L.n), b);
    H('span', 'sl', L.def.slot, b);
    L.slot = b;
  });
}
/* Kopfgrafik: BIT als Spannungsverlauf */
function buildTrace() {
  const svg = $('#trace'), bits = [];
  for (const ch of 'BIT') { const c = ch.charCodeAt(0); for (let i = 7; i >= 0; i--) bits.push((c >> i) & 1); }
  const w = 20, yh = 6, yl = 30;
  [8, 16].forEach((i) => S('line', { x1: i * w, x2: i * w, y1: 0, y2: 36 }, svg));
  let d = `M0 ${bits[0] ? yh : yl}`;
  bits.forEach((b, i) => { d += ` V${b ? yh : yl} H${(i + 1) * w}`; });
  S('path', { d }, svg);
  ['B', 'I', 'T'].forEach((ch, g) => { const t = S('text', { x: (g * 8 + 4) * w, y: 52, 'text-anchor': 'middle' }, svg); t.textContent = `${ch} = ${bin(ch.charCodeAt(0), 8)}`; });
}
/* Gerüst eines Levels */
function levelShell(def) {
  const sec = H('section', 'level', null, $('#levels')); sec.id = 'level' + def.n;
  const head = H('div', 'lvl-head', null, sec);
  H('span', 'lvl-no', String(def.n), head);
  const hd = H('div', null, null, head); H('p', 'eyebrow', def.eyebrow, hd); H('h2', null, def.name, hd);
  H('p', 'lvl-part', 'Bauteil: ' + def.part, head);
  if (def.sub) H('p', 'sub', def.sub, sec);
  if (def.orient) { const o = H('dl', 'orient', null, sec); [['Was du siehst', def.orient.sehen], ['Was du tust', def.orient.tun], ['Worauf es ankommt', def.orient.lernen], ['Vergleich aus dem Alltag', def.orient.vergleich]].filter(([, v]) => v).forEach(([k, v]) => { H('dt', null, k, o); H('dd', null, v, o); }); }
  const mission = H('div', 'mission', null, sec);
  const work = H('div', 'col', null, sec);
  const card = H('div', 'card', null, sec); card.hidden = true;
  const extra = H('div', 'col', null, sec);
  return { section: sec, work, mission, card, extra };
}
/* Zähl-Hilfen */
function roundsTo(a0, k, eps = 0.01) {
  const g = (x) => sig(sig(x, k), k);
  let s = a0; for (let n = 0; n < 600; n++) s = g(s);
  let z = a0; for (let n = 0; n <= 600; n++) { if (Math.abs(z - s) < eps) return { rounds: n, fix: s }; z = g(z); }
  return { rounds: null, fix: s };
}
function erfc(x) {
  const z = Math.abs(x), t = 1 / (1 + 0.5 * z);
  const r = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
  return x >= 0 ? r : 2 - r;
}
function log10Q(x) {
  if (x < 25) return Math.log10(0.5 * erfc(x / Math.SQRT2));
  return (-x * x / 2 - Math.log(x) - 0.5 * Math.log(2 * Math.PI) + Math.log(1 - 1 / (x * x))) / Math.LN10;
}
function sciFromLog(l) { let e = Math.floor(l), m = Math.pow(10, l - e); if (m >= 9.95) { m = 1; e += 1; } return `${de(m, 1)} · 10${sup(e)}`; }
