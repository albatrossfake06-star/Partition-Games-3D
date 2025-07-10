<<<<<<< HEAD
/* =================================================================  
   Utility  
   ================================================================= */  
  
/* Read the numbers from the input, keep positives, sort DESCENDING */  
function getSortedRows () {  
  const raw = document.getElementById('rows-input').value;  
  
  return raw  
    .trim()                       // remove leading / trailing spaces  
    .split(/\s+/)                 // split on one or more spaces  
    .map(Number)                  // "6" → 6, "5" → 5, …  
    .filter(n => Number.isFinite(n) && n > 0) // keep only positives  
    .sort((a, b) => b - a);       // numeric descending order  
}  
  
/* Produce a random partition such as [8,6,4] (already descending) */  
function randomPartitionDescending () {  
  const rows = Math.floor(Math.random() * 4) + 3;        // 3 – 6 rows  
  const lens = Array.from({ length: rows },  
               () => Math.floor(Math.random() * 6) + 2); // each 2 – 7  
  return lens.sort((a, b) => b - a);  
}  
  
/* =================================================================  
   Game-theoretic helpers  
   ================================================================= */  
function xorAllFragments (state) {  
=======
/* Random partition utility functions */
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomPartition(n) {
  let parts = [];
  let remaining = n;
  let maxPart = n;
  
  while (remaining > 0) {
    let part = randomInt(1, Math.min(remaining, maxPart));
    parts.push(part);
    remaining -= part;
    maxPart = part;
  }
  
  return parts.sort((a, b) => b - a); // Sort descending like other games
}

/* ────────────────────  XOR calculations for perfect AI  ──────────────────── */  
function xorAllFragments(state) {  
>>>>>>> cf9e5b4272ab0ddaa8b5a693776eabb9537091a9
  let x = 0;  
  for (const f of state.fragments) x ^= gRect(f.rows, f.cols);  
  return x;  
}  
  
function isWinningMove (state, fIdx, kind, idx, currentXor) {  
  const frag = state.fragments[fIdx];  
  const h = frag.rows, w = frag.cols;  
  let gAfterFrag;  
  
  if (kind === 'row') {  
    const above = gRect(idx, w);  
    const below = gRect(h - 1 - idx, w);  
    gAfterFrag = above ^ below;  
  } else {                    // column  
    const left  = gRect(h, idx);  
    const right = gRect(h, w - 1 - idx);  
    gAfterFrag = left ^ right;  
  }  
  const xorAfter = (currentXor ^ gRect(h, w)) ^ gAfterFrag;  
  return xorAfter === 0;  
}  
  
/* ───────── Grundy numbers for rectangles ───────── */  
const gMemo = new Map();                  // key: "h,w"  value: Grundy #  
function gRect (h, w) {  
  if (h === 0 || w === 0) return 0;  
  const key = `${h},${w}`;  
  if (gMemo.has(key)) return gMemo.get(key);  
  
  const seen = new Set();  
  
  /* delete any row */  
  for (let r = 0; r < h; r++) {  
    const val = gRect(r, w) ^ gRect(h - 1 - r, w);  
    seen.add(val);  
  }  
  /* delete any column */  
  for (let c = 0; c < w; c++) {  
    const val = gRect(h, c) ^ gRect(h, w - 1 - c);  
    seen.add(val);  
  }  
  let g = 0;  
  while (seen.has(g)) g++;  
  gMemo.set(key, g);  
  return g;  
}  
  
/* =================================================================  
   CRIM  –  Complete Front-End Logic  
   ================================================================= */  
  
class SoundManager {  
  static sounds = {};  
  static init () {  
    this.sounds.hover  = document.getElementById('sound-hover');  
    this.sounds.remove = document.getElementById('sound-remove');  
    this.sounds.win    = document.getElementById('sound-win');  
    this.sounds.click  = document.getElementById('sound-click');  
    this.sounds.hover.volume  = 0.25;  
    this.sounds.remove.volume = 0.45;  
    this.sounds.click.volume  = 0.45;  
  }  
  static play (name) {  
    const s = this.sounds[name];  
    if (!s) return;  
    s.currentTime = 0;  
    s.play().catch(() => {});  
  }  
}  
  
/* ---------- basic game classes ---------- */  
class Player {  
  static RED  = 'Red';  
  static BLUE = 'Blue';  
  static other (p) { return p === Player.RED ? Player.BLUE : Player.RED; }  
}  
  
class Fragment {  
  constructor (grid) {  
    this.grid = grid;  
    this.rows = grid.length;  
    this.cols = this.rows ? grid[0].length : 0;  
  }  
  rowsAlive () {  
    const out = [];  
    for (let r = 0; r < this.rows; r++)  
      if (this.grid[r].some(v => v)) out.push(r);  
    return out;  
  }  
  colsAlive () {  
    const out = [];  
    for (let c = 0; c < this.cols; c++) {  
      for (let r = 0; r < this.rows; r++) {  
        if (this.grid[r][c]) { out.push(c); break; }  
      }  
    }  
    return out;  
  }  
  hasMoves () { return this.rowsAlive().length || this.colsAlive().length; }  
  
  deleteRow (r) { for (let c = 0; c < this.cols; c++) this.grid[r][c] = false; }  
  deleteCol (c) { for (let r = 0; r < this.rows; r++) this.grid[r][c] = false; }  
  
  /* ----- split into connected sub-fragments ----- */  
  _nb (r, c) {  
    const res = [];  
    const dirs = [[1,0],[-1,0],[0,1],[0,-1]];  
    for (const [dR, dC] of dirs) {  
      const nr = r + dR, nc = c + dC;  
      if (0 <= nr && nr < this.rows && 0 <= nc && nc < this.cols && this.grid[nr][nc])  
        res.push([nr, nc]);  
    }  
    return res;  
  }  
  splitIntoFragments () {  
    const visited = new Set(), frags = [];  
    for (let r = 0; r < this.rows; r++) {  
      for (let c = 0; c < this.cols; c++) {  
        if (this.grid[r][c] && !visited.has(`${r},${c}`)) {  
          const q = [[r, c]];  
          visited.add(`${r},${c}`);  
          const cells = [];  
          while (q.length) {  
            const [cr, cc] = q.shift();  
            cells.push([cr, cc]);  
            for (const [nr, nc] of this._nb(cr, cc)) {  
              const id = `${nr},${nc}`;  
              if (!visited.has(id)) { visited.add(id); q.push([nr, nc]); }  
            }  
          }  
          frags.push(Fragment._fromCells(cells));  
        }  
      }  
    }  
    return frags;  
  }  
  static _fromCells (cells) {  
    const minR = Math.min(...cells.map(c => c[0]));  
    const minC = Math.min(...cells.map(c => c[1]));  
    const maxR = Math.max(...cells.map(c => c[0]));  
    const maxC = Math.max(...cells.map(c => c[1]));  
    const h = maxR - minR + 1, w = maxC - minC + 1;  
    const g = Array.from({ length: h }, () => Array(w).fill(false));  
    for (const [r, c] of cells) g[r - minR][c - minC] = true;  
    return new Fragment(g);  
  }  
  static fromRowSizes (sizes) {  
    const rows = sizes.length;  
    const cols = Math.max(...sizes);  
    const g = Array.from({ length: rows }, () => Array(cols).fill(false));  
    sizes.forEach((len, r) => { for (let c = 0; c < len; c++) g[r][c] = true; });  
    return new Fragment(g);  
  }  
}  
  
class GameState {  
  constructor (rowSizes) {  
    this.fragments = [ Fragment.fromRowSizes(rowSizes) ];  
    this.player    = Player.RED;  
  }  
  hasMoves () { return this.fragments.some(f => f.hasMoves()); }  
  performMove (fIdx, kind, idx) {  
    const f = this.fragments[fIdx];  
    if (kind === 'row') f.deleteRow(idx);  
    else                f.deleteCol(idx);  
  
    const newFrags = f.splitIntoFragments();  
    this.fragments.splice(fIdx, 1, ...newFrags);  
    this.player = Player.other(this.player);  
  }  
}  
  
/* ---------- GUI ---------- */  
class CRIM_GUI {  
  constructor () {  
    /* constants */  
    this.CELL  = 40;  
    this.GAP   = 30;  
    this.LABEL = 20;  
  
    /* runtime flags */  
    this.cpuSide = 'None';  
    this.vsCPU   = false;  
  
    /* DOM handles */  
    this.boardArea       = document.getElementById('board-area');  
    this.statusLabel     = document.getElementById('status-label');  
    this.setupBackdrop   = document.getElementById('setup-modal-backdrop');  
    this.gameOverBackdrop = document.getElementById('game-over-modal-backdrop');  
    this.gameOverMsg     = document.getElementById('game-over-message');  
    this.rowsInput       = document.getElementById('rows-input');  
  
    /* buttons */  
    document.getElementById('start-game-btn')  
      .addEventListener('click', () => { SoundManager.play('click'); this.startFromInput(); });  
    document.getElementById('new-game-btn')  
      .addEventListener('click', () => { SoundManager.play('click'); this.showSetup(); });  
    document.getElementById('play-again-btn')  
<<<<<<< HEAD
      .addEventListener('click', () => { SoundManager.play('click'); this.showSetup(); });  
=======
        .addEventListener('click',()=>{SoundManager.play('click');this.showSetup();});
    
    /* random partition buttons */
    document.getElementById('randomize-btn-general')
        .addEventListener('click', () => {
          SoundManager.play('click');
          const n = randomInt(15, 40);
          const partition = randomPartition(n);
          this.rowsInput.value = partition.join(' ');
        });
    
    document.getElementById('randomize-btn-specific')
        .addEventListener('click', () => {
          SoundManager.play('click');
          const specificInput = document.getElementById('specific-number-input');
          const n = parseInt(specificInput.value, 10);
          if (isNaN(n) || n <= 0 || n > 200) {
            alert("Please enter a positive number less than or equal to 200.");
            return;
          }
          const partition = randomPartition(n);
          this.rowsInput.value = partition.join(' ');
        });  
>>>>>>> cf9e5b4272ab0ddaa8b5a693776eabb9537091a9
  
    /* theme switch */  
    const themeTgl = document.getElementById('theme-toggle');  
    const savedTheme = localStorage.getItem('theme') || 'light';  
    document.documentElement.setAttribute('data-theme', savedTheme);  
    themeTgl.checked = savedTheme === 'dark';  
    themeTgl.addEventListener('change', () => {  
      const nt = themeTgl.checked ? 'dark' : 'light';  
      document.documentElement.setAttribute('data-theme', nt);  
      localStorage.setItem('theme', nt);  
    });  
  
    /* help popover */  
    const helpBtn = document.getElementById('help-btn');  
    const helpPop = document.getElementById('help-popover');  
    helpBtn.addEventListener('mouseenter', () => helpPop.classList.add('visible'));  
    helpBtn.addEventListener('mouseleave', () => helpPop.classList.remove('visible'));  
  
    /* sounds */  
    SoundManager.init();  
  
    /* game state */  
    this.state       = null;  
    this.idCounter   = 0;           // incremental id for label elements  
    this.idToAddress = new Map();   // element-id → {frag, kind, index}  
    this.showSetup();  
  }  
  
  /* ----- modal handling ----- */  
  showSetup () {  
    this.gameOverBackdrop.classList.remove('visible');  
    this.setupBackdrop.classList.add('visible');  
    this.statusLabel.textContent = 'Waiting for start…';  
    this.clearBoard();  
  }  
  
  startFromInput () {  
    try {  
      const nums = getSortedRows();  
      if (nums.length === 0) throw new Error();  
  
      this.cpuSide = document.getElementById('cpu-side').value;  
      this.vsCPU   = (this.cpuSide !== 'None');  
  
      this.state = new GameState(nums);  
      this.setupBackdrop.classList.remove('visible');  
      this.redraw();  
      this.statusLabel.textContent = `${this.state.player} to move`;  
    } catch {  
      alert('Please enter positive integers separated by spaces.');  
      return;  
    }  
  
    if (this.vsCPU && this.state.player === this.cpuSide) {  
      setTimeout(() => this.aiTurnPerfect(), 1000);  
    }  
  }  
  
  /* ----- drawing helpers ----- */  
  clearBoard () { this.boardArea.innerHTML = ''; this.idToAddress.clear(); }  
  
  redraw () {  
    this.clearBoard();  
    if (!this.state) return;  
    let x0 = this.GAP, y0 = this.GAP;  
  
    this.state.fragments.forEach((frag, fIdx) => {  
      this.drawFragment(frag, fIdx, x0, y0);  
      x0 += frag.cols * this.CELL + this.GAP * 2;   // space for next fragment  
    });  
  }  
  
  drawFragment (frag, fIdx, x0, y0) {  
    /* row labels */  
    frag.rowsAlive().forEach(r => {  
      const div = document.createElement('div');  
      div.className = 'label-cell';  
      div.style.width  = `${this.LABEL}px`;  
      div.style.height = `${this.CELL}px`;  
      div.style.left   = `${x0 - this.LABEL}px`;  
      div.style.top    = `${y0 + r * this.CELL}px`;  
      div.textContent  = r;  
      const id = `lbl-${++this.idCounter}`; div.id = id;  
      this.idToAddress.set(id, { frag: fIdx, kind: 'row', index: r });  
      div.addEventListener('click', e => this.handleLabelClick(e));  
      this.boardArea.appendChild(div);  
    });  
  
    /* column labels */  
    frag.colsAlive().forEach(c => {  
      const div = document.createElement('div');  
      div.className = 'label-cell';  
      div.style.width  = `${this.CELL}px`;  
      div.style.height = `${this.LABEL}px`;  
      div.style.left   = `${x0 + c * this.CELL}px`;  
      div.style.top    = `${y0 - this.LABEL}px`;  
      div.textContent  = c;  
      const id = `lbl-${++this.idCounter}`; div.id = id;  
      this.idToAddress.set(id, { frag: fIdx, kind: 'col', index: c });  
      div.addEventListener('click', e => this.handleLabelClick(e));  
      this.boardArea.appendChild(div);  
    });  
  
    /* squares */  
    for (let r = 0; r < frag.rows; r++) {  
      for (let c = 0; c < frag.cols; c++) {  
        if (!frag.grid[r][c]) continue;  
        const tile = document.createElement('div');  
        tile.className = 'tile';  
        tile.style.width  = `${this.CELL}px`;  
        tile.style.height = `${this.CELL}px`;  
        tile.style.left   = `${x0 + c * this.CELL}px`;  
        tile.style.top    = `${y0 + r * this.CELL}px`;  
        this.boardArea.appendChild(tile);  
      }  
    }  
  }  
  
  /* ----- interaction ----- */  
  handleLabelClick (ev) {  
    const info = this.idToAddress.get(ev.currentTarget.id);  
    if (!info || !this.state) return;  
  
    SoundManager.play('click');  
    ev.currentTarget.classList.add(info.kind === 'row' ? 'row-win' : 'col-win');  
  
    /* flash for 300 ms, then execute the move */  
    setTimeout(() => {  
      /* 1 – perform move */  
      this.state.performMove(info.frag, info.kind, info.index);  
  
      /* 2 – game over? */  
      if (!this.state.hasMoves()) {  
        SoundManager.play('win');  
        this.gameOverMsg.textContent =  
            `${Player.other(this.state.player)} wins!`;  
        this.gameOverBackdrop.classList.add('visible');  
        this.state = null;  
        this.clearBoard();  
        return;  
      }  
  
      /* 3 – redraw */  
      this.redraw();  
      this.statusLabel.textContent = `${this.state.player} to move`;  
  
      /* 4 – let AI move if it’s its turn */  
      if (this.vsCPU && this.state.player === this.cpuSide) {  
        setTimeout(() => this.aiTurnPerfect(), 300);  
      }  
    }, 300);  
  }  
  
  /* ----- perfect-play AI ----- */  
  aiTurnPerfect () {  
    const totalXor = xorAllFragments(this.state);  
  
    /* search for a winning move */  
    for (let f = 0; f < this.state.fragments.length; f++) {  
      const frag = this.state.fragments[f];  
  
      for (const r of frag.rowsAlive()) {  
        if (isWinningMove(this.state, f, 'row', r, totalXor))  
          return this.executeAIMove(f, 'row', r);  
      }  
      for (const c of frag.colsAlive()) {  
        if (isWinningMove(this.state, f, 'col', c, totalXor))  
          return this.executeAIMove(f, 'col', c);  
      }  
    }  
  
    /* if no winning move, play the first available */  
    const f0 = this.state.fragments[0];  
    if (f0.rowsAlive().length)  
      this.executeAIMove(0, 'row', f0.rowsAlive()[0]);  
    else  
      this.executeAIMove(0, 'col', f0.colsAlive()[0]);  
  }  
  
  executeAIMove (fIdx, kind, idx) {  
    const id = [...this.idToAddress.entries()]  
               .find(([_, v]) => v.frag === fIdx && v.kind === kind && v.index === idx)?.[0];  
    if (id) document.getElementById(id).click();  
  }  
}  
  
/* =================================================================  
   BOOT  
   ================================================================= */  
window.addEventListener('load', () => {  
  /* optional: wire Random-rows button */  
  const rndBtn = document.getElementById('random-btn');  
  if (rndBtn) {  
    rndBtn.addEventListener('click', () => {  
      const part = randomPartitionDescending();  
      document.getElementById('rows-input').value = part.join(' ');  
    });  
  }  
  
  /* start the GUI */  
  new CRIM_GUI();  
});  