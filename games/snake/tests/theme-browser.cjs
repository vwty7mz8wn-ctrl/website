/* Test-only network instrumentation; no debug globals are shipped in production.
   PLAYWRIGHT_MODULE must point to an existing Playwright install. No repo deps. */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
const url=process.env.SNAKE_TEST_URL||'http://127.0.0.1:4173/games/snake/';
const output=process.env.SNAKE_TEST_OUTPUT;
const errors=[],warnings=[],requests=[];
const state=async(page,id)=>{try{await page.waitForFunction(id=>document.body.dataset.gameState===id,id,{timeout:10000});}catch(error){console.error('State mismatch',await page.evaluate(()=>({state:document.body.dataset.gameState,layout:document.querySelector('#snake-ui-root')?.dataset.layout,width:innerWidth,focus:document.activeElement?.tagName,score:window.__test?.game.score.value})));throw error;}};
const run=async(page,fn)=>page.evaluate(fn);
async function open(browser,width=1440,touch=false,seed=null){
  const page=await browser.newPage({viewport:{width,height:1000},isMobile:touch,hasTouch:touch});
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',entry=>{if(entry.type()==='warning')warnings.push(entry.text());});
  page.on('request',request=>requests.push(request.url()));
  await page.addInitScript(()=>{
    window.nativeListeners=new Map();const add=EventTarget.prototype.addEventListener,remove=EventTarget.prototype.removeEventListener;
    const key=(target,type,options)=>(target===window?'window':target===document?'document':target.id==='snake-ui-root'?'root':'')+':'+type+':'+Boolean(typeof options==='boolean'?options:options?.capture);
    const relevant=target=>target===window||target===document||target.id==='snake-ui-root';
    EventTarget.prototype.addEventListener=function(type,fn,options){if(relevant(this)){const id=key(this,type,options),set=nativeListeners.get(id)||new Set();set.add(fn);nativeListeners.set(id,set);}return add.call(this,type,fn,options);};
    EventTarget.prototype.removeEventListener=function(type,fn,options){if(relevant(this))nativeListeners.get(key(this,type,options))?.delete(fn);return remove.call(this,type,fn,options);};
  });
  if(seed)await page.addInitScript(seed);
  await page.route('**/games/snake/main.js',async route=>{
    const response=await route.fetch();const code=await response.text();
    await route.fulfill({response,body:code.replace('ui.bind();','ui.bind(); window.__test={ui,game,skinSystem,saveService,profileService,host,resolver,assetLoader,eventBus,layoutSystem,componentRegistry,themePackRegistry,layoutVariantRegistry,uiThemeRegistry,skinRegistry,appearanceRegistry,skillSetRegistry};')});
  });
  assert.equal((await page.goto(url)).status(),200);await state(page,'READY');return page;
}
async function equip(page,id){
  assert.equal(await page.evaluate(id=>__test.ui.actions.equipSkin(id),id),true);
  await page.waitForFunction(id=>document.querySelector('#snake-ui-root').dataset.layout===id,id);
  await page.waitForTimeout(60);
}
async function konami(page){for(const key of ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','B','A'])await page.keyboard.press(key);await state(page,'MODAL');}
async function shot(page,name){if(output){fs.mkdirSync(output,{recursive:true});await page.screenshot({path:path.join(output,name+'.png'),fullPage:true});}}
const tapOrClick=(page,selector,touch)=>page.locator(selector)[touch?'tap':'click']();

(async()=>{
  const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
  try{
    const home=await browser.newPage();assert.equal((await home.goto(new URL('/',url).href)).status(),200);await home.locator('a[href="/games/snake/"]').first().click();await state(home,'READY');await home.close();
    console.log('PASS homepage direct Snake link');
    const page=await open(browser);
    assert.deepEqual(await run(page,()=>__test.ui.viewModel.discoveredContent.skins.map(s=>s.id)),['default']);
    assert.equal(await page.locator('[data-skin="subscriber-001"]').count(),0);
    assert.equal(await page.locator('[data-skin="creator"]').count(),0);
    // Redeem through real modal, including editable WASD/Space protection.
    await page.locator('#appearance-panel summary').click();await page.locator('#redeem-button').click();await state(page,'MODAL');
    await page.locator('#redeem-input').fill('');await page.keyboard.type('wasd r ');await page.keyboard.press('Space');
    assert.equal(await page.locator('#redeem-input').inputValue(),'wasd r  ');
    assert.equal(await run(page,()=>__test.game.state),'MODAL');
    await page.locator('#redeem-input').fill('yyyswdxd');await page.locator('#redeem-form button').click();await state(page,'READY');
    assert.equal(await run(page,()=>__test.saveService.save.profile.selectedSkinId),'subscriber-001');
    await page.reload();await state(page,'READY');
    assert.equal(await run(page,()=>__test.skinSystem.current.id),'subscriber-001');
    // Creator ownership is fixture-only: do not change its existing redeem code.
    await run(page,()=>__test.skinSystem.unlock('creator'));
    const baseline=await run(page,()=>({listeners:[...__test.eventBus.listeners].map(([id,set])=>[id,set.size]),native:[...nativeListeners].map(([id,set])=>[id,set.size]),save:__test.saveService.snapshot(),canvas:document.querySelectorAll('canvas').length}));
    await run(page,()=>{window.originalCanvas=document.querySelector('canvas');});
    const structures=[];
    for(const id of ['default','creator','subscriber-001']){
      await equip(page,id);
      structures.push(await run(page,()=>({hud:__test.host.getElement('HUD').tagName,start:__test.host.getElement('StartScreen').innerHTML,regions:[...document.querySelectorAll('.theme-region')].map(n=>n.dataset.region)})));
      assert.equal(await page.locator('[data-role="start"]:visible, #start-button:visible').count(),1);
      await shot(page,id+'-desktop');
      await page.locator('#start-button').click();await state(page,'RUNNING');await run(page,()=>__test.game.stopTick());
      await page.keyboard.press('ArrowUp');assert.deepEqual(await run(page,()=>__test.game.snake.pendingDirection),{x:0,y:-1});
      await page.keyboard.press('ArrowDown');assert.deepEqual(await run(page,()=>__test.game.snake.pendingDirection),{x:0,y:-1});
      await page.keyboard.press('a');assert.deepEqual(await run(page,()=>__test.game.snake.pendingDirection),{x:-1,y:0});
      await run(page,()=>{const g=__test.game;g.snake.reset(g.config.initialSnake,g.config.directions.right);g.world.entities.set('food',{x:11,y:10,definition:__test.game.mapSystem.foodRegistry.get('normal')});g.tick();g.stopTick();});
      assert.equal(await run(page,()=>__test.game.score.value),1);
      assert.equal(await page.locator('#score').textContent(),'1');
      await page.keyboard.press('Space');await state(page,'PAUSED');
      assert.equal(await run(page,()=>__test.ui.actions.equipSkin('default')),false);
      assert.equal(await run(page,()=>__test.skinSystem.equip('default')),false);
      const frozen=await run(page,()=>JSON.stringify([__test.game.snake.segments,__test.game.duration]));await page.waitForTimeout(160);
      assert.equal(await run(page,()=>JSON.stringify([__test.game.snake.segments,__test.game.duration])),frozen);
      await run(page,()=>{const vm=__test.ui.viewModel;window.immutableOK=Object.isFrozen(vm)&&Object.isFrozen(vm.currentSkin)&&Object.isFrozen(__test.skinSystem.current)&&Object.isFrozen(__test.ui.runDefinition.skills);});
      assert.equal(await run(page,()=>immutableOK),true);
      assert.equal(await run(page,()=>__test.ui.actions.chooseDifficulty('hard')),false);
      await run(page,()=>__test.game.gameOver());await state(page,'GAME_OVER');
      assert.equal(await page.locator('#final-score').textContent(),'1');
      assert.equal(await page.locator('#final-length').textContent(),'4');
      assert.equal(await page.locator('#final-time').textContent(),'00:00');
      await shot(page,id+'-over');
      for(const difficulty of ['easy','normal','hard'])assert.equal(await page.evaluate(d=>__test.ui.actions.chooseDifficulty(d),difficulty),true);
      await run(page,()=>__test.game.reset());
    }
    assert.equal(new Set(structures.map(s=>s.hud)).size,3,'Different HUD element types');
    assert.equal(new Set(structures.map(s=>s.start)).size,3,'Different Start templates');
    assert.equal(new Set(structures.map(s=>JSON.stringify(s.regions))).size,3,'Different region structures');
    console.log('PASS ownership/redemption/save reload, three real layouts, native start, keyboard, scoring, pause, snapshots, difficulty, GameOver');

    // Switching does not create extra Canvas, loop, listeners or retain mutable run definitions.
    for(let i=0;i<24;i++)await equip(page,['default','creator','subscriber-001'][i%3]);
    assert.deepEqual(await run(page,()=>[...__test.eventBus.listeners].map(([id,set])=>[id,set.size])),baseline.listeners);
    await run(page,()=>__test.ui.bind());
    assert.deepEqual(await run(page,()=>[...nativeListeners].map(([id,set])=>[id,set.size])),baseline.native);
    assert.equal(await run(page,()=>document.querySelector('canvas')===originalCanvas),true);
    assert.equal(await run(page,()=>__test.host.stats().mounted),12);
    assert.equal(await run(page,()=>__test.assetLoader.stats().cached<=32),true);
    const saved=await run(page,()=>__test.saveService.snapshot());
    assert.deepEqual(saved.profile.ownedSkins,baseline.save.profile.ownedSkins);
    assert.deepEqual(saved.profile.discoveredSkins,baseline.save.profile.discoveredSkins);
    assert.deepEqual(saved.world,baseline.save.world);
    assert.ok(saved.stats.normalBestScore>=baseline.save.stats.normalBestScore);
    await page.locator('#start-button').click();await page.keyboard.press('Space');await state(page,'PAUSED');
    await page.waitForTimeout(150);
    await run(page,()=>{window.mutations=0;window.mo=new MutationObserver(list=>mutations+=list.length);mo.observe(__test.host.root,{subtree:true,attributes:true,childList:true,characterData:true});});
    const sequence=await run(page,()=>__test.host.stats().sequence);await page.waitForTimeout(350);
    assert.equal(await run(page,()=>mutations),0);assert.equal(await run(page,()=>__test.host.stats().sequence),sequence);
    await run(page,()=>mo.disconnect());
    await konami(page);assert.equal(await run(page,()=>__test.ui.actions.equipSkin('creator')),false);
    await page.locator('#code-input').fill('incorrect');await page.locator('#verification-form button').click();assert.ok(await page.locator('#dialog-error').textContent());
    await page.keyboard.press('Escape');await state(page,'PAUSED');assert.equal(await run(page,()=>__test.game.context.runMode),'NORMAL');
    await konami(page);await page.locator('#code-input').fill(' MARIO ');await page.locator('#verification-form button').click();await state(page,'PAUSED');
    assert.equal(await page.locator('#mode-status').isVisible(),true);
    await page.keyboard.press('Space');await state(page,'RUNNING');
    await run(page,()=>{const g=__test.game;g.stopTick();g.snake.reset([{x:19,y:10},{x:18,y:10},{x:17,y:10}],g.config.directions.right);g.tick();g.stopTick();});
    assert.equal(await run(page,()=>__test.game.snake.head.x),0);
    await run(page,()=>{const g=__test.game;g.snake.reset([{x:10,y:10},{x:11,y:10},{x:11,y:11},{x:10,y:11}],g.config.directions.right);g.tick();g.stopTick();});
    assert.equal(await run(page,()=>__test.game.state),'RUNNING');
    await run(page,()=>{const g=__test.game;g.score.value=0;g.snake.reset(g.config.initialSnake,g.config.directions.right);g.consumeFood({definition:g.mapSystem.foodRegistry.get('normal')});g.gameOver();});
    assert.equal(await run(page,()=>__test.saveService.save.stats.cheatBestScore),2);
    assert.equal(await run(page,()=>__test.saveService.save.stats.normalBestScore),1);
    await page.keyboard.press('r');await state(page,'RUNNING');assert.equal(await run(page,()=>__test.game.context.runMode),'NORMAL');
    await page.keyboard.press('Space');await page.keyboard.press('r');await state(page,'RUNNING');await run(page,()=>__test.game.gameOver());
    console.log('PASS 24 switch cycles, stable listeners/canvas/cache, zero paused DOM mutations, hidden auth, Cheat wall/self/double score, separated bests, R');

    await run(page,()=>__test.game.reset());await equip(page,'creator');await page.locator('#start-button').click();
    assert.equal(await run(page,()=>__test.ui.actions.equipSkin('subscriber-001')),false);
    await run(page,()=>{
      const g=__test.game;g.stopTick();g.score.value=50;
      g.snake.reset(Array.from({length:20},(_,i)=>({x:10,y:19-i})),g.config.directions.down);
      g.mechanicSystem.run('onScoreChanged',{game:g,score:g.score.value});g.spawnFood();
    });
    assert.equal(await run(page,()=>__test.game.food.definition.id),'break');
    await run(page,()=>{const g=__test.game;g.consumeFood(g.food);g.tick();});await state(page,'TRANSITION');
    assert.equal(await run(page,()=>__test.ui.actions.equipSkin('subscriber-001')),false);
    await state(page,'RUNNING');await run(page,()=>__test.game.pause());
    assert.equal(await run(page,()=>__test.game.mapSystem.current.id),'outside');
    assert.equal(await run(page,()=>__test.skinSystem.current.id),'creator');
    assert.equal(await run(page,()=>__test.ui.themeContext.components.HUD),'creator/HUD');
    assert.equal(await run(page,()=>__test.game.snake.length),12);
    assert.equal(await run(page,()=>__test.game.cameraSystem.mode),'follow');
    assert.ok(await run(page,()=>__test.game.cameraSystem.y)>0);
    const outsideTokens=await run(page,()=>__test.ui.themeContext.tokens);
    await run(page,()=>__test.eventBus.emit('theme:event:start',{id:'test:overlay',overlay:{tokens:{'--ui-bg':'#222222'},components:{HUD:'default/HUD'}}}));
    assert.equal(await run(page,()=>__test.ui.themeContext.tokens['--ui-bg']),'#222222');
    assert.equal(await run(page,()=>__test.host.getElement('HUD').dataset.component),'default/HUD');
    await run(page,()=>__test.eventBus.emit('theme:event:end',{id:'test:overlay'}));
    assert.deepEqual(await run(page,()=>__test.ui.themeContext.tokens),outsideTokens);
    assert.equal(await run(page,()=>__test.host.getElement('HUD').dataset.component),'creator/HUD');
    await run(page,()=>__test.game.reset());assert.equal(await run(page,()=>__test.ui.themeContext.tokens['--ui-bg']),'#101112');
    assert.equal(await run(page,()=>__test.saveService.save.profile.discoveries.includes('outside-discovered')),true);
    console.log('PASS real BREAK hook/transition/shrink, OUTSIDE camera, skin snapshot intact, partial map/event component overlays and exact restoration');

    const warningStart=warnings.length;
    await run(page,()=>{
      const t=__test;t.componentRegistry.register('bad/HUD',{mount(){throw new Error('Test mount failure');}});
      t.resolver.setEvent('test:fallback',{components:{HUD:'bad/HUD',StartScreen:'missing/StartScreen'}});t.ui.update();
    });
    assert.equal(await run(page,()=>__test.host.getElement('HUD').dataset.component),'default/HUD');
    assert.equal(await run(page,()=>__test.host.getElement('StartScreen').dataset.component),'default/StartScreen');
    await run(page,()=>{__test.resolver.clearEvent('test:fallback');__test.ui.update();});
    await run(page,()=>{
      const t=__test;t.componentRegistry.register('async/HUD',{load:async()=>{throw new Error('Test async failure');}});t.resolver.setEvent('test:async',{components:{HUD:'async/HUD'}});t.ui.update();
    });await page.waitForTimeout(50);
    assert.equal(await run(page,()=>__test.host.getElement('HUD').dataset.component),'default/HUD');
    assert.equal(await run(page,()=>__test.host.stats().pending),0);
    await run(page,()=>{__test.resolver.clearEvent('test:async');__test.ui.update();});
    // Successful async component and stale-load cancellation share the same lifecycle.
    await run(page,()=>{
      const t=__test;t.componentRegistry.register('test/async-ok',{load:()=>new Promise(resolve=>{window.finishAsync=()=>resolve({mount({signal}){const node=document.createElement('section');node.textContent='Async HUD';window.asyncDisposed=false;signal.addEventListener('abort',()=>window.asyncDisposed=true);return {element:node,update(){},dispose(){window.asyncDisposed=true;}};}});})});
      t.resolver.setEvent('test:async-ok',{components:{HUD:'test/async-ok'}});t.ui.update();
    });await page.waitForFunction(()=>typeof window.finishAsync==='function');await run(page,()=>finishAsync());await page.waitForTimeout(50);
    assert.equal(await run(page,()=>__test.host.getElement('HUD').dataset.component),'test/async-ok');
    await run(page,()=>{__test.resolver.clearEvent('test:async-ok');__test.ui.update();});
    assert.equal(await run(page,()=>asyncDisposed),true);
    await run(page,()=>{const t=__test;t.resolver.setEvent('test:stale',{components:{HUD:'test/async-ok'}});t.ui.update();});await page.waitForTimeout(10);
    await run(page,()=>{__test.resolver.clearEvent('test:stale');__test.ui.update();finishAsync();});await page.waitForTimeout(50);
    assert.equal(await run(page,()=>__test.host.getElement('HUD').dataset.component),'creator/HUD');
    assert.equal(await run(page,()=>__test.host.stats().pending),0);
    await run(page,()=>{
      const t=__test;t.themePackRegistry.register('test-minimal',{appearanceId:'default',uiThemeId:'missing-theme',layoutVariantId:'missing-layout'});
      t.skinRegistry.register('test-minimal',{displayName:'Test',themePackId:'test-minimal',mechanics:[]});t.skinSystem.unlock('test-minimal');t.ui.actions.equipSkin('test-minimal');
    });
    assert.equal(await run(page,()=>__test.ui.themeContext.layoutVariantId),'default');
    await page.locator('#start-button').click();await state(page,'RUNNING');await run(page,()=>__test.game.reset());
    // Missing sprites fall back to geometry, no unhandled rejection or game reset.
    await run(page,()=>{
      const t=__test;t.appearanceRegistry.register('test-missing',{renderAssets:true,assetPath:'./assets/test-missing/'});
      t.skinRegistry.register('test-missing',{displayName:'Test missing',appearanceId:'test-missing',mechanics:[]});t.skinSystem.unlock('test-missing');t.ui.actions.equipSkin('test-missing');
    });await page.waitForTimeout(200);
    assert.equal(await run(page,()=>__test.game.state),'READY');
    assert.equal(await run(page,()=>__test.game.renderSystem.resolveSprite('test-missing','head-right')),null);
    await page.locator('#start-button').click();await state(page,'RUNNING');await run(page,()=>__test.game.reset());
    const beforeRequests=await run(page,()=>__test.assetLoader.stats().requests);
    await run(page,()=>Promise.all([__test.assetLoader.image('./assets/skins/subscriber-001/preview.png','test:a'),__test.assetLoader.image('./assets/skins/subscriber-001/preview.png','test:b')]));
    assert.ok((await run(page,()=>__test.assetLoader.stats().requests))-beforeRequests<=1);
    await run(page,()=>{__test.assetLoader.release('test:a');__test.assetLoader.release('test:b');});
    assert.ok(warnings.length>warningStart,'Expected diagnostics logged');
    console.log('PASS missing/throwing/async component, unknown theme/layout, appearance-only extension, missing sprites, shared preload/cache fallback');
    await page.close();

    // 15 responsive combinations, native touch tokens and viewport geometry.
    for(const width of [1440,1024,768,390,320]){
      const touch=width<=390;
      for(const id of ['default','creator','subscriber-001']){
        // Isolate raw CDP gesture streams from later Playwright tap streams.
        const p=await open(browser,width,touch);
        await run(p,()=>{__test.skinSystem.unlock('creator');__test.skinSystem.unlock('subscriber-001');});
        await equip(p,id);
        assert.equal(await run(p,()=>document.documentElement.scrollWidth<=innerWidth),true,`${id}/${width} READY overflow`);
        await tapOrClick(p,'#start-button',touch);await state(p,'RUNNING');await run(p,()=>__test.game.stopTick());
        const geometry=await run(p,()=>{const board=document.querySelector('#board-wrap').getBoundingClientRect(),hud=__test.host.getElement('HUD').getBoundingClientRect();return {overlap:Math.min(board.right,hud.right)>Math.max(board.left,hud.left)&&Math.min(board.bottom,hud.bottom)>Math.max(board.top,hud.top),cell:__test.layoutSystem.viewport.cellSize};});
        assert.equal(geometry.overlap,false);assert.ok(geometry.cell>=12&&geometry.cell<=32);
        if(touch){
          for(const selector of ['[data-direction=up]','[data-direction=left]','[data-direction=down]','[data-direction=right]','[data-control=BUTTON_B]','[data-control=BUTTON_A]','[data-control=BUTTON_FUNC]']){
            const box=await p.locator(selector).boundingBox();assert.ok(box.width>=44&&box.height>=44,selector+' min target');
          }
          await p.locator('[data-direction=up]').tap();assert.deepEqual(await run(p,()=>__test.game.snake.pendingDirection),{x:0,y:-1});
          await p.locator('[data-control=BUTTON_B]').tap();assert.equal(await run(p,()=>__test.game.context.speedMultiplier),.6);
          await p.locator('[data-control=BUTTON_FUNC]').tap();await state(p,'PAUSED');
          await p.locator('#restart-button').tap();await state(p,'RUNNING');
          await p.locator('[data-control=BUTTON_A]').tap();assert.equal(await run(p,()=>__test.game.context.speedMultiplier),1.45);
          await p.locator('[data-control=BUTTON_FUNC]').tap();await state(p,'PAUSED');
          assert.equal(await run(p,()=>document.documentElement.scrollWidth<=innerWidth),true,`${id}/${width} PAUSED overflow`);
          const stable=await run(p,()=>JSON.stringify([__test.game.snake.segments,__test.game.duration]));
          await p.setViewportSize({width,height:700});await p.waitForTimeout(60);
          assert.equal(await run(p,()=>JSON.stringify([__test.game.snake.segments,__test.game.duration])),stable);
          await p.locator('[data-control=BUTTON_FUNC]').scrollIntoViewIfNeeded();
          assert.equal(await p.locator('[data-control=BUTTON_FUNC]').evaluate(el=>{const r=el.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('button')===el;}),true);
          await p.setViewportSize({width,height:1000});
          await shot(p,id+'-'+width);
          // Actual CDP touch swipe on preserved world surface; tap is below threshold.
          await run(p,()=>{const g=__test.game;__test.ui.clearSkill();__test.ui.resume();g.stopTick();g.snake.reset(g.config.initialSnake,g.config.directions.right);});
          await p.locator('#board-wrap').scrollIntoViewIfNeeded();const box=await p.locator('#board-wrap').boundingBox(),x=box.x+box.width/2,y=box.y+box.height/2;
          const cdp=await p.context().newCDPSession(p);
          await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
          assert.deepEqual(await run(p,()=>__test.game.snake.pendingDirection),{x:1,y:0});
          await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-65,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
          assert.deepEqual(await run(p,()=>__test.game.snake.pendingDirection),{x:0,y:-1});await p.waitForTimeout(350);await cdp.detach();
        }else {await p.keyboard.press('Space');await state(p,'PAUSED');}
        await run(p,()=>__test.game.reset());
        await p.close();
      }
      console.log('PASS responsive '+width+'px / all three themes');
    }
    const legacy=await open(browser,390,true,()=>{localStorage.setItem('bestScore','17');localStorage.setItem('cheatBestScore','42');localStorage.setItem('snake.unlockedSkins',JSON.stringify(['default','subscriber-001','removed-skin']));localStorage.setItem('snake.selectedSkin',JSON.stringify('removed-skin'));});
    assert.equal(await run(legacy,()=>__test.skinSystem.current.id),'default');
    assert.equal(await run(legacy,()=>__test.saveService.save.stats.normalBestScore),17);
    assert.equal(await run(legacy,()=>__test.saveService.save.stats.cheatBestScore),42);
    assert.equal(await run(legacy,()=>__test.saveService.save.profile.ownedSkins.includes('removed-skin')),true);
    await legacy.close();
    assert.deepEqual(errors,[]);console.log('PASS legacy best/rights migration, retired selection safe fallback, no unhandled browser errors');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
