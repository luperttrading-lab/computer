const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch();
  const errs = [];
  const p = await b.newPage({ viewport: { width: 1200, height: 900 } });
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  await p.goto('file://' + path.resolve('check.html'));
  await p.waitForTimeout(500);
  await p.evaluate(() => { try { localStorage.clear(); } catch(e){} });
  const status = (n) => p.evaluate((n) => { const L = window.__app.levels[n]; return { idx: L.idx, status: L.ctx && L.ctx.status, done: [...window.__app.G.done].filter(x=>window.__app.levels[n].def.missions.some(m=>m.id===x)), card: !!window.__app.G.cards[n] }; }, n);
  const wait = (ms=800) => p.waitForTimeout(ms);
  const log = async (n, what) => console.log(`L${n} ${what}:`, JSON.stringify(await status(n)));
  // Level 0
  const slide = (id, v) => p.evaluate(([id, v]) => { const i = document.getElementById(id); i.value = v; i.dispatchEvent(new Event('input')); }, [id, v]);
  await slide('r0', '3'); await wait(); await log(0, 'M1');
  await p.click('#level0 .mission button:has-text("verdoppelt")'); await wait(300); await slide('u0', '12'); await wait(); await log(0, 'M2');
  await p.click('#closed0'); await wait(); await p.click('#level0 .mission button:has-text("Ja:")'); await wait(300); await log(0, 'M3');
  await p.click('#tr0'); await p.click('#level0 button:has-text("Gate = 1")'); await wait(); await log(0, 'M4a');
  await p.click('#level0 button:has-text("Gate = 0")'); await wait(); await log(0, 'M4b');
  // L1
  await p.evaluate(() => window.__app.levels[1].api.set(1)); await wait(); await log(1, 'M1');
  await p.evaluate(() => window.__app.levels[1].api.set(0.5)); await wait();
  await p.click('#level1 .mission .m-acts >> text=weder noch'); await wait(300); await log(1, 'M2');
  // L2
  for (const [a,b] of [[0,1],[1,1],[1,0],[0,0]]) { await p.evaluate(([a,b]) => { const s = window.__app.levels[2].api.st; s.a=a; s.b=b; s.clicked=true; window.__app.levels[2].api.renderBB; }, [a,b]); await p.click('#level2 svg >> text=A'); await p.click('#level2 svg >> text=A'); }
  await p.click('#level2 svg >> text=B'); await wait(); await p.click('#level2 svg >> text=A'); await wait(); await p.click('#level2 svg >> text=B'); await wait(); await log(2, 'M1');
  await p.click('#level2 .panel:nth-of-type(2) button:has-text("Messen")'); await p.click('#level2 .panel:nth-of-type(2) svg >> text=b'); await p.click('#level2 .panel:nth-of-type(2) button:has-text("Messen")'); await p.click('#level2 .panel:nth-of-type(2) svg >> text=a'); await p.click('#level2 .panel:nth-of-type(2) button:has-text("Messen")');
  const hidden = await p.evaluate(() => window.__app.levels[2].api.bb.hidden); await p.click(`#level2 .panel:nth-of-type(2) button:text-is("${hidden}")`); await p.click('#level2 .mission button:has-text("Prüfen")'); await wait(300); await log(2, 'M2');
  // L3 M1
  await p.click('#level3 button:has-text(\"Wortleitung öffnen\")'); await p.click('#level3 button:has-text(\"Bitleitung = 1\")'); await p.click('#level3 button:has-text(\"Wortleitung schließen\")'); await p.click('#level3 button:has-text(\"Strom aus und wieder an\")'); await p.click('#level3 button:has-text(\"Strom aus und wieder an\")'); await wait(); await log(3, 'M1');
  // L3 M2a
  await p.evaluate(() => window.__app.levels[3].api.setK(3)); await p.evaluate(() => window.__app.levels[3].touch()); await wait(); await p.evaluate(() => window.__app.levels[3].api.setK(4.25)); await p.evaluate(() => window.__app.levels[3].touch()); await wait(); await log(3, 'M2a');
  // M2b
  await p.click('#level3 button:has-text(\"A₀ = ½ + 10⁻¹\")'); await p.click('#level3 button:has-text(\"A₀ = ½ + 10⁻⁶\")'); await wait(); await log(3, 'M2b');
  // M3a: DRAM manual: 500 ms chip time = 8 s; press refresh every 1.2 s
  for (let i = 0; i < 8; i++) { await p.waitForTimeout(1100); await p.click('#level3 .refresh'); }
  await wait(1200); await log(3, 'M3a');
  // M3b: auto, tau 90 → lost, then 95
  await p.evaluate(() => { const api = window.__app.levels[3].api; const tIn = document.querySelector('#tau'); tIn.value = '90'; tIn.dispatchEvent(new Event('input')); });
  await wait(3500);
  await p.evaluate(() => { const tIn = document.querySelector('#tau'); tIn.value = '95'; tIn.dispatchEvent(new Event('input')); });
  await wait(3500); await log(3, 'M3b');
  // L4
  await p.click('#n3'); await p.click('#n2'); await p.click('#n0'); await wait(); await log(4, 'M1a');
  await p.click('#n3'); await p.click('#n2'); await p.click('#n0'); await wait(); await log(4, 'M1b');
  // Speicher (Level 5)
  const ram = (r, v) => p.evaluate(([r, v]) => { const api = window.__app.levels[5].api; for (let i = 0; i < 4; i++) { const want = (v >> i) & 1, cur = (api.st.ram[r] >> i) & 1; if (want !== cur) document.querySelector('#ram' + r + 'b' + i).click(); } }, [r, v]);
  const setAddr = (a) => p.evaluate((a) => { const api = window.__app.levels[5].api; for (let i = 0; i < 2; i++) { if (((api.st.addr >> i) & 1) !== ((a >> i) & 1)) document.querySelector('#addr' + i).click(); } }, a);
  const pw = () => p.click('#level5 button.big');
  await ram(2, 13); await wait(); await pw(); await wait(300); await pw(); await wait();
  await p.click('#level5 .mission button:has-text("Sie ist weg")'); await wait(300); await log(5, 'M1');
  await ram(2, 13); await setAddr(2); await wait(300); await p.click('#level5 button:has-text("Sichern")'); await wait(2000); await pw(); await wait(300); await pw(); await wait();
  await p.click('#level5 .mission button:has-text("langsam")'); await wait(300); await log(5, 'M2');
  await pw(); await wait(300); await pw(); await wait(300);
  for (let a = 0; a < 4; a++) { await setAddr(a); await p.click('#level5 button:has-text("Laden:")'); await wait(700); }
  await wait(); await log(5, 'M3');
  // Level 6: Halbaddierer
  const svgClick = (sel, name) => p.evaluate(([sel, name]) => { const g = [...document.querySelectorAll(sel + ' g.sw')].find((x) => x.textContent.trim() === name); g.dispatchEvent(new MouseEvent('click', { bubbles: true })); }, [sel, name]);
  const P1 = '#level6 .panel:nth-of-type(1)';
  for (const step of ['B', 'A', 'B', 'A']) { await svgClick('#level6 .panel', step); }
  await wait(); await p.click('#level6 .mission button:has-text("genau einer")'); await wait(300); await log(6, 'M1');
  await p.click('#level6 button[data-g="XOR"] >> nth=0'); await p.click('#level6 button[data-g="UND"] >> nth=1'); await wait(); await log(6, 'M2');
  await p.click('#level6 .mission button:text-is("20")'); await wait(300); await log(6, 'M3');
  // L5
  const setAdd = (A,B,s) => p.evaluate(([A,B,s]) => { window.__app.levels[7].api.set(A,B,s); window.__app.levels[7].touch(); }, [A,B,s]);
  await setAdd([1,0,1,0],[1,1,0,0],0); await wait(); await setAdd([1,0,0,1],[1,1,1,0],0); await wait(); await log(7, 'M1');
  await setAdd([1,1,1,0],[0,1,0,0],1); await wait(); await setAdd([0,1,0,0],[1,1,1,0],1); await wait(); await setAdd([0,1,1,0],[0,1,1,0],1); await wait(); await log(7, 'M2');
  await p.evaluate(() => { const api = window.__app.levels[7].api; api.st.suspect = api.st.broken; api.st.measures = 1; api.render(); }); await p.click('#level7 .mission button:has-text("Prüfen")'); await wait(300); await log(7, 'M3');
  // L6 M1
  await p.click('#c6m2b5'); await p.click('#level8 button:has-text(\"Zurücksetzen\")'); await p.click('#level8 button:has-text(\"Bis zum Ende\")'); await wait(); await log(8, 'M1');
  // L6 M2: set mem[2]=0x41: currently 42 -> flip bit1 and bit0
  await p.click('#c6m2b1'); await p.click('#c6m2b0'); await p.fill('#c6pred', '10'); await p.click('#level8 button:has-text(\"Festlegen\")'); await p.click('#level8 button:has-text(\"Bis zum Ende\")'); await wait(); await log(8, 'M2');
  // L7 M1: write program via evaluate then run
  await p.evaluate(() => { const api = window.__app.levels[9].api; api.c.mem = window.__app.CPU.hexToMem('23 30 50 50 50 50 D0 E0'); api.P.render(); }); await p.click('#level9 button:has-text(\"Bis zum Ende\")'); await wait(); await log(9, 'M1 pre');
  await p.click('#level9 .mission >> text=Befehle hinzufügen oder ändern'); await wait(300); await log(9, 'M1');
  // L7 M2
  await p.fill('#c7pred', '14'); await p.click('#level9 button:has-text(\"Festlegen\")'); await p.click('#level9 button:has-text(\"Bis zum Ende\")'); await wait(); await log(9, 'M2');
  // L7 M3: A4 -> A5: bit0 of cell 3
  await p.click('#level9 button:has-text(\"Bis zum Ende\")'); await wait(); await log(9, 'M3 loop');
  await p.click('#c7m3b0'); await p.click('#level9 button:has-text(\"Zurücksetzen\")'); await p.click('#level9 button:has-text(\"Bis zum Ende\")'); await wait(); await log(9, 'M3');
  // L7 M4a: gate panel: visit 1000, 1001, 1011
  await p.evaluate(() => { const g = window.__app.levels[9].api.gate; g.st.b7 = 1; g.render(); g.st.z = 1; g.render(); g.st.b5 = 1; g.render(); window.__app.levels[9].touch(); }); await wait(); await log(9, 'M4a');
  // M4b: JZ 5 -> JMP 5: bit 5 of cell 3
  await p.click('#c7m3b5'); await p.fill('#c7pred', '2'); await p.click('#level9 button:has-text(\"Festlegen\")'); await p.click('#level9 button:has-text(\"Bis zum Ende\")'); await wait(); await log(9, 'M4b');
  // L8 M1
  await p.evaluate(() => { const api = window.__app.levels[10].api; api.c.mem[4] = 0x50; api.c.mem[6] = 0xA8; api.P.render(); }); await p.click('#level10 button:has-text(\"Bis zum Ende\")'); await wait(); await log(10, 'M1');
  // L8 M2: 5x3: cell0 = 25, cell1 = 2B; from 23 2C: cell0 bits: 23=00100011 -> 25=00100101: flip b2,b1; cell1 2C=00101100 -> 2B=00101011: flip b2,b1,b0
  await p.click('#c8m0b2'); await p.click('#c8m0b1'); await p.click('#c8m1b2'); await p.click('#c8m1b1'); await p.click('#c8m1b0'); await p.fill('#c8pred', '17'); await p.click('#level10 button:has-text(\"Festlegen\")'); await p.click('#level10 button:has-text(\"Bis zum Ende\")'); await wait(); await log(10, 'M2');
  // L8 M3: 4x4: 24 2C: cell0 23 -> 24: flip b0,b1,b2 (011 -> 100)
  await p.click('#c8m0b0'); await p.click('#c8m0b1'); await p.click('#c8m0b2'); await p.click('#level10 button:has-text(\"Bis zum Ende\")'); await wait(); await log(10, 'M3 pre');
  await p.click('#level10 .mission >> text=0, weil'); await wait(300); await log(10, 'M3');
  console.log('PROG', await p.textContent('#progText'), '| schema:', await p.textContent('#schemaNote'));
  await p.screenshot({ path: 'shot-full.png', fullPage: true });
  console.log('ERRORS', JSON.stringify(errs));
  await b.close();
})().catch(e => { console.error('FAILED', e); process.exit(1); });
