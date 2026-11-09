import './style.css';
import { renderChart } from './chart.js';
import { mountQuiz } from './quiz.js';
import { initSpeech } from './speech.js';
import { getPref, setPref } from './store.js';
import { initSync, getSyncStatus, onSyncStatus } from './sync.js';
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
      <div class="top-actions">
        <button type="button" class="icon-btn sync" id="sync-status" hidden></button>
        <button type="button" class="icon-btn" id="sound-toggle"></button>
      </div>
    </div>
    <nav class="tabs" aria-label="主要功能">
      <div class="tabs-inner">
        <a href="#chart" data-route="chart">五十音表</a>
        <a href="#quiz" data-route="quiz">測驗</a>
      </div>
    </nav>
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
  connecting: { icon: 'cloud', text: '正在連線到雲端…' },
  synced: { icon: 'cloudCheck', text: '練習紀錄已同步到你的 Claude 帳號' },
  offline: { icon: 'cloudOff', text: '暫時連不上雲端，紀錄先存在這台裝置，連上後會自動同步' },
  local: { icon: 'cloudOff', text: '沒有登入或沒有權限，練習紀錄只存在這台裝置' },
};
const syncBtn = document.getElementById('sync-status');
const paintSync = (s) => {
  const info = SYNC_INFO[s];
  syncBtn.hidden = !info;
  if (!info) return;
  syncBtn.dataset.state = s;
  syncBtn.setAttribute('aria-label', info.text);
  syncBtn.title = info.text;
  syncBtn.innerHTML = icons[info.icon];
};
syncBtn.addEventListener('click', () => toast(SYNC_INFO[getSyncStatus()]?.text || ''));
onSyncStatus(paintSync);
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
