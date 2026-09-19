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
