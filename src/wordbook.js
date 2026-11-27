// 單字本：列出用已選範圍的假名就能寫出來的單字和熟練度，點一下聽發音、看字典解釋。

import { display } from './kana.js';
import { WORDS } from './words.js';
import { getPref, setPref, mastery, onStatsChange } from './store.js';
import { savedGroups, wordsIn, rangeLabel } from './range.js';
import { entryHTML } from './entry.js';
import { say } from './speech.js';
import { icons } from './ui.js';

const FILTERS = { all: '全部', weak: '常答錯', learning: '練習中', new: '還沒練' };
const LEVEL = { good: '已熟練', learning: '練習中', weak: '常答錯', new: '還沒練' };
const EMPTY = {
  weak: '沒有常答錯的單字，很棒！',
  learning: '沒有正在練習的單字。',
  new: '這個範圍的單字都練過了！',
};
const BY_WORD = Object.fromEntries(WORDS.map((w) => [w.kana, w]));

const show = (w) => display(w, w.script);
const level = (w) => mastery(`word:${w.kana}`);

export function renderWordbook(root) {
  const el = document.createElement('div');
  el.className = 'wordbook';
  root.appendChild(el);
  // 開始練習的紙條放在外面，寬螢幕分兩欄時也能貼在畫面底部
  const bar = document.createElement('div');
  bar.className = 'sheet start-bar tab-bar';
  root.appendChild(bar);

  let filter = getPref('bookFilter', 'all');
  if (!(filter in FILTERS)) filter = 'all';
  let open = null; // 點開的單字

  function rowHTML(w) {
    const lv = level(w);
    const isOpen = open === w.kana;
    return `<li class="w-item${isOpen ? ' open' : ''}">
      <button type="button" class="w-row" data-word="${w.kana}" aria-expanded="${isOpen}">
        <span class="w-mark" aria-hidden="true">${lv === 'new' ? '' : `<i class="dot ${lv}"></i>`}</span>
        <span class="w-head"><span class="w-word" lang="ja">${show(w)}</span><span class="w-romaji">${w.romaji}</span></span>
        <span class="w-zh">${w.zh}</span>
        <span class="vh">，${LEVEL[lv]}</span>
      </button>
      ${isOpen ? `<div class="w-entry">${entryHTML(w, null)}</div>` : ''}
    </li>`;
  }

  const listHTML = (title, list) =>
    list.length
      ? `<section class="sheet w-col">
          <div class="sec-head"><h3 class="w-title">${title}</h3><span>${list.length} 個</span></div>
          <ul class="w-list">${list.map(rowHTML).join('')}</ul>
        </section>`
      : '';

  function draw() {
    const groups = savedGroups();
    const words = wordsIn(groups);
    const counts = { good: 0, learning: 0, weak: 0, new: 0 };
    words.forEach((w) => counts[level(w)]++);
    const shown = filter === 'all' ? words : words.filter((w) => level(w) === filter);
    const outside = WORDS.length - words.length;

    let body;
    const empty = (text) => `<section class="sheet w-col"><p class="w-empty">${text}</p></section>`;
    if (!words.length) body = empty('這個範圍還寫不出單字。按下面的「練習單字」，多選幾行假名吧。');
    else if (!shown.length) body = empty(EMPTY[filter]);
    else
      body =
        listHTML('平假名', shown.filter((w) => w.script === 'hira')) +
        listHTML('片假名', shown.filter((w) => w.script === 'kata'));

    el.innerHTML = `
      <section class="sheet w-top">
        <div class="range-head">
          <h2 class="sheet-title">單字本</h2>
          <span class="muted">${words.length} 個能讀的單字</span>
        </div>
        <p class="w-range">只列出用 <b>${rangeLabel(groups) || '已選範圍'}</b> 的假名就能寫出來的單字${
          outside ? `，學更多行，還有 ${outside} 個會出現` : ''
        }。點一下單字可以聽發音、看解釋。</p>
        <a class="link-btn" href="#words/quiz">改範圍</a>
        ${
          words.length
            ? `<div class="legend">
                <span><i class="dot good"></i>已熟練 ${counts.good}</span>
                <span><i class="dot learning"></i>練習中 ${counts.learning}</span>
                <span><i class="dot weak"></i>常答錯 ${counts.weak}</span>
                <span>還沒練 ${counts.new}</span>
              </div>
              <div class="seg block w-filter" role="group" aria-label="篩選單字">
                ${Object.entries(FILTERS)
                  .map(([v, t]) => `<button type="button" data-filter="${v}" aria-pressed="${filter === v}">${t}</button>`)
                  .join('')}
              </div>`
            : ''
        }
      </section>
      ${body}`;

    const sum = !words.length
      ? '<b>還沒有能練的單字</b>先多選幾行假名'
      : counts.weak
        ? `<b>${counts.weak} 個常答錯</b>練習時會先出現`
        : `<b>${words.length} 個單字</b>下一步選題型和題數`;
    bar.innerHTML = `
      <p class="start-sum">${sum}</p>
      <a class="btn primary" href="#words/quiz">練習單字 ${icons.arrow}</a>`;
  }

  // 只換掉點開、收起的那兩列，不整個重畫：捲動位置和焦點都不會跑掉
  function toggle(btn) {
    const kana = btn.dataset.word;
    const top = btn.getBoundingClientRect().top;
    if (open) {
      const prev = el.querySelector(`.w-row[data-word="${open}"]`);
      prev?.setAttribute('aria-expanded', 'false');
      prev?.parentElement.classList.remove('open');
      prev?.parentElement.querySelector('.w-entry')?.remove();
    }
    open = open === kana ? null : kana;
    if (open) {
      btn.setAttribute('aria-expanded', 'true');
      btn.parentElement.classList.add('open');
      btn.insertAdjacentHTML('afterend', `<div class="w-entry">${entryHTML(BY_WORD[kana], null)}</div>`);
      say(show(BY_WORD[kana]));
    }
    // 上面收起的解釋會讓這一列往上跑，捲回原來的位置
    window.scrollBy(0, btn.getBoundingClientRect().top - top);
  }

  el.addEventListener('click', (e) => {
    const t = e.target.closest('button');
    if (!t) return;
    if (t.dataset.act === 'speak-ex') {
      const w = BY_WORD[t.dataset.word];
      if (w?.dict) say(w.dict.ex, { force: true });
    } else if (t.dataset.filter) {
      filter = t.dataset.filter;
      setPref('bookFilter', filter);
      draw();
      if (e.detail === 0) el.querySelector(`[data-filter="${filter}"]`)?.focus({ preventScroll: true });
    } else if (t.dataset.word) {
      toggle(t);
    }
  });

  // 其他裝置的紀錄同步進來時，熟練度可能變了
  const offStats = onStatsChange(draw);

  draw();
  return offStats;
}
