/**
 * QuizMaster - Fragetyp-Renderer
 * ================================
 * Jeder Fragetyp hat zwei Render-Funktionen:
 *   - renderPlayer(question, container, onSubmit) → Spieleransicht
 *   - renderModerator(question, answers, container) → Moderatoransicht
 *
 * Neue Fragetypen können einfach als neues Objekt registriert werden.
 */

const QuestionTypes = {};

// ─────────────────────────────────────────────────────────────
// Multiple Choice
// ─────────────────────────────────────────────────────────────
QuestionTypes['multiple-choice'] = {

  renderPlayer(question, container, onSubmit) {
    container.innerHTML = '';
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
        // Selektion umschalten
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
      grid.querySelectorAll('.mc-option').forEach(b => {
        b.disabled = true;
        b.classList.add('locked');
      });
      onSubmit(selected);
    });

    container.appendChild(grid);
    container.appendChild(submitBtn);
  },

  renderModerator(question, answers, container) {
    container.innerHTML = '';

    // Zeige Antwortverteilung
    const stats = {};
    question.options.forEach(o => stats[o.id] = 0);
    Object.values(answers).forEach(a => {
      if (stats[a.value] !== undefined) stats[a.value]++;
    });

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
};

// ─────────────────────────────────────────────────────────────
// Schätzfrage mit Regler
// ─────────────────────────────────────────────────────────────
QuestionTypes['estimate'] = {

  renderPlayer(question, container, onSubmit) {
    container.innerHTML = '';
    const s = question.slider;
    let submitted = false;

    const wrap = document.createElement('div');
    wrap.className = 'estimate-wrap';

    const valueDisplay = document.createElement('div');
    valueDisplay.className = 'estimate-value';
    const midVal = Math.round((s.min + s.max) / 2);
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

    const minLabel = document.createElement('span');
    minLabel.className = 'slider-label slider-min';
    minLabel.textContent = `${s.min} ${s.unit}`;

    const maxLabel = document.createElement('span');
    maxLabel.className = 'slider-label slider-max';
    maxLabel.textContent = `${s.max} ${s.unit}`;

    const labelsRow = document.createElement('div');
    labelsRow.className = 'slider-labels';
    labelsRow.appendChild(minLabel);
    labelsRow.appendChild(maxLabel);

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
  },

  renderModerator(question, answers, container) {
    container.innerHTML = '';
    const s = question.slider;

    const wrap = document.createElement('div');
    wrap.className = 'estimate-mod-wrap';

    // Zeige alle Schätzungen
    const answerList = document.createElement('div');
    answerList.className = 'estimate-answer-list';

    const playerAnswers = Object.entries(answers);
    if (playerAnswers.length === 0) {
      answerList.innerHTML = '<p class="no-answers">Noch keine Antworten.</p>';
    } else {
      playerAnswers.forEach(([pid, ans]) => {
        const val = ans.value;
        const diff = Math.abs(val - s.correctValue);
        const isExact = diff <= s.toleranceExact;
        const isClose = diff <= s.toleranceClose;

        const row = document.createElement('div');
        row.className = `estimate-row ${isExact ? 'exact' : isClose ? 'close' : ''}`;
        row.innerHTML = `
          <span class="player-name">${pid}</span>
          <span class="estimate-val">${val} ${s.unit}</span>
          <span class="estimate-diff">Δ ${diff}</span>
          ${isExact ? '<span class="badge exact">Genau!</span>' :
            isClose ? '<span class="badge close">Nah dran</span>' : ''}
        `;
        answerList.appendChild(row);
      });
    }

    const correctInfo = document.createElement('div');
    correctInfo.className = 'estimate-correct';
    correctInfo.innerHTML = `
      <strong>Richtige Antwort:</strong> ${s.correctValue} ${s.unit}<br>
      <small>Genau: ±${s.toleranceExact} | Nah dran: ±${s.toleranceClose}</small>
    `;

    wrap.appendChild(correctInfo);
    wrap.appendChild(answerList);
    container.appendChild(wrap);
  }
};

// ─────────────────────────────────────────────────────────────
// Bilderquiz
// ─────────────────────────────────────────────────────────────
QuestionTypes['image-quiz'] = {

  renderPlayer(question, container, onSubmit) {
    container.innerHTML = '';
    let selected = null;
    let submitted = false;

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

    // Antwortoptionen (gleich wie MC)
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
  },

  renderModerator(question, answers, container) {
    // Bild + gleiche Stats wie MC
    container.innerHTML = '';

    if (question.image) {
      const img = document.createElement('img');
      img.src = question.image.src;
      img.alt = question.image.alt || '';
      img.className = 'mod-question-img';
      container.appendChild(img);
    }

    // Statistiken analog zu MC
    QuestionTypes['multiple-choice'].renderModerator(question, answers, container);
  }
};

// ─────────────────────────────────────────────────────────────
// Sortierquiz per Drag-and-Drop
// ─────────────────────────────────────────────────────────────
QuestionTypes['sort'] = {

  renderPlayer(question, container, onSubmit) {
    container.innerHTML = '';
    let submitted = false;

    // Mische Elemente
    const items = [...question.items].sort(() => Math.random() - 0.5);

    const hint = document.createElement('p');
    hint.className = 'sort-hint';
    hint.textContent = 'Ziehe die Elemente in die richtige Reihenfolge (oben = erstes):';
    container.appendChild(hint);

    const list = document.createElement('ul');
    list.className = 'sort-list';
    list.setAttribute('aria-label', 'Sortierbare Liste');

    items.forEach(item => {
      const li = document.createElement('li');
      li.className = 'sort-item';
      li.draggable = true;
      li.dataset.id = item.id;
      li.innerHTML = `<span class="drag-handle">⠿</span><span class="sort-text">${item.text}</span>`;

      // Drag Events
      li.addEventListener('dragstart', (e) => {
        e.dataTransfer.effectAllowed = 'move';
        li.classList.add('dragging');
      });
      li.addEventListener('dragend', () => li.classList.remove('dragging'));
      li.addEventListener('dragover', (e) => {
        e.preventDefault();
        const dragging = list.querySelector('.dragging');
        if (dragging && dragging !== li) {
          const rect = li.getBoundingClientRect();
          const mid = rect.top + rect.height / 2;
          if (e.clientY < mid) {
            list.insertBefore(dragging, li);
          } else {
            list.insertBefore(dragging, li.nextSibling);
          }
        }
      });

      // Touch-Support (mobile)
      this._addTouchSupport(li, list);

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
  },

  _addTouchSupport(li, list) {
    let touchY = 0;
    li.addEventListener('touchstart', (e) => {
      touchY = e.touches[0].clientY;
      li.classList.add('dragging');
    }, { passive: true });
    li.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const currentY = e.touches[0].clientY;
      const items = Array.from(list.querySelectorAll('.sort-item:not(.dragging)'));
      const after = items.find(item => {
        const rect = item.getBoundingClientRect();
        return currentY < rect.top + rect.height / 2;
      });
      if (after) {
        list.insertBefore(li, after);
      } else {
        list.appendChild(li);
      }
    }, { passive: false });
    li.addEventListener('touchend', () => li.classList.remove('dragging'));
  },

  renderModerator(question, answers, container) {
    container.innerHTML = '';

    const correctOrder = question.correctOrder;

    const correctDiv = document.createElement('div');
    correctDiv.className = 'sort-correct-order';
    correctDiv.innerHTML = '<strong>Richtige Reihenfolge:</strong>';
    const correctList = document.createElement('ol');
    correctOrder.forEach(id => {
      const item = question.items.find(i => i.id === id);
      const li = document.createElement('li');
      li.textContent = item ? item.text : id;
      correctList.appendChild(li);
    });
    correctDiv.appendChild(correctList);
    container.appendChild(correctDiv);

    // Spieler-Antworten
    const answersDiv = document.createElement('div');
    answersDiv.className = 'sort-player-answers';
    answersDiv.innerHTML = '<strong>Spieler-Antworten:</strong>';

    Object.entries(answers).forEach(([pid, ans]) => {
      const playerOrder = ans.value;
      let correct = 0;
      playerOrder.forEach((id, idx) => {
        if (correctOrder[idx] === id) correct++;
      });

      const row = document.createElement('div');
      row.className = 'sort-player-row';
      row.innerHTML = `
        <span class="player-id">${pid}</span>
        <span class="sort-score">${correct}/${correctOrder.length} richtig</span>
      `;
      answersDiv.appendChild(row);
    });

    container.appendChild(answersDiv);
  }
};

window.QuestionTypes = QuestionTypes;
