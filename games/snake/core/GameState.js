export const GameState = Object.freeze({
  READY: 'READY',
  RUNNING: 'RUNNING',
  PAUSED: 'PAUSED',
  GAME_OVER: 'GAME_OVER',
  MODAL: 'MODAL',
  TRANSITION: 'TRANSITION'
});

export const RunMode = Object.freeze({
  NORMAL: 'NORMAL',
  ASSISTED: 'ASSISTED',
  CHEAT: 'CHEAT'
});

export function isPlaying(state) {
  return state === GameState.RUNNING;
}
