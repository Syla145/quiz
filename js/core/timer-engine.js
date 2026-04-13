/**
 * QuizMaster - Timer Modul
 * =========================
 * Verwaltet den Countdown-Timer für Fragen.
 * Unabhängig von der Anzeige – kann von Moderator & Spieler genutzt werden.
 */

const TimerEngine = (() => {
  let _interval = null;
  let _endTime = null;
  let _onTick = null;
  let _onExpire = null;

  /**
   * Startet den Timer
   * @param {number} seconds - Dauer in Sekunden
   * @param {Function} onTick - Callback pro Sekunde: (remaining) => void
   * @param {Function} onExpire - Callback wenn abgelaufen
   */
  function start(seconds, onTick, onExpire) {
    stop(); // Vorherigen Timer stoppen
    _endTime = Date.now() + seconds * 1000;
    _onTick = onTick;
    _onExpire = onExpire;

    _tick();
    _interval = setInterval(_tick, 200); // Öfters prüfen für Genauigkeit
  }

  function _tick() {
    const remaining = Math.max(0, Math.ceil((_endTime - Date.now()) / 1000));
    if (_onTick) _onTick(remaining);
    if (remaining <= 0) {
      stop();
      if (_onExpire) _onExpire();
    }
  }

  function stop() {
    if (_interval) {
      clearInterval(_interval);
      _interval = null;
    }
  }

  function getRemaining() {
    if (!_endTime) return 0;
    return Math.max(0, Math.ceil((_endTime - Date.now()) / 1000));
  }

  return { start, stop, getRemaining };
})();

window.TimerEngine = TimerEngine;
