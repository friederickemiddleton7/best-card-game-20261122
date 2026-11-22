// Pure game state and rules for Tidebound Duel. No rendering, no browser APIs.
import { LIFE_START, LIFE_CAP, ENERGY_CAP, HAND_START, HAND_MAX, BOARD_SLOTS } from './config.js';
import { buildDeck } from './cards.js';

export const PHASE_TITLE = 'title';
export const PHASE_PLAY = 'play';
export const PHASE_WIN = 'win';
export const PHASE_LOSS = 'loss';

let nextUid = 1000;

function makePlayer(name, isAI) {
  return {
    name,
    isAI,
    life: LIFE_START,
    energy: 0,
    maxEnergy: 0,
    deck: [],
    hand: [],
    board: [],
    fatigue: 0,
  };
}

export function cardPower(card, owner, opponent) {
  let p = card.power;
  if (card.suit === 'ember' && owner.hand.length < opponent.hand.length) p += 1;
  if (card.suit === 'shell' && owner.life < 12) p += 2;
  return p;
}

export function tideStrength(player, opponent) {
  let total = 0;
  for (const c of player.board) total += cardPower(c, player, opponent);
  return total;
}

export function createGame(random) {
  const state = {
    phase: PHASE_TITLE,
    turn: 0,
    active: 'player', // 'player' or 'ai'
    player: makePlayer('You', false),
    ai: makePlayer('Rival', true),
    log: [],
    winner: null,
    anims: [],
    seed: 0,
  };
  state.player.deck = buildDeck(random);
  state.ai.deck = buildDeck(random);
  for (let i = 0; i < HAND_START; i++) {
    drawCard(state, state.player, false);
    drawCard(state, state.ai, false);
  }
  addLog(state, 'The tide rises. Duel begins.');
  return state;
}

export function addLog(state, text) {
  state.log.push(text);
  if (state.log.length > 30) state.log.shift();
}

export function drawCard(state, who, logIt = true) {
  if (who.deck.length === 0) {
    who.fatigue += 1;
    who.life = Math.max(0, who.life - who.fatigue);
    if (logIt) addLog(state, `${who.name} fatigues for ${who.fatigue}.`);
    return null;
  }
  const card = who.deck.shift();
  if (who.hand.length >= HAND_MAX) {
    if (logIt) addLog(state, `${who.name}'s hand is full. ${card.name} washes away.`);
    return null;
  }
  who.hand.push(card);
  if (logIt) addLog(state, `${who.name} draws a card.`);
  return card;
}

export function startTurn(state) {
  if (state.phase !== PHASE_PLAY) return;
  const who = currentPlayer(state);
  state.turn += 1;
  who.maxEnergy = Math.min(ENERGY_CAP, who.maxEnergy + 1);
  who.energy = who.maxEnergy;
  drawCard(state, who, true);
  addLog(state, `${who.name}'s turn ${state.turn}. Tide energy ${who.energy}.`);
}

export function currentPlayer(state) {
  return state.active === 'player' ? state.player : state.ai;
}
export function opponentPlayer(state) {
  return state.active === 'player' ? state.ai : state.player;
}

export function canPlay(state, who, card) {
  if (state.phase !== PHASE_PLAY) return false;
  if (who !== currentPlayer(state)) return false;
  if (who.energy < card.cost) return false;
  if (who.board.length >= BOARD_SLOTS) return false;
  return who.hand.includes(card);
}

export function playCard(state, who, card) {
  if (!canPlay(state, who, card)) return { ok: false };
  const opp = who === state.player ? state.ai : state.player;
  who.hand = who.hand.filter((c) => c.uid !== card.uid);
  who.energy -= card.cost;
  who.board.push(card);
  const events = [{ type: 'play', who: who.isAI ? 'ai' : 'player', card }];

  // Kelp: heals its power on play (cap 30)
  if (card.suit === 'kelp') {
    const heal = card.power;
    const before = who.life;
    who.life = Math.min(LIFE_CAP, who.life + heal);
    const healed = who.life - before;
    if (healed > 0) {
      addLog(state, `${card.name} heals ${who.name} for ${healed}.`);
      events.push({ type: 'heal', who: who.isAI ? 'ai' : 'player', amount: healed });
    }
  }

  // Gale: draw if no other Gale in play
  if (card.suit === 'gale') {
    const otherGale = who.board.some((c) => c.uid !== card.uid && c.suit === 'gale');
    if (!otherGale) {
      const drawn = drawCard(state, who, false);
      addLog(state, `${card.name} catches a gust. ${who.name} draws.`);
      events.push({ type: 'draw', who: who.isAI ? 'ai' : 'player', card: drawn });
    }
  }

  addLog(state, `${who.name} plays ${card.name} (${card.cost}/${card.power} ${card.suit}).`);
  checkWinner(state);
  return { ok: true, events };
}

export function resolveEndOfTurn(state) {
  if (state.phase !== PHASE_PLAY) return { damageTo: null, amount: 0 };
  const pStr = tideStrength(state.player, state.ai);
  const aStr = tideStrength(state.ai, state.player);
  const diff = pStr - aStr;
  let damageTo = null;
  let amount = 0;
  if (diff > 0) {
    damageTo = 'ai';
    amount = diff;
    state.ai.life = Math.max(0, state.ai.life - amount);
    addLog(state, `Tide surges ${pStr} vs ${aStr}. Rival takes ${amount}.`);
  } else if (diff < 0) {
    damageTo = 'player';
    amount = -diff;
    state.player.life = Math.max(0, state.player.life - amount);
    addLog(state, `Tide surges ${pStr} vs ${aStr}. You take ${amount}.`);
  } else {
    addLog(state, `Tides hold even at ${pStr}.`);
  }
  checkWinner(state);
  return { damageTo, amount, pStr, aStr };
}

export function checkWinner(state) {
  if (state.phase !== PHASE_PLAY) return state.winner;
  if (state.player.life <= 0 && state.ai.life <= 0) {
    // tie goes to whoever has higher life before clamp? both 0: active player loses
    state.winner = state.active === 'player' ? 'ai' : 'player';
  } else if (state.ai.life <= 0) {
    state.winner = 'player';
  } else if (state.player.life <= 0) {
    state.winner = 'ai';
  }
  if (state.winner) {
    state.phase = state.winner === 'player' ? PHASE_WIN : PHASE_LOSS;
    addLog(state, state.winner === 'player' ? 'You win the Tidebound Duel!' : 'Rival wins the Tidebound Duel.');
  }
  return state.winner;
}

export function endTurn(state) {
  if (state.phase !== PHASE_PLAY) return null;
  const result = resolveEndOfTurn(state);
  if (state.phase !== PHASE_PLAY) return result;
  state.active = state.active === 'player' ? 'ai' : 'player';
  startTurn(state);
  return result;
}

export function passTurn(state) {
  if (state.phase !== PHASE_PLAY) return null;
  addLog(state, `${currentPlayer(state).name} passes.`);
  return endTurn(state);
}

export function beginPlay(random) {
  const fresh = createGame(random);
  fresh.phase = PHASE_PLAY;
  fresh.active = 'player';
  fresh.log = ['The tide rises. Duel begins.'];
  fresh.turn = 0;
  fresh.player.maxEnergy = 0;
  fresh.player.energy = 0;
  fresh.ai.maxEnergy = 0;
  fresh.ai.energy = 0;
  startTurn(fresh);
  return fresh;
}

export function cloneForSim(state) {
  // lightweight clone for AI scoring; not used for rendering
  return JSON.parse(JSON.stringify(state));
}
