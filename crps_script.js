/* CRPS Game Script - Partizan version of CRIS with player-specific moves */

/* Random partition utility functions */  
const CELL_SIZE = 40;  
const GAP_SIZE  = 30;  
  
function randomInt(min,max){return Math.floor(Math.random()*(max-min+1))+min;}  
function randomPartition(n){  
  let parts=[],remaining=n,maxPart=n;  
  while(remaining>0){  
    let part=randomInt(1,Math.min(remaining,maxPart));  
    parts.push(part);remaining-=part;maxPart=part;  
  }  
  return parts.sort((a,b)=>b-a);  
}  
function staircase(n){let p=[],t=n;while(t>=1){p.push(t);t--;}return p;}  
function square(n){let p=[],t=n;while(t>=1){p.push(n);t--;}return p;}  
function hook(n){let p=[n];for(let t=n;t>=2;t--)p.push(1);return p;}  
  
/* ────────────────────  XOR calculations for perfect AI  ──────────────────── */  
function xorAllFragments(state){  
  let x=0;for(const f of state.fragments)x^=gRect(f.rows,f.cols);return x;  
}  
function isWinningMove(state,fIdx,kind,idx,currentXor,player){  
  // Check if the current player can make this move type
  if (!canPlayerMakeMove(player, kind)) return false;
  
  const frag=state.fragments[fIdx],h=frag.rows,w=frag.cols;  
  let gAfterFrag;  
  if(kind==='row'){  
    const above=gRect(idx,w),below=gRect(h-1-idx,w);  
    gAfterFrag=above^below;  
  }else{  
    const left=gRect(h,idx),right=gRect(h,w-1-idx);  
    gAfterFrag=left^right;  
  }  
  const xorAfter=(currentXor^gRect(h,w))^gAfterFrag;  
  return xorAfter===0;  
}

// Helper function to check if a player can make a specific move type
function canPlayerMakeMove(player, moveType) {
  if (player === Player.RED) {
    return moveType === 'row'; // Player A can only make row moves
  } else {
    return moveType === 'col'; // Player B can only make column moves
  }
}

// Sanity checks (optional but helpful)
function assertUniqueIds(fragments) {  
  const ids = new Set(fragments.map(f => f.partitionId));  
  if (ids.size !== fragments.length) {  
    throw new Error('Duplicate partitionId detected – invariant broken!');  
  }  
}
  
/* ───────── Grundy numbers for rectangles ───────── */  
const gMemo=new Map();                     // key: "h,w"  
function gRect(h,w){  
  if(h===0||w===0)return 0;  
  const key=`${h},${w}`;if(gMemo.has(key))return gMemo.get(key);  
  const seen=new Set();  
  for(let r=0;r<h;r++)seen.add(gRect(r,w)^gRect(h-1-r,w));  
  for(let c=0;c<w;c++)seen.add(gRect(h,c)^gRect(h,w-1-c));  
  let g=0;while(seen.has(g))g++;gMemo.set(key,g);return g;  
}  
  
/* =================================================================  
   CRPS  –  Complete Front-End Logic  
   ================================================================= */  
  
class SoundManager{  
  static sounds={};  
  static init(){}  
  static play(name){}  
}  
  
/* ────────────────────  Game Logic  ──────────────────── */  
  
class Player{  
  static RED='Red';static BLUE='Blue';  
  static other(p){return p===Player.RED?Player.BLUE:Player.RED;}  
}  
  
class Fragment{  
  constructor(grid,x=0,y=0){  
    this.grid=grid;this.rows=grid.length;  
    this.cols=this.rows?grid[0].length:0;  
    this.x=x;this.y=y;  
    this.partitionId = 0; // NEW: partition ID for move notation
  }  
  rowsAlive(){const a=[];for(let r=0;r<this.rows;r++)if(this.grid[r].some(v=>v))a.push(r);return a;}  
  colsAlive(){  
    const a=[];for(let c=0;c<this.cols;c++){  
      for(let r=0;r<this.rows;r++){if(this.grid[r][c]){a.push(c);break;}}  
    }return a;  
  }  
  hasMoves(){return this.rowsAlive().length>0||this.colsAlive().length>0;}  
  
  deleteRow(r){for(let c=0;c<this.cols;c++)this.grid[r][c]=false;}  
  deleteCol(c){for(let r=0;r<this.rows;r++)this.grid[r][c]=false;}  
  
  _nb(r,c){  
    const res=[],dirs=[[1,0],[-1,0],[0,1],[0,-1]];  
    for(const[dR,dC] of dirs){  
      const nr=r+dR,nc=c+dC;  
      if(0<=nr&&nr<this.rows&&0<=nc&&nc<this.cols&&this.grid[nr][nc])  
        res.push([nr,nc]);  
    }return res;  
  }  
  splitIntoFragments(){  
    const visited=new Set(),frags=[];  
    for(let r=0;r<this.rows;r++)for(let c=0;c<this.cols;c++){  
      if(this.grid[r][c]&&!visited.has(`${r},${c}`)){  
        const q=[[r,c]];visited.add(`${r},${c}`);const cells=[];  
        while(q.length){  
          const[cr,cc]=q.shift();cells.push([cr,cc]);  
          for(const[nr,nc]of this._nb(cr,cc)){  
            const key=`${nr},${nc}`;if(!visited.has(key)){visited.add(key);q.push([nr,nc]);}  
          }  
        }frags.push(Fragment._fromCells(cells));  
      }  
    }return frags;  
  }  
  static _fromCells(cells){  
    const minR=Math.min(...cells.map(v=>v[0])),minC=Math.min(...cells.map(v=>v[1]));  
    const maxR=Math.max(...cells.map(v=>v[0])),maxC=Math.max(...cells.map(v=>v[1]));  
    const h=maxR-minR+1,w=maxC-minC+1;  
    const g=Array.from({length:h},()=>Array(w).fill(false));  
    for(const[r,c]of cells)g[r-minR][c-minC]=true;  
    return new Fragment(g);  
  }  
  static fromRowSizes(rowSizes){  
    const rows=rowSizes.length,cols=Math.max(...rowSizes);  
    const g=Array.from({length:rows},()=>Array(cols).fill(false));  
    rowSizes.forEach((len,r)=>{for(let c=0;c<len;c++)g[r][c]=true;});  
    return new Fragment(g);  
  }
  
  getRows() {
    // Return row lengths as an array
    const rowLengths = [];
    for (let r = 0; r < this.rows; r++) {
      let length = 0;
      for (let c = 0; c < this.cols; c++) {
        if (this.grid[r][c]) {
          length++;
        }
      }
      if (length > 0) {
        rowLengths.push(length);
      }
    }
    return rowLengths.sort((a, b) => b - a); // Sort in descending order
  }
}  
  
class GameState{  
  constructor(rowSizes){
    const f = Fragment.fromRowSizes(rowSizes);
    f.partitionId = 1; // initial fragment is P1
    this.fragments = [f];
    this.nextPartitionId = 2; // counter for future partitions
    this.player=Player.RED;
  }  
  hasMoves(){
    // Check if the current player has any legal moves
    for (const frag of this.fragments) {
      if (this.player === Player.RED && frag.rowsAlive().length > 0) return true;
      if (this.player === Player.BLUE && frag.colsAlive().length > 0) return true;
    }
    return false;
  }
  performMove(fIdx,kind,lineIdx){  
    // Validate that the current player can make this move type
    if (!canPlayerMakeMove(this.player, kind)) {
      console.warn(`Player ${this.player} cannot make ${kind} moves`);
      return;
    }
    
    const frag = this.fragments[fIdx];
    const parentPid = frag.partitionId;   // remember the id we started with
    const originalX=frag.x,originalY=frag.y;  
    if(kind==='row')frag.deleteRow(lineIdx);else frag.deleteCol(lineIdx);  
    const newFrags = frag.splitIntoFragments();   // after the cut  
  
    /* ── id-handling ─────────────────────────────────────────── */  
    if(newFrags.length === 1){                 // no split ⇒ keep the old id  
      newFrags[0].partitionId = parentPid;  
    }else{                                     // a true split  
      newFrags[0].partitionId = parentPid;     // the "senior" piece  
      for(let i = 1; i < newFrags.length; i++){// younger pieces  
        newFrags[i].partitionId = this.nextPartitionId++;  
      }  
    }  
    /* ────────────────────────────────────────────────────────── */  
  
    // Replace parent in fragment array  
    this.fragments.splice(fIdx, 1, ...newFrags);  
  
    // Keep the array ordered (OPTIONAL, purely cosmetic)  
    this.fragments.sort((a, b) => a.partitionId - b.partitionId);  
  
    // Position the children
    if(newFrags.length>1){  
      if(kind==='row'){  
        let y=originalY;  
        newFrags.forEach(nf=>{nf.x=originalX;nf.y=y;y+=nf.rows*CELL_SIZE+GAP_SIZE*2;});  
      }else{  
        let x=originalX;  
        newFrags.forEach(nf=>{nf.x=x;nf.y=originalY;x+=nf.cols*CELL_SIZE+GAP_SIZE*2;});  
      }  
    }else if(newFrags.length===1){
      newFrags[0].x=originalX;newFrags[0].y=originalY;
    }
    
    // Sanity check (optional but helpful)
    assertUniqueIds(this.fragments);
    
    this.player=Player.other(this.player);
  }
}  
  
/* ────────────────────  GUI  ──────────────────── */  
  
class CRPS_GUI{  
  constructor(){  
    this.CELL=40;this.GAP=30;this.LABEL=20;  
    this.cpuSide='None';    this.vsCPU=false;  
    this.gameHistory=[];
    // Database tracking
    this.movesSequence = [];
    this.gameStartTime = null;  
    
    // Initialize DOM handles with error handling
    try {
      this.boardArea=document.getElementById('board-area');  
      this.statusLabel=document.getElementById('status-label');  
      this.setupBackdrop=document.getElementById('setup-modal-backdrop');  
      this.gameOverBackdrop=document.getElementById('game-over-modal-backdrop');  
      this.gameOverMsg=document.getElementById('game-over-message');  
      this.rowsInput=document.getElementById('rows-input');  
      this.helpPopover=document.getElementById('help-popover');  
      this.aiIndicator=document.getElementById('ai-thinking-indicator');  
      this.undoBtn=document.getElementById('undo-btn');  
      
      this.state=null;this.idCounter=0;this.idToAddress=new Map();  
      this.bindEventListeners();this.showSetupModal();this.setupTheme();  
    } catch (error) {
      console.error('Error initializing CRPS GUI:', error);
      // Set a fallback status message
      const statusLabel = document.getElementById('status-label');
      if (statusLabel) {
        statusLabel.textContent = 'Error loading game. Please refresh the page.';
      }
    }
  }  
  
  bindEventListeners(){  
    try {
      const newGameBtn = document.getElementById('new-game-btn');
      if (newGameBtn) {
        newGameBtn.addEventListener('click',()=>{SoundManager.play('click');this.showSetupModal();});
      }
      
      const startGameBtn = document.getElementById('start-game-btn');
      if (startGameBtn) {
        startGameBtn.addEventListener('click',()=>{SoundManager.play('click');this.startFromInput();});
      }
      
      const playAgainBtn = document.getElementById('play-again-btn');
      if (playAgainBtn) {
        playAgainBtn.addEventListener('click',()=>{SoundManager.play('click');this.showSetupModal();});
      }
      
      const generatePartitionBtn = document.getElementById('generate-partition-btn');
      if (generatePartitionBtn) {
        generatePartitionBtn.addEventListener('click',()=>{SoundManager.play('click');this.generatePartition();});
      }
      
      // Handle theme-select if it exists (it doesn't in CRPS)
      const themeSelect = document.getElementById('theme-select');
      if (themeSelect) {
        themeSelect.addEventListener('change',()=>this.applyTileTheme());
      }
      
      this.undoBtn?.addEventListener('click',()=>this.undoMove());  
      
      // Download button
      const downloadBtn = document.getElementById('download-btn');
      if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
          SoundManager.play('click');
          this.downloadGame();
        });
      }
      
      const helpBtn=document.getElementById('help-btn'),helpBtnModal=document.getElementById('help-btn-modal');  
      [helpBtn,helpBtnModal].forEach(btn=>btn?.addEventListener('click',e=>{  
        SoundManager.play('click');e.stopPropagation();this.toggleHelp();  
      }));  
      document.addEventListener('click',e=>{  
        const helpPopover=document.getElementById('help-popover'),helpBtn=document.getElementById('help-btn'),helpBtnModal=document.getElementById('help-btn-modal');  
        if(!helpBtn||!helpBtn.contains(e.target))  
          if(!helpBtnModal||!helpBtnModal.contains(e.target))  
            if(!helpPopover||!helpPopover.contains(e.target))this.hideHelp();  
      });  
      
      const themeToggle=document.getElementById('theme-toggle');  
      if(themeToggle)themeToggle.addEventListener('change',()=>this.toggleTheme());  
      
      if (this.statusLabel) {
        this.statusLabel.textContent='Click "New Game" to start';  
      }
    } catch (error) {
      console.error('Error binding event listeners:', error);
    }
  }  
  
  showSetupModal(){
    if (this.setupBackdrop) {
      // Hide game over modal first if it's visible
      if (this.gameOverBackdrop) {
        this.gameOverBackdrop.classList.remove('visible');
      }
      this.setupBackdrop.classList.add('visible');
      this.clearBoard();
      this.updateUndoButton();
    }
  }
  hideSetupModal(){
    if (this.setupBackdrop) {
      this.setupBackdrop.classList.remove('visible');
    }
  }
  showGameOverModal(){
    if (this.gameOverBackdrop) {
      this.gameOverBackdrop.classList.add('visible');
    }
  }
  hideGameOverModal(){
    if (this.gameOverBackdrop) {
      this.gameOverBackdrop.classList.remove('visible');
    }
  }
  
  toggleHelp(){  
    if (this.helpPopover) {
      if(this.helpPopover.classList.contains('visible'))this.hideHelp();  
      else this.showHelp();  
    }
  }  
  showHelp(){
    if (this.helpPopover) {
      this.helpPopover.classList.add('visible');
    }
  }
  hideHelp(){
    if (this.helpPopover) {
      this.helpPopover.classList.remove('visible');
    }
  }
  
  setupTheme(){  
    const saved=localStorage.getItem('crps-theme');  
    if(saved)document.documentElement.setAttribute('data-theme',saved);  
    const toggle=document.getElementById('theme-toggle');  
    if(toggle)toggle.checked=document.documentElement.getAttribute('data-theme')==='dark';  
  }  
  toggleTheme(){  
    const isDark=document.documentElement.getAttribute('data-theme')==='dark';  
    const newTheme=isDark?'light':'dark';  
    document.documentElement.setAttribute('data-theme',newTheme);  
    localStorage.setItem('crps-theme',newTheme);  
  }  
  
  startFromInput(){  
    try{  
      const nums=this.rowsInput.value.trim().split(/\s+/).map(Number);  
      if(nums.length===0||nums.some(n=>!Number.isInteger(n)||n<=0))throw new Error();  
      this.cpuSide=document.getElementById('cpu-side').value;  
      this.vsCPU=(this.cpuSide!=='None');  
      // difficulty slider currently unused  
      this.state=new GameState(nums);  
      this.setupBackdrop.classList.remove('visible');  
      this.clearGameHistory();this.redraw();
      // Initialize database tracking
      this.movesSequence = [];
      this.gameStartTime = new Date();
      this.initialPartition = [...nums]; // Store initial partition
      this.updateStatus();
      this.updateUndoButton();  
    }catch{alert('Please enter positive integers separated by spaces.');}  
    if(this.vsCPU&&this.state.player===this.cpuSide){  
      setTimeout(()=>this.aiTurnPerfect(),1000);  
    }  
  }
  
  updateStatus() {
    if (!this.state) return;
    const playerLetter = this.state.player === Player.RED ? 'A' : 'B';
    const playerType = this.vsCPU && this.state.player === this.cpuSide ? 'Computer' : 'Human';
    const moveType = this.state.player === Player.RED ? 'Rows' : 'Columns';
    this.statusLabel.textContent = `Player ${playerLetter} (${playerType}) - ${moveType} only`;
  }
  
  clearBoard(){
    if (this.boardArea) {
      this.boardArea.innerHTML='';
      this.idToAddress.clear();
    }
  }
  
  generatePartition(){  
    const sel=document.getElementById('partition-type-select');  
    const input=document.getElementById('partition-number-input');  
    const type=sel.value,n=parseInt(input.value,10);  
    if(isNaN(n)||n<=0||n>200){alert('Please enter a positive number ≤ 200.');return;}  
    let partition;  
    switch(type){  
      case'random':partition=randomPartition(n);break;  
      case'staircase':partition=staircase(n);break;  
      case'square':partition=square(n);break;  
      case'hook':partition=hook(n);break;  
      default:alert('This partition type not implemented.');return;  
    }  
    this.rowsInput.value=partition.join(' ');  
  }  
  
  saveGameState(){  
    if(!this.state)return;  
    // Create a deep copy of the current game state
    const fragmentsCopy = this.state.fragments.map(f => {
      const gridCopy = f.grid.map(row => [...row]);
      const clone = new Fragment(gridCopy, f.x, f.y);
      clone.partitionId = f.partitionId; // NEW
      return clone;
    });
    
    this.gameHistory.push({
      fragments: fragmentsCopy,
      player: this.state.player,
      nextPid: this.state.nextPartitionId, // NEW
      timestamp: Date.now()
    });
    this.updateUndoButton();  
  }  
  undoMove(){  
    if(!this.canUndo())return;  
    SoundManager.play('click');  
    const prev = this.gameHistory.pop();
    
    // Restore the previous state
    this.state.fragments = prev.fragments;
    this.state.player = prev.player;
    this.state.nextPartitionId= prev.nextPid; // NEW
    
    // Remove the last move from the sequence
    this.movesSequence.pop();
    
    this.redraw();  
    this.updateStatus();
    this.updateUndoButton();  
  }  
  canUndo(){return this.state&&this.gameHistory.length>0&&!(this.vsCPU&&this.state.player===this.cpuSide);}  
  updateUndoButton(){  
    if (this.undoBtn) {
      if(this.canUndo()){this.undoBtn.style.display='inline-block';}  
      else{this.undoBtn.style.display='none';}
    }
  }  
  clearGameHistory(){this.gameHistory=[];this.updateUndoButton();}  
  applyTileTheme(){  
    const sel=document.getElementById('theme-select'),card=document.getElementById('game-card');  
    if(sel&&card)card.setAttribute('data-tile-theme',sel.value);  
  }  
  
  redraw(){  
    this.clearBoard();if(!this.state)return;  
    this.updateBoardDimensions();  
    
    // Calculate horizontal center offset for the entire board
    const boardAreaWidth = this.boardArea.offsetWidth;
    
    // Calculate the total content width
    let maxX = 0;
    this.state.fragments.forEach(f => {
      maxX = Math.max(maxX, f.x + f.cols * this.CELL);
    });
    
    const totalWidth = maxX + this.GAP * 2 + this.LABEL;
    const centerOffset = (boardAreaWidth - totalWidth) / 2;
    
    // Draw fragments with horizontal centering but using their original y positions
    this.state.fragments.forEach((f, i) => {
      const x0 = f.x + this.GAP + centerOffset;
      const y0 = f.y + this.GAP;
      this.drawFragment(f, i, x0, y0);
    });
  }  
  updateBoardDimensions(){  
    if(!this.state||!this.state.fragments.length)return;  
    let maxX=0,maxY=0;  
    this.state.fragments.forEach(f=>{  
      maxX=Math.max(maxX,f.x+f.cols*this.CELL);  
      maxY=Math.max(maxY,f.y+f.rows*this.CELL);  
    });  
    const w=maxX+this.GAP*2+this.LABEL,h=maxY+this.GAP*2+this.LABEL;  
    const mw=480,mh=480;  
    this.boardArea.style.width =`${Math.max(w,mw)}px`;  
    this.boardArea.style.height=`${Math.max(h,mh)}px`;  
  }  
  drawFragment(frag,fIdx,x0,y0){  
    // Draw row labels (only if current player is A/Red and can make row moves)
    const currentPlayerCanMakeRows = canPlayerMakeMove(this.state.player, 'row');
    frag.rowsAlive().forEach(r=>{  
      const div=document.createElement('div');
      div.className='label-cell';
      if (!currentPlayerCanMakeRows) {
        div.classList.add('disabled');
      }
      div.style.width=`${this.LABEL}px`;div.style.height=`${this.CELL}px`;  
      div.style.left=`${x0-this.LABEL}px`;div.style.top=`${y0+r*this.CELL}px`;  
      div.textContent=r;const id=`lbl-${++this.idCounter}`;div.id=id;  
      this.idToAddress.set(id,{frag:fIdx,kind:'row',index:r});  
      div.addEventListener('click',e=>this.handleLabelClick(e));
      div.addEventListener('mouseenter',e=>this.handleLabelHover(e));
      div.addEventListener('mouseleave',e=>this.handleLabelLeave(e));
      this.boardArea.appendChild(div);  
    });  
    
    // Draw column labels (only if current player is B/Blue and can make column moves)
    const currentPlayerCanMakeCols = canPlayerMakeMove(this.state.player, 'col');
    frag.colsAlive().forEach(c=>{  
      const div=document.createElement('div');
      div.className='label-cell';
      if (!currentPlayerCanMakeCols) {
        div.classList.add('disabled');
      }
      div.style.width=`${this.CELL}px`;div.style.height=`${this.LABEL}px`;  
      div.style.left=`${x0+c*this.CELL}px`;div.style.top=`${y0-this.LABEL}px`;  
      div.textContent=c;const id=`lbl-${++this.idCounter}`;div.id=id;  
      this.idToAddress.set(id,{frag:fIdx,kind:'col',index:c});  
      div.addEventListener('click',e=>this.handleLabelClick(e));
      div.addEventListener('mouseenter',e=>this.handleLabelHover(e));
      div.addEventListener('mouseleave',e=>this.handleLabelLeave(e));
      this.boardArea.appendChild(div);  
    });  
    
    // Draw tiles
    for(let r=0;r<frag.rows;r++)for(let c=0;c<frag.cols;c++){  
      if(!frag.grid[r][c])continue;  
      const tile=document.createElement('div');tile.className='tile';  
      tile.style.width=`${this.CELL}px`;tile.style.height=`${this.CELL}px`;  
      tile.style.left=`${x0+c*this.CELL}px`;tile.style.top=`${y0+r*this.CELL}px`;
      tile.id = `tile-${fIdx}-${r}-${c}`;  
      this.boardArea.appendChild(tile);  
    }  
  }  
  
  handleLabelClick(ev){  
    const info=this.idToAddress.get(ev.currentTarget.id);if(!info||!this.state)return;  
    
    // Check if current player can make this move type
    if (!canPlayerMakeMove(this.state.player, info.kind)) {
      console.log(`Player ${this.state.player} cannot make ${info.kind} moves`);
      return;
    }
    
    this.saveGameState();  
    SoundManager.play('click');  
    ev.currentTarget.classList.add(info.kind==='row'?'row-win':'col-win');  
    setTimeout(()=>{  
      // BEFORE executing the move, capture the partition id
      const pid = this.state.fragments[info.frag].partitionId;
      const token = info.kind==='row'
        ? `R${info.index} (P${pid})`
        : `C${info.index} (P${pid})`;
      this.movesSequence.push(token); // now full notation
      
      this.state.performMove(info.frag,info.kind,info.index);  
      if(!this.state.hasMoves()){  
        SoundManager.play('win');const winner=Player.other(this.state.player)===Player.RED?'A':'B';  
        this.gameOverMsg.textContent=`Player ${winner} wins!`;  
        this.gameOverBackdrop.classList.add('visible');
        this.storeGameInDatabase(winner);
        this.clearBoard();this.updateUndoButton();return;  
      }  
      this.redraw();  
      this.updateStatus();
      this.updateUndoButton();  
      if(this.vsCPU&&this.state.player===this.cpuSide)setTimeout(()=>this.aiTurnPerfect(),300);  
    },300);  
  }

  handleLabelHover(ev) {
    const info = this.idToAddress.get(ev.currentTarget.id);
    if (info) {
      this.highlightTiles(info.frag, info.kind, info.index);
    }
  }

  handleLabelLeave(ev) {
    this.clearHighlights();
  }

  highlightTiles(fIdx, kind, idx) {
    // Remove existing highlights
    this.clearHighlights();
    
    // Highlight tiles that would be affected by this move
    const frag = this.state.fragments[fIdx];
    for (let r = 0; r < frag.rows; r++) {
      for (let c = 0; c < frag.cols; c++) {
        if (frag.grid[r][c]) {
          const shouldHighlight = (kind === 'row' && r === idx) || (kind === 'col' && c === idx);
          if (shouldHighlight) {
            const tile = document.getElementById(`tile-${fIdx}-${r}-${c}`);
            if (tile) {
              tile.classList.add('highlighted');
            }
          }
        }
      }
    }
  }

  clearHighlights() {
    document.querySelectorAll('.tile.highlighted').forEach(tile => {
      tile.classList.remove('highlighted');
    });
  }
  
  aiTurnPerfect(){  
    this.updateUndoButton();  
    const totalXor=xorAllFragments(this.state);  
    for(let f=0;f<this.state.fragments.length;f++){  
      const frag=this.state.fragments[f];  
      // Only check moves that the AI player can make
      if(this.state.player === Player.RED) {
        for(const r of frag.rowsAlive())if(isWinningMove(this.state,f,'row',r,totalXor,this.state.player))return this.executeAIMove(f,'row',r);  
      } else {
        for(const c of frag.colsAlive())if(isWinningMove(this.state,f,'col',c,totalXor,this.state.player))return this.executeAIMove(f,'col',c);  
      }
    }  
    // If no winning move, make the first available move for this player
    const f0=this.state.fragments[0];  
    if(this.state.player === Player.RED && f0.rowsAlive().length)return this.executeAIMove(0,'row',f0.rowsAlive()[0]);  
    else if(this.state.player === Player.BLUE && f0.colsAlive().length)return this.executeAIMove(0,'col',f0.colsAlive()[0]);  
  }  
  executeAIMove(fIdx,kind,idx){  
    const id=[...this.idToAddress.entries()].find(([_,v])=>v.frag===fIdx&&v.kind===kind&&v.index===idx)?.[0];  
    if(id)document.getElementById(id)?.click();  
  }

  downloadGame() {
    if (!this.gameHistory || this.gameHistory.length === 0) {
      alert("No game history to download");
      return;
    }
    
    // Collect all game states including current
    const allStates = [...this.gameHistory];
    
    // Add current state if game exists
    if (this.state) {
      const fragmentsCopy = this.state.fragments.map(f => {
        const gridCopy = f.grid.map(row => [...row]);
        return new Fragment(gridCopy, f.x, f.y);
      });
      
      allStates.push({
        fragments: fragmentsCopy,
        player: this.state.player,
        timestamp: Date.now()
      });
    }
    
    // Create the HTML content
    const htmlContent = this.generateGameReplayHTML(allStates);
    
    // Download the file
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `CRPS-Game-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  generateGameReplayHTML(gameStates) {
    const title = `CRPS Game Replay - ${new Date().toLocaleDateString()}`;
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body {
            font-family: sans-serif;
            background: #fff;
            color: #111;
            margin: 0;
            padding: 20px;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        .container {
            text-align: center;
            background: #fff;
            border-radius: 20px;
            padding: 30px;
            max-width: 900px;
            width: 100%;
            box-shadow: 0 4px 24px #0001;
        }
        h1 { margin-top: 0; color: #111; letter-spacing: 1px; }
        .controls {
            margin: 20px 0;
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 20px;
            flex-wrap: wrap;
        }
        button {
            padding: 12px 20px;
            font-size: 16px;
            border: none;
            border-radius: 8px;
            background: #eee;
            color: #111;
            cursor: pointer;
            transition: all .2s;
        }
        button:hover {
            background: #ddd;
            transform: translateY(-2px);
        }
        button:disabled {
            opacity: .5;
            cursor: not-allowed;
            transform: none;
        }
        .state-info {
            font-size: 18px;
            margin: 10px 0;
            font-weight: bold;
            color: #111;
        }
        .player-info {
            font-size: 16px;
            margin: 5px 0;
            color: #666;
        }
        #game-canvas {
            border: 2px solid #111;
            border-radius: 12px;
            margin: 20px auto;
            display: block;
            background: #fff;
            box-shadow: 0 8px 25px #0001;
        }
        .instructions {
            margin-top: 20px;
            font-size: 14px;
            opacity: .7;
            line-height: 1.6;
        }
        .error {
            color: #b00020;
            background: #f8d7da;
            padding: 12px;
            border-radius: 8px;
            margin: 20px 0;
            font-size: 1.1em;
        }
        .game-info {
            background: #f5f5f5;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>${title}</h1>
        <div class="game-info">
            <strong>CRPS Rules:</strong> Player A can only remove rows, Player B can only remove columns.<br>
            <strong>Fragments:</strong> Independent rectangular groups that split when moves create disconnected areas.<br>
            <strong>Victory:</strong> The player who cannot make a legal move loses.
        </div>
        <div class="state-info">
            State <span id="current-state">1</span> of <span id="total-states">${gameStates.length}</span>
        </div>
        <div class="player-info" id="player-info">Initial Position</div>
        <div class="controls">
            <button id="first-btn" onclick="goToState(0)">⏮ First</button>
            <button id="prev-btn" onclick="previousState()">◀ Previous</button>
            <button id="play-btn" onclick="toggleAutoplay()">▶ Play</button>
            <button id="next-btn" onclick="nextState()">Next ▶</button>
            <button id="last-btn" onclick="goToState(gameStates.length-1)">Last ⏭</button>
        </div>
        <canvas id="game-canvas" width="800" height="600"></canvas>
        <div id="error-message" class="error" style="display:none"></div>
        <div class="instructions">
            <strong>Navigation:</strong> Use ←/→ keys or the buttons above.<br>
            <strong>Autoplay:</strong> Press Play to advance automatically.<br>
            <strong>CRPS Rules:</strong> Asymmetric moves with independent fragments create deep strategic complexity.
        </div>
    </div>

<script>
const gameStates = ${JSON.stringify(gameStates, (key, value) => {
  if (key === 'grid' && Array.isArray(value)) {
    return value;
  }
  return value;
})};
let currentStateIndex = 0;
let autoplayInterval = null;
const CELL_SIZE = 30;
const GAP_SIZE = 25;
const LABEL_SIZE = 15;

function initReplay() {
    if (gameStates.length === 0) {
        showError("No game states to display.");
        return;
    }
    goToState(0);
    
    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            previousState();
        } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            nextState();
        } else if (e.key === ' ') {
            e.preventDefault();
            toggleAutoplay();
        }
    });
}

function goToState(index) {
    if (index < 0 || index >= gameStates.length) return;
    
    currentStateIndex = index;
    renderState(gameStates[index]);
    updateUI();
}

function nextState() {
    if (currentStateIndex < gameStates.length - 1) {
        goToState(currentStateIndex + 1);
    }
}

function previousState() {
    if (currentStateIndex > 0) {
        goToState(currentStateIndex - 1);
    }
}

function toggleAutoplay() {
    const playBtn = document.getElementById('play-btn');
    
    if (autoplayInterval) {
        clearInterval(autoplayInterval);
        autoplayInterval = null;
        playBtn.textContent = '▶ Play';
    } else {
        playBtn.textContent = '⏸ Pause';
        autoplayInterval = setInterval(() => {
            if (currentStateIndex < gameStates.length - 1) {
                nextState();
            } else {
                toggleAutoplay();
            }
        }, 1500);
    }
}

function updateUI() {
    document.getElementById('current-state').textContent = currentStateIndex + 1;
    document.getElementById('total-states').textContent = gameStates.length;
    
    // Update player info
    const playerInfoEl = document.getElementById('player-info');
    const state = gameStates[currentStateIndex];
    
    if (currentStateIndex === 0) {
        playerInfoEl.textContent = 'Initial Position';
    } else if (state && state.player) {
        const player = state.player === 'Red' ? 'A' : 'B';
        const moveType = state.player === 'Red' ? 'Rows' : 'Columns';
        playerInfoEl.textContent = \`Move \${currentStateIndex} - Player \${player} (\${moveType} only)\`;
    } else {
        playerInfoEl.textContent = \`Move \${currentStateIndex}\`;
    }
    
    // Update button states
    document.getElementById('first-btn').disabled = currentStateIndex === 0;
    document.getElementById('prev-btn').disabled = currentStateIndex === 0;
    document.getElementById('next-btn').disabled = currentStateIndex === gameStates.length - 1;
    document.getElementById('last-btn').disabled = currentStateIndex === gameStates.length - 1;
}

function renderState(state) {
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    if (!state.fragments || state.fragments.length === 0) {
        ctx.fillStyle = '#999';
        ctx.font = '24px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Empty Board - Game Over', canvas.width / 2, canvas.height / 2);
        return;
    }
    
    // Calculate total bounds for centering
    let maxX = 0, maxY = 0;
    state.fragments.forEach(fragment => {
        const fragX = (fragment.x || 0) + fragment.cols * CELL_SIZE;
        const fragY = (fragment.y || 0) + fragment.rows * CELL_SIZE;
        maxX = Math.max(maxX, fragX);
        maxY = Math.max(maxY, fragY);
    });
    
    const offsetX = Math.max(0, (canvas.width - maxX - GAP_SIZE * 2) / 2);
    const offsetY = Math.max(0, (canvas.height - maxY - GAP_SIZE * 2) / 2);
    
    // Draw each fragment
    state.fragments.forEach((fragment, fIdx) => {
        drawFragment(ctx, fragment, fIdx, offsetX + GAP_SIZE + (fragment.x || 0), offsetY + GAP_SIZE + (fragment.y || 0));
    });
    
    hideError();
}

function drawFragment(ctx, fragment, fIdx, startX, startY) {
    if (!fragment.grid || !Array.isArray(fragment.grid)) return;
    
    const rows = fragment.rows || fragment.grid.length;
    const cols = fragment.cols || (rows > 0 ? fragment.grid[0].length : 0);
    
    // Draw tiles
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (fragment.grid[r] && fragment.grid[r][c]) {
                const x = startX + c * CELL_SIZE;
                const y = startY + r * CELL_SIZE;
                
                // Draw tile with gradient
                const gradient = ctx.createLinearGradient(x, y, x + CELL_SIZE, y + CELL_SIZE);
                gradient.addColorStop(0, '#68d391');
                gradient.addColorStop(1, '#48bb78');
                
                ctx.fillStyle = gradient;
                ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
                
                // Draw border
                ctx.strokeStyle = '#2f855a';
                ctx.lineWidth = 1;
                ctx.strokeRect(x, y, CELL_SIZE, CELL_SIZE);
            }
        }
    }
    
    // Draw row labels
    for (let r = 0; r < rows; r++) {
        const hasRowTiles = fragment.grid[r] && fragment.grid[r].some(cell => cell);
        if (hasRowTiles) {
            const x = startX - LABEL_SIZE;
            const y = startY + r * CELL_SIZE + CELL_SIZE / 2;
            
            ctx.fillStyle = '#666';
            ctx.fillRect(x, startY + r * CELL_SIZE, LABEL_SIZE, CELL_SIZE);
            
            ctx.fillStyle = '#fff';
            ctx.font = '10px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(r.toString(), x + LABEL_SIZE / 2, y + 3);
        }
    }
    
    // Draw column labels
    for (let c = 0; c < cols; c++) {
        const hasColTiles = fragment.grid.some(row => row && row[c]);
        if (hasColTiles) {
            const x = startX + c * CELL_SIZE + CELL_SIZE / 2;
            const y = startY - LABEL_SIZE;
            
            ctx.fillStyle = '#666';
            ctx.fillRect(startX + c * CELL_SIZE, y, CELL_SIZE, LABEL_SIZE);
            
            ctx.fillStyle = '#fff';
            ctx.font = '10px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(c.toString(), x, y + LABEL_SIZE / 2 + 3);
        }
    }
}

function showError(message) {
    const errorEl = document.getElementById('error-message');
    errorEl.textContent = message;
    errorEl.style.display = 'block';
}

function hideError() {
    const errorEl = document.getElementById('error-message');
    errorEl.style.display = 'none';
}

window.addEventListener('load', initReplay);
</script>
</body>
</html>`;
  }

  async storeGameInDatabase(winner) {
    try {
      if (window.DatabaseUtils) {
        await window.DatabaseUtils.storeGameInDatabase(
          'CRPS',
          this.initialPartition,
          this.movesSequence,
          winner && winner.charAt(0),
          this.gameStartTime
        );
      }
    } catch (err) {
      console.warn('Database save failed:', err.message);
    }
  }
}  

// Initialize game when page loads  
window.addEventListener('load',()=>{  
  new CRPS_GUI();  
}); 