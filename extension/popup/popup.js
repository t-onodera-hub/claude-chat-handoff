/**
 * ポップアップのメインロジック
 * - claude.ai のコンテンツスクリプトに会話抽出を依頼
 * - 引き継ぎ用テキストを生成して表示
 * - クリップボードへのコピーを提供
 */

document.addEventListener('DOMContentLoaded', async () => {
  const generateBtn  = document.getElementById('generate-btn');
  const copyBtn      = document.getElementById('copy-btn');
  const textarea     = document.getElementById('handoff-text');
  const fileWarning  = document.getElementById('file-warning');
  const fileList     = document.getElementById('file-list');
  const resultArea   = document.getElementById('result-area');
  const emptyState   = document.getElementById('empty-state');

  // 現在のアクティブタブを取得
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  // 対応サイト以外では生成ボタンを無効化
  const isClaude = tab?.url?.match(/^https:\/\/claude\.ai\/chat\//);
  const isGemini = tab?.url?.match(/^https:\/\/gemini\.google\.com\//);
  if (!isClaude && !isGemini) {
    showStatus('error', 'claude.ai または gemini.google.com のチャット画面でご使用ください。');
    generateBtn.disabled = true;
    return;
  }

  // ---- 生成ボタン ----
  generateBtn.addEventListener('click', async () => {
    generateBtn.disabled = true;
    showStatus('loading', '⏳ 会話を解析中...');

    try {
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'extractChat' });

      if (!response?.success) {
        throw new Error(response?.error || '会話の取得に失敗しました。ページをリロードして再試行してください。');
      }

      const { title, messages, attachedFiles, aiName } = response.data;

      if (messages.length === 0) {
        throw new Error('会話が見つかりませんでした。チャットが始まっているか確認してください。');
      }

      // ファイル警告を表示（添付ファイルがある場合）
      if (attachedFiles.length > 0) {
        fileList.innerHTML = '';
        attachedFiles.forEach(name => {
          const li = document.createElement('li');
          li.textContent = name;
          fileList.appendChild(li);
        });
        fileWarning.classList.remove('hidden');
      }

      // 引き継ぎテキストを生成して表示
      textarea.value = buildHandoffText(title, messages, aiName);

      emptyState.classList.add('hidden');
      resultArea.classList.remove('hidden');
      showStatus('success', `✓ ${messages.length} 件のメッセージを取得しました`);

    } catch (err) {
      showStatus('error', err.message);
      generateBtn.disabled = false;
    }
  });

  // ---- コピーボタン ----
  copyBtn.addEventListener('click', async () => {
    await navigator.clipboard.writeText(textarea.value);
    copyBtn.textContent = '✓ コピー完了';
    copyBtn.classList.add('copied');
    setTimeout(() => {
      copyBtn.textContent = '📋 コピー';
      copyBtn.classList.remove('copied');
    }, 2000);
  });
});

// ============================================================
//  引き継ぎテキスト生成
// ============================================================

/**
 * 会話履歴から引き継ぎ用プロンプトを生成する
 * @param {string} title チャットタイトル
 * @param {{role:'user'|'assistant', content:string}[]} messages
 * @param {string} aiName AI の名前（'Claude' | 'Gemini'）
 * @returns {string}
 */
function buildHandoffText(title, messages, aiName = 'AI') {
  const now = new Date().toLocaleString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit'
  });

  // 1メッセージあたりの最大文字数（長い場合は末尾を省略）
  const MAX_LEN = 1000;
  const truncate = text =>
    text.length > MAX_LEN ? text.slice(0, MAX_LEN) + '\n…（省略）' : text;

  // 表示するメッセージ数を調整
  // 先頭1件 + 最新10件を含め、中間は省略表示する
  const RECENT = 10;
  let displayed = messages;
  if (messages.length > RECENT + 1) {
    const skipped = messages.length - RECENT - 1;
    displayed = [
      messages[0],
      { role: 'system', content: `… （中間 ${skipped} 件のやり取りを省略） …` },
      ...messages.slice(-RECENT)
    ];
  }

  // 会話ブロックを整形
  const conversationBlock = displayed.map(msg => {
    if (msg.role === 'system') return msg.content;
    const label = msg.role === 'user' ? '【ユーザー】' : `【${aiName}】`;
    return `${label}\n${truncate(msg.content)}`;
  }).join('\n\n---\n\n');

  // 最後のユーザー・Claudeの発言を取得
  const lastUser      = [...messages].reverse().find(m => m.role === 'user');
  const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant');

  return `# チャット引き継ぎ

元のチャット : ${title}
引き継ぎ日時 : ${now}
メッセージ数 : ${messages.length} 件

---

## 引き継ぎ指示

以下は前のチャットの会話履歴です。この内容を踏まえて会話を継続してください。

---

## 会話履歴

${conversationBlock}

---

## 現在の状態（引き継ぎポイント）

**最後のユーザーの要求:**
${lastUser ? truncate(lastUser.content) : '（なし）'}

**${aiName}の直前の対応:**
${lastAssistant ? truncate(lastAssistant.content) : '（なし）'}

---

## 指示

上記の経緯を把握してください。
続きの作業は次のメッセージで指示します。今は「引き継ぎ内容を把握しました」とだけ返答してください。`;
}

// ============================================================
//  ユーティリティ
// ============================================================

/**
 * ステータスメッセージを表示する
 * @param {'loading'|'success'|'error'} type
 * @param {string} message
 */
function showStatus(type, message) {
  const area = document.getElementById('status-area');
  const msg  = document.getElementById('status-message');
  area.classList.remove('hidden');
  msg.className = `status-message ${type}`;
  msg.textContent = message;
}
