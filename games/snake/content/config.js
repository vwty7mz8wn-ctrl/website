export const CONFIG = Object.freeze({
  gridSize: 20,
  initialSnake: [{ x:10,y:10 }, { x:9,y:10 }, { x:8,y:10 }],
  directions: { up:{x:0,y:-1}, down:{x:0,y:1}, left:{x:-1,y:0}, right:{x:1,y:0} },
  difficulty: { easy:{speed:160}, normal:{speed:110}, hard:{speed:75} },
  input: { swipeMin:30 },
  outside: { requiredScore:50, requiredLength:20, weakWallStart:8, weakWallEnd:11, breakMinCost:8, breakCostRatio:.30, minSafeLength:3, transitionDelay:125, trimInterval:42, statusDelay:7000 },
  creatorRedeemCode: 'REPLACE_ME',
  debug: false
});
