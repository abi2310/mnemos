# Prepare Screen - Implementation Documentation

## Übersicht

Der Prepare-Bereich wurde nach dem **Julius AI Pattern** refactored:
- Oben: Upload-Bereich (Dropzone + Upload-Button)
- Unten: Files-Übersicht (Tabelle mit Search, Bulk Actions, Row Actions)
- Expandable Preview Panel (UI-Skeleton)

## Implementierte Komponenten

### 1. **Prepare.js** (Haupt-Container)
- Koordiniert Upload und Files-Management
- Lädt Datasets vom Backend via `getDatasets()`
- Verwaltet State für Dateiliste und Preview
- Callbacks für Upload, Delete, und Preview-Interaktionen

**Location:** `src/components/Prepare/Prepare.js`

### 2. **UploadSection.js**
- Große Dropzone mit gestrichelter Umrandung
- Drag & Drop Support mit visuellen States (hover, dragging)
- File-Type Validation (CSV, Excel, JSON)
- Nutzt bestehenden `uploadDataset()` Service
- Keine Backend-Änderungen erforderlich

**Location:** `src/components/Prepare/UploadSection.js`

**Features:**
- ✅ Drag & Drop
- ✅ Click to upload
- ✅ File type filtering
- ✅ Loading states
- ✅ Accessibility (ARIA labels, keyboard support)

### 3. **FilesSection.js**
- Toolbar mit Search Input
- Bulk Actions: Download, Delete, Chat with files
- Tabelle mit:
  - Multi-Select via Checkboxes
  - Spalten: Name, Size, Upload Date, Actions
  - Row Actions: Open (Preview), Download (disabled), Delete
- Responsive Design
- Empty State / Loading State

**Location:** `src/components/Prepare/FilesSection.js`

**Features:**
- ✅ Search/Filter Funktionalität
- ✅ Bulk Selection (Select All, Individual Selection)
- ✅ Bulk Delete (mit Confirmation)
- ✅ Row-level Actions
- ✅ Formatted File Size & Date
- ✅ Empty State & Loading States

### 4. **FilePreviewPanel.js** (UI-Skeleton)
- Expandable Panel unterhalb der Tabelle
- Zeigt Dateiname + Metadaten (Size, Upload Date)
- Skeleton Table (8 Zeilen × 6 Spalten) mit Shimmer Animation
- Info-Banner: "Preview will be implemented later"
- Buttons: Close, "Open in new view" (disabled)

**Location:** `src/components/Prepare/FilePreviewPanel.js`

**Hinweis:** 
Dies ist nur ein **UI-Skeleton** – keine echte CSV/Excel-Verarbeitung. Die Tabellen-Preview wird später von jemand anderem implementiert.

## Design System & Styling

Alle Komponenten nutzen konsequent:
- **Design Tokens** aus `design-tokens.css`
  - Farben: `--color-*`
  - Spacing: `--spacing-*`
  - Typography: `--font-size-*`, `--font-weight-*`
  - Border Radius: `--radius-*`
  - Shadows: `--shadow-*`
  - Transitions: `--transition-base` (neu hinzugefügt)
- **Keine Hardcodes** für Farben/Schriften/Abstände
- **Responsive Design** mit Media Queries

### Neue Design Tokens
Hinzugefügt in `design-tokens.css`:
```css
--transition-base: 0.2s ease;
--transition-fast: 0.15s ease;
--transition-slow: 0.3s ease;
```

## Backend Integration

### Verwendete Services (DatasetService)
- `uploadDataset(file)` - POST `/api/v1/datasets`
- `getDatasets()` - GET `/api/v1/datasets`
- `deleteDataset(id)` - DELETE `/api/v1/datasets/:id`
- `getDatasetSchema(id)` - GET `/api/v1/datasets/:id/schema` (noch nicht verwendet)

**Wichtig:** Keine Backend-Änderungen erforderlich! 
Alle Services wurden unverändert übernommen.

## App.js Refactoring

Die alte Implementierung mit separaten `FileUpload` und `DataTablePreview` Komponenten wurde durch die neue `Prepare` Komponente ersetzt:

**Vorher:**
```javascript
{activeTab === 'prepare' && (
    <div className="App-content">
        <FileUpload ... />
        <DataTablePreview ... />
    </div>
)}
```

**Nachher:**
```javascript
{activeTab === 'prepare' && (
    <Prepare />
)}
```

Die alten Komponenten (`FileUpload.js`, `DataTablePreview.js`) bleiben im Codebase und können bei Bedarf wiederverwendet werden.

## Accessibility (A11y)

Implementierte Features:
- ✅ ARIA Labels auf Buttons und Inputs
- ✅ Keyboard-Navigation (Tab, Enter)
- ✅ Semantic HTML (`<section>`, `<table>`, etc.)
- ✅ Focus States
- ✅ Screen Reader freundliche Labels
- ✅ Indeterminate Checkbox State für "Some selected"

## Responsive Design

Breakpoints:
- **Desktop:** Default (> 1024px)
- **Tablet:** 1024px
- **Mobile:** 768px

Anpassungen:
- Toolbar wird vertikal auf Mobile
- Tabelle mit horizontalem Scroll
- Kleinere Font Sizes
- Reduziertes Padding/Spacing

## Testing

### Manuelle Test-Checkliste

**Upload:**
- [ ] Drag & Drop funktioniert
- [ ] Click to Upload funktioniert
- [ ] File Type Validation (nur CSV, Excel, JSON)
- [ ] Upload-Status wird angezeigt
- [ ] Nach Upload erscheint Datei in Liste

**Files-Liste:**
- [ ] Search funktioniert
- [ ] Select All / Einzelne Selection
- [ ] Bulk Delete mit Confirmation
- [ ] Row Actions (Open, Delete)
- [ ] Empty State wird angezeigt (keine Files)
- [ ] Loading State

**Preview Panel:**
- [ ] "Open" öffnet Preview Panel
- [ ] Close schließt Panel
- [ ] Skeleton Table wird angezeigt
- [ ] Info-Banner ist sichtbar

### Backend-Tests

Die bestehenden Backend-Tests in `tests/integration/test_datasets_api.py` sollten weiterhin funktionieren, da keine API-Änderungen vorgenommen wurden.

## Offene Punkte / Future Enhancements

1. **Preview-Logik implementieren**
   - CSV/Excel Parsing
   - Echte Tabellen-Daten anzeigen
   - Schema-Informationen via `getDatasetSchema()`

2. **Download Funktionalität**
   - Backend-Endpunkt für File Download
   - Bulk Download (ZIP?)

3. **"Chat with files" Feature**
   - Integration mit Explore/Chat-Bereich
   - Multi-File Selection an Chat übergeben

4. **Upload Progress**
   - Progress Bar für große Dateien
   - Multi-File Upload mit Queue

5. **Error Handling**
   - Toast Notifications statt `alert()`
   - Detaillierte Fehlermeldungen vom Backend

6. **Pagination**
   - Falls viele Dateien hochgeladen werden
   - Virtual Scrolling für große Listen

## Lessons Learned / Best Practices

1. **Component Composition:** Saubere Trennung zwischen Container (Prepare) und Presentational Components (UploadSection, FilesSection)
2. **Design Tokens First:** Alle Styles konsistent über Tokens definieren
3. **Backend Contract:** Keine Änderungen am Backend = weniger Breaking Changes
4. **Skeleton UIs:** Erst UI bauen, dann Logik implementieren (erlaubt paralleles Arbeiten)
5. **Accessibility von Anfang an:** ARIA Labels und Keyboard Support direkt mitdenken

## Changelog

### Version 1.0.0 (29.12.2025)
- ✅ Prepare Screen komplett refactored nach Julius AI Pattern
- ✅ UploadSection implementiert (Dropzone + Upload Button)
- ✅ FilesSection implementiert (Search, Bulk Actions, Table)
- ✅ FilePreviewPanel implementiert (UI-Skeleton)
- ✅ App.js refactored
- ✅ Design Tokens für Transitions hinzugefügt
- ✅ Vollständig responsive
- ✅ A11y Features implementiert

