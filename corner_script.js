// --- CORE GAME LOGIC ---

// Corner Game: Remove last cell of each row, except when there are consecutive
// rows of the same length - only the last row in the consecutive block loses a cell

class Board {
  constructor(rows) {
    this.rows = [...rows];
  }
  isEmpty() {
    return this.rows.length === 0 || this.rows.every((r) => r === 0);
  }
  height() {
    return this.rows.length;
  }
  width() {
    return this.rows.length ? Math.max(...this.rows) : 0;
  }

  // Corner-specific move: remove last cell from appropriate rows
  makeCornerMove() {
    if (this.isEmpty()) return;

    // Group consecutive rows of same length
    const groups = [];
    let currentGroup = [0];

    for (let i = 1; i < this.rows.length; i++) {
      if (this.rows[i] === this.rows[i - 1]) {
        currentGroup.push(i);
      } else {
        groups.push(currentGroup);
        currentGroup = [i];
      }
    }
    groups.push(currentGroup);

    // For each group, only remove from the last row in the group
    for (const group of groups) {
      const lastRowInGroup = group[group.length - 1];
      if (this.rows[lastRowInGroup] > 0) {
        this.rows[lastRowInGroup]--;
      }
    }

    // Remove any rows that are now 0
    this.rows = this.rows.filter((r) => r > 0);
  }

  // New method: remove only selected pieces
  makeCornerMoveWithSelection(selectedPieces) {
    if (this.isEmpty() || selectedPieces.length === 0) return;

    // Remove selected pieces (which should be last pieces in their respective groups)
    for (const piece of selectedPieces) {
      if (piece.row < this.rows.length && piece.col < this.rows[piece.row]) {
        // Only remove if it's actually the last piece in the row
        if (piece.col === this.rows[piece.row] - 1) {
          this.rows[piece.row]--;
        }
      }
    }

    // Remove any rows that are now 0
    this.rows = this.rows.filter((r) => r > 0);
  }

  // Get all the "last pieces" that can be selected
  getSelectableLastPieces() {
    if (this.isEmpty()) return [];

    // Group consecutive rows of same length
    const groups = [];
    let currentGroup = [0];

    for (let i = 1; i < this.rows.length; i++) {
      if (this.rows[i] === this.rows[i - 1]) {
        currentGroup.push(i);
      } else {
        groups.push(currentGroup);
        currentGroup = [i];
      }
    }
    groups.push(currentGroup);

    // For each group, the last row in the group has a selectable piece
    const selectablePieces = [];
    for (const group of groups) {
      const lastRowInGroup = group[group.length - 1];
      if (this.rows[lastRowInGroup] > 0) {
        selectablePieces.push({
          row: lastRowInGroup,
          col: this.rows[lastRowInGroup] - 1,
        });
      }
    }

    return selectablePieces;
  }

  squares() {
    const coords = [];
    for (let r = 0; r < this.rows.length; r++) {
      for (let c = 0; c < this.rows[r]; c++) coords.push({ r, c });
    }
    return coords;
  }
  asTuple() {
    return JSON.stringify(this.rows);
  }
}

/* ───────── Grundy numbers for Corner game with selection ───────── */
/*
 * FIXED AI IMPLEMENTATION using proper Sprague-Grundy theory
 *
 * This implements optimal play for the Corner game with piece selection.
 *
 * Performance notes:
 * - Memoization keeps play instant on boards ~40 squares
 * - For larger boards, consider restricting moves to:
 * a) "remove k pieces where 1 ≤ k ≤ selectable.length"
 * b) "remove exactly one piece" (original Corner rules)
 *
 * Algorithm:
 * 1. allCornerMoves() enumerates all non-empty subsets of selectable pieces
 * 2. grundy() calculates mex over all possible child positions
 * 3. perfectMove() finds moves leading to grundy value 0 (winning)
 * 4. AI uses this for optimal play at Hard difficulty
 */
const grundyMemo = new Map();

// Generate all possible corner moves (non-empty subsets of selectable pieces)
function* allCornerMoves(board) {
  const selectable = board.getSelectableLastPieces();
  const n = selectable.length;

  // Generate all non-empty subsets (1 to 2^n - 1)
  for (let mask = 1; mask < 1 << n; mask++) {
    const move = [];
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) {
        move.push(selectable[i]);
      }
    }
    yield move;
  }
}

function grundy(position) {
  if (position === "[]") return 0;
  if (grundyMemo.has(position)) return grundyMemo.get(position);

  const posArray = JSON.parse(position);
  const board = new Board(posArray);

  // Check if there are any legal moves
  const selectablePieces = board.getSelectableLastPieces();
  if (selectablePieces.length === 0) {
    grundyMemo.set(position, 0);
    return 0;
  }

  const childValues = new Set();
  for (const move of allCornerMoves(board)) {
    const child = new Board([...board.rows]); // Copy the rows array
    child.makeCornerMoveWithSelection(move);
    const childTuple = child.asTuple();
    childValues.add(grundy(childTuple));

    // Early termination optimization: if we've seen grundy value 0,
    // we know this position is winning, but we still need the full mex
  }

  // Calculate mex (minimum excluded value)
  let g = 0;
  while (childValues.has(g)) g++;

  grundyMemo.set(position, g);
  return g;
}

function perfectMove(position) {
  if (position === "[]") {
    throw new Error("No legal move - empty board");
  }

  const posArray = JSON.parse(position);
  const board = new Board(posArray);

  // Check if there are any legal moves
  const selectablePieces = board.getSelectableLastPieces();
  if (selectablePieces.length === 0) {
    throw new Error("No legal moves available");
  }

  // Look for a winning move (one that leads to grundy value 0)
  for (const move of allCornerMoves(board)) {
    const child = new Board([...board.rows]);
    child.makeCornerMoveWithSelection(move);
    if (grundy(child.asTuple()) === 0) {
      return move; // This move wins!
    }
  }

  // No winning move found, return the first legal move
  // (In a losing position, all moves are equally bad)
  const allMoves = [...allCornerMoves(board)];
  return allMoves.length > 0 ? allMoves[0] : [];
}

function staircase(n) {
  let parts = [];
  let t = n;
  while (t >= 1) {
    parts.push(t);
    t = t - 1;
  }
  return parts;
}

function square(n) {
  let parts = [];
  let t = n;
  while (t >= 1) {
    parts.push(n);
    t = t - 1;
  }
  return parts;
}

function hook(n) {
  let parts = [];
  let t = n;
  parts.push(t);
  while (t >= 2) {
    parts.push(1);
    t = t - 1;
  }
  return parts;
}

class Game {
  static PLAYERS = ["A", "B"];
  constructor(board, aiPlayer) {
    this.board = board;
    this.currentIndex = 0;
    this.aiIndex = aiPlayer ? Game.PLAYERS.indexOf(aiPlayer) : null;
  }
  get currentPlayer() {
    return Game.PLAYERS[this.currentIndex];
  }
  isAiTurn() {
    return this.aiIndex === this.currentIndex;
  }
  switchPlayer() {
    this.currentIndex = 1 - this.currentIndex;
  }
  makeMove(selectedPieces = null) {
    if (selectedPieces && selectedPieces.length > 0) {
      this.board.makeCornerMoveWithSelection(selectedPieces);
    } else {
      this.board.makeCornerMove();
    }
    const finished = this.board.isEmpty();
    if (!finished) this.switchPlayer();
    return finished;
  }
}

// --- RANDOM PARTITION UTILITIES ---
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

  return parts.sort((a, b) => b - a);
}

// --- SOUND MANAGER ---
const SoundManager = {
  sounds: {},
  init() {
    // Sound effects disabled
  },
  play(soundName) {
    // Sound effects disabled
  },
};

// --- GUI CONTROLLER ---
class ProCornerGui {
  constructor() {
    this.CELL = 40;
    this.GAP = 2; // Gap between tiles
    this.MARGIN = 20;
    this.ANIMATION_MS = 500;
    this.AI_THINK_MS = 800;
    this.game = null;
    this.isAnimating = false;
    this.hoveredMove = null;
    this.aiDifficulty = "Medium";
    this.currentTileTheme = "grass";
    this.tileThemes = ["grass", "stone", "ice"];
    this.tileThemeEmojis = { grass: "🔥", stone: "🪨", ice: "🧊" };
    this.gameHistory = [];
    this.initialPartition = [];

    // Database tracking properties
    this.movesSequence = [];
    this.gameStartTime = null;

    // Selection state for new Corner logic
    this.selectedPieces = []; // Array of {row, col} objects
    this.selectablePieces = []; // Array of {row, col} objects representing last pieces
    this.isInSelectionMode = false;

    this.analysis = null; //Analysis mode

    this.getDOMElements();
    this.bindEventListeners();
    this.initTheme();
    this.showSetupModal();
    SoundManager.init();
  }

  getDOMElements() {
    this.gameCard = document.getElementById("game-card");
    this.statusLabel = document.getElementById("status-label");
    this.boardArea = document.getElementById("board-area");
    this.aiThinkingIndicator = document.getElementById("ai-thinking-indicator");
    this.newGameBtn = document.getElementById("new-game-btn");
    this.themeToggle = document.getElementById("theme-toggle");
    this.cycleThemeBtn = document.getElementById("cycle-theme-btn");
    this.setupModal = document.getElementById("setup-modal-backdrop");
    this.gameOverModal = document.getElementById("game-over-modal-backdrop");
    this.rowsInput = document.getElementById("rows-input");
    this.partitionTypeSelect = document.getElementById("partition-type-select");
    this.partitionNumberInput = document.getElementById(
      "partition-number-input"
    );
    this.generatePartitionBtn = document.getElementById(
      "generate-partition-btn"
    );
    this.aiSelect = document.getElementById("ai-select");
    this.difficultySlider = document.getElementById("difficulty-slider");
    this.difficultyLabel = document.getElementById("difficulty-label");
    this.startGameBtn = document.getElementById("start-game-btn");
    this.playAgainBtn = document.getElementById("play-again-btn");
    this.gameOverMessage = document.getElementById("game-over-message");

    this.helpBtn = document.getElementById("help-btn");
    this.helpBtnModal = document.getElementById("help-btn-modal");
    this.helpPopover = document.getElementById("help-popover");
    this.downloadBtnModal = document.getElementById("download-btn-modal");
    this.reportBtnModal = document.getElementById("report-btn-modal");

    // New selection control elements
    this.selectionControls = document.getElementById("selection-controls");
    this.confirmSelectionBtn = document.getElementById("confirm-selection-btn");
    this.clearSelectionBtn = document.getElementById("clear-selection-btn");
  }

  bindEventListeners() {
    this.startGameBtn.addEventListener("click", () => this.processSetup());

    // Bind new game button
    if (this.newGameBtn) {
      this.newGameBtn.addEventListener("click", (e) => {
        e.preventDefault();
        SoundManager.play("click");
        this.showSetupModal();
      });
    }

    // Bind play again button
    if (this.playAgainBtn) {
      this.playAgainBtn.addEventListener("click", (e) => {
        e.preventDefault();
        SoundManager.play("click");
        this.showSetupModal();
      });
    }
    // Theme toggle is handled by global script.js
    if (this.cycleThemeBtn) {
      this.cycleThemeBtn.addEventListener("click", () => this.cycleTileTheme());
      this.cycleThemeBtn.addEventListener("wheel", (e) => {
        e.preventDefault();
        this.cycleTileTheme();
      });
    }
    this.difficultySlider.addEventListener("input", () =>
      this.updateDifficultyLabel()
    );
    this.helpBtn.addEventListener("mouseenter", () => this.showHelp());
    this.helpBtn.addEventListener("mouseleave", () => this.hideHelp());
    if (this.helpBtnModal) {
      this.helpBtnModal.addEventListener("mouseenter", () => this.showHelp());
      this.helpBtnModal.addEventListener("mouseleave", () => this.hideHelp());
    }
    if (this.generatePartitionBtn) {
      this.generatePartitionBtn.addEventListener("click", () =>
        this.generatePartition()
      );
    }
    if (this.downloadBtnModal) {
      this.downloadBtnModal.addEventListener("click", () => {
        SoundManager.play("click");
        this.downloadGame();
      });
    }
    if (this.reportBtnModal) {
        this.reportBtnModal.addEventListener('click', () => {
            SoundManager.play('click');
            this.openGameReport();
        });
    }
    // Theme select removed - using cycle button instead

    // Selection control buttons
    if (this.confirmSelectionBtn) {
      this.confirmSelectionBtn.addEventListener("click", () =>
        this.confirmSelection()
      );
    }
    if (this.clearSelectionBtn) {
      this.clearSelectionBtn.addEventListener("click", () =>
        this.clearSelection()
      );
    }

    // Board interaction
    this.boardArea.addEventListener("mousemove", (event) =>
      this.handleMouseMove(event)
    );
    this.boardArea.addEventListener("mouseleave", () =>
      this.handleMouseLeave()
    );
    this.boardArea.addEventListener("click", (event) =>
      this.handleMouseClick(event)
    );
  }

  cycleTileTheme() {
    const currentIndex = this.tileThemes.indexOf(this.currentTileTheme);
    const nextIndex = (currentIndex + 1) % this.tileThemes.length;
    this.currentTileTheme = this.tileThemes[nextIndex];

    if (this.gameCard) {
      this.gameCard.setAttribute("data-tile-theme", this.currentTileTheme);
    }

    if (this.cycleThemeBtn) {
      const emoji = this.tileThemeEmojis[this.currentTileTheme];
      this.cycleThemeBtn.textContent = `[tiles: ${emoji}]`;
    }
  }

  processSetup() {
    try {
      SoundManager.play("click");
      const nums = this.rowsInput.value.trim().split(/\s+/).map(Number);
      if (nums.length === 0 || nums.some((n) => isNaN(n) || n <= 0))
        throw new Error("Invalid input");

      const aiSide =
        this.aiSelect.value === "None" ? null : this.aiSelect.value;

      // Convert numeric difficulty to text
      const difficultyValue = parseInt(this.difficultySlider.value);
      switch (difficultyValue) {
        case 1:
          this.aiDifficulty = "Easy";
          break;
        case 2:
          this.aiDifficulty = "Medium";
          break;
        case 3:
          this.aiDifficulty = "Hard";
          break;
        default:
          this.aiDifficulty = "Medium";
          break;
      }

      // Apply initial grass tile theme
      this.currentTileTheme = "grass";
      if (this.gameCard) {
        this.gameCard.setAttribute("data-tile-theme", this.currentTileTheme);
      }
      if (this.cycleThemeBtn) {
        const emoji = this.tileThemeEmojis[this.currentTileTheme];
        this.cycleThemeBtn.textContent = `[tiles: ${emoji}]`;
      }

      this.setupModal.classList.remove("visible");
      this.setupModal.style.opacity = "0";
      this.setupModal.style.visibility = "hidden";

      this.startGame(nums, aiSide);
    } catch (e) {
      alert("Invalid input. Please enter positive integers only.");
    }
  }

  loadState(gameState) {
    this.game.board = new Board(gameState.board.grid);
    this.game.currentIndex = gameState.currentIndex;
    this.isAnimating = false;

    // Reset selection and update UI
    this.exitSelectionMode();
    this.redrawBoard();
    this.updateStatus();
    this.analysis?.updatePanel(); // Update analysis panel on load
  }

  startGame(rows, aiSide) {
    this.initialPartition = [...rows];
    this.game = new Game(new Board(rows), aiSide);
    this.hoveredMove = null;
    this.isAnimating = false;
    this.gameHistory = [];
    this.movesSequence = []; // Reset moves tracking
    this.gameStartTime = new Date(); // Track when game started

    this.gameHistory = []; //For analysis mode

    // Clear Grundy memoization for new game
    grundyMemo.clear();

    // Reset selection mode
    this.exitSelectionMode();

    this.redrawBoard();
    this.updateStatus();
    if (this.game.isAiTurn()) {
      this.aiTurn();
    }
    // Notify analysis module that a new game has started
    this.analysis?.onGameStart();
  }

  aiTurn() {
    if (!this.game || !this.game.isAiTurn() || this.isAnimating) return;

    this.aiThinkingIndicator.classList.add("thinking");

    setTimeout(() => {
      this.aiThinkingIndicator.classList.remove("thinking");

      try {
        // Get the optimal move using Grundy theory
        let selectedPieces;

        if (this.aiDifficulty === "Easy") {
          // Easy AI: Make random moves
          const selectablePieces = this.game.board.getSelectableLastPieces();
          if (selectablePieces.length > 0) {
            // Randomly select 1 to all selectable pieces
            const numToSelect =
              Math.floor(Math.random() * selectablePieces.length) + 1;
            selectedPieces = [];
            const shuffled = [...selectablePieces].sort(
              () => Math.random() - 0.5
            );
            for (let i = 0; i < numToSelect; i++) {
              selectedPieces.push(shuffled[i]);
            }
            console.log(
              `AI (Easy) selected ${selectedPieces.length} random pieces`
            );
          }
        } else if (this.aiDifficulty === "Medium") {
          // Medium AI: 70% chance of optimal move, 30% chance of random
          if (Math.random() < 0.7) {
            selectedPieces = perfectMove(this.game.board.asTuple());
            console.log(
              `AI (Medium) playing optimal move with ${selectedPieces.length} pieces`
            );
          } else {
            // Make a random move
            const allMoves = [...allCornerMoves(this.game.board)];
            if (allMoves.length > 0) {
              selectedPieces =
                allMoves[Math.floor(Math.random() * allMoves.length)];
              console.log(
                `AI (Medium) playing random move with ${selectedPieces.length} pieces`
              );
            }
          }
        } else {
          // Hard AI: Always play optimally
          selectedPieces = perfectMove(this.game.board.asTuple());
          console.log(
            `AI (Hard) playing optimal move with ${selectedPieces.length} pieces`
          );
        }

        // Execute the move
        if (selectedPieces && selectedPieces.length > 0) {
          this.executeWithAnimation(selectedPieces);
        } else {
          console.warn("AI could not find valid move, using fallback");
          // Fallback: use the old corner move if something went wrong
          this.executeWithAnimation();
        }
      } catch (error) {
        console.error("AI error:", error);
        // Fallback to the original corner move
        this.executeWithAnimation();
      }
    }, this.AI_THINK_MS);
  }

  handleMouseMove(event) {
    if (
      !this.game ||
      this.game.isAiTurn() ||
      this.isAnimating ||
      this.game.board.isEmpty()
    )
      return;

    const rect = this.boardArea.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    const centerOffset = this.getBoardCenterOffset();
    let detectedMove = null;

    // Check if mouse is over any cell in the board (excluding label areas)
    for (let r = 0; r < this.game.board.height(); r++) {
      for (let c = 0; c < this.game.board.rows[r]; c++) {
        const cellLeft = centerOffset.x + c * (this.CELL + this.GAP);
        const cellTop = centerOffset.y + r * (this.CELL + this.GAP);
        const cellRight = cellLeft + this.CELL;
        const cellBottom = cellTop + this.CELL;

        if (
          mouseX >= cellLeft &&
          mouseX <= cellRight &&
          mouseY >= cellTop &&
          mouseY <= cellBottom
        ) {
          detectedMove = "corner";
          break;
        }
      }
      if (detectedMove) break;
    }

    if (detectedMove !== this.hoveredMove) {
      if (detectedMove) SoundManager.play("hover");
      this.hoveredMove = detectedMove;
      this.highlightCornerMove();
    }
    this.boardArea.classList.toggle("clickable", !!this.hoveredMove);
  }

  highlightCornerMove() {
    // Clear existing highlights
    this.gameCard
      .querySelectorAll(".tile.highlighted")
      .forEach((t) => t.classList.remove("highlighted"));

    if (this.hoveredMove === "corner") {
      // Highlight cells that will be removed in Corner move
      const groups = this.getConsecutiveGroups();
      for (const group of groups) {
        const lastRowInGroup = group[group.length - 1];
        const lastCol = this.game.board.rows[lastRowInGroup] - 1;
        if (lastCol >= 0) {
          const tile = document.getElementById(
            `tile-${lastRowInGroup}-${lastCol}`
          );
          if (tile) tile.classList.add("highlighted");
        }
      }
    }
  }

  getConsecutiveGroups() {
    const groups = [];
    let currentGroup = [0];

    for (let i = 1; i < this.game.board.rows.length; i++) {
      if (this.game.board.rows[i] === this.game.board.rows[i - 1]) {
        currentGroup.push(i);
      } else {
        groups.push(currentGroup);
        currentGroup = [i];
      }
    }
    groups.push(currentGroup);
    return groups;
  }

  handleMouseLeave() {
    this.hoveredMove = null;
    this.gameCard
      .querySelectorAll(".tile.highlighted")
      .forEach((t) => t.classList.remove("highlighted"));
    this.boardArea.classList.remove("clickable");
  }

  executeWithAnimation(selectedPieces = null) {
    if (this.isAnimating || this.game.board.isEmpty()) return;
    this.isAnimating = true;
    this.handleMouseLeave();
    SoundManager.play("remove");

    // Highlight and animate removal of affected cells
    if (selectedPieces && selectedPieces.length > 0) {
      // Animate only selected pieces
      selectedPieces.forEach((piece) => {
        const tile = document.getElementById(`tile-${piece.row}-${piece.col}`);
        if (tile) tile.classList.add("removing");
      });
    } else {
      // Default behavior: animate all last pieces
      const groups = this.getConsecutiveGroups();
      for (const group of groups) {
        const lastRowInGroup = group[group.length - 1];
        const lastCol = this.game.board.rows[lastRowInGroup] - 1;
        if (lastCol >= 0) {
          const tile = document.getElementById(
            `tile-${lastRowInGroup}-${lastCol}`
          );
          if (tile) tile.classList.add("removing");
        }
      }
    }

    setTimeout(() => this.finishMove(selectedPieces), this.ANIMATION_MS);
  }

  finishMove(selectedPieces = null) {
    this.saveGameState();

    // Track move for database - format selected pieces as coordinates
    if (selectedPieces && selectedPieces.length > 0) {
      const moveStr = selectedPieces.map((p) => `R${p.row}C${p.col}`).join(",");
      this.movesSequence.push(moveStr);
    }

    const finished = this.game.makeMove(selectedPieces);
    this.isAnimating = false;

    // Update the analysis panel and add to history after a move
    this.analysis?.onMoveMade();

    if (finished) {
      SoundManager.play("win");
      const winnerName =
        this.game.currentPlayer.toLowerCase() === "a" ? "alice" : "bob";
      const winnerType = this.game.isAiTurn() ? "computer" : "human";
      this.gameOverMessage.textContent = `${winnerName} (${winnerType}) wins!`;
      this.gameOverModal.classList.add("visible");

      // Save game to database
      this.storeGameInDatabase(this.game.currentPlayer);

      this.redrawBoard();
      return;
    }
    this.redrawBoard();
    this.updateStatus();
    if (this.game.isAiTurn()) {
      this.aiTurn();
    }
  }

  saveGameState() {
    if (!this.game) return;
    const boardCopy = {
      grid: this.game.board.rows.map((row) => row),
    };
    const gameState = {
      board: boardCopy,
      currentIndex: this.game.currentIndex,
    };
    this.gameHistory = this.gameHistory || [];
    this.gameHistory.push(gameState);
  }

  async storeGameInDatabase(winner) {
    try {
      if (typeof window.DatabaseUtils !== "undefined") {
        await window.DatabaseUtils.storeGameInDatabase(
          "CORNER",
          this.initialPartition,
          this.movesSequence,
          winner,
          this.gameStartTime
        );
      }
    } catch (error) {
      console.warn("Could not store Corner game in database:", error.message);
    }
  }

  getBoardCenterOffset() {
    if (!this.game || !this.initialPartition.length) return { x: 0, y: 0 };

    const maxWidth = Math.max(...this.initialPartition);
    const maxHeight = this.initialPartition.length;

    // Calculate dimensions including gaps (no label space in centering)
    const boardDataWidth = maxWidth * this.CELL + (maxWidth - 1) * this.GAP;
    const boardDataHeight = maxHeight * this.CELL + (maxHeight - 1) * this.GAP;
    const minDimension = 480;
    let boardWidth = Math.max(this.MARGIN * 2 + boardDataWidth, minDimension);
    let boardHeight = Math.max(this.MARGIN * 2 + boardDataHeight, minDimension);

    // Calculate centering offset - keep original centering
    return {
      x: (boardWidth - boardDataWidth) / 2,
      y: this.MARGIN, // Keep original top margin
    };
  }

  redrawBoard() {
    this.boardArea.querySelectorAll(".tile").forEach((tile) => tile.remove());
    this.boardArea.querySelectorAll(".label-cell").forEach((label) => label.remove());
    if (!this.game) return;

    const maxWidth = Math.max(...this.initialPartition);
    const maxHeight = this.initialPartition.length;

    // Calculate dimensions including gaps (no label space in centering)
    const boardDataWidth = maxWidth * this.CELL + (maxWidth - 1) * this.GAP;
    const boardDataHeight = maxHeight * this.CELL + (maxHeight - 1) * this.GAP;
    const minDimension = 480;
    let boardWidth = Math.max(this.MARGIN * 2 + boardDataWidth, minDimension);
    let boardHeight = Math.max(this.MARGIN * 2 + boardDataHeight, minDimension);

    // Calculate centering offset
    const centerOffset = this.getBoardCenterOffset();

    // Draw row labels (on the left side) - only in analysis mode
    if (this.analysis && this.analysis.isEnabled) {
      for (let r = 0; r < maxHeight; r++) {
        const rowLabel = document.createElement("div");
        rowLabel.className = "label-cell";
        rowLabel.textContent = r; // Row numbers start from 0
        rowLabel.style.width = `${this.CELL * 0.6}px`; // Smaller size like CRIM
        rowLabel.style.height = `${this.CELL * 0.6}px`;
        rowLabel.style.left = `${centerOffset.x - this.CELL * 0.6 - this.GAP}px`;
        rowLabel.style.top = `${centerOffset.y + r * (this.CELL + this.GAP) + (this.CELL * 0.2)}px`;
        this.boardArea.appendChild(rowLabel);
      }

      // Draw column labels (on the top) - only in analysis mode
      for (let c = 0; c < maxWidth; c++) {
        const colLabel = document.createElement("div");
        colLabel.className = "label-cell";
        colLabel.textContent = c; // Column numbers start from 0
        colLabel.style.width = `${this.CELL * 0.6}px`; // Smaller size like CRIM
        colLabel.style.height = `${this.CELL * 0.6}px`;
        colLabel.style.left = `${centerOffset.x + c * (this.CELL + this.GAP) + (this.CELL * 0.2)}px`;
        colLabel.style.top = `${centerOffset.y - this.CELL * 0.6 - this.GAP}px`;
        this.boardArea.appendChild(colLabel);
      }
    }

    // Draw all cells (present and removed)
    for (let r = 0; r < maxHeight; r++) {
      for (let c = 0; c < this.initialPartition[r]; c++) {
        const tile = document.createElement("div");
        const isPresent =
          r < this.game.board.rows.length && c < this.game.board.rows[r];
        tile.className = isPresent ? "tile" : "tile empty";
        tile.id = `tile-${r}-${c}`;
        tile.style.width = `${this.CELL}px`;
        tile.style.height = `${this.CELL}px`;
        tile.style.left = `${centerOffset.x + c * (this.CELL + this.GAP)}px`;
        tile.style.top = `${centerOffset.y + r * (this.CELL + this.GAP)}px`;
        this.boardArea.appendChild(tile);
      }
    }

    // Set board dimensions
    this.boardArea.style.width = `${boardWidth}px`;
    this.boardArea.style.height = `${boardHeight}px`;
  }

  updateStatus() {
    if (!this.game) return;
    const kind = this.game.isAiTurn() ? "computer" : "human";
    const player =
      this.game.currentPlayer.toLowerCase() === "a" ? "alice" : "bob";
    const newText = `${player} (${kind}) to move`;
    if (this.statusLabel.textContent === newText) return;
    this.statusLabel.classList.add("exiting");
    setTimeout(() => {
      this.statusLabel.textContent = newText;
      this.statusLabel.classList.remove("exiting");
    }, 200);
  }

  handleMouseClick(event) {
    if (
      !this.game ||
      this.game.board.isEmpty() ||
      this.isAnimating ||
      this.game.isAiTurn()
    ) {
      return;
    }

    if (this.isInSelectionMode) {
      // Handle piece selection
      const rect = this.boardArea.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      const centerOffset = this.getBoardCenterOffset();
      const col = Math.floor((x - centerOffset.x) / (this.CELL + this.GAP));
      const row = Math.floor((y - centerOffset.y) / (this.CELL + this.GAP));

      // Only handle clicks within the actual board area (not on labels)
      if (row >= 0 && row < this.game.board.height() && 
          col >= 0 && col < this.game.board.rows[row]) {
        this.handleTileClick(row, col);
      }
    } else {
      // Enter selection mode
      this.enterSelectionMode();
    }
  }

  handleTileClick(row, col) {
    // Check if this is a selectable piece
    const selectablePiece = this.selectablePieces.find(
      (p) => p.row === row && p.col === col
    );
    if (!selectablePiece) return;

    // Check if already selected
    const selectedIndex = this.selectedPieces.findIndex(
      (p) => p.row === row && p.col === col
    );

    if (selectedIndex >= 0) {
      // Deselect
      this.selectedPieces.splice(selectedIndex, 1);
    } else {
      // Select
      this.selectedPieces.push({ row, col });
    }

    this.updateSelectionDisplay();
    this.updateSelectionButtons();
  }

  enterSelectionMode() {
    this.isInSelectionMode = true;
    this.selectablePieces = this.game.board.getSelectableLastPieces();
    this.selectedPieces = [];

    // Show selection controls
    if (this.selectionControls) {
      this.selectionControls.style.display = "flex";
    }

    this.updateSelectionDisplay();
    this.updateSelectionButtons();
  }

  exitSelectionMode() {
    this.isInSelectionMode = false;
    this.selectablePieces = [];
    this.selectedPieces = [];

    // Hide selection controls
    if (this.selectionControls) {
      this.selectionControls.style.display = "none";
    }

    this.clearSelectionDisplay();
  }

  updateSelectionDisplay() {
    // Clear previous selection styling
    this.boardArea.querySelectorAll(".tile").forEach((tile) => {
      tile.classList.remove("selectable", "selected");
    });

    // Mark selectable pieces
    this.selectablePieces.forEach((piece) => {
      const tile = document.getElementById(`tile-${piece.row}-${piece.col}`);
      if (tile) {
        tile.classList.add("selectable");
      }
    });

    // Mark selected pieces
    this.selectedPieces.forEach((piece) => {
      const tile = document.getElementById(`tile-${piece.row}-${piece.col}`);
      if (tile) {
        tile.classList.add("selected");
      }
    });
    // Trigger the hover analysis
    this.analysis?.updateHover(this.selectedPieces);
  }

  clearSelectionDisplay() {
    this.boardArea.querySelectorAll(".tile").forEach((tile) => {
      tile.classList.remove("selectable", "selected");
    });
  }

  updateSelectionButtons() {
    if (this.confirmSelectionBtn) {
      this.confirmSelectionBtn.disabled = this.selectedPieces.length === 0;
    }
  }

  confirmSelection() {
    if (this.selectedPieces.length === 0) return;

    SoundManager.play("click");
    this.executeWithAnimation(this.selectedPieces);
    this.exitSelectionMode();
  }

  clearSelection() {
    SoundManager.play("click");
    this.selectedPieces = [];
    this.updateSelectionDisplay();
    this.updateSelectionButtons();

    // Clear highlights
    this.analysis?.clearHighlights();
  }

  requestMove() {
    if (
      !this.isAnimating &&
      !this.game.isAiTurn() &&
      !this.game.board.isEmpty()
    ) {
      this.executeWithAnimation();
    }
  }

  showHelp() {
    this.helpPopover.classList.add("visible");
  }
  hideHelp() {
    this.helpPopover.classList.remove("visible");
  }
  initTheme() {
    // Theme initialization is handled by global script.js
  }
  showSetupModal() {
    if (this.gameOverModal) {
      this.gameOverModal.classList.remove("visible");
    }
    if (this.setupModal) {
      this.setupModal.classList.add("visible");
      this.setupModal.style.opacity = "1";
      this.setupModal.style.visibility = "visible";
    }
  }
  updateDifficultyLabel() {
    const value = parseInt(this.difficultySlider.value);
    let difficulty;
    switch (value) {
      case 1:
        difficulty = "easy";
        break;
      case 2:
        difficulty = "medium";
        break;
      case 3:
        difficulty = "hard";
        break;
      default:
        difficulty = "medium";
        break;
    }
    this.difficultyLabel.textContent = difficulty;
  }
  generatePartition() {
    const partitionType = this.partitionTypeSelect.value;
    const n = parseInt(this.partitionNumberInput.value, 10);
    let partition;
    if (partitionType === "random") {
      partition = randomPartition(n);
    } else if (partitionType === "staircase") {
      partition = staircase(n);
    } else if (partitionType === "square") {
      partition = square(n);
    } else if (partitionType === "hook") {
      partition = hook(n);
    }
    this.rowsInput.value = partition.join(" ");
  }

  openGameReport() {
    if (!this.game) return;

    const allStates = (this.gameHistory || []).map(state => {
        const mask = state.board && state.board.grid ? state.board.grid : state.board;
        return mask.join(' ');
    });

    const finalState = this.game.board.rows.join(' ');
    if (finalState) {
        allStates.push(finalState);
    }

    const uniqueStates = allStates.filter((state, index, self) =>
        state && (index === 0 || state !== self[index - 1])
    );

    const statesString = uniqueStates.join('\n');
    localStorage.setItem('cornerGameStatesForReport', statesString);
    window.open('public/report generator/corner_report.html', '_blank');
  }

  downloadGame() {
    if (!this.game) return;
    const allStates = (this.gameHistory || []).map((state) => {
      let mask =
        state.board && state.board.grid ? state.board.grid : state.board;
      return { mask, currentIndex: state.currentIndex };
    });
    let currentMask = this.game.board.rows;
    allStates.push({
      mask: currentMask,
      currentIndex: this.game.currentIndex,
      timestamp: Date.now(),
    });

    const htmlContent = this.generateGameReplayHTML_Corner(
      allStates,
      this.initialPartition
    );
    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Corner-Game-${new Date()
      .toISOString()
      .slice(0, 19)
      .replace(/:/g, "-")}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  generateGameReplayHTML_Corner(gameStates, initialPartition) {
    const title = `Corner Game Replay - ${new Date().toLocaleDateString()}`;
    return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${title}</title>
<style>
 body{font-family:sans-serif;background:#fff;color:#111;margin:0;padding:20px;
       min-height:100vh;display:flex;flex-direction:column;align-items:center;}
 .container{background:#fff;border-radius:20px;padding:30px;max-width:800px;width:100%;
            box-shadow:0 4px 24px #0001;text-align:center;}
 h1{margin-top:0;color:#111;letter-spacing:1px;}
 .controls{margin:20px 0;display:flex;justify-content:center;align-items:center;
           gap:20px;flex-wrap:wrap;}
 button{padding:12px 20px;font-size:16px;border:none;border-radius:8px;
        background:#eee;color:#111;cursor:pointer;transition:all .2s;}
 button:hover{background:#ddd;transform:translateY(-2px);}
 button:disabled{opacity:.5;cursor:not-allowed;transform:none;}
 .state-info{font-size:18px;margin:10px 0;font-weight:bold;color:#111;}
 #game-canvas{border:2px solid #111;border-radius:12px;margin:20px auto;display:block;
             background:#fff;box-shadow:0 8px 25px #0001;}
 .instructions{margin-top:20px;font-size:14px;opacity:.7;line-height:1.6;}
 .error{color:#b00020;background:#f8d7da;padding:12px;border-radius:8px;margin:20px 0;font-size:1.1em;}
</style></head><body>
<div class="container">
 <h1>${title}</h1>
 <div class="state-info">State <span id="current-state">1</span> of
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
  <strong>Autoplay:</strong> Press Play to advance automatically.<br>
  <strong>Corner Rules:</strong> Remove the last cell of each row, except when consecutive rows have the same length - only the last row in each consecutive block loses a cell.
 </div>
</div>
<script>
 const gameStates=${JSON.stringify(gameStates)};
 const initialPartition=${JSON.stringify(initialPartition)};
 let currentStateIndex=0,isPlaying=false,playInterval;
 const CELL_SIZE=40,MARGIN=20;
 const canvas=document.getElementById('game-canvas'),ctx=canvas.getContext('2d');
 const errorDiv=document.getElementById('error-message');
 function drawBoard(mask){
  ctx.clearRect(0,0,canvas.width,canvas.height);
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
  for(let r=0;r<boardHeight;r++){
    const rowLen = initialPartition[r];
    const maskLen = (mask && mask[r] !== undefined) ? (Array.isArray(mask[r]) ? mask[r].reduce((acc,v)=>acc+(v?1:0),0) : mask[r]) : 0;
    for(let c=0;c<rowLen;c++){
      const x=MARGIN+c*CELL_SIZE;
      const y=MARGIN+r*CELL_SIZE;
      ctx.fillStyle = c < maskLen ? '#111' : '#fff';
      ctx.fillRect(x,y,CELL_SIZE,CELL_SIZE);
    }
  }
  ctx.save();ctx.strokeStyle='#fff';ctx.lineWidth=1;
  for(let r=0;r<=boardHeight;r++){const y=MARGIN+r*CELL_SIZE;ctx.beginPath();ctx.moveTo(MARGIN,y);ctx.lineTo(MARGIN+boardWidth*CELL_SIZE,y);ctx.stroke();}
  for(let c=0;c<=boardWidth;c++){const x=MARGIN+c*CELL_SIZE;ctx.beginPath();ctx.moveTo(x,MARGIN);ctx.lineTo(x,MARGIN+boardHeight*CELL_SIZE);ctx.stroke();}
  ctx.restore();
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
    playInterval=setInterval(()=>{if(currentStateIndex<gameStates.length-1)nextState();else toggleAutoplay();},1000);}
 }
 document.addEventListener('keydown',e=>{
   if(e.key==='ArrowLeft'){e.preventDefault();previousState();}
   else if(e.key==='ArrowRight'){e.preventDefault();nextState();}
   else if(e.key===' '){e.preventDefault();toggleAutoplay();}
 });
 updateDisplay();
</script></body></html>`;
  }
}

window.addEventListener("load", () => {
  window.cornerApp = new ProCornerGui();
  // Instantiate and attach the analysis module
  window.cornerApp.analysis = new CornerAnalysis(window.cornerApp);
});