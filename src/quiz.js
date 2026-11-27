import { GROUPS, ALL, toKatakana, display, keyOf, confusables } from './kana.js';
import { WORDS } from './words.js';
import { getPref, setPref, record, mastery, getStat, weight, onStatsChange, slowLimit } from './store.js';
import { DEFAULT_GROUPS, itemsIn, scriptsFor, wordsIn } from './range.js';
import { entryHTML, markWord } from './entry.js';
import { sentencesIn, sentenceKey, prepSentence } from './sentences.js';
import { SCENES, SCENE_BY_ID, SCENE_ITEMS, sceneKey } from './scenes.js';
import { say, canSpeak } from './speech.js';
import { icons } from './ui.js';

const MODES = { k2r: '看假名 選拼音', r2k: '看拼音 選假名' };
const WORD_MODES = { read: '單字→拼音', mean: '單字→意思', pick: '意思→單字' };
const SENT_MODES = { mix: '混合', order: '排句子', mean: '選意思', listen: '聽句子' };
const HINTS = { off: '關', on: '開' };
const NOUN = { kana: '假名', word: '單字', sentence: '句子', scene: '情境題' };
const WORD_MIN = 4; // 單字、句子至少要有幾個才能出題（一題四個選項）
const SCRIPTS = { hira: '平假名', kata: '片假名', mix: '混合' };
const SCRIPT_NAME = { hira: '平假名', kata: '片假名' };

const shuffle = (arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const uniqBy = (arr, f) => {
  const seen = new Set();
  return arr.filter((x) => {
    const k = f(x);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
};

// 題目可能是假名、單字、句子或情境題。單字自己帶著文字種類（script）和中文意思（zh）；
// 句子的 kind 是 'sentence'，情境題的 kind 是 'scene'（見 sentences.js、scenes.js）。
const isSentence = (item) => item.kind === 'sentence';
const isScene = (item) => item.kind === 'scene';
const isWord = (item) => !item.kind && 'zh' in item;
const show = (item, script) => display(item, item.script || script);
const kindOf = (item) => item.kind || (isWord(item) ? 'word' : 'kana');
const qKey = (q) =>
  ({
    sentence: () => sentenceKey(q.item),
    scene: () => sceneKey(q.item),
    word: () => `word:${q.item.kana}`,
    kana: () => keyOf(q.item, q.script),
  })[kindOf(q.item)]();
// 答完要念的：假名、單字念它本身，句子念整句，情境題念正確的說法（只有中文答案時念對方的話）
const speakText = (q) =>
  isScene(q.item)
    ? q.item.answer.ja || q.item.they?.ja || ''
    : isSentence(q.item)
      ? q.item.ja
      : show(q.item, q.script);
// 選到的是不是正確答案：句子題的選項是句子本身，情境題是答案那一項；假名、單字比對假名
const isRight = (o, q) =>
  isScene(q.item) ? o === q.item.answer : isSentence(q.item) ? o === q.item : o.kana === q.item.kana;

// 依權重抽 n 題（不重複）：不熟的假名權重高，比較容易被抽到
function pickWeighted(qs, n) {
  return qs
    .map((q) => ({ q, r: Math.random() ** (1 / weight(qKey(q))) }))
    .sort((a, b) => b.r - a.r)
    .slice(0, n)
    .map((x) => x.q);
}

// 常答錯的題目（和五十音表上紅點的標準一樣）。答對幾次、正確率回升後就不算了。
const isWeak = (q) => mastery(qKey(q)) === 'weak';

// 出題：範圍裡常答錯的一定會出（最多佔一半，錯越多的越優先），剩下的依熟練度加權抽
function pickQuestions(qs, length) {
  if (length === 'all' || qs.length <= length) return qs;
  const misses = (q) => getStat(qKey(q)).w - getStat(qKey(q)).c;
  const weak = shuffle(qs.filter(isWeak))
    .sort((a, b) => misses(b) - misses(a))
    .slice(0, Math.ceil(length / 2));
  const rest = qs.filter((q) => !weak.includes(q));
  return [...weak, ...pickWeighted(rest, length - weak.length)];
}

// 干擾選項：拼音不能和答案相同（じ／ぢ 都念 ji），長度相同（拗音配拗音）。
// 優先挑容易混淆的：先放長得像的（ぬ／め、シ／ツ），再補念起來像的（同一行或同一段），
// 剩下的從目前範圍隨機挑，不夠再從全部假名補。混淆的假名也只從目前範圍裡找。
function makeOptions(q, pool) {
  const inPool = new Set(pool);
  const picks = [];
  const add = (list, max) => {
    for (const i of shuffle(list)) {
      if (picks.length >= max) return;
      if (i.romaji === q.item.romaji || i.kana.length !== q.item.kana.length) continue;
      if (!picks.some((p) => p.romaji === i.romaji)) picks.push(i);
    }
  };
  const { look, sound } = confusables(q.item, q.script);
  add(look.filter((i) => inPool.has(i)), 3);
  add(sound.filter((i) => inPool.has(i)), 2);
  add(pool, 3);
  add(ALL, 3);
  return shuffle([q.item, ...picks]);
}

// 單字的干擾選項：優先挑同一種文字裡開頭相同、長度相同的單字，比較不容易用猜的
function makeWordOptions(q, pool) {
  const picks = [];
  const add = (list) => {
    for (const w of shuffle(list)) {
      if (picks.length >= 3) return;
      if (w !== q.item && !picks.includes(w)) picks.push(w);
    }
  };
  const same = pool.filter((w) => w.script === q.item.script);
  add(same.filter((w) => w.size === q.item.size && w.kana[0] === q.item.kana[0]));
  add(same.filter((w) => w.size === q.item.size));
  add(same);
  add(pool);
  add(WORDS);
  return shuffle([q.item, ...picks]);
}

// 答錯時朱筆在選項旁邊打的叉，兩筆依序畫出來（畫在右側，不蓋住選項的字）
const STRIKE = `<svg class="strike" viewBox="0 0 24 24" aria-hidden="true">
  <path d="M5 5 19 19" /><path d="M19 5 5 19" /></svg>`;

// 答對的選項用墨筆圈起來
const RING = `<svg class="strike" viewBox="0 0 24 24" aria-hidden="true">
  <circle cx="12" cy="12" r="9" transform="rotate(-90 12 12)" /></svg>`;

const seg = (field, opts, cur) => `
  <div class="seg block" role="group" data-field="${field}">
    ${Object.entries(opts)
      .map(([v, t]) => `<button type="button" data-val="${v}" aria-pressed="${String(cur) === v}">${t}</button>`)
      .join('')}
  </div>`;

const MESSAGES = {
  kana: ['全對！太厲害了！', '很棒，快要熟練了！', '不錯喔，再多練幾次會更熟。', '慢慢來，先回五十音表看一看也很好。'],
  word: ['全對！這些單字都記住了！', '很棒，大部分單字都認得了！', '不錯喔，再多練幾次就記得住。', '慢慢來，單字多看幾次就會記住。'],
  sentence: ['全對！這些句子都看懂了！', '很棒，大部分句子都看得懂了！', '不錯喔，多聽幾次會越來越順。', '慢慢來，先回句子列表聽一聽也很好。'],
  scene: ['全對！遇到這些場合都知道怎麼說了！', '很棒，大部分場合都會說了！', '不錯喔，多看幾次解說會更有把握。', '慢慢來，先回情境列表看一看、聽一聽也很好。'],
};

function resultMessage(pct, kind) {
  const m = MESSAGES[kind];
  return pct === 100 ? m[0] : pct >= 80 ? m[1] : pct >= 50 ? m[2] : m[3];
}

// content：'kana' 練假名（假名分頁），'word' 練單字（單字分頁），'sentence' 練例句、'scene' 練情境題（句子分頁）
// opts.scene：從某個情境的頁面進來時，只先選那個情境
export function mountQuiz(root, content, opts = {}) {
  const el = document.createElement('div');
  el.className = 'quiz';
  root.appendChild(el);

  const cfg = {
    content,
    mode: getPref('quizMode', 'k2r'),
    wordMode: getPref('quizWordMode', 'read'),
    sentMode: getPref('quizSentMode', 'mix'),
    hint: getPref('sentHint', 'off'), // 句子題要不要顯示拼音
    script: getPref('quizScript', 'hira'),
    groups: new Set(getPref('quizGroups', DEFAULT_GROUPS)),
    scenes: new Set(opts.scene ? [opts.scene] : getPref('quizScenes', SCENES.map((x) => x.id))),
    length: getPref('quizLength', 10),
  };
  let screen = 'setup';
  let game = null;
  let timer = null;
  let weakShown = -1; // 設定畫面上顯示的「常答錯」數量

  const saveCfg = () => {
    setPref('quizMode', cfg.mode);
    setPref('quizWordMode', cfg.wordMode);
    setPref('quizSentMode', cfg.sentMode);
    setPref('sentHint', cfg.hint);
    setPref('quizScript', cfg.script);
    setPref('quizGroups', [...cfg.groups]);
    setPref('quizScenes', [...cfg.scenes]);
    setPref('quizLength', cfg.length);
  };

  const selectedItems = () => itemsIn(cfg.groups);
  // 只用已選範圍裡的假名就能寫出來的單字
  const selectedWords = () => wordsIn(cfg.groups, scriptsFor(cfg.script));

  // 目前設定下所有可能的題目
  function cfgQuestions() {
    if (cfg.content === 'scene') {
      const list = SCENE_ITEMS.filter((q) => cfg.scenes.has(q.scene));
      return { qs: list.map((item) => ({ item })), pool: list, mode: 'scene', ready: list.length > 0 };
    }
    if (cfg.content === 'sentence') {
      const list = sentencesIn(cfg.groups);
      return { qs: list.map((item) => ({ item })), pool: list, mode: cfg.sentMode, ready: list.length >= WORD_MIN };
    }
    if (cfg.content === 'word') {
      const words = selectedWords();
      const qs = words.map((item) => ({ item, script: item.script }));
      return { qs, pool: words, mode: cfg.wordMode, ready: words.length >= WORD_MIN };
    }
    const items = selectedItems();
    const qs = items.flatMap((item) => scriptsFor(cfg.script).map((script) => ({ item, script })));
    return { qs, pool: items, mode: cfg.mode, ready: items.length > 0 };
  }

  // 準備一題：假名、單字是四個選項；句子題由 sentences.js 決定題型，排句子是一組詞塊
  function prep(q, pool, mode) {
    if (isSentence(q.item)) return prepSentence(q, pool, mode, canSpeak());
    if (isScene(q.item)) return { ...q, options: shuffle([q.item.answer, ...q.item.wrong]) };
    return { ...q, options: (isWord(q.item) ? makeWordOptions : makeOptions)(q, pool) };
  }

  // 題目一出現就念：聽句子一定念；情境題有對方說的話時，照自動發音的設定念
  // （是使用者按了按鈕才走到這裡，瀏覽器會讓它播）
  function cue() {
    const q = screen === 'play' && game.qs[game.i];
    if (!q) return;
    if (q.mode === 'listen') say(q.item.ja, { force: true });
    else if (isScene(q.item) && q.item.they) say(q.item.they.ja);
  }

  function start(questions, pool, mode) {
    clearTimeout(timer);
    game = {
      qs: shuffle(questions).map((q) => prep(q, pool, mode)),
      pool,
      mode, // k2r / r2k（假名）、read / mean / pick（單字）或 mix / order / mean / listen（句子）
      hint: cfg.hint === 'on',
      ok: false,
      i: 0,
      score: 0,
      streak: 0,
      best: 0,
      answered: false,
      picked: -1,
      mistakes: [],
      slow: [], // 答對但想比較久的
      shownAt: performance.now(),
    };
    screen = 'play';
    draw();
    cue();
  }

  function startFromCfg() {
    const { qs, pool, mode, ready } = cfgQuestions();
    if (ready) start(pickQuestions(qs, cfg.length), pool, mode);
  }

  function answer(idx) {
    if (screen !== 'play' || game.answered) return;
    const q = game.qs[game.i];
    if (!q.options || idx < 0 || idx >= q.options.length) return;
    game.picked = idx;
    settle(q, isRight(q.options[idx], q));
  }

  // 排句子：詞塊放上去、拿回來、檢查
  function place(i) {
    const q = game?.qs[game.i];
    if (screen !== 'play' || game.answered || !q?.bank || q.placed.includes(i)) return;
    if (i < 0 || i >= q.bank.length || q.placed.length >= q.item.chunks.length) return;
    q.placed.push(i);
    draw();
  }

  function unplace(k) {
    const q = game?.qs[game.i];
    if (screen !== 'play' || game.answered || !q?.bank || k < 0 || k >= q.placed.length) return;
    q.placed.splice(k, 1);
    draw();
  }

  function check() {
    if (screen !== 'play' || game.answered) return;
    const q = game.qs[game.i];
    if (!q.bank || q.placed.length !== q.item.chunks.length) return;
    settle(q, q.placed.map((i) => q.bank[i].t).join('|') === q.item.chunks.join('|'));
  }

  // 記下這一題答對還是答錯
  function settle(q, ok) {
    game.answered = true;
    game.ok = ok;
    const ms = performance.now() - game.shownAt;
    record(qKey(q), ok, ms);
    if (ok) {
      if (ms > slowLimit(qKey(q))) game.slow.push(q);
      game.score++;
      game.streak++;
      game.best = Math.max(game.best, game.streak);
    } else {
      game.streak = 0;
      game.mistakes.push(q);
    }
    say(speakText(q));
    draw();
    // 假名答對會自動跳下一題；單字、句子要看解釋，等使用者自己按「下一題」
    if (ok && kindOf(q.item) === 'kana') timer = setTimeout(next, 900);
  }

  function next() {
    clearTimeout(timer);
    if (screen !== 'play' || !game.answered) return;
    game.i++;
    game.answered = false;
    game.ok = false;
    game.picked = -1;
    game.shownAt = performance.now();
    if (game.i >= game.qs.length) screen = 'result';
    draw();
    cue();
  }

  // ---------- 畫面 ----------

  function drawSetup() {
    const items = selectedItems();
    const wordMode = cfg.content === 'word';
    const sentMode = cfg.content === 'sentence';
    const sceneMode = cfg.content === 'scene';
    const noun = NOUN[cfg.content];
    const { qs, ready } = cfgQuestions();
    const words = wordMode ? qs.length : 0;
    const total = qs.length;
    const weak = qs.filter(isWeak).length;
    // 題數比範圍內的題目還多的選項不列出來（選了也出不滿）；原本選的題數出不滿時，顯示成「全部」
    const lengths = {};
    for (const n of [10, 20]) if (n < total) lengths[n] = `${n} 題`;
    lengths.all = `全部 ${total} 題`;
    const lengthOn = cfg.length !== 'all' && cfg.length < total ? cfg.length : 'all';
    weakShown = weak;
    const emptyHint = wordMode
      ? '這個範圍能組成的單字太少，多選幾行吧'
      : sentMode
        ? '這個範圍的例句太少，多選幾行吧'
        : sceneMode
          ? '先選至少一個情境喔'
          : '先選至少一個範圍喔';

    const kata = cfg.script === 'kata';
    const conv = (k) => (kata ? toKatakana(k) : k);
    // 每一行直接列出裡面的假名和念法；濁音、拗音太多，只列每行的第一個當例子
    const rowPick = (g) => {
      const on = cfg.groups.has(g.id);
      let kana;
      let name;
      if (g.kind === 'seion') {
        kana = g.items.map((i) => conv(i.kana)).join('');
        name = g.items.map((i) => i.romaji).join(' ');
      } else {
        const step = g.kind === 'dakuon' ? 5 : 3;
        const sample = g.items.filter((_, i) => i % step === 0).slice(0, g.kind === 'yoon' ? 4 : 5);
        kana = sample.map((i) => conv(i.kana)).join(g.kind === 'yoon' ? ' ' : '');
        name = `${g.label}・共 ${g.items.length} 個`;
      }
      return `<button type="button" class="row-pick${g.kind === 'seion' && g.id !== 'n' ? '' : ' wide'}" data-group="${g.id}"
        aria-pressed="${on}" aria-label="${g.label}：${name}">
        <span class="rp-kana" lang="ja" aria-hidden="true">${kana}</span>
        <span class="rp-name" aria-hidden="true">${name}</span>
      </button>`;
    };
    const count = lengthOn === 'all' ? total : lengthOn;

    const back = {
      kana: { href: '#kana', text: '回到五十音表' },
      word: { href: '#words', text: '回到單字本' },
      sentence: { href: '#sentences', text: '回到句子列表' },
      scene: opts.scene
        ? { href: `#scenes/${opts.scene}`, text: `回到${SCENE_BY_ID[opts.scene].name}` }
        : { href: '#sentences', text: '回到句子' },
    }[cfg.content];
    // 情境題不用選假名的範圍，改成選要練哪些情境
    const scenePick = (x) => `<button type="button" class="row-pick" data-scene="${x.id}" aria-pressed="${cfg.scenes.has(x.id)}">
        <span class="rp-scene">${x.name}</span>
        <span class="rp-name">${x.items.length} 題</span>
      </button>`;
    const weakNote = weak
      ? `<p class="range-note weak-note"><i class="dot weak"></i>其中 ${weak} ${sceneMode ? '題' : `個${noun}`}常答錯，測驗時會優先出現。</p>`
      : '';
    const rangeHTML = sceneMode
      ? `<section class="sheet setup">
          <div class="range-head">
            <h2 class="sheet-title">要練哪些情境？</h2>
            <span class="muted">已選 ${cfg.scenes.size} 個情境・${total} 題</span>
          </div>
          <div class="rows">${SCENES.map(scenePick).join('')}</div>
          <div class="quick">
            <button type="button" class="link-btn" data-quick="scenes-all">全選</button>
            <button type="button" class="link-btn" data-quick="scenes-none">清除</button>
          </div>
          ${weakNote}
        </section>`
      : '';
    const typeSeg = wordMode
      ? seg('wordMode', WORD_MODES, cfg.wordMode)
      : sentMode
        ? seg('sentMode', SENT_MODES, cfg.sentMode)
        : seg('mode', MODES, cfg.mode);

    el.innerHTML = `
      <a class="link-btn back-link" href="${back.href}">${icons.back}${back.text}</a>
      ${rangeHTML}
      <section class="sheet setup"${sceneMode ? ' hidden' : ''}>
        <div class="range-head">
          <h2 class="sheet-title">要練哪幾行？</h2>
          <span class="muted">已選 ${items.length} 個假名${wordMode ? `・${words} 個單字` : sentMode ? `・${total} 句` : ''}</span>
        </div>
        <div class="rows">${GROUPS.map(rowPick).join('')}</div>
        <div class="quick">
          <button type="button" class="link-btn" data-quick="seion">全部清音</button>
          <button type="button" class="link-btn" data-quick="all">全選</button>
          <button type="button" class="link-btn" data-quick="none">清除</button>
        </div>
        ${wordMode ? '<p class="range-note">只會出現用已選的假名就能寫出來的單字。</p>' : ''}
        ${sentMode ? '<p class="range-note">只會出現單字本裡那些單字的例句。句子裡可能有還沒學過的假名，可以打開拼音提示。</p>' : ''}
        ${sceneMode ? '' : weakNote}
      </section>
      <section class="sheet fields">
        <div class="field"${sceneMode ? ' hidden' : ''}>
          <p class="field-label">題型</p>
          ${typeSeg}
        </div>
        ${
          sentMode || sceneMode
            ? `<div class="field">
                <p class="field-label">拼音</p>
                ${seg('hint', HINTS, cfg.hint)}
              </div>`
            : `<div class="field">
                <p class="field-label">文字</p>
                ${seg('script', SCRIPTS, cfg.script)}
              </div>`
        }
        <div class="field">
          <p class="field-label">題數</p>
          ${seg('length', lengths, lengthOn)}
        </div>
        ${sentMode && !canSpeak() ? '<p class="range-note">這台裝置沒有日文語音，所以不會出「聽句子」。</p>' : ''}
      </section>
      <div class="sheet start-bar">
        <p class="start-sum">${
          ready
            ? `<b>${count} 題</b>${
                wordMode ? `${words} 個單字` : sentMode ? `${total} 句` : sceneMode ? `${total} 題情境題` : `${items.length} 個假名`
              }裡出題`
            : emptyHint
        }</p>
        <button type="button" class="btn primary" data-act="start" ${ready ? '' : 'disabled'}>
          開始測驗 ${icons.arrow}
        </button>
      </div>`;
  }

  function feedbackHTML(q, ok) {
    const picked = q.options?.[game.picked];
    const last = game.i + 1 >= game.qs.length;
    const word = isWord(q.item);
    const manual = kindOf(q.item) !== 'kana'; // 不會自動跳題
    const kana = (i) => `<b lang="ja">${show(i, q.script)}</b>`;
    let text;
    if (ok) text = `<div class="fb-text ok">${icons.check}<span>答對了！</span></div>`;
    // 情境題答完每個選項都會寫出意思，這裡只說選到的是什麼
    else if (isScene(q.item))
      text = `<div class="fb-text bad">
          <span>答錯了</span>
          <small>你選的${picked.ja ? '意思' : ''}是「${picked.zh}」</small>
        </div>`;
    // 句子題的正確答案寫在題目區塊裡（排句子）或是圈起來的選項（選意思、聽句子）
    else if (isSentence(q.item))
      text = `<div class="fb-text bad">
          <span>${q.mode === 'order' ? '順序不太對' : '答錯了'}</span>
          <small>${q.mode === 'order' ? '正確的句子寫在上面' : `你選的是「${picked.zh}」`}</small>
        </div>`;
    // 單字的正確答案已經寫在題目下方的解釋裡，這裡只說選到的是什麼
    else if (word)
      text = `<div class="fb-text bad">
          <span>答錯了</span>
          <small>你選的是 ${kana(picked)} ${picked.romaji}（${picked.zh}）</small>
        </div>`;
    else
      text = `<div class="fb-text bad">
          <span>答案是 ${kana(q.item)} ${q.item.romaji}</span>
          <small>你選的 ${kana(picked)} 念 ${picked.romaji}</small>
        </div>`;
    // 假名答對會自動跳題，按鈕淡一點；其他情況都要自己按，用主要按鈕
    return `${text}<button type="button" class="btn ${ok && !manual ? 'ghost' : 'primary'}" data-act="next">${
      last ? '看結果' : '下一題'
    } ${icons.arrow}</button>`;
  }

  function playTopHTML() {
    const n = game.qs.length;
    const done = game.i + (game.answered ? 1 : 0);
    return `<div class="play-top">
      <button type="button" class="icon-btn" data-act="quit" aria-label="結束測驗">${icons.close}</button>
      <div class="progress" role="progressbar" aria-label="進度" aria-valuemin="0" aria-valuemax="${n}" aria-valuenow="${done}">
        <div class="bar" style="transform:scaleX(${done / n})"></div>
      </div>
      <span class="counter">${game.i + 1} / ${n}</span>
    </div>`;
  }

  // 四個選項：答完後答對的那格圈起來，選錯的那格打叉，其他的變淡
  function optionsHTML(q, label, cls, ja) {
    const correctIdx = q.options.findIndex((o) => isRight(o, q));
    return `<div class="options${cls}">
      ${q.options
        .map((o, idx) => {
          let state = '';
          if (game.answered) state = idx === correctIdx ? 'correct' : idx === game.picked ? 'wrong' : 'dim';
          return `<button type="button" class="opt ${state}" data-opt="${idx}" ${game.answered ? 'disabled' : ''}>
            <span class="num" aria-hidden="true">${idx + 1}</span>
            <span class="opt-label"${ja ? ' lang="ja"' : ''}>${label(o)}</span>
            ${state === 'wrong' ? STRIKE : state === 'correct' ? RING : ''}
          </button>`;
        })
        .join('')}
    </div>`;
  }

  function drawPlay() {
    const q = game.qs[game.i];
    if (isSentence(q.item)) return drawSentence(q);
    if (isScene(q.item)) return drawScene(q);
    const mode = game.mode;
    const shown = show(q.item, q.script);
    // 每種題型：題目上面的說明、題目的樣式和內容、選項顯示什麼
    const view = {
      k2r: { label: '這個假名怎麼念？', cls: 'kana', main: shown, opt: (o) => o.romaji },
      r2k: { label: `選出這個音的${SCRIPT_NAME[q.script]}`, cls: 'romaji', main: q.item.romaji, opt: (o) => show(o, q.script), ja: true },
      read: { label: '這個單字怎麼念？', cls: 'kana word', main: shown, opt: (o) => o.romaji },
      mean: { label: '這個單字是什麼意思？', cls: 'kana word', main: shown, opt: (o) => o.zh },
      pick: { label: '選出這個意思的單字', cls: 'meaning', main: q.item.zh, opt: (o) => show(o, q.script), ja: true },
    }[mode];
    const showsKana = view.cls.startsWith('kana'); // 題目本身就是假名，可以先聽發音
    const chars = [...shown]; // 題目的假名一個字寫一格
    const ok = game.answered && game.ok;
    const word = isWord(q.item);
    const explain = word && game.answered; // 單字答完：題目下方顯示字典解釋

    el.innerHTML = `
      <div class="play">
        ${playTopHTML()}

        <section class="sheet prompt${explain ? ' answered' : ''}">
          <p class="prompt-label">${view.label}</p>
          <div class="prompt-main ${view.cls}"${showsKana ? ` lang="ja" style="--n:${chars.length}"` : ''}>${
            showsKana ? chars.map((ch) => `<span class="box">${ch}</span>`).join('') : view.main
          }</div>
          ${
            showsKana || game.answered
              ? `<button type="button" class="icon-btn speak" data-act="speak" aria-label="播放發音">${icons.volume}</button>`
              : ''
          }
          <p class="prompt-meta">${game.streak >= 3 ? `連續答對 ${game.streak} 題` : explain ? '' : '&nbsp;'}</p>
          ${explain ? entryHTML(q.item, mode === 'pick' ? 'word' : 'zh') : ''}
        </section>

        <div class="dock">
          ${optionsHTML(q, view.opt, word ? ' words' : '', view.ja)}
          <div class="feedback" aria-live="polite">${game.answered ? feedbackHTML(q, ok) : ''}</div>
        </div>
      </div>`;

    // 不會自動跳題時，把焦點放到「下一題」，鍵盤直接按 Enter 就好
    if (game.answered && (!ok || word)) el.querySelector('[data-act="next"]')?.focus({ preventScroll: true });
  }

  // 情境題：場合（中文）、對方說的話（接話題才有），選出該說的話。
  // 答完每個選項下面都會寫出意思，知道錯的那些是什麼場合用的；還沒答時先佔好位置，選項才不會長高。
  function drawScene(q) {
    const it = q.item;
    const answered = game.answered;
    const ok = answered && game.ok;
    const hint = game.hint;
    const they = it.they
      ? `<div class="sc-they">
          <div class="sc-they-text">
            <p class="s-ja" lang="ja">${it.they.ja}</p>
            ${hint || answered ? `<p class="s-romaji">${it.they.romaji}</p>` : ''}
            ${answered ? `<p class="s-zh">${it.they.zh}</p>` : ''}
          </div>
          <button type="button" class="icon-btn plain" data-act="speak-they" aria-label="播放對方說的話">${icons.volume}</button>
        </div>`
      : '';
    const label = (o) =>
      o.ja
        ? `<span class="sc-opt-ja" lang="ja">${o.ja}</span>${hint ? `<small>${o.romaji}</small>` : ''}<small${
            answered ? '' : ' class="keep-space" aria-hidden="true"'
          }>${o.zh}</small>`
        : o.zh;

    el.innerHTML = `
      <div class="play">
        ${playTopHTML()}
        <section class="sheet prompt s-prompt sc-prompt${answered ? ' answered' : ''}">
          <p class="prompt-label">情境題・${SCENE_BY_ID[it.scene].name}</p>
          ${
            answered && it.answer.ja
              ? `<button type="button" class="icon-btn speak" data-act="speak" aria-label="播放正確的說法">${icons.volume}</button>`
              : ''
          }
          <div class="s-main">
            <p class="sc-ask">${it.ask}</p>
            ${they}
          </div>
          ${answered ? `<div class="sc-why"><p class="entry-label">為什麼</p><p class="sc-note">${it.note}</p></div>` : ''}
          <p class="prompt-meta">${game.streak >= 3 ? `連續答對 ${game.streak} 題` : '&nbsp;'}</p>
        </section>
        <div class="dock">
          ${optionsHTML(q, label, ' sentences scene', false)}
          <div class="feedback" aria-live="polite">${answered ? feedbackHTML(q, ok) : ''}</div>
        </div>
      </div>`;

    if (answered) el.querySelector('[data-act="next"]')?.focus({ preventScroll: true });
  }

  // 句子題：排句子、選意思、聽句子
  function drawSentence(q) {
    const s = q.item;
    const answered = game.answered;
    const ok = answered && game.ok;
    const hint = game.hint;
    const label = {
      order: '把下面的詞，排成這句話的日文',
      mean: '這句話是什麼意思？',
      listen: '聽聽看，這句話是什麼意思？',
    }[q.mode];
    const ja = `<p class="s-ja big" lang="ja">${answered ? markWord(s.ja, s.word) : s.ja}</p>`;
    const romaji = `<p class="s-romaji">${s.romaji}</p>`;
    const chip = (b, attr) =>
      `<button type="button" class="chip" ${attr} lang="ja" ${answered ? 'disabled' : ''}><span>${b.t}</span>${
        hint ? `<small>${b.r}</small>` : ''
      }</button>`;

    let main;
    if (q.mode === 'mean') main = ja + (hint || answered ? romaji : '');
    else if (q.mode === 'listen')
      main = answered
        ? ja + romaji
        : `<button type="button" class="listen-btn" data-act="speak">${icons.volume}<span>再聽一次</span></button>`;
    else {
      const left = s.chunks.length - q.placed.length;
      main = `<p class="s-zh big">${s.zh}</p>
        <div class="s-line${answered ? (ok ? ' correct' : ' wrong') : ''}" aria-label="你排的句子">
          ${q.placed.map((bi, k) => chip(q.bank[bi], `data-placed="${k}"`)).join('')}
          ${'<span class="slot" aria-hidden="true"></span>'.repeat(Math.max(0, left))}
          ${answered ? (ok ? RING : STRIKE) : ''}
        </div>
        ${answered && !ok ? `<p class="s-answer">正確的句子</p>${ja}` : ''}
        ${answered ? romaji : '<p class="s-tip">依順序點下面的詞；點上面的詞可以拿回去。</p>'}`;
    }

    let dock;
    if (q.mode === 'order') {
      const full = q.placed.length === s.chunks.length;
      dock = `
        <div class="bank">
          ${q.bank
            .map((b, i) =>
              q.placed.includes(i)
                ? `<span class="chip used" aria-hidden="true"><span>${b.t}</span>${hint ? `<small>${b.r}</small>` : ''}</span>`
                : chip(b, `data-chip="${i}"`),
            )
            .join('')}
        </div>
        ${
          answered
            ? `<div class="feedback" aria-live="polite">${feedbackHTML(q, ok)}</div>`
            : `<div class="order-actions">
                <button type="button" class="btn" data-act="clear" ${q.placed.length ? '' : 'disabled'}>清除</button>
                <button type="button" class="btn primary" data-act="check" ${full ? '' : 'disabled'}>檢查答案</button>
              </div>`
        }`;
    } else {
      dock = `
        ${optionsHTML(q, (o) => o.zh, ' sentences', false)}
        <div class="feedback" aria-live="polite">${answered ? feedbackHTML(q, ok) : ''}</div>`;
    }

    el.innerHTML = `
      <div class="play">
        ${playTopHTML()}
        <section class="sheet prompt s-prompt${answered ? ' answered' : ''}">
          <p class="prompt-label">${label}</p>
          ${
            q.mode === 'mean' || answered
              ? `<button type="button" class="icon-btn speak" data-act="speak" aria-label="播放發音">${icons.volume}</button>`
              : ''
          }
          <div class="s-main">${main}</div>
          ${
            answered
              ? `<p class="s-from">出自單字 <b lang="ja">${show(s.word, s.word.script)}</b> ${s.word.romaji}・${s.word.zh}</p>`
              : ''
          }
          <p class="prompt-meta">${game.streak >= 3 ? `連續答對 ${game.streak} 題` : '&nbsp;'}</p>
        </section>
        <div class="dock">${dock}</div>
      </div>`;

    if (answered) el.querySelector('[data-act="next"]')?.focus({ preventScroll: true });
  }

  function drawResult() {
    const n = game.qs.length;
    const pct = Math.round((game.score / n) * 100);
    const kind = kindOf(game.qs[0].item);
    const word = kind === 'word';
    const misses = uniqBy(game.mistakes, qKey);
    const missed = new Set(misses.map(qKey));
    const slows = uniqBy(game.slow, qKey).filter((q) => !missed.has(qKey(q)));
    const noun = NOUN[kind];
    // 句子一列一句：日文和中文
    const sentList = (qs) => `<ul class="miss-sent">
      ${qs.map((q) => `<li><span class="s-ja" lang="ja">${q.item.ja}</span><span class="s-zh">${q.item.zh}</span></li>`).join('')}
    </ul>`;
    // 情境題一列一題：場合和該說的話
    const sceneList = (qs) => `<ul class="miss-sent">
      ${qs
        .map(
          (q) => `<li><span class="sc-ask">${q.item.ask}</span>${
            q.item.answer.ja ? `<span class="s-ja" lang="ja">${q.item.answer.ja}</span>` : ''
          }<span class="s-zh">${q.item.answer.zh}</span></li>`,
        )
        .join('')}
    </ul>`;
    const kanaList = (qs) => kind === 'scene' ? sceneList(qs) : kind === 'sentence' ? sentList(qs) : `<ul class="miss${word ? ' words' : ''}">
      ${qs
        .map(
          (q) => `<li><span class="k" lang="ja">${show(q.item, q.script)}</span><span class="r">${q.item.romaji}</span>${
            word ? `<span class="r">${q.item.zh}</span>` : ''
          }</li>`,
        )
        .join('')}
    </ul>`;
    el.innerHTML = `
      <section class="sheet result">
        <h2 class="sheet-title">測驗完成</h2>
        <p class="score" aria-label="答對 ${game.score} 題，共 ${n} 題">${game.score}<small> / ${n}</small></p>
        <p class="msg">${resultMessage(pct, kind)}</p>
        ${misses.length ? `<h3><i class="dot weak"></i>答錯的${noun}</h3>${kanaList(misses)}` : ''}
        ${slows.length ? `<h3><i class="dot learning"></i>答對但想比較久的${noun}</h3>${kanaList(slows)}<p class="result-note">多練幾次、答得更快就算熟練了。</p>` : ''}
        <div class="actions">
          ${misses.length ? '<button type="button" class="btn primary" data-act="retry-miss">再練一次答錯的</button>' : ''}
          <button type="button" class="btn ${misses.length ? '' : 'primary'}" data-act="again">再來一輪</button>
          <button type="button" class="btn ghost" data-act="setup">回到設定</button>
        </div>
      </section>`;
  }

  let lastScreen = screen;
  let lastIndex = -1;
  function draw() {
    if (screen === 'play') drawPlay();
    else if (screen === 'result') drawResult();
    else drawSetup();
    el.classList.toggle('is-setup', screen === 'setup'); // 寬螢幕上設定畫面分成左右兩欄
    document.body.classList.toggle('is-playing', screen === 'play'); // 作答時收起頁首，畫面只留題目
    // 換畫面或換題時回到頂端，題目才不會被頁首擋住
    const idx = screen === 'play' ? game.i : -1;
    if (screen !== lastScreen || idx !== lastIndex) window.scrollTo(0, 0);
    lastScreen = screen;
    lastIndex = idx;
  }

  // ---------- 事件 ----------

  el.addEventListener('click', (e) => {
    const t = e.target.closest('button');
    if (!t || !el.contains(t)) return;
    const fromKeyboard = e.detail === 0;
    let refocus = null;

    const field = t.parentElement?.dataset.field;
    if (field && t.dataset.val) {
      cfg[field] = field === 'length' && t.dataset.val !== 'all' ? Number(t.dataset.val) : t.dataset.val;
      refocus = `[data-field="${field}"] [data-val="${t.dataset.val}"]`;
    } else if (t.dataset.group) {
      const id = t.dataset.group;
      if (cfg.groups.has(id)) cfg.groups.delete(id);
      else cfg.groups.add(id);
      refocus = `[data-group="${id}"]`;
    } else if (t.dataset.scene) {
      const id = t.dataset.scene;
      if (cfg.scenes.has(id)) cfg.scenes.delete(id);
      else cfg.scenes.add(id);
      refocus = `[data-scene="${id}"]`;
    } else if (t.dataset.quick?.startsWith('scenes-')) {
      cfg.scenes = new Set(t.dataset.quick === 'scenes-all' ? SCENES.map((x) => x.id) : []);
      refocus = `[data-quick="${t.dataset.quick}"]`;
    } else if (t.dataset.quick) {
      const q = t.dataset.quick;
      cfg.groups = new Set(
        q === 'all' ? GROUPS.map((g) => g.id) : q === 'seion' ? GROUPS.filter((g) => g.kind === 'seion').map((g) => g.id) : [],
      );
      refocus = `[data-quick="${q}"]`;
    } else if ('opt' in t.dataset) {
      answer(Number(t.dataset.opt));
      return;
    } else if ('chip' in t.dataset || 'placed' in t.dataset) {
      if ('chip' in t.dataset) place(Number(t.dataset.chip));
      else unplace(Number(t.dataset.placed));
      // 用鍵盤操作時，焦點放到下一個可以點的詞，排完了就放到「檢查答案」
      if (fromKeyboard)
        (el.querySelector('[data-act="check"]:not(:disabled)') || el.querySelector('[data-chip]'))?.focus({ preventScroll: true });
      return;
    } else {
      const q = game?.qs[game.i];
      switch (t.dataset.act) {
        case 'start': return startFromCfg();
        case 'next': return next();
        case 'speak': return q && say(speakText(q), { force: true });
        case 'speak-they': return q?.item.they && say(q.item.they.ja, { force: true });
        case 'check': return check();
        case 'clear':
          if (q?.bank && !game.answered) {
            q.placed = [];
            draw();
          }
          return;
        case 'speak-ex': return q?.item.dict && say(q.item.dict.ex, { force: true });
        case 'again': return startFromCfg();
        case 'retry-miss': {
          // 句子題沿用原本的題型
          const qs = uniqBy(game.mistakes, qKey).map(({ item, script, mode }) => ({ item, script, mode }));
          return start(qs, game.pool, game.mode);
        }
        case 'quit':
        case 'setup':
          clearTimeout(timer);
          screen = 'setup';
          draw();
          window.scrollTo(0, 0);
          return;
        default: return;
      }
    }

    saveCfg();
    draw();
    if (fromKeyboard && refocus) el.querySelector(refocus)?.focus({ preventScroll: true });
  });

  // 鍵盤：1–4 選答案，Enter / 空白鍵 下一題
  const onKey = (e) => {
    if (screen !== 'play' || e.metaKey || e.ctrlKey || e.altKey) return;
    const q = game.qs[game.i];
    // 排句子：Enter 檢查答案，Backspace 拿回最後一個詞
    if (!game.answered && q.bank) {
      if (e.key === 'Backspace') {
        e.preventDefault();
        unplace(q.placed.length - 1);
      } else if (e.key === 'Enter' && !(e.target instanceof HTMLButtonElement)) {
        e.preventDefault();
        check();
      }
      return;
    }
    if (!game.answered && /^[1-4]$/.test(e.key)) {
      e.preventDefault();
      answer(Number(e.key) - 1);
    } else if (game.answered && (e.key === 'Enter' || e.key === ' ')) {
      if (e.target instanceof HTMLButtonElement) return; // 按鈕本身會處理
      e.preventDefault();
      next();
    }
  };
  document.addEventListener('keydown', onKey);

  // 其他裝置的紀錄同步進來時，設定畫面的「常答錯」數量可能要更新
  const offStats = onStatsChange(() => {
    if (screen === 'setup' && cfgQuestions().qs.filter(isWeak).length !== weakShown) draw();
  });

  draw();
  return () => {
    clearTimeout(timer);
    document.body.classList.remove('is-playing');
    document.removeEventListener('keydown', onKey);
    offStats();
  };
}
