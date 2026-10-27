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
