export const maps = [
  { id:'normal', displayName:'Normal', width:20, height:20, grid:{cols:20,rows:20}, cameraMode:'fixed', uiThemeId:'default', foodTableId:'normal-food', buffTableId:null, eventTableId:'normal-events', boundaryMode:'closed', mechanics:['boundary-break'] },
  { id:'outside', displayName:'Outside', width:20, height:null, grid:{cols:20,rows:20}, cameraMode:'follow', uiThemeId:'outside', foodTableId:'outside-food', buffTableId:'outside-buffs', eventTableId:'outside-events', boundaryMode:'open-x', statusDelay:7000, mechanics:[] }
];
