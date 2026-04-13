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
