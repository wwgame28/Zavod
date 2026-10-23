// Общий контекст игры: системы находят друг друга через G, а не через цепочки импортов.
export const G = {
  game: null, scene: null, camera: null, renderer: null,
  terrain: null, world: null, player: null,
  enemies: null, npcs: null, combat: null, spells: null, fx: null,
  loot: null, quests: null, dialogue: null, ui: null, audio: null, input: null,
  settings: null, time: 0, paused: false,
};
