'use strict';

const BOARD_SIZE = 4;
let board = [];
let score = 0;
let bestScore = parseInt(localStorage.getItem('2048-best') || '0', 10);
let gameOver = false;
let won = false;
let keepPlaying = false;

const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const tilesContainer = document.getElementById('tilesContainer');
const messageEl = document.getElementById('message');
const messageTextEl = document.getElementById('messageText');
const newGameBtn = document.getElementById('newGameBtn');
const tryAgainBtn = document.getElementById('tryAgainBtn');

/* ─── Board helpers ─────────────────────────────────── */

function emptyBoard() {
  return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(0));
}

function emptyTiles() {
  const cells = [];
  for (let r = 0; r < BOARD_SIZE; r++)
    for (let c = 0; c < BOARD_SIZE; c++)
      if (board[r][c] === 0) cells.push([r, c]);
  return cells;
}

function addRandomTile() {
  const cells = emptyTiles();
  if (!cells.length) return;
  const [r, c] = cells[Math.floor(Math.random() * cells.length)];
  board[r][c] = Math.random() < 0.9 ? 2 : 4;
  spawnTile(r, c, board[r][c], true);
}

/* ─── Rendering ─────────────────────────────────────── */

function renderAll() {
  tilesContainer.innerHTML = '';
  for (let r = 0; r < BOARD_SIZE; r++)
    for (let c = 0; c < BOARD_SIZE; c++)
      if (board[r][c]) spawnTile(r, c, board[r][c], false);
}

function spawnTile(row, col, value, animate) {
  const tile = document.createElement('div');
  tile.className = 'tile' + (animate ? '' : '');
  tile.dataset.value = value;
  tile.style.setProperty('--row', row + 1);
  tile.style.setProperty('--col', col + 1);
  tile.textContent = value;
  if (animate) tile.style.animation = 'tile-appear 0.12s ease';
  tilesContainer.appendChild(tile);
}

function updateScoreDisplay(delta) {
  scoreEl.textContent = score;
  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem('2048-best', bestScore);
  }
  bestEl.textContent = bestScore;

  if (delta > 0) showScoreDelta(delta);
}

function showScoreDelta(delta) {
  const el = document.createElement('div');
  el.className = 'score-delta';
  el.textContent = '+' + delta;
  const rect = scoreEl.getBoundingClientRect();
  const containerRect = document.querySelector('.container').getBoundingClientRect();
  el.style.left = (rect.left - containerRect.left + rect.width / 2 - 20) + 'px';
  el.style.top = (rect.top - containerRect.top - 10) + 'px';
  document.querySelector('.container').appendChild(el);
  el.addEventListener('animationend', () => el.remove());
}

/* ─── Move logic ────────────────────────────────────── */

// Slides and merges a single row/column array to the left
function slideLine(line) {
  // Remove zeros
  let arr = line.filter(v => v !== 0);
  let merged = 0;
  // Merge adjacent equal
  for (let i = 0; i < arr.length - 1; i++) {
    if (arr[i] === arr[i + 1]) {
      arr[i] *= 2;
      merged += arr[i];
      arr.splice(i + 1, 1);
    }
  }
  // Pad with zeros
  while (arr.length < BOARD_SIZE) arr.push(0);
  return { arr, merged };
}

function transpose(b) {
  return b[0].map((_, c) => b.map(row => row[c]));
}

function reverseRows(b) {
  return b.map(row => [...row].reverse());
}

function move(direction) {
  if (gameOver) return false;

  let rotated = board.map(r => [...r]);
  // Transform board so we always slide "left"
  if (direction === 'right') rotated = reverseRows(rotated);
  if (direction === 'up')    rotated = transpose(rotated);
  if (direction === 'down')  rotated = reverseRows(transpose(rotated));

  let changed = false;
  let totalMerged = 0;

  const newBoard = rotated.map(row => {
    const before = row.join(',');
    const { arr, merged } = slideLine(row);
    if (arr.join(',') !== before) changed = true;
    totalMerged += merged;
    return arr;
  });

  if (!changed) return false;

  // Reverse transform
  let result = newBoard;
  if (direction === 'right') result = reverseRows(result);
  if (direction === 'up')    result = transpose(result);
  if (direction === 'down')  result = transpose(reverseRows(result));

  board = result;
  score += totalMerged;
  updateScoreDisplay(totalMerged);
  renderAll();
  addRandomTile();
  checkState();
  return true;
}

/* ─── Win / lose detection ──────────────────────────── */

function hasWon() {
  return board.some(row => row.some(v => v === 2048));
}

function hasMovesLeft() {
  if (emptyTiles().length) return true;
  for (let r = 0; r < BOARD_SIZE; r++)
    for (let c = 0; c < BOARD_SIZE; c++) {
      const v = board[r][c];
      if (c + 1 < BOARD_SIZE && board[r][c + 1] === v) return true;
      if (r + 1 < BOARD_SIZE && board[r + 1][c] === v) return true;
    }
  return false;
}

function checkState() {
  if (!won && hasWon() && !keepPlaying) {
    won = true;
    showMessage('Ты выиграл!');
    return;
  }
  if (!hasMovesLeft()) {
    gameOver = true;
    showMessage('Игра окончена!');
  }
}

function showMessage(text) {
  messageTextEl.textContent = text;
  messageEl.style.display = 'flex';
}

function hideMessage() {
  messageEl.style.display = 'none';
}

/* ─── New game ──────────────────────────────────────── */

function newGame() {
  board = emptyBoard();
  score = 0;
  gameOver = false;
  won = false;
  keepPlaying = false;
  tilesContainer.innerHTML = '';
  updateScoreDisplay(0);
  hideMessage();
  addRandomTile();
  addRandomTile();
}

/* ─── Input handlers ────────────────────────────────── */

document.addEventListener('keydown', e => {
  const map = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };
  if (map[e.key]) {
    e.preventDefault();
    move(map[e.key]);
  }
});

// Touch / swipe
let touchStartX = 0;
let touchStartY = 0;

document.addEventListener('touchstart', e => {
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
}, { passive: true });

document.addEventListener('touchend', e => {
  const dx = e.changedTouches[0].clientX - touchStartX;
  const dy = e.changedTouches[0].clientY - touchStartY;
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);
  if (Math.max(absDx, absDy) < 20) return; // too small
  if (absDx > absDy) {
    move(dx > 0 ? 'right' : 'left');
  } else {
    move(dy > 0 ? 'down' : 'up');
  }
}, { passive: true });

/* "Keep playing" after win */
tryAgainBtn.addEventListener('click', () => {
  if (won && !gameOver) {
    keepPlaying = true;
    hideMessage();
  } else {
    newGame();
  }
});

newGameBtn.addEventListener('click', newGame);

/* ─── Init ──────────────────────────────────────────── */
bestEl.textContent = bestScore;
newGame();
