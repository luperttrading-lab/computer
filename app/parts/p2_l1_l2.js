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
