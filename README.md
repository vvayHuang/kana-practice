# かな練習帳

日文五十音練習網頁：平假名、片假名對照表和小測驗。

線上版：https://vvayhuang.github.io/kana-practice/

## 功能

- **五十音表**：清音、濁音・半濁音、拗音。點假名會發音，並顯示平假名／片假名對照和念法提醒。
- **測驗**：看假名選拼音，或看拼音選假名。可以選平假名、片假名或混合，也可以只練某幾行。
- **熟練度**：答題紀錄存在瀏覽器裡，表格上會用顏色標出已熟練、練習中、常答錯；也能一鍵複習常錯的假名。

發音用的是瀏覽器內建的日文語音，不需要網路或 API key。如果裝置沒有日文語音，會跳出提示。

## 執行

```bash
npm install
npm run dev
```

打開 http://localhost:5173 就能使用。輸出正式版用 `npm run build`，檔案會在 `dist/`。

## 發佈到 GitHub Pages

推送到 `main` 後，`.github/workflows/deploy-pages.yml` 會自動打包（`npm run build:pages`）並更新線上版。

第一次使用前，要到 repo 的 **Settings → Pages**，把 **Source** 選成 **GitHub Actions**。

## 檔案

- `src/kana.js`：假名資料（片假名由平假名自動換算）
- `src/chart.js`：五十音表
- `src/quiz.js`：測驗
- `src/store.js`：練習紀錄與設定
- `src/speech.js`：發音
