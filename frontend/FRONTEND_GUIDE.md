# Frontend Entwickler-Guide

Diese Anleitung erklärt unerfahrenen Entwicklern, wie das Frontend aufgebaut ist und wie es funktioniert.

---

## 📚 Inhaltsverzeichnis

1. [Überblick](#überblick)
2. [Technologien](#technologien)
3. [Projektstruktur](#projektstruktur)
4. [Komponenten](#komponenten)
5. [Design-System](#design-system)
6. [Datenfluss](#datenfluss)
7. [Häufige Aufgaben](#häufige-aufgaben)
8. [Tipps & Best Practices](#tipps--best-practices)

---

## 🎯 Überblick

Das Frontend ist eine **React-Anwendung**, die es Nutzern ermöglicht:
- Dateien hochzuladen (CSV, Excel, JSON)
- Daten zu analysieren und zu visualisieren
- Mit einem KI-Agenten zu chatten

**React** ist eine JavaScript-Bibliothek, die es ermöglicht, Web-Anwendungen aus wiederverwendbaren Komponenten zu bauen.

---

## 🛠 Technologien

### React
- **Was ist React?** Eine JavaScript-Bibliothek zum Erstellen von Benutzeroberflächen
- **Warum React?** Komponenten können wiederverwendet werden, Code ist besser organisiert
- **Version:** React 19.2.3

### CSS
- **Was ist CSS?** Stylesheet-Sprache für das Design
- **Wie wird es verwendet?** Jede Komponente hat eine eigene `.css` Datei
- **Besonderheit:** Wir verwenden CSS-Variablen (Design-Tokens) für konsistente Farben/Fonts

### JavaScript (ES6+)
- **Was ist ES6?** Moderne JavaScript-Syntax
- **Wichtige Features:** Arrow Functions (`() => {}`), Destructuring, `const`/`let`

---

## 📁 Projektstruktur

```
frontend/
├── public/                    # Öffentliche Dateien (werden nicht verarbeitet)
│   ├── mnemoslogo.png        # Logo
│   ├── index.html            # HTML-Grundgerüst
│   └── favicon.ico           # Browser-Icon
│
├── src/                      # Quellcode (wird verarbeitet)
│   ├── components/           # React-Komponenten
│   │   ├── TopBar.js         # TopBar-Komponente
│   │   ├── TopBar.css        # Styles für TopBar
│   │   ├── FileUpload.js     # Upload-Komponente
│   │   └── FileUpload.css    # Styles für FileUpload
│   │
│   ├── design-tokens.css     # Zentrale Design-Variablen
│   ├── App.js                # Haupt-Komponente
│   ├── App.css               # Styles für App
│   ├── index.js              # Einstiegspunkt
│   └── index.css             # Globale Styles
│
└── package.json              # Projekt-Konfiguration & Dependencies
```

### Wichtige Dateien erklärt:

- **`public/index.html`**: Die HTML-Datei, die im Browser geladen wird
- **`src/index.js`**: Startet die React-App
- **`src/App.js`**: Die Haupt-Komponente, die alle anderen Komponenten zusammenführt
- **`src/components/`**: Hier sind alle wiederverwendbaren Komponenten

---


## 🎨 Design-System

### Was sind Design-Tokens?

Design-Tokens sind zentrale Variablen für Farben, Fonts, Abstände etc. 
Sie befinden sich in `src/design-tokens.css`.

### Beispiel:

```css
:root {
  --color-accent: #fe4204;        /* Orange */
  --color-bg-primary: #323232;    /* Hintergrund */
  --font-size-base: 1rem;         /* Schriftgröße */
  --spacing-4: 1rem;              /* Abstand */
}
```

### Verwendung:

```css
.my-component {
  background-color: var(--color-bg-primary);
  color: var(--color-text-primary);
  padding: var(--spacing-4);
}
```

**Warum?** Wenn wir die Farbe ändern wollen, ändern wir sie nur an einer Stelle!

### Wichtige Design-Tokens:

- **Farben:** `--color-accent`, `--color-bg-primary`, `--color-text-primary`
- **Fonts:** `--font-family-primary`, `--font-size-base`
- **Abstände:** `--spacing-1` bis `--spacing-20`
- **Border-Radius:** `--radius-sm`, `--radius-base`, `--radius-lg`

---

## 🔄 Datenfluss

### Wie funktioniert React?

1. **State ändert sich** → React erkennt die Änderung
2. **Komponente wird neu gerendert** → UI wird aktualisiert
3. **Nur geänderte Teile** werden aktualisiert (effizient!)

### Beispiel: Tab-Wechsel

```
Benutzer klickt auf "Explore"
    ↓
onTabChange('explore') wird aufgerufen
    ↓
State in App.js ändert sich: activeTab = 'explore'
    ↓
App.js rendert neu
    ↓
TopBar zeigt "Explore" als aktiv an
    ↓
Hauptbereich zeigt Explore-Inhalt
```

### Props vs State

- **Props:** Daten, die von einer Komponente zur anderen weitergegeben werden (von oben nach unten)
- **State:** Daten, die innerhalb einer Komponente gespeichert werden

**Beispiel:**
```jsx
// App.js (Parent)
function App() {
  const [activeTab, setActiveTab] = useState('prepare'); // State
  
  return (
    <TopBar 
      activeTab={activeTab}        // Prop
      onTabChange={setActiveTab}   // Prop (Funktion)
    />
  );
}

// TopBar.js (Child)
function TopBar({ activeTab, onTabChange }) { // Props empfangen
  return (
    <button onClick={() => onTabChange('explore')}>
      Explore
    </button>
  );
}
```

---

## 💼 Häufige Aufgaben

### 1. Eine neue Komponente erstellen

**Schritt 1:** Erstelle die Dateien
```bash
# Im Terminal (im frontend-Ordner)
touch src/components/MyComponent.js
touch src/components/MyComponent.css
```

**Schritt 2:** Schreibe die Komponente
```jsx
// MyComponent.js
import React from 'react';
import './MyComponent.css';

function MyComponent({ title }) {
  return (
    <div className="my-component">
      <h2>{title}</h2>
    </div>
  );
}

export default MyComponent;
```

```css
/* MyComponent.css */
.my-component {
  padding: var(--spacing-4);
  background-color: var(--color-bg-secondary);
}
```

**Schritt 3:** Verwende die Komponente
```jsx
// App.js
import MyComponent from './components/MyComponent';

function App() {
  return <MyComponent title="Hallo!" />;
}
```

---

### 2. Eine neue Farbe hinzufügen

**Schritt 1:** Füge die Farbe zu `design-tokens.css` hinzu
```css
:root {
  --color-my-color: #ff0000;
}
```

**Schritt 2:** Verwende die Farbe
```css
.my-element {
  color: var(--color-my-color);
}
```

---

### 3. State verwenden

```jsx
import React, { useState } from 'react';

function MyComponent() {
  // State erstellen
  const [count, setCount] = useState(0);
  
  // State ändern
  const handleClick = () => {
    setCount(count + 1);
  };
  
  return (
    <div>
      <p>Anzahl: {count}</p>
      <button onClick={handleClick}>Erhöhen</button>
    </div>
  );
}
```

**Erklärung:**
- `useState(0)` erstellt State mit Startwert 0
- `count` ist der aktuelle Wert
- `setCount` ist die Funktion zum Ändern
- `{count}` zeigt den Wert im UI an

---

### 4. Event Handler (Klicks, Eingaben)

```jsx
function MyComponent() {
  const handleClick = () => {
    console.log('Geklickt!');
  };
  
  const handleInput = (event) => {
    console.log('Eingabe:', event.target.value);
  };
  
  return (
    <div>
      <button onClick={handleClick}>Klick mich</button>
      <input onChange={handleInput} />
    </div>
  );
}
```

---

### 5. Bedingtes Rendering (Wenn-Dann)

```jsx
function MyComponent({ isVisible }) {
  // Variante 1: Mit if
  if (isVisible) {
    return <div>Sichtbar!</div>;
  }
  return null;
  
  // Variante 2: Mit && (kürzer)
  return (
    <div>
      {isVisible && <div>Sichtbar!</div>}
    </div>
  );
  
  // Variante 3: Mit ? : (ternärer Operator)
  return (
    <div>
      {isVisible ? <div>Sichtbar!</div> : <div>Versteckt</div>}
    </div>
  );
}
```

---

### 6. Liste von Elementen rendern

```jsx
function MyComponent() {
  const items = ['Apfel', 'Banane', 'Orange'];
  
  return (
    <ul>
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}
```

**Wichtig:** Immer `key` verwenden bei Listen!

---

## 💡 Tipps & Best Practices

### 1. Komponenten-Namen
- **Großbuchstaben:** `MyComponent` ✅ nicht `myComponent` ❌
- **Beschreibend:** `FileUpload` ✅ nicht `Component1` ❌

### 2. Datei-Namen
- **Komponente:** `MyComponent.js` (Großbuchstabe)
- **Styles:** `MyComponent.css` (gleicher Name)

### 3. CSS-Klassen
- **BEM-Style:** `.my-component__element--modifier`
- **Oder einfach:** `.my-component-element`

### 4. Immer Design-Tokens verwenden
```css
/* ❌ Schlecht */
.my-element {
  color: #ffffff;
  padding: 16px;
}

/* ✅ Gut */
.my-element {
  color: var(--color-text-primary);
  padding: var(--spacing-4);
}
```

### 5. Props dokumentieren
```jsx
/**
 * Button-Komponente
 * @param {string} text - Der Text auf dem Button
 * @param {function} onClick - Funktion, die beim Klick aufgerufen wird
 */
function Button({ text, onClick }) {
  // ...
}
```

### 6. Console.log für Debugging
```jsx
function MyComponent({ data }) {
  console.log('Data:', data); // Im Browser-Console sichtbar
  return <div>...</div>;
}
```

### 7. Kommentare schreiben
```jsx
// Guter Kommentar erklärt WARUM, nicht WAS
// Schlecht: "Erhöht count um 1"
// Gut: "Erhöht count, damit der Benutzer sieht, dass er geklickt hat"
setCount(count + 1);
```

---

## 🐛 Häufige Fehler & Lösungen

### Fehler: "Cannot read property of undefined"
**Problem:** Versuch, auf eine Eigenschaft zuzugreifen, die nicht existiert
```jsx
// ❌ Fehler
const name = user.name; // user ist undefined

// ✅ Lösung
const name = user?.name; // Optional Chaining
// oder
const name = user && user.name;
```

### Fehler: "Warning: Each child in a list should have a unique key"
**Problem:** Fehlender `key` bei Listen
```jsx
// ❌ Fehler
{items.map(item => <div>{item}</div>)}

// ✅ Lösung
{items.map((item, index) => <div key={index}>{item}</div>)}
```

### Fehler: "Cannot update during render"
**Problem:** State wird während des Renderings geändert
```jsx
// ❌ Fehler
function Component() {
  const [count, setCount] = useState(0);
  setCount(1); // Während Rendering!
  return <div>{count}</div>;
}

// ✅ Lösung
function Component() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    setCount(1); // In useEffect!
  }, []);
  return <div>{count}</div>;
}
```

---

## 📚 Nützliche Ressourcen

### React Dokumentation
- [React Docs](https://react.dev/) - Offizielle Dokumentation
- [React Tutorial](https://react.dev/learn) - Schritt-für-Schritt Tutorial

### CSS
- [CSS-Tricks](https://css-tricks.com/) - CSS-Tipps und Tricks
- [MDN CSS](https://developer.mozilla.org/en-US/docs/Web/CSS) - CSS Referenz

### JavaScript
- [MDN JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript) - JavaScript Referenz
- [JavaScript.info](https://javascript.info/) - Moderne JavaScript Tutorials

---

## 🚀 Entwicklung starten

### 1. Dependencies installieren
```bash
cd frontend
npm install
```

### 2. Development-Server starten
```bash
npm start
```

Die App läuft dann auf `http://localhost:3000`

**Server beenden:**
- **Im Terminal, wo der Server läuft:** `Ctrl + C` (Windows/Linux) oder `Cmd + C` (Mac)
- **Falls nicht verfügbar ist:** Im Terminal folgenden Befehl ausführen:
  ```bash
  lsof -ti:3000 | xargs kill
  ```
  Dieser Befehl findet und beendet alle Prozesse auf Port 3000.

### 3. Änderungen machen
- Dateien bearbeiten
- Browser aktualisiert automatisch (Hot Reload)

### 4. Build für Production
```bash
npm run build
```

---

## ❓ Fragen?

Bei Fragen:
1. Schaue in die Dokumentation
2. Schaue in den Code (Kommentare helfen!)
3. Frage Teammitglieder
4. Nutze Google/Stack Overflow

**Wichtig:** Niemand weiß alles! Fragen ist völlig okay! 🎉

---

**Letzte Aktualisierung:** 22.12.2025 (Vincent)

