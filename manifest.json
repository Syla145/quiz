/**
 * QuizMaster – App Entry Point
 * ==============================
 * Globale Hilfsfunktionen, Page-Router und App-Init.
 */

// ─── Page Router ────────────────────────────────────────────

/**
 * Zeigt die angegebene Seite und versteckt alle anderen.
 * @param {string} pageId - data-page Attribut der Seite
 */
function showPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.querySelector(`[data-page="${pageId}"]`);
  if (target) {
    target.classList.add('active');
    // Scroll nach oben
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else {
    console.warn(`Seite "${pageId}" nicht gefunden.`);
  }
}

// ─── Toast-Benachrichtigungen ────────────────────────────────

let _toastTimeout = null;

/**
 * Zeigt eine kurze Toast-Benachrichtigung an.
 * @param {string} message
 * @param {'success'|'error'|'accent'|''} type
 */
function showToast(message, type = '') {
  let toast = document.getElementById('global-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'global-toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.className = `toast ${type}`;

  // Kurz verzögert anzeigen (für CSS-Transition)
  requestAnimationFrame(() => {
    requestAnimationFrame(() => toast.classList.add('show'));
  });

  if (_toastTimeout) clearTimeout(_toastTimeout);
  _toastTimeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// ─── App-Start ───────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {

  // Startseite anzeigen
  showPage('home');

  // Views initialisieren
  if (typeof ModeratorView !== 'undefined') ModeratorView.init();
  if (typeof PlayerView !== 'undefined') PlayerView.init();

  // Navigation: Moderator
  document.getElementById('go-moderator-btn')?.addEventListener('click', () => {
    showPage('mod-setup');
  });

  // Navigation: Spieler
  document.getElementById('go-player-btn')?.addEventListener('click', () => {
    showPage('player-join');
  });

  // Zurück-Buttons
  document.querySelectorAll('[data-back]').forEach(btn => {
    btn.addEventListener('click', () => {
      showPage(btn.dataset.back);
    });
  });

  // Code-Input: Automatisch Großbuchstaben
  const codeInput = document.getElementById('join-code');
  if (codeInput) {
    codeInput.addEventListener('input', () => {
      const pos = codeInput.selectionStart;
      codeInput.value = codeInput.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
      codeInput.setSelectionRange(pos, pos);
    });
  }

  // Neue Sitzung starten (Moderator-Endseite)
  document.getElementById('new-game-btn')?.addEventListener('click', () => {
    showPage('mod-setup');
  });

  console.log('🎮 QuizMaster bereit!');
});
