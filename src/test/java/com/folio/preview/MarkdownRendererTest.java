package com.folio.preview;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class MarkdownRendererTest {

    private final MarkdownRenderer renderer = new MarkdownRenderer();

    @Test
    void rendersEmptyString() {
        assertEquals("", renderer.renderToHtml(""));
        assertEquals("", renderer.renderToHtml(null));
    }

    @Test
    void rendersHeading() {
        String html = renderer.renderToHtml("# Hello");
        assertTrue(html.contains("<h1>"));
        assertTrue(html.contains("Hello"));
    }

    @Test
    void rendersBold() {
        String html = renderer.renderToHtml("**bold**");
        assertTrue(html.contains("<strong>bold</strong>"));
    }

    @Test
    void rendersItalic() {
        String html = renderer.renderToHtml("*italic*");
        assertTrue(html.contains("<em>italic</em>"));
    }

    @Test
    void rendersCodeBlock() {
        String html = renderer.renderToHtml("```\ncode\n```");
        assertTrue(html.contains("<code>"));
        assertTrue(html.contains("code"));
    }

    @Test
    void rendersTable() {
        String md = "| A | B |\n|---|---|\n| 1 | 2 |";
        String html = renderer.renderToHtml(md);
        assertTrue(html.contains("<table>"));
        assertTrue(html.contains("<td>1</td>"));
    }

    @Test
    void rendersTaskList() {
        String md = "- [x] done\n- [ ] todo";
        String html = renderer.renderToHtml(md);
        assertTrue(html.contains("type=\"checkbox\""));
    }

    @Test
    void rendersLink() {
        String html = renderer.renderToHtml("[Google](https://google.com)");
        assertTrue(html.contains("<a href=\"https://google.com\">Google</a>"));
    }

    @Test
    void rendersStrikethrough() {
        String html = renderer.renderToHtml("~~deleted~~");
        assertTrue(html.contains("<del>deleted</del>"));
    }
}
