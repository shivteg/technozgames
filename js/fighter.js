/**
 * TechnozGames - Fighter Class
 * Handles fighter physics, state machines, animation, combat hitboxes, and scoring.
 */

class Fighter {
  constructor(config) {
    this.id = config.id; // 1 or 2
    this.name = config.name;
    this.type = config.type; // 'volt' or 'crimson'
    this.themeColor = config.themeColor || (this.id === 1 ? '#00f0ff' : '#ff5500');
    this.accentColor = config.accentColor || (this.id === 1 ? '#0088ff' : '#ff2200');

    // Arena Dimensions
    this.width = 65;
    this.height = 130;
    this.groundY = 470; // Floor line

    // Position & Physics
    this.startX = config.x;
    this.startFacing = config.facing || (this.id === 1 ? 1 : -1);
    this.x = this.startX;
    this.y = this.groundY - this.height;
    this.vx = 0;
    this.vy = 0;
    this.facing = this.startFacing; // 1 = right, -1 = left

    // Speed & Jump
    this.speed = 6.2;
    this.jumpForce = -15;
    this.gravity = 0.75;
    this.canDoubleJump = true;
    this.isGrounded = true;

    // Health & Super Energy
    this.maxHp = 1000;
    this.hp = this.maxHp;
    this.displayHp = this.maxHp;
    this.superEnergy = 0; // 0 to 100
    this.maxSuper = 100;

    // Combat States
    // States: 'idle', 'walk', 'jump', 'fall', 'crouch_block', 'punch', 'kick', 'super', 'hit', 'ko', 'victory'
    this.state = 'idle';
    this.stateTimer = 0;
    this.isBlocking = false;
    this.hasHitOpponent = false;
    this.attackHitbox = null;
    this.invulnerableTimer = 0;

    // Combo & Points Tracking
    this.points = 0;
    this.currentCombo = 0;
    this.comboTimer = 0;
    this.maxCombo = 0;
    this.damageDealt = 0;
    this.hitsLanded = 0;
    this.roundsWon = 0;
    this.perfectRound = true; // resets if damaged

    // Visual frame counter for breathing/running
    this.animFrame = 0;
  }

  resetForRound(x, facing) {
    this.x = x !== undefined ? x : this.startX;
    this.y = this.groundY - this.height;
    this.vx = 0;
    this.vy = 0;
    this.facing = facing !== undefined ? facing : this.startFacing;
    this.hp = this.maxHp;
    this.displayHp = this.maxHp;
    this.state = 'idle';
    this.stateTimer = 0;
    this.isBlocking = false;
    this.hasHitOpponent = false;
    this.attackHitbox = null;
    this.invulnerableTimer = 0;
    this.currentCombo = 0;
    this.comboTimer = 0;
    this.perfectRound = true;
  }

  resetFull(x, facing) {
    this.resetForRound(x, facing);
    this.superEnergy = 0;
    this.points = 0;
    this.roundsWon = 0;
    this.damageDealt = 0;
    this.hitsLanded = 0;
    this.maxCombo = 0;
  }

  addPoints(amount, label, particleSystem) {
    this.points += amount;
    if (particleSystem && label) {
      const color = this.id === 1 ? '#00f0ff' : '#ff5500';
      particleSystem.addFloatingText(this.x + this.width / 2, this.y - 10, label, color, 16);
    }
  }

  getComboMultiplier() {
    if (this.currentCombo <= 1) return 1.0;
    if (this.currentCombo === 2) return 1.2;
    if (this.currentCombo === 3) return 1.5;
    if (this.currentCombo >= 4) return 2.0;
    return 1.0;
  }

  registerHitLanded(basePoints, baseDamage, particleSystem) {
    this.hitsLanded++;
    this.currentCombo++;
    this.comboTimer = 75; // ~1.25 seconds @ 60 FPS
    if (this.currentCombo > this.maxCombo) {
      this.maxCombo = this.currentCombo;
    }

    const mult = this.getComboMultiplier();
    const finalPoints = Math.round(basePoints * mult);
    this.points += finalPoints;
    this.damageDealt += baseDamage;

    if (this.currentCombo >= 2 && particleSystem) {
      particleSystem.addFloatingText(
        this.x + this.width / 2,
        this.y - 30,
        `${this.currentCombo}x COMBO! (+${finalPoints})`,
        '#ffd700',
        22,
        true
      );
    } else if (particleSystem) {
      particleSystem.addFloatingText(
        this.x + this.width / 2,
        this.y - 15,
        `+${finalPoints} PTS`,
        this.themeColor,
        18
      );
    }

    // Build super energy (+12 per landed hit)
    this.superEnergy = Math.min(this.maxSuper, this.superEnergy + 12);
  }

  takeHit(damage, basePoints, knockbackX, knockbackY, attacker, particleSystem, isSuper = false) {
    if (this.state === 'ko') return;

    this.perfectRound = false;

    // Check if guarding / blocking
    if (this.isBlocking && !isSuper) {
      const blockedDamage = Math.round(damage * 0.25); // 75% damage reduction
      this.hp = Math.max(0, this.hp - blockedDamage);
      this.vx = this.facing * -4;
      this.addPoints(75); // Award guard points!
      if (particleSystem) {
        particleSystem.createBlockSparks(this.x + (this.facing === 1 ? this.width : 0), this.y + 40);
      }
      if (window.soundEngine) window.soundEngine.playBlock();
      // Builder minor super energy for defense
      this.superEnergy = Math.min(this.maxSuper, this.superEnergy + 6);
      return;
    }

    // Direct Hit
    this.hp = Math.max(0, this.hp - damage);
    this.superEnergy = Math.min(this.maxSuper, this.superEnergy + 8); // build super on taking damage

    // Knockback
    this.vx = knockbackX;
    this.vy = knockbackY;

    if (this.hp <= 0) {
      this.hp = 0;
      this.state = 'ko';
      this.stateTimer = 0;
      if (particleSystem) {
        particleSystem.createHitSparks(this.x + this.width / 2, this.y + 50, '#ff0055', 30);
      }
      if (window.soundEngine) window.soundEngine.playKo();
      return;
    }

    // Hit Stun
    this.state = 'hit';
    this.stateTimer = 18; // 18 frames hit stun
    this.attackHitbox = null;

    if (particleSystem) {
      const sparkColor = isSuper ? '#ffd700' : (attacker ? attacker.themeColor : '#ff2255');
      particleSystem.createHitSparks(this.x + this.width / 2, this.y + 40, sparkColor, isSuper ? 24 : 14);
    }

    if (window.soundEngine) {
      if (isSuper || damage > 100) {
        window.soundEngine.playHeavyHit();
      } else {
        window.soundEngine.playPunch();
      }
    }
  }

  // Attack Initiations
  attackLight(particleSystem) {
    if (this.state === 'punch' || this.state === 'kick' || this.state === 'super' || this.state === 'hit' || this.state === 'ko') {
      return;
    }
    this.state = 'punch';
    this.stateTimer = 16;
    this.hasHitOpponent = false;
    if (window.soundEngine) window.soundEngine.playWhoosh();
  }

  attackHeavy(particleSystem) {
    if (this.state === 'punch' || this.state === 'kick' || this.state === 'super' || this.state === 'hit' || this.state === 'ko') {
      return;
    }
    this.state = 'kick';
    this.stateTimer = 24;
    this.hasHitOpponent = false;
    if (window.soundEngine) window.soundEngine.playWhoosh();
  }

  attackSuper(particleSystem) {
    if (this.superEnergy < this.maxSuper) return; // Must have 100% super meter
    if (this.state === 'punch' || this.state === 'kick' || this.state === 'super' || this.state === 'hit' || this.state === 'ko') {
      return;
    }
    this.superEnergy = 0; // Consume super
    this.state = 'super';
    this.stateTimer = 34;
    this.hasHitOpponent = false;

    if (window.soundEngine) window.soundEngine.playSuperMove();

    // Spawn Super Projectile
    if (particleSystem) {
      const projX = this.facing === 1 ? this.x + this.width + 10 : this.x - 10;
      const projY = this.y + 45;
      const projSpeed = this.facing * 12;
      const projDamage = 280;
      const projPoints = 600;

      particleSystem.spawnProjectile(
        projX,
        projY,
        projSpeed,
        0,
        this.id,
        this.themeColor,
        18,
        projDamage,
        projPoints
      );

      particleSystem.addFloatingText(this.x + this.width / 2, this.y - 30, 'SUPER MOVE!', this.themeColor, 22);
    }
  }

  update(input, opponent, particleSystem) {
    this.animFrame++;

    // Combo timer decay
    if (this.comboTimer > 0) {
      this.comboTimer--;
      if (this.comboTimer === 0) {
        this.currentCombo = 0;
      }
    }

    // Smooth Health bar catch-up
    if (this.displayHp > this.hp) {
      this.displayHp -= (this.displayHp - this.hp) * 0.12;
      if (Math.abs(this.displayHp - this.hp) < 1) this.displayHp = this.hp;
    }

    // Auto-face opponent if not currently attacking or KO
    if (opponent && this.state !== 'punch' && this.state !== 'kick' && this.state !== 'super' && this.state !== 'ko') {
      this.facing = opponent.x > this.x ? 1 : -1;
    }

    // Handle Active States and Timers
    if (this.stateTimer > 0) {
      this.stateTimer--;
      if (this.stateTimer <= 0) {
        if (this.state !== 'ko' && this.state !== 'victory') {
          this.state = 'idle';
          this.attackHitbox = null;
        }
      }
    }

    // Cannot move or block if stunned, attacking, or KO
    const canControl = this.state === 'idle' || this.state === 'walk' || this.state === 'jump' || this.state === 'fall' || this.state === 'crouch_block';

    if (canControl && input) {
      // Guard / Crouch Block
      if (input.down) {
        this.isBlocking = true;
        this.state = 'crouch_block';
        this.vx = 0;
      } else {
        this.isBlocking = false;

        // Horizontal Movement
        if (input.left) {
          this.vx = -this.speed;
          if (this.isGrounded) this.state = 'walk';
        } else if (input.right) {
          this.vx = this.speed;
          if (this.isGrounded) this.state = 'walk';
        } else {
          this.vx = 0;
          if (this.isGrounded) this.state = 'idle';
        }

        // Jump / Double Jump
        if (input.jumpPressed) {
          if (this.isGrounded) {
            this.vy = this.jumpForce;
            this.isGrounded = false;
            this.state = 'jump';
            if (window.soundEngine) window.soundEngine.playJump();
            if (particleSystem) particleSystem.createDust(this.x + this.width / 2, this.groundY);
          } else if (this.canDoubleJump) {
            this.vy = this.jumpForce * 0.85;
            this.canDoubleJump = false;
            this.state = 'jump';
            if (window.soundEngine) window.soundEngine.playJump();
            if (particleSystem) particleSystem.createEnergyTrail(this.x + this.width / 2, this.y + this.height, this.themeColor);
          }
        }
      }

      // Attacks
      if (input.punchPressed) {
        this.attackLight(particleSystem);
      } else if (input.kickPressed) {
        this.attackHeavy(particleSystem);
      } else if (input.superPressed) {
        this.attackSuper(particleSystem);
      }
    }

    // Calculate Active Attack Hitbox during attack frames
    this.updateHitbox();

    // Apply Physics: Gravity & Velocity
    this.vy += this.gravity;
    this.x += this.vx;
    this.y += this.vy;

    // Arena Floor collision
    if (this.y + this.height >= this.groundY) {
      this.y = this.groundY - this.height;
      this.vy = 0;
      if (!this.isGrounded) {
        if (particleSystem) particleSystem.createDust(this.x + this.width / 2, this.groundY);
      }
      this.isGrounded = true;
      this.canDoubleJump = true;
      if (this.state === 'jump' || this.state === 'fall') {
        this.state = 'idle';
      }
    } else {
      this.isGrounded = false;
      if (this.state !== 'punch' && this.state !== 'kick' && this.state !== 'super' && this.state !== 'hit' && this.state !== 'ko') {
        this.state = this.vy < 0 ? 'jump' : 'fall';
      }
    }

    // Arena Horizontal Boundary collision (Keep within canvas)
    const minX = 20;
    const maxX = 1024 - 20 - this.width;
    if (this.x < minX) this.x = minX;
    if (this.x > maxX) this.x = maxX;
  }

  updateHitbox() {
    this.attackHitbox = null;

    if (this.state === 'punch') {
      // Active in frames 4 to 12
      if (this.stateTimer >= 4 && this.stateTimer <= 12) {
        const boxWidth = 52;
        const boxHeight = 28;
        const boxX = this.facing === 1 ? this.x + this.width - 10 : this.x - boxWidth + 10;
        const boxY = this.y + 35;
        this.attackHitbox = {
          x: boxX,
          y: boxY,
          width: boxWidth,
          height: boxHeight,
          damage: 65,
          points: 100,
          knockbackX: this.facing * 5,
          knockbackY: -2
        };
      }
    } else if (this.state === 'kick') {
      // Active in frames 6 to 18
      if (this.stateTimer >= 6 && this.stateTimer <= 18) {
        const boxWidth = 65;
        const boxHeight = 36;
        const boxX = this.facing === 1 ? this.x + this.width - 10 : this.x - boxWidth + 10;
        const boxY = this.y + 55;
        this.attackHitbox = {
          x: boxX,
          y: boxY,
          width: boxWidth,
          height: boxHeight,
          damage: 135,
          points: 250,
          knockbackX: this.facing * 9,
          knockbackY: -6
        };
      }
    }
  }

  // Procedural Canvas Character Rendering
  draw(ctx) {
    ctx.save();

    // Facing direction transformation
    ctx.translate(this.x + this.width / 2, this.y + this.height);
    ctx.scale(this.facing, 1);

    // KO animation: lay down on ground
    if (this.state === 'ko') {
      ctx.rotate(Math.PI / 2 * 0.9);
      ctx.translate(-20, -20);
    }

    // Dynamic animation offsets
    const breathe = this.state === 'idle' ? Math.sin(this.animFrame * 0.08) * 3 : 0;
    const stride = this.state === 'walk' ? Math.sin(this.animFrame * 0.25) * 16 : 0;

    // Shadow on floor
    if (this.isGrounded && this.state !== 'ko') {
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.ellipse(0, 0, 32, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Colors
    const primary = this.themeColor;
    const darkSuit = '#141824';
    const armorPlate = this.id === 1 ? '#1a2c42' : '#421a1a';

    // 1. LEGS
    ctx.strokeStyle = darkSuit;
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Back leg
    ctx.beginPath();
    ctx.moveTo(-8, -50);
    if (this.state === 'crouch_block') {
      ctx.lineTo(-24, -25);
      ctx.lineTo(-12, 0);
    } else if (this.state === 'kick') {
      ctx.lineTo(-4, -25);
      ctx.lineTo(-10, 0);
    } else {
      ctx.lineTo(-12 - stride, -25);
      ctx.lineTo(-10 - stride * 0.8, 0);
    }
    ctx.stroke();

    // Front leg
    ctx.beginPath();
    ctx.moveTo(8, -50);
    if (this.state === 'crouch_block') {
      ctx.lineTo(16, -25);
      ctx.lineTo(8, 0);
    } else if (this.state === 'kick') {
      // Extended flying kick leg!
      ctx.lineTo(28, -55);
      ctx.lineTo(55, -60);
    } else {
      ctx.lineTo(12 + stride, -25);
      ctx.lineTo(14 + stride * 0.8, 0);
    }
    ctx.stroke();

    // Armor shin guards
    ctx.strokeStyle = primary;
    ctx.lineWidth = 4;
    ctx.stroke();

    // 2. TORSO & CYBER ARMOR
    const crouchOffset = this.state === 'crouch_block' ? 22 : 0;
    const torsoY = -52 + crouchOffset + breathe;

    ctx.fillStyle = darkSuit;
    ctx.beginPath();
    ctx.roundRect(-16, torsoY - 45, 32, 45, 6);
    ctx.fill();

    // Armor Chestplate
    ctx.fillStyle = armorPlate;
    ctx.beginPath();
    ctx.roundRect(-14, torsoY - 42, 28, 30, 4);
    ctx.fill();

    // Glowing Power Arc Core in chest
    ctx.fillStyle = primary;
    ctx.shadowColor = primary;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(2, torsoY - 26, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0; // reset blur

    // 3. HEAD & VISOR
    const headY = torsoY - 48;
    ctx.fillStyle = darkSuit;
    ctx.beginPath();
    ctx.arc(0, headY, 15, 0, Math.PI * 2);
    ctx.fill();

    // Cyber Helmet Horns / Spikes
    ctx.fillStyle = armorPlate;
    ctx.beginPath();
    ctx.moveTo(-6, headY - 14);
    ctx.lineTo(0, headY - 24);
    ctx.lineTo(6, headY - 14);
    ctx.fill();

    // Glowing Cyber Visor
    ctx.fillStyle = primary;
    ctx.shadowColor = primary;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.roundRect(1, headY - 5, 12, 6, 3);
    ctx.fill();
    ctx.shadowBlur = 0;

    // 4. ARMS & WEAPONS
    ctx.strokeStyle = darkSuit;
    ctx.lineWidth = 10;

    if (this.state === 'crouch_block') {
      // Guard shield cross arms
      ctx.beginPath();
      ctx.moveTo(0, torsoY - 32);
      ctx.lineTo(18, torsoY - 28);
      ctx.lineTo(14, torsoY - 10);
      ctx.stroke();

      // Energy Guard Hologram Shield
      ctx.save();
      ctx.fillStyle = 'rgba(0, 240, 255, 0.25)';
      ctx.strokeStyle = primary;
      ctx.lineWidth = 3;
      ctx.shadowColor = primary;
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.ellipse(24, torsoY - 20, 10, 36, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    } else if (this.state === 'punch') {
      // Extended punch arm
      ctx.beginPath();
      ctx.moveTo(-4, torsoY - 32);
      ctx.lineTo(16, torsoY - 30);
      ctx.lineTo(46, torsoY - 30);
      ctx.stroke();

      // Glowing fist energy
      ctx.fillStyle = primary;
      ctx.shadowColor = primary;
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(48, torsoY - 30, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    } else if (this.state === 'super') {
      // Charging energy pose
      ctx.beginPath();
      ctx.moveTo(-4, torsoY - 32);
      ctx.lineTo(24, torsoY - 35);
      ctx.lineTo(36, torsoY - 20);
      ctx.stroke();

      // Huge gathering aura
      ctx.fillStyle = primary;
      ctx.shadowColor = primary;
      ctx.shadowBlur = 24;
      ctx.beginPath();
      ctx.arc(38, torsoY - 20, 16 + Math.sin(this.animFrame * 0.4) * 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    } else if (this.state === 'victory') {
      // Victory raised fist pose
      ctx.beginPath();
      ctx.moveTo(-4, torsoY - 32);
      ctx.lineTo(14, torsoY - 55);
      ctx.lineTo(18, torsoY - 75);
      ctx.stroke();

      ctx.fillStyle = '#ffd700';
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(18, torsoY - 78, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    } else {
      // Idle / Walking combat ready stance
      ctx.beginPath();
      ctx.moveTo(-4, torsoY - 32);
      ctx.lineTo(14, torsoY - 18);
      ctx.lineTo(22, torsoY - 28);
      ctx.stroke();

      ctx.fillStyle = primary;
      ctx.beginPath();
      ctx.arc(22, torsoY - 28, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

window.Fighter = Fighter;
