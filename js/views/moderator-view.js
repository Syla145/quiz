/**
 * QuizMaster – Moderator-Ansicht
 * ================================
 * Vollständige Steuerungslogik für den Moderator:
 * Sitzung erstellen → Lobby → Fragen steuern → Punkte vergeben
 */

const ModeratorView = (() => {

  let _quizData = null;
  let _timerInterval = null;
  let _manualTimer = 30;

  // ─── Init ────────────────────────────────────────────────

  function init() {
    _loadQuiz();
    _bindEvents();
  }

  async function _loadQuiz() {
    try {
      const res = await fetch('data/quiz-sample.json');
      _quizData = await res.json();
    } catch (err) {
      console.warn('Quiz-JSON nicht gefunden, Demo-Modus aktiv.', err);
      _quizData = _getDemoQuiz();
    }
  }

  function _bindEvents() {
    // Sitzung erstellen
    document.getElementById('create-session-btn')?.addEventListener('click', _handleCreateSession);

    // Lobby Aktionen
    document.getElementById('start-game-btn')?.addEventListener('click', _handleStartGame);

    // Fragen-Steuerung
    document.getElementById('open-question-btn')?.addEventListener('click', _handleOpenQuestion);
    document.getElementById('close-question-btn')?.addEventListener('click', _handleCloseQuestion);
    document.getElementById('next-question-btn')?.addEventListener('click', _handleNextQuestion);

    // Timer-Einstellung
    document.getElementById('timer-value')?.addEventListener('input', (e) => {
      _manualTimer = parseInt(e.target.value) || 0;
      const display = document.getElementById('timer-setting-display');
      if (display) display.textContent = _manualTimer > 0 ? `${_manualTimer}s` : 'Kein Timer';
    });

    // Punkte vergeben
    document.getElementById('award-points-btn')?.addEventListener('click', _handleAwardPoints);
    document.getElementById('set-winner-btn')?.addEventListener('click', _handleSetWinner);

    // SessionEngine Events
    SessionEngine.on('playerJoined',    _onPlayerJoined);
    SessionEngine.on('questionOpened',  _onQuestionOpened);
    SessionEngine.on('questionClosed',  _onQuestionClosed);
    SessionEngine.on('answerSubmitted', _onAnswerUpdate);
    SessionEngine.on('buzzer',          _onBuzzer);
    SessionEngine.on('scoreUpdate',     _onScoreUpdate);
    SessionEngine.on('sessionEnded',    _onSessionEnded);
  }

  // ─── Session erstellen ───────────────────────────────────

  function _handleCreateSession() {
    const modName = document.getElementById('mod-name')?.value?.trim() || 'Moderator';

    if (!_quizData) {
      showToast('Quiz-Daten werden noch geladen…', 'error');
      return;
    }

    const { code } = SessionEngine.createSession(_quizData, modName);

    document.getElementById('mod-session-code').textContent = code;
    document.getElementById('mod-player-count').textContent = '0';
    showPage('mod-lobby');

    // Code-Kopier-Button
    document.getElementById('copy-code-btn')?.addEventListener('click', () => {
      navigator.clipboard.writeText(code).then(() => showToast('Code kopiert!', 'success'));
    });
  }

  // ─── Spiel starten ───────────────────────────────────────

  function _handleStartGame() {
    const state = SessionEngine.getState();
    if (!state || state.players.length === 0) {
      showToast('Mindestens 1 Spieler muss beigetreten sein.', 'error');
      return;
    }
    SessionEngine.startSession();
    showPage('mod-game');
    _renderCurrentQuestion();
    _renderPlayerList();
  }

  // ─── Fragen-Steuerung ────────────────────────────────────

  function _handleOpenQuestion() {
    SessionEngine.openQuestion(_manualTimer);
    _updateQuestionControls('open');
    if (_manualTimer > 0) _startModTimer(_manualTimer);
  }

  function _handleCloseQuestion() {
    SessionEngine.closeQuestion();
    _stopModTimer();
    _updateQuestionControls('closed');
    _renderAnswers();
  }

  function _handleNextQuestion() {
    _stopModTimer();
    SessionEngine.nextQuestion();
    const state = SessionEngine.getState();
    if (state?.status !== 'ended') {
      _renderCurrentQuestion();
      _updateQuestionControls('idle');
    }
  }

  function _updateQuestionControls(status) {
    const openBtn  = document.getElementById('open-question-btn');
    const closeBtn = document.getElementById('close-question-btn');
    const nextBtn  = document.getElementById('next-question-btn');

    if (openBtn)  openBtn.disabled  = (status === 'open');
    if (closeBtn) closeBtn.disabled = (status !== 'open');
    if (nextBtn)  nextBtn.disabled  = (status === 'open');
  }

  // ─── Punkte-Vergabe ──────────────────────────────────────

  function _handleAwardPoints() {
    const container = document.getElementById('award-points-form');
    if (!container) return;

    const pointsMap = {};
    container.querySelectorAll('.award-row').forEach(row => {
      const pid = row.dataset.playerId;
      const input = row.querySelector('.points-input');
      const val = parseInt(input?.value);
      if (pid && !isNaN(val) && val !== 0) {
        pointsMap[pid] = val;
      }
    });

    if (Object.keys(pointsMap).length === 0) {
      showToast('Keine Punkte eingetragen.', 'error');
      return;
    }

    SessionEngine.awardPoints(pointsMap);
    showToast('Punkte vergeben!', 'success');

    // Inputs zurücksetzen
    container.querySelectorAll('.points-input').forEach(i => i.value = '');
  }

  function _handleSetWinner() {
    const select = document.getElementById('winner-select');
    const pointsInput = document.getElementById('winner-points');
    if (!select || !pointsInput) return;

    const pid = select.value;
    const pts = parseInt(pointsInput.value);

    if (!pid || isNaN(pts) || pts <= 0) {
      showToast('Bitte Spieler und Punkte auswählen.', 'error');
      return;
    }

    SessionEngine.awardPoints({ [pid]: pts });
    showToast(`Gewinner eingetragen! +${pts} Punkte`, 'success');
  }

  // ─── Event Handler ───────────────────────────────────────

  function _onPlayerJoined({ player }) {
    const state = SessionEngine.getState();
    const count = state?.players?.length || 0;
    const el = document.getElementById('mod-player-count');
    if (el) el.textContent = count;
    _renderLobbyPlayerList(state?.players || []);
  }

  function _onQuestionOpened() {
    _updateAnswerCount(0);
  }

  function _onQuestionClosed() {
    _stopModTimer();
    _renderAnswers();
  }

  function _onAnswerUpdate() {
    const answers = SessionEngine.getCurrentAnswers();
    _updateAnswerCount(Object.keys(answers).length);
  }

  function _onBuzzer({ playerId }) {
    const state = SessionEngine.getState();
    const player = state?.players?.find(p => p.id === playerId);
    const name = player?.name || playerId;

    const buzzerAlert = document.getElementById('buzzer-alert');
    if (buzzerAlert) {
      buzzerAlert.textContent = `🔔 ${name} hat gebuzzert!`;
      buzzerAlert.style.display = 'block';
      setTimeout(() => { buzzerAlert.style.display = 'none'; }, 5000);
    }
    showToast(`🔔 ${name} hat den Buzzer gedrückt!`, 'accent');
  }

  function _onScoreUpdate({ scores }) {
    _renderPlayerList();
  }

  function _onSessionEnded({ scores }) {
    _stopModTimer();
    showPage('mod-end');
    _renderFinalScoreboard(scores);
  }

  // ─── Render-Funktionen ───────────────────────────────────

  function _renderCurrentQuestion() {
    const state = SessionEngine.getState();
    if (!state) return;

    const round = state.quiz.rounds[state.currentRoundIndex];
    const question = round?.questions[state.currentQuestionIndex];

    // Runden/Fragen-Info
    const info = document.getElementById('mod-question-info');
    if (info) {
      info.innerHTML = `
        <span>Runde ${state.currentRoundIndex + 1}/${state.quiz.rounds.length}: ${round?.title || ''}</span>
        <span>Frage ${state.currentQuestionIndex + 1}/${round?.questions?.length || 0}</span>
      `;
    }

    // Fragevorschau
    const preview = document.getElementById('mod-question-preview');
    if (preview && question) {
      preview.innerHTML = `
        <div class="question-category">${question.category || question.type}</div>
        <div class="question-text">${question.text}</div>
        <div style="font-size:0.85rem;color:var(--text-muted);margin-top:0.5rem">
          Typ: ${question.type} · ${question.points} Punkte · Timer: ${question.timer}s
        </div>
      `;
    }

    // Antwortbereich leeren
    const answerArea = document.getElementById('mod-answer-area');
    if (answerArea) answerArea.innerHTML = '<p style="color:var(--text-muted)">Frage noch nicht geöffnet.</p>';

    // Punkte-Formular aktualisieren
    _renderAwardForm();
  }

  function _renderAnswers() {
    const question = SessionEngine.getCurrentQuestion();
    const answers = SessionEngine.getCurrentAnswers();
    const area = document.getElementById('mod-answer-area');
    if (!area || !question) return;

    const renderer = QuestionTypes[question.type];
    if (renderer) {
      renderer.renderModerator(question, answers, area);
    }
  }

  function _renderLobbyPlayerList(players) {
    const list = document.getElementById('lobby-player-list');
    if (!list) return;

    if (players.length === 0) {
      list.innerHTML = '<p style="color:var(--text-muted);text-align:center">Noch keine Spieler…</p>';
      return;
    }

    list.innerHTML = players.map(p => `
      <div class="player-item">
        <span class="player-name">👤 ${p.name}</span>
        <span style="color:var(--text-muted);font-size:0.8rem">Beigetreten</span>
      </div>
    `).join('');
  }

  function _renderPlayerList() {
    const state = SessionEngine.getState();
    if (!state) return;

    const list = document.getElementById('mod-player-list');
    if (!list) return;

    const sorted = [...state.players].sort((a, b) => (state.scores[b.id] || 0) - (state.scores[a.id] || 0));

    list.innerHTML = sorted.map(p => `
      <div class="player-item">
        <span class="player-name">${p.name}</span>
        <span class="player-score">${state.scores[p.id] || 0}</span>
      </div>
    `).join('');
  }

  function _renderAwardForm() {
    const state = SessionEngine.getState();
    if (!state) return;

    // Punkte-Vergabe Formular
    const form = document.getElementById('award-points-form');
    if (form) {
      form.innerHTML = state.players.map(p => `
        <div class="award-row card-sm" data-player-id="${p.id}" style="display:flex;align-items:center;gap:1rem;margin-bottom:0.5rem">
          <span style="flex:1;font-weight:700">${p.name}</span>
          <span style="color:var(--accent);font-family:var(--font-display);font-size:1.3rem">${state.scores[p.id] || 0}</span>
          <input type="number" class="input points-input" placeholder="±Punkte" style="width:100px;padding:0.5rem 0.75rem">
        </div>
      `).join('');
    }

    // Gewinner-Dropdown
    const winnerSelect = document.getElementById('winner-select');
    if (winnerSelect) {
      winnerSelect.innerHTML = '<option value="">Spieler wählen…</option>' +
        state.players.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
    }
  }

  function _renderFinalScoreboard(scores) {
    const container = document.getElementById('mod-final-scores');
    if (!container) return;

    const state = SessionEngine.getState();
    const players = state?.players || [];
    const sorted = players
      .map(p => ({ name: p.name, score: scores[p.id] || 0 }))
      .sort((a, b) => b.score - a.score);

    const ranks = ['gold', 'silver', 'bronze'];
    const icons = ['🥇', '🥈', '🥉'];
    container.innerHTML = sorted.map((p, i) => `
      <div class="score-row">
        <span class="score-rank ${ranks[i] || ''}">${icons[i] || (i + 1) + '.'}</span>
        <span class="score-name">${p.name}</span>
        <span class="score-pts">${p.score}</span>
      </div>
    `).join('');
  }

  // ─── Timer (Moderator-Seite) ─────────────────────────────

  function _startModTimer(seconds) {
    _stopModTimer();
    const endTime = Date.now() + seconds * 1000;
    const el = document.getElementById('mod-timer-display');

    _timerInterval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
      if (el) {
        el.textContent = remaining;
        el.classList.toggle('warning', remaining <= 5);
      }
      if (remaining <= 0) {
        _stopModTimer();
        SessionEngine.closeQuestion();
        _updateQuestionControls('closed');
        _renderAnswers();
        showToast('⏰ Zeit abgelaufen!', 'accent');
      }
    }, 200);
  }

  function _stopModTimer() {
    if (_timerInterval) { clearInterval(_timerInterval); _timerInterval = null; }
    const el = document.getElementById('mod-timer-display');
    if (el) { el.textContent = '–'; el.classList.remove('warning'); }
  }

  // ─── Helper ──────────────────────────────────────────────

  function _updateAnswerCount(count) {
    const el = document.getElementById('answer-count');
    if (el) {
      const total = SessionEngine.getState()?.players?.length || 0;
      el.textContent = `${count}/${total} Antworten`;
    }
  }

  function _getDemoQuiz() {
    return {
      quiz: {
        id: 'demo', title: 'Demo-Quiz', settings: { buzzerEnabled: true },
        rounds: [{
          id: 'r1', title: 'Demo Runde 1',
          questions: [{
            id: 'q1', type: 'multiple-choice', category: 'Demo',
            text: 'Was ist 2 + 2?',
            options: [
              { id: 'a', text: '3' },
              { id: 'b', text: '4' },
              { id: 'c', text: '5' },
              { id: 'd', text: '22' }
            ],
            correctAnswer: 'b', points: 100, timer: 30,
            explanation: 'Die Antwort ist natürlich 4!'
          }]
        }]
      }
    };
  }

  return { init };
})();

window.ModeratorView = ModeratorView;
