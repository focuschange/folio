package com.folio.model;

import org.junit.jupiter.api.Test;

import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.*;

class EditorDocumentTest {

    @Test
    void newDocumentIsNotDirty() {
        var doc = new EditorDocument();
        assertFalse(doc.isDirty());
    }

    @Test
    void settingContentMakesDirty() {
        var doc = new EditorDocument(Path.of("/tmp/test.txt"), "hello");
        doc.setContent("hello modified");
        assertTrue(doc.isDirty());
    }

    @Test
    void markSavedClearsDirty() {
        var doc = new EditorDocument(Path.of("/tmp/test.txt"), "hello");
        doc.setContent("changed");
        assertTrue(doc.isDirty());
        doc.markSaved();
        assertFalse(doc.isDirty());
    }

    @Test
    void isMarkdownDetectsExtensions() {
        assertTrue(new EditorDocument(Path.of("test.md"), "").isMarkdown());
        assertTrue(new EditorDocument(Path.of("test.markdown"), "").isMarkdown());
        assertFalse(new EditorDocument(Path.of("test.txt"), "").isMarkdown());
        assertFalse(new EditorDocument(Path.of("test.java"), "").isMarkdown());
    }

    @Test
    void getFileNameReturnsUntitledForNew() {
        var doc = new EditorDocument();
        assertEquals("Untitled", doc.getFileName());
    }

    @Test
    void getFileNameReturnsActualName() {
        var doc = new EditorDocument(Path.of("/tmp/readme.md"), "");
        assertEquals("readme.md", doc.getFileName());
    }

    @Test
    void defaultModeIsText() {
        var doc = new EditorDocument();
        assertEquals(EditorMode.TEXT, doc.getMode());
    }
}
