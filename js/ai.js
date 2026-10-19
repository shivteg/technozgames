/**
 * TechnozGames - Artificial Intelligence Controller (Bot)
 * Powers the CPU opponent with dynamic spacing, combo chains, blocking, and super tactics.
 */

class AIController {
  constructor(difficulty = 'medium') {
    this.difficulty = difficulty; // 'easy', 'medium', 'hard'
    this.decisionTimer = 0;
    this.decisionInterval = 8; // Frames between decisions
    this.currentAction = 'none';
    this.actionTimer = 0;

    // Output inputs structure matching keyboard inputs
    this.inputs = {
      left: false,
      right: false,
      down: false,
      jumpPressed: false,
      punchPressed: false,
      kickPressed: false,
      superPressed: false
    };
  }

  setDifficulty(diff) {
    this.difficulty = diff;
    if (diff === 'easy') {
      this.decisionInterval = 14;
    } else if (diff === 'medium') {
      this.decisionInterval = 7;
    } else if (diff === 'hard') {
      this.decisionInterval = 3;
    }
  }

  update(bot, opponent, projectiles = []) {
    // Reset one-frame trigger flags
    this.inputs.jumpPressed = false;
    this.inputs.punchPressed = false;
    this.inputs.kickPressed = false;
    this.inputs.superPressed = false;

    if (!bot || !opponent || bot.state === 'ko') {
      this.inputs.left = false;
      this.inputs.right = false;
      this.inputs.down = false;
      return this.inputs;
    }

    const distance = Math.abs(bot.x - opponent.x);
    const opponentIsAttacking = opponent.state === 'punch' || opponent.state === 'kick' || opponent.state === 'super';
    const isClose = distance < 100;
    const isMediumRange = distance >= 100 && distance <= 220;

    // Check for incoming projectiles
    const incomingProjectile = projectiles.find(p => p.ownerId !== bot.id && Math.abs(p.x - bot.x) < 260);

    this.decisionTimer++;
    if (this.decisionTimer >= this.decisionInterval) {
      this.decisionTimer = 0;
      this.makeDecision(bot, opponent, distance, isClose, isMediumRange, opponentIsAttacking, incomingProjectile);
    }

    // Maintain persistent actions (like holding movement or block)
    if (this.actionTimer > 0) {
      this.actionTimer--;
      if (this.actionTimer === 0) {
        this.inputs.left = false;
        this.inputs.right = false;
        this.inputs.down = false;
      }
    }

    return this.inputs;
  }

  makeDecision(bot, opponent, distance, isClose, isMediumRange, opponentIsAttacking, incomingProjectile) {
    const isFacingRight = bot.x < opponent.x;

    // 1. Reactive Defense against incoming projectiles
    if (incomingProjectile) {
      if (this.difficulty === 'hard') {
        // High level AI leaps over projectile with double jump
        this.inputs.jumpPressed = true;
        this.inputs.down = false;
        return;
      } else if (this.difficulty === 'medium' && Math.random() < 0.7) {
        // Medium AI crouch blocks projectile
        this.inputs.down = true;
        this.actionTimer = 20;
        return;
      }
    }

    // 2. Reactive Defense against opponent strikes
    if (opponentIsAttacking && isClose) {
      const blockChance = this.difficulty === 'hard' ? 0.85 : (this.difficulty === 'medium' ? 0.55 : 0.2);
      if (Math.random() < blockChance) {
        this.inputs.down = true;
        this.inputs.left = false;
        this.inputs.right = false;
        this.actionTimer = 18;
        return;
      }
    }

    // 3. Super Move Execution
    if (bot.superEnergy >= bot.maxSuper) {
      const superChance = this.difficulty === 'hard' ? 0.75 : (this.difficulty === 'medium' ? 0.5 : 0.25);
      if (Math.random() < superChance && distance > 80) {
        this.inputs.superPressed = true;
        return;
      }
    }

    // 4. Close Combat (Within striking range)
    if (isClose) {
      this.inputs.down = false;

      // Combo mixup
      const roll = Math.random();
      if (this.difficulty === 'hard') {
        // Master AI combos punch into kick
        if (roll < 0.45) {
          this.inputs.punchPressed = true;
        } else if (roll < 0.85) {
          this.inputs.kickPressed = true;
        } else {
          // Back-dash or jump attack
          this.inputs.jumpPressed = true;
          this.inputs.kickPressed = true;
        }
      } else if (this.difficulty === 'medium') {
        if (roll < 0.4) {
          this.inputs.punchPressed = true;
        } else if (roll < 0.7) {
          this.inputs.kickPressed = true;
        } else if (roll < 0.85) {
          this.inputs.down = true; // Guard
          this.actionTimer = 12;
        }
      } else {
        // Easy AI
        if (roll < 0.4) {
          this.inputs.punchPressed = true;
        } else if (roll < 0.6) {
          this.inputs.kickPressed = true;
        }
      }
      return;
    }

    // 5. Medium Range Spacing
    if (isMediumRange) {
      // Advance towards player or jump-in
      const advance = Math.random() < (this.difficulty === 'hard' ? 0.75 : 0.6);
      if (advance) {
        if (isFacingRight) {
          this.inputs.right = true;
          this.inputs.left = false;
        } else {
          this.inputs.left = true;
          this.inputs.right = false;
        }
        this.actionTimer = 10;

        // Occasional jump in attack
        if (Math.random() < 0.25) {
          this.inputs.jumpPressed = true;
        }
      } else {
        // Fake retreat
        if (isFacingRight) {
          this.inputs.left = true;
          this.inputs.right = false;
        } else {
          this.inputs.right = true;
          this.inputs.left = false;
        }
        this.actionTimer = 8;
      }
      return;
    }

    // 6. Long Range: Close the gap!
    if (isFacingRight) {
      this.inputs.right = true;
      this.inputs.left = false;
    } else {
      this.inputs.left = true;
      this.inputs.right = false;
    }
    this.actionTimer = 12;

    // Jump forward sometimes to close gap quickly
    if (Math.random() < 0.3) {
      this.inputs.jumpPressed = true;
    }
  }
}

window.AIController = AIController;
