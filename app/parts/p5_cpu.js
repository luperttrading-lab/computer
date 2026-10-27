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
