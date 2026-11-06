// 打包成單一 HTML 檔，用來發佈成網頁連結：CSS 和 JS 全部內嵌，字型由 Google Fonts 載入。
// 用法：node scripts/build-artifact.mjs [輸出路徑]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(process.argv[2] || join(root, 'dist-artifact/kana-practice.html'));

execSync('npx vite build', { cwd: root, stdio: 'inherit' });

const html = readFileSync(join(root, 'dist/index.html'), 'utf8');
const cssPath = html.match(/href="(\/assets\/[^"]+\.css)"/)?.[1];
const jsPath = html.match(/src="(\/assets\/[^"]+\.js)"/)?.[1];
if (!cssPath || !jsPath) throw new Error('找不到 build 出來的 CSS 或 JS');

const css = readFileSync(join(root, 'dist', cssPath), 'utf8');
const js = readFileSync(join(root, 'dist', jsPath), 'utf8');
if (/<\/script/i.test(js) || /<\/style/i.test(css)) throw new Error('內容裡有結尾標籤，不能直接內嵌');

const page = `<title>かな練習帳</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Klee+One:wght@400;600&display=swap">
<style>
${css}
</style>
<div id="app"></div>
<script type="module">
${js}
</script>
`;

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, page);
console.log(`已輸出 ${out}（${(Buffer.byteLength(page) / 1024).toFixed(1)} KB）`);
