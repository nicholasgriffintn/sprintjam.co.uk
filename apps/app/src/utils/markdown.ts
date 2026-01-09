function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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

type ListType = 'ul' | 'ol';

export function renderMarkdownToHtml(markdown: string): string {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  let html = '';
  let inCodeBlock = false;
  const listStack: Array<{ type: ListType; indent: number }> = [];
  let paragraph = '';

  const closeAllLists = () => {
    while (listStack.length) {
      const closed = listStack.pop();
      if (closed) {
        html += `</${closed.type}>`;
      }
    }
  };

  const closeListsUntilIndent = (indent: number) => {
    while (listStack.length && listStack[listStack.length - 1].indent > indent) {
      const closed = listStack.pop();
      if (closed) {
        html += `</${closed.type}>`;
      }
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
    const trimmed = line.trim();

    if (line.startsWith('```')) {
      if (inCodeBlock) {
        html += '</code></pre>';
      } else {
        flushParagraph();
        closeAllLists();
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

    if (!trimmed) {
      flushParagraph();
      closeAllLists();
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      flushParagraph();
      closeAllLists();
      const level = headingMatch[1].length;
      const content = headingMatch[2];
      html += `<h${level}>${renderInlineMarkdown(content)}</h${level}>`;
      continue;
    }

    if (/^---+$/.test(line)) {
      flushParagraph();
      closeAllLists();
      html += '<hr />';
      continue;
    }

    if (line.startsWith('> ')) {
      flushParagraph();
      closeAllLists();
      html += `<blockquote>${renderInlineMarkdown(line.slice(2))}</blockquote>`;
      continue;
    }

    const orderedMatch = line.match(/^(\s*)\d+\.\s+(.*)$/);
    if (orderedMatch) {
      flushParagraph();
      const indent = orderedMatch[1].length;
      const content = orderedMatch[2];

      if (!listStack.length || indent > listStack[listStack.length - 1].indent) {
        listStack.push({ type: 'ol', indent });
        html += '<ol>';
      } else {
        closeListsUntilIndent(indent);
        const current = listStack[listStack.length - 1];
        if (!current || current.type !== 'ol' || current.indent !== indent) {
          if (current && current.type !== 'ol') {
            const closed = listStack.pop();
            if (closed) {
              html += `</${closed.type}>`;
            }
          }
          listStack.push({ type: 'ol', indent });
          html += '<ol>';
        }
      }

      html += `<li>${renderInlineMarkdown(content)}</li>`;
      continue;
    }

    const unorderedMatch = line.match(/^(\s*)[-*+]\s+(.*)$/);
    if (unorderedMatch) {
      flushParagraph();
      const indent = unorderedMatch[1].length;
      const content = unorderedMatch[2];

      if (!listStack.length || indent > listStack[listStack.length - 1].indent) {
        listStack.push({ type: 'ul', indent });
        html += '<ul>';
      } else {
        closeListsUntilIndent(indent);
        const current = listStack[listStack.length - 1];
        if (!current || current.type !== 'ul' || current.indent !== indent) {
          if (current && current.type !== 'ul') {
            const closed = listStack.pop();
            if (closed) {
              html += `</${closed.type}>`;
            }
          }
          listStack.push({ type: 'ul', indent });
          html += '<ul>';
        }
      }

      html += `<li>${renderInlineMarkdown(content)}</li>`;
      continue;
    }

    paragraph = paragraph ? `${paragraph} ${line.trim()}` : line.trim();
  }

  flushParagraph();
  closeAllLists();

  if (inCodeBlock) {
    html += '</code></pre>';
  }

  return html;
}
