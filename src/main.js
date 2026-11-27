import './style.css';
import { renderChart } from './chart.js';
import { mountQuiz } from './quiz.js';
import { renderWordbook } from './wordbook.js';
import { renderSentencebook } from './sentencebook.js';
import { initSpeech } from './speech.js';
import { getPref, setPref } from './store.js';
import { initSync } from './sync.js';
import { mountSyncButton } from './syncPanel.js';
import { icons, toast } from './ui.js';

const app = document.getElementById('app');
app.innerHTML = `
  <header class="top">
    <div class="top-inner">
      <h1 class="vh" lang="ja">かな練習帳</h1>
      <nav class="tabs" aria-label="主要功能">
        <div class="tabs-inner">
          <a href="#kana" data-route="kana">假名</a>
          <a href="#words" data-route="words">單字</a>
          <a href="#sentences" data-route="sentences">句子</a>
        </div>
      </nav>
      <div class="top-actions">
        <button type="button" class="icon-btn sync" id="sync-status" aria-expanded="false" aria-controls="sync-panel" hidden></button>
        <button type="button" class="icon-btn" id="sound-toggle"></button>
        <div class="sync-panel" id="sync-panel" role="dialog" aria-labelledby="sync-title" tabindex="-1" hidden>
          <div class="sync-head">
            <h2 id="sync-title">雲端同步</h2>
            <button type="button" class="icon-btn plain" data-close aria-label="關閉">${icons.close}</button>
          </div>
          <div class="sync-body"></div>
        </div>
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

// 雲端同步（只有在 claude.ai 上打開才會出現）
mountSyncButton(app);
initSync();

// 簡單的 hash 路由。每個分頁先看熟悉度，再從底部的按鈕進去練習：
//   #kana 五十音表 → #kana/quiz 練習假名
//   #words 單字本 → #words/quiz 練習單字
//   #sentences 單字的例句 → #sentences/quiz 練習句子
const ROUTES = {
  kana: (v) => renderChart(v),
  'kana/quiz': (v) => mountQuiz(v, 'kana'),
  words: (v) => renderWordbook(v),
  'words/quiz': (v) => mountQuiz(v, 'word'),
  sentences: (v) => renderSentencebook(v),
  'sentences/quiz': (v) => mountQuiz(v, 'sentence'),
};

// 舊網址：#chart 是五十音表；#quiz 是以前的測驗頁，看上次練的是假名還是單字
function resolve(hash) {
  const h = hash.replace(/^#/, '');
  if (Object.hasOwn(ROUTES, h)) return h;
  if (h === 'quiz') return getPref('quizContent', 'kana') === 'word' ? 'words/quiz' : 'kana/quiz';
  return 'kana';
}

const view = document.getElementById('view');
let cleanup = null;

function route() {
  const name = resolve(location.hash);
  if (location.hash !== `#${name}`) {
    try {
      history.replaceState(null, '', `#${name}`);
    } catch {
      /* 改不了網址也沒關係，畫面照常顯示 */
    }
  }
  const tab = name.split('/')[0];
  document.querySelectorAll('[data-route]').forEach((a) => {
    if (a.dataset.route === tab) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  cleanup?.();
  view.innerHTML = '';
  cleanup = ROUTES[name](view);
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', route);
route();
