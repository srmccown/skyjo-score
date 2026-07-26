(function () {
  "use strict";

  var MIN_PLAYERS = 2;
  var MAX_PLAYERS = 8;
  var MAX_ROUNDS = 10;
  var GAMES_KEY = "skyjo-score-games";

  var PLAYER_COLORS = [
    "#6a3fd6", "#1fa9d8", "#3cb54a", "#f6c31b",
    "#ee4136", "#0fb9a6", "#f2892c", "#e8578a"
  ];

  var draftCount = 4;
  var draftNames = [];

  var els = {
    setupScreen: document.getElementById("setup-screen"),
    gameScreen: document.getElementById("game-screen"),
    playerCount: document.getElementById("player-count"),
    playerDec: document.getElementById("player-dec"),
    playerInc: document.getElementById("player-inc"),
    nameInputs: document.getElementById("player-name-inputs"),
    startBtn: document.getElementById("start-game-btn"),
    gamesListSection: document.getElementById("games-list-section"),
    gamesList: document.getElementById("games-list"),
    showRulesBtn: document.getElementById("show-rules-btn"),
    rulesBtn: document.getElementById("rules-btn"),
    myGamesBtn: document.getElementById("my-games-btn"),
    rulesModal: document.getElementById("rules-modal"),
    closeRulesBtn: document.getElementById("close-rules-btn"),
    winnerBanner: document.getElementById("winner-banner"),
    nameRow: document.getElementById("name-row"),
    totalRow: document.getElementById("total-row"),
    scoreBody: document.getElementById("score-body"),
    addRoundBtn: document.getElementById("add-round-btn"),
    themeToggleSetup: document.getElementById("theme-toggle-setup"),
    themeToggleGame: document.getElementById("theme-toggle-game"),
    heroLogoImg: document.getElementById("hero-logo-img"),
    brandLogoImg: document.getElementById("brand-logo-img"),
    gameNameInput: document.getElementById("game-name-input"),
    addPlayerBtn: document.getElementById("add-player-btn"),
    addPlayerModal: document.getElementById("add-player-modal"),
    closeAddPlayerBtn: document.getElementById("close-add-player-btn"),
    addPlayerNameInput: document.getElementById("add-player-name"),
    avgPreview: document.getElementById("avg-preview"),
    customScoreRow: document.getElementById("custom-score-row"),
    customScoreInput: document.getElementById("custom-score-input"),
    customScoreSignBtn: document.getElementById("custom-score-sign-btn"),
    confirmAddPlayerBtn: document.getElementById("confirm-add-player-btn")
  };

  var state = null; // one saved game record: { id, name, players: [{name,color}], rounds: [{scores:[...], ender:idx|null}], createdAt, updatedAt }

  // ---------- Multi-game storage ----------
  // Every saved game lives in one array under GAMES_KEY, so several games can
  // be in progress at once and the setup screen can list them all for resuming.

  var LEGACY_STATE_KEY = "skyjo-score-state";

  function loadGames() {
    try {
      var raw = localStorage.getItem(GAMES_KEY);
      var games = raw ? JSON.parse(raw) : [];
      return Array.isArray(games) ? games : [];
    } catch (e) {
      return [];
    }
  }

  function saveGames(games) {
    localStorage.setItem(GAMES_KEY, JSON.stringify(games));
  }

  function findGameIndex(games, id) {
    for (var i = 0; i < games.length; i++) {
      if (games[i].id === id) return i;
    }
    return -1;
  }

  function defaultGameName(players) {
    var names = players.map(function (p) { return p.name; });
    var shown = names.slice(0, 3).join(", ");
    return names.length > 3 ? shown + " +" + (names.length - 3) : shown;
  }

  function makeGameRecord(players, rounds) {
    var now = Date.now();
    return {
      id: "g" + now + Math.random().toString(36).slice(2, 8),
      name: defaultGameName(players),
      players: players,
      rounds: rounds,
      createdAt: now,
      updatedAt: now
    };
  }

  // One-time migration from the old single-game storage key used before
  // multi-game support existed, so an in-progress game isn't lost.
  function migrateLegacyState() {
    try {
      var raw = localStorage.getItem(LEGACY_STATE_KEY);
      localStorage.removeItem(LEGACY_STATE_KEY);
      if (!raw) return;
      var legacy = JSON.parse(raw);
      if (legacy && legacy.players && legacy.players.length) {
        var games = loadGames();
        games.unshift(makeGameRecord(legacy.players, legacy.rounds || []));
        saveGames(games);
      }
    } catch (e) {
      // ignore malformed legacy data
    }
  }

  function saveState() {
    if (!state) return;
    state.updatedAt = Date.now();
    var games = loadGames();
    var idx = findGameIndex(games, state.id);
    if (idx === -1) games.unshift(state);
    else games[idx] = state;
    saveGames(games);
  }

  // ---------- Theme ----------

  var THEME_KEY = "skyjo-score-theme";
  var DARK_ICON = "☀️";
  var LIGHT_ICON = "\u{1F319}";

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    var icon = theme === "dark" ? DARK_ICON : LIGHT_ICON;
    if (els.themeToggleSetup) els.themeToggleSetup.textContent = icon;
    if (els.themeToggleGame) els.themeToggleGame.textContent = icon;
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "dark" ? "#171225" : "#6a3fd6");
    var logoSrc = theme === "dark" ? "icons/icon-dark.svg" : "icons/icon.svg";
    if (els.heroLogoImg) els.heroLogoImg.src = logoSrc;
    if (els.brandLogoImg) els.brandLogoImg.src = logoSrc;
  }

  function toggleTheme() {
    var current = document.documentElement.getAttribute("data-theme");
    var next = current === "dark" ? "light" : "dark";
    localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
  }

  function initTheme() {
    var saved = localStorage.getItem(THEME_KEY);
    applyTheme(saved === "dark" ? "dark" : "light");
  }

  // iOS only reads <link rel="apple-touch-icon"> at the moment the page is
  // added to the Home Screen (it does not honor a `media` attribute on it,
  // unlike the favicon links above), so the closest we can get to a "dark
  // icon" is keeping this single link's href in sync with the system
  // appearance while the page is open, in case that's when the user adds it.
  function syncAppleTouchIconToSystemAppearance() {
    var link = document.getElementById("apple-touch-icon-link");
    if (!link || !window.matchMedia) return;
    var query = window.matchMedia("(prefers-color-scheme: dark)");
    function update() {
      link.setAttribute("href", query.matches ? "icons/icon-180-dark.png" : "icons/icon-180.png");
    }
    update();
    if (query.addEventListener) query.addEventListener("change", update);
  }

  if (els.themeToggleSetup) els.themeToggleSetup.addEventListener("click", toggleTheme);
  if (els.themeToggleGame) els.themeToggleGame.addEventListener("click", toggleTheme);

  // ---------- Setup screen ----------

  function renderNameInputs() {
    els.nameInputs.innerHTML = "";
    for (var i = 0; i < draftCount; i++) {
      var field = document.createElement("div");
      field.className = "name-field";

      var dot = document.createElement("span");
      dot.className = "name-dot";
      dot.style.background = PLAYER_COLORS[i];
      field.appendChild(dot);

      var input = document.createElement("input");
      input.type = "text";
      input.maxLength = 16;
      input.placeholder = "Player " + (i + 1);
      input.id = "draft-name-" + i;
      input.autocomplete = "off";
      input.value = draftNames[i] || "";
      input.addEventListener("input", (function (idx) {
        return function (e) { draftNames[idx] = e.target.value; };
      })(i));
      field.appendChild(input);

      els.nameInputs.appendChild(field);
    }
  }

  function updatePlayerCountUI() {
    els.playerCount.textContent = String(draftCount);
    els.playerDec.disabled = draftCount <= MIN_PLAYERS;
    els.playerInc.disabled = draftCount >= MAX_PLAYERS;
  }

  els.playerDec.addEventListener("click", function () {
    if (draftCount > MIN_PLAYERS) {
      draftCount--;
      updatePlayerCountUI();
      renderNameInputs();
    }
  });

  els.playerInc.addEventListener("click", function () {
    if (draftCount < MAX_PLAYERS) {
      draftCount++;
      updatePlayerCountUI();
      renderNameInputs();
    }
  });

  els.startBtn.addEventListener("click", function () {
    var players = [];
    for (var i = 0; i < draftCount; i++) {
      var input = document.getElementById("draft-name-" + i);
      var name = (input.value || "").trim() || ("Player " + (i + 1));
      players.push({ name: name, color: PLAYER_COLORS[i] });
    }
    state = makeGameRecord(players, []);
    addRound();
    saveState();
    showGameScreen();
  });

  function resumeGame(id) {
    var games = loadGames();
    var idx = findGameIndex(games, id);
    if (idx === -1) return;
    state = games[idx];
    showGameScreen();
  }

  function deleteGame(id, evt) {
    evt.stopPropagation();
    if (!window.confirm("Delete this saved game? This can't be undone.")) return;
    var games = loadGames();
    var idx = findGameIndex(games, id);
    if (idx !== -1) {
      games.splice(idx, 1);
      saveGames(games);
    }
    renderGamesList();
  }

  function renderGamesList() {
    var games = loadGames().slice().sort(function (a, b) { return b.updatedAt - a.updatedAt; });
    els.gamesListSection.hidden = games.length === 0;
    els.gamesList.innerHTML = "";

    games.forEach(function (game) {
      var row = document.createElement("div");
      row.className = "game-item";
      row.addEventListener("click", function () { resumeGame(game.id); });

      var main = document.createElement("div");
      main.className = "game-item-main";

      var nameEl = document.createElement("div");
      nameEl.className = "game-item-name";
      nameEl.textContent = game.name || defaultGameName(game.players);
      main.appendChild(nameEl);

      var totals = computeTotals(game);
      var min = Math.min.apply(null, totals);
      var isOver = Math.max.apply(null, totals) >= 100;
      var leaders = game.players
        .filter(function (p, idx) { return totals[idx] === min; })
        .map(function (p) { return p.name; })
        .join(" & ");
      var roundCount = game.rounds ? game.rounds.length : 0;
      var status = isOver ? ("🏆 " + leaders + " won") : (leaders ? leaders + " leads" : "");

      var meta = document.createElement("div");
      meta.className = "game-item-meta";
      meta.textContent = game.players.length + (game.players.length === 1 ? " player" : " players") +
        " · Round " + roundCount + (status ? " · " + status : "");
      main.appendChild(meta);

      row.appendChild(main);

      var delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "game-item-delete";
      delBtn.setAttribute("aria-label", "Delete " + (game.name || "game"));
      delBtn.textContent = "✕";
      delBtn.addEventListener("click", function (e) { deleteGame(game.id, e); });
      row.appendChild(delBtn);

      els.gamesList.appendChild(row);
    });
  }

  function showRules() {
    els.rulesModal.hidden = false;
  }
  function hideRules() {
    els.rulesModal.hidden = true;
  }
  els.showRulesBtn.addEventListener("click", showRules);
  els.rulesBtn.addEventListener("click", showRules);
  els.closeRulesBtn.addEventListener("click", hideRules);
  els.rulesModal.addEventListener("click", function (e) {
    if (e.target === els.rulesModal) hideRules();
  });

  // ---------- Game screen ----------

  function showGameScreen() {
    els.setupScreen.hidden = true;
    els.gameScreen.hidden = false;
    renderGame();
  }

  function showSetupScreen() {
    els.gameScreen.hidden = true;
    els.setupScreen.hidden = false;
    renderGamesList();
    updatePlayerCountUI();
    renderNameInputs();
  }

  // The current game auto-saves on every change, so switching back to the
  // games list is just navigation - nothing is lost, no confirmation needed.
  els.myGamesBtn.addEventListener("click", function () {
    showSetupScreen();
  });

  els.gameNameInput.addEventListener("input", function () {
    if (!state) return;
    state.name = els.gameNameInput.value;
    saveState();
  });
  els.gameNameInput.addEventListener("blur", function () {
    if (!state) return;
    state.name = els.gameNameInput.value.trim() || defaultGameName(state.players);
    els.gameNameInput.value = state.name;
    saveState();
  });

  function addRound() {
    if (state.rounds.length >= MAX_ROUNDS) return;
    var scores = [];
    for (var i = 0; i < state.players.length; i++) scores.push(null);
    state.rounds.push({ scores: scores, ender: null });
  }

  els.addRoundBtn.addEventListener("click", function () {
    addRound();
    saveState();
    renderGame();
  });

  // ---------- Add Player (mid-game) ----------

  function readSignedInput(input) {
    var negative = input.value.indexOf("-") !== -1;
    var digits = input.value.replace(/[^0-9]/g, "");
    return digits === "" ? null : Number(digits) * (negative ? -1 : 1);
  }

  function wireSignedInput(input, signBtn, onChange) {
    function apply(toggleSign) {
      var negative = input.value.indexOf("-") !== -1;
      var digits = input.value.replace(/[^0-9]/g, "");
      if (toggleSign) negative = !negative;
      var num = digits === "" ? null : Number(digits) * (negative ? -1 : 1);
      input.value = num === null ? (negative ? "-" : "") : String(num);
      signBtn.classList.toggle("active", negative);
      if (onChange) onChange(num);
    }
    input.addEventListener("input", function () { apply(false); });
    signBtn.addEventListener("click", function () { apply(true); input.focus(); });
  }

  wireSignedInput(els.customScoreInput, els.customScoreSignBtn);

  function currentStartScoreMode() {
    var radios = document.getElementsByName("start-score-mode");
    for (var i = 0; i < radios.length; i++) {
      if (radios[i].checked) return radios[i].value;
    }
    return "average";
  }

  Array.prototype.forEach.call(document.getElementsByName("start-score-mode"), function (radio) {
    radio.addEventListener("change", function () {
      els.customScoreRow.hidden = currentStartScoreMode() !== "custom";
    });
  });

  function showAddPlayerModal() {
    if (!state || state.players.length >= MAX_PLAYERS) return;
    els.addPlayerNameInput.value = "";
    document.getElementsByName("start-score-mode")[0].checked = true;
    els.customScoreRow.hidden = true;
    els.customScoreInput.value = "";
    els.customScoreSignBtn.classList.remove("active");
    els.avgPreview.textContent = String(averageOf(computeTotals(state)));
    els.addPlayerModal.hidden = false;
    els.addPlayerNameInput.focus();
  }

  function hideAddPlayerModal() {
    els.addPlayerModal.hidden = true;
  }

  els.addPlayerBtn.addEventListener("click", showAddPlayerModal);
  els.closeAddPlayerBtn.addEventListener("click", hideAddPlayerModal);
  els.addPlayerModal.addEventListener("click", function (e) {
    if (e.target === els.addPlayerModal) hideAddPlayerModal();
  });

  els.confirmAddPlayerBtn.addEventListener("click", function () {
    var name = els.addPlayerNameInput.value.trim() || ("Player " + (state.players.length + 1));
    var startingScore;
    if (currentStartScoreMode() === "custom") {
      startingScore = readSignedInput(els.customScoreInput) || 0;
    } else {
      startingScore = averageOf(computeTotals(state));
    }
    var color = PLAYER_COLORS[state.players.length % PLAYER_COLORS.length];
    state.players.push({ name: name, color: color, startingScore: startingScore });
    state.rounds.forEach(function (round) { round.scores.push(null); });
    saveState();
    hideAddPlayerModal();
    renderGame();
  });

  function effectiveScore(round, playerIdx) {
    var raw = round.scores[playerIdx];
    if (raw === null || raw === undefined || raw === "") return 0;
    raw = Number(raw);
    if (round.ender === playerIdx) {
      var others = [];
      for (var i = 0; i < round.scores.length; i++) {
        if (i === playerIdx) continue;
        var v = round.scores[i];
        if (v !== null && v !== undefined && v !== "") others.push(Number(v));
      }
      if (others.length > 0 && raw > 0) {
        var isLowest = others.every(function (v) { return raw < v; });
        if (!isLowest) return raw * 2;
      }
    }
    return raw;
  }

  function isDoubled(round, playerIdx) {
    if (round.ender !== playerIdx) return false;
    var raw = round.scores[playerIdx];
    if (raw === null || raw === undefined || raw === "") return false;
    return effectiveScore(round, playerIdx) === Number(raw) * 2 && Number(raw) !== 0;
  }

  function computeTotals(game) {
    var totals = game.players.map(function (p) { return p.startingScore || 0; });
    (game.rounds || []).forEach(function (round) {
      game.players.forEach(function (p, idx) {
        totals[idx] += effectiveScore(round, idx);
      });
    });
    return totals;
  }

  function averageOf(totals) {
    if (!totals.length) return 0;
    return Math.round(totals.reduce(function (a, b) { return a + b; }, 0) / totals.length);
  }

  function renderGame() {
    els.gameNameInput.value = state.name || defaultGameName(state.players);

    // Header: names
    els.nameRow.innerHTML = "";
    var rndHeadTh = document.createElement("th");
    rndHeadTh.className = "rnd-col";
    rndHeadTh.textContent = "";
    els.nameRow.appendChild(rndHeadTh);

    state.players.forEach(function (p, idx) {
      var th = document.createElement("th");
      var wrap = document.createElement("div");
      wrap.className = "player-head";

      var bar = document.createElement("div");
      bar.className = "color-bar";
      bar.style.background = p.color;
      wrap.appendChild(bar);

      var input = document.createElement("input");
      input.className = "player-name-input";
      input.type = "text";
      input.maxLength = 16;
      input.value = p.name;
      input.addEventListener("change", function () {
        p.name = input.value.trim() || ("Player " + (idx + 1));
        input.value = p.name;
        saveState();
        renderTotals();
        renderWinnerBanner();
      });
      wrap.appendChild(input);

      if (p.startingScore) {
        var note = document.createElement("div");
        note.className = "start-score-note";
        note.textContent = "Started at " + p.startingScore;
        wrap.appendChild(note);
      }

      th.appendChild(wrap);
      els.nameRow.appendChild(th);
    });

    // Body: one row per round
    els.scoreBody.innerHTML = "";
    state.rounds.forEach(function (round, rIdx) {
      var tr = document.createElement("tr");

      var rndTd = document.createElement("td");
      rndTd.className = "rnd-col";
      var rndStack = document.createElement("div");
      rndStack.className = "cell-stack";
      var rndLabel = document.createElement("span");
      rndLabel.textContent = String(rIdx + 1);
      rndStack.appendChild(rndLabel);
      if (rIdx === state.rounds.length - 1 && state.rounds.length > 1) {
        var delBtn = document.createElement("button");
        delBtn.type = "button";
        delBtn.className = "remove-round-btn";
        delBtn.setAttribute("aria-label", "Remove round " + (rIdx + 1));
        delBtn.textContent = "✕";
        delBtn.addEventListener("click", function () {
          state.rounds.pop();
          saveState();
          renderGame();
        });
        rndStack.appendChild(delBtn);
      }
      rndTd.appendChild(rndStack);
      tr.appendChild(rndTd);

      state.players.forEach(function (p, pIdx) {
        var td = document.createElement("td");
        td.className = "score-cell";
        var stack = document.createElement("div");
        stack.className = "cell-stack";

        var input = document.createElement("input");
        input.className = "score-input";
        input.type = "text";
        input.inputMode = "numeric";
        input.pattern = "-?[0-9]*";
        input.autocomplete = "off";
        var val = round.scores[pIdx];
        input.value = (val === null || val === undefined) ? "" : String(val);
        input.placeholder = "–";
        stack.appendChild(input);

        var controls = document.createElement("div");
        controls.className = "cell-controls";

        var signBtn = document.createElement("button");
        signBtn.type = "button";
        signBtn.className = "sign-btn" + ((round.scores[pIdx] || 0) < 0 ? " active" : "");
        signBtn.setAttribute("aria-label", "Toggle negative for " + p.name);
        signBtn.innerHTML = "&plusmn;";
        controls.appendChild(signBtn);

        wireSignedInput(input, signBtn, function (num) {
          round.scores[pIdx] = num;
          saveState();
          renderTotals();
          renderDoubledStyles();
          renderWinnerBanner();
        });

        var flag = document.createElement("button");
        flag.type = "button";
        flag.className = "ender-btn" + (round.ender === pIdx ? " active" : "");
        flag.setAttribute("aria-label", "Mark " + p.name + " as round ender");
        flag.innerHTML = "&#9873;";
        flag.addEventListener("click", function () {
          round.ender = (round.ender === pIdx) ? null : pIdx;
          saveState();
          renderGame();
        });
        controls.appendChild(flag);

        stack.appendChild(controls);

        td.appendChild(stack);
        tr.appendChild(td);
      });

      els.scoreBody.appendChild(tr);
    });

    renderTotals();
    renderWinnerBanner();

    els.addRoundBtn.hidden = state.rounds.length >= MAX_ROUNDS;
    els.addPlayerBtn.hidden = state.players.length >= MAX_PLAYERS;
  }

  function renderDoubledStyles() {
    var inputs = els.scoreBody.querySelectorAll(".score-input");
    var i = 0;
    state.rounds.forEach(function (round) {
      state.players.forEach(function (p, pIdx) {
        var input = inputs[i++];
        if (!input) return;
        input.classList.toggle("doubled", isDoubled(round, pIdx));
      });
    });
  }

  function renderTotals() {
    els.totalRow.innerHTML = "";
    var blank = document.createElement("th");
    blank.className = "rnd-col";
    blank.textContent = "Total";
    els.totalRow.appendChild(blank);

    var totals = computeTotals(state);
    var min = Math.min.apply(null, totals);

    totals.forEach(function (t) {
      var th = document.createElement("th");
      var badge = document.createElement("span");
      badge.className = "total-badge";
      if (t >= 100) badge.classList.add("busted");
      else if (t === min) badge.classList.add("leader");
      badge.textContent = String(t);
      th.appendChild(badge);
      els.totalRow.appendChild(th);
    });

    renderDoubledStyles();
  }

  function renderWinnerBanner() {
    var totals = computeTotals(state);
    var maxTotal = Math.max.apply(null, totals);
    if (maxTotal < 100) {
      els.winnerBanner.hidden = true;
      return;
    }
    var min = Math.min.apply(null, totals);
    var winners = [];
    totals.forEach(function (t, idx) {
      if (t === min) winners.push(state.players[idx].name);
    });
    els.winnerBanner.hidden = false;
    els.winnerBanner.textContent = "🏆 Game over! " +
      winners.join(" & ") + " win" + (winners.length === 1 ? "s" : "") +
      " with " + min + " points.";
  }

  // ---------- Boot ----------

  function boot() {
    initTheme();
    syncAppleTouchIconToSystemAppearance();
    migrateLegacyState();
    updatePlayerCountUI();
    renderNameInputs();

    // Drop back into whichever saved game was touched most recently, so a
    // page refresh mid-game doesn't dump the player onto the games list.
    var games = loadGames();
    games.sort(function (a, b) { return b.updatedAt - a.updatedAt; });
    if (games.length && games[0].players && games[0].players.length) {
      state = games[0];
      showGameScreen();
    } else {
      showSetupScreen();
    }

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("sw.js").catch(function () {});
    }
  }

  boot();
})();
