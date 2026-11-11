/* ===== Storage ===== */
const KEY = 'jintakanit.v1';
const DEFAULT_PREFS = { mode: 'all', count: 30, rows: 4, speed: 1.0, feedback: true, digits: {} };
function load() {
  try { const d = JSON.parse(localStorage.getItem(KEY)); if (d && Array.isArray(d.sessions)) { d.prefs = Object.assign({}, DEFAULT_PREFS, d.prefs || {}); return d; } } catch (e) {}
  return { sessions: [], prefs: Object.assign({}, DEFAULT_PREFS), group: 'basic' };
}
let DB = load();
function save() {
  // keep per-question detail for the most recent 400 sessions only
  const n = DB.sessions.length;
  if (n > 400) DB.sessions.slice(0, n - 400).forEach(s => { if (s.items) { s.wrongF = wrongFormulas(s); delete s.items; } });
  try { localStorage.setItem(KEY, JSON.stringify(DB)); } catch (e) { showModal('บันทึกไม่สำเร็จ', 'พื้นที่เก็บข้อมูลในเครื่องเต็ม ลองสำรองข้อมูลแล้วล้างประวัติเก่า', [{ t: 'ตกลง', primary: true }]); }
}
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

/* ===== Helpers ===== */
const $app = document.getElementById('app');
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const lessonById = id => LESSONS.find(l => l.id === id);
const fmtTime = ms => { const s = Math.round(ms / 1000); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
const fmtSec = ms => (ms / 1000).toFixed(1);
const fmtDate = iso => new Date(iso).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
const fmtDateTime = iso => new Date(iso).toLocaleString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const isToday = iso => new Date(iso).toDateString() === new Date().toDateString();
const signed = (n, i) => i === 0 ? String(n) : (n < 0 ? '−' : '+') + Math.abs(n);
const probText = nums => nums.map((n, i) => i === 0 ? String(n) : (n < 0 ? ' − ' : ' + ') + Math.abs(n)).join('');
const lessonSessions = id => DB.sessions.filter(s => s.lesson === id);
const modeName = m => m === 'flash' ? 'Flash' : 'แสดงทั้งหมด';
function wrongFormulas(s) {
  if (s.wrongF) return s.wrongF;
  const out = {};
  (s.items || []).forEach(it => { if (!it.ok) (it.used || []).forEach(f => out[f] = (out[f] || 0) + 1); });
  return out;
}
function status(id) {
  const ss = lessonSessions(id);
  if (!ss.length) return { st: 'new', meta: 'ยังไม่เคยทำ', pct: 0 };
  const s = ss[ss.length - 1];
  const pct = Math.round(s.correct / s.count * 100);
  return { st: pct >= 90 ? 'good' : 'work', meta: `ล่าสุด ${s.correct}/${s.count} · ${fmtTime(s.totalMs)}`, pct };
}
const ICON = {
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  play: '<svg width="24" height="24" viewBox="0 0 24 24" fill="#fff" aria-hidden="true"><path d="M7 4.5v15l12-7.5z"/></svg>',
  list: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="#C2477A" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><rect x="6" y="4" width="28" height="32" rx="6"/><path d="M13 12h14M13 18h14M13 24h14M13 30h9"/></svg>',
  bolt: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="#8A63D2" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 4L9 22h10l-2 14 13-18H20l2-14z"/></svg>',
  logo: '<svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true"><rect x="3" y="3" width="34" height="34" rx="9" fill="#fff" stroke="#C2477A" stroke-width="2.5"/><line x1="3" y1="15" x2="37" y2="15" stroke="#C2477A" stroke-width="2.5"/><circle cx="14" cy="9" r="3.5" fill="#B79CF0"/><circle cx="14" cy="22" r="3.5" fill="#F7B2CF"/><circle cx="14" cy="30" r="3.5" fill="#F7B2CF"/><circle cx="26" cy="22" r="3.5" fill="#F7B2CF"/></svg>',
  clock: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9 2h6"/></svg>'
};

/* ===== Router ===== */
let view = { name: 'home' };
let run = null; // active practice run
function go(v) { stopRun(); view = v; render(); }
function render() {
  const r = { home: renderHome, setup: renderSetup, practice: renderPractice, result: renderResult, stats: renderStats }[view.name];
  $app.innerHTML = r();
  if (view.name === 'practice') afterPractice();
}

/* ===== Home ===== */
function renderHome() {
  const gid = DB.group || 'basic';
  const g = GROUPS.find(x => x.id === gid);
  const lessons = LESSONS.filter(l => l.group === gid);
  const today = DB.sessions.filter(s => isToday(s.date));
  const tq = today.reduce((a, s) => a + s.count, 0), tc = today.reduce((a, s) => a + s.correct, 0);
  return `<div class="screen home">
  <nav class="side" aria-label="เมนูหลัก">
    <div class="logo">${ICON.logo}<b>จินตคณิต</b></div>
    <div class="tabs"><button class="on">บทเรียน</button><button data-act="stats">สถิติ</button></div>
    <div><div class="glabel">กลุ่มบทเรียน</div><div class="groups">
    ${GROUPS.map(x => `<button class="gitem ${x.id === gid ? 'on' : ''}" data-act="group" data-id="${x.id}"><span><span class="n">${x.name}</span><span class="r">${x.range}</span></span><span class="c">${LESSONS.filter(l => l.group === x.id).length}</span></button>`).join('')}
    </div></div>
    <div class="today"><span style="font-size:13px;color:var(--lav-text)">วันนี้</span><b class="h" style="font-size:22px;font-weight:500">ทำไปแล้ว ${today.length} ชุด</b><span style="font-size:14px;color:var(--lav-text)">${tq ? `${tq} ข้อ · ถูก ${tc} ข้อ` : 'ยังไม่ได้เริ่มเลย สู้ ๆ นะ'}</span></div>
  </nav>
  <main class="main scroll">
    <header class="mainhead">
      <div><div class="muted" style="font-size:15px">${g.range}</div><h1>${g.name}</h1>${g.sub ? `<div class="muted" style="font-size:16px">${g.sub}</div>` : ''}</div>
      <div class="legend"><span><i class="dot good"></i>ถูก ≥ 90%</span><span><i class="dot work"></i>ยังต้องฝึก</span><span><i class="dot new"></i>ยังไม่เคยทำ</span></div>
    </header>
    <div class="lgrid">
    ${lessons.map(l => { const s = status(l.id); return `<button class="lcard ${l.isTest ? 'test' : ''}" data-act="lesson" data-id="${l.id}">
      <span class="top"><span>${l.label}</span><i class="dot ${s.st}"></i></span>
      <span class="f">${l.title}</span>
      <span><span class="m">${l.isTest && s.st === 'new' ? 'สุ่มทุกสูตรในกลุ่ม' : s.meta}</span><span class="bar" style="display:block"><i class="${s.st}" style="width:${s.pct}%"></i></span></span>
    </button>`; }).join('')}
    </div>
  </main></div>`;
}

/* ===== Setup ===== */
function lessonCfg(l) {
  const p = DB.prefs;
  const d = p.digits[l.id] && l.digitsOpts.includes(p.digits[l.id]) ? p.digits[l.id] : l.digits;
  return { mode: p.mode, count: p.count, rows: p.rows, speed: p.speed, feedback: p.feedback, digits: d };
}
function exampleFor(l, cfg) {
  if (!l.formula) {
    const p = genProblem({ rows: 3, digits: cfg.digits, tens: !!l.tens, max: 0, target: null, fullDigits: !!l.fullDigits });
    return p ? `<span>${probText(p.nums)}</span><span style="color:var(--rose)">= ${p.ans}</span>` : '';
  }
  const p = genProblem({ rows: 2, digits: 2, tens: false, max: l.formula, target: l.formula });
  if (!p) return '';
  return `<span>${probText(p.nums)}</span><span style="color:var(--rose)">= ${p.ans}</span>`;
}
function renderSetup() {
  const l = lessonById(view.id), c = lessonCfg(l);
  const ss = lessonSessions(l.id);
  const best = ss.length ? Math.min(...ss.map(s => s.totalMs / s.count)) : null;
  const opt = (key, vals, cur, fmt) => vals.map(v => `<button class="opt ${v === cur ? 'on' : ''}" data-act="pref" data-k="${key}" data-v="${v}">${fmt ? fmt(v) : v}</button>`).join('');
  const g = GROUPS.find(x => x.id === l.group);
  return `<div class="screen">
  <header class="pagehead"><button class="iconbtn" data-act="home" aria-label="กลับไปหน้าบทเรียน">${ICON.back}</button>
    <div><div class="muted" style="font-size:14px">${g.name}</div><h1>${l.label} · ${l.title}</h1></div></header>
  <div class="setup-body">
    <section class="card setup-opts"><div class="optscroll">
      <div><div class="olabel">รูปแบบโจทย์</div><div class="modes">
        <button class="mode ${c.mode === 'all' ? 'on' : ''}" data-act="pref" data-k="mode" data-v="all">${ICON.list}<span><b>แสดงโจทย์ทั้งหมด</b><span>เห็นตัวเลขทุกตัวพร้อมกัน แล้วพิมพ์คำตอบ</span></span></button>
        <button class="mode fl ${c.mode === 'flash' ? 'on' : ''}" data-act="pref" data-k="mode" data-v="flash">${ICON.bolt}<span><b>Flash</b><span>ตัวเลขโผล่ขึ้นมาทีละตัว คิดในใจแล้วตอบ</span></span></button>
      </div></div>
      ${c.mode === 'flash' ? `<div><div class="olabel">ความเร็ว Flash <small>(วินาทีต่อตัวเลข)</small></div><div class="opts">${opt('speed', [0.5, 0.8, 1, 1.5, 2], c.speed, v => v.toFixed(1))}</div></div>` : ''}
      <div><div class="olabel">จำนวนข้อ</div><div class="opts">${opt('count', [10, 20, 30, 40], c.count)}</div></div>
      <div><div class="olabel">ตัวเลขต่อข้อ</div><div class="opts">${opt('rows', [3, 4, 5, 6], c.rows, v => v + ' ตัว')}</div></div>
      ${l.digitsOpts.length > 1 ? `<div><div class="olabel">จำนวนหลัก <small>(ค่าสูงสุดของตัวเลข)</small></div><div class="opts">${opt('digits', l.digitsOpts, c.digits, v => v + ' หลัก')}</div></div>` : ''}
      <button class="toggle" data-act="pref" data-k="feedback" data-v="${c.feedback ? 0 : 1}"><span><b style="font-weight:600">บอกถูก/ผิดทันที</b><br><span class="muted" style="font-size:14px">${c.feedback ? 'บอกผลหลังตอบแต่ละข้อ' : 'ไม่บอกระหว่างทำ ไปเฉลยตอนจบ'}</span></span><span class="sw ${c.feedback ? 'on' : ''}"></span></button>
      </div><button class="btn primary startbtn" data-act="start">${ICON.play} เริ่มทำ · โจทย์ใหม่ ${c.count} ข้อ</button>
    </section>
    <aside class="setup-side">
      <div class="review"><div style="font-size:15px;color:var(--lav-text)">${l.formula ? 'ทบทวนสูตร' : 'บทนี้ฝึกอะไร'}</div>
        <div style="font-size:17px;line-height:1.6">${esc(l.desc)}</div>
        <div class="ex" data-act="newex">${exampleFor(l, c)}</div>
        <div style="font-size:13px;color:var(--lav-text)">ตัวอย่างโจทย์ (แตะเพื่อสุ่มใหม่)</div></div>
      <div class="card recent">
        <div style="display:flex;justify-content:space-between;align-items:center"><div class="olabel" style="margin:0">ผลของบทนี้</div>${ss.length ? '<a href="#" data-act="stats" data-id="' + l.id + '" style="font-size:15px">ดูทั้งหมด</a>' : ''}</div>
        ${ss.length ? `<div class="minis"><div class="mini"><small>เร็วที่สุดต่อข้อ</small><b>${fmtSec(best)} วิ</b></div><div class="mini"><small>ทำไปแล้ว</small><b>${ss.length} ชุด</b></div></div>
        <div style="display:flex;justify-content:space-between;color:var(--muted);font-size:13px"><span>5 ครั้งล่าสุด</span><span>คะแนน · เวลา</span></div>
        ${ss.slice(-5).reverse().map(s => `<div class="rrow"><span>${fmtDate(s.date)} · ${modeName(s.mode)}</span><span>${s.correct}/${s.count} · ${fmtTime(s.totalMs)}</span></div>`).join('')}`
        : '<div class="muted" style="font-size:15px">ยังไม่เคยทำบทนี้ เริ่มชุดแรกกันเลย</div>'}
      </div>
    </aside>
  </div></div>`;
}

/* ===== Practice ===== */
function startRun() {
  const l = lessonById(view.id), c = lessonCfg(l);
  const problems = genSet(l, c);
  run = { lesson: l, cfg: c, problems, i: 0, answer: '', items: [], start: performance.now(), qStart: performance.now(), lock: false, toast: null, phase: c.mode === 'flash' ? 'ready' : 'answer', fstep: -1, timers: [] };
  view = { name: 'practice' };
  render();
  if (navigator.wakeLock) navigator.wakeLock.request('screen').then(w => { if (run) run.wake = w; }).catch(() => {});
}
function stopRun() {
  if (!run) return;
  clearInterval(run.tick); run.timers.forEach(clearTimeout);
  if (run.wake) run.wake.release().catch(() => {});
  run = null;
}
function practiceQ() {
  const r = run, p = r.problems[r.i], flash = r.cfg.mode === 'flash';
  const nums = p.nums;
  if (!flash) {
    const fs = Math.max(34, Math.min(68, Math.floor(window.innerHeight * 0.5 / (nums.length + 1.6))));
    return `<div class="stack" style="font-size:${fs}px">${nums.map((v, i) => `<div class="ln"><span class="sg ${v < 0 ? 'm' : 'p'}">${i === 0 ? '' : v < 0 ? '−' : '+'}</span><span>${Math.abs(v)}</span></div>`).join('')}<hr></div>
      <div class="ansbox" id="ans">${esc(r.answer)}<span class="cur"></span></div>`;
  }
  if (r.phase !== 'answer') {
    const v = r.fstep >= 0 ? nums[r.fstep] : null;
    return `<div class="flashnum" id="fnum" aria-live="assertive" style="color:${v !== null && v < 0 ? 'var(--purple)' : 'var(--rose)'}">${r.phase === 'ready' ? '<span style="font-size:.35em;color:var(--lav-text)">พร้อม…</span>' : r.blank ? '&nbsp;' : signed(v, r.fstep)}</div>
      <div class="fsteps">${nums.map((_, i) => `<i class="${i <= r.fstep ? 'on' : ''}"></i>`).join('')}</div>
      <div class="muted" style="font-size:17px">${r.phase === 'ready' ? `ข้อ ${r.i + 1} · ตัวเลข ${nums.length} ตัว` : `ตัวที่ ${r.fstep + 1} จาก ${nums.length} · คิดตามในใจ`}</div>`;
  }
  return `<div class="h" style="font-size:32px">ผลลัพธ์คือเท่าไร?</div>
      <div class="ansbox" id="ans">${esc(r.answer)}<span class="cur"></span></div>
      ${r.lock ? '' : '<button class="chip" data-act="replay">ดู Flash ข้อนี้อีกครั้ง</button>'}`;
}
function practiceDots() {
  const r = run;
  return r.problems.map((_, i) => { const it = r.items[i]; const cls = it ? (r.cfg.feedback ? (it.ok ? 'ok' : 'bad') : 'done') : i === r.i ? 'cur' : ''; return `<span class="${cls}"></span>`; }).join('');
}
function renderPractice() {
  const r = run, n = r.problems.length, flash = r.cfg.mode === 'flash';
  const keys = ['7', '8', '9', '4', '5', '6', '1', '2', '3', 'del', '0', 'ok'];
  return `<div class="screen practice ${flash ? 'flash' : ''}">
  <header class="pbar">
    <button class="iconbtn" data-act="quit" aria-label="ออกจากแบบฝึกหัด">${ICON.close}</button>
    <div class="pinfo"><div class="t"><span>${r.lesson.label} · ${r.lesson.title}${flash ? ' · Flash ' + r.cfg.speed.toFixed(1) + ' วิ' : ''}</span><b id="pqno">ข้อ ${Math.min(r.i + 1, n)} / ${n}</b></div>
      <div class="prog"><i id="pprog" style="width:${r.items.length / n * 100}%"></i></div></div>
    <div class="timer tmain"><small>เวลารวม</small><b id="tAll">0:00</b></div>
    <div class="timer q"><small>ข้อนี้</small><b id="tQ">0:00</b></div>
  </header>
  <div class="pbody">
    <section class="qarea ${flash ? '' : 'card'}" aria-label="โจทย์"><div class="toast" id="ptoast" hidden></div><div class="qinner" id="pq">${practiceQ()}</div></section>
    <section class="keypad" aria-label="แป้นตัวเลข">${keys.map(k => `<button type="button" class="key ${k === 'del' ? 'del' : k === 'ok' ? 'ok' : ''}" data-k="${k}" aria-label="${k === 'del' ? 'ลบตัวเลข' : k === 'ok' ? 'ส่งคำตอบ' : k}">${k === 'del' ? '⌫' : k === 'ok' ? 'ตกลง' : k}</button>`).join('')}</section>
  </div>
  <footer class="dots" id="pdots" aria-label="ผลแต่ละข้อ">${practiceDots()}</footer>
  </div>`;
}
/* update only the parts that change, so the keypad buttons are never replaced under a finger */
function updatePractice() {
  const r = run; if (!r || view.name !== 'practice') return;
  const n = r.problems.length;
  const q = document.getElementById('pq'); if (!q) return;
  q.innerHTML = practiceQ();
  document.getElementById('pdots').innerHTML = practiceDots();
  document.getElementById('pprog').style.width = (r.items.length / n * 100) + '%';
  document.getElementById('pqno').textContent = `ข้อ ${Math.min(r.i + 1, n)} / ${n}`;
  setKeys();
}
function setKeys() {
  const r = run;
  const showing = r.cfg.mode === 'flash' && r.phase !== 'answer';
  document.querySelectorAll('.keypad .key').forEach(b => {
    const k = b.dataset.k;
    if (k === 'ok') { b.disabled = showing; b.textContent = r.lock ? 'ต่อไป' : 'ตกลง'; b.setAttribute('aria-label', r.lock ? 'ข้อต่อไป' : 'ส่งคำตอบ'); }
    else b.disabled = showing || r.lock;
  });
}
function showToast(ok, text, ms) {
  const r = run, t = document.getElementById('ptoast'); if (!t) return;
  t.className = 'toast ' + (ok ? 'ok' : 'bad'); t.textContent = text; t.hidden = false;
  clearTimeout(r.toastT);
  if (ms) r.toastT = setTimeout(() => { t.hidden = true; }, ms);
}
function hideToast() { const t = document.getElementById('ptoast'); if (t) t.hidden = true; if (run) clearTimeout(run.toastT); }
function afterPractice() {
  const r = run;
  clearInterval(r.tick);
  const upd = () => {
    const now = performance.now();
    const a = document.getElementById('tAll'), q = document.getElementById('tQ');
    if (a) a.textContent = fmtTime(now - r.start);
    if (q) q.textContent = fmtTime(r.lock ? r.lastMs : now - r.qStart);
  };
  upd(); r.tick = setInterval(upd, 250);
  setKeys();
  if (r.cfg.mode === 'flash' && r.phase === 'ready' && !r.flashing) startFlash();
}
function startFlash() {
  const r = run, nums = r.problems[r.i].nums, ms = r.cfg.speed * 1000, gap = Math.min(180, ms * 0.25);
  r.flashing = true; r.phase = 'ready'; r.fstep = -1;
  r.timers.forEach(clearTimeout); r.timers = [];
  updatePractice();
  const at = (t, fn) => r.timers.push(setTimeout(() => { if (run === r) fn(); }, t));
  let t = 700;
  nums.forEach((_, i) => {
    at(t, () => { r.phase = 'show'; r.fstep = i; r.blank = false; updatePractice(); });
    at(t + ms - gap, () => { r.blank = true; const el = document.getElementById('fnum'); if (el) el.innerHTML = '&nbsp;'; });
    t += ms;
  });
  at(t, () => { r.phase = 'answer'; r.blank = false; r.flashing = false; updatePractice(); });
}
function pressKey(k) {
  const r = run;
  if (!r || (r.cfg.mode === 'flash' && r.phase !== 'answer')) return;
  if (r.lock) { if (k === 'ok') nextQuestion(); return; }
  if (k === 'del') r.answer = r.answer.slice(0, -1);
  else if (k === 'ok') { if (r.answer !== '') submit(); return; }
  else if (r.answer.length < r.cfg.digits + 1) r.answer = (r.answer === '0' ? '' : r.answer) + k;
  const el = document.getElementById('ans');
  if (el) el.innerHTML = esc(r.answer) + '<span class="cur"></span>';
}
function nextQuestion() {
  const r = run; if (!r) return;
  clearTimeout(r.waitT);
  r.lock = false; r.answer = '';
  if (r.i + 1 >= r.problems.length) return finish();
  r.i++; r.qStart = performance.now(); r.phase = r.cfg.mode === 'flash' ? 'ready' : 'answer';
  if (r.cfg.mode === 'flash') startFlash(); else updatePractice();
}
function submit() {
  const r = run, p = r.problems[r.i];
  const ms = performance.now() - r.qStart;
  const given = Number(r.answer);
  const ok = given === p.ans;
  r.items.push({ nums: p.nums, ans: p.ans, given, ok, ms: Math.round(ms), used: p.used, replays: r.replays || 0 });
  r.lastMs = ms; r.replays = 0;
  if (r.cfg.feedback && !ok) {
    // wrong: show the answer; tap "ต่อไป" to continue (or it moves on by itself)
    r.lock = true;
    updatePractice();
    showToast(false, `ยังไม่ถูก · เฉลย ${p.ans}`);
    r.waitT = setTimeout(() => { if (run === r && r.lock) { hideToast(); nextQuestion(); } }, 2500);
    return;
  }
  nextQuestion();
  if (r.cfg.feedback && run === r) showToast(true, pick(['ถูกต้อง!', 'เก่งมาก!', 'เยี่ยมเลย!', 'ถูกแล้ว!']), 800);
}
function finish() {
  const r = run;
  const s = {
    id: Date.now().toString(36), date: new Date().toISOString(), lesson: r.lesson.id, mode: r.cfg.mode,
    count: r.items.length, rows: r.cfg.rows, digits: r.cfg.digits, speed: r.cfg.mode === 'flash' ? r.cfg.speed : null,
    correct: r.items.filter(i => i.ok).length, totalMs: Math.round(performance.now() - r.start), items: r.items
  };
  DB.sessions.push(s); save();
  stopRun();
  view = { name: 'result', id: s.id, fresh: true };
  render();
}

/* ===== Result ===== */
function renderResult() {
  const s = DB.sessions.find(x => x.id === view.id);
  const l = lessonById(s.lesson);
  const pct = Math.round(s.correct / s.count * 100);
  const prev = DB.sessions.filter(x => x.lesson === s.lesson && x.mode === s.mode && x.date < s.date).pop();
  const avg = s.totalMs / s.count;
  let cmp = '–', cmpColor = 'var(--ink)';
  if (prev) { const d = avg - prev.totalMs / prev.count; cmp = (d <= 0 ? '−' : '+') + Math.abs(d / 1000).toFixed(1) + ' วิ'; cmpColor = d <= 0 ? 'var(--mint-d)' : 'var(--brown)'; }
  const C = 2 * Math.PI * 84;
  const items = s.items || [];
  const wrong = items.map((it, i) => ({ ...it, no: i + 1 })).filter(it => !it.ok);
  const maxMs = Math.max(...items.map(i => i.ms), 1);
  const title = pct === 100 ? 'สุดยอด! ถูกทุกข้อ' : pct >= 90 ? 'เก่งมาก!' : pct >= 70 ? 'ทำได้ดี สู้ต่อนะ' : 'ค่อย ๆ ฝึกไปนะ';
  return `<div class="screen result">
  <section class="rleft">
    <div style="font-size:15px;color:var(--lav-text);text-align:center">${l.label} · ${l.title}<br>${modeName(s.mode)} · ${fmtDateTime(s.date)}</div>
    <h1>${view.fresh ? title : 'ผลการทำ'}</h1>
    <div class="ring"><svg width="200" height="200" viewBox="0 0 200 200" role="img" aria-label="ถูก ${s.correct} จาก ${s.count} ข้อ"><circle cx="100" cy="100" r="84" fill="none" stroke="#F6F0FF" stroke-width="18"/><circle cx="100" cy="100" r="84" fill="none" stroke="#C2477A" stroke-width="18" stroke-linecap="round" stroke-dasharray="${(C * s.correct / s.count).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 100 100)"/></svg>
      <div><span class="h" style="font-size:54px;line-height:1">${s.correct}<span style="font-size:26px;color:var(--lav-text)">/${s.count}</span></span><span style="font-size:15px;color:var(--lav-text)">ถูก ${pct}%</span></div></div>
    <div class="tiles"><div class="tile"><small>เวลารวม</small><b>${fmtTime(s.totalMs)}</b></div><div class="tile"><small>เฉลี่ย/ข้อ</small><b>${fmtSec(avg)} วิ</b></div><div class="tile"><small>เทียบครั้งก่อน</small><b style="color:${cmpColor}">${cmp}</b></div></div>
    <div style="display:flex;flex-direction:column;gap:10px;width:100%;margin-top:auto">
      ${view.fresh ? `<button class="btn primary" data-act="again" data-id="${s.lesson}">ทำอีกชุด (โจทย์ใหม่)</button><button class="btn ghost" data-act="home">กลับหน้าบทเรียน</button>` : `<button class="btn primary" data-act="lesson" data-id="${s.lesson}">ไปฝึกบทนี้</button><button class="btn ghost" data-act="stats">กลับหน้าสถิติ</button>`}
    </div>
  </section>
  <section class="rright">
    <div class="card panel"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap"><h2>${wrong.length ? `ข้อที่ตอบผิด (${wrong.length} ข้อ)` : 'ไม่มีข้อผิดเลย'}</h2>${wrong.length ? '<span class="muted" style="font-size:14px">สูตรที่ต้องใช้ในข้อนั้น</span>' : ''}</div>
      ${wrong.length ? `<table class="wl"><thead><tr><th>ข้อ</th><th>โจทย์</th><th style="text-align:right">ตอบ</th><th style="text-align:right">เฉลย</th><th>สูตร</th></tr></thead><tbody>
      ${wrong.map(w => `<tr><td>${w.no}</td><td>${probText(w.nums)}</td><td class="g">${w.given}</td><td class="a">${w.ans}</td><td class="f">${w.used && w.used.length ? w.used.map(f => 'สูตร ' + f).join(', ') : 'บวกลบตรง'}</td></tr>`).join('')}</tbody></table>` : (items.length ? `<div class="muted">ทำถูกครบทุกข้อ เก่งมาก ${s.mode === 'flash' ? 'ลองเร่งความเร็ว Flash ให้เร็วขึ้นดูนะ' : 'ลองเพิ่มจำนวนตัวเลขต่อข้อ หรือลองโหมด Flash ดูนะ'}</div>` : '<div class="muted">ไม่มีรายละเอียดรายข้อของชุดนี้</div>')}
    </div>
    ${items.length ? `<div class="card panel"><h2>เวลาที่ใช้แต่ละข้อ</h2>
      <div class="tchart">${items.map((it, i) => `<i class="${it.ok ? '' : 'bad'}" style="height:${Math.max(2, it.ms / maxMs * 100)}%" title="ข้อ ${i + 1} · ${fmtSec(it.ms)} วิ"></i>`).join('')}</div>
      <div style="display:flex;justify-content:space-between;font-size:13px;color:var(--muted)"><span>ข้อ 1</span><span style="display:flex;gap:16px"><span><i class="dot good" style="border-radius:2px;width:10px;height:10px"></i> ถูก</span><span><i class="dot work" style="border-radius:2px;width:10px;height:10px"></i> ผิด</span><span>ช้าสุด ${fmtSec(maxMs)} วิ</span></span><span>ข้อ ${items.length}</span></div></div>` : ''}
  </section></div>`;
}

/* ===== Stats ===== */
function renderStats() {
  const f = view.filter || 'all', m = view.mode || 'any';
  let ss = DB.sessions.filter(s => (f === 'all' || s.lesson === f) && (m === 'any' || s.mode === m));
  const used = [...new Set(DB.sessions.map(s => s.lesson))];
  const options = LESSONS.filter(l => used.includes(l.id));
  const acc = ss.length ? Math.round(ss.reduce((a, s) => a + s.correct, 0) / ss.reduce((a, s) => a + s.count, 0) * 100) : 0;
  const bestAvg = ss.length ? Math.min(...ss.map(s => s.totalMs / s.count)) : 0;
  const bestS = ss.find(s => s.totalMs / s.count === bestAvg);
  const last = ss[ss.length - 1], first = ss[0];
  const recent = ss.slice(-12);
  const maxAvg = Math.max(...recent.map(s => s.totalMs / s.count), 1);
  // weak formulas: last 14 days, all lessons
  const since = Date.now() - 14 * 864e5;
  const wf = {};
  DB.sessions.filter(s => new Date(s.date).getTime() >= since).forEach(s => { const w = wrongFormulas(s); for (const k in w) wf[k] = (wf[k] || 0) + w[k]; });
  const weak = Object.entries(wf).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const wmax = weak.length ? weak[0][1] : 1;
  const chip = (k, v, t, cur) => `<button class="chip ${cur === v ? 'on' : ''}" data-act="sfilter" data-k="${k}" data-v="${v}">${t}</button>`;
  return `<div class="screen stats scroll">
  <header class="shead"><button class="iconbtn" data-act="home" aria-label="กลับไปหน้าบทเรียน">${ICON.back}</button><h1>สถิติย้อนหลัง</h1>
    <div style="margin-left:auto;display:flex;gap:8px;flex-wrap:wrap;align-items:center">
      <select class="sel" data-act="sfilter-sel" aria-label="เลือกบทเรียน"><option value="all">ทุกบทเรียน</option>${options.map(l => `<option value="${l.id}" ${f === l.id ? 'selected' : ''}>${l.label} · ${l.title}</option>`).join('')}</select>
      ${chip('mode', 'any', 'ทุกโหมด', m)}${chip('mode', 'all', 'แสดงทั้งหมด', m)}${chip('mode', 'flash', 'Flash', m)}
      <button class="chip" data-act="backup">สำรองข้อมูล</button>
    </div></header>
  ${!ss.length ? `<div class="card empty">ยังไม่มีข้อมูลในตัวกรองนี้<br>ไปทำแบบฝึกหัดสักชุดก่อนนะ</div>` : `
  <div class="kpis">
    <div class="card kpi"><small>ทำไปแล้ว</small><b>${ss.length} <span style="font-size:17px">ชุด</span></b><span>${ss.reduce((a, s) => a + s.count, 0)} ข้อ</span></div>
    <div class="card kpi"><small>ความแม่นยำเฉลี่ย</small><b>${acc}%</b><span>ชุดล่าสุด ${Math.round(last.correct / last.count * 100)}%</span></div>
    <div class="card kpi"><small>เร็วที่สุดต่อข้อ</small><b>${fmtSec(bestAvg)} <span style="font-size:17px">วิ</span></b><span>${fmtDate(bestS.date)} · ${modeName(bestS.mode)}</span></div>
    <div class="card kpi"><small>เฉลี่ยต่อข้อ (ล่าสุด)</small><b>${fmtSec(last.totalMs / last.count)} <span style="font-size:17px">วิ</span></b><span>${ss.length > 1 ? (() => { const d = (last.totalMs / last.count - first.totalMs / first.count) / 1000; return (d <= 0 ? 'เร็วขึ้น ' : 'ช้าลง ') + Math.abs(d).toFixed(1) + ' วิ จากชุดแรก'; })() : 'ชุดแรก'}</span></div>
  </div>
  <div class="srow">
    <section class="card panel" style="flex:1.6;min-width:0"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap"><h2>เวลาเฉลี่ยต่อข้อ · ${recent.length} ชุดล่าสุด</h2><span class="legend"><span><i class="dot" style="background:var(--rose);border-radius:2px"></i>แสดงทั้งหมด</span><span><i class="dot" style="background:var(--lilac);border-radius:2px"></i>Flash</span></span></div>
      <div class="schart">${recent.map(s => `<div class="c"><b>${fmtSec(s.totalMs / s.count)}</b><i class="${s.mode === 'flash' ? 'fl' : ''}" style="height:${Math.max(4, (s.totalMs / s.count) / maxAvg * 80)}%"></i></div>`).join('')}</div>
      <div class="sx">${recent.map(s => `<span>${fmtDate(s.date)}<em>${s.correct}/${s.count}</em></span>`).join('')}</div>
    </section>
    <section style="flex:1;display:flex;flex-direction:column;gap:18px;min-width:0">
      <div class="card panel"><h2>สูตรที่ผิดบ่อย <span class="muted" style="font-weight:400;font-size:14px">· 14 วันล่าสุด</span></h2>
        ${weak.length ? weak.map(([k, v]) => `<div class="weak"><span>สูตร ${k} (${FORMULAS[k].split(' ')[0]})</span><div><i style="width:${v / wmax * 100}%"></i></div><b>${v} ข้อ</b></div>`).join('') : '<div class="muted" style="font-size:15px">ยังไม่มีสูตรที่ผิดเลย</div>'}
      </div>
      ${weak.length ? `<div class="review" style="flex:1"><div style="font-size:14px;color:var(--lav-text)">แนะนำให้ฝึกต่อ</div><div class="h" style="font-size:23px">สูตรที่ ${weak[0][0]} · ${FORMULAS[weak[0][0]]}</div><button class="btn primary" style="margin-top:auto" data-act="lesson" data-id="f${weak[0][0]}">ไปฝึกสูตรนี้</button></div>` : ''}
    </section>
  </div>
  <section class="card panel"><h2>ประวัติการทำ <span class="muted" style="font-weight:400;font-size:14px">· แตะเพื่อดูรายละเอียด</span></h2>
    <table class="hist"><thead><tr><th>วันเวลา</th><th>บทเรียน</th><th>โหมด</th><th>คะแนน</th><th>เวลารวม</th><th>เฉลี่ย/ข้อ</th></tr></thead><tbody>
    ${ss.slice().reverse().slice(0, 100).map(s => { const l = lessonById(s.lesson); return `<tr class="row" data-act="session" data-id="${s.id}"><td>${fmtDateTime(s.date)}</td><td>${l.label} · ${l.title}</td><td>${modeName(s.mode)}${s.speed ? ' ' + s.speed.toFixed(1) + 'วิ' : ''}</td><td>${s.correct}/${s.count}</td><td>${fmtTime(s.totalMs)}</td><td>${fmtSec(s.totalMs / s.count)} วิ</td></tr>`; }).join('')}
    </tbody></table>
  </section>`}
  </div>`;
}

/* ===== Modal ===== */
function showModal(title, body, actions) {
  const m = document.createElement('div');
  m.className = 'modal';
  m.innerHTML = `<div class="box" role="dialog" aria-modal="true"><h2>${title}</h2><div style="font-size:16px;line-height:1.6">${body}</div><div class="acts">${actions.map((a, i) => `<button class="btn ${a.primary ? 'primary' : a.lilac ? 'lilac' : 'ghost'}" data-i="${i}">${a.t}</button>`).join('')}</div></div>`;
  m.addEventListener('click', e => {
    const b = e.target.closest('button[data-i]');
    if (b) { m.remove(); const a = actions[+b.dataset.i]; if (a.fn) a.fn(); }
    else if (e.target === m) m.remove();
  });
  document.body.appendChild(m);
  return m;
}
function backupModal() {
  showModal('สำรองข้อมูล', `ข้อมูลทั้งหมดเก็บอยู่ในแท็บเล็ตเครื่องนี้ (${DB.sessions.length} ชุด)<br><span class="muted" style="font-size:14px">แนะนำให้ส่งออกไฟล์เก็บไว้เป็นระยะ เผื่อล้างเบราว์เซอร์หรือเปลี่ยนเครื่อง</span>`, [
    { t: 'ล้างข้อมูล', fn: () => showModal('ล้างข้อมูลทั้งหมด?', 'ประวัติและสถิติทั้งหมดจะหายไป และกู้คืนไม่ได้ ถ้าไม่ได้สำรองไว้', [{ t: 'ยกเลิก' }, { t: 'ล้างเลย', primary: true, fn: () => { DB.sessions = []; save(); go({ name: 'stats' }); } }]) },
    { t: 'นำเข้าไฟล์', lilac: true, fn: importData },
    { t: 'ส่งออกไฟล์', primary: true, fn: exportData }
  ]);
}
function exportData() {
  const blob = new Blob([JSON.stringify(DB)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'jintakanit-backup-' + new Date().toISOString().slice(0, 10) + '.json';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
function importData() {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = 'application/json,.json';
  inp.onchange = () => {
    const file = inp.files[0]; if (!file) return;
    file.text().then(t => {
      const d = JSON.parse(t);
      if (!d || !Array.isArray(d.sessions)) throw new Error('bad');
      const ids = new Set(DB.sessions.map(s => s.id));
      const add = d.sessions.filter(s => s && s.id && !ids.has(s.id) && lessonById(s.lesson));
      DB.sessions = DB.sessions.concat(add).sort((a, b) => a.date < b.date ? -1 : 1);
      save();
      showModal('นำเข้าเรียบร้อย', `เพิ่มประวัติ ${add.length} ชุด`, [{ t: 'ตกลง', primary: true, fn: () => go({ name: 'stats' }) }]);
    }).catch(() => showModal('นำเข้าไม่สำเร็จ', 'ไฟล์นี้ไม่ใช่ไฟล์สำรองของแอปจินตคณิต', [{ t: 'ตกลง', primary: true }]));
  };
  inp.click();
}

/* ===== Events ===== */
$app.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled) return;
  const a = el.dataset.act, id = el.dataset.id;
  if (el.tagName === 'A') e.preventDefault();
  switch (a) {
    case 'home': go({ name: 'home' }); break;
    case 'stats': go({ name: 'stats', filter: id || 'all' }); break;
    case 'group': DB.group = id; save(); render(); break;
    case 'lesson': go({ name: 'setup', id }); break;
    case 'pref': {
      const k = el.dataset.k, raw = el.dataset.v;
      if (k === 'digits') DB.prefs.digits[view.id] = Number(raw);
      else if (k === 'mode') DB.prefs.mode = raw;
      else if (k === 'feedback') DB.prefs.feedback = raw === '1';
      else DB.prefs[k] = Number(raw);
      save(); const sc = document.querySelector('.optscroll').scrollTop; render(); document.querySelector('.optscroll').scrollTop = sc; break;
    }
    case 'newex': { const l = lessonById(view.id); el.innerHTML = exampleFor(l, lessonCfg(l)); break; }
    case 'start': startRun(); break;
    case 'again': view = { name: 'setup', id }; startRun(); break;
    case 'replay': if (run && run.phase === 'answer' && !run.lock) { run.replays = (run.replays || 0) + 1; run.answer = ''; startFlash(); } break;
    case 'quit': {
      const r = run;
      showModal('ออกจากแบบฝึกหัด?', r && r.items.length ? `ทำไปแล้ว ${r.items.length} ข้อ ถ้าออกตอนนี้จะไม่บันทึกผลชุดนี้` : 'ชุดนี้ยังไม่ได้เริ่มทำ', [{ t: 'ทำต่อ', primary: true }, { t: 'ออก', fn: () => go({ name: 'setup', id: r ? r.lesson.id : 'b1' }) }]);
      break;
    }
    case 'session': go({ name: 'result', id }); break;
    case 'sfilter': view.mode = el.dataset.v; render(); break;
    case 'backup': backupModal(); break;
  }
});
$app.addEventListener('pointerdown', e => {
  const b = e.target.closest('.keypad .key');
  if (!b || b.disabled) return;
  e.preventDefault();
  b.classList.add('down'); setTimeout(() => b.classList.remove('down'), 110);
  pressKey(b.dataset.k);
});
$app.addEventListener('change', e => {
  if (e.target.dataset.act === 'sfilter-sel') { view.filter = e.target.value; render(); }
});
document.addEventListener('keydown', e => {
  if (view.name !== 'practice' || document.querySelector('.modal')) return;
  if (e.repeat) return;
  if (/^[0-9]$/.test(e.key)) pressKey(e.key);
  else if (e.key === 'Backspace') pressKey('del');
  else if (e.key === 'Enter') pressKey('ok');
  else return;
  e.preventDefault();
});
document.addEventListener('visibilitychange', () => {
  if (run && document.visibilityState === 'visible' && navigator.wakeLock) navigator.wakeLock.request('screen').then(w => { if (run) run.wake = w; }).catch(() => {});
});
window.addEventListener('resize', () => { if (view.name === 'practice') updatePractice(); });

render();
if ('serviceWorker' in navigator && location.protocol === 'https:' && !window.__NO_SW) navigator.serviceWorker.register('./sw.js').catch(() => {});
