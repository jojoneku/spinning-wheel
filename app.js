// Spinning Wheel Winner Picker — plain vanilla JS, no dependencies.

// --- Data: auto-populated dummy names (8 slots) ---
const NAMES = [
  'Alice', 'Bob', 'Carla', 'David',
  'Elena', 'Frank', 'Grace', 'Hiro'
];
const SLOT_COUNT = NAMES.length;
const SLICE = (2 * Math.PI) / SLOT_COUNT;

// Alternating slot colors (two-color scheme).
const COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f',
                '#9b59b6', '#e67e22', '#1abc9c', '#34495e'];

// --- Canvas setup ---
const canvas = document.getElementById('wheel');
const ctx = canvas.getContext('2d');
const CX = canvas.width / 2;
const CY = canvas.height / 2;
const R = Math.min(CX, CY) - 6;

// The fixed arrow sits at the top of the wheel.
// In canvas coords (x right, y down), straight up is angle 1.5*PI.
const TOP_ANGLE = 1.5 * Math.PI;

let currentRotation = 0;   // radians
let spinning = false;

// --- Drawing ---
function drawWheel(rotation) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < SLOT_COUNT; i++) {
    const start = rotation + i * SLICE;
    const end = start + SLICE;

    // Wedge
    ctx.beginPath();
    ctx.moveTo(CX, CY);
    ctx.arc(CX, CY, R, start, end);
    ctx.closePath();
    ctx.fillStyle = COLORS[i % COLORS.length];
    ctx.fill();

    // Label, rotated to the slice mid-angle
    ctx.save();
    ctx.translate(CX, CY);
    ctx.rotate(start + SLICE / 2);
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.font = '16px system-ui, Arial, sans-serif';
    ctx.fillText(NAMES[i], R - 12, 0);
    ctx.restore();
  }

  // Center hub
  ctx.beginPath();
  ctx.arc(CX, CY, 28, 0, 2 * Math.PI);
  ctx.fillStyle = '#fff';
  ctx.fill();
  ctx.strokeStyle = '#ccc';
  ctx.stroke();
}

// --- Winner detection ---
// Map the fixed top arrow back through the wheel's rotation to a slot index.
function getWinnerIndex(rotation) {
  const twoPi = 2 * Math.PI;
  const norm = (((TOP_ANGLE - rotation) % twoPi) + twoPi) % twoPi;
  return Math.floor(norm / SLICE) % SLOT_COUNT;
}

// --- Spin animation ---
const DURATION = 4000; // ms

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function spin() {
  if (spinning) return;
  spinning = true;
  spinBtn.disabled = true;
  result.textContent = 'Spinning…';

  const startRotation = currentRotation;
  const extraTurns = 5 + Math.floor(Math.random() * 4); // 5–8 full turns
  const finalOffset = Math.random() * 2 * Math.PI;
  const target = startRotation + extraTurns * 2 * Math.PI + finalOffset;

  const startTime = performance.now();

  function frame(now) {
    const elapsed = now - startTime;
    const t = Math.min(elapsed / DURATION, 1);
    const eased = easeOutCubic(t);

    currentRotation = startRotation + (target - startRotation) * eased;
    drawWheel(currentRotation);

    if (t < 1) {
      requestAnimationFrame(frame);
    } else {
      currentRotation = target;
      drawWheel(currentRotation);
      const winner = NAMES[getWinnerIndex(currentRotation)];
      result.textContent = `Winner: ${winner} 🎉`;
      spinning = false;
      spinBtn.disabled = false;
    }
  }

  requestAnimationFrame(frame);
}

// --- Wire up ---
const spinBtn = document.getElementById('spinBtn');
const result = document.getElementById('result');
spinBtn.addEventListener('click', spin);

// Initial static wheel
drawWheel(currentRotation);
