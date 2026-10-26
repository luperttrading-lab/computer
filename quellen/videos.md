# Erklärvideos

Sammlung der Videos, die wir für die Lern-App „Sandkorn-Rechner“ gesichtet haben. Zusammenfassungen in eigenen Worten, keine Transkripte.

---

## 1. „Millions of minds came together to make this possible“

- **Link:** https://youtube.com/shorts/B9JNduiRGUM
- **Kanal:** Charles · **Länge:** 2:21 · **Sprache:** Englisch · **Hochgeladen:** 21.10.2026
- **Anlass:** Ausgangspunkt der App.

**Inhalt:** Vom Sandkorn zum Chip. Transistor als Schalter (an = 1, aus = 0), daraus UND-, ODER- und NICHT-Gatter, daraus ein Addierer und das Rechenwerk. Zwei Umkehrer im Kreis speichern ein Bit; viele davon mit Adressen ergeben den Speicher. Ein Programm aus Einsen und Nullen, ein Steuerwerk mit Takt (holen, decodieren, ausführen, zurückschreiben), Cache, Ein- und Ausgabe.

**Wo das Video vereinfacht (in der App aufgegriffen):**
- „Eine Milliarde Schleifen ergeben den Speicher“ gilt nur für Register und Cache (SRAM). Der Arbeitsspeicher ist DRAM, der Festspeicher ist Flash (Level 3 und 5).
- „Kann es rechnen, kann es alles“ stimmt nicht: Es braucht Speicher und einen bedingten Sprung (Level 8).
- „Zwei Schalter in Reihe ergeben UND“ ist das Relais-Bild; in CMOS ist das Grundgatter NAND (Level 2).

---

## 2. KIT for Kids: Wie funktioniert ein Computer?

- **Link:** https://youtu.be/tNUI7q4GpbU
- **Kanal:** KIT Karlsruhe Institute of Technology · **Länge:** 4:07 · **Sprache:** Deutsch · **Hochgeladen:** 21.08.2013
- **Zielgruppe:** Kinder, ohne Vorwissen.

**Inhalt:**
- 0:34 Bauteile im Computer: Hauptprozessor (rechnet), Speicher (Kurzzeitgedächtnis), Festplatte (Langzeitgedächtnis), Grafikkarte (sagt dem Bildschirm, was er zeigt).
- 1:19 Der Speicher als Straße mit Häusern: Jedes Haus ist eine Speicherzelle mit einer Hausnummer (der Adresse). In jedem Haus „wohnt“ ein Wert, eine Zahl oder ein Buchstabe.
- 1:55 Zwischen Speicher und Prozessor fährt ein Bus, der Datenbus.
- 2:12 Ein Zähler zeigt auf Hausnummer 6; dort wohnt ein Befehl („8 + 9 → 9“). Der Befehl wird mit dem Bus abgeholt und entschlüsselt (decodiert).
- 2:50 Ausführen: Wert aus Haus 8 holen (3), Wert aus Haus 9 holen (8), 3 + 8 = 11 rechnen, die 11 zurück in Haus 9 schreiben. Das wiederholt sich immer wieder.

**Was wir übernehmen:** das Bild „Adresse = Hausnummer, Speicherzelle = Haus, Datenbus = Straße zwischen Speicher und Prozessor“ (Level 5 und 7) und die Gegenüberstellung Kurzzeitgedächtnis / Langzeitgedächtnis.

**Wo das Video vereinfacht:**
- Der Zähler, der auf den nächsten Befehl zeigt, gehört zum Steuerwerk, nicht zum Rechenwerk (in der App: Programmzähler PC, Level 7).
- Wie ein Wert physikalisch in einem „Haus wohnt“, bleibt offen; das zeigt die App in Level 1 bis 5.
- Die Festplatte steht für den Festspeicher; heute ist das meist eine SSD mit Flash (Level 5).

---

## 3. Wie funktioniert eigentlich ein Computer? – Einfach erklärt

- **Link:** https://youtu.be/Sh9VwHj8a3o
- **Kanal:** Erzähluniversum · **Länge:** 6:31 · **Sprache:** Deutsch · **Hochgeladen:** 18.06.2026
- **Zielgruppe:** Einsteiger ohne Vorwissen.

**Inhalt:**
- 0:37 Hardware (alles zum Anfassen) und Software (Programme, Apps, Betriebssystem), erst beides zusammen ergibt einen nutzbaren Computer.
- 1:27 Die binäre Sprache: nur 0 und 1, ein Bit je Stelle. Die Unicode-Tabelle ordnet jedem Zeichen eine Zahl zu, die Zahl hat eine Binärdarstellung. „HALLO“ sind 5 × 8 = 40 Bit. Bilder bestehen aus Pixeln, jede Farbe ist eine Zahl.
- 3:17 Der Prozessor als Herzstück; Grundprinzip ist der Transistor, „ein winziges elektronisches Ventil“, das ein Steuersignal öffnet oder schließt. Erst viele verbunden ergeben Logikschaltungen.
- 4:28 Arbeitsspeicher als Werkbank des Prozessors: schnell, aber beim Ausschalten leer. Festplatte bzw. SSD als Lagerhalle: hält Daten ohne Strom.
- 5:36 Zusammenspiel: Beim Programmstart werden die Daten von der Festplatte in den Arbeitsspeicher geladen, dort greift der Prozessor darauf zu.

**Was wir übernehmen:** das Beispiel „HALLO = 40 Bit“ als Werkzeug in Level 4 (eigenes Wort eingeben, Bits sehen) und die Bilder Werkbank / Lagerhalle als zweiten Vergleich in Level 5. Das Ventil-Bild für den Transistor deckt sich mit Level 0.

**Wo das Video vereinfacht oder Zahlen prüfenswert sind:**
- „0 und 1 stehen für Strom aus und Strom an“: Genauer ist Spannung an oder aus. Eine 1 am Gate oder in einer Speicherzelle ist Druck ohne Fluss (Level 0, Mission 3).
- Die Unicode-Tabelle vergibt nur die Zahl; wie viele Bits gespeichert werden, legt die Kodierung fest. Im üblichen UTF-8 brauchen A bis Z je 8 Bit, ä braucht 16, ein Emoji 32.
- Zahlenangaben (eigene Einschätzung): A4-Seite ≈ 20 000 Bit passt zu rund 2 500 Zeichen × 8. Handyfoto ≈ 20 Millionen Bit passt zu einem komprimierten JPEG von rund 2,5 MB; unkomprimiert wären es bei 12 Megapixeln × 24 Bit rund 290 Millionen. 5 Milliarden Bit für 5 Minuten Video entspricht etwa 17 Mbit/s, eher 4K als Full HD. „30 Milliarden Transistoren“ liegt am oberen Rand heutiger Laptop-Chips.
