// 雲端同步：在 claude.ai 上打開時，把答題紀錄存到使用者自己的 Claude 帳號。
// 其他地方打開（例如 GitHub Pages）沒有 window.claude，就不同步，紀錄只存在瀏覽器。
//
// 雲端資料放在 data/users/<使用者 id>/<裝置 id>，只有本人看得到。
// 每台裝置只寫自己那一份，讀的時候把其他裝置的加起來。

import { getDeviceId, getOwnStats, onRecord, setOtherDevices } from './store.js';

// off：不支援同步／connecting：連線中／synced：已同步／offline：暫時連不上／local：沒登入或沒權限
let status = 'off';
const statusListeners = new Set();

export const getSyncStatus = () => status;
export function onSyncStatus(fn) {
  statusListeners.add(fn);
  return () => statusListeners.delete(fn);
}
function setStatus(s) {
  if (s === status) return;
  status = s;
  statusListeners.forEach((fn) => fn(s));
}

const sameStats = (a, b) => JSON.stringify(a || {}) === JSON.stringify(b || {});

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

  const schedule = (ms = 1500) => {
    clearTimeout(timer);
    timer = setTimeout(flush, ms);
  };

  async function flush() {
    clearTimeout(timer);
    if (!dirty || writing || disabled) return;
    writing = true;
    dirty = false;
    let retryIn = 0;
    try {
      await mine.set({ stats: getOwnStats() });
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
  onRecord(markDirty);
  // 切到背景或關掉前，把還沒存的先存
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) flush();
  });

  // ---------- 讀取：即時收到其他裝置的紀錄 ----------
  let confirmed = false;
  const loadingTimer = setTimeout(() => {
    if (!confirmed && !disabled) setStatus('offline');
  }, 10000);

  col.onSnapshot(
    (snap) => {
      const list = [];
      let mineInCloud = null;
      for (const doc of snap.docs) {
        if (!doc.id.startsWith('d-')) continue;
        const stats = doc.data()?.stats;
        if (doc.id === deviceId) mineInCloud = stats;
        else if (stats && typeof stats === 'object') list.push(stats);
      }
      setOtherDevices(list);
      if (snap.metadata.fromCache) return;

      if (!confirmed) {
        confirmed = true;
        clearTimeout(loadingTimer);
        // 第一次連上：這台裝置原本就有的紀錄（或離線時的紀錄）還沒上傳的話，補傳一次
        if (!sameStats(mineInCloud, getOwnStats())) markDirty();
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
