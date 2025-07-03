# LCTR - The Left Column Top Row Game

A polished, web-based implementation of the classic impartial game "Left Column, Top Row" (LCTR), built with pure JavaScript, HTML, and CSS. This project features a challenging AI, customizable themes, and a retro 8-bit aesthetic.

![LCTR Gameplay Screenshot](https://placehold.co/800x500/1f2937/f9fafb?text=LCTR%20Game%20Screenshot)

---

## 🎮 Play Online

Experience the game live in your browser!

**[Click here to play LCTR](https://your-game-link-here.com)** *(Replace with your actual deployment link)*

---

## ✨ Features

* **Classic Gameplay:** Simple to learn, yet strategically deep. Can you outsmart your opponent?
* **🤖 Smart AI Opponent:** Face off against a computer player with adjustable difficulty levels:
    * **Hard:** A perfect AI that will always make the optimal move based on Sprague-Grundy theorem.
    * **Medium:** A more forgiving AI that has a chance to make mistakes.
    * **Easy:** A beginner-friendly AI that plays more randomly.
* **🎨 Multiple Themes:** Customize the look of your game with several 8-bit themes, including Grass, Stone, and Ice.
* **🌙 Light & Dark Modes:** Automatically adapts to your system preference, or toggle manually for comfortable viewing.
* **🔊 Sound Effects:** Retro sound effects for an immersive, satisfying game feel.
* **👾 Animated Interface:** A pixelated aesthetic with smooth animations for tile removal, UI elements, and a scrolling starfield background.
* **✅ Fully Responsive:** Play on any device, from a desktop monitor to your mobile phone.

---

## 룰 How to Play

The rules are simple:

1.  The game is played on a grid of tiles.
2.  On your turn, you must make one of two possible moves:
    * Remove the **entire top row** of tiles.
    * Remove the **entire leftmost column** of tiles.
3.  The player who takes the very last tile on the board wins!

---

## 🛠️ Development

This project is built with vanilla HTML, CSS, and JavaScript, with no external frameworks or libraries.

### Running Locally

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/your-username/lctr-game.git](https://github.com/your-username/lctr-game.git)
    ```

2.  **Navigate to the project directory:**
    ```bash
    cd lctr-game
    ```

3.  **Open `index.html`:**
    Simply open the `index.html` file in your favorite web browser to play the game locally. For the best experience (especially for sound effects), it's recommended to use a simple local server.

    If you have Python installed, you can run:
    ```bash
    # For Python 3
    python -m http.server
    ```
    Then, navigate to `http://localhost:8000` in your browser.

---

## 💻 Technologies Used

* **HTML5:** For the core structure and content.
* **CSS3:** For all styling, animations, responsiveness, and theming using modern features like CSS Variables and Grid.
* **Vanilla JavaScript (ES6+):** For all game logic, AI implementation (Sprague-Grundy theorem), and DOM manipulation.

---

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
