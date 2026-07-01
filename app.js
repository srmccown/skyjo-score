(function () {
  "use strict";

  var MIN_PLAYERS = 2;
  var MAX_PLAYERS = 8;
  var MAX_ROUNDS = 10;
  var STORAGE_KEY = "skyjo-score-state";

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
    resumeBtn: document.getElementById("resume-game-btn"),
    showRulesBtn: document.getElementById("show-rules-btn"),
    rulesBtn: document.getElementById("rules-btn"),
    newGameBtn: document.getElementById("new-game-btn"),
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
    brandLogoImg: document.getElementById("brand-logo-img")
  };

  var state = null; // { players: [{name,color}], rounds: [{scores:[...], ender:idx|null}] }

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function saveState() {
    if (state) localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function clearState() {
    localStorage.removeItem(STORAGE_KEY);
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
    state = { players: players, rounds: [] };
    addRound();
    saveState();
    showGameScreen();
  });

  els.resumeBtn.addEventListener("click", function () {
    var saved = loadState();
    if (saved) {
      state = saved;
      showGameScreen();
    }
  });

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
    var saved = loadState();
    els.resumeBtn.hidden = !saved;
    updatePlayerCountUI();
    renderNameInputs();
  }

  els.newGameBtn.addEventListener("click", function () {
    if (window.confirm("Start a new game? This will clear the current scoreboard.")) {
      clearState();
      state = null;
      showSetupScreen();
    }
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

  function computeTotals() {
    var totals = state.players.map(function () { return 0; });
    state.rounds.forEach(function (round) {
      state.players.forEach(function (p, idx) {
        totals[idx] += effectiveScore(round, idx);
      });
    });
    return totals;
  }

  function renderGame() {
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
        input.addEventListener("input", function () {
          var negative = input.value.indexOf("-") !== -1;
          var digits = input.value.replace(/[^0-9]/g, "");
          var num = digits === "" ? null : Number(digits) * (negative ? -1 : 1);
          round.scores[pIdx] = num;
          input.value = num === null ? (negative ? "-" : "") : String(num);
          signBtn.classList.toggle("active", negative);
          saveState();
          renderTotals();
          renderDoubledStyles();
          renderWinnerBanner();
        });
        stack.appendChild(input);

        var controls = document.createElement("div");
        controls.className = "cell-controls";

        var signBtn = document.createElement("button");
        signBtn.type = "button";
        signBtn.className = "sign-btn" + ((round.scores[pIdx] || 0) < 0 ? " active" : "");
        signBtn.setAttribute("aria-label", "Toggle negative for " + p.name);
        signBtn.innerHTML = "&plusmn;";
        signBtn.addEventListener("click", function () {
          var negative = input.value.indexOf("-") !== -1;
          var digits = input.value.replace(/[^0-9]/g, "");
          negative = !negative;
          var num = digits === "" ? null : Number(digits) * (negative ? -1 : 1);
          round.scores[pIdx] = num;
          input.value = num === null ? (negative ? "-" : "") : String(num);
          signBtn.classList.toggle("active", negative);
          input.focus();
          saveState();
          renderTotals();
          renderDoubledStyles();
          renderWinnerBanner();
        });
        controls.appendChild(signBtn);

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

    var totals = computeTotals();
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
    var totals = computeTotals();
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
    updatePlayerCountUI();
    renderNameInputs();

    var saved = loadState();
    if (saved && saved.players && saved.players.length) {
      state = saved;
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
