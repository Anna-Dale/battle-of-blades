const BeybladeRenderer = {
  draw(ctx, x, y, radius, spin, bey, powerActive = false) {
    ctx.save();
    ctx.translate(x, y);

    if (powerActive) {
      ctx.beginPath();
      ctx.arc(0, 0, radius + 10, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 215, 0, ${0.35 + Math.sin(spin * 3) * 0.15})`;
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    // Drop shadow
    ctx.save();
    ctx.translate(2, 3);
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.95, 0, Math.PI * 2);
    ctx.fillStyle = '#000';
    ctx.fill();
    ctx.restore();

    ctx.rotate(spin);

    const style = bey.bladeStyle || 'balance';
    const r = radius;

    // Layer 1 — outer energy layer (colored, jagged)
    this._drawEnergyLayer(ctx, r, style, bey);

    // Layer 2 — metal forge disc ring
    this._drawMetalRing(ctx, r * 0.72);

    // Layer 3 — ratchet / weight disk
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.58, 0, Math.PI * 2);
    const diskGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.58);
    diskGrad.addColorStop(0, '#555');
    diskGrad.addColorStop(0.6, '#333');
    diskGrad.addColorStop(1, '#1a1a1a');
    ctx.fillStyle = diskGrad;
    ctx.fill();
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Ratchet teeth
    const teeth = style === 'defense' ? 8 : 6;
    for (let i = 0; i < teeth; i++) {
      ctx.save();
      ctx.rotate((Math.PI * 2 / teeth) * i);
      ctx.fillStyle = '#444';
      ctx.fillRect(r * 0.5, -2, r * 0.1, 4);
      ctx.restore();
    }

    // Layer 4 — core chip
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.38, 0, Math.PI * 2);
    const chipGrad = ctx.createRadialGradient(-r * 0.1, -r * 0.1, 0, 0, 0, r * 0.38);
    chipGrad.addColorStop(0, bey.accent || '#fff');
    chipGrad.addColorStop(0.5, bey.secondary);
    chipGrad.addColorStop(1, bey.color);
    ctx.fillStyle = chipGrad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Emblem on chip
    this._drawEmblem(ctx, r * 0.38, bey.emblem || 'star', bey);

    // Translucent highlight ring
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.88, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
  },

  _drawEnergyLayer(ctx, r, style, bey) {
    const points = this._getBladePoints(r, style);
    ctx.beginPath();
    points.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.closePath();

    const grad = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, r);
    grad.addColorStop(0, bey.color);
    grad.addColorStop(0.7, bey.secondary);
    grad.addColorStop(1, this._darken(bey.secondary, 0.4));

    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = this._lighten(bey.color, 0.3);
    ctx.lineWidth = 2;
    ctx.stroke();

    // Highlight edges on attack blades
    if (style === 'attack' || style === 'balance') {
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  },

  _getBladePoints(r, style) {
    const pts = [];
    switch (style) {
      case 'attack':
        for (let i = 0; i < 3; i++) {
          const a = (Math.PI * 2 / 3) * i - Math.PI / 2;
          pts.push({ x: Math.cos(a) * r * 0.55, y: Math.sin(a) * r * 0.55 });
          const a2 = a + 0.35;
          pts.push({ x: Math.cos(a2) * r * 1.05, y: Math.sin(a2) * r * 1.05 });
          const a3 = a + 0.7;
          pts.push({ x: Math.cos(a3) * r * 0.65, y: Math.sin(a3) * r * 0.65 });
        }
        break;
      case 'defense':
        for (let i = 0; i < 8; i++) {
          const a = (Math.PI * 2 / 8) * i;
          const rad = i % 2 === 0 ? r * 0.95 : r * 0.72;
          pts.push({ x: Math.cos(a) * rad, y: Math.sin(a) * rad });
        }
        break;
      case 'stamina':
        for (let i = 0; i < 24; i++) {
          const a = (Math.PI * 2 / 24) * i;
          const wobble = 1 + Math.sin(a * 3) * 0.04;
          pts.push({ x: Math.cos(a) * r * 0.92 * wobble, y: Math.sin(a) * r * 0.92 * wobble });
        }
        break;
      default: // balance
        for (let i = 0; i < 4; i++) {
          const a = (Math.PI * 2 / 4) * i - Math.PI / 4;
          pts.push({ x: Math.cos(a) * r * 0.6, y: Math.sin(a) * r * 0.6 });
          pts.push({ x: Math.cos(a + 0.25) * r * 0.98, y: Math.sin(a + 0.25) * r * 0.98 });
          pts.push({ x: Math.cos(a + 0.5) * r * 0.65, y: Math.sin(a + 0.5) * r * 0.65 });
        }
        break;
    }
    return pts;
  },

  _drawMetalRing(ctx, r) {
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    const metalGrad = ctx.createLinearGradient(-r, -r, r, r);
    metalGrad.addColorStop(0, '#e8e8e8');
    metalGrad.addColorStop(0.3, '#b0b0b0');
    metalGrad.addColorStop(0.5, '#d4d4d4');
    metalGrad.addColorStop(0.7, '#909090');
    metalGrad.addColorStop(1, '#c0c0c0');
    ctx.fillStyle = metalGrad;
    ctx.fill();
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Inner cutout
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.82, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fill();
  },

  _drawEmblem(ctx, r, emblem, bey) {
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.strokeStyle = bey.secondary;
    ctx.lineWidth = 1;

    switch (emblem) {
      case 'dragon':
        ctx.beginPath();
        ctx.moveTo(0, -r * 0.5);
        ctx.lineTo(r * 0.35, -r * 0.1);
        ctx.lineTo(r * 0.2, r * 0.4);
        ctx.lineTo(0, r * 0.25);
        ctx.lineTo(-r * 0.2, r * 0.4);
        ctx.lineTo(-r * 0.35, -r * 0.1);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
      case 'wizard':
        ctx.beginPath();
        ctx.moveTo(0, -r * 0.55);
        ctx.lineTo(r * 0.4, r * 0.35);
        ctx.lineTo(-r * 0.4, r * 0.35);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.arc(0, r * 0.15, r * 0.12, 0, Math.PI * 2);
        ctx.fillStyle = bey.color;
        ctx.fill();
        break;
      case 'knight':
        ctx.fillRect(-r * 0.08, -r * 0.5, r * 0.16, r * 0.65);
        ctx.beginPath();
        ctx.moveTo(-r * 0.25, -r * 0.5);
        ctx.lineTo(0, -r * 0.75);
        ctx.lineTo(r * 0.25, -r * 0.5);
        ctx.closePath();
        ctx.fill();
        break;
      case 'phoenix':
        ctx.beginPath();
        ctx.moveTo(-r * 0.4, r * 0.1);
        ctx.quadraticCurveTo(0, -r * 0.7, r * 0.4, r * 0.1);
        ctx.quadraticCurveTo(0, -r * 0.2, -r * 0.4, r * 0.1);
        ctx.fill();
        break;
      case 'samurai':
        ctx.fillRect(-r * 0.05, -r * 0.55, r * 0.1, r * 0.7);
        ctx.beginPath();
        ctx.moveTo(-r * 0.35, -r * 0.15);
        ctx.lineTo(r * 0.35, -r * 0.35);
        ctx.lineTo(r * 0.35, -r * 0.05);
        ctx.lineTo(-r * 0.35, r * 0.05);
        ctx.closePath();
        ctx.fill();
        break;
      case 'shark':
        ctx.beginPath();
        ctx.moveTo(-r * 0.45, 0);
        ctx.lineTo(r * 0.35, -r * 0.25);
        ctx.lineTo(r * 0.45, 0);
        ctx.lineTo(r * 0.35, r * 0.25);
        ctx.closePath();
        ctx.fill();
        break;
      case 'mammoth':
        ctx.beginPath();
        ctx.arc(0, r * 0.05, r * 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(-r * 0.35, -r * 0.15, r * 0.12, r * 0.35);
        ctx.fillRect(r * 0.23, -r * 0.15, r * 0.12, r * 0.35);
        break;
      case 'incendio':
        ctx.beginPath();
        ctx.moveTo(0, -r * 0.5);
        ctx.bezierCurveTo(r * 0.3, -r * 0.2, r * 0.2, r * 0.4, 0, r * 0.3);
        ctx.bezierCurveTo(-r * 0.2, r * 0.4, -r * 0.3, -r * 0.2, 0, -r * 0.5);
        ctx.fill();
        break;
      case 'ptera':
        ctx.beginPath();
        ctx.moveTo(-r * 0.4, r * 0.1);
        ctx.lineTo(0, -r * 0.4);
        ctx.lineTo(r * 0.4, r * 0.1);
        ctx.lineTo(0, r * 0.05);
        ctx.closePath();
        ctx.fill();
        break;
      case 'shinobi':
        ctx.beginPath();
        ctx.moveTo(0, -r * 0.45);
        ctx.lineTo(r * 0.35, 0);
        ctx.lineTo(0, r * 0.45);
        ctx.lineTo(-r * 0.35, 0);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = bey.color;
        ctx.fillRect(-r * 0.08, -r * 0.08, r * 0.16, r * 0.16);
        break;
      default:
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const a = (Math.PI * 2 / 5) * i - Math.PI / 2;
          const px = Math.cos(a) * r * 0.35;
          const py = Math.sin(a) * r * 0.35;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
    }
  },

  _darken(hex, amt) {
    const n = parseInt(hex.replace('#', ''), 16);
    const r = Math.max(0, (n >> 16) - amt * 255);
    const g = Math.max(0, ((n >> 8) & 0xff) - amt * 255);
    const b = Math.max(0, (n & 0xff) - amt * 255);
    return `rgb(${r|0},${g|0},${b|0})`;
  },

  _lighten(hex, amt) {
    const n = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, (n >> 16) + amt * 255);
    const g = Math.min(255, ((n >> 8) & 0xff) + amt * 255);
    const b = Math.min(255, (n & 0xff) + amt * 255);
    return `rgb(${r|0},${g|0},${b|0})`;
  },

  drawToCanvas(canvas, bey, size = 56) {
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, size, size);
    this.draw(ctx, size / 2, size / 2, size * 0.38, performance.now() * 0.002, bey);
  }
};
