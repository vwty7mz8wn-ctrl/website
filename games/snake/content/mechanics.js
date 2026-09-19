import { RunMode } from '../core/GameState.js';

export function createBoundaryBreakMechanic(config) {
  const { outside } = config;
  const canAccess = game => game.context.runMode === RunMode.NORMAL && game.skinSystem.hasCapability('outside-access') && game.mapSystem.current.id === 'normal';
  return {
    id:'boundary-break',
    onScoreChanged({ game }) {
      if (canAccess(game) && game.score.value >= outside.requiredScore && game.snake.length >= outside.requiredLength && !game.buffSystem.has('break')) game.context.nextFoodId='break';
    },
    onCollision({ game, collision, head }) {
      const weak=collision.edge==='bottom'&&head.x>=outside.weakWallStart&&head.x<=outside.weakWallEnd;
      if(!weak||!canAccess(game)||!game.buffSystem.has('break')) return null;
      return { preventDeath:true, transition:{ mapId:'outside', secretId:'outside-discovered', delay:outside.transitionDelay, trimAmount:Math.max(outside.breakMinCost,Math.floor(game.snake.length*outside.breakCostRatio)), minLength:outside.minSafeLength } };
    }
  };
}
