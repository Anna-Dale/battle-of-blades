class GameEngine {
  constructor(canvas, options) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.options = options;
    this.running = false;
    this.paused = false;
    this.keys = {};
    this.powerLevel = 0;
    this.powerCharging = false;
    this.stats = {
      powerAttacks: 0,
      dodges: 0,
      criticalHits: 0,
      collisions: 0,
      damageDealt: 0,
      damageTaken: 0,
      roundsWonLowHp: 0
    };
    this.lastDodgeTime = 0;
    this.onRoundEnd = options.onRoundEnd || (() => {});
    this.onUpdate = options.onUpdate || (() => {});

    this.resize();
    window.addEventListener('resize', () => this.resize());
    this._bindKeys();
  }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
    this.centerX = this.canvas.width / 2;
    this.centerY = this.canvas.height / 2;
    this.arenaRadius = Math.min(this.canvas.width, this.canvas.height) * 0.38;
  }

  _bindKeys() {
    this._keydown = (e) => {
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault();
      this.keys[e.key] = true;
      if (e.key === ' ') this.powerCharging = true;
    };
    this._keyup = (e) => {
      this.keys[e.key] = false;
      if (e.key === ' ') {
        if (this.powerCharging && this.powerLevel > 30) {
          this._firePowerAttack();
        }
        this.powerCharging = false;
        this.powerLevel = 0;
      }
    };
    window.addEventListener('keydown', this._keydown);
    window.addEventListener('keyup', this._keyup);
  }

  destroy() {
    this.running = false;
    window.removeEventListener('keydown', this._keydown);
    window.removeEventListener('keyup', this._keyup);
    window.removeEventListener('resize', () => this.resize());
  }

  initRound(roundNum) {
    const bf = this.options.battlefield;
    const pStats = this.options.playerBeyblade.stats;
    const eStats = this.options.enemyBeyblade.stats;

    this.player = this._createBlade(
      this.centerX - 80, this.centerY,
      this.options.playerBeyblade, pStats,
      this.options.playerName, true
    );
    this.enemy = this._createBlade(
      this.centerX + 80, this.centerY,
      this.options.enemyBeyblade, eStats,
      this.options.enemyName, false
    );

    this.battlefield = bf;
    this.roundNum = roundNum;
    this.frame = 0;
    this.particles = [];
    this.collisionCooldown = 0;
    this.running = true;
    this.lastTime = performance.now();
    this._loop();
  }

  _createBlade(x, y, beyblade, stats, name, isPlayer) {
    const maxHp = 5;
    return {
      x, y, name, isPlayer, beyblade, stats,
      vx: 0, vy: 0,
      radius: 22,
      spin: 0,
      hp: maxHp,
      maxHp,
      powerBoost: 0,
      powerBoostTimer: 0,
      invincible: 0,
      aiTimer: 0,
      aiDir: Math.random() * Math.PI * 2
    };
  }

  _firePowerAttack() {
    this.player.powerBoost = this.powerLevel / 100;
    this.player.powerBoostTimer = 60;
    this.stats.powerAttacks++;
    this._spawnParticles(this.player.x, this.player.y, this.player.beyblade.color, 12);
  }

  _loop() {
    if (!this.running) return;
    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 16.67, 3);
    this.lastTime = now;
    this.frame++;

    this._update(dt);
    this._draw();
    this.onUpdate(this.player, this.enemy, this.powerLevel);

    if (this.player.hp <= 0 || this.enemy.hp <= 0) {
      const playerWon = this.enemy.hp <= 0;
      if (playerWon && this.player.hp >= 3) this.stats.roundsWonLowHp++;
      this.running = false;
      setTimeout(() => this.onRoundEnd(playerWon, { ...this.stats }), 800);
      return;
    }

    requestAnimationFrame(() => this._loop());
  }

  _update(dt) {
    if (this.powerCharging && this.player.powerBoostTimer <= 0) {
      this.powerLevel = Math.min(100, this.powerLevel + 2 * dt);
    }

    this._movePlayer(dt);
    this._moveEnemy(dt);
    this._applyArenaBounds(this.player);
    this._applyArenaBounds(this.enemy);
    this._checkCollision();
    this._updateParticles(dt);

    if (this.player.powerBoostTimer > 0) this.player.powerBoostTimer -= dt;
    if (this.collisionCooldown > 0) this.collisionCooldown -= dt;

    if (this.frame - this.lastDodgeTime > 30) {
      const speed = Math.hypot(this.player.vx, this.player.vy);
      if (speed > 3 && this.collisionCooldown <= 0) {
        this.stats.dodges++;
        this.lastDodgeTime = this.frame;
      }
    }
  }

  _movePlayer(dt) {
    const speed = 2.5 + this.player.stats.speed / 40;
    let dx = 0, dy = 0;
    if (this.keys['ArrowUp']) dy -= 1;
    if (this.keys['ArrowDown']) dy += 1;
    if (this.keys['ArrowLeft']) dx -= 1;
    if (this.keys['ArrowRight']) dx += 1;

    if (dx !== 0 || dy !== 0) {
      const len = Math.hypot(dx, dy);
      this.player.vx = (dx / len) * speed * dt;
      this.player.vy = (dy / len) * speed * dt;
    } else {
      this.player.vx *= 0.85;
      this.player.vy *= 0.85;
    }

    this.player.x += this.player.vx;
    this.player.y += this.player.vy;
    this.player.spin += (0.15 + this.player.stats.speed / 200) * dt;
  }

  _moveEnemy(dt) {
    const speed = 2 + this.enemy.stats.speed / 45;
    this.enemy.aiTimer -= dt;

    if (this.enemy.aiTimer <= 0) {
      this.enemy.aiTimer = 30 + Math.random() * 60;
      const angle = Math.atan2(this.player.y - this.enemy.y, this.player.x - this.enemy.x);
      this.enemy.aiDir = angle + (Math.random() - 0.5) * 1.2;

      if (Math.random() < this.enemy.stats.attack / 200) {
        this.enemy.powerBoost = 0.5 + Math.random() * 0.5;
        this.enemy.powerBoostTimer = 40;
      }
    }

    this.enemy.vx = Math.cos(this.enemy.aiDir) * speed * dt;
    this.enemy.vy = Math.sin(this.enemy.aiDir) * speed * dt;
    this.enemy.x += this.enemy.vx;
    this.enemy.y += this.enemy.vy;
    this.enemy.spin += 0.12 * dt;

    if (this.enemy.powerBoostTimer > 0) this.enemy.powerBoostTimer -= dt;
  }

  _applyArenaBounds(blade) {
    const dx = blade.x - this.centerX;
    const dy = blade.y - this.centerY;
    const dist = Math.hypot(dx, dy);
    const maxDist = this.arenaRadius - blade.radius;

    if (dist > maxDist) {
      const angle = Math.atan2(dy, dx);
      blade.x = this.centerX + Math.cos(angle) * maxDist;
      blade.y = this.centerY + Math.sin(angle) * maxDist;
      blade.vx *= -0.5;
      blade.vy *= -0.5;
    }
  }

  _checkCollision() {
    if (this.collisionCooldown > 0) return;

    const dx = this.player.x - this.enemy.x;
    const dy = this.player.y - this.enemy.y;
    const dist = Math.hypot(dx, dy);
    const minDist = this.player.radius + this.enemy.radius;

    if (dist < minDist) {
      this.collisionCooldown = 25;
      this.stats.collisions++;

      const pPower = 1 + (this.player.powerBoostTimer > 0 ? this.player.powerBoost : 0);
      const ePower = 1 + (this.enemy.powerBoostTimer > 0 ? this.enemy.powerBoost : 0);

      const pDmg = Math.max(0.3, (this.player.stats.attack / 80) * pPower - (this.enemy.stats.defense / 200));
      const eDmg = Math.max(0.3, (this.enemy.stats.attack / 80) * ePower - (this.player.stats.defense / 200));

      this.enemy.hp -= pDmg;
      this.player.hp -= eDmg;
      this.stats.damageDealt += pDmg;
      this.stats.damageTaken += eDmg;

      if (pPower > 1.3) this.stats.criticalHits++;

      const angle = Math.atan2(dy, dx);
      this.player.x += Math.cos(angle) * 8;
      this.player.y += Math.sin(angle) * 8;
      this.enemy.x -= Math.cos(angle) * 8;
      this.enemy.y -= Math.sin(angle) * 8;

      this._spawnParticles((this.player.x + this.enemy.x) / 2, (this.player.y + this.enemy.y) / 2, '#ffffff', 8);
      this.player.powerBoostTimer = 0;
      this.enemy.powerBoostTimer = 0;
    }
  }

  _spawnParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6,
        life: 20 + Math.random() * 20,
        color,
        size: 2 + Math.random() * 3
      });
    }
  }

  _updateParticles(dt) {
    this.particles = this.particles.filter(p => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      return p.life > 0;
    });
  }

  _draw() {
    const ctx = this.ctx;
    const bf = this.battlefield;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this._drawThemedBackground(ctx, bf);
    this._drawThemeDecorations(ctx, bf);

    // Stadium floor (sandy/arena surface inside ring)
    const floorGrad = ctx.createRadialGradient(this.centerX, this.centerY, 0, this.centerX, this.centerY, this.arenaRadius);
    floorGrad.addColorStop(0, this._lightenColor(bf.floorColor || bf.arenaColor, 20));
    floorGrad.addColorStop(0.7, bf.floorColor || bf.arenaColor);
    floorGrad.addColorStop(1, this._darkenColor(bf.floorColor || bf.arenaColor, 30));

    ctx.beginPath();
    ctx.arc(this.centerX, this.centerY, this.arenaRadius - 4, 0, Math.PI * 2);
    ctx.fillStyle = floorGrad;
    ctx.fill();

    // Stadium rail (X-Celerator style)
    ctx.beginPath();
    ctx.arc(this.centerX, this.centerY, this.arenaRadius, 0, Math.PI * 2);
    ctx.strokeStyle = bf.accentColor;
    ctx.lineWidth = 6;
    ctx.shadowColor = bf.accentColor;
    ctx.shadowBlur = 20;
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.beginPath();
    ctx.arc(this.centerX, this.centerY, this.arenaRadius - 3, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Inner battle zone markings
    ctx.beginPath();
    ctx.arc(this.centerX, this.centerY, this.arenaRadius * 0.5, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.setLineDash([8, 8]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Center emblem
    ctx.beginPath();
    ctx.arc(this.centerX, this.centerY, 12, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fill();
    ctx.strokeStyle = bf.accentColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    this._drawThemeCenterMark(ctx, bf);

    this._drawBlade(ctx, this.enemy);
    this._drawBlade(ctx, this.player);

    this.particles.forEach(p => {
      ctx.globalAlpha = p.life / 40;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  _drawThemedBackground(ctx, bf) {
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Sky gradient
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, bf.skyTop || '#1a1a2e');
    sky.addColorStop(0.45, bf.skyMid || '#302b63');
    sky.addColorStop(0.75, bf.skyBottom || '#0a0e1a');
    sky.addColorStop(1, bf.floorColor || '#0a0e1a');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    switch (bf.id) {
      case 'miami':
        this._drawMiamiScene(ctx, w, h);
        break;
      case 'pittsburgh':
        this._drawPittsburghScene(ctx, w, h);
        break;
      case 'texas':
        this._drawTexasScene(ctx, w, h);
        break;
      case 'longdistance':
        this._drawLongDistanceScene(ctx, w, h);
        break;
    }
  }

  _drawMiamiScene(ctx, w, h) {
    // Sun
    const sunGrad = ctx.createRadialGradient(w * 0.75, h * 0.15, 0, w * 0.75, h * 0.15, 80);
    sunGrad.addColorStop(0, 'rgba(255, 220, 100, 0.9)');
    sunGrad.addColorStop(0.5, 'rgba(255, 150, 80, 0.4)');
    sunGrad.addColorStop(1, 'rgba(255, 100, 50, 0)');
    ctx.fillStyle = sunGrad;
    ctx.fillRect(0, 0, w, h);

    // Ocean band
    const oceanY = h * 0.72;
    const oceanGrad = ctx.createLinearGradient(0, oceanY, 0, h);
    oceanGrad.addColorStop(0, '#4ecdc4');
    oceanGrad.addColorStop(0.3, '#2a9d8f');
    oceanGrad.addColorStop(1, '#1a535c');
    ctx.fillStyle = oceanGrad;
    ctx.fillRect(0, oceanY, w, h - oceanY);

    // Wave lines
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      const wy = oceanY + 15 + i * 18;
      for (let x = 0; x <= w; x += 20) {
        const y = wy + Math.sin((x + this.frame * 2) * 0.03 + i) * 5;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Palm tree silhouettes
    this._drawPalm(ctx, w * 0.08, h * 0.68, 0.9);
    this._drawPalm(ctx, w * 0.92, h * 0.65, -0.9);
    this._drawPalm(ctx, w * 0.15, h * 0.55, 0.6);
  }

  _drawPalm(ctx, x, y, flip) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(flip, 1);
    ctx.strokeStyle = '#2d5016';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -80);
    ctx.stroke();
    ctx.fillStyle = '#3a7d1a';
    for (let i = 0; i < 5; i++) {
      ctx.save();
      ctx.translate(0, -80);
      ctx.rotate(-0.8 + i * 0.4);
      ctx.beginPath();
      ctx.ellipse(35, 0, 40, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  _drawPittsburghScene(ctx, w, h) {
    // City glow
    const glow = ctx.createRadialGradient(w * 0.5, h * 0.85, 0, w * 0.5, h * 0.85, w * 0.6);
    glow.addColorStop(0, 'rgba(240, 147, 251, 0.15)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);

    // Bridge silhouette (arch bridge)
    const bridgeY = h * 0.62;
    ctx.fillStyle = '#1a1a30';
    ctx.fillRect(0, bridgeY + 30, w, h);

    ctx.strokeStyle = '#2a2a50';
    ctx.lineWidth = 3;
    for (let i = 0; i < 3; i++) {
      const bx = w * (0.2 + i * 0.3);
      ctx.beginPath();
      ctx.moveTo(bx - 60, bridgeY + 30);
      ctx.quadraticCurveTo(bx, bridgeY - 40, bx + 60, bridgeY + 30);
      ctx.stroke();
    }

    // City skyline
    const buildings = [0.05, 0.12, 0.18, 0.25, 0.32, 0.55, 0.62, 0.7, 0.78, 0.85, 0.92];
    buildings.forEach((bx, i) => {
      const bh = 40 + (i * 17 % 60);
      ctx.fillStyle = `rgba(30, 30, 60, ${0.7 + (i % 3) * 0.1})`;
      ctx.fillRect(w * bx, bridgeY + 30 - bh, w * 0.06, bh);
      // Window lights
      ctx.fillStyle = 'rgba(255, 220, 150, 0.6)';
      for (let wy = 0; wy < bh; wy += 12) {
        if (Math.sin(i * 7 + wy) > 0) {
          ctx.fillRect(w * bx + 4, bridgeY + 30 - bh + wy + 4, 3, 3);
        }
      }
    });

    // Floating hearts
    for (let i = 0; i < 6; i++) {
      const t = this.frame * 0.008 + i * 1.5;
      const hx = w * (0.1 + (i * 0.15) % 0.8);
      const hy = h * (0.15 + Math.sin(t) * 0.08);
      ctx.globalAlpha = 0.2 + Math.sin(t * 2) * 0.1;
      ctx.font = `${14 + i * 2}px serif`;
      ctx.fillText('💕', hx, hy);
    }
    ctx.globalAlpha = 1;
  }

  _drawTexasScene(ctx, w, h) {
    // Big star
    ctx.save();
    ctx.translate(w * 0.5, h * 0.12);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    this._drawStar(ctx, 0, 0, 5, 25, 12);
    ctx.restore();

    // Horizon line
    ctx.strokeStyle = 'rgba(255, 200, 100, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.55);
    ctx.lineTo(w, h * 0.55);
    ctx.stroke();

    // Cactus silhouettes
    this._drawCactus(ctx, w * 0.06, h * 0.58);
    this._drawCactus(ctx, w * 0.94, h * 0.6);
    this._drawCactus(ctx, w * 0.88, h * 0.52, 0.7);

    // Dust particles
    for (let i = 0; i < 20; i++) {
      const t = this.frame * 0.005 + i;
      ctx.globalAlpha = 0.15;
      ctx.fillStyle = '#f7c948';
      ctx.fillRect(
        (w * ((t * 0.07 + i * 0.05) % 1)),
        h * (0.5 + Math.sin(t) * 0.05),
        2, 2
      );
    }
    ctx.globalAlpha = 1;
  }

  _drawCactus(ctx, x, y, scale = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.fillStyle = '#2d5016';
    ctx.fillRect(-6, -60, 12, 60);
    ctx.fillRect(-25, -45, 20, 8);
    ctx.fillRect(-25, -45, 8, 25);
    ctx.fillRect(5, -35, 20, 8);
    ctx.fillRect(17, -35, 8, 20);
    ctx.restore();
  }

  _drawLongDistanceScene(ctx, w, h) {
    for (let i = 0; i < 80; i++) {
      const sx = (Math.sin(i * 127.1) * 0.5 + 0.5) * w;
      const sy = (Math.cos(i * 311.7) * 0.5 + 0.5) * h * 0.65;
      const twinkle = 0.3 + Math.sin(this.frame * 0.05 + i) * 0.3;
      ctx.globalAlpha = twinkle;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(sx, sy, 1 + (i % 3), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Moon
    const moonX = w * 0.85, moonY = h * 0.12;
    ctx.beginPath();
    ctx.arc(moonX, moonY, 30, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 230, 0.9)';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(moonX + 8, moonY - 4, 26, 0, Math.PI * 2);
    ctx.fillStyle = '#0f0c29';
    ctx.fill();

    // Two hearts connected — long distance love
    const h1x = w * 0.2, h1y = h * 0.2;
    const h2x = w * 0.8, h2y = h * 0.18;
    ctx.font = '28px serif';
    ctx.globalAlpha = 0.7 + Math.sin(this.frame * 0.03) * 0.2;
    ctx.fillText('💜', h1x, h1y);
    ctx.fillText('💜', h2x, h2y);
    ctx.globalAlpha = 1;

    // Connection line (dashed golden thread)
    ctx.setLineDash([8, 6]);
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(h1x + 20, h1y - 10);
    ctx.quadraticCurveTo(w * 0.5, h * 0.08, h2x - 20, h2y - 10);
    ctx.stroke();
    ctx.setLineDash([]);

    // "Miles apart" text glow
    ctx.font = 'italic 13px Rajdhani, sans-serif';
    ctx.fillStyle = 'rgba(200, 180, 255, 0.35)';
    ctx.textAlign = 'center';
    ctx.fillText('miles apart, hearts together', w * 0.5, h * 0.08);
    ctx.textAlign = 'left';
  }

  _drawStar(ctx, cx, cy, spikes, outerR, innerR) {
    let rot = Math.PI / 2 * 3;
    const step = Math.PI / spikes;
    ctx.beginPath();
    ctx.moveTo(cx, cy - outerR);
    for (let i = 0; i < spikes; i++) {
      ctx.lineTo(cx + Math.cos(rot) * outerR, cy + Math.sin(rot) * outerR);
      rot += step;
      ctx.lineTo(cx + Math.cos(rot) * innerR, cy + Math.sin(rot) * innerR);
      rot += step;
    }
    ctx.closePath();
    ctx.fill();
  }

  _drawThemeDecorations(ctx, bf) {
    const count = 12;
    for (let i = 0; i < count; i++) {
      const t = this.frame * 0.008 + i * 1.7;
      const r = this.arenaRadius * 1.25;
      const px = this.centerX + Math.cos(t) * r * (0.6 + (i % 3) * 0.15);
      const py = this.centerY + Math.sin(t * 0.7) * r * (0.4 + (i % 2) * 0.2);
      ctx.globalAlpha = 0.12;
      if (bf.particles === 'hearts') {
        ctx.font = '16px serif';
        ctx.fillText(i % 2 === 0 ? '💕' : '💜', px, py);
      } else if (bf.particles === 'palm') {
        ctx.font = '14px serif';
        ctx.fillText('🌴', px, py);
      } else {
        ctx.font = '12px serif';
        ctx.fillText('⭐', px, py);
      }
    }
    ctx.globalAlpha = 1;
  }

  _drawThemeCenterMark(ctx, bf) {
    if (bf.id === 'longdistance') {
      ctx.font = '10px serif';
      ctx.textAlign = 'center';
      ctx.fillText('💌', this.centerX, this.centerY + 4);
      ctx.textAlign = 'left';
    } else if (bf.id === 'texas') {
      ctx.save();
      ctx.translate(this.centerX, this.centerY);
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      this._drawStar(ctx, 0, 0, 5, 8, 4);
      ctx.restore();
    }
  }

  _lightenColor(hex, amt) {
    const n = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, (n >> 16) + amt);
    const g = Math.min(255, ((n >> 8) & 0xff) + amt);
    const b = Math.min(255, (n & 0xff) + amt);
    return `rgb(${r},${g},${b})`;
  }

  _darkenColor(hex, amt) {
    const n = parseInt(hex.replace('#', ''), 16);
    const r = Math.max(0, (n >> 16) - amt);
    const g = Math.max(0, ((n >> 8) & 0xff) - amt);
    const b = Math.max(0, (n & 0xff) - amt);
    return `rgb(${r},${g},${b})`;
  }

  _drawParticles(ctx, bf) {
    // moved into _drawThemeDecorations
  }

  _drawBlade(ctx, blade) {
    const { x, y, beyblade, spin, powerBoostTimer, powerBoost } = blade;
    BeybladeRenderer.draw(ctx, x, y, blade.radius, spin, beyblade, powerBoostTimer > 0);

    ctx.font = 'bold 11px Rajdhani, sans-serif';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 4;
    ctx.fillText(blade.name, x, y - blade.radius - 10);
    ctx.shadowBlur = 0;
  }
}
