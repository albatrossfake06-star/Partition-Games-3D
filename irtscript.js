// --- CORE GAME LOGIC ---
class Board {
    constructor(rows) {
        // Convert from row lengths (e.g., [3, 2]) to a 2D grid (e.g., [[1,1,1], [1,1,0]])
        const width = rows.length > 0 ? Math.max(0, ...rows) : 0;
        this.grid = rows.map(len => Array.from({ length: width }, (_, i) => i < len ? 1 : 0));
    }
    
    isEmpty() { return this.grid.length === 0 || this.grid[0].length === 0; }
    height() { return this.grid.length; }
    width() { return this.grid.length > 0 ? this.grid[0].length : 0; }

    removeRow(index) {
        if (index >= 0 && index < this.height()) {
            this.grid.splice(index, 1);
        }
    }
    
    squares() {
        const coords = [];
        for (let r = 0; r < this.height(); r++) {
            for (let c = 0; c < this.width(); c++) {
                if (this.grid[r][c] === 1) {
                    coords.push({ r, c });
                }
            }
        }
        return coords;
    }

    asTuple() {
        // Convert back to canonical row-length format for memoization
        const rowLengths = this.grid.map(row => row.reduce((sum, cell) => sum + cell, 0)).filter(len => len > 0);
        return JSON.stringify(rowLengths.sort((a, b) => b - a));
    }
}

const grundyMemo = new Map();

function getRowLengthsFromTuple(position) {
    return JSON.parse(position);
}

function grundy(position) {
    if (position === '[]') return 0;
    if (grundyMemo.has(position)) return grundyMemo.get(position);
    
    const posArray = getRowLengthsFromTuple(position);
    const childrenStates = new Set();

    // Generate children for removing ANY row (IRT only allows row removal)
    for (let i = 0; i < posArray.length; i++) {
        const nextPos = [...posArray];
        nextPos.splice(i, 1);
        childrenStates.add(JSON.stringify(nextPos.sort((a, b) => b - a)));
    }
    
    const childValues = new Set();
    for (const state of childrenStates) {
        childValues.add(grundy(state));
    }

    let g = 0;
    while (childValues.has(g)) { g++; }
    grundyMemo.set(position, g);
    return g;
}

function perfectMove(position) {
    if (position === '[]') throw new Error("No legal move");
    const posArray = getRowLengthsFromTuple(position);

    if (grundy(position) !== 0) {
        // Check row moves only (IRT game rule)
        for (let i = 0; i < posArray.length; i++) {
            const nextPos = [...posArray];
            nextPos.splice(i, 1);
            if (grundy(JSON.stringify(nextPos.sort((a, b) => b - a))) === 0) {
                return { type: 'row', index: i };
            }
        }
    }
    
    // If losing, make any legal move (first row)
    if (posArray.length > 0) return { type: 'row', index: 0 };
    throw new Error("Could not find a legal move.");
}

class Game {
    static PLAYERS = ["A", "B"];
    constructor(board, aiPlayer) { this.board = board; this.currentIndex = 0; this.aiIndex = aiPlayer ? Game.PLAYERS.indexOf(aiPlayer) : null; }
    get currentPlayer() { return Game.PLAYERS[this.currentIndex]; }
    isAiTurn() { return this.aiIndex === this.currentIndex; }
    switchPlayer() { this.currentIndex = 1 - this.currentIndex; }
    makeMove(move) {
        // IRT only allows row removal
        if (move.type === "row") { this.board.removeRow(move.index); }
        const finished = this.board.isEmpty();
        if (!finished) this.switchPlayer();
        return finished;
    }
}

function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randomPartition(n) { let parts = []; let remaining = n; let maxPart = n; while (remaining > 0) { let part = randomInt(1, Math.min(remaining, maxPart)); parts.push(part); remaining -= part; maxPart = part; } return parts; }

const SoundManager = {
    sounds: {},
    init() { this.sounds.hover = document.getElementById('sound-hover'); this.sounds.remove = document.getElementById('sound-remove'); this.sounds.win = document.getElementById('sound-win'); this.sounds.click = document.getElementById('sound-click'); this.sounds.hover.volume = 0.3; this.sounds.click.volume = 0.5; this.sounds.remove.volume = 0.4; },
    play(soundName) { const sound = this.sounds[soundName]; if (sound) { sound.currentTime = 0; sound.play().catch(e => {}); } }
};

class ProLCTRGui {
    constructor() {
        this.CELL = 40; this.MARGIN = 20; this.ANIMATION_MS = 500; this.AI_THINK_MS = 800;
        this.game = null; this.hoveredMove = null; this.isAnimating = false; this.aiDifficulty = 'Medium';
        this.getDOMElements();
        this.bindEventListeners();
        this.initTheme();
        SoundManager.init();
    }

    getDOMElements() {
        this.gameCard = document.getElementById('game-card');
        this.statusLabel = document.getElementById('status-label');
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.aiThinkingIndicator = document.getElementById('ai-thinking-indicator');
        this.newGameBtn = document.getElementById('new-game-btn');
        this.themeToggle = document.getElementById('theme-toggle');
        this.setupModal = document.getElementById('setup-modal-backdrop');
        this.gameOverModal = document.getElementById('game-over-modal-backdrop');
        this.rowsInput = document.getElementById('rows-input');
        this.randomizeBtnGeneral = document.getElementById('randomize-btn-general');
        this.specificNumberInput = document.getElementById('specific-number-input');
        this.randomizeBtnSpecific = document.getElementById('randomize-btn-specific');
        this.aiSelect = document.getElementById('ai-select');
        this.difficultySelect = document.getElementById('difficulty-select');
        this.themeSelect = document.getElementById('theme-select');
        this.startGameBtn = document.getElementById('start-game-btn');
        this.playAgainBtn = document.getElementById('play-again-btn');
        this.gameOverMessage = document.getElementById('game-over-message');
        this.helpBtn = document.getElementById('help-btn');
        this.helpBtnModal = document.getElementById('help-btn-modal');
        this.helpPopover = document.getElementById('help-popover');
    }

    bindEventListeners() {
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseleave', () => this.handleMouseLeave());
        this.canvas.addEventListener('click', () => this.handleMouseClick());
        this.startGameBtn.addEventListener('click', () => this.processSetup());
        this.newGameBtn.addEventListener('click', () => { SoundManager.play('click'); this.showSetupModal(); });
        this.playAgainBtn.addEventListener('click', () => { SoundManager.play('click'); this.showSetupModal(); });
        this.themeToggle.addEventListener('change', () => { SoundManager.play('click'); this.toggleTheme(); });
        this.helpBtn.addEventListener('mouseenter', () => this.showHelp());
        this.helpBtn.addEventListener('mouseleave', () => this.hideHelp());
        if (this.helpBtnModal) {
            this.helpBtnModal.addEventListener('mouseenter', () => this.showHelp());
            this.helpBtnModal.addEventListener('mouseleave', () => this.hideHelp());
        }
        if (this.randomizeBtnGeneral) {
            this.randomizeBtnGeneral.addEventListener('click', () => this.generateGeneralRandomBoard());
        }
        if (this.randomizeBtnSpecific) {
            this.randomizeBtnSpecific.addEventListener('click', () => this.generateSpecificRandomBoard());
        }
    }

    redrawBoard() {
        this.gameCard.querySelectorAll('.tile').forEach(tile => tile.remove());
        if (!this.game) return;
        const boardWidth = this.MARGIN * 2 + this.game.board.width() * this.CELL;
        const boardHeight = this.MARGIN * 2 + this.game.board.height() * this.CELL;
        this.canvas.width = Math.max(boardWidth, 2 * this.MARGIN);
        this.canvas.height = Math.max(boardHeight, 2 * this.MARGIN);
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--border-color').trim();
        this.ctx.lineWidth = 1;
        this.game.board.squares().forEach(({ r, c }) => {
            this.ctx.strokeRect(this.MARGIN + c * this.CELL + 0.5, this.MARGIN + r * this.CELL + 0.5, this.CELL, this.CELL);
        });
        this.game.board.squares().forEach(({ r, c }) => {
            const tile = document.createElement('div');
            tile.className = 'tile';
            tile.id = `tile-${r}-${c}`;
            tile.style.width = `${this.CELL}px`;
            tile.style.height = `${this.CELL}px`;
            tile.style.left = `${this.canvas.offsetLeft + this.MARGIN + c * this.CELL}px`;
            tile.style.top = `${this.canvas.offsetTop + this.MARGIN + r * this.CELL}px`;
            this.gameCard.appendChild(tile);
        });
    }

    handleMouseMove(event) {
        if (!this.game || this.game.isAiTurn() || this.isAnimating) return;
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        let detectedMove = null;

        // IRT only allows row selection
        const hoveredRow = Math.floor((mouseY - this.MARGIN) / this.CELL);
        if (hoveredRow >= 0 && hoveredRow < this.game.board.height()) {
            const rowWidth = this.game.board.grid[hoveredRow].reduce((s, c) => s + c, 0) * this.CELL;
            if (mouseX >= this.MARGIN && mouseX <= this.MARGIN + rowWidth) {
                detectedMove = { type: 'row', index: hoveredRow };
            }
        }

        const a = JSON.stringify(detectedMove);
        const b = JSON.stringify(this.hoveredMove);
        if (a !== b) {
            if (detectedMove) SoundManager.play('hover');
            this.hoveredMove = detectedMove;
            this.gameCard.querySelectorAll('.tile.highlighted').forEach(t => t.classList.remove('highlighted'));
            if (this.hoveredMove) {
                const rowIndex = this.hoveredMove.index;
                for (let c = 0; c < this.game.board.width(); c++) {
                    if (this.game.board.grid[rowIndex][c] === 1) {
                        document.getElementById(`tile-${rowIndex}-${c}`)?.classList.add('highlighted');
                    }
                }
            }
        }
        this.canvas.classList.toggle('clickable', !!this.hoveredMove);
    }

    executeWithAnimation(move) {
        if (this.isAnimating) return;
        this.isAnimating = true;
        this.handleMouseLeave();
        SoundManager.play('remove');
        
        // IRT only handles row removal
        if (move.type === 'row') {
            const removedIndex = move.index;
            for (let c = 0; c < this.game.board.width(); c++) {
                if (this.game.board.grid[removedIndex][c] === 1) {
                    document.getElementById(`tile-${removedIndex}-${c}`)?.classList.add('removing');
                }
            }
            for (let r = removedIndex + 1; r < this.game.board.height(); r++) {
                for (let c = 0; c < this.game.board.width(); c++) {
                    const tile = document.getElementById(`tile-${r}-${c}`);
                    if (tile) { tile.style.top = `${parseInt(tile.style.top) - this.CELL}px`; }
                }
            }
        }
        setTimeout(() => this.finishMove(move), this.ANIMATION_MS);
    }
    
    finishMove(move) {
        const winner = this.game.currentPlayer;
        const finished = this.game.makeMove(move);
        this.isAnimating = false;
        if (finished) {
            SoundManager.play('win');
            this.gameOverMessage.textContent = `Player ${winner} wins!`;
            this.gameOverModal.classList.add('visible');
            this.redrawBoard();
            this.updateStatus();
            return;
        }
        this.redrawBoard();
        this.updateStatus();
        if (this.game.isAiTurn()) { this.aiTurn(); }
    }

    generateGeneralRandomBoard() { SoundManager.play('click'); const n = randomInt(15, 40); const partition = randomPartition(n); this.rowsInput.value = partition.join(' '); }
    generateSpecificRandomBoard() { SoundManager.play('click'); const n = parseInt(this.specificNumberInput.value, 10); if (isNaN(n) || n <= 0 || n > 200) { alert("Please enter a positive number less than or equal to 200."); return; } const partition = randomPartition(n); this.rowsInput.value = partition.join(' '); }
    processSetup() { try { SoundManager.play('click'); const nums = this.rowsInput.value.trim().split(/\s+/).map(Number).filter(n => n > 0).sort((a,b) => b-a); if (nums.length === 0 && this.rowsInput.value.trim() !== '0') { this.startGame([], null); this.setupModal.classList.remove('visible'); return; } const aiSide = this.aiSelect.value === "None" ? null : this.aiSelect.value; this.aiDifficulty = this.difficultySelect.value; this.gameCard.setAttribute('data-tile-theme', this.themeSelect.value); this.setupModal.classList.remove('visible'); this.startGame(nums, aiSide); } catch (e) { alert("Invalid input. Please enter positive integers only."); } }
    startGame(rows, aiSide) { this.game = new Game(new Board(rows), aiSide); this.hoveredMove = null; this.isAnimating = false; this.redrawBoard(); this.updateStatus(); if (this.game.isAiTurn()) { this.aiTurn(); } }
    aiTurn() { if (!this.game || !this.game.isAiTurn() || this.isAnimating) return; this.aiThinkingIndicator.classList.add('thinking'); setTimeout(() => { this.aiThinkingIndicator.classList.remove('thinking'); let move; const rand = Math.random(); const legalMoves = []; if (this.game.board.height() > 0) { for(let i=0; i<this.game.board.height(); i++) legalMoves.push({type: 'row', index: i}); } if ((this.aiDifficulty === 'Easy' && rand < 0.75) || (this.aiDifficulty === 'Medium' && rand < 0.30)) { move = legalMoves[Math.floor(Math.random() * legalMoves.length)]; } else { move = perfectMove(this.game.board.asTuple()); } this.executeWithAnimation(move); }, this.AI_THINK_MS); }
    handleMouseLeave() { this.hoveredMove = null; this.gameCard.querySelectorAll('.tile.highlighted').forEach(t => t.classList.remove('highlighted')); this.canvas.classList.remove('clickable'); }
    updateStatus() { if (!this.game || this.game.board.isEmpty()) { this.statusLabel.textContent = 'Game Over'; return; } const kind = this.game.isAiTurn() ? "Computer" : "Human"; const newText = `Player ${this.game.currentPlayer} (${kind}) to move`; if (this.statusLabel.textContent === newText) return; this.statusLabel.classList.add('exiting'); setTimeout(() => { this.statusLabel.textContent = newText; this.statusLabel.classList.remove('exiting'); }, 200); }
    handleMouseClick() { if (this.hoveredMove) { this.requestMove(this.hoveredMove); } }
    requestMove(move) { if (!this.isAnimating && !this.game.isAiTurn() && move) { this.executeWithAnimation(move); } }
    showHelp() { this.helpPopover.classList.add('visible'); }
    hideHelp() { this.helpPopover.classList.remove('visible'); }
    initTheme() { const savedTheme = localStorage.getItem('theme') || 'dark'; document.documentElement.setAttribute('data-theme', savedTheme); this.themeToggle.checked = savedTheme === 'dark'; }
    toggleTheme() { const newTheme = this.themeToggle.checked ? 'dark' : 'light'; document.documentElement.setAttribute('data-theme', newTheme); localStorage.setItem('theme', newTheme); }
    showSetupModal() { this.gameOverModal.classList.remove('visible'); this.setupModal.classList.add('visible'); }
}

window.onload = () => {
    const app = new ProLCTRGui();
    app.showSetupModal();
}; 