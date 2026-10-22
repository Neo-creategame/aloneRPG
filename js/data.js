// ---- プレイヤー成長データ ----
const PLAYER = { lv: 1, exp: 0, pts: 0, hpPts: 0, atkPts: 0 };

// ---- 武器定義 & ロジック ----
const WEAPONS = {
  sword: { name: '片手剣', base: 100, cd: 350, range: 64, skill: { name: '回転斬り', cd: 3000 } },
  dual: { name: '双剣', base: 50, cd: 280, range: 50, skill: { name: '乱舞', cd: 3000 } },
  bow: { name: '弓', base: 110, cd: 500, range: 440, speed: 560, skill: { name: '三連射', cd: 3000 } }
};
const WEAPON_TYPES = Object.keys(WEAPONS);

const rollWeapon = type => ({
  type, ...WEAPONS[type], slot: 'weapon', dur: 100, durMax: 100,
  atk: Math.round(WEAPONS[type].base * (0.8 + Math.random() * 0.4))
});

let weapon = rollWeapon('sword');

const BEHAVIORS = {
  sword: {
    attack: (s, dmg) => s.strike(s.ang, Math.PI * 0.55, weapon.range, dmg, 0xffffff),
    skill: (s, dmg) => s.strike(0, Math.PI, 86, Math.round(dmg * 1.5), 0xffd36a)
  },
  dual: {
    attack: (s, dmg) => {
      s.strike(s.ang, Math.PI * 0.4, weapon.range, dmg, 0xffffff);
      s.time.delayedCall(90, () => s.strike(s.ang, Math.PI * 0.4, weapon.range, dmg, 0xbfe3ff));
    },
    skill: (s, dmg) => {
      for (let i = 0; i < 4; i++) s.time.delayedCall(i * 90, () => s.strike(0, Math.PI, 60, Math.round(dmg * 0.8), 0xffd36a));
    }
  },
  bow: {
    attack: (s, dmg) => s.shoot(s.ang, dmg),
    skill: (s, dmg) => [-0.3, 0, 0.3].forEach(o => s.shoot(s.ang + o, dmg))
  }
};

const effectiveWeaponAtk = () => weapon.dur > 0 ? weapon.atk : Math.floor(weapon.atk * 0.5);
const atkTotal = () => effectiveWeaponAtk() + PLAYER.atkPts * ATK_PER_PT;

// ---- 防具定義 & ロジック ----
const ARMOR_TYPES = {
  helmet: { slot: '兜', name: 'ヘルム', hp: 12, red: 0.02 },
  chest: { slot: '胸', name: 'チェストプレート', hp: 30, red: 0.05 },
  legs: { slot: '脚', name: 'レギンス', hp: 18, red: 0.03 },
  shoes: { slot: '靴', name: 'シューズ', hp: 8, red: 0.015 }
};
const SLOT_KEYS = Object.keys(ARMOR_TYPES);
const TIERS = [{ name: 'ブロンズ', mult: 1 }, { name: 'アイアン', mult: 1.7 }, { name: 'スチール', mult: 2.5 }, { name: 'ミスリル', mult: 3.5 }];
const ARMOR_ROLL = [0.8, 1.2], RED_CAP = 0.6, DROP_RATE = 0.2, FLOORS_PER_TIER = 3;
const EQUIPPED = Object.fromEntries(SLOT_KEYS.map(s => [s, null]));

const randomSlot = () => SLOT_KEYS[Math.floor(Math.random() * SLOT_KEYS.length)];
const tierFor = floor => Math.min(TIERS.length - 1, Math.floor((Math.max(1, floor) - 1) / FLOORS_PER_TIER) + (Math.random() < 0.15 ? 1 : 0));

const rollArmor = (slot, floor) => {
  const t = ARMOR_TYPES[slot], ti = tierFor(floor);
  const roll = ARMOR_ROLL[0] + Math.random() * (ARMOR_ROLL[1] - ARMOR_ROLL[0]);
  const depth = 1 + 0.05 * Math.max(0, floor - TIERS.length * FLOORS_PER_TIER);
  const m = TIERS[ti].mult * roll * depth;
  return { slot, tier: ti, label: `${TIERS[ti].name}${t.name}`, hp: Math.round(t.hp * m), red: Math.round(t.red * m * 1000) / 1000, dur: 50 + 25 * ti, durMax: 50 + 25 * ti };
};

const armorStats = () => {
  let hp = 0, red = 0;
  for (const it of Object.values(EQUIPPED)) if (it && it.dur > 0) { hp += it.hp; red += it.red; }
  return { hp, red: Math.min(red, RED_CAP) };
};

const maxHp = () => PLAYER_HP + PLAYER.hpPts * HP_PER_PT + armorStats().hp;
const takeDamage = d => Math.max(1, Math.round(d * (1 - armorStats().red)));
const armorLabel = it => `${it.label}(HP+${it.hp} 軽減${(it.red * 100).toFixed(1)}%)`;

// ---- バックパック管理 ----
const PACK_COLS = 5, PACK_ROWS = 4, SLOT_ORDER = ['weapon', ...SLOT_KEYS];
const BACKPACK = Array(PACK_COLS * PACK_ROWS).fill(null);
BACKPACK[0] = rollWeapon('dual'); BACKPACK[1] = rollWeapon('bow');

const addToPack = it => { const i = BACKPACK.indexOf(null); if (i < 0) return false; BACKPACK[i] = it; return true; };
const getEq = s => s === 'weapon' ? weapon : EQUIPPED[s];
const setEq = (s, it) => { if (s === 'weapon') weapon = it; else EQUIPPED[s] = it; };
const armorLines = () => [`防具 最大HP+${armorStats().hp}  軽減${(armorStats().red * 100).toFixed(1)}%`, ...SLOT_KEYS.map(s => `  ${ARMOR_TYPES[s].slot}:${EQUIPPED[s] ? armorLabel(EQUIPPED[s]) : 'なし'}`)];

function reduceArmorDurability() {
  for (const s of SLOT_KEYS) {
    if (EQUIPPED[s] && EQUIPPED[s].dur > 0) {
      EQUIPPED[s].dur = Math.max(0, EQUIPPED[s].dur - 1);
    }
  }
}

function reduceWeaponDurability() {
  if (weapon && weapon.dur > 0) {
    weapon.dur = Math.max(0, weapon.dur - 1);
  }
}
