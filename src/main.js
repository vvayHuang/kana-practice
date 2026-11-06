import './style.css';
import { renderChart } from './chart.js';
import { mountQuiz } from './quiz.js';
import { initSpeech } from './speech.js';
import { getPref, setPref } from './store.js';
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
      <button type="button" class="icon-btn" id="sound-toggle"></button>
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
