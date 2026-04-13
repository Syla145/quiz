/**
 * QuizMaster - Session & State Engine
 * =====================================
 * Verwaltet den gesamten Spielzustand lokal.
 * Im MVP: BroadcastChannel für Same-Device-Kommunikation.
 * Spätere Erweiterung: WebSocket-Backend als Drop-in-Ersatz.
 */

const SessionEngine = (() => {

  // ─── Konstanten ─────────────────────────────────────────
  const STORAGE_KEY = 'quizmaster_session';
  const CHANNEL_NAME = 'quizmaster_channel';

  // ─── Interner Zustand ───────────────────────────────────
  let _state = null;
  let _role = null; // 'moderator' | 'player'
  let _playerId = null;
  let _channel = null;
  let _listeners = {};

  // ─── Hilfsfunktionen ────────────────────────────────────

  /** Generiert einen zufälligen 6-stelligen alphanumerischen Code */
  function generateCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return Array.from({ length: 6 }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join('');
  }

  /** Generiert eine eindeutige ID */
  function generateId(prefix = 'id') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  }

  /** Speichert den Zustand in localStorage */
  function persist() {
    if (_state) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(_state));
    }
  }

  /** Lädt den Zustand aus localStorage */
  function loadFromStorage() {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  }

  /** Sendet eine Nachricht über BroadcastChannel */
  function broadcast(type, payload = {}) {
    if (_channel) {
      _channel.postMessage({ type, payload, timestamp: Date.now() });
    }
  }

  /** Ruft registrierte Event-Listener auf */
  function emit(event, data) {
    if (_listeners[event]) {
      _listeners[event].forEach(fn => fn(data));
    }
    if (_listeners['*']) {
      _listeners['*'].forEach(fn => fn({ event, data }));
    }
  }

  // ─── Öffentliche API ────────────────────────────────────

  /**
   * Registriert einen Event-Listener.
   * Events: 'stateUpdate', 'playerJoined', 'playerLeft',
   *         'questionOpened', 'questionClosed', 'buzzer',
   *         'scoreUpdate', 'sessionEnded'
   */
  function on(event, fn) {
    if (!_listeners[event]) _listeners[event] = [];
    _listeners[event].push(fn);
  }

  function off(event, fn) {
    if (_listeners[event]) {
      _listeners[event] = _listeners[event].filter(f => f !== fn);
    }
  }

  /**
   * Moderator: Erstellt eine neue Sitzung
   * @param {Object} quizData - Das geladene Quiz-JSON
   * @param {string} moderatorName
   */
  function createSession(quizData, moderatorName) {
    const code = generateCode();
    _state = {
      id: generateId('session'),
      code,
      quizId: quizData.quiz.id,
      quiz: quizData.quiz,
      status: 'lobby',           // lobby | active | paused | ended
      createdAt: Date.now(),
      moderator: {
        id: generateId('mod'),
        name: moderatorName || 'Moderator'
      },
      players: [],
      currentRoundIndex: 0,
      currentQuestionIndex: 0,
      questionStatus: 'idle',    // idle | open | closed | evaluated
      buzzer: {
        enabled: false,
        activatedBy: null,
        activatedAt: null
      },
      scores: {},
      answers: {},
      timer: {
        duration: 0,
        startedAt: null,
        endsAt: null,
        status: 'idle'           // idle | running | expired
      }
    };

    _role = 'moderator';
    persist();
    _initChannel();
    emit('sessionCreated', { code, state: _state });
    return { code, state: _state };
  }

  /**
   * Spieler: Tritt einer Sitzung bei
   * @param {string} code - Sitzungscode
   * @param {string} playerName
   */
  function joinSession(code, playerName) {
    // Im MVP: Zustand aus localStorage lesen (gleicher Browser/Gerät)
    const stored = loadFromStorage();
    if (!stored || stored.code !== code.toUpperCase()) {
      throw new Error('Sitzung nicht gefunden. Bitte Code prüfen.');
    }
    if (stored.status !== 'lobby') {
      throw new Error('Diese Sitzung ist bereits gestartet oder beendet.');
    }

    _state = stored;
    _role = 'player';
    _playerId = generateId('player');

    const player = {
      id: _playerId,
      name: playerName,
      avatar: null,
      joinedAt: Date.now(),
      status: 'active',
      score: 0,
      answers: {},
      buzzerPresses: []
    };

    _state.players.push(player);
    _state.scores[_playerId] = 0;
    persist();
    _initChannel();

    broadcast('PLAYER_JOINED', { player });
    emit('joinedSession', { player, state: _state });
    return { playerId: _playerId, state: _state };
  }

  /**
   * Moderator: Startet die Sitzung
   */
  function startSession() {
    _requireRole('moderator');
    _state.status = 'active';
    persist();
    broadcast('SESSION_STARTED', { state: _state });
    emit('sessionStarted', { state: _state });
  }

  /**
   * Moderator: Öffnet die aktuelle Frage für Antworten
   * @param {number} timerSeconds - 0 = kein Timer
   */
  function openQuestion(timerSeconds = 0) {
    _requireRole('moderator');
    _state.questionStatus = 'open';

    // Timer vorbereiten
    if (timerSeconds > 0) {
      const now = Date.now();
      _state.timer = {
        duration: timerSeconds,
        startedAt: now,
        endsAt: now + timerSeconds * 1000,
        status: 'running'
      };
    } else {
      _state.timer = { duration: 0, startedAt: null, endsAt: null, status: 'idle' };
    }

    // Antworten für diese Frage zurücksetzen
    const qId = _getCurrentQuestionId();
    _state.answers[qId] = {};
    // Buzzer nur aktiv wenn answerMode === "buzzer"
    const _currentQ = getCurrentQuestion();
    const _buzzerOn = _currentQ?.answerMode === 'buzzer';
    _state.buzzer = { enabled: _buzzerOn, activatedBy: null, activatedAt: null };

    persist();
    broadcast('QUESTION_OPENED', {
      roundIndex: _state.currentRoundIndex,
      questionIndex: _state.currentQuestionIndex,
      timer: _state.timer
    });
    emit('questionOpened', { state: _state });
  }

  /**
   * Moderator: Schließt die aktuelle Frage
   */
  function closeQuestion() {
    _requireRole('moderator');
    _state.questionStatus = 'closed';
    _state.timer.status = 'idle';
    _state.buzzer.enabled = false;
    persist();
    broadcast('QUESTION_CLOSED', {});
    emit('questionClosed', { state: _state });
  }

  /**
   * Spieler: Gibt eine Antwort ab
   * @param {any} answer - Die Antwort des Spielers
   */
  function submitAnswer(answer) {
    _requireRole('player');
    if (_state.questionStatus !== 'open') {
      throw new Error('Die Frage ist nicht geöffnet.');
    }

    const qId = _getCurrentQuestionId();
    if (!_state.answers[qId]) _state.answers[qId] = {};
    _state.answers[qId][_playerId] = {
      value: answer,
      submittedAt: Date.now()
    };

    persist();
    broadcast('ANSWER_SUBMITTED', {
      playerId: _playerId,
      questionId: qId,
      answer
    });
    emit('answerSubmitted', { playerId: _playerId, answer });
  }

  /**
   * Spieler: Drückt den Buzzer
   */
  function pressBuzzer() {
    _requireRole('player');
    if (!_state.buzzer.enabled || _state.buzzer.activatedBy) return;
    if (_state.questionStatus !== 'open') return;

    _state.buzzer.activatedBy = _playerId;
    _state.buzzer.activatedAt = Date.now();
    _state.buzzer.enabled = false;

    persist();
    broadcast('BUZZER_PRESSED', {
      playerId: _playerId,
      playerName: _getPlayerName(_playerId),
      at: _state.buzzer.activatedAt
    });
    emit('buzzer', { playerId: _playerId });
  }

  /**
   * Moderator: Vergibt Punkte manuell
   * @param {Object} pointsMap - { playerId: punkte, ... }
   */
  function awardPoints(pointsMap) {
    _requireRole('moderator');
    Object.entries(pointsMap).forEach(([pid, pts]) => {
      if (_state.scores[pid] === undefined) _state.scores[pid] = 0;
      _state.scores[pid] += pts;

      const player = _state.players.find(p => p.id === pid);
      if (player) player.score = _state.scores[pid];
    });

    persist();
    broadcast('SCORES_UPDATED', { scores: _state.scores });
    emit('scoreUpdate', { scores: _state.scores });
  }

  /**
   * Moderator: Setzt den Punktestand manuell (überschreiben)
   */
  function setScore(playerId, points) {
    _requireRole('moderator');
    _state.scores[playerId] = points;
    const player = _state.players.find(p => p.id === playerId);
    if (player) player.score = points;

    persist();
    broadcast('SCORES_UPDATED', { scores: _state.scores });
    emit('scoreUpdate', { scores: _state.scores });
  }

  /**
   * Moderator: Nächste Frage
   */
  function nextQuestion() {
    _requireRole('moderator');
    const round = _state.quiz.rounds[_state.currentRoundIndex];

    if (_state.currentQuestionIndex < round.questions.length - 1) {
      _state.currentQuestionIndex++;
    } else if (_state.currentRoundIndex < _state.quiz.rounds.length - 1) {
      _state.currentRoundIndex++;
      _state.currentQuestionIndex = 0;
    } else {
      // Quiz beendet
      _state.status = 'ended';
      persist();
      broadcast('SESSION_ENDED', { scores: _state.scores });
      emit('sessionEnded', { scores: _state.scores });
      return;
    }

    _state.questionStatus = 'idle';
    _state.timer = { duration: 0, startedAt: null, endsAt: null, status: 'idle' };
    _state.buzzer = { enabled: false, activatedBy: null, activatedAt: null };

    persist();
    broadcast('QUESTION_CHANGED', {
      roundIndex: _state.currentRoundIndex,
      questionIndex: _state.currentQuestionIndex
    });
    emit('questionChanged', { state: _state });
  }

  /**
   * Gibt den aktuellen Zustand zurück (Snapshot)
   */
  function getState() {
    return _state ? JSON.parse(JSON.stringify(_state)) : null;
  }

  function getRole() { return _role; }
  function getPlayerId() { return _playerId; }

  /**
   * Gibt die aktuelle Frage zurück
   */
  function getCurrentQuestion() {
    if (!_state) return null;
    const round = _state.quiz.rounds[_state.currentRoundIndex];
    if (!round) return null;
    return round.questions[_state.currentQuestionIndex] || null;
  }

  /**
   * Gibt alle Antworten für die aktuelle Frage zurück
   */
  function getCurrentAnswers() {
    const qId = _getCurrentQuestionId();
    return (_state && _state.answers[qId]) || {};
  }

  // ─── Private Hilfsmethoden ──────────────────────────────

  function _requireRole(role) {
    if (_role !== role) throw new Error(`Nur ${role} darf diese Aktion ausführen.`);
  }

  function _getCurrentQuestionId() {
    const q = getCurrentQuestion();
    return q ? q.id : null;
  }

  function _getPlayerName(id) {
    const p = _state.players.find(p => p.id === id);
    return p ? p.name : 'Unbekannt';
  }

  function _initChannel() {
    if (_channel) _channel.close();

    // BroadcastChannel: funktioniert auf gleichem Gerät / gleicher Origin
    if ('BroadcastChannel' in window) {
      _channel = new BroadcastChannel(CHANNEL_NAME);
      _channel.onmessage = (evt) => {
        const { type, payload } = evt.data;

        // Moderator empfängt Nachrichten von Spielern und aktualisiert State
        if (_role === 'moderator') {
          _handleIncomingMessage(type, payload);
        }

        // Alle Rollen: State neu laden und Events weiterleiten
        const fresh = loadFromStorage();
        if (fresh && fresh.id === _state?.id) {
          _state = fresh;
        }

        emit('channelMessage', { type, payload });

        // Spezifische Events mappen
        const eventMap = {
          PLAYER_JOINED: 'playerJoined',
          QUESTION_OPENED: 'questionOpened',
          QUESTION_CLOSED: 'questionClosed',
          BUZZER_PRESSED: 'buzzer',
          SCORES_UPDATED: 'scoreUpdate',
          SESSION_STARTED: 'sessionStarted',
          SESSION_ENDED: 'sessionEnded',
          QUESTION_CHANGED: 'questionChanged',
          ANSWER_SUBMITTED: 'answerSubmitted'
        };
        if (eventMap[type]) emit(eventMap[type], payload);
      };
    }
  }

  function _handleIncomingMessage(type, payload) {
    // Moderator verarbeitet eingehende Spieler-Aktionen
    if (type === 'PLAYER_JOINED') {
      const fresh = loadFromStorage();
      if (fresh) _state = fresh;
    }
    if (type === 'ANSWER_SUBMITTED') {
      const { playerId, questionId, answer } = payload;
      if (!_state.answers[questionId]) _state.answers[questionId] = {};
      _state.answers[questionId][playerId] = {
        value: answer,
        submittedAt: Date.now()
      };
      persist();
    }
    if (type === 'BUZZER_PRESSED') {
      if (!_state.buzzer.activatedBy) {
        _state.buzzer.activatedBy = payload.playerId;
        _state.buzzer.activatedAt = payload.at;
        _state.buzzer.enabled = false;
        persist();
      }
    }
  }

  // ─── Öffentliche API exportieren ────────────────────────
  return {
    on, off,
    createSession, joinSession, startSession,
    openQuestion, closeQuestion, submitAnswer,
    pressBuzzer, awardPoints, setScore,
    nextQuestion,
    getState, getRole, getPlayerId,
    getCurrentQuestion, getCurrentAnswers
  };

})();

// Global verfügbar machen
window.SessionEngine = SessionEngine;
