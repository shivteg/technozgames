# TechnozGames 🎮⚡

Welcome to **TechnozGames** — a high-octane 2D arcade battle arena game platform built with pure HTML5 Canvas, modern CSS, and vanilla JavaScript.

## 🥊 Features

- **2-Fighter Real-Time Battle**:
  - **Volt Striker (Player 1)**: Swift cyber ninja armed with lightning strikes, double jumps, and Thunder Surge super blast.
  - **Crimson Titan (Player 2 / CPU)**: Heavy fiery brawler wielding magma punches, devastating heavy kick combos, and Infernal Meteor super beam.
- **Multiple Game Modes**:
  - 🤖 **Player vs CPU**: Battle against an AI with 3 selectable difficulty levels (Novice, Warrior, Cyber Master).
  - 👥 **2-Player Local**: Challenge a friend on the same keyboard in local split-controls battle.
  - 🎯 **Training Mode**: Practice moves, combos, and timing against a sparring dummy.
- **Dynamic Points & Scoring System**:
  - Real-time in-game points calculated for every strike, combo chain, and perfect block.
  - Combo multiplier system (1.2x up to 3.0x multiplier on chained hits).
  - End-of-round points bonuses:
    - **Health Remaining Bonus** (`HP × 25 pts`)
    - **Speed / Time Bonus** (`Seconds Left × 40 pts`)
    - **Flawless Victory (Perfect) Bonus** (`+3,000 pts`)
    - **Round Win Bonus** (`+1,500 pts`)
  - Post-match breakdown screen showing total calculated score, crowning the winner accordingly, and saving high scores to local leaderboard.
- **Integrated Synthesizer Audio (Web Audio API)**:
  - Zero external MP3/WAV dependencies! All sounds (punches, kicks, energy super blasts, shield blocks, count-down beeps, and KO fanfare) are synthesized mathematically in real-time.
- **Visuals & Juice**:
  - Dynamic screen shake on heavy impacts.
  - Multi-stage particle engine (hit sparks, floating combo score popups, dust puffs, shockwaves).
  - Glowing Cyberpunk Arena with neon animated skyline and atmospheric lighting.

---

## 🕹️ Controls

### Player 1 (Volt Striker - Blue)
| Action | Key |
| :--- | :--- |
| Move Left / Right | `A` / `D` |
| Jump (Double Jump enabled!) | `W` |
| Crouch / Guard (Block 70% damage) | `S` |
| Light Attack (Punch) | `J` (or `F`) |
| Heavy Attack (Slash/Kick) | `K` (or `G`) |
| Super Move (Thunder Surge) | `L` (or `R`) *(Requires 100 Super Energy)* |

### Player 2 (Crimson Titan - Red)
| Action | Key |
| :--- | :--- |
| Move Left / Right | `Left Arrow` / `Right Arrow` |
| Jump | `Up Arrow` |
| Crouch / Guard | `Down Arrow` |
| Light Attack (Punch) | `Num 1` (or `U` / `,`) |
| Heavy Attack (Kick) | `Num 2` (or `I` / `.`) |
| Super Move (Infernal Meteor) | `Num 3` (or `O` / `/`) *(Requires 100 Super Energy)* |

---

## 🚀 How to Play

No compilation or external tools needed!
Simply open `index.html` in any modern web browser (Google Chrome, Microsoft Edge, Mozilla Firefox, Safari).

Or run a local development server:
```bash
# Python
python -m http.server 8080

# Node.js
npx serve .
```
Then visit `http://localhost:8080` in your browser.
