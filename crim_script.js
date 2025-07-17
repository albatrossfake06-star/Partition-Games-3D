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

    removeColumn(index) {
        if (index >= 0 && index < this.width()) {
            this.grid.forEach(row => row.splice(index, 1));
            // If a column removal makes all columns empty, remove the row
            this.grid = this.grid.filter(row => row.length > 0);
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

    // Methods to check which rows and columns are alive
    rowsAlive() {
        const alive = [];
        for (let r = 0; r < this.height(); r++) {
            if (this.grid[r].some(cell => cell === 1)) {
                alive.push(r);
            }
        }
        return alive;
    }

    colsAlive() {
        const alive = [];
        for (let c = 0; c < this.width(); c++) {
            for (let r = 0; r < this.height(); r++) {
                if (this.grid[r][c] === 1) {
                    alive.push(c);
                    break;
                }
            }
        }
        return alive;
    }

    hasMoves() {
        return this.rowsAlive().length > 0 || this.colsAlive().length > 0;
    }
}

const grundyMemo = new Map();

function getRowLengthsFromTuple(position) {
    return JSON.parse(position);
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

function grundy(position) {
    if (position === '[]') return 0;
    if (grundyMemo.has(position)) return grundyMemo.get(position);
    
    const posArray = getRowLengthsFromTuple(position);
    const childrenStates = new Set();
    const width = posArray.length > 0 ? posArray[0] : 0;

    // Generate children for removing ANY row
    for (let i = 0; i < posArray.length; i++) {
        const nextPos = [...posArray];
        nextPos.splice(i, 1);
        childrenStates.add(JSON.stringify(nextPos.sort((a, b) => b - a)));
    }

    // Generate children for removing ANY column
    for (let j = 0; j < width; j++) {
        const nextPos = posArray.map(len => len > j ? len - 1 : len).filter(len => len > 0);
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
    const width = posArray.length > 0 ? posArray[0] : 0;

    if (grundy(position) !== 0) {
        // Check row moves
        for (let i = 0; i < posArray.length; i++) {
            const nextPos = [...posArray];
            nextPos.splice(i, 1);
            if (grundy(JSON.stringify(nextPos.sort((a, b) => b - a))) === 0) {
                return { type: 'row', index: i };
            }
        }
        // Check column moves
        for (let j = 0; j < width; j++) {
            const nextPos = posArray.map(len => len > j ? len - 1 : len).filter(len => len > 0);
            if (grundy(JSON.stringify(nextPos.sort((a, b) => b - a))) === 0) {
                return { type: 'col', index: j };
            }
        }
    }
    
    // If losing, make any legal move (prioritize row)
    if (posArray.length > 0) return { type: 'row', index: 0 };
    if (width > 0) return { type: 'col', index: 0 };
    throw new Error("Could not find a legal move.");
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
    makeMove(move) {
        if (move.type === "row") { this.board.removeRow(move.index); } 
        else if (move.type === "col") { this.board.removeColumn(move.index); }
        const finished = this.board.isEmpty();
        if (!finished) this.switchPlayer();
        return finished;
    }
}

function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
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
    return parts; 
}

const SoundManager = {
    sounds: {},
    init() { 
        // Sound effects disabled
    },
    play(soundName) { 
        // Sound effects disabled
    }
};

class ProLCTRGui {
    constructor() {
        this.CELL = 40; 
        this.MARGIN = 20; 
        this.LABEL = 20;
        this.ANIMATION_MS = 500; 
        this.AI_THINK_MS = 800;
        this.game = null; 
        this.isAnimating = false; 
        this.aiDifficultyValue = 50;
        this.idCounter = 0;
        this.idToAddress = new Map();
        this.gameHistory = []; // Store previous game states for undo
        this.getDOMElements();
        this.bindEventListeners();
        this.initTheme();
        SoundManager.init();
    }

    getDOMElements() {
        this.gameCard = document.getElementById('game-card');
        this.statusLabel = document.getElementById('status-label');
        this.boardArea = document.getElementById('board-area');
        this.aiThinkingIndicator = document.getElementById('ai-thinking-indicator');
        this.newGameBtn = document.getElementById('new-game-btn');
        this.undoBtn = document.getElementById('undo-btn');
        this.themeToggle = document.getElementById('theme-toggle');
        this.setupModal = document.getElementById('setup-modal-backdrop');
        this.gameOverModal = document.getElementById('game-over-modal-backdrop');
        this.rowsInput = document.getElementById('rows-input');
        this.partitionTypeSelect = document.getElementById('partition-type-select');
        this.partitionNumberInput = document.getElementById('partition-number-input');
        this.generatePartitionBtn = document.getElementById('generate-partition-btn');
        this.aiSelect = document.getElementById('ai-select');
        this.difficultySlider = document.getElementById('difficulty-slider');
        this.difficultyLabel = document.getElementById('difficulty-label');
        this.themeSelect = document.getElementById('theme-select');
        this.startGameBtn = document.getElementById('start-game-btn');
        this.playAgainBtn = document.getElementById('play-again-btn');
        this.gameOverMessage = document.getElementById('game-over-message');
        this.helpBtn = document.getElementById('help-btn');
        this.helpBtnModal = document.getElementById('help-btn-modal');
        this.helpPopover = document.getElementById('help-popover');
    }

    bindEventListeners() {
        this.startGameBtn.addEventListener('click', () => this.processSetup());
        this.newGameBtn.addEventListener('click', () => { SoundManager.play('click'); this.showSetupModal(); });
        this.undoBtn.addEventListener('click', () => { SoundManager.play('click'); this.undoMove(); });
        this.playAgainBtn.addEventListener('click', () => { SoundManager.play('click'); this.showSetupModal(); });
        this.themeToggle.addEventListener('change', () => { SoundManager.play('click'); this.toggleTheme(); });
        this.themeSelect.addEventListener('change', () => { SoundManager.play('click'); this.applyTileTheme(); });
        this.difficultySlider.addEventListener('input', () => this.updateDifficultyLabel());
        this.helpBtn.addEventListener('mouseenter', () => this.showHelp());
        this.helpBtn.addEventListener('mouseleave', () => this.hideHelp());
        if (this.helpBtnModal) {
            this.helpBtnModal.addEventListener('mouseenter', () => this.showHelp());
            this.helpBtnModal.addEventListener('mouseleave', () => this.hideHelp());
        }
        this.generatePartitionBtn.addEventListener('click', () => this.generatePartition());  

    }

    clearBoard() {
        this.boardArea.innerHTML = '';
        this.idToAddress.clear();
    }

    redrawBoard() {
        this.clearBoard();
        if (!this.game) return;
        
        // Calculate required dimensions and update board area
        this.updateBoardDimensions();
        
        const x0 = this.MARGIN;
        const y0 = this.MARGIN;
        
        this.drawBoard(this.game.board, x0, y0);
    }

    updateBoardDimensions() {
        if (!this.game) return;
        
        const board = this.game.board;
        const boardHeight = board.height();
        const boardWidth = board.width();
        
        // Calculate required dimensions (keeping original cell size)
        let requiredWidth = this.MARGIN + (boardWidth * this.CELL) + this.LABEL;
        let requiredHeight = this.MARGIN + (boardHeight * this.CELL) + this.LABEL;
        
        // Set minimum dimensions
        const minDimension = 480;
        requiredWidth = Math.max(requiredWidth, minDimension);
        requiredHeight = Math.max(requiredHeight, minDimension);
        
        // Apply the calculated dimensions to the board area
        this.boardArea.style.width = `${requiredWidth}px`;
        this.boardArea.style.height = `${requiredHeight}px`;
    }

    drawBoard(board, x0, y0) {
        // Draw row labels
        board.rowsAlive().forEach(r => {
            const div = document.createElement('div');
            div.className = 'label-cell';
            div.style.width = `${this.LABEL}px`;
            div.style.height = `${this.CELL}px`;
            div.style.left = `${x0 - this.LABEL}px`;
            div.style.top = `${y0 + r * this.CELL}px`;
            div.textContent = r;
            const id = `lbl-${++this.idCounter}`;
            div.id = id;
            this.idToAddress.set(id, { kind: 'row', index: r });
            div.addEventListener('click', e => this.handleLabelClick(e));
            div.addEventListener('mouseenter', e => this.handleLabelHover(e));
            div.addEventListener('mouseleave', e => this.handleLabelLeave(e));
            this.boardArea.appendChild(div);
        });

        // Draw column labels
        board.colsAlive().forEach(c => {
            const div = document.createElement('div');
            div.className = 'label-cell';
            div.style.width = `${this.CELL}px`;
            div.style.height = `${this.LABEL}px`;
            div.style.left = `${x0 + c * this.CELL}px`;
            div.style.top = `${y0 - this.LABEL}px`;
            div.textContent = c;
            const id = `lbl-${++this.idCounter}`;
            div.id = id;
            this.idToAddress.set(id, { kind: 'col', index: c });
            div.addEventListener('click', e => this.handleLabelClick(e));
            div.addEventListener('mouseenter', e => this.handleLabelHover(e));
            div.addEventListener('mouseleave', e => this.handleLabelLeave(e));
            this.boardArea.appendChild(div);
        });

        // Draw squares
        board.squares().forEach(({ r, c }) => {
            const tile = document.createElement('div');
            tile.className = 'tile';
            tile.id = `tile-${r}-${c}`;
            tile.style.width = `${this.CELL}px`;
            tile.style.height = `${this.CELL}px`;
            tile.style.left = `${x0 + c * this.CELL}px`;
            tile.style.top = `${y0 + r * this.CELL}px`;
            this.boardArea.appendChild(tile);
        });
    }

    handleLabelClick(ev) {
        const info = this.idToAddress.get(ev.currentTarget.id);
        
        // Only allow human players to click labels
        if (!info || !this.game || this.game.isAiTurn() || this.isAnimating) {
            return;
        }

        this.processMove(info, ev.currentTarget);
    }

    handleLabelHover(ev) {
        if (!this.game || this.game.isAiTurn() || this.isAnimating) return;
        
        const info = this.idToAddress.get(ev.currentTarget.id);
        if (!info) return;

        SoundManager.play('hover');
        this.highlightTiles(info);
    }

    handleLabelLeave(ev) {
        if (!this.game) return;
        this.clearHighlights();
    }

    highlightTiles(info) {
        this.clearHighlights();
        
        if (info.kind === 'row') {
            const rowIndex = info.index;
            for (let c = 0; c < this.game.board.width(); c++) {
                if (this.game.board.grid[rowIndex][c] === 1) {
                    const tile = document.getElementById(`tile-${rowIndex}-${c}`);
                    if (tile) tile.classList.add('highlighted');
                }
            }
        } else if (info.kind === 'col') {
            const colIndex = info.index;
            for (let r = 0; r < this.game.board.height(); r++) {
                if (this.game.board.grid[r][colIndex] === 1) {
                    const tile = document.getElementById(`tile-${r}-${colIndex}`);
                    if (tile) tile.classList.add('highlighted');
                }
            }
        }
    }

    clearHighlights() {
        this.boardArea.querySelectorAll('.tile.highlighted').forEach(tile => {
            tile.classList.remove('highlighted');
        });
    }

    processMove(info, labelElement = null) {
        if (!info || !this.game || this.isAnimating) return;

        // Save the current state before making a move (for undo functionality)
        this.saveGameState();

        SoundManager.play('click');
        if (labelElement) {
            labelElement.classList.add(info.kind === 'row' ? 'row-win' : 'col-win');
        }

        // Execute the move after a short visual flash
        setTimeout(() => {
            this.clearHighlights();
            const move = { type: info.kind, index: info.index };
            const winner = this.game.currentPlayer;
            this.game.makeMove(move);
            
            // Check if game is over (no more moves available)
            const finished = !this.game.board.hasMoves();
            
            if (finished) {
                SoundManager.play('win');
                this.gameOverMessage.textContent = `Player ${winner} wins!`;
                this.gameOverModal.classList.add('visible');
                this.redrawBoard();
                this.updateStatus();
                this.updateUndoButton();
                return;
            }

            this.redrawBoard();
            this.updateStatus();
            this.updateUndoButton();
            if (this.game.isAiTurn()) {
                this.aiTurn();
            }
        }, 300);
    }

    generatePartition() {
        SoundManager.play('click');
        
        const partitionType = this.partitionTypeSelect.value;
        const n = parseInt(this.partitionNumberInput.value, 10);
        
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

        

    processSetup() { 
        try { 
            SoundManager.play('click'); 
            const nums = this.rowsInput.value.trim().split(/\s+/).map(Number).filter(n => n > 0).sort((a,b) => b-a); 
            if (nums.length === 0 && this.rowsInput.value.trim() !== '0') { 
                this.startGame([], null); 
                this.setupModal.classList.remove('visible'); 
                return; 
            } 
            const aiSide = this.aiSelect.value === "None" ? null : this.aiSelect.value; 
            this.aiDifficultyValue = parseInt(this.difficultySlider.value); 
            this.gameCard.setAttribute('data-tile-theme', this.themeSelect.value); 
            this.setupModal.classList.remove('visible'); 
            this.startGame(nums, aiSide); 
        } catch (e) { 
            alert("Invalid input. Please enter positive integers only."); 
        } 
    }

    startGame(rows, aiSide) { 
        this.resetBoardDimensions();
        this.game = new Game(new Board(rows), aiSide); 
        this.isAnimating = false; 
        this.clearGameHistory(); // Clear undo history for new game
        this.redrawBoard(); 
        this.updateStatus(); 
        this.updateUndoButton();
        if (this.game.isAiTurn()) { 
            this.aiTurn(); 
        } 
    }

    resetBoardDimensions() {
        // Reset to default dimensions for new games
        this.CELL = 40;
        this.MARGIN = 20;
        this.LABEL = 20;
    }

    aiTurn() { 
        if (!this.game || !this.game.isAiTurn() || this.isAnimating) return; 
        
        this.aiThinkingIndicator.classList.add('thinking'); 
        this.updateUndoButton(); // Update undo button state during AI turn
        setTimeout(() => { 
            this.aiThinkingIndicator.classList.remove('thinking'); 
            let move; 
            const rand = Math.random(); 
            const legalMoves = []; 
            
            this.game.board.rowsAlive().forEach(i => legalMoves.push({type: 'row', index: i}));
            this.game.board.colsAlive().forEach(j => legalMoves.push({type: 'col', index: j}));
            
            // Calculate mistake probability based on difficulty value (1-100)
            // Perfect (100) = no mistakes, Easy (1-19) = high mistakes, etc.
            const mistakeProbability = this.aiDifficultyValue === 100 ? 0 : (100 - this.aiDifficultyValue) / 100;
            
            if (rand < mistakeProbability) { 
                move = legalMoves[Math.floor(Math.random() * legalMoves.length)]; 
            } else { 
                move = perfectMove(this.game.board.asTuple()); 
            } 
            this.executeAIMove(move); 
        }, this.AI_THINK_MS); 
    }

    executeAIMove(move) {
        // Find the corresponding label info and process the move directly
        const targetInfo = { kind: move.type, index: move.index };
        const labelEntry = [...this.idToAddress.entries()]
            .find(([_, info]) => info.kind === targetInfo.kind && info.index === targetInfo.index);
        
        if (labelEntry) {
            const [labelId, info] = labelEntry;
            const labelElement = document.getElementById(labelId);
            this.processMove(info, labelElement);
        }
    }

    updateStatus() { 
        if (!this.game || this.game.board.isEmpty()) { 
            this.statusLabel.textContent = 'Game Over'; 
            this.updateUndoButton(); // Update undo button when game is over
            return; 
        } 
        const kind = this.game.isAiTurn() ? "Computer" : "Human"; 
        const newText = `Player ${this.game.currentPlayer} (${kind}) to move`; 
        if (this.statusLabel.textContent === newText) return; 
        this.statusLabel.classList.add('exiting'); 
        setTimeout(() => { 
            this.statusLabel.textContent = newText; 
            this.statusLabel.classList.remove('exiting'); 
            this.updateUndoButton(); // Update undo button after status change
        }, 200); 
    }

    showHelp() { this.helpPopover.classList.add('visible'); }
    hideHelp() { this.helpPopover.classList.remove('visible'); }
    initTheme() { 
        const savedTheme = localStorage.getItem('theme') || 'dark'; 
        document.documentElement.setAttribute('data-theme', savedTheme); 
        this.themeToggle.checked = savedTheme === 'dark'; 
        // Apply initial tile theme
        this.applyTileTheme();
        // Initialize difficulty label
        this.updateDifficultyLabel();
    }
    toggleTheme() { 
        const newTheme = this.themeToggle.checked ? 'dark' : 'light'; 
        document.documentElement.setAttribute('data-theme', newTheme); 
        localStorage.setItem('theme', newTheme); 
    }

    applyTileTheme() {
        this.gameCard.setAttribute('data-tile-theme', this.themeSelect.value);
    }

    updateDifficultyLabel() {
        const value = parseInt(this.difficultySlider.value);
        const difficulty = this.getDifficultyFromValue(value);
        this.difficultyLabel.textContent = `${difficulty} (${value})`;
    }

    getDifficultyFromValue(value) {
        if (value < 20) return 'Easy';
        if (value <= 70) return 'Medium';
        if (value <= 99) return 'Hard';
        return 'Perfect';
    }

    showSetupModal() { 
        this.gameOverModal.classList.remove('visible'); 
        this.setupModal.classList.add('visible'); 
    }

    // Game state management for undo functionality
    saveGameState() {
        if (!this.game) return;
        
        // Deep copy the current board state
        const boardCopy = {
            grid: this.game.board.grid.map(row => [...row])
        };
        
        const gameState = {
            board: boardCopy,
            currentIndex: this.game.currentIndex
        };
        
        this.gameHistory.push(gameState);
        this.updateUndoButton();
    }

    undoMove() {
        if (!this.game || this.gameHistory.length === 0 || this.isAnimating || this.game.isAiTurn()) {
            return;
        }

        SoundManager.play('click');
        
        // Restore the previous game state
        const previousState = this.gameHistory.pop();
        
        // Reconstruct the board
        this.game.board.grid = previousState.board.grid.map(row => [...row]);
        this.game.currentIndex = previousState.currentIndex;
        
        // Redraw the board and update UI
        this.redrawBoard();
        this.updateStatus();
        this.updateUndoButton();
    }

    updateUndoButton() {
        if (!this.undoBtn) return;
        
        const canUndo = this.game && this.gameHistory.length > 0 && !this.isAnimating && !this.game.isAiTurn();
        
        if (canUndo) {
            this.undoBtn.style.display = 'flex';
            this.undoBtn.disabled = false;
        } else if (this.game && this.gameHistory.length === 0) {
            this.undoBtn.style.display = 'flex';
            this.undoBtn.disabled = true;
        } else {
            this.undoBtn.style.display = 'none';
        }
    }

    clearGameHistory() {
        this.gameHistory = [];
        this.updateUndoButton();
    }
}

window.onload = () => {
    const app = new ProLCTRGui();
    app.showSetupModal();
};
