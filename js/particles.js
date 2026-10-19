/**
 * TechnozGames - Particle, VFX & Projectile System
 * Renders glowing hit sparks, shockwaves, energy projectiles, and floating score popups.
 */

class Particle {
  constructor(x, y, vx, vy, color, size, life, decay, shape = 'circle') {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.color = color;
    this.size = size;
    this.maxLife = life;
    this.life = life;
    this.decay = decay;
    this.shape = shape;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.life -= this.decay;
  }

  draw(ctx) {
    if (this.life <= 0) return;
    const alpha = Math.max(0, this.life / this.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 8;

    if (this.shape === 'circle') {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size * alpha, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.shape === 'spark') {
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(this.x - this.vx * 3, this.y - this.vy * 3);
      ctx.lineWidth = this.size;
      ctx.strokeStyle = this.color;
      ctx.stroke();
    }
    ctx.restore();
  }
}

class FloatingText {
  constructor(x, y, text, color, fontSize = 20, isCombo = false) {
    this.x = x;
    this.y = y;
    this.text = text;
    this.color = color;
    this.fontSize = fontSize;
    this.isCombo = isCombo;
    this.life = 1.0;
    this.decay = 0.02;
    this.vy = -1.8;
  }

  update() {
    this.y += this.vy;
    this.life -= this.decay;
  }

  draw(ctx) {
    if (this.life <= 0) return;
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.life);
    ctx.font = `900 ${this.fontSize}px 'Orbitron', sans-serif`;
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 10;
    ctx.textAlign = 'center';
    ctx.fillText(this.text, this.x, this.y);
    ctx.restore();
  }
}

class Shockwave {
  constructor(x, y, color, maxRadius = 60) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.radius = 5;
    this.maxRadius = maxRadius;
    this.speed = 4;
    this.alpha = 1.0;
  }

  update() {
    this.radius += this.speed;
    this.alpha = Math.max(0, 1 - (this.radius / this.maxRadius));
  }

  draw(ctx) {
    if (this.alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 4;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

class Projectile {
  constructor(x, y, vx, vy, ownerId, color, size, damage, points) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.ownerId = ownerId;
    this.color = color;
    this.size = size;
    this.damage = damage;
    this.points = points;
    this.active = true;
    this.trailTimer = 0;
  }

  update(particleSystem) {
    this.x += this.vx;
    this.y += this.vy;

    // Emit trail particles
    this.trailTimer++;
    if (this.trailTimer % 2 === 0) {
      particleSystem.createEnergyTrail(this.x, this.y, this.color);
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.fillStyle = '#fff';
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 24;

    // Glowing core
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();

    // Outer aura
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size + 6, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  getHitbox() {
    return {
      x: this.x - this.size,
      y: this.y - this.size,
      width: this.size * 2,
      height: this.size * 2
    };
  }
}

class ParticleSystem {
  constructor() {
    this.particles = [];
    this.texts = [];
    this.shockwaves = [];
    this.projectiles = [];
  }

  reset() {
    this.particles = [];
    this.texts = [];
    this.shockwaves = [];
    this.projectiles = [];
  }

  createHitSparks(x, y, color = '#ff0055', count = 16) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 6;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const size = 2 + Math.random() * 3;
      const life = 0.5 + Math.random() * 0.4;
      this.particles.push(new Particle(x, y, vx, vy, color, size, life, 0.03, 'spark'));
    }
    this.shockwaves.push(new Shockwave(x, y, color, 45));
  }

  createBlockSparks(x, y) {
    const color = '#ffd700';
    for (let i = 0; i < 12; i++) {
      const angle = (Math.random() - 0.5) * Math.PI;
      const speed = 3 + Math.random() * 5;
      const vx = Math.cos(angle) * speed;
      const vy = -Math.abs(Math.sin(angle) * speed);
      this.particles.push(new Particle(x, y, vx, vy, color, 2.5, 0.4, 0.04, 'spark'));
    }
    this.shockwaves.push(new Shockwave(x, y, color, 30));
    this.addFloatingText(x, y - 20, 'GUARD! +75', color, 16);
  }

  createDust(x, y) {
    for (let i = 0; i < 6; i++) {
      const vx = (Math.random() - 0.5) * 3;
      const vy = -Math.random() * 1.5;
      this.particles.push(new Particle(x, y, vx, vy, 'rgba(200, 220, 255, 0.4)', 4, 0.4, 0.03, 'circle'));
    }
  }

  createEnergyTrail(x, y, color) {
    const vx = (Math.random() - 0.5) * 1.5;
    const vy = (Math.random() - 0.5) * 1.5;
    this.particles.push(new Particle(x, y, vx, vy, color, 5, 0.35, 0.05, 'circle'));
  }

  addFloatingText(x, y, text, color = '#ffd700', fontSize = 20, isCombo = false) {
    this.texts.push(new FloatingText(x, y, text, color, fontSize, isCombo));
  }

  spawnProjectile(x, y, vx, vy, ownerId, color, size, damage, points) {
    const proj = new Projectile(x, y, vx, vy, ownerId, color, size, damage, points);
    this.projectiles.push(proj);
    this.shockwaves.push(new Shockwave(x, y, color, 50));
    return proj;
  }

  update() {
    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.update();
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    // Update floating texts
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      t.update();
      if (t.life <= 0) this.texts.splice(i, 1);
    }

    // Update shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const s = this.shockwaves[i];
      s.update();
      if (s.alpha <= 0) this.shockwaves.splice(i, 1);
    }

    // Update projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      proj.update(this);
      // Remove off-screen or inactive projectiles
      if (!proj.active || proj.x < -100 || proj.x > 1124) {
        this.projectiles.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    this.shockwaves.forEach(s => s.draw(ctx));
    this.particles.forEach(p => p.draw(ctx));
    this.projectiles.forEach(pr => pr.draw(ctx));
    this.texts.forEach(t => t.draw(ctx));
  }
}

window.ParticleSystem = ParticleSystem;
