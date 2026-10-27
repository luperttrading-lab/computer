/* Spielzeug-Prozessor: 8-Bit-Befehle, 16 Byte Speicher, R0–R3 à 4 Bit, Z-Flag, Anzeige.
   Opcode Bit 7–5: 000 NOP · 001 LDI rd,imm · 010 ADD rd,rs · 011 SUB rd,rs · 100 JMP a · 101 JZ a · 110 OUT rs · 111 HLT
   Felder: rd = Bit 4–3, rs = Bit 2–1, imm = Bit 2–0, a = Bit 3–0. Z wird nur beim Zurückschreiben von ADD/SUB gesetzt. */
(function (root) {
'use strict';
const OPS = ['NOP', 'LDI', 'ADD', 'SUB', 'JMP', 'JZ', 'OUT', 'HLT'];
const PH = ['Holen', 'Decodieren', 'Ausführen', 'Zurückschreiben'];
const LIMIT = 4096;

function fields(b) {
  return { op: (b >> 5) & 7, rd: (b >> 3) & 3, rs: (b >> 1) & 3, imm: b & 7, addr: b & 15 };
}
/* Maske der Bits, die der Decoder bei diesem Opcode liest. */
function careMask(b) {
  switch ((b >> 5) & 7) {
    case 1: return 0xFF;
    case 2: case 3: return 0xFE;
    case 4: case 5: return 0xEF;
    case 6: return 0xF8;
    default: return 0xE0;
  }
}
function dis(b) {
  const f = fields(b);
  switch (f.op) {
    case 0: return 'NOP';
    case 1: return `LDI R${f.rd}, ${f.imm}`;
    case 2: return `ADD R${f.rd}, R${f.rs}`;
    case 3: return `SUB R${f.rd}, R${f.rs}`;
    case 4: return `JMP ${f.addr}`;
    case 5: return `JZ ${f.addr}`;
    case 6: return `OUT R${f.rd}`;
    default: return 'HLT';
  }
}
/* Feldnamen für die Beschriftung der Bitgruppen 3|2|2|1 */
function fieldNames(b) {
  switch ((b >> 5) & 7) {
    case 1: return ['Op', 'rd', 'imm', ''];
    case 2: case 3: return ['Op', 'rd', 'rs', 'x'];
    case 4: case 5: return ['Op', 'x·a', 'a', 'a'];
    case 6: return ['Op', 'rs', 'x', 'x'];
    default: return ['Op', 'x', 'x', 'x'];
  }
}
function asm(line) {
  const m = line.trim().toUpperCase().replace(/,/g, ' ').split(/\s+/);
  const op = OPS.indexOf(m[0]);
  if (op < 0) throw new Error('unbekannt: ' + line);
  const r = (s) => { const n = +String(s).replace('R', ''); if (!(n >= 0 && n <= 3)) throw new Error('Register: ' + line); return n; };
  switch (op) {
    case 0: return 0;
    case 1: { const i = +m[2]; if (!(i >= 0 && i <= 7)) throw new Error('imm 0-7: ' + line); return (1 << 5) | (r(m[1]) << 3) | i; }
    case 2: case 3: return (op << 5) | (r(m[1]) << 3) | (r(m[2]) << 1);
    case 4: case 5: { const a = +m[1]; if (!(a >= 0 && a <= 15)) throw new Error('addr 0-15: ' + line); return (op << 5) | a; }
    case 6: return (6 << 5) | (r(m[1]) << 3);
    default: return 7 << 5;
  }
}
function hexToMem(hex) {
  const mem = new Array(16).fill(0);
  hex.trim().split(/\s+/).forEach((h, i) => { if (i < 16) mem[i] = parseInt(h, 16) & 255; });
  return mem;
}
/* Steuerleitungen aus den drei Opcode-Bits (und Z). Nur hieraus werden die Lampen gespeist. */
function lines(ir, z) {
  const b7 = (ir >> 7) & 1, b6 = (ir >> 6) & 1, b5 = (ir >> 5) & 1;
  return {
    write: !b7 && (b6 || b5),
    muxImm: !b7 && !b6 && !!b5,
    sub: !b7 && !!b6 && !!b5,
    zLoad: !b7 && !!b6,
    out: !!b7 && !!b6 && !b5,
    halt: !!b7 && !!b6 && !!b5,
    pcLoad: !!b7 && !b6 && (!b5 || z === 1),
  };
}
const LINE_DEFS = [
  ['write', 'Schreiben', '¬b7 ∧ (b6 ∨ b5)'],
  ['muxImm', 'Mux imm', '¬b7 ∧ ¬b6 ∧ b5'],
  ['sub', 'sub', '¬b7 ∧ b6 ∧ b5'],
  ['zLoad', 'Z-Übernahme', '¬b7 ∧ b6'],
  ['out', 'OUT', 'b7 ∧ b6 ∧ ¬b5'],
  ['halt', 'Halt', 'b7 ∧ b6 ∧ b5'],
  ['pcLoad', 'PC laden', 'b7 ∧ ¬b6 ∧ (¬b5 ∨ Z)'],
];

function newCpu(mem) {
  const c = { mem: (mem || new Array(16).fill(0)).slice(), prediction: { value: null, frozen: false } };
  reset(c);
  return c;
}
function reset(c) {
  c.regs = [0, 0, 0, 0]; c.pc = 0; c.ir = 0; c.z = 0; c.out = null; c.outSeq = [];
  c.halted = false; c.phase = 0; c.alu = null; c.decoded = false; c.steps = 0; c.instr = 0;
  c.msg = 'Zurückgesetzt: PC = 0, Register 0, Z = 0. Der Speicher bleibt.';
  c.trace = []; c.seen = new Map(); c.loop = null; c.limit = false; c.lastInstr = null;
  c.prediction.frozen = false; c.stale = false; c.runs = (c.runs || 0) + 1;
  c.seen.set(stateKey(c), 0);
  return c;
}
/* Nach einer Speicheränderung läuft ein anderes Programm: Zustandshistorie neu beginnen; nach einem begonnenen Lauf gilt das Ergebnis als veraltet */
function memChanged(c) {
  c.seen = new Map([[stateKey(c), c.instr]]); c.loop = null;
  if (c.steps > 0) c.stale = true;
}
function stateKey(c) { return (c.pc << 17) | (c.regs[0] << 13) | (c.regs[1] << 9) | (c.regs[2] << 5) | (c.regs[3] << 1) | c.z; }
function stopped(c) { return c.halted || !!c.loop || c.limit; }

/* Ein Takt = eine Phase. */
function tick(c) {
  if (stopped(c)) return c.msg;
  if (c.steps === 0 && !c.prediction.frozen) c.prediction.frozen = true;
  const ph = c.phase;
  const f = fields(c.ir);
  if (ph === 0) {
    c.ir = c.mem[c.pc]; c.decoded = false; c.alu = null;
    c.msg = `Holen: Das Befehlsregister übernimmt ${c.ir.toString(2).padStart(8, '0')} aus Zelle ${c.pc}. Noch ist keine Steuerleitung geschaltet.`;
  } else if (ph === 1) {
    c.decoded = true;
    const d = dis(c.ir), L = lines(c.ir, c.z);
    const what = {
      0: 'Keine Leitung schaltet, der Takt läuft leer.',
      1: `Mux imm legt die Konstante ${f.imm} an den Eingang von R${f.rd}, Schreiben ist an.`,
      2: `Wege von R${f.rd} und R${f.rs} zum Rechenwerk sind offen, Schreiben und Z-Übernahme sind an.`,
      3: `Die sub-Leitung ist an (Bit 5), Wege von R${f.rd} und R${f.rs} sind offen, Schreiben und Z-Übernahme sind an.`,
      4: `PC laden ist an: b7 ∧ ¬b6 ∧ (¬b5 ∨ Z) mit b5 = 0 ist immer 1. Ziel ${f.addr}.`,
      5: `PC laden hängt an Z: b7 ∧ ¬b6 ∧ (¬b5 ∨ Z) = ${L.pcLoad ? 1 : 0}, denn Z = ${c.z}. Der Nullprüfer ist dunkel, es liegt keine Rechnung an; Z hält den Wert vom letzten ADD/SUB.`,
      6: `Weg von R${f.rd} zur Anzeige ist offen. Z bleibt stehen, OUT liest nur.`,
      7: 'Die Halt-Leitung ist an, der Takt wird nach diesem Befehl blockiert.',
    }[f.op];
    c.msg = `Decodieren: ${d}. ${what}`;
  } else if (ph === 2) {
    if (f.op === 2 || f.op === 3) {
      const x = c.regs[f.rd], y = c.regs[f.rs];
      const raw = f.op === 2 ? x + y : x - y, r = raw & 15;
      c.alu = { x, y, r, z: r === 0 ? 1 : 0, raw };
      c.msg = `Ausführen: ${x} ${f.op === 2 ? '+' : '−'} ${y} = ${raw}${raw !== r ? `, mod 16 also ${r}` : ''}. Der Nullprüfer ${r === 0 ? 'leuchtet: Ergebnis 0000' : 'bleibt dunkel'}.`;
    } else if (f.op === 1) {
      c.alu = { r: f.imm };
      c.msg = `Ausführen: Die Konstante ${f.imm} liegt am Eingang von R${f.rd}. Das Rechenwerk ist nicht beteiligt.`;
    } else if (f.op === 4) {
      c.alu = { jump: true, target: f.addr };
      c.msg = `Ausführen: Die Weiche steht auf „Ziel“, der Programmzähler wird ${f.addr} übernehmen.`;
    } else if (f.op === 5) {
      c.alu = { jump: c.z === 1, target: f.addr };
      c.msg = c.z === 1 ? `Ausführen: JZ liest Z = 1, die Weiche steht auf „Ziel“: PC wird ${f.addr} statt ${(c.pc + 1) & 15}.` : `Ausführen: JZ liest Z = 0, die Weiche bleibt auf PC + 1 = ${(c.pc + 1) & 15}.`;
    } else if (f.op === 6) {
      c.alu = { r: c.regs[f.rd] };
      c.msg = `Ausführen: R${f.rd} = ${c.regs[f.rd]} liegt an der Anzeige.`;
    } else if (f.op === 7) {
      c.msg = 'Ausführen: Halt.';
    } else {
      c.msg = 'Ausführen: nichts zu tun.';
    }
  } else {
    let next = (c.pc + 1) & 15;
    const before = { regs: c.regs.slice(), z: c.z };
    if (f.op === 2 || f.op === 3) { c.regs[f.rd] = c.alu.r; c.z = c.alu.z; c.msg = `Zurückschreiben: R${f.rd} = ${c.alu.r}. Z-Übernahme ist offen, Z = ${c.z} (${f.op === 2 ? 'ADD' : 'SUB'}: ${c.alu.x} ${f.op === 2 ? '+' : '−'} ${c.alu.y} = ${c.alu.raw}).`; }
    else if (f.op === 1) { c.regs[f.rd] = f.imm; c.msg = `Zurückschreiben: R${f.rd} = ${f.imm}. Z bleibt ${c.z}, LDI rechnet nicht.`; }
    else if (f.op === 4 || f.op === 5) { if (c.alu.jump) { next = f.addr; c.msg = `Zurückschreiben: Programmzähler = ${next} (geladen).`; } else c.msg = `Zurückschreiben: kein Sprung, Programmzähler = ${next}.`; }
    else if (f.op === 6) { c.out = c.alu.r; c.outSeq.push(c.out); c.msg = `Zurückschreiben: Die Anzeige zeigt ${c.out}. Z bleibt ${c.z}.`; }
    else if (f.op === 7) { c.halted = true; next = c.pc; c.msg = `Angehalten nach ${c.instr + 1} Befehlen (${c.steps + 1} Takte). PC bleibt auf ${c.pc}.`; }
    else c.msg = `Zurückschreiben: nichts geändert, Programmzähler = ${next}.`;
    c.pc = next; c.instr++;
    c.lastInstr = { n: c.instr, pc: c.trace.length ? null : 0, byte: c.ir, asm: dis(c.ir), regs: c.regs.slice(), z: c.z, pcNext: next, before };
    c.trace.push(c.lastInstr);
    if (!c.halted) {
      const key = stateKey(c);
      if (c.seen.has(key)) {
        const first = c.seen.get(key);
        c.loop = { first, now: c.instr, period: c.instr - first };
        c.msg = `Hängt: Der Zustand (PC, R0–R3, Z) nach Befehl ${c.instr} ist derselbe wie nach Befehl ${first}, Periode ${c.loop.period} Befehle. Ohne Eingabe von außen wiederholt sich das ewig.`;
      } else {
        c.seen.set(key, c.instr);
        if (c.instr >= LIMIT) { c.limit = true; c.msg = `Laufbegrenzung erreicht: ${LIMIT} Befehle ohne HLT.`; }
      }
    }
  }
  c.phase = (ph + 1) % 4; c.steps++;
  return c.msg;
}
function runInstr(c) { do { tick(c); } while (c.phase !== 0 && !stopped(c)); }
function runAll(c) { let n = 0; while (!stopped(c) && n < LIMIT + 1) { runInstr(c); n++; } return n; }

root.CPU = { OPS, PH, LIMIT, fields, careMask, dis, fieldNames, asm, hexToMem, lines, LINE_DEFS, newCpu, reset, memChanged, tick, runInstr, runAll, stopped, stateKey };
})(typeof module !== 'undefined' ? module.exports : window);
