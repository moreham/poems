/* Counts belong to the server; the HttpOnly visitor cookie identifies this browser. */
(() => {
  const button = document.querySelector('#like-button');
  const count = document.querySelector('#like-count');
  const status = document.querySelector('#like-status');
  let poem = '';
  let drawId = '';
  let revision = 0;
  let timer;
  let controller;
  let posting = false;
  let liked = false;
  let ready = false;

  function updateButton() {
    button.disabled = !ready || liked || posting;
    button.setAttribute('aria-pressed', String(liked));
    button.setAttribute('aria-busy', String(posting));
    button.setAttribute('aria-label', posting ? '正在点赞…' : liked ? '已喜欢' : '喜欢这签');
  }

  async function loadLikes(add = false) {
    if (!poem || (add && (!ready || liked || posting))) return;
    if (!add && posting) return;
    controller?.abort();
    controller = new AbortController();
    const request = controller;
    const version = revision;
    if (add) posting = true;
    updateButton();
    const timeout = setTimeout(() => request.abort(), 10000);
    try {
      const response = await fetch(`/api/likes${add ? '' : `?poem=${encodeURIComponent(poem)}&draw_id=${drawId}`}`, {
        method: add ? 'POST' : 'GET',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: add ? { 'Content-Type': 'application/json' } : {},
        body: add ? JSON.stringify({ poem, draw_id: drawId }) : undefined,
        signal: request.signal
      });
      if (!response.ok) throw new Error('Unavailable');
      const data = await response.json();
      if (!Number.isSafeInteger(data.count) || data.count < 0 ||
          !Number.isSafeInteger(data.total) || data.total < data.count || typeof data.liked !== 'boolean') {
        throw new Error('Invalid response');
      }
      if (version !== revision) return;
      liked = data.liked;
      ready = true;
      count.textContent = data.count.toLocaleString('zh-CN');
      status.textContent = '';
    } catch (_) {
      if (version !== revision || request !== controller) return;
      status.textContent = add ? '点赞未确认，请重试。重复提交不会重复计数。' : '点赞数暂时无法加载，稍后会自动重试。';
    } finally {
      clearTimeout(timeout);
      if (version === revision && request === controller) {
        posting = false;
        updateButton();
      }
    }
  }

  window.addEventListener('poemchange', event => {
    poem = event.detail;
    // Keep one identifier for this draw, including polling and failed-request retries.
    drawId = Array.from(crypto.getRandomValues(new Uint8Array(16)),
      byte => byte.toString(16).padStart(2, '0')).join('');
    revision += 1;
    controller?.abort();
    clearTimeout(timer);
    liked = false;
    ready = false;
    posting = false;
    count.textContent = '—';
    status.textContent = '';
    updateButton();
    if (!/^https?:$/.test(location.protocol)) {
      status.textContent = '通过网站服务打开后即可点赞。';
      return;
    }
    timer = setTimeout(() => loadLikes(), 120);
  });
  button.addEventListener('click', () => loadLikes(true));
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && /^https?:$/.test(location.protocol)) loadLikes();
  });
  setInterval(() => {
    if (!document.hidden && /^https?:$/.test(location.protocol)) loadLikes();
  }, 30000);
})();
