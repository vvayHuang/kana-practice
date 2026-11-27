// 雲端同步：在 claude.ai 上打開時，把答題紀錄存到使用者自己的 Claude 帳號。
// 其他地方打開（例如 GitHub Pages）沒有 window.claude，就不同步，紀錄只存在瀏覽器。
//
// 雲端資料放在 data/users/<使用者 id>/<裝置 id>，只有本人看得到。
// 每台裝置只寫自己那一份，讀的時候把其他裝置的加起來。
// 每份的內容：{ stats 答題次數, label 裝置名稱（例如「iPhone · Safari」）, lastAt 最後答題時間 }
// 舊版存的紀錄只有 stats，沒有 label 和 lastAt。
// 幾份舊紀錄合併成一份之後，原本那幾份會換成 { stats: {}, mergedInto, merged 合併前的次數 }。
// 那台裝置如果還在用，下次連上時會從自己的次數扣掉 merged，再照常存回去，才不會重複計算。
//
// 「裝置 id」存在瀏覽器裡。換瀏覽器、用無痕視窗、清掉網站資料，或瀏覽器自己清掉時，
// 下次答題就會變成新的一份，所以份數常常比實際的裝置多。畫面上因此不顯示「幾台」，
// 只在點開雲按鈕時列出每一份是什麼裝置、最後什麼時候練習。

import { getDeviceId, getOwnLastAt, getOwnStats, onRecord, setOtherDevices, subtractOwnStats } from './store.js';

// status — off：不支援同步／connecting：連線中／synced：已同步／offline：暫時連不上／local：沒登入或沒權限
// others — 雲端上其他裝置的紀錄：{ label, lastAt, answers }，有讀到雲端資料後 loaded 才會是 true
let status = 'off';
let others = [];
let loaded = false;
const listeners = new Set();

export const getSyncInfo = () => ({
  status,
  loaded,
  mine: { label: deviceLabel(), lastAt: getOwnLastAt(), answers: countAnswers(getOwnStats()) },
  others,
});
export function onSyncChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
const notify = () => listeners.forEach((fn) => fn(getSyncInfo()));

function setStatus(s) {
  if (s === status) return;
  status = s;
  notify();
}

// 答過幾題（答對 + 答錯）
export function countAnswers(stats) {
  let n = 0;
  for (const s of Object.values(stats || {})) {
    const c = Number(s?.c);
    const w = Number(s?.w);
    if (c >= 0 && w >= 0) n += c + w;
  }
  return n;
}

// 這台裝置的名稱，例如「iPhone · Safari」「Mac · Chrome」，只用來在清單上分辨是哪台。
// 由上往下比對，先對到的算數（Edge、Opera 的字串裡也有 Chrome，所以要排在前面）
const SYSTEMS = [
  [/iPhone|iPod/, 'iPhone'],
  [/iPad/, 'iPad'],
  [/Android.*Mobile/, 'Android 手機'],
  [/Android/, 'Android 平板'],
  [/CrOS/, 'Chromebook'],
  [/Windows/, 'Windows'],
  [/Macintosh|Mac OS X/, 'Mac'],
  [/Linux/, 'Linux'],
];
const BROWSERS = [
  [/\bClaude\/|Electron\//, 'Claude App'],
  [/Edg(e|A|iOS)?\//, 'Edge'],
  [/OPR\/|Opera/, 'Opera'],
  [/SamsungBrowser/, 'Samsung 瀏覽器'],
  [/Firefox\/|FxiOS/, 'Firefox'],
  [/; wv\)/, 'App'], // Android 上 App 內建的網頁
  [/CriOS|Chrome\//, 'Chrome'],
  [/Safari\//, 'Safari'],
];
const pick = (list, ua) => list.find(([re]) => re.test(ua))?.[1] || '';

let label = null;
export function deviceLabel() {
  if (label !== null) return label;
  const ua = navigator.userAgent || '';
  let os = pick(SYSTEMS, ua);
  // iPad 的 Safari 會假裝成 Mac，用觸控點數分辨
  if (os === 'Mac' && navigator.maxTouchPoints > 1) os = 'iPad';
  let browser = pick(BROWSERS, ua);
  // iPhone、iPad 上 App 內建的網頁沒有 Safari 字樣
  if (!browser && (os === 'iPhone' || os === 'iPad')) browser = 'App';
  label = [os, browser].filter(Boolean).join(' · ') || '不明的裝置';
  return label;
}

// 比較兩份答題次數（雲端回來的欄位順序可能不一樣，所以逐一比對數字）
const FIELDS = ['c', 'w', 'n', 't'];
function sameStats(a, b) {
  const ka = Object.keys(a || {});
  if (ka.length !== Object.keys(b || {}).length) return false;
  return ka.every((k) => b[k] && FIELDS.every((f) => (Number(a[k]?.[f]) || 0) === (Number(b[k]?.[f]) || 0)));
}
const myDoc = () => ({ stats: getOwnStats(), label: deviceLabel(), lastAt: getOwnLastAt() });
const sameDoc = (cloud, local) =>
  sameStats(cloud?.stats, local.stats) && cloud?.label === local.label && (cloud?.lastAt ?? null) === local.lastAt;

export async function initSync() {
  const claude = window.claude;
  if (typeof claude?.use !== 'function') return;
  setStatus('connecting');

  let db = null;
  let user = null;
  try {
    [db, user] = await Promise.all([claude.use('db'), claude.use('user')]);
  } catch {
    /* 當作不能同步 */
  }
  const uid = db && user ? await user.id() : null;
  if (!uid) return setStatus('local');

  const deviceId = getDeviceId();
  const col = db.collection(`data/users/${uid}`);
  const mine = col.doc(deviceId);

  // ---------- 寫入：答題後停一下再一起存，同一時間只寫一次 ----------
  let dirty = false;
  let writing = false;
  let disabled = false;
  let timer = null;
  // 讀到雲端上這台的紀錄之前先不寫，才知道它有沒有被合併過
  let confirmed = false;

  const schedule = (ms = 1500) => {
    clearTimeout(timer);
    timer = setTimeout(flush, ms);
  };

  async function flush() {
    clearTimeout(timer);
    if (!dirty || writing || disabled || !confirmed) return;
    writing = true;
    dirty = false;
    let retryIn = 0;
    try {
      await mine.set(myDoc());
    } catch (e) {
      dirty = true;
      if (e?.code === 'unavailable') retryIn = 3000 + Math.random() * 3000;
      else if (e?.code === 'resource_exhausted') retryIn = 15000;
      else {
        // 沒有寫入權限、權限被收回、空間滿了：這次就只存在這台裝置
        disabled = true;
        setStatus('local');
      }
    } finally {
      writing = false;
    }
    if (retryIn) schedule(retryIn);
    else if (dirty && !disabled) schedule();
  }

  const markDirty = () => {
    dirty = true;
    schedule();
  };
  onRecord(() => {
    markDirty();
    notify(); // 清單上這台裝置的題數和時間跟著更新
  });
  // 切到背景或關掉前，把還沒存的先存
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) flush();
  });

  // ---------- 讀取：即時收到其他裝置的紀錄 ----------
  const loadingTimer = setTimeout(() => {
    if (!confirmed && !disabled) setStatus('offline');
  }, 10000);

  col.onSnapshot(
    (snap) => {
      const list = [];
      const next = [];
      let mineInCloud = null;
      for (const doc of snap.docs) {
        if (!doc.id.startsWith('d-')) continue;
        const data = doc.data() || {};
        if (doc.id === deviceId) {
          mineInCloud = data;
          continue;
        }
        const stats = data.stats;
        if (!stats || typeof stats !== 'object' || !Object.keys(stats).length) continue;
        list.push(stats);
        next.push({
          label: typeof data.label === 'string' ? data.label.slice(0, 60) : '',
          lastAt: Number.isFinite(data.lastAt) ? data.lastAt : null,
          answers: countAnswers(stats),
        });
      }
      setOtherDevices(list);
      others = next;
      loaded = true;
      notify();
      if (snap.metadata.fromCache) return;

      if (!confirmed) {
        confirmed = true;
        clearTimeout(loadingTimer);
        // 這台的紀錄已經合併到別份：扣掉合併過的次數
        if (mineInCloud?.mergedInto) subtractOwnStats(mineInCloud.merged);
        // 第一次連上：這台裝置的紀錄（離線時的紀錄，或舊版存的沒有裝置名稱）跟雲端不一樣的話，補傳一次
        const local = myDoc();
        const hasLocal = Object.keys(local.stats).length > 0;
        if (mineInCloud?.mergedInto || ((hasLocal || mineInCloud) && !sameDoc(mineInCloud, local))) markDirty();
        else if (dirty) schedule();
      }
      if (!disabled) setStatus('synced');
    },
    () => {
      clearTimeout(loadingTimer);
      disabled = true;
      setStatus('local');
    },
  );
}
