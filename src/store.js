// 練習紀錄和偏好設定，存在瀏覽器的 localStorage（無痕模式下可能存不了，程式照常運作）。

const KEY = 'kana-practice:v1';
let state = { stats: {}, prefs: {} };

try {
  const raw = localStorage.getItem(KEY);
  if (raw) {
    const saved = JSON.parse(raw);
    state = { stats: saved.stats || {}, prefs: saved.prefs || {} };
  }
} catch {
  /* 讀不到就用空白紀錄 */
}

const save = () => {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* 存不了就算了 */
  }
};

export const getPref = (k, fallback) => (k in state.prefs ? state.prefs[k] : fallback);
export const setPref = (k, v) => {
  state.prefs[k] = v;
  save();
};

export function record(key, ok) {
  const s = state.stats[key] || (state.stats[key] = { c: 0, w: 0 });
  if (ok) s.c++;
  else s.w++;
  save();
}

export const getStat = (key) => state.stats[key] || null;

// new 未練習 / learning 練習中 / weak 常答錯 / good 已熟練
export function mastery(key) {
  const s = state.stats[key];
  if (!s) return 'new';
  const acc = s.c / (s.c + s.w);
  if (s.c >= 3 && acc >= 0.8) return 'good';
  if (acc < 0.6) return 'weak';
  return 'learning';
}

// 答錯過、還沒熟練的假名，錯越多排越前面
export function weakKeys(limit = 20) {
  return Object.entries(state.stats)
    .filter(([key, s]) => s.w > 0 && mastery(key) !== 'good')
    .sort(([, a], [, b]) => b.w - b.c - (a.w - a.c) || b.w - a.w)
    .slice(0, limit)
    .map(([key]) => key);
}

export const hasStats = () => Object.keys(state.stats).length > 0;

export function resetStats() {
  state.stats = {};
  save();
}
