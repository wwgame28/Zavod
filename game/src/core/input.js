// Единый слой ввода: клавиатура + мышь + геймпад + сенсорные кнопки → абстрактные действия.
const BIND = {
  forward: ['KeyW', 'ArrowUp'], back: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'],
  sprint: ['ShiftLeft', 'ShiftRight', 'GP10'], jump: ['Space', 'GP0'], dodge: ['KeyC', 'GP1'],
  interact: ['KeyE', 'KeyF', 'GP2'],
  attack: ['Mouse0', 'GP7'],
  spell1: ['Digit1', 'GP4'], spell2: ['Digit2', 'GP5'], spell3: ['Digit3', 'GP12'],
  spell4: ['Digit4', 'GP13'], spell5: ['Digit5', 'GP14'], spell6: ['Digit6', 'GP15'],
  potionHp: ['KeyQ', 'GP3'], potionMp: ['KeyR', 'GP6'],
  menu: ['Tab'], inventory: ['KeyI'], skills: ['KeyK'], journal: ['KeyJ'], map: ['KeyM', 'GP8'],
  character: ['KeyP'], pause: ['Escape', 'GP9'], debug: ['Backquote'], quicksave: ['F5'],
  opt1: ['Digit1'], opt2: ['Digit2'], opt3: ['Digit3'], opt4: ['Digit4'],
};

export class Input {
  constructor(el) {
    this.el = el;
    this.down = new Set();
    this.pressedSet = new Set();
    this.releasedSet = new Set();
    this.mdx = 0; this.mdy = 0; this.wheel = 0;
    this.locked = false;
    this.dragLook = false;
    this.enabled = true;
    this.virtualMove = { x: 0, y: 0 };
    this.virtualLook = { x: 0, y: 0 };
    this.gpPrev = new Set();
    this.onLockChange = null;
    this.usingGamepad = false;

    const prevent = new Set(['Tab', 'Space', 'F5', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
    addEventListener('keydown', (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      if (prevent.has(e.code)) e.preventDefault();
      if (!e.repeat) this._press(e.code);
    });
    addEventListener('keyup', (e) => this._release(e.code));
    addEventListener('blur', () => { for (const c of [...this.down]) this._release(c); });

    el.addEventListener('mousedown', (e) => {
      this._press('Mouse' + e.button);
      if (e.button === 2) this.dragLook = true;
    });
    addEventListener('mouseup', (e) => { this._release('Mouse' + e.button); if (e.button === 2) this.dragLook = false; });
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    addEventListener('mousemove', (e) => {
      if (this.locked || this.dragLook) { this.mdx += e.movementX || 0; this.mdy += e.movementY || 0; }
    });
    el.addEventListener('wheel', (e) => { this.wheel += Math.sign(e.deltaY); }, { passive: true });
    document.addEventListener('pointerlockerror', () => {
      if (!this.lockFailed) { this.lockFailed = true; this.onLockError?.(); }
    });
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === el;
      const intended = this._intentExit;
      this._intentExit = false;
      this.onLockChange?.(this.locked, intended);
    });
  }

  _press(code) { if (!this.down.has(code)) { this.down.add(code); this.pressedSet.add(code); } }
  _release(code) { if (this.down.has(code)) { this.down.delete(code); this.releasedSet.add(code); } }

  requestLock() {
    if (this.locked || !this.el.requestPointerLock) return;
    try { const p = this.el.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch { /* браузер отказал */ }
  }
  exitLock() { if (document.pointerLockElement) { this._intentExit = true; document.exitPointerLock(); } }

  isDown(action) { const b = BIND[action]; if (!b) return false; for (const c of b) if (this.down.has(c)) return true; return false; }
  pressed(action) { const b = BIND[action]; if (!b) return false; for (const c of b) if (this.pressedSet.has(c)) return true; return false; }
  released(action) { const b = BIND[action]; if (!b) return false; for (const c of b) if (this.releasedSet.has(c)) return true; return false; }
  setVirtual(code, on) { if (on) this._press(code); else this._release(code); }

  moveAxis() {
    let x = 0, y = 0;
    if (this.isDown('forward')) y += 1;
    if (this.isDown('back')) y -= 1;
    if (this.isDown('left')) x -= 1;
    if (this.isDown('right')) x += 1;
    x += this.virtualMove.x; y += this.virtualMove.y;
    if (this.gpMove) { x += this.gpMove.x; y += this.gpMove.y; }
    const len = Math.hypot(x, y);
    if (len > 1) { x /= len; y /= len; }
    return { x, y };
  }

  pollGamepad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = pads && [...pads].find((p) => p && p.connected);
    if (!gp) { this.gpMove = null; this.gpLook = null; return; }
    const dz = (v) => (Math.abs(v) < 0.18 ? 0 : v);
    this.gpMove = { x: dz(gp.axes[0] || 0), y: -dz(gp.axes[1] || 0) };
    this.gpLook = { x: dz(gp.axes[2] || 0), y: dz(gp.axes[3] || 0) };
    const now = new Set();
    gp.buttons.forEach((b, i) => { if (b.pressed || b.value > 0.5) now.add('GP' + i); });
    for (const c of now) if (!this.gpPrev.has(c)) { this._press(c); this.usingGamepad = true; }
    for (const c of this.gpPrev) if (!now.has(c)) this._release(c);
    this.gpPrev = now;
  }

  consumeLook() {
    let x = this.mdx, y = this.mdy;
    if (this.gpLook) { x += this.gpLook.x * 14; y += this.gpLook.y * 10; }
    x += this.virtualLook.x; y += this.virtualLook.y;
    this.mdx = 0; this.mdy = 0; this.virtualLook.x = 0; this.virtualLook.y = 0;
    return { x, y };
  }
  consumeWheel() { const w = this.wheel; this.wheel = 0; return w; }

  endFrame() { this.pressedSet.clear(); this.releasedSet.clear(); }
}
