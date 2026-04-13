<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="QuizMaster – Multiplayer-Quiz-Plattform für Show-Quizze">
  <meta name="theme-color" content="#0d0f14">
  <title>QuizMaster</title>

  <!-- PWA-vorbereitet -->
  <link rel="manifest" href="manifest.json">

  <link rel="stylesheet" href="css/main.css">
</head>
<body>

<!-- ═══════════════════════════════════════════════════════════
     STARTSEITE
═══════════════════════════════════════════════════════════ -->
<div class="page active center" data-page="home" style="padding:2rem">
  <div class="container center" style="max-width:540px;gap:2rem">

    <div>
      <h1 style="margin-bottom:0.25rem">QUIZ<span style="color:var(--text-primary)">MASTER</span></h1>
      <p style="color:var(--text-secondary);font-size:1.1rem">Deine eigene Quiz-Show – überall spielbar</p>
    </div>

    <div style="display:flex;flex-direction:column;gap:1rem;width:100%">
      <button id="go-moderator-btn" class="btn btn-primary btn-lg" style="width:100%">
        🎙 Als Moderator starten
      </button>
      <button id="go-player-btn" class="btn btn-secondary btn-lg" style="width:100%">
        👤 Als Spieler beitreten
      </button>
    </div>

    <p style="font-size:0.8rem;color:var(--text-muted)">
      MVP v1.0 · Offline/Lokal · BroadcastChannel
    </p>
  </div>
</div>

<!-- ═══════════════════════════════════════════════════════════
     MODERATOR: SETUP
═══════════════════════════════════════════════════════════ -->
<div class="page center" data-page="mod-setup" style="padding:2rem">
  <div class="container" style="max-width:480px">
    <button data-back="home" class="btn btn-secondary btn-sm" style="margin-bottom:1.5rem">← Zurück</button>

    <div class="card">
      <h2 style="margin-bottom:1.5rem">Neue Sitzung</h2>

      <div class="input-group">
        <label for="mod-name">Dein Name als Moderator</label>
        <input id="mod-name" class="input" type="text" placeholder="z.B. Alex" value="Moderator">
      </div>

      <p style="font-size:0.875rem;color:var(--text-muted);margin-bottom:1.5rem">
        Die Quiz-Fragen werden aus <code>data/quiz-sample.json</code> geladen.
        Du kannst diese Datei jederzeit anpassen.
      </p>

      <button id="create-session-btn" class="btn btn-primary" style="width:100%">
        🚀 Sitzung erstellen
      </button>
    </div>
  </div>
</div>

<!-- ═══════════════════════════════════════════════════════════
     MODERATOR: LOBBY
═══════════════════════════════════════════════════════════ -->
<div class="page" data-page="mod-lobby" style="padding:1.5rem">
  <div class="container" style="max-width:700px">

    <div class="card" style="margin-bottom:1.5rem;text-align:center">
      <p style="color:var(--text-secondary);margin-bottom:0.5rem;font-size:0.9rem;text-transform:uppercase;letter-spacing:0.1em">Sitzungscode</p>
      <div id="mod-session-code" class="session-code">——</div>
      <p style="color:var(--text-muted);font-size:0.85rem;margin-top:0.5rem">
        Spieler geben diesen Code auf der Beitrittsseite ein
      </p>
      <button id="copy-code-btn" class="btn btn-secondary btn-sm" style="margin-top:1rem">
        📋 Code kopieren
      </button>
    </div>

    <div class="card" style="margin-bottom:1.5rem">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem">
        <h3>Spieler in der Lobby</h3>
        <span style="color:var(--accent);font-family:var(--font-display);font-size:1.5rem">
          <span id="mod-player-count">0</span> Spieler
        </span>
      </div>
      <div id="lobby-player-list" class="player-list">
        <p style="color:var(--text-muted);text-align:center">Noch keine Spieler…</p>
      </div>
    </div>

    <button id="start-game-btn" class="btn btn-primary btn-lg" style="width:100%">
      ▶ Spiel starten
    </button>
  </div>
</div>

<!-- ═══════════════════════════════════════════════════════════
     MODERATOR: SPIEL
═══════════════════════════════════════════════════════════ -->
<div class="page" data-page="mod-game" style="padding:1.5rem">
  <div class="container" style="max-width:1000px">

    <div style="display:grid;grid-template-columns:1fr auto;gap:1.5rem;align-items:start">

      <!-- Linke Spalte: Frage + Steuerung -->
      <div>

        <!-- Runden/Fragen-Info -->
        <div id="mod-question-info" class="card-sm" style="display:flex;justify-content:space-between;margin-bottom:1rem;font-size:0.875rem;color:var(--text-secondary)">
          <span>Runde —</span><span>Frage —</span>
        </div>

        <!-- Fragen-Vorschau -->
        <div id="mod-question-preview" class="card" style="margin-bottom:1rem">
          <p style="color:var(--text-muted)">Lade Frage…</p>
        </div>

        <!-- Buzzer-Alert -->
        <div id="buzzer-alert" class="card-sm" style="display:none;border-color:var(--buzzer);color:var(--buzzer);font-weight:700;font-size:1.1rem;margin-bottom:1rem;text-align:center"></div>

        <!-- Steuerung -->
        <div class="card" style="margin-bottom:1rem">
          <h3 style="margin-bottom:1rem">Fragen-Steuerung</h3>

          <!-- Timer-Einstellung -->
          <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1rem">
            <label style="font-size:0.875rem;color:var(--text-secondary);white-space:nowrap">Timer:</label>
            <input id="timer-value" type="range" min="0" max="120" step="5" value="30" style="flex:1">
            <span id="timer-setting-display" style="color:var(--accent);font-weight:700;min-width:60px;text-align:right">30s</span>
          </div>

          <div style="display:flex;gap:0.75rem;flex-wrap:wrap">
            <button id="open-question-btn" class="btn btn-success">▶ Frage öffnen</button>
            <button id="close-question-btn" class="btn btn-danger" disabled>⏹ Frage schließen</button>
            <button id="next-question-btn" class="btn btn-secondary">⏭ Nächste Frage</button>
          </div>

          <div style="display:flex;align-items:center;gap:1rem;margin-top:1rem">
            <div id="mod-timer-display" class="timer-display">–</div>
            <span id="answer-count" style="color:var(--text-secondary);font-size:0.9rem">0/0 Antworten</span>
          </div>
        </div>

        <!-- Antwort-Auswertung -->
        <div class="card" style="margin-bottom:1rem">
          <h3 style="margin-bottom:1rem">Antworten</h3>
          <div id="mod-answer-area">
            <p style="color:var(--text-muted)">Frage noch nicht geöffnet.</p>
          </div>
        </div>

        <!-- Punkte manuell vergeben -->
        <div class="card" style="margin-bottom:1rem">
          <h3 style="margin-bottom:0.5rem">Punkte vergeben</h3>
          <p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:1rem">
            Positive oder negative Werte eingeben, dann "Vergeben" klicken.
          </p>
          <div id="award-points-form"></div>
          <button id="award-points-btn" class="btn btn-primary" style="margin-top:1rem">
            ✓ Punkte vergeben
          </button>
        </div>

        <!-- Gewinner eintragen -->
        <div class="card">
          <h3 style="margin-bottom:1rem">Rundengewinner eintragen</h3>
          <div style="display:flex;gap:0.75rem;align-items:center;flex-wrap:wrap">
            <select id="winner-select" class="input" style="flex:1;min-width:150px">
              <option value="">Spieler wählen…</option>
            </select>
            <input id="winner-points" type="number" class="input" placeholder="Punkte" style="width:100px" value="100">
            <button id="set-winner-btn" class="btn btn-primary">🏆 Vergeben</button>
          </div>
        </div>

      </div>

      <!-- Rechte Spalte: Spielerliste -->
      <div style="min-width:220px">
        <div class="card" style="position:sticky;top:1rem">
          <h3 style="margin-bottom:1rem">Rangliste</h3>
          <div id="mod-player-list" class="player-list"></div>
        </div>
      </div>

    </div>
  </div>
</div>

<!-- ═══════════════════════════════════════════════════════════
     MODERATOR: ENDE
═══════════════════════════════════════════════════════════ -->
<div class="page center" data-page="mod-end" style="padding:2rem">
  <div class="container center" style="max-width:540px;gap:2rem">
    <div>
      <h1>QUIZ BEENDET</h1>
      <p style="color:var(--text-secondary)">Endstand</p>
    </div>

    <div id="mod-final-scores" class="scoreboard" style="width:100%"></div>

    <button id="new-game-btn" class="btn btn-primary btn-lg" style="width:100%">
      🔄 Neues Spiel
    </button>
  </div>
</div>

<!-- ═══════════════════════════════════════════════════════════
     SPIELER: BEITRETEN
═══════════════════════════════════════════════════════════ -->
<div class="page center" data-page="player-join" style="padding:2rem">
  <div class="container" style="max-width:420px">
    <button data-back="home" class="btn btn-secondary btn-sm" style="margin-bottom:1.5rem">← Zurück</button>

    <div class="card">
      <h2 style="margin-bottom:1.5rem">Spiel beitreten</h2>

      <div class="input-group">
        <label for="join-name">Dein Name</label>
        <input id="join-name" class="input" type="text" placeholder="z.B. Marie" autocomplete="off">
      </div>

      <div class="input-group">
        <label for="join-code">Sitzungscode</label>
        <input id="join-code" class="input" type="text" placeholder="z.B. ABC123"
               maxlength="6" autocomplete="off"
               style="font-family:var(--font-display);font-size:1.5rem;letter-spacing:0.2em;text-align:center">
      </div>

      <button id="join-btn" class="btn btn-primary" style="width:100%;margin-top:0.5rem">
        🎮 Beitreten
      </button>
    </div>
  </div>
</div>

<!-- ═══════════════════════════════════════════════════════════
     SPIELER: LOBBY
═══════════════════════════════════════════════════════════ -->
<div class="page center" data-page="player-lobby" style="padding:2rem">
  <div class="container center" style="max-width:420px;gap:1.5rem">
    <div>
      <h2>Bereit!</h2>
      <p>Hey <strong id="player-lobby-name">–</strong>, du bist drin!</p>
    </div>

    <div class="card" style="width:100%;text-align:center">
      <p style="color:var(--text-secondary);margin-bottom:0.5rem">Sitzungscode</p>
      <div id="player-lobby-code" class="session-code" style="font-size:2.5rem">——</div>
    </div>

    <div class="card-sm" style="width:100%;text-align:center">
      <div style="display:flex;gap:0.5rem;justify-content:center;margin-bottom:1rem">
        <span class="loading-dot"></span>
        <span class="loading-dot"></span>
        <span class="loading-dot"></span>
      </div>
      <p>Warte auf den Moderator…</p>
      <p style="font-size:0.85rem;color:var(--text-muted);margin-top:0.5rem">
        <span id="player-count">–</span> Spieler in der Lobby
      </p>
    </div>
  </div>
</div>

<!-- ═══════════════════════════════════════════════════════════
     SPIELER: SPIEL
═══════════════════════════════════════════════════════════ -->
<div class="page" data-page="player-game" style="padding:1.5rem">
  <div class="container" style="max-width:600px">

    <!-- Header: Score + Timer -->
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem">
      <div>
        <p style="font-size:0.8rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.1em">Punkte</p>
        <p id="player-score-display" style="font-family:var(--font-display);font-size:2rem;color:var(--accent)">0</p>
      </div>
      <div id="player-timer" class="timer-display" style="display:none">–</div>
    </div>

    <!-- Hauptbereich: Frage -->
    <div id="player-question-area" class="card" style="min-height:300px">
      <div class="center" style="padding:3rem 1rem">
        <p style="color:var(--text-muted)">Warte auf den Moderator…</p>
      </div>
    </div>

    <!-- Buzzer -->
    <div style="display:flex;justify-content:center;margin-top:2rem">
      <button id="buzzer-btn" class="buzzer-btn" style="display:none" disabled>
        BUZZ!
      </button>
    </div>

  </div>
</div>

<!-- ═══════════════════════════════════════════════════════════
     SPIELER: ENDE
═══════════════════════════════════════════════════════════ -->
<div class="page center" data-page="player-end" style="padding:2rem">
  <div class="container center" style="max-width:480px;gap:2rem">
    <div>
      <h1>GAME OVER</h1>
      <p style="color:var(--text-secondary)">Das Quiz ist beendet!</p>
    </div>

    <div id="player-final-scores" class="scoreboard" style="width:100%"></div>

    <button data-back="home" class="btn btn-secondary btn-lg" style="width:100%">
      🏠 Zur Startseite
    </button>
  </div>
</div>

<!-- ─── Scripts ──────────────────────────────────────────── -->
<script src="js/core/session-engine.js"></script>
<script src="js/core/timer-engine.js"></script>
<script src="js/question-types/renderers.js"></script>
<script src="js/views/moderator-view.js"></script>
<script src="js/views/player-view.js"></script>
<script src="js/core/app.js"></script>

</body>
</html>
