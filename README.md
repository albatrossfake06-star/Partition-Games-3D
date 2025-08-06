# Partition Games

A comprehensive web application featuring 12 different combinatorial partition games, built to support research in combinatorial game theory at Rhodes College.

Under Rhodes College Summer Fellowship '25, this web application is being built by Soumitro (dwiso-28@rhodes.edu) and Aayan (debaa-28@rhodes.edu). The project is supervised by [Prof. Gottlieb](https://www.rhodes.edu/bio/eric-gottlieb) and aimed to support his team's research on combinatorial game theory.

If you find any bug, or just want to talk more about it - please reach out to us.

---

## 🎮 Available Games

### Impartial Games

**🔲 LCTR (Left Column Top Row)**
- Players can remove either the leftmost column or the top row
- Classic impartial game with perfect AI implementation using Sprague-Grundy theorem

**🔄 CRIM (Column Row with Immediate Merge)**
- Remove any row or column, but divided parts merge after each move
- Strategic depth through partition merging mechanics

**🎯 CRIS (Column Row with Independent Splits)**
- Same moves as CRIM, but fragments remain independent
- Multiple partition management adds complexity

**🏹 Sato-Welter**
- Remove a hook shape (upside-down L) from any square
- Eliminates all squares to the right and below the chosen cell

**📊 RIT (Row Inequality Theorem)**
- Remove cells from a row if it has equal or more cells than the row below
- Constraint-based gameplay with strategic row management

**🏠 Corner**
- Remove random subsets of corner pieces from uniform partitions
- Corner identification and strategic removal

**🔄 AntiCorner**
- Sato-Welter style moves but targeting anti-corner positions
- Inverted strategy from traditional corner games

**📈 Continuous Corner**
- Select consecutive ranges of corner pieces
- Sequential selection mechanics

**⬆️ CRIT (Column Row with Inequality Theorem)**
- Enhanced RIT with both row and column comparison moves
- Dual-axis strategic gameplay

**🎯 SCC (Strict Continuous Corner)**
- Must begin with topmost or bottommost corner
- Sequential subset selection with positional constraints

### Partizan Games

**🔴 CRPM (Column Row Partizan with Merge)**
- Player A removes rows, Player B removes columns
- Partizan version of CRIM with role-based restrictions

**🔵 CRPS (Column Row Partizan with Splits)**
- Player A controls rows, Player B controls columns in fragment partitions
- Partizan adaptation of CRIS with independent fragments

---

## ✨ Features

* **🎮 12 Unique Games:** Comprehensive collection of partition-based combinatorial games
* **🤖 Advanced AI:** Smart opponents with multiple difficulty levels using game theory algorithms
* **🎨 Multiple Themes:** Customizable visual themes with retro 8-bit aesthetics
* **🌙 Dark/Light Modes:** Automatic system preference detection with manual toggle
* **🔊 Sound Effects:** Immersive audio feedback for game interactions
* **👥 Multiplayer Support:** Real-time multiplayer with room codes for competitive play
* **📱 Fully Responsive:** Optimized for desktop, tablet, and mobile devices
* **📖 Comprehensive Documentation:** Detailed game rules and strategy guides
* **🎯 Educational Focus:** Designed to support combinatorial game theory research

---

## 🛠️ Development

This project is built with modern web technologies, focusing on performance and accessibility.

### Project Structure

```
Partition-Games/
├── index.html              # Main landing page
├── wiki.html              # Game documentation hub
├── developers.html         # Developer information
├── [game]_page.html       # Individual game pages
├── [game]_script.js       # Game logic and AI implementations
├── style.css              # Global styles
├── unified_game_styles.css # Shared game styling
├── public/                # Static assets and documentation
│   ├── wikidocus/         # Game rules and guides
│   └── assets/            # Images and media
├── server/                # Backend for multiplayer support
│   ├── server.js          # Node.js server
│   ├── schema.sql         # Database schema
│   └── tests/             # Test suites
└── docs/                  # Research papers and documentation
```

### Running Locally

1. **Clone the repository:**
   ```bash
   git clone https://github.com/ScarletrRaptor8/Partition-Games.git
   cd Partition-Games
   ```

2. **For single-player games:**
   Simply open `index.html` in your browser, or use a local server:
   ```bash
   # Python 3
   python -m http.server 8000
   
   # Node.js
   npx serve .
   
   # PHP
   php -S localhost:8000
   ```

3. **For multiplayer functionality:**
   ```bash
   cd server
   npm install
   npm start
   ```

### Development Guidelines

- Each game follows the same architectural pattern for consistency
- AI implementations use game theory algorithms (Sprague-Grundy, minimax, etc.)
- Responsive design ensures compatibility across all devices
- Comprehensive test coverage for game logic and multiplayer features

---

## 💻 Technologies Used

**Frontend:**
- **HTML5** - Semantic structure and accessibility
- **CSS3** - Modern styling with Grid, Flexbox, and CSS Variables
- **Vanilla JavaScript (ES6+)** - Game logic, AI, and DOM manipulation
- **MathJax** - Mathematical notation rendering

**Backend:**
- **Node.js** - Server-side JavaScript runtime
- **Express.js** - Web application framework
- **Socket.io** - Real-time multiplayer communication
- **PostgreSQL** - Database for game statistics and user data

**Development & Testing:**
- **Jest** - Unit testing framework
- **Cypress** - End-to-end testing
- **GitHub Actions** - Continuous integration

## 👥 Multiplayer

Experience competitive partition gaming with real-time multiplayer support.

### Features
- **Real-time gameplay** using WebSocket connections
- **Room-based matching** with shareable room codes
- **Cross-platform compatibility** - play on any device
- **Synchronized game state** with automatic reconnection
- **Spectator mode** for observing ongoing matches

### How to Play Multiplayer

1. Navigate to the [multiplayer page](corner_multiplayer.html)
2. Create a new room or join an existing one with a room code
3. Share the room code with your opponent
4. Start playing once both players have joined

Currently available for the Corner game, with more games being added to multiplayer support.

---

## 🚀 Deployment

The application is designed for easy deployment on various platforms:

### Static Hosting (for single-player games)
- **GitHub Pages** - Direct deployment from repository
- **Netlify** - Drag and drop deployment
- **Vercel** - Git-based continuous deployment

### Full-Stack Deployment (for multiplayer)
- **Render** - Automatic deployment from GitHub
- **Railway** - Database and server hosting
- **Heroku** - Traditional PaaS deployment

See `docs/DEPLOYMENT_GUIDE.md` for detailed deployment instructions.

---

## 📖 Documentation

- **[Wiki](wiki.html)** - Comprehensive game rules and strategies
- **[Developer Guide](developers.html)** - Team information and project details
- **Research Papers** - Available in `docs/papers/` directory
- **API Documentation** - Server endpoints and multiplayer protocols

---

## 🤝 Contributing

This project is part of an academic research initiative. While the primary development is conducted by the Rhodes College team, we welcome:

- Bug reports and issue submissions
- Suggestions for game improvements
- Academic collaboration on combinatorial game theory
- Educational use and adaptation

---

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Professor Eric Gottlieb** - Research supervision and combinatorial game theory expertise
- **Rhodes College** - Summer Fellowship Program support
- **Open Source Community** - Various libraries and tools that made this project possible
