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
