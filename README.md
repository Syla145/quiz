# QuizMaster MVP

Vollständig spielbare Quiz-Plattform für Show-Quizze.  
Entwickelt mit reinem HTML, CSS und JavaScript – ohne Frameworks.

---

## 📁 Projektstruktur

```
quizmaster/
├── index.html                    ← Alle Seiten in einer Datei
├── manifest.json                 ← PWA-Manifest (vorbereitet)
├── css/
│   └── main.css                  ← Gesamtes Stylesheet
├── js/
│   ├── core/
│   │   ├── session-engine.js     ← Sitzungs-/Zustandsmanager
│   │   ├── timer-engine.js       ← Timer-Logik
│   │   └── app.js                ← Entry Point, Router, Toasts
│   ├── question-types/
│   │   └── renderers.js          ← Alle 4 Fragetyp-Renderer
│   └── views/
│       ├── moderator-view.js     ← Moderator-UI-Logik
│       └── player-view.js        ← Spieler-UI-Logik
├── data/
│   └── quiz-sample.json          ← Beispiel-Quiz (alle Fragetypen)
└── assets/
    ├── images/                   ← Bilder für Bilderquiz
    └── icons/                    ← App-Icons
```

---

## 🚀 Schnellstart

1. Projektordner herunterladen
2. `index.html` in einem modernen Browser öffnen
3. **Moderator:** "Als Moderator starten" → Sitzung erstellen → Code notieren
4. **Spieler:** Zweites Browserfenster (oder Tab) öffnen → "Als Spieler beitreten" → Code eingeben

> ⚠️ **Wichtig für den MVP:** Der BroadcastChannel funktioniert nur zwischen Fenstern/Tabs **desselben Browsers** auf **demselben Gerät**. Für echtes Multiplayer über mehrere Geräte ist ein Backend nötig (siehe unten).

---

## 🎮 Fragetypen

| Typ | JSON `type` | Beschreibung |
|-----|-------------|--------------|
| Multiple Choice | `multiple-choice` | 4 Antwortoptionen, eine richtig |
| Schätzfrage | `estimate` | Schieberegler mit Min/Max |
| Bilderquiz | `image-quiz` | Bild + Multiple Choice |
| Sortierquiz | `sort` | Drag-and-Drop Reihenfolge (inkl. Touch) |

---

## 📋 JSON-Datenstruktur

Eigene Quizze können in `data/quiz-sample.json` erstellt werden.  
Jede Frage hat mindestens:
- `id`, `type`, `text`, `points`, `timer`
- Typ-spezifische Felder (siehe Beispiele in der JSON-Datei)

---

## 🏗️ Architektur-Ebenen

### Ebene 1: MVP (aktuell)
- Rein frontend-basiert
- BroadcastChannel für Same-Device-Kommunikation
- localStorage als geteilter Zustand

### Ebene 2: Online-Multiplayer (geplant)
```
Browser ←→ WebSocket ←→ Node.js + Socket.io ←→ Redis/SQLite
```
- `SessionEngine` wird auf WebSocket umgestellt (Drop-in-Ersatz)
- Alle anderen Module bleiben unverändert

### Ebene 3: PWA / App (geplant)
- Service Worker für Offline-Cache hinzufügen
- `manifest.json` ist bereits vorhanden
- Später: React Native oder Capacitor für native Apps

---

## 🔧 Neue Fragetypen hinzufügen

In `js/question-types/renderers.js` einfach ein neues Objekt registrieren:

```javascript
QuestionTypes['mein-typ'] = {
  renderPlayer(question, container, onSubmit) {
    // Spieler-UI
  },
  renderModerator(question, answers, container) {
    // Moderator-Auswertung
  }
};
```

Das war's! Kein weiterer Code muss geändert werden.

---

## 📊 Punktesystem

- Moderator kann Punkte **manuell vergeben** (positiv oder negativ)
- **Rundengewinner** können per Dropdown eingetragen werden
- **Mehrere Spieler** gleichzeitig per Punkte-Formular
- **Schätzfragen**: Automatische Punkt-Staffelung (exakt / nah dran)
- **Sortierquiz**: Teilpunkte pro richtig positioniertem Element

---

## ⚡ Browser-Kompatibilität

- Chrome/Edge 54+ ✅
- Firefox 38+ ✅
- Safari 15.4+ ✅
- Mobile: iOS Safari, Chrome Android ✅

Benötigt: `BroadcastChannel`, `localStorage`, CSS Grid/Flex, ES6+
