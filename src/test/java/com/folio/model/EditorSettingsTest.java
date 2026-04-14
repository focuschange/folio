package com.folio.model;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class EditorSettingsTest {

    @Test
    void defaultSettings() {
        var settings = new EditorSettings();
        assertTrue(settings.darkTheme);
        assertTrue(settings.minimapVisible);
        assertEquals(15, settings.fontSize);
        assertEquals(4, settings.tabSize);
        assertTrue(settings.wordWrap);
        assertTrue(settings.openFiles.isEmpty());
        assertTrue(settings.recentFiles.isEmpty());
    }

    @Test
    void addRecentFileKeepsOrder() {
        var settings = new EditorSettings();
        settings.addRecentFile("/a.txt");
        settings.addRecentFile("/b.txt");
        settings.addRecentFile("/c.txt");
        assertEquals(3, settings.recentFiles.size());
        assertEquals("/c.txt", settings.recentFiles.get(0));
    }

    @Test
    void addRecentFileRemovesDuplicates() {
        var settings = new EditorSettings();
        settings.addRecentFile("/a.txt");
        settings.addRecentFile("/b.txt");
        settings.addRecentFile("/a.txt");
        assertEquals(2, settings.recentFiles.size());
        assertEquals("/a.txt", settings.recentFiles.get(0));
    }

    @Test
    void addRecentFileLimitsTo20() {
        var settings = new EditorSettings();
        for (int i = 0; i < 25; i++) {
            settings.addRecentFile("/file" + i + ".txt");
        }
        assertEquals(20, settings.recentFiles.size());
    }
}
