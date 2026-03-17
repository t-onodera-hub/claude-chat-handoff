/**
 * コンテンツスクリプト: claude.ai / gemini.google.com のチャット内容を抽出する
 * ポップアップからのメッセージを受け取り、会話データを返す
 */

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
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
  const host = location.hostname;

  if (host === 'claude.ai') {
    return extractClaude();
  } else if (host === 'gemini.google.com') {
    return extractGemini();
  } else {
    throw new Error('対応していないサイトです。');
  }
}

// ============================================================
//  Claude 抽出
// ============================================================
function extractClaude() {
  const messages = [];
  const attachedFiles = new Set();

  document.querySelectorAll('[data-testid="file-thumbnail"] h3').forEach(h3 => {
    const name = h3.textContent.trim();
    if (name) attachedFiles.add(name);
  });

  const title = document.title.replace(/\s*-\s*Claude$/, '').trim() || '無題のチャット';

  document.querySelectorAll('div[data-test-render-count]').forEach(group => {
    const userMsgEl = group.querySelector('[data-testid="user-message"]');
    if (userMsgEl) {
      const text = userMsgEl.innerText.trim();
      if (text) messages.push({ role: 'user', content: text });
      return;
    }

    const claudeResponseEl = group.querySelector('.font-claude-response');
    if (claudeResponseEl) {
      const row2 = claudeResponseEl.querySelector('.row-start-2 .standard-markdown');
      const targetEl = row2 || claudeResponseEl.querySelector('.standard-markdown');
      if (targetEl) {
        const text = targetEl.innerText.trim();
        if (text) messages.push({ role: 'assistant', content: text });
      }
    }
  });

  return {
    site: 'claude',
    aiName: 'Claude',
    title,
    messages,
    attachedFiles: Array.from(attachedFiles),
    totalTurns: messages.length
  };
}

// ============================================================
//  Gemini 抽出
// ============================================================
function extractGemini() {
  const messages = [];
  const attachedFiles = new Set();

  const title = document.title.replace(/\s*-\s*Gemini$/, '').trim() || '無題のチャット';

  // 各会話ターン: user-query / model-response のカスタム要素が交互に並ぶ
  const turns = document.querySelectorAll('user-query, model-response');

  turns.forEach(el => {
    if (el.tagName.toLowerCase() === 'user-query') {
      // ユーザーメッセージ: .query-text または p タグのテキスト
      const queryEl = el.querySelector('.query-text') || el.querySelector('p');
      const text = (queryEl || el).innerText.trim();
      if (text) messages.push({ role: 'user', content: text });

      // 添付ファイル名（画像タイトルなど）
      el.querySelectorAll('[aria-label]').forEach(att => {
        const label = att.getAttribute('aria-label');
        if (label && label !== 'ユーザーのアバター') attachedFiles.add(label);
      });

    } else if (el.tagName.toLowerCase() === 'model-response') {
      // AI の返答: .response-content 内の最終的なテキストを取得
      const responseEl = el.querySelector('.response-content')
                      || el.querySelector('.markdown')
                      || el;
      const text = responseEl.innerText.trim();
      if (text) messages.push({ role: 'assistant', content: text });
    }
  });

  return {
    site: 'gemini',
    aiName: 'Gemini',
    title,
    messages,
    attachedFiles: Array.from(attachedFiles),
    totalTurns: messages.length
  };
}
