let points = 0;
let multiplier = 1;
let spinning = false;

const pointsEl = document.getElementById("points");
const visitedCountEl = document.getElementById("visitedCount");
const progressBarEl = document.getElementById("progressBar");
const messageEl = document.getElementById("message");
const multEl = document.getElementById("multiplier");

const spinBtn = document.getElementById("spinBtn");
const claimBtn = document.getElementById("claimBtn");
const resetBtn = document.getElementById("resetBtn");
const soundToggleBtn = document.getElementById("soundToggle");
const volumeEl = document.getElementById("volume");

const symbols = ["⭐","🚀","💎","🍀","⚡","🧠","🛠️","🎧","🌟"];
const cells = Array.from({ length: 9 }, (_, i) => document.getElementById(`c${i}`));

const sectionPoints = { about: 25, projects: 35, skills: 30, contact: 20 };
const visited = new Set();
let explorerBonusClaimed = false;

// ===== SOUND (no external files) =====
let audioEnabled = true;
let audioCtx = null;

function ensureAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}

function beep({ freq = 440, duration = 0.08, type = "sine", gain = 0.15 }) {
  if (!audioEnabled) return;
  ensureAudio();
  const vol = parseFloat(volumeEl.value || "0.6");
  const now = audioCtx.currentTime;

  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(gain * vol, now + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  osc.connect(g);
  g.connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + duration + 0.02);
}

function playClick() { beep({ freq: 520, duration: 0.05, type: "square", gain: 0.12 }); }

function playSpin() {
  [220, 260, 320, 420, 520, 620].forEach((f, i) =>
    setTimeout(() => beep({ freq: f, duration: 0.05, type: "triangle", gain: 0.10 }), i * 35)
  );
}

function playWin(big = false) {
  const freqs = big ? [660, 880, 990, 1320, 1760] : [660, 880, 990];
  freqs.forEach((f, i) =>
    setTimeout(() => beep({ freq: f, duration: 0.10, type: big ? "sawtooth" : "sine", gain: 0.14 }), i * 65)
  );
}

// Need a user gesture once
document.addEventListener("click", () => { try { ensureAudio(); } catch {} }, { once: true });

soundToggleBtn.addEventListener("click", () => {
  audioEnabled = !audioEnabled;
  soundToggleBtn.textContent = audioEnabled ? "🔊 Sound: ON" : "🔇 Sound: OFF";
  soundToggleBtn.setAttribute("aria-pressed", String(audioEnabled));
  if (audioEnabled) playClick();
});

volumeEl.addEventListener("input", () => {
  if (audioEnabled) beep({ freq: 700, duration: 0.05, type: "sine", gain: 0.10 });
});

// ===== CONFETTI =====
const confettiCanvas = document.getElementById("confetti");
const ctx = confettiCanvas.getContext("2d");
let confettiPieces = [];

function resizeConfetti() {
  confettiCanvas.width = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
}
window.addEventListener("resize", resizeConfetti);
resizeConfetti();

function burstConfetti(count = 120) {
  const w = confettiCanvas.width;
  const h = confettiCanvas.height;
  const x = w * 0.5;
  const y = h * 0.25;

  for (let i = 0; i < count; i++) {
    confettiPieces.push({
      x, y,
      vx: (Math.random() - 0.5) * 10,
      vy: Math.random() * -10 - 4,
      g: 0.22 + Math.random() * 0.12,
      r: 3 + Math.random() * 4,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.25,
      life: 120 + Math.random() * 40,
      hue: Math.floor(Math.random() * 360)
    });
  }
}

function tickConfetti() {
  ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);

  confettiPieces = confettiPieces.filter(p => p.life > 0);
  confettiPieces.forEach(p => {
    p.life -= 1;
    p.vy += p.g;
    p.x += p.vx;
    p.y += p.vy;
    p.rot += p.vr;

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.fillStyle = `hsl(${p.hue} 95% 60%)`;
    ctx.fillRect(-p.r, -p.r, p.r * 2, p.r * 1.2);
    ctx.restore();
  });

  requestAnimationFrame(tickConfetti);
}
tickConfetti();

// ===== UI helpers =====
function setMessage(text) { messageEl.textContent = text; }

function updateUI() {
  pointsEl.textContent = points.toLocaleString();
  visitedCountEl.textContent = visited.size.toString();
  progressBarEl.style.width = `${(visited.size / 4) * 100}%`;
  multEl.textContent = `x${multiplier}`;
}

function addPoints(amount, reason) {
  const gained = Math.max(0, Math.floor(amount));
  points += gained;
  updateUI();
  setMessage(`+${gained} points — ${reason}`);
}

function clearWins() { cells.forEach(c => c.classList.remove("win")); }
function randomSymbol() { return symbols[Math.floor(Math.random() * symbols.length)]; }

function countWinningLines(grid) {
  const lines = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6]
  ];

  let winCount = 0;
  for (const [a,b,c] of lines) {
    if (grid[a] === grid[b] && grid[b] === grid[c]) {
      winCount++;
      cells[a].classList.add("win");
      cells[b].classList.add("win");
      cells[c].classList.add("win");
    }
  }
  return winCount;
}

function payoutForWins(winCount) {
  if (winCount >= 3) return { base: 400, msg: `🎉 MEGA WIN! ${winCount} lines matched`, multUp: 2, confetti: 190, bigSound: true };
  if (winCount === 2) return { base: 250, msg: "🔥 Big win! 2 lines matched", multUp: 1, confetti: 130, bigSound: true };
  if (winCount === 1) return { base: 150, msg: "✅ Win! 1 line matched", multUp: 1, confetti: 80, bigSound: false };
  return { base: 25, msg: "🙂 No lines — consolation", multUp: 0, confetti: 0, bigSound: false };
}

// ===== Slot spin =====
function spinGrid() {
  if (spinning) return;
  spinning = true;

  playSpin();
  spinBtn.disabled = true;
  clearWins();

  let ticks = 0;
  const anim = setInterval(() => {
    cells.forEach(cell => (cell.textContent = randomSymbol()));
    ticks++;
    if (ticks >= 16) {
      clearInterval(anim);

      const grid = Array.from({ length: 9 }, () => randomSymbol());
      grid.forEach((sym, i) => (cells[i].textContent = sym));

      const winCount = countWinningLines(grid);
      const pay = payoutForWins(winCount);

      multiplier = Math.min(5, multiplier + pay.multUp);
      const total = pay.base * multiplier;

      addPoints(total, `${pay.msg} (x${multiplier})`);

      if (winCount >= 1) playWin(pay.bigSound);
      if (pay.confetti > 0) burstConfetti(pay.confetti);

      if (visited.size === 4 && !explorerBonusClaimed) {
        setMessage("All sections visited! Claim your Explorer Bonus 🎁");
      }

      spinBtn.disabled = false;
      spinning = false;
    }
  }, 55);
}

spinBtn.addEventListener("click", spinGrid);

// ===== Sections =====
function showSection(sectionId) {
  document.querySelectorAll(".panel").forEach(p => p.classList.add("hidden"));
  document.getElementById(sectionId).classList.remove("hidden");
}

function visitSection(sectionId) {
  showSection(sectionId);
  playClick();

  if (!visited.has(sectionId)) {
    visited.add(sectionId);
    addPoints(sectionPoints[sectionId] || 10, `Visited ${sectionId}`);
  } else {
    setMessage(`You’re already in ${sectionId}. Spin for bonuses 🎰`);
  }

  if (visited.size === 4 && !explorerBonusClaimed) {
    setMessage("All sections visited! Claim your Explorer Bonus 🎁");
  }

  updateUI();
}

document.querySelectorAll("[data-section]").forEach(btn => {
  btn.addEventListener("click", () => visitSection(btn.dataset.section));
});

// ===== Explorer Bonus =====
claimBtn.addEventListener("click", () => {
  playClick();
  if (explorerBonusClaimed) return setMessage("Explorer Bonus already claimed ✅");
  if (visited.size < 4) return setMessage("Visit all 4 sections first to claim the Explorer Bonus.");

  explorerBonusClaimed = true;
  addPoints(400, "Explorer Bonus claimed 🎁");
  playWin(true);
  burstConfetti(210);
});

// ===== Reset =====
resetBtn.addEventListener("click", () => {
  playClick();
  points = 0;
  multiplier = 1;
  visited.clear();
  explorerBonusClaimed = false;

  clearWins();
  ["⭐","🚀","💎","🍀","⚡","🧠","🛠️","🎧","🌟"].forEach((s, i) => (cells[i].textContent = s));

  showSection("about");
  setMessage("Reset complete. Spin 🎰 or explore sections.");
  updateUI();
});

// Init
showSection("about");
updateUI();
setMessage("Welcome! Spin 🎰 or explore sections to earn points ✨");




