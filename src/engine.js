/* ===== Abacus engine: classify steps by formula & generate problems ===== */
const FORMULAS = (() => {
  const f = {};
  const m = (n, t) => (f[n] = t);
  [4, 3, 2, 1].forEach((x, i) => m(1 + i, `+${x} = −${5 - x}+5`));
  [4, 3, 2, 1].forEach((x, i) => m(5 + i, `−${x} = −5+${5 - x}`));
  [9, 8, 7, 6, 5, 4, 3, 2, 1].forEach((x, i) => m(9 + i, `+${x} = −${10 - x}+10`));
  [9, 8, 7, 6, 5, 4, 3, 2, 1].forEach((x, i) => m(18 + i, `−${x} = −10+${10 - x}`));
  [9, 8, 7, 6].forEach((x, i) => m(27 + i, `+${x} = −5+${x - 5}+10`));
  [9, 8, 7, 6].forEach((x, i) => m(31 + i, `−${x} = −10−${x - 5}+5`));
  return f;
})();

/* Explanations for each formula (Thai) */
function formulaExplain(n) {
  if (n <= 4) { const x = 5 - n; return `เจอ +${x} ให้ลบ ${5 - x} แล้วเพิ่ม 5 (ลูกบน)`; }
  if (n <= 8) { const x = 9 - n; return `เจอ −${x} ให้ลบ 5 (ลูกบน) แล้วเพิ่ม ${5 - x}`; }
  if (n <= 17) { const x = 18 - n; return `เจอ +${x} ให้ลบ ${10 - x} ที่หลักหน่วย แล้วเพิ่ม 10 ที่หลักสิบ`; }
  if (n <= 26) { const x = 27 - n; return `เจอ −${x} ให้ลบ 10 ที่หลักสิบ แล้วเพิ่ม ${10 - x} ที่หลักหน่วย`; }
  if (n <= 30) { const x = 36 - n; return `เจอ +${x} ให้ลบ 5 เพิ่ม ${x - 5} ที่หลักหน่วย แล้วเพิ่ม 10 ที่หลักสิบ`; }
  const x = 40 - n; return `เจอ −${x} ให้ลบ 10 ที่หลักสิบ แล้วลบ ${x - 5} เพิ่ม 5 ที่หลักหน่วย`;
}

function addCol(dg, col, x, used) {
  if (col >= dg.length) return false;
  const d = dg[col], u = d >= 5, l = d % 5;
  if (x < 5) {
    if (l + x <= 4) { dg[col] = d + x; return true; }
    if (!u) { used.push(5 - x); dg[col] = d + x; return true; }
  } else if (!u && l + (x - 5) <= 4) { dg[col] = d + x; return true; }
  // carry: +x = -(10-x) + 10
  const y = 10 - x;
  const direct = y < 5 ? l >= y : (u && l >= y - 5);
  used.push(direct ? 18 - x : 36 - x);
  dg[col] = d + x - 10;
  return addCol(dg, col + 1, 1, used);
}

function subCol(dg, col, x, used) {
  if (col >= dg.length) return false;
  const d = dg[col], u = d >= 5, l = d % 5;
  if (x < 5) {
    if (l >= x) { dg[col] = d - x; return true; }
    if (u) { used.push(9 - x); dg[col] = d - x; return true; }
  } else if (u && l >= x - 5) { dg[col] = d - x; return true; }
  // borrow: -x = -10 + (10-x)
  const y = 10 - x;
  const direct = y < 5 ? l + y <= 4 : (!u && l + (y - 5) <= 4);
  used.push(direct ? 27 - x : 40 - x);
  dg[col] = d + y;
  return subCol(dg, col + 1, 1, used);
}

/* Apply value v (signed) to total; returns {ok, total, used} */
function applyStep(total, v, cols) {
  const dg = [];
  let t = total;
  for (let i = 0; i < cols; i++) { dg.push(t % 10); t = Math.floor(t / 10); }
  const used = [];
  const mag = Math.abs(v);
  const ds = String(mag).split('').map(Number);
  // left to right: highest column first
  for (let i = 0; i < ds.length; i++) {
    const x = ds[i];
    if (!x) continue;
    const col = ds.length - 1 - i;
    const ok = v > 0 ? addCol(dg, col, x, used) : subCol(dg, col, x, used);
    if (!ok) return { ok: false };
  }
  let res = 0;
  for (let i = cols - 1; i >= 0; i--) res = res * 10 + dg[i];
  return { ok: true, total: res, used };
}

/* Analyse a full problem (array of signed numbers) */
function analyse(nums, cols) {
  let total = nums[0];
  const used = [];
  for (let i = 1; i < nums.length; i++) {
    const r = applyStep(total, nums[i], cols);
    if (!r.ok) return null;
    total = r.total; used.push(...r.used);
  }
  return { total, used };
}

/* ===== Lessons ===== */
const GROUPS = [
  { id: 'basic', name: 'เตรียมพร้อม', range: 'บวกลบตรง ไม่มีสูตร' },
  { id: 'g5', name: 'สูตรคู่ 5', range: 'สูตรที่ 1–8', from: 1, to: 8, sub: 'บวกลบด้วยลูกบน (5)' },
  { id: 'g10a', name: 'สูตรคู่ 10 · บวก', range: 'สูตรที่ 9–17', from: 9, to: 17, sub: 'ลบหลักหน่วย เพิ่มหลักสิบ (มือขวาลบ มือซ้ายเพิ่ม)' },
  { id: 'g10s', name: 'สูตรคู่ 10 · ลบ', range: 'สูตรที่ 18–26', from: 18, to: 26, sub: 'ลบหลักสิบ เพิ่มหลักหน่วย' },
  { id: 'gmix', name: 'สูตรคู่ผสม 5+10', range: 'สูตรที่ 27–34', from: 27, to: 34, sub: 'ใช้คู่ 5 และคู่ 10 ในขั้นเดียวกัน' }
];

const LESSONS = (() => {
  const L = [
    { id: 'b1', group: 'basic', label: 'มือขวา', title: 'หลักหน่วย', desc: 'บวกลบเลข 1 หลัก (0–9) โดยตรง', digitsOpts: [1], digits: 1, max: 0 },
    { id: 'b2', group: 'basic', label: 'มือซ้าย', title: 'หลักสิบ', desc: 'บวกลบเลขหลักสิบ (10, 20 … 90) โดยตรง', digitsOpts: [2], digits: 2, tens: true, max: 0 },
    { id: 'b3', group: 'basic', label: 'สองมือ', title: 'เลข 2 หลัก', desc: 'บวกลบเลข 2 หลักโดยตรง ไม่มีทด', digitsOpts: [2], digits: 2, max: 0 },
    { id: 'b4', group: 'basic', label: 'หลายหลัก', title: 'หลักร้อย–พัน', desc: 'บวกลบเลขหลายหลักโดยตรง ไม่มีทด', digitsOpts: [3, 4], digits: 3, max: 0, fullDigits: true }
  ];
  for (let n = 1; n <= 34; n++) {
    const g = GROUPS.find(g => g.from && n >= g.from && n <= g.to);
    L.push({ id: 'f' + n, group: g.id, label: 'สูตรที่ ' + n, title: FORMULAS[n], desc: formulaExplain(n), formula: n,
      digitsOpts: n <= 8 ? [1, 2] : [2, 3], digits: 2, max: n, targets: [n] });
    if (n === g.to) {
      const ts = []; for (let k = g.from; k <= g.to; k++) ts.push(k);
      L.push({ id: 't' + g.id, group: g.id, label: 'ทดสอบรวม', title: 'สูตร ' + g.from + '–' + g.to, desc: 'สุ่มทุกสูตรในกลุ่มนี้ ข้อละสูตร',
        digitsOpts: n <= 8 ? [1, 2] : [2, 3], digits: 2, max: n, targets: ts, isTest: true });
    }
  }
  return L;
})();

/* ===== RNG ===== */
function rint(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

/* Generate one problem. opts: {rows, digits, tens, max, target(number|null), fullDigits} */
function genProblem(opts) {
  const cols = opts.digits;
  const limit = Math.pow(10, cols) - 1;
  const allowed = n => n <= opts.max;
  const target = opts.target || null;
  const step = opts.tens ? 10 : 1;
  for (let attempt = 0; attempt < 400; attempt++) {
    // first number
    let first;
    if (opts.tens) first = rint(1, 9) * 10;
    else if (opts.fullDigits) first = rint(Math.pow(10, cols - 1), limit);
    else first = Math.random() < 0.7 && cols > 1 ? rint(Math.pow(10, cols - 1), limit) : rint(1, Math.min(9, limit));
    const nums = [first];
    let total = first, hits = 0, usedAll = [], dead = false;
    for (let r = 1; r < opts.rows; r++) {
      const isLast = r === opts.rows - 1;
      const byLen = {}; const tByLen = {};
      for (let mag = step; mag <= limit; mag += step) {
        for (const sg of [1, -1]) {
          const v = sg * mag;
          const nt = total + v;
          if (nt < 0 || nt > limit) continue;
          const res = applyStep(total, v, cols);
          if (!res.ok || !res.used.every(allowed)) continue;
          const len = opts.fullDigits ? (String(mag).length === cols ? cols : 0) : String(mag).length;
          if (!len) continue;
          const item = { v, res };
          (byLen[len] = byLen[len] || []).push(item);
          if (target && res.used.includes(target)) (tByLen[len] = tByLen[len] || []).push(item);
        }
      }
      const lens = Object.keys(byLen);
      if (!lens.length) { dead = true; break; }
      const tLens = Object.keys(tByLen);
      let chosen;
      const mustHit = target && isLast && hits === 0;
      if (target && tLens.length && (mustHit || Math.random() < 0.7)) chosen = pick(tByLen[pick(tLens)]);
      else if (mustHit) { dead = true; break; }
      else chosen = pick(byLen[pick(lens)]);
      nums.push(chosen.v);
      total = chosen.res.total;
      usedAll.push(...chosen.res.used);
      if (target && chosen.res.used.includes(target)) hits++;
    }
    if (dead) continue;
    if (target && !hits) continue;
    return { nums, ans: total, used: [...new Set(usedAll)].sort((a, b) => a - b) };
  }
  return null;
}

/* Generate a full set of `count` distinct problems for a lesson */
function genSet(lesson, cfg) {
  const out = []; const seen = new Set();
  const targets = lesson.targets || [null];
  let ti = Math.floor(Math.random() * targets.length);
  let guard = 0;
  while (out.length < cfg.count && guard++ < cfg.count * 30) {
    const target = targets[ti % targets.length];
    const p = genProblem({ rows: cfg.rows, digits: cfg.digits, tens: !!lesson.tens, max: lesson.max, target, fullDigits: !!lesson.fullDigits });
    if (!p) { ti++; continue; }
    const key = p.nums.join(',');
    if (seen.has(key)) continue;
    seen.add(key); out.push(p); ti++;
  }
  // small problem spaces (e.g. 1-digit): allow repeats, but never twice in a row
  guard = 0;
  while (out.length < cfg.count && seen.size && guard++ < cfg.count * 50) {
    const target = targets[ti % targets.length]; ti++;
    const p = genProblem({ rows: cfg.rows, digits: cfg.digits, tens: !!lesson.tens, max: lesson.max, target, fullDigits: !!lesson.fullDigits });
    if (p && p.nums.join(',') !== out[out.length - 1].nums.join(',')) out.push(p);
  }
  // shuffle for tests
  if (lesson.isTest) out.sort(() => Math.random() - 0.5);
  return out;
}

if (typeof module !== 'undefined') module.exports = { FORMULAS, formulaExplain, applyStep, analyse, GROUPS, LESSONS, genProblem, genSet };
