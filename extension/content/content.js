/**
 * コンテンツスクリプト: claude.ai のチャット内容を抽出する
 * ポップアップからのメッセージを受け取り、会話データを返す
 */

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'extractChat') {
    try {
      const result = extractChatContent();
      sendResponse({ success: true, data: result });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }
  // 非同期レスポンスを有効化
  return true;
});

/**
 * チャット内容を抽出して構造化データとして返す
 */
function extractChatContent() {
  const messages = [];
  const attachedFiles = new Set();

  // ユーザーがアップロードしたファイルを検出
  // data-testid="file-thumbnail" 内の h3 がファイル名
  document.querySelectorAll('[data-testid="file-thumbnail"] h3').forEach(h3 => {
    const name = h3.textContent.trim();
    if (name) attachedFiles.add(name);
  });

  // チャットタイトルを取得（ページタイトルから " - Claude" を除去）
  const title = document.title.replace(/\s*-\s*Claude$/, '').trim() || '無題のチャット';

  // チャットの各ターン（div[data-test-render-count]）を順番に処理
  const groups = document.querySelectorAll('div[data-test-render-count]');

  groups.forEach(group => {
    // ユーザーメッセージ: data-testid="user-message"
    const userMsgEl = group.querySelector('[data-testid="user-message"]');
    if (userMsgEl) {
      const text = userMsgEl.innerText.trim();
      if (text) {
        messages.push({ role: 'user', content: text });
      }
      return; // 1グループ内にユーザーとClaudeが混在しないため早期リターン
    }

    // Claudeの返答: .font-claude-response 内の .standard-markdown
    // 複数の .standard-markdown が存在する場合（思考ログ含む）、
    // 最後のブロックが最終出力
    const claudeResponseEl = group.querySelector('.font-claude-response');
    if (claudeResponseEl) {
      // row-start-2 内の standard-markdown を優先（最終出力部分）
      const row2 = claudeResponseEl.querySelector('.row-start-2 .standard-markdown');
      const targetEl = row2 || claudeResponseEl.querySelector('.standard-markdown');

      if (targetEl) {
        const text = targetEl.innerText.trim();
        if (text) {
          messages.push({ role: 'assistant', content: text });
        }
      }
    }
  });

  return {
    title,
    messages,
    attachedFiles: Array.from(attachedFiles),
    totalTurns: messages.length
  };
}
