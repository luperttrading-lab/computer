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
/* ===== Level 0: Spannung, Strom, Widerstand ===== */
const R_ON = 2;   // Widerstand des voll geöffneten Transistors in Ohm
const L0 = M.define({
  n: 0, name: 'Spannung, Strom, Widerstand', slot: 'Strom', eyebrow: 'Bevor es losgeht: Was fließt da eigentlich?',
  part: 'Grundbegriffe: Spannung (Druck), Strom (Fluss), Widerstand (Bremse)',
  orient: {
    sehen: 'Links ein einfacher Stromkreis: eine Batterie, die drückt, ein Bauteil, das bremst (der Widerstand), ein Schalter und Drähte im Kreis. Rechts dasselbe mit Wasser: ein hohes Becken, ein tiefes Becken und ein Rohr mit einer Engstelle. Drei Größen: Die Spannung U (in Volt) ist der Druck, also wie stark geschoben wird. Der Strom I (in Ampere) ist der Fluss, also wie viel pro Sekunde durchkommt. Der Widerstand R (in Ohm) ist die Bremse, also wie eng der Weg ist.',
    tun: 'Stell mit den Reglern Spannung und Widerstand ein und beobachte, wie viel Strom fließt: als Zahl, als wandernde Punkte im Draht und als Wasser im Rohr. Dann öffnest du den Schalter. Zum Schluss ersetzt ein Transistor den Widerstand.',
    lernen: 'Es gibt nur einen Zusammenhang: Strom = Spannung ÷ Widerstand, kurz I = U / R. Spannung kann anliegen, ohne dass etwas fließt, wenn der Weg unterbrochen ist. Und ein Transistor ist ein Widerstand, den man mit einer Spannung verstellt: Das ist der Schalter, aus dem der ganze Computer besteht.',
    vergleich: 'Wasser: Die Spannung ist der Höhenunterschied zwischen den Becken, der Strom ist die Wassermenge pro Sekunde, der Widerstand ist die Enge des Rohrs. Für dich als Trader: Die Spannung ist eine Preisdifferenz zwischen zwei Märkten, also der Anreiz, dass überhaupt etwas fließt. Der Strom ist das Volumen, das pro Sekunde tatsächlich hinüberläuft. Der Widerstand sind die Transaktionskosten.',
  },
  build(L) {
    L.el = levelShell(this);
    const st = { U: 6, R: 6, closed: true, tr: false, vg: 1, seenIhigh: false };
    const Reff = () => (st.tr ? R_ON / lampH(st.vg) : st.R);
    const I = () => (st.closed ? st.U / Reff() : 0);
    const panel = H('div', 'panel', null, L.el.work);
    const split = H('div', 'split', null, panel);
    const left = H('div', 'col', null, split), right = H('div', 'col', null, split);
    H('p', 'memtitle', 'Stromkreis', left);
    const cs = S('svg', { class: 'fig', viewBox: '0 0 360 230', role: 'img', 'aria-label': 'Stromkreis mit Batterie, Schalter und Widerstand' }, left);
    H('p', 'memtitle', 'Dasselbe mit Wasser', right);
    const ws = S('svg', { class: 'fig', viewBox: '0 0 360 230', role: 'img', 'aria-label': 'Zwei Wasserbecken, verbunden durch ein Rohr mit Engstelle' }, right);

    /* Stromkreis */
    const wA = S('path', { d: 'M50 102 V40 H150', class: 'wire' }, cs);            // Plus-Seite bis zum Schalter
    const wB = S('path', { d: 'M200 40 H310 V85', class: 'wire' }, cs);            // nach dem Schalter bis zum Bauteil
    const wC = S('path', { d: 'M310 145 V190 H50 V114', class: 'wire' }, cs);      // nach dem Bauteil zurück zur Minus-Seite
    S('line', { x1: 28, x2: 72, y1: 102, y2: 102, class: 'axis', 'stroke-width': 3 }, cs);
    S('line', { x1: 40, x2: 60, y1: 114, y2: 114, class: 'axis', 'stroke-width': 6 }, cs);
    let t = S('text', { x: 80, y: 107, class: 'lab' }, cs); t.textContent = '+';
    t = S('text', { x: 80, y: 122, class: 'lab' }, cs); t.textContent = '−';
    t = S('text', { x: 60, y: 88, class: 'cv' }, cs); t.textContent = 'Batterie';
    const uT = S('text', { x: 64, y: 150, class: 'val' }, cs);
    S('circle', { cx: 150, cy: 40, r: 4, class: 'fp-stable' }, cs); S('circle', { cx: 200, cy: 40, r: 4, class: 'fp-stable' }, cs);
    const lever = S('line', { x1: 150, y1: 40, x2: 200, y2: 40, class: 'wire', 'stroke-width': 4 }, cs);
    t = S('text', { x: 175, y: 64, class: 'cv', 'text-anchor': 'middle' }, cs); t.textContent = 'Schalter';
    const pTop = S('text', { x: 92, y: 32, class: 'cv' }, cs), pBot = S('text', { x: 140, y: 208, class: 'cv' }, cs);
    const resG = S('g', null, cs);
    S('rect', { x: 296, y: 85, width: 28, height: 60, rx: 4, class: 'box' }, resG);
    t = S('text', { x: 310, y: 121, class: 'lab', 'text-anchor': 'middle' }, resG); t.textContent = 'R';
    const rT = S('text', { x: 288, y: 119, class: 'val', 'text-anchor': 'end' }, cs);
    const trG = S('g', { class: 'mos' }, cs);
    S('path', { d: 'M310 85 V97 M310 133 V145', class: 'ch' }, trG);
    const trCh = S('line', { x1: 310, x2: 310, y1: 97, y2: 133, class: 'ch' }, trG);
    S('line', { x1: 300, x2: 300, y1: 99, y2: 131, class: 'g' }, trG);
    const gW = S('path', { d: 'M300 115 H236', class: 'wire ctl' }, trG);
    const gT = S('text', { x: 232, y: 106, class: 'ctlt', 'text-anchor': 'end' }, trG);
    const iT = S('text', { x: 180, y: 226, class: 'val', 'text-anchor': 'middle' }, cs);
    const dotsC = S('g', null, cs);
    const loop = [[50, 102], [50, 40], [310, 40], [310, 190], [50, 190], [50, 114]];
    const segs = []; let per = 0;
    for (let i = 0; i < loop.length - 1; i++) { const [x1, y1] = loop[i], [x2, y2] = loop[i + 1]; const len = Math.hypot(x2 - x1, y2 - y1); segs.push({ x1, y1, x2, y2, len, s0: per }); per += len; }
    const at = (s) => { s = ((s % per) + per) % per; const g = segs.find((q) => s <= q.s0 + q.len) || segs[segs.length - 1]; const f = (s - g.s0) / g.len; return [g.x1 + (g.x2 - g.x1) * f, g.y1 + (g.y2 - g.y1) * f]; };
    const ND = 16, cDots = Array.from({ length: ND }, () => S('circle', { r: 3.2, class: 'start' }, dotsC));

    /* Wasser */
    const yG = 190;
    S('rect', { x: 20, y: 30, width: 90, height: 160, class: 'box' }, ws);
    S('rect', { x: 250, y: 30, width: 90, height: 160, class: 'box' }, ws);
    const wL = S('rect', { x: 21, width: 88, class: 'dens' }, ws), wR = S('rect', { x: 251, y: 172, width: 88, height: 18, class: 'dens' }, ws);
    S('rect', { x: 110, y: 176, width: 140, height: 14, class: 'box' }, ws);
    const pipeW = S('rect', { x: 110, y: 177, width: 140, height: 12, class: 'dens' }, ws);
    const dotsW = S('g', null, ws), wDots = Array.from({ length: 7 }, () => S('circle', { r: 2.6, cy: 183, class: 'start' }, dotsW));
    const cTop = S('rect', { x: 165, y: 176, width: 30, class: 'gate-block' }, ws), cBot = S('rect', { x: 165, width: 30, class: 'gate-block' }, ws);
    const valve = S('rect', { x: 137, y: 170, width: 7, height: 26, rx: 2, class: 'lost' }, ws);
    const hLine = S('path', { class: 'thr' }, ws), hT = S('text', { x: 118, class: 'cv' }, ws);
    t = S('text', { x: 180, y: 166, class: 'cv', 'text-anchor': 'middle' }, ws); t.textContent = 'Enge = Widerstand';
    const enT = t;
    const flT = S('text', { x: 180, y: 208, class: 'cv', 'text-anchor': 'middle' }, ws);
    t = S('text', { x: 20, y: 20, class: 'cv' }, ws); t.textContent = 'Eine Pumpe hält die Höhe, wie die Batterie';

    /* Bedienung */
    const fm = H('div', 'formula wrap', null, panel);
    const stats = H('div', 'stats', null, panel);
    const stat = (k) => { const d = H('div', 'stat', null, stats); H('span', 'k', k, d); return H('span', 'v', '–', d); };
    const sI = stat('Strom I (Fluss)'), sP = stat('Leistung P = U · I'), sG = stat('Strom durch das Gate');
    const ctrl = (id, label, min, max, step) => { const c = H('div', 'ctrl', null, panel); const l = H('label', null, label + ' ', c); l.htmlFor = id; const o = H('output', null, '', l); const i = H('input', null, null, c); i.type = 'range'; i.id = id; i.min = min; i.max = max; i.step = step; return { c, o, i }; };
    const cU = ctrl('u0', 'Spannung U (Druck)', '0', '12', '0.5'), cR = ctrl('r0', 'Widerstand R (Bremse)', '1', '20', '0.5'), cV = ctrl('vg0', 'Spannung am Gate des Transistors', '0', '1', '0.01');
    const vRow = H('div', 'row', null, cV.c); B('btn', 'Gate = 0', vRow, () => setv(0)); B('btn', 'Gate = 1', vRow, () => setv(1));
    const swRow = H('div', 'row', null, panel);
    const s1 = H('label', 'switch', null, swRow); const cbC = H('input', null, null, s1); cbC.type = 'checkbox'; cbC.id = 'closed0'; s1.append(' Schalter geschlossen');
    const s2 = H('label', 'switch', null, swRow); const cbT = H('input', null, null, s2); cbT.type = 'checkbox'; cbT.id = 'tr0'; s2.append(' Widerstand durch Transistor ersetzen');
    H('p', 'caption', 'Die Punkte zeigen die Richtung, in die man den Strom zählt: vom Plus-Pol durch den Kreis zum Minus-Pol. Die Elektronen selbst wandern andersherum; für alles in dieser App spielt das keine Rolle. Die Farbe der Drähte zeigt den Druck: kräftig blau heißt volle Spannung, grau heißt 0 V.', panel);
    const setv = (v) => { st.vg = v; cV.i.value = String(v); render(); L.touch(); };
    cU.i.addEventListener('input', () => { st.U = +cU.i.value; render(); L.touch(); });
    cR.i.addEventListener('input', () => { st.R = +cR.i.value; render(); L.touch(); });
    cV.i.addEventListener('input', () => { st.vg = +cV.i.value; render(); L.touch(); });
    cbC.addEventListener('change', () => { st.closed = cbC.checked; render(); L.touch(); });
    cbT.addEventListener('change', () => { st.tr = cbT.checked; render(); L.touch(); });
    const A = (x) => `${de(x, x < 0.1 && x > 0 ? 3 : 2)} A`;
    function render() {
      const i = I(), R = Reff(), u = st.U / 12;
      cU.i.value = String(st.U); cR.i.value = String(st.R); cV.i.value = String(st.vg); cbC.checked = st.closed; cbT.checked = st.tr;
      cU.o.textContent = `${de(st.U, 1)} V`; cR.o.textContent = `${de(st.R, 1)} Ω`; cV.o.textContent = de(st.vg);
      cR.c.hidden = st.tr; cV.c.hidden = !st.tr;
      wA.style.stroke = mix(u); wB.style.stroke = st.closed ? mix(u) : mix(0); wC.style.stroke = mix(0);
      lever.setAttribute('x2', st.closed ? 200 : 194); lever.setAttribute('y2', st.closed ? 40 : 14); lever.style.stroke = mix(u);
      uT.textContent = `U = ${de(st.U, 1)} V`; pTop.textContent = `Druck ${de(st.U, 1)} V`; pBot.textContent = 'Druck 0 V (Masse)';
      resG.setAttribute('visibility', st.tr ? 'hidden' : 'visible'); trG.setAttribute('visibility', st.tr ? 'visible' : 'hidden');
      rT.textContent = st.tr ? '' : `R = ${de(st.R, 1)} Ω`;
      trCh.setAttribute('stroke-width', (1.5 + 5 * lampH(st.vg)).toFixed(1)); trG.classList.toggle('on', lampH(st.vg) > 0.5); gW.classList.toggle('on', st.vg > 0.5);
      gT.textContent = `Gate ${de(st.vg)}`;
      iT.textContent = st.closed ? `Strom I = ${A(i)}` : 'Strom I = 0 A (Weg unterbrochen)';
      // Wasser
      const hL = 10 + 140 * u, yW = yG - hL;
      wL.setAttribute('y', yW.toFixed(1)); wL.setAttribute('height', hL.toFixed(1));
      const o = Math.max(1.5, Math.min(12, 2 + 10 / (1 + (R - 1) / 3)));
      cTop.setAttribute('height', (7 - o / 2 + 0.01).toFixed(2)); cBot.setAttribute('y', (183 + o / 2).toFixed(2)); cBot.setAttribute('height', (7 - o / 2 + 0.01).toFixed(2));
      valve.setAttribute('visibility', st.closed ? 'hidden' : 'visible');
      pipeW.setAttribute('visibility', st.U > 0 ? 'visible' : 'hidden');
      hLine.setAttribute('d', `M120 ${yW.toFixed(1)} V172`);
      hT.setAttribute('y', ((yW + 172) / 2).toFixed(1)); hT.textContent = `Höhe = ${de(st.U, 1)} V`;
      enT.textContent = st.tr ? 'Enge = Transistor' : 'Enge = Widerstand';
      flT.textContent = st.closed ? `Durchfluss = Strom = ${A(i)}` : 'Ventil zu: kein Durchfluss';
      // Zahlen
      fm.textContent = !st.closed ? `Schalter offen: Der Weg ist unterbrochen, R ist unendlich groß, also I = 0 A. Die ${de(st.U, 1)} V liegen trotzdem an, jetzt zwischen den beiden Kontakten des Schalters.`
        : st.tr ? `I = U / R = ${de(st.U, 1)} V / ${de(R, R < 10 ? 2 : 0)} Ω = ${A(i)}   (Der Transistor wirkt wie ein Widerstand von ${de(R, R < 10 ? 2 : 0)} Ω; das Gate stellt ihn ein.)`
        : `I = U / R = ${de(st.U, 1)} V / ${de(st.R, 1)} Ω = ${A(i)}`;
      sI.textContent = A(i); sP.textContent = `${de(st.U * i, 1)} W`; sG.textContent = st.tr ? '0 A' : '–';
      if (st.tr && st.closed && i >= 2) st.seenIhigh = true;
      if (REDUCED) place(0);
    }
    let off = 0, offW = 0, last = null;
    function place() {
      cDots.forEach((d, k) => { const [x, y] = at(off + (k * per) / ND); d.setAttribute('cx', x.toFixed(1)); d.setAttribute('cy', y.toFixed(1)); });
      wDots.forEach((d, k) => { const x = 110 + (((offW + k * 20) % 140) + 140) % 140; d.setAttribute('cx', x.toFixed(1)); });
      const show = st.closed && I() > 0.001; dotsW.setAttribute('visibility', show ? 'visible' : 'hidden');
    }
    function frame(ts) {
      if (last != null && !document.hidden) { const dt = Math.min(0.1, (ts - last) / 1000); const v = 22 * I(); off += v * dt; offW += v * dt * 0.6; place(); }
      last = ts; requestAnimationFrame(frame);
    }
    render(); place();
    if (!REDUCED) requestAnimationFrame(frame);
    return { st, I, render, lockU(on) { cU.i.disabled = on; }, lockR(on) { cR.i.disabled = on; },
      set(o) { Object.assign(st, o); render(); } };
  },
  freeplay(api) { api.lockU(false); api.lockR(false); },
  missions: [
    { id: 'L0M1', m: 1, text: 'Lass genau 2 Ampere fließen. Die Spannung ist auf 6 Volt festgelegt, du verstellst nur den Widerstand.',
      start(api) { api.set({ U: 6, R: 6, closed: true, tr: false }); api.lockU(true); api.lockR(false); },
      check(api) { const s = api.st; if (!s.closed) return 'Erst den Schalter schließen.'; const i = api.I(); if (Math.abs(i - 2) < 1e-9) return true; return i > 2 ? `${de(i, 2)} A sind zu viel: Der Weg ist zu weit. Mehr bremsen.` : `${de(i, 2)} A sind zu wenig: Mehr Fluss braucht einen weiteren Weg, also weniger Widerstand.`; },
      doneText: () => '6 V ÷ 3 Ω = 2 A. Halber Widerstand gegenüber dem Start (6 Ω), doppelter Strom: Das Rohr ist weiter, es fließt mehr.',
      hints: ['Strom = Spannung ÷ Widerstand. 6 ÷ ? = 2.', 'R = U ÷ I = 6 ÷ 2 = 3 Ohm.'] },
    { id: 'L0M2', m: 2, text: 'Sag vorher: Wenn du die Spannung auf 12 Volt verdoppelst und der Widerstand bei 3 Ohm bleibt, was passiert mit dem Strom? Wähl erst eine Antwort, dann prüf sie mit dem Spannungs-Regler.',
      start(api) { api.set({ U: 6, R: 3, closed: true, tr: false }); api.lockU(false); api.lockR(true); },
      chips: ['Er verdoppelt sich auf 4 A', 'Er bleibt bei 2 A', 'Er halbiert sich auf 1 A'],
      check(api, ctx) { const s = api.st; if (ctx.answer == null) return s.U === 12 ? 'Du hast schon nachgesehen. Wähl trotzdem eine Antwort.' : false; if (ctx.answer !== 0) return ctx.answer === 1 ? 'Nein: Mehr Druck bei gleicher Bremse schiebt mehr durch. Stell 12 V ein und sieh nach.' : 'Nein, umgekehrt: Halbieren würde der Strom bei doppeltem Widerstand. Stell 12 V ein und sieh nach.'; if (s.U === 12 && s.closed) return true; return { text: 'Gut vorhergesagt. Jetzt stell 12 V ein und sieh nach.' }; },
      doneText: () => '12 V ÷ 3 Ω = 4 A. Und die Leistung, also die Energie pro Sekunde, steigt von 12 W auf 48 W: P = U · I, und beide haben sich verdoppelt. Doppelte Spannung, vierfache Wärme.',
      hints: ['I = U / R: Was passiert mit einem Bruch, wenn sich der Zähler verdoppelt und der Nenner bleibt?'] },
    { id: 'L0M3', m: 3, text: 'Öffne den Schalter. Ist jetzt noch Spannung da?',
      start(api) { api.set({ U: 12, R: 3, closed: true, tr: false }); api.lockU(false); api.lockR(false); },
      chips: ['Ja: Die 12 V liegen weiter an, aber es fließt nichts', 'Nein: Ohne Strom gibt es keine Spannung', 'Die Spannung sinkt auf die Hälfte'],
      chipsWhen: (api) => !api.st.closed,
      chipsText: 'Der Schalter ist offen, der Strom ist 0 A. Und die Spannung?',
      instant: 'chips',
      check(api, ctx) { if (ctx.answer === 0) return true; return ctx.answer === 1 ? 'Nein: Die Batterie drückt weiter. Schau auf die Wasserseite: Das Becken ist noch hoch, nur das Ventil ist zu.' : 'Nein: Der ganze Druck liegt jetzt am offenen Schalter, zwischen seinen beiden Kontakten.'; },
      doneText: () => 'Genau: Spannung ohne Strom ist Druck ohne Fluss. So hält ein Chip eine 1 am Gate eines Transistors: Spannung liegt an, aber durch das Gate fließt nichts.',
      hints: ['Schau auf die Farbe der Drähte: Bis zum Schalter sind sie weiter blau, also unter Druck.'] },
    { id: 'L0M4a', m: 4, text: 'Jetzt kommt der Schalter, aus dem der Computer besteht: Ersetze den Widerstand durch einen Transistor (Häkchen unten). Seine Enge stellst du nicht von Hand ein, sondern mit einer Spannung am Gate. Lass so mindestens 2 Ampere fließen.',
      start(api) { api.set({ U: 6, closed: true, tr: false, vg: 0, seenIhigh: false }); api.lockU(false); api.lockR(false); },
      check(api) { const s = api.st; if (!s.tr) return false; if (!s.closed) return 'Den Schalter geschlossen lassen.'; return api.I() >= 2 ? true : `${de(api.I(), 3)} A. Der Transistor ist noch zu eng.`; },
      doneText: (api) => `${de(api.I(), 2)} A bei offenem Gate. Der Transistor wirkt jetzt wie ein kleiner Widerstand.`,
      hints: ['Mehr Spannung am Gate macht den Weg im Transistor weiter. Probier „Gate = 1“.'] },
    { id: 'L0M4b', m: 4, text: 'Und jetzt sperr den Transistor so, dass fast nichts mehr fließt (unter 0,05 Ampere), ohne den Schalter anzufassen.',
      start(api) { api.set({ tr: true, closed: true, vg: 1 }); },
      check(api) { const s = api.st; if (!s.closed) return 'Den Schalter geschlossen lassen: Diesmal soll das Gate sperren.'; if (!s.tr) return 'Der Transistor soll drin bleiben.'; return api.I() < 0.05 ? true : false; },
      found: (api) => { const s = api.st; return { i1: s.U / (R_ON / lampH(1)), i0: s.U / (R_ON / lampH(0)), U: s.U }; },
      hints: ['Gate auf 0: Dann ist der Weg im Transistor fast zu.'] },
  ],
  card(api, f) {
    return {
      text: 'Spannung ist Druck, Strom ist Fluss, Widerstand ist Bremse, und I = U / R verbindet sie. Spannung kann anliegen, ohne dass Strom fließt, wenn der Weg unterbrochen ist. Ein Transistor ist ein Widerstand, den eine Spannung am Gate verstellt; durch das Gate selbst fließt praktisch nichts. Das ist der Schalter, aus dem der ganze Computer besteht, und die Lampe in Level 1 ist genau dieser Strom.',
      nums: `6 V / 3 Ω = 2 A · 12 V / 3 Ω = 4 A, Leistung 12 W → 48 W · Transistor bei ${de(f.U ?? 6, 1)} V: Gate 1 → ${de(f.i1 ?? 2.98, 2)} A, Gate 0 → ${de(f.i0 ?? 0.02, 3)} A, durch das Gate selbst 0 A`,
      hw: 'Einheiten: 1 Volt = 1 Joule je Coulomb (Energie je Ladungsmenge), 1 Ampere = 1 Coulomb je Sekunde, das sind rund 6,2 · 10¹⁸ Elektronen pro Sekunde, 1 Ohm = 1 Volt je Ampere. Spannung ist immer ein Unterschied zwischen zwei Punkten; „Masse“ ist der vereinbarte Nullpunkt. Im Chip arbeitet man mit etwa 1 V und winzigen Strömen je Transistor; ein ganzer Prozessor zieht trotzdem leicht über 100 A, weil Milliarden Transistoren gleichzeitig schalten. Bei echten Transistoren liegt der Unterschied zwischen gesperrt und offen bei einem Faktor von etwa 100 000 bis einer Million; das Modell hier zeigt nur gut 150.',
    };
  },
});
/* ===== Level 1: Der Schalter ===== */
function buildNoisePanel(host) {
  const panel = H('div', 'panel', null, host);
  const lvHost = H('div', 'row', null, panel); lvHost.setAttribute('role', 'group'); lvHost.setAttribute('aria-label', 'Anzahl der Stufen');
  const svg = S('svg', { class: 'fig', viewBox: '0 0 600 220', role: 'img', 'aria-label': 'Verteilungen der Spannungsstufen mit Rauschen' }, panel);
  const ctrl = H('div', 'ctrl', null, panel);
  const lab = H('label', null, 'Rauschen σ, in Prozent des Spannungsbereichs ', ctrl); lab.htmlFor = 'sigma';
  const out = H('output', null, '10,0 %', lab);
  const sIn = H('input', null, null, ctrl); sIn.type = 'range'; sIn.id = 'sigma'; sIn.min = '0.01'; sIn.max = '0.2'; sIn.step = '0.005'; sIn.value = '0.1';
  const stats = H('div', 'stats', null, panel);
  const stat = (k) => { const d = H('div', 'stat', null, stats); H('span', 'k', k, d); return H('span', 'v', '–', d); };
  const sBits = stat('Bit pro Zelle'), sDist = stat('Stufenabstand d'), sErr = stat('Fehler je Lesen');
  const note = H('p', 'note', null, panel);
  H('p', 'caption', 'Rot: der Teil einer Verteilung, der jenseits einer Entscheidungsschwelle landet und als Nachbarstufe gelesen wird. Bei 4, 8 und 16 Stufen stehen Gray-Codes darunter, wie in Flash-Speichern: Nachbarn unterscheiden sich in genau einem Bit.', panel);
  const D0 = -0.15, D1 = 1.15, X = (v) => 24 + ((v - D0) / (D1 - D0)) * 552, base = 160, peak = 120;
  S('line', { x1: X(D0), x2: X(D1), y1: base, y2: base, class: 'axis' }, svg);
  let ta = S('text', { x: X(0), y: base + 44, 'text-anchor': 'middle', class: 't' }, svg); ta.textContent = '0 V';
  ta = S('text', { x: X(1), y: base + 44, 'text-anchor': 'middle', class: 't' }, svg); ta.textContent = 'volle Spannung';
  const g = S('g', null, svg);
  let L = 2;
  const btns = [[2, 'Logik, SLC'], [4, 'MLC'], [8, 'TLC'], [10, 'dezimal'], [16, 'QLC']].map(([n, l]) => {
    const b = B('btn', null, lvHost, () => { L = n; update(); }); b.append(document.createTextNode(`${n} Stufen`)); H('small', null, l, b); return [n, b];
  });
  const dens = (x, mu, s) => base - peak * Math.exp(-((x - mu) ** 2) / (2 * s * s));
  const label = (i) => (L === 10 ? String(i) : bin(i ^ (i >> 1), Math.log2(L)));
  function errLog(Lv, sigma) { const d = 1 / (Lv - 1); return Math.log10((2 * (Lv - 1)) / Lv) + log10Q(d / (2 * sigma)); }
  function update() {
    const sigma = +sIn.value; out.textContent = `${de(sigma * 100, 1)} %`;
    btns.forEach(([n, b]) => b.setAttribute('aria-pressed', n === L ? 'true' : 'false'));
    g.replaceChildren();
    const d = 1 / (L - 1);
    for (let i = 0; i < L - 1; i++) { const x = (i + 0.5) * d; S('line', { x1: X(x), x2: X(x), y1: base - peak - 12, y2: base, class: 'thr' }, g); }
    for (let i = 0; i < L; i++) {
      const mu = i * d, lo = Math.max(D0, mu - 4 * sigma), hi = Math.min(D1, mu + 4 * sigma);
      let p = '';
      for (let j = 0; j <= 80; j++) { const x = lo + ((hi - lo) * j) / 80; p += (j ? ' L' : 'M') + X(x).toFixed(1) + ' ' + dens(x, mu, sigma).toFixed(1); }
      S('path', { d: `${p} L${X(hi).toFixed(1)} ${base} L${X(lo).toFixed(1)} ${base} Z`, class: 'dens' }, g);
      const tail = (a, b) => { if (b <= a) return; let q = `M${X(a).toFixed(1)} ${base}`; for (let j = 0; j <= 40; j++) { const x = a + ((b - a) * j) / 40; q += ` L${X(x).toFixed(1)} ${dens(x, mu, sigma).toFixed(1)}`; } S('path', { d: `${q} L${X(b).toFixed(1)} ${base} Z`, class: 'tail' }, g); };
      if (i < L - 1) tail(mu + d / 2, hi);
      if (i > 0) tail(lo, mu - d / 2);
      const t = S('text', { x: X(mu), y: base + 20, 'text-anchor': 'middle', class: 't' }, g);
      if (L === 16) t.setAttribute('style', 'font-size:9.5px');
      t.textContent = label(i);
    }
    const bits = Math.log2(L);
    sBits.textContent = de(bits, Number.isInteger(bits) ? 0 : 2);
    sDist.textContent = de(d, 3);
    const l = errLog(L, sigma);
    sErr.textContent = l >= -2 ? `${deMax(Math.pow(10, l) * 100, 1)} %` : sciFromLog(l);
    let n;
    if (l >= -3) { const k = Math.max(1, Math.round(Math.pow(10, -l))); n = k <= 2 ? 'Etwa jeder zweite Lesevorgang liefert die falsche Stufe.' : `Etwa jeder ${k}. Lesevorgang liefert die falsche Stufe.`; }
    else n = `Im Mittel ein Fehler je ${-l < 6 ? Math.round(Math.pow(10, -l)).toLocaleString('de-DE') : sciFromLog(-l)} Lesevorgänge.`;
    note.textContent = `${n} Abstand zur Schwelle: d/2σ = ${de(d / (2 * sigma))} Standardabweichungen.`;
  }
  sIn.addEventListener('input', update);
  update();
  return { errLog };
}

const L1 = M.define({
  n: 1, name: 'Der Schalter', slot: 'Schalter', eyebrow: 'Wo ist die Eins?',
  part: 'Transistor: ein Schalter, den eine Spannung am Gate öffnet',
  orient: {
    sehen: 'Einen Transistor, den kleinsten Schalter im Chip. Oben kommt Strom an (Versorgung), unten fließt er ab (Masse), dazwischen hängt eine Lampe. Links sitzt der Steuer-Anschluss, das Gate. „Spannung“ ist elektrischer Druck (Level 0): 0 heißt kein Druck, 1 heißt voller Druck. Vg ist die Spannung am Gate, also wie fest du auf den Schalter drückst.',
    tun: 'Zieh den Regler „Spannung am Gate“ und schau auf die Lampe und auf den Kasten „Chip liest“. Der zeigt, wie der Chip die Lampe abliest: als 0, als 1, oder mit „?“, wenn es nicht eindeutig ist.',
    lernen: 'Eine 1 ist kein Ding, das irgendwo liegt. Eine 1 heißt: Spannung da, Schalter offen, Strom fließt. Eine 0 heißt: keine Spannung, Schalter zu. Alles im Computer besteht aus Milliarden solcher Schalter.',
  },
  sub: 'Aus dem Silizium des Sandkorns (oben: „Warum ein Sandkorn?“) werden Milliarden winziger Schalter. Hier ist einer davon.',
  build(L) {
    L.el = levelShell(this);
    const panel = H('div', 'panel', null, L.el.work);
    const split = H('div', 'split', null, panel);
    const left = H('div', 'col', null, split), right = H('div', 'col', null, split);
    const svg = S('svg', { class: 'fig', viewBox: '0 0 360 230', role: 'img', 'aria-label': 'Ein nMOS-Transistor schaltet eine Lampe' }, left);
    // Versorgung, Lampe, Transistor, Masse
    S('line', { x1: 60, x2: 300, y1: 20, y2: 20, class: 'wire on' }, svg);
    let t = S('text', { x: 300, y: 13, class: 'cv', 'text-anchor': 'end' }, svg); t.textContent = 'Versorgung = 1';
    S('line', { x1: 200, x2: 200, y1: 20, y2: 52, class: 'wire on' }, svg);
    const lamp = S('circle', { cx: 200, cy: 74, r: 22, class: 'lampc' }, svg);
    const lampT = S('text', { x: 232, y: 79, class: 'val' }, svg);
    const drainW = S('line', { x1: 200, x2: 200, y1: 96, y2: 132, class: 'wire' }, svg);
    const mos = S('g', { class: 'mos' }, svg);
    S('path', { d: 'M200 132 V140 H184 M200 196 V188 H184', class: 'ch' }, mos);        // Drain/Source-Anschlüsse
    const chan = S('line', { x1: 184, x2: 184, y1: 138, y2: 190, class: 'ch' }, mos);  // Kanal
    S('line', { x1: 176, x2: 176, y1: 138, y2: 190, class: 'g' }, mos);                 // Gate-Elektrode
    const gateW = S('path', { d: 'M60 164 H176', class: 'wire ctl' }, svg);
    S('line', { x1: 200, x2: 200, y1: 196, y2: 214, class: 'wire' }, svg);
    S('path', { d: 'M186 214 H214 M192 220 H208 M198 226 H202', class: 'wire thin' }, svg);
    t = S('text', { x: 222, y: 218, class: 'cv' }, svg); t.textContent = 'Masse = 0';
    t = S('text', { x: 232, y: 150, class: 'cv' }, svg); t.textContent = 'Drain';
    t = S('text', { x: 232, y: 186, class: 'cv' }, svg); t.textContent = 'Source';
    t = S('text', { x: 118, y: 156, class: 'ctlt', 'text-anchor': 'middle' }, svg); t.textContent = 'Gate';
    // Pegelbalken links
    S('rect', { x: 30, y: 40, width: 16, height: 150, rx: 3, class: 'box' }, svg);
    const lvl = S('rect', { x: 31, y: 189, width: 14, height: 0, class: 'start' }, svg);
    S('line', { x1: 26, x2: 50, y1: 115, y2: 115, class: 'thr' }, svg);
    t = S('text', { x: 38, y: 32, class: 'cv', 'text-anchor': 'middle' }, svg); t.textContent = 'Vg';
    t = S('text', { x: 54, y: 119, class: 'cv' }, svg); t.textContent = '½';
    const vgT = S('text', { x: 38, y: 206, class: 'val', 'text-anchor': 'middle' }, svg);
    const ctrl = H('div', 'ctrl', null, left);
    const lab = H('label', null, 'Spannung am Gate (Vg): 0 = keine, 1 = volle ', ctrl); lab.htmlFor = 'vg';
    const vgOut = H('output', null, '0,00', lab);
    const vgIn = H('input', null, null, ctrl); vgIn.type = 'range'; vgIn.id = 'vg'; vgIn.min = '0'; vgIn.max = '1'; vgIn.step = '0.01'; vgIn.value = '0';
    const row = H('div', 'row', null, left);
    B('btn', 'Vg = 0', row, () => set(0)); B('btn', 'Vg = 1', row, () => set(1)); B('btn', 'Vg = ½', row, () => set(0.5));
    const reader = H('span', 'chip', null, row);
    H('p', 'caption', 'Die Helligkeit h folgt der Formel h = 1 / (1 + e^(−10·(Vg − ½))): unter der halben Spannung fast aus, darüber fast voll an. Der Kasten „Chip liest“ sagt „1“ ab h ≥ 0,8 und „0“ bis h ≤ 0,2, dazwischen „?“.', right);
    const kv = H('dl', 'kv', null, right);
    const kvv = (k) => { H('dt', null, k, kv); return H('dd', null, '', kv); };
    const dH = kvv('Helligkeit h'), dR = kvv('Chip liest'), dE = kvv('Elektronen am Gate');
    const st = { vg: 0 };
    function set(v) { vgIn.value = String(v); st.vg = +v; render(); L.touch(); }
    function render() {
      const h = lampH(st.vg);
      vgOut.textContent = de(st.vg); vgT.textContent = de(st.vg);
      lvl.setAttribute('height', (149 * st.vg).toFixed(1)); lvl.setAttribute('y', (189 - 149 * st.vg).toFixed(1));
      lamp.classList.toggle('on', h >= 0.5); lamp.style.fill = mix(h); lamp.style.stroke = mix(h);
      lampT.textContent = `h = ${de(h)}`;
      chan.setAttribute('stroke-width', (1.5 + 5 * h).toFixed(1)); mos.classList.toggle('on', h >= 0.5);
      drainW.classList.toggle('on', h >= 0.5);
      gateW.classList.toggle('on', st.vg > 0.5);
      const r = h >= 0.8 ? '1' : h <= 0.2 ? '0' : '?';
      reader.textContent = `Chip liest: ${r}`; reader.className = 'chip' + (r === '?' ? ' bad' : '');
      dH.textContent = de(h, 3); dR.textContent = r === '?' ? 'weder 0 noch 1' : r;
      dE.textContent = `≈ ${Math.round((1e-15 * st.vg) / 1.602e-19).toLocaleString('de-DE')} (1 fF · ${de(st.vg)} V / e)`;
    }
    vgIn.addEventListener('input', () => { st.vg = +vgIn.value; render(); L.touch(); });
    render();
    // Exkurs
    const det = H('details', null, null, L.el.extra);
    H('summary', null, 'Exkurs: Warum nicht zehn Stufen statt zwei?', det);
    const body = H('div', 'body', null, det);
    H('p', 'note', 'Jede Spannung rauscht. Bei L Stufen in festem Bereich ist der Abstand d = 1/(L − 1); die Fehlerrate je Lesen wächst wie die Flanke einer Normalverteilung, der Gewinn nur wie log₂ L.', body);
    const fm = H('div', 'formula', null, body); fm.textContent = 'P(Fehler) ≈ 2(L − 1)/L · Q(d / 2σ)     Q(x) = P(Z > x), Z ~ N(0, 1)';
    const noise = buildNoisePanel(body);
    const q = H('div', 'col', null, body);
    H('p', 'note', 'Zusatzfrage (zählt nicht als Mission): Welche Stufenzahl ist bei σ = 10 % die größte mit höchstens einem Fehler je Million Lesungen?', q);
    const qr = H('div', 'row', null, q); const qa = H('p', 'note', '', q);
    [2, 4, 8, 16].forEach((n) => B('btn', `${n} Stufen`, qr, (e) => {
      const l = noise.errLog(n, 0.1), l4 = noise.errLog(4, 0.1);
      const ok = n === 2;
      e.target.classList.add(ok ? 'right' : 'wrong');
      qa.textContent = ok ? `Richtig. Bei 2 Stufen ist d/2σ = 5, P ≈ ${sciFromLog(l)}. Schon bei 4 Stufen sind es ${sciFromLog(l4)}, also rund jede ${Math.round(Math.pow(10, -l4))}. Lesung falsch.` : `Nein: ${n} Stufen liefern P ≈ ${sciFromLog(l)} je Lesen, weit über 10⁻⁶. Nur 2 Stufen schaffen es.`;
    }));
    return { st, set, inBand: () => st.vg >= 0.45 && st.vg <= 0.55, h: () => lampH(st.vg) };
  },
  missions: [
    { id: 'L1M1', m: 1, text: 'Schalte die Lampe ein. Der Regler ist die Spannung am Gate des Transistors.',
      start(api) { api.set(0); },
      check(api) { return api.st.vg >= 0.9 ? true : api.st.vg > 0.5 ? 'Die Lampe glimmt, aber der Chip liest noch keine sichere 1. Ganz nach rechts.' : false; },
      hints: ['Der Kanal leitet erst oberhalb der Schwelle in der Mitte; bei Vg = ½ ist die Lampe halb hell. Zieh den Regler ganz nach rechts.'],
      found: (api) => ({ h1: api.h() }) },
    { id: 'L1M2', m: 2, text: 'Stell genau die halbe Spannung ein. Was ist die Lampe jetzt: 0 oder 1?',
      start(api) { api.set(1); },
      chips: ['0', '1', 'weder noch'], chipsWhen: (api) => api.inBand(), chipsText: 'Vg liegt in der Mitte. Und jetzt: Was ist das für ein Wert?',
      instant: 'chips',
      check(api, ctx) { if (!api.inBand()) { ctx.answer = null; return 'Erst die halbe Spannung einstellen (0,45 bis 0,55), dann antworten.'; } return ctx.answer === 2 ? true : ctx.answer === 1 ? 'Nein: h = ' + de(api.h()) + '. Der Chip müsste raten.' : 'Nein: Die Lampe ist nicht aus, h = ' + de(api.h()) + '.'; },
      hints: ['h(½) = 0,50. Physikalisch ist das ein erlaubter Wert, aber keiner, den ein Leser eindeutig als 0 oder 1 nehmen kann. Die Maschine will nur die zwei Ränder.'],
      found: (api) => ({ hmid: api.h(), vgmid: api.st.vg }) },
  ],
  card(api, f) {
    return {
      text: 'Ein Bit ist eine Spannung an einem Gate: 1 heißt „Kanal leitet“ (Vg über der Schwelle), 0 heißt „Kanal sperrt“. Die Spannung kann jeden Wert zwischen 0 und 1 annehmen; nur die beiden Ränder bedeuten etwas. Die Mitte ist kein dritter Wert, sondern ein Übergang, den kein Leser eindeutig deuten kann.',
      nums: `h(Vg) = 1 / (1 + e<sup>−10(Vg − ½)</sup>) · h(0) = ${de(lampH(0), 3)} · h(${de(f.vgmid ?? 0.5)}) = ${de(f.hmid ?? 0.5)} · h(1) = ${de(lampH(1), 3)}`,
      hw: 'Ein MOSFET ist kein Sigmoid-Schalter: Bei 0,8 bis 1 V Versorgung liegt die Schwellspannung bei etwa 0,3 bis 0,4 V, darunter fließt ein exponentiell kleiner Leckstrom, darüber steigt der Strom etwa quadratisch bis linear. Die Eins am Gate sind bei rund 1 fF Gate-Kapazität und 1 V etwa 6000 Elektronen, isoliert durch 1 bis 2 nm Oxid. Das Sandkorn: Silizium aus Quarz, auf 99,9999999 % gereinigt und mit einem Fremdatom je 10⁵ bis 10⁸ Siliziumatome dotiert.',
    };
  },
});

/* ===== Level 2: Gatter ===== */
const GATES = { UND: (a, b) => a & b, ODER: (a, b) => a | b, NAND: (a, b) => 1 - (a & b), NOR: (a, b) => 1 - (a | b), XOR: (a, b) => a ^ b };
const L2 = M.define({
  n: 2, name: 'Gatter', slot: 'NAND', eyebrow: 'Verdrahtung statt Wissen',
  part: 'NAND-Gatter in CMOS: zwei pMOS parallel nach oben, zwei nMOS in Reihe nach Masse',
  orient: {
    sehen: 'Vier Transistoren aus Level 1, fest verdrahtet: zwei oben nebeneinander zur Versorgung, zwei unten hintereinander zur Masse. A und B sind zwei Eingänge (die Schalter links), Y ist der Ausgang (der Punkt in der Mitte). Die Tabelle rechts beantwortet: Was kommt bei Y heraus, wenn A und B so stehen?',
    tun: 'Klick A und B in alle vier Kombinationen (00, 01, 10, 11) und lies jedes Mal Y ab. Im zweiten Kasten darunter steckt ein unbekanntes Gatter: Miss, bis du weißt, welches.',
    lernen: 'So ein Baustein heißt Gatter. Er weiß nichts, er ist nur Verdrahtung, und seine ganze Bedeutung steckt in der Tabelle. Aus Gattern wird alles Weitere gebaut: Rechnen, Speichern, Entscheiden.',
  },
  sub: 'Vier Schalter aus Level 1, verdrahtet zwischen Versorgung und Masse. Ein Gatter weiß nichts; seine ganze Bedeutung steckt in der Tabelle.',
  build(L) {
    L.el = levelShell(this);
    const panel = H('div', 'panel', null, L.el.work);
    const split = H('div', 'split', null, panel);
    const left = H('div', 'col', null, split), right = H('div', 'col', null, split);
    const svg = S('svg', { class: 'fig', viewBox: '0 0 380 300', role: 'img', 'aria-label': 'CMOS-NAND aus vier Transistoren' }, left);
    const st = { a: 0, b: 0, visited: new Set(), inv: false, clicked: false, bb: { hidden: null, a: 0, b: 0, shown: false, measures: 0, guess: null, seen: {} } };
    // Schalter A, B
    const sw = (x, y, name, on) => { const g = S('g', { class: 'sw data', tabindex: '0', role: 'button' }, svg); S('rect', { x: x - 16, y: y - 16, width: 32, height: 32, rx: 6 }, g); const t = S('text', { x, y: y + 5, 'text-anchor': 'middle' }, g); t.textContent = name; g.addEventListener('click', on); g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); on(); } }); return g; };
    const swA = sw(40, 90, 'A', () => { st.a ^= 1; st.clicked = true; render(); }), swB = sw(40, 210, 'B', () => { st.b ^= 1; st.clicked = true; render(); });
    S('line', { x1: 60, x2: 300, y1: 20, y2: 20, class: 'wire on' }, svg);
    let t = S('text', { x: 64, y: 34, class: 'cv' }, svg); t.textContent = 'Versorgung';
    // pMOS-Paar (parallel); die Gate-Leitung von B läuft außen herum nach oben rechts
    const mosP = (x, wirePath) => { const g = S('g', { class: 'mos' }, svg); S('path', { d: `M${x} 20 V40 M${x} 88 V110`, class: 'ch' }, g); const ch = S('line', { x1: x, x2: x, y1: 40, y2: 88, class: 'ch' }, g); S('line', { x1: x - 10, x2: x - 10, y1: 44, y2: 84, class: 'g' }, g); S('circle', { cx: x - 15, cy: 64, r: 4, class: 'bub' }, g); const w = S('path', { d: wirePath, class: 'wire ctl' }, svg); return { g, ch, w }; };
    const PA = mosP(160, 'M60 90 H128 V64 H141'), PB = mosP(240, 'M24 210 H12 V8 H320 V64 H221');
    S('path', { d: 'M160 110 H240', class: 'wire' }, svg);
    const yNode = S('circle', { cx: 200, cy: 124, r: 7 }, svg);
    S('line', { x1: 200, x2: 200, y1: 110, y2: 150, class: 'wire' }, svg);
    const yT = S('text', { x: 214, y: 148, class: 'lab' }, svg); yT.textContent = 'Y';
    const yV = S('text', { x: 236, y: 148, class: 'val' }, svg);
    // nMOS in Reihe
    const mosN = (y, gy) => { const g = S('g', { class: 'mos' }, svg); S('path', { d: `M200 ${y} V${y + 8} M200 ${y + 48} V${y + 56}`, class: 'ch' }, g); const ch = S('line', { x1: 200, x2: 200, y1: y + 8, y2: y + 48, class: 'ch' }, g); S('line', { x1: 190, x2: 190, y1: y + 10, y2: y + 46, class: 'g' }, g); const w = S('path', { d: `M60 ${gy} H178 V${y + 28} H190`, class: 'wire ctl' }, svg); return { g, ch, w }; };
    const NA = mosN(150, 102), NB = mosN(212, 210);
    S('path', { d: 'M200 206 V212', class: 'wire thin' }, svg);
    S('path', { d: 'M200 268 V280 M186 280 H214 M192 286 H208 M198 292 H202', class: 'wire thin' }, svg);
    t = S('text', { x: 222, y: 284, class: 'cv' }, svg); t.textContent = 'Masse';
    t = S('text', { x: 252, y: 100, class: 'cv' }, svg); t.textContent = 'pMOS: leitet bei 0';
    t = S('text', { x: 252, y: 200, class: 'cv' }, svg); t.textContent = 'nMOS: leitet bei 1';
    // Umkehrer (optional)
    const invG = S('g', null, svg); invG.setAttribute('visibility', 'hidden');
    S('path', { d: 'M207 124 H250', class: 'wire' }, invG);
    const invGate = S('g', { class: 'gate' }, invG); S('path', { d: 'M250 108 L250 140 L282 124 Z' }, invGate); S('circle', { cx: 288, cy: 124, r: 5 }, invGate);
    const yp = S('circle', { cx: 310, cy: 124, r: 7 }, invG);
    const ypT = S('text', { x: 322, y: 129, class: 'lab' }, invG); ypT.textContent = 'Y′';
    const ypV = S('text', { x: 322, y: 148, class: 'val' }, invG);
    // Tabelle
    H('p', 'caption', 'Klick A und B. Leitende Transistoren werden gefüllt, der aktive Pfad färbt sich. Die Tabelle füllt sich nur mit Zeilen, die du selbst eingestellt hast.', right);
    const tw = H('div', 'tbl-wrap', null, right);
    const tbl = H('table', 'tt', null, tw);
    const thead = H('thead', null, null, tbl); const hr = H('tr', null, null, thead); ['A', 'B', 'Y'].forEach((h) => H('th', null, h, hr)); const thY = hr.lastChild;
    const tbody = H('tbody', null, null, tbl);
    const rows = [0, 1, 2, 3].map((i) => { const tr = H('tr', null, null, tbody); H('td', null, String(i >> 1), tr); H('td', null, String(i & 1), tr); const y = H('td', 'q', '?', tr); return { tr, y }; });
    const nameT = H('p', 'note', 'Name der Tabelle: noch unbekannt.', right);
    const swInv = H('label', 'switch', null, right); const cb = H('input', null, null, swInv); cb.type = 'checkbox'; cb.id = 'inv'; swInv.append(' Umkehrer anhängen (NAND → UND)');
    const cnt = H('p', 'note', '4 Transistoren', right);
    cb.addEventListener('change', () => { st.inv = cb.checked; render(); });
    function Y() { return 1 - (st.a & st.b); }
    function render() {
      swA.classList.toggle('on', !!st.a); swB.classList.toggle('on', !!st.b);
      PA.g.classList.toggle('on', !st.a); PB.g.classList.toggle('on', !st.b); NA.g.classList.toggle('on', !!st.a); NB.g.classList.toggle('on', !!st.b);
      PA.w.classList.toggle('on', !!st.a); PB.w.classList.toggle('on', !!st.b); NA.w.classList.toggle('on', !!st.a); NB.w.classList.toggle('on', !!st.b);
      const y = Y();
      yNode.style.fill = mix(y); yV.textContent = `= ${y}`;
      if (st.clicked) st.visited.add(st.a * 2 + st.b);
      rows.forEach((r, i) => { const v = st.visited.has(i); r.y.textContent = v ? String(1 - ((i >> 1) & (i & 1))) : '?'; r.y.className = v ? (r.y.textContent === '1' ? 'one' : '') : 'q'; r.tr.classList.toggle('cur', i === st.a * 2 + st.b); });
      const full = st.visited.size === 4;
      if (st.inv) { rows.forEach((r, i) => { if (st.visited.has(i)) { r.y.textContent = String((i >> 1) & (i & 1)); r.y.className = r.y.textContent === '1' ? 'one' : ''; } }); }
      thY.textContent = st.inv ? 'Y′' : 'Y';
      nameT.textContent = full ? (st.inv ? 'Name der Tabelle: UND. Y′ = A ∧ B.' : 'Name der Tabelle: NAND. Y = ¬(A ∧ B).') : `Name der Tabelle: noch unbekannt (${st.visited.size} von 4 Zeilen).`;
      invG.setAttribute('visibility', st.inv ? 'visible' : 'hidden'); yp.style.fill = mix(1 - y); ypV.textContent = `= ${1 - y}`;
      cnt.textContent = st.inv ? '4 + 2 = 6 Transistoren' : '4 Transistoren';
      L.touch();
    }
    render();
    // Black Box
    const panel2 = H('div', 'panel', null, L.el.work);
    H('h3', null, 'Der unbekannte Kasten', panel2);
    const sp2 = H('div', 'split', null, panel2);
    const l2 = H('div', 'col', null, sp2), r2 = H('div', 'col', null, sp2);
    const svg2 = S('svg', { class: 'fig', viewBox: '0 0 360 150', role: 'img', 'aria-label': 'Unbekanntes Gatter mit zwei Eingängen' }, l2);
    const bb = st.bb;
    const sw2 = (x, y, name, on) => { const g = S('g', { class: 'sw data', tabindex: '0', role: 'button' }, svg2); S('rect', { x: x - 16, y: y - 16, width: 32, height: 32, rx: 6 }, g); const t = S('text', { x, y: y + 5, 'text-anchor': 'middle' }, g); t.textContent = name; g.addEventListener('click', on); g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); on(); } }); return g; };
    const bA = sw2(40, 50, 'a', () => { bb.a ^= 1; bb.shown = false; renderBB(); }), bB = sw2(40, 100, 'b', () => { bb.b ^= 1; bb.shown = false; renderBB(); });
    S('path', { d: 'M56 50 H130 M56 100 H130', class: 'wire' }, svg2);
    S('rect', { x: 130, y: 30, width: 90, height: 90, rx: 10, class: 'box q' }, svg2);
    t = S('text', { x: 175, y: 86, class: 'lab', 'text-anchor': 'middle', style: 'font-size:34px' }, svg2); t.textContent = '?';
    S('path', { d: 'M220 75 H270', class: 'wire' }, svg2);
    const outL = S('circle', { cx: 292, cy: 75, r: 18, class: 'lampc' }, svg2);
    const outT = S('text', { x: 292, y: 81, class: 'lab', 'text-anchor': 'middle' }, svg2);
    const row2 = H('div', 'row', null, l2);
    B('btn primary', 'Messen', row2, () => { if (!bb.shown) { bb.shown = true; bb.measures++; bb.seen[bb.a * 2 + bb.b] = GATES[bb.hidden](bb.a, bb.b); } renderBB(); if (L.ctx) M.renderMission(L); });
    const mCount = H('span', 'chip dim', null, row2);
    H('p', 'caption', 'Im Kasten steckt eines von fünf Gattern. Der Ausgang ist verdeckt, bis du misst; jede Messung zählt. Zwei Messungen können nie reichen: 4 mögliche Ergebnisse, 5 Gatter.', r2);
    const ans = H('div', 'row', null, r2);
    const ansBtns = Object.keys(GATES).map((g) => B('btn', g, ans, () => { bb.guess = g; renderBB(); }));
    B('btn', 'Neuer Kasten', H('div', 'row', null, r2), () => { newBox(); });
    function newBox() { const names = Object.keys(GATES).filter((g) => g !== bb.hidden); bb.hidden = names[Math.floor(Math.random() * names.length)]; bb.a = 0; bb.b = 0; bb.shown = false; bb.measures = 0; bb.guess = null; bb.seen = {}; renderBB(); if (L.ctx) M.renderMission(L); }
    /* Gatter, die mit allen bisherigen Messungen verträglich sind */
    function candidates() { return Object.keys(GATES).filter((g) => Object.keys(bb.seen).every((k) => GATES[g](k >> 1, k & 1) === bb.seen[k])); }
    function renderBB() {
      bA.classList.toggle('on', !!bb.a); bB.classList.toggle('on', !!bb.b);
      const y = bb.hidden ? GATES[bb.hidden](bb.a, bb.b) : 0;
      outL.classList.toggle('on', bb.shown && y === 1); outL.classList.toggle('hi', true);
      outL.style.opacity = bb.shown ? '1' : '.35';
      outT.textContent = bb.shown ? String(y) : '?';
      mCount.textContent = `Messungen: ${bb.measures} / Par 3`;
      ansBtns.forEach((b) => b.setAttribute('aria-pressed', b.textContent === bb.guess ? 'true' : 'false'));
      if (L.ctx) L.ctx.measures = bb.measures;
    }
    bb.hidden = 'UND'; newBox();
    return { st, bb, newBox, renderBB, candidates, reset() { st.a = 0; st.b = 0; st.visited = new Set(); st.clicked = false; st.inv = false; cb.checked = false; render(); } };
  },
  missions: [
    { id: 'L2M1', m: 1, text: 'Vier Transistoren: zwei oben parallel zur Versorgung, zwei unten in Reihe nach Masse. Deck alle vier Zeilen der Tabelle auf, indem du A und B klickst.',
      start(api) { api.reset(); },
      check(api) { return api.st.visited.size === 4 ? true : false; },
      counters: (api) => [`Zeilen: ${api.st.visited.size} / 4`],
      hints: ['Du brauchst genau 00, 01, 10 und 11. Nur bei 11 leiten beide unteren Transistoren und ziehen Y nach Masse; in jedem anderen Fall zieht mindestens ein oberer Y nach oben.'] },
    { id: 'L2M2', m: 2, text: 'Im Kasten steckt eines von fünf Gattern: UND, ODER, NAND, NOR, XOR. Finde mit möglichst wenigen Messungen heraus, welches, wähle es und drück „Prüfen“.',
      start(api) { api.newBox(); },
      instant: 'check',
      check(api) { const bb = api.bb, cand = api.candidates(); if (!bb.guess) return 'Erst ein Gatter auswählen.'; if (bb.guess !== bb.hidden) return cand.includes(bb.guess) ? `${bb.guess} wäre mit deinen Messungen verträglich, ist es aber nicht. Miss eine Kombination, die ${bb.guess} von den anderen trennt.` : `${bb.guess} widerspricht deiner Messung bei a = ${Object.keys(bb.seen).map((k) => (k >> 1) + '' + (k & 1)).join(', ') || '…'}.`; if (cand.length > 1) return `Richtig geraten, aber deine Messungen lassen noch ${cand.length} Gatter zu (${cand.join(', ')}). Miss, bis nur eines übrig bleibt, dann prüfen.`; return true; },
      par: (api) => api.bb.measures <= 3,
      counters: (api) => [`Messungen: ${api.bb.measures} / Par 3`],
      doneText: (api) => `Richtig, es war ${api.bb.hidden}, mit ${api.bb.measures} Messungen.`,
      found: (api) => ({ gate: api.bb.hidden, measures: api.bb.measures }),
      hints: ['Fang mit a = b = 0 an: NAND und NOR geben 1, UND, ODER und XOR geben 0.', 'Dann 01: trennt UND (0) von ODER und XOR (1) bzw. NAND (1) von NOR (0). Zuletzt 11: ODER (1) gegen XOR (0).'] },
  ],
  card(api, f) {
    let x = 0.505; const chain = [x]; for (let i = 0; i < 6; i++) { x = f10(x); chain.push(x); }
    return {
      text: 'Ein Gatter ist durch seine Wahrheitstabelle vollständig beschrieben, und aus NAND (4 Transistoren) folgt jedes andere. Weil die Kennlinie in der Mitte steiler als 1 ist (Steigung k/4 = 2,5), drückt jede Stufe Zwischenwerte weiter an die Ränder; deshalb summiert sich Rauschen über Milliarden Gatter nicht auf.',
      nums: `Sechs Umkehrer hintereinander: ${chain.map((v) => de(v, 3)).join(' → ')}<br>Dein Kasten: ${f.gate || '–'}, erkannt mit ${f.measures ?? '–'} Messungen (Par 3).`,
      hw: 'CMOS: NAND = 4 Transistoren, NOT = 2, UND = NAND + NOT = 6. Im Ruhezustand fließt kein Strom, weil immer genau ein Pfad offen und einer geschlossen ist; Energie kostet das Umladen der Leitung, ½·C·V² je Flanke. Ein Zwischenwert am Eingang öffnet beide Pfade zugleich: Querstrom und Wärme, das zweite Argument gegen Zwischenstufen. Eine Gatterstufe dauert etwa 10 ps. „Zwei Schalter in Reihe ergeben UND“ aus dem Video ist das Relais-Bild; im Chip ist die Reihe der untere Zweig eines NAND. Die Verstärkung eines realen Inverters in der Mitte liegt bei 10 bis 50, nicht bei 2,5.',
    };
  },
});
/* ===== Level 3: Das Bit festhalten ===== */
const L3 = M.define({
  n: 3, name: 'Das Bit festhalten', slot: 'Zelle', eyebrow: 'Speichern ist ein Prozess',
  part: 'Speicherzelle: Inverter-Schleife mit Zugangstransistor (SRAM) und eine DRAM-Zelle, die nachgeladen wird',
  orient: {
    sehen: 'Zwei Umkehrer (die Dreiecke) im Kreis. Ein Umkehrer macht aus 1 eine 0 und aus 0 eine 1. A und B sind die beiden Knoten dazwischen, die Zahlen daran sind Spannungen zwischen 0 und 1. Unten links ein Zugangs-Schalter (Wortleitung) mit einer Zuleitung (Bitleitung): Darüber schreibt man einen Wert hinein. Das Diagramm rechts zeigt, wohin die Spannung Umlauf für Umlauf wandert. Darunter eine zweite Bauart: eine Zelle, deren Ladung wegsickert.',
    tun: 'Schreib eine 1 hinein (Zugang öffnen, Bitleitung auf 1, Zugang schließen) und sieh, dass sie bleibt. Dann schalte den Strom aus. Später verstellst du die Verstärkung und hältst die undichte Zelle am Leben.',
    lernen: 'So speichert ein Chip ein Bit: nicht als Ding, sondern als Kreislauf, der sich selbst festhält. Ohne Strom ist es weg. Der Arbeitsspeicher macht es anders: als Ladung, die alle 64 Millisekunden nachgefüllt wird.',
  },
  sub: 'Zwei Umkehrer im Kreis. A treibt B, B treibt A zurück: A(n+1) = f(f(A(n))) mit f(x) = 1 / (1 + e^(k(x − ½))).',
  build(L) {
    L.el = levelShell(this);
    const st = { k: 10, a0: 0.1, wl: false, cycles: [], pressed: new Set(), sawNoMem: false, wrote1: false, blAtOpen: null, powerAfterWrite: 0 };
    const panel = H('div', 'panel', null, L.el.work);
    const split = H('div', 'split', null, panel);
    const left = H('div', 'col', null, split), right = H('div', 'col', null, split);
    const svg = S('svg', { class: 'fig', viewBox: '0 0 360 230', role: 'img', 'aria-label': 'Zwei Inverter im Kreis mit Zugangstransistor, Wortleitung und Bitleitung' }, left);
    S('path', { d: 'M150 60 H40 V140 H148', id: 'wA', fill: 'none', 'stroke-width': 4, 'stroke-linecap': 'round' }, svg);
    S('path', { d: 'M212 60 H320 V140 H210', id: 'wB', fill: 'none', 'stroke-width': 4, 'stroke-linecap': 'round' }, svg);
    const gates = S('g', { class: 'gate' }, svg);
    S('path', { d: 'M150 40 L150 80 L200 60 Z' }, gates); S('circle', { cx: 206, cy: 60, r: 6 }, gates);
    S('path', { d: 'M210 120 L210 160 L160 140 Z' }, gates); S('circle', { cx: 154, cy: 140, r: 6 }, gates);
    const nA = S('circle', { cx: 40, cy: 100, r: 9 }, svg), nB = S('circle', { cx: 320, cy: 100, r: 9 }, svg);
    let t = S('text', { x: 14, y: 105, class: 'lab' }, svg); t.textContent = 'A';
    t = S('text', { x: 334, y: 105, class: 'lab' }, svg); t.textContent = 'B';
    const vA = S('text', { x: 58, y: 95, class: 'val' }, svg), vB = S('text', { x: 302, y: 95, class: 'val', 'text-anchor': 'end' }, svg);
    // Zugangstransistor unten an A
    const acc = S('g', { class: 'mos' }, svg);
    S('path', { d: 'M40 109 V160 M40 196 V214', class: 'ch' }, acc);
    const accCh = S('line', { x1: 40, x2: 40, y1: 160, y2: 196, class: 'ch' }, acc);
    S('line', { x1: 30, x2: 30, y1: 162, y2: 194, class: 'g' }, acc);
    const wlW = S('path', { d: 'M30 178 H10', class: 'wire ctl' }, svg);
    t = S('text', { x: 50, y: 182, class: 'ctlt' }, svg); t.textContent = 'Wortleitung';
    const blW = S('path', { d: 'M40 214 H120', class: 'wire' }, svg);
    const blT = S('text', { x: 126, y: 218, class: 'val' }, svg);
    const wlBtn = B('btn', 'Wortleitung öffnen', H('div', 'row', null, left), () => { st.wl = !st.wl; if (st.wl) st.blAtOpen = null; else { if (st.blAtOpen === 1) { const s = settle(); if (s > 0.5 && st.k > 4) st.wrote1 = true; } } render(); L.touch(); });
    const blRow = H('div', 'row', null, left);
    const bl1 = B('btn', 'Bitleitung = 1', blRow, () => writeBL(1)), bl0 = B('btn', 'Bitleitung = 0', blRow, () => writeBL(0));
    const pwBtn = B('btn', 'Strom aus und wieder an', blRow, () => powerCycle());
    const cyc = H('p', 'seq', null, left);
    H('p', 'caption', 'Die Bitleitung erreicht Knoten A nur bei offener Wortleitung. Nach dem Schließen hält die Rückkopplung den Wert. Strom aus: Beide Knoten fallen auf 0; beim Einschalten startet A zufällig nahe ½.', left);
    // Spinnweb
    const cob = S('svg', { class: 'fig', viewBox: '0 0 320 324', role: 'img', 'aria-label': 'Spinnwebdiagramm der Iteration' }, right);
    const x0 = 44, y0 = 284, W = 264, X = (v) => x0 + v * W, Y = (v) => y0 - v * W;
    S('rect', { x: X(0), y: Y(1), width: W, height: W, class: 'plotbg' }, cob);
    S('line', { x1: X(0.5), x2: X(0.5), y1: Y(0), y2: Y(1), class: 'grid' }, cob);
    S('line', { x1: X(0), x2: X(1), y1: Y(0.5), y2: Y(0.5), class: 'grid' }, cob);
    S('path', { d: `M${X(0)} ${Y(0)} L${X(1)} ${Y(1)}`, class: 'diag' }, cob);
    [[0, '0'], [0.5, '½'], [1, '1']].forEach(([v, l]) => { let tt = S('text', { x: X(v), y: Y(0) + 18, 'text-anchor': 'middle', class: 't' }, cob); tt.textContent = l; tt = S('text', { x: X(0) - 8, y: Y(v) + 4, 'text-anchor': 'end', class: 't' }, cob); tt.textContent = l; });
    t = S('text', { x: X(1), y: Y(0) + 36, 'text-anchor': 'end', class: 't' }, cob); t.textContent = 'Aₙ →';
    t = S('text', { x: X(0) + 8, y: Y(1) + 16, class: 't' }, cob); t.textContent = '↑ Aₙ₊₁';
    const curve = S('path', { class: 'curve' }, cob), web = S('path', { class: 'cob' }, cob), fpG = S('g', null, cob), startDot = S('circle', { r: 4.5, class: 'start' }, cob);
    const kc = H('div', 'ctrl', null, right);
    const kl = H('label', null, 'Verstärkung k ', kc); kl.htmlFor = 'k'; const kOut = H('output', null, '10', kl);
    const kIn = H('input', null, null, kc); kIn.type = 'range'; kIn.id = 'k'; kIn.min = '2'; kIn.max = '16'; kIn.step = '0.25'; kIn.value = '10';
    kIn.addEventListener('input', () => { st.k = +kIn.value; render(); L.touch(); });
    const chips = H('div', 'row', null, right); const latchChip = H('span', 'chip', null, chips), gainChip = H('span', 'chip dim', null, chips);
    const note = H('p', 'note', null, right);
    const a0Row = H('div', 'row', null, right); H('span', 'caption', 'Start nahe ½:', a0Row);
    [1, 2, 4, 6].forEach((n) => B('btn', `A₀ = ½ + 10${sup(-n)}`, a0Row, () => { st.a0 = 0.5 + Math.pow(10, -n); st.pressed.add(n + '@' + st.k); st.lastN = n; render(); L.touch(); }));
    const seq = H('p', 'seq', null, right);
    const tools = H('details', null, null, right); H('summary', null, 'Werkzeuge: A₀ fein einstellen', tools);
    const tb = H('div', 'body', null, tools); const ac = H('div', 'ctrl', null, tb); const al = H('label', null, 'Startspannung A₀ ', ac); al.htmlFor = 'a0'; const aOut = H('output', null, '0,100', al);
    const aIn = H('input', null, null, ac); aIn.type = 'range'; aIn.id = 'a0'; aIn.min = '0'; aIn.max = '1'; aIn.step = '0.001'; aIn.value = '0.1';
    aIn.addEventListener('input', () => { st.a0 = +aIn.value; render(); L.touch(); });
    const g = (x) => sig(sig(x, st.k), st.k);
    function settle() { let s = st.a0; for (let n = 0; n < 600; n++) s = g(s); return s; }
    function writeBL(v) { if (!st.wl) return; st.a0 = v ? 0.9 : 0.1; st.blAtOpen = v; st.lastN = null; render(); L.touch(); }
    function powerCycle() {
      let n; do { n = gauss(0.02); } while (Math.abs(n) < 0.0005);
      st.a0 = Math.round(clamp01(0.5 + n) * 10000) / 10000; st.wl = false; st.lastN = null;
      const bit = settle() > 0.5 ? 1 : 0;
      st.cycles.push({ a0: st.a0, bit });
      if (st.wrote1) st.powerAfterWrite++;
      render(); L.touch();
    }
    function render() {
      const k = st.k, gain = k / 4;
      kOut.textContent = deMax(k, 2); aOut.textContent = de(st.a0, 3); aIn.value = String(st.a0);
      gainChip.textContent = `|f′(½)| = k/4 = ${de(gain)}`;
      let d = ''; for (let i = 0; i <= 200; i++) { const x = i / 200; d += (i ? ' L' : 'M') + X(x).toFixed(1) + ' ' + Y(g(x)).toFixed(1); }
      curve.setAttribute('d', d);
      let x = st.a0; const sq = [x]; let w = `M${X(x).toFixed(1)} ${Y(0)}`;
      for (let n = 0; n < 16; n++) { const y = g(x); w += ` L${X(x).toFixed(1)} ${Y(y).toFixed(1)} L${X(y).toFixed(1)} ${Y(y).toFixed(1)}`; x = y; sq.push(x); }
      web.setAttribute('d', w); startDot.setAttribute('cx', X(st.a0)); startDot.setAttribute('cy', Y(0));
      fpG.replaceChildren();
      const fps = [{ x: 0.5, stable: gain <= 1 }];
      if (gain > 1) { let lo = 0, hi = 0.5 - 1e-9; for (let i = 0; i < 100; i++) { const m = (lo + hi) / 2; if (g(m) - m > 0) lo = m; else hi = m; } const p = (lo + hi) / 2; fps.push({ x: p, stable: true }, { x: 1 - p, stable: true }); st.fix = 1 - p; }
      fps.forEach((p) => S('circle', { cx: X(p.x), cy: Y(p.x), r: 5.5, class: p.stable ? 'fp-stable' : 'fp-unstable' }, fpG));
      const s = st.wl ? st.a0 : settle();
      const bA_ = sig(s, k);
      $('#wA').style.stroke = mix(s); nA.style.fill = mix(s); $('#wB').style.stroke = mix(bA_); nB.style.fill = mix(bA_);
      vA.textContent = de(s); vB.textContent = de(bA_);
      acc.classList.toggle('on', st.wl); wlW.classList.toggle('on', st.wl); wlBtn.textContent = st.wl ? 'Wortleitung schließen' : 'Wortleitung öffnen'; wlBtn.setAttribute('aria-pressed', st.wl ? 'true' : 'false');
      bl1.disabled = !st.wl; bl0.disabled = !st.wl;
      const blv = st.blAtOpen; blW.classList.toggle('on', st.wl && blv === 1); blT.textContent = st.wl ? `Bitleitung = ${blv == null ? '–' : blv}` : 'Bitleitung getrennt';
      cyc.textContent = st.cycles.length ? `Einschaltungen: ${st.cycles.length}, davon 1: ${st.cycles.filter((c) => c.bit).length} · zuletzt A₀ = ${de(st.cycles[st.cycles.length - 1].a0, 4)} → ${st.cycles[st.cycles.length - 1].bit}` : 'Einschaltungen: 0';
      seq.textContent = sq.slice(0, 7).map((v, i) => `A${sub(i)} = ${de(v, 4)}`).join('   ');
      const r = roundsTo(st.a0, k);
      if (gain <= 1) { latchChip.textContent = 'kein Speicher'; latchChip.className = 'chip bad'; st.sawNoMem = true; note.textContent = `|f′(½)| = ${de(gain)} ≤ 1: Jede Abweichung schrumpft, beide Knoten landen bei 0,50. Diese Schleife hält nichts fest.`; st.stored = false; }
      else if (st.wl) { latchChip.textContent = 'Wortleitung offen'; latchChip.className = 'chip ctl'; note.textContent = `Die Bitleitung zwingt A auf ${de(st.a0)}. Erst nach dem Schließen iteriert die Schleife frei.`; st.stored = false; }
      else if (Math.abs(st.a0 - 0.5) < 1e-12) { latchChip.textContent = 'unentschieden'; latchChip.className = 'chip bad'; note.textContent = 'Genau auf dem Mittelpunkt bleibt die Schleife stehen; das kleinste Rauschen kippt sie.'; st.stored = false; }
      else { const bit = s > 0.5 ? 1 : 0; latchChip.textContent = `gespeichert: A = ${bit}, B = ${1 - bit}`; latchChip.className = 'chip'; st.stored = true; note.textContent = `|f′(½)| = ${de(gain)} > 1: Der Mittelpunkt ist instabil, der Fixpunkt liegt bei ${de(bit ? st.fix : 1 - st.fix, 3)}. ` + (r.rounds === 0 ? 'A ist schon dort.' : `Von A₀ = ${de(st.a0, st.lastN ? st.lastN + 1 : 3)} braucht die Schleife ${r.rounds} ${r.rounds === 1 ? 'Umlauf' : 'Umläufe'}, bis A auf 1 % am Fixpunkt ist.`); }
    }
    render();
    // DRAM-Spiel
    const dp = H('div', 'panel', null, L.el.work);
    H('h3', null, 'Die undichte Zelle (DRAM)', dp);
    const dsvg = S('svg', { class: 'fig', viewBox: '0 0 600 204', role: 'img', 'aria-label': 'Ladung einer DRAM-Zelle in Zeitlupe' }, dp);
    const T = 400, DX = (ms) => 48 + (ms / T) * 536, DY = (v) => 160 - v * 136;
    S('line', { x1: DX(0), x2: DX(T), y1: DY(0), y2: DY(0), class: 'axis' }, dsvg); S('line', { x1: DX(0), x2: DX(0), y1: DY(0), y2: DY(1), class: 'axis' }, dsvg);
    S('line', { x1: DX(0), x2: DX(T), y1: DY(0.5), y2: DY(0.5), class: 'thr' }, dsvg);
    t = S('text', { x: DX(T), y: DY(0.5) - 6, 'text-anchor': 'end', class: 't' }, dsvg); t.textContent = 'Leseschwelle ½';
    [[0, '0'], [0.5, '½'], [1, '1']].forEach(([v, l]) => { const tt = S('text', { x: DX(0) - 8, y: DY(v) + 4, 'text-anchor': 'end', class: 't' }, dsvg); tt.textContent = l; });
    [0, 100, 200, 300, 400].forEach((ms) => { const tt = S('text', { x: DX(ms), y: DY(0) + 18, 'text-anchor': ms === 0 ? 'start' : ms === T ? 'end' : 'middle', class: 't' }, dsvg); tt.textContent = String(ms); });
    t = S('text', { x: DX(T), y: DY(0) + 34, 'text-anchor': 'end', class: 'cv' }, dsvg); t.textContent = 'Chipzeit in ms, Fenster der letzten 400 ms';
    const refG = S('g', null, dsvg), dcurve = S('path', { class: 'dcurve' }, dsvg), head = S('circle', { r: 5, class: 'start' }, dsvg);
    const dsplit = H('div', 'split', null, dp);
    const dl = H('div', 'col', null, dsplit), dr = H('div', 'col', null, dsplit);
    const refBtn = B('refresh', 'Auffrischen', dl, () => refresh(true));
    const bar = H('div', 'dram-bar', null, dl); const barI = H('i', null, null, bar);
    const barT = H('p', 'caption', null, dl);
    const dstat = H('div', 'row', null, dr); const dChip = H('span', 'chip', null, dstat); const dChip2 = H('span', 'chip dim', null, dstat);
    const tc = H('div', 'ctrl', null, dr); const tl = H('label', null, 'Leck-Zeitkonstante τ ', tc); tl.htmlFor = 'tau'; const tOut = H('output', null, '150 ms', tl);
    const tIn = H('input', null, null, tc); tIn.type = 'range'; tIn.id = 'tau'; tIn.min = '40'; tIn.max = '400'; tIn.step = '5'; tIn.value = '150';
    const asw = H('label', 'switch', null, dr); const aCb = H('input', null, null, asw); aCb.type = 'checkbox'; aCb.id = 'auto'; asw.append(' Automatik: alle 64 ms auffrischen');
    const drow = H('div', 'row', null, dr);
    const stepBtn = B('btn', '64 ms vorspulen', drow, () => advance(64)); const restartBtn = B('btn', 'Neu starten', drow, () => restart());
    const dnote = H('p', 'note', null, dr);
    H('p', 'caption', `Zeitlupe 1:16: Eine Chip-Millisekunde dauert 16 ms. V(t) = e^(−t/τ) seit dem letzten Auffrischen; Auffrischen liest (V ≥ ½ heißt 1) und lädt voll zurück. ${REDUCED ? 'Schrittmodus (reduzierte Bewegung): die Zeit läuft nur mit dem Knopf „64 ms vorspulen“.' : ''}`, dr);
    const D = { t: 0, tLast: 0, tau: 150, auto: true, lost: false, lostAt: null, goal: 500, won: false, refreshes: 0, lostTaus: [], okSince: false, tauChangedAt: 0, hist: [], nextAuto: 64, running: !REDUCED, lastFrame: null, wins: 0 };
    aCb.checked = D.auto;
    tIn.addEventListener('input', () => { if (tIn.disabled) { tIn.value = String(D.tau); return; } D.tau = +tIn.value; D.tauChangedAt = D.t; D.okSince = false; renderD(); L.touch(); });
    aCb.addEventListener('change', () => { D.auto = aCb.checked; if (D.auto && !D.lost && V() >= 0.5) { D.tLast = D.t; D.refreshes++; } D.nextAuto = D.t + 64; D.okSince = false; renderD(); L.touch(); });
    const V = () => Math.exp(-(D.t - D.tLast) / D.tau);
    function refresh(manual) {
      if (D.lost) return;
      if (V() >= 0.5) { D.tLast = D.t; D.refreshes++; if (!manual) D.okSince = true; }
      else lose();
      renderD(); L.touch(!manual);
    }
    function lose() { D.lost = true; D.lostAt = D.t; if (D.auto) D.lostTaus.push(D.tau); D.okSince = false; renderD(); L.touch(true); if (!REDUCED) setTimeout(() => { if (D.lost) restart(); }, 1800); }
    function restart() { D.t = 0; D.tLast = 0; D.lost = false; D.refreshes = 0; D.hist = []; D.nextAuto = 64; D.won = false; renderD(); }
    function advance(dt) {
      if (D.lost) return;
      let remaining = dt;
      while (remaining > 0) {
        const step = Math.min(remaining, D.auto ? Math.max(0.01, D.nextAuto - D.t) : remaining);
        D.t += step; remaining -= step;
        D.hist.push([D.t, V()]);
        if (V() < 0.5) { lose(); return; }
        if (D.auto && D.t >= D.nextAuto - 1e-9) { D.nextAuto += 64; refresh(false); if (D.lost) return; }
      }
      if (!D.won && !D.auto && D.t >= D.goal) { D.won = true; D.wins++; L.touch(); }
      renderD();
    }
    function renderD() {
      const v = D.lost ? 0 : V();
      tOut.textContent = `${D.tau} ms`;
      refG.replaceChildren();
      const t0 = Math.max(0, D.t - T);
      let d = '';
      const pts = D.hist.filter((p) => p[0] >= t0);
      pts.forEach((p, i) => { d += (i ? ' L' : 'M') + DX(p[0] - t0).toFixed(1) + ' ' + DY(p[1]).toFixed(1); });
      if (!pts.length) d = `M${DX(0)} ${DY(1)} L${DX(0)} ${DY(1)}`;
      dcurve.setAttribute('d', d);
      head.setAttribute('cx', DX(Math.min(D.t, T) - (D.t > T ? 0 : 0))); head.setAttribute('cx', DX(D.t - t0)); head.setAttribute('cy', DY(v));
      if (D.auto) for (let x = D.nextAuto - 64; x <= D.t + 1e-9; x += 64) { if (x >= t0 && x > 0) S('line', { x1: DX(x - t0), x2: DX(x - t0), y1: DY(1) - 4, y2: DY(0), class: 'rline' }, refG); }
      if (D.lost) { const x = DX(D.lostAt - t0); S('circle', { cx: x, cy: DY(0.5), r: 5, class: 'lost' }, refG); const tt = S('text', { x: x > 420 ? x - 10 : x + 10, y: DY(0.5) - 10, 'text-anchor': x > 420 ? 'end' : 'start', class: 'badt' }, refG); tt.textContent = 'unter ½: als 0 gelesen'; }
      const pct = Math.min(1, D.t / D.goal);
      barI.style.width = `${pct * 100}%`; barI.style.background = D.lost ? 'var(--bad)' : 'var(--ok)';
      barT.textContent = D.auto ? `Chipzeit ${Math.round(D.t)} ms · Auffrischungen: ${D.refreshes}` : `${M.active(L) && M.active(L).id === 'L3M3a' ? 'Stufe 1: ' : ''}${Math.round(Math.min(D.t, D.goal))} von ${D.goal} ms Chipzeit überstanden (${de(Math.min(D.t, D.goal) * 16 / 1000, 1)} von 8 s) · Auffrischungen: ${D.refreshes}`;
      dChip.textContent = D.lost ? 'Bit verloren' : `Bit = 1 · V = ${de(v)}`; dChip.className = 'chip' + (D.lost ? ' bad' : '');
      dChip2.textContent = `τ · ln 2 = ${Math.round(D.tau * Math.LN2)} ms bis ½`;
      refBtn.disabled = D.lost; stepBtn.hidden = !REDUCED; restartBtn.hidden = !D.lost && !REDUCED && D.t < 1;
      dnote.textContent = D.lost ? (D.auto ? `Bei τ = ${D.tau} ms fällt die Ladung nach ${Math.round(D.tau * Math.LN2)} ms unter ½, das Auffrischen nach 64 ms kommt zu spät und schreibt eine 0 zurück.` : `Verloren nach ${Math.round(D.lostAt)} ms Chipzeit: Der Abstand zum letzten Auffrischen war größer als τ · ln 2 = ${Math.round(D.tau * Math.LN2)} ms.`) : D.auto ? `Nach 64 ms sind noch e^(−64/τ) = ${de(Math.exp(-64 / D.tau))} der Ladung da${Math.exp(-64 / D.tau) >= 0.5 ? ', mehr als ½: Der Chip liest 1 und lädt nach.' : ', weniger als ½: Die nächste Auffrischung wird eine 0 lesen.'}` : 'Drück „Auffrischen“, solange V ≥ ½ ist. Jede Auffrischung lädt die Zelle wieder voll.';
      if (L.ctx) L.ctx.dram = D;
    }
    function frame(ts) {
      if (D.running && !document.hidden && D.lastFrame != null && !D.lost) { const dt = Math.min(100, ts - D.lastFrame) / 16; advance(dt); }
      D.lastFrame = ts;
      requestAnimationFrame(frame);
    }
    if (!REDUCED) requestAnimationFrame(frame);
    document.addEventListener('visibilitychange', () => { D.lastFrame = null; });
    restart(); renderD();
    return { st, D, render, renderD, restart, setK(k) { st.k = k; kIn.value = String(k); render(); }, lockK(on) { kIn.disabled = on; }, setA0(a) { st.a0 = a; render(); }, closeWL() { st.wl = false; render(); },
      setDram(o) { Object.assign(D, o); tIn.value = String(D.tau); aCb.checked = D.auto; restart(); }, lockTau(on) { tIn.disabled = on; } };
  },
  missions: [
    { id: 'L3M1', m: 1, text: 'Schreib eine 1 über die Wortleitung: Wortleitung öffnen, Bitleitung auf 1 legen, Wortleitung schließen. Dann schalte den Strom zweimal aus und wieder an. Was speichert die Schleife danach?',
      start(api) { api.setK(10); api.lockK(true); api.lockTau(false); api.st.wl = false; api.st.blAtOpen = null; api.st.wrote1 = false; api.st.powerAfterWrite = 0; api.st.cycles = []; api.st.lastN = null; api.setA0(0.1); },
      check(api) { const s = api.st; if (!s.wrote1) return s.wl ? (s.blAtOpen === 1 ? 'Bitleitung liegt auf 1. Jetzt die Wortleitung schließen.' : 'Wortleitung ist offen. Bitleitung auf 1, dann schließen.') : false; return s.powerAfterWrite >= 2 ? true : `Gespeichert: 1. Jetzt ${2 - s.powerAfterWrite === 2 ? 'zweimal' : 'noch einmal'} Strom aus und an.`; },
      counters: (api) => [`Einschaltungen: ${api.st.cycles.length}`],
      found: (api) => ({ cycles: api.st.cycles.slice() }),
      hints: ['Nur bei offener Wortleitung kommt die Bitleitung an Knoten A; nach dem Schließen hält die Rückkopplung den Wert.', 'Beim Einschalten startet A zufällig nahe ½, und allein das Vorzeichen der Abweichung entscheidet, welche Seite gewinnt.'] },
    { id: 'L3M2a', m: 2, text: 'Dreh die Verstärkung k so weit herunter, bis die Schleife vergisst, und dann gerade so weit hoch, dass sie wieder speichert.',
      start(api) { api.closeWL(); api.setA0(0.9); api.st.sawNoMem = false; api.setK(10); api.lockK(false); },
      check(api, ctx) { const s = api.st; if (s.wl) return 'Wortleitung schließen, dann iteriert die Schleife frei.'; if (!s.sawNoMem) return s.k === 10 && ctx.statusClass === 'ok' ? false : 'Erst so weit herunter, bis „kein Speicher“ erscheint.'; if (s.k > 4 && s.k <= 4.5 && s.stored) return true; return s.k <= 4 ? 'Kein Speicher. Jetzt langsam hoch, bis es wieder hält.' : s.stored ? `Speichert bei k = ${deMax(s.k, 2)}. Geht es noch knapper an die Grenze?` : false; },
      found: (api) => ({ kmin: api.st.k }),
      hints: ['Die Grenze liegt dort, wo die Steigung in der Mitte genau 1 wird: |f′(½)| = k/4, also k = 4. Der Regler hat Schritte von 0,25.'] },
    { id: 'L3M2b', m: 2, text: 'Setz k = 10 und starte mit den Knöpfen einmal bei A₀ = ½ + 10⁻¹ und einmal bei ½ + 10⁻⁶. Wie viele Umläufe braucht die Schleife jeweils?',
      start(api) { api.setK(10); api.closeWL(); api.st.pressed = new Set(); api.setA0(0.9); },
      check(api) { const s = api.st; if (s.k !== 10) return 'k auf 10 stellen.'; if (s.pressed.has('1@10') && s.pressed.has('6@10')) return true; return s.pressed.has('1@10') || s.pressed.has('6@10') ? 'Einer von beiden fehlt noch: ½ + 10⁻¹ und ½ + 10⁻⁶.' : false; },
      found: () => { const r = {}; [1, 2, 4, 6].forEach((n) => { r['r' + n] = roundsTo(0.5 + Math.pow(10, -n), 10).rounds; }); return r; },
      hints: ['Nahe ½ wächst die Abweichung je Umlauf um g′(½) = (k/4)² = 6,25; jede Zehnerpotenz Nähe zu ½ kostet ln 10 / ln 6,25 ≈ 1,26 Umläufe mehr. Im Chip heißt das Metastabilität.'] },
    { id: 'L3M3a', m: 3, text: 'Zeitlupe 1:16. Diese DRAM-Zelle verliert Ladung. Halte das Bit 500 ms Chipzeit (8 Spielsekunden) am Leben: Drück „Auffrischen“, bevor die Ladung unter ½ fällt.',
      start(api) { api.setDram({ tau: 150, auto: false, won: false, lostTaus: [] }); api.lockTau(true); },
      check(api) { return api.D.won ? true : false; },
      counters: (api) => [`Auffrischungen: ${api.D.refreshes}`],
      found: (api) => ({ refreshes: api.D.refreshes }),
      hints: ['Die Ladung fällt nach τ · ln 2 unter ½; bei 150 ms sind das 104 ms, in Zeitlupe 1,66 s. Drück also spätestens alle 1,5 Sekunden.'] },
    { id: 'L3M3b', m: 3, text: 'Schalte die Automatik ein (alle 64 ms, in Zeitlupe jede Sekunde) und mach die Zelle mit dem Regler undichter. Ab welchem τ verliert der Chip das Bit trotz Auffrischen?',
      start(api) { api.setDram({ tau: 150, auto: true, lostTaus: [], okSince: false }); api.lockTau(false); },
      check(api) { const D = api.D; if (!D.auto) return 'Automatik einschalten.'; const sawLoss = D.lostTaus.some((t) => t <= 90); if (!sawLoss) return D.tau <= 90 ? false : false; if (D.tau >= 95 && D.okSince && !D.lost) return true; return D.tau >= 95 ? false : 'Verloren bei τ ≤ 90. Jetzt τ wieder hoch, bis das Bit die Automatik überlebt.'; },
      found: (api) => ({ lostTaus: api.D.lostTaus.slice(), tauOk: api.D.tau }),
      hints: ['Auffrischen hilft nur, wenn nach 64 ms noch mehr als die Hälfte da ist: e^(−64/τ) > ½, also τ > 64 / ln 2 = 92,3 ms. Der Regler springt in Fünferschritten: 90 verliert, 95 hält.'] },
  ],
  card(api, f) {
    const cyc = (f.cycles || []).map((c) => `${de(c.a0, 4)} → ${c.bit}`).join(', ');
    return {
      text: 'Eine gespeicherte Eins ist ein Prozess, kein Zustand in Ruhe. Die Schleife speichert genau dann, wenn |f′(½)| = k/4 > 1: Dann wird der Mittelpunkt instabil und zwei stabile Zustände entstehen (Verzweigung bei k = 4). Ohne Versorgung ist das Bit weg, und beim Einschalten entscheidet das Vorzeichen einer winzigen Abweichung. DRAM hält stattdessen Ladung, die mit e^(−t/τ) verschwindet, und überlebt nur, wenn alle 64 ms nachgeladen wird, also für τ > 64 ms / ln 2 ≈ 92,3 ms.',
      nums: `Einschaltungen: ${cyc || '–'}<br>Knappste Verstärkung mit Speicher: k = ${f.kmin != null ? deMax(f.kmin, 2) : '–'} (Grenze 4)<br>Umläufe bis 1 % am Fixpunkt bei k = 10: A₀ = ½ + 10⁻¹: ${f.r1 ?? '–'} · 10⁻²: ${f.r2 ?? '–'} · 10⁻⁴: ${f.r4 ?? '–'} · 10⁻⁶: ${f.r6 ?? '–'} · je Dekade ln 10 / ln 6,25 = ${de(Math.LN10 / Math.log(6.25))}<br>DRAM: verloren bei τ = ${(f.lostTaus || []).filter((t) => t <= 90).slice(-1)[0] ?? '–'} ms, gehalten bei τ = ${f.tauOk ?? '–'} ms, Grenze 64 / ln 2 = ${de(64 / Math.LN2, 1)} ms`,
      hw: 'SRAM: 6 Transistoren, zwei gekreuzte Inverter plus zwei Zugangstransistoren an der Wortleitung; Schreiben überfährt die Schleife über die Bitleitungen. Register, Programmzähler und das Z-Flag sind flankengesteuerte D-Flipflops: zwei solcher Schleifen hintereinander, rund 20 Transistoren. Metastabilität ist real: Ein Flipflop nahe ½ braucht eine Zeit proportional zu ln(1/|A₀ − ½|). Der Einschaltzustand einer SRAM-Zelle ist durch Fertigungsstreuung leicht voreingenommen; das Muster aller Zellen dient als Chip-Fingerabdruck (PUF). DRAM: 1 Transistor und 1 Kondensator mit 20 bis 30 fF, bei 1 V rund 10⁵ Elektronen; beim Lesen teilt sich die Ladung mit der Bitleitung, der Hub beträgt etwa 100 mV, den ein Leseverstärker (selbst eine Inverter-Schleife) auf voll 0 oder 1 zieht. JEDEC garantiert 64 ms Haltezeit; die meisten Zellen halten Sekunden.',
    };
  },
});
{
  const det = H('details', null, null, L3.el.extra); H('summary', null, 'Wo die Einsen wohnen', det);
  const body = H('div', 'body', null, det); const tw = H('div', 'tbl-wrap', null, body);
  tw.innerHTML = '<table><thead><tr><th>Speicher</th><th>Steckt in</th><th>Eine 1 ist</th><th>Ohne Strom</th><th>Aufwand pro Bit</th></tr></thead><tbody><tr><td>SRAM</td><td>Register, Cache</td><td>der Zustand einer Inverter-Schleife</td><td>weg</td><td>6 Transistoren</td></tr><tr><td>DRAM</td><td>Arbeitsspeicher</td><td>Ladung auf einem Kondensator, grob 10⁵ Elektronen</td><td>weg; schon mit Strom alle 64 ms auffrischen</td><td>1 Transistor + 1 Kondensator</td></tr><tr><td>Flash</td><td>SSD, USB-Stick, Handy</td><td>eingeschlossene Ladung, die die Schaltschwelle eines Transistors verschiebt</td><td>bleibt, Monate bis Jahre</td><td>1 Transistor für 1 bis 4 Bit</td></tr><tr><td>Festplatte</td><td>HDD</td><td>die Magnetisierungsrichtung eines winzigen Bereichs</td><td>bleibt</td><td>Fläche auf der Scheibe</td></tr></tbody></table>';
}

/* ===== Level 4: Zahlen aus Bits ===== */
const L4 = M.define({
  n: 4, name: 'Zahlen aus Bits', slot: 'Register', eyebrow: 'Bedeutung ist eine Leseregel',
  part: 'Register: vier Speicherzellen nebeneinander, mit Stellenwerten gelesen',
  orient: {
    sehen: 'Vier Speicherzellen aus Level 3 nebeneinander. Jede hält eine 0 oder eine 1. Über jeder steht ihr Stellenwert: 8, 4, 2, 1. Die Zeile darunter rechnet die Summe aus.',
    tun: 'Klick die Bits, bis die Summe die gefragte Zahl ergibt. Dann schalte um: Das oberste Bit zählt −8 statt 8.',
    lernen: 'Die Zellen wissen nicht, dass sie eine Zahl sind. Die Zahl entsteht durch die Leseregel. Dieselben vier Bits können 13 oder −3 bedeuten, und acht Bits können eine Zahl, ein Buchstabe oder ein Befehl sein.',
  },
  sub: 'Vier Zellen aus Level 3 in einer Reihe. Im Register liegen nur vier Spannungen; was sie bedeuten, legt die Schaltung fest, die sie abgreift.',
  build(L) {
    L.el = levelShell(this);
    const panel = H('div', 'panel', null, L.el.work);
    const st = { bits: [0, 0, 0, 0], signed: false };
    const icons = H('div', 'row', null, panel); icons.style.gap = '8px';
    const vals = H('div', 'row', null, panel); vals.style.gap = '8px';
    const bitsRow = H('div', 'row', null, panel); bitsRow.style.gap = '8px';
    const vEls = [], bEls = [];
    for (let i = 3; i >= 0; i--) {
      const ic = H('span', null, null, icons); ic.innerHTML = '<svg width="44" height="22" viewBox="0 0 44 22" aria-hidden="true"><path d="M6 4l10 6-10 6z M38 18l-10-6 10-6z" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M16 10h12M6 4V2h32v2M6 18v2h32v-2" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>'; ic.style.color = 'var(--muted)';
      vEls[i] = H('span', 'flbl', null, vals); vEls[i].style.width = '44px'; vEls[i].style.fontSize = '13px';
      bEls[i] = B('bit lg', '0', bitsRow, () => { st.bits[i] ^= 1; render(); L.touch(); }); bEls[i].id = 'n' + i;
    }
    const sum = H('div', 'formula', null, panel);
    const sw = H('label', 'switch', null, panel); const cb = H('input', null, null, sw); cb.type = 'checkbox'; cb.id = 'signed'; sw.append(' Oberstes Bit zählt −8 statt 8 (Zweierkomplement)');
    cb.addEventListener('change', () => { st.signed = cb.checked; render(); L.touch(); });
    const asc = H('p', 'note', null, panel);
    /* Ein ganzes Wort in Bits: Unicode-Zahl je Zeichen, gespeichert als UTF-8-Bytes */
    const det = H('details', null, null, L.el.extra); det.open = true;
    H('summary', null, 'Ein ganzes Wort in Bits', det);
    const wb = H('div', 'body', null, det);
    H('p', 'note', 'Eine weltweite Tabelle, Unicode, ordnet jedem Zeichen eine Zahl zu: A ist 65, H ist 72. Gespeichert wird die Zahl als Bits. Schreib ein Wort und sieh, woraus es im Speicher besteht.', wb);
    const wr = H('div', 'row', null, wb);
    const wl = H('label', null, 'Wort: ', wr); const win = H('input', null, null, wr); win.type = 'text'; win.id = 'word4'; win.value = 'HALLO'; win.maxLength = 16; win.autocomplete = 'off'; wl.htmlFor = 'word4';
    win.style.cssText = 'font: inherit; font-family: var(--f-mono); padding: .4em .6em; border: 1px solid var(--line); border-radius: 6px; background: var(--surface); color: var(--ink); width: 14ch;';
    const wtw = H('div', 'tbl-wrap', null, wb); const wt = H('table', 'tt', null, wtw);
    const whr = H('tr', null, null, H('thead', null, null, wt)); ['Zeichen', 'Zahl', 'Bits im Speicher', 'Anzahl'].forEach((h) => H('th', null, h, whr));
    const wbody = H('tbody', null, null, wt);
    const wsum = H('p', 'note', null, wb);
    H('p', 'caption', 'Wie viele Bits ein Zeichen braucht, legt die Kodierung fest. Im üblichen UTF-8 brauchen A bis Z je 8 Bit, ein ä braucht 16, ein Emoji 32. Probier HALLO, dann Käse, dann ein Emoji.', wb);
    const enc = new TextEncoder();
    function renderWord() {
      wbody.replaceChildren(); let total = 0, n = 0;
      for (const ch of win.value) {
        const bytes = [...enc.encode(ch)], bits = bytes.length * 8; total += bits; n++;
        const tr = H('tr', null, null, wbody);
        H('td', null, ch === ' ' ? '␣' : ch, tr); H('td', null, String(ch.codePointAt(0)), tr);
        const bc = H('td', null, null, tr); bytes.forEach((b, k) => { const s = bin(b, 8); const sp = H('span', null, s.slice(0, 4) + ' ' + s.slice(4), bc); sp.style.whiteSpace = 'nowrap'; if (k < bytes.length - 1) bc.append(document.createTextNode(' · ')); });
        H('td', null, `${bits}`, tr);
      }
      wsum.textContent = n ? `${win.value} = ${n} ${n === 1 ? 'Zeichen' : 'Zeichen'} = ${total} Bit = ${total / 8} Byte. Jedes dieser Bits ist eine Speicherzelle wie in Level 3.` : 'Schreib ein Wort ins Feld.';
    }
    win.addEventListener('input', renderWord);
    renderWord();
    function val() { return st.bits.reduce((s, b, i) => s + b * (i === 3 && st.signed ? -8 : 1 << i), 0); }
    function render() {
      for (let i = 0; i < 4; i++) { bEls[i].textContent = String(st.bits[i]); bEls[i].classList.toggle('on', !!st.bits[i]); bEls[i].setAttribute('aria-pressed', st.bits[i] ? 'true' : 'false'); vEls[i].textContent = i === 3 && st.signed ? '−8' : String(1 << i); }
      const parts = []; for (let i = 3; i >= 0; i--) if (st.bits[i]) parts.push(i === 3 && st.signed ? '−8' : String(1 << i));
      const v = val();
      sum.textContent = `${st.bits.slice().reverse().join('')} = ${parts.length ? parts.join(' + ') + ' = ' : ''}${v < 0 ? '−' + (-v) : v}`;
      const u = st.bits.reduce((s, b, i) => s + (b << i), 0);
      asc.textContent = `Dieselben vier Bits: ${u} ohne Vorzeichen, ${u >= 8 ? '−' + (16 - u) : u} im Zweierkomplement, als unterer Teil des Bytes 0100${bin(u, 4)} das Zeichen „${String.fromCharCode(64 + u)}“ in ASCII.`;
    }
    render();
    return { st, set(bits, signed) { st.bits = bits.slice(); st.signed = signed; cb.checked = signed; render(); }, nibble: () => st.bits.reduce((s, b, i) => s + (b << i), 0) };
  },
  missions: [
    { id: 'L4M1a', m: 1, text: 'Stell mit den vier Bits die 13 ein.',
      start(api) { api.set([0, 0, 0, 0], false); },
      check(api) { if (api.st.signed) return 'Für diese Stufe den Schalter aus lassen.'; return api.nibble() === 13 ? true : false; },
      hints: ['13 = 8 + 4 + 1.'] },
    { id: 'L4M1b', m: 1, text: 'Jetzt zählt das oberste Bit −8 statt 8 (Zweierkomplement). Stell −3 ein.',
      start(api) { api.set([0, 0, 0, 0], true); },
      check(api) { if (!api.st.signed) return 'Den Schalter für −8 einschalten.'; return api.nibble() === 13 ? true : false; },
      hints: ['−3 = −8 + 5, und 5 = 4 + 1. Vergleich die Bits mit Stufe 1.'] },
  ],
  card() {
    return {
      text: 'Ein Register ist eine Reihe von Speicherzellen aus Level 3, und eine Zahl ist eine Leseregel: Stellenwerte 8 4 2 1, oder −8 4 2 1 für das Zweierkomplement. 1101 ist 13 und −3 zugleich. Mit acht Bits ist 01000001 die 65 und der Buchstabe A, und in Level 8 führt der Prozessor dieselben Bits als Befehl aus.',
      nums: '1101 = 8 + 4 + 1 = 13 · 1101 = −8 + 4 + 1 = −3 · dieselben Bits, zwei Leseregeln',
      hw: 'Register bestehen aus Flipflops, die nur an der Taktflanke übernehmen; heutige Register sind 64 Bit breit. Zweierkomplement ist Standard, weil der Addierer aus Level 7 damit ohne Sonderfall für negative Zahlen auskommt. Zeichen sind heute UTF-8: A bleibt das Byte 01000001, ä sind zwei Bytes 11000011 10100100. Dass eine Zahl als Dezimalziffern auf dem Bildschirm erscheint, ist selbst ein Programm: wiederholtes Teilen durch 10 mit Rest, also eine Schleife aus Subtraktion und bedingtem Sprung wie in Level 10.',
    };
  },
});
/* ===== Level 5: Arbeitsspeicher und Festspeicher ===== */
const FLASH0 = [6, 9, 0, 3];
const LS = M.define({
  n: 5, name: 'Arbeitsspeicher und Festspeicher', slot: 'Speicher', eyebrow: 'Wohin mit den Bits beim Ausschalten?',
  part: 'zwei kleine Speicher mit Adressen: ein Arbeitsspeicher (flüchtig) und ein Festspeicher (Flash), verbunden über eine Datenleitung',
  orient: {
    sehen: 'Zwei kleine Speicher mit je vier Zeilen à 4 Bit. Links der Arbeitsspeicher: Jede Zelle ist eine Schleife wie in Level 3 und braucht Strom. Rechts der Festspeicher: Jede Zelle ist ein Transistor mit einer kleinen Insel, eingeschlossen in Glas. Liegen Elektronen auf der Insel (die blauen Punkte), gilt die Zelle als 1. In der Mitte die Datenleitung: vier Drähte, über die eine Zeile von einem Speicher in den anderen kopiert wird. Welche Zeile, bestimmt die Adresse (zwei Bits): Sie ist wie eine Hausnummer in einer Straße, und jede Zeile ist ein Haus, in dem ein Wert wohnt. Oben der Netzschalter.',
    tun: 'Schreib eine Zahl in den Arbeitsspeicher, schalte den Strom aus und wieder an und sieh nach, was übrig ist. Dann sicherst du die Zahl in den Festspeicher und probierst es noch einmal. Zum Schluss holst du nach dem Einschalten alles aus dem Festspeicher zurück, so wie jeder Computer beim Start.',
    lernen: 'Der Arbeitsspeicher ist schnell, vergisst aber alles, sobald der Strom weg ist. Der Festspeicher hält Bits als eingesperrte Elektronen, auch ohne Strom, ist aber langsam zu beschreiben. Deshalb kopiert jeder Computer beim Einschalten vom Festspeicher in den Arbeitsspeicher, arbeitet dort, und „Speichern“ heißt: zurück in den Festspeicher schreiben.',
    vergleich: 'Der Arbeitsspeicher ist wie etwas, das du im Kopf behältst: sofort abrufbar, aber nur, solange du wach bist. Der Festspeicher ist wie etwas, das du mit dem Stift auf Papier schreibst: Das Schreiben dauert länger, dafür steht es morgen noch da. Oder als Werkstatt: Der Arbeitsspeicher ist die Werkbank, auf der liegt, woran der Prozessor gerade arbeitet; der Festspeicher ist die Lagerhalle, in der alles dauerhaft steht.',
  },
  build(L) {
    L.el = levelShell(this);
    const st = { power: true, ram: [0, 0, 0, 0], rand: [false, false, false, false], flash: FLASH0.slice(), wear: [0, 0, 0, 0], addr: 0, busy: false, bus: null, dir: null, hv: false, anim: null,
      onCount: 0, offCount: 0, had13: false, cycledAfter13: false, saved13At: -1, cycledAfterSave: false, lastSave: null, loadedSinceOn: new Set(), manualSinceOn: false, lastRam: [0, 0, 0, 0], loads: 0, saves: 0, msg: '' };
    const panel = H('div', 'panel', null, L.el.work);
    const top = H('div', 'row', null, panel);
    const pwBtn = B('btn big', 'Strom ausschalten', top, () => power());
    const pwChip = H('span', 'chip', null, top);
    const hvChip = H('span', 'chip ctl', 'Hochspannung 15 V', top); hvChip.hidden = true;
    const grid = H('div', 'memgrid', null, panel);
    // Arbeitsspeicher
    const ramBox = H('div', 'membox', null, grid);
    H('p', 'memtitle', 'Arbeitsspeicher', ramBox); H('p', 'caption', 'hält Bits, solange Strom fließt', ramBox);
    const ramRows = [];
    for (let r = 0; r < 4; r++) {
      const row = H('div', 'mrow', null, ramBox);
      const ad = H('span', 'maddr', null, row); H('b', null, `Zeile ${r}`, ad); H('span', null, ` · ${bin(r, 2)}`, ad);
      const f = H('div', 'field', null, row); const bits = [];
      for (let i = 3; i >= 0; i--) { const b = B('bit', '0', f, () => { if (!st.power || st.busy) return; const v = st.ram[r] ^ (1 << i); st.ram[r] = v; st.rand[r] = false; st.manualSinceOn = true; st.msg = `Von Hand geschrieben: Zeile ${r} = ${bin(v, 4)} = ${v}. Im Arbeitsspeicher geht das sofort.`; render(); L.touch(); }); b.id = `ram${r}b${i}`; bits[i] = b; }
      const val = H('span', 'mval', '', row);
      ramRows.push({ row, bits, val });
    }
    // Datenleitung, Adresse, Knöpfe
    const busBox = H('div', 'membox bus', null, grid);
    H('p', 'memtitle', 'Datenleitung', busBox); H('p', 'caption', 'vier Drähte zwischen den Speichern', busBox);
    const wires = H('div', 'field', null, busBox); const wBits = []; for (let i = 3; i >= 0; i--) wBits[i] = H('span', 'bit sm', '–', wires);
    const dirT = H('p', 'note', '', busBox);
    H('p', 'memtitle', 'Adresse', busBox);
    const ar = H('div', 'row', null, busBox); const aBits = [];
    for (let i = 1; i >= 0; i--) { const b = B('bit ctl', '0', ar, () => { if (st.busy) return; st.addr ^= 1 << i; render(); L.touch(); }); b.id = `addr${i}`; aBits[i] = b; }
    const aT = H('span', 'note', '', ar);
    const lampHost = H('div', 'lamps', null, busBox); const aLamps = [0, 1, 2, 3].map((r) => H('span', 'lamp', `Zeile ${r}`, lampHost));
    const acts = H('div', 'col', null, busBox); acts.style.gap = '8px';
    const bLoad = B('btn primary', 'Laden: Festspeicher → Arbeitsspeicher', acts, () => op('load'));
    const bSave = B('btn', 'Sichern: Arbeitsspeicher → Festspeicher', acts, () => op('save'));
    const bBoot = B('btn', 'Startprogramm: alle Zeilen laden', acts, () => boot()); bBoot.hidden = true;
    // Festspeicher
    const flBox = H('div', 'membox', null, grid);
    H('p', 'memtitle', 'Festspeicher (Flash)', flBox); H('p', 'caption', 'hält Bits als eingesperrte Elektronen', flBox);
    const flRows = [];
    for (let r = 0; r < 4; r++) {
      const row = H('div', 'mrow', null, flBox);
      const ad = H('span', 'maddr', null, row); H('b', null, `Zeile ${r}`, ad); H('span', null, ` · ${bin(r, 2)}`, ad);
      const f = H('div', 'field', null, row); const cells = [];
      for (let i = 3; i >= 0; i--) {
        const svg = S('svg', { width: 30, height: 36, viewBox: '0 0 30 36', class: 'fcell', 'aria-hidden': 'true' }, f);
        S('rect', { x: 1, y: 1, width: 28, height: 34, rx: 5, class: 'glass' }, svg);
        S('rect', { x: 6, y: 5, width: 18, height: 13, rx: 2, class: 'island' }, svg);
        const es = [[10, 9], [15, 9], [20, 9], [12.5, 14], [17.5, 14]].map(([x, y]) => S('circle', { cx: x, cy: y, r: 2, class: 'el' }, svg));
        const t = S('text', { x: 15, y: 31, 'text-anchor': 'middle', class: 'fdig' }, svg);
        cells[i] = { es, t };
      }
      const val = H('span', 'mval', '', row); const wear = H('span', 'wear', '', row);
      flRows.push({ row, cells, val, wear });
    }
    const msg = H('p', 'msg', null, panel); msg.setAttribute('aria-live', 'polite');
    H('p', 'caption', 'Im echten Chip (Größenordnungen): Arbeitsspeicher lesen oder schreiben ≈ 0,1 µs · Festspeicher lesen ≈ 50 µs · Festspeicher löschen und neu schreiben ≈ 1 bis einige ms. Hier ist alles verlangsamt, damit du zusehen kannst. In echten Flash-Chips ist die Vereinbarung übrigens umgekehrt (leere Insel = 1); das ändert am Prinzip nichts.', panel);

    const later = (ms, fn) => (REDUCED ? fn() : setTimeout(fn, ms));
    function power() {
      if (st.busy) return;
      st.power = !st.power;
      if (!st.power) {
        st.lastRam = st.ram.map((v) => (v == null ? 0 : v)); st.ram = [null, null, null, null]; st.rand = [false, false, false, false]; st.offCount++;
        st.msg = 'Strom aus: Die Schleifen im Arbeitsspeicher haben keine Spannung mehr, alle Bits sind weg. Die Elektronen im Festspeicher bleiben eingesperrt; niemand liest sie, aber sie sind da.';
      } else {
        st.ram = st.lastRam.map((last) => { let v; do { v = 1 + Math.floor(Math.random() * 15); } while (v === last); return v; });
        st.rand = [true, true, true, true]; st.onCount++; st.loadedSinceOn = new Set(); st.manualSinceOn = false;
        if (st.had13) st.cycledAfter13 = true;
        if (st.saved13At >= 0) st.cycledAfterSave = true;
        st.msg = 'Strom an: Jede Schleife im Arbeitsspeicher kippt zufällig auf 0 oder 1 (wie in Level 3). Dort steht jetzt Zufall, nicht deine Daten. Der Festspeicher ist unverändert.';
      }
      render(); L.touch();
    }
    function op(kind) {
      if (!st.power || st.busy) return;
      const a = st.addr;
      st.busy = true;
      if (kind === 'load') {
        const v = st.flash[a];
        st.bus = v; st.dir = 'load';
        st.msg = `Laden: Die Adresse ${bin(a, 2)} schaltet Zeile ${a} in beiden Speichern an die Datenleitung. Der Festspeicher prüft jede Zelle (fließt Strom, oder sperren die Elektronen?) und legt ${bin(v, 4)} auf die Drähte.`;
        render();
        later(500, () => { st.ram[a] = v; st.rand[a] = false; st.loadedSinceOn.add(a); st.loads++; st.busy = false; st.bus = null; st.dir = null; st.msg = `Geladen: Zeile ${a} im Arbeitsspeicher = ${bin(v, 4)} = ${v}. Der Festspeicher behält seine Kopie.`; render(); L.touch(); });
      } else {
        const v = st.ram[a];
        st.bus = v; st.dir = 'save'; st.hv = true;
        st.anim = { row: a, from: st.flash[a], to: v, phase: 'erase', frac: 0 };
        st.msg = `Sichern, Schritt 1: Zeile ${a} wird gelöscht. Hochspannung zieht die Elektronen durch das Glas von den Inseln.`;
        render();
        const finish = () => {
          st.flash[a] = v; st.wear[a]++; st.saves++; st.lastSave = { a, v };
          if (a === 2 && v === 13) { st.saved13At = st.offCount; st.cycledAfterSave = false; }
          st.anim = null; st.hv = false; st.busy = false; st.bus = null; st.dir = null;
          st.msg = `Gesichert: Zeile ${a} im Festspeicher = ${bin(v, 4)} = ${v}. Die Elektronen sitzen jetzt hinter Glas fest, auch ohne Strom. Diese Zeile wurde ${st.wear[a]}-mal beschrieben; jedes Mal leidet das Glas ein wenig.`;
          render(); L.touch();
        };
        if (REDUCED) { finish(); return; }
        let t = 0;
        const iv = setInterval(() => {
          t += 50;
          if (t <= 600) { st.anim.phase = 'erase'; st.anim.frac = t / 600; }
          else { if (st.anim.phase === 'erase') st.msg = `Sichern, Schritt 2: Hochspannung in die andere Richtung schießt Elektronen auf die Inseln, wo eine 1 hin soll.`; st.anim.phase = 'program'; st.anim.frac = (t - 600) / 800; }
          render();
          if (t >= 1400) { clearInterval(iv); finish(); }
        }, 50);
      }
    }
    function boot() {
      if (!st.power || st.busy) return;
      let r = 0;
      const step = () => { if (r > 3) return; st.addr = r; op('load'); r++; later(650, step); };
      step();
    }
    function electrons(r, i) {
      const bitNow = (st.flash[r] >> i) & 1;
      const A = st.anim;
      if (!A || A.row !== r) return bitNow ? 5 : 0;
      const was = (A.from >> i) & 1, will = A.to != null ? (A.to >> i) & 1 : 0;
      if (A.phase === 'erase') return was ? Math.round(5 * (1 - A.frac)) : 0;
      return will ? Math.round(5 * A.frac) : 0;
    }
    function render() {
      pwBtn.textContent = st.power ? 'Strom ausschalten' : 'Strom einschalten';
      pwBtn.disabled = st.busy;
      pwChip.textContent = st.power ? 'Strom: an' : 'Strom: aus'; pwChip.className = 'chip' + (st.power ? ' ok' : ' bad');
      hvChip.hidden = !st.hv;
      ramRows.forEach((rr, r) => {
        const v = st.ram[r], off = v == null;
        for (let i = 0; i < 4; i++) { const b = rr.bits[i]; const bit = off ? null : (v >> i) & 1; b.textContent = off ? '–' : String(bit); b.classList.toggle('on', bit === 1); b.classList.toggle('rand', !off && st.rand[r]); b.disabled = off || st.busy; b.setAttribute('aria-label', `Arbeitsspeicher Zeile ${r}, Bit ${i}: ${off ? 'kein Strom' : bit}`); }
        rr.val.textContent = off ? 'kein Strom' : `= ${v}${st.rand[r] ? ' (Zufall)' : ''}`;
        rr.row.classList.toggle('sel', st.power && r === st.addr); rr.row.classList.toggle('off', off);
      });
      flRows.forEach((fr, r) => {
        for (let i = 0; i < 4; i++) { const n = electrons(r, i); fr.cells[i].es.forEach((e, k) => e.classList.toggle('on', k < n)); fr.cells[i].t.textContent = st.anim && st.anim.row === r ? '…' : String((st.flash[r] >> i) & 1); }
        fr.val.textContent = st.anim && st.anim.row === r ? '= …' : `= ${st.flash[r]}`;
        fr.wear.textContent = st.wear[r] ? `${st.wear[r]}× beschrieben` : '';
        fr.row.classList.toggle('sel', st.power && r === st.addr);
      });
      for (let i = 0; i < 4; i++) { const v = st.bus == null ? null : (st.bus >> i) & 1; wBits[i].textContent = v == null ? '–' : String(v); wBits[i].classList.toggle('on', v === 1); }
      dirT.textContent = st.dir === 'load' ? '← zum Arbeitsspeicher' : st.dir === 'save' ? 'zum Festspeicher →' : st.power ? 'Ruhe: nichts unterwegs' : 'kein Strom';
      for (let i = 0; i < 2; i++) { const b = (st.addr >> i) & 1; aBits[i].textContent = String(b); aBits[i].classList.toggle('on', !!b); aBits[i].disabled = st.busy; aBits[i].setAttribute('aria-label', `Adressbit ${i}: ${b}`); }
      aT.textContent = `${bin(st.addr, 2)} = Zeile ${st.addr}`;
      aLamps.forEach((l, r) => l.classList.toggle('on', st.power && r === st.addr));
      bLoad.disabled = bSave.disabled = !st.power || st.busy;
      bBoot.hidden = !G.done.has('LSM3'); bBoot.disabled = !st.power || st.busy;
      if (st.power && st.ram[2] === 13 && !st.rand[2]) st.had13 = true;
      msg.textContent = st.msg;
    }
    render();
    return { st, render, power,
      reset(o) { Object.assign(st, { power: true, ram: [0, 0, 0, 0], rand: [false, false, false, false], flash: FLASH0.slice(), addr: 0, busy: false, bus: null, dir: null, hv: false, anim: null, had13: false, cycledAfter13: false, saved13At: -1, cycledAfterSave: false, lastSave: null, loadedSinceOn: new Set(), manualSinceOn: false, msg: '' }, o || {}); st.startOn = st.onCount; render(); } };
  },
  freeplay(api, onLoad) { if (onLoad) api.reset({ flash: [6, 9, 13, 3], ram: [6, 9, 13, 3] }); else api.render(); },
  missions: [
    { id: 'LSM1', m: 1, text: 'Schreib die Zahl 13 in Zeile 2 des Arbeitsspeichers (klick die Bits: 8 + 4 + 1 = 1101). Dann schalte den Strom aus und wieder an. Was ist aus deiner 13 geworden?',
      start(api) { api.reset(); },
      chips: ['Sie ist noch da', 'Sie ist weg, in Zeile 2 steht jetzt Zufall', 'Zeile 2 ist jetzt 0000'],
      chipsWhen: (api) => { const s = api.st; return s.power && s.cycledAfter13; },
      chipsText: 'Strom ist wieder an. Schau auf Zeile 2 im Arbeitsspeicher: Was ist aus deiner 13 geworden?',
      instant: 'chips',
      peek(api) { const s = api.st; if (!s.power) return 'Strom ist aus. Wieder einschalten und nachsehen.'; if (s.had13) return 'Die 13 steht in Zeile 2. Jetzt Strom aus und wieder an.'; if (s.ram[2] !== 0 && s.ram[2] != null) return `Zeile 2 = ${bin(s.ram[2], 4)} = ${s.ram[2]}. Gesucht ist 1101 = 13.`; return false; },
      check(api, ctx) { const v = api.st.ram[2]; if (ctx.answer === 1) return true; return ctx.answer === 0 ? `Schau genau hin: In Zeile 2 steht ${bin(v, 4)} = ${v}, nicht 13.` : `Nicht 0000: Da steht ${bin(v, 4)}. Beim Einschalten kippt jede Schleife zufällig, wie in Level 3.`; },
      doneText: () => 'Genau: Der Arbeitsspeicher hält Bits nur, solange Strom fließt. Nach dem Einschalten steht in jeder Zeile Zufall.',
      hints: ['13 = 8 + 4 + 1, also 1101: die Bits mit den Werten 8, 4 und 1 einschalten. Zeile 2 ist die dritte Zeile von oben, gezählt wird ab 0.', 'Beim Ausschalten verlieren die Schleifen ihre Spannung; beim Einschalten kippt jede zufällig, wie in Level 3 beim Knopf „Strom aus und wieder an“.'] },
    { id: 'LSM2', m: 2, text: 'Sichere die 13 so, dass sie das Ausschalten übersteht: Schreib sie wieder in Zeile 2 des Arbeitsspeichers, stell die Adresse auf 10 (= Zeile 2) und drück „Sichern“. Dann Strom aus und wieder an.',
      start(api) { api.reset(); },
      chips: ['Der Festspeicher ist beim Schreiben langsam und nutzt sich ab', 'Der Festspeicher kann keine Zahlen speichern', 'Der Arbeitsspeicher hält ohne Strom länger'],
      chipsWhen: (api) => { const s = api.st; return s.power && s.flash[2] === 13 && s.cycledAfterSave; },
      chipsText: 'Die 13 hat im Festspeicher überlebt. Letzte Frage: Warum arbeitet der Prozessor dann nicht gleich im Festspeicher?',
      instant: 'chips',
      peek(api) { const s = api.st; if (!s.power) return 'Strom ist aus. Wieder einschalten und nachsehen.'; if (s.flash[2] === 13 && !s.cycledAfterSave) return 'Die 13 steht im Festspeicher. Jetzt Strom aus und wieder an.'; if (s.lastSave && s.lastSave.a !== 2) return `Gesichert wurde Zeile ${s.lastSave.a}. Gefragt ist Zeile 2: Adresse 10.`; if (s.lastSave && s.lastSave.a === 2 && s.lastSave.v !== 13) return `In Zeile 2 des Festspeichers steht jetzt ${s.lastSave.v}. Erst die 13 in den Arbeitsspeicher, dann sichern.`; if (s.ram[2] === 13 && s.addr !== 2) return 'Die 13 steht im Arbeitsspeicher. Stell die Adresse auf 10, damit „Sichern“ Zeile 2 erwischt.'; if (s.ram[2] === 13) return 'Adresse stimmt. Jetzt „Sichern“.'; return false; },
      check(api, ctx) { if (ctx.answer === 0) return true; return ctx.answer === 1 ? 'Nein: Beide speichern dieselben Bits, die 13 steht ja im Festspeicher.' : 'Nein, umgekehrt: Ohne Strom hält der Festspeicher, der Arbeitsspeicher vergisst.'; },
      doneText: () => 'Richtig: Im Arbeitsspeicher dauert Lesen und Schreiben rund 0,1 µs; im Festspeicher dauert Löschen und Neuschreiben Millisekunden, und jedes Mal leidet das Glas. Darum rechnet der Prozessor im Arbeitsspeicher und sichert nur, was bleiben soll.',
      found: (api) => ({ wear2: api.st.wear[2] }),
      hints: ['Die Adresse besteht aus zwei Bits: 10 heißt 2. Erst wenn sie stimmt, ist Zeile 2 in beiden Speichern orange markiert.', 'Beim Sichern siehst du, wie die Elektronen erst von den Inseln gezogen und dann neu hineingeschossen werden. Das dauert, und genau das ist der Grund für die Antwort.'] },
    { id: 'LSM3', m: 3, text: 'Mach, was jeder Computer beim Einschalten macht: Schalte den Strom aus und wieder an, dann hol alle vier Zeilen aus dem Festspeicher zurück in den Arbeitsspeicher, ohne ein einziges Bit von Hand zu klicken. Adresse wählen, „Laden“, nächste Adresse.',
      start(api) { api.reset({ flash: [6, 9, 13, 3], ram: [6, 9, 13, 3] }); },
      check(api) { const s = api.st; if (s.onCount === s.startOn) return s.power ? 'Erst Strom aus und wieder an.' : 'Jetzt wieder einschalten.'; if (!s.power) return 'Jetzt wieder einschalten.'; if (s.manualSinceOn) return 'Du hast Bits von Hand geklickt. Das zählt nicht: Strom aus und an, dann nur mit „Laden“.'; const n = [0, 1, 2, 3].filter((r) => s.loadedSinceOn.has(r) && s.ram[r] === s.flash[r]).length; if (n === 4) return true; return n ? `${n} von 4 Zeilen geladen. Nächste Adresse wählen, dann „Laden“.` : 'Im Arbeitsspeicher steht Zufall. Adresse 00 wählen und „Laden“.'; },
      counters: (api) => [`Geladen: ${[0, 1, 2, 3].filter((r) => api.st.loadedSinceOn.has(r)).length} / 4`],
      found: (api) => ({ loads: api.st.loads, saves: api.st.saves }),
      hints: ['Die Adresse wählt die Zeile: 00, 01, 10, 11. Für jede einmal „Laden“ drücken.', 'Genau das macht jeder Computer beim Einschalten: Ein kleines, fest eingebautes Startprogramm kopiert den Festspeicher in den Arbeitsspeicher. Erst danach kann der Prozessor arbeiten.'] },
  ],
  card(api, f) {
    return {
      text: 'Ein Computer hat zwei Arten Speicher. Der Arbeitsspeicher hält Bits durch Strom: schnell und beliebig oft beschreibbar, aber ohne Strom sofort leer. Der Festspeicher hält Bits als eingesperrte Elektronen hinter Glas: ohne Strom jahrelang, aber langsam zu beschreiben und mit begrenzter Zahl an Schreibvorgängen. Jede Zeile hat eine Adresse, und die Adressbits wählen, welche Zeile an die Datenleitung kommt. Beim Einschalten kopiert ein Startprogramm den Festspeicher in den Arbeitsspeicher; dort arbeitet der Prozessor, und „Speichern“ heißt: zurück in den Festspeicher schreiben.',
      nums: `Dein Modell: 16 Bit Arbeitsspeicher, 16 Bit Festspeicher, Adressen mit 2 Bit (2² = 4 Zeilen). Ein Laptop mit 16 GB Arbeitsspeicher und 1 TB SSD hat rund 1,3 · 10¹¹ Bit flüchtig und 8 · 10¹² Bit fest; für 16 GB braucht er Adressen mit rund 34 Bit. · Deine Ladevorgänge: ${f.loads ?? '–'}, Sicherungen: ${f.saves ?? '–'}.`,
      hw: 'Der Arbeitsspeicher ist DRAM (Level 3): 1 Transistor und 1 Kondensator je Bit, alle 64 ms nachgeladen. Der Festspeicher ist NAND-Flash: Elektronen werden mit 10 bis 20 V durch eine etwa 10 nm dünne Schicht Siliziumdioxid (chemisch dasselbe wie Sand) auf eine isolierte Insel getunnelt. Ohne Hochspannung ist dieses Tunneln exponentiell unwahrscheinlich, deshalb hält die Ladung Jahre. Beim Lesen verschiebt die Ladung die Schaltschwelle des Transistors, und der Chip prüft, ob bei mittlerer Spannung Strom fließt. Gelöscht werden immer ganze Blöcke, und nach rund tausend bis einigen tausend Schreibvorgängen ist das Glas verschlissen. Beim Einschalten beginnt der Prozessor an einer festen Adresse in einem kleinen Flash-Chip auf der Hauptplatine (Firmware); dessen Programm lädt das Betriebssystem von der SSD in den Arbeitsspeicher.',
    };
  },
});
/* ===== Level 6: Vom Gatter zum Rechnen (XOR und Halbaddierer) ===== */
const LH = M.define({
  n: 6, name: 'Vom Gatter zum Rechnen', slot: 'Addieren', eyebrow: 'Wie wird aus Logik eine Rechnung?',
  part: 'Halbaddierer: ein XOR-Gatter für die Stelle, ein UND-Gatter für den Übertrag',
  orient: {
    sehen: 'Oben ein neues Gatter, XOR („entweder–oder“), zusammengesteckt aus den Grundgattern ODER, UND und NICHT. UND gibt nur dann 1, wenn beide Eingänge 1 sind; ODER schon, wenn mindestens einer 1 ist; NICHT dreht um. Die kleinen Zahlen an den Leitungen zeigen, was gerade durchläuft. Darunter der Halbaddierer: zwei Eingänge A und B mit je einem Bit, zwei Ausgänge: die Stelle S und der Übertrag C.',
    tun: 'Schalte A und B durch alle vier Kombinationen und deck die Tabelle des XOR-Gatters auf. Dann wähl für die beiden Ausgänge des Halbaddierers das passende Gatter, bis alle vier Rechnungen stimmen.',
    lernen: 'Zwei Bits zu addieren ist nur eine Tabelle mit vier Zeilen: 0 + 0 = 0, 0 + 1 = 1, 1 + 0 = 1, 1 + 1 = 10 (binär für zwei). Die hintere Stelle ist genau XOR, der Übertrag ist genau UND. Rechnen ist also keine neue Fähigkeit, sondern zwei Gatter nebeneinander. Mit einem dritten Eingang für den Übertrag von rechts wird daraus im nächsten Level der Volladdierer.',
    vergleich: 'Schriftliches Addieren aus der Schule: 7 + 5 = 12, „2 hin, 1 im Sinn“. Die 2 ist die Stelle, die 1 im Sinn ist der Übertrag. Im Binärsystem gibt es nur die Ziffern 0 und 1, deshalb kommt der Übertrag schon bei 1 + 1: „0 hin, 1 im Sinn“.',
  },
  build(L) {
    L.el = levelShell(this);
    const st = { a: 0, b: 0, clicked: false, visited: new Set(), showHA: false, ha: { a: 0, b: 0, S: null, C: null } };
    const XOR = (a, b) => a ^ b;

    /* Teil 1: XOR aus Grundgattern */
    const p1 = H('div', 'panel', null, L.el.work);
    H('p', 'memtitle', 'Das Gatter „entweder–oder“ (XOR)', p1);
    const sp = H('div', 'split', null, p1); const l1 = H('div', 'col', null, sp), r1 = H('div', 'col', null, sp);
    const svg = S('svg', { class: 'fig', viewBox: '0 0 420 205', role: 'img', 'aria-label': 'XOR-Gatter aus ODER, UND und NICHT' }, l1);
    const sw = (host, x, y, name, on) => { const g = S('g', { class: 'sw data', tabindex: '0', role: 'button' }, host); S('rect', { x: x - 16, y: y - 16, width: 32, height: 32, rx: 6 }, g); const tt = S('text', { x, y: y + 5, 'text-anchor': 'middle' }, g); tt.textContent = name; g.addEventListener('click', on); g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); on(); } }); return g; };
    const andPath = (x, y) => `M${x} ${y - 20} H${x + 25} A20 20 0 0 1 ${x + 25} ${y + 20} H${x} Z`;
    const orPath = (x, y) => `M${x} ${y - 20} Q${x + 30} ${y - 20} ${x + 50} ${y} Q${x + 30} ${y + 20} ${x} ${y + 20} Q${x + 12} ${y} ${x} ${y - 20} Z`;
    const W = (d) => S('path', { d, class: 'wire thin' }, svg);
    const wA1 = W('M46 60 H90 V50 H120'), wA2 = W('M90 60 V130 H120'), wB1 = W('M46 140 H100 V150 H120'), wB2 = W('M100 140 V70 H120');
    const wOr = W('M170 60 H255 V90 H280'), wAnd = W('M170 140 H200'), wNot = W('M240 140 H260 V110 H280'), wOut = W('M330 100 H358');
    const wC = W('M185 140 V185 H358'); wC.setAttribute('visibility', 'hidden');
    const gates = S('g', { class: 'gate' }, svg);
    S('path', { d: orPath(120, 60) }, gates); S('path', { d: andPath(120, 140) }, gates);
    S('path', { d: 'M200 126 L200 154 L228 140 Z' }, gates); S('circle', { cx: 233, cy: 140, r: 4 }, gates);
    S('path', { d: andPath(280, 100) }, gates);
    let t = S('text', { x: 140, y: 32, class: 'cv', 'text-anchor': 'middle' }, svg); t.textContent = 'ODER';
    t = S('text', { x: 140, y: 112, class: 'cv', 'text-anchor': 'middle' }, svg); t.textContent = 'UND';
    t = S('text', { x: 214, y: 120, class: 'cv', 'text-anchor': 'middle' }, svg); t.textContent = 'NICHT';
    t = S('text', { x: 300, y: 72, class: 'cv', 'text-anchor': 'middle' }, svg); t.textContent = 'UND';
    const vOr = S('text', { x: 178, y: 54, class: 'val' }, svg), vAnd = S('text', { x: 172, y: 134, class: 'val' }, svg), vNot = S('text', { x: 244, y: 134, class: 'val' }, svg);
    const lamp = S('circle', { cx: 372, cy: 100, r: 12, class: 'lampc hi' }, svg);
    const lampT = S('text', { x: 372, y: 126, class: 'val', 'text-anchor': 'middle' }, svg);
    const lampC = S('circle', { cx: 372, cy: 185, r: 12, class: 'lampc hi' }, svg); lampC.setAttribute('visibility', 'hidden');
    const lampCT = S('text', { x: 345, y: 176, class: 'val', 'text-anchor': 'end' }, svg); lampCT.setAttribute('visibility', 'hidden');
    const swA = sw(svg, 30, 60, 'A', () => { st.a ^= 1; st.clicked = true; render(); L.touch(); }), swB = sw(svg, 30, 140, 'B', () => { st.b ^= 1; st.clicked = true; render(); L.touch(); });
    H('p', 'caption', 'Klick A und B. Die kleinen Zahlen zeigen, was an jeder Leitung anliegt: links das ODER, darunter das UND, dann das NICHT, rechts das letzte UND. Die Lampe ist der Ausgang.', l1);
    const tw = H('div', 'tbl-wrap', null, r1); const tb = H('table', 'tt', null, tw);
    const hr = H('tr', null, null, H('thead', null, null, tb)); ['A', 'B', 'A ODER B', 'A UND B', 'XOR'].forEach((h) => H('th', null, h, hr));
    const body = H('tbody', null, null, tb);
    const rows = [0, 1, 2, 3].map((i) => { const tr = H('tr', null, null, body); const a = i >> 1, b = i & 1; H('td', null, String(a), tr); H('td', null, String(b), tr); const o = H('td', 'q', '?', tr), u = H('td', 'q', '?', tr), x = H('td', 'q', '?', tr); return { tr, o, u, x, a, b }; });
    const nameT = H('p', 'note', null, r1);

    /* Teil 2: Halbaddierer zusammenstecken */
    const p2 = H('div', 'panel', null, L.el.work);
    H('p', 'memtitle', 'Der Halbaddierer: zwei Bits addieren', p2);
    const sp2 = H('div', 'split', null, p2); const l2 = H('div', 'col', null, sp2), r2 = H('div', 'col', null, sp2);
    const svg2 = S('svg', { class: 'fig', viewBox: '0 0 420 170', role: 'img', 'aria-label': 'Halbaddierer mit zwei frei wählbaren Gattern für Stelle und Übertrag' }, l2);
    const W2 = (d) => S('path', { d, class: 'wire thin' }, svg2);
    const hA1 = W2('M46 50 H120 V40 H170'), hA2 = W2('M120 50 V120 H170'), hB1 = W2('M46 130 H140 V60 H170'), hB2 = W2('M140 130 V140 H170');
    S('rect', { x: 170, y: 25, width: 90, height: 50, rx: 8, class: 'box' }, svg2); S('rect', { x: 170, y: 105, width: 90, height: 50, rx: 8, class: 'box' }, svg2);
    const gS = S('text', { x: 215, y: 56, class: 'lab', 'text-anchor': 'middle' }, svg2), gC = S('text', { x: 215, y: 136, class: 'lab', 'text-anchor': 'middle' }, svg2);
    const oS = W2('M260 50 H330'), oC = W2('M260 130 H330');
    const lS = S('circle', { cx: 346, cy: 50, r: 13, class: 'lampc hi' }, svg2), lC = S('circle', { cx: 346, cy: 130, r: 13, class: 'lampc hi' }, svg2);
    t = S('text', { x: 368, y: 55, class: 'val' }, svg2); t.textContent = 'S'; t = S('text', { x: 368, y: 135, class: 'val' }, svg2); t.textContent = 'C';
    t = S('text', { x: 215, y: 18, class: 'cv', 'text-anchor': 'middle' }, svg2); t.textContent = 'Stelle S';
    t = S('text', { x: 215, y: 98, class: 'cv', 'text-anchor': 'middle' }, svg2); t.textContent = 'Übertrag C';
    const hsA = sw(svg2, 30, 50, 'A', () => { st.ha.a ^= 1; render(); }), hsB = sw(svg2, 30, 130, 'B', () => { st.ha.b ^= 1; render(); });
    const resT = H('p', 'note', null, l2);
    const pick = (label, key) => { const box = H('div', 'col', null, r2); box.style.gap = '6px'; H('p', 'blk-t', label, box); const row = H('div', 'row', null, box); return ['UND', 'ODER', 'XOR', 'NAND'].map((g) => { const b = B('btn', g, row, () => { st.ha[key] = g; render(); L.touch(); }); b.dataset.g = g; return b; }); };
    const bS = pick('Gatter für die Stelle S', 'S'), bC = pick('Gatter für den Übertrag C', 'C');
    const tw2 = H('div', 'tbl-wrap', null, r2); const tb2 = H('table', 'tt', null, tw2);
    const hr2 = H('tr', null, null, H('thead', null, null, tb2)); ['A', 'B', 'soll A + B', 'deine C S', ''].forEach((h) => H('th', null, h, hr2));
    const body2 = H('tbody', null, null, tb2);
    const rows2 = [0, 1, 2, 3].map((i) => { const tr = H('tr', null, null, body2); const a = i >> 1, b = i & 1; H('td', null, String(a), tr); H('td', null, String(b), tr); H('td', null, `${a + b} = ${bin(a + b, 2)}`, tr); const got = H('td', null, '', tr), ok = H('td', null, '', tr); return { a, b, got, ok }; });
    const out = (g, a, b) => (g ? GATES[g](a, b) : null);
    function haCorrect() { return rows2.filter((r) => out(st.ha.S, r.a, r.b) === ((r.a + r.b) & 1) && out(st.ha.C, r.a, r.b) === ((r.a + r.b) >> 1)).length; }

    function render() {
      const a = st.a, b = st.b, o = a | b, u = a & b, n = 1 - u, x = o & n;
      swA.classList.toggle('on', !!a); swB.classList.toggle('on', !!b);
      [wA1, wA2].forEach((w) => w.classList.toggle('on', !!a)); [wB1, wB2].forEach((w) => w.classList.toggle('on', !!b));
      wOr.classList.toggle('on', !!o); wAnd.classList.toggle('on', !!u); wNot.classList.toggle('on', !!n); wOut.classList.toggle('on', !!x); wC.classList.toggle('on', !!u);
      vOr.textContent = String(o); vAnd.textContent = String(u); vNot.textContent = String(n);
      lamp.classList.toggle('on', !!x); lampT.textContent = st.showHA ? `S = ${x}` : `XOR = ${x}`;
      [wC, lampC, lampCT].forEach((e) => e.setAttribute('visibility', st.showHA ? 'visible' : 'hidden'));
      lampC.classList.toggle('on', !!u); lampCT.textContent = `C = ${u}`;
      if (st.clicked) st.visited.add(a * 2 + b);
      rows.forEach((r, i) => { const v = st.visited.has(i); const set = (td, val) => { td.textContent = v ? String(val) : '?'; td.className = v ? (val ? 'one' : '') : 'q'; }; set(r.o, r.a | r.b); set(r.u, r.a & r.b); set(r.x, r.a ^ r.b); r.tr.classList.toggle('cur', i === a * 2 + b); });
      nameT.textContent = st.visited.size === 4 ? 'Alle vier Zeilen aufgedeckt. XOR = (A ODER B) UND NICHT (A UND B).' : `${st.visited.size} von 4 Zeilen aufgedeckt.`;
      // Halbaddierer
      const h = st.ha, s = out(h.S, h.a, h.b), c = out(h.C, h.a, h.b);
      hsA.classList.toggle('on', !!h.a); hsB.classList.toggle('on', !!h.b);
      [hA1, hA2].forEach((w) => w.classList.toggle('on', !!h.a)); [hB1, hB2].forEach((w) => w.classList.toggle('on', !!h.b));
      gS.textContent = h.S || '?'; gC.textContent = h.C || '?';
      oS.classList.toggle('on', s === 1); oC.classList.toggle('on', c === 1); lS.classList.toggle('on', s === 1); lC.classList.toggle('on', c === 1);
      resT.textContent = s == null || c == null ? `A + B = ${h.a} + ${h.b}. Wähl für beide Ausgänge ein Gatter.` : `A + B = ${h.a} + ${h.b}, deine Schaltung zeigt C S = ${c}${s}, das ist ${2 * c + s}${2 * c + s === h.a + h.b ? '. Diese Zeile stimmt.' : `. Richtig wäre ${h.a + h.b} = ${bin(h.a + h.b, 2)}.`}`;
      bS.forEach((bt) => bt.setAttribute('aria-pressed', bt.dataset.g === h.S ? 'true' : 'false')); bC.forEach((bt) => bt.setAttribute('aria-pressed', bt.dataset.g === h.C ? 'true' : 'false'));
      rows2.forEach((r) => { const ss = out(h.S, r.a, r.b), cc = out(h.C, r.a, r.b); r.got.textContent = ss == null || cc == null ? '–' : `${cc}${ss}`; const good = ss === ((r.a + r.b) & 1) && cc === ((r.a + r.b) >> 1); r.ok.textContent = ss == null || cc == null ? '' : good ? '✓' : '✗'; r.ok.className = good ? 'good' : 'bad'; });
    }
    render();
    return { st, render, haCorrect, reset() { st.a = 0; st.b = 0; st.clicked = false; st.visited = new Set(); st.showHA = false; render(); }, resetHA() { st.ha = { a: 0, b: 0, S: null, C: null }; render(); }, showHA(on) { st.showHA = on; render(); } };
  },
  freeplay(api) { api.showHA(true); },
  missions: [
    { id: 'LHM1', m: 1, text: 'Schalte A und B durch alle vier Kombinationen (00, 01, 10, 11) und deck die Tabelle des Gatters auf. Wann gibt es eine 1?',
      start(api) { api.reset(); },
      chips: ['Wenn genau einer der beiden 1 ist', 'Wenn mindestens einer 1 ist', 'Wenn beide 1 sind'],
      chipsWhen: (api) => api.st.visited.size === 4,
      chipsText: 'Alle vier Zeilen sind aufgedeckt. Wann gibt das Gatter eine 1?',
      instant: 'chips',
      peek: (api) => (api.st.visited.size ? `${api.st.visited.size} von 4 Zeilen aufgedeckt.` : false),
      check(api, ctx) { if (ctx.answer === 0) return true; return ctx.answer === 1 ? 'Das wäre ODER. Schau auf die Zeile 1 1: Was gibt das Gatter dort?' : 'Das wäre UND. Schau auf die Zeilen 0 1 und 1 0.'; },
      doneText: () => 'Genau: XOR heißt „entweder–oder“, genau einer von beiden. In Formeln schreibt man dafür ⊕. Gebaut ist es aus ODER, UND und NICHT: „mindestens einer, aber nicht beide“.',
      hints: ['Du brauchst alle vier Kombinationen. Bei 1 1 ist das ODER an, das UND auch, das NICHT dreht das UND um, und das letzte UND bekommt eine 1 und eine 0.'] },
    { id: 'LHM2', m: 2, text: 'Bau den Halbaddierer: Wähl für die Stelle S und für den Übertrag C je ein Gatter, bis alle vier Rechnungen in der Tabelle stimmen.',
      start(api) { api.resetHA(); },
      check(api) { const st = api.st.ha; if (!st.S || !st.C) return false; const n = api.haCorrect(); return n === 4 ? true : `${n} von 4 Rechnungen stimmen. Schau, welche Zeile ein ✗ hat.`; },
      counters: (api) => [`Richtig: ${api.haCorrect()} / 4`],
      doneText: () => 'Stimmt in allen vier Zeilen: Die Stelle ist XOR, der Übertrag ist UND. 1 + 1 = 10, „0 hin, 1 im Sinn“. Oben im ersten Bild ist jetzt der Übertrag dazugekommen.',
      hints: ['Fang mit dem Übertrag an: Er ist nur bei 1 + 1 gleich 1. Welches Gatter gibt nur bei 1 1 eine 1?', 'Die Stelle ist 1, wenn genau einer der Eingänge 1 ist. Das ist das Gatter aus Mission 1.'] },
    { id: 'LHM3', m: 3, text: 'Im ersten Bild ist jetzt der ganze Halbaddierer zu sehen: Das UND aus dem XOR liefert gleich auch den Übertrag C. Wie viele Transistoren braucht er? UND und ODER kosten je 6, NICHT kostet 2 (Level 2).',
      start(api) { api.showHA(true); },
      chips: ['20', '26', '14'],
      instant: 'chips',
      check(api, ctx) { if (ctx.answer === 0) return true; return ctx.answer === 1 ? 'Das wäre mit einem eigenen UND nur für den Übertrag. Hier wird das UND im XOR mitbenutzt.' : 'Zu wenig. Zähl die Gatter im ersten Bild: zwei UND, ein ODER, ein NICHT.'; },
      doneText: () => '6 + 6 + 6 + 2 = 20 Transistoren: zwei UND, ein ODER, ein NICHT. Weil das UND doppelt dient, spart man ein ganzes Gatter.',
      hints: ['Zähl im ersten Bild die Gatter: Wie viele UND, wie viele ODER, wie viele NICHT?'] },
  ],
  card() {
    return {
      text: 'Zwei Bits zu addieren ist eine Tabelle mit vier Zeilen, und zwei Gatter erfüllen sie: Die Stelle ist XOR (genau einer ist 1), der Übertrag ist UND (beide sind 1). XOR selbst ist aus ODER, UND und NICHT gesteckt; wer das UND für den Übertrag mitbenutzt, kommt mit vier Gattern und 20 Transistoren aus. Im nächsten Level kommt ein dritter Eingang dazu, der Übertrag von rechts: der Volladdierer, und davon vier in Reihe addieren ganze Zahlen.',
      nums: '0 + 0 = 00 · 0 + 1 = 01 · 1 + 0 = 01 · 1 + 1 = 10<br>S = A XOR B (geschrieben A ⊕ B) · C = A UND B (geschrieben A ∧ B oder AB)<br>XOR = (A ODER B) UND NICHT (A UND B) · 2 × UND + ODER + NICHT = 6 + 6 + 6 + 2 = 20 Transistoren',
      hw: 'Die Zeichen in Formeln: ⊕ heißt XOR, ∧ oder einfach nebeneinander geschrieben heißt UND, ∨ heißt ODER, ¬ heißt NICHT. In echten Chips baut man XOR meist direkt aus Transistoren statt aus drei Gattern und spart so Fläche; ein Volladdierer kostet in Standard-CMOS 28 Transistoren. Dass ein Bauteil zwei Aufgaben übernimmt, wie hier das UND, ist beim Chipentwurf die Regel: Jeder gesparte Transistor zählt milliardenfach.',
    };
  },
});
/* ===== Level 7: Der Addierer ===== */
const L5 = M.define({
  n: 7, name: 'Der Addierer', slot: 'Rechnen', eyebrow: 'Rechnen ist Verdrahtung',
  part: 'Rechenwerk: vier Volladdierer in Reihe, eine sub-Leitung und ein Nullprüfer über den Summenbits',
  orient: {
    sehen: 'Oben zwei Zahlen A und B mit je 4 Bits. Darunter vier Kästen: Jeder addiert eine Stelle und reicht den Übertrag (die 1, die man sich beim schriftlichen Addieren merkt) nach links weiter. Darunter das Ergebnis S. Der orange Schalter „sub“ rechts macht aus Plus ein Minus. Ganz unten die Lampe Z: Sie leuchtet, wenn das Ergebnis 0000 ist.',
    tun: 'Klick die Bits von A und B, lies S und die Lampe Z ab. Später eine Reparatur: Eine Übertragsleitung ist kaputt, finde sie mit möglichst wenigen Messungen.',
    lernen: 'Rechnen ist Verdrahtung: Gatter, die den Übertrag weiterreichen. Ein einziges Steuerbit macht aus dem Addierer einen Subtrahierer, und „Ergebnis ist 0“ ist der Vergleich, den der Prozessor später für Entscheidungen braucht.',
  },
  sub: 'Ein Volladdierer ist der Halbaddierer aus Level 6 mit einem dritten Eingang c für den Übertrag von rechts. In Formeln: s = a ⊕ b ⊕ c (⊕ heißt XOR) und c′ = ab ∨ c(a ⊕ b) (ab heißt a UND b, ∨ heißt ODER). Vier davon in Reihe, der Übertrag wandert von rechts nach links.',
  build(L) {
    L.el = levelShell(this);
    const panel = H('div', 'panel', null, L.el.work);
    const svg = S('svg', { class: 'fig', viewBox: '0 0 480 330', role: 'group', 'aria-label': '4-Bit-Addierer mit Steuerbit sub und Nullprüfer' }, panel);
    svg.style.maxWidth = '640px'; svg.style.marginInline = 'auto';
    const st = { A: [1, 0, 1, 0], B: [1, 1, 0, 0], sub: 0, reached: new Set(), repair: false, broken: 0, suspect: null, shown: false, measures: 0 };
    const cx = (i) => 132 + (3 - i) * 84, yA = 32, yB = 80, yBp = 128, yFA = 190, yS = 256, cw = 40, ch = 34;
    const lab = (txt, y) => { const t = S('text', { x: 16, y: y + 5, class: 'lab' }, svg); t.textContent = txt; };
    lab('A', yA); lab('B', yB); lab('B′', yBp); lab('S', yS);
    function cell(x, y, o) {
      const g = S('g', { class: 'cell' + (o.click ? ' click' : '') + (o.calc ? ' calc' : '') + (o.ctl ? ' ctl' : '') }, svg);
      S('rect', { x: x - cw / 2, y: y - ch / 2, width: cw, height: ch, rx: 5 }, g);
      const t = S('text', { x, y: y + 6, 'text-anchor': 'middle' }, g);
      if (o.click) { g.setAttribute('tabindex', '0'); g.setAttribute('role', 'button'); g.addEventListener('click', o.click); g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); o.click(); } }); }
      return { g, t, set(v, aria, hid) { t.textContent = hid ? '?' : String(v); g.classList.toggle('on', !hid && !!v); g.classList.toggle('hid', !!hid); if (aria) g.setAttribute('aria-label', aria); if (o.click) g.setAttribute('aria-pressed', v ? 'true' : 'false'); } };
    }
    const cA = [], cB = [], cBp = [], cS = [], fa = [], carryW = [], carryT = [];
    for (let i = 0; i < 4; i++) {
      cA[i] = cell(cx(i), yA, { click: () => { st.A[i] ^= 1; st.shown = false; render(); L.touch(); } });
      cB[i] = cell(cx(i), yB, { click: () => { st.B[i] ^= 1; st.shown = false; render(); L.touch(); } });
      cBp[i] = cell(cx(i), yBp, { calc: true });
      cS[i] = cell(cx(i), yS, { calc: true });
    }
    const decA = S('text', { x: 470, y: yA + 5, 'text-anchor': 'end', class: 'val' }, svg), decB = S('text', { x: 470, y: yB + 5, 'text-anchor': 'end', class: 'val' }, svg), decS = S('text', { x: 470, y: yS + 5, 'text-anchor': 'end', class: 'val' }, svg);
    let tt = S('text', { x: 444, y: yBp - 24, 'text-anchor': 'middle', class: 't' }, svg); tt.textContent = 'sub';
    const c0w = S('path', { d: `M444 ${yBp + ch / 2} V${yFA} H${cx(0) + 30}`, class: 'wire ctl' }, svg);
    for (let i = 0; i < 3; i++) carryW[i] = S('line', { x1: cx(i) - 30, x2: cx(i + 1) + 30, y1: yFA, y2: yFA, class: 'wire pick' }, svg);
    carryW[3] = S('line', { x1: cx(3) - 30, x2: 64, y1: yFA, y2: yFA, class: 'wire pick' }, svg);
    /* Trefferflächen für den Verdacht: breit, fokussierbar, per Tastatur schaltbar */
    const hitW = carryW.map((w, i) => { const hit = S('line', { x1: i < 3 ? cx(i) - 8 : cx(3) - 8, x2: i < 3 ? cx(i + 1) + 8 : 56, y1: yFA, y2: yFA, class: 'hit', role: 'button', tabindex: '-1', 'aria-label': `Übertragsleitung c${sub(i + 1)} als Verdacht markieren` }, svg); const pick = () => { if (st.repair) { st.suspect = i + 1; render(); } }; hit.addEventListener('click', pick); hit.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } }); return hit; });
    const c4t = S('text', { x: 58, y: yFA + 4, 'text-anchor': 'end', class: 'val' }, svg);
    for (let i = 0; i < 3; i++) carryT[i] = S('text', { x: (cx(i) - 30 + cx(i + 1) + 30) / 2, y: yFA - 8, 'text-anchor': 'middle', class: 'cv' }, svg);
    const c0t = S('text', { x: 452, y: yFA - 8, class: 'cv' }, svg);
    const subCell = cell(444, yBp, { ctl: true, click: () => { st.sub ^= 1; st.shown = false; render(); L.touch(); } });
    for (let i = 0; i < 4; i++) { const g = S('g', { class: 'fa' }, svg); S('rect', { x: cx(i) - 30, y: yFA - 24, width: 60, height: 48, rx: 6 }, g); fa[i] = { t1: S('text', { x: cx(i), y: yFA - 6, 'text-anchor': 'middle', class: 's' }, g), t2: S('text', { x: cx(i), y: yFA + 13, 'text-anchor': 'middle' }, g) }; }
    // Nullprüfer: NOR über S3..S0
    for (let i = 0; i < 4; i++) S('path', { d: `M${cx(i)} ${yS + ch / 2} V${yS + 30} H${cx(1) - 20}`, class: 'wire thin' }, svg);
    const norG = S('g', { class: 'gate' }, svg);
    S('path', { d: `M${cx(1) - 20} ${yS + 22} Q${cx(1) + 10} ${yS + 30} ${cx(1) - 20} ${yS + 38} Q${cx(1) + 4} ${yS + 30} ${cx(1) - 20} ${yS + 22} Z` }, norG);
    S('circle', { cx: cx(1) + 14, cy: yS + 30, r: 4 }, norG);
    S('path', { d: `M${cx(1) + 18} ${yS + 30} H${cx(0) - 10}`, class: 'wire thin' }, svg);
    const zLamp = S('circle', { cx: cx(0) + 4, cy: yS + 30, r: 11, class: 'lampc' }, svg);
    const zT = S('text', { x: cx(0) + 4, y: yS + 54, 'text-anchor': 'middle', class: 'val' }, svg); zT.textContent = 'Z = Ergebnis ist 0000';
    tt = S('text', { x: cx(1) - 24, y: yS + 54, class: 'cv', 'text-anchor': 'middle' }, svg); tt.textContent = 'NOR';
    const out = H('div', 'col', null, panel);
    const repairRow = H('div', 'row', null, panel); repairRow.hidden = true;
    const measBtn = B('btn primary', 'Messen', repairRow, () => { if (!st.shown) { st.shown = true; st.measures++; } render(); if (L.ctx) M.renderMission(L); });
    const mCount = H('span', 'chip dim', null, repairRow); const susp = H('span', 'chip ctl', null, repairRow);
    H('p', 'caption', 'Klick auf die Bits von A und B. Der orange Schalter rechts ist ein Steuerbit. B′ und S werden von der Schaltung berechnet; in jedem Kasten steht a + b′ + c und die Summe. Vier dünne Leitungen führen die Summenbits in ein NOR: die Lampe Z leuchtet genau bei 0000.', panel);
    const val = (bits) => bits.reduce((s, b, i) => s + (b << i), 0), sgn = (v) => (v >= 8 ? v - 16 : v), ng = (n) => (n < 0 ? '−' + (-n) : String(n));
    function compute() {
      const Bp = st.B.map((b) => b ^ st.sub), S4 = [], C = [st.sub];
      for (let i = 0; i < 4; i++) { const sum = st.A[i] + Bp[i] + C[i]; S4[i] = sum & 1; let c = sum >> 1; if (st.repair && st.broken === i + 1) c = 0; C[i + 1] = c; }
      return { Bp, S4, C, a: val(st.A), b: val(st.B), s: val(S4) };
    }
    function render() {
      const r = compute(), hid = st.repair && !st.shown;
      for (let i = 0; i < 4; i++) {
        fa[i].t1.textContent = st.repair ? '' : `${st.A[i]}+${r.Bp[i]}+${r.C[i]}`; fa[i].t2.textContent = st.repair ? '?' : `= ${st.A[i] + r.Bp[i] + r.C[i]}`;
        cA[i].set(st.A[i], `A Stelle ${i}: ${st.A[i]}`); cB[i].set(st.B[i], `B Stelle ${i}: ${st.B[i]}`); cBp[i].set(r.Bp[i]); cS[i].set(r.S4[i], null, hid);
      }
      subCell.set(st.sub, `Steuerbit sub: ${st.sub}`);
      c0w.classList.toggle('on', !!st.sub); c0t.textContent = `c${sub(0)}=${r.C[0]}`;
      for (let i = 0; i < 3; i++) { carryW[i].classList.toggle('on', !st.repair && !!r.C[i + 1]); carryT[i].textContent = st.repair ? '' : String(r.C[i + 1]); }
      carryW[3].classList.toggle('on', !st.repair && !!r.C[4]);
      carryW.forEach((w, i) => { w.classList.toggle('suspect', st.repair && st.suspect === i + 1); w.classList.toggle('pick', st.repair); hitW[i].setAttribute('tabindex', st.repair ? '0' : '-1'); hitW[i].setAttribute('aria-pressed', st.repair && st.suspect === i + 1 ? 'true' : 'false'); });
      c4t.textContent = hid ? 'c₄=?' : `c${sub(4)}=${r.C[4]}`;
      decA.textContent = `= ${r.a}`; decB.textContent = `= ${r.b}`; decS.textContent = hid ? '= ?' : `= ${r.s}`;
      zLamp.classList.toggle('on', !hid && r.s === 0);
      out.replaceChildren();
      if (!st.repair) {
        const p1 = H('p', 'note', null, out); H('b', null, `${bin(r.a, 4)} ${st.sub ? '−' : '+'} ${bin(r.b, 4)} = ${bin(r.s, 4)}`, p1);
        if (!st.sub) H('p', 'note', `Ohne Vorzeichen: ${r.a} + ${r.b} = ${r.a + r.b}` + (r.C[4] ? `. Das passt nicht in 4 Bit: Übrig bleibt ${r.s}, der Übertrag c₄ = 1 trägt die 16 und fällt aus dem Register.` : '.'), out);
        else H('p', 'note', `Ohne Vorzeichen: ${r.a} − ${r.b}. Die Schaltung rechnet ${r.a} + ${val(r.Bp)} + 1 = ${r.a + val(r.Bp) + 1}, mod 16 also ${r.s}` + (r.a >= r.b ? `, das ist ${r.a - r.b}.` : `. Weil ${r.b} > ${r.a} ist, stimmt das ohne Vorzeichen nicht; c₄ = 0 zeigt es an.`), out);
        const sa = sgn(r.a), sb = sgn(r.b), ss = sgn(r.s), truth = st.sub ? sa - sb : sa + sb, ovf = truth < -8 || truth > 7;
        H('p', 'note', `Zweierkomplement: ${ng(sa)} ${st.sub ? '−' : '+'} ${sb < 0 ? '(' + ng(sb) + ')' : sb} = ${ng(ss)}${ovf ? `. Überlauf, richtig wäre ${ng(truth)}; die Bits sind dieselben, nur die Lesart ist anders.` : '.'}`, out);
        if (r.s === 0) H('p', 'note', st.sub && r.a === r.b && r.a !== 0 ? `Z leuchtet: A − B = 0, also A = B. So vergleicht ein Prozessor zwei Zahlen.` : 'Z leuchtet: Die vier Summenbits sind 0000; c₄ sieht der Nullprüfer nicht.', out);
      }
      repairRow.hidden = !st.repair;
      mCount.textContent = `Messungen: ${st.measures} / Par 1`; susp.textContent = st.suspect ? `Verdacht: c${sub(st.suspect)}` : 'Verdacht: Leitung anklicken';
      if (L.ctx) L.ctx.measures = st.measures;
    }
    render();
    return { st, compute, render, set(A, Bb, s) { st.A = A.slice(); st.B = Bb.slice(); st.sub = s; st.shown = false; render(); },
      startRepair() { st.repair = true; st.broken = 1 + Math.floor(Math.random() * 4); st.suspect = null; st.shown = false; st.measures = 0; st.wrongChecks = 0; st.A = [0, 0, 0, 0]; st.B = [0, 0, 0, 0]; st.sub = 0; render(); },
      stopRepair() { st.repair = false; render(); } };
  },
  freeplay(api, onLoad) { api.stopRepair(); if (onLoad) api.set([1, 0, 1, 0], [1, 1, 0, 0], 0); },
  missions: [
    { id: 'L5M1', m: 1, text: 'Rechne 5 + 3 und dann 9 + 7. Wo bleibt die 16, und warum leuchtet dabei die Z-Lampe?',
      start(api) { api.stopRepair(); api.set([0, 0, 0, 0], [0, 0, 0, 0], 0); api.st.reached = new Set(); },
      check(api) { const r = api.compute(); if (!api.st.sub) api.st.reached.add(`${r.a}+${r.b}`); const R = api.st.reached; const has = (k) => R.has(k); if (has('5+3') && has('9+7')) return true; if (has('5+3')) return '5 + 3 = 8. Jetzt 9 + 7.'; if (has('9+7')) return '9 + 7: Z leuchtet, c₄ = 1. Jetzt noch 5 + 3.'; return false; },
      counters: (api) => [`Erreicht: ${['5+3', '9+7'].filter((k) => api.st.reached.has(k)).length} / 2`],
      doneText: () => '9 + 7 = 16 = 1 0000: Die 16 steckt im Übertrag c₄, der links aus dem Register fällt. Z sieht nur die vier Summenbits, und die sind 0000.',
      hints: ['5 = 0101, 3 = 0011, 9 = 1001, 7 = 0111.', 'Schau auf die Leitung, die links aus dem letzten Volladdierer kommt: c₄ trägt die 16, die vier Summenbits sind 0000, und genau die prüft der Nullprüfer.'] },
    { id: 'L5M2', m: 2, text: 'Schalte sub ein. Rechne 7 − 2 und 2 − 7 und lies die Ergebnisse in beiden Brillen aus Level 4. Finde dann eine Subtraktion, bei der Z leuchtet, obwohl A nicht 0 ist.',
      start(api) { api.set([0, 0, 0, 0], [0, 0, 0, 0], 0); api.st.reached = new Set(); },
      check(api) { const r = api.compute(), R = api.st.reached; if (api.st.sub) { R.add(`${r.a}-${r.b}`); if (r.a === r.b && r.a !== 0) R.add('eq'); } const n = ['7-2', '2-7', 'eq'].filter((k) => R.has(k)).length; if (n === 3) return true; if (!api.st.sub) return false; if (R.has('7-2') && R.has('2-7')) return 'Jetzt eine Subtraktion mit A = B ≠ 0.'; return false; },
      counters: (api) => [`Erreicht: ${['7-2', '2-7', 'eq'].filter((k) => api.st.reached.has(k)).length} / 3`],
      doneText: () => '7 − 2 = 7 + 13 + 1 = 21 ≡ 5 (c₄ = 1). 2 − 7 = 2 + 8 + 1 = 11 = 1011: ohne Vorzeichen 11, im Zweierkomplement −5 (c₄ = 0). Und A − B = 0 genau bei A = B: So vergleicht ein Prozessor.',
      hints: ['Mit sub = 1 wird jedes Bit von B gekippt und c₀ = 1 gesetzt: A + ¬B + 1. 7 + 13 + 1 = 21, 21 mod 16 = 5. 2 + 8 + 1 = 11 = 1011, als Zweierkomplement −8 + 2 + 1 = −5.', 'A − B = 0 genau dann, wenn A = B: Stell beide gleich ein, zum Beispiel 6 − 6.'] },
    { id: 'L5M3', m: 3, text: 'Reparatur: Eine der vier Übertragsleitungen c₁ bis c₄ ist durchtrennt und liefert immer 0. Finde sie mit möglichst wenigen Messungen, klick sie an und drück „Prüfen“.',
      start(api) { api.startRepair(); },
      instant: 'check',
      check(api) { const s = api.st; if (!s.suspect) return 'Erst eine Übertragsleitung anklicken.'; if (s.suspect === s.broken) return true; s.wrongChecks++; return `c${sub(s.suspect)} ist heil, das war ein Fehlversuch. Miss mit einem Paar, bei dem der Übertrag durch alle Kästen läuft.`; },
      par: (api) => api.st.measures === 1 && !api.st.wrongChecks,
      counters: (api) => [`Messungen: ${api.st.measures} / Par 1`, `Fehlversuche: ${api.st.wrongChecks || 0}`],
      found: (api) => ({ broken: api.st.broken, measures: api.st.measures, wrongChecks: api.st.wrongChecks || 0 }),
      doneText: (api) => `Richtig, c${sub(api.st.broken)} war durchtrennt, gefunden mit ${api.st.measures} Messungen${api.st.wrongChecks ? ` und ${api.st.wrongChecks} Fehlversuchen` : ''}.`,
      hints: ['Such ein Zahlenpaar, bei dem der Übertrag durch alle vier Kästen laufen muss.', '1111 + 0001 tut das: Je nach Bruchstelle bleibt ein anderes Muster aus Einsen in S stehen (c₁: 1110, c₂: 1100, c₃: 1000, c₄: 0000 mit c₄ = 0).'] },
  ],
  card(api, f) {
    api.stopRepair();
    return {
      text: 'Rechnen ist Verdrahtung: s = a ⊕ b ⊕ c, c′ = ab ∨ c(a ⊕ b), viermal in Reihe. Ein Steuerbit macht aus A + B die Rechnung A + ¬B + 1 = A − B mod 16, und Überlauf ist kein Fehler, sondern Rechnen modulo 16. Der Nullprüfer Z = ¬(s₃ ∨ s₂ ∨ s₁ ∨ s₀) ist der Vergleich A = B, aber er leuchtet nur, solange die Eingänge anliegen.',
      nums: `9 + 7 = 16 = 1 0000: c₄ = 1, S = 0000, Z = 1 · 7 − 2 = 7 + 13 + 1 = 21 ≡ 5 · 2 − 7 = 2 + 8 + 1 = 11 = 1011 = −5<br>Reparatur: c${sub(f.broken || 0)} war durchtrennt, gefunden mit ${f.measures ?? '–'} Messungen${f.wrongChecks ? ` und ${f.wrongChecks} Fehlversuchen` : ''} (Par: 1 Messung mit A = 1111, B = 0001, kein Fehlversuch).`,
      hw: 'Ein Volladdierer kostet in Standard-CMOS 28 Transistoren. Ripple-Carry ist langsam (bei 64 Bit 64 Gatterlaufzeiten); echte Rechenwerke nutzen Carry-Lookahead oder Präfixaddierer wie Kogge-Stone mit log₂ 64 = 6 Stufen und addieren 64 Bit in weniger als einem Takt bei 4 GHz. Daneben liegen UND, ODER, XOR und Schieber im selben Block. Der Nullprüfer ist ein 64-Eingang-NOR-Baum; x86 und ARM speichern sein Ergebnis als Z-Flag und führen Carry und Overflow getrennt, RISC-V kennt keine Flags. c₄ wird hier bewusst nicht gespeichert; den Preis zeigt 4 × 4 in Level 10.',
    };
  },
});
/* ===== Prozessor-Panel (für Level 8, 9, 10) ===== */
function makeCpuPanel(L, host, opts) {
  opts = opts || {};
  const c = CPU.newCpu();
  const P = { c, locked: new Set(), gaps: new Set(), list: false, predict: null, running: null, timer: null, el: {} };
  const panel = H('div', 'panel', null, host);
  const grid = H('div', 'cpu', null, panel);
  const left = H('div', 'blk', null, grid), right = H('div', 'blk', null, grid);
  // Speicher
  const mh = H('div', 'blk-t', null, left); H('span', null, 'Speicher: das Programm (16 Zellen à 8 Bit)', mh); const pcT = H('span', null, '', mh);
  const fl = H('div', 'flbls', null, left); H('span', null, '', fl); const flb = H('div', 'byte', null, fl); const flbs = [3, 2, 2, 1].map((n) => { const s = H('span', null, '', flb); s.style.width = `${n * 26 + (n - 1) * 2}px`; return s; }); ['Op', 'rd', 'rs', 'x'].forEach((t, i) => (flbs[i].textContent = t));
  const rowsHost = H('div', 'memrows', null, left);
  const more = H('details', null, null, left); H('summary', null, 'Zellen 10 bis 15', more); const moreBody = H('div', 'memrows', null, more); moreBody.style.padding = '0 6px 8px';
  const rows = [];
  for (let a = 0; a < 16; a++) {
    const row = H('div', 'memrow', null, a < 10 ? rowsHost : moreBody);
    H('span', 'addr', String(a).padStart(2, '0'), row);
    const byte = H('div', 'byte', null, row);
    const bits = [];
    [[7, 6, 5], [4, 3], [2, 1], [0]].forEach((grp) => { const f = H('div', 'field', null, byte); grp.forEach((bi) => { const b = B('bit mem sm', '0', f, () => { if (P.locked.has(a)) return; c.mem[a] ^= 1 << bi; CPU.memChanged(c); if (L.ctx) L.ctx.bitClicks++; P.render(); L.touch(); }); b.id = `${opts.id}m${a}b${bi}`; bits[bi] = b; }); });
    const dis = H('div', 'dis', null, row);
    const disT = H('b', null, '', dis); const hexT = H('span', null, '', dis);
    const sel = H('select', null, null, dis); sel.hidden = true; sel.setAttribute('aria-label', `Befehl für Zelle ${a} wählen`);
    [['NOP', 'NOP'], ['LDI R0,0', 'LDI rd, imm'], ['ADD R0,R0', 'ADD rd, rs'], ['SUB R0,R0', 'SUB rd, rs'], ['JMP 0', 'JMP a'], ['JZ 0', 'JZ a'], ['OUT R0', 'OUT rs'], ['HLT', 'HLT']].forEach(([v, t]) => { const o = H('option', null, t, sel); o.value = v; });
    sel.addEventListener('change', () => { if (P.locked.has(a)) return; const base = CPU.asm(sel.value); const op = (base >> 5) & 7; const keep = c.mem[a] & ~0xE0; c.mem[a] = (op << 5) | (op === 0 || op === 7 ? 0 : keep); CPU.memChanged(c); if (L.ctx) L.ctx.bitClicks++; P.render(); L.touch(); });
    const lock = H('span', 'lock', '', dis);
    rows.push({ row, bits, disT, hexT, sel, lock });
  }
  H('hr', 'divider', null, left);
  const rh = H('div', 'blk-t', null, left); H('span', null, 'Register (4 Bit, mod 16)', rh); H('span', null, 'nur Anzeige', rh);
  const regs = [];
  for (let r = 0; r < 4; r++) {
    const row = H('div', 'regrow', null, left); H('span', 'rname', `R${r}`, row);
    const f = H('div', 'field', null, row); const bits = []; for (let i = 3; i >= 0; i--) bits[i] = H('span', 'bit sm', '0', f);
    const val = H('span', 'rval', '', row);
    const lamps = H('div', 'lamps', null, row); const lp = ['Weg zu x (rd)', 'Weg zu y (rs)'].map((t) => H('span', 'lamp', t, lamps));
    regs.push({ bits, val, lp });
  }
  // rechts: Takt
  const th = H('div', 'blk-t', null, right); H('span', null, 'Takt', th); const cnt = H('span', null, '', th);
  const phases = H('div', 'phases', null, right); const phEls = CPU.PH.map((p) => H('span', 'phase', p, phases));
  const btns = H('div', 'row', null, right);
  const bTick = B('btn primary', 'Nächster Takt', btns, () => { stopRun(); CPU.tick(c); P.render(); L.touch(); });
  const bInstr = B('btn', 'Ganzer Befehl', btns, () => { stopRun(); CPU.runInstr(c); P.render(); L.touch(); });
  const bRun = B('btn', 'Lauf', btns, () => { if (P.running) { stopRun(); return; } if (REDUCED) { CPU.runAll(c); P.render(); L.touch(); return; } P.running = setInterval(() => { CPU.tick(c); P.render(); if (CPU.stopped(c)) { stopRun(); L.touch(); } }, 40); P.render(); });
  const bAll = B('btn', 'Bis zum Ende', btns, () => { stopRun(); CPU.runAll(c); P.render(); L.touch(); });
  const bReset = B('btn', 'Zurücksetzen', btns, () => { stopRun(); CPU.reset(c); P.render(); L.touch(); });
  function stopRun() { if (P.running) { clearInterval(P.running); P.running = null; if (P.render) P.render(); } }
  const msg = H('p', 'msg', null, right); msg.setAttribute('aria-live', 'polite');
  const predBox = H('div', 'pred', null, right); predBox.hidden = true;
  const predLab = H('label', null, '', predBox); const predIn = H('input', null, null, predBox); predIn.type = 'number'; predIn.min = '0'; predIn.max = '99'; predIn.step = '1'; predIn.inputMode = 'numeric'; predIn.id = `${opts.id}pred`; predLab.htmlFor = predIn.id;
  const predBtn = B('btn', 'Festlegen', predBox, () => { const v = Number(predIn.value); if (predIn.value === '' || !Number.isInteger(v) || v < 0 || v > 99) { predT.textContent = 'Bitte eine ganze Zahl von 0 bis 99.'; return; } c.prediction.value = v; P.render(); L.touch(); });
  const predT = H('span', 'frozen', '', predBox);
  const dispRow = H('div', 'row', null, right); const disp = H('span', 'display', '–', dispRow); const dispSeq = H('span', 'seq', '', dispRow);
  H('hr', 'divider', null, right);
  H('div', 'blk-t', null, right).append(H('span', null, 'Befehlsregister: dieselben acht Bits, drei Lesarten'));
  const irHost = H('div', 'byte', null, right); const irBits = []; [[7, 6, 5], [4, 3], [2, 1], [0]].forEach((grp) => { const f = H('div', 'field', null, irHost); grp.forEach((bi) => (irBits[bi] = H('span', 'bit ctl sm', '0', f))); });
  const irKv = H('dl', 'kv', null, right); const kvv = (k) => { H('dt', null, k, irKv); return H('dd', null, '', irKv); };
  const irDis = kvv('als Befehl'), irNum = kvv('als Zahl'), irChr = kvv('als Zeichen');
  H('hr', 'divider', null, right);
  H('div', 'blk-t', null, right).append(H('span', null, 'Decoder: Opcode-Lampen'));
  const opHost = H('div', 'lamps', null, right); const opL = CPU.OPS.map((o, i) => { const l = H('span', 'lamp', `${bin(i, 3)} ${o}`, opHost); return l; });
  H('div', 'blk-t', null, right).append(H('span', null, 'Steuerleitungen (Formel aus b7 b6 b5)'));
  const lnHost = H('div', 'lamps', null, right); const lnL = CPU.LINE_DEFS.map(([k, name, formula]) => { const l = H('span', 'lamp', `${name} = ${formula}`, lnHost); l.title = `${name}: ${formula}`; l.dataset.k = k; return l; });
  H('hr', 'divider', null, right);
  H('div', 'blk-t', null, right).append(H('span', null, 'Rechenwerk'));
  const aluKv = H('dl', 'kv', null, right); const kv2 = (k) => { H('dt', null, k, aluKv); return H('dd', null, '–', aluKv); };
  const aluX = kv2('x'), aluY = kv2('y'), aluR = kv2('Ergebnis');
  const nullL = H('span', 'lamp', 'Nullprüfer: Ergebnis ist 0000', H('div', 'lamps', null, right));
  // Flag-Karte (Z-Zelle und PC-Weiche)
  let flag = null;
  if (opts.flag) {
    H('hr', 'divider', null, right);
    H('div', 'blk-t', null, right).append(H('span', null, 'Flag und Weiche'));
    const fsvg = S('svg', { class: 'fig', viewBox: '0 0 420 230', role: 'img', 'aria-label': 'Z-Zelle mit Zugangstransistor und die Weiche vor dem Programmzähler' }, right);
    fsvg.style.maxWidth = '460px';
    // Z-Zelle: Mini-Schleife
    let t = S('text', { x: 10, y: 18, class: 'cv' }, fsvg); t.textContent = 'vom Nullprüfer';
    const nullW = S('path', { d: 'M10 30 H70', class: 'wire' }, fsvg);
    const zAcc = S('g', { class: 'mos' }, fsvg); S('path', { d: 'M70 30 H80 M116 30 H126', class: 'ch' }, zAcc); const zCh = S('line', { x1: 80, x2: 116, y1: 30, y2: 30, class: 'ch' }, zAcc); S('line', { x1: 82, x2: 114, y1: 40, y2: 40, class: 'g' }, zAcc);
    const zLoadW = S('path', { d: 'M98 40 V62', class: 'wire ctl' }, fsvg);
    t = S('text', { x: 90, y: 60, class: 'ctlt', 'text-anchor': 'end' }, fsvg); t.textContent = 'Z-Übernahme';
    const zg = S('g', { class: 'gate' }, fsvg); S('path', { d: 'M140 14 L140 46 L176 30 Z' }, zg); S('circle', { cx: 181, cy: 30, r: 4 }, zg); S('path', { d: 'M176 62 L176 94 L140 78 Z' }, zg); S('circle', { cx: 135, cy: 78, r: 4 }, zg);
    S('path', { d: 'M185 30 H200 V78 H180 M131 78 H126 V30', class: 'wire thin' }, fsvg);
    const zCell = S('g', { class: 'cell ctl' }, fsvg); S('rect', { x: 212, y: 36, width: 44, height: 36, rx: 5 }, zCell); const zCellT = S('text', { x: 234, y: 61, 'text-anchor': 'middle' }, zCell);
    t = S('text', { x: 234, y: 92, class: 'cv', 'text-anchor': 'middle' }, fsvg); t.textContent = 'Z (Flipflop)';
    S('path', { d: 'M200 54 H212', class: 'wire thin' }, fsvg);
    // Weiche
    S('path', { d: 'M256 54 H300 V150 H316', class: 'wire thin' }, fsvg);
    t = S('text', { x: 10, y: 134, class: 'cv' }, fsvg); t.textContent = 'PC + 1';
    t = S('text', { x: 10, y: 180, class: 'cv' }, fsvg); t.textContent = 'Ziel (Bit 3–0)';
    const in0 = S('path', { d: 'M70 130 H160', class: 'wire' }, fsvg), in1 = S('path', { d: 'M100 176 H160', class: 'wire' }, fsvg);
    const in0T = S('text', { x: 152, y: 124, class: 'val', 'text-anchor': 'end' }, fsvg), in1T = S('text', { x: 152, y: 170, class: 'val', 'text-anchor': 'end' }, fsvg);
    S('path', { d: 'M160 112 L160 194 L210 170 L210 136 Z', class: 'box' }, fsvg);
    t = S('text', { x: 178, y: 158, class: 'cv', 'text-anchor': 'middle' }, fsvg); t.textContent = 'Mux';
    const outW = S('path', { d: 'M210 153 H260', class: 'wire' }, fsvg);
    const pcBox = S('g', { class: 'cell ctl' }, fsvg); S('rect', { x: 260, y: 135, width: 56, height: 36, rx: 5 }, pcBox); const pcBoxT = S('text', { x: 288, y: 160, 'text-anchor': 'middle' }, pcBox);
    t = S('text', { x: 288, y: 190, class: 'cv', 'text-anchor': 'middle' }, fsvg); t.textContent = 'PC';
    const selW = S('path', { d: 'M185 220 V194', class: 'wire ctl' }, fsvg);
    const selL = S('circle', { cx: 185, cy: 220, r: 7, class: 'lampc' }, fsvg);
    t = S('text', { x: 198, y: 224, class: 'ctlt' }, fsvg); t.textContent = 'PC laden = b7 ∧ ¬b6 ∧ (¬b5 ∨ Z)';
    flag = { nullW, zAcc, zLoadW, zCellT, zCell, in0, in1, in0T, in1T, outW, pcBoxT, selW, selL };
  }
  P.render = function () {
    const f = CPU.fields(c.ir), Ls = CPU.lines(c.ir, c.z), stopped = CPU.stopped(c);
    pcT.textContent = `PC = ${c.pc}`;
    rows.forEach((r, a) => {
      const b = c.mem[a], mask = CPU.careMask(b), names = CPU.fieldNames(b);
      for (let i = 0; i < 8; i++) { const on = (b >> i) & 1, dc = !((mask >> i) & 1); r.bits[i].textContent = dc ? (on ? 'x' : 'x') : String(on); r.bits[i].classList.toggle('on', !!on); r.bits[i].classList.toggle('dc', dc); r.bits[i].disabled = P.locked.has(a); r.bits[i].setAttribute('aria-label', `Zelle ${a}, Bit ${i}: ${on}${dc ? ', ohne Wirkung' : ''}`); }
      r.disT.textContent = CPU.dis(b); r.hexT.textContent = `${hex2(b)} · ${b}`;
      r.row.classList.toggle('is-pc', a === c.pc); r.row.classList.toggle('gap', P.gaps.has(a)); r.row.classList.toggle('locked', P.locked.has(a));
      r.sel.hidden = !P.list || P.locked.has(a); r.sel.value = ['NOP', 'LDI R0,0', 'ADD R0,R0', 'SUB R0,R0', 'JMP 0', 'JZ 0', 'OUT R0', 'HLT'][(b >> 5) & 7];
      r.lock.textContent = P.locked.has(a) ? 'gesperrt' : '';
      if (a === c.pc) names.forEach((n, i) => (flbs[i].textContent = n));
    });
    regs.forEach((r, i) => { const v = c.regs[i]; for (let k = 0; k < 4; k++) { r.bits[k].textContent = String((v >> k) & 1); r.bits[k].classList.toggle('on', !!((v >> k) & 1)); } r.val.textContent = `= ${v}${v >= 8 ? ` (oder −${16 - v})` : ''}`; const use = c.decoded && (f.op === 1 || f.op === 2 || f.op === 3 || f.op === 6); r.lp[0].classList.toggle('on', use && f.rd === i); r.lp[1].classList.toggle('on', c.decoded && (f.op === 2 || f.op === 3) && f.rs === i); });
    cnt.textContent = `Takte ${c.steps} · Befehle ${c.instr}`;
    phEls.forEach((el, i) => el.classList.toggle('next', i === c.phase && !stopped));
    bTick.textContent = stopped ? 'Nächster Takt' : `Nächster Takt: ${CPU.PH[c.phase]}`;
    bTick.disabled = stopped; bInstr.disabled = stopped; bAll.disabled = stopped; bRun.disabled = stopped && !P.running; bRun.textContent = P.running ? 'Stopp' : 'Lauf';
    msg.textContent = c.msg; msg.classList.toggle('bad', !!c.loop || c.limit);
    predBox.hidden = !P.predict; if (P.predict) { predLab.textContent = P.predict + ': '; predIn.disabled = c.prediction.frozen; predBtn.disabled = c.prediction.frozen; predT.textContent = c.prediction.frozen ? (c.prediction.value == null ? 'eingefroren ohne Wert: Zurücksetzen und vorher eintragen' : `festgelegt: ${c.prediction.value}`) : c.prediction.value == null ? '' : `vorgemerkt: ${c.prediction.value} (friert beim ersten Takt ein)`; }
    disp.textContent = c.out == null ? '–' : String(c.out); if (c.out != null) { const s = H('small', null, bin(c.out, 4)); disp.append(s); }
    dispSeq.textContent = c.outSeq.length ? `Anzeigefolge: ${c.outSeq.join(', ')}` : 'Anzeige: noch nichts ausgegeben';
    for (let i = 0; i < 8; i++) { irBits[i].textContent = String((c.ir >> i) & 1); irBits[i].classList.toggle('on', !!((c.ir >> i) & 1)); }
    irDis.textContent = CPU.dis(c.ir); irNum.textContent = `${c.ir} (hex ${hex2(c.ir)})`; irChr.textContent = c.ir >= 32 && c.ir < 127 ? `„${String.fromCharCode(c.ir)}“ in ASCII` : 'kein druckbares ASCII-Zeichen';
    opL.forEach((el, o) => el.classList.toggle('on', c.decoded && f.op === o));
    lnL.forEach((el) => el.classList.toggle('on', c.decoded && !!Ls[el.dataset.k]));
    const aluOn = c.alu && (f.op === 2 || f.op === 3) && c.phase !== 0;
    aluX.textContent = aluOn ? `R${f.rd} = ${bin(c.alu.x, 4)} (${c.alu.x})` : '–'; aluY.textContent = aluOn ? `R${f.rs} = ${bin(c.alu.y, 4)} (${c.alu.y})` : '–';
    aluR.textContent = aluOn ? `${bin(c.alu.x, 4)} ${f.op === 2 ? '+' : '−'} ${bin(c.alu.y, 4)} = ${bin(c.alu.r, 4)} (${c.alu.r})` : '–';
    nullL.classList.toggle('on', !!(aluOn && c.alu.r === 0));
    if (flag) {
      const zOpen = c.decoded && Ls.zLoad && (c.phase === 3 || c.phase === 0) && c.alu && c.alu.z != null;
      flag.zAcc.classList.toggle('on', !!zOpen); flag.zLoadW.classList.toggle('on', c.decoded && Ls.zLoad); flag.nullW.classList.toggle('on', !!(aluOn && c.alu.r === 0));
      flag.zCellT.textContent = `Z=${c.z}`; flag.zCell.classList.toggle('on', c.z === 1);
      const load = c.decoded && Ls.pcLoad && (f.op === 4 || f.op === 5);
      flag.selL.classList.toggle('on', !!load); flag.selW.classList.toggle('on', !!load);
      flag.in0.classList.toggle('on', c.decoded && !load); flag.in1.classList.toggle('on', !!load); flag.outW.classList.toggle('on', c.decoded);
      flag.in0T.textContent = String((c.pc + 1) & 15); flag.in1T.textContent = String(f.addr); flag.pcBoxT.textContent = `PC=${c.pc}`;
    }
  };
  P.setMem = (hex) => { c.mem = CPU.hexToMem(hex); P.base = c.mem.slice(); CPU.reset(c); c.prediction.value = null; stopRun(); P.render(); };
  P.setup = (o) => { P.locked = new Set(o.lock || []); P.gaps = new Set(o.gaps || []); P.list = !!o.list; P.predict = o.predict || null; P.render(); };
  P.render();
  return P;
}

/* ===== Mini-Panel: das Gatter „PC laden“ ===== */
function makeGatePanel(L, host) {
  const panel = H('div', 'panel', null, host);
  H('h3', null, 'Die Weiche als Gatter', panel);
  const split = H('div', 'split', null, panel); const left = H('div', 'col', null, split), right = H('div', 'col', null, split);
  const svg = S('svg', { class: 'fig', viewBox: '0 0 380 170', role: 'img', 'aria-label': 'Gatter PC laden aus b7, b6, b5 und Z' }, left);
  const st = { b7: 0, b6: 0, b5: 0, z: 0, visited: new Set() };
  const sws = {};
  [['b7', 24], ['b6', 60], ['b5', 96], ['z', 132]].forEach(([k, y]) => { const g = S('g', { class: 'sw', tabindex: '0', role: 'button' }, svg); S('rect', { x: 10, y: y - 14, width: 40, height: 28, rx: 6 }, g); const t = S('text', { x: 30, y: y + 5, 'text-anchor': 'middle' }, g); t.textContent = k === 'z' ? 'Z' : k; const on = () => { st[k] ^= 1; render(); L.touch(); }; g.addEventListener('click', on); g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); on(); } }); sws[k] = g; });
  const w = (d, cls) => S('path', { d, class: 'wire thin ' + (cls || '') }, svg);
  const w7 = w('M50 24 H230'), w6 = w('M50 60 H100'), w5 = w('M50 96 H100'), wz = w('M50 132 H160');
  const gates = S('g', { class: 'gate' }, svg);
  S('path', { d: 'M100 48 L100 72 L124 60 Z' }, gates); S('circle', { cx: 128, cy: 60, r: 4 }, gates);   // ¬b6
  S('path', { d: 'M100 84 L100 108 L124 96 Z' }, gates); S('circle', { cx: 128, cy: 96, r: 4 }, gates); // ¬b5
  const n6 = w('M132 60 H230'), n5 = w('M132 96 H160');
  S('path', { d: 'M160 84 Q190 84 200 114 Q190 144 160 144 Q172 114 160 84 Z' }, gates);               // ODER
  let t = S('text', { x: 180, y: 118, class: 'cv', 'text-anchor': 'middle' }, svg); t.textContent = '∨';
  const wo = w('M200 114 H230');
  S('path', { d: 'M230 10 L230 130 H260 A60 60 0 0 0 260 10 Z' }, gates);                            // UND3
  t = S('text', { x: 262, y: 74, class: 'cv', 'text-anchor': 'middle' }, svg); t.textContent = '∧';
  const wout = w('M320 70 H340');
  const lamp = S('circle', { cx: 352, cy: 70, r: 11, class: 'lampc' }, svg);
  t = S('text', { x: 352, y: 96, class: 'ctlt', 'text-anchor': 'middle' }, svg); t.textContent = 'PC laden';
  H('p', 'caption', 'PC laden = b7 ∧ ¬b6 ∧ (¬b5 ∨ Z). b7 b6 b5 sind die Opcode-Bits des Befehlsregisters, Z kommt aus der Z-Zelle.', left);
  const scroll = H('div', 'tt-scroll', null, right); const tbl = H('table', 'tt', null, scroll); const hd = H('tr', null, null, H('thead', null, null, tbl)); ['b7', 'b6', 'b5', 'Z', 'PC laden', 'Befehl'].forEach((h) => H('th', null, h, hd));
  const tb = H('tbody', null, null, tbl); const trs = [];
  for (let i = 0; i < 16; i++) { const tr = H('tr', null, null, tb); const b7 = i >> 3 & 1, b6 = i >> 2 & 1, b5 = i >> 1 & 1, z = i & 1; [b7, b6, b5, z].forEach((v) => H('td', null, String(v), tr)); const out = H('td', 'q', '?', tr); H('td', null, CPU.OPS[(b7 << 2) | (b6 << 1) | b5], tr); trs.push({ tr, out }); }
  const fnd = H('p', 'note', null, right);
  const F = (b7, b6, b5, z) => (b7 && !b6 && (!b5 || z)) ? 1 : 0;
  function render() {
    const key = (st.b7 << 3) | (st.b6 << 2) | (st.b5 << 1) | st.z; st.visited.add(key);
    Object.keys(sws).forEach((k) => sws[k].classList.toggle('on', !!st[k]));
    const out = F(st.b7, st.b6, st.b5, st.z);
    w7.classList.toggle('on', !!st.b7); w6.classList.toggle('on', !!st.b6); w5.classList.toggle('on', !!st.b5); wz.classList.toggle('on', !!st.z); n6.classList.toggle('on', !st.b6); n5.classList.toggle('on', !st.b5); wo.classList.toggle('on', !st.b5 || !!st.z); wout.classList.toggle('on', !!out); lamp.classList.toggle('on', !!out);
    trs.forEach((r, i) => { const v = st.visited.has(i); r.out.textContent = v ? String(F(i >> 3 & 1, i >> 2 & 1, i >> 1 & 1, i & 1)) : '?'; r.out.className = v ? (r.out.textContent === '1' ? 'one' : '') : 'q'; r.tr.classList.toggle('cur', i === key); });
    const ones = [...st.visited].filter((i) => F(i >> 3 & 1, i >> 2 & 1, i >> 1 & 1, i & 1)).length;
    fnd.textContent = `${st.visited.size} von 16 Zeilen gesehen, davon ${ones} mit PC laden = 1.`;
  }
  render();
  return { st, render, reset() { st.b7 = st.b6 = st.b5 = st.z = 0; st.visited = new Set(); render(); }, found: () => [8, 9, 11].every((k) => st.visited.has(k)) };
}

/* ===== RISC-V: add gegen sub ===== */
function buildRiscV(host) {
  const det = H('details', null, null, host); H('summary', null, 'Dasselbe in echt: RISC-V add und sub', det);
  const body = H('div', 'body', null, det);
  H('p', 'note', 'RISC-V ist ein offener Befehlssatz. Dort ist add x3, x1, x2 ein 32-Bit-Wort. Schalte auf sub: Es ändert sich genau Bit 30, in einfachen Entwürfen zusammen mit dem Opcode direkt die sub-Leitung des Addierers. Unser Bit 5 ist dieses Bit 30.', body);
  const row = H('div', 'row', null, body); const bAdd = B('btn', 'add', row), bSub = B('btn', 'sub', row);
  const wrap = H('div', 'rv-wrap', null, body); const rv = H('div', 'rv', null, wrap);
  const out = H('div', 'rv-out', null, body); const asmS = H('span', null, null, out); H('b', null, 'Assembler', asmS); const asmT = H('span', null, '', asmS); const hexS = H('span', null, null, out); H('b', null, 'Hex', hexS); const hexT = H('span', null, '', hexS);
  const cells = []; let pos = 31, isSub = false;
  [['funct7', 7, 'Variante'], ['rs2', 5, 'Quelle: x2'], ['rs1', 5, 'Quelle: x1'], ['funct3', 3, 'Variante'], ['rd', 5, 'Ziel: x3'], ['opcode', 7, 'Rechenbefehl']].forEach(([name, len, note]) => { const fd = H('div', 'rv-field', null, rv); const bits = H('div', 'rv-bits', null, fd); for (let j = 0; j < len; j++) { cells[pos] = H('span', 'rv-bit' + (pos === 30 ? ' key' : ''), '0', bits); pos--; } H('span', 'rv-name', `${name} · Bit ${pos + len}–${pos + 1}`, fd); H('span', 'rv-note', note, fd); });
  function upd() { const w = (((isSub ? 0b0100000 : 0) << 25) | (2 << 20) | (1 << 15) | (3 << 7) | 0b0110011) >>> 0; for (let i = 0; i < 32; i++) { const b = (w >>> i) & 1; cells[i].textContent = b; cells[i].classList.toggle('on', !!b); } hexT.textContent = '0x' + w.toString(16).toUpperCase().padStart(8, '0'); asmT.textContent = isSub ? 'sub x3, x1, x2' : 'add x3, x1, x2'; bAdd.setAttribute('aria-pressed', isSub ? 'false' : 'true'); bSub.setAttribute('aria-pressed', isSub ? 'true' : 'false'); }
  bAdd.addEventListener('click', () => { isSub = false; upd(); }); bSub.addEventListener('click', () => { isSub = true; upd(); });
  upd();
}
/* ===== Level 8: Der Befehl ===== */
const MEM = { L6: '25 2B 42 E0', L7a: '23 30', L7b: '23 29 62 C0 A6 82 E0', L7c: '23 29 62 A4 82 E0', L7d: '23 29 62 A5 82 E0', L8gap: '23 2C 30 39 00 6E 00 84 D0 E0', L8: '23 2C 30 39 50 6E A8 84 D0 E0' };
const unchanged = (c, base, from, to) => { for (let a = from; a <= to; a++) if (c.mem[a] !== base[a]) return false; return true; };
/* Nach einer Speicheränderung mitten im oder nach dem Lauf gilt das Ergebnis nicht mehr */
const STALE = 'Speicher geändert: Zurücksetzen und erneut laufen lassen.';
const stale = (c) => (c.stale ? STALE : null);
const L6 = M.define({
  n: 8, name: 'Der Befehl', slot: 'Steuern', eyebrow: 'Verstanden wird nichts, verdrahtet wird alles',
  part: 'Steuerwerk: Speicher 16 × 8 Bit, Befehlsregister, Decoder, Programmzähler mit +1',
  orient: {
    sehen: 'Links der Speicher: 16 Zellen mit je 8 Bits, darin das Programm (orange umrandet ist die Zelle, die als Nächstes drankommt). Das ist ein Arbeitsspeicher wie in Level 5: Das Programm wurde beim Einschalten aus dem Festspeicher hineinkopiert. Darunter die Register R0 bis R3: die Zahlen, mit denen gerade gerechnet wird. Rechts der Takt: „Nächster Takt“ lässt den Prozessor einen Schritt machen (Holen, Decodieren, Ausführen, Zurückschreiben). Das Befehlsregister zeigt die 8 Bits des aktuellen Befehls; die Lampen darunter zeigen, welche Leitungen diese Bits einschalten.',
    tun: 'Lass das Programm erst mit „Bis zum Ende“ laufen und lies R0 ab. Dann ändere ein einziges Bit in Zelle 2, drück „Zurücksetzen“ und lass es erneut laufen.',
    lernen: 'Ein Befehl ist auch nur ein Byte. Seine Bits schalten Transistoren: Ein Bit entscheidet, ob addiert oder subtrahiert wird. Der Prozessor versteht nichts, er ist verdrahtet.',
    vergleich: 'Ein Schienennetz: Die Gleise, also Leitungen und Gatter, liegen fest und ändern sich nie. Die Bits des Befehls stellen die Weichen und bestimmen, welche Strecke die Daten fahren: durch den Addierer oder daran vorbei, aus welchem Register, in welches Register. Der Zug versteht die Strecke nicht, er folgt den Weichen.',
  },
  sub: 'Ein Byte aus dem Speicher landet im Befehlsregister. Seine Bits liegen an Leitungen; drei davon wählen über UND-Gatter, welche Transistoren öffnen.',
  build(L) {
    L.el = levelShell(this);
    const P = makeCpuPanel(L, L.el.work, { id: 'c6' });
    buildRiscV(L.el.extra);
    return { P, c: P.c };
  },
  missions: [
    { id: 'L6M1', m: 1, text: 'In Zelle 2 steht 01000010: als Zahl 66, als Zeichen „B“, als Befehl ADD R0,R1. Mach daraus mit einem einzigen Klick ein SUB, setz zurück und lass das Programm bis HLT laufen.',
      start(api) { api.P.setMem(MEM.L6); api.P.setup({}); },
      check(api, ctx) { const c = api.c; const isSub = (c.mem[2] & 0xFE) === 0x62; if (c.stale) return isSub ? STALE : `Speicher geändert (Zelle 2 ist ${CPU.dis(c.mem[2])}). Zurücksetzen und erneut laufen lassen.`; if (!isSub) return c.halted ? M.fail(ctx, c.runs, `Gelaufen: R0 = ${c.regs[0]}, Zelle 2 ist noch ${CPU.dis(c.mem[2])}. Jetzt Bit 5 in Zelle 2 umklicken, zurücksetzen und erneut laufen lassen.`) : false; if (!c.halted) return 'Zelle 2 ist jetzt SUB R0,R1. Zurücksetzen und laufen lassen.'; return c.regs[0] === 2 && c.instr === 4 ? true : M.fail(ctx, c.runs, `R0 = ${c.regs[0]}: Nicht das erwartete 5 − 3. Zurücksetzen, dann laufen lassen.`); },
      par: (api, ctx) => ctx.bitClicks === 1,
      counters: (api, ctx) => [`Bit-Änderungen: ${ctx.bitClicks} / Par 1`],
      found: (api, ctx) => ({ clicks1: ctx.bitClicks }),
      doneText: (api) => `Geschafft: 01100010 = SUB R0,R1, R0 = ${api.c.regs[0]} nach ${api.c.instr} Befehlen (${api.c.steps} Takte). Für Mission 2 steht in Zelle 2 wieder 01000010.`,
      hints: ['ADD und SUB unterscheiden sich in Bit 5; die Lampe „sub“ geht an, sobald der Befehl neu geholt und decodiert ist. Dasselbe Bit macht in ASCII aus B ein b.', 'Eine Änderung im Speicher wirkt erst beim nächsten Holen: Zurücksetzen, dann laufen lassen.'] },
    { id: 'L6M2', m: 2, text: 'Schreib das Byte für A (65 = 01000001) in Zelle 2. Leg vorher fest, was nach dem Lauf in R0 steht, und lass es dann laufen.',
      start(api) { api.P.setMem(MEM.L6); api.P.setup({ predict: 'R0 nach HLT' }); },
      check(api, ctx) { const c = api.c; if (c.stale) return STALE; if (c.mem[2] !== 0x41) { if (c.mem[2] === 0x42) return false; if ((c.mem[2] & 0xFE) === 0x40) return 'Zelle 2 ist 64 = 01000000: Das rechnet dasselbe, aber gefragt ist das Byte für A, 65 = 01000001 (Bit 0 setzen).'; return `Zelle 2 ist ${c.mem[2]} = ${bin(c.mem[2], 8)} (${CPU.dis(c.mem[2])}). Gefragt ist 65 = 01000001.`; } if (!c.halted) return c.prediction.value == null ? 'Zelle 2 ist A. Jetzt die Vorhersage festlegen, dann laufen lassen.' : false; if (!c.prediction.frozen || c.prediction.value == null) return 'Vorhersage fehlt: Zurücksetzen und vorher eintragen.'; return c.prediction.value === c.regs[0] && c.regs[0] === 10 ? true : M.fail(ctx, c.runs, `Vorhergesagt ${c.prediction.value}, gelaufen R0 = ${c.regs[0]}. Zurücksetzen, neu festlegen, laufen lassen.`); },
      hints: ['01000001: Bit 7–5 = 010 ist ADD, Bit 4–3 = 00 wählt R0 als Ziel, Bit 2–1 = 00 wählt R0 als Quelle, Bit 0 liest der Decoder nicht.', 'ADD R0,R0 verdoppelt: 5 + 5 = 10.'] },
  ],
  card(api, f) {
    return {
      text: 'Ein Befehl ist ein Byte, dessen Bits fest an Steuerleitungen hängen: Sechs Formeln aus b7, b6, b5 schalten Schreiben, Mux imm, sub, Z-Übernahme, OUT und Halt, und Bit 4–3 und 2–1 öffnen Wege von und zu Registern. Dasselbe Byte ist 65, „A“ und ADD R0,R0: Verstanden wird nichts, verdrahtet wird alles.',
      nums: `01000010 = 66 = „B“ = ADD R0,R1 → R0 = 8 · 01100010 = 98 = „b“ = SUB R0,R1 → R0 = 2 (ein Bit, Nr. 5) · 01000001 = 65 = „A“ = ADD R0,R0 → R0 = 10; 01000000 täte dasselbe, Bit 0 hängt an keiner Leitung. Deine Bit-Änderungen in Mission 1: ${f.clicks1 ?? '–'} (Par 1).`,
      hw: 'RISC-V kodiert add und sub in 32 Bit und unterscheidet sie in Bit 30, das in einfachen Entwürfen zusammen mit dem Opcode die sub-Leitung treibt. Der Decoder ist eine Schicht aus UND-Gattern, ein Minterm je Opcode; bei RISC-V und ARM fest verdrahtet, bei x86 werden einfache Befehle ebenfalls fest verdrahtet übersetzt und nur komplexe über Mikrocode. Die vier Takte hier sind Zeitlupe: Decodieren und Ausführen sind im Chip keine Taktflanken, sondern dieselbe Ausbreitung von Spannungen in unter 0,25 ns; die Flanke ist das Zurückschreiben, an der Register, Z und PC gleichzeitig übernehmen. Das Rechenwerk rechnet in jedem Takt mit dem, was anliegt; ob das Ergebnis ankommt, entscheidet allein die Schreibleitung.',
    };
  },
});

/* ===== Level 9: Der Sprung ===== */
const L7 = M.define({
  n: 9, name: 'Der Sprung', slot: 'Sprung', eyebrow: 'Der Befehl hängt vom Ergebnis ab',
  part: 'Z-Flag (eine Speicherzelle aus Level 3 mit Tor) und die Weiche vor dem Programmzähler (ein Gatter plus Multiplexer)',
  orient: {
    sehen: 'Wie Level 8, plus die Karte „Flag und Weiche“ rechts unten: Z ist eine Speicherzelle aus Level 3, die sich merkt, ob das letzte Ergebnis 0 war. Die Weiche davor entscheidet, ob als Nächstes der folgende Befehl drankommt oder ein Sprungziel. Dazu ein kleines Panel, in dem du die Weiche als Gatter von Hand schaltest.',
    tun: 'Erst versuchst du 3 × 4 nur mit Addieren. Dann lässt du Programme laufen, die zählen und springen, taktest durch, sagst Ergebnisse vorher und reparierst ein hängendes Programm.',
    lernen: 'Erst der bedingte Sprung macht aus einer Liste von Befehlen ein Programm, das entscheiden und wiederholen kann. Das ist die Stelle, an der aus einem Rechenwerk ein Computer wird.',
    vergleich: 'Im Schienennetz aus Level 8 ist das Z-Bit eine Weiche, die das Ergebnis der letzten Fahrt stellt: War das Ergebnis 0, biegt der nächste Zug zum Sprungziel ab, sonst fährt er geradeaus zur nächsten Speicherzelle. So hängt die Strecke von den Daten ab, obwohl kein einziges Gleis verlegt wird.',
  },
  sub: 'Bis hierher hängt kein Befehl vom Ergebnis des vorigen ab. Ein Flipflop und ein Gatter mit vier Eingängen ändern das.',
  build(L) {
    L.el = levelShell(this);
    const P = makeCpuPanel(L, L.el.work, { id: 'c7', flag: true });
    const gate = makeGatePanel(L, L.el.work);
    return { P, c: P.c, gate };
  },
  missions: [
    { id: 'L7M1', m: 1, text: 'Rechne 3 × 4 nur mit ADD: Zelle 0 lädt R0 = 3, Zelle 1 löscht R2. Füll den Rest so, dass die Anzeige 12 zeigt und die Maschine hält. Dann: Was müsstest du für 3 × 5 ändern?',
      start(api) { api.P.setMem(MEM.L7a); api.P.setup({ list: true, lock: [0, 1] }); },
      chips: ['nur eine Konstante in Zelle 0 ändern', 'Befehle hinzufügen oder ändern', 'nichts, es rechnet beides'],
      chipsWhen: (api, ctx) => { const c = api.c; const ok = !c.stale && c.halted && c.out === 12 && !c.mem.some((b, a) => { const op = (b >> 5) & 7; return op === 4 || op === 5 || (a >= 2 && op === 1); }); if (ok) { ctx.addInstr = c.instr; ctx.addTicks = c.steps; } return ok; },
      chipsText: 'Die Anzeige zeigt 12. Und jetzt: Was wäre für 3 × 5 nötig?',
      instant: 'chips',
      peek(api) { const c = api.c; if (c.stale) return STALE; if (c.loop) return 'Hängt: Ohne HLT läuft der Programmzähler durch alle 16 Zellen und beginnt von vorn.'; if (c.mem.some((b) => ((b >> 5) & 7) === 4 || ((b >> 5) & 7) === 5)) return 'Nur mit ADD, OUT und HLT, ohne Sprünge.'; if (c.mem.some((b, a) => a >= 2 && ((b >> 5) & 7) === 1)) return 'Nur mit ADD, OUT und HLT: Die Konstanten stehen in Zelle 0 und 1, der Rest rechnet.'; if (c.halted && c.out !== 12) return `Angehalten mit Anzeige ${c.out == null ? '–' : c.out}. Es sollen 12 sein.`; return false; },
      check(api, ctx) { if (!ctx.chipsShown) return false; return ctx.answer === 1 ? true : ctx.answer === 0 ? 'Nein: Ein festes ADD-Programm rechnet c · a mod 16. Mit vier ADD liefert a = 5 die 20 ≡ 4, nicht 15; und 15 ist ungerade, also nie ein Vielfaches von 4.' : 'Nein: Nichts in diesem Programm hängt vom Wert eines Registers ab; es rechnet für jedes a dasselbe Vielfache.'; },
      found: (api, ctx) => ({ addInstr: ctx.addInstr, addTicks: ctx.addTicks }),
      hints: ['ADD R2,R0 = 01010000 viermal hintereinander, dann OUT R2 = 11010000 und HLT = 11100000. Die Befehlsliste je Zeile setzt die Opcode-Bits, rd und rs klickst du selbst.', 'Für den zweiten Teil: Nichts in diesem Programm kann vom Wert eines Registers abhängen, weil nichts darin verzweigt. Für jeden Faktor braucht es eine andere Befehlsfolge.'] },
    { id: 'L7M2', m: 2, text: 'Countdown mit Anzeige: 23 29 62 C0 A6 82 E0. Leg vorher fest, nach wie vielen Befehlen die Maschine hält, und takte dann durch. Beobachte, wer die Z-Zelle setzt, wer sie in Ruhe lässt und wer sie liest.',
      start(api) { api.P.setMem(MEM.L7b); api.P.setup({ predict: 'Befehle bis HLT' }); },
      check(api, ctx) { const c = api.c; if (c.stale) return STALE; if (!c.halted) return false; if (!c.prediction.frozen || c.prediction.value == null) return 'Vorhersage fehlt: Zurücksetzen und vorher eintragen.'; if (c.instr !== 14 || c.outSeq.join() !== '2,1,0') return M.fail(ctx, c.runs, `Gelaufen: ${c.instr} Befehle, Anzeige ${c.outSeq.join(', ')}. Das Speicherbild wurde verändert; stell 23 29 62 C0 A6 82 E0 wieder her.`); return c.prediction.value === 14 ? true : M.fail(ctx, c.runs, `Vorhergesagt ${c.prediction.value}, gezählt ${c.instr} Befehle. Zähl die Runden nach: Zurücksetzen, neu festlegen, laufen lassen.`); },
      hints: ['Eine Runde ist SUB, OUT, JZ, JMP. Wie viele Runden, und was fehlt in der letzten?', '2 LDI + 2 Runden à 4 + letzte Runde SUB, OUT, JZ (springt) + HLT = 2 + 8 + 3 + 1 = 14.'] },
    { id: 'L7M3', m: 3, text: 'Dieses Programm soll von 3 auf 0 zählen und halten, aber es hängt: 23 29 62 A4 82 E0. Lass es laufen, lies die Meldung, und repariere es mit genau einem Klick.',
      start(api) { api.P.setMem(MEM.L7c); api.P.setup({}); },
      check(api, ctx) { const c = api.c; if (c.stale) return STALE; if (c.loop) return M.fail(ctx, c.runs, `Hängt mit Periode ${c.loop.period}. Welcher Befehl schickt den Programmzähler zurück in die Schleife, obwohl Z = 1 war?`); if (!c.halted) return false; return c.regs[0] === 0 && c.pc === 5 && c.instr === 11 ? true : M.fail(ctx, c.runs, `Angehalten mit R0 = ${c.regs[0]} nach ${c.instr} Befehlen. Das Ziel: R0 = 0, HLT in Zelle 5.`); },
      par: (api, ctx) => ctx.bitClicks === 1,
      counters: (api, ctx) => [`Bit-Änderungen: ${ctx.bitClicks} / Par 1`],
      found: (api, ctx) => ({ clicks3: ctx.bitClicks }),
      doneText: (api) => `Repariert: Zelle 3 ist ${CPU.dis(api.c.mem[3])}. Die Maschine hält nach ${api.c.instr} Befehlen mit R0 = 0.`,
      hints: ['Bei Z = 1 springt JZ nach Zelle 4, und dort steht JMP 2: zurück in die Schleife. R0 läuft 0 → 15 → … und braucht 16 Runden bis zur nächsten Null, daher Periode 48 = 16 · 3.', 'Das Ziel muss die Adresse von HLT sein: 0101 = 5, also Zelle 3, Bit 0.'] },
    { id: 'L7M4a', m: 4, text: 'Die Weiche ist ein Gatter. Stell im Panel „Die Weiche als Gatter“ b7, b6, b5 und Z von Hand ein und finde alle Kombinationen, bei denen „PC laden“ leuchtet.',
      start(api) { api.gate.reset(); },
      check(api) { return api.gate.found() ? true : false; },
      counters: (api) => [`Zeilen mit 1 gefunden: ${[8, 9, 11].filter((k) => api.gate.st.visited.has(k)).length} / 3`],
      hints: ['PC laden = b7 ∧ ¬b6 ∧ (¬b5 ∨ Z). JMP = 100 lädt immer, JZ = 101 nur mit Z = 1; alle anderen Opcodes lassen den Multiplexer auf PC + 1.'] },
    { id: 'L7M4b', m: 4, text: 'Prüf es am Programm: Mach in Zelle 3 aus JZ ein JMP (ein Bit). Leg vorher fest, mit welchem R0 die Maschine hält.',
      start(api) { api.P.setMem(MEM.L7d); api.P.setup({ predict: 'R0 bei HLT' }); },
      check(api, ctx) { const c = api.c; if (c.stale) return STALE; if ((c.mem[3] & 0xEF) !== 0x85) return false; if (!c.halted) return c.prediction.value == null ? 'Zelle 3 ist JMP 5. Jetzt die Vorhersage festlegen, dann laufen lassen.' : false; if (!c.prediction.frozen || c.prediction.value == null) return 'Vorhersage fehlt: Zurücksetzen und vorher eintragen.'; return c.prediction.value === 2 && c.regs[0] === 2 && c.instr === 5 ? true : M.fail(ctx, c.runs, `Vorhergesagt ${c.prediction.value}, gelaufen R0 = ${c.regs[0]} nach ${c.instr} Befehlen. Zurücksetzen, neu festlegen, laufen lassen.`); },
      hints: ['JMP springt ohne Bedingung, also schon nach dem ersten SUB: 3 − 1 = 2. Z war 0, gesprungen wurde trotzdem.'] },
  ],
  card(api, f) {
    return {
      text: 'Z ist eine einzige Speicherzelle, die beim Zurückschreiben von ADD/SUB den Nullprüfer übernimmt (Tor an der Leitung Z-Übernahme) und ihn danach festhält, auch über OUT, LDI oder JMP hinweg. Die Weiche ist ein Gatter, PC laden = b7 ∧ ¬b6 ∧ (¬b5 ∨ Z), das den Programmzähler auf das Sprungziel statt auf PC + 1 setzt. Damit hängt der nächste Befehl vom Ergebnis des vorigen ab, und mit Speicher, Addierer und diesem einen Gatter ist die Maschine im Prinzip universell.',
      nums: `Nur ADD: ${f.addInstr ?? '–'} Befehle für 3 × 4, aber jede andere Aufgabe braucht ein anderes Programm · Countdown mit Anzeige: 14 Befehle = 56 Takte, Anzeige 2, 1, 0 · Reparatur: JZ 4 → JZ 5 mit ${f.clicks3 ?? '–'} Bit-Änderungen (Par 1) · JMP statt JZ: hält nach 5 Befehlen mit R0 = 2, Z = 0 · PC laden = 1 genau bei b7 b6 b5 Z ∈ {1000, 1001, 1011}`,
      hw: 'x86 (ZF in EFLAGS) und ARM (NZCV) haben so ein Flag-Register, das nur bestimmte Befehle setzen; MOV setzt wie unser LDI nichts. RISC-V hat gar keine Flags: beq rs1, rs2 rechnet rs1 ⊕ rs2 und prüft mit einem 64-Bit-NOR auf 0, direkt im Sprungbefehl. Echte Sprünge laden keine absolute Adresse, sondern addieren einen Versatz PC + imm, und der PC zählt in Bytes. Das Gatter PC laden kostet in Standard-CMOS 18 Transistoren, der Nullprüfer als NOR4 8. Im Fließband steht die Sprungentscheidung erst Takte später fest; moderne Prozessoren raten den Ausgang (Sprungvorhersage, über 95 % Treffer bei typischem Code) und verwerfen bei Fehlgriff 15 bis 20 bereits begonnene Befehle.',
    };
  },
});

/* ===== Level 10: Multiplikation ===== */
const is44 = (c) => (c.mem[0] === 0x24 && c.mem[1] === 0x2C) || (c.mem[0] === 0x2C && c.mem[1] === 0x24);
const L8 = M.define({
  n: 10, name: 'Multiplikation', slot: 'Programm', eyebrow: 'Was der Chip nicht kann, ersetzt ein Programm',
  part: 'Anzeige (OUT-Register) und das Programm im Speicher: die fertige Maschine',
  orient: {
    sehen: 'Den fertigen Rechner. Das große schwarze Feld rechts ist die Anzeige, die Ausgabe. Das Programm im Speicher multipliziert, indem es wiederholt addiert und mit dem Sprung aus Level 9 mitzählt.',
    tun: 'Füll die zwei Lücken im Programm, lass es laufen, lies die Anzeige. Dann rechne andere Zahlen, indem du nur die Konstanten in Zelle 0 und 1 änderst.',
    lernen: 'Eingabe (Zahlen im Speicher), Verarbeitung (Takt für Takt durch Steuerwerk und Rechenwerk), Ausgabe (Anzeige). Multiplizieren kann diese Hardware gar nicht; das Programm macht es aus Addieren und Springen.',
  },
  sub: 'Der Prozessor kann nur addieren, zählen und bedingt springen. Das reicht.',
  build(L) {
    L.el = levelShell(this);
    const P = makeCpuPanel(L, L.el.work, { id: 'c8', flag: true });
    return { P, c: P.c };
  },
  freeplay(api, onLoad) { if (onLoad) api.P.setMem(MEM.L8); api.P.setup({ list: true }); },
  missions: [
    { id: 'L8M1', m: 1, text: 'Das Programm für 3 × 4 hat zwei Lücken: Zelle 4 soll R2 um R0 erhöhen, Zelle 6 soll bei Z = 1 nach Zelle 8 springen. Füll die Bits und lass es laufen.',
      start(api) { api.P.setMem(MEM.L8gap); api.P.setup({ gaps: [4, 6], list: true }); },
      check(api, ctx) { const c = api.c, ok4 = (c.mem[4] & 0xFE) === 0x50, ok6 = (c.mem[6] & 0xEF) === 0xA8; const base = CPU.hexToMem(MEM.L8gap); const rest = [0, 1, 2, 3, 5, 7, 8, 9].every((a) => c.mem[a] === base[a]); if (!rest) return 'Nur Zelle 4 und 6 ändern, der Rest bleibt.'; if (c.stale) return STALE; if (c.loop) return M.fail(ctx, c.runs, `Hängt mit Periode ${c.loop.period}: ${!ok6 ? 'Ohne JZ zählt R1 über 0 hinaus bis 15 und wieder herunter.' : 'Prüf Zelle 4.'}`); if (!(ok4 && ok6)) return c.halted ? M.fail(ctx, c.runs, `Angehalten mit Anzeige ${c.out == null ? '–' : c.out}. ${ok4 ? 'Zelle 6 stimmt noch nicht.' : 'Zelle 4 stimmt noch nicht.'}`) : false; if (!c.halted) return c.steps === 0 ? 'Beide Lücken gefüllt. Jetzt laufen lassen.' : false; return c.out === 12 && c.instr === 21 ? true : M.fail(ctx, c.runs, `Angehalten mit Anzeige ${c.out} nach ${c.instr} Befehlen.`); },
      found: (api) => ({ instr34: api.c.instr, ticks34: api.c.steps }),
      doneText: (api) => `3 × 4 = ${api.c.out} nach ${api.c.instr} Befehlen = ${api.c.steps} Takten. Für Mission 2 bleibt das Programm, nur die Konstanten in Zelle 0 und 1 sind frei.`,
      hints: ['ADD = Opcode 010, Ziel R2 = 10, Quelle R0 = 00: 01010000.', 'JZ = 101, Ziel 8 = 1000: 10101000. Ohne das JZ zählt R1 über 0 hinaus bis 15; die Maschine meldet die Wiederholung nach 68 Befehlen.'] },
    { id: 'L8M2', m: 2, text: 'Rechne 5 × 3, indem du nur die beiden Konstanten änderst. Leg vorher fest, nach wie vielen Befehlen die Maschine hält.',
      start(api) { api.P.setMem(MEM.L8); api.P.setup({ lock: [2, 3, 4, 5, 6, 7, 8, 9], predict: 'Befehle bis HLT' }); },
      check(api, ctx) { const c = api.c; const base = CPU.hexToMem(MEM.L8); if (!unchanged(c, base, 2, 9)) return 'Zellen 2 bis 9 müssen bleiben.'; if (c.stale) return STALE; if (!c.halted) return false; if (c.out !== 15) return M.fail(ctx, c.runs, `Anzeige ${c.out}. Für 5 × 3 muss sie 15 zeigen: Konstanten in Zelle 0 und 1 prüfen.`); if (!c.prediction.frozen || c.prediction.value == null) return 'Vorhersage fehlt: Zurücksetzen und vorher eintragen.'; return c.prediction.value === c.instr ? true : M.fail(ctx, c.runs, `Vorhergesagt ${c.prediction.value}, gezählt ${c.instr} Befehle. Zurücksetzen, neu festlegen, laufen lassen.`); },
      found: (api) => ({ b: api.c.regs[0] === 5 ? 3 : 5, instr53: api.c.instr, ticks53: api.c.steps, order: api.c.regs[0] === 5 ? '5 in R0, 3 als Zähler' : '3 in R0, 5 als Zähler' }),
      hints: ['Die Konstante sind die untersten drei Bits von LDI: 5 = 101, 3 = 011.', 'Jede Runde kostet ADD, SUB, JZ, JMP = 4 Befehle, die letzte 3; dazu 4 LDI, OUT und HLT: 4b + 5, wobei b in R1, dem Zähler, steht.'] },
    { id: 'L8M3', m: 3, text: 'Rechne 4 × 4. Was zeigt die Anzeige, und warum?',
      start(api) { api.P.setMem(MEM.L8); api.P.setup({ lock: [2, 3, 4, 5, 6, 7, 8, 9] }); },
      chips: ['16', '0, weil 16 mod 16 = 0 ist und das Register 4 Bit hat', '15, weil 4 Bit bei 15 enden'],
      chipsWhen: (api) => { const c = api.c; return !c.stale && is44(c) && c.halted && c.out === 0; },
      chipsText: 'Die Anzeige zeigt 0. Warum?',
      instant: 'chips',
      peek(api) { const c = api.c; if (c.stale) return STALE; if (c.halted && !is44(c)) return `Angehalten mit Anzeige ${c.out}. Für 4 × 4: Zelle 0 = LDI R0,4 (00100100), Zelle 1 = LDI R1,4 (00101100).`; return false; },
      check(api, ctx) { if (!ctx.chipsShown) return false; return ctx.answer === 1 ? true : ctx.answer === 0 ? 'Nein: 16 braucht fünf Bits, 10000. Das fünfte Bit ist c₄ aus Level 7, und das speichert niemand.' : 'Nein: 4 Bit enden nicht bei 15, sie fangen bei 0 wieder an. 12 + 4 = 16 ≡ 0.'; },
      hints: ['Level 7, Mission 1: Wo blieb die 16? Hier hebt sie niemand auf, weil die Maschine kein Übertrags-Flag hat. Echte Programme prüfen das Carry-Flag, auch das ist ein bedingter Sprung.'] },
  ],
  card(api, f) {
    const b = f.b || 3, other = b === 3 ? 5 : 3;
    return {
      text: 'Multiplikation entsteht aus Addieren, Zählen und einem bedingten Sprung: a · b = a + a + … (b-mal), hier für 4b + 5 Befehle = 16b + 20 Takte. Die Multiplikation existiert nur als Pfad des Programmzählers durch den Speicher, den Z b-mal zurückbiegt. Die Hardware bleibt dieselbe, die Kosten hängen von der Darstellung ab, und 4 × 4 = 0 zeigt, dass der Rechner in ℤ/16ℤ lebt.',
      nums: `3 × 4: ${f.instr34 ?? 21} Befehle = ${f.ticks34 ?? 84} Takte · 5 × 3 mit ${f.order || '–'}: ${f.instr53 ?? '–'} Befehle = ${f.ticks53 ?? '–'} Takte; mit getauschten Faktoren wären es ${4 * other + 5} Befehle = ${16 * other + 20} Takte. Der kleinere Faktor gehört in den Zähler. · 4 × 4: 12 + 4 = 16 ≡ 0, c₄ fällt weg, Z = 1, Anzeige 0.`,
      hw: 'Echte CPUs haben einen Multiplizierer in Hardware (ein Feld aus Addierern, 64 × 64 Bit in 3 bis 4 Takten), aber nur als Beschleunigung; Division, Wurzel und alles Weitere laufen genauso als Schleifen aus Grundbefehlen, so haben 8-Bit-Prozessoren der 1970er multipliziert. Ein Takt dauert bei 4 GHz 0,25 ns, die 84 Takte hier wären 21 ns. Der Zustand deines Rechners: 33 Flipflops plus 128 Bit Programmspeicher, zusammen 161 gespeicherte Bits; ein heutiger Kern hat Milliarden Transistoren, aber dieselben drei Bausteine: Speicher lesen und schreiben, Rechnen, bedingter Sprung.',
    };
  },
});

/* ===== Start ===== */
buildTrace();
buildSlots();
{
  const saved = store.load();
  if (saved) { (saved.done || []).forEach((id) => G.done.add(id)); Object.assign(G.cards, saved.cards || {}); Object.assign(G.found, saved.found || {}); }
  if (!store.ok) $('#storeNote').hidden = false;
  M.levels.forEach((L) => {
    L.found = G.found[L.n] || {};
    const first = L.def.missions.findIndex((m) => !G.done.has(m.id));
    if (first < 0 && G.cards[L.n]) { L.idx = L.def.missions.length; L.ctx = null; if (L.def.freeplay) L.def.freeplay(L.api, true); else L.def.missions[L.def.missions.length - 1].start(L.api, M.newCtx(), L); M.renderMission(L); M.renderCard(L); }
    else M.startMission(L, first < 0 ? 0 : first);
  });
  M.renderProgress(); M.renderSchema(); M.renderGallery();
  $('#wipe').addEventListener('click', () => { G.done.clear(); for (const k in G.cards) delete G.cards[k]; for (const k in G.found) delete G.found[k]; store.wipe(); M.levels.forEach((L) => { L.found = {}; M.renderCard(L); M.startMission(L, 0); }); M.renderProgress(); M.renderSchema(); M.renderGallery(); });
  window.__app = { M, G, CPU, levels: M.levels };
}
})();
