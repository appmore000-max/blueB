/* ============================================================
 * 設定  js/config.js  — 部署時只需要改這個檔
 * ============================================================ */
const APP_VERSION = '2.0';
const DATA_DATE   = '2026-09';   // 需求資料整理日期（顯示在表單標頭）
const REPO_URL    = '';          // 你的 GitHub 專案網址，例如 'https://github.com/你的帳號/game-spec-checker'；留空則不顯示連結

/* 「AI 查詢官方需求」按鈕：呼叫 Anthropic API 上網查資料並自動填表。
 * 在 claude.ai 內預覽時免設定；部署到 GitHub Pages 後要填入 API 金鑰才會動作。
 * 注意：金鑰會直接暴露在前端程式碼裡，只適合個人使用，公開網站請留空（按鈕會顯示失敗訊息，手動填表不受影響）。 */
const AI_CONFIG = { apiKey: '', model: 'claude-sonnet-4-6' };
