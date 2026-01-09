import { describe, expect, it } from "vitest";
import { renderMarkdownToHtml } from "./markdown";

describe("renderMarkdownToHtml", () => {
  it("escapes code block language attribute values", () => {
    const markdown = [
      '``` js" onmouseover="alert(1)',
      "console.log('hi');",
      "```",
    ].join("\n");

    const html = renderMarkdownToHtml(markdown);

    expect(html).toContain(
      'class="language-js&quot; onmouseover=&quot;alert(1)"',
    );
    expect(html).not.toContain('class="language-js" onmouseover="alert(1)"');
  });
});
