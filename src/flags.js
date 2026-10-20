// Country flag renderer on 2D canvas (Zero outside assets/CDNs; works across Windows/macOS/Linux/Android/iOS).
import * as THREE from 'three';
import { COUNTRIES } from './crowdplan.js';

/**
 * Draws a country flag on a 2D canvas context.
 * Simplified, crisp vector emblems for 14 supported countries.
 * Returns false if code is unknown / unsupported.
 */
export function drawFlag(ctx, code, x, y, w, h) {
  if (!COUNTRIES.includes(code)) return false;

  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();

  switch (code) {
    case 'TR': {
      // Türkiye: Red field with white crescent moon and five-pointed star
      ctx.fillStyle = '#E30A17';
      ctx.fillRect(x, y, w, h);

      const cy = y + h * 0.5;
      const c1x = x + w * 0.38, r1 = h * 0.26;
      const c2x = x + w * 0.44, r2 = h * 0.208;

      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(c1x, cy, r1, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#E30A17';
      ctx.beginPath();
      ctx.arc(c2x, cy, r2, 0, Math.PI * 2);
      ctx.fill();

      // Star
      drawStar(ctx, x + w * 0.58, cy, 5, h * 0.11, h * 0.045, -Math.PI / 2, '#FFFFFF');
      break;
    }

    case 'ES': {
      // Spain: Red - Yellow - Red (1:2:1) with simplified coat of arms
      const h4 = h * 0.25;
      ctx.fillStyle = '#AA151B';
      ctx.fillRect(x, y, w, h4);
      ctx.fillRect(x, y + h * 0.75, w, h4);
      ctx.fillStyle = '#F1BF00';
      ctx.fillRect(x, y + h4, w, h * 0.5);

      // Emblem
      const ex = x + w * 0.3, ey = y + h * 0.5;
      ctx.fillStyle = '#AA151B';
      ctx.beginPath();
      ctx.arc(ex, ey + h * 0.04, h * 0.12, 0, Math.PI);
      ctx.rect(ex - h * 0.12, ey - h * 0.08, h * 0.24, h * 0.12);
      ctx.fill();
      ctx.fillStyle = '#F1BF00';
      ctx.beginPath();
      ctx.arc(ex, ey - h * 0.09, h * 0.05, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'AR': {
      // Argentina: Light Blue - White - Light Blue with Sun of May
      const h3 = h / 3;
      ctx.fillStyle = '#74ACDF';
      ctx.fillRect(x, y, w, h3);
      ctx.fillRect(x, y + h3 * 2, w, h3);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(x, y + h3, w, h3);

      // Sun of May
      const sx = x + w * 0.5, sy = y + h * 0.5, sr = h * 0.11;
      ctx.fillStyle = '#F6B40E';
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#85340A';
      ctx.lineWidth = Math.max(1, h * 0.02);
      ctx.beginPath();
      for (let i = 0; i < 16; i++) {
        const a = (i * Math.PI) / 8;
        ctx.moveTo(sx + Math.cos(a) * sr, sy + Math.sin(a) * sr);
        ctx.lineTo(sx + Math.cos(a) * (sr * 1.5), sy + Math.sin(a) * (sr * 1.5));
      }
      ctx.stroke();
      break;
    }

    case 'SE': {
      // Sweden: Blue with yellow Nordic cross
      ctx.fillStyle = '#006AA7';
      ctx.fillRect(x, y, w, h);

      ctx.fillStyle = '#FECC00';
      const kw = w * 0.16, kh = h * 0.2;
      const kx = x + w * 0.32;
      ctx.fillRect(kx, y, kw, h);
      ctx.fillRect(x, y + (h - kh) * 0.5, w, kh);
      break;
    }

    case 'IT': {
      // Italy: Green - White - Red
      const w3 = w / 3;
      ctx.fillStyle = '#009246'; ctx.fillRect(x, y, w3, h);
      ctx.fillStyle = '#FFFFFF'; ctx.fillRect(x + w3, y, w3, h);
      ctx.fillStyle = '#CE2B37'; ctx.fillRect(x + w3 * 2, y, w3, h);
      break;
    }

    case 'QA': {
      // Qatar: White left (1/3), Maroon right with 9 serrated points
      const divX = x + w * 0.32;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(x, y, divX - x, h);
      ctx.fillStyle = '#8D1B3D';
      ctx.fillRect(divX, y, x + w - divX, h);

      // Serrated zig-zag teeth
      ctx.beginPath();
      const nTeeth = 9;
      const step = h / nTeeth;
      const toothDepth = w * 0.08;
      ctx.moveTo(divX, y);
      for (let i = 0; i < nTeeth; i++) {
        ctx.lineTo(divX + toothDepth, y + (i + 0.5) * step);
        ctx.lineTo(divX, y + (i + 1) * step);
      }
      ctx.lineTo(x, y + h);
      ctx.lineTo(x, y);
      ctx.closePath();
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      break;
    }

    case 'MX': {
      // Mexico: Green - White - Red with center eagle/wreath circle
      const w3 = w / 3;
      ctx.fillStyle = '#006847'; ctx.fillRect(x, y, w3, h);
      ctx.fillStyle = '#FFFFFF'; ctx.fillRect(x + w3, y, w3, h);
      ctx.fillStyle = '#CE1126'; ctx.fillRect(x + w3 * 2, y, w3, h);

      // Center emblem
      ctx.fillStyle = '#8B5A2B';
      ctx.beginPath();
      ctx.arc(x + w * 0.5, y + h * 0.5, h * 0.12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#D4AF37';
      ctx.beginPath();
      ctx.arc(x + w * 0.5, y + h * 0.5, h * 0.06, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'NL': {
      // Netherlands: Bright Red - White - Cobalt Blue
      const h3 = h / 3;
      ctx.fillStyle = '#AE1C28'; ctx.fillRect(x, y, w, h3);
      ctx.fillStyle = '#FFFFFF'; ctx.fillRect(x, y + h3, w, h3);
      ctx.fillStyle = '#21468B'; ctx.fillRect(x, y + h3 * 2, w, h3);
      break;
    }

    case 'FR': {
      // France: Blue - White - Red
      const w3 = w / 3;
      ctx.fillStyle = '#002654'; ctx.fillRect(x, y, w3, h);
      ctx.fillStyle = '#FFFFFF'; ctx.fillRect(x + w3, y, w3, h);
      ctx.fillStyle = '#ED2939'; ctx.fillRect(x + w3 * 2, y, w3, h);
      break;
    }

    case 'PT': {
      // Portugal: Green (2/5) - Red (3/5) with armillary sphere emblem
      const gw = w * 0.4;
      ctx.fillStyle = '#046A38'; ctx.fillRect(x, y, gw, h);
      ctx.fillStyle = '#DA291C'; ctx.fillRect(x + gw, y, w - gw, h);

      // Sphere emblem
      ctx.fillStyle = '#FEDD00';
      ctx.beginPath();
      ctx.arc(x + gw, y + h * 0.5, h * 0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#DA291C';
      ctx.beginPath();
      ctx.arc(x + gw, y + h * 0.5, h * 0.09, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'BR': {
      // Brazil: Green field, Yellow rhombus, Blue circle
      ctx.fillStyle = '#009739';
      ctx.fillRect(x, y, w, h);

      // Rhombus
      ctx.fillStyle = '#FEDD00';
      ctx.beginPath();
      ctx.moveTo(x + w * 0.5, y + h * 0.12);
      ctx.lineTo(x + w * 0.9, y + h * 0.5);
      ctx.lineTo(x + w * 0.5, y + h * 0.88);
      ctx.lineTo(x + w * 0.1, y + h * 0.5);
      ctx.closePath();
      ctx.fill();

      // Blue circle
      ctx.fillStyle = '#012169';
      ctx.beginPath();
      ctx.arc(x + w * 0.5, y + h * 0.5, h * 0.22, 0, Math.PI * 2);
      ctx.fill();
      // White celestial band
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = Math.max(1.5, h * 0.035);
      ctx.beginPath();
      ctx.arc(x + w * 0.5, y + h * 0.58, h * 0.21, Math.PI * 1.1, Math.PI * 1.8);
      ctx.stroke();
      break;
    }

    case 'GB': {
      // Great Britain: Union Jack
      ctx.fillStyle = '#012169';
      ctx.fillRect(x, y, w, h);

      // White diagonals
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = h * 0.24;
      ctx.beginPath();
      ctx.moveTo(x, y); ctx.lineTo(x + w, y + h);
      ctx.moveTo(x + w, y); ctx.lineTo(x, y + h);
      ctx.stroke();

      // Red diagonals
      ctx.strokeStyle = '#C8102E';
      ctx.lineWidth = h * 0.10;
      ctx.beginPath();
      ctx.moveTo(x, y); ctx.lineTo(x + w, y + h);
      ctx.moveTo(x + w, y); ctx.lineTo(x, y + h);
      ctx.stroke();

      // White cross
      ctx.fillStyle = '#FFFFFF';
      const cw = w * 0.22, ch = h * 0.32;
      ctx.fillRect(x + (w - cw) * 0.5, y, cw, h);
      ctx.fillRect(x, y + (h - ch) * 0.5, w, ch);

      // Red cross
      ctx.fillStyle = '#C8102E';
      const rcw = w * 0.13, rch = h * 0.19;
      ctx.fillRect(x + (w - rcw) * 0.5, y, rcw, h);
      ctx.fillRect(x, y + (h - rch) * 0.5, w, rch);
      break;
    }

    case 'DE': {
      // Germany: Black - Red - Gold
      const h3 = h / 3;
      ctx.fillStyle = '#000000'; ctx.fillRect(x, y, w, h3);
      ctx.fillStyle = '#DD0000'; ctx.fillRect(x, y + h3, w, h3);
      ctx.fillStyle = '#FFCE00'; ctx.fillRect(x, y + h3 * 2, w, h3);
      break;
    }

    case 'US': {
      // United States: 13 stripes + blue canton
      const nStripes = 13;
      const sh = h / nStripes;
      for (let i = 0; i < nStripes; i++) {
        ctx.fillStyle = i % 2 === 0 ? '#B22234' : '#FFFFFF';
        ctx.fillRect(x, y + i * sh, w, sh);
      }

      // Canton
      const cw = w * 0.42, ch = sh * 7;
      ctx.fillStyle = '#3C3B6E';
      ctx.fillRect(x, y, cw, ch);

      // Simplified star grid
      ctx.fillStyle = '#FFFFFF';
      const rows = 4, cols = 5;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const px = x + cw * ((c + 1) / (cols + 1));
          const py = y + ch * ((r + 1) / (rows + 1));
          ctx.beginPath();
          ctx.arc(px, py, Math.max(1, h * 0.015), 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;
    }
  }

  ctx.restore();
  return true;
}

function drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius, rot = -Math.PI / 2, fill = '#FFFFFF') {
  let rotAngle = rot;
  const step = Math.PI / spikes;
  ctx.beginPath();
  ctx.moveTo(cx + Math.cos(rotAngle) * outerRadius, cy + Math.sin(rotAngle) * outerRadius);
  for (let i = 0; i < spikes; i++) {
    rotAngle += step;
    ctx.lineTo(cx + Math.cos(rotAngle) * innerRadius, cy + Math.sin(rotAngle) * innerRadius);
    rotAngle += step;
    ctx.lineTo(cx + Math.cos(rotAngle) * outerRadius, cy + Math.sin(rotAngle) * outerRadius);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

/**
 * Creates a standalone Three.js CanvasTexture for a specific country banner.
 */
export function createFlagTexture(code, w = 256, h = 160) {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  drawFlag(ctx, code, 0, 0, w, h);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

let cachedFlagsAtlas = null;

/**
 * Packs all 14 country flags into a single 4x4 atlas (256x256 px).
 * Used for spectator hand flags (1 InstancedMesh draw call for the whole stadium).
 */
export function getFlagsAtlas() {
  if (cachedFlagsAtlas) return cachedFlagsAtlas;
  if (typeof document === 'undefined') return null;

  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 256;
  const ctx = canvas.getContext('2d');

  const cols = 4, rows = 4;
  const cellW = 64, cellH = 64;
  const flagW = 56, flagH = 38; // 3:2 standard flag aspect with nice margin

  const uvMap = new Map();

  for (let i = 0; i < COUNTRIES.length; i++) {
    const code = COUNTRIES[i];
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = col * cellW + (cellW - flagW) / 2;
    const cy = row * cellH + (cellH - flagH) / 2;

    drawFlag(ctx, code, cx, cy, flagW, flagH);

    // Border around small flag so it stands out
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(cx, cy, flagW, flagH);

    uvMap.set(code, {
      index: i,
      col,
      row,
      u: col / cols,
      v: row / rows,
      w: 1 / cols,
      h: 1 / rows
    });
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = true;

  cachedFlagsAtlas = {
    texture,
    uvMap,
    cols,
    rows,
    getUvIndex: (code) => uvMap.has(code) ? uvMap.get(code).index : -1
  };

  return cachedFlagsAtlas;
}
