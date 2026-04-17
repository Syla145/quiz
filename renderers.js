/**
 * QuizMaster - Fragetyp-Renderer
 * ================================
 * Jeder Fragetyp hat zwei Render-Funktionen:
 *   - renderPlayer(question, container, onSubmit) → Spieleransicht
 *   - renderModerator(question, answers, container) → Moderatoransicht
 *
 * answerMode steuert WIE geantwortet wird:
 *   "multiple-choice" → Buttons
 *   "estimate"        → Regler
 *   "buzzer"          → Nur Buzzer, kein Eingabefeld
 *   "sort"            → Drag & Drop
 *
 * Neue Fragetypen einfach als neues Objekt registrieren.
 */

const QuestionTypes = {};

// ─────────────────────────────────────────────────────────────
// Hilfsfunktion: Antwort-Renderer je answerMode auswählen
// Wird von image-quiz und anderen kombinierten Typen genutzt
// ─────────────────────────────────────────────────────────────
function renderByAnswerMode(question, container, onSubmit) {
  const mode = question.answerMode || question.type;
  switch (mode) {
    case 'multiple-choice': return _renderMC(question, container, onSubmit);
    case 'estimate':        return _renderEstimate(question, container, onSubmit);
    case 'buzzer':          return _renderBuzzerOnly(question, container);
    case 'sort':            return _renderSort(question, container, onSubmit);
    default:
      container.innerHTML = `<p style="color:var(--text-muted)">Unbekannter Antwortmodus: ${mode}</p>`;
  }
}

// ─────────────────────────────────────────────────────────────
// BUZZER-ONLY Modus
// Kein Eingabefeld – Spieler sehen nur eine Warteanzeige.
// Der Buzzer wird separat in spieler.html gesteuert.
// ─────────────────────────────────────────────────────────────
function _renderBuzzerOnly(question, container) {
  container.innerHTML = `
    <div style="text-align:center;padding:2rem 1rem;">
      <div style="font-size:3rem;margin-bottom:1rem">🔔</div>
      <p style="color:var(--text-secondary);font-size:1.1rem">
        Drücke den Buzzer wenn du die Antwort weißt!
      </p>
      <p style="color:var(--text-muted);font-size:0.85rem;margin-top:0.5rem">
        Der Moderator wertet deine Antwort manuell.
      </p>
    </div>
  `;
}

// ─────────────────────────────────────────────────────────────
// MULTIPLE CHOICE (intern)
// ─────────────────────────────────────────────────────────────
function _renderMC(question, container, onSubmit) {
  let selected = null;
  let submitted = false;

  const grid = document.createElement('div');
  grid.className = 'mc-grid';

  question.options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'mc-option';
    btn.dataset.id = opt.id;
    btn.textContent = opt.text;
    btn.addEventListener('click', () => {
      if (submitted) return;
      grid.querySelectorAll('.mc-option').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selected = opt.id;
    });
    grid.appendChild(btn);
  });

  const submitBtn = document.createElement('button');
  submitBtn.className = 'btn-submit';
  submitBtn.textContent = 'Antwort abgeben';
  submitBtn.addEventListener('click', () => {
    if (!selected || submitted) return;
    submitted = true;
    submitBtn.disabled = true;
    submitBtn.textContent = '✓ Abgegeben';
    grid.querySelectorAll('.mc-option').forEach(b => { b.disabled = true; b.classList.add('locked'); });
    onSubmit(selected);
  });

  container.appendChild(grid);
  container.appendChild(submitBtn);
}

// ─────────────────────────────────────────────────────────────
// ESTIMATE / REGLER (intern)
// ─────────────────────────────────────────────────────────────
function _renderEstimate(question, container, onSubmit) {
  const s = question.slider;
  let submitted = false;

  const wrap = document.createElement('div');
  wrap.className = 'estimate-wrap';

  const midVal = Math.round((s.min + s.max) / 2);

  const valueDisplay = document.createElement('div');
  valueDisplay.className = 'estimate-value';
  valueDisplay.textContent = `${midVal} ${s.unit}`;

  const slider = document.createElement('input');
  slider.type = 'range';
  slider.className = 'estimate-slider';
  slider.min = s.min;
  slider.max = s.max;
  slider.step = s.step;
  slider.value = midVal;
  slider.addEventListener('input', () => {
    valueDisplay.textContent = `${slider.value} ${s.unit}`;
  });

  const labelsRow = document.createElement('div');
  labelsRow.className = 'slider-labels';
  labelsRow.innerHTML = `<span class="slider-label">${s.min} ${s.unit}</span><span class="slider-label">${s.max} ${s.unit}</span>`;

  const submitBtn = document.createElement('button');
  submitBtn.className = 'btn-submit';
  submitBtn.textContent = 'Schätzung abgeben';
  submitBtn.addEventListener('click', () => {
    if (submitted) return;
    submitted = true;
    slider.disabled = true;
    submitBtn.disabled = true;
    submitBtn.textContent = `✓ ${slider.value} ${s.unit}`;
    onSubmit(parseInt(slider.value));
  });

  wrap.appendChild(valueDisplay);
  wrap.appendChild(slider);
  wrap.appendChild(labelsRow);
  wrap.appendChild(submitBtn);
  container.appendChild(wrap);
}

// ─────────────────────────────────────────────────────────────
// SORT / DRAG & DROP (intern)
// ─────────────────────────────────────────────────────────────
function _renderSort(question, container, onSubmit) {
  let submitted = false;
  const items = [...question.items].sort(() => Math.random() - 0.5);

  const hint = document.createElement('p');
  hint.className = 'sort-hint';
  hint.textContent = 'Ziehe die Elemente in die richtige Reihenfolge (oben = erstes):';
  container.appendChild(hint);

  const list = document.createElement('ul');
  list.className = 'sort-list';

  items.forEach(item => {
    const li = document.createElement('li');
    li.className = 'sort-item';
    li.draggable = true;
    li.dataset.id = item.id;
    li.innerHTML = `<span class="drag-handle">⠿</span><span class="sort-text">${item.text}</span>`;

    li.addEventListener('dragstart', () => li.classList.add('dragging'));
    li.addEventListener('dragend', () => li.classList.remove('dragging'));
    li.addEventListener('dragover', e => {
      e.preventDefault();
      const dragging = list.querySelector('.dragging');
      if (!dragging || dragging === li) return;
      const rect = li.getBoundingClientRect();
      if (e.clientY < rect.top + rect.height / 2) {
        list.insertBefore(dragging, li);
      } else {
        list.insertBefore(dragging, li.nextSibling);
      }
    });

    // Touch-Support
    let touchStartY = 0;
    li.addEventListener('touchstart', e => {
      touchStartY = e.touches[0].clientY;
      li.classList.add('dragging');
    }, { passive: true });
    li.addEventListener('touchmove', e => {
      e.preventDefault();
      const y = e.touches[0].clientY;
      const siblings = Array.from(list.querySelectorAll('.sort-item:not(.dragging)'));
      const after = siblings.find(s => {
        const r = s.getBoundingClientRect();
        return y < r.top + r.height / 2;
      });
      if (after) list.insertBefore(li, after);
      else list.appendChild(li);
    }, { passive: false });
    li.addEventListener('touchend', () => li.classList.remove('dragging'));

    list.appendChild(li);
  });

  const submitBtn = document.createElement('button');
  submitBtn.className = 'btn-submit';
  submitBtn.textContent = 'Reihenfolge abgeben';
  submitBtn.addEventListener('click', () => {
    if (submitted) return;
    submitted = true;
    submitBtn.disabled = true;
    submitBtn.textContent = '✓ Abgegeben';
    list.querySelectorAll('.sort-item').forEach(li => li.draggable = false);
    const order = Array.from(list.querySelectorAll('.sort-item')).map(li => li.dataset.id);
    onSubmit(order);
  });

  container.appendChild(list);
  container.appendChild(submitBtn);
}

// ─────────────────────────────────────────────────────────────
// MULTIPLE CHOICE (Fragetyp-Eintrag)
// answerMode ist hier immer "multiple-choice"
// ─────────────────────────────────────────────────────────────
QuestionTypes['multiple-choice'] = {
  renderPlayer(question, container, onSubmit) {
    container.innerHTML = '';
    _renderMC(question, container, onSubmit);
  },
  renderModerator(question, answers, container) {
    container.innerHTML = '';
    _renderMCStats(question, answers, container);
  }
};

// ─────────────────────────────────────────────────────────────
// SCHÄTZFRAGE
// answerMode immer "estimate"
// ─────────────────────────────────────────────────────────────
QuestionTypes['estimate'] = {
  renderPlayer(question, container, onSubmit) {
    container.innerHTML = '';
    _renderEstimate(question, container, onSubmit);
  },
  renderModerator(question, answers, container) {
    container.innerHTML = '';
    _renderEstimateStats(question, answers, container);
  }
};

// ─────────────────────────────────────────────────────────────
// BILDERQUIZ
// answerMode kann "multiple-choice", "buzzer" oder "estimate" sein
// ─────────────────────────────────────────────────────────────
QuestionTypes['image-quiz'] = {
  renderPlayer(question, container, onSubmit) {
    container.innerHTML = '';

    // Bild anzeigen
    if (question.image) {
      const imgWrap = document.createElement('div');
      imgWrap.className = 'image-quiz-img-wrap';
      const img = document.createElement('img');
      img.src = question.image.src;
      img.alt = question.image.alt || 'Bild zur Frage';
      img.className = 'image-quiz-img';
      if (question.image.zoomEnabled) {
        img.classList.add('zoomable');
        img.addEventListener('click', () => img.classList.toggle('zoomed'));
      }
      imgWrap.appendChild(img);
      container.appendChild(imgWrap);
    }

    // Antwortbereich je nach answerMode
    const answerArea = document.createElement('div');
    renderByAnswerMode(question, answerArea, onSubmit);
    container.appendChild(answerArea);
  },

  renderModerator(question, answers, container) {
    container.innerHTML = '';

    // Bild anzeigen
    if (question.image) {
      const img = document.createElement('img');
      img.src = question.image.src;
      img.alt = question.image.alt || '';
      img.className = 'mod-question-img';
      img.style.cssText = 'max-width:300px;border-radius:8px;margin-bottom:1rem;display:block';
      container.appendChild(img);
    }

    const mode = question.answerMode || 'multiple-choice';

    if (mode === 'buzzer') {
      // Buzzer-Modus: Moderator sieht wer gebuzzert hat + Freitextfeld für manuelle Wertung
      const info = document.createElement('div');
      info.className = 'card-sm';
      info.style.cssText = 'border-color:var(--buzzer);color:var(--text-secondary)';
      info.innerHTML = `
        <p style="font-weight:700;color:var(--buzzer);margin-bottom:0.5rem">🔔 Buzzer-Modus</p>
        <p style="font-size:0.85rem">Spieler antworten per Buzzer. Punkte manuell vergeben.</p>
        <p style="font-size:0.85rem;margin-top:0.5rem">
          Antworten eingegangen: <strong>${Object.keys(answers).length}</strong>
        </p>
      `;
      container.appendChild(info);
    } else if (mode === 'multiple-choice') {
      _renderMCStats(question, answers, container);
    } else if (mode === 'estimate') {
      _renderEstimateStats(question, answers, container);
    }
  }
};

// ─────────────────────────────────────────────────────────────
// SORTIERQUIZ
// ─────────────────────────────────────────────────────────────
QuestionTypes['sort'] = {
  renderPlayer(question, container, onSubmit) {
    container.innerHTML = '';
    _renderSort(question, container, onSubmit);
  },
  renderModerator(question, answers, container) {
    container.innerHTML = '';

    const correctDiv = document.createElement('div');
    correctDiv.className = 'sort-correct-order';
    correctDiv.innerHTML = '<strong>Richtige Reihenfolge:</strong>';
    const ol = document.createElement('ol');
    question.correctOrder.forEach(id => {
      const item = question.items.find(i => i.id === id);
      const li = document.createElement('li');
      li.textContent = item ? item.text : id;
      ol.appendChild(li);
    });
    correctDiv.appendChild(ol);
    container.appendChild(correctDiv);

    if (Object.keys(answers).length > 0) {
      const answersDiv = document.createElement('div');
      answersDiv.style.marginTop = '1rem';
      answersDiv.innerHTML = '<strong>Spieler-Antworten:</strong>';
      Object.entries(answers).forEach(([pid, ans]) => {
        let correct = 0;
        ans.value.forEach((id, idx) => { if (question.correctOrder[idx] === id) correct++; });
        const row = document.createElement('div');
        row.className = 'sort-player-row';
        row.style.cssText = 'display:flex;justify-content:space-between;padding:0.5rem 0;border-bottom:1px solid var(--border)';
        row.innerHTML = `<span>${pid}</span><span style="color:var(--accent)">${correct}/${question.correctOrder.length} richtig</span>`;
        answersDiv.appendChild(row);
      });
      container.appendChild(answersDiv);
    }
  }
};

// ─────────────────────────────────────────────────────────────
// Moderator-Statistiken (intern)
// ─────────────────────────────────────────────────────────────
function _renderMCStats(question, answers, container) {
  const stats = {};
  question.options.forEach(o => stats[o.id] = 0);
  Object.values(answers).forEach(a => { if (stats[a.value] !== undefined) stats[a.value]++; });
  const total = Object.values(stats).reduce((s, n) => s + n, 0);

  const list = document.createElement('div');
  list.className = 'mc-stats';

  question.options.forEach(opt => {
    const count = stats[opt.id] || 0;
    const pct = total > 0 ? Math.round(count / total * 100) : 0;
    const isCorrect = opt.id === question.correctAnswer;

    const row = document.createElement('div');
    row.className = `mc-stat-row ${isCorrect ? 'correct' : ''}`;
    row.innerHTML = `
      <div class="mc-stat-label">
        <span class="opt-id">${opt.id.toUpperCase()}</span>
        <span class="opt-text">${opt.text}</span>
        ${isCorrect ? '<span class="correct-badge">✓ Richtig</span>' : ''}
      </div>
      <div class="mc-stat-bar-wrap">
        <div class="mc-stat-bar" style="width:${pct}%"></div>
        <span class="mc-stat-count">${count} (${pct}%)</span>
      </div>
    `;
    list.appendChild(row);
  });
  container.appendChild(list);
}

function _renderEstimateStats(question, answers, container) {
  const s = question.slider;

  const correctInfo = document.createElement('div');
  correctInfo.className = 'estimate-correct';
  correctInfo.style.cssText = 'padding:0.75rem;background:var(--bg-elevated);border-radius:8px;margin-bottom:1rem';
  correctInfo.innerHTML = `
    <strong>Richtige Antwort:</strong> ${s.correctValue} ${s.unit}<br>
    <small style="color:var(--text-muted)">Genau: ±${s.toleranceExact} | Nah dran: ±${s.toleranceClose}</small>
  `;
  container.appendChild(correctInfo);

  const playerAnswers = Object.entries(answers);
  if (playerAnswers.length === 0) {
    container.innerHTML += '<p style="color:var(--text-muted)">Noch keine Antworten.</p>';
    return;
  }

  playerAnswers.forEach(([pid, ans]) => {
    const val = ans.value;
    const diff = Math.abs(val - s.correctValue);
    const isExact = diff <= s.toleranceExact;
    const isClose = diff <= s.toleranceClose;

    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:1rem;padding:0.5rem 0;border-bottom:1px solid var(--border)';
    row.innerHTML = `
      <span style="flex:1">${pid}</span>
      <span style="color:var(--accent);font-family:var(--font-display)">${val} ${s.unit}</span>
      <span style="color:var(--text-muted);font-size:0.85rem">Δ ${diff}</span>
      ${isExact ? '<span class="badge exact">Genau!</span>' : isClose ? '<span class="badge close">Nah dran</span>' : ''}
    `;
    container.appendChild(row);
  });
}

window.QuestionTypes = QuestionTypes;

// =============================================================
// FIGHT LIST
// =============================================================
// Spieler tippen so viele Antworten wie möglich (Enter-getrennt)
// Moderator wertet jede Antwort einzeln als richtig/falsch
// =============================================================

QuestionTypes['fight-list'] = {

  renderPlayer(question, container, onSubmit) {
    container.innerHTML = '';
    let submitted = false;

    // Hinweis
    const hint = document.createElement('p');
    hint.style.cssText = 'font-size:0.85rem;color:var(--text-secondary);margin-bottom:0.5rem';
    hint.textContent = 'Schreibe so viele Antworten wie möglich – eine pro Zeile (Enter drücken):';
    container.appendChild(hint);

    // Konfigurierten Hinweis anzeigen falls vorhanden
    if (question.hint) {
      const customHint = document.createElement('div');
      customHint.style.cssText = 'background:var(--accent-glow);border:1px solid var(--accent-dim);border-radius:var(--radius-md);padding:0.6rem 1rem;margin-bottom:1rem;font-weight:700;color:var(--accent)';
      customHint.textContent = '💡 ' + question.hint;
      container.appendChild(customHint);
    }

    // Textarea
    const textarea = document.createElement('textarea');
    textarea.style.cssText = `
      width:100%; min-height:180px; background:var(--bg-elevated);
      border:2px solid var(--border); border-radius:var(--radius-md);
      color:var(--text-primary); font-family:var(--font-body);
      font-size:1rem; padding:0.875rem 1rem; outline:none;
      resize:vertical; line-height:1.7;
    `;
    textarea.placeholder = 'Antwort 1\nAntwort 2\nAntwort 3\n...';
    textarea.addEventListener('focus', () => textarea.style.borderColor = 'var(--accent)');
    textarea.addEventListener('blur',  () => textarea.style.borderColor = 'var(--border)');

    // Live-Counter
    const counter = document.createElement('div');
    counter.style.cssText = 'font-size:0.8rem;color:var(--text-muted);margin-top:0.4rem;text-align:right';
    counter.textContent = '0 Antworten';
    textarea.addEventListener('input', () => {
      const count = textarea.value.split('\n').filter(l => l.trim()).length;
      counter.textContent = count + ' Antwort' + (count !== 1 ? 'en' : '');
    });

    // Submit
    const submitBtn = document.createElement('button');
    submitBtn.className = 'btn-submit';
    submitBtn.textContent = 'Antworten abgeben';
    submitBtn.addEventListener('click', () => {
      if (submitted) return;
      const answers = textarea.value
        .split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 0);
      if (answers.length === 0) return;
      submitted = true;
      textarea.disabled = true;
      submitBtn.disabled = true;
      submitBtn.textContent = '✓ ' + answers.length + ' Antwort' + (answers.length !== 1 ? 'en' : '') + ' abgegeben';
      onSubmit(answers);
    });

    container.appendChild(textarea);
    container.appendChild(counter);
    container.appendChild(submitBtn);
  },

  renderModerator(question, answers, container) {
    container.innerHTML = '';

    const playerEntries = Object.entries(answers);
    if (playerEntries.length === 0) {
      container.innerHTML = '<p style="color:var(--text-muted)">Noch keine Antworten eingegangen.</p>';
      return;
    }

    const pointsPerAnswer = question.pointsPerAnswer || 10;

    // Für jeden Spieler einen Block
    playerEntries.forEach(([pid, ans]) => {
      const playerAnswers = Array.isArray(ans.value) ? ans.value : [];
      const playerName = ans.playerName || pid;

      const block = document.createElement('div');
      block.style.cssText = 'background:var(--bg-elevated);border:1px solid var(--border);border-radius:var(--radius-md);padding:1rem;margin-bottom:1rem';

      // Header
      const header = document.createElement('div');
      header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:0.75rem';
      header.innerHTML = `
        <span style="font-weight:700">${playerName}</span>
        <span id="fl-score-${pid}" style="color:var(--accent);font-family:var(--font-display);font-size:1.3rem">0 Pkt</span>
      `;
      block.appendChild(header);

      // Antwort-Liste
      const list = document.createElement('div');
      list.style.cssText = 'display:flex;flex-direction:column;gap:0.4rem';

      // Status-Tracking
      const statusMap = {}; // answer → 'correct' | 'wrong' | null

      function recalcScore() {
        const correct = Object.values(statusMap).filter(s => s === 'correct').length;
        const el = document.getElementById('fl-score-' + pid);
        if (el) el.textContent = (correct * pointsPerAnswer) + ' Pkt (' + correct + ' richtig)';
      }

      playerAnswers.forEach((answer, i) => {
        statusMap[i] = null;

        const row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;gap:0.5rem;padding:0.4rem 0.5rem;border-radius:6px;transition:background 0.2s';

        const text = document.createElement('span');
        text.style.cssText = 'flex:1;font-size:0.95rem';
        text.textContent = answer;

        const btnCorrect = document.createElement('button');
        btnCorrect.textContent = '✓';
        btnCorrect.style.cssText = 'padding:0.25rem 0.6rem;border-radius:4px;border:1px solid var(--border);background:none;color:var(--text-muted);cursor:pointer;font-size:1rem;transition:all 0.15s';
        btnCorrect.title = 'Richtig';

        const btnWrong = document.createElement('button');
        btnWrong.textContent = '✗';
        btnWrong.style.cssText = 'padding:0.25rem 0.6rem;border-radius:4px;border:1px solid var(--border);background:none;color:var(--text-muted);cursor:pointer;font-size:1rem;transition:all 0.15s';
        btnWrong.title = 'Falsch';

        function updateRowStyle() {
          const s = statusMap[i];
          row.style.background = s === 'correct' ? 'rgba(46,204,113,0.12)' : s === 'wrong' ? 'rgba(231,76,60,0.12)' : 'transparent';
          btnCorrect.style.background = s === 'correct' ? 'var(--success)' : 'none';
          btnCorrect.style.color      = s === 'correct' ? '#000' : 'var(--text-muted)';
          btnCorrect.style.borderColor= s === 'correct' ? 'var(--success)' : 'var(--border)';
          btnWrong.style.background   = s === 'wrong' ? 'var(--danger)' : 'none';
          btnWrong.style.color        = s === 'wrong' ? '#fff' : 'var(--text-muted)';
          btnWrong.style.borderColor  = s === 'wrong' ? 'var(--danger)' : 'var(--border)';
        }

        btnCorrect.addEventListener('click', () => {
          statusMap[i] = statusMap[i] === 'correct' ? null : 'correct';
          updateRowStyle();
          recalcScore();
        });
        btnWrong.addEventListener('click', () => {
          statusMap[i] = statusMap[i] === 'wrong' ? null : 'wrong';
          updateRowStyle();
          recalcScore();
        });

        row.appendChild(text);
        row.appendChild(btnCorrect);
        row.appendChild(btnWrong);
        list.appendChild(row);
      });

      block.appendChild(list);

      // Punkte vergeben Button
      const awardBtn = document.createElement('button');
      awardBtn.className = 'btn btn-primary btn-sm';
      awardBtn.style.cssText = 'margin-top:0.75rem;width:100%';
      awardBtn.textContent = 'Punkte vergeben';
      awardBtn.addEventListener('click', () => {
        const correct = Object.values(statusMap).filter(s => s === 'correct').length;
        const pts = correct * pointsPerAnswer;
        if (typeof SessionEngine !== 'undefined') {
          SessionEngine.awardPoints({ [pid]: pts });
          awardBtn.textContent = '✓ ' + pts + ' Punkte vergeben';
          awardBtn.disabled = true;
        }
      });
      block.appendChild(awardBtn);

      container.appendChild(block);
    });
  }
};

// =============================================================
// HIGHER LOWER
// =============================================================
// Alle Spieler sehen die Karten-Leiste mit.
// Der aktive Spieler sagt Higher/Lower laut,
// der Moderator klickt es auf seinem Screen.
// 2 falsche Antworten = raus.
// =============================================================

QuestionTypes['higher-lower'] = {

  renderPlayer(question, container, onSubmit) {
    container.innerHTML = '';
    const state = typeof SessionEngine !== 'undefined' ? SessionEngine.getState() : null;
    const hl = state?.higherLower || null;
    const myId = typeof SessionEngine !== 'undefined' ? SessionEngine.getPlayerId() : null;

    // Aktiver Spieler Info
    const activePlayer = hl?.activePlayerId || null;
    const isMe = myId && activePlayer === myId;
    const activeName = state?.players?.find(p => p.id === activePlayer)?.name || '';

    // Leben
    const myLives = (hl && myId) ? (hl.lives?.[myId] ?? question.lives ?? 2) : null;
    const maxLives = question.lives || 2;

    // Header: wer ist dran + meine Leben
    const header = document.createElement('div');
    header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem';

    const activeInfo = document.createElement('div');
    if (isMe) {
      activeInfo.innerHTML = '<span style="color:var(--accent);font-weight:700;font-size:1rem">🎯 Du bist dran!</span><br><span style="color:var(--text-muted);font-size:0.8rem">Sage laut Higher oder Lower</span>';
    } else if (activeName) {
      activeInfo.innerHTML = '<span style="color:var(--text-secondary);font-size:0.9rem"><strong>' + activeName + '</strong> ist dran</span>';
    } else {
      activeInfo.innerHTML = '<span style="color:var(--text-muted);font-size:0.85rem">Warte auf den Moderator...</span>';
    }

    const livesEl = document.createElement('div');
    livesEl.style.cssText = 'font-size:1.3rem;letter-spacing:0.1rem';
    if (myLives !== null) {
      livesEl.innerHTML = Array.from({length: maxLives}, (_, i) =>
        '<span style="opacity:' + (i < myLives ? 1 : 0.2) + '">❤️</span>'
      ).join('');
    }

    header.appendChild(activeInfo);
    header.appendChild(livesEl);
    container.appendChild(header);

    // Skala
    const scaleWrap = document.createElement('div');
    scaleWrap.id = 'hl-scale-player';
    _renderHLScale(question, hl, scaleWrap, false);
    container.appendChild(scaleWrap);
  },

  renderModerator(question, answers, container) {
    container.innerHTML = '';
    const state = typeof SessionEngine !== 'undefined' ? SessionEngine.getState() : null;
    const hl = state?.higherLower;

    if (!hl) {
      const startBtn = document.createElement('button');
      startBtn.className = 'btn btn-primary';
      startBtn.style.width = '100%';
      startBtn.textContent = '▶ Higher-Lower starten';
      startBtn.addEventListener('click', () => {
        _hlInit(question, state);
        QuestionTypes['higher-lower'].renderModerator(question, answers, container);
      });
      container.appendChild(startBtn);
      return;
    }

    // Skala (mit Werten sichtbar)
    const scaleWrap = document.createElement('div');
    _renderHLScale(question, hl, scaleWrap, true);
    container.appendChild(scaleWrap);

    // Aktiver Spieler + Leben
    const activeName = state?.players?.find(p => p.id === hl.activePlayerId)?.name || '-';
    const activeLives = hl.lives?.[hl.activePlayerId] ?? question.lives ?? 2;
    const livesStr = Array.from({length: question.lives||2}, (_, i) =>
      i < activeLives ? '❤️' : '🖤'
    ).join('');

    const infoBox = document.createElement('div');
    infoBox.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:0.75rem 1rem;background:var(--bg-elevated);border-radius:var(--radius-md);margin:1rem 0';
    infoBox.innerHTML =
      '<div><p style="font-size:0.7rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em">Aktiver Spieler</p>' +
      '<p style="font-weight:700;font-size:1.1rem;color:var(--accent)">' + activeName + '</p></div>' +
      '<div style="text-align:right"><p style="font-size:0.7rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em">Leben</p>' +
      '<p style="font-size:1.3rem">' + livesStr + '</p></div>';
    container.appendChild(infoBox);

    // Naechste Karte + Wert (nur Moderator sieht den Wert)
    const nextIndex = hl.placedCardIndices.length;
    const remainingIndices = question.cards
      .map((c, i) => i)
      .filter(i => !hl.placedCardIndices.includes(i) && i !== hl.startCardIndex);
    const nextCardIndex = remainingIndices[0] ?? null;
    const nextCard = nextCardIndex !== null ? question.cards[nextCardIndex] : null;

    if (nextCard) {
      const nextBox = document.createElement('div');
      nextBox.style.cssText = 'padding:1rem;background:var(--bg-elevated);border:2px dashed var(--accent-dim);border-radius:var(--radius-md);margin-bottom:1rem';

      // Bild falls vorhanden
      const imgHtml = nextCard.image
        ? '<img src="' + nextCard.image + '" style="width:60px;height:60px;object-fit:cover;border-radius:6px;margin-bottom:0.5rem" onerror="this.style.display=\'none\'">'
        : '';

      nextBox.innerHTML =
        '<p style="font-size:0.7rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:0.5rem">Naechste Karte (nur du siehst den Wert)</p>' +
        '<div style="display:flex;align-items:center;gap:1rem">' +
        (imgHtml ? '<div>' + imgHtml + '</div>' : '') +
        '<div><p style="font-weight:700;font-size:1.1rem">' + nextCard.label + '</p>' +
        '<p style="font-family:var(--font-display);font-size:1.8rem;color:var(--accent)">' + nextCard.value + ' ' + (question.unit||'') + '</p></div>' +
        '</div>';
      container.appendChild(nextBox);

      // Higher / Lower / Falsch Buttons
      const btnRow = document.createElement('div');
      btnRow.style.cssText = 'display:flex;gap:0.75rem;margin-bottom:0.75rem';

      const btnHigher = document.createElement('button');
      btnHigher.className = 'btn btn-success';
      btnHigher.style.flex = '1';
      btnHigher.innerHTML = '&#9650; Higher – Richtig';
      btnHigher.addEventListener('click', () => _hlAnswer(question, state, nextCardIndex, true, container, answers));

      const btnLower = document.createElement('button');
      btnLower.className = 'btn btn-danger';
      btnLower.style.flex = '1';
      btnLower.innerHTML = '&#9660; Lower – Richtig';
      btnLower.addEventListener('click', () => _hlAnswer(question, state, nextCardIndex, true, container, answers));

      btnRow.appendChild(btnHigher);
      btnRow.appendChild(btnLower);
      container.appendChild(btnRow);

      const btnWrong = document.createElement('button');
      btnWrong.className = 'btn btn-secondary';
      btnWrong.style.cssText = 'width:100%;margin-bottom:1rem';
      btnWrong.textContent = '✗ Spieler hat falsch geraten';
      btnWrong.addEventListener('click', () => _hlAnswer(question, state, nextCardIndex, false, container, answers));
      container.appendChild(btnWrong);

    } else {
      const doneBox = document.createElement('div');
      doneBox.style.cssText = 'padding:1rem;text-align:center;color:var(--success);font-weight:700;border:1px solid var(--success);border-radius:var(--radius-md);margin-bottom:1rem';
      doneBox.textContent = '✓ Alle Karten platziert!';
      container.appendChild(doneBox);
    }

    // Platzierung
    const rankDiv = document.createElement('div');
    rankDiv.innerHTML = '<p style="font-size:0.7rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:0.5rem">Ausgeschieden</p>';
    if (hl.eliminated.length === 0) {
      rankDiv.innerHTML += '<p style="color:var(--text-muted);font-size:0.85rem">Noch niemand.</p>';
    } else {
      hl.eliminated.forEach((pid, i) => {
        const name = state?.players?.find(p => p.id === pid)?.name || pid;
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;gap:0.75rem;align-items:center;padding:0.4rem 0;border-bottom:1px solid var(--border);font-size:0.9rem';
        row.innerHTML = '<span style="color:var(--text-muted)">' + (i+1) + '.</span><span>' + name + '</span>';
        rankDiv.appendChild(row);
      });
    }
    container.appendChild(rankDiv);
  }
};

// ─── Higher-Lower Hilfsfunktionen ─────────────────────────

function _hlInit(question, state) {
  if (!state) return;
  const players = state.players;
  const lives = {};
  players.forEach(p => lives[p.id] = question.lives || 2);

  // Startkarte finden (* markiert)
  const startIndex = question.cards.findIndex(c => c.isStart) ?? 0;

  state.higherLower = {
    startCardIndex: startIndex >= 0 ? startIndex : 0,
    placedCardIndices: [],   // Indizes der bereits platzierten Karten (ohne Startkarte)
    activePlayerId: players[0]?.id || null,
    playerOrder: players.map(p => p.id),
    lives,
    eliminated: []
  };

  _hlPersist(state);
}

function _hlAnswer(question, state, cardIndex, wasCorrect, container, answers) {
  const hl = state.higherLower;
  if (!hl) return;

  // Karte platzieren
  hl.placedCardIndices.push(cardIndex);

  if (!wasCorrect) {
    _hlLoseLife(question, state, hl);
  } else {
    _hlNextPlayer(state, hl);
  }

  _hlPersist(state);
  QuestionTypes['higher-lower'].renderModerator(question, answers, container);
}

function _hlLoseLife(question, state, hl) {
  const pid = hl.activePlayerId;
  hl.lives[pid] = (hl.lives[pid] || 1) - 1;
  if (hl.lives[pid] <= 0) {
    hl.eliminated.push(pid);
    hl.playerOrder = hl.playerOrder.filter(id => id !== pid);
  }
  _hlNextPlayer(state, hl);
}

function _hlNextPlayer(state, hl) {
  if (hl.playerOrder.length === 0) { hl.activePlayerId = null; return; }
  const cur = hl.playerOrder.indexOf(hl.activePlayerId);
  hl.activePlayerId = hl.playerOrder[(cur + 1) % hl.playerOrder.length];
}

function _hlPersist(state) {
  localStorage.setItem('quizmaster_session', JSON.stringify(state));
  try {
    const ch = new BroadcastChannel('quizmaster_channel');
    ch.postMessage({ type: 'HL_UPDATE', payload: state.higherLower });
    ch.close();
  } catch(e) {}
}

// ─── Skalen-Renderer ──────────────────────────────────────
// Baut die horizontale Skala wie im Referenzbild:
// Niedrig ──────── Hoch, Karten oben drauf positioniert
function _renderHLScale(question, hl, container, showValues) {
  container.innerHTML = '';

  const cards = question.cards || [];
  if (!cards.length) return;

  // Alle Karten mit Werten sammeln
  const startIndex = hl ? hl.startCardIndex : (question.cards.findIndex(c => c.isStart) ?? 0);
  const placedIndices = hl ? [startIndex, ...hl.placedCardIndices] : [startIndex >= 0 ? startIndex : 0];
  const placedCards = placedIndices.map(i => ({ ...cards[i], _index: i }));

  // Naechste Karte (noch nicht platziert)
  const allIndices = cards.map((_, i) => i);
  const remainingIndices = allIndices.filter(i => !placedIndices.includes(i));
  const nextCard = remainingIndices.length > 0 ? { ...cards[remainingIndices[0]], _index: remainingIndices[0] } : null;

  // Werte-Range fuer Positionierung
  const allValues = placedCards.map(c => c.value);
  const minVal = Math.min(...allValues);
  const maxVal = Math.max(...allValues);
  const range = maxVal - minVal || 1;

  // Wrapper
  const wrap = document.createElement('div');
  wrap.style.cssText = 'position:relative;width:100%;padding:0 1rem;box-sizing:border-box';

  // ── Naechste Karte oben zentriert ───────────────────────
  if (nextCard) {
    const pending = document.createElement('div');
    pending.style.cssText = 'display:flex;justify-content:center;margin-bottom:1.5rem';
    const card = _mkHLCardEl(nextCard, false, true, false);
    card.style.border = '2px dashed var(--accent)';
    card.style.opacity = '0.9';
    pending.appendChild(card);
    wrap.appendChild(pending);
  }

  // ── Skalen-Bereich ───────────────────────────────────────
  const scaleArea = document.createElement('div');
  scaleArea.style.cssText = 'position:relative;height:' + (placedCards.length > 0 ? '110px' : '60px') + ';margin:0 0.5rem';

  // Linie
  const line = document.createElement('div');
  line.style.cssText = 'position:absolute;top:50%;left:0;right:0;height:3px;background:linear-gradient(to right, var(--info), var(--accent));border-radius:2px;transform:translateY(-50%)';
  scaleArea.appendChild(line);

  // Niedrig / Hoch Labels
  const lblLow = document.createElement('div');
  lblLow.style.cssText = 'position:absolute;left:-0.5rem;top:50%;transform:translateY(-50%);font-size:0.7rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.1em;white-space:nowrap';
  lblLow.textContent = 'Niedrig';
  scaleArea.appendChild(lblLow);

  const lblHigh = document.createElement('div');
  lblHigh.style.cssText = 'position:absolute;right:-0.5rem;top:50%;transform:translateY(-50%);font-size:0.7rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.1em;white-space:nowrap';
  lblHigh.textContent = 'Hoch';
  scaleArea.appendChild(lblHigh);

  // Tick-Striche
  for (let i = 0; i <= 10; i++) {
    const tick = document.createElement('div');
    const pct = i * 10;
    tick.style.cssText = 'position:absolute;bottom:calc(50% - 1px);left:' + pct + '%;width:1px;height:8px;background:var(--border);transform:translateX(-50%)';
    scaleArea.appendChild(tick);
  }

  // Karten auf Skala positionieren
  // Berechne Spalten um Überlappungen zu vermeiden
  const sorted = [...placedCards].sort((a, b) => a.value - b.value);
  const ROW_HEIGHT = 52;

  sorted.forEach((card, si) => {
    const pct = range > 0 ? ((card.value - minVal) / range) * 80 + 10 : 50;
    // Zeile abwechselnd oben/unten
    const above = si % 2 === 0;

    const cardEl = _mkHLCardEl(card, showValues, false, card._index === startIndex);
    cardEl.style.position = 'absolute';
    cardEl.style.left = 'calc(' + pct + '% - 45px)';
    cardEl.style.width = '90px';

    if (above) {
      cardEl.style.bottom = 'calc(50% + 8px)';
    } else {
      cardEl.style.top = 'calc(50% + 8px)';
    }

    // Verbindungslinie zur Skala
    const connector = document.createElement('div');
    connector.style.cssText = 'position:absolute;left:calc(' + pct + '% - 1px);width:2px;background:var(--border);' +
      (above ? 'bottom:50%;height:8px' : 'top:50%;height:8px');
    scaleArea.appendChild(connector);

    scaleArea.appendChild(cardEl);
  });

  scaleArea.style.height = Math.max(120, 60 + Math.ceil(placedCards.length / 2) * ROW_HEIGHT) + 'px';

  wrap.appendChild(scaleArea);
  container.appendChild(wrap);
}

// Einzelne Karten-Kachel bauen
function _mkHLCardEl(card, showValue, isPending, isStart) {
  const el = document.createElement('div');
  el.style.cssText = [
    'background:' + (isStart ? 'var(--accent-glow)' : isPending ? 'var(--bg-card)' : 'var(--bg-elevated)'),
    'border:2px solid ' + (isStart ? 'var(--accent)' : 'var(--border)'),
    'border-radius:var(--radius-md)',
    'padding:0.4rem',
    'text-align:center',
    'transition:all 0.3s',
    'position:relative'
  ].join(';');

  const imgHtml = card.image
    ? '<img src="' + card.image + '" style="width:52px;height:52px;object-fit:cover;border-radius:6px;display:block;margin:0 auto 0.2rem" onerror="this.style.display=\'none\'">'
    : '';

  const valueHtml = showValue
    ? '<div style="font-family:var(--font-display);font-size:0.9rem;color:var(--accent);line-height:1">' + card.value + '</div>'
    : '';

  const starHtml = isStart
    ? '<div style="position:absolute;top:-6px;right:-6px;background:var(--accent);color:#000;border-radius:50%;width:14px;height:14px;font-size:0.6rem;display:flex;align-items:center;justify-content:center;font-weight:900">★</div>'
    : '';

  el.innerHTML = starHtml + imgHtml +
    '<div style="font-size:0.7rem;color:var(--text-secondary);line-height:1.2;margin-top:0.1rem">' + (card.label || '') + '</div>' +
    valueHtml;

  return el;
}

// Typo-Fix: ROW_HEIGHT statt ROH_HEIGHT
window.QuestionTypes = QuestionTypes;
