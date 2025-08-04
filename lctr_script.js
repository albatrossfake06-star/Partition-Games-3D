// --- CORE GAME LOGIC ---
// This section contains the fundamental rules and AI logic for the LCTR game.

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
    // If it's a losing position, make any legal move (prefer row to be deterministic)
    return posArray.length > 0 ? "row" : "col";
}

// --- PARTITION GENERATION UTILITIES ---

function staircase(n) { let parts = []; let t = n; while (t >= 1) { parts.push(t); t = t - 1; } return parts; }
function square(n) { let parts = []; let t = n; while (t >= 1) { parts.push(n); t = t - 1; } return parts; }
function hook(n) { let parts = []; let t = n; parts.push(t); while (t >= 2) { parts.push(1); t = t - 1; } return parts; }
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randomPartition(n) { let parts = []; let remaining = n; let maxPart = n; while (remaining > 0) { let part = randomInt(1, Math.min(remaining, maxPart)); parts.push(part); remaining -= part; maxPart = part; } return parts.sort((a, b) => b - a); }

// --- GAME CLASS ---

class Game {
    static PLAYERS = ["Alice", "Bob"];
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

// --- SOUND MANAGER (Placeholder) ---
const SoundManager = { init() {}, play(soundName) {} };

// --- GUI CONTROLLER ---
class ProLCTRGui {
    constructor() {
        this.CELL = 40;
        this.GAP = 1; // Small gap between tiles to prevent border overlap
        this.MARGIN = 20;
        this.ANIMATION_MS = 500;
        this.AI_THINK_MS = 800;
        this.game = null;
        this.hoveredMove = null;
        this.isAnimating = false;
        this.aiDifficulty = '50';
        this.gameHistory = [];
        
        // Multiplayer properties
        this.socket = io('http://localhost:3001', {
            forceNew: true,
            reconnection: true,
            timeout: 5000,
            transports: ['websocket', 'polling']
        });
        this.roomId = null;
        this.playerSymbol = null; // 'A' for Alice, 'B' for Bob
        this.isMultiplayer = false;
        this.turnMessageTimeout = null;
        
        // Socket connection debugging
        this.socket.on('connect', () => {
            console.log('Socket connected:', this.socket.id);
        });
        this.socket.on('disconnect', () => {
            console.log('Socket disconnected');
        });
        this.socket.on('connect_error', (error) => {
            console.log('Socket connection error:', error);
        });
        
        this.getDOMElements();
        this.bindEventListeners();
        SoundManager.init();
        this.showSetupModal();
    }

    getDOMElements() {
        this.gameCard = document.getElementById('game-card');
        this.statusLabel = document.getElementById('status-label');
        this.boardArea = document.getElementById('board-area');
        this.aiThinkingIndicator = document.getElementById('ai-thinking-indicator');
        this.newGameBtn = document.getElementById('new-game-btn');
        this.cycleThemeBtn = document.getElementById('cycle-theme-btn');
        this.setupModal = document.getElementById('setup-modal-backdrop');
        this.gameOverModal = document.getElementById('game-over-modal-backdrop');
        this.rowsInput = document.getElementById('rows-input');
        this.partitionTypeSelect = document.getElementById('partition-type-select');
        this.partitionNumberInput = document.getElementById('partition-number-input');
        this.generatePartitionBtn = document.getElementById('generate-partition-btn');
        this.aiSelect = document.getElementById('ai-select');
        this.difficultySlider = document.getElementById('difficulty-slider');
        this.difficultyLabel = document.getElementById('difficulty-label');
        this.startGameBtn = document.getElementById('start-game-btn');
        this.playAgainBtn = document.getElementById('play-again-btn');
        this.gameOverMessage = document.getElementById('game-over-message');
        this.helpBtn = document.getElementById('help-btn');
        this.helpBtnModal = document.getElementById('help-btn-modal');
        this.helpPopover = document.getElementById('help-popover');
        this.downloadBtnModal = document.getElementById('download-btn-modal');
        
        // Multiplayer elements
        this.multiplayerBtn = document.getElementById('multiplayer-btn');
        this.multiplayerModal = document.getElementById('multiplayer-modal-backdrop');
        this.multiplayerBackBtn = document.getElementById('multiplayer-back-btn');
        this.multiplayerRowsInput = document.getElementById('multiplayer-rows-input');
        this.multiplayerPartitionTypeSelect = document.getElementById('multiplayer-partition-type-select');
        this.multiplayerPartitionNumberInput = document.getElementById('multiplayer-partition-number-input');
        this.multiplayerGeneratePartitionBtn = document.getElementById('multiplayer-generate-partition-btn');
        this.createGameBtn = document.getElementById('create-game-btn');
        this.joinGameBtn = document.getElementById('join-game-btn');
        this.joinRoomInput = document.getElementById('join-room-input');
        this.roomInfoLabel = document.getElementById('room-info-label');
    }

    bindEventListeners() {
        this.startGameBtn.addEventListener('click', () => this.processSetup());
        this.newGameBtn.addEventListener('click', () => { SoundManager.play('click'); this.showSetupModal(); });
        this.playAgainBtn.addEventListener('click', () => { SoundManager.play('click'); this.showSetupModal(); });
        this.difficultySlider.addEventListener('input', () => this.updateDifficultyLabel());
        this.helpBtn.addEventListener('mouseenter', () => this.showHelp());
        this.helpBtn.addEventListener('mouseleave', () => this.hideHelp());
        if (this.helpBtnModal) {
            this.helpBtnModal.addEventListener('mouseenter', () => this.showHelp());
            this.helpBtnModal.addEventListener('mouseleave', () => this.hideHelp());
        }
        if (this.generatePartitionBtn) {
            this.generatePartitionBtn.addEventListener('click', () => this.generatePartition());
        }
        if (this.downloadBtnModal) {
            this.downloadBtnModal.addEventListener('click', () => { SoundManager.play('click'); this.downloadGame(); });
        }
        
        // Theme cycling functionality
        if (this.cycleThemeBtn) {
            const themes = [
                { name: 'grass', icon: '🔥' },
                { name: 'stone', icon: '🪨' },
                { name: 'ice', icon: '🧊' }
            ];
            let currentThemeIndex = 0;

            // A reusable function to update the theme
            const updateTheme = (newIndex) => {
                // This formula correctly wraps the index in both directions (forwards and backwards)
                currentThemeIndex = (newIndex + themes.length) % themes.length;
                
                const newTheme = themes[currentThemeIndex];
                
                // Update the button's text to show the current theme
                this.cycleThemeBtn.innerHTML = `[Tiles: ${newTheme.icon}]`;
                
                // Apply the theme to the game card
                if (this.gameCard) {
                    this.gameCard.setAttribute('data-tile-theme', newTheme.name);
                }
            };

            // 1. Handle Clicks
            this.cycleThemeBtn.addEventListener('click', () => {
                // Go to the next theme
                updateTheme(currentThemeIndex + 1);
            });

            // 2. Handle Mouse Wheel Scrolling
            this.cycleThemeBtn.addEventListener('wheel', (event) => {
                // Prevent the default browser action (scrolling the page)
                event.preventDefault();

                if (event.deltaY < 0) {
                    // Scrolled up: go to the previous theme
                    updateTheme(currentThemeIndex - 1);
                } else {
                    // Scrolled down: go to the next theme
                    updateTheme(currentThemeIndex + 1);
                }
            });

            // Set the initial theme when the game loads
            updateTheme(currentThemeIndex);
        }
        
        this.boardArea.addEventListener('mousemove', (event) => this.handleMouseMove(event));
        this.boardArea.addEventListener('mouseleave', () => this.handleMouseLeave());
        this.boardArea.addEventListener('click', () => this.handleMouseClick());
        
        // Multiplayer button event listeners
        this.multiplayerBtn.addEventListener('click', () => this.showMultiplayerModal());
        this.multiplayerBackBtn.addEventListener('click', () => this.hideMultiplayerModal());
        this.multiplayerGeneratePartitionBtn.addEventListener('click', () => this.generateMultiplayerPartition());
        this.createGameBtn.addEventListener('click', () => this.createMultiplayerGame());
        this.joinGameBtn.addEventListener('click', () => this.joinMultiplayerGame());
        
        // Socket event listeners
        this.socket.on('gameCreated', ({ roomId }) => {
            this.roomId = roomId;
            this.isMultiplayer = true;
            this.playerSymbol = 'A'; // Creator is Alice (first player)
            this.roomInfoLabel.textContent = `Game ID: ${roomId} - Waiting for opponent...`;
            this.roomInfoLabel.style.color = 'var(--orange)';
        });
        
        this.socket.on('gameStart', ({ board, players, currentPlayer }) => {
            console.log(`[${this.socket.id}] Received gameStart:`, { board, players, currentPlayer });
            console.log(`[${this.socket.id}] Current roomId before gameStart:`, this.roomId);
            
            this.isMultiplayer = true;
            // Determine if this client is Alice or Bob
            this.playerSymbol = players[0] === this.socket.id ? 'A' : 'B';
            this.roomInfoLabel.textContent = `Game started! You are ${this.playerSymbol === 'A' ? 'Alice' : 'Bob'}`;
            this.roomInfoLabel.style.color = 'var(--gray)';
            this.setupModal.classList.remove('visible');
            this.multiplayerModal.classList.remove('visible');
            
            console.log(`[${this.playerSymbol}] Set as player symbol, roomId is still:`, this.roomId);
            
            this.startGame(board, null); // No AI in multiplayer
        });
        
        this.socket.on('gameStateUpdate', ({ board, moveKind, currentPlayer, gameEnded, winner }) => {
            if (!this.isMultiplayer) return;
            
            console.log(`[${this.playerSymbol}] Received gameStateUpdate:`, { 
                board, 
                moveKind, 
                currentPlayer, 
                gameEnded, 
                winner,
                currentBoardBeforeUpdate: this.game.board.rows,
                currentIndexBefore: this.game.currentIndex
            });
            
            // Update the local game state from server
            this.game.board.rows = [...board];
            this.game.currentIndex = currentPlayer;
            
            console.log(`[${this.playerSymbol}] After setting currentIndex:`, {
                newCurrentIndex: this.game.currentIndex,
                currentPlayer: currentPlayer,
                gameCurrentPlayer: this.game.currentPlayer
            });
            
            // Simply redraw the board with the new state
            this.redrawBoard();
            this.isAnimating = false;
            
            console.log(`[${this.playerSymbol}] Updated board and redrawn`);
            
            if (gameEnded) {
                SoundManager.play('win');
                const winnerName = winner === 0 ? 'Alice' : 'Bob';
                this.gameOverMessage.textContent = `Player ${winnerName} wins!`;
                this.gameOverModal.classList.add('visible');
            } else {
                this.updateStatus();
            }
        });
        
        this.socket.on('playerDisconnected', ({ message }) => {
            alert(message);
            this.resetToSinglePlayer();
        });
        
        this.socket.on('error', (message) => {
            console.log(`[${this.playerSymbol}] Received error:`, message);
            
            // Handle "not your turn" errors gracefully
            if (message.includes('Not player\'s turn') || message.includes('REJECTED: Not player\'s turn')) {
                this.showTurnMessage("Not your turn! Waiting for opponent...");
                this.isAnimating = false; // Reset animation state
                return;
            }
            
            // For other errors, show alert and reset
            alert(`Error: ${message}`);
            this.roomInfoLabel.textContent = '';
            this.roomInfoLabel.style.color = '';
            this.isAnimating = false;
            this.resetToSinglePlayer();
        });
    }

    // Multiplayer helper methods
    createMultiplayerGame() {
        try {
            SoundManager.play('click');
            const nums = this.multiplayerRowsInput.value.trim().split(/\s+/).map(Number);
            if (nums.some(n => isNaN(n) || n <= 0)) throw new Error("Invalid input");
            if (nums.length === 1 && nums[0] === 0) throw new Error("Invalid input");
            
            this.socket.emit('createGame', nums);
        } catch (e) {
            alert("Invalid input. Please enter positive, space-separated integers.");
        }
    }
    
    joinMultiplayerGame() {
        SoundManager.play('click');
        const roomId = this.joinRoomInput.value.trim().toUpperCase();
        if (!roomId) {
            alert("Please enter a Game ID");
            return;
        }
        
        console.log(`Attempting to join room:`, roomId);
        this.roomId = roomId; // Set roomId when joining
        this.socket.emit('joinGame', roomId);
    }
    

    
    resetToSinglePlayer() {
        this.isMultiplayer = false;
        this.roomId = null;
        this.playerSymbol = null;
        this.roomInfoLabel.textContent = '';
        this.roomInfoLabel.style.color = '';
        
        // Clear any turn message timeouts
        if (this.turnMessageTimeout) {
            clearTimeout(this.turnMessageTimeout);
            this.turnMessageTimeout = null;
        }
        
        this.showSetupModal();
    }

    showMultiplayerModal() {
        SoundManager.play('click');
        this.setupModal.classList.remove('visible');
        this.multiplayerModal.classList.add('visible');
        // Reset multiplayer state when showing modal
        this.isMultiplayer = false;
        this.roomId = null;
        this.playerSymbol = null;
        this.roomInfoLabel.textContent = '';
        this.roomInfoLabel.style.color = '';
    }

    hideMultiplayerModal() {
        SoundManager.play('click');
        this.multiplayerModal.classList.remove('visible');
        this.showSetupModal();
    }

    generateMultiplayerPartition() {
        const partitionType = this.multiplayerPartitionTypeSelect.value;
        const n_str = this.multiplayerPartitionNumberInput.value;
        if (!n_str) { alert("Please enter a number for partition generation."); return; }
        const n = parseInt(n_str, 10);
        if (isNaN(n) || n <= 0 || n > 200) { alert("Please enter a positive number less than or equal to 200."); return; }
        let partition;
        if (partitionType === 'random') partition = randomPartition(n);
        else if (partitionType === 'staircase') partition = staircase(n);
        else if (partitionType === 'square') partition = square(n);
        else if (partitionType === 'hook') partition = hook(n);
        this.multiplayerRowsInput.value = partition.join(' ');
    }

    showTurnMessage(message) {
        if (!this.statusLabel) return;
        
        // Store the original status
        const originalText = this.statusLabel.textContent;
        const originalColor = this.statusLabel.style.color;
        
        // Show the temporary message in orange
        this.statusLabel.textContent = message;
        this.statusLabel.style.color = 'var(--orange)';
        
        // Clear any existing timeout
        if (this.turnMessageTimeout) {
            clearTimeout(this.turnMessageTimeout);
        }
        
        // Restore original status after 3 seconds
        this.turnMessageTimeout = setTimeout(() => {
            this.statusLabel.textContent = originalText;
            this.statusLabel.style.color = originalColor;
            this.turnMessageTimeout = null;
        }, 3000);
    }

    processSetup() {
        try {
            SoundManager.play('click');
            const nums = this.rowsInput.value.trim().split(/\s+/).map(Number);
            if (nums.some(n => isNaN(n) || n <= 0)) throw new Error("Invalid input");
            if (nums.length === 1 && nums[0] === 0) throw new Error("Invalid input");


            const aiSide = this.aiSelect.value === "None" ? null : 
                         this.aiSelect.value === "A" ? "Alice" :
                         this.aiSelect.value === "B" ? "Bob" : null;
            this.aiDifficulty = this.difficultySlider.value;
            this.setupModal.classList.remove('visible');
            this.startGame(nums, aiSide);
        } catch (e) {
            alert("Invalid input. Please enter positive, space-separated integers.");
        }
    }

    startGame(rows, aiSide) {
        this.initialPartition = [...rows];
        this.gameHistory = [];
        this.game = new Game(new Board(rows), aiSide);
        this.hoveredMove = null;
        this.isAnimating = false;
        
        // Clear any turn message timeouts
        if (this.turnMessageTimeout) {
            clearTimeout(this.turnMessageTimeout);
            this.turnMessageTimeout = null;
        }
        
        this.redrawBoard();
        this.updateStatus();
        
        // Only start AI turn if it's not a multiplayer game
        if (!this.isMultiplayer && this.game.isAiTurn()) { 
            this.aiTurn(); 
        }
    }

    aiTurn() {
        if (!this.game || !this.game.isAiTurn() || this.isAnimating) return;
        this.aiThinkingIndicator.classList.add('thinking');
        setTimeout(() => {
            this.aiThinkingIndicator.classList.remove('thinking');
            let move;
            const difficultyThreshold = parseInt(this.aiDifficulty, 10) / 100;
            if (Math.random() > difficultyThreshold) {
                const legalMoves = [];
                if (this.game.board.height() > 0) legalMoves.push('row');
                if (this.game.board.width() > 0) legalMoves.push('col');
                move = legalMoves[Math.floor(Math.random() * legalMoves.length)];
            } else {
                move = perfectMove(this.game.board.asTuple());
            }
            this.executeWithAnimation(move);
        }, this.AI_THINK_MS);
    }
    
    handleMouseMove(event) {
        if (!this.game || this.game.isAiTurn() || this.isAnimating) return;
        
        // In multiplayer, only allow hover effects if it's the local player's turn
        if (this.isMultiplayer) {
            const isMyTurn = (this.playerSymbol === 'A' && this.game.currentIndex === 0) ||
                            (this.playerSymbol === 'B' && this.game.currentIndex === 1);
            console.log(`[${this.playerSymbol}] Turn check:`, {
                playerSymbol: this.playerSymbol,
                currentIndex: this.game.currentIndex,
                isMyTurn: isMyTurn
            });
            if (!isMyTurn) return;
        }
        const rect = this.boardArea.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        let detectedMove = null;
        const extraLeftMargin = this.game.board.width() > 30 ? 20 : 0;
        
        // Calculate horizontal centering offset only (same as in redrawBoard) including gaps
        const boardDataWidth = this.game.board.width() * this.CELL + (this.game.board.width() - 1) * this.GAP;
        const boardDataHeight = this.game.board.height() * this.CELL + (this.game.board.height() - 1) * this.GAP;
        let boardWidth = this.MARGIN * 2 + boardDataWidth + extraLeftMargin;
        let boardHeight = this.MARGIN * 2 + boardDataHeight;
        const minDimension = 480;
        boardWidth = Math.max(boardWidth, minDimension);
        boardHeight = Math.max(boardHeight, minDimension);
        const actualContentWidth = this.MARGIN * 2 + boardDataWidth + extraLeftMargin;
        const centerOffsetX = (boardWidth - actualContentWidth) / 2;
        
        const topLeftCellLeft = centerOffsetX + this.MARGIN + extraLeftMargin;
        const topLeftCellTop = this.MARGIN;
        const topLeftCellRight = centerOffsetX + this.MARGIN + extraLeftMargin + this.CELL;
        const topLeftCellBottom = this.MARGIN + this.CELL;
        if (this.game.board.height() > 0 && this.game.board.width() > 0 && mouseX >= topLeftCellLeft && mouseX <= topLeftCellRight && mouseY >= topLeftCellTop && mouseY <= topLeftCellBottom) {
            const distToBottom = topLeftCellBottom - mouseY;
            const distToRight = topLeftCellRight - mouseX;
            detectedMove = (distToBottom < distToRight) ? 'col' : 'row';
        } else if (this.game.board.height() > 0 && mouseY >= this.MARGIN && mouseY <= this.MARGIN + this.CELL && mouseX >= centerOffsetX + this.MARGIN + extraLeftMargin && mouseX <= centerOffsetX + this.MARGIN + extraLeftMargin + this.game.board.rows[0] * this.CELL + (this.game.board.rows[0] - 1) * this.GAP) {
            detectedMove = 'row';
        } else if (this.game.board.width() > 0 && mouseX >= centerOffsetX + this.MARGIN + extraLeftMargin && mouseX <= centerOffsetX + this.MARGIN + extraLeftMargin + this.CELL && mouseY >= this.MARGIN && mouseY <= this.MARGIN + this.game.board.height() * this.CELL + (this.game.board.height() - 1) * this.GAP) {
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
        this.boardArea.classList.toggle('clickable', !!this.hoveredMove);
    }

    handleMouseLeave() {
        this.hoveredMove = null;
        this.gameCard.querySelectorAll('.tile.highlighted').forEach(t => t.classList.remove('highlighted'));
        this.boardArea.classList.remove('clickable');
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
                    if (tile) { tile.style.top = `${parseInt(tile.style.top) - (this.CELL + this.GAP)}px`; }
                }
            }
        } else {
            for (let r = 0; r < this.game.board.height(); r++) { document.getElementById(`tile-${r}-0`)?.classList.add('removing'); }
        }
        setTimeout(() => this.finishMove(moveKind), this.ANIMATION_MS);
    }
    
    finishMove(moveKind) {
        this.saveGameState();
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

    saveGameState() {
        if (!this.game) return;
        const boardCopy = { grid: this.game.board.rows.map(row => row) };
        const gameState = { board: boardCopy, currentIndex: this.game.currentIndex };
        this.gameHistory.push(gameState);
    }

    redrawBoard() {
        this.boardArea.innerHTML = '';
        if (!this.game) return;
        const extraLeftMargin = this.game.board.width() > 30 ? 20 : 0;
        
        // Calculate actual content size including gaps
        const boardDataWidth = this.game.board.width() * this.CELL + (this.game.board.width() - 1) * this.GAP;
        const boardDataHeight = this.game.board.height() * this.CELL + (this.game.board.height() - 1) * this.GAP;
        let boardWidth = this.MARGIN * 2 + boardDataWidth + extraLeftMargin;
        let boardHeight = this.MARGIN * 2 + boardDataHeight;
        const minDimension = 480;
        boardWidth = Math.max(boardWidth, minDimension);
        boardHeight = Math.max(boardHeight, minDimension);
        
        // Calculate horizontal centering offset only
        const actualContentWidth = this.MARGIN * 2 + boardDataWidth + extraLeftMargin;
        const centerOffsetX = (boardWidth - actualContentWidth) / 2;
        
        this.game.board.squares().forEach(({ r, c }) => {
            const tile = document.createElement('div');
            tile.className = 'tile';
            tile.id = `tile-${r}-${c}`;
            tile.style.width = `${this.CELL}px`;
            tile.style.height = `${this.CELL}px`;
            tile.style.left = `${centerOffsetX + this.MARGIN + extraLeftMargin + c * (this.CELL + this.GAP)}px`;
            tile.style.top = `${this.MARGIN + r * (this.CELL + this.GAP)}px`;
            this.boardArea.appendChild(tile);
        });
        
        this.boardArea.style.width = `${boardWidth}px`;
        this.boardArea.style.height = `${boardHeight}px`;
    }

    updateStatus() {
        if (!this.game) return;
        
        let newText;
        if (this.isMultiplayer) {
            const currentPlayerName = this.game.currentPlayer;
            const isMyTurn = (this.playerSymbol === 'A' && this.game.currentIndex === 0) ||
                            (this.playerSymbol === 'B' && this.game.currentIndex === 1);
            const turnIndicator = isMyTurn ? "Your turn" : "Opponent's turn";
            newText = `${currentPlayerName} (${turnIndicator}) to move`;
            
            console.log(`[${this.playerSymbol}] Status update:`, {
                currentPlayerName,
                currentIndex: this.game.currentIndex,
                isMyTurn,
                playerSymbol: this.playerSymbol
            });
        } else {
            const kind = this.game.isAiTurn() ? "Computer" : "Human";
            newText = `${this.game.currentPlayer} (${kind}) to move`;
        }
        
        if (this.statusLabel.textContent === newText) return;
        this.statusLabel.classList.add('exiting');
        setTimeout(() => {
            this.statusLabel.textContent = newText;
            this.statusLabel.classList.remove('exiting');
        }, 200);
    }
    
    handleMouseClick() { 
        console.log(`[${this.playerSymbol}] Mouse click - hoveredMove:`, this.hoveredMove);
        if (this.hoveredMove) { 
            this.requestMove(this.hoveredMove); 
        } else {
            console.log(`[${this.playerSymbol}] Click ignored - no hovered move`);
        }
    }
    requestMove(moveKind) { 
        if (!this.isAnimating && !this.game.isAiTurn() && moveKind) { 
            if (this.isMultiplayer && this.roomId) {
                // Check if it's the player's turn locally first
                const isMyTurn = (this.playerSymbol === 'A' && this.game.currentIndex === 0) ||
                                (this.playerSymbol === 'B' && this.game.currentIndex === 1);
                
                if (!isMyTurn) {
                    console.log(`[${this.playerSymbol}] Not my turn - blocking move locally`);
                    this.showTurnMessage("Not your turn! Waiting for opponent...");
                    return;
                }
                
                // In multiplayer, emit the move to the server
                console.log(`[${this.playerSymbol}] Attempting to make move:`, moveKind, 'Current player index:', this.game.currentIndex);
                console.log(`[${this.playerSymbol}] Using roomId:`, this.roomId);
                this.socket.emit('makeMove', { roomId: this.roomId, moveKind: moveKind });
            } else {
                // In single player, execute locally
                console.log(`[${this.playerSymbol}] Single player mode - isMultiplayer:`, this.isMultiplayer, 'roomId:', this.roomId);
                this.executeWithAnimation(moveKind); 
            }
        } else {
            console.log(`[${this.playerSymbol}] Move blocked:`, { 
                isAnimating: this.isAnimating, 
                isAiTurn: this.game?.isAiTurn(), 
                moveKind,
                currentIndex: this.game?.currentIndex 
            });
        }
    }
    showHelp() { this.helpPopover.classList.add('visible'); }
    hideHelp() { this.helpPopover.classList.remove('visible'); }
    showSetupModal() { 
        this.gameOverModal.classList.remove('visible'); 
        this.multiplayerModal.classList.remove('visible');
        this.setupModal.classList.add('visible'); 
        this.updateDifficultyLabel(); // Initialize the difficulty label
        
        // Reset multiplayer state when showing setup modal (but don't call showSetupModal again)
        this.isMultiplayer = false;
        this.roomId = null;
        this.playerSymbol = null;
        this.roomInfoLabel.textContent = '';
        this.roomInfoLabel.style.color = '';
    }
    updateDifficultyLabel() { 
        const value = parseInt(this.difficultySlider.value);
        const difficulty = this.getDifficultyFromValue(value);
        this.difficultyLabel.textContent = `${difficulty} (${value})`;
    }
    
    getDifficultyFromValue(value) {
        if (value < 20) return 'easy';
        if (value <= 70) return 'medium';
        if (value <= 99) return 'hard';
        return 'perfect';
    }
    
    generatePartition() {
        const partitionType = this.partitionTypeSelect.value;
        const n_str = this.partitionNumberInput.value;
        if (!n_str) { alert("Please enter a number for partition generation."); return; }
        const n = parseInt(n_str, 10);
        if (isNaN(n) || n <= 0 || n > 200) { alert("Please enter a positive number less than or equal to 200."); return; }
        let partition;
        if (partitionType === 'random') partition = randomPartition(n);
        else if (partitionType === 'staircase') partition = staircase(n);
        else if (partitionType === 'square') partition = square(n);
        else if (partitionType === 'hook') partition = hook(n);
        this.rowsInput.value = partition.join(' ');
    }

    downloadGame() {
        if (!this.game) return;
        const allStates = this.gameHistory.map(state => {
            let mask = state.board && state.board.grid ? state.board.grid : state.board;
            return { mask, currentIndex: state.currentIndex };
        });
        const htmlContent = this.generateGameReplayHTML_LCTR(allStates, this.initialPartition);
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `LCTR-Game-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.html`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    generateGameReplayHTML_LCTR(gameStates, initialPartition) {
        const title = `LCTR Game Replay - ${new Date().toLocaleDateString()}`;
        return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${title}</title>
<style>
 body{font-family:sans-serif;background:#f4f4f9;color:#333;margin:0;padding:20px;
       min-height:100vh;display:flex;flex-direction:column;align-items:center;}
 .container{background:#fff;border-radius:12px;padding:30px;max-width:800px;width:100%;
            box-shadow:0 6px 20px rgba(0,0,0,0.08);text-align:center;}
 h1{margin-top:0;color:#333;letter-spacing:1px;}
 .controls{margin:20px 0;display:flex;justify-content:center;align-items:center;
           gap:15px;flex-wrap:wrap;}
 button{padding:10px 18px;font-size:15px;border:none;border-radius:8px;
        background:#e9ecef;color:#333;cursor:pointer;transition:all .2s;}
 button:hover{background:#dee2e6;transform:translateY(-2px);}
 button:disabled{opacity:.5;cursor:not-allowed;transform:none;}
 .state-info{font-size:18px;margin:10px 0;font-weight:bold;color:#555;}
 #game-canvas{border:2px solid #dee2e6;border-radius:8px;margin:20px auto;display:block;
             background:#fff;}
 .instructions{margin-top:20px;font-size:14px;color:#666;line-height:1.6;}
 .error{color:#b00020;background:#f8d7da;padding:12px;border-radius:8px;margin:20px 0;font-size:1.1em;}
</style></head><body>
<div class="container">
 <h1>${title}</h1>
 <div class="state-info">Move <span id="current-state">1</span> of
 <span id="total-states">${gameStates.length}</span></div>
 <div class="controls">
  <button id="first-btn" onclick="goToState(0)">⏮ First</button>
  <button id="prev-btn"  onclick="previousState()">◀ Previous</button>
  <button id="play-btn"  onclick="toggleAutoplay()">▶ Play</button>
  <button id="next-btn"  onclick="nextState()">Next ▶</button>
  <button id="last-btn"  onclick="goToState(gameStates.length-1)">Last ⏭</button>
 </div>
 <canvas id="game-canvas" width="400" height="400"></canvas>
 <div id="error-message" class="error" style="display:none"></div>
 <div class="instructions">
  <strong>Navigation:</strong> Use ←/→ keys or the buttons above.<br>
  <strong>Autoplay:</strong> Press Play/Pause to advance automatically.
 </div>
</div>
<script>
 const gameStates=${JSON.stringify(gameStates)};
 const initialPartition=${JSON.stringify(initialPartition)};
 let currentStateIndex=0,isPlaying=false,playInterval;
 const CELL_SIZE=30,MARGIN=20;
 const canvas=document.getElementById('game-canvas'),ctx=canvas.getContext('2d');
 const errorDiv=document.getElementById('error-message');
 function drawBoard(mask){
  if(!Array.isArray(initialPartition)||!initialPartition.length){
    errorDiv.textContent='Game Ended.';errorDiv.style.display='block';return;
  }errorDiv.style.display='none';
  const boardHeight=initialPartition.length;
  const boardWidth=Math.max(...initialPartition, 0);
  const canvasWidth=MARGIN*2+boardWidth*CELL_SIZE;
  const canvasHeight=MARGIN*2+boardHeight*CELL_SIZE;
  canvas.width=canvasWidth;
  canvas.height=canvasHeight;
  ctx.clearRect(0,0,canvasWidth,canvasHeight);
  ctx.strokeStyle = '#e0e0e0';
  ctx.lineWidth = 1;
  for(let r=0;r<boardHeight;r++){
    for(let c=0;c<initialPartition[r];c++){
      const x=MARGIN+c*CELL_SIZE;
      const y=MARGIN+r*CELL_SIZE;
      const isPresent = mask && r < mask.length && c < mask[r];
      ctx.fillStyle = isPresent ? '#333' : '#f4f4f9';
      ctx.fillRect(x,y,CELL_SIZE,CELL_SIZE);
      ctx.strokeRect(x,y,CELL_SIZE,CELL_SIZE);
    }
  }
 }
 function updateDisplay(){
  drawBoard(gameStates[currentStateIndex].mask);
  document.getElementById('current-state').textContent=currentStateIndex+1;
  document.getElementById('first-btn').disabled=currentStateIndex===0;
  document.getElementById('prev-btn').disabled =currentStateIndex===0;
  document.getElementById('next-btn').disabled =currentStateIndex===gameStates.length-1;
  document.getElementById('last-btn').disabled =currentStateIndex===gameStates.length-1;
 }
 function goToState(i){if(i>=0&&i<gameStates.length){currentStateIndex=i;updateDisplay();}}
 function nextState(){if(currentStateIndex<gameStates.length-1){currentStateIndex++;updateDisplay();}}
 function previousState(){if(currentStateIndex>0){currentStateIndex--;updateDisplay();}}
 function toggleAutoplay(){
  const btn=document.getElementById('play-btn');
  if(isPlaying){clearInterval(playInterval);isPlaying=false;btn.textContent='▶ Play';}
  else{isPlaying=true;btn.textContent='⏸ Pause';
    playInterval=setInterval(()=>{if(currentStateIndex<gameStates.length-1)nextState();else toggleAutoplay();},800);}
 }
 document.addEventListener('keydown',e=>{
   if(e.key==='ArrowLeft'){e.preventDefault();previousState();}
   else if(e.key==='ArrowRight'){e.preventDefault();nextState();}
   else if(e.key===' '||e.key==='Spacebar'){e.preventDefault();toggleAutoplay();}
 });
 goToState(0); // Initial draw
</script></body></html>`;
    }
}

window.addEventListener('DOMContentLoaded', () => {
    // The global script.js handles theme initialization.
    // We just need to initialize our game GUI.
    window.lctrApp = new ProLCTRGui();
});
