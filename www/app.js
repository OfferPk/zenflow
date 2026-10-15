/**
 * ZenFlow - Main Application Controller & Canvas Renderer
 * Smooth offline touch/mouse interaction, audio, animations, and state persistence.
 */

(function () {
  'use strict';

  // --- State & DOM References ---
  const canvas = document.getElementById('flow-canvas');
  const ctx = canvas.getContext('2d');
  const boardWrapper = document.getElementById('board-wrapper');
  const boardStatus = document.getElementById('board-keyboard-status');

  // HUD Elements
  const hudPackName = document.getElementById('hud-pack-name');
  const hudLevelTitle = document.getElementById('hud-level-title');
  const hudFlows = document.getElementById('hud-flows');
  const hudPipe = document.getElementById('hud-pipe');
  const hudPipeMeter = document.getElementById('hud-pipe-meter');
  const hudPipeFill = document.getElementById('hud-pipe-fill');
  const hudMoves = document.getElementById('hud-moves');
  const hudTime = document.getElementById('hud-time');

  // Header Buttons
  const btnMenu = document.getElementById('btn-menu');
  const btnPackSwitch = document.getElementById('btn-pack-switch');
  const btnSound = document.getElementById('btn-sound');
  const iconSoundOn = document.getElementById('icon-sound-on');
  const iconSoundOff = document.getElementById('icon-sound-off');
  const btnSettings = document.getElementById('btn-settings');

  // Bottom Toolbar
  const btnPrev = document.getElementById('btn-prev');
  const btnNext = document.getElementById('btn-next');
  const btnUndo = document.getElementById('btn-undo');
  const btnReset = document.getElementById('btn-reset');
  const btnHint = document.getElementById('btn-hint');

  // Modals
  const modalVictory = document.getElementById('modal-victory');
  const victoryStars = document.getElementById('victory-stars');
  const victoryHeading = document.getElementById('victory-heading');
  const victorySub = document.getElementById('victory-sub');
  const vicMoves = document.getElementById('vic-moves');
  const vicPipe = document.getElementById('vic-pipe');
  const vicTime = document.getElementById('vic-time');
  const btnVicReplay = document.getElementById('btn-vic-replay');
  const btnVicNext = document.getElementById('btn-vic-next');
  const confettiCanvas = document.getElementById('confetti-canvas');

  const modalLevels = document.getElementById('modal-levels');
  const btnCloseLevels = document.getElementById('btn-close-levels');
  const packTabsContainer = document.getElementById('pack-tabs-container');
  const levelsGridContainer = document.getElementById('levels-grid-container');

  const modalSettings = document.getElementById('modal-settings');
  const btnCloseSettings = document.getElementById('btn-close-settings');
  const toggleColorblind = document.getElementById('toggle-colorblind');
  const toggleHaptics = document.getElementById('toggle-haptics');
  const btnClearData = document.getElementById('btn-clear-data');

  // Game Engine & Audio
  const audio = new window.ZenFlowAudio();
  const FLOW_COLORS = window.ZenFlow.FLOW_COLORS;
  const PACKS = window.ZenFlowLevels.ZENFLOW_PACKS;
  const ALL_LEVELS = window.ZenFlowLevels.ZENFLOW_LEVELS;

  let currentPackId = 'starter';
  let currentLevelIdx = 0;
  let game = null;
  let isPointerDown = false;
  let lastHoverCell = null;
  let keyboardCursor = null;
  let isKeyboardPathActive = false;
  let cellSize = 60;
  let boardOffset = { x: 0, y: 0 };
  let pulsePhase = 0;
  let animFrameId = null;

  // Timer & Metrics
  let startTime = null;
  let timerInterval = null;
  let elapsedSeconds = 0;
  let isLevelWon = false;

  // Settings & Storage
  const STORAGE_KEY_PROGRESS = 'zenflow_progress_v1';
  const STORAGE_KEY_SETTINGS = 'zenflow_settings_v1';

  let progressData = loadProgress();
  let userSettings = loadSettings();

  function loadProgress() {
    try {
      const data = localStorage.getItem(STORAGE_KEY_PROGRESS);
      return data ? JSON.parse(data) : {};
    } catch (e) {
      return {};
    }
  }

  function saveProgress(levelId, stars, moves, timeSec) {
    if (!progressData[levelId]) {
      progressData[levelId] = { stars: 0, bestMoves: 9999, bestTime: 9999 };
    }
    const current = progressData[levelId];
    current.stars = Math.max(current.stars || 0, stars);
    current.bestMoves = Math.min(current.bestMoves || 9999, moves);
    current.bestTime = Math.min(current.bestTime || 9999, timeSec);
    try {
      localStorage.setItem(STORAGE_KEY_PROGRESS, JSON.stringify(progressData));
    } catch (e) {}
  }

  function loadSettings() {
    let settings = { colorblind: true, haptics: true };
    try {
      const data = localStorage.getItem(STORAGE_KEY_SETTINGS);
      if (data) settings = { ...settings, ...JSON.parse(data) };
    } catch (e) {}
    return settings;
  }

  function saveSettings() {
    try {
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(userSettings));
    } catch (e) {}
  }

  // --- Level Management ---
  function getPackLevels(packId) {
    return ALL_LEVELS[packId] || ALL_LEVELS['starter'];
  }

  function getCurrentLevelData() {
    const list = getPackLevels(currentPackId);
    return list[currentLevelIdx] || list[0];
  }

  function startLevel(packId, levelIdx) {
    currentPackId = packId;
    const levels = getPackLevels(packId);
    if (levelIdx < 0) levelIdx = 0;
    if (levelIdx >= levels.length) levelIdx = levels.length - 1;
    currentLevelIdx = levelIdx;

    const levelData = levels[currentLevelIdx];
    game = new window.ZenFlow.ZenFlowGame(levelData);
    keyboardCursor = game.endpoints[0] ? { ...game.endpoints[0].a } : { r: 0, c: 0 };
    isKeyboardPathActive = false;
    boardStatus.textContent = '';

    isLevelWon = false;
    modalVictory.classList.add('hidden');
    modalLevels.classList.add('hidden');
    modalSettings.classList.add('hidden');

    resetTimer();
    startTimer();

    updateHUD();
    resizeCanvas();
    render();
  }

  function resetTimer() {
    clearInterval(timerInterval);
    elapsedSeconds = 0;
    hudTime.textContent = '00:00';
  }

  function startTimer() {
    clearInterval(timerInterval);
    startTime = Date.now() - (elapsedSeconds * 1000);
    timerInterval = setInterval(() => {
      if (isLevelWon) return;
      elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
      const mins = String(Math.floor(elapsedSeconds / 60)).padStart(2, '0');
      const secs = String(elapsedSeconds % 60).padStart(2, '0');
      hudTime.textContent = `${mins}:${secs}`;
    }, 1000);
  }

  // --- HUD Updates ---
  function updateHUD() {
    const pack = PACKS.find((p) => p.id === currentPackId);
    hudPackName.textContent = pack ? pack.name : 'ZenFlow';
    hudLevelTitle.textContent = `Level ${currentLevelIdx + 1}`;

    const totalFlows = game.endpoints.length;
    const completedFlows = game.getCompletedFlowCount();
    hudFlows.textContent = `${completedFlows} / ${totalFlows}`;

    const coverage = game.getCoverage();
    hudPipe.textContent = `${coverage.percentage}%`;
    hudPipeFill.style.width = `${coverage.percentage}%`;
    hudPipeMeter.setAttribute('aria-valuenow', String(coverage.percentage));
    hudMoves.textContent = String(game.moves);

    // Navigation buttons state
    const levels = getPackLevels(currentPackId);
    btnPrev.disabled = currentLevelIdx <= 0;
    btnNext.disabled = currentLevelIdx >= levels.length - 1;
  }

  // --- Canvas Rendering ---
  function resizeCanvas() {
    const rect = boardWrapper.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    const availableWidth = rect.width - 24;
    const availableHeight = rect.height - 24;
    const rawDim = Math.min(availableWidth, availableHeight, 520);
    const side = Math.max(rawDim, 1);

    canvas.width = Math.floor(side * dpr);
    canvas.height = Math.floor(side * dpr);
    canvas.style.width = `${side}px`;
    canvas.style.height = `${side}px`;

    ctx.resetTransform?.();
    ctx.scale(dpr, dpr);

    if (game) {
      cellSize = side / game.size;
      boardOffset = { x: 0, y: 0 };
    }
  }

  function render() {
    if (!game) return;

    const width = parseFloat(canvas.style.width) || 300;
    const height = parseFloat(canvas.style.height) || 300;

    ctx.clearRect(0, 0, width, height);

    // Draw background board grid
    drawGrid(width, height);

    // Draw paths (completed and active)
    drawPaths();

    // Draw endpoints
    drawEndpoints();

    if (document.activeElement === canvas) {
      drawKeyboardCursor();
    }
  }

  function drawKeyboardCursor() {
    if (!keyboardCursor) return;

    const inset = Math.max(3, cellSize * 0.06);
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(
      keyboardCursor.c * cellSize + inset,
      keyboardCursor.r * cellSize + inset,
      cellSize - inset * 2,
      cellSize - inset * 2,
      Math.min(10, cellSize * 0.18)
    );
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = Math.max(2, cellSize * 0.045);
    ctx.shadowColor = '#00C7BE';
    ctx.shadowBlur = Math.max(6, cellSize * 0.14);
    ctx.stroke();
    ctx.restore();
  }

  function drawGrid(w, h) {
    const size = game.size;
    const pad = 3;

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const x = c * cellSize + pad;
        const y = r * cellSize + pad;
        const s = cellSize - pad * 2;
        const radius = Math.min(10, s * 0.18);

        ctx.fillStyle = '#111827';
        ctx.beginPath();
        ctx.roundRect(x, y, s, s, radius);
        ctx.fill();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  }

  function drawPaths() {
    const pipeWidth = Math.max(10, cellSize * 0.38);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const [colorId, path] of game.paths.entries()) {
      if (!path || path.length < 2) continue;

      const color = FLOW_COLORS[colorId] || FLOW_COLORS[0];
      const isComplete = game.isFlowComplete(colorId);

      // Glow behind pipe
      ctx.save();
      ctx.shadowColor = color.hex;
      ctx.shadowBlur = isComplete ? 12 : 6;
      ctx.strokeStyle = color.hex;
      ctx.lineWidth = pipeWidth;

      ctx.beginPath();
      path.forEach((pt, idx) => {
        const cx = (pt.c + 0.5) * cellSize;
        const cy = (pt.r + 0.5) * cellSize;
        if (idx === 0) ctx.moveTo(cx, cy);
        else ctx.lineTo(cx, cy);
      });
      ctx.stroke();
      ctx.restore();

      // Core bright inner line for aesthetic high polish
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
      ctx.lineWidth = Math.max(2, pipeWidth * 0.25);
      ctx.beginPath();
      path.forEach((pt, idx) => {
        const cx = (pt.c + 0.5) * cellSize;
        const cy = (pt.r + 0.5) * cellSize;
        if (idx === 0) ctx.moveTo(cx, cy);
        else ctx.lineTo(cx, cy);
      });
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawEndpoints() {
    const pulse = 0.5 + 0.5 * Math.sin(pulsePhase);

    for (const ep of game.endpoints) {
      const color = FLOW_COLORS[ep.colorId] || FLOW_COLORS[0];
      const isComplete = game.isFlowComplete(ep.colorId);

      [ep.a, ep.b].forEach((pt) => {
        const cx = (pt.c + 0.5) * cellSize;
        const cy = (pt.r + 0.5) * cellSize;
        const baseRadius = cellSize * 0.34;

        // Outer glow / halo ring
        ctx.save();
        ctx.beginPath();
        const haloRadius = isComplete ? baseRadius + 3 : baseRadius + 2 + pulse * 2.5;
        ctx.arc(cx, cy, haloRadius, 0, Math.PI * 2);
        ctx.fillStyle = color.glow;
        ctx.fill();
        ctx.restore();

        // Main node body
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, baseRadius, 0, Math.PI * 2);
        ctx.fillStyle = color.hex;
        ctx.shadowColor = color.hex;
        ctx.shadowBlur = 10;
        ctx.fill();

        // Inner specular ring
        ctx.beginPath();
        ctx.arc(cx, cy, baseRadius * 0.72, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();

        // Colorblind letter identifier
        if (userSettings.colorblind) {
          ctx.save();
          ctx.font = `bold ${Math.round(baseRadius * 0.9)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#FFFFFF';
          ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
          ctx.shadowBlur = 4;
          ctx.fillText(color.label, cx, cy);
          ctx.restore();
        }
      });
    }
  }

  // --- Animation Loop ---
  function loop() {
    pulsePhase += 0.05;
    render();
    animFrameId = requestAnimationFrame(loop);
  }

  // --- Coordinates & Interaction Handling ---
  function getCellFromEvent(evt) {
    const rect = canvas.getBoundingClientRect();
    const clientX = evt.clientX || (evt.touches && evt.touches[0] ? evt.touches[0].clientX : null);
    const clientY = evt.clientY || (evt.touches && evt.touches[0] ? evt.touches[0].clientY : null);

    if (clientX === null || clientY === null) return null;

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const c = Math.floor(x / cellSize);
    const r = Math.floor(y / cellSize);

    if (game.isValidCoord(r, c)) {
      return { r, c };
    }
    return null;
  }

  function handlePointerDown(evt) {
    evt.preventDefault();
    audio.init();
    if (isLevelWon) return;

    const cell = getCellFromEvent(evt);
    if (!cell) return;

    keyboardCursor = cell;
    isKeyboardPathActive = false;
    isPointerDown = true;
    lastHoverCell = cell;

    const res = game.startPath(cell.r, cell.c);
    if (res) {
      audio.playStep(res.colorId);
      updateHUD();
      render();
    }
  }

  function handlePointerMove(evt) {
    if (!isPointerDown || !game.activeColorId || isLevelWon) return;
    evt.preventDefault();

    const cell = getCellFromEvent(evt);
    if (!cell) return;
    keyboardCursor = cell;

    if (lastHoverCell && lastHoverCell.r === cell.r && lastHoverCell.c === cell.c) {
      return;
    }

    lastHoverCell = cell;
    const res = game.extendPath(cell.r, cell.c);
    if (res) {
      if (res.status === 'connected') {
        audio.playConnect(res.colorId);
      } else if (res.status === 'backtrack') {
        audio.playDisconnect(res.colorId);
      } else if (res.status === 'extended') {
        audio.playStep(res.colorId);
      }
      updateHUD();
      render();

      if (res.completed && game.isLevelComplete()) {
        triggerVictory();
      }
    }
  }

  function handlePointerUp(evt) {
    if (!isPointerDown) return;
    isPointerDown = false;
    lastHoverCell = null;

    const activeColor = game.endPath();
    isKeyboardPathActive = false;
    if (game.isLevelComplete()) {
      triggerVictory();
    }
    updateHUD();
    render();
  }

  function announceBoardStatus(message) {
    boardStatus.textContent = message;
  }

  function handleBoardKeydown(event) {
    if (event.target !== canvas) return false;

    const directions = {
      ArrowUp: { r: -1, c: 0 },
      ArrowDown: { r: 1, c: 0 },
      ArrowLeft: { r: 0, c: -1 },
      ArrowRight: { r: 0, c: 1 }
    };
    const direction = directions[event.key];
    const isActivateKey = event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar';
    if (!direction && !isActivateKey) return false;

    event.preventDefault();
    if (isLevelWon) {
      announceBoardStatus('This level is complete. Choose Replay or Next Level in the victory dialog.');
      return true;
    }

    if (direction) {
      const nextCell = {
        r: keyboardCursor.r + direction.r,
        c: keyboardCursor.c + direction.c
      };

      if (!game.isValidCoord(nextCell.r, nextCell.c)) {
        announceBoardStatus(`Board edge. Row ${keyboardCursor.r + 1}, column ${keyboardCursor.c + 1}.`);
        return true;
      }

      if (!isKeyboardPathActive) {
        keyboardCursor = nextCell;
        announceBoardStatus(`Row ${keyboardCursor.r + 1}, column ${keyboardCursor.c + 1}.`);
        render();
        return true;
      }

      const result = game.extendPath(nextCell.r, nextCell.c);
      if (!result || result.status === 'blocked' || result.status === 'already_complete') {
        announceBoardStatus(result?.status === 'blocked'
          ? 'That cell is another color’s endpoint. The path has not moved.'
          : 'The path cannot move there. Use an adjacent cell or press Enter to finish.');
        return true;
      }

      keyboardCursor = nextCell;
      if (result.status === 'connected') audio.playConnect(result.colorId);
      else if (result.status === 'backtrack') audio.playDisconnect(result.colorId);
      else audio.playStep(result.colorId);

      if (result.status === 'connected') {
        game.endPath();
        isKeyboardPathActive = false;
        updateHUD();
        render();
        if (game.isLevelComplete()) {
          announceBoardStatus('All flows connected. Level complete.');
          triggerVictory();
        } else {
          announceBoardStatus(`Flow connected at row ${keyboardCursor.r + 1}, column ${keyboardCursor.c + 1}.`);
        }
        return true;
      }

      updateHUD();
      render();
      announceBoardStatus(`Path ${result.status === 'backtrack' ? 'shortened' : 'extended'} to row ${keyboardCursor.r + 1}, column ${keyboardCursor.c + 1}.`);
      return true;
    }

    if (isKeyboardPathActive) {
      game.endPath();
      isKeyboardPathActive = false;
      announceBoardStatus('Path ended. Use Undo to remove it or select a colored endpoint to continue.');
      render();
      return true;
    }

    audio.init();
    const result = game.startPath(keyboardCursor.r, keyboardCursor.c);
    if (!result) {
      announceBoardStatus('Select a colored endpoint or an existing pipe cell to start a path.');
      return true;
    }

    isKeyboardPathActive = true;
    audio.playStep(result.colorId);
    updateHUD();
    render();
    announceBoardStatus(`Path started at row ${keyboardCursor.r + 1}, column ${keyboardCursor.c + 1}. Use arrow keys to draw; press Enter or Space to finish.`);
    return true;
  }

  function handleCanvasBlur() {
    if (!isKeyboardPathActive || !game) return;
    game.endPath();
    isKeyboardPathActive = false;
    updateHUD();
    render();
    announceBoardStatus('Path ended when focus left the board. Use Undo to remove it or select a colored endpoint to continue.');
  }

  // --- Victory & Modals ---
  function triggerVictory() {
    if (isLevelWon) return;
    isLevelWon = true;
    clearInterval(timerInterval);

    const stars = game.getStars();
    const coverage = game.getCoverage();
    const isPerfect = stars === 3;

    audio.playVictory(isPerfect);
    saveProgress(game.levelId, stars, game.moves, elapsedSeconds);

    // Populate modal
    victoryHeading.textContent = isPerfect ? 'Perfect Flow!' : 'Level Cleared!';
    victorySub.textContent = isPerfect
      ? '100% full-board coverage achieved!'
      : 'All flows connected! Try filling every pipe cell for 3 stars.';

    const starSpans = victoryStars.querySelectorAll('.star');
    starSpans.forEach((s, idx) => {
      s.classList.toggle('active', idx < stars);
    });

    vicMoves.textContent = String(game.moves);
    vicPipe.textContent = `${coverage.percentage}%`;
    const mins = String(Math.floor(elapsedSeconds / 60)).padStart(2, '0');
    const secs = String(elapsedSeconds % 60).padStart(2, '0');
    vicTime.textContent = `${mins}:${secs}`;

    isKeyboardPathActive = false;
    openManagedDialog(modalVictory, canvas, btnVicReplay);
    runConfetti();
  }

  function runConfetti() {
    if (!confettiCanvas) return;
    const cCtx = confettiCanvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = confettiCanvas.getBoundingClientRect();

    confettiCanvas.width = rect.width * dpr;
    confettiCanvas.height = rect.height * dpr;
    cCtx.scale(dpr, dpr);

    const particles = [];
    const colors = FLOW_COLORS.map((c) => c.hex);

    for (let i = 0; i < 45; i++) {
      particles.push({
        x: rect.width * 0.5,
        y: rect.height * 0.4,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 1.2) * 9,
        size: Math.random() * 6 + 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        vr: (Math.random() - 0.5) * 10,
        alpha: 1
      });
    }

    let frames = 0;
    function animConfetti() {
      if (frames > 70) {
        cCtx.clearRect(0, 0, rect.width, rect.height);
        return;
      }
      frames++;
      cCtx.clearRect(0, 0, rect.width, rect.height);

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.28; // gravity
        p.rotation += p.vr;
        p.alpha -= 0.012;

        cCtx.save();
        cCtx.globalAlpha = Math.max(0, p.alpha);
        cCtx.translate(p.x, p.y);
        cCtx.rotate((p.rotation * Math.PI) / 180);
        cCtx.fillStyle = p.color;
        cCtx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        cCtx.restore();
      });

      requestAnimationFrame(animConfetti);
    }
    animConfetti();
  }

  // --- Keyboard-managed dialogs ---
  const DIALOG_FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  let activeManagedDialog = null;
  let dialogReturnFocus = null;

  function getDialogFocusableElements(dialog) {
    return Array.from(dialog.querySelectorAll(DIALOG_FOCUSABLE_SELECTOR)).filter((element) =>
      element.getClientRects().length > 0 && element.getAttribute('aria-hidden') !== 'true'
    );
  }

  function openManagedDialog(dialog, returnTarget, initialTarget) {
    if (activeManagedDialog && activeManagedDialog !== dialog) {
      closeManagedDialog(activeManagedDialog, false);
    }
    activeManagedDialog = dialog;
    dialogReturnFocus = returnTarget;
    dialog.classList.remove('hidden');
    const target = initialTarget || getDialogFocusableElements(dialog)[0];
    if (target) target.focus({ preventScroll: true });
  }

  function closeManagedDialog(dialog = activeManagedDialog, restoreFocus = true) {
    if (!dialog) return;
    dialog.classList.add('hidden');
    if (dialog !== activeManagedDialog) return;

    const returnTarget = dialogReturnFocus;
    activeManagedDialog = null;
    dialogReturnFocus = null;
    if (restoreFocus && returnTarget && returnTarget.isConnected) {
      returnTarget.focus({ preventScroll: true });
    }
  }

  function handleManagedDialogKeydown(event) {
    if (!activeManagedDialog) return false;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeManagedDialog();
      return true;
    }
    if (event.key !== 'Tab') return true;

    const focusable = getDialogFocusableElements(activeManagedDialog);
    if (!focusable.length) {
      event.preventDefault();
      activeManagedDialog.focus({ preventScroll: true });
      return true;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const focusIsOutside = !activeManagedDialog.contains(document.activeElement);
    if (event.shiftKey && (document.activeElement === first || focusIsOutside)) {
      event.preventDefault();
      last.focus({ preventScroll: true });
    } else if (!event.shiftKey && (document.activeElement === last || focusIsOutside)) {
      event.preventDefault();
      first.focus({ preventScroll: true });
    }
    return true;
  }

  // --- Level Selection Modal ---
  function openLevelSelect(returnTarget) {
    renderPackTabs();
    renderLevelsGrid();
    openManagedDialog(modalLevels, returnTarget, btnCloseLevels);
  }

  function renderPackTabs() {
    packTabsContainer.innerHTML = '';
    PACKS.forEach((pack) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `pack-tab ${pack.id === currentPackId ? 'active' : ''}`;
      btn.id = `pack-tab-${pack.id}`;
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', String(pack.id === currentPackId));
      btn.setAttribute('aria-controls', 'levels-grid-container');
      btn.tabIndex = pack.id === currentPackId ? 0 : -1;
      btn.textContent = pack.name;
      btn.style.setProperty('--tab-accent', pack.color);
      btn.addEventListener('click', () => {
        currentPackId = pack.id;
        renderPackTabs();
        renderLevelsGrid();
        packTabsContainer.querySelector('.pack-tab.active')?.focus({ preventScroll: true });
        audio.playTap();
      });
      packTabsContainer.appendChild(btn);
    });
  }

  function renderLevelsGrid() {
    levelsGridContainer.innerHTML = '';
    levelsGridContainer.setAttribute('role', 'tabpanel');
    levelsGridContainer.setAttribute('aria-labelledby', `pack-tab-${currentPackId}`);
    const levels = getPackLevels(currentPackId);

    levels.forEach((lvl, idx) => {
      const saved = progressData[lvl.id] || { stars: 0 };
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `level-grid-btn ${saved.stars > 0 ? 'completed' : ''} ${
        idx === currentLevelIdx && lvl.packId === currentPackId ? 'current' : ''
      }`;
      btn.setAttribute('aria-label', `Level ${idx + 1}, ${saved.stars || 0} of 3 stars`);
      if (idx === currentLevelIdx && lvl.packId === currentPackId) {
        btn.setAttribute('aria-current', 'step');
      }

      btn.innerHTML = `
        <span class="lvl-num">${idx + 1}</span>
        <span class="lvl-stars">${'★'.repeat(saved.stars || 0)}${'☆'.repeat(3 - (saved.stars || 0))}</span>
      `;

      btn.addEventListener('click', () => {
        audio.playTap();
        closeManagedDialog(modalLevels);
        startLevel(currentPackId, idx);
      });

      levelsGridContainer.appendChild(btn);
    });
  }

  // --- Sound & Settings ---
  function updateSoundUI() {
    if (audio.enabled) {
      iconSoundOn.classList.remove('hidden');
      iconSoundOff.classList.add('hidden');
    } else {
      iconSoundOn.classList.add('hidden');
      iconSoundOff.classList.remove('hidden');
    }
  }

  function openSettings(returnTarget) {
    toggleColorblind.checked = userSettings.colorblind;
    toggleHaptics.checked = userSettings.haptics;
    openManagedDialog(modalSettings, returnTarget, btnCloseSettings);
  }

  // --- Event Listeners Registration ---
  function registerEvents() {
    // Canvas pointer events
    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('blur', handleCanvasBlur);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    // Prevent scrolling / bouncing during drag on mobile touchscreens
    canvas.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
    canvas.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });

    // Sound Toggle
    btnSound.addEventListener('click', () => {
      audio.toggle();
      updateSoundUI();
    });

    // Menus & Modals
    btnMenu.addEventListener('click', () => {
      audio.playTap();
      openLevelSelect(btnMenu);
    });
    btnPackSwitch.addEventListener('click', () => {
      audio.playTap();
      openLevelSelect(btnPackSwitch);
    });
    btnPackSwitch.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        audio.playTap();
        openLevelSelect(btnPackSwitch);
      }
    });
    packTabsContainer.addEventListener('keydown', (event) => {
      if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
      const tabs = Array.from(packTabsContainer.querySelectorAll('[role="tab"]'));
      const currentIndex = tabs.indexOf(document.activeElement);
      if (currentIndex < 0 || !tabs.length) return;

      event.preventDefault();
      let nextIndex = currentIndex;
      if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % tabs.length;
      else if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
      else if (event.key === 'Home') nextIndex = 0;
      else nextIndex = tabs.length - 1;

      currentPackId = PACKS[nextIndex].id;
      renderPackTabs();
      renderLevelsGrid();
      const activeTab = packTabsContainer.querySelector('.pack-tab.active');
      activeTab?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      activeTab?.focus({ preventScroll: true });
      audio.playTap();
    });
    btnCloseLevels.addEventListener('click', () => {
      audio.playTap();
      closeManagedDialog(modalLevels);
    });

    btnSettings.addEventListener('click', () => {
      audio.playTap();
      openSettings(btnSettings);
    });
    btnCloseSettings.addEventListener('click', () => {
      audio.playTap();
      closeManagedDialog(modalSettings);
    });

    // Undo, Reset, Hint, Navigation
    btnUndo.addEventListener('click', () => {
      if (game.undo()) {
        isKeyboardPathActive = false;
        audio.playTap();
        updateHUD();
        render();
      }
    });

    btnReset.addEventListener('click', () => {
      audio.playTap();
      isKeyboardPathActive = false;
      game.reset();
      resetTimer();
      startTimer();
      updateHUD();
      render();
    });

    btnHint.addEventListener('click', () => {
      if (isKeyboardPathActive) {
        game.endPath();
        isKeyboardPathActive = false;
      }
      const hint = game.getHint();
      if (hint) {
        audio.playHint();
        updateHUD();
        render();
        if (game.isLevelComplete()) {
          triggerVictory();
        }
      }
    });

    btnPrev.addEventListener('click', () => {
      audio.playTap();
      startLevel(currentPackId, currentLevelIdx - 1);
    });

    btnNext.addEventListener('click', () => {
      audio.playTap();
      startLevel(currentPackId, currentLevelIdx + 1);
    });

    // Victory actions
    btnVicReplay.addEventListener('click', () => {
      audio.playTap();
      closeManagedDialog(modalVictory);
      startLevel(currentPackId, currentLevelIdx);
    });

    btnVicNext.addEventListener('click', () => {
      audio.playTap();
      closeManagedDialog(modalVictory);
      const levels = getPackLevels(currentPackId);
      if (currentLevelIdx < levels.length - 1) {
        startLevel(currentPackId, currentLevelIdx + 1);
      } else {
        // Move to next pack if available
        const currentPackIdx = PACKS.findIndex((p) => p.id === currentPackId);
        if (currentPackIdx < PACKS.length - 1) {
          startLevel(PACKS[currentPackIdx + 1].id, 0);
        } else {
          startLevel(PACKS[0].id, 0);
        }
      }
    });

    // Settings actions
    toggleColorblind.addEventListener('change', (e) => {
      userSettings.colorblind = e.target.checked;
      saveSettings();
      render();
    });

    toggleHaptics.addEventListener('change', (e) => {
      userSettings.haptics = e.target.checked;
      saveSettings();
    });

    btnClearData.addEventListener('click', () => {
      if (confirm('Are you sure you want to clear all level completion progress?')) {
        progressData = {};
        try {
          localStorage.removeItem(STORAGE_KEY_PROGRESS);
        } catch (e) {}
        closeManagedDialog(modalSettings);
        startLevel(currentPackId, 0);
      }
    });

    // Keyboard Shortcuts for accessibility
    window.addEventListener('keydown', (e) => {
      if (handleManagedDialogKeydown(e)) return;
      if (handleBoardKeydown(e)) return;
      if (e.key === 'u' || e.key === 'z') {
        if (game.undo()) {
          isKeyboardPathActive = false;
          audio.playTap();
          updateHUD();
          render();
        }
      } else if (e.key === 'r') {
        isKeyboardPathActive = false;
        game.reset();
        resetTimer();
        startTimer();
        updateHUD();
        render();
      } else if (e.key === 'h') {
        if (isKeyboardPathActive) {
          game.endPath();
          isKeyboardPathActive = false;
        }
        const hint = game.getHint();
        if (hint) {
          audio.playHint();
          updateHUD();
          render();
          if (game.isLevelComplete()) triggerVictory();
        }
      } else if (e.key === 'ArrowRight') {
        startLevel(currentPackId, currentLevelIdx + 1);
      } else if (e.key === 'ArrowLeft') {
        startLevel(currentPackId, currentLevelIdx - 1);
      }
    });

    // Window Resize & Orientation
    window.addEventListener('resize', () => {
      resizeCanvas();
      render();
    });
  }

  // --- Offline Service Worker Registration ---
  function registerServiceWorker() {
    if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(() => {});
      });
    }
  }

  // --- Initialization ---
  function init() {
    registerEvents();
    updateSoundUI();
    registerServiceWorker();
    startLevel('starter', 0);
    loop();
  }

  // Launch when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
