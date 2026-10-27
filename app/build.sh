#!/bin/sh
# Setzt app.js aus den Teilen zusammen und baut check.html für den lokalen Test (Playwright: node test/durchlauf.js).
cd "$(dirname "$0")" || exit 1
cat parts/p1_core.js parts/p0_grundlagen.js parts/p2_l1_l2.js parts/p3_l3_l4.js parts/p3b_speicher.js parts/p3c_halbaddierer.js parts/p4_l5.js parts/p5_cpu.js parts/p6_l6_l8.js > app.js
node --check app.js && node --check cpu.js || exit 1
{ printf '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light}body{margin:0;font:14px system-ui}img{max-width:100%%}[hidden]{display:none!important}</style></head><body>'; cat lernapp.html; printf '</body></html>'; } > check.html
echo "app.js und check.html gebaut"
