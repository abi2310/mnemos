# Conversational Data Insights

Ein chatbasierter KI-Agent, der Datenanalyse neu definiert: Statt komplexer Tools genügt ein Gespräch. Nutzer laden ihre Daten hoch, stellen Fragen in natürlicher Sprache und erhalten automatisch erzeugte Visualisierungen und Dashboards. Intuitiv, visuell, zugänglich – eine neue Generation der deskriptiven Datenanalyse.

---

## 🚀 Überblick

Das System ermöglicht:

- Upload von CSV-, Excel- und weiteren strukturierten Dateien  
- Interpretation natürlicher Sprache  
- Automatische Generierung von Charts, Statistiken und Dashboards  
- Ausgaben direkt im Chat  
- Optional erklärende Zwischenschritte  

---

## 🧱 Projektstruktur

project-root/
│
├── frontend/
├── backend/
└── agents/


## Lokale Entwicklungsumgebung (Python venv + gemeinsame Dependencies)

Dieses Projekt nutzt für Backend und Agents jeweils eine eigene Python-Virtual-Environment.  
Bevor du startest: **Immer zuerst in das passende Verzeichnis wechseln**  
(`cd backend` oder `cd agents`).

---

### 1. Virtuelle Umgebung erstellen
Im jeweiligen Projektordner (Backend oder Frontend):

python3 -m venv .venv
  

### 2. Virtuelle Umgebung aktivieren
Im jeweiligen Projektordner (Backend oder Frontend):

source .venv/bin/activate

### 3. Bisherige Dependencies installieren

pip install -r requirements.txt

### 3. Neue Dependencies installieren

pip install <paketname>
pip freeze > requirements.txt
