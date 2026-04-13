/**
 * QuizMaster – Spieler-Ansicht
 * =============================
 * Verwaltet die UI für den Spieler:
 * Lobby → Warten → Frage → Buzzer → Ergebnis
 */

const PlayerView = (() => {

  let _currentQuestion = null;
  let _timerInterval = null;

  // ─── Init ────────────────────────────────────────────────

  function init() {
    _bindEvents();
  }

  function _bindEvents() {
    // Beitrittsformular
    document.getElementById('join-btn')?.addEventListener('click', _handleJoin);
    document.getElementById('join-code')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') _handleJoin();
    });

    // Buzzer
    document.getElementById('buzzer-btn')?.addEventListener('click', _handleBuzzer);

    // SessionEngine Events
    SessionEngine.on('sessionStarted',   _onSessionStarted);
    SessionEngine.on('questionOpened',   _onQuestionOpened);
    SessionEngine.on('questionClosed',   _onQuestionClosed);
    SessionEngine.on('questionChanged',  _onQuestionChanged);
    SessionEngine.on('buzzer',           _onBuzzerActivated);
    SessionEngine.on('scoreUpdate',      _onScoreUpdate);
    SessionEngine.on('sessionEnded',     _onSessionEnded);
    SessionEngine.on('playerJoined',     _onPlayerListUpdate);
  }

  // ─── Beitreten ──────────────────────────────────────────

  function _handleJoin() {
    const code = document.getElementById('join-code')?.value?.trim().toUpperCase();
    const name = document.getElementById('join-name')?.value?.trim();

    if (!code || code.length < 4) {
      showToast('Bitte gib einen gültigen Code ein.', 'error');
      return;
    }
    if (!name || name.length < 2) {
      showToast('Bitte gib deinen Namen ein.', 'error');
      return;
    }

    try {
      const { playerId, state } = SessionEngine.joinSession(code, name);
      showPage('player-lobby');
      document.getElementById('player-lobby-name').textContent = name;
      document.getElementById('player-lobby-code').textContent = code;
      _updatePlayerCount(state.players.length);
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  // ─── Event Handler ──────────────────────────────────────

  function _onSessionStarted({ state }) {
    showPage('player-game');
    _renderWaiting('Das Spiel beginnt!');
  }

  function _onQuestionOpened({ roundIndex, questionIndex, timer }) {
    const state = SessionEngine.getState();
    const question = state.quiz.rounds[roundIndex]?.questions[questionIndex];
    if (!question) return;

    _currentQuestion = question;
    _renderQuestion(question);

    if (timer && timer.duration > 0) {
      _startTimerDisplay(timer.endsAt);
    }
  }

  function _onQuestionClosed() {
    _stopTimerDisplay();
    _renderWaiting('Frage geschlossen – Auswertung läuft…');
    _disableBuzzer();
  }

  function _onQuestionChanged({ roundIndex, questionIndex }) {
    _stopTimerDisplay();
    _renderWaiting('Nächste Frage kommt gleich…');
    _disableBuzzer();
  }

  function _onBuzzerActivated(payload) {
    const myId = SessionEngine.getPlayerId();
    if (payload.playerId === myId) {
      document.getElementById('buzzer-btn')?.classList.add('pressed');
      showToast('🔔 Du hast den Buzzer gedrückt!', 'accent');
    } else {
      _disableBuzzer();
      showToast(`${payload.playerName || 'Jemand'} hat gebuzzert!`, 'error');
    }
  }

  function _onScoreUpdate({ scores }) {
    const myId = SessionEngine.getPlayerId();
    const myScore = scores[myId] || 0;
    const el = document.getElementById('player-score-display');
    if (el) el.textContent = myScore;
  }

  function _onSessionEnded({ scores }) {
    _stopTimerDisplay();
    showPage('player-end');
    _renderFinalScoreboard(scores);
  }

  function _onPlayerListUpdate({ player }) {
    const state = SessionEngine.getState();
    if (state) _updatePlayerCount(state.players.length);
  }

  // ─── Render-Funktionen ───────────────────────────────────

  function _renderWaiting(msg) {
    const area = document.getElementById('player-question-area');
    if (!area) return;
    area.innerHTML = `
      <div class="center" style="padding:3rem 1rem">
        <div style="display:flex;gap:0.5rem;margin-bottom:1.5rem">
          <span class="loading-dot"></span>
          <span class="loading-dot"></span>
          <span class="loading-dot"></span>
        </div>
        <p style="color:var(--text-secondary)">${msg}</p>
      </div>
    `;
    _hideBuzzer();
  }

  function _renderQuestion(question) {
    const area = document.getElementById('player-question-area');
    if (!area) return;

    area.innerHTML = '';

    // Kategorie-Chip
    if (question.category) {
      const cat = document.createElement('div');
      cat.className = 'question-category';
      cat.textContent = question.category;
      area.appendChild(cat);
    }

    // Fragetext
    const qText = document.createElement('div');
    qText.className = 'question-text';
    qText.textContent = question.text;
    area.appendChild(qText);

    // Antwortbereich
    const answerArea = document.createElement('div');
    answerArea.id = 'answer-input-area';

    const renderer = QuestionTypes[question.type];
    if (renderer) {
      renderer.renderPlayer(question, answerArea, (answer) => {
        try {
          SessionEngine.submitAnswer(answer);
          showToast('✓ Antwort abgegeben!', 'success');
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    } else {
      answerArea.innerHTML = `<p style="color:var(--text-muted)">Fragetyp "${question.type}" nicht unterstützt.</p>`;
    }

    area.appendChild(answerArea);

    // Buzzer anzeigen, wenn aktiviert
    const state = SessionEngine.getState();
    if (state?.buzzer?.enabled && !state?.buzzer?.activatedBy) {
      _showBuzzer();
    }
  }

  function _renderFinalScoreboard(scores) {
    const container = document.getElementById('player-final-scores');
    if (!container) return;

    const state = SessionEngine.getState();
    const players = state?.players || [];

    const sorted = players
      .map(p => ({ name: p.name, score: scores[p.id] || 0 }))
      .sort((a, b) => b.score - a.score);

    const ranks = ['🥇', '🥈', '🥉'];
    container.innerHTML = sorted.map((p, i) => `
      <div class="score-row">
        <span class="score-rank ${i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : ''}">${ranks[i] || (i + 1) + '.'}</span>
        <span class="score-name">${p.name}</span>
        <span class="score-pts">${p.score}</span>
      </div>
    `).join('');
  }

  // ─── Timer ───────────────────────────────────────────────

  function _startTimerDisplay(endsAt) {
    _stopTimerDisplay();
    const el = document.getElementById('player-timer');
    if (!el) return;

    el.style.display = 'flex';

    _timerInterval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      el.textContent = remaining;
      el.classList.toggle('warning', remaining <= 5);
      if (remaining <= 0) _stopTimerDisplay();
    }, 200);
  }

  function _stopTimerDisplay() {
    if (_timerInterval) { clearInterval(_timerInterval); _timerInterval = null; }
    const el = document.getElementById('player-timer');
    if (el) { el.textContent = '–'; el.classList.remove('warning'); }
  }

  // ─── Buzzer ──────────────────────────────────────────────

  function _showBuzzer() {
    const btn = document.getElementById('buzzer-btn');
    if (btn) { btn.style.display = 'flex'; btn.disabled = false; btn.classList.remove('pressed'); }
  }

  function _hideBuzzer() {
    const btn = document.getElementById('buzzer-btn');
    if (btn) { btn.style.display = 'none'; }
  }

  function _disableBuzzer() {
    const btn = document.getElementById('buzzer-btn');
    if (btn) { btn.disabled = true; }
  }

  function _handleBuzzer() {
    try {
      SessionEngine.pressBuzzer();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  // ─── Helper ──────────────────────────────────────────────

  function _updatePlayerCount(count) {
    const el = document.getElementById('player-count');
    if (el) el.textContent = count;
  }

  return { init };
})();

window.PlayerView = PlayerView;
