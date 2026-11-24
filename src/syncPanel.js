// 頁首右上的雲按鈕：顯示同步狀態，點開後列出雲端上每一份練習紀錄是哪台裝置、最後什麼時候練習。
// 只有在 claude.ai 上打開才會出現。
import { getSyncInfo, onSyncChange } from './sync.js';
import { icons } from './ui.js';

const STATUS = {
  connecting: { icon: 'cloud', title: '正在連線', text: '正在連線到雲端…' },
  synced: { icon: 'cloudCheck', title: '已同步', text: '練習紀錄已同步到你的 Claude 帳號，下面每份紀錄的次數會加在一起計算。' },
  offline: { icon: 'cloudOff', title: '暫時連不上', text: '暫時連不上雲端，紀錄先存在這台裝置，連上後會自動同步。' },
  local: { icon: 'cloudOff', title: '只存在這台裝置', text: '沒有登入或沒有權限，練習紀錄只存在這台裝置。' },
};
const EMPTY_TEXT = '已連上 Claude 帳號，開始練習後紀錄會自動同步。';

// 裝置名稱是從雲端讀回來的，放進 HTML 前要跳脫
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

// 今天 14:05／昨天 09:30／11 月 20 日／2025 年 3 月 2 日
function when(ms) {
  const d = new Date(ms);
  const now = new Date();
  const day = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day(now) - day(d)) / 86400000);
  const hm = `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  if (diff === 0) return `今天 ${hm}`;
  if (diff === 1) return `昨天 ${hm}`;
  const md = `${d.getMonth() + 1} 月 ${d.getDate()} 日`;
  return d.getFullYear() === now.getFullYear() ? md : `${d.getFullYear()} 年 ${md}`;
}

function row({ name, tag = '', lastAt, answers }) {
  const meta = [answers ? `${answers} 題` : '還沒練習', lastAt ? `最後練習 ${when(lastAt)}` : ''].filter(Boolean);
  return `
    <li class="device${tag ? ' mine' : ''}">
      <span class="device-name">${esc(name)}${tag ? ` <span class="device-tag">${tag}</span>` : ''}</span>
      <span class="device-meta">${meta.join(' · ')}</span>
    </li>`;
}

function bodyHtml(info) {
  const s = STATUS[info.status];
  const hasAny = info.mine.answers > 0 || info.others.length > 0;
  const showList = info.loaded && hasAny && (info.status === 'synced' || info.status === 'offline');
  const text = info.status === 'synced' && !hasAny ? EMPTY_TEXT : s.text;
  if (!showList) return `<p class="sync-text">${text}</p>`;

  // 有名稱的照最後練習時間排；舊版存的沒有名稱，合成一列
  const named = info.others.filter((d) => d.label).sort((a, b) => (b.lastAt || 0) - (a.lastAt || 0));
  const old = info.others.filter((d) => !d.label);
  const oldRow = old.length
    ? `
    <li class="device old">
      <span class="device-name">較早的紀錄 ${old.length} 份</span>
      <span class="device-meta">共 ${old.reduce((n, d) => n + d.answers, 0)} 題</span>
      <span class="device-note">加上裝置名稱之前存的，看不出是哪台。如果那台還在用，下次在那台上打開就會顯示名稱。</span>
    </li>`
    : '';

  return `
    <p class="sync-text">${text}</p>
    <ul class="device-list">
      ${row({ name: info.mine.label, tag: '這台', ...info.mine })}
      ${named.map((d) => row({ name: d.label, ...d })).join('')}
      ${oldRow}
    </ul>
    <p class="sync-foot">同一台裝置換瀏覽器、用無痕視窗，或網站資料被清掉後，會另外存成一份，所以份數可能比實際的裝置多。</p>`;
}

// root 裡要有 #sync-status 按鈕和 #sync-panel
export function mountSyncButton(root) {
  const btn = root.querySelector('#sync-status');
  const panel = root.querySelector('#sync-panel');
  const body = panel.querySelector('.sync-body');
  let open = false;

  const paintButton = (info) => {
    const s = STATUS[info.status];
    btn.hidden = !s;
    if (!s) return;
    if (btn.dataset.state !== info.status) {
      btn.dataset.state = info.status;
      btn.innerHTML = icons[s.icon];
    }
    btn.setAttribute('aria-label', `雲端同步：${s.title}`);
    btn.title = `雲端同步：${s.title}`;
  };

  function setOpen(next, { returnFocus = false } = {}) {
    if (next === open) return;
    open = next;
    panel.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
    if (open) {
      body.innerHTML = bodyHtml(getSyncInfo());
      panel.focus();
    } else if (returnFocus) {
      btn.focus();
    }
  }

  onSyncChange((info) => {
    paintButton(info);
    if (!STATUS[info.status]) setOpen(false);
    else if (open) body.innerHTML = bodyHtml(info);
  });
  paintButton(getSyncInfo());

  btn.addEventListener('click', () => setOpen(!open));
  panel.addEventListener('click', (e) => {
    if (e.target.closest('[data-close]')) setOpen(false, { returnFocus: true });
  });
  // 點面板外面、按 Esc、換頁時收起來
  document.addEventListener('click', (e) => {
    if (open && !panel.contains(e.target) && !btn.contains(e.target)) setOpen(false);
  });
  document.addEventListener('keydown', (e) => {
    if (open && e.key === 'Escape') setOpen(false, { returnFocus: true });
  });
  window.addEventListener('hashchange', () => setOpen(false));
}
