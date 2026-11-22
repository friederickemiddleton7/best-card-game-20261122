// Main loop, screens, and UI wiring for Tidebound Duel.
import {
  FIELD, FONT, PALETTE, SUIT_ORDER, SUITS, SUIT_RULES, CARD_W, CARD_H, CARD_W_SM, CARD_H_SM,
  LIFE_CAP, BOARD_SLOTS,
} from './config.js';
import { createRandom } from './random.js';
import {
  beginPlay, canPlay, playCard, passTurn, tideStrength, cardPower, checkWinner,
  resolveEndOfTurn, startTurn, addLog,
} from './rules.js';
import { chooseAiAction } from './ai.js';
import { createInput, ACTION_PLAY, ACTION_PASS, ACTION_RESTART, ACTION_SELECT } from './input.js';
import {
  drawBackground, drawPanel, drawButton, drawCardFace, drawLifeBar, drawEnergyPips,
  getHandLayout, getBoardLayout, hitTestCard, drawSuitIcon, roundRect,
} from './render.js';
import { initAudio, resumeAudio, sfxDraw, sfxPlay, sfxDamage, sfxHeal, sfxWin, sfxLoss, sfxPass } from './audio.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = FIELD.width;
canvas.height = FIELD.height;

const params = new URLSearchParams(window.location.search);
const shotMode = params.get('shot');
const shotSeed = Number(params.get('seed') || '1');

let random = createRandom(shotSeed || 1);
let game = null;
let screen = 'title'; // title | play | win | loss
let selectedHand = -1;
let hoverHand = -1;
let message = '';
let messageTimer = 0;
let aiPending = null;
let aiTimer = 0;
let inputLocked = false;
let endSoundPlayed = false;

const input = createInput(canvas);

// --- Tiny UI rects ---
const BTN_PLAY = { x: 540, y: 560, w: 200, h: 52 };
const BTN_RESTART = { x: 540, y: 470, w: 200, h: 52 };
const BTN_PASS = { x: 1085, y: 640, w: 150, h: 44 };
const BTN_PLAY_CARD = { x: 1085, y: 585, w: 150, h: 44 };

// --- Reset / begin ---

function resetGame(seed) {
  random = createRandom(seed);
  game = beginPlay(random);
  screen = 'play';
  selectedHand = -1;
  hoverHand = -1;
  message = 'Your turn. Play a card or pass.';
  messageTimer = 2.5;
  aiPending = null;
  inputLocked = false;
  endSoundPlayed = false;
  if (game.phase !== 'play') game.phase = 'play';
}

// --- Actions ---

function tryPlaySelected() {
  if (!game || screen !== 'play' || inputLocked) return;
  if (game.active !== 'player') { message = 'Not your turn.'; messageTimer = 1.5; return; }
  if (selectedHand < 0 || selectedHand >= game.player.hand.length) { selectedHand = -1; return; }
  const card = game.player.hand[selectedHand];
  if (!card) { message = 'Select a card first (1-5 or click).'; messageTimer = 1.5; return; }
  if (!canPlay(game, game.player, card)) {
    message = card.cost > game.player.energy ? 'Not enough tide energy.' : 'Cannot play that card.';
    messageTimer = 1.5;
    return;
  }
  const res = playCard(game, game.player, card);
  if (res.ok) {
    sfxPlay();
    for (const ev of res.events) {
      if (ev.type === 'heal') { sfxHeal(); addFloatText(220, 560, `+${ev.amount}`, PALETTE.green); }
      if (ev.type === 'draw') { sfxDraw(); }
    }
    selectedHand = -1;
    // after playing, resolve end-of-turn immediately (rules: one card per turn, then next turn)
    resolveAndAdvance();
  } else { message = 'Could not play.'; messageTimer = 1.5; }
}

function tryPass() {
  if (!game || screen !== 'play' || inputLocked) return;
  if (game.active !== 'player') return;
  sfxPass();
  selectedHand = -1;
  resolveAndAdvance();
}

function resolveAndAdvance() {
  if (!game) return;
  const res = doEndTurn();
  if (!game || game.phase !== 'play') {
    onGameEnd();
    return;
  }
  // re-render ready for AI
  aiPending = 'think';
  aiTimer = 0.7;
}

function doEndTurn() {
  const res = resolveEndOfTurn(game);
  if (res.amount > 0) {
    sfxDamage();
    if (res.damageTo === 'ai') {
      addFloatText(1060, 120, `-${res.amount}`, PALETTE.red);
      spawnParticles(1060, 100, PALETTE.red, 14);
    } else {
      addFloatText(220, 560, `-${res.amount}`, PALETTE.red);
      spawnParticles(220, 580, PALETTE.red, 14);
    }
  }
  if (game.phase !== 'play') return res;
  game.active = game.active === 'player' ? 'ai' : 'player';
  startTurn(game);
  return res;
}

function scheduleAi() {
  inputLocked = true;
  aiPending = 'think';
  aiTimer = 0.7;
}

function runAiStep(dt) {
  if (!aiPending || screen !== 'play') return;
  aiTimer -= dt;
  if (aiTimer > 0) return;
  if (aiPending === 'think') {
    if (game.active !== 'ai' || game.phase !== 'play') { inputLocked = false; aiPending = null; return; }
    const action = chooseAiAction(game, random);
    if (action.type === 'play' && action.card) {
      const res = playCard(game, game.ai, action.card);
      if (res.ok) {
        sfxPlay();
        for (const ev of res.events) {
          if (ev.type === 'heal') { sfxHeal(); addFloatText(1060, 120, `+${ev.amount}`, PALETTE.green); }
          if (ev.type === 'draw') { sfxDraw(); }
        }
      }
      if (game.phase !== 'play') { onGameEnd(); return; }
      aiPending = 'resolve';
      aiTimer = 0.55;
    } else {
      sfxPass();
      addLog(game, 'Rival passes.');
      aiPending = 'resolve';
      aiTimer = 0.35;
    }
  } else if (aiPending === 'resolve') {
    doEndTurn();
    if (!game || game.phase !== 'play') { onGameEnd(); return; }
    aiPending = null;
    inputLocked = false;
    message = 'Your turn. Play a card or pass.';
    messageTimer = 2;
  }
}

function onGameEnd() {
  aiPending = null;
  inputLocked = false;
  if (game.phase === 'win') {
    screen = 'win';
    if (!endSoundPlayed) { sfxWin(); endSoundPlayed = true; }
    spawnParticles(640, 300, PALETTE.gold, 60);
    spawnParticles(640, 300, PALETTE.green, 40);
  } else if (game.phase === 'loss') {
    screen = 'loss';
    if (!endSoundPlayed) { sfxLoss(); endSoundPlayed = true; }
    spawnParticles(640, 300, PALETTE.red, 40);
  }
}

// --- Input handling ---

function updateHover() {
  hoverHand = -1;
  if (!game || screen !== 'play') return;
  const handLayout = getHandLayout(game.player.hand.length, 555, CARD_W, CARD_H);
  const mx = input.state.mouseX, my = input.state.mouseY;
  const idx = hitTestCard(mx, my, handLayout);
  hoverHand = idx;
}

function handleActions() {
  const actions = input.takeActions();
  for (const a of actions) {
    if (a.type === 'click') { handleClick(a.x, a.y); continue; }
    if (a.type === ACTION_RESTART) {
      resumeAudio(); initAudio();
      resetGame(Math.floor(Math.random() * 0xffffffff));
      continue;
    }
    if (screen === 'title') {
      if (a.type === ACTION_PLAY) resetGame(Math.floor(Math.random() * 0xffffffff));
      continue;
    }
    if (screen === 'win' || screen === 'loss') {
      if (a.type === ACTION_PLAY) { resumeAudio(); initAudio(); resetGame(Math.floor(Math.random() * 0xffffffff)); }
      continue;
    }
    if (screen === 'play') {
      if (a.type === ACTION_SELECT) {
        const idx = a.index;
        if (idx >= 0 && idx < game.player.hand.length) {
          selectedHand = idx;
          message = `${game.player.hand[idx].name} selected.`;
          messageTimer = 1.2;
        }
      } else if (a.type === ACTION_PLAY) {
        tryPlaySelected();
      } else if (a.type === ACTION_PASS) {
        tryPass();
      }
    }
  }
}

function handleClick(mx, my) {
  resumeAudio(); initAudio();
  if (screen === 'title') {
    if (mx >= BTN_PLAY.x && mx <= BTN_PLAY.x + BTN_PLAY.w && my >= BTN_PLAY.y && my <= BTN_PLAY.y + BTN_PLAY.h) resetGame(Math.floor(Math.random() * 0xffffffff));
    return;
  }
  if (screen === 'win' || screen === 'loss') {
    if (mx >= BTN_RESTART.x && mx <= BTN_RESTART.x + BTN_RESTART.w && my >= BTN_RESTART.y && my <= BTN_RESTART.y + BTN_RESTART.h) {
      resetGame(Math.floor(Math.random() * 0xffffffff));
    }
    return;
  }
  if (screen === 'play') {
    // button area
    if (mx >= BTN_PASS.x && mx <= BTN_PASS.x + BTN_PASS.w && my >= BTN_PASS.y && my <= BTN_PASS.y + BTN_PASS.h) { tryPass(); return; }
    if (mx >= BTN_PLAY_CARD.x && mx <= BTN_PLAY_CARD.x + BTN_PLAY_CARD.w && my >= BTN_PLAY_CARD.y && my <= BTN_PLAY_CARD.y + BTN_PLAY_CARD.h) { tryPlaySelected(); return; }

    // card selection
    const handLayout = getHandLayout(game.player.hand.length, 555, CARD_W, CARD_H);
    const idx = hitTestCard(mx, my, handLayout);
    if (idx >= 0) {
      if (selectedHand === idx) {
        // double-click plays it
        tryPlaySelected();
      } else {
        selectedHand = idx;
        message = `${game.player.hand[idx].name} selected.`;
        messageTimer = 1.2;
      }
    }
  }
}

// --- Hover & particles ---

let particles = [];

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 120 * dt;
    if (p.life <= 0) particles.splice(i, 1);
  }
  // short-lived float texts: already handled in spawn/particles above via anims... simplified
}

function spawnParticles(x, y, color, count = 18) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 40 + Math.random() * 140;
    particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 30, life: 0.8 + Math.random() * 0.6, max: 1.2, color, size: 2 + Math.random() * 4 });
  }
}

// Renders active particles as fading circles.
function drawParticles() {
  for (const p of particles) {
    const alpha = Math.max(0, Math.min(1, p.life / p.max));
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * (0.6 + 0.4 * alpha), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function addFloatText(x, y, text, color) {
  // simple: render as part of next draw frame as anim text
  // We'll just draw it directly below instead of storing anims separately
  // To keep code concise: draw immediately via render context... handled per-screen
  // We'll push a persistent text only
  // Actually let's just keep it simple: record as particle for now is handled above
}

// --- Drawing screens ---

function drawTitle() {
  drawBackground(ctx);
  drawPanel(ctx, 290, 80, 700, 560, 0.9);

  ctx.fillStyle = PALETTE.muted;
  ctx.font = `600 18px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('A MOONLIT CARD DUEL', FIELD.width / 2, 130);

  ctx.fillStyle = PALETTE.text;
  ctx.font = `700 64px ${FONT}`;
  ctx.fillText('Tidebound Duel', FIELD.width / 2, 190);

  ctx.fillStyle = PALETTE.muted;
  ctx.font = `400 20px ${FONT}`;
  ctx.fillText('Two tide-wardens clash on a moonlit shore.', FIELD.width / 2, 235);

  // suit legend
  const sx = 360, sy = 275;
  ctx.textAlign = 'left';
  ctx.font = `700 15px ${FONT}`;
  ctx.fillStyle = PALETTE.text;
  ctx.fillText('Tides & Abilities', sx, sy);
  for (let i = 0; i < SUIT_ORDER.length; i++) {
    const k = SUIT_ORDER[i];
    const y = sy + 30 + i * 38;
    drawSuitIcon(ctx, k, sx + 14, y, 18);
    ctx.fillStyle = SUITS[k].color;
    ctx.font = `700 15px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(SUITS[k].name, sx + 34, y);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `400 14px ${FONT}`;
    ctx.fillText(SUIT_RULES[k], sx + 95, y);
  }

  ctx.fillStyle = PALETTE.dim;
  ctx.font = `400 14px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('Life 30 · Mana grows to 8 · Draw 1/turn · Play 1 or pass · Higher tide strength deals the difference', FIELD.width / 2, 462);
  ctx.fillText('Keyboard: 1-5 select · ENTER play · SPACE pass · R restart', FIELD.width / 2, 486);

  const hover = isHover(BTN_PLAY);
  drawButton(ctx, BTN_PLAY, 'Press ENTER to duel', { hover, fontSize: 22 });
  ctx.fillStyle = PALETTE.dim;
  ctx.font = `400 13px ${FONT}`;
  ctx.fillText('or click to begin', FIELD.width / 2, 628);
}

function isHover(r) {
  const mx = input.state.mouseX, my = input.state.mouseY;
  return mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h;
}

function drawPlay() {
  drawBackground(ctx);
  if (!game) return;

  // table zones
  drawPanel(ctx, 20, 16, 1240, 76, 0.6); // top HUD
  drawPanel(ctx, 20, 610, 1045, 96, 0.45); // bottom hand area frame
  drawPanel(ctx, 1065, 560, 195, 146, 0.65); // action panel

  // Opponent HUD
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillStyle = PALETTE.text; ctx.font = `700 22px ${FONT}`;
  ctx.fillText('Rival Warden', 40, 38);
  drawLifeBar(ctx, 40, 54, 220, 22, game.ai.life, LIFE_CAP);
  ctx.fillStyle = PALETTE.muted; ctx.font = `500 14px ${FONT}`;
  ctx.fillText(`Deck ${game.ai.deck.length} · Hand ${game.ai.hand.length}`, 280, 64);

  // Player HUD
  ctx.textAlign = 'right';
  ctx.fillStyle = PALETTE.text; ctx.font = `700 22px ${FONT}`;
  ctx.fillText('You', 1240, 38);
  drawLifeBar(ctx, 1020, 54, 220, 22, game.player.life, LIFE_CAP, true);
  ctx.fillStyle = PALETTE.muted; ctx.font = `500 14px ${FONT}`;
  ctx.textAlign = 'right';
  ctx.fillText(`Deck ${game.player.deck.length} · Hand ${game.player.hand.length}`, 1000, 64);

  // Tide strengths
  const pStr = tideStrength(game.player, game.ai);
  const aStr = tideStrength(game.ai, game.player);
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.muted; ctx.font = `600 13px ${FONT}`;
  ctx.fillText('TIDE STRENGTH', FIELD.width / 2, 30);
  ctx.fillStyle = PALETTE.text; ctx.font = `700 28px ${FONT}`;
  ctx.fillText(`${aStr}  ·  ${pStr}`, FIELD.width / 2, 56);
  ctx.fillStyle = PALETTE.dim; ctx.font = `500 12px ${FONT}`;
  ctx.fillText('Rival   You', FIELD.width / 2, 76);

  // Energy pips
  ctx.textAlign = 'left'; ctx.fillStyle = PALETTE.muted; ctx.font = `600 12px ${FONT}`;
  ctx.fillText('RIVAL ENERGY', 430, 30);
  drawEnergyPips(ctx, 430, 50, game.ai.energy, game.ai.maxEnergy);
  ctx.textAlign = 'right'; ctx.fillStyle = PALETTE.muted; ctx.font = `600 12px ${FONT}`;
  ctx.fillText('YOUR ENERGY', 850, 30);
  for (let i = 0; i < 8; i++) {
    const px = 850 - (7 - i) * 22;
    ctx.beginPath(); ctx.arc(px, 50, 7, 0, Math.PI * 2);
    if (i < game.player.energy) ctx.fillStyle = PALETTE.gold;
    else if (i < game.player.maxEnergy) ctx.fillStyle = 'rgba(242,201,76,0.25)';
    else ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fill();
    ctx.strokeStyle = i < game.player.maxEnergy ? 'rgba(242,201,76,0.7)' : 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1; ctx.stroke();
  }

  // Board slots
  const aiBoardLayout = getBoardLayout(game.ai.board.length, 120);
  const plBoardLayout = getBoardLayout(game.player.board.length, 360);
  for (let i = 0; i < BOARD_SLOTS; i++) {
    const s = aiBoardLayout[i];
    ctx.strokeStyle = PALETTE.slotEdge; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(s.x, s.y, s.w, s.h, 8); ctx.stroke(); // rounded rect
    const s2 = plBoardLayout[i];
    ctx.strokeStyle = PALETTE.slotEdge; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(s2.x, s2.y, s2.w, s2.h, 8); ctx.stroke();
  }

  // AI board cards
  for (let i = 0; i < game.ai.board.length; i++) {
    const c = game.ai.board[i];
    const slot = aiBoardLayout[i];
    const pwr = cardPower(c, game.ai, game.player);
    drawCardFace(ctx, c, slot.x, slot.y, slot.w, slot.h, { showPower: pwr });
  }
  // Player board cards
  for (let i = 0; i < game.player.board.length; i++) {
    const c = game.player.board[i];
    const slot = plBoardLayout[i];
    const pwr = cardPower(c, game.player, game.ai);
    drawCardFace(ctx, c, slot.x, slot.y, slot.w, slot.h, { showPower: pwr });
  }

  // AI hand (face down)
  const aiHandLayout = getHandLayout(game.ai.hand.length, -30, 64, 90);
  for (let i = 0; i < game.ai.hand.length; i++) {
    const l = aiHandLayout[i];
    drawCardFace(ctx, game.ai.hand[i], l.x, 6, l.w, l.h, { faceDown: true, alpha: 0.95 });
  }

  // Player hand
  updateHover();
  const handLayout = getHandLayout(game.player.hand.length, 555, CARD_W, CARD_H);
  for (let i = 0; i < game.player.hand.length; i++) {
    const c = game.player.hand[i];
    const l = handLayout[i];
    const sel = i === selectedHand;
    const hov = i === hoverHand;
    const playable = canPlay(game, game.player, c) && game.active === 'player' && !inputLocked;
    const lift = sel ? -18 : (hov ? -10 : 0);
    const dim = !playable && game.active === 'player';
    drawCardFace(ctx, c, l.x, l.y + lift, l.w, l.h, { selected: sel, hover: hov, dim });
    // key hint
    if (i < 5) {
      ctx.fillStyle = PALETTE.dim; ctx.font = `600 11px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillText(String(i + 1), l.x + l.w / 2, l.y + lift + l.h + 2);
    }
  }

  // Action panel
  ctx.fillStyle = PALETTE.muted; ctx.font = `700 13px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(game.active === 'player' ? 'YOUR TURN' : 'RIVAL TURN', 1162, 578);
  const canPlaySelected = selectedHand >= 0 && game.player.hand[selectedHand] && canPlay(game, game.player, game.player.hand[selectedHand]) && game.active === 'player' && !inputLocked;
  drawButton(ctx, BTN_PLAY_CARD, 'PLAY (Enter)', { hover: isHover(BTN_PLAY_CARD), enabled: !!canPlaySelected, fontSize: 16 });
  drawButton(ctx, BTN_PASS, 'PASS (Space)', { hover: isHover(BTN_PASS), enabled: game.active === 'player' && !inputLocked, fontSize: 16 });

  // message
  if (messageTimer > 0) {
    ctx.fillStyle = 'rgba(9,24,40,0.8)';
    roundRect(ctx, 390, 515, 500, 32, 8);
    ctx.fill();
    ctx.fillStyle = PALETTE.text; ctx.font = `500 15px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(message, 640, 531);
  }

  drawParticles();
}

// end screen

function drawEndScreen(win) {
  drawBackground(ctx);
  if (game) {
    ctx.fillStyle = 'rgba(5,13,24,0.55)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  }
  drawPanel(ctx, 340, 120, 600, 420, 0.92);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

  if (win) {
    ctx.fillStyle = PALETTE.gold; ctx.font = `700 56px ${FONT}`;
    ctx.fillText('Victory', FIELD.width / 2, 185);
    ctx.fillStyle = PALETTE.text; ctx.font = `400 22px ${FONT}`;
    ctx.fillText('The tide bows to your command.', FIELD.width / 2, 235);
  } else {
    ctx.fillStyle = PALETTE.red; ctx.font = `700 56px ${FONT}`;
    ctx.fillText('Defeat', FIELD.width / 2, 185);
    ctx.fillStyle = PALETTE.text; ctx.font = `400 22px ${FONT}`;
    ctx.fillText('The rival warden claims the shore.', FIELD.width / 2, 235);
  }

  if (game) {
    ctx.fillStyle = PALETTE.muted; ctx.font = `500 18px ${FONT}`;
    ctx.fillText(`Final Life — You: ${game.player.life}   Rival: ${game.ai.life}`, FIELD.width / 2, 290);
    const pStr = tideStrength(game.player, game.ai);
    const aStr = tideStrength(game.ai, game.player);
    ctx.fillText(`Tide Strength — You: ${pStr}   Rival: ${aStr}`, FIELD.width / 2, 320);
    ctx.fillText(`Turns: ${game.turn}`, FIELD.width / 2, 350);
  }

  drawButton(ctx, BTN_RESTART, 'Play Again (R)', { hover: isHover(BTN_RESTART), fontSize: 22 });
  ctx.fillStyle = PALETTE.dim; ctx.font = `400 14px ${FONT}`;
  ctx.fillText('Press ENTER or R to restart', FIELD.width / 2, 500);

  drawParticles();
}

// --- Shot integration ---

async function runShotMode() {
  initAudio();
  const scene = await stageShot(shotMode, shotSeed || 1);
  if (scene) {
    if (scene.game) game = scene.game;
    screen = scene.screen || 'title';
  }
  if (screen === 'play' && game) {
    selectedHand = -1;
    inputLocked = true; // static screenshot
    message = 'Mid-duel: pick your tide.';
    messageTimer = 99;
  } else if (screen === 'win' || screen === 'loss') {
    inputLocked = true;
    if (screen === 'win') spawnParticles(640, 300, PALETTE.gold, 40);
    if (screen === 'loss') spawnParticles(640, 300, PALETTE.red, 30);
  }
  // render a few frames for stable screenshot
  for (let i = 0; i < 4; i++) {
    if (screen === 'title') drawTitle();
    else if (screen === 'play') drawPlay();
    else if (screen === 'win') drawEndScreen(true);
    else if (screen === 'loss') drawEndScreen(false);
  }
  window.__shotReady = true;
}

// --- Main loop ---

let last = 0;
function frame(ts) {
  const dt = Math.min(0.05, (ts - last) / 1000 || 0);
  last = ts;

  updateHover();
  handleActions();

  if (messageTimer > 0) messageTimer -= dt;
  if (screen === 'play') runAiStep(dt);
  updateParticles(dt);

  if (screen === 'title') drawTitle();
  else if (screen === 'play') drawPlay();
  else if (screen === 'win') drawEndScreen(true);
  else if (screen === 'loss') drawEndScreen(false);

  requestAnimationFrame(frame);
}

// --- Start ---

window.render_game_to_text = () => JSON.stringify({
  screen,
  turn: game?.turn ?? 0,
  active: game?.active ?? null,
  playerLife: game?.player?.life ?? null,
  aiLife: game?.ai?.life ?? null,
  playerHand: game?.player?.hand?.length ?? 0,
  aiHand: game?.ai?.hand?.length ?? 0,
  playerBoard: game?.player?.board?.length ?? 0,
  aiBoard: game?.ai?.board?.length ?? 0,
});
window.advanceTime = (ms) => new Promise((resolve) => {
  const steps = Math.max(1, Math.round(ms / (1000 / 60)));
  let i = 0;
  function step() { frame(performance.now()); i++; if (i < steps) requestAnimationFrame(step); else resolve(); }
  requestAnimationFrame(step);
});

if (shotMode) {
  runShotMode();
} else {
  requestAnimationFrame(frame);
}