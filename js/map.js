// ---- マップ生成 ----
let g, rooms;

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function genFloor(seed) {
  const r = rng(seed);
  const g = Array.from({ length: H }, () => Array(W).fill(1));
  const rooms = [];
  for (let i = 0; i < 80 && rooms.length < 9; i++) {
    const w = 5 + Math.floor(r() * 7), h = 4 + Math.floor(r() * 5);
    const x = 1 + Math.floor(r() * (W - w - 2)), y = 1 + Math.floor(r() * (H - h - 2));
    if (rooms.some(o => x < o.x + o.w + 1 && x + w + 1 > o.x && y < o.y + o.h + 1 && y + h + 1 > o.y)) continue;
    rooms.push({ x, y, w, h });
    for (let j = y; j < y + h; j++) for (let k = x; k < x + w; k++) g[j][k] = 0;
  }
  const c = o => [o.x + (o.w >> 1), o.y + (o.h >> 1)];
  for (let i = 1; i < rooms.length; i++) {
    const [ax, ay] = c(rooms[i - 1]), [bx, by] = c(rooms[i]);
    for (let x = Math.min(ax, bx); x <= Math.max(ax, bx); x++) g[ay][x] = 0;
    for (let y = Math.min(ay, by); y <= Math.max(ay, by); y++) g[y][bx] = 0;
  }
  return { g, rooms };
}

function genTown() {
  const t = Array.from({ length: H }, (_, y) => Array.from({ length: W }, (_, x) => (x === 0 || y === 0 || x === W - 1 || y === H - 1 ? 1 : 0)));
  TOWN_SHOPS.forEach(([, bx, by]) => { for (let y = by; y < by + 4; y++) for (let x = bx; x < bx + 6; x++) t[y][x] = 1; });
  return { g: t, rooms: [{ x: 17, y: 19, w: 6, h: 6 }] };
}

const solid = (x, y) => {
  const tx = Math.floor(x / T), ty = Math.floor(y / T);
  return tx < 0 || ty < 0 || tx >= W || ty >= H || g[ty][tx] === 1;
};
const free = (x, y, r) => !(solid(x - r, y - r) || solid(x + r, y - r) || solid(x - r, y + r) || solid(x + r, y + r));
