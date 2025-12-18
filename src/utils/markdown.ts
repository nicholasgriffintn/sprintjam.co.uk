function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function renderInlineMarkdown(text: string): string {
  let escaped = escapeHtml(text);

  escaped = escaped.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (_, label: string, url: string) =>
      `<a href="${escapeHtml(
        url
      )}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`
  );
  escaped = escaped.replace(
    /\*\*([^*]+)\*\*/g,
    (_, bold: string) => `<strong>${escapeHtml(bold)}</strong>`
  );
  escaped = escaped.replace(
    /\*([^*]+)\*/g,
    (_, italic: string) => `<em>${escapeHtml(italic)}</em>`
  );
  escaped = escaped.replace(
    /`([^`]+)`/g,
    (_, code: string) => `<code>${escapeHtml(code)}</code>`
  );

  return escaped;
}

export function renderMarkdownToHtml(markdown: string): string {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  let html = '';
  let inCodeBlock = false;
  let listType: 'ul' | 'ol' | null = null;
  let paragraph = '';

  const closeList = () => {
    if (listType) {
      html += `</${listType}>`;
      listType = null;
    }
  };

  const flushParagraph = () => {
    if (paragraph.trim()) {
      html += `<p>${renderInlineMarkdown(paragraph.trim())}</p>`;
      paragraph = '';
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (line.startsWith('```')) {
      if (inCodeBlock) {
        html += '</code></pre>';
      } else {
        flushParagraph();
        closeList();
        const language = line.slice(3).trim();
        html += `<pre class="overflow-auto rounded-2xl bg-slate-900 text-slate-100 p-4 text-sm shadow-lg shadow-slate-900/30 dark:bg-slate-950/80"><code${
          language ? ` class="language-${escapeHtml(language)}"` : ''
        }>`;
      }
      inCodeBlock = !inCodeBlock;
      continue;
    }

    if (inCodeBlock) {
      html += `${escapeHtml(rawLine)}\n`;
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      closeList();
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      flushParagraph();
      closeList();
      const level = headingMatch[1].length;
      const content = headingMatch[2];
      html += `<h${level}>${renderInlineMarkdown(content)}</h${level}>`;
      continue;
    }

    if (/^---+$/.test(line)) {
      flushParagraph();
      closeList();
      html += '<hr />';
      continue;
    }

    if (line.startsWith('> ')) {
      flushParagraph();
      closeList();
      html += `<blockquote>${renderInlineMarkdown(line.slice(2))}</blockquote>`;
      continue;
    }

    const orderedMatch = line.match(/^\d+\.\s+(.*)$/);
    if (orderedMatch) {
      flushParagraph();
      if (listType !== 'ol') {
        closeList();
        listType = 'ol';
        html += '<ol>';
      }
      html += `<li>${renderInlineMarkdown(orderedMatch[1])}</li>`;
      continue;
    }

    const unorderedMatch = line.match(/^[-*+]\s+(.*)$/);
    if (unorderedMatch) {
      flushParagraph();
      if (listType !== 'ul') {
        closeList();
        listType = 'ul';
        html += '<ul>';
      }
      html += `<li>${renderInlineMarkdown(unorderedMatch[1])}</li>`;
      continue;
    }

    paragraph = paragraph ? `${paragraph} ${line.trim()}` : line.trim();
  }

  flushParagraph();
  closeList();

  if (inCodeBlock) {
    html += '</code></pre>';
  }

  return html;
}
