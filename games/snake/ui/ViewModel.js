import { freezeSnapshot } from '../systems/Immutable.js';
export const timeText = ms => {const seconds=Math.floor(ms/1000);return `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;};
export const publicSkin = (skin,pack={}) => ({id:skin.id,displayName:skin.id==='default'?'默认':skin.displayName,description:skin.description||pack.description||'',previewAsset:pack.previewAsset||skin.previewPath||null,themeFeature:pack.description||'',appearanceId:skin.appearanceId||pack.appearanceId||skin.id,selectorCardId:pack.selectorCardId||'default/SkinCard'});

export function buildViewModel({game,skinSystem,profile,save,skill,resolver,modalErrors,notice='',selectorOpen=false}) {
  const runMode=game.context.runMode,state=game.state,now=performance.now(),setup=['READY','GAME_OVER'].includes(state),playing=['RUNNING','PAUSED'].includes(state);
  const bestKey=runMode==='CHEAT'?'cheatBestScore':runMode==='ASSISTED'?'assistedBestScore':'normalBestScore';
  const current=skinSystem.current;
  const owned=skinSystem.listOwned().filter(skin=>profile.profile.discoveredSkins.includes(skin.id)).map(skin=>publicSkin(skin,resolver.packFor(skin)));
  const skillStates=Object.fromEntries(['BUTTON_B','BUTTON_A'].map(token=>{const remaining=Math.ceil(Math.max(0,skill.cooldowns[token]-now)/100)*100;return [token,{active:skill.active===token,cooldownRemaining:remaining,enabled:playing&&(state==='PAUSED'||(!skill.active&&!remaining))}];}));
  return freezeSnapshot({score:game.score.value,bestScore:save.save.stats[bestKey],length:game.snake.length,elapsedTime:Math.floor(game.duration/1000)*1000,difficulty:game.context.difficulty,gameState:state,runMode,
    currentSkin:publicSkin(current,resolver.packFor(current)),currentMap:{id:game.mapSystem.current.id,displayName:game.mapSystem.current.displayName,known:game.context.mapStatusKnown,grid:{...game.mapSystem.current.grid}},
    activeBuffs:game.buffSystem.list().map(buff=>({id:buff.id,displayName:buff.displayName,duration:buff.duration})),skillStates,
    discoveredContent:{skins:owned,maps:[...save.save.world.discoveredMaps],discoveries:[...profile.profile.discoveries]},canSetup:setup,canControl:playing,selectorOpen,notice,
    modal:{id:game.context.activeModal,error:modalErrors[game.context.activeModal]||''}});
}
