// Tuning, palette and tide definitions for Tidebound Duel.
export const FIELD = { width: 1280, height: 720 };
export const STEP = 1 / 60;

export const LIFE_START = 30;
export const LIFE_CAP = 30;
export const ENERGY_CAP = 8;
export const HAND_START = 4;
export const HAND_MAX = 7;
export const DECK_SIZE = 24;
export const BOARD_SLOTS = 5;

export const CARD_W = 92;
export const CARD_H = 132;
export const CARD_W_SM = 72;
export const CARD_H_SM = 104;

export const SUITS = {
  ember: { key: 'ember', name: 'Ember', color: '#ff5a3c', edge: '#ffb09c', glow: 'rgba(255,90,60,0.35)', shape: 'triangle' },
  kelp:  { key: 'kelp',  name: 'Kelp',  color: '#3dd68c', edge: '#a8f4c8', glow: 'rgba(61,214,140,0.35)', shape: 'circle' },
  shell: { key: 'shell', name: 'Shell', color: '#f2c94c', edge: '#ffe79a', glow: 'rgba(242,201,76,0.35)', shape: 'square' },
  gale:  { key: 'gale',  name: 'Gale',  color: '#6ecbff', edge: '#bfe9ff', glow: 'rgba(110,203,255,0.35)', shape: 'diamond' },
};
export const SUIT_ORDER = ['ember', 'kelp', 'shell', 'gale'];

export const SUIT_RULES = {
  ember: '+1 power while your hand is smaller than theirs',
  kelp: 'Heals its power to your life when played (cap 30)',
  shell: '+2 power while your life is below 12',
  gale: 'Draw a card when played if you have no other Gale in play',
};

export const PALETTE = {
  backdrop: '#050d18',
  skyTop: '#061226',
  skyBottom: '#0a2340',
  sea: '#0b2a45',
  wave: '#15456d',
  shore: '#132a3f',
  moon: '#e8f1ff',
  moonGlow: 'rgba(180,215,255,0.18)',
  panel: 'rgba(9, 24, 40, 0.86)',
  panelEdge: 'rgba(120, 175, 230, 0.35)',
  text: '#eef4ff',
  muted: '#8fa6c8',
  dim: '#56708f',
  gold: '#f2c94c',
  red: '#ff6b6b',
  green: '#5ee08a',
  cardFace: '#132b45',
  cardFace2: '#0d2035',
  cardBack: '#122b45',
  cardBackEdge: '#355f8d',
  slot: 'rgba(255,255,255,0.045)',
  slotEdge: 'rgba(150,195,240,0.18)',
  button: '#183554',
  buttonHover: '#23507a',
  buttonEdge: '#6ecbff',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
export const BEST_KEY = 'tidebound.best';
