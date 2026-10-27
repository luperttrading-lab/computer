# Arbeitsregeln für dieses Projekt

- Antworten auf Deutsch, per Du, direkt, ohne Floskeln.
- Am Ende jeder Antwort genau eine Kostenzeile: `python3 tools/kosten.py` ausführen und die Ausgabe wörtlich als letzte Zeile setzen (roh, nicht in einen Codeblock, nichts dahinter).
- Gibt es in der Antwort einen Link (z. B. zu einem Artifact wie der Lern-App), steht er als Letztes direkt über der Kostenzeile, allein in einer Zeile, anklickbar.
- Wenn eine Sitzung oder ein größerer Arbeitsschritt fertig ist: Push-Nachricht aufs Handy schicken.
- Bei Dateien oder Bildern vor dem Abschluss prüfen, ob sie auch übermittelt wurden.

## Projekt

- Lern-App „Sandkorn-Rechner“ (Vom Bit zum Befehl): https://claude.ai/artifact/TZBwTMCjzz3GKSHAvPzB4q
- Quelldateien liegen im Repo unter `app/`: lernapp.html, cpu.js und `parts/` (daraus setzt `app/build.sh` die app.js zusammen). Test: `cd app && ./build.sh && node test/durchlauf.js` (Durchlauf aller Missionen mit Playwright; vorher test/durchlauf.js nach app/ kopieren oder Pfad anpassen). Veröffentlicht wird lernapp.html mit cpu.js und app.js als Dateien.
- Gesichtete Erklärvideos (Link, Inhalt, was wir übernehmen): `quellen/videos.md`. Neue Videos dort ergänzen; nur Zusammenfassungen in eigenen Worten, keine Transkripte.
- Zielperson: Trader, Statistiker, Finanzmathematiker, aber Laie in Physik und Hardware. Jede Mission braucht vorab: Was du siehst, was du tun sollst, worauf es ankommt. Fachbegriffe beim ersten Auftreten in Alltagssprache erklären.
