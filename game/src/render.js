// Canvas rendering for Tidebound Duel. All drawing lives here.
import {
  FIELD, CARD_W, CARD_H, CARD_W_SM, CARD_H_SM, SUITS, SUIT_RULES, SUIT_ORDER,
  PALETTE, FONT, ENERGY_CAP, BOARD_SLOTS, LIFE_CAP,
} from './config.js';
import { cardPower, tideStrength } from './rules.js';

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function drawSuitIcon(ctx, suit, x, y, size) {
  const def = SUITS[suit];
  ctx.fillStyle = def.color;
  ctx.strokeStyle = def.edge;
  ctx.lineWidth = Math.max(1.5, size * 0.12);
  ctx.beginPath();
  const s = size * 0.45;
  if (def.shape === 'triangle') {
    ctx.moveTo(x, y - s);
    ctx.lineTo(x + s, y + s * 0.75);
    ctx.lineTo(x - s, y + s * 0.75);
    ctx.closePath();
  } else if (def.shape === 'circle') {
    ctx.arc(x, y, s * 0.85, 0, Math.PI * 2);
  } else if (def.shape === 'square') {
    ctx.rect(x - s * 0.75, y - s * 0.75, s * 1.5, s * 1.5);
  } else if (def.shape === 'diamond') {
    ctx.moveTo(x, y - s);
    ctx.lineTo(x + s * 0.8, y);
    ctx.lineTo(x, y + s);
    ctx.lineTo(x - s * 0.8, y);
    ctx.closePath();
  }
  ctx.fill();
  ctx.stroke();
}

export function fitCardText(ctx, text, maxWidth, baseSize) {
  let size = baseSize;
  ctx.font = `600 ${size}px ${FONT}`;
  while (size > 8 && ctx.measureText(text).width > maxWidth) {
    size -= 1;
    ctx.font = `600 ${size}px ${FONT}`;
  }
  return size;
}

export function drawCardFace(ctx, card, x, y, w, h, opts = {}) {
  const { selected = false, hover = false, dim = false, showPower = null, faceDown = false, alpha = 1 } = opts;
  ctx.save();
  ctx.globalAlpha = alpha;
  const suit = SUITS[card.suit];
  const r = 10;
  if (faceDown) {
    roundRect(ctx, x, y, w, h, r);
    ctx.fillStyle = PALETTE.cardBack;
    ctx.fill();
    ctx.strokeStyle = PALETTE.cardBackEdge;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(110,203,255,0.25)';
    ctx.lineWidth = 1;
    for (let i = 10; i < w - 6; i += 10) {
      ctx.beginPath(); ctx.moveTo(x + i, y + 6); ctx.lineTo(x + i, y + h - 6); ctx.stroke();
    }
    drawSuitIcon(ctx, 'gale', x + w / 2, y + h / 2, 26);
    ctx.restore();
    return;
  }

  roundRect(ctx, x, y, w, h, r);
  const grad = ctx.createLinearGradient(x, y, x, y + h);
  grad.addColorStop(0, PALETTE.cardFace);
  grad.addColorStop(1, PALETTE.cardFace2);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = selected ? '#ffffff' : hover ? suit.edge : suit.color;
  ctx.lineWidth = selected ? 3 : hover ? 2.5 : 2;
  ctx.stroke();

  if (selected || hover) {
    ctx.shadowColor = suit.glow;
    ctx.shadowBlur = selected ? 18 : 10;
    ctx.strokeStyle = selected ? '#ffffff' : suit.edge;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // cost badge
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  roundRect(ctx, x + 5, y + 5, 24, 24, 6);
  ctx.fill();
  ctx.fillStyle = PALETTE.gold;
  ctx.font = `700 16px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(card.cost), x + 17, y + 17);

  // suit icon
  drawSuitIcon(ctx, card.suit, x + w - 16, y + 17, 18);

  // name
  ctx.fillStyle = dim ? PALETTE.muted : PALETTE.text;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const nameSize = fitCardText(ctx, card.name, w - 14, 12);
  ctx.font = `600 ${nameSize}px ${FONT}`;
  ctx.fillText(card.name, x + w / 2, y + 34);

  // art area
  const artY = y + 52;
  const artH = h - 82;
  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  roundRect(ctx, x + 7, artY, w - 14, artH, 6);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // big suit emblem
  ctx.globalAlpha = alpha * 0.18;
  drawSuitIcon(ctx, card.suit, x + w / 2, artY + artH / 2, Math.min(w, artH) * 0.55);
  ctx.globalAlpha = alpha;
  drawSuitIcon(ctx, card.suit, x + w / 2, artY + artH / 2, 24);

  // power badge
  const pwr = showPower !== null ? showPower : card.power;
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  roundRect(ctx, x + w / 2 - 22, y + h - 30, 44, 24, 6);
  ctx.fill();
  ctx.strokeStyle = suit.color;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = pwr > card.power ? PALETTE.green : (pwr < card.power ? PALETTE.red : PALETTE.text);
  ctx.font = `700 18px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(pwr), x + w / 2, y + h - 18);

  // suit label
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `500 9px ${FONT}`;
  ctx.textBaseline = 'bottom';
  ctx.fillText(suit.name.toUpperCase(), x + w / 2, y + h - 32);

  ctx.restore();
}

export function drawBackground(ctx) {
  const w = FIELD.width, h = FIELD.height;
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, PALETTE.skyTop);
  g.addColorStop(0.55, PALETTE.skyBottom);
  g.addColorStop(1, '#071827');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // moon
  ctx.save();
  ctx.fillStyle = PALETTE.moonGlow;
  ctx.beginPath(); ctx.arc(1040, 95, 90, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = PALETTE.moon;
  ctx.beginPath(); ctx.arc(1040, 95, 42, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = PALETTE.skyTop;
  ctx.globalAlpha = 0.9;
  ctx.beginPath(); ctx.arc(1055, 85, 36, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // stars
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  const stars = [[80,40],[160,90],[260,30],[380,70],[520,35],[640,60],[760,25],[900,55],[1150,45],[1220,80],[300,110],[700,100]];
  for (const [sx, sy] of stars) { ctx.fillRect(sx, sy, 2, 2); }

  // sea
  ctx.fillStyle = PALETTE.sea;
  ctx.fillRect(0, 420, w, 180);
  for (let i = 0; i < 5; i++) {
    ctx.strokeStyle = `rgba(110,203,255,${0.08 - i * 0.012})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    const yy = 450 + i * 28;
    for (let x = 0; x <= w; x += 20) {
      const dy = Math.sin((x + i * 70) * 0.012) * 6;
      if (x === 0) ctx.moveTo(x, yy + dy); else ctx.lineTo(x, yy + dy);
    }
    ctx.stroke();
  }

  // shore
  ctx.fillStyle = PALETTE.shore;
  ctx.beginPath();
  ctx.moveTo(0, 560);
  ctx.quadraticCurveTo(320, 540, 640, 555);
  ctx.quadraticCurveTo(960, 570, 1280, 545);
  ctx.lineTo(1280, 720); ctx.lineTo(0, 720); ctx.closePath();
  ctx.fill();
}

export function drawPanel(ctx, x, y, w, h, alpha = 0.86) {
  ctx.save();
  ctx.globalAlpha = alpha;
  roundRect(ctx, x, y, w, h, 12);
  ctx.fillStyle = PALETTE.panel;
  ctx.fill();
  ctx.strokeStyle = PALETTE.panelEdge;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

export function drawButton(ctx, rect, label, opts = {}) {
  const { hover = false, enabled = true, fontSize = 20 } = opts;
  ctx.save();
  roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 10);
  ctx.fillStyle = !enabled ? '#243447' : hover ? PALETTE.buttonHover : PALETTE.button;
  ctx.fill();
  ctx.strokeStyle = !enabled ? '#446' : PALETTE.buttonEdge;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = enabled ? PALETTE.text : PALETTE.dim;
  ctx.font = `700 ${fontSize}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2);
  ctx.restore();
}

export function drawLifeBar(ctx, x, y, w, h, life, max, alignRight = false) {
  ctx.save();
  roundRect(ctx, x, y, w, h, 6);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fill();
  const ratio = Math.max(0, Math.min(1, life / max));
  const fillW = w * ratio;
  const fx = alignRight ? x + w - fillW : x;
  roundRect(ctx, fx, y, fillW, h, 6);
  ctx.fillStyle = ratio > 0.5 ? PALETTE.green : ratio > 0.25 ? PALETTE.gold : PALETTE.red;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 1;
  roundRect(ctx, x, y, w, h, 6);
  ctx.stroke();
  ctx.fillStyle = PALETTE.text;
  ctx.font = `700 16px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${life}/${max}`, x + w / 2, y + h / 2 + 0.5);
  ctx.restore();
}

export function drawEnergyPips(ctx, x, y, current, max, total = ENERGY_CAP) {
  for (let i = 0; i < total; i++) {
    const px = x + i * 22;
    ctx.beginPath();
    ctx.arc(px, y, 7, 0, Math.PI * 2);
    if (i < current) ctx.fillStyle = PALETTE.gold;
    else if (i < max) ctx.fillStyle = 'rgba(242,201,76,0.25)';
    else ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fill();
    ctx.strokeStyle = i < max ? 'rgba(242,201,76,0.7)' : 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

export function getHandLayout(count, y, w = CARD_W, h = CARD_H) {
  const cards = [];
  const spacing = Math.min(w + 10, (900 - w) / Math.max(1, count - 1));
  const totalW = w + spacing * (count - 1);
  const startX = (FIELD.width - totalW) / 2;
  for (let i = 0; i < count; i++) {
    const x = startX + i * spacing;
    const mid = (count - 1) / 2;
    const rot = (i - mid) * 0.03;
    const lift = Math.abs(i - mid) * 2;
    cards.push({ x, y: y + lift, rot, w, h });
  }
  return cards;
}

export function getBoardLayout(count, y) {
  const slots = [];
  const spacing = CARD_W_SM + 14;
  const totalW = spacing * BOARD_SLOTS - 14;
  const startX = (FIELD.width - totalW) / 2;
  for (let i = 0; i < BOARD_SLOTS; i++) {
    slots.push({ x: startX + i * spacing, y, w: CARD_W_SM, h: CARD_H_SM, occupied: i < count });
  }
  return slots;
}

export function hitTestCard(mx, my, layout) {
  for (let i = layout.length - 1; i >= 0; i--) {
    const c = layout[i];
    if (mx >= c.x && mx <= c.x + c.w && my >= c.y && my <= c.y + c.h) return i;
  }
  return -1;
}

export function screenToCanvas(canvas, clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (clientX - rect.left) * (FIELD.width / rect.width),
    y: (clientY - rect.top) * (FIELD.height / rect.height),
  };
}
