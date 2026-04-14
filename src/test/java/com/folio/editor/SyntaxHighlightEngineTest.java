package com.folio.editor;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class SyntaxHighlightEngineTest {

    @Test
    void detectsJava() {
        assertEquals("Java", SyntaxHighlightEngine.detectLanguage("java"));
    }

    @Test
    void detectsPython() {
        assertEquals("Python", SyntaxHighlightEngine.detectLanguage("py"));
    }

    @Test
    void detectsMarkdown() {
        assertEquals("Markdown", SyntaxHighlightEngine.detectLanguage("md"));
        assertEquals("Markdown", SyntaxHighlightEngine.detectLanguage("markdown"));
    }

    @Test
    void detectsJSON() {
        assertEquals("JSON", SyntaxHighlightEngine.detectLanguage("json"));
    }

    @Test
    void detectsPlainText() {
        assertEquals("Plain Text", SyntaxHighlightEngine.detectLanguage("txt"));
        assertEquals("Plain Text", SyntaxHighlightEngine.detectLanguage(""));
        assertEquals("Plain Text", SyntaxHighlightEngine.detectLanguage("xyz"));
    }

    @Test
    void highlightingDoesNotCrashOnEmptyText() {
        var spans = SyntaxHighlightEngine.computeHighlighting("", "java");
        assertNotNull(spans);
    }

    @Test
    void highlightingDoesNotCrashOnPlainText() {
        var spans = SyntaxHighlightEngine.computeHighlighting("hello world", "txt");
        assertNotNull(spans);
    }

    @Test
    void javaHighlightingProducesSpans() {
        String code = "public class Foo { int x = 42; }";
        var spans = SyntaxHighlightEngine.computeHighlighting(code, "java");
        assertNotNull(spans);
        assertTrue(spans.length() > 0);
    }

    @Test
    void jsonHighlightingProducesSpans() {
        String json = "{\"key\": \"value\", \"num\": 42, \"bool\": true}";
        var spans = SyntaxHighlightEngine.computeHighlighting(json, "json");
        assertNotNull(spans);
    }
}
