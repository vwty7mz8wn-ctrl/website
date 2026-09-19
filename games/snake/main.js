import { Game } from './core/Game.js';
import { Input } from './core/Input.js';
import { EventBus } from './systems/EventBus.js';
import { Registry } from './systems/Registry.js';
import { SkinSystem } from './systems/SkinSystem.js';
import { BuffSystem } from './systems/BuffSystem.js';
import { MapSystem } from './systems/MapSystem.js';
import { MechanicSystem } from './systems/MechanicSystem.js';
import { CameraSystem } from './systems/CameraSystem.js';
import { GridSystem } from './systems/GridSystem.js';
import { LayoutSystem } from './systems/LayoutSystem.js';
import { RenderSystem } from './systems/RenderSystem.js';
import { AssetLoader } from './systems/AssetLoader.js';
import { UISystem } from './systems/UISystem.js';
import { LocalStorageAdapter } from './storage/LocalStorageAdapter.js';
import { SaveService } from './services/SaveService.js';
import { ProfileService } from './services/ProfileService.js';
import { RedeemService } from './services/RedeemService.js';
import { skins } from './content/skins.js';
import { buffs } from './content/buffs.js';
import { foods } from './content/foods.js';
import { maps } from './content/maps.js';
import { uiThemes } from './content/uiThemes.js';
import { events } from './content/events.js';
import { CONFIG } from './content/config.js';
import { createBoundaryBreakMechanic } from './content/mechanics.js';

const registerAll = (registry, definitions) => definitions.forEach(definition => registry.register(definition.id, definition));
const eventBus = new EventBus();
const skinRegistry = new Registry('SkinRegistry');
const buffRegistry = new Registry('BuffRegistry');
const foodRegistry = new Registry('FoodRegistry');
const mapRegistry = new Registry('MapRegistry');
const mechanicRegistry = new Registry('MechanicRegistry');
const eventRegistry = new Registry('EventRegistry');
const uiThemeRegistry = new Registry('UIThemeRegistry');
registerAll(skinRegistry, skins);registerAll(buffRegistry, buffs);registerAll(foodRegistry, foods);registerAll(mapRegistry, maps);registerAll(eventRegistry, events);registerAll(uiThemeRegistry, uiThemes);mechanicRegistry.register('boundary-break', createBoundaryBreakMechanic(CONFIG));

const saveService = new SaveService(new LocalStorageAdapter());
saveService.load();
const profileService = new ProfileService(saveService);
const skinSystem = new SkinSystem(skinRegistry, profileService, eventBus);
skinSystem.load();
const mapSystem = new MapSystem(mapRegistry, foodRegistry, CONFIG, eventBus);
const buffSystem = new BuffSystem(buffRegistry, eventBus);
const cameraSystem = new CameraSystem(eventBus);
const gridSystem = new GridSystem(mapSystem.current.grid);
const layoutSystem = new LayoutSystem({ viewport:document.getElementById('board-wrap'), canvas:document.getElementById('board'), gridSystem, config:CONFIG, eventBus });
const mechanicSystem = new MechanicSystem(mechanicRegistry);
const renderSystem = new RenderSystem(document.getElementById('board'), CONFIG, new AssetLoader(), gridSystem, layoutSystem);
const game = new Game({ config:CONFIG, eventBus, mapSystem, cameraSystem, buffSystem, mechanicSystem, skinSystem, renderSystem });
layoutSystem.setOnChange(()=>game.render());
const redeemService = new RedeemService([
  { code:CONFIG.creatorRedeemCode, type:'skin', id:'creator', message:'CREATOR SKIN UNLOCKED' },
  ...skins.filter(skin=>skin.unlock?.type==='redeem'&&skin.unlock.code).map(skin=>({ code:skin.unlock.code, type:'skin', id:skin.id, message:skin.unlock.message||`${skin.displayName.toUpperCase()} UNLOCKED` }))
]);
const ui = new UISystem({ game, skinSystem, profileService, redeemService, saveService, eventBus, foodRegistry });
ui.bind();
const input = new Input({ target:document, wrap:document.getElementById('board-wrap'), directions:CONFIG.directions, swipeMin:CONFIG.input.swipeMin, onDirection:name=>ui.direction(name), onSpace:()=>ui.toggleSpace(), onRestart:()=>ui.restart(), onPausedKey:key=>ui.pausedKey(key), onEscape:()=>ui.escape() });
input.bind();
if (CONFIG.difficulty[saveService.save.settings.difficulty]) game.context.difficulty = saveService.save.settings.difficulty;
game.reset();

if (CONFIG.debug.enabled) window.snakeDebug = { game, eventBus, gridSystem, layoutSystem, registries:{ skinRegistry, buffRegistry, foodRegistry, mapRegistry, mechanicRegistry, eventRegistry, uiThemeRegistry }, saveService };
