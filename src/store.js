// 練習紀錄和偏好設定。
//
// - 這台裝置的答題次數和偏好設定存在瀏覽器的 localStorage（無痕模式下可能存不了，程式照常運作）。
// - 在 claude.ai 上打開時，答題次數會同步到 Claude 帳號（見 sync.js）。每台裝置在雲端各有一份
//   自己的次數，畫面上顯示的是「這台裝置 + 其他裝置」加起來的結果。
//   每份紀錄只有一台裝置在寫，所以兩台同時練習也不會互相蓋掉。

const KEY = 'kana-practice:v1';
let state = { stats: {}, prefs: {}, device: null };
let others = {}; // 其他裝置的次數加總（由 sync.js 填入）
let total = {}; // 畫面上用的：這台裝置 + 其他裝置

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      state = { stats: saved.stats || {}, prefs: saved.prefs || {}, device: saved.device || state.device };
    }
  } catch {
    /* 讀不到就用目前的紀錄 */
  }
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* 存不了就算了 */
  }
}

// 改資料前先重新讀一次，同時開好幾個分頁時才不會互相蓋掉
function change(fn) {
  load();
  fn();
  save();
}

function recompute() {
  total = addStats({}, state.stats);
  addStats(total, others);
}

function addStats(into, from) {
  for (const [key, s] of Object.entries(from || {})) {
    const c = Number(s?.c);
    const w = Number(s?.w);
    if (!(c >= 0) || !(w >= 0) || c + w === 0) continue;
    const t = into[key] || (into[key] = { c: 0, w: 0 });
    t.c += c;
    t.w += w;
  }
  return into;
}

load();
recompute();

// ---------- 偏好設定（只存在這台裝置） ----------

export const getPref = (k, fallback) => (k in state.prefs ? state.prefs[k] : fallback);
export const setPref = (k, v) => change(() => (state.prefs[k] = v));

// ---------- 答題紀錄 ----------

const recordListeners = new Set();
const remoteListeners = new Set();

export function record(key, ok) {
  change(() => {
    const s = state.stats[key] || (state.stats[key] = { c: 0, w: 0 });
    if (ok) s.c++;
    else s.w++;
  });
  recompute();
  recordListeners.forEach((fn) => fn());
}

export const getStat = (key) => total[key] || null;

// new 未練習 / learning 練習中 / weak 常答錯 / good 已熟練
export function mastery(key) {
  const s = total[key];
  if (!s) return 'new';
  const acc = s.c / (s.c + s.w);
  if (s.c >= 3 && acc >= 0.8) return 'good';
  if (acc < 0.6) return 'weak';
  return 'learning';
}

// 答錯過、還沒熟練的假名，錯越多排越前面
export function weakKeys(limit = 20) {
  return Object.entries(total)
    .filter(([key, s]) => s.w > 0 && mastery(key) !== 'good')
    .sort(([, a], [, b]) => b.w - b.c - (a.w - a.c) || b.w - a.w)
    .slice(0, limit)
    .map(([key]) => key);
}

// 其他裝置的紀錄更新時通知畫面重畫，回傳取消訂閱的函式
export function onStatsChange(fn) {
  remoteListeners.add(fn);
  return () => remoteListeners.delete(fn);
}

// ---------- 給 sync.js 用 ----------

export function getDeviceId() {
  if (!state.device) {
    const rand = globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2) + Date.now().toString(36);
    change(() => (state.device = state.device || `d-${rand}`));
  }
  return state.device;
}

export function getOwnStats() {
  load();
  return state.stats;
}

export function onRecord(fn) {
  recordListeners.add(fn);
  return () => recordListeners.delete(fn);
}

// 傳入其他裝置的紀錄（每台一份），有變動才通知畫面
export function setOtherDevices(list) {
  const next = list.reduce((acc, s) => addStats(acc, s), {});
  if (JSON.stringify(next) === JSON.stringify(others)) return;
  others = next;
  load();
  recompute();
  remoteListeners.forEach((fn) => fn());
}
