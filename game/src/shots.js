// Deterministic screenshot scenes for Tidebound Duel.
import { createRandom } from './random.js';
import { beginPlay, playCard, passTurn, resolveEndOfTurn, startTurn, canPlay, cardPower, tideStrength } from './rules.js';
import { chooseAiAction } from './ai.js';

function simulateTurn(game, random) {
  // play one card for active player if possible, else pass
  const who = game.active === 'player' ? game.player : game.ai;
  const playable = who.hand.filter((c) => canPlay(game, who, c));
  if (playable.length > 0) {
    // pick highest power affordable, with slight preference
    playable.sort((a, b) => (b.power + b.cost) - (a.power + a.cost));
    const pick = playable[0];
    playCard(game, who, pick);
  } else {
    // pass - no card played
  }
  if (game.phase !== 'play') return;
  resolveEndOfTurn(game);
  if (game.phase !== 'play') return;
  game.active = game.active === 'player' ? 'ai' : 'player';
  startTurn(game);
}

function fastForward(game, random, turns) {
  for (let i = 0; i < turns && game.phase === 'play'; i++) {
    simulateTurn(game, random);
  }
}

export async function stageShot(name, seed) {
  const random = createRandom(seed || 1);
  if (name === 'start') {
    // show title - no game state needed beyond screen
    return { screen: 'title', game: null };
  }

  if (name === 'play') {
    const game = beginPlay(random);
    // play a few turns to get interesting board state
    fastForward(game, random, 6);
    // ensure it's player's turn with a playable hand for a nice midgame shot
    if (game.phase === 'play' && game.active === 'ai') {
      // do one ai turn to give back to player
      simulateTurn(game, random);
    }
    // make sure player has energy and at least one playable card visible
    if (game.phase === 'play') {
      game.active = 'player';
      if (game.player.energy < 2) game.player.energy = Math.min(game.player.maxEnergy || 3, 3);
      if (game.player.maxEnergy < 3) game.player.maxEnergy = 3;
    }
    return { screen: 'play', game };
  }

  if (name === 'win' || name === 'end') {
    // force a win: simulate until player wins, or construct one
    let game = beginPlay(random);
    // try natural playthrough first
    for (let i = 0; i < 80 && game.phase === 'play'; i++) {
      simulateTurn(game, random);
    }
    if (game.phase !== 'win') {
      // construct a clear win state
      game = beginPlay(random);
      fastForward(game, random, 4);
      game.ai.life = 3;
      game.player.life = 18;
      // give player strong board
      while (game.player.board.length < 3) {
        const c = game.player.hand.find((x) => canPlay(game, game.player, x)) || game.player.deck[0];
        if (!c) break;
        if (!game.player.hand.includes(c)) { game.player.hand.push(c); }
        game.player.energy = Math.max(game.player.energy, c.cost);
        playCard(game, game.player, c);
        if (game.phase !== 'play') break;
      }
      // ensure ai has weak board
      game.ai.board = game.ai.board.slice(0, 1);
      if (game.phase === 'play') {
        resolveEndOfTurn(game);
      }
      if (game.phase === 'play') {
        game.ai.life = 0;
        game.phase = 'win';
        game.winner = 'player';
      }
    }
    return { screen: 'win', game };
  }

  if (name === 'loss') {
    let game = beginPlay(random);
    // quick loss: make player life 0
    game.player.life = 0;
    game.phase = 'loss';
    game.winner = 'ai';
    return { screen: 'loss', game };
  }

  // default fallback
  return { screen: 'title', game: null };
}
