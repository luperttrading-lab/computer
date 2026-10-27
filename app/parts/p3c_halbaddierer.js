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
