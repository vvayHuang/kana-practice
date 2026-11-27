// 分頁的「看熟悉度」清單：單字本和例句列表共用。
// 上面是說明、熟練度統計和篩選，下面一列一個項目，點一下聽發音、展開解釋；最下面是開始練習的紙條。

import { getPref, setPref, mastery, onStatsChange } from './store.js';
import { say } from './speech.js';

const FILTERS = { all: '全部', weak: '常答錯', learning: '練習中', new: '還沒練' };
const LEVEL = { good: '已熟練', learning: '練習中', weak: '常答錯', new: '還沒練' };

// o：
//   cls           外層的 class
//   filterPref    記住篩選的偏好設定名稱
//   unit          數量單位（個、句）
//   load()        → { items, intro }：範圍裡的項目、最上面的說明
//   sections(xs)  → [{ title, items }]：分成幾段列出（例如平假名、片假名）
//   key(x)        練習紀錄的 key；id(x) 項目編號
//   rowHTML(x)    一列裡的內容；detailHTML(x) 點開後的解釋
//   speakText(x)  點開時念的文字；exText(x) 解釋裡的喇叭按鈕念的文字
//   empty         { none, weak, learning, new }：沒有東西可列時的說明
//   barHTML(counts, total) 底部紙條；nextHTML() 最上面的下一步提醒（可省略）
export function renderBook(root, o) {
  const el = document.createElement('div');
  el.className = `book ${o.cls}`;
  root.appendChild(el);
  // 開始練習的紙條放在外面，寬螢幕分兩欄時也能貼在畫面底部
  const bar = document.createElement('div');
  bar.className = 'sheet start-bar tab-bar';
  root.appendChild(bar);

  let filter = getPref(o.filterPref, 'all');
  if (!(filter in FILTERS)) filter = 'all';
  let open = null; // 點開的項目
  let byId = new Map();

  const level = (x) => mastery(o.key(x));

  function rowHTML(x) {
    const lv = level(x);
    const id = o.id(x);
    const isOpen = open === id;
    return `<li class="w-item${isOpen ? ' open' : ''}">
      <button type="button" class="w-row" data-item="${id}" aria-expanded="${isOpen}">
        <span class="w-mark" aria-hidden="true">${lv === 'new' ? '' : `<i class="dot ${lv}"></i>`}</span>
        ${o.rowHTML(x)}
        <span class="vh">，${LEVEL[lv]}</span>
      </button>
      ${isOpen ? `<div class="w-entry">${o.detailHTML(x)}</div>` : ''}
    </li>`;
  }

  const sectionHTML = ({ title, items }) =>
    items.length
      ? `<section class="sheet w-col">
          ${title ? `<div class="sec-head"><h3 class="w-title">${title}</h3><span>${items.length} ${o.unit}</span></div>` : ''}
          <ul class="w-list">${items.map(rowHTML).join('')}</ul>
        </section>`
      : '';

  function draw() {
    const { items, intro } = o.load();
    byId = new Map(items.map((x) => [o.id(x), x]));
    const counts = { good: 0, learning: 0, weak: 0, new: 0 };
    items.forEach((x) => counts[level(x)]++);
    const shown = filter === 'all' ? items : items.filter((x) => level(x) === filter);

    const empty = (text) => `<section class="sheet w-col"><p class="w-empty">${text}</p></section>`;
    const sections = shown.length ? o.sections(shown).filter((s) => s.items.length) : [];
    const body = !items.length ? empty(o.empty.none) : !shown.length ? empty(o.empty[filter]) : sections.map(sectionHTML).join('');
    // 只有一段時，寬螢幕上不用分兩欄
    el.classList.toggle('single', sections.length <= 1);

    el.innerHTML = `
      ${o.nextHTML?.() || ''}
      <section class="sheet w-top">
        ${intro}
        ${
          items.length
            ? `<div class="legend">
                <span><i class="dot good"></i>已熟練 ${counts.good}</span>
                <span><i class="dot learning"></i>練習中 ${counts.learning}</span>
                <span><i class="dot weak"></i>常答錯 ${counts.weak}</span>
                <span>還沒練 ${counts.new}</span>
              </div>
              <div class="seg block w-filter" role="group" aria-label="篩選">
                ${Object.entries(FILTERS)
                  .map(([v, t]) => `<button type="button" data-filter="${v}" aria-pressed="${filter === v}">${t}</button>`)
                  .join('')}
              </div>`
            : ''
        }
      </section>
      ${body}`;
    bar.innerHTML = o.barHTML(counts, items.length);
  }

  // 只換掉點開、收起的那兩列，不整個重畫：捲動位置和焦點都不會跑掉
  function toggle(btn) {
    const id = btn.dataset.item;
    const top = btn.getBoundingClientRect().top;
    if (open) {
      const prev = [...el.querySelectorAll('.w-row')].find((b) => b.dataset.item === open);
      prev?.setAttribute('aria-expanded', 'false');
      prev?.parentElement.classList.remove('open');
      prev?.parentElement.querySelector('.w-entry')?.remove();
    }
    open = open === id ? null : id;
    const x = byId.get(id);
    if (open && x) {
      btn.setAttribute('aria-expanded', 'true');
      btn.parentElement.classList.add('open');
      btn.insertAdjacentHTML('afterend', `<div class="w-entry">${o.detailHTML(x)}</div>`);
      say(o.speakText(x));
    }
    // 上面收起的解釋會讓這一列往上跑，捲回原來的位置
    window.scrollBy(0, btn.getBoundingClientRect().top - top);
  }

  el.addEventListener('click', (e) => {
    const t = e.target.closest('button');
    if (!t) return;
    if (t.dataset.act === 'speak-ex') {
      const x = byId.get(t.dataset.item);
      if (x) say(o.exText(x), { force: true });
    } else if (t.dataset.filter) {
      filter = t.dataset.filter;
      setPref(o.filterPref, filter);
      draw();
      if (e.detail === 0) el.querySelector(`[data-filter="${filter}"]`)?.focus({ preventScroll: true });
    } else if (t.dataset.item) {
      toggle(t);
    }
  });

  // 其他裝置的紀錄同步進來時，熟練度可能變了
  const offStats = onStatsChange(draw);

  draw();
  return offStats;
}
