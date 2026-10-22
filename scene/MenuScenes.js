class MenuScene extends Phaser.Scene {
  btn(x, y, label, fn, on = true) {
    const t = this.add.text(x, y, label, { fontFamily: 'system-ui, sans-serif', fontSize: '18px', color: on ? '#ffffff' : '#8a93a8', backgroundColor: '#2a3142', padding: { x: 14, y: 8 } }).setOrigin(0.5);
    if (on) t.setInteractive({ useHandCursor: true }).on('pointerdown', fn);
    this.items.push(t);
  }
  close() { this.scene.resume('main'); this.scene.stop(); }
}

class StatScene extends MenuScene {
  constructor() { super('stats'); }
  create() {
    this.add.rectangle(this.scale.width / 2, this.scale.height / 2, this.scale.width, this.scale.height, 0x000000, 0.65);
    this.items = [];
    this.input.keyboard.addKey('ESC').on('down', () => this.close());
    this.render();
  }
  spend(key) {
    if (PLAYER.pts <= 0) return;
    PLAYER.pts--; PLAYER[key]++;
    this.scene.get('main').hp = maxHp();
    this.render();
  }
  render() {
    this.items.forEach(o => o.destroy()); this.items = [];
    const cx = this.scale.width / 2, has = PLAYER.pts > 0;
    this.btn(cx, 80, `ステータス台  Lv ${PLAYER.lv}  EXP ${PLAYER.exp}/${expNeed(PLAYER.lv)}  残りポイント ${PLAYER.pts}`, null, false);
    this.btn(cx - 130, 180, `最大HP  ${maxHp()}`, null, false);
    this.btn(cx + 130, 180, `+1  (最大HP +${HP_PER_PT})`, () => this.spend('hpPts'), has);
    this.btn(cx - 130, 250, `攻撃力ボーナス  +${PLAYER.atkPts * ATK_PER_PT}`, null, false);
    this.btn(cx + 130, 250, `+1  (攻撃力 +${ATK_PER_PT})`, () => this.spend('atkPts'), has);
    this.btn(cx, 340, '閉じる', () => this.close());
  }
}

class PauseScene extends MenuScene {
  constructor() { super('pause'); }
  init(data) { this.floor = data.floor; this.page = 0; }
  create() {
    this.add.rectangle(this.scale.width / 2, this.scale.height / 2, this.scale.width, this.scale.height, 0x000000, 0.65);
    this.keyTab = this.input.keyboard.addKey('TAB');
    this.t0 = this.time.now; this.items = [];
    this.show('top');
  }
  update() {
    if (this.time.now - this.t0 > 250 && Phaser.Input.Keyboard.JustDown(this.keyTab)) this.close();
  }
  show(mode) {
    this.items.forEach(o => o.destroy()); this.items = [];
    const cx = this.scale.width / 2, cleared = SAVE.cleared;
    this.btn(cx, 90, `ポーズ中  攻略済み:${cleared}F  (Tabで再開)`, null, false);
    if (mode === 'top') {
      this.btn(cx, 190, '町へ戻る', () => this.go(0), this.floor !== 0);
      this.btn(cx, 250, '攻略済みの階層を選ぶ', () => this.show('floors'), cleared > 0);
      this.btn(cx, 310, '再開', () => this.close());
      return;
    }
    const per = 6, pages = Math.ceil(cleared / per);
    for (let i = 0; i < per; i++) {
      const f = this.page * per + i + 1;
      if (f > cleared) break;
      this.btn(cx - 110 + (i % 2) * 220, 170 + Math.floor(i / 2) * 60, `${f}F`, () => this.go(f));
    }
    if (this.page > 0) this.btn(cx - 150, 390, '◀', () => { this.page--; this.show('floors'); });
    this.btn(cx, 390, '戻る', () => this.show('top'));
    if (this.page + 1 < pages) this.btn(cx + 150, 390, '▶', () => { this.page++; this.show('floors'); });
  }
  go(floor) { const m = this.scene.get('main'); this.close(); m.travel(floor); }
}

const itemColor = it => it.slot === 'weapon' ? 0xc9a24a : TIER_COLORS[it.tier];
const itemChar = it => it.slot === 'weapon' ? it.name[0] : ARMOR_TYPES[it.slot].slot;
const itemInfo = it => it.slot === 'weapon' ? `${it.name}  攻撃力 ${it.atk}  スキル:${it.skill.name}` : armorLabel(it);

class BackpackScene extends MenuScene {
  constructor() { super('backpack'); }
  create() {
    const w = this.scale.width, h = this.scale.height, st = { fontFamily: 'system-ui, sans-serif', fontSize: '14px', color: '#e8eaf0' };
    this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.7);
    this.slots = [
      ...BACKPACK.map((_, i) => ({ kind: 'pack', key: i, x: 92 + (i % PACK_COLS) * 70, y: 140 + Math.floor(i / PACK_COLS) * 70 })),
      ...SLOT_ORDER.map((s, i) => ({ kind: 'eq', key: s, x: 520, y: 110 + i * 70 }))
    ];
    const g = this.add.graphics().lineStyle(2, 0x596072, 1).fillStyle(0x1d2230, 1);
    this.slots.forEach(s => g.fillRect(s.x - 32, s.y - 32, 64, 64).strokeRect(s.x - 32, s.y - 32, 64, 64));
    SLOT_ORDER.forEach((s, i) => this.add.text(562, 110 + i * 70, s === 'weapon' ? '武器' : ARMOR_TYPES[s].slot, st).setOrigin(0, 0.5));
    this.head = this.add.text(60, 40, '', st);
    this.infoText = this.add.text(60, 398, '', { ...st, wordWrap: { width: 400 } });
    this.noteText = this.add.text(60, 478, '', { ...st, color: '#ff9a8a' });
    this.add.text(w / 2, 515, 'ドラッグで装備・外す・入れ替え(武器はバッグ内の武器と交換)/ Esc か I で閉じる', { ...st, color: '#a0a7b8' }).setOrigin(0.5);
    this.items = [];
    this.input.on('drag', (p, o, x, y) => o.setPosition(x, y));
    this.input.on('dragend', (p, o) => this.time.delayedCall(0, () => this.drop(o)));
    this.input.keyboard.addKey('ESC').on('down', () => this.close());
    this.keyI = this.input.keyboard.addKey('I'); this.t0 = this.time.now;
    this.render();
  }
  update() { if (this.time.now - this.t0 > 250 && Phaser.Input.Keyboard.JustDown(this.keyI)) this.close(); }
  get(l) { return l.kind === 'pack' ? BACKPACK[l.key] : getEq(l.key); }
  set(l, it) { if (l.kind === 'pack') BACKPACK[l.key] = it; else setEq(l.key, it); }
  render() {
    this.items.forEach(o => o.destroy()); this.items = [];
    const a = armorStats();
    this.head.setText(`バッグ    防具:最大HP+${a.hp}  ダメージ軽減${(a.red * 100).toFixed(1)}%`);
    this.infoText.setText(''); 
    this.slots.forEach(s => {
      const it = this.get(s); if (!it) return;
      const r = it.dur / it.durMax, col = r > 0.5 ? 0x7cf0a0 : r > 0.2 ? 0xffd36a : 0xe5534b;
      const c = this.add.container(s.x, s.y, [
        this.add.rectangle(0, 0, 56, 56, itemColor(it)),
        this.add.text(0, -8, itemChar(it), { fontFamily: 'system-ui, sans-serif', fontSize: '24px', color: '#ffffff' }).setOrigin(0.5),
        this.add.text(0, 10, String(it.dur), { fontFamily: 'system-ui, sans-serif', fontSize: '11px', color: '#ffffff' }).setOrigin(0.5),
        this.add.rectangle(-26, 23, 52, 5, 0x000000, 0.6).setOrigin(0, 0.5),
        this.add.rectangle(-26, 23, 52 * r, 5, col).setOrigin(0, 0.5)
      ]).setSize(56, 56).setData('loc', s);
      c.setInteractive(); this.input.setDraggable(c);
      c.on('pointerover', () => this.infoText.setText([itemInfo(it), `耐久 ${it.dur}/${it.durMax}`]));
      c.on('pointerout', () => this.infoText.setText(''));
      c.on('dragstart', () => c.setDepth(10));
      this.items.push(c);
    });
  }
  drop(o) {
    const src = o.getData('loc'), dst = this.slots.find(s => Math.abs(o.x - s.x) <= 32 && Math.abs(o.y - s.y) <= 32);
    if (dst && dst !== src) this.move(src, dst);
    this.render();
  }
  move(src, dst) {
    const a = this.get(src), b = this.get(dst);
    const fits = (l, it) => !it || l.kind === 'pack' || it.slot === l.key;
    if (!fits(dst, a) || !fits(src, b)) return this.noteText.setText('その部位には装備できません');
    if (src.kind === 'eq' && src.key === 'weapon' && !b) return this.noteText.setText('武器は外せません。バッグの別の武器と入れ替えてください');
    this.set(src, b); this.set(dst, a);
    const m = this.scene.get('main'); m.hp = Math.min(m.hp, maxHp());
    this.noteText.setText('');
  }
}
