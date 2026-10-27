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
