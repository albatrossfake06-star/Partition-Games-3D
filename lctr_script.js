// --- CORE GAME LOGIC ---

// Front page functionality

class Board {
    constructor(rows) { this.rows = [...rows]; }
    isEmpty() { return this.rows.length === 0; }
    height() { return this.rows.length; }
    width() { return this.rows.length ? Math.max(...this.rows) : 0; }
    removeTopRow() { this.rows.shift(); }
    removeLeftColumn() { this.rows = this.rows.map(r => r - 1).filter(r => r > 0); }
    squares() {
        const coords = [];
        for (let r = 0; r < this.rows.length; r++) { for (let c = 0; c < this.rows[r]; c++) coords.push({ r, c }); }
        return coords;
    }
    asTuple() { return JSON.stringify(this.rows); }
}
const grundyMemo = new Map();
function grundy(position) {
    if (position === '[]') return 0;
    if (grundyMemo.has(position)) return grundyMemo.get(position);
    const posArray = JSON.parse(position);
    const child1 = JSON.stringify(posArray.slice(1));
    const child2 = JSON.stringify(posArray.map(r => r - 1).filter(r => r > 0));
    const childValues = new Set([grundy(child1), grundy(child2)]);
    let g = 0;
    while (childValues.has(g)) { g++; }
    grundyMemo.set(position, g);
    return g;
}
function perfectMove(position) {
    if (position === '[]') throw new Error("No legal move");
    const posArray = JSON.parse(position);
    const childRow = JSON.stringify(posArray.slice(1));
    const childCol = JSON.stringify(posArray.map(r => r - 1).filter(r => r > 0));
    if (grundy(position) !== 0) {
        if (grundy(childRow) === 0) return "row";
        if (grundy(childCol) === 0) return "col";
    }
    return posArray.length > 0 ? "row" : "col";
}
class Game {
    static PLAYERS = ["A", "B"];
    constructor(board, aiPlayer) {
        this.board = board;
        this.currentIndex = 0;
        this.aiIndex = aiPlayer ? Game.PLAYERS.indexOf(aiPlayer) : null;
    }
    get currentPlayer() { return Game.PLAYERS[this.currentIndex]; }
    isAiTurn() { return this.aiIndex === this.currentIndex; }
    switchPlayer() { this.currentIndex = 1 - this.currentIndex; }
    makeMove(moveKind) {
        if (moveKind === "row") this.board.removeTopRow();
        else if (moveKind === "col") this.board.removeLeftColumn();
        const finished = this.board.isEmpty();
        if (!finished) this.switchPlayer();
        return finished;
    }
}

// --- SOUND MANAGER ---
const SoundManager = {
    sounds: {},
    init() {
        this.sounds.hover = document.getElementById('sound-hover');
        this.sounds.remove = document.getElementById('sound-remove');
        this.sounds.win = document.getElementById('sound-win');
        this.sounds.click = document.getElementById('sound-click');
        // Set volumes for a better mix
        this.sounds.hover.volume = 0.3;
        this.sounds.click.volume = 0.5;
        this.sounds.remove.volume = 0.4;
    },
    play(soundName) {
        const sound = this.sounds[soundName];
        if (sound) {
            sound.currentTime = 0;
            sound.play().catch(e => {
                // Ignore errors from rapid playback or user not interacting
            });
        }
    }
};

// --- GUI CONTROLLER ---
class ProLCTRGui {
    constructor() {
        this.CELL = 40;
        this.MARGIN = 20;
        this.ANIMATION_MS = 500;
        this.AI_THINK_MS = 800;
        this.game = null;
        this.hoveredMove = null;
        this.isAnimating = false;
        this.aiDifficulty = 'Medium';
        
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
        this.aiSelect = document.getElementById('ai-select');
        this.difficultySelect = document.getElementById('difficulty-select');
        this.themeSelect = document.getElementById('theme-select');
        this.startGameBtn = document.getElementById('start-game-btn');
        this.playAgainBtn = document.getElementById('play-again-btn');
        this.gameOverMessage = document.getElementById('game-over-message');
        this.helpBtn = document.getElementById('help-btn');
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
    }
    
    processSetup() {
        try {
            SoundManager.play('click');
            const nums = this.rowsInput.value.trim().split(/\s+/).map(Number);
            if (nums.length === 0 || nums.some(n => isNaN(n) || n <= 0)) throw new Error("Invalid input");
            
            const aiSide = this.aiSelect.value === "None" ? null : this.aiSelect.value;
            this.aiDifficulty = this.difficultySelect.value;
            this.gameCard.setAttribute('data-tile-theme', this.themeSelect.value);

            this.setupModal.classList.remove('visible');
            this.startGame(nums, aiSide);
        } catch (e) {
            alert("Invalid input. Please enter positive integers only.");
        }
    }

    startGame(rows, aiSide) {
        this.game = new Game(new Board(rows), aiSide);
        this.hoveredMove = null;
        this.isAnimating = false;
        this.redrawBoard();
        this.updateStatus();
        if (this.game.isAiTurn()) { this.aiTurn(); }
    }

    aiTurn() {
        if (!this.game || !this.game.isAiTurn() || this.isAnimating) return;
        
        this.aiThinkingIndicator.classList.add('thinking');
        
        setTimeout(() => {
            this.aiThinkingIndicator.classList.remove('thinking');
            let move;
            const rand = Math.random();
            const legalMoves = [];
            if (this.game.board.height() > 0) legalMoves.push('row');
            if (this.game.board.width() > 0) legalMoves.push('col');

            if ((this.aiDifficulty === 'Easy' && rand < 0.75) || (this.aiDifficulty === 'Medium' && rand < 0.30)) {
                move = legalMoves[Math.floor(Math.random() * legalMoves.length)];
            } else {
                move = perfectMove(this.game.board.asTuple());
            }
            this.executeWithAnimation(move);
        }, this.AI_THINK_MS);
    }
    
    handleMouseMove(event) {
        if (!this.game || this.game.isAiTurn() || this.isAnimating) return;
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        let detectedMove = null;
        
        // Special handling for top-left cell - edge-based hover
        const topLeftCellLeft = this.MARGIN;
        const topLeftCellTop = this.MARGIN;
        const topLeftCellRight = this.MARGIN + this.CELL;
        const topLeftCellBottom = this.MARGIN + this.CELL;
        
        if (this.game.board.height() > 0 && this.game.board.width() > 0 && 
            mouseX >= topLeftCellLeft && mouseX <= topLeftCellRight && 
            mouseY >= topLeftCellTop && mouseY <= topLeftCellBottom) {
            
            // Calculate distances to bottom and right edges
            const distToBottom = topLeftCellBottom - mouseY;
            const distToRight = topLeftCellRight - mouseX;
            
            // Determine which edge is closer
            if (distToBottom < distToRight) {
                detectedMove = 'col'; // Bottom edge → illuminate column
            } else {
                detectedMove = 'row'; // Right edge → illuminate row
            }
        }
        // Original logic for other areas
        else if (this.game.board.height() > 0 && mouseY >= this.MARGIN && mouseY <= this.MARGIN + this.CELL && mouseX >= this.MARGIN && mouseX <= this.MARGIN + this.game.board.rows[0] * this.CELL) {
            detectedMove = 'row';
        } else if (this.game.board.width() > 0 && mouseX >= this.MARGIN && mouseX <= this.MARGIN + this.CELL && mouseY >= this.MARGIN && mouseY <= this.MARGIN + this.game.board.height() * this.CELL) {
            detectedMove = 'col';
        }

        if (detectedMove !== this.hoveredMove) {
            if (detectedMove) SoundManager.play('hover');
            this.hoveredMove = detectedMove;
            this.gameCard.querySelectorAll('.tile.highlighted').forEach(t => t.classList.remove('highlighted'));
            if (this.hoveredMove === 'row') {
                for (let c = 0; c < this.game.board.rows[0]; c++) { document.getElementById(`tile-0-${c}`)?.classList.add('highlighted'); }
            } else if (this.hoveredMove === 'col') {
                for (let r = 0; r < this.game.board.height(); r++) { document.getElementById(`tile-${r}-0`)?.classList.add('highlighted'); }
            }
        }
        this.canvas.classList.toggle('clickable', !!this.hoveredMove);
    }

    handleMouseLeave() {
        this.hoveredMove = null;
        this.gameCard.querySelectorAll('.tile.highlighted').forEach(t => t.classList.remove('highlighted'));
        this.canvas.classList.remove('clickable');
    }

    executeWithAnimation(moveKind) {
        if (this.isAnimating) return;
        this.isAnimating = true;
        this.handleMouseLeave();
        SoundManager.play('remove');
        if (moveKind === 'row') {
            for (let c = 0; c < this.game.board.rows[0]; c++) { document.getElementById(`tile-0-${c}`)?.classList.add('removing'); }
            for (let r = 1; r < this.game.board.height(); r++) {
                for (let c = 0; c < this.game.board.rows[r]; c++) {
                    const tile = document.getElementById(`tile-${r}-${c}`);
                    if (tile) { tile.style.top = `${parseInt(tile.style.top) - this.CELL}px`; }
                }
            }
        } else { // 'col'
            for (let r = 0; r < this.game.board.height(); r++) { document.getElementById(`tile-${r}-0`)?.classList.add('removing'); }
        }
        setTimeout(() => this.finishMove(moveKind), this.ANIMATION_MS);
    }
    
    finishMove(moveKind) {
        const finished = this.game.makeMove(moveKind);
        this.isAnimating = false;
        if (finished) {
            SoundManager.play('win');
            this.gameOverMessage.textContent = `Player ${this.game.currentPlayer} wins!`;
            this.gameOverModal.classList.add('visible');
            this.redrawBoard();
            return;
        }
        this.redrawBoard();
        this.updateStatus();
        if (this.game.isAiTurn()) { this.aiTurn(); }
    }

    redrawBoard() {
        this.gameCard.querySelectorAll('.tile').forEach(tile => tile.remove());
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

    updateStatus() {
        if (!this.game) return;
        const kind = this.game.isAiTurn() ? "Computer" : "Human";
        const newText = `Player ${this.game.currentPlayer} (${kind}) to move`;
        if (this.statusLabel.textContent === newText) return;
        this.statusLabel.classList.add('exiting');
        setTimeout(() => {
            this.statusLabel.textContent = newText;
            this.statusLabel.classList.remove('exiting');
        }, 200);
    }
    
    handleMouseClick() { if (this.hoveredMove) { this.requestMove(this.hoveredMove); } }
    requestMove(moveKind) { if (!this.isAnimating && !this.game.isAiTurn() && moveKind) { this.executeWithAnimation(moveKind); } }
    showHelp() { this.helpPopover.classList.add('visible'); }
    hideHelp() { this.helpPopover.classList.remove('visible'); }
    initTheme() { const savedTheme = localStorage.getItem('theme') || 'light'; document.documentElement.setAttribute('data-theme', savedTheme); this.themeToggle.checked = savedTheme === 'dark'; }
    toggleTheme() { const newTheme = this.themeToggle.checked ? 'dark' : 'light'; document.documentElement.setAttribute('data-theme', newTheme); localStorage.setItem('theme', newTheme); }
    showSetupModal() { this.gameOverModal.classList.remove('visible'); this.setupModal.classList.add('visible'); }
}

window.onload = () => {
    const app = new ProLCTRGui();
    app.showSetupModal();
};