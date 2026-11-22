// Opponent AI for Tidebound Duel. Simple heuristic: lethal > heal when low > best power > synergy.
import { canPlay, playCard, passTurn, tideStrength, cardPower, cloneForSim, checkWinner } from './rules.js';

function scorePlay(state, card) {
  const ai = state.ai;
  const pl = state.player;
  let score = cardPower(card, ai, pl) * 10 - card.cost * 2;

  // Lethal: if playing this + end-of-turn surge kills player, huge bonus
  const simStr = tideStrength(ai, pl) + cardPower(card, ai, pl);
  const plStr = tideStrength(pl, ai);
  const diff = simStr - plStr;
  if (diff >= pl.life) score += 10000;

  // Heal when low
  if (card.suit === 'kelp' && ai.life < 15) score += card.power * 8;
  if (ai.life < 8) {
    if (card.suit === 'kelp') score += 40;
    if (card.suit === 'shell') score += 15;
  }

  // Shell synergy when low life
  if (card.suit === 'shell' && ai.life < 12) score += 20;

  // Gale draw value if no other gale
  if (card.suit === 'gale') {
    const hasGale = ai.board.some((c) => c.suit === 'gale');
    if (!hasGale) score += 18;
  }

  // Ember prefers when opponent has larger hand
  if (card.suit === 'ember' && pl.hand.length > ai.hand.length - 1) score += 8;

  // Prefer spending energy efficiently
  score += card.cost * 0.5;

  // Slight randomness factor baked in by caller via seed
  return score;
}

export function chooseAiAction(state, random) {
  const ai = state.ai;
  if (state.phase !== 'play' || state.active !== 'ai') return { type: 'pass' };

  const playable = ai.hand.filter((c) => canPlay(state, ai, c));
  if (playable.length === 0) return { type: 'pass' };

  let best = null;
  let bestScore = -Infinity;
  for (const card of playable) {
    let s = scorePlay(state, card);
    s += random() * 6; // slight randomness so it is beatable/readable
    if (s > bestScore) {
      bestScore = s;
      best = card;
    }
  }

  // If best is very poor and we have no board pressure, still play something reasonable
  if (!best) return { type: 'pass' };
  // Sometimes pass if nothing good and board is strong? keep simple: play best affordable.
  return { type: 'play', card: best };
}

export function takeAiTurn(state, random) {
  // AI may play one card then end turn (per rules: play one card per turn, or pass)
  const action = chooseAiAction(state, random);
  if (action.type === 'play' && action.card) {
    return { action: 'play', ...playCard(state, state.ai, action.card), card: action.card };
  }
  return { action: 'pass', result: passTurn(state) };
}
