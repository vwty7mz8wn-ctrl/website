const components=Object.fromEntries(['Header','HUD','Status','StartScreen','PauseOverlay','GameOver','SkinSelector','RedeemModal','CheatAuthModal','Controller','WorldViewport','Setup'].map(slot=>[slot,`default/${slot}`]));
export const layoutVariants = [
  {id:'default',supportsMobile:true,components,regions:[{id:'main',slots:['Header','HUD','Status','Setup','WorldViewport','Controller']}]},
  {id:'creator',extends:'default',supportsMobile:true,components:{Header:'creator/Header',HUD:'creator/HUD',StartScreen:'creator/StartScreen',GameOver:'creator/GameOver'},regions:[{id:'heading',slots:['Header','Setup']},{id:'instrument',slots:['HUD','Status']},{id:'world',slots:['WorldViewport','Controller']}]},
  {id:'subscriber-001',extends:'default',supportsMobile:true,components:{Header:'subscriber/Header',HUD:'subscriber/HUD',StartScreen:'subscriber/StartScreen',GameOver:'subscriber/GameOver'},regions:[{id:'portrait',slots:['Header','HUD','Status']},{id:'world',slots:['Setup','WorldViewport','Controller']}]}
];
