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

Theme priority is event theme, then map theme, then skin theme, then Default. The current UI applies map theme over skin theme through `body[data-theme]`. `styles.css` owns token changes only and leaves layout stable.

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

`UISystem` owns the viewport overlays. In `READY`, it displays `StartScreen` with the active skin name/preview, difficulty choices and a real start button. Click, Enter and Space start the game; touch direction buttons and swipes intentionally do nothing until the game is running. Difficulty changes remain limited to `READY` and `GAME_OVER`.

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

`BUTTON_FUNC` is permanently a system action, not a third skill and not a secret-sequence member: READY → Start, RUNNING → Pause, PAUSED → Resume, GAME_OVER → Restart. Modal state disables it. On desktop the key equivalents remain Space and R; keyboard `a` remains left while running and maps to Button A only for the paused sequence.

The portrait layout is D-Pad on the left and a right-hand skill cluster: a small FUNC control centered above the separate Brake and Boost circles. All controller buttons maintain a 44px minimum hit region and stay in normal document flow with safe-area padding.
