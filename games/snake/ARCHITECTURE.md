# Snake architecture

Read this file before changing the game. The project is a static ES module application. It has no framework or build step.

## Layers

- `core/`: game state, snake data, score and input primitives. Core has no knowledge of individual skins, maps, redeem codes, buffs or secrets.
- `content/`: registrations and all configurable values. New game content should begin here.
- `systems/`: runtime behavior such as skin ownership, buffs, maps, mechanics, camera, drawing, UI and events.
- `services/`: persistence, profile, redemption and future leaderboard interfaces.
- `storage/`: current localStorage adapter. A cloud adapter can replace it later.
- `assets/`: current and future visual resources. Standard skin folders are `assets/skins/<skin-id>/`.

`main.js` is the composition root. It creates registries and services, wires systems together, then creates one `Game` instance. Do not place gameplay rules in `main.js`.

## State and run context

`GameState` supports `READY`, `RUNNING`, `PAUSED`, `GAME_OVER`, `MODAL` and `TRANSITION`.

Transient context stays in `game.context`:

```js
{
  worldId: 'normal',
  mapId: 'normal',
  runMode: 'NORMAL', // NORMAL, ASSISTED, CHEAT
  activeModal: null,
  difficulty: 'normal',
  nextFoodId: null,
  boundaryBroken: false
}
```

Modal IDs and transitions are context, not new boolean flags. `Game` owns state changes. UI calls public game methods such as `game.pause()`, `game.reset()` and `game.queueDirection()`.

## EventBus

`systems/EventBus.js` exposes `on`, `off` and `emit`. Current events include:

```text
game:start, game:restart, game:pause, game:resume, game:over
snake:move, snake:eat, snake:grow, snake:shrink, snake:collision, snake:death
score:change, skin:equip, skin:unlock, buff:add, buff:remove
map:enter, map:leave, world:boundary-break, secret:discover, mode:change
ui:modal-open, ui:modal-close
```

Systems should react to these events rather than calling unrelated UI or persistence code directly.

## Registries

`Registry` provides `register(id, definition)`, `get(id)`, `has(id)` and `list()`.

Current registries:

- `SkinRegistry` in `content/skins.js`
- `BuffRegistry` in `content/buffs.js`
- `FoodRegistry` in `content/foods.js`
- `MapRegistry` in `content/maps.js`
- `MechanicRegistry` in `content/mechanics.js`
- `EventRegistry` in `content/events.js`
- `UIThemeRegistry` in `content/uiThemes.js`

The content files are JavaScript today, but each definition is already shaped so it can be loaded from a JSON manifest later.

## Definition contracts

Skin example:

```js
{
  id: 'creator',
  displayName: 'Creator',
  assetPath: './assets/skins/creator/',
  uiThemeId: 'creator',
  unlock: { type: 'redeem' },
  capabilities: ['outside-access'],
  mechanics: ['boundary-break'],
  mapAccess: ['normal', 'outside'],
  leaderboardMode: 'normal'
}
```

Buff example:

```js
{ id: 'break', type: 'buff', durationType: 'charges', defaultDuration: 1, stackMode: 'replace', tags: ['boundary'] }
```

Map example:

```js
{ id: 'outside', width: 20, height: null, cameraMode: 'follow', uiThemeId: 'outside', foodTableId: 'outside-food', boundaryMode: 'open-x', mechanics: [] }
```

Mechanics implement only hooks they need: `onAttach`, `onGameStart`, `onRestart`, `onTick`, `onEat`, `onCollision`, `onScoreChanged`, `onMapEnter`, `onMapLeave` and `onDeath`. The existing `boundary-break` mechanic proves the pattern: it checks a skin capability, awards BREAK through `BuffSystem`, resolves the weak wall and requests a generic map transition. Core never checks `creator` or `outside` by ID.

## Systems

- `SkinSystem` reads ownership from `ProfileService`, equips skins and emits events.
- `BuffSystem` applies, removes and consumes registered runtime buffs.
- `MapSystem` owns the active continuous-world region, collision bounds and food positions.
- `MechanicSystem` attaches registered mechanics and invokes lifecycle hooks.
- `CameraSystem` follows the active map's declared camera mode.
- `RenderSystem` draws game data. `Snake` never draws itself.
- `UISystem` translates DOM events to public Game APIs and renders state into the page.
- `AssetLoader` caches image requests and returns `null` for missing resources so renderers can fall back to Default safely.

Theme priority is Event > Map > Skin > Default. `ThemeContextResolver` merges partial layers; `ComponentHost` applies scoped tokens and registered components. No `body[data-theme]` skin branches remain. Maps/events do not replace the player's layout, Appearance or SkillSet.

## Save v1 and migration

The only new canonical key is `snake.save.v1`:

```js
{
  version: 1,
  profile: { discoveredSkins: [], ownedSkins: [], selectedSkinId: 'default', discoveries: [], achievements: [] },
  stats: { normalBestScore: 0, assistedBestScore: 0, cheatBestScore: 0, totalRuns: 0, totalScore: 0 },
  world: { discoveredMaps: ['normal'], discoveries: [] },
  settings: { difficulty: 'normal', soundEnabled: true }
}
```

`SaveService` migrates `bestScore`, `normalBestScore`, `cheatBestScore`, `eluney-snake-best`, `snake.unlockedSkins`, `snake.selectedSkin` and outside discovery flags on first load. Old keys are not removed. A damaged save falls back to safe defaults.

## Services and future server work

Current dependencies are `SaveService -> LocalStorageAdapter`, `ProfileService`, local `RedeemService` and no-network `LeaderboardService`.

To add a server later, introduce `CloudSaveAdapter` and `ApiRedeemService` with the same methods. `RedeemService.redeem(code)` returns `{ success, rewardType, rewardId, message }`; a cloud version can call `api.eluney.cn/redeem`. `LeaderboardService.submitRun(result)` should receive a run result shaped like:

```js
{ score, length, duration, difficulty, runMode, skinId, mapId, mapsVisited, buffsUsed, secretsTriggered, timestamp }
```

Do not add API keys or real credentials to this static repository.

## Adding content

### Add `test-skin`

1. Put approved art in `assets/skins/test-skin/`. Standard names are `head-up.png`, `head-down.png`, `head-left.png`, `head-right.png`, tail directions, horizontal and vertical body, four corners and `food.png`. Missing files must fall back to Default.
2. Register `test-skin` in `content/skins.js`.
3. Register a theme in `content/uiThemes.js` only when needed.
4. Register a mechanic and list its ID on the skin only when behavior is needed.

No `Snake.js`, collision code or game loop edits are required.

### Add `test-map`

Register its size, camera mode, food table, buff table, event table, UI theme, boundary mode and mechanics in `content/maps.js`. Add rendering data only if the map has custom art. Maps enter through `MapSystem`, so do not create another Game instance.

### Add a special mechanic

Add one definition in `content/mechanics.js`, register it in `main.js`, and attach its ID from a skin or map definition. Use lifecycle hooks and EventBus events instead of branching inside core.

## Constraints

Keep the game dependency-free, static and black, white and gray. Do not add framework state libraries, a full ECS, secret credentials or speculative empty content folders. The Creator redeem constant remains a local easter egg, not authentication.

Subscriber's existing art and restrained warm-red UI accent are the intentional exception to the monochrome base; do not generate replacement art or alter its redemption.

## Grid, viewport and rendering

Game logic uses grid and world coordinates only: one snake segment at `{ x:5, y:8 }` occupies exactly one logical cell. `GridSystem` keeps the active map's `grid.cols` and `grid.rows`, converts grid coordinates to world units (currently one grid cell equals one world unit), and never reads Canvas or DOM dimensions.

`LayoutSystem` owns the viewport's screen-pixel size. It observes the available panel width, calculates `cellSize` from the active map grid, and clamps it with `CONFIG.layout.minCellSize` and `CONFIG.layout.maxCellSize`. It then sizes the Canvas backing store and exposes `worldToScreen(world, camera)`. A viewport is the camera window only: HUD, setup controls, overlays and mobile controls remain DOM UI outside the world coordinate system.

`CameraSystem` exposes world `x` and `y`. `RenderSystem` composes the systems as `grid -> world -> screen`, using `screen = (world - camera) * cellSize`. Normal uses a fixed camera; Outside continues to use its follow camera. Map definitions declare their viewport grid:

```js
{ id:'normal', grid:{ cols:20, rows:20 }, cameraMode:'fixed' }
```

The map's grid is not a collision-size override. Collision and movement remain grid based in `core/`.

## Render profiles

Skins can optionally declare `renderProfile`. Missing fields merge with `CONFIG.render.defaultProfile`:

```js
{
  headScale: 1,
  bodyScale: .90,
  tailScale: .90,
  cornerScale: .90,
  overlapRatio: .04,
  headOffsetX: 0,
  headOffsetY: 0,
  bodyOffsetX: 0,
  bodyOffsetY: 0,
  tailOffsetX: 0,
  tailOffsetY: 0,
  cornerOffsetX: 0,
  cornerOffsetY: 0,
  smoothing: true
}
```

Scales, offsets and overlap are visual only. A larger `headScale` may draw beyond a cell, but it never changes length, collision, movement, turn rules or map bounds. Offsets are measured in cell units. `smoothing: false` is available for future pixel-art skins; the renderer applies the selected profile through `ctx.imageSmoothingEnabled`.

`getSegmentVisualType(previous, current, next)` chooses horizontal, vertical or one of four corners from neighboring grid coordinates. Head direction comes from the current snake direction; tail direction comes from the tail and its preceding segment. Every requested asset tries its own skin first, then Default assets when available, then a same-axis body resource, before falling back to the safe geometric Default renderer.

When adding a skin with standard image resources, set `renderAssets:true`, register it in `content/skins.js`, and add a `renderProfile` only when its art needs one. Skins without `renderAssets` use the safe geometric renderer and make no missing-file requests. No `Snake.js`, collision or `Game.js` changes are required for a large head or wide body.

## StartScreen and overlay priority

`UISystem` owns the viewport overlays. In `READY`, `StartScreen` contains the only visible start button and a desktop keyboard hint. Difficulty appears once in the compact setup bar, while skin choices and redemption live in the native “外观” details panel. Click, Enter and Space start the game; touch direction buttons and swipes intentionally do nothing until the game is running. Difficulty changes remain limited to `READY` and `GAME_OVER`.

Overlay priority is `MODAL > GAME_OVER > PAUSED > READY > world`. A modal changes the game state to `MODAL`, so Start and Pause controls cannot respond behind it. The HUD is outside the Canvas and never follows the camera.

For visual debugging only, set `CONFIG.debug.drawCollisionCells` with `CONFIG.debug.enabled`; it outlines the true one-cell collision bounds without exposing the setting to normal players.

## Input, skills and device pixels

`Input` yields to editable targets (`input`, `textarea`, `select` and editable content), so text entry can never steer, pause, restart or invoke a skill. It translates keyboard and swipe events into neutral UI actions.

The paused Konami sequence uses that same action stream: directions, `BUTTON_B` and `BUTTON_A`. Keyboard `a` stays WASD-left while running, but becomes `BUTTON_A` only while paused so the literal desktop B/A ending remains available without making a normal left move into a skill press. Brake and Boost are generic timed multipliers from `CONFIG.skills`; core only uses `game.context.speedMultiplier`.

`LayoutSystem` owns CSS-pixel viewport dimensions plus capped `dpr`; its canvas backing buffer is `viewport × dpr`. `RenderSystem` renders in CSS pixels and aligns one-pixel grid/boundary strokes to device pixels. World/camera/collision coordinates remain independent of display resolution.

## Mobile interaction boundaries

The game viewport owns the only swipe listener and uses Pointer Events. Its `touch-action:none` prevents a board swipe from scrolling; no document or body touch listener calls `preventDefault`. Controls use native button clicks with `touch-action:manipulation`, are in ordinary document flow, and reserve `env(safe-area-inset-bottom)` space so Safari browser chrome cannot overlap the final controls.

Layer tokens are `--z-world < --z-hud < --z-controls < --z-overlay < --z-modal`. Viewport overlays are visually full-size but use `pointer-events:none`; only their actual card content restores pointer events. Thus the ready overlay cannot swallow difficulty, skin, redeem, HUD or controller touches outside the board.

## Mobile controller final layout

The mobile controller emits neutral control tokens only: `MOVE_UP`, `MOVE_DOWN`, `MOVE_LEFT`, `MOVE_RIGHT`, `BUTTON_B`, `BUTTON_A` and `BUTTON_FUNC`. `UISystem` is the context router. D-Pad tokens move only while running and enter the paused secret matcher otherwise. `BUTTON_B` and `BUTTON_A` are future skill slots: they invoke Brake and Boost only while running; when paused they are sequence input only and never start a cooldown.

`BUTTON_FUNC` is permanently a system action, not a third skill and not a secret-sequence member. The mobile controller is visible only in RUNNING / PAUSED, with FUNC acting as Pause / Resume. Desktop uses the HUD pause / continue button; CSS hides that duplicate button on mobile. Modal state disables the controller. On desktop the key equivalents remain Space and R; keyboard `a` remains left while running and maps to Button A only for the paused sequence.

The portrait layout is D-Pad on the left and a right-hand skill cluster: a small FUNC control centered above the separate Brake and Boost circles. All controller buttons maintain a 44px minimum hit region and stay in normal document flow with safe-area padding.

## Native click and canvas resize safeguards

The viewport swipe adapter must ignore pointer events originating from buttons, links and editable targets before calling `setPointerCapture`. Otherwise pointer-up and native click are retargeted to the viewport, and the Start button never receives a click. Verify changes using actual browser mouse clicks and touchscreen taps rather than `element.click()` alone.

`LayoutSystem` changes the Canvas backing dimensions only when their values differ. Assigning an unchanged `canvas.width` or `canvas.height` still clears the drawing buffer; repeated resize notifications must leave a READY or PAUSED board intact. `refinements.css` owns the responsive game UI, while grid collision and gameplay remain independent of visual layout.

## State-specific UI actions

READY has one central Start action, RUNNING has Pause, PAUSED has Continue plus a secondary restart inside its small overlay, and GAME_OVER has one “再来一局” action inside the statistics panel. Native `hidden` controls are excluded from both interaction and layout. State changes also remain announced through a visually hidden live status; only CHEAT, discovered OUTSIDE and active buffs require visible badges.

`UISystem.restart()` composes the existing `game.reset()` and `game.start()` APIs: a paused restart, R or replay begins a clean running session immediately with the selected difficulty. It clears the secret buffer, active skill timer and cooldowns; core game / collision logic is unchanged. Resume clears partial secret input. Game actions release button focus so subsequent movement keys are not intercepted, while native details summaries and editable fields retain their own keyboard behavior. Escape closes verification even when its input is focused.

## Theme Pack V1: composition, not another game

The registries are all instances of the existing `Registry`; no second SkinSystem, UISystem, renderer, input router or loop exists. `main.js` registers content and wires the shared loader, resolver and UI host to the existing systems.

```text
SkinRegistry -> SkinSystem -> immutable run Appearance / Mechanic / SkillSet
                               |
ThemePackRegistry -> UIThemeRegistry + LayoutVariantRegistry
                               |
                   ThemeContextResolver <- Map + visual Events
                               |
UISystem -> readonly ViewModel / Actions -> ComponentHost -> DOM slots
RenderSystem -> Appearance / RenderProfile -> same Canvas / logical cells
```

### Theme Pack schema

`content/themePacks.js` owns associations. Only `id` is required by registration; missing fields inherit the Default pack. An Appearance-only Skin does not need a pack.

```js
{
  id: 'sample', displayName: 'Sample', description: 'Optional', version: 1,
  appearanceId: 'default', uiThemeId: 'default', layoutVariantId: 'default',
  controllerStyleId: 'default', skillPresentationId: 'default', skillSetId: 'default',
  previewAsset: './assets/skins/sample/preview.png', // optional
  assetBasePath: './assets/skins/sample/',          // authoring metadata
  assets: [{path:'./assets/skins/sample/ui/panel.svg',type:'image'}],
  selectorCardId: 'default/SkinCard',               // optional renderCard factory
  capabilities: [], mechanicIds: [],               // omit to inherit Skin rules
  unlock: {type:'redeem'}, secretTags: []           // declarations only
}
```

Paths in manifests are page-relative or same-origin absolute paths; `assetBasePath` does not implicitly rewrite them. Never put redeem codes in UI themes/templates or the pack's public preview metadata. Ownership stays in ProfileService; redemption stays in the existing RedeemService/Skin declarations. Packs cannot unlock themselves.

### Skin Appearance

`content/appearances.js` separates visual data from the Skin's entitlement/rules. It accepts `assetPath`, `renderAssets`, `previewPath`, `renderProfile`, and optional `spriteAtlas:{path,frames}`. Frame names match the existing fifteen head/tail/body/corner/food names; each frame contains `x,y,width,height`. Loader returns `{image,frame}` and RenderSystem draws the source rectangle preserving its aspect ratio. Scale/offset/overlap/smoothing continue to be visual only: one segment is still one cell. The existing Subscriber 001 sprites and source image are unchanged.

### UI Theme / tokens

`content/uiThemes.js` defines optional `extends`, `tokens` and `components` overrides. Tokens use `--ui-bg`, `--ui-surface`, `--ui-text`, `--ui-muted`, `--ui-border`, `--ui-accent`, `--ui-radius`, `--ui-font-body`, `--ui-font-display`, `--ui-spacing`, `--ui-motion-duration`. Default supplies missing values. Use local system fonts; do not load external fonts. Shared legacy CSS variables alias these tokens only inside `body[data-snake-game]`; pack CSS selectors must begin with `[data-snake-game]`. `ComponentHost` removes only its owned inline tokens before applying the next context. Reduced-motion is respected; no gradients or new animations.

### Layout Variant / structural regions

`content/layoutVariants.js` supports `extends`, `supportsMobile`, `components` and `regions`. Each region is `{id,slots}`. The six top-level slots Header/HUD/Status/Setup/WorldViewport/Controller must appear exactly once; an invalid arrangement falls back to a single Default region. StartScreen/PauseOverlay/GameOver remain nested in the stable viewport; SkinSelector remains nested in Setup. Modals are root-level, outside grid flow. Regions change actual DOM containment, not just colors.

- Default: single main column, compact top score, central viewport, bottom controls.
- Creator: full-width heading/setup, desktop parameter sidebar plus world region; compact four-parameter strip on phones.
- Subscriber 001: portrait/header/score region, separate world/setup/controller region, dedicated image-led Start and result templates.

Incomplete or unsupported mobile layouts fall back to Default. Keep the shared engine Canvas alive through layout changes so the existing resize observer, pointer adapter and camera remain valid.

### UI Component Contract

`ui/ComponentHost.js` supports Header, HUD, Status, StartScreen, PauseOverlay, GameOver, SkinSelector, RedeemModal, CheatAuthModal, Controller, WorldViewport, plus Setup. A registered component implements:

```js
{
  id: 'sample/HUD',
  mount({baseElement, assets, signal, viewModel, actions, themeContext}) {
    const element = document.createElement('section');
    const label = document.createElement('strong');
    element.append(label);
    return {
      element,
      update({viewModel}) { label.textContent = String(viewModel.score); },
      dispose() { /* release custom resources, if any */ }
    };
  }
}
```

Optional `load()` resolves a component with the same contract. Default displays during loading; stale completion is ignored by mount-generation identity. On replacement `signal` aborts, `dispose()` runs and the scoped asset owner releases. Use `signal` for any local listeners. Prefer delegated `data-ui-action` buttons instead of installing new handlers. Missing registrations, mount/update exceptions or rejected loads log a diagnostic and use `default/<slot>`; failures are not retried every clock update. WorldViewport implementations must return the supplied engine surface rather than create another Canvas. Trusted component templates are source code, not user HTML.

Skin cards may register `{id, renderCard({skin,selected,canSetup,assets,themeContext})}` returning an HTMLElement. Invalid card factories fall back individually. Selector receives only owned AND discovered registered skins; it never renders unknown/locked placeholders, counts or secret catalogs.

### Read-only ViewModel and Actions

`ui/ViewModel.js` constructs a structured-cloned, deeply frozen public snapshot. It contains `score`, `bestScore`, `length`, `elapsedTime` (milliseconds, second-quantized), `difficulty`, `gameState`, `runMode`, `currentSkin`, `currentMap`, `activeBuffs`, `skillStates`, `discoveredContent`, and setup/control/modal/selector display flags. It contains no Game/Snake reference or redeem codes. UI values are display copies; they cannot mutate mechanics or save.

The frozen Action API includes start/pause/resume/restart/openSkinSelector/equipSkin/openRedeem/submitRedeem/closeModal/move/activateSkill/confirm/cancel, plus chooseDifficulty/control. It delegates to the existing public APIs and central input/state router. Gameplay, skill timers, score and redemption are never implemented by components. Button convention: `data-ui-action="equipSkin" data-ui-arg="sample"`; forms use `data-ui-form="redeem|cheat"` and an input named `code`.

UISystem listens to state/content events and polls clocks/cooldowns at 100ms. Identical serialized ViewModel/context skip all DOM work. Components keep their DOM nodes and update only changed text/properties. This is separate from the existing game tick; there is no additional animation loop.

### Layered context and restoration

`systems/ThemeContextResolver.js` starts from Default tokens/components, merges the selected Skin theme and Layout, then Map, then active Events in insertion order (last event wins). Theme/layout inheritance is cycle-guarded; missing IDs log once and use Default. Overlay data may override only tokens and component slots, not Appearance, Layout regions, equipped Skin, mechanics or SkillSet.

Map example (existing Outside also supports its legacy `uiThemeId:'outside'`):

```js
{id:'map-id', /* existing map configuration */
 themeOverlay:{uiThemeId:'outside',tokens:{'--ui-muted':'#999999'},
               components:{Status:'sample/Status'}}}
```

Event example:

```js
eventBus.emit('theme:event:start', {
  id:'event:temporary',
  overlay:{tokens:{'--ui-bg':'#151515'},components:{HUD:'sample/HUD'}}
});
eventBus.emit('theme:event:end', {id:'event:temporary'});
```

Every update resolves fresh from layers, so event end restores the current map/skin context exactly; leaving a map restores the Skin theme. Restart clears transient events. `run:cheat` is only an event UI context, not a selectable Skin. Its existing paused sequence/mario conditions and mode/category isolation are untouched. Creator retains its own HUD, Appearance and controller during BREAK/Outside.

### Safe switching and SkillSet snapshot

Both UISystem and SkinSystem enforce equip only in READY/GAME_OVER. RUNNING/PAUSED/MODAL/TRANSITION reject changes, including direct service calls. `game:start` captures deeply frozen Skin/Mechanic/SkillSet definitions; SkillSet slots are keyed BUTTON_B/BUTTON_A and reference existing timed skill configs. Registry changes cannot change the active run's definitions. Reset clears snapshots. Equip in GAME_OVER preserves score/statistics instead of resetting the run. Pack ID is derived from the selected Skin, not written as a second user setting; Save v1 and all legacy migrations remain unchanged.

### Shared resources and fallbacks

The single AssetLoader is shared by UI and renderer. It supports images, text, and audio/effect binary buffers via manifest types. Loading is same-origin (or data) only, cached per URL/type, and resolves null on failure. Owners allow release after component/pack/render changes. Unowned completed entries use a bounded warm cache (32) so repeated switching avoids reloads without retaining all past skins. Loading errors are logged; images hide safely and missing sprite data uses geometric rendering. Atlas/image source aspect ratios are preserved. No Image is created per frame. Sound playback/effects remain optional consumers; this task adds no sound, effect files or autoplay.

Only create actual asset directories: appearance/ui/icons/effects/audio/preview are conventions, not compulsory empty folders. Existing Subscriber paths remain valid.

### Responsive/controller contract

All layouts must fit 320px upward; use minmax(0,1fr), min-width:0 and bounded image dimensions. Creator collapses its two-column layout at 760px. HUD is outside the viewport and never follows Camera. LayoutSystem calculates cellSize from the available world region and maintains CSS/backing-buffer/DPR separation. D-Pad stays left, Brake/Boost circles right, FUNC above; all retain the exact MOVE_*/BUTTON_* token protocol and 44px targets. `viewport-fit=cover`, `100dvh` with vh fallback, and safe-area bottom padding remain. No whole-page touch prevention or fixed controller overlay is introduced.

### Adding a complete pack without changing Core

1. Add only approved, needed assets and an Appearance definition; ordinary geometric packs can reuse Default.
2. Register a UI Theme and Layout Variant (or reuse either independently).
3. Register only specialized slot components; inherit all unspecified Default slots.
4. Register an optional ControllerStyle, SkillPresentation (labels/descriptions) and SkillSet (existing skill configuration).
5. Associate these IDs in ThemePackRegistry and add `themePackId` to the existing Skin definition. Unlock through the existing services, never UI CSS.
6. Import/register content in main.js; run contract/browser tests. No Snake/Collision/GameLoop edits.

Minimal example:

```js
themePackRegistry.register('sample',{appearanceId:'default',layoutVariantId:'default',
  uiThemeId:'sample',skillSetId:'default',version:1});
uiThemeRegistry.register('sample',{tokens:{'--ui-border':'#777777'},
  components:{HUD:'sample/HUD',StartScreen:'sample/StartScreen',GameOver:'sample/GameOver'}});
skinRegistry.register('sample',{displayName:'Sample',themePackId:'sample',mechanics:[]});
```

Use the above mount contract for a dedicated StartScreen: show only READY and delegate `start`; GameOver reads the same score/best/length/time snapshot and delegates `restart`. `renderStart` / `renderOver` are reusable update helpers, not rules. Future card-style HUD, card preview, draw/activate button presentation and map-event overlays can register these slots/presentation IDs and existing mechanics hooks. No card art or third-party characters are added now; obtain rights before using them. Truly new engine primitives must be scoped separately; this contract does not promise arbitrary new gameplay without any engine work.

## Theme V1 verification

Run contracts with `node --test games/snake/tests/theme-contract.test.mjs`. Serve the repo with a static HTTP server; run `tests/theme-browser.cjs` with `PLAYWRIGHT_MODULE` set to an existing install and optionally `CHROME_PATH`, `SNAKE_TEST_URL`, `SNAKE_TEST_OUTPUT`. No package dependency or production debug hook is added. The runner intercepts only its own main.js response to inspect the real systems. Fixtures set collision/score boundaries for deterministic checks; clicks, keys, touch taps and transitions still execute production paths.

See `THEME_PACK_ACCEPTANCE.md` for audit, acceptance matrix, limits and staged commits. Browser emulation is not an iPhone Safari hardware certification.
