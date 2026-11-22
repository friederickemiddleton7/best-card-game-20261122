// Card definitions and deck construction for Tidebound Duel.
import { SUIT_ORDER } from './config.js';
import { shuffle } from './random.js';

// 24 unique cards: 6 per tide, costs 1-5, powers 1-9.
const DEFINITIONS = [
  // Ember - aggressive, hand-size pressure
  { id: 'ember-spark',   suit: 'ember', name: 'Cinder Spark',   cost: 1, power: 2 },
  { id: 'ember-flicker', suit: 'ember', name: 'Flare Flicker',  cost: 2, power: 3 },
  { id: 'ember-blade',   suit: 'ember', name: 'Ash Blade',      cost: 2, power: 4 },
  { id: 'ember-surge',   suit: 'ember', name: 'Magma Surge',    cost: 3, power: 5 },
  { id: 'ember-wraith',  suit: 'ember', name: 'Ember Wraith',   cost: 4, power: 7 },
  { id: 'ember-titan',   suit: 'ember', name: 'Pyre Titan',     cost: 5, power: 9 },
  // Kelp - sustain and healing
  { id: 'kelp-sprout',   suit: 'kelp',  name: 'Kelp Sprout',    cost: 1, power: 1 },
  { id: 'kelp-frond',    suit: 'kelp',  name: 'Frond Warden',   cost: 2, power: 2 },
  { id: 'kelp-weaver',   suit: 'kelp',  name: 'Tide Weaver',    cost: 3, power: 4 },
  { id: 'kelp-bloom',    suit: 'kelp',  name: 'Bloom Keeper',   cost: 3, power: 3 },
  { id: 'kelp-sage',     suit: 'kelp',  name: 'Reef Sage',      cost: 4, power: 6 },
  { id: 'kelp-leviathan',suit: 'kelp',  name: 'Kelp Leviathan', cost: 5, power: 8 },
  // Shell - defensive comeback
  { id: 'shell-shard',   suit: 'shell', name: 'Shell Shard',    cost: 1, power: 2 },
  { id: 'shell-crab',    suit: 'shell', name: 'Moon Crab',      cost: 2, power: 3 },
  { id: 'shell-guard',   suit: 'shell', name: 'Tide Guard',     cost: 2, power: 2 },
  { id: 'shell-bulwark', suit: 'shell', name: 'Pearl Bulwark',  cost: 3, power: 4 },
  { id: 'shell-knight',  suit: 'shell', name: 'Reef Knight',    cost: 4, power: 6 },
  { id: 'shell-colossus',suit: 'shell', name: 'Shell Colossus', cost: 5, power: 8 },
  // Gale - tempo and draw
  { id: 'gale-gust',     suit: 'gale',  name: 'Salt Gust',      cost: 1, power: 1 },
  { id: 'gale-dart',     suit: 'gale',  name: 'Spray Dart',     cost: 2, power: 3 },
  { id: 'gale-mistral',  suit: 'gale',  name: 'Mistral Wing',   cost: 3, power: 4 },
  { id: 'gale-squall',   suit: 'gale',  name: 'Squall Caller',  cost: 3, power: 3 },
  { id: 'gale-roamer',   suit: 'gale',  name: 'Storm Roamer',   cost: 4, power: 6 },
  { id: 'gale-tempest',  suit: 'gale',  name: 'Moon Tempest',   cost: 5, power: 8 },
];

export function makeCard(def, uid) {
  return { uid, id: def.id, name: def.name, suit: def.suit, cost: def.cost, power: def.power };
}

export function buildDeck(random) {
  const deck = DEFINITIONS.map((def, i) => makeCard(def, i + 1));
  return shuffle(deck, random);
}

export function cardById(id) {
  return DEFINITIONS.find((d) => d.id === id);
}

export function suitIndex(suit) {
  return SUIT_ORDER.indexOf(suit);
}
