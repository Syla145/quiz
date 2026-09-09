/**
 * QuizMaster - Fragetyp-Renderer
 * Alle 6 Typen: MC, Schätzfrage, Bilderquiz, Sortierung, Fight List, Higher Lower
 */

const QuestionTypes = {};

// ── Spielername aus State ─────────────────────────────────────
function _getPlayerName(pid, state) {
  if (!state || !state.players) return pid;
  const p = state.players.find(function(p) { return p.id === pid; });
  return p ? p.name : pid;
}

// ── Antwortmodus-Router ───────────────────────────────────────
function renderByAnswerMode(question, container, onSubmit) {
  const mode = question.answerMode || question.type;
  switch (mode) {
    case 'multiple-choice': return _renderMC(question, container, onSubmit);
    case 'estimate':        return _renderEstimate(question, container, onSubmit);
    case 'buzzer':          return _renderBuzzerOnly(container);
    case 'sort':            return _renderSort(question, container, onSubmit);
    default:
      container.innerHTML = '<p style="color:var(--text-muted)">Unbekannter Modus: ' + mode + '</p>';
  }
}

// ── Buzzer-Only ───────────────────────────────────────────────
function _renderBuzzerOnly(container) {
  container.innerHTML =
    '<div style="text-align:center;padding:2rem 1rem">' +
    '<div style="font-size:3rem;margin-bottom:1rem">🔔</div>' +
    '<p style="color:var(--text-secondary);font-size:1.1rem">Drücke den Buzzer wenn du die Antwort weißt!</p>' +
    '<p style="color:var(--text-muted);font-size:0.85rem;margin-top:0.5rem">Der Moderator wertet deine Antwort manuell.</p>' +
    '</div>';
}

// ── Multiple Choice (intern) ──────────────────────────────────
function _renderMC(question, container, onSubmit) {
  var selected = null;
  var submitted = false;
  var grid = document.createElement('div');
  grid.className = 'mc-grid';
  question.options.forEach(function(opt) {
    var btn = document.createElement('button');
    btn.className = 'mc-option';
    btn.dataset.id = opt.id;
    btn.textContent = opt.text;
    btn.addEventListener('click', function() {
      if (submitted) return;
      grid.querySelectorAll('.mc-option').forEach(function(b) { b.classList.remove('selected'); });
      btn.classList.add('selected');
      selected = opt.id;
    });
    grid.appendChild(btn);
  });
  var submitBtn = document.createElement('button');
  submitBtn.className = 'btn-submit';
  submitBtn.textContent = 'Antwort abgeben';
  submitBtn.addEventListener('click', function() {
    if (!selected || submitted) return;
    submitted = true;
    submitBtn.disabled = true;
    submitBtn.textContent = '✓ Abgegeben';
    grid.querySelectorAll('.mc-option').forEach(function(b) { b.disabled = true; b.classList.add('locked'); });
    onSubmit(selected);
  });
  container.appendChild(grid);
  container.appendChild(submitBtn);
}

// ── Estimate (intern) ─────────────────────────────────────────
function _renderEstimate(question, container, onSubmit) {
  var s = question.slider;
  if (!s) { container.innerHTML = '<p style="color:var(--text-muted)">Slider-Konfiguration fehlt.</p>'; return; }
  var submitted = false;
  var wrap = document.createElement('div');
  wrap.className = 'estimate-wrap';
  var midVal = Math.round((s.min + s.max) / 2);
  var valueDisplay = document.createElement('div');
  valueDisplay.className = 'estimate-value';
  valueDisplay.textContent = midVal + ' ' + (s.unit || '');
  var slider = document.createElement('input');
  slider.type = 'range';
  slider.className = 'estimate-slider';
  slider.min = s.min; slider.max = s.max;
  slider.step = s.step || 1; slider.value = midVal;
  slider.addEventListener('input', function() { valueDisplay.textContent = slider.value + ' ' + (s.unit || ''); });
  var labelsRow = document.createElement('div');
  labelsRow.className = 'slider-labels';
  labelsRow.innerHTML = '<span class="slider-label">' + s.min + ' ' + (s.unit||'') + '</span><span class="slider-label">' + s.max + ' ' + (s.unit||'') + '</span>';
  var submitBtn = document.createElement('button');
  submitBtn.className = 'btn-submit';
  submitBtn.textContent = 'Schätzung abgeben';
  submitBtn.addEventListener('click', function() {
    if (submitted) return;
    submitted = true;
    slider.disabled = true;
    submitBtn.disabled = true;
    submitBtn.textContent = '✓ ' + slider.value + ' ' + (s.unit || '');
    onSubmit(parseInt(slider.value));
  });
  wrap.appendChild(valueDisplay);
  wrap.appendChild(slider);
  wrap.appendChild(labelsRow);
  wrap.appendChild(submitBtn);
  container.appendChild(wrap);
}

// ── Sort (intern) ─────────────────────────────────────────────
function _renderSort(question, container, onSubmit) {
  var submitted = false;
  var items = question.items.slice().sort(function() { return Math.random() - 0.5; });
  var hint = document.createElement('p');
  hint.className = 'sort-hint';
  hint.textContent = 'Ziehe die Elemente in die richtige Reihenfolge (oben = erstes):';
  container.appendChild(hint);
  var list = document.createElement('ul');
  list.className = 'sort-list';
  items.forEach(function(item) {
    var li = document.createElement('li');
    li.className = 'sort-item';
    li.draggable = true;
    li.dataset.id = item.id;
    li.innerHTML = '<span class="drag-handle">⠿</span><span class="sort-text">' + item.text + '</span>';
    li.addEventListener('dragstart', function() { li.classList.add('dragging'); });
    li.addEventListener('dragend', function() { li.classList.remove('dragging'); });
    li.addEventListener('dragover', function(e) {
      e.preventDefault();
      var dragging = list.querySelector('.dragging');
      if (!dragging || dragging === li) return;
      var rect = li.getBoundingClientRect();
      if (e.clientY < rect.top + rect.height / 2) list.insertBefore(dragging, li);
      else list.insertBefore(dragging, li.nextSibling);
    });
    li.addEventListener('touchstart', function() { li.classList.add('dragging'); }, { passive: true });
    li.addEventListener('touchmove', function(e) {
      e.preventDefault();
      var y = e.touches[0].clientY;
      var siblings = Array.from(list.querySelectorAll('.sort-item:not(.dragging)'));
      var after = siblings.find(function(s) { var r = s.getBoundingClientRect(); return y < r.top + r.height / 2; });
      if (after) list.insertBefore(li, after); else list.appendChild(li);
    }, { passive: false });
    li.addEventListener('touchend', function() { li.classList.remove('dragging'); });
    list.appendChild(li);
  });
  var submitBtn = document.createElement('button');
  submitBtn.className = 'btn-submit';
  submitBtn.textContent = 'Reihenfolge abgeben';
  submitBtn.addEventListener('click', function() {
    if (submitted) return;
    submitted = true;
    submitBtn.disabled = true;
    submitBtn.textContent = '✓ Abgegeben';
    list.querySelectorAll('.sort-item').forEach(function(li) { li.draggable = false; });
    var order = Array.from(list.querySelectorAll('.sort-item')).map(function(li) { return li.dataset.id; });
    onSubmit(order);
  });
  container.appendChild(list);
  container.appendChild(submitBtn);
}

// ─────────────────────────────────────────────────────────────
// MULTIPLE CHOICE
// ─────────────────────────────────────────────────────────────
QuestionTypes['multiple-choice'] = {
  renderPlayer: function(question, container, onSubmit) {
    container.innerHTML = '';
    _renderMC(question, container, onSubmit);
  },
  renderModerator: function(question, answers, container) {
    container.innerHTML = '';
    _renderMCStats(question, answers, container);
  }
};

// ─────────────────────────────────────────────────────────────
// SCHÄTZFRAGE
// ─────────────────────────────────────────────────────────────
QuestionTypes['estimate'] = {
  renderPlayer: function(question, container, onSubmit) {
    container.innerHTML = '';
    _renderEstimate(question, container, onSubmit);
  },
  renderModerator: function(question, answers, container) {
    container.innerHTML = '';
    _renderEstimateStats(question, answers, container);
  }
};

// ─────────────────────────────────────────────────────────────
// BILDERQUIZ
// ─────────────────────────────────────────────────────────────
QuestionTypes['image-quiz'] = {
  renderPlayer: function(question, container, onSubmit) {
    container.innerHTML = '';
    if (question.image && question.image.src) {
      var imgWrap = document.createElement('div');
      imgWrap.className = 'image-quiz-img-wrap';
      var img = document.createElement('img');
      img.src = question.image.src;
      img.alt = question.image.alt || '';
      img.className = 'image-quiz-img';
      if (question.image.zoomEnabled) {
        img.classList.add('zoomable');
        img.addEventListener('click', function() { img.classList.toggle('zoomed'); });
      }
      imgWrap.appendChild(img);
      container.appendChild(imgWrap);
    }
    var answerArea = document.createElement('div');
    renderByAnswerMode(question, answerArea, onSubmit);
    container.appendChild(answerArea);
  },
  renderModerator: function(question, answers, container) {
    container.innerHTML = '';
    if (question.image && question.image.src) {
      var img = document.createElement('img');
      img.src = question.image.src;
      img.style.cssText = 'max-width:300px;border-radius:8px;margin-bottom:1rem;display:block';
      container.appendChild(img);
    }
    var mode = question.answerMode || 'multiple-choice';
    if (mode === 'buzzer') {
      var state = typeof SessionEngine !== 'undefined' ? SessionEngine.getState() : null;
      var info = document.createElement('div');
      info.className = 'card-sm';
      info.style.cssText = 'border-color:var(--buzzer);color:var(--text-secondary)';
      var buzzed = state && state.buzzer ? state.buzzer.activatedBy : null;
      var buzzName = buzzed ? _getPlayerName(buzzed, state) : null;
      info.innerHTML =
        '<p style="font-weight:700;color:var(--buzzer);margin-bottom:0.5rem">🔔 Buzzer-Modus</p>' +
        (buzzName ? '<p style="font-size:1rem;font-weight:700;color:var(--accent)">🎯 ' + buzzName + ' hat gebuzzert!</p>' : '<p style="font-size:0.85rem">Warte auf Buzzer...</p>') +
        '<p style="font-size:0.85rem;margin-top:0.5rem">Punkte manuell vergeben.</p>';
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
  renderPlayer: function(question, container, onSubmit) {
    container.innerHTML = '';
    _renderSort(question, container, onSubmit);
  },
  renderModerator: function(question, answers, container) {
    container.innerHTML = '';
    var state = typeof SessionEngine !== 'undefined' ? SessionEngine.getState() : null;
    var correctDiv = document.createElement('div');
    correctDiv.innerHTML = '<strong>Richtige Reihenfolge:</strong>';
    var ol = document.createElement('ol');
    question.correctOrder.forEach(function(id) {
      var item = question.items.find(function(i) { return i.id === id; });
      var li = document.createElement('li');
      li.textContent = item ? item.text : id;
      ol.appendChild(li);
    });
    correctDiv.appendChild(ol);
    container.appendChild(correctDiv);
    if (Object.keys(answers).length > 0) {
      var answersDiv = document.createElement('div');
      answersDiv.style.marginTop = '1rem';
      answersDiv.innerHTML = '<strong>Spieler-Antworten:</strong>';
      Object.entries(answers).forEach(function(entry) {
        var pid = entry[0]; var ans = entry[1];
        var correct = 0;
        if (Array.isArray(ans.value)) {
          ans.value.forEach(function(id, idx) { if (question.correctOrder[idx] === id) correct++; });
        }
        var row = document.createElement('div');
        row.style.cssText = 'display:flex;justify-content:space-between;padding:0.5rem 0;border-bottom:1px solid var(--border)';
        var name = ans.playerName || _getPlayerName(pid, state);
        row.innerHTML = '<span>' + name + '</span><span style="color:var(--accent)">' + correct + '/' + question.correctOrder.length + ' richtig</span>';
        answersDiv.appendChild(row);
      });
      container.appendChild(answersDiv);
    }
  }
};

// ─────────────────────────────────────────────────────────────
// FIGHT LIST
// ─────────────────────────────────────────────────────────────
QuestionTypes['fight-list'] = {
  renderPlayer: function(question, container, onSubmit) {
    container.innerHTML = '';
    var submitted = false;

    var hint = document.createElement('p');
    hint.style.cssText = 'font-size:0.85rem;color:var(--text-secondary);margin-bottom:0.5rem';
    hint.textContent = 'Schreibe so viele Antworten wie möglich – eine pro Zeile (Enter):';
    container.appendChild(hint);

    if (question.hint) {
      var customHint = document.createElement('div');
      customHint.style.cssText = 'background:var(--accent-glow);border:1px solid var(--accent-dim);border-radius:var(--radius-md);padding:0.6rem 1rem;margin-bottom:1rem;font-weight:700;color:var(--accent)';
      customHint.textContent = '💡 ' + question.hint;
      container.appendChild(customHint);
    }

    var textarea = document.createElement('textarea');
    textarea.style.cssText = 'width:100%;min-height:180px;background:var(--bg-elevated);border:2px solid var(--border);border-radius:var(--radius-md);color:var(--text-primary);font-family:var(--font-body);font-size:1rem;padding:0.875rem 1rem;outline:none;resize:vertical;line-height:1.7;box-sizing:border-box';
    textarea.placeholder = 'Antwort 1\nAntwort 2\nAntwort 3\n...';
    textarea.addEventListener('focus', function() { textarea.style.borderColor = 'var(--accent)'; });
    textarea.addEventListener('blur', function() { textarea.style.borderColor = 'var(--border)'; });

    var counter = document.createElement('div');
    counter.style.cssText = 'font-size:0.8rem;color:var(--text-muted);margin-top:0.4rem;text-align:right';
    counter.textContent = '0 Antworten';
    textarea.addEventListener('input', function() {
      var count = textarea.value.split('\n').filter(function(l) { return l.trim(); }).length;
      counter.textContent = count + ' Antwort' + (count !== 1 ? 'en' : '');
    });

    var submitBtn = document.createElement('button');
    submitBtn.className = 'btn-submit';
    submitBtn.textContent = 'Antworten abgeben';
    submitBtn.addEventListener('click', function() {
      if (submitted) return;
      var answers = textarea.value.split('\n').map(function(l) { return l.trim(); }).filter(function(l) { return l.length > 0; });
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

  renderModerator: function(question, answers, container) {
    container.innerHTML = '';
    var state = typeof SessionEngine !== 'undefined' ? SessionEngine.getState() : null;
    var pointsPerAnswer = question.pointsPerAnswer || 10;
    var playerEntries = Object.entries(answers);

    if (playerEntries.length === 0) {
      container.innerHTML = '<p style="color:var(--text-muted)">Noch keine Antworten eingegangen.</p>';
      return;
    }

    playerEntries.forEach(function(entry) {
      var pid = entry[0]; var ans = entry[1];
      var playerAnswers = Array.isArray(ans.value) ? ans.value : [];
      var playerName = ans.playerName || _getPlayerName(pid, state);

      var block = document.createElement('div');
      block.style.cssText = 'background:var(--bg-elevated);border:1px solid var(--border);border-radius:var(--radius-md);padding:1rem;margin-bottom:1rem';

      var header = document.createElement('div');
      header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:0.75rem';
      header.innerHTML = '<span style="font-weight:700">' + playerName + '</span><span id="fl-score-' + pid + '" style="color:var(--accent);font-family:var(--font-display);font-size:1.3rem">0 Pkt</span>';
      block.appendChild(header);

      var list = document.createElement('div');
      list.style.cssText = 'display:flex;flex-direction:column;gap:0.4rem';
      var statusMap = {};

      function recalcScore() {
        var correct = Object.values(statusMap).filter(function(s) { return s === 'correct'; }).length;
        var el = document.getElementById('fl-score-' + pid);
        if (el) el.textContent = (correct * pointsPerAnswer) + ' Pkt (' + correct + ' richtig)';
      }

      playerAnswers.forEach(function(answer, i) {
        statusMap[i] = null;
        var row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;gap:0.5rem;padding:0.4rem 0.5rem;border-radius:6px;transition:background 0.2s';
        var text = document.createElement('span');
        text.style.cssText = 'flex:1;font-size:0.95rem';
        text.textContent = answer;
        var btnC = document.createElement('button');
        btnC.textContent = '✓';
        btnC.style.cssText = 'padding:0.25rem 0.6rem;border-radius:4px;border:1px solid var(--border);background:none;color:var(--text-muted);cursor:pointer;font-size:1rem';
        var btnW = document.createElement('button');
        btnW.textContent = '✗';
        btnW.style.cssText = 'padding:0.25rem 0.6rem;border-radius:4px;border:1px solid var(--border);background:none;color:var(--text-muted);cursor:pointer;font-size:1rem';

        function updateStyle() {
          var s = statusMap[i];
          row.style.background = s === 'correct' ? 'rgba(46,204,113,0.12)' : s === 'wrong' ? 'rgba(231,76,60,0.12)' : 'transparent';
          btnC.style.background = s === 'correct' ? 'var(--success)' : 'none';
          btnC.style.color = s === 'correct' ? '#000' : 'var(--text-muted)';
          btnC.style.borderColor = s === 'correct' ? 'var(--success)' : 'var(--border)';
          btnW.style.background = s === 'wrong' ? 'var(--danger)' : 'none';
          btnW.style.color = s === 'wrong' ? '#fff' : 'var(--text-muted)';
          btnW.style.borderColor = s === 'wrong' ? 'var(--danger)' : 'var(--border)';
        }

        (function(idx) {
          btnC.addEventListener('click', function() { statusMap[idx] = statusMap[idx] === 'correct' ? null : 'correct'; updateStyle(); recalcScore(); });
          btnW.addEventListener('click', function() { statusMap[idx] = statusMap[idx] === 'wrong' ? null : 'wrong'; updateStyle(); recalcScore(); });
        })(i);

        row.appendChild(text); row.appendChild(btnC); row.appendChild(btnW);
        list.appendChild(row);
      });

      block.appendChild(list);

      var awardBtn = document.createElement('button');
      awardBtn.className = 'btn btn-primary btn-sm';
      awardBtn.style.cssText = 'margin-top:0.75rem;width:100%';
      awardBtn.textContent = 'Punkte vergeben';
      (function(playerId) {
        awardBtn.addEventListener('click', function() {
          var correct = Object.values(statusMap).filter(function(s) { return s === 'correct'; }).length;
          var pts = correct * pointsPerAnswer;
          if (typeof SessionEngine !== 'undefined') {
            SessionEngine.awardPoints({ [playerId]: pts });
            awardBtn.textContent = '✓ ' + pts + ' Punkte vergeben';
            awardBtn.disabled = true;
          }
        });
      })(pid);
      block.appendChild(awardBtn);
      container.appendChild(block);
    });
  }
};

// ─────────────────────────────────────────────────────────────
// HIGHER LOWER
// ─────────────────────────────────────────────────────────────
var ROW_HEIGHT = 52;

QuestionTypes['higher-lower'] = {
  renderPlayer: function(question, container, onSubmit) {
    container.innerHTML = '';
    var state = typeof SessionEngine !== 'undefined' ? SessionEngine.getState() : null;
    var hl = state ? state.higherLower : null;
    var myId = typeof SessionEngine !== 'undefined' ? SessionEngine.getPlayerId() : null;
    var activePlayer = hl ? hl.activePlayerId : null;
    var isMe = myId && activePlayer === myId;
    var activeName = '';
    if (state && state.players && activePlayer) {
      var ap = state.players.find(function(p) { return p.id === activePlayer; });
      activeName = ap ? ap.name : '';
    }
    var myLives = (hl && myId && hl.lives) ? (hl.lives[myId] !== undefined ? hl.lives[myId] : question.lives || 2) : null;
    var maxLives = question.lives || 2;

    var header = document.createElement('div');
    header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem';
    var activeInfo = document.createElement('div');
    if (isMe) {
      activeInfo.innerHTML = '<span style="color:var(--accent);font-weight:700;font-size:1rem">🎯 Du bist dran!</span><br><span style="color:var(--text-muted);font-size:0.8rem">Sage laut Higher oder Lower</span>';
    } else if (activeName) {
      activeInfo.innerHTML = '<span style="color:var(--text-secondary);font-size:0.9rem"><strong>' + activeName + '</strong> ist dran</span>';
    } else {
      activeInfo.innerHTML = '<span style="color:var(--text-muted);font-size:0.85rem">Warte auf den Moderator...</span>';
    }
    var livesEl = document.createElement('div');
    livesEl.style.cssText = 'font-size:1.3rem;letter-spacing:0.1rem';
    if (myLives !== null) {
      livesEl.innerHTML = Array.from({length: maxLives}, function(_, i) {
        return '<span style="opacity:' + (i < myLives ? 1 : 0.2) + '">❤️</span>';
      }).join('');
    }
    header.appendChild(activeInfo);
    header.appendChild(livesEl);
    container.appendChild(header);

    var scaleWrap = document.createElement('div');
    _renderHLScale(question, hl, scaleWrap, false);
    container.appendChild(scaleWrap);
  },

  renderModerator: function(question, answers, container) {
    container.innerHTML = '';
    var state = typeof SessionEngine !== 'undefined' ? SessionEngine.getState() : null;
    var hl = state ? state.higherLower : null;

    if (!hl) {
      var startBtn = document.createElement('button');
      startBtn.className = 'btn btn-primary';
      startBtn.style.width = '100%';
      startBtn.textContent = '▶ Higher-Lower starten';
      startBtn.addEventListener('click', function() {
        _hlInit(question, state);
        QuestionTypes['higher-lower'].renderModerator(question, answers, container);
      });
      container.appendChild(startBtn);
      return;
    }

    var scaleWrap = document.createElement('div');
    _renderHLScale(question, hl, scaleWrap, true);
    container.appendChild(scaleWrap);

    var activeName = '-';
    if (state && state.players) {
      var ap = state.players.find(function(p) { return p.id === hl.activePlayerId; });
      activeName = ap ? ap.name : '-';
    }
    var activeLives = (hl.lives && hl.lives[hl.activePlayerId] !== undefined) ? hl.lives[hl.activePlayerId] : (question.lives || 2);
    var livesStr = Array.from({length: question.lives||2}, function(_, i) { return i < activeLives ? '❤️' : '🖤'; }).join('');

    var infoBox = document.createElement('div');
    infoBox.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:0.75rem 1rem;background:var(--bg-elevated);border-radius:var(--radius-md);margin:1rem 0';
    infoBox.innerHTML = '<div><p style="font-size:0.7rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em">Aktiver Spieler</p><p style="font-weight:700;font-size:1.1rem;color:var(--accent)">' + activeName + '</p></div><div style="text-align:right"><p style="font-size:0.7rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em">Leben</p><p style="font-size:1.3rem">' + livesStr + '</p></div>';
    container.appendChild(infoBox);

    var startIndex = hl.startCardIndex !== undefined ? hl.startCardIndex : Math.max(0, question.cards.findIndex(function(c) { return c.isStart; }));
    var placedIndices = hl.placedCardIndices || [];
    var remainingIndices = question.cards.map(function(_, i) { return i; }).filter(function(i) { return !placedIndices.includes(i) && i !== startIndex; });
    var nextCardIndex = remainingIndices.length > 0 ? remainingIndices[0] : null;
    var nextCard = nextCardIndex !== null ? question.cards[nextCardIndex] : null;

    if (nextCard) {
      var nextBox = document.createElement('div');
      nextBox.style.cssText = 'padding:1rem;background:var(--bg-elevated);border:2px dashed var(--accent-dim);border-radius:var(--radius-md);margin-bottom:1rem';
      nextBox.innerHTML = '<p style="font-size:0.7rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:0.5rem">Nächste Karte (nur du siehst den Wert)</p>' +
        '<div style="display:flex;align-items:center;gap:1rem">' +
        (nextCard.image ? '<img src="' + nextCard.image + '" style="width:60px;height:60px;object-fit:cover;border-radius:6px" onerror="this.style.display=\'none\'">' : '') +
        '<div><p style="font-weight:700;font-size:1.1rem">' + nextCard.label + '</p><p style="font-family:var(--font-display);font-size:1.8rem;color:var(--accent)">' + nextCard.value + ' ' + (question.unit||'') + '</p></div></div>';
      container.appendChild(nextBox);

      var btnRow = document.createElement('div');
      btnRow.style.cssText = 'display:flex;gap:0.75rem;margin-bottom:0.75rem';
      var btnH = document.createElement('button');
      btnH.className = 'btn btn-success'; btnH.style.flex = '1';
      btnH.innerHTML = '▲ Higher – Richtig';
      var btnL = document.createElement('button');
      btnL.className = 'btn btn-danger'; btnL.style.flex = '1';
      btnL.innerHTML = '▼ Lower – Richtig';
      (function(ci) {
        btnH.addEventListener('click', function() { _hlAnswer(question, state, ci, true, container, answers); });
        btnL.addEventListener('click', function() { _hlAnswer(question, state, ci, true, container, answers); });
      })(nextCardIndex);
      btnRow.appendChild(btnH); btnRow.appendChild(btnL);
      container.appendChild(btnRow);

      var btnWrong = document.createElement('button');
      btnWrong.className = 'btn btn-secondary';
      btnWrong.style.cssText = 'width:100%;margin-bottom:1rem';
      btnWrong.textContent = '✗ Spieler hat falsch geraten';
      (function(ci) {
        btnWrong.addEventListener('click', function() { _hlAnswer(question, state, ci, false, container, answers); });
      })(nextCardIndex);
      container.appendChild(btnWrong);
    } else {
      var done = document.createElement('div');
      done.style.cssText = 'padding:1rem;text-align:center;color:var(--success);font-weight:700;border:1px solid var(--success);border-radius:var(--radius-md);margin-bottom:1rem';
      done.textContent = '✓ Alle Karten platziert!';
      container.appendChild(done);
    }

    var rankDiv = document.createElement('div');
    rankDiv.innerHTML = '<p style="font-size:0.7rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:0.5rem">Ausgeschieden</p>';
    if (!hl.eliminated || hl.eliminated.length === 0) {
      rankDiv.innerHTML += '<p style="color:var(--text-muted);font-size:0.85rem">Noch niemand.</p>';
    } else {
      hl.eliminated.forEach(function(pid, i) {
        var name = _getPlayerName(pid, state);
        var row = document.createElement('div');
        row.style.cssText = 'display:flex;gap:0.75rem;align-items:center;padding:0.4rem 0;border-bottom:1px solid var(--border);font-size:0.9rem';
        row.innerHTML = '<span style="color:var(--text-muted)">' + (i+1) + '.</span><span>' + name + '</span>';
        rankDiv.appendChild(row);
      });
    }
    container.appendChild(rankDiv);
  }
};

// ── Higher Lower Hilfsfunktionen ──────────────────────────────
function _hlInit(question, state) {
  if (!state) return;
  var lives = {};
  state.players.forEach(function(p) { lives[p.id] = question.lives || 2; });
  var startIndex = question.cards.findIndex(function(c) { return c.isStart; });
  if (startIndex < 0) startIndex = 0;
  state.higherLower = {
    startCardIndex: startIndex,
    placedCardIndices: [],
    activePlayerId: state.players.length > 0 ? state.players[0].id : null,
    playerOrder: state.players.map(function(p) { return p.id; }),
    lives: lives,
    eliminated: []
  };
  _hlPersist(state);
}

function _hlAnswer(question, state, cardIndex, wasCorrect, container, answers) {
  var hl = state.higherLower;
  if (!hl) return;
  hl.placedCardIndices.push(cardIndex);
  if (!wasCorrect) _hlLoseLife(question, state, hl);
  else _hlNextPlayer(state, hl);
  _hlPersist(state);
  QuestionTypes['higher-lower'].renderModerator(question, answers, container);
}

function _hlLoseLife(question, state, hl) {
  var pid = hl.activePlayerId;
  hl.lives[pid] = (hl.lives[pid] || 1) - 1;
  if (hl.lives[pid] <= 0) {
    hl.eliminated.push(pid);
    hl.playerOrder = hl.playerOrder.filter(function(id) { return id !== pid; });
  }
  _hlNextPlayer(state, hl);
}

function _hlNextPlayer(state, hl) {
  if (!hl.playerOrder || hl.playerOrder.length === 0) { hl.activePlayerId = null; return; }
  var cur = hl.playerOrder.indexOf(hl.activePlayerId);
  hl.activePlayerId = hl.playerOrder[(cur + 1) % hl.playerOrder.length];
}

function _hlPersist(state) {
  localStorage.setItem('quizmaster_session', JSON.stringify(state));
  try {
    var ch = new BroadcastChannel('quizmaster_channel');
    ch.postMessage({ type: 'HL_UPDATE', payload: state.higherLower });
    ch.close();
  } catch(e) {}
}

function _renderHLScale(question, hl, container, showValues) {
  container.innerHTML = '';
  var cards = question.cards || [];
  if (!cards.length) return;

  var startIndex = hl ? (hl.startCardIndex !== undefined ? hl.startCardIndex : 0) : Math.max(0, question.cards.findIndex(function(c) { return c.isStart; }));
  var placedIndices = hl ? [startIndex].concat(hl.placedCardIndices || []) : [startIndex];
  var placedCards = placedIndices.map(function(i) { return Object.assign({}, cards[i], {_index: i}); });

  var allIndices = cards.map(function(_, i) { return i; });
  var remainingIndices = allIndices.filter(function(i) { return !placedIndices.includes(i); });
  var nextCard = remainingIndices.length > 0 ? Object.assign({}, cards[remainingIndices[0]], {_index: remainingIndices[0]}) : null;

  var allValues = placedCards.map(function(c) { return Number(c.value); });
  var minVal = Math.min.apply(null, allValues);
  var maxVal = Math.max.apply(null, allValues);
  var range = maxVal - minVal || 1;

  var wrap = document.createElement('div');
  wrap.style.cssText = 'position:relative;width:100%;padding:0 1rem;box-sizing:border-box';

  if (nextCard) {
    var pending = document.createElement('div');
    pending.style.cssText = 'display:flex;justify-content:center;margin-bottom:1.5rem';
    var pendCard = _mkHLCardEl(nextCard, false, true, false);
    pendCard.style.border = '2px dashed var(--accent)';
    pending.appendChild(pendCard);
    wrap.appendChild(pending);
  }

  var calcHeight = Math.max(140, 80 + Math.ceil(placedCards.length / 2) * ROW_HEIGHT);
  var scaleArea = document.createElement('div');
  scaleArea.style.cssText = 'position:relative;margin:0 2.5rem;height:' + calcHeight + 'px';

  var line = document.createElement('div');
  line.style.cssText = 'position:absolute;top:50%;left:0;right:0;height:3px;background:linear-gradient(to right,var(--info),var(--accent));border-radius:2px;transform:translateY(-50%)';
  scaleArea.appendChild(line);

  var lblLow = document.createElement('div');
  lblLow.style.cssText = 'position:absolute;left:-2.5rem;top:50%;transform:translateY(-50%);font-size:0.65rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.1em;white-space:nowrap';
  lblLow.textContent = 'Niedrig';
  scaleArea.appendChild(lblLow);

  var lblHigh = document.createElement('div');
  lblHigh.style.cssText = 'position:absolute;right:-2.5rem;top:50%;transform:translateY(-50%);font-size:0.65rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.1em;white-space:nowrap';
  lblHigh.textContent = 'Hoch';
  scaleArea.appendChild(lblHigh);

  var sorted = placedCards.slice().sort(function(a, b) { return Number(a.value) - Number(b.value); });
  sorted.forEach(function(card, si) {
    var pct = range > 0 ? ((Number(card.value) - minVal) / range) * 80 + 10 : 50;
    var above = si % 2 === 0;
    var cardEl = _mkHLCardEl(card, showValues, false, card._index === startIndex);
    cardEl.style.position = 'absolute';
    cardEl.style.left = 'calc(' + pct + '% - 45px)';
    cardEl.style.width = '90px';
    if (above) cardEl.style.bottom = 'calc(50% + 8px)';
    else cardEl.style.top = 'calc(50% + 8px)';
    var connector = document.createElement('div');
    connector.style.cssText = 'position:absolute;left:calc(' + pct + '% - 1px);width:2px;background:var(--border);' + (above ? 'bottom:50%;height:8px' : 'top:50%;height:8px');
    scaleArea.appendChild(connector);
    scaleArea.appendChild(cardEl);
  });

  wrap.appendChild(scaleArea);
  container.appendChild(wrap);
}

function _mkHLCardEl(card, showValue, isPending, isStart) {
  var el = document.createElement('div');
  el.style.cssText =
    'background:' + (isStart ? 'var(--accent-glow)' : isPending ? 'var(--bg-card)' : 'var(--bg-elevated)') +
    ';border:2px solid ' + (isStart ? 'var(--accent)' : 'var(--border)') +
    ';border-radius:var(--radius-md);padding:0.4rem;text-align:center;transition:all 0.3s;position:relative';
  var imgHtml = card.image ? '<img src="' + card.image + '" style="width:52px;height:52px;object-fit:cover;border-radius:6px;display:block;margin:0 auto 0.2rem" onerror="this.style.display=\'none\'">' : '';
  var valueHtml = showValue ? '<div style="font-family:var(--font-display);font-size:0.9rem;color:var(--accent);line-height:1">' + card.value + '</div>' : '';
  var starHtml = isStart ? '<div style="position:absolute;top:-6px;right:-6px;background:var(--accent);color:#000;border-radius:50%;width:14px;height:14px;font-size:0.6rem;display:flex;align-items:center;justify-content:center;font-weight:900">★</div>' : '';
  el.innerHTML = starHtml + imgHtml + '<div style="font-size:0.7rem;color:var(--text-secondary);line-height:1.2;margin-top:0.1rem">' + (card.label || '') + '</div>' + valueHtml;
  return el;
}

// ── MC Stats ──────────────────────────────────────────────────
function _renderMCStats(question, answers, container) {
  var state = typeof SessionEngine !== 'undefined' ? SessionEngine.getState() : null;
  var stats = {};
  question.options.forEach(function(o) { stats[o.id] = []; });
  Object.entries(answers).forEach(function(entry) {
    var pid = entry[0]; var ans = entry[1];
    if (ans && stats[ans.value] !== undefined) {
      var name = ans.playerName || _getPlayerName(pid, state);
      stats[ans.value].push(name);
    }
  });
  var total = Object.values(stats).reduce(function(s, arr) { return s + arr.length; }, 0);
  var list = document.createElement('div');
  list.className = 'mc-stats';
  question.options.forEach(function(opt) {
    var players = stats[opt.id] || [];
    var count = players.length;
    var pct = total > 0 ? Math.round(count / total * 100) : 0;
    var isCorrect = opt.id === question.correctAnswer;
    var row = document.createElement('div');
    row.className = 'mc-stat-row' + (isCorrect ? ' correct' : '');
    row.innerHTML =
      '<div class="mc-stat-label">' +
        '<span class="opt-id">' + opt.id.toUpperCase() + '</span>' +
        '<span class="opt-text">' + opt.text + '</span>' +
        (isCorrect ? '<span class="correct-badge">✓ Richtig</span>' : '') +
      '</div>' +
      '<div class="mc-stat-bar-wrap">' +
        '<div class="mc-stat-bar" style="width:' + pct + '%"></div>' +
        '<span class="mc-stat-count">' + count + ' (' + pct + '%)</span>' +
      '</div>' +
      (players.length > 0 ? '<div style="font-size:0.8rem;color:var(--text-secondary);margin-top:0.35rem">' +
        players.map(function(n) { return '<span style="display:inline-block;margin-right:0.5rem;background:var(--bg-highlight);padding:0.15rem 0.5rem;border-radius:10px">' + n + '</span>'; }).join('') +
        '</div>' : '');
    list.appendChild(row);
  });
  container.appendChild(list);
}

function _renderEstimateStats(question, answers, container) {
  var state = typeof SessionEngine !== 'undefined' ? SessionEngine.getState() : null;
  var s = question.slider;
  if (!s) return;
  var correctInfo = document.createElement('div');
  correctInfo.style.cssText = 'padding:0.75rem;background:var(--bg-elevated);border-radius:8px;margin-bottom:1rem';
  correctInfo.innerHTML = '<strong>Richtige Antwort:</strong> ' + s.correctValue + ' ' + (s.unit||'') + '<br><small style="color:var(--text-muted)">Genau: ±' + s.toleranceExact + ' | Nah dran: ±' + s.toleranceClose + '</small>';
  container.appendChild(correctInfo);
  var playerAnswers = Object.entries(answers);
  if (playerAnswers.length === 0) {
    var p = document.createElement('p');
    p.style.color = 'var(--text-muted)';
    p.textContent = 'Noch keine Antworten.';
    container.appendChild(p);
    return;
  }
  playerAnswers.forEach(function(entry) {
    var pid = entry[0]; var ans = entry[1];
    var val = ans.value;
    var diff = Math.abs(val - s.correctValue);
    var isExact = diff <= s.toleranceExact;
    var isClose = diff <= s.toleranceClose;
    var name = ans.playerName || _getPlayerName(pid, state);
    var row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:1rem;padding:0.5rem 0;border-bottom:1px solid var(--border)';
    row.innerHTML =
      '<span style="flex:1">' + name + '</span>' +
      '<span style="color:var(--accent);font-family:var(--font-display)">' + val + ' ' + (s.unit||'') + '</span>' +
      '<span style="color:var(--text-muted);font-size:0.85rem">Δ ' + diff + '</span>' +
      (isExact ? '<span class="badge exact">Genau!</span>' : isClose ? '<span class="badge close">Nah dran</span>' : '');
    container.appendChild(row);
  });
}

window.QuestionTypes = QuestionTypes;
