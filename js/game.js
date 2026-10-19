/**
 * TechnozGames - Core Game Engine
 * Orchestrates combat loop, hitboxes, collision resolution, round lifecycle,
 * screen shake, background rendering, and points calculation.
 */

class GameEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    // Visual dimensions
    this.width = canvas.width;
    this.height = canvas.height;

    // Particles & VFX
    this.particles = new ParticleSystem();

    // Fighters
    this.p1 = new Fighter({
      id: 1,
      name: 'Volt Striker',
      type: 'volt',
      x: 180,
      facing: 1,
      themeColor: '#00f0ff',
      accentColor: '#0066cc'
    });

    this.p2 = new Fighter({
      id: 2,
      name: 'Crimson Titan',
      type: 'crimson',
      x: 760,
      facing: -1,
      themeColor: '#ff5500',
      accentColor: '#cc2200'
    });

    // AI Controller for CPU
    this.ai = new AIController('medium');

    // Game Mode: 'pvcpu', 'pvp', 'training'
    this.gameMode = 'pvcpu';

    // Round Management
    this.currentRound = 1;
    this.maxRoundsToWin = 2; // Best of 3
    this.timer = 60;
    this.timerInterval = null;
    this.roundState = 'idle'; // 'countdown', 'fighting', 'round_over', 'match_over', 'paused'
    this.roundEndTimer = 0;

    // Screen Shake
    this.screenShake = 0;
    this.shakeDecay = 0.9;

    // Background Animation Frames
    this.bgFrame = 0;

    // Input States
    this.keys = {};
    this.p1Inputs = { left: false, right: false, down: false, jumpPressed: false, punchPressed: false, kickPressed: false, superPressed: false };
    this.p2Inputs = { left: false, right: false, down: false, jumpPressed: false, punchPressed: false, kickPressed: false, superPressed: false };

    // Bindings
    this.setupKeyboardListeners();
  }

  setupKeyboardListeners() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.key.toLowerCase()] = true;
      this.keys[e.code] = true;

      // Prevent scrolling on arrow keys or space
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }

      // Quick pause key (Escape or P)
      if (e.key === 'Escape' || e.key.toLowerCase() === 'p') {
        if (this.roundState === 'fighting') {
          this.togglePause();
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.key.toLowerCase()] = false;
      this.keys[e.code] = false;
    });
  }

  setMode(mode, difficulty = 'medium') {
    this.gameMode = mode;
    this.ai.setDifficulty(difficulty);
    const p2Label = document.getElementById('p2-role-label');
    if (p2Label) {
      if (mode === 'pvcpu') {
        p2Label.textContent = `CPU (${difficulty.toUpperCase()})`;
      } else if (mode === 'pvp') {
        p2Label.textContent = 'PLAYER 2';
      } else {
        p2Label.textContent = 'TRAINING BOT';
      }
    }
    const modeLabel = document.getElementById('current-mode-label');
    if (modeLabel) {
      modeLabel.textContent = mode === 'pvcpu' ? 'Player vs CPU' : (mode === 'pvp' ? '2-Player Local' : 'Training Dojo');
    }
  }

  startNewMatch() {
    this.currentRound = 1;
    this.p1.resetFull(180, 1);
    this.p2.resetFull(760, -1);
    this.particles.reset();
    this.updateHUD();
    this.startRound(this.currentRound);
  }

  startRound(roundNumber) {
    this.currentRound = roundNumber;
    this.timer = this.gameMode === 'training' ? 999 : 60;
    this.p1.resetForRound(180, 1);
    this.p2.resetForRound(760, -1);
    this.particles.reset();
    this.roundState = 'countdown';

    // Update Round Badge
    const roundLabel = document.getElementById('hud-round-label');
    if (roundLabel) {
      roundLabel.textContent = this.gameMode === 'training' ? 'PRACTICE' : `ROUND ${this.currentRound}`;
    }

    // Announce Round
    this.showAnnouncement(`ROUND ${this.currentRound}`, 'GET READY!');
    if (window.soundEngine) window.soundEngine.playCountdown(false);

    // Sequence to FIGHT!
    setTimeout(() => {
      if (this.roundState !== 'countdown') return;
      this.showAnnouncement('FIGHT!', 'GO!');
      if (window.soundEngine) window.soundEngine.playCountdown(true);

      setTimeout(() => {
        this.hideAnnouncement();
        this.roundState = 'fighting';
        this.startTimer();
      }, 700);
    }, 1200);
  }

  startTimer() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    if (this.gameMode === 'training') return;

    this.timerInterval = setInterval(() => {
      if (this.roundState !== 'fighting') return;
      this.timer--;

      const timerEl = document.getElementById('hud-timer');
      if (timerEl) {
        timerEl.textContent = this.timer;
        if (this.timer <= 10) {
          timerEl.classList.add('danger');
        } else {
          timerEl.classList.remove('danger');
        }
      }

      if (this.timer <= 0) {
        this.timer = 0;
        this.handleTimeUp();
      }
    }, 1000);
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  handleTimeUp() {
    this.stopTimer();
    this.roundState = 'round_over';
    this.showAnnouncement('TIME UP!', 'DECISION TIME');

    // Winner decided by remaining health
    let winner = null;
    if (this.p1.hp > this.p2.hp) {
      winner = this.p1;
    } else if (this.p2.hp > this.p1.hp) {
      winner = this.p2;
    }

    this.resolveRoundWinner(winner, 'TIME OVER');
  }

  handleKo(defeatedFighter) {
    this.stopTimer();
    this.roundState = 'round_over';
    this.screenShake = 18; // Cinematic impact shake

    const winner = defeatedFighter.id === 1 ? this.p2 : this.p1;
    winner.state = 'victory';

    this.showAnnouncement('K.O.!', `${winner.name.toUpperCase()} WINS ROUND!`);

    setTimeout(() => {
      this.resolveRoundWinner(winner, 'KNOCKOUT');
    }, 1400);
  }

  resolveRoundWinner(winner, reason) {
    if (winner) {
      winner.roundsWon++;
      
      // Calculate Round End Points
      const roundWinBonus = 1500;
      const hpBonus = Math.round(winner.hp * 25);
      const timeBonus = this.timer * 40;
      const perfectBonus = winner.perfectRound ? 3000 : 0;

      const totalBonus = roundWinBonus + hpBonus + timeBonus + perfectBonus;
      winner.points += totalBonus;

      this.particles.addFloatingText(winner.x + winner.width / 2, winner.y - 40, `+${totalBonus} ROUND BONUS!`, '#ffd700', 22);

      if (winner.perfectRound) {
        this.showAnnouncement('PERFECT!', '+3,000 FLAWLESS BONUS');
      }
    }

    this.updateHUD();

    // Check Match Win Condition (First to 2 wins)
    setTimeout(() => {
      if (this.p1.roundsWon >= this.maxRoundsToWin || this.p2.roundsWon >= this.maxRoundsToWin) {
        this.handleMatchWinner();
      } else {
        // Next round
        this.startRound(this.currentRound + 1);
      }
    }, 2000);
  }

  handleMatchWinner() {
    this.roundState = 'match_over';
    this.stopTimer();

    // Determine Championship Victor
    const victor = this.p1.roundsWon >= this.maxRoundsToWin ? this.p1 : this.p2;
    const runnerUp = victor.id === 1 ? this.p2 : this.p1;

    // Award Championship Crown Bonus (+5,000 pts)
    const championshipBonus = 5000;
    victor.points += championshipBonus;

    if (window.soundEngine) window.soundEngine.playVictoryFanfare();

    this.showAnnouncement('CHAMPION!', `${victor.name.toUpperCase()}`);

    // Trigger Results Modal with Points Breakdown
    setTimeout(() => {
      this.hideAnnouncement();
      window.technozUI.showMatchResults(victor, runnerUp, this.p1, this.p2);
    }, 1800);
  }

  togglePause() {
    const pauseOverlay = document.getElementById('pause-overlay');
    if (this.roundState === 'fighting') {
      this.roundState = 'paused';
      if (pauseOverlay) pauseOverlay.classList.remove('hidden');
    } else if (this.roundState === 'paused') {
      this.roundState = 'fighting';
      if (pauseOverlay) pauseOverlay.classList.add('hidden');
    }
  }

  // Announcements overlay helper
  showAnnouncement(title, subtitle) {
    const overlay = document.getElementById('announcement-overlay');
    const titleEl = document.getElementById('announcement-title');
    const subEl = document.getElementById('announcement-subtitle');
    if (overlay && titleEl && subEl) {
      titleEl.textContent = title;
      subEl.textContent = subtitle;
      overlay.classList.add('show');
    }
  }

  hideAnnouncement() {
    const overlay = document.getElementById('announcement-overlay');
    if (overlay) overlay.classList.remove('show');
  }

  // Collect player inputs from keys
  gatherInputs() {
    // Player 1: WASD + J (punch), K (kick), L (super) | or F, G, R
    const p1Jump = this.keys['w'] || this.keys['keyw'] || false;
    const p1Punch = this.keys['j'] || this.keys['f'] || false;
    const p1Kick = this.keys['k'] || this.keys['g'] || false;
    const p1Super = this.keys['l'] || this.keys['r'] || false;

    this.p1Inputs = {
      left: this.keys['a'] || this.keys['keya'] || false,
      right: this.keys['d'] || this.keys['keyd'] || false,
      down: this.keys['s'] || this.keys['keys'] || false,
      jumpPressed: p1Jump && !this.p1PrevJump,
      punchPressed: p1Punch && !this.p1PrevPunch,
      kickPressed: p1Kick && !this.p1PrevKick,
      superPressed: p1Super && !this.p1PrevSuper
    };

    this.p1PrevJump = p1Jump;
    this.p1PrevPunch = p1Punch;
    this.p1PrevKick = p1Kick;
    this.p1PrevSuper = p1Super;

    // Player 2 / CPU Inputs
    if (this.gameMode === 'pvp') {
      // 2-Player Local: Arrow keys + Num1, Num2, Num3 (or U, I, O / comma, period, slash)
      const p2Jump = this.keys['arrowup'] || this.keys['up'] || false;
      const p2Punch = this.keys['1'] || this.keys['numpad1'] || this.keys['u'] || this.keys[','] || false;
      const p2Kick = this.keys['2'] || this.keys['numpad2'] || this.keys['i'] || this.keys['.'] || false;
      const p2Super = this.keys['3'] || this.keys['numpad3'] || this.keys['o'] || this.keys['/'] || false;

      this.p2Inputs = {
        left: this.keys['arrowleft'] || this.keys['left'] || false,
        right: this.keys['arrowright'] || this.keys['right'] || false,
        down: this.keys['arrowdown'] || this.keys['down'] || false,
        jumpPressed: p2Jump && !this.p2PrevJump,
        punchPressed: p2Punch && !this.p2PrevPunch,
        kickPressed: p2Kick && !this.p2PrevKick,
        superPressed: p2Super && !this.p2PrevSuper
      };

      this.p2PrevJump = p2Jump;
      this.p2PrevPunch = p2Punch;
      this.p2PrevKick = p2Kick;
      this.p2PrevSuper = p2Super;
    } else {
      // CPU Controller update
      this.p2Inputs = this.ai.update(this.p2, this.p1, this.particles.projectiles);
    }
  }

  // Main combat collisions
  checkCollisions() {
    // 1. P1 attack hitbox -> P2 hurtbox
    if (this.p1.attackHitbox && !this.p1.hasHitOpponent && this.p2.state !== 'ko') {
      if (this.isBoxColliding(this.p1.attackHitbox, this.p2)) {
        this.p1.hasHitOpponent = true;
        this.p2.takeHit(
          this.p1.attackHitbox.damage,
          this.p1.attackHitbox.points,
          this.p1.attackHitbox.knockbackX,
          this.p1.attackHitbox.knockbackY,
          this.p1,
          this.particles
        );
        this.p1.registerHitLanded(this.p1.attackHitbox.points, this.p1.attackHitbox.damage, this.particles);
        this.screenShake = 6;

        if (this.p2.hp <= 0) {
          this.handleKo(this.p2);
        }
      }
    }

    // 2. P2 attack hitbox -> P1 hurtbox
    if (this.p2.attackHitbox && !this.p2.hasHitOpponent && this.p1.state !== 'ko') {
      if (this.isBoxColliding(this.p2.attackHitbox, this.p1)) {
        this.p2.hasHitOpponent = true;
        this.p1.takeHit(
          this.p2.attackHitbox.damage,
          this.p2.attackHitbox.points,
          this.p2.attackHitbox.knockbackX,
          this.p2.attackHitbox.knockbackY,
          this.p2,
          this.particles
        );
        this.p2.registerHitLanded(this.p2.attackHitbox.points, this.p2.attackHitbox.damage, this.particles);
        this.screenShake = 6;

        if (this.p1.hp <= 0) {
          this.handleKo(this.p1);
        }
      }
    }

    // 3. Projectiles Collisions
    for (const proj of this.particles.projectiles) {
      if (!proj.active) continue;
      const target = proj.ownerId === 1 ? this.p2 : this.p1;
      const attacker = proj.ownerId === 1 ? this.p1 : this.p2;

      if (target.state !== 'ko' && this.isBoxColliding(proj.getHitbox(), target)) {
        proj.active = false;
        target.takeHit(proj.damage, proj.points, (proj.vx > 0 ? 1 : -1) * 11, -8, attacker, this.particles, true);
        attacker.registerHitLanded(proj.points, proj.damage, this.particles);
        this.screenShake = 12;

        if (target.hp <= 0) {
          this.handleKo(target);
        }
      }
    }
  }

  isBoxColliding(box, fighter) {
    return (
      box.x < fighter.x + fighter.width &&
      box.x + box.width > fighter.x &&
      box.y < fighter.y + fighter.height &&
      box.y + box.height > fighter.y
    );
  }

  update() {
    if (this.roundState === 'paused') return;

    // Gather Inputs
    if (this.roundState === 'fighting') {
      this.gatherInputs();
    } else {
      this.p1Inputs = null;
      this.p2Inputs = null;
    }

    // Update Fighters
    this.p1.update(this.p1Inputs, this.p2, this.particles);
    this.p2.update(this.p2Inputs, this.p1, this.particles);

    // Check collisions during combat
    if (this.roundState === 'fighting') {
      this.checkCollisions();
    }

    // Update VFX Particles
    this.particles.update();

    // Screen Shake decay
    if (this.screenShake > 0) {
      this.screenShake *= this.shakeDecay;
      if (this.screenShake < 0.5) this.screenShake = 0;
    }

    // Update HUD
    this.updateHUD();
  }

  updateHUD() {
    // P1 HUD
    const p1HpBar = document.getElementById('p1-hp-bar');
    const p1HpGhost = document.getElementById('p1-hp-ghost');
    const p1HpText = document.getElementById('p1-hp-text');
    const p1SuperBar = document.getElementById('p1-super-bar');
    const p1SuperTag = document.getElementById('p1-super-tag');
    const p1Score = document.getElementById('p1-score');

    if (p1HpBar) p1HpBar.style.width = `${(this.p1.hp / this.p1.maxHp) * 100}%`;
    if (p1HpGhost) p1HpGhost.style.width = `${(this.p1.displayHp / this.p1.maxHp) * 100}%`;
    if (p1HpText) p1HpText.textContent = `${Math.ceil(this.p1.hp)} / ${this.p1.maxHp}`;
    if (p1SuperBar) p1SuperBar.style.width = `${this.p1.superEnergy}%`;
    if (p1SuperTag) p1SuperTag.textContent = this.p1.superEnergy >= 100 ? 'SUPER READY! (L)' : `SUPER ${Math.floor(this.p1.superEnergy)}%`;
    if (p1Score) p1Score.textContent = String(this.p1.points).padStart(5, '0');

    // P1 Round Gems
    const p1Gems = document.querySelectorAll('#p1-rounds .round-gem');
    p1Gems.forEach((gem, idx) => {
      gem.classList.toggle('won', idx < this.p1.roundsWon);
    });

    // P2 HUD
    const p2HpBar = document.getElementById('p2-hp-bar');
    const p2HpGhost = document.getElementById('p2-hp-ghost');
    const p2HpText = document.getElementById('p2-hp-text');
    const p2SuperBar = document.getElementById('p2-super-bar');
    const p2SuperTag = document.getElementById('p2-super-tag');
    const p2Score = document.getElementById('p2-score');

    if (p2HpBar) p2HpBar.style.width = `${(this.p2.hp / this.p2.maxHp) * 100}%`;
    if (p2HpGhost) p2HpGhost.style.width = `${(this.p2.displayHp / this.p2.maxHp) * 100}%`;
    if (p2HpText) p2HpText.textContent = `${Math.ceil(this.p2.hp)} / ${this.p2.maxHp}`;
    if (p2SuperBar) p2SuperBar.style.width = `${this.p2.superEnergy}%`;
    if (p2SuperTag) p2SuperTag.textContent = this.p2.superEnergy >= 100 ? 'SUPER READY!' : `SUPER ${Math.floor(this.p2.superEnergy)}%`;
    if (p2Score) p2Score.textContent = String(this.p2.points).padStart(5, '0');

    // P2 Round Gems
    const p2Gems = document.querySelectorAll('#p2-rounds .round-gem');
    p2Gems.forEach((gem, idx) => {
      gem.classList.toggle('won', idx < this.p2.roundsWon);
    });
  }

  // Render Cyber Arena Background & Scene
  draw() {
    this.bgFrame++;
    const ctx = this.ctx;

    ctx.save();

    // Screen Shake Offset
    if (this.screenShake > 0) {
      const shakeX = (Math.random() - 0.5) * this.screenShake;
      const shakeY = (Math.random() - 0.5) * this.screenShake;
      ctx.translate(shakeX, shakeY);
    }

    // 1. Sky & Gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, this.height);
    skyGrad.addColorStop(0, '#04060d');
    skyGrad.addColorStop(0.5, '#0a1020');
    skyGrad.addColorStop(1, '#020306');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, this.width, this.height);

    // 2. Futuristic City Skyline & Neon Tower Silhouettes
    ctx.fillStyle = '#070c17';
    const buildings = [
      { x: 30, w: 90, h: 220 },
      { x: 140, w: 70, h: 300 },
      { x: 230, w: 120, h: 260 },
      { x: 370, w: 80, h: 340 },
      { x: 470, w: 140, h: 210 },
      { x: 630, w: 100, h: 320 },
      { x: 750, w: 85, h: 270 },
      { x: 860, w: 130, h: 290 }
    ];

    buildings.forEach(b => {
      ctx.fillRect(b.x, this.p1.groundY - b.h, b.w, b.h);

      // Building window lights
      ctx.fillStyle = 'rgba(0, 240, 255, 0.12)';
      for (let wy = this.p1.groundY - b.h + 20; wy < this.p1.groundY - 30; wy += 28) {
        for (let wx = b.x + 12; wx < b.x + b.w - 12; wx += 18) {
          if ((wx + wy) % 3 === 0) {
            ctx.fillRect(wx, wy, 8, 12);
          }
        }
      }
      ctx.fillStyle = '#070c17';
    });

    // 3. Giant Holographic Signs ("TECHNOZ BATTLE ARENA")
    ctx.save();
    ctx.font = "900 44px 'Orbitron', sans-serif";
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0, 240, 255, 0.08)';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 15;
    ctx.fillText('TECHNOZ ARENA', this.width / 2, 130);

    // Neon Scanline Grid Floor
    const groundY = this.p1.groundY;
    const floorGrad = ctx.createLinearGradient(0, groundY, 0, this.height);
    floorGrad.addColorStop(0, '#101524');
    floorGrad.addColorStop(1, '#05070c');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, groundY, this.width, this.height - groundY);

    // Floor Glowing Edge
    ctx.strokeStyle = '#00f0ff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 12;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(this.width, groundY);
    ctx.stroke();

    // Perspective Grid Lines on Floor
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.15)';
    ctx.lineWidth = 1;
    for (let x = -200; x <= this.width + 200; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, groundY);
      ctx.lineTo(x + (x - this.width / 2) * 1.5, this.height);
      ctx.stroke();
    }
    // Horizontal perspective lines
    for (let y = groundY + 15; y < this.height; y += (y - groundY) * 0.45 + 10) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.width, y);
      ctx.stroke();
    }
    ctx.restore();

    // 4. Draw Fighters
    this.p1.draw(ctx);
    this.p2.draw(ctx);

    // 5. Draw Projectiles, Sparks, Shockwaves, Score popups
    this.particles.draw(ctx);

    ctx.restore();
  }

  // Engine Main Loop
  run() {
    this.update();
    this.draw();
    requestAnimationFrame(() => this.run());
  }
}

window.GameEngine = GameEngine;
