// Input handling for Tidebound Duel: keyboard and mouse.
export const ACTION_PLAY = 1;
export const ACTION_PASS = 2;
export const ACTION_RESTART = 3;
export const ACTION_START = 4;
export const ACTION_SELECT = 5;

export function createInput(canvas) {
  const state = {
    actions: [],
    mouseX: 0,
    mouseY: 0,
    clicked: false,
  };

  function push(action) { state.actions.push(action); }

  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    if (e.code === 'Enter' || e.code === 'NumpadEnter') { push({ type: ACTION_PLAY }); e.preventDefault(); }
    else if (e.code === 'Space') { push({ type: ACTION_PASS }); e.preventDefault(); }
    else if (e.code === 'KeyR') { push({ type: ACTION_RESTART }); e.preventDefault(); }
    else if (e.code >= 'Digit1' && e.code <= 'Digit5') {
      const idx = Number(e.code.slice(5)) - 1;
      push({ type: ACTION_SELECT, index: idx });
    } else if (e.code >= 'Numpad1' && e.code <= 'Numpad5') {
      const idx = Number(e.code.slice(6)) - 1;
      push({ type: ACTION_SELECT, index: idx });
    }
  });

  function updateMouse(e) {
    const rect = canvas.getBoundingClientRect();
    // map to logical 1280x720
    state.mouseX = (e.clientX - rect.left) * (1280 / rect.width);
    state.mouseY = (e.clientY - rect.top) * (720 / rect.height);
  }

  canvas.addEventListener('mousemove', updateMouse);
  canvas.addEventListener('mousedown', (e) => {
    updateMouse(e);
    state.clicked = true;
    push({ type: 'click', x: state.mouseX, y: state.mouseY });
  });
  canvas.addEventListener('mouseup', () => { state.clicked = false; });
  canvas.addEventListener('mouseleave', () => { state.mouseX = -1; state.mouseY = -1; });

  return {
    state,
    takeActions() {
      const a = state.actions.slice();
      state.actions.length = 0;
      return a;
    },
  };
}
