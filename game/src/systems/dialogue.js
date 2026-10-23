import { G } from '../state.js';
import { DIALOGUES } from '../data/dialogues.js';
import { NPCS } from '../data/npcs.js';

// Диалоговый движок: узлы, условия, действия.
export class Dialogue {
  constructor() {
    this.active = null;
    const Q = () => G.quests;
    this.api = {
      get name() { return G.player.name; },
      get level() { return G.player.level; },
      state: (q) => Q().state(q),
      at: (q, npc) => { const o = Q().current(q); return !!o && o.type === 'talk' && o.target === npc; },
      objIndex: (q) => Q().get(q)?.obj ?? -1,
      can: (q) => Q().available(q),
      start: (q) => Q().start(q),
      advance: (q) => Q().advance(q),
      turnIn: (q) => Q().complete(q),
      has: (i, n = 1) => G.player.inventory.has(i, n),
      take: (i, n = 1) => G.player.inventory.remove(i, n),
      give: (i, n = 1) => G.player.inventory.addStack(i, n),
      flag: (f) => !!G.player.flags[f],
      setFlag: (f) => { G.player.flags[f] = true; G.player.recalc(); },
      open: (panel) => { this.pendingPanel = panel; },
      shards: () => G.player.shards.length,
      waystones: () => G.world.activated.size,
      openDome: () => G.game.openDome(),
      ending: (c) => { this.pendingEnding = c; },
      bossDead: (id) => G.enemies.deadBosses.has(id),
    };
  }

  open(id) {
    const def = DIALOGUES[id];
    if (!def) return;
    this.active = { id, def, npc: G.npcs.get(id) };
    if (this.active.npc) this.active.npc.talking = true;
    this.show(def.start(this.api));
  }

  show(nodeId) {
    const a = this.active;
    const node = a.def.nodes[nodeId];
    if (!node) { this.close(); return; }
    const text = typeof node.text === 'function' ? node.text(this.api) : node.text;
    const opts = (node.options || [{ text: 'Прощай.' }]).filter((o) => !o.cond || o.cond(this.api));
    const npc = NPCS[a.id];
    G.ui.showDialogue({
      name: npc ? npc.name : 'Сердце Астры', title: npc ? npc.title : 'Святилище',
      text, options: opts.map((o) => o.text),
      onPick: (i) => this.pick(opts[i]),
    });
  }

  pick(opt) {
    G.audio.play('ui');
    this.pendingPanel = null; this.pendingEnding = null;
    if (opt.action) opt.action(this.api);
    if (this.pendingEnding) { const c = this.pendingEnding; this.close(); G.game.ending(c); return; }
    if (opt.next) this.show(opt.next);
    else {
      const panel = this.pendingPanel;
      const npcId = this.active?.id;
      this.close();
      if (panel) G.ui.openService(panel, npcId);
    }
  }

  close() {
    if (this.active?.npc) this.active.npc.talking = false;
    this.active = null;
    G.ui.hideDialogue();
  }
}
