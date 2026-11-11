import './style.css';
import { renderChart } from './chart.js';
import { mountQuiz } from './quiz.js';
import { initSpeech } from './speech.js';
import { getPref, setPref } from './store.js';
import { initSync, getSyncInfo, onSyncChange } from './sync.js';
import { icons, toast } from './ui.js';

const app = document.getElementById('app');
app.innerHTML = `
  <header class="top">
    <div class="top-inner">
      <div class="brand">
        <span class="logo" aria-hidden="true">あ</span>
        <div>
          <h1 lang="ja">かな練習帳</h1>
          <p>五十音・平假名・片假名</p>
        </div>
      </div>
      <nav class="tabs" aria-label="主要功能">
        <div class="tabs-inner">
          <a href="#chart" data-route="chart">五十音表</a>
          <a href="#quiz" data-route="quiz">測驗</a>
        </div>
      </nav>
      <div class="top-actions">
        <button type="button" class="icon-btn sync" id="sync-status" hidden></button>
        <button type="button" class="icon-btn" id="sound-toggle"></button>
      </div>
    </div>
  </header>
  <main id="view" class="wrap"></main>
  <div class="toast" id="toast" role="status" aria-live="polite"></div>
`;

// 自動發音開關
const soundBtn = document.getElementById('sound-toggle');
const paintSound = () => {
  const on = getPref('sound', true);
  soundBtn.setAttribute('aria-pressed', String(on));
  soundBtn.setAttribute('aria-label', on ? '自動發音：開' : '自動發音：關');
  soundBtn.title = on ? '自動發音：開' : '自動發音：關';
  soundBtn.innerHTML = on ? icons.volume : icons.mute;
};
soundBtn.addEventListener('click', () => {
  setPref('sound', !getPref('sound', true));
  paintSound();
  toast(getPref('sound', true) ? '已開啟自動發音' : '已關閉自動發音');
});
paintSound();
initSpeech();

// 雲端同步狀態（只有在 claude.ai 上打開才會出現）
const SYNC_INFO = {
  connecting: { icon: 'cloud', text: () => '正在連線到雲端…' },
  synced: {
    icon: 'cloudCheck',
    text: (n) => (n ? `已同步，共 ${n} 台裝置的練習紀錄` : '已連上 Claude 帳號，開始練習後紀錄會自動同步'),
  },
  offline: { icon: 'cloudOff', text: () => '暫時連不上雲端，紀錄先存在這台裝置，連上後會自動同步' },
  local: { icon: 'cloudOff', text: () => '沒有登入或沒有權限，練習紀錄只存在這台裝置' },
};
const syncText = ({ status, devices }) => SYNC_INFO[status]?.text(devices) || '';
const syncBtn = document.getElementById('sync-status');
const paintSync = (info) => {
  const s = SYNC_INFO[info.status];
  syncBtn.hidden = !s;
  if (!s) return;
  syncBtn.dataset.state = info.status;
  syncBtn.setAttribute('aria-label', syncText(info));
  syncBtn.title = syncText(info);
  syncBtn.innerHTML = icons[s.icon];
};
syncBtn.addEventListener('click', () => toast(syncText(getSyncInfo())));
onSyncChange(paintSync);
initSync();

// 簡單的 hash 路由：#chart、#quiz
const view = document.getElementById('view');
let cleanup = null;

function route() {
  const name = location.hash === '#quiz' ? 'quiz' : 'chart';
  document.querySelectorAll('[data-route]').forEach((a) => {
    if (a.dataset.route === name) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  cleanup?.();
  view.innerHTML = '';
  cleanup = name === 'quiz' ? mountQuiz(view) : renderChart(view);
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', route);
route();
