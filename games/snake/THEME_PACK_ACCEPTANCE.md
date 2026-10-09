# Snake Theme Pack Architecture V1 验收记录

日期：2026-10-09。范围：架构与三套轻量布局原型；不包含三套最终品质美术。未增加新地图、剧情、卡牌素材、音效或皮肤权益。

## 1. 审计与最小解耦

原 UISystem 直接通过全局选择器更新固定 HTML；主题通过单个 body 属性换色，地图主题容易盖掉皮肤主题，无法替换 HUD/Start/GameOver 的结构。Skin 同时携带规则、权益与精灵展示数据，加载器只按皮肤缓存图片，UI 缺少统一只读接口和组件生命周期。

本轮扩展原 SkinSystem、UISystem、RenderSystem 与 AssetLoader，没有复制游戏系统。新增内容注册、ViewModel、ComponentHost、分层 Resolver，将引擎 Canvas 保留为稳定对象。旧 Default HTML 分阶段迁移，只有确认无用的旧 data-theme 样式被删除。

## 2–6. 注册协议、组件与上下文

- Theme Pack：id/displayName/description/version、appearanceId、uiThemeId、layoutVariantId、controllerStyleId、skillPresentationId、skillSetId，以及可选 previewAsset/assetBasePath/assets/selectorCardId/capabilities/mechanicIds/unlock/secretTags。缺省继承 Default。unlock 是关联声明，不执行解锁。
- Appearance：精灵目录或 Atlas、RenderProfile；不控制布局。大小、插值和偏移只影响显示，碰撞仍是一段一格。
- Layout：extends、supportsMobile、components、regions。Header/HUD/Status/Setup/WorldViewport/Controller 六个顶层槽各出现一次；其他覆盖层保持正确嵌套。
- Component：mount 接收只读 viewModel/actions/themeContext、局部 assets、AbortSignal；返回 element/update/dispose。可选异步 load。缺失或异常回退 Default。
- ViewModel：score/bestScore/length/elapsedTime/difficulty/gameState/runMode/currentSkin/currentMap/activeBuffs/skillStates/discoveredContent，及必要 UI 状态。深拷贝、深冻结，不暴露 Game、Snake、兑换码。
- Actions：start/pause/resume/restart/openSkinSelector/equipSkin/openRedeem/submitRedeem/closeModal/move/activateSkill/confirm/cancel，及 chooseDifficulty/control。统一走现有系统。
- Resolver：Default → Skin → Map → Event，分层合并 tokens/components。事件移除时重新计算下层上下文，不复制/销毁下层主题。继承循环有保护，缺失 ID 有可定位日志。

## 7–8. 三套实际布局差异

| 包 | HUD DOM | 桌面结构 | 开始/结束/控制器 |
| --- | --- | --- | --- |
| Default | div.scoreboard | 顶部紧凑分数、中央棋盘 | 原极简组件 |
| Creator | aside + dl 参数表 | 全宽标题/设置、左参数侧栏、右世界区 | 终端准备卡、参数结算表、分区控制器 |
| Subscriber 001 | section + 本局/最高分构图 | 角色/分数独立区域、世界/设置区域 | 现有黑猫图、独立开始/结算模板、暖红控制器细节 |

三套具有不同的实际区域 DOM 和 HUD/Start/GameOver/Controller 模板，不是只换颜色。未重切、重生成或重注册 Subscriber 001；兑换与资源仍使用此前实现。未专门定制的 Pause/Modal/Selector/Viewport 等槽继承 Default，验证复用而不是复制。

## 9–10. 后续接入与覆盖

新增完整主题：资源/Appearance → UITheme → Layout/专属组件 → 可选控制器/技能展示 → ThemePack → 现有 Skin 关联 → main.js 注册。已有能力与技能通过 Mechanic/SkillSet 引用；组件不写玩法。仅新增外观的皮肤可不提供完整 Pack。

地图可声明 themeOverlay 或沿用 uiThemeId，仅覆盖背景/状态/指定槽；事件用 theme:event:start/end 临时覆盖。BREAK→OUTSIDE 保持 Creator 装备、HUD、控制器和技能快照，结束覆盖后恢复。娱乐线只使用 run:cheat 事件上下文，不进入皮肤列表。触发条件未修改。

未来卡牌式 HUD、抽牌按钮外观、角色卡预览、独立 Start/GameOver 可以新增组件与展示注册，不改 Snake/碰撞/循环。真正新增引擎原语应单独评估；本轮不承诺任意新玩法都无需引擎工作。第三方素材接入前须确认授权。

## 11–12. 存档与输入

SaveService、ProfileService、RedeemService、storage/ 均无改动；canonical key 仍是 snake.save.v1，不新增用户 Theme ID 字段。权益、发现记录、装备、正常/辅助/作弊成绩、地图记录保留。旧 bestScore 与皮肤/地图迁移仍有效；失效皮肤的存档引用保留，只在运行时回退 Default。

输入仍由原 Input 与同一个 UISystem Action Router 处理。D-Pad / BUTTON_B / BUTTON_A / BUTTON_FUNC 协议不变。完整装备切换在 READY/GAME_OVER 允许，RUNNING/PAUSED/MODAL/TRANSITION 由 UI 与 SkinSystem 双重拒绝；开局冻结 Skin/Mechanic/SkillSet。GAME_OVER 换主题不重置分数。

额外修复：关闭模态框时释放隐藏控件焦点，保证验证后 Space 可继续；验证成功仍返回 PAUSED，绝不自动运行。

## 13. 响应式和移动端

Chromium 实际运行三套布局 × 1440/1024/768/390/320px 共 15 个组合。均无横向溢出，HUD 不覆盖棋盘，cellSize 在 12–32 CSS px 范围。Creator 在手机变成参数条。390/320px 的 D-Pad、两个技能键和 FUNC 均满足至少 44×44，实际 tap 可操作。

补测模拟高度从 1000px 变 700px，暂停位置/计时不变，FUNC 滚动后能命中。原 viewport-fit=cover、dvh/vh 回退与 safe-area padding 保留。使用 CDP 注入真实触控滑动，轻点不转向，上滑按阈值转向；网页其他区域不增加全局触控拦截。

限制：这是桌面 Chrome 的移动/触控模拟，未做 iPhone Safari 真机测试。原始 CDP 滑动与 Playwright tap 混用曾出现下一次模拟触摸没有合成 click；手势测试按独立浏览器上下文隔离，不能据此宣称真机事件兼容已获认证。

## 14. 实际测试与异常/性能

可复跑脚本：tests/theme-contract.test.mjs、tests/theme-browser.cjs。浏览器 runner 只在测试响应中注入读取系统的句柄，生产没有测试全局或 debug 开关。BREAK、碰撞、成绩使用确定性边界 fixture，再执行实际 tick/hook/状态机；不是手工游玩获得 50 分。

| 验证项 | 结果 |
| --- | --- |
| Node 契约测试 | 13/13 通过（含 Atlas 比例与娱乐线边界资格隔离） |
| 首页直达、原生 Start、箭头/WASD、180° 保护 | 通过 |
| Space 暂停/继续、暂停位置与计时、R、Replay、难度 | 通过 |
| 三套独立 HUD/Start/结算、同一分数/长度/时间 | 通过 |
| 已发现且拥有才展示、兑换原码、自动装备、刷新持久化 | 通过 |
| 禁止状态换皮肤、不可变本局规则快照 | 通过 |
| Konami、错误重试/ESC、mario、成功仍暂停 | 通过 |
| Cheat 穿墙/自撞不死/双倍分、独立最高分、新局关闭 | 通过 |
| Creator BREAK 奖励、弱墙过渡、长度扣除、Outside camera | 通过 |
| 地图保留 HUD、事件替换组件、结束精确恢复 | 通过 |
| 缺失主题/布局/组件/资源，组件 mount/异步加载失败 | 安全回退并记录预期日志 |
| 异步成功、dispose/AbortSignal、失效加载取消 | 通过 |
| Unsupported mobile layout、继承循环、缺失技能注册 | 契约回退通过 |
| 24 次主题切换 | Canvas 身份不变；12 槽；总线/原生监听数不增加 |
| 暂停稳定快照 | 350ms 观察无 DOM mutation、无组件重挂载 |
| 资源 | Promise 缓存去重、owner 释放；无主缓存有界（32） |
| 旧存档、消失皮肤引用、正常/作弊 best | 保留并正确回退 |
| 未处理浏览器错误 | 0；故意缺资源/异常组件有预期日志 |

另运行此前 UI reduction 回归脚本，桌面与触控用例通过。未新增音效/特效文件，source.png 不作为 UI 预览资源传输，无外部 UI 框架/字体/广告/追踪。资源计数、监听器和节点稳定性已检查，但不把这些等同于长时运行的堆内存取样或真机性能认证。

## 15. 修改文件

全部限定 games/snake/：

```text
ARCHITECTURE.md, THEME_PACK_ACCEPTANCE.md
index.html, main.js, styles.css, themes.css
content/appearances.js, controllerStyles.js, layoutVariants.js
content/skillPresentations.js, skillSets.js, themePacks.js, skins.js, uiThemes.js
systems/AssetLoader.js, Immutable.js, RenderSystem.js, SkinSystem.js
systems/ThemeContextResolver.js, UISystem.js
ui/ComponentHost.js, ViewModel.js, dom.js
ui/components/default.js, creator.js, subscriber.js, packTemplates.js
tests/theme-contract.test.mjs, theme-browser.cjs
```

## 16–17. Core 与文档

相对本轮开始提交 c432fe6，core/、services/、storage/、首页 index.html、Pages/DNS 配置和 Subscriber 资源无变化。没有理由更改逻辑碰撞、状态机或游戏循环；变动仅限系统适配、主题内容、UI 和测试文档。

ARCHITECTURE.md 新增完整的 Pack/Appearance/Theme/Layout/Component/VM/Actions/Resolver 协议、优先级与恢复、资源与生命周期、响应式控制器、Start/GameOver 最小示例、地图/事件覆写及未来技能展示接入步骤。

## 18–19. 分阶段提交与访问

1. 604bd8f0c51cf64f25028434c868c350bd9d6ba5：协议、分层解析、共享资源（审计/协议阶段）。
2. 9f08d981e16f85cbd0d272b7a84695fdf3456e06：VM/Actions 与 Default 组件迁移。
3. 4a072f093ae386886e0733a37935c0e3f0042f3d：Creator/Subscriber 独立布局、地图/事件验证及焦点修复。
4. 测试/文档/旧样式清理在本文件所在的收尾提交；完整 hash 由最终交付回复提供，避免文档自引用哈希问题。

正式地址：https://eluney.cn/games/snake/ 。提交推送后需对正式地址复跑页面/交互检查，部署检查结果以最终交付回复为准。
