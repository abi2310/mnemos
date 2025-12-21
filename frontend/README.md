FrontEnd Projektstruktur

src/
Zentrales Verzeichnis für den gesamten React-Code.

assets/
→ Statische Ressourcen.
→ Bilder, Icons, Logos, Schriftarten.

components/
→ Wiederverwendbare UI-Komponenten.
→ Keine Seitenlogik, keine API-Aufrufe.
→ Beispiele: Navbar, Button, Modal, Card.

pages/
→ Seiten der Anwendung.
→ Jede Datei entspricht einer Route.
→ Kombiniert Komponenten und Layouts.
→ Beispiele: Home, Login, Dashboard.

layouts/
→ Seitenlayouts.
→ Definieren die Grundstruktur einer Seite (z. B. Navbar + Content).
→ Werden von mehreren Seiten wiederverwendet.

hooks/
→ Eigene React Hooks.
→ Kapseln wiederkehrende Logik und State.
→ Beispiele: Authentifizierung, Datenabruf.

services/
→ Business-Logik und Backend-Kommunikation.
→ API-Aufrufe und Datenverarbeitung.
→ Keine UI-Komponenten.

store/
→ Globaler Anwendungszustand.
→ Verwaltung von Daten, die appweit benötigt werden (z. B. Login-Status).

utils/
→ Hilfsfunktionen und Konstanten.
→ Reine JavaScript-Funktionen ohne React-Bezug.

styles/
→ Globale Styles.
→ CSS-Variablen, Themes und allgemeine Layout-Regeln.

App.jsx
→ Zentrale Hauptkomponente.
→ Enthält Routing und globale Layouts.

main.jsx
→ Technischer Einstiegspunkt der React-App.
→ Rendert App.jsx in das DOM.

index.css
→ Globale CSS-Regeln.
→ Wird einmalig beim Start geladen.