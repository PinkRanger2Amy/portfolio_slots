// Portfolio Slots - simple, stable, GitHub Pages friendly

const pointsEl = document.getElementById("points");
const sectionsEl = document.getElementById("sections");
const barFill = document.getElementById("barFill");

const spinBtn = document.getElementById("spinBtn");
const resetBtn = document.getElementById("resetBtn");
const soundBtn = document.getElementById("soundBtn");
const soundLabel = document.getElementById("soundLabel");
const vol = document.getElementById("vol");

const tabs = Array.from(document.querySelectorAll(".tab"));
const panels = Array.from(document.querySelectorAll(".panel"));
const cells = Array.from(document.querySelectorAll(".cell"));

const SECTION_ORDER = ["about", "projects", "skills", "contact"];
const SECTION_POINTS = { about: 25, projects: 35, skills: 30, contact: 20 };

let state = {
  points: 0,
  unlocked: new Set(["about"]),   // about visible by default
  visited: new Set(["about"]),
  soundOn: true,
  volume: 0.6
};

function clamp(n, min, max){ return Math.max(min, Math.min(max, n)); }

function updateUI(){
  pointsEl.textContent = state.points.toString();
  sectionsEl.textContent = state.unlocked.size.toString();

  const pct = (state.unlocked.size / SECTION_ORDER.length) * 100;
  barFill.style.width = `${pct}%`;

  // active tab styling (optional - subtle)
  tabs.forEach(btn => {
    const id = btn.dataset.target;
    btn.style.opacity = state.unlocked.has(id) ? "1" : ".55";
  });
}

function showPanel(id){
  panels.forEach(p => p.classList.toggle("hidden", p.id !== id));
}

function awardForVisit(id){
  if (state.visited.has(id)) return;
  state.visited.add(id);
  state.points += SECTION_POINTS[id] ?? 0;
}

function nextLockedSection(){
  for (const id of SECTION_ORDER){
    if (!state.unlocked.has(id)) return id;
  }
  return null;
}

// Simple sound using WebAudio (no external files)
let audioCtx = null;
function beep(freq = 600, ms = 90){
  if (!state.soundOn) return;
  try{
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = "sine";
    o.frequency.value = freq;
    g.gain.value = 0.0001;

    o.connect(g);
    g.connect(audioCtx.destination);

    const now = audioCtx.currentTime;
    const v = clamp(state.volume, 0, 1);

    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.08 * v + 0.0001, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + ms/1000);

    o.start(now);
    o.stop(now + ms/1000 + 0.02);
  } catch(e){
    // ignore audio failures
  }
}

function randomSymbol(){
  const symbols = ["★","◆","●","▲","❤","☾","⚡","❖","♛","✦","☀","✧"];
  return symbols[Math.floor(Math.random()*symbols.length)];
}

function spinAnimation(){
  let ticks = 0;
  const maxTicks = 14;
  const timer = setInterval(() => {
    cells.forEach(c => c.textContent = randomSymbol());
    ticks++;
    if (ticks === 1) beep(520, 70);
    if (ticks === 6) beep(680, 70);
    if (ticks >= maxTicks){
      clearInterval(timer);
    }
  }, 60);
}

function unlockNext(){
  const next = nextLockedSection();
  if (!next){
    beep(880, 120);
    return;
  }
  state.unlocked.add(next);
  beep(780, 120);

  // auto-show newly unlocked section
  showPanel(next);
  awardForVisit(next);
  updateUI();
}

tabs.forEach(btn => {
  btn.addEventListener("click", () => {
    const target = btn.dataset.target;
    if (!state.unlocked.has(target)){
      beep(220, 80);
      return; // locked
    }
    showPanel(target);
    awardForVisit(target);
    beep(620, 70);
    updateUI();
  });
});

spinBtn.addEventListener("click", () => {
  spinAnimation();
  setTimeout(() => unlockNext(), 900);
});

resetBtn.addEventListener("click", () => {
  state.points = 0;
  state.unlocked = new Set(["about"]);
  state.visited = new Set(["about"]);
  showPanel("about");
  beep(300, 120);
  updateUI();
});

soundBtn.addEventListener("click", () => {
  state.soundOn = !state.soundOn;
  soundLabel.textContent = state.soundOn ? "Sound: ON" : "Sound: OFF";
  beep(500, 70);
});

vol.addEventListener("input", () => {
  state.volume = parseInt(vol.value, 10) / 100;
});

(function init(){
  // Ensure only "about" is visible on load
  showPanel("about");
  soundLabel.textContent = state.soundOn ? "Sound: ON" : "Sound: OFF";
  updateUI();
})();


