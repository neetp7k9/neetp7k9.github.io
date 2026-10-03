(() => {
  'use strict';

  const repository = 'https://github.com/neetp7k9/neetp7k9.github.io';
  const draftKey = 'puan-yang-blog-draft-v1';
  const githubUrlLimit = 7000;
  const form = document.getElementById('post-form');
  const fields = Object.fromEntries(['title', 'date', 'summary', 'tags', 'body'].map(name => [name, document.getElementById(`post-${name}`)]));
  const status = document.getElementById('author-status');
  const remember = document.getElementById('save-draft');
  const clearDraft = document.getElementById('clear-draft');
  const fallback = document.getElementById('upload-fallback');
  const previewPanel = document.getElementById('preview-panel');

  function localToday() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }

  function notify(message, error = false) {
    status.replaceChildren(document.createTextNode(message));
    status.dataset.kind = error ? 'error' : 'info';
  }

  function readDraft() {
    return Object.fromEntries(Object.entries(fields).map(([name, input]) => [name, input.value]));
  }

  function updateCount() {
    const text = fields.body.value.trim();
    const count = text ? text.split(/\s+/u).length : 0;
    document.getElementById('word-count').textContent = `${count.toLocaleString()} ${count === 1 ? 'word' : 'words'}`;
  }

  function saveDraft() {
    if (!remember.checked) return;
    try {
      localStorage.setItem(draftKey, JSON.stringify(readDraft()));
      clearDraft.disabled = false;
    } catch {
      remember.checked = false;
      notify('This browser could not save your draft. Download Markdown to keep a copy.', true);
    }
  }

  function removeSavedDraft() {
    try {
      localStorage.removeItem(draftKey);
      remember.checked = false;
      clearDraft.disabled = true;
      notify('The saved copy was removed from this browser. Your current writing is still in the editor.');
    } catch {
      notify('This browser could not remove the saved copy. Clear this site’s browser storage to remove it.', true);
    }
  }

  function validatedDraft() {
    for (const input of Object.values(fields)) input.setCustomValidity('');
    for (const name of ['title', 'summary', 'body']) {
      if (!fields[name].value.trim()) fields[name].setCustomValidity('Please enter some text.');
    }
    const date = fields.date.value;
    const parsedDate = new Date(`${date}T12:00:00`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(parsedDate.getTime()) || `${parsedDate.getFullYear()}-${String(parsedDate.getMonth() + 1).padStart(2, '0')}-${String(parsedDate.getDate()).padStart(2, '0')}` !== date) {
      fields.date.setCustomValidity('Please enter a valid date.');
    }
    if (!form.reportValidity()) {
      notify('Please check the highlighted field before continuing.', true);
      return null;
    }
    const draft = readDraft();
    draft.title = draft.title.trim();
    draft.summary = draft.summary.trim();
    draft.body = draft.body.trim();
    draft.tags = [...new Set(draft.tags.split(',').map(tag => tag.trim()).filter(Boolean))];
    return draft;
  }

  function postFile(draft) {
    const slug = draft.title.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '').slice(0, 80).replace(/-$/g, '') || 'post';
    const filename = `${draft.date}-${slug}.md`;
    // Jekyll evaluates Liquid even inside Markdown code fences. Emit each
    // original opener as a Liquid string so it survives that single pass,
    // including raw/endraw examples and whitespace-control syntax.
    const body = draft.body.replace(/\{[{%]/g, opener => `{{ '${opener}' }}`);
    const markdown = [
      '---',
      'layout: post',
      `title: ${JSON.stringify(draft.title)}`,
      `date: ${JSON.stringify(draft.date)}`,
      `summary: ${JSON.stringify(draft.summary)}`,
      `description: ${JSON.stringify(draft.summary)}`,
      `tags: ${JSON.stringify(draft.tags)}`,
      '---',
      '',
      body,
      ''
    ].join('\n');
    return { filename, markdown };
  }

  function download(file) {
    const url = URL.createObjectURL(new Blob([file.markdown], { type: 'text/markdown;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = file.filename;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  // All preview output is constructed with DOM text nodes. Raw HTML is displayed
  // as text, and links only become clickable with explicitly allowed protocols.
  function inlineMarkdown(parent, text) {
    const token = /(`[^`\n]+`|\*\*[^*\n]+\*\*|\*[^*\n]+\*|\[([^\]\n]+)\]\(([^\s)]+)\))/g;
    let cursor = 0;
    for (const match of text.matchAll(token)) {
      parent.append(document.createTextNode(text.slice(cursor, match.index)));
      const value = match[0];
      let element;
      if (value.startsWith('`')) {
        element = document.createElement('code');
        element.textContent = value.slice(1, -1);
      } else if (value.startsWith('**')) {
        element = document.createElement('strong');
        element.textContent = value.slice(2, -2);
      } else if (value.startsWith('*')) {
        element = document.createElement('em');
        element.textContent = value.slice(1, -1);
      } else {
        let url;
        try { url = new URL(match[3]); } catch { /* Invalid links stay as text. */ }
        if (url && ['https:', 'http:', 'mailto:'].includes(url.protocol)) {
          element = document.createElement('a');
          element.href = url.href;
          element.textContent = match[2];
          element.rel = 'noopener noreferrer';
          if (url.protocol !== 'mailto:') element.target = '_blank';
        } else {
          element = document.createTextNode(value);
        }
      }
      parent.append(element);
      cursor = match.index + value.length;
    }
    parent.append(document.createTextNode(text.slice(cursor)));
  }

  function renderMarkdown(markdown, container) {
    container.replaceChildren();
    const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
    let index = 0;
    const isBlock = line => /^(#{1,6})\s|^\s*```|^\s*([-*+]\s+|\d+\.\s+)|^>\s?|^\s*([-*_])(?:\s*\1){2,}\s*$/.test(line);
    while (index < lines.length) {
      const line = lines[index];
      if (!line.trim()) { index++; continue; }
      if (/^\s*```/.test(line)) {
        index++;
        const codeLines = [];
        while (index < lines.length && !/^\s*```\s*$/.test(lines[index])) codeLines.push(lines[index++]);
        if (index < lines.length) index++;
        const pre = document.createElement('pre');
        const code = document.createElement('code');
        code.textContent = codeLines.join('\n');
        pre.append(code);
        container.append(pre);
        continue;
      }
      const heading = line.match(/^(#{1,6})\s+(.+)$/);
      if (heading) {
        const element = document.createElement(`h${heading[1].length}`);
        inlineMarkdown(element, heading[2]);
        container.append(element);
        index++;
        continue;
      }
      if (/^\s*([-*_])(?:\s*\1){2,}\s*$/.test(line)) {
        container.append(document.createElement('hr'));
        index++;
        continue;
      }
      const list = line.match(/^\s*([-*+]\s+|\d+\.\s+)(.*)$/);
      if (list) {
        const ordered = /^\d/.test(list[1]);
        const element = document.createElement(ordered ? 'ol' : 'ul');
        if (ordered) element.start = parseInt(list[1], 10);
        const pattern = ordered ? /^\s*\d+\.\s+(.*)$/ : /^\s*[-*+]\s+(.*)$/;
        while (index < lines.length) {
          const item = lines[index].match(pattern);
          if (!item) break;
          const li = document.createElement('li');
          inlineMarkdown(li, item[1]);
          element.append(li);
          index++;
        }
        container.append(element);
        continue;
      }
      if (/^>\s?/.test(line)) {
        const quote = document.createElement('blockquote');
        const quoteLines = [];
        while (index < lines.length && /^>\s?/.test(lines[index])) quoteLines.push(lines[index++].replace(/^>\s?/, ''));
        inlineMarkdown(quote, quoteLines.join('\n'));
        container.append(quote);
        continue;
      }
      const paragraph = [line];
      index++;
      while (index < lines.length && lines[index].trim() && !isBlock(lines[index])) paragraph.push(lines[index++]);
      const element = document.createElement('p');
      inlineMarkdown(element, paragraph.join('\n'));
      container.append(element);
    }
  }

  fields.date.value = localToday();
  try {
    const saved = localStorage.getItem(draftKey);
    if (saved) {
      const draft = JSON.parse(saved);
      if (draft && typeof draft === 'object' && !Array.isArray(draft)) {
        for (const [name, input] of Object.entries(fields)) {
          if (typeof draft[name] === 'string') input.value = draft[name];
        }
        remember.checked = true;
        clearDraft.disabled = false;
        notify('Your saved draft was restored from this browser.');
      }
    }
  } catch {
    notify('Saved drafts are unavailable in this browser. You can still write and download a copy.');
  }
  updateCount();
  for (const id of ['preview-button', 'download-button', 'publish-button']) document.getElementById(id).disabled = false;

  form.addEventListener('input', event => {
    if (!Object.values(fields).includes(event.target)) return;
    event.target.setCustomValidity('');
    fallback.hidden = true;
    updateCount();
    saveDraft();
  });

  remember.addEventListener('change', () => {
    if (remember.checked) {
      saveDraft();
      if (remember.checked) notify('Draft saving is on for this browser. Uncheck the option to remove the saved copy.');
    } else {
      removeSavedDraft();
    }
  });
  clearDraft.addEventListener('click', removeSavedDraft);

  document.getElementById('preview-button').addEventListener('click', () => {
    const draft = validatedDraft();
    if (!draft) return;
    document.getElementById('preview-heading').textContent = draft.title;
    document.getElementById('preview-meta').textContent = [draft.date, ...draft.tags].join(' · ');
    document.getElementById('preview-summary').textContent = draft.summary;
    renderMarkdown(draft.body, document.getElementById('preview-content'));
    previewPanel.hidden = false;
    document.getElementById('preview-heading').focus({ preventScroll: true });
    previewPanel.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
    notify('Preview updated. Nothing has been published.');
  });

  document.getElementById('download-button').addEventListener('click', () => {
    const draft = validatedDraft();
    if (!draft) return;
    const file = postFile(draft);
    download(file);
    notify(`Markdown download started: ${file.filename}. Keep this file as a backup or upload it to GitHub.`);
  });

  form.addEventListener('submit', event => {
    event.preventDefault();
    const draft = validatedDraft();
    if (!draft) return;
    const file = postFile(draft);
    const url = `${repository}/new/main/_posts?filename=${encodeURIComponent(file.filename)}&value=${encodeURIComponent(file.markdown)}`;
    if (url.length > githubUrlLimit) {
      download(file);
      fallback.hidden = false;
      notify('This post needs a file upload. Markdown download started; follow the publishing steps below. Nothing has been published.');
      fallback.scrollIntoView({ block: 'nearest' });
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
    notify('Continue on GitHub: sign in, review the file, and select Commit changes. Nothing is published just by opening the editor. ');
    const retry = document.createElement('a');
    retry.href = url;
    retry.target = '_blank';
    retry.rel = 'noopener noreferrer';
    retry.textContent = 'Open GitHub if a new tab did not appear';
    status.append(retry);
  });
})();
