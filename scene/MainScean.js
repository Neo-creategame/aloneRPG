class Main extends Phaser.Scene {
  constructor() { super('main'); }

  init(data) {
    this.floor = data && data.floor != null ? data.floor : 0;
    this.carryHp = data && data.hp;
    if (this.floor === 0) { ({ g, rooms } = genTown()); return; }
    let s = SEED_BASE + this.floor, res = genFloor(s);
    while (res.rooms.length < 2) res = genFloor(++s);
    this.seed = s; ({ g, rooms } = res);
  }

  create() {
    this.cameras.main.setBounds(0, 0, W * T, H * T);
    const map = this.add.graphics();
    map.fillStyle(this.floor === 0 ? 0x2f3b2c : 0x222836, 1);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (g[y][x] === 0) map.fillRect(x * T + 1, y * T + 1, T - 2, T - 2);

    this.stairs = null; this.altar = null; this.enemies = []; this.arrows = [];
    this.bossDefeated = this.floor === 0;
    if (this.floor === 0) this.buildTown(); else this.buildDungeon();
    this.bars = this.add.graphics().setDepth(5);
    this.setupPlayer();
  }

  buildTown() {
    const st = { fontFamily: 'system-ui, sans-serif', fontSize: '14px', color: '#e8eaf0' };
    TOWN_SHOPS.forEach(([name, bx, by]) => {
      this.add.rectangle((bx + 3) * T, (by + 2) * T, 6 * T - 2, 4 * T - 2, 0x4a3f35).setStrokeStyle(2, 0x8a7a66);
      this.add.text((bx + 3) * T, (by + 2) * T, name, st).setOrigin(0.5);
    });
    this.stairs = { x: 36 * T + T / 2, y: 22 * T + T / 2 };
    this.add.circle(this.stairs.x, this.stairs.y, 16, 0x7c5cff).setStrokeStyle(2, 0xffffff);
    this.add.text(this.stairs.x, this.stairs.y - 30, `${SAVE.cleared + 1}F 入口`, st).setOrigin(0.5);
    this.altar = { x: 20 * T + T / 2, y: 14 * T + T / 2 };
    this.add.rectangle(this.altar.x, this.altar.y, 20, 20, 0x4fd1c5).setAngle(45).setStrokeStyle(2, 0xffffff);
    this.add.text(this.altar.x, this.altar.y - 28, 'ステータス台', st).setOrigin(0.5);
  }

  buildDungeon() {
    const ctr = o => ({ x: (o.x + (o.w >> 1)) * T + T / 2, y: (o.y + (o.h >> 1)) * T + T / 2 });
    const s0 = ctr(rooms[0]), dist0 = o => Math.hypot(ctr(o).x - s0.x, ctr(o).y - s0.y);
    const bossRoom = rooms.slice(1).reduce((a, b) => dist0(b) > dist0(a) ? b : a);
    this.stairs = ctr(bossRoom);

    this.stairGraphic = this.add.rectangle(this.stairs.x, this.stairs.y, 22, 22, 0x666666).setStrokeStyle(2, 0xaaaaaa);
    this.stairText = this.add.text(this.stairs.x, this.stairs.y, '↑', { fontFamily: 'system-ui, sans-serif', fontSize: '16px', color: '#1d2230' }).setOrigin(0.5);

    const eh = Math.round(ENEMY.hp * (1 + 0.25 * (this.floor - 1)));
    this.enemies = [];

    const bossHp = Math.round(BOSS_STATS.hp * (1 + 0.3 * (this.floor - 1)));
    const bossAtk = Math.round(BOSS_STATS.touchDmg * (1 + 0.2 * (this.floor - 1)));
    this.enemies.push({
      c: this.add.circle(this.stairs.x, this.stairs.y, BOSS_STATS.r, 0x9b59b6).setStrokeStyle(3, 0xf1c40f),
      hp: bossHp, max: bossHp, isBoss: true, touchDmg: bossAtk, r: BOSS_STATS.r, speed: BOSS_STATS.speed, aggro: BOSS_STATS.aggro
    });

    rooms.slice(1).forEach(rm => {
      const n = 2 + Math.floor(Math.random() * 2);
      for (let i = 0; i < n; i++) {
        const tx = rm.x + 1 + Math.floor(Math.random() * (rm.w - 2));
        const ty = rm.y + 1 + Math.floor(Math.random() * (rm.h - 2));
        this.enemies.push({
          c: this.add.circle(tx * T + T / 2, ty * T + T / 2, ENEMY.r, 0xe5534b),
          hp: eh, max: eh, isBoss: false, touchDmg: ENEMY.touchDmg, r: ENEMY.r, speed: ENEMY.speed, aggro: ENEMY.aggro
        });
      }
    });
  }

  setupPlayer() {
    const r0 = rooms[0];
    this.start = { x: (r0.x + (r0.w >> 1)) * T + T / 2, y: (r0.y + (r0.h >> 1)) * T + T / 2 };
    this.p = this.add.circle(this.start.x, this.start.y, 11, 0x6fb6ff).setDepth(2);
    this.hp = this.floor === 0 ? maxHp() : (this.carryHp || maxHp());
    this.inv = this.time.now + 800;
    this.dodge = null; this.dodgeUntil = 0; this.nextDodge = 0; this.leaving = false;
    this.cameras.main.fadeIn(300);
    this.fx = this.add.graphics();
    this.aim = this.add.graphics();
    this.cameras.main.startFollow(this.p, true, 0.12, 0.12);

    this.keys = this.input.keyboard.addKeys({
      up: 'W', down: 'S', left: 'A', right: 'D',
      up2: 'UP', down2: 'DOWN', left2: 'LEFT', right2: 'RIGHT',
      atk: 'SPACE', skill: 'E', reroll: 'T', bag: 'I', dodge: 'SHIFT', use: 'F', pause: 'TAB'
    });
    this.input.on('pointerdown', () => this.attack());
    this.nextAtk = 0; this.nextSkill = 0; this.ang = 0;
    this.hud = this.add.text(10, 10, '', {
      fontFamily: 'system-ui, sans-serif', fontSize: '14px', color: '#e8eaf0',
      backgroundColor: 'rgba(14,16,21,0.75)', padding: { x: 8, y: 6 }
    }).setScrollFactor(0).setDepth(10);
  }

  update(t, dt) {
    const k = this.keys, p = this.p, cam = this.cameras.main, now = this.time.now;
    if (Phaser.Input.Keyboard.JustDown(k.pause) && !this.leaving) { this.scene.pause(); this.scene.launch('pause', { floor: this.floor }); return; }
    const dx = (k.right.isDown || k.right2.isDown) - (k.left.isDown || k.left2.isDown);
    const dy = (k.down.isDown || k.down2.isDown) - (k.up.isDown || k.up2.isDown);
    if (Phaser.Input.Keyboard.JustDown(k.dodge) && !this.dodge && now >= this.nextDodge && !this.leaving) {
      let ux = dx, uy = dy;
      if (!ux && !uy) { ux = Math.cos(this.ang); uy = Math.sin(this.ang); }
      const m = Math.hypot(ux, uy);
      this.dodge = { vx: ux / m, vy: uy / m, end: now + DODGE.time };
      this.dodgeUntil = now + DODGE.time + DODGE.grace;
      this.nextDodge = now + DODGE.cd;
    }
    if (this.dodge) {
      const v = DODGE.dist / DODGE.time * (Math.min(dt, 50) / 1000);
      const nx = p.x + this.dodge.vx * v, ny = p.y + this.dodge.vy * v;
      if (free(nx, p.y, 11)) p.x = nx;
      if (free(p.x, ny, 11)) p.y = ny;
      const gh = this.add.circle(p.x, p.y, 11, 0x6fb6ff, 0.4).setDepth(1);
      this.tweens.add({ targets: gh, alpha: 0, duration: 250, onComplete: () => gh.destroy() });
      if (now >= this.dodge.end) this.dodge = null;
    } else if ((dx || dy) && !this.leaving) {
      const v = 190 * (dt / 1000) / Math.hypot(dx, dy);
      const nx = p.x + dx * v, ny = p.y + dy * v;
      if (free(nx, p.y, 11)) p.x = nx;
      if (free(p.x, ny, 11)) p.y = ny;
    }
    const ptr = this.input.activePointer;
    this.ang = Math.atan2(ptr.y + cam.scrollY - p.y, ptr.x + cam.scrollX - p.x);
    this.aim.clear().lineStyle(2, 0xffffff, 0.5).lineBetween(p.x, p.y, p.x + Math.cos(this.ang) * 20, p.y + Math.sin(this.ang) * 20);

    if (Phaser.Input.Keyboard.JustDown(k.atk)) this.attack();
    if (Phaser.Input.Keyboard.JustDown(k.skill)) this.skill();
    if (Phaser.Input.Keyboard.JustDown(k.reroll)) weapon = rollWeapon(weapon.type);
    if (Phaser.Input.Keyboard.JustDown(k.bag) && !this.leaving) { this.scene.pause(); this.scene.launch('backpack'); return; }
    this.updateArrows(dt);
    const nearStairs = Math.hypot(p.x - this.stairs.x, p.y - this.stairs.y) < 24;
    if (nearStairs && Phaser.Input.Keyboard.JustDown(k.use) && !this.leaving && this.bossDefeated) this.goUp();
    const nearAltar = this.altar && Math.hypot(p.x - this.altar.x, p.y - this.altar.y) < 28;
    if (nearAltar && Phaser.Input.Keyboard.JustDown(k.use) && !this.leaving) { this.scene.pause(); this.scene.launch('stats'); }

    for (const e of this.enemies) {
      const ex = p.x - e.c.x, ey = p.y - e.c.y, d = Math.hypot(ex, ey);
      if (d < e.aggro && d > 1) {
        const v = e.speed * (dt / 1000) / d;
        const nx = e.c.x + ex * v, ny = e.c.y + ey * v;
        if (free(nx, e.c.y, e.r)) e.c.x = nx;
        if (free(e.c.x, ny, e.r)) e.c.y = ny;
      }
      if (d < 11 + e.r && now > this.inv && now > this.dodgeUntil) {
        this.hp -= takeDamage(e.touchDmg);
        reduceArmorDurability();
        this.inv = now + 600;
      }
    }
    if (this.hp <= 0) {
      this.hp = maxHp(); p.setPosition(this.start.x, this.start.y); this.inv = now + 1500;
    }
    p.setAlpha(this.dodge || now < this.dodgeUntil ? 0.35 : now < this.inv ? 0.5 : 1);
    this.bars.clear();
    for (const e of this.enemies) {
      const bx = e.c.x - (e.isBoss ? 20 : 14), by = e.c.y - (e.isBoss ? 28 : 20);
      const bw = e.isBoss ? 40 : 28;
      this.bars.fillStyle(0x000000, 0.6).fillRect(bx, by, bw, 4);
      this.bars.fillStyle(e.isBoss ? 0x9b59b6 : 0xe5534b, 1).fillRect(bx, by, bw * e.hp / e.max, 4);
    }

    if (this.stairGraphic && this.bossDefeated) {
      this.stairGraphic.setFillStyle(0xffd36a);
    }

    const cd = Math.max(0, this.nextSkill - now), dcd = Math.max(0, this.nextDodge - now);
    const stairMsg = this.floor === 0 ? `▲ 入口:[F]で${SAVE.cleared + 1}Fへ入る` :
                     this.bossDefeated ? `▲ 階段:[F]で${this.floor + 1}Fへ上る` : `▲ ボスを倒すと階層が進みます`;
    this.hud.setText([
      `${this.floor === 0 ? '町' : `${this.floor}F  シード ${this.seed}`}  HP ${Math.max(0, this.hp)}/${maxHp()}  敵の残り ${this.enemies.length}体`,
      `Lv ${PLAYER.lv}  EXP ${PLAYER.exp}/${expNeed(PLAYER.lv)}  ポイント ${PLAYER.pts}`,
      `${weapon.name}  攻撃力 ${atkTotal()}(武器${effectiveWeaponAtk()}+振り分け${PLAYER.atkPts * ATK_PER_PT}) 耐久:${weapon.dur}/${weapon.durMax}`,
      `${weapon.skill.name}[E] ${cd ? `あと${(cd / 1000).toFixed(1)}秒` : '使える'}`,
      `回避[Shift] ${dcd ? `あと${(dcd / 1000).toFixed(1)}秒` : '使える'}`,
      ...armorLines(),
      ...(nearStairs ? [stairMsg] : []),
      ...(nearAltar ? ['✦ ステータス台:[F]でポイントを振る'] : [])
    ]);
  }

  goUp() {
    if (this.floor > 0) SAVE.cleared = Math.max(SAVE.cleared, this.floor);
    this.travel(this.floor === 0 ? SAVE.cleared + 1 : this.floor + 1);
  }

  travel(floor) {
    this.leaving = true;
    const cam = this.cameras.main;
    cam.fadeOut(300);
    cam.once('camerafadeoutcomplete', () => this.scene.restart({ floor, hp: this.hp }));
  }

  attack() {
    const n = this.time.now;
    if (n < this.nextAtk || this.dodge || this.leaving) return;
    this.nextAtk = n + weapon.cd;
    reduceWeaponDurability();
    BEHAVIORS[weapon.type].attack(this, atkTotal());
  }

  skill() {
    const n = this.time.now;
    if (n < this.nextSkill || this.dodge || this.leaving) return;
    this.nextSkill = n + weapon.skill.cd;
    reduceWeaponDurability();
    BEHAVIORS[weapon.type].skill(this, atkTotal());
  }

  giveArmor(slot) {
    const it = rollArmor(slot, this.floor);
    if (!addToPack(it)) { this.popup('バッグが満杯です', '#a0a7b8'); return; }
    this.popup(`入手:${armorLabel(it)}`, '#7cf0a0');
  }

  giveWeapon() {
    const type = WEAPON_TYPES[Math.floor(Math.random() * WEAPON_TYPES.length)];
    const w = rollWeapon(type);
    if (!addToPack(w)) { this.popup('バッグが満杯です', '#a0a7b8'); return; }
    this.popup(`入手武器:${w.name}(攻${w.atk})`, '#ffd36a');
  }

  popup(text, color) {
    const t = this.add.text(this.p.x, this.p.y - 36, text, { fontFamily: 'system-ui, sans-serif', fontSize: '14px', color }).setOrigin(0.5).setDepth(6);
    this.tweens.add({ targets: t, y: t.y - 36, alpha: 0, duration: 1600, onComplete: () => t.destroy() });
  }

  gainExp(n) {
    PLAYER.exp += n;
    while (PLAYER.exp >= expNeed(PLAYER.lv)) {
      PLAYER.exp -= expNeed(PLAYER.lv); PLAYER.lv++; PLAYER.pts++;
      const t = this.add.text(this.p.x, this.p.y - 30, `LEVEL UP! Lv${PLAYER.lv}`, { fontFamily: 'system-ui, sans-serif', fontSize: '18px', color: '#7cf0a0' }).setOrigin(0.5).setDepth(6);
      this.tweens.add({ targets: t, y: t.y - 40, alpha: 0, duration: 1200, onComplete: () => t.destroy() });
    }
  }

  strike(a, half, r, dmg, col) {
    this.wedge(a, half, r, col);
    const p = this.p;
    for (const e of this.enemies) {
      const dx = e.c.x - p.x, dy = e.c.y - p.y;
      if (Math.hypot(dx, dy) > r + e.r) continue;
      if (half < Math.PI && Math.abs(angDiff(Math.atan2(dy, dx), a)) > half) continue;
      this.damage(e, dmg);
    }
    this.enemies = this.enemies.filter(e => e.hp > 0);
  }

  damage(e, dmg) {
    if (e.hp <= 0) return;
    e.hp -= dmg;
    const t = this.add.text(e.c.x, e.c.y - 24, String(dmg), { fontFamily: 'system-ui, sans-serif', fontSize: '16px', color: '#ffe08a' }).setOrigin(0.5).setDepth(6);
    this.tweens.add({ targets: t, y: t.y - 30, alpha: 0, duration: 600, onComplete: () => t.destroy() });
    if (e.hp <= 0) {
      e.c.destroy();
      this.gainExp((EXP_PER_KILL + 10 * this.floor) * (e.isBoss ? 3 : 1));
      if (e.isBoss) {
        this.bossDefeated = true;
        this.popup('BOSS撃破! 階段が解放されました', '#ffd36a');
        if (Math.random() < BOSS_WEAPON_DROP_RATE) {
          this.giveWeapon();
        }
      }
      if (Math.random() < DROP_RATE) this.giveArmor(randomSlot());
    }
  }

  shoot(a, dmg) {
    const p = this.p;
    const o = this.add.rectangle(p.x, p.y, 14, 3, 0xe9d8a6).setRotation(a).setDepth(1);
    this.arrows.push({ o, vx: Math.cos(a) * weapon.speed, vy: Math.sin(a) * weapon.speed, left: weapon.range, dmg });
  }

  updateArrows(dt) {
    const s = Math.min(dt, 50) / 1000;
    this.arrows = this.arrows.filter(r => {
      const dx = r.vx * s, dy = r.vy * s;
      r.o.x += dx; r.o.y += dy; r.left -= Math.hypot(dx, dy);
      const hit = this.enemies.find(e => e.hp > 0 && Math.hypot(e.c.x - r.o.x, e.c.y - r.o.y) < e.r + 4);
      if (hit) this.damage(hit, r.dmg);
      const gone = hit || r.left <= 0 || solid(r.o.x, r.o.y);
      if (gone) r.o.destroy();
      return !gone;
    });
    this.enemies = this.enemies.filter(e => e.hp > 0);
  }

  wedge(a, half, r, col) {
    const p = this.p, f = this.add.graphics();
    f.clear().fillStyle(col, 0.35).lineStyle(2, col, 0.9).beginPath().moveTo(p.x, p.y);
    for (let i = 0; i <= 16; i++) {
      const q = a - half + half * 2 * i / 16;
      f.lineTo(p.x + Math.cos(q) * r, p.y + Math.sin(q) * r);
    }
    f.closePath().fillPath().strokePath();
    this.time.delayedCall(130, () => f.destroy());
  }
}
