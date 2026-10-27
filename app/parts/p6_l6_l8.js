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
