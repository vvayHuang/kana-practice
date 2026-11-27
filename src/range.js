// 練習範圍：在練習設定裡選的假名行。存在偏好設定裡，五十音表、單字本和測驗都用同一份。

import { GROUPS } from './kana.js';
import { WORDS } from './words.js';
import { getPref } from './store.js';

export const DEFAULT_GROUPS = ['a', 'ka', 'sa'];

export const savedGroups = () => new Set(getPref('quizGroups', DEFAULT_GROUPS));

export const itemsIn = (groups) => GROUPS.filter((g) => groups.has(g.id)).flatMap((g) => g.items);

export const scriptsFor = (s) => (s === 'mix' ? ['hira', 'kata'] : [s]);

// 只用這些行的假名就能寫出來的單字；scripts 不給就是平假名、片假名的單字都算
export function wordsIn(groups, scripts = ['hira', 'kata']) {
  const known = new Set(itemsIn(groups).map((i) => i.kana));
  return WORDS.filter((w) => scripts.includes(w.script) && w.kinds.every((k) => known.has(k)));
}

// 範圍的簡短說明，例如「あ行、か行、さ行」「全部清音」「あ行、か行 等 5 組」
export function rangeLabel(groups) {
  const picked = GROUPS.filter((g) => groups.has(g.id));
  const seion = GROUPS.filter((g) => g.kind === 'seion');
  if (picked.length === GROUPS.length) return '全部假名';
  if (picked.length === seion.length && picked.every((g) => g.kind === 'seion')) return '全部清音';
  const labels = picked.map((g) => g.label);
  if (labels.length <= 3) return labels.join('、');
  return `${labels.slice(0, 2).join('、')} 等 ${labels.length} 組`;
}
