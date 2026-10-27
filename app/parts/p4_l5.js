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
