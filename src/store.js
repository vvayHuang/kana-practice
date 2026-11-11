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
    // 作答時間（舊紀錄沒有這兩個欄位）
    const n = Number(s.n);
    const ms = Number(s.t);
    if (n > 0 && ms >= 0) {
      t.n = (t.n || 0) + n;
      t.t = (t.t || 0) + ms;
    }
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

// 每個假名的紀錄：c 答對次數、w 答錯次數、t / n 最近幾次答對花的時間總和（毫秒）和次數。
// ms 是這一題從出現到作答花的時間，只有答對時才計入；發呆太久的不算。
const TIME_WINDOW = 5; // 作答時間只看最近大約 5 次，變快之後很快就會反映出來
const TIME_CAP = 10000;
const TIME_IGNORE = 30000;
const SLOW_MS = 3000; // 平均超過這個時間就算「答對但還不熟」
// 單字的紀錄用 word: 開頭；單字比較長，時間放寬一倍
const isWordKey = (key) => key.startsWith('word:');
export const slowLimit = (key) => (isWordKey(key) ? SLOW_MS * 2 : SLOW_MS);

export function record(key, ok, ms) {
  change(() => {
    const s = state.stats[key] || (state.stats[key] = { c: 0, w: 0 });
    if (ok) s.c++;
    else s.w++;
    if (ok && ms > 0 && ms < TIME_IGNORE) {
      let n = Number(s.n) || 0;
      let t = Number(s.t) || 0;
      if (n >= TIME_WINDOW) {
        t = (t / n) * (TIME_WINDOW - 1);
        n = TIME_WINDOW - 1;
      }
      s.n = n + 1;
      s.t = Math.round(t + Math.min(ms, TIME_CAP));
    }
  });
  recompute();
  recordListeners.forEach((fn) => fn());
}

export const getStat = (key) => total[key] || null;

// 有沒有任何練習紀錄（含其他裝置同步來的）
export const hasStats = () => Object.keys(total).length > 0;

// 最近答對時平均花幾毫秒，沒有紀錄回傳 null
export function avgTime(key) {
  const s = total[key];
  return s?.n > 0 ? s.t / s.n : null;
}

export const isSlow = (key) => avgTime(key) > slowLimit(key);

// new 未練習 / learning 練習中 / weak 常答錯 / good 已熟練
// 答對率夠高但想很久才答出來的，還是算「練習中」
// 只錯過一次還不算「常答錯」，至少錯兩次才算
export function mastery(key) {
  const s = total[key];
  if (!s) return 'new';
  const acc = s.c / (s.c + s.w);
  if (acc < 0.6 && s.w >= 2) return 'weak';
  if (s.c >= 3 && acc >= 0.8 && !isSlow(key)) return 'good';
  return 'learning';
}

// 出題權重：越不熟的假名越常出現
const WEIGHT = { weak: 4, new: 3, learning: 2, good: 1 };
// 只錯過一次的假名畫面上標「練習中」，但出題時還是當成不熟的，要多出現
export function weight(key) {
  const s = total[key];
  if (s && s.c / (s.c + s.w) < 0.6) return WEIGHT.weak;
  return WEIGHT[mastery(key)];
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
