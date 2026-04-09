'use strict';

const BOARD_SIZE = 4;
let board = [];
let score = 0;
let bestScore = parseInt(localStorage.getItem('2048-best') || '0', 10);
let gameOver = false;
let won = false;
let keepPlaying = false;

// Cheat mode state
let cheatMode = false;
let selectedCell = null; // { r, c } of the first tapped tile

const scoreEl       = document.getElementById('score');
const bestEl        = document.getElementById('best');
const tilesContainer = document.getElementById('tilesContainer');
const messageEl     = document.getElementById('message');
const messageTextEl = document.getElementById('messageText');
const newGameBtn    = document.getElementById('newGameBtn');
const tryAgainBtn   = document.getElementById('tryAgainBtn');
const cheatBtn      = document.getElementById('cheatBtn');

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

function renderAll() {
  tilesContainer.innerHTML = '';
  for (let r = 0; r < BOARD_SIZE; r++)
    for (let c = 0; c < BOARD_SIZE; c++)
      if (board[r][c]) spawnTile(r, c, board[r][c], false);
}

function spawnTile(row, col, value, animate) {
  const tile = document.createElement('div');
  tile.className = 'tile' + (animate ? ' is-new' : '');
  tile.dataset.value = value;
  tile.dataset.row = row;
  tile.dataset.col = col;
  tile.style.setProperty('--row', row + 1);
  tile.style.setProperty('--col', col + 1);
  tile.textContent = value;
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
  el.style.top  = (rect.top - containerRect.top - 10) + 'px';
  document.querySelector('.container').appendChild(el);
  el.addEventListener('animationend', () => el.remove());
}

function slideLine(line) {
  let arr = line.filter(v => v !== 0);
  let merged = 0;
  for (let i = 0; i < arr.length - 1; i++) {
    if (arr[i] === arr[i + 1]) {
      arr[i] *= 2;
      merged += arr[i];
      arr.splice(i + 1, 1);
    }
  }
  while (arr.length < BOARD_SIZE) arr.push(0);
  return { arr, merged };
}

function transpose(b)   { return b[0].map((_, c) => b.map(row => row[c])); }
function reverseRows(b) { return b.map(row => [...row].reverse()); }

function move(direction) {
  if (gameOver || cheatMode) return false;

  let rotated = board.map(r => [...r]);
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

/* ─── Cheat mode ─────────────────────────── */

function toggleCheat() {
  cheatMode = !cheatMode;
  cheatBtn.classList.toggle('active', cheatMode);
  cheatBtn.textContent = cheatMode ? 'Читы ВКЛ' : 'Читы';
  clearSelection();
}

function clearSelection() {
  selectedCell = null;
  document.querySelectorAll('.tile.selected').forEach(t => t.classList.remove('selected'));
}

function tileElAt(r, c) {
  return tilesContainer.querySelector(`.tile[data-row="${r}"][data-col="${c}"]`);
}

function cheatTap(r, c) {
  if (!selectedCell) {
    if (board[r][c] === 0) return;
    selectedCell = { r, c };
    const el = tileElAt(r, c);
    if (el) el.classList.add('selected');
  } else {
    const { r: r1, c: c1 } = selectedCell;
    if (r1 === r && c1 === c) { clearSelection(); return; }
    const tmp = board[r1][c1];
    board[r1][c1] = board[r][c];
    board[r][c] = tmp;
    clearSelection();
    renderAll();
  }
}

function clientToCell(clientX, clientY) {
  const boardEl = document.getElementById('board');
  const rect = boardEl.getBoundingClientRect();
  const padding = 12;
  const innerW = rect.width  - padding * 2;
  const innerH = rect.height - padding * 2;
  const x = clientX - rect.left - padding;
  const y = clientY - rect.top  - padding;
  if (x < 0 || y < 0 || x > innerW || y > innerH) return null;
  const c = Math.floor(x / (innerW / BOARD_SIZE));
  const r = Math.floor(y / (innerH / BOARD_SIZE));
  if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) return null;
  return { r, c };
}

/* ─── New game ───────────────────────────── */

function newGame() {
  board = emptyBoard();
  score = 0;
  gameOver = false;
  won = false;
  keepPlaying = false;
  clearSelection();
  tilesContainer.innerHTML = '';
  updateScoreDisplay(0);
  hideMessage();
  addRandomTile();
  addRandomTile();
}

/* ─── Input ──────────────────────────────── */

document.addEventListener('keydown', e => {
  const map = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };
  if (map[e.key]) { e.preventDefault(); move(map[e.key]); }
});

let touchStartX = 0, touchStartY = 0;

document.addEventListener('touchstart', e => {
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
}, { passive: true });

document.addEventListener('touchend', e => {
  const dx = e.changedTouches[0].clientX - touchStartX;
  const dy = e.changedTouches[0].clientY - touchStartY;
  const dist = Math.max(Math.abs(dx), Math.abs(dy));

  if (cheatMode && dist < 20) {
    const cell = clientToCell(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
    if (cell) cheatTap(cell.r, cell.c);
    return;
  }

  if (dist < 20) return;
  if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 'right' : 'left');
  else move(dy > 0 ? 'down' : 'up');
}, { passive: true });

document.getElementById('board').addEventListener('click', e => {
  if (!cheatMode) return;
  const cell = clientToCell(e.clientX, e.clientY);
  if (cell) cheatTap(cell.r, cell.c);
});

cheatBtn.addEventListener('click', toggleCheat);
tryAgainBtn.addEventListener('click', () => {
  if (won && !gameOver) { keepPlaying = true; hideMessage(); }
  else newGame();
});
newGameBtn.addEventListener('click', newGame);

bestEl.textContent = bestScore;
newGame();
