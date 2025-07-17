/* Random partition utility functions */
const CELL_SIZE = 40;
const GAP_SIZE = 30;

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

function staircase(n) {
  let parts = []; 
  let t = n; 
  
  while (t >= 1) 
  {
    parts.push(t);
    t = t - 1; 
  }
  
  return parts; // Sort descending like other games
}

/* ────────────────────  XOR calculations for perfect AI  ──────────────────── */  
function xorAllFragments(state) {  
  let x = 0;  
  for (const f of state.fragments) x ^= gRect(f.rows, f.cols);  
  return x;  
}  
  
function isWinningMove(state, fIdx, kind, idx, currentXor) {  
  const frag = state.fragments[fIdx];  
  const h = frag.rows, w = frag.cols;  
  let gAfterFrag;  
  
  if (kind === 'row') {  
    const above  = gRect(idx, w);  
    const below  = gRect(h - 1 - idx, w);  
    gAfterFrag = above ^ below;  
  } else {                   // column  
    const left  = gRect(h, idx);  
    const right = gRect(h, w - 1 - idx);  
    gAfterFrag = left ^ right;  
  }  
  const xorAfter = (currentXor ^ gRect(h, w)) ^ gAfterFrag;  
  return xorAfter === 0;  
}  

/* ───────── Grundy numbers for rectangles ───────── */  
const gMemo = new Map();        // key: "h,w"  value: Grundy #  
function gRect(h, w) {  
  if (h === 0 || w === 0) return 0;  
  const key = `${h},${w}`;  
  if (gMemo.has(key)) return gMemo.get(key);  
  
  const seen = new Set();  
  
  // remove any row  
  for (let r = 0; r < h; r++) {  
    const val = gRect(r, w) ^ gRect(h - 1 - r, w);  
    seen.add(val);  
  }  
  // remove any column  
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

class SoundManager{  
  static sounds={};  
  static init(){  
    // Sound effects disabled
  }  
  static play(name){  
    // Sound effects disabled
  }  
}  
  
/* ────────────────────  Game Logic  ──────────────────── */  
  
class Player{  
  static RED  = 'Red';  
  static BLUE = 'Blue';  
  static other(p){return p===Player.RED?Player.BLUE:Player.RED;}  
}  
  
class Fragment{  
  // grid: 2-D boolean array  
  constructor(grid, x = 0, y = 0){  
    this.grid = grid;  
    this.rows = grid.length;  
    this.cols = this.rows?grid[0].length:0;
    this.x = x;  // position on the board
    this.y = y;  // position on the board
  }  
  rowsAlive(){  
    const alive=[];  
    for(let r=0;r<this.rows;r++) if(this.grid[r].some(v=>v)) alive.push(r);  
    return alive;  
  }  
  colsAlive(){  
    const alive=[];  
    for(let c=0;c<this.cols;c++){  
      for(let r=0;r<this.rows;r++){  
        if(this.grid[r][c]){alive.push(c);break;}  
      }  
    }  
    return alive;  
  }  
  hasMoves(){return this.rowsAlive().length>0 || this.colsAlive().length>0;}  
  
  deleteRow(r){  
    for(let c=0;c<this.cols;c++) this.grid[r][c]=false;  
  }  
  deleteCol(c){  
    for(let r=0;r<this.rows;r++) this.grid[r][c]=false;  
  }  
  
  /* ===== splitting into connected components ===== */  
  _nb(r,c){  
    const res=[];  
    const dirs=[[1,0],[-1,0],[0,1],[0,-1]];  
    for(const[dR,dC] of dirs){  
      const nr=r+dR,nc=c+dC;  
      if(0<=nr&&nr<this.rows&&0<=nc&&nc<this.cols&&this.grid[nr][nc])  
        res.push([nr,nc]);  
    }  
    return res;  
  }  
  splitIntoFragments(){  
    const visited=new Set(),frags=[];  
    for(let r=0;r<this.rows;r++){  
      for(let c=0;c<this.cols;c++){  
        if(this.grid[r][c] && !visited.has(`${r},${c}`)){  
          const q=[[r,c]];  
          visited.add(`${r},${c}`);  
          const cells=[];  
          while(q.length){  
            const [cr,cc]=q.shift();  
            cells.push([cr,cc]);  
            for(const[nr,nc] of this._nb(cr,cc)){  
              const key=`${nr},${nc}`;  
              if(!visited.has(key)){visited.add(key);q.push([nr,nc]);}  
            }  
          }  
          frags.push(Fragment._fromCells(cells));  
        }  
      }  
    }  
    return frags;  
  }  
  static _fromCells(cells){  
    const minR=Math.min(...cells.map(v=>v[0]));  
    const minC=Math.min(...cells.map(v=>v[1]));  
    const maxR=Math.max(...cells.map(v=>v[0]));  
    const maxC=Math.max(...cells.map(v=>v[1]));  
    const h=maxR-minR+1,w=maxC-minC+1;  
    const grid=Array.from({length:h},()=>Array(w).fill(false));  
    for(const[r,c] of cells) grid[r-minR][c-minC]=true;  
    return new Fragment(grid);  
  }  
  static fromRowSizes(rowSizes){  
    const rows=rowSizes.length,cols=Math.max(...rowSizes);  
    const g=Array.from({length:rows},()=>Array(cols).fill(false));  
    rowSizes.forEach((len,r)=>{  
      for(let c=0;c<len;c++) g[r][c]=true;  
    });  
    return new Fragment(g);  
  }  
}  
  
class GameState{  
  constructor(rowSizes){  
    this.fragments=[Fragment.fromRowSizes(rowSizes)];  
    this.player=Player.RED;
  }  
  hasMoves(){return this.fragments.some(f=>f.hasMoves());}  
  performMove(fIdx,kind,lineIdx){  
    const frag=this.fragments[fIdx];  
    const originalX = frag.x;
    const originalY = frag.y;
    
    if(kind==='row') frag.deleteRow(lineIdx);  
    else              frag.deleteCol(lineIdx);  

    const newFrags=frag.splitIntoFragments();  
    
    // Position the new fragments relative to the original fragment's position
    if (newFrags.length > 1) {
      if (kind === 'row') {
        // Row was removed: arrange new fragments vertically
        let currentY = originalY;
        newFrags.forEach(newFrag => {
          newFrag.x = originalX;
          newFrag.y = currentY;
          currentY += newFrag.rows * CELL_SIZE + GAP_SIZE * 2;
        });
      } else {
        // Column was removed: arrange new fragments horizontally  
        let currentX = originalX;
        newFrags.forEach(newFrag => {
          newFrag.x = currentX;
          newFrag.y = originalY;
          currentX += newFrag.cols * CELL_SIZE + GAP_SIZE * 2;
        });
      }
    } else if (newFrags.length === 1) {
      // Only one fragment remains, keep it in the same position
      newFrags[0].x = originalX;
      newFrags[0].y = originalY;
    }
    
    this.fragments.splice(fIdx,1,...newFrags);  
    this.player=Player.other(this.player);  
  }  
}  
  
/* ────────────────────  GUI  ──────────────────── */  
  
class CRIM_GUI{  
  constructor(){  
    /* constants */  
    this.CELL=40;          // square size  
    this.GAP=30;           // gap between fragments  
    this.LABEL=20;         // label bar thickness  

        /* will be filled after the Setup modal */  
    this.cpuSide = 'None';   // 'Red' | 'Blue' | 'None'  
    this.vsCPU   = false;    // boolean convenience flag  

  
    /* DOM handles */  
    this.boardArea=document.getElementById('board-area');  
    this.statusLabel=document.getElementById('status-label');  
    this.setupBackdrop=document.getElementById('setup-modal-backdrop');  
    this.gameOverBackdrop=document.getElementById('game-over-modal-backdrop');  
    this.gameOverMsg=document.getElementById('game-over-message');  
    this.rowsInput=document.getElementById('rows-input');  
    this.helpPopover=document.getElementById('help-popover');

    /* buttons */  
    document.getElementById('start-game-btn')  
        .addEventListener('click',()=>{SoundManager.play('click');this.startFromInput();});  
    document.getElementById('new-game-btn')  
        .addEventListener('click',()=>{SoundManager.play('click');this.showSetup();});  
    document.getElementById('play-again-btn')  
        .addEventListener('click',()=>{SoundManager.play('click');this.showSetup();});
    
    /* partition generation */
    document.getElementById('generate-partition-btn')
        .addEventListener('click', () => {
          SoundManager.play('click');
          this.generatePartition();
        });

    /* theme toggle */  
    const themeTgl=document.getElementById('theme-toggle');  
    const saved=localStorage.getItem('theme')||'light';  
    document.documentElement.setAttribute('data-theme',saved);  
    themeTgl.checked=saved==='dark';  
    themeTgl.addEventListener('change',()=>{  
      const nt=themeTgl.checked?'dark':'light';  
      document.documentElement.setAttribute('data-theme',nt);  
      localStorage.setItem('theme',nt);  
    });  

    /* tile themes */
    const themeSelect = document.getElementById('theme-select');
    themeSelect.addEventListener('change', () => {
      SoundManager.play('click');
      this.applyTileTheme();
    });

    /* help */  
    const helpBtn=document.getElementById('help-btn');  
    const helpBtnModal=document.getElementById('help-btn-modal');
    helpBtn.addEventListener('mouseenter',()=>this.helpPopover.classList.add('visible'));  
    helpBtn.addEventListener('mouseleave',()=>this.helpPopover.classList.remove('visible'));
    if (helpBtnModal) {
      helpBtnModal.addEventListener('mouseenter',()=>this.helpPopover.classList.add('visible'));  
      helpBtnModal.addEventListener('mouseleave',()=>this.helpPopover.classList.remove('visible'));
    }

    /* sound */  
    SoundManager.init();  

    /* start */  
    this.state=null;  
    this.idCounter=0;          // for unique element ids  
    this.idToAddress=new Map();/* id -> {frag,kind,index} */  
    this.applyTileTheme(); // Apply initial tile theme
    this.showSetup();
  }  
  
  showSetup(){  
    this.gameOverBackdrop.classList.remove('visible');  
    this.setupBackdrop.classList.add('visible');  
    this.statusLabel.textContent='Waiting for start…';  
    this.clearBoard();  
  }  
  startFromInput(){  
    try{  
      const nums=this.rowsInput.value.trim().split(/\s+/).map(Number);  
      if(nums.length===0||nums.some(n=>!Number.isInteger(n)||n<=0))  
        throw new Error();  

      this.cpuSide = document.getElementById('cpu-side').value; // 'Red'|'Blue'|'None'  
      this.vsCPU   = (this.cpuSide !== 'None');  

      this.state=new GameState(nums);  
      this.setupBackdrop.classList.remove('visible');  
      this.redraw();  
      const playerLetter = this.state.player === Player.RED ? 'A' : 'B';
      const playerType = this.vsCPU && this.state.player === this.cpuSide ? 'Computer' : 'Human';
      this.statusLabel.textContent = `Player ${playerLetter} (${playerType}) to move`;
    }catch{  
      alert('Please enter positive integers separated by spaces.');  
    }
    
    if (this.vsCPU && this.state.player === this.cpuSide) {  
        setTimeout(() => this.aiTurnPerfect(), 1000);   // small UX delay  
    }  
  }  
  
  clearBoard(){this.boardArea.innerHTML='';this.idToAddress.clear();}  

  generatePartition() {
    const partitionTypeSelect = document.getElementById('partition-type-select');
    const partitionNumberInput = document.getElementById('partition-number-input');
    
    const partitionType = partitionTypeSelect.value;
    const n = parseInt(partitionNumberInput.value, 10);
    
    if (isNaN(n) || n <= 0 || n > 200) {
      alert("Please enter a positive number less than or equal to 200.");
      return;
    }
    
    let partition;
    
    switch (partitionType) {
      case 'random':
        partition = randomPartition(n);
        break;
      case 'staircase':
        partition = staircase(n);
        break;
      case 'rectangle':
        // Placeholder - will be implemented later
        alert("Rectangle partitions are not yet implemented.");
        return;
      case 'square':
        // Placeholder - will be implemented later
        alert("Square partitions are not yet implemented.");
        return;
      case 'hook':
        // Placeholder - will be implemented later
        alert("Hook partitions are not yet implemented.");
        return;
      case 'triangle':
        // Placeholder - will be implemented later
        alert("Triangle partitions are not yet implemented.");
        return;
      default:
        alert("Unknown partition type selected.");
        return;
    }
    
    this.rowsInput.value = partition.join(' ');
  }

  applyTileTheme() {
    const themeSelect = document.getElementById('theme-select');
    const gameCard = document.getElementById('game-card');
    if (themeSelect && gameCard) {
      gameCard.setAttribute('data-tile-theme', themeSelect.value);
    }
  }
  
  redraw(){  
    this.clearBoard();  
    if(!this.state) return;
    
    // Calculate required dimensions and update board area
    this.updateBoardDimensions();

    this.state.fragments.forEach((frag,fIdx)=>{  
      this.drawFragment(frag,fIdx,frag.x + this.GAP, frag.y + this.GAP);  
    });  
  }
  
  updateBoardDimensions() {
    if (!this.state || this.state.fragments.length === 0) return;
    
    // Calculate the bounding box that contains all fragments
    let minX = 0, minY = 0, maxX = 0, maxY = 0;
    
    this.state.fragments.forEach(frag => {
      const fragRight = frag.x + frag.cols * this.CELL;
      const fragBottom = frag.y + frag.rows * this.CELL;
      
      maxX = Math.max(maxX, fragRight);
      maxY = Math.max(maxY, fragBottom);
    });
    
    // Add margins for labels and gaps
    const requiredWidth = maxX + this.GAP * 2 + this.LABEL;
    const requiredHeight = maxY + this.GAP * 2 + this.LABEL;
    
    // Set minimum dimensions
    const minDimension = 480;
    const finalWidth = Math.max(requiredWidth, minDimension);
    const finalHeight = Math.max(requiredHeight, minDimension);
    
    // Apply the calculated dimensions to the board area
    this.boardArea.style.width = `${finalWidth}px`;
    this.boardArea.style.height = `${finalHeight}px`;
  }
  
  drawFragment(frag,fIdx,x0,y0){  
    /* row labels */  
    frag.rowsAlive().forEach(r=>{  
      const div=document.createElement('div');  
      div.className='label-cell';  
      div.style.width =`${this.LABEL}px`;  
      div.style.height=`${this.CELL}px`;  
      div.style.left  =`${x0-this.LABEL}px`;  
      div.style.top   =`${y0+r*this.CELL}px`;  
      div.textContent=r;  
      const id=`lbl-${++this.idCounter}`;div.id=id;  
      this.idToAddress.set(id,{frag:fIdx,kind:'row',index:r});  
      div.addEventListener('click',e=>this.handleLabelClick(e));  
      SoundManager.play('hover');  
      this.boardArea.appendChild(div);  
    });  
    /* column labels */  
    frag.colsAlive().forEach(c=>{  
      const div=document.createElement('div');  
      div.className='label-cell';  
      div.style.width =`${this.CELL}px`;  
      div.style.height=`${this.LABEL}px`;  
      div.style.left  =`${x0+c*this.CELL}px`;  
      div.style.top   =`${y0-this.LABEL}px`;  
      div.textContent=c;  
      const id=`lbl-${++this.idCounter}`;div.id=id;  
      this.idToAddress.set(id,{frag:fIdx,kind:'col',index:c});  
      div.addEventListener('click',e=>this.handleLabelClick(e));  
      this.boardArea.appendChild(div);  
    });  
    /* squares */  
    for(let r=0;r<frag.rows;r++){  
      for(let c=0;c<frag.cols;c++){  
        if(!frag.grid[r][c]) continue;  
        const tile=document.createElement('div');  
        tile.className='tile';  
        tile.style.width =`${this.CELL}px`;  
        tile.style.height=`${this.CELL}px`;  
        tile.style.left  =`${x0+c*this.CELL}px`;  
        tile.style.top   =`${y0+r*this.CELL}px`;  
        this.boardArea.appendChild(tile);  
      }  
    }  
  }  
  
    handleLabelClick(ev) {  
  const info = this.idToAddress.get(ev.currentTarget.id);  
  if (!info || !this.state) return;  
  
  SoundManager.play('click');  
  ev.currentTarget.classList.add(info.kind === 'row' ? 'row-win' : 'col-win');  
  
  /* execute the move after a short visual flash */  
  setTimeout(() => {  
    /* 1 ─ perform move and possibly split fragments */  
    this.state.performMove(info.frag, info.kind, info.index);  
  
    /* 2 ─ check for game-over */  
    if (!this.state.hasMoves()) {  
      SoundManager.play('win');  
      const winnerLetter = Player.other(this.state.player) === Player.RED ? 'A' : 'B';
      this.gameOverMsg.textContent = `Player ${winnerLetter} wins!`;  
      this.gameOverBackdrop.classList.add('visible');  
      this.state = null;  
      this.clearBoard();  
      return;  
    }  
  
    /* 3 ─ redraw and show whose turn it is now */  
    this.redraw();  
    const playerLetter = this.state.player === Player.RED ? 'A' : 'B';
    const playerType = this.vsCPU && this.state.player === this.cpuSide ? 'Computer' : 'Human';
    this.statusLabel.textContent = `Player ${playerLetter} (${playerType}) to move`;  
  
    /* 4 ─ if the computer is the one to move, let it think & act */  
    if (this.vsCPU && this.state.player === this.cpuSide) {  
      setTimeout(() => this.aiTurnPerfect(), 300);   // UX friendly delay  
    }  
  }, 300);                                           // <- flash duration  
}    


  aiTurnPerfect() {  
  const totalXor = xorAllFragments(this.state);  
  
  // scan every possible move  
  for (let f = 0; f < this.state.fragments.length; f++) {  
    const frag = this.state.fragments[f];  
  
    for (const r of frag.rowsAlive()) {  
      if (isWinningMove(this.state, f, 'row', r, totalXor)) {  
        return this.executeAIMove(f, 'row', r);  
      }  
    }  
    for (const c of frag.colsAlive()) {  
      if (isWinningMove(this.state, f, 'col', c, totalXor)) {  
        return this.executeAIMove(f, 'col', c);  
      }  
    }  
  }  
  
  /* If position was already losing, just play the first legal move */  
  const f0 = this.state.fragments[0];  
  if (f0.rowsAlive().length)        return this.executeAIMove(0, 'row', f0.rowsAlive()[0]);  
  else                              return this.executeAIMove(0, 'col', f0.colsAlive()[0]);  
}  
  
/* helper: performs the chosen move after a brief “thinking delay” */  
executeAIMove(fIdx, kind, idx) {  
  const labelId = [...this.idToAddress.entries()]  
                  .find(([_,v]) => v.frag===fIdx && v.kind===kind && v.index===idx)?.[0];  
  if (labelId) document.getElementById(labelId).click();  
}  

}  
  
/* ────────────────────  boot  ──────────────────── */  
window.addEventListener('load',()=>{ new CRIM_GUI(); });  