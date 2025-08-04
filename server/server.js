const cors = require('cors');
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

// Database connection - ADD THIS SECTION
const { Pool } = require('pg');

// Create a new pool instance using the environment variable
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Required for Neon connections
  }
});

// Test the connection
pool.connect((err, client, release) => {
  if (err) {
    return console.error('Error acquiring client', err.stack);
  }
  console.log('Successfully connected to the PostgreSQL database!');
  client.release(); // Release the client back to the pool
});

const app = express();
const server = http.createServer(app);

// Environment configuration
const isProduction = process.env.NODE_ENV === 'production';
const allowedOrigins = isProduction
  ? ['https://partitiongames.netlify.app', 'https://www.partitiongames.netlify.app']
  : ['http://localhost:8000', 'http://127.0.0.1:8000', 'http://localhost:3000'];

// Enable CORS for Socket.IO
const io = socketIo(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    allowedHeaders: ["*"],
    credentials: true
  },
  allowEIO3: true
});

// Enable CORS for Express
app.use(cors({
  origin: allowedOrigins,
  methods: ["GET", "POST", "OPTIONS"],
  credentials: true
}));

app.use(express.json());

// In-memory storage for active games (will be replaced with database later)
const activeGames = {};

// Game logic functions (copied from frontend for server-side validation)
class Board {
  constructor(rows) {
    this.rows = [...rows];
  }

  isEmpty() {
    return this.rows.length === 0;
  }

  height() {
    return this.rows.length;
  }

  width() {
    return this.rows.length ? Math.max(...this.rows) : 0;
  }

  removeTopRow() {
    this.rows.shift();
  }

  removeLeftColumn() {
    this.rows = this.rows.map(r => r - 1).filter(r => r > 0);
  }

  asTuple() {
    return JSON.stringify(this.rows);
  }
}

// Generate a unique 5-character room ID
function generateRoomId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Validate move
function isValidMove(board, moveKind) {
  if (moveKind === 'row') {
    return board.height() > 0;
  } else if (moveKind === 'col') {
    return board.width() > 0;
  }
  return false;
}

// [Rest of your Socket.IO and Express code remains exactly the same]
io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);
  
  // Handle creating a new game
  socket.on('createGame', (initialBoard) => {
    try {
      console.log(`Creating game for ${socket.id} with board:`, initialBoard);
      // Generate unique room ID
      let roomId;
      do {
        roomId = generateRoomId();
      } while (activeGames[roomId]);

      // Create new game object
      const gameState = {
        roomId,
        board: new Board(initialBoard),
        players: [socket.id], // Creator is first player (Alice)
        currentPlayerIndex: 0, // Alice starts first
        gameStarted: false
      };

      activeGames[roomId] = gameState;
      socket.join(roomId);

      console.log(`Game created with room ID: ${roomId}`);
      socket.emit('gameCreated', { roomId });
    } catch (error) {
      console.error('Error creating game:', error);
      socket.emit('error', 'Failed to create game');
    }
  });

  // Handle joining an existing game
  socket.on('joinGame', (roomId) => {
    try {
      console.log(`${socket.id} attempting to join room: ${roomId}`);
      const game = activeGames[roomId];

      // Check if room exists
      if (!game) {
        socket.emit('error', 'Game room not found');
        return;
      }

      // Check if room has space for another player
      if (game.players.length >= 2) {
        socket.emit('error', 'Game room is full');
        return;
      }

      // Check if game has already started
      if (game.gameStarted) {
        socket.emit('error', 'Game has already started');
        return;
      }

      // Add player to the game
      game.players.push(socket.id);
      socket.join(roomId);
      game.gameStarted = true;

      console.log(`Game starting in room ${roomId} with players:`, game.players);

      // Notify both players that the game is starting
      io.to(roomId).emit('gameStart', {
        board: game.board.rows,
        players: game.players,
        currentPlayer: game.currentPlayerIndex // Alice (index 0) starts first
      });
    } catch (error) {
      console.error('Error joining game:', error);
      socket.emit('error', 'Failed to join game');
    }
  });

  // Handle player moves
  socket.on('makeMove', ({ roomId, moveKind }) => {
    try {
      console.log(`${socket.id} making move ${moveKind} in room ${roomId}`);
      const game = activeGames[roomId];

      // Validate game exists
      if (!game) {
        socket.emit('error', 'Game not found');
        return;
      }

      // Validate game has started
      if (!game.gameStarted) {
        socket.emit('error', 'Game has not started yet');
        return;
      }

      // Validate it's the correct player's turn
      const currentPlayerSocketId = game.players[game.currentPlayerIndex];
      console.log(`Move validation - Current player: ${currentPlayerSocketId}, Requesting player: ${socket.id}`);
      if (socket.id !== currentPlayerSocketId) {
        console.log(`REJECTED: Not player's turn`);
        socket.emit('error', 'Not your turn');
        return;
      }

      // Validate the move is legal
      if (!isValidMove(game.board, moveKind)) {
        console.log(`REJECTED: Invalid move ${moveKind} for board:`, game.board.rows);
        socket.emit('error', 'Invalid move');
        return;
      }

      // Apply the move to the server's board state
      console.log(`Before move - Board:`, game.board.rows, `Player: ${game.currentPlayerIndex}`);
      if (moveKind === 'row') {
        game.board.removeTopRow();
      } else if (moveKind === 'col') {
        game.board.removeLeftColumn();
      }

      // Check if the game is over
      const gameEnded = game.board.isEmpty();
      if (!gameEnded) {
        // Switch to the other player
        game.currentPlayerIndex = 1 - game.currentPlayerIndex;
      }

      console.log(`After move - Board:`, game.board.rows, `Game ended: ${gameEnded}, Current player: ${game.currentPlayerIndex}`);

      // Send update to both players
      io.to(roomId).emit('gameStateUpdate', {
        board: game.board.rows,
        moveKind,
        currentPlayer: game.currentPlayerIndex,
        gameEnded,
        winner: gameEnded ? game.currentPlayerIndex : null // Current player wins since they made the last move
      });

      // Clean up finished games
      if (gameEnded) {
        setTimeout(() => {
          delete activeGames[roomId];
          console.log(`Cleaned up finished game: ${roomId}`);
        }, 30000); // Clean up after 30 seconds
      }
    } catch (error) {
      console.error('Error making move:', error);
      socket.emit('error', 'Failed to make move');
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    // Find and clean up any games this player was in
    for (const [roomId, game] of Object.entries(activeGames)) {
      if (game.players.includes(socket.id)) {
        // Notify other players in the room
        socket.to(roomId).emit('playerDisconnected', {
          message: 'Your opponent has disconnected'
        });
        // Clean up the game
        delete activeGames[roomId];
        console.log(`Cleaned up game ${roomId} due to player disconnect`);
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`LCTR Multiplayer Server running on port ${PORT}`);
  console.log(`Environment: ${isProduction ? 'Production' : 'Development'}`);
  console.log(`Allowed origins: ${allowedOrigins.join(', ')}`);
  console.log(`Active games will be stored in memory`);
});

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    activeGames: Object.keys(activeGames).length,
    timestamp: new Date().toISOString(),
    environment: isProduction ? 'production' : 'development'
  });
});

// Root endpoint for basic info
app.get('/', (req, res) => {
  res.json({
    service: 'LCTR Multiplayer Server',
    version: '1.0.0',
    status: 'running',
    environment: isProduction ? 'production' : 'development',
    activeGames: Object.keys(activeGames).length
  });
});

// Get active games info (for debugging)
app.get('/games', (req, res) => {
  const gamesInfo = {};
  for (const [roomId, game] of Object.entries(activeGames)) {
    gamesInfo[roomId] = {
      players: game.players.length,
      gameStarted: game.gameStarted,
      currentPlayer: game.currentPlayerIndex,
      boardState: game.board.rows
    };
  }
  res.json(gamesInfo);
});
