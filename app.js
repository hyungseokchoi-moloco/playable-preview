// Minimal playable preview scaffolding
// All code and comments in English per instruction

(function () {
  /** Macro replacement config */
  const EVENT_BASE_URL = 'https://test.url/';
  function eventUrl(name) {
    return encodeURIComponent(EVENT_BASE_URL + name);
  }
  const BASE_MACRO_MAP = {
    '#IMP_TRACE_MRAID_VIEWABLE_ESC#': eventUrl('MRAID_VIEWABLE'),
    '#IMP_TRACE_GAME_VIEWABLE_ESC#': eventUrl('GAME_VIEWABLE'),
    '#PLAYABLE_TAPS_FOR_ENGAGEMENT#': '1',
    '#PLAYABLE_ENGAGEMENT_ESC#': eventUrl('ENGAGEMENT'),
    '#PLAYABLE_TAPS_FOR_REDIRECTION#': '0',
    '#PLAYABLE_REDIRECTION_ESC#': eventUrl('REDIRECTION'),
    '#IMP_TRACE_COMPLETE_ESC#': eventUrl('COMPLETE'),
    '#CLICK_TEMPLATE_ESC#': eventUrl('CLICK'),
    '#FINAL_LANDING_URL_ESC#': eventUrl('FINAL_LANDING'),
    '#START_MUTED#': 'true',
    '#DRAW_CUSTOM_CLOSE_BUTTON#': 'false',
    '#CACHEBUSTER#': ''
  };
  function applyMacrosWithMap(input, mapObj) {
    if (!input) return '';
    return input.replace(/#[A-Z0-9_]+#/g, function (token) {
      return Object.prototype.hasOwnProperty.call(mapObj, token) ? mapObj[token] : '';
    });
  }

  /** @type {HTMLTextAreaElement} */
  const snippetInput = document.getElementById('snippetInput');
  /** @type {HTMLInputElement} */
  const engagementTapsInput = document.getElementById('engagementTapsInput');
  /** @type {HTMLInputElement} */
  const redirectionTapsInput = document.getElementById('redirectionTapsInput');
  /** @type {HTMLButtonElement} */
  const previewBtn = document.getElementById('previewBtn');
  /** @type {HTMLButtonElement} */
  const clearAllBtn = document.getElementById('clearAllBtn');
  /** @type {HTMLButtonElement} */
  const btnPortrait = document.getElementById('btnPortrait');
  /** @type {HTMLButtonElement} */
  const btnLandscape = document.getElementById('btnLandscape');
  // removed per consolidated clear
  /** @type {HTMLDivElement} */
  const deviceWrap = document.getElementById('deviceWrap');
  /** @type {HTMLIFrameElement} */
  const previewFrame = document.getElementById('previewFrame');
  /** @type {HTMLDivElement} */
  const deviceBezel = deviceWrap ? deviceWrap.querySelector('.device-bezel') : null;
  /** @type {HTMLDivElement} */
  const logList = document.getElementById('logList');

  /** Tabs */
  const tabButtons = Array.from(document.querySelectorAll('.tab'));
  let activeTab = 'all';

  // Orientation toggle
  function setOrientation(mode) {
    deviceWrap.classList.toggle('portrait', mode === 'portrait');
    deviceWrap.classList.toggle('landscape', mode === 'landscape');
    btnPortrait.classList.toggle('active', mode === 'portrait');
    btnLandscape.classList.toggle('active', mode === 'landscape');
    fitPreviewToContainer();
  }
  btnPortrait?.addEventListener('click', () => setOrientation('portrait'));
  btnLandscape?.addEventListener('click', () => setOrientation('landscape'));

  // Tabs
  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      tabButtons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      activeTab = btn.dataset.tab || 'all';
      renderLogs();
    });
  });

  // Logs state
  /** @type {Array<{type:'console'|'error'|'network'|'info'|'event', time:number, message:any}>} */
  const logs = [];

  function addLog(entry) {
    logs.push(entry);
    renderLogs();
  }

  function addTypedLog(type, message, extraClass) {
    const entry = { type, time: Date.now(), message, extraClass };
    logs.push(entry);
    renderLogs();
  }

  function getMissingMacros(text, requiredKeys) {
    const missing = [];
    for (const key of requiredKeys) {
      if (!text.includes(key)) missing.push(key);
    }
    return missing;
  }

  function hasRelativePayloadJs(text) {
    // matches src="payload.js" or src='payload.js' possibly with query
    return /<script[^>]*src\s*=\s*["']\s*payload\.js(?:[?#][^"']*)?["'][^>]*>/i.test(text);
  }

  function runValidations(rawText) {
    const results = [];
    // 1) All macros present
    const requiredMacros = Object.keys(BASE_MACRO_MAP);
    const missing = getMissingMacros(rawText, requiredMacros);
    if (missing.length > 0) {
      results.push({ ok: false, msg: `Missing macros: ${missing.join(', ')}` });
    } else {
      results.push({ ok: true, msg: 'All required macros present' });
    }
    // 2) payload.js relative path forbidden
    if (hasRelativePayloadJs(rawText)) {
      results.push({ ok: false, msg: 'Relative payload.js detected. Use fully hosted URL.' });
    } else {
      results.push({ ok: true, msg: 'No relative payload.js detected' });
    }
    // 3) %{IMP_BEACON} must be included
    if (rawText.includes('%{IMP_BEACON}')) {
      results.push({ ok: true, msg: 'IMP_BEACON present' });
    } else {
      results.push({ ok: false, msg: 'IMP_BEACON missing' });
    }
    // 4) mraid.js must be included
    if (/<script[^>]*src\s*=\s*["'][^"']*mraid\.js[^"']*["'][^>]*>\s*<\/script>/i.test(rawText)) {
      results.push({ ok: true, msg: 'mraid.js present' });
    } else {
      results.push({ ok: false, msg: 'mraid.js missing' });
    }
    return results;
  }

  function renderLogs() {
    const frag = document.createDocumentFragment();
    const filtered = logs.filter((l) => activeTab === 'all' ? true : l.type === activeTab);
    for (const l of filtered) {
      const div = document.createElement('div');
      div.className = `log-entry ${l.type}`;
      if (l.extraClass) div.classList.add(l.extraClass);
      const timeStr = new Date(l.time).toLocaleTimeString();
      const msgStr = typeof l.message === 'string' ? l.message : safeStringify(l.message);
      div.textContent = `[${timeStr}] ${l.type.toUpperCase()} ${msgStr}`;
      const timeEl = document.createElement('span');
      timeEl.className = 'time';
      timeEl.textContent = `[${timeStr}]`;
      div.textContent = '';
      div.appendChild(timeEl);
      const content = document.createElement('span');
      content.textContent = `${l.type.toUpperCase()} ${msgStr}`;
      if (l.type === 'event' && typeof msgStr === 'string' && msgStr.indexOf('unescaped') === 0) {
        div.classList.add('unescaped');
      }
      div.appendChild(content);
      frag.appendChild(div);
    }
    logList.innerHTML = '';
    logList.appendChild(frag);
    logList.scrollTop = logList.scrollHeight;
  }

  function safeStringify(value) {
    try {
      if (typeof value === 'string') return value;
      return JSON.stringify(value, function replacer(key, val) {
        if (val instanceof Error) {
          return { name: val.name, message: val.message, stack: val.stack };
        }
        return val;
      });
    } catch (e) {
      return String(value);
    }
  }

  clearAllBtn?.addEventListener('click', () => {
    if (snippetInput) snippetInput.value = '';
    if (engagementTapsInput) engagementTapsInput.value = '1';
    if (redirectionTapsInput) redirectionTapsInput.value = '0';
    logs.length = 0;
    renderLogs();
    try { previewFrame.srcdoc = '<!doctype html><title>Cleared</title>'; } catch(e) { previewFrame.src = 'about:blank'; }
    requestAnimationFrame(fitPreviewToContainer);
  });

  // Fit preview into available column without scroll using CSS transform scale
  function measureBezelNaturalSize() {
    if (!deviceBezel) return { w: 360, h: 640 };
    const prevTransform = deviceBezel.style.transform;
    deviceBezel.style.transform = 'scale(1)';
    const w = deviceBezel.offsetWidth;
    const h = deviceBezel.offsetHeight;
    deviceBezel.style.transform = prevTransform;
    return { w, h };
  }

  function fitPreviewToContainer() {
    if (!deviceWrap || !deviceBezel) return;
    const { w, h } = measureBezelNaturalSize();
    const availableWidth = deviceWrap.clientWidth;
    const availableHeight = deviceWrap.clientHeight;
    if (availableWidth <= 0 || availableHeight <= 0) return;
    const scale = Math.min(availableWidth / w, availableHeight / h, 1);
    deviceBezel.style.transformOrigin = 'center center';
    deviceBezel.style.transform = `scale(${scale})`;
  }

  // Build preview document (minimal): MRAID stub + base style + user snippet
  function buildPreviewHtml(userHtml, runtimeMacroMap) {
    const withMacros = applyMacrosWithMap(userHtml || '', runtimeMacroMap);
    let sanitized = (withMacros).replace(/<script[^>]*src\s*=\s*["']([^"']*mraid\.js[^"']*)["'][^>]*>\s*<\/script>/ig, '');
    sanitized = sanitized.replace(/%\{IMP_BEACON\}/g, '');
    const b64 = btoa(unescape(encodeURIComponent(sanitized)));
    // const baseHref = location.origin + location.pathname.replace(/[^\/]*$/, '') + 'injected/';
    const html = '<!doctype html><html><head>' +
      '<meta charset="utf-8" />' +
      '<meta name="viewport" content="width=device-width, initial-scale=1" />' +
      '<meta name="referrer" content="no-referrer" />' +
      '<title>Playable Sandbox</title>' +
      '<style>html,body{margin:0;padding:0;height:100%}:root,html,body{width:100%;height:100%;overflow:hidden}*,*::before,*::after{box-sizing:border-box}</style>' +
      '</head><body>' +
      '<script src="injected/instrumentation.js"></script>' +
      '<script src="injected/mraid-stub.js"></script>' +
      '<script>(function(){var d=decodeURIComponent(escape(atob("' + b64 + '")));document.write(d);})();</script>' +
      '</body></html>';
    return html;
  }

  // Render preview
  previewBtn?.addEventListener('click', () => {
    // Reset logs on each preview
    logs.length = 0;
    renderLogs();

    const userHtml = snippetInput.value || '';

    // Run validations on raw input before macro replacement
    const validation = runValidations(userHtml);
    let ok = true;
    for (const v of validation) {
      addTypedLog('info', v.msg, v.ok ? 'success' : 'error');
      if (!v.ok) ok = false;
    }
    if (!ok) {
      // Abort rendering and clear existing preview
      try { previewFrame.srcdoc = '<!doctype html><title>Validation failed</title>'; } catch(e) { previewFrame.src = 'about:blank'; }
      requestAnimationFrame(fitPreviewToContainer);
      return;
    }

    // Build runtime macro map
    const map = { ...BASE_MACRO_MAP };
    const tapsEng = Math.max(0, Math.min(9, parseInt(engagementTapsInput?.value || '1', 10) || 0));
    const tapsRedir = Math.max(0, Math.min(9, parseInt(redirectionTapsInput?.value || '0', 10) || 0));
    map['#PLAYABLE_TAPS_FOR_ENGAGEMENT#'] = String(tapsEng);
    map['#PLAYABLE_TAPS_FOR_REDIRECTION#'] = String(tapsRedir);

    const html = buildPreviewHtml(userHtml, map);
    try {
      previewFrame.srcdoc = html;
    } catch (e) {
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      previewFrame.src = url;
    }
    requestAnimationFrame(fitPreviewToContainer);
  });

  // Receive logs from iframe (including events)
  window.addEventListener('message', (ev) => {
    const data = ev.data;
    if (!data || !data.__preview__) return;
    const type = data.type;
    const message = data.message;
    if (type === 'console') {
      addLog({ type: 'console', time: Date.now(), message });
    } else if (type === 'error') {
      addLog({ type: 'error', time: Date.now(), message });
    } else if (type === 'network') {
      addLog({ type: 'network', time: Date.now(), message });
    } else if (type === 'event') {
      addLog({ type: 'event', time: Date.now(), message });
    } else {
      addLog({ type: 'info', time: Date.now(), message });
    }
  });

  // Initial orientation
  setOrientation('portrait');
  requestAnimationFrame(fitPreviewToContainer);
  window.addEventListener('resize', fitPreviewToContainer);
})();


