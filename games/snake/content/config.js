export const CONFIG = Object.freeze({
  gridSize: 20,
  initialSnake: [{ x:10,y:10 }, { x:9,y:10 }, { x:8,y:10 }],
  directions: { up:{x:0,y:-1}, down:{x:0,y:1}, left:{x:-1,y:0}, right:{x:1,y:0} },
  difficulty: { easy:{speed:160}, normal:{speed:110}, hard:{speed:75} },
  input: { swipeMin:30 },
  skills: { brake:{duration:1250,cooldown:10000,speedMultiplier:.60}, boost:{duration:1250,cooldown:8000,speedMultiplier:1.45} },
  layout: { minCellSize:12, maxCellSize:32, viewportPadding:0 },
  render: { defaultProfile:{ headScale:1, bodyScale:.90, tailScale:.90, cornerScale:.90, foodScale:.82, overlapRatio:.04, headOffsetX:0, headOffsetY:0, bodyOffsetX:0, bodyOffsetY:0, tailOffsetX:0, tailOffsetY:0, cornerOffsetX:0, cornerOffsetY:0, smoothing:true } },
  outside: { requiredScore:50, requiredLength:20, weakWallStart:8, weakWallEnd:11, breakMinCost:8, breakCostRatio:.30, minSafeLength:3, transitionDelay:125, trimInterval:42, statusDelay:7000 },
  creatorRedeemCode: 'REPLACE_ME',
  debug: { enabled:false, drawCollisionCells:false, uiHitboxes:false }
});
