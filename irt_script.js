// ────────────────────────────────────────────────────────────  
// 1.  Young-diagram model  (legal-move engine corrected)  
// ────────────────────────────────────────────────────────────  
class Board {  
  constructor(rows) {                    // non-increasing positive ints  
    this.rows = [...rows];  
  }  
  clone()   { return new Board(this.rows); }  
  height()  { return this.rows.length; }  
  width()   { return this.rows.length ? Math.max(...this.rows) : 0; }  
  isEmpty() { return this.rows.length === 0; }  
  key()     { return JSON.stringify(this.rows); }  
  
  /* Legal moves = { r, newLen }  (shorten row r to newLen)                */  
  legalMoves() {  
    const moves = [];  
    const last  = this.rows.length - 1;  
    for (let r = 0; r <= last; r++) {  
      const len   = this.rows[r];  
      const below = (r < last) ? this.rows[r + 1] : 0;  
  
      /* Row is selectable when:                                             
           – it is the bottom row, OR                                        
           – it is strictly longer than the row below                      */  
      if (r < last && len <= below) continue;  
  
      /*  Minimum blocks that must remain after shortening.                   
          Bottom row → may be 0 (can delete it).                             
          Other rows → at least max(below, 1).                              */  
      const minKeep = (r === last) ? 0 : Math.max(below, 1);  
  
      for (let newLen = minKeep; newLen <= len - 1; newLen++) {  
        moves.push({ r, newLen });  
      }  
    }  
    return moves;  
  }  
  
  /* Produce a new board after executing move m                            */  
  applyMove({ r, newLen }) {  
    const next = this.clone();  
    next.rows[r] = newLen;  
  
    /* Trim any zero-length rows at the bottom                              */  
    while (next.rows.length && next.rows[next.rows.length - 1] === 0) {  
      next.rows.pop();  
    }  
    return next;  
  }  
  
  /* Utility for drawing                                                   */  
  squares() {  
    const list = [];  
    this.rows.forEach((len, r) => {  
      for (let c = 0; c < len; c++) list.push({ r, c });  
    });  
    return list;  
  }  
}  
  
// ────────────────────────────────────────────────────────────  
// 2.  Grundy memoisation  (perfect play value)  
// ────────────────────────────────────────────────────────────  
const gMemo = new Map();  
function grundy(board) {  
  const k = board.key();  
  if (gMemo.has(k)) return gMemo.get(k);  
  if (board.isEmpty()) { gMemo.set(k, 0); return 0; }  
  
  const childVals = new Set(  
    board.legalMoves().map(m => grundy(board.applyMove(m)))  
  );  
  let g = 0; while (childVals.has(g)) g++;  
  gMemo.set(k, g); return g;  
}  
function perfectMove(board) {  
  for (const m of board.legalMoves())  
    if (grundy(board.applyMove(m)) === 0) return m;  
  return board.legalMoves()[0];               // no winning move  
}  
  
// ────────────────────────────────────────────────────────────  
// 3.  Game container  
// ────────────────────────────────────────────────────────────  
class Game {  
  static PLAYERS = ["A", "B"];  
  constructor(rows, aiPlayer, level) {  
    this.board  = new Board(rows);  
    this.turn   = 0;                                    // 0 → A  
    this.aiSide = aiPlayer ? Game.PLAYERS.indexOf(aiPlayer) : null;  
    this.level  = level;                                // Easy | Medium | Hard  
  }  
  player()   { return Game.PLAYERS[this.turn]; }  
  isAiTurn() { return this.turn === this.aiSide; }  
  random()   { const L=this.board.legalMoves(); return L[Math.floor(Math.random()*L.length)]; }  
  aiMove() {  
    if (this.level === "Hard")   return perfectMove(this.board);  
    if (this.level === "Easy")   return this.random();  
    return Math.random()<0.3 ? this.random() : perfectMove(this.board); // Medium  
  }  
  move(m) {  
    this.board = this.board.applyMove(m);  
    const over = this.board.isEmpty();  
    if (!over) this.turn = 1 - this.turn;  
    return over;  
  }  
}  
  
// ────────────────────────────────────────────────────────────  
// 4.  Sound helper  
// ────────────────────────────────────────────────────────────  
const Sound = {  
  s:{},  
  init(){ ["hover","remove","win","click"].forEach(id=>this.s[id]=document.getElementById(`sound-${id}`)); },  
  play(id){ const a=this.s[id]; if(!a) return; a.currentTime=0; a.play().catch(()=>{}); }  
};  
  
// ────────────────────────────────────────────────────────────  
// 5.  GUI controller   (hover logic updated)  
// ────────────────────────────────────────────────────────────  
class IRTGui {  
  CELL=40; MARGIN=20; ANIM=350; AI_WAIT=650;  
  
  constructor() {  
    /* canvas & misc */  
    this.canvas = document.getElementById("game-canvas");  
    this.ctx    = this.canvas.getContext("2d");  
    this.card   = document.getElementById("game-card");  
    this.status = document.getElementById("status-label");  
    this.dots   = document.getElementById("ai-thinking-indicator");  
  
    /* modals + inputs */  
    this.setupB = document.getElementById("setup-modal-backdrop");  
    this.overB  = document.getElementById("game-over-modal-backdrop");  
    this.msg    = document.getElementById("game-over-message");  
    this.rowsIn = document.getElementById("rows-input");  
    this.aiSel  = document.getElementById("ai-select");  
    this.diffSel= document.getElementById("difficulty-select");  
    this.themeSel=document.getElementById("theme-select");  
    this.themeT = document.getElementById("theme-toggle");  
  
    /* buttons */  
    document.getElementById("start-game-btn").onclick = ()=>this.start();  
    document.getElementById("play-again-btn").onclick = ()=>this.showSetup();  
    document.getElementById("new-game-btn").onclick   = ()=>this.showSetup();  
  
    /* theme & help */  
    this.themeT.onchange = ()=>this.toggleTheme();  
    const helpBtn  = document.getElementById("help-btn");  
    const helpPop  = document.getElementById("help-popover");  
    helpBtn.onmouseenter = ()=>helpPop.classList.add("visible");  
    helpBtn.onmouseleave = ()=>helpPop.classList.remove("visible");  
  
    /* canvas interaction */  
    this.canvas.onmousemove = e=>this.hover(e);  
    this.canvas.onmouseleave= ()=>this.clearHover();  
    this.canvas.onclick     = ()=>this.tryHumanMove();  
  
    /* state */  
    this.game=null; this.hoverMove=null; this.anim=false;  
  
    /* boot */  
    this.initTheme(); Sound.init(); this.showSetup();  
  }  
  
  /* ---------- game start / AI ---------- */  
  start() {  
    const rows = this.rowsIn.value.trim().split(/\s+/).map(Number)  
                  .filter(n=>Number.isInteger(n)&&n>0);  
    if (!rows.length || rows.some((n,i,a)=>i && n>a[i-1])) {  
      alert("Enter a non-increasing list of positive integers.");  
      return;  
    }  
    const ai = this.aiSel.value==="None"?null:this.aiSel.value;  
    this.game = new Game(rows, ai, this.diffSel.value);  
    this.card.setAttribute("data-tile-theme", this.themeSel.value);  
  
    this.setupB.classList.remove("visible");  
    this.draw(); this.updateStatus();  
    if (this.game.isAiTurn()) this.aiTurn();  
  }  
  aiTurn() {  
    this.dots.classList.add("thinking");  
    setTimeout(()=>{  
      const m=this.game.aiMove();  
      this.dots.classList.remove("thinking");  
      this.execute(m);  
    }, this.AI_WAIT);  
  }  
  
  /* ---------- hover / click ---------- */  
  hover(evt){  
    if(!this.game || this.game.isAiTurn() || this.anim) return;  
    const {x,y}=this.rel(evt);  
    const r=Math.floor((y-this.MARGIN)/this.CELL);  
    const c=Math.floor((x-this.MARGIN)/this.CELL);  
    let m=null;  
    if(r>=0 && r<this.game.board.height()){  
      const len=this.game.board.rows[r];  
      const last=this.game.board.height()-1;  
      const below=(r<last)?this.game.board.rows[r+1]:0;  
      const selectable = (r===last) || (len>below);  
      if(selectable){  
        const minKeep = (r===last)?0:Math.max(below,1);  
        if(c>=minKeep && c<=len-1){ m={r,newLen:c}; }  
      }  
    }  
    if(JSON.stringify(m)!==JSON.stringify(this.hoverMove)){  
      this.hoverMove=m; this.highlight(m);  
    }  
    this.canvas.classList.toggle("clickable",!!m);  
  }  
  tryHumanMove(){  
    if(this.game && !this.game.isAiTurn() && !this.anim && this.hoverMove)  
      this.execute(this.hoverMove);  
  }  
  clearHover(){ this.hoverMove=null; this.highlight(null); }  
  
  /* ---------- execute move ---------- */  
  execute(m){  
    this.anim=true; Sound.play("remove");  
    const len=this.game.board.rows[m.r];  
    for(let c=m.newLen;c<len;c++)  
      document.getElementById(`t-${m.r}-${c}`)?.classList.add("removing");  
  
    setTimeout(()=>{  
      const done=this.game.move(m);  
      this.anim=false; this.draw();  
      if(done){  
        Sound.play("win");  
        this.msg.textContent=`Player ${this.game.player()} wins!`;  
        this.overB.classList.add("visible");  
      }else{  
        this.updateStatus();  
        if(this.game.isAiTurn()) this.aiTurn();  
      }  
    }, this.ANIM);  
  }  
  
  /* ---------- drawing ---------- */  
  draw(){  
    this.card.querySelectorAll(".tile").forEach(t=>t.remove());  
    const w=this.MARGIN*2+this.game.board.width()*this.CELL;  
    const h=this.MARGIN*2+this.game.board.height()*this.CELL;  
    this.canvas.width=w; this.canvas.height=h;  
    this.ctx.clearRect(0,0,w,h);  
    this.ctx.strokeStyle=getComputedStyle(document.documentElement)  
                         .getPropertyValue("--border-color").trim();  
    this.ctx.lineWidth=1;  
  
    this.game.board.squares().forEach(({r,c})=>{  
      const sx=this.MARGIN+c*this.CELL+.5;  
      const sy=this.MARGIN+r*this.CELL+.5;  
      this.ctx.strokeRect(sx,sy,this.CELL,this.CELL);  
  
      const d=document.createElement("div");  
      d.className="tile"; d.id=`t-${r}-${c}`;  
      d.style.width=d.style.height=`${this.CELL}px`;  
      d.style.left=`${this.canvas.offsetLeft+sx}px`;  
      d.style.top =`${this.canvas.offsetTop +sy}px`;  
      this.card.appendChild(d);  
    });  
  }  
  highlight(m){  
    this.card.querySelectorAll(".tile").forEach(t=>t.classList.remove("highlighted"));  
    if(!m) return;  
    const len=this.game.board.rows[m.r];  
    for(let c=m.newLen;c<len;c++)  
      document.getElementById(`t-${m.r}-${c}`)?.classList.add("highlighted");  
    Sound.play("hover");  
  }  
  
  /* ---------- misc helpers ---------- */  
  updateStatus(){  
    const who=this.game.isAiTurn()?"Computer":"Human";  
    this.status.textContent=`Player ${this.game.player()} (${who}) to move`;  
  }  
  rel(evt){ const r=this.canvas.getBoundingClientRect(); return {x:evt.clientX-r.left, y:evt.clientY-r.top}; }  
  
  /* theme */  
  initTheme(){  
    const t=localStorage.getItem("theme")||"light";  
    document.documentElement.setAttribute("data-theme",t);  
    this.themeT.checked=(t==="dark");  
  }  
  toggleTheme(){  
    const t=this.themeT.checked?"dark":"light";  
    document.documentElement.setAttribute("data-theme",t);  
    localStorage.setItem("theme",t);  
  }  
  
  /* modal */  
  showSetup(){ this.overB.classList.remove("visible"); this.setupB.classList.add("visible"); }  
}  
  
// ────────────────────────────────────────────────────────────  
// 6.  Boot  
// ────────────────────────────────────────────────────────────  
window.onload = ()=>{ new IRTGui(); };  