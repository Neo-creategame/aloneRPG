// ---- 定数および基本設定 ----
const T = 32, W = 40, H = 30, SEED_BASE = 1000;

const SAVE = { cleared: 0 };
const TOWN_SHOPS = [['お店', 6, 5], ['宿屋', 17, 5], ['鍛冶屋', 28, 5]];

const PLAYER_HP = 100;
const ENEMY = { hp: 300, speed: 90, aggro: 220, r: 10, touchDmg: 8 };
const BOSS_STATS = { hp: 1200, speed: 80, aggro: 260, r: 18, touchDmg: 16 };
const BOSS_WEAPON_DROP_RATE = 0.1;

const HP_PER_PT = 10, ATK_PER_PT = 5, EXP_PER_KILL = 30;
const expNeed = lv => 50 + 25 * (lv - 1);

const DODGE = { dist: 110, time: 180, cd: 900, grace: 120 };
const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

const TIER_COLORS = [0x8a6a4a, 0x9aa5b1, 0x4f8fd1, 0x7cf0d0];
