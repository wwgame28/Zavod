import * as THREE from 'three';
import { CONFIG, SCHOOLS } from './config.js';
import { G } from './state.js';
import { bus } from './core/events.js';
import { store } from './core/save.js';
import { rng } from './core/rng.js';
import { Input } from './core/input.js';
import { AudioEngine } from './core/audio.js';
import { Terrain } from './world/terrain.js';
import { World } from './world/world.js';
import { Effects } from './fx/effects.js';
import { Weather } from './fx/particles.js';
import { Player } from './entities/player.js';
import { ThirdPersonCamera } from './entities/camera.js';
import { EnemyManager } from './entities/enemy.js';
import { NPCManager } from './entities/npc.js';
import { Projectiles } from './systems/projectiles.js';
import { Spells } from './systems/spells.js';
import { Quests } from './systems/quests.js';
import { Dialogue } from './systems/dialogue.js';
import { Loot } from './systems/loot.js';
import { Shop } from './systems/shop.js';
import { UI } from './ui/ui.js';
import { buildMapCanvas, MAP_GRID } from './ui/map.js';
import { REGION_BY_ID, DOME } from './data/regions.js';
import { PLAYER_START, WAYSTONES } from './data/locations.js';
import { ITEMS } from './data/items.js';
import { LORE } from './data/lore.js';

const SAVE_KEY = 'save_v1';
const DIFF = { story: 0.6, normal: 1, hard: 1.4 };
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));

export class Game {
  constructor() {
    G.game = this;
    this.state = 'loading';
    this.fps = 60;
    this.hitStopT = 0;
    this.autosaveT = 60;
    this.discT = 0;
    this.region = null;
    this.discovered = new Uint8Array(MAP_GRID * MAP_GRID);
    this.difficulty = { id: 'normal', taken: 1 };
  }

  async boot() {
    G.settings = Object.assign({ master: 0.8, music: 0.45, sfx: 0.8, sens: 1, invertY: false, reduceMotion: matchMedia('(prefers-reduced-motion: reduce)').matches, showFps: false, quality: 'high', waypoint: true }, store.get('settings', {}));
    const ui = (G.ui = new UI(document.getElementById('ui')));
    ui.showLoading('Пробуждаем мир…', 0.05);
    await nextFrame();
    // Рендер
    const renderer = (G.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' }));
    renderer.setSize(innerWidth, innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    document.getElementById('viewport').appendChild(renderer.domElement);
    const scene = (G.scene = new THREE.Scene());
    const cam = (G.camera = new ThirdPersonCamera(innerWidth / innerHeight));
    G.input = this.input = new Input(renderer.domElement);
    G.audio = new AudioEngine();
    ui.showLoading('Поднимаем острова и горы…', 0.15);
    await nextFrame();
    G.terrain = new Terrain(CONFIG.SEED);
    ui.showLoading('Сажаем леса, строим деревни…', 0.45);
    await nextFrame();
    G.world = new World(scene, G.terrain);
    G.world.onThunder = () => G.audio.play('thunder', { vol: 0.6 });
    ui.showLoading('Рисуем карту…', 0.7);
    await nextFrame();
    this.mapCanvas = buildMapCanvas(G.terrain, 1024);
    ui.showLoading('Будим жителей…', 0.85);
    await nextFrame();
    G.fx = new Effects(scene);
    this.weather = new Weather(scene);
    G.player = new Player();
    scene.add(G.player.obj);
    G.enemies = new EnemyManager();
    G.npcs = new NPCManager();
    G.projectiles = new Projectiles(scene);
    G.spells = new Spells();
    G.quests = new Quests();
    G.dialogue = new Dialogue();
    G.loot = new Loot();
    G.shop = new Shop();
    this.applySettings();
    addEventListener('resize', () => this.resize());
    this.resize();
    renderer.domElement.addEventListener('click', () => { if (this.state === 'play' && !ui.blocking && G.player.alive) this.input.requestLock(); });
    // Esc в браузере снимает захват курсора сам — тогда открываем паузу (но не при нашем собственном выходе)
    this.input.onLockChange = (locked, intended) => {
      // захват мог прийти с опозданием, когда уже открыт диалог или меню — отпускаем курсор
      if (locked && (ui.blocking || this.state !== 'play')) { this.input.exitLock(); return; }
      if (!locked && !intended && this.state === 'play' && !ui.blocking && G.player.alive && !this.traveling) ui.showPause();
    };
    this.input.onLockError = () => G.ui.toast('Захват курсора недоступен: вращайте камеру, удерживая правую кнопку мыши.', 'warn');
    document.addEventListener('visibilitychange', () => { if (document.hidden && this.state === 'play' && !ui.blocking) ui.showPause(); });
    bus.on('inventory', () => G.quests.checkCollect());
    ui.hideLoading();
    this.toTitle();
    this.last = performance.now();
    requestAnimationFrame((t) => this.frame(t));
    window.__game = this;
    window.__G = G;
  }

  resize() {
    const r = G.renderer;
    const pr = G.settings.quality === 'low' ? Math.min(devicePixelRatio, 1) * 0.75 : Math.min(devicePixelRatio, 1.5);
    r.setPixelRatio(pr);
    r.setSize(innerWidth, innerHeight);
    G.camera.cam.aspect = innerWidth / innerHeight;
    G.camera.cam.updateProjectionMatrix();
    const hgt = innerHeight * pr;
    G.fx.setScale(hgt, G.camera.cam.fov);
    this.weather.setScale(hgt, G.camera.cam.fov);
  }

  applySettings() {
    const S = G.settings;
    G.audio.setVolumes({ master: S.master, music: S.music, sfx: S.sfx });
    if (G.renderer) {
      G.renderer.shadowMap.enabled = S.quality !== 'low';
      if (G.fx) this.resize();
    }
  }
  saveSettings() { store.set('settings', G.settings); }

  // ---------------- состояния ----------------
  toTitle() {
    this.state = 'title';
    G.dialogue?.active && G.dialogue.close();
    G.ui.hud.setVisible(false);
    G.ui.setPrompt(null);
    G.audio.setRegion('title');
    G.ui.showTitle(!!store.get(SAVE_KEY));
  }

  resetWorld() {
    G.enemies.clearAll();
    G.enemies.deadBosses = new Set();
    G.projectiles.clear();
    G.loot.clear();
    G.world.applyState({ used: [], activated: [], tablets: [], tod: CONFIG.TIME.start, domeOpen: false });
    G.quests.load(null);
    G.quests.s = {};
    this.discovered.fill(0);
    G.time = 0;
    G.world.astraMat.color.set(0x9fc8ff);
  }

  newGame(opts) {
    G.ui.closeModal(true);
    this.resetWorld();
    const P = G.player;
    P.reset(opts);
    this.difficulty = { id: opts.diff, taken: DIFF[opts.diff] ?? 1 };
    P.pos.set(PLAYER_START.x, G.terrain.heightAt(PLAYER_START.x, PLAYER_START.z), PLAYER_START.z);
    P.heading = PLAYER_START.yaw;
    G.world.activated.add('ws_vale');
    G.world.refreshObject(G.world.interactables.find((o) => o.id === 'ws_vale'));
    G.camera.snapBehind(P);
    this.state = 'prologue';
    G.ui.showPrologue(() => {
      this.state = 'play';
      G.quests.start('mq1');
      G.ui.hud.setVisible(true);
      this.region = null;
      G.ui.toast(G.ui.touch ? 'Левый стик — движение, правая половина экрана — камера, панель внизу — заклинания.' : 'Кликните по экрану, чтобы управлять камерой. Esc — пауза.', 'info');
      G.ui.toast('Над головой старейшины Ирмы горит «?» — поговорите с ней (E).', 'quest');
      this.input.requestLock();
      this.save(true);
    });
  }

  continueGame() {
    const d = store.get(SAVE_KEY);
    if (!d) return this.toTitle();
    G.ui.closeModal(true);
    this.resetWorld();
    try {
      G.player.load(d.player);
      G.quests.load(d.quests);
      G.world.applyState(d.world);
      G.enemies.deadBosses = new Set(d.deadBosses || []);
      this.difficulty = { id: d.diff || 'normal', taken: DIFF[d.diff] ?? 1 };
      if (d.disc) for (let i = 0; i < d.disc.length && i < this.discovered.length; i++) this.discovered[i] = d.disc.charCodeAt(i) === 49 ? 1 : 0;
      G.time = d.time || 0;
      if (d.ending) this.applyEndingWorld(d.ending);
    } catch (e) {
      console.error(e);
      G.ui.toast('Сохранение повреждено — начните новую игру.', 'warn');
      return this.toTitle();
    }
    G.camera.snapBehind(G.player);
    this.state = 'play';
    this.region = null;
    G.ui.hud.setVisible(true);
    G.ui.toast(`С возвращением, ${G.player.name}.`, 'good');
    this.input.requestLock();
  }

  save(silent = false) {
    if (this.state !== 'play' && this.state !== 'ending') return;
    const P = G.player;
    if (!P.alive) return;
    const data = {
      v: 1, t: Date.now(), player: P.serialize(), quests: G.quests.serialize(), world: G.world.saveState(),
      deadBosses: [...G.enemies.deadBosses], diff: this.difficulty.id, time: G.time,
      disc: Array.from(this.discovered, (b) => (b ? '1' : '0')).join(''), ending: this.endingDone || null,
    };
    const ok = store.set(SAVE_KEY, data);
    if (!silent) G.ui.toast(ok ? 'Игра сохранена' : 'Не удалось сохранить (хранилище недоступно)', ok ? 'good' : 'warn');
  }

  // ---------------- игровые события ----------------
  shake(a) { G.camera.shake(a); }
  hitStop(t) { if (!G.settings.reduceMotion) this.hitStopT = Math.max(this.hitStopT, t); }

  onEnemyKilled(e) {
    const P = G.player;
    P.kills++;
    const d = e.level - P.level;
    const mod = d <= -6 ? 0.15 : Math.max(0.5, Math.min(1.5, 1 + 0.1 * d));
    const xp = CONFIG.PROGRESSION.enemyXp(e.level) * (e.def.xp || 1) * (e.elite ? 3 : 1) * mod;
    if (xp > 0) P.addXp(xp);
    G.loot.onKill(e);
    G.quests.onKill(e.type);
    if (e.bossId) {
      G.enemies.deadBosses.add(e.bossId);
      G.quests.onBoss(e.bossId);
      G.ui.questBanner('Хранитель повержен', e.def.name, e.def.title || '');
      this.save(true);
    }
    if (G.player.lastTarget === e) G.player.lastTarget = null;
  }

  grantShard(school) {
    const P = G.player;
    if (P.shards.includes(school)) return;
    P.shards.push(school);
    P.inventory.addStack('shard_' + school, 1);
    P.recalc();
    const sc = SCHOOLS[school];
    G.ui.questBanner('Великий Осколок', `Осколок ${({ fire: 'Пламени', frost: 'Инея', storm: 'Бури', life: 'Жизни', shadow: 'Тени' })[school]}`, `Открыт высший круг школы «${sc.name}» · постоянный бонус к характеристикам · ${P.shards.length}/5`);
    G.audio.play('shard');
    G.fx.pillar(P.pos.x, P.pos.y, P.pos.z, new THREE.Color(sc.color).getHex(), 8);
    G.fx.levelUp(P.pos.x, P.pos.y, P.pos.z);
    G.quests.onShard();
  }

  openDome() {
    G.world.setDome(true);
    G.ui.questBanner('Пять печатей сломаны', 'Купол Астралиса пал', 'Путь к Сердцу Астры открыт');
    G.audio.play('shard');
    this.shake(0.8);
    this.save(true);
  }

  ending(choice) {
    this.endingChoice = choice;
    if (!G.quests.onInteract('heart')) this.finish();
  }

  finish() {
    const c = this.endingChoice || 'restore';
    this.endingDone = c;
    this.applyEndingWorld(c);
    G.audio.play('shard');
    setTimeout(() => { G.ui.showEnding(c); this.save(true); }, 1200);
  }

  applyEndingWorld(c) {
    const W = G.world;
    W.setDome(true, true);
    if (c === 'restore') { W.astraMat.color.set(0xffffff); W.astra.scale.setScalar(1.4); }
    else if (c === 'archon') { W.astraMat.color.set(0xff7a3d); W.astra.scale.setScalar(0.8); }
    else { W.astra.visible = false; }
    if (W.heartMesh) W.heartMesh.visible = c !== 'free';
  }

  onPlayerDeath() {
    G.input.exitLock();
    setTimeout(() => G.ui.showDeath(), 1400);
  }

  respawn() {
    const P = G.player;
    const loss = Math.floor(P.gold * CONFIG.PROGRESSION.deathGoldLoss);
    P.gold -= loss;
    const w = WAYSTONES.find((x) => x.id === P.lastWaystone) || WAYSTONES[0];
    P.respawn(w.x + 2.5, w.z + 2.5);
    G.camera.snapBehind(P);
    for (const e of G.enemies.list) if (e.target === P) { e.target = null; e.state = 'return'; }
    G.projectiles.clear();
    if (loss) G.ui.toast(`Потеряно ${loss} золота`, 'warn');
    this.input.requestLock();
  }

  travel(id) {
    const w = WAYSTONES.find((x) => x.id === id);
    if (!w) return;
    if (G.enemies.inCombat()) { G.ui.toast('Нельзя путешествовать во время боя', 'warn'); return; }
    this.traveling = true;
    G.ui.fade(true);
    G.audio.play('waystone');
    setTimeout(() => {
      const P = G.player;
      P.pos.set(w.x + 2.5, G.terrain.heightAt(w.x + 2.5, w.z + 2.5), w.z + 2.5);
      P.vel.set(0, 0, 0);
      P.lastWaystone = id;
      G.camera.snapBehind(P);
      G.camera.pivot.set(P.pos.x, P.pos.y + 1.5, P.pos.z);
      G.projectiles.clear();
      setTimeout(() => { G.ui.fade(false); this.traveling = false; this.input.requestLock(); }, 250);
    }, 500);
  }

  // ---------------- взаимодействие ----------------
  nearestInteractable() {
    const P = G.player;
    let best = null, bd = Infinity;
    const consider = (o, d, r) => { if (d < r && d < bd) { bd = d; best = o; } };
    for (const n of G.npcs.list) consider({ kind: 'npc', npc: n }, Math.hypot(n.pos.x - P.pos.x, n.pos.z - P.pos.z), CONFIG.PLAYER.interactRange);
    for (const o of G.world.interactables) {
      if (o.insideDome && !G.world.domeOpen) continue;
      const d = Math.abs(o.x - P.pos.x) + Math.abs(o.z - P.pos.z);
      if (d > o.r * 1.5) continue;
      if (o.kind === 'chest' && G.world.used.has(o.id)) continue;
      if (o.kind === 'gather' && !o.ready) continue;
      if (o.kind === 'quest' && o.sub !== 'heart' && (G.world.used.has(o.id) || !G.quests.wantsInteract(o.sub))) continue;
      consider(o, Math.hypot(o.x - P.pos.x, o.z - P.pos.z), o.r);
    }
    return best;
  }

  promptFor(o) {
    switch (o.kind) {
      case 'npc': return `Говорить — ${o.npc.name}`;
      case 'waystone': return G.world.activated.has(o.id) ? `Путевой камень «${o.name}» — путешествие` : `Пробудить путевой камень «${o.name}»`;
      case 'tablet': return G.world.readTablets.has(o.id) ? 'Перечитать скрижаль' : 'Прочитать скрижаль';
      case 'chest': return 'Открыть сундук';
      case 'gather': return `Собрать: ${ITEMS[o.item].name}`;
      case 'quest': return o.sub === 'heart' ? 'Коснуться Сердца Астры' : o.label;
      default: return '';
    }
  }

  interact() {
    const P = G.player;
    if (!P.alive) return;
    const o = this.nearestInteractable();
    if (!o) return;
    const W = G.world;
    switch (o.kind) {
      case 'npc': G.dialogue.open(o.npc.id); break;
      case 'waystone':
        if (!W.activated.has(o.id)) {
          W.activated.add(o.id); W.refreshObject(o);
          P.lastWaystone = o.id;
          G.audio.play('waystone');
          G.fx.pillar(o.x, o.y, o.z, 0x7fe8ff, 7);
          G.ui.questBanner('Путевой камень пробуждён', o.name, 'Теперь сюда можно вернуться с карты (M). Здесь вы возродитесь при гибели.');
          G.quests.onWaystone();
          this.save(true);
        } else { P.lastWaystone = o.id; G.ui.showBook('map'); }
        break;
      case 'tablet': {
        const L = LORE[o.id];
        if (!W.readTablets.has(o.id)) {
          W.readTablets.add(o.id); W.refreshObject(o);
          P.addXp(60 + P.level * 15);
          G.quests.onTablet();
          G.audio.play('quest');
        }
        G.ui.showReader(L.title, L.text);
        break;
      }
      case 'chest':
        W.used.add(o.id); W.refreshObject(o);
        G.audio.play('open');
        G.loot.openChest(o);
        break;
      case 'gather': {
        const n = rng.int(1, ITEMS[o.item].icon === 'herb' ? 2 : 1);
        if (!P.inventory.addStack(o.item, n)) { G.ui.toast('Сумка полна', 'warn'); return; }
        o.ready = false; o.respawn = W.time + 240;
        G.ui.toast(`Собрано: ${ITEMS[o.item].name} ×${n}`, 'loot');
        G.audio.play('pickup');
        G.fx.glow.emit({ x: o.x, y: o.y + 0.6, z: o.z, count: 14, color: ITEMS[o.item].color, speed: 2, up: 2, life: 0.7, size: 0.3 });
        P.addXp(3 + P.level);
        break;
      }
      case 'quest': this._questObject(o); break;
      default: break;
    }
  }

  _questObject(o) {
    const W = G.world, P = G.player;
    if (o.sub === 'heart') { G.dialogue.open('heart'); return; }
    if (!G.quests.onInteract(o.sub)) return;
    W.used.add(o.id); W.refreshObject(o);
    const give = { crate: 'mila_cargo', tear: 'forest_tear', chest: 'irma_amulet', hunter: 'hunter_token' }[o.sub];
    if (give) { P.inventory.addStack(give, 1); G.ui.toast(`Получено: ${ITEMS[give].name}`, 'quest'); }
    const fx = { tear: 0x9be06a, totem: 0xb8ff6a, rod: 0xfff27a, hunter: 0xbfe6ff, crate: 0xc9a36a, chest: 0xffd27a }[o.sub] || 0xffffff;
    G.fx.pillar(o.x, o.y, o.z, fx, 5);
    G.audio.play(o.sub === 'rod' ? 'thunder' : o.sub === 'totem' ? 'fire' : 'quest');
    if (o.sub === 'rod') G.fx.lightning(new THREE.Vector3(o.x, o.y + 40, o.z), new THREE.Vector3(o.x, o.y + 6.3, o.z));
  }

  // ---------------- кадр ----------------
  frame(now) {
    requestAnimationFrame((t) => this.frame(t));
    let dt = Math.min((now - this.last) / 1000, 0.1);
    this.last = now;
    this.fps += (1 / Math.max(dt, 0.001) - this.fps) * 0.05;
    const input = this.input;
    input.pollGamepad();
    const ui = G.ui;
    if (this.state === 'play') {
      if (input.pressed('interact') && !ui.blocking && G.player.alive) this.interact();
      if (input.pressed('pause') && input.down.has('GP9')) { if (ui.modal) ui.closeModal(); else ui.showPause(); }
      if (input.pressed('map') && input.down.has('GP8') && !ui.blocking) ui.showBook('map');
      const paused = ui.blocking || this.traveling;
      if (this.hitStopT > 0) { this.hitStopT -= dt; dt = 0; }
      if (!paused && dt > 0) {
        const steps = Math.ceil(dt / (1 / 30));
        const sdt = dt / steps;
        for (let i = 0; i < steps; i++) { this.update(sdt, i === 0 ? input : null); }
        G.camera.update(dt, G.player, input, G.settings);
      } else if (!paused) {
        G.camera.update(0.0001, G.player, input, G.settings);
      } else {
        input.consumeLook(); input.consumeWheel();
      }
      if (!paused) this._prompt();
      else ui.setPrompt(null);
      ui.update(dt);
      G.audio.update();
    } else if (this.state === 'title' || this.state === 'prologue') {
      this._titleCam(dt);
      G.audio.update();
    }
    G.renderer.render(G.scene, G.camera.cam);
    input.endFrame();
  }

  _prompt() {
    const o = G.player.alive ? this.nearestInteractable() : null;
    G.ui.setPrompt(o ? this.promptFor(o) : null);
  }

  update(dt, input) {
    G.time += dt;
    const P = G.player;
    P.update(dt, input);
    G.enemies.update(dt);
    G.npcs.update(dt, P);
    G.projectiles.update(dt);
    G.loot.update(dt);
    G.quests.update(dt);
    G.fx.update(dt);
    const reg = this._region();
    G.world.update(dt, G.camera.cam, P, reg, G.settings);
    this.weather.update(dt, G.camera.cam.position, reg.ambient, G.world.night, G.time);
    G.audio.listener = P.pos;
    G.audio.setCombat(G.enemies.inCombat());
    // открытие карты
    this.discT -= dt;
    if (this.discT <= 0) { this.discT = 0.5; this._discover(); }
    this.autosaveT -= dt;
    if (this.autosaveT <= 0) { this.autosaveT = 60; this.save(true); }
    // подсказка для слабых устройств
    this.perfT = (this.perfT || 0) + dt;
    if (!this.perfHinted && this.perfT > 10 && this.fps < 28 && G.settings.quality === 'high') {
      this.perfHinted = true;
      G.ui.toast('Низкая частота кадров — в настройках (Esc) можно включить «Быструю» графику.', 'warn');
    }
  }

  _region() {
    const P = G.player;
    let r = G.terrain.regionAt(P.pos.x, P.pos.z);
    if (Math.hypot(P.pos.x - DOME.x, P.pos.z - DOME.z) < DOME.r) r = REGION_BY_ID.astral;
    if (r !== this.region) {
      const first = !this.region;
      this.region = r;
      G.audio.setRegion(r.id);
      if (!first || this.state === 'play') G.ui.regionBanner(r);
    }
    return r;
  }

  _discover() {
    const P = G.player;
    const half = CONFIG.WORLD_HALF, cell = (half * 2) / MAP_GRID, R = 90;
    const cx = Math.floor((P.pos.x + half) / cell), cz = Math.floor((P.pos.z + half) / cell);
    const n = Math.ceil(R / cell);
    for (let z = cz - n; z <= cz + n; z++) for (let x = cx - n; x <= cx + n; x++) {
      if (x < 0 || z < 0 || x >= MAP_GRID || z >= MAP_GRID) continue;
      const wx = -half + (x + 0.5) * cell, wz = -half + (z + 0.5) * cell;
      if (Math.hypot(wx - P.pos.x, wz - P.pos.z) < R) this.discovered[z * MAP_GRID + x] = 1;
    }
  }

  _titleCam(dt) {
    const t = performance.now() / 1000 * 0.05;
    const cx = 0, cz = 282;
    const cam = G.camera.cam;
    const h = G.terrain.heightAt(cx, cz);
    cam.position.set(cx + Math.cos(t) * 110, h + 42, cz + Math.sin(t) * 110);
    cam.lookAt(cx, h + 6, cz);
    const fake = { pos: new THREE.Vector3(cx, h, cz) };
    G.world.update(dt, cam, fake, REGION_BY_ID.vale, G.settings);
    G.npcs.update(dt, fake);
    G.fx.update(dt);
    this.weather.update(dt, cam.position, 'pollen', G.world.night, performance.now() / 1000);
  }
}

