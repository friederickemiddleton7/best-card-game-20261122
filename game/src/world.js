// Legacy/unused module kept for completeness; self-contained constants.
const BLOCK = { interval: 1.2, minInterval: 0.45, intervalScale: 0.92, minWidth: 36, maxWidth: 84, height: 22, speed: 160, speedPerLevel: 18, speedJitter: 30, dodgePoints: 1 };
const COIN = { interval: 2.4, intervalJitter: 1.0, size: 18, speed: 140, speedPerLevel: 10, points: 5 };
const FIELD_W = { width: 1280, height: 720, groundY: 680 };
const LEVEL = { seconds: 20, max: 8 };
const LIVES = 3;
const PLAYER = { width: 80, height: 20, speed: 420, invulnerable: 1.2 };
const POOL_SIZE = 24;

export const KIND_BLOCK = 0;
export const KIND_COIN = 1;

export const EVENT_HIT = 1;
export const EVENT_COIN = 2;
export const EVENT_OVER = 4;

function overlaps(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

export function createWorld(random) {
  const player = { x: 0, y: FIELD_W.groundY - PLAYER.height, width: PLAYER.width, height: PLAYER.height, invulnerable: 0 };
  const items = [];
  for (let index = 0; index < POOL_SIZE; index += 1) {
    items.push({ active: false, kind: KIND_BLOCK, x: 0, y: 0, width: 0, height: 0, speed: 0 });
  }
  const state = { player, items, score: 0, lives: LIVES, level: 1, elapsed: 0, blockTimer: 0, coinTimer: 0 };

  function reset() {
    player.x = (FIELD_W.width - player.width) / 2;
    player.invulnerable = 0;
    for (const item of items) item.active = false;
    state.score = 0;
    state.lives = LIVES;
    state.level = 1;
    state.elapsed = 0;
    state.blockTimer = BLOCK.interval;
    state.coinTimer = COIN.interval;
  }

  function freeItem() {
    for (let index = 0; index < items.length; index += 1) if (!items[index].active) return items[index];
    return null;
  }

  function spawnBlock() {
    const item = freeItem();
    if (item === null) return;
    item.active = true;
    item.kind = KIND_BLOCK;
    item.width = BLOCK.minWidth + random() * (BLOCK.maxWidth - BLOCK.minWidth);
    item.height = BLOCK.height;
    item.x = random() * (FIELD_W.width - item.width);
    item.y = -item.height;
    item.speed = BLOCK.speed + BLOCK.speedPerLevel * (state.level - 1) + random() * BLOCK.speedJitter;
  }

  function spawnCoin() {
    const item = freeItem();
    if (item === null) return;
    item.active = true;
    item.kind = KIND_COIN;
    item.width = COIN.size;
    item.height = COIN.size;
    item.x = random() * (FIELD_W.width - item.width);
    item.y = -item.height;
    item.speed = COIN.speed + COIN.speedPerLevel * (state.level - 1);
  }

  function blockInterval() {
    return Math.max(BLOCK.minInterval, BLOCK.interval * BLOCK.intervalScale ** (state.level - 1));
  }

  /**
   * One fixed step. `direction` is -1, 0 or 1 (left, still, right). With `harmless` set (the title
   * screen's backdrop) things fall but nothing touches the player and nothing scores.
   */
  function step(dt, direction, harmless) {
    let events = 0;
    state.elapsed += dt;
    state.level = Math.min(LEVEL.max, 1 + Math.floor(state.elapsed / LEVEL.seconds));

    player.x = Math.min(FIELD_W.width - player.width, Math.max(0, player.x + direction * PLAYER.speed * dt));
    if (player.invulnerable > 0) player.invulnerable = Math.max(0, player.invulnerable - dt);

    state.blockTimer -= dt;
    if (state.blockTimer <= 0) {
      spawnBlock();
      state.blockTimer += blockInterval();
    }
    state.coinTimer -= dt;
    if (state.coinTimer <= 0) {
      spawnCoin();
      state.coinTimer += COIN.interval + random() * COIN.intervalJitter;
    }

    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      if (!item.active) continue;
      item.y += item.speed * dt;
      if (item.y > FIELD_W.groundY) {
        item.active = false;
        if (item.kind === KIND_BLOCK && !harmless) state.score += BLOCK.dodgePoints;
        continue;
      }
      if (harmless || !overlaps(item, player)) continue;
      if (item.kind === KIND_COIN) {
        item.active = false;
        state.score += COIN.points;
        events |= EVENT_COIN;
      } else if (player.invulnerable === 0) {
        item.active = false;
        state.lives -= 1;
        player.invulnerable = PLAYER.invulnerable;
        events |= EVENT_HIT;
        if (state.lives === 0) {
          events |= EVENT_OVER;
          break;
        }
      }
    }
    return events;
  }

  reset();
  return { state, reset, step };
}
