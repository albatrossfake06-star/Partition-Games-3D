// corner_analysis.js

// --- Caching for new calculations ---
const uptimalityMemo = new Map();
const gameDepthMemo = new Map();

/**
 * Calculates the Uptimality (also called Remoteness or Smith Value).
 * - If winning (g > 0), it's the minimum number of moves to a guaranteed win.
 * - If losing (g = 0), it's the maximum number of moves the opponent can force.
 * @param {string} position - The board state as a JSON string tuple.
 * @returns {number} The uptimality value.
 */
function getUptimality(position) {
    if (position === '[]') return 0;
    if (uptimalityMemo.has(position)) return uptimalityMemo.get(position);

    const g = grundy(position);
    const board = new Board(JSON.parse(position));
    let value;

    const childUptimalities = [...allCornerMoves(board)].map(move => {
        const child = new Board([...board.rows]);
        child.makeCornerMoveWithSelection(move);
        return getUptimality(child.asTuple());
    });

    if (g > 0) {
        // Winning position: find the fastest win.
        // A win is a move to a g=0 state. We want the one with the lowest uptimality.
        const winningMovesUptimalities = [...allCornerMoves(board)].map(move => {
             const child = new Board([...board.rows]);
             child.makeCornerMoveWithSelection(move);
             const childTuple = child.asTuple();
             if (grundy(childTuple) === 0) {
                 return getUptimality(childTuple);
             }
             return Infinity; // Not a winning move
        });
        value = 1 + Math.min(...winningMovesUptimalities);
    } else {
        // Losing position: opponent will try to prolong the game.
        value = 1 + (childUptimalities.length > 0 ? Math.max(...childUptimalities) : -1);
    }

    uptimalityMemo.set(position, value);
    return value;
}

/**
 * Calculates the maximum possible length of the game from the current position.
 * @param {string} position - The board state as a JSON string tuple.
 * @returns {number} The maximum depth of the game tree.
 */
function getGameDepth(position) {
    if (position === '[]') return 0;
    if (gameDepthMemo.has(position)) return gameDepthMemo.get(position);

    const board = new Board(JSON.parse(position));
    const childDepths = [...allCornerMoves(board)].map(move => {
        const child = new Board([...board.rows]);
        child.makeCornerMoveWithSelection(move);
        return getGameDepth(child.asTuple());
    });

    const maxDepth = childDepths.length > 0 ? Math.max(...childDepths) : -1;
    const value = 1 + maxDepth;

    gameDepthMemo.set(position, value);
    return value;
}

/**
 * Calculates the number of moves that can be immediately reversed by an opponent.
 * @param {Board} board - The current board state.
 * @returns {number} The count of reversible moves.
 */
function calculateReversibleMoves(board) {
    const originalTuple = board.asTuple();
    let reversibleCount = 0;

    // Get all possible moves from the current board
    for (const move of allCornerMoves(board)) {
        // Create child board after making this move
        const childBoard = new Board([...board.rows]);
        childBoard.makeCornerMoveWithSelection(move);
        
        // Check all possible moves from the child state
        for (const counterMove of allCornerMoves(childBoard)) {
            const grandchildBoard = new Board([...childBoard.rows]);
            grandchildBoard.makeCornerMoveWithSelection(counterMove);
            
            // If any counter-move leads back to the original position, this move is reversible
            if (grandchildBoard.asTuple() === originalTuple) {
                reversibleCount++;
                break; // Found at least one reversal path, move to next move
            }
        }
    }

    return reversibleCount;
}

/**
 * Calculates and formats optimal winning moves as coordinate strings.
 * @param {Board} board - The current board state.
 * @returns {string} Formatted optimal moves string (e.g., "R1C4,R3C5 / R2C1")
 */
function calculateOptimalMoves(board) {
    const currentTuple = board.asTuple();
    const currentG = grundy(currentTuple);
    
    // If this is a P-position (losing position), there are no winning moves
    if (currentG === 0) {
        return "No winning moves (P-position)";
    }
    
    const optimalMoves = [];
    
    // Check all possible moves
    for (const move of allCornerMoves(board)) {
        const childBoard = new Board([...board.rows]);
        childBoard.makeCornerMoveWithSelection(move);
        const childG = grundy(childBoard.asTuple());
        
        // A move is optimal if it leads to a P-position (g-value = 0)
        if (childG === 0) {
            // Format the move as coordinate strings
            const moveString = move.map(piece => `R${piece.row + 1}C${piece.col + 1}`).join(',');
            optimalMoves.push(moveString);
        }
    }
    
    if (optimalMoves.length === 0) {
        return "No winning moves available";
    }
    
    // Join multiple optimal moves with " / " separator
    return optimalMoves.join(' / ');
}


class CornerAnalysis {
    constructor(gui) {
        this.gui = gui;
        this.isEnabled = false;
        this.gNumberHistory = []; // Track g-number history for chart
        this.getDOMElements();
        this.bindEventListeners();
        this.updateToggleButton(); // Initialize button state
    }

    getDOMElements() {
        this.analysisContainer = document.getElementById('analysis-container');
        this.undoBtn = document.getElementById('undo-btn');
        this.analysisToggle = document.getElementById('analysis-mode-toggle');

        // Panel fields
        this.p_n_status = document.getElementById('p-n-status');
        this.g_value = document.getElementById('g-value');
        this.uptimality = document.getElementById('uptimality-value');
        this.reachable_moves = document.getElementById('reachable-moves');
        this.game_depth = document.getElementById('game-depth');
        this.reversible_moves = document.getElementById('reversible-moves');
        this.move_incentive = document.getElementById('move-incentive');
        this.optimal_moves = document.getElementById('optimal-moves');
        this.gNumberChart = document.getElementById('g-number-chart');
    }

    bindEventListeners() {
        if (this.analysisToggle) {
            this.analysisToggle.addEventListener('click', (e) => {
                this.isEnabled = !this.isEnabled;
                this.updateToggleButton();
                this.toggleVisibility(this.isEnabled);
                if (this.isEnabled && this.gui.game) {
                    // If analysis mode is enabled mid-game, update the panel
                    this.updatePanel();
                }
            });
        }
        if (this.undoBtn) {
            this.undoBtn.addEventListener('click', () => this.undoMove());
        }
    }

    updateToggleButton() {
        if (this.analysisToggle) {
            this.analysisToggle.classList.toggle('active', this.isEnabled);
            this.analysisToggle.classList.toggle('panel-visible', this.isEnabled);
        }
    }
    
    // Called when a new game starts
    onGameStart() {
        this.toggleVisibility(this.isEnabled);
        if (this.isEnabled) {
            // Clear caches for the new game
            uptimalityMemo.clear();
            gameDepthMemo.clear();
            this.gNumberHistory = []; // Reset g-number history
            
            // Add initial position to history
            if (this.gui.game && this.gui.game.board) {
                const initialG = grundy(this.gui.game.board.asTuple());
                this.gNumberHistory.push(initialG);
            }
            
            this.updatePanel();
        }
    }

    toggleVisibility(show) {
        this.analysisContainer?.classList.toggle('visible', show);
        this.undoBtn?.classList.toggle('visible', show);
        if (!show) {
            this.clearHighlights();
        }
    }

    undoMove() {
        if (this.gui.gameHistory.length > 0) {
            const lastState = this.gui.gameHistory.pop();
            // We need a way to load a state in the main GUI.
            // Let's assume we add a `loadState` method to ProCornerGui.
            this.gui.loadState(lastState);
            // Also remove the last entry from g-number history
            if (this.gNumberHistory.length > 0) {
                this.gNumberHistory.pop();
            }
            this.updatePanel();
        }
    }

    // Add g-number to history after a move is made
    addToHistory(gNumber) {
        if (this.isEnabled) {
            this.gNumberHistory.push(gNumber);
        }
    }

    // Called after a move is made (should be called from the main game logic)
    onMoveMade() {
        if (this.isEnabled && this.gui.game && this.gui.game.board) {
            const currentG = grundy(this.gui.game.board.asTuple());
            this.addToHistory(currentG);
            this.updatePanel();
        }
    }

    // Draw the g-number advantage chart
    drawAdvantageChart() {
        if (!this.gNumberChart) return;

        const ctx = this.gNumberChart.getContext('2d');
        const width = this.gNumberChart.width;
        const height = this.gNumberChart.height;
        
        // Clear the canvas
        ctx.clearRect(0, 0, width, height);
        
        // Set up chart styling
        const padding = 20;
        const chartWidth = width - 2 * padding;
        const chartHeight = height - 2 * padding;
        
        // Set styles
        ctx.strokeStyle = getComputedStyle(document.body).color || '#E0E0E0';
        ctx.fillStyle = ctx.strokeStyle;
        ctx.lineWidth = 2;
        ctx.font = '10px monospace';
        
        // Draw axes
        ctx.beginPath();
        ctx.moveTo(padding, padding);
        ctx.lineTo(padding, height - padding);
        ctx.lineTo(width - padding, height - padding);
        ctx.stroke();
        
        // If no history yet, show "No data" message
        if (this.gNumberHistory.length === 0) {
            ctx.fillText('No data yet', padding + 5, height / 2);
            return;
        }
        
        // Find max g-number for scaling
        const maxG = Math.max(...this.gNumberHistory, 1);
        const minG = Math.min(...this.gNumberHistory, 0);
        const range = Math.max(maxG - minG, 1);
        
        // Draw data points and lines
        if (this.gNumberHistory.length === 1) {
            // Single point - draw it at the center
            const x = padding + chartWidth / 2;
            const y = height - padding - ((this.gNumberHistory[0] - minG) / range) * chartHeight;
            ctx.fillRect(x - 3, y - 3, 6, 6);
        } else {
            // Multiple points - draw line graph
            ctx.beginPath();
            ctx.lineWidth = 2;
            
            for (let i = 0; i < this.gNumberHistory.length; i++) {
                const x = padding + (i / (this.gNumberHistory.length - 1)) * chartWidth;
                const y = height - padding - ((this.gNumberHistory[i] - minG) / range) * chartHeight;
                
                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
                
                // Draw point
                ctx.fillRect(x - 2, y - 2, 4, 4);
            }
            ctx.stroke();
        }
        
        // Draw current value label
        const currentG = this.gNumberHistory[this.gNumberHistory.length - 1];
        ctx.fillText(`Current: ${currentG}`, padding + 5, padding + 15);
        
        // Draw moves count
        ctx.fillText(`Moves: ${this.gNumberHistory.length - 1}`, padding + 5, height - padding - 5);
    }

    // Called after any move or undo
    updatePanel() {
        if (!this.isEnabled || !this.gui.game) return;
        
        const board = this.gui.game.board;
        if (board.isEmpty()) {
            this.analysisContainer.style.display = 'none';
            return;
        }

        const positionTuple = board.asTuple();
        const g = grundy(positionTuple);
        const u = getUptimality(positionTuple);
        const depth = getGameDepth(positionTuple);
        const moves = board.getSelectableLastPieces().length;
        const totalMoves = moves > 0 ? (BigInt(1) << BigInt(moves)) - BigInt(1) : BigInt(0);
        
        // Calculate reversible moves
        const reversibleMoves = calculateReversibleMoves(board);
        
        // Calculate optimal moves
        const optimalMoves = calculateOptimalMoves(board);
        
        // Calculate move incentive (min/max change in g-number)
        let minIncentive = Infinity;
        let maxIncentive = -Infinity;
        let hasValidMoves = false;
        
        for (const move of allCornerMoves(board)) {
            const childBoard = new Board([...board.rows]);
            childBoard.makeCornerMoveWithSelection(move);
            const childG = grundy(childBoard.asTuple());
            const incentive = g - childG;
            
            minIncentive = Math.min(minIncentive, incentive);
            maxIncentive = Math.max(maxIncentive, incentive);
            hasValidMoves = true;
        }
        
        // Update all display elements
        this.p_n_status.textContent = g > 0 ? 'N-Position' : 'P-Position';
        this.g_value.textContent = g;
        this.uptimality.textContent = u;
        this.reachable_moves.textContent = totalMoves.toString();
        this.game_depth.textContent = depth;
        this.reversible_moves.textContent = reversibleMoves;
        this.optimal_moves.textContent = optimalMoves;
        
        if (hasValidMoves) {
            this.move_incentive.textContent = `${minIncentive} / ${maxIncentive}`;
        } else {
            this.move_incentive.textContent = 'N/A';
        }
        
        // Draw the g-number chart
        this.drawAdvantageChart();
    }

    // --- Hover Logic ---
    updateHover(selectedPieces) {
        this.clearHighlights();
        if (!this.isEnabled || selectedPieces.length === 0) return;

        const currentGrundy = grundy(this.gui.game.board.asTuple());

        const childBoard = new Board([...this.gui.game.board.rows]);
        childBoard.makeCornerMoveWithSelection(selectedPieces);
        const childGrundy = grundy(childBoard.asTuple());
        
        let highlightClass = '';
        if (currentGrundy > 0) { // Winning position
            if (childGrundy === 0) {
                highlightClass = 'winning-move-highlight'; // Good move
            } else {
                highlightClass = 'blunder-move-highlight'; // Bad move
            }
        } else { // Losing position
            highlightClass = 'neutral-move-highlight';
        }

        selectedPieces.forEach(p => {
            const tile = document.getElementById(`tile-${p.row}-${p.col}`);
            if (tile) tile.classList.add(highlightClass);
        });
    }

    clearHighlights() {
        this.gui.boardArea.querySelectorAll('.tile').forEach(t => {
            t.classList.remove('winning-move-highlight', 'blunder-move-highlight', 'neutral-move-highlight');
        });
    }
}