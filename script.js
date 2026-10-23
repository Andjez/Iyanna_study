
/* =========================================
   MATH ADVENTURE — TAB-BASED GAME ENGINE
   ========================================= */

const STORAGE_KEY = "mathAdventureTabsV1";
const QUESTIONS_PER_ROUND = 5;

const $ = (selector) => document.querySelector(selector);

const games = [
  {
    id: "math",
    title: "Number Ninja",
    icon: "🍎",
    description: "Count, add and subtract!",
    color: "math"
  },
  {
    id: "nature",
    title: "Nature Explorer",
    icon: "🌳",
    description: "Animals, plants and our world!",
    color: "nature"
  },
  {
    id: "english",
    title: "Word Wizard",
    icon: "🔤",
    description: "Letters and beginning sounds!",
    color: "english"
  },
  {
    id: "puzzle",
    title: "Puzzle Planet",
    icon: "🧩",
    description: "Patterns, shapes and logic!",
    color: "puzzle"
  }
];

const levelNames = ["Little Star", "Explorer", "Super Thinker", "Brain Hero"];
const levelIcons = ["🌱", "🌈", "🚀", "👑"];

function freshData() {
  return {
    stars: 0,
    attempted: 0,
    correct: 0,
    streak: 0,
    lastPlayed: "",
    rounds: 0,
    latest: "",
    levels: {},
    games: {}
  };
}

function loadData() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return saved && typeof saved === "object"
      ? { ...freshData(), ...saved, levels: saved.levels || {}, games: saved.games || {} }
      : freshData();
  } catch {
    return freshData();
  }
}

let data = loadData();
let activeGame = null;
let activeLevel = 1;
let currentQuestion = null;
let questionIndex = 0;
let locked = false;
let counted = false;
let correctInRound = 0;
let roundHadAttempt = false;
let questionPool = [];

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // The game still works if browser storage is unavailable.
  }
}

function shuffle(array) {
  return [...array].sort(() => Math.random() - 0.5);
}

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function answer(label, value, icon = "✨") {
  return { label: String(label), value: String(value), icon };
}

function getGameStats(id) {
  if (!data.games[id]) {
    data.games[id] = { attempted: 0, correct: 0, rounds: 0 };
  }
  return data.games[id];
}

function levelKey(gameId, level) {
  return `${gameId}-${level}`;
}

function getLevelStats(gameId, level) {
  const key = levelKey(gameId, level);
  if (!data.levels[key]) {
    data.levels[key] = { rounds: 0, best: 0 };
  }
  return data.levels[key];
}

/* ---------- QUESTION BANKS ---------- */

function mathQuestion() {
  const max = [10, 20, 50, 100][activeLevel - 1];
  let a, b, result, operator;

  if (Math.random() < 0.35) {
    a = rand(2, max);
    b = rand(1, a);
    result = a - b;
    operator = "−";
  } else {
    a = rand(1, Math.max(2, Math.floor(max / 2)));
    b = rand(1, Math.max(2, max - a));
    result = a + b;
    operator = "+";
  }

  const values = new Set([result]);

  while (values.size < 3) {
    const candidate = result + rand(-3, 3);
    if (candidate >= 0) values.add(candidate);
  }

  return {
    prompt: `${a} ${operator} ${b} = ?`,
    picture: "🍎 🍎 🍎",
    hint: operator === "+"
      ? `Count ${a} apples, then count ${b} more.`
      : `Start with ${a}. Take away ${b}.`,
    answer: String(result),
    options: shuffle([...values]).map(n => answer(n, n, "🔢"))
  };
}

const natureBank = [
  {
    prompt: "Where does a fish live?",
    picture: "🐟",
    hint: "Think of a place filled with water.",
    answer: "water",
    options: [answer("Water", "water", "🌊"), answer("Trees", "trees", "🌳"), answer("Desert", "desert", "🏜️")]
  },
  {
    prompt: "Which one is a plant?",
    picture: "🌻",
    hint: "Plants grow roots, stems and leaves.",
    answer: "flower",
    options: [answer("Flower", "flower", "🌻"), answer("Car", "car", "🚗"), answer("Ball", "ball", "⚽")]
  },
  {
    prompt: "Which animal gives us milk?",
    picture: "🥛",
    hint: "Think of a farm animal.",
    answer: "cow",
    options: [answer("Cow", "cow", "🐄"), answer("Lion", "lion", "🦁"), answer("Fish", "fish", "🐟")]
  },
  {
    prompt: "What helps us clean our teeth?",
    picture: "🦷",
    hint: "We use it every morning and night.",
    answer: "brush",
    options: [answer("Toothbrush", "brush", "🪥"), answer("Umbrella", "umbrella", "☂️"), answer("Spoon", "spoon", "🥄")]
  },
  {
    prompt: "What gives us light during the day?",
    picture: "☀️",
    hint: "Look up at the daytime sky.",
    answer: "sun",
    options: [answer("Sun", "sun", "☀️"), answer("Book", "book", "📘"), answer("Shoe", "shoe", "👟")]
  },
  {
    prompt: "Which animal lives in a kennel?",
    picture: "🐶",
    hint: "Think of a pet that barks.",
    answer: "dog",
    options: [answer("Dog", "dog", "🐶"), answer("Fish", "fish", "🐟"), answer("Butterfly", "butterfly", "🦋")]
  },
  {
    prompt: "What do plants need to grow?",
    picture: "🌱",
    hint: "Think of rain and sunshine.",
    answer: "water",
    options: [answer("Water", "water", "💧"), answer("Plastic", "plastic", "🛍️"), answer("Shoes", "shoes", "👟")]
  }
];

const englishBank = [
  ["APPLE", "A", "🍎"],
  ["BALL", "B", "⚽"],
  ["CAT", "C", "🐱"],
  ["DOG", "D", "🐶"],
  ["SUN", "S", "☀️"],
  ["FISH", "F", "🐟"],
  ["MOON", "M", "🌙"],
  ["PIG", "P", "🐷"]
].map(([word, letter, icon]) => ({
  prompt: `Which letter starts ${word}?`,
  picture: icon,
  hint: `Say ${word.toLowerCase()} slowly. Listen to its first sound!`,
  answer: letter,
  options: shuffle([
    answer(letter, letter, "🔤"),
    ...shuffle(["A", "B", "C", "D", "F", "M", "P", "S", "T"].filter(x => x !== letter))
      .slice(0, 2).map(x => answer(x, x, "🔠"))
  ])
}));

const puzzleBank = [
  {
    prompt: "What comes next?",
    picture: "🔴 🔵 🔴 🔵 ❓",
    hint: "Red, blue, red, blue…",
    answer: "red",
    options: [answer("Red", "red", "🔴"), answer("Blue", "blue", "🔵"), answer("Green", "green", "🟢")]
  },
  {
    prompt: "Which shape has 3 sides?",
    picture: "🔺",
    hint: "Count the straight sides.",
    answer: "triangle",
    options: [answer("Triangle", "triangle", "🔺"), answer("Circle", "circle", "⭕"), answer("Square", "square", "🟦")]
  },
  {
    prompt: "Find the odd one out!",
    picture: "🐶 🐱 🐰 🚗",
    hint: "Which picture is not an animal?",
    answer: "car",
    options: [answer("Dog", "dog", "🐶"), answer("Rabbit", "rabbit", "🐰"), answer("Car", "car", "🚗")]
  },
  {
    prompt: "Which is the biggest?",
    picture: "🐜 🐈 🐘",
    hint: "Compare the sizes of these animals.",
    answer: "elephant",
    options: [answer("Ant", "ant", "🐜"), answer("Cat", "cat", "🐈"), answer("Elephant", "elephant", "🐘")]
  },
  {
    prompt: "What comes next?",
    picture: "⭐ ⭐ 🌙 ⭐ ⭐ ❓",
    hint: "Look for the repeating group.",
    answer: "moon",
    options: [answer("Moon", "moon", "🌙"), answer("Star", "star", "⭐"), answer("Sun", "sun", "☀️")]
  },
  {
    prompt: "Which shape is round?",
    picture: "⭕ 🔺 🟦",
    hint: "It has no corners.",
    answer: "circle",
    options: [answer("Circle", "circle", "⭕"), answer("Triangle", "triangle", "🔺"), answer("Square", "square", "🟦")]
  }
];

function createQuestion() {
  if (activeGame.id === "math") return mathQuestion();

  const bank = activeGame.id === "nature"
    ? natureBank
    : activeGame.id === "english"
      ? englishBank
      : puzzleBank;

  const item = bank[(questionIndex + activeLevel - 1) % bank.length];

  return {
    ...item,
    options: shuffle(item.options.map(option => ({ ...option })))
  };
}

/* ---------- TABS ---------- */

function showTab(tabId) {
  document.querySelectorAll(".tab-button").forEach(button => {
    const selected = button.dataset.tab === tabId;
    button.classList.toggle("active", selected);
    button.setAttribute("aria-pressed", String(selected));
  });

  document.querySelectorAll(".tab-panel").forEach(panel => {
    const selected = panel.id === tabId;
    panel.hidden = !selected;
    panel.classList.toggle("active", selected);
  });

  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.querySelectorAll(".tab-button").forEach(button => {
  button.addEventListener("click", () => showTab(button.dataset.tab));
});

$("#continue-playing").addEventListener("click", () => {
  showTab("play-panel");
  showGamePicker();
});

/* ---------- GAME AND LEVEL PICKERS ---------- */

function renderGamePicker() {
  const grid = $("#game-grid");
  grid.innerHTML = "";

  games.forEach(game => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `game-card game-${game.color}`;
    button.innerHTML = `
      <span class="game-icon" aria-hidden="true">${game.icon}</span>
      <span class="game-name"></span>
      <span class="game-description"></span>
      <span class="game-score"></span>
    `;

    button.querySelector(".game-name").textContent = game.title;
    button.querySelector(".game-description").textContent = game.description;

    const stats = getGameStats(game.id);
    button.querySelector(".game-score").textContent =
      `${stats.correct} ⭐ · ${stats.rounds} rounds`;

    button.addEventListener("click", () => chooseGame(game.id));
    grid.appendChild(button);
  });
}

function showGamePicker() {
  $("#game-picker").hidden = false;
  $("#level-picker").hidden = true;
  $("#challenge-panel").hidden = true;
  $("#round-finish").hidden = true;
  renderGamePicker();
}

function chooseGame(id) {
  activeGame = games.find(game => game.id === id);
  if (!activeGame) return;

  $("#game-picker").hidden = true;
  $("#level-picker").hidden = false;
  $("#challenge-panel").hidden = true;
  $("#round-finish").hidden = true;

  $("#level-heading").textContent = `${activeGame.icon} ${activeGame.title}`;
  $("#level-description").textContent = "Choose any level you want to play.";

  const grid = $("#level-grid");
  grid.innerHTML = "";

  levelNames.forEach((name, index) => {
    const level = index + 1;
    const stats = getLevelStats(activeGame.id, level);
    const button = document.createElement("button");

    button.type = "button";
    button.className = `level-card${stats.rounds ? " completed" : ""}`;
    button.innerHTML = `
      <span class="level-emoji">${levelIcons[index]}</span>
      <strong>Level ${level}</strong>
      <span class="level-name"></span>
      <small class="level-detail"></small>
    `;

    button.querySelector(".level-name").textContent = name;
    button.querySelector(".level-detail").textContent = stats.rounds
      ? `🏆 ${stats.rounds} completed`
      : ["Easy", "Getting harder", "Tricky", "Big challenge"][index];

    button.addEventListener("click", () => startRound(level));
    grid.appendChild(button);
  });

  window.scrollTo({ top: 0, behavior: "smooth" });
}

$("#back-to-games").addEventListener("click", showGamePicker);
$("#back-to-levels").addEventListener("click", () => chooseGame(activeGame.id));

/* ---------- CHALLENGE FLOW ---------- */

function startRound(level) {
  activeLevel = level;
  questionIndex = 0;
  correctInRound = 0;
  roundHadAttempt = false;

  $("#level-picker").hidden = true;
  $("#round-finish").hidden = true;
  $("#challenge-panel").hidden = false;

  showQuestion();
  $("#challenge-panel").scrollIntoView({ behavior: "smooth", block: "start" });
}

function showQuestion() {
  locked = false;
  counted = false;
  currentQuestion = createQuestion();

  $("#challenge-level").textContent =
    `LEVEL ${activeLevel} · ${levelNames[activeLevel - 1].toUpperCase()}`;
  $("#active-game-title").textContent = `${activeGame.icon} ${activeGame.title}`;
  $("#active-question").textContent = currentQuestion.prompt;
  $("#question-picture").textContent = currentQuestion.picture || activeGame.icon;
  $("#question-hint").textContent = currentQuestion.hint;
  $("#round-count").textContent =
    `Question ${questionIndex + 1} of ${QUESTIONS_PER_ROUND}`;

  $("#question-progress").style.width =
    `${questionIndex / QUESTIONS_PER_ROUND * 100}%`;

  $("#answer-feedback").hidden = true;
  $("#next-question").hidden = true;

  const grid = $("#answer-options");
  grid.innerHTML = "";

  currentQuestion.options.forEach(option => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "answer-card";
    button.innerHTML = `
      <span class="answer-icon" aria-hidden="true"></span>
      <span class="answer-label"></span>
    `;

    button.querySelector(".answer-icon").textContent = option.icon;
    button.querySelector(".answer-label").textContent = option.label;
    button.addEventListener("click", () => checkAnswer(option.value, button));
    grid.appendChild(button);
  });
}

function checkAnswer(value, button) {
  if (locked || button.disabled) return;

  if (!counted) {
    counted = true;
    roundHadAttempt = true;
    data.attempted++;
    getGameStats(activeGame.id).attempted++;
  }

  const correct = String(value) === String(currentQuestion.answer);

  if (!correct) {
    button.classList.add("answer-wrong");
    button.disabled = true;
    showFeedback(false);
    save();
    renderAll();
    return;
  }

  locked = true;
  correctInRound++;
  data.correct++;
  data.stars++;

  getGameStats(activeGame.id).correct++;

  const today = localDateKey();

  if (data.lastPlayed !== today) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    data.streak = data.lastPlayed === localDateKey(yesterday)
      ? data.streak + 1
      : 1;
    data.lastPlayed = today;
  }

  button.classList.add("answer-correct");

  $("#answer-options").querySelectorAll("button").forEach(item => {
    item.disabled = true;
  });

  showFeedback(true);
  $("#question-progress").style.width =
    `${(questionIndex + 1) / QUESTIONS_PER_ROUND * 100}%`;

  $("#next-question").hidden = false;
  $("#next-question").textContent =
    questionIndex === QUESTIONS_PER_ROUND - 1
      ? "Finish adventure 🏆"
      : "Next question ➜";

  save();
  renderAll();

  // Keep the feedback visible, without navigating to an anchor.
  $("#answer-feedback").scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function showFeedback(correct) {
  const panel = $("#answer-feedback");
  panel.hidden = false;
  panel.className = `answer-feedback ${correct ? "feedback-correct" : "feedback-try"}`;

  panel.innerHTML = correct
    ? `<span class="feedback-symbol" aria-hidden="true">✓</span>
       <span class="feedback-face" aria-hidden="true">🥳</span>
       <strong>Wonderful! Correct!</strong>
       <span class="feedback-stars">⭐ +1 STAR ⭐</span>`
    : `<span class="feedback-symbol" aria-hidden="true">↻</span>
       <span class="feedback-face" aria-hidden="true">🤗</span>
       <strong>Almost! Try another answer.</strong>
       <span>💡 ${currentQuestion.hint}</span>`;
}

$("#next-question").addEventListener("click", () => {
  if (questionIndex < QUESTIONS_PER_ROUND - 1) {
    questionIndex++;
    showQuestion();
  } else {
    finishRound();
  }
});

function finishRound() {
  const stats = getGameStats(activeGame.id);
  const levelStats = getLevelStats(activeGame.id, activeLevel);

  stats.rounds++;
  levelStats.rounds++;
  levelStats.best = Math.max(levelStats.best, correctInRound);

  data.rounds++;
  data.stars += 3;
  data.latest = `${activeGame.title} · Level ${activeLevel}`;

  $("#challenge-panel").hidden = true;
  $("#round-finish").hidden = false;
  $("#finish-score").textContent =
    `You got ${correctInRound} out of ${QUESTIONS_PER_ROUND} questions right!`;
  $("#finish-bonus").textContent = "You earned 3 bonus stars! ⭐⭐⭐";

  save();
  renderAll();

  $("#round-finish").scrollIntoView({ behavior: "smooth", block: "start" });
}

$("#play-again").addEventListener("click", () => startRound(activeLevel));

$("#finish-levels").addEventListener("click", () => {
  showTab("play-panel");
  chooseGame(activeGame.id);
});

/* ---------- DASHBOARD ---------- */

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function renderHome() {
  $("#home-stars").textContent = data.stars;
  $("#home-correct").textContent = data.correct;
  $("#home-streak").textContent = data.streak;
  $("#home-rounds").textContent = data.rounds;
  $("#home-latest").textContent =
    data.latest || "Your first adventure is waiting!";
}

function renderProgress() {
  $("#progress-stars").textContent = data.stars;
  $("#progress-attempted").textContent = data.attempted;
  $("#progress-rounds").textContent = data.rounds;

  const accuracy = data.attempted
    ? Math.round(data.correct / data.attempted * 100)
    : 0;

  $("#progress-accuracy").textContent = `${accuracy}%`;

  const badges = [
    ["⭐ First Star", data.correct >= 1],
    ["🍎 Adventure Finisher", data.rounds >= 1],
    ["🧠 Clever Thinker", data.correct >= 10],
    ["🏆 Learning Champion", data.correct >= 50]
  ];

  const badgeList = $("#badge-list");
  badgeList.innerHTML = "";

  badges.forEach(([label, earned]) => {
    const item = document.createElement("div");
    item.className = `badge-item${earned ? " earned" : ""}`;
    item.innerHTML = `<strong></strong><span></span>`;
    item.querySelector("strong").textContent = label;
    item.querySelector("span").textContent =
      earned ? "Unlocked! 🎉" : "Keep practising to unlock this badge.";
    badgeList.appendChild(item);
  });

  $("#grownup-summary").textContent = data.attempted === 0
    ? "Start playing to see learning progress here."
    : `${data.correct} correct out of ${data.attempted} questions tried (${accuracy}% accuracy). ${data.rounds} rounds completed.`;

  const list = $("#game-progress-list");
  list.innerHTML = "";

  games.forEach(game => {
    const stats = getGameStats(game.id);
    const item = document.createElement("div");
    item.className = "game-progress-item";
    item.innerHTML = `<strong></strong><span></span>`;
    item.querySelector("strong").textContent = `${game.icon} ${game.title}`;
    item.querySelector("span").textContent =
      `${stats.correct} correct · ${stats.attempted} questions tried · ${stats.rounds} rounds completed`;
    list.appendChild(item);
  });
}

function renderAll() {
  renderHome();
  renderProgress();
  renderGamePicker();
}

renderAll();
