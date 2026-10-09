import { CONFIG } from './config.js';
// Execution stays in UISystem's existing skill router; presentation is independent.
export const skillSets = [{id:'default',slots:{BUTTON_B:CONFIG.skills.brake,BUTTON_A:CONFIG.skills.boost}}];
