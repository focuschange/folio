package com.folio.model;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

public class EditorSettings {

    private static final Path SETTINGS_DIR = Path.of(System.getProperty("user.home"), ".folio");
    private static final Path SETTINGS_FILE = SETTINGS_DIR.resolve("settings.json");

    // Window state
    public double windowX = -1;
    public double windowY = -1;
    public double windowWidth = 1200;
    public double windowHeight = 800;
    public boolean maximized = false;

    // Editor preferences
    public boolean darkTheme = true;
    public boolean minimapVisible = true;
    public int fontSize = 15;
    public int tabSize = 4;
    public boolean wordWrap = true;
    public String fontFamily = "Menlo";
    public boolean autoSave = false;
    public int autoSaveInterval = 30;
    public int editorPadding = 0;
    public boolean sidebarVisible = true;
    public boolean rightPanelVisible = false;
    public int wordCountGoal = 0;

    // Layout divider positions
    public double splitDivider0 = 0.18;   // sidebar divider
    public double splitDivider1 = 0.82;   // right panel divider
    public boolean gitPanelVisible = false;
    public boolean outlineVisible = false;

    // Session
    public String lastProjectPath = "";
    public List<String> openFiles = new ArrayList<>();
    public List<String> recentFiles = new ArrayList<>();

    public void save() {
        try {
            Files.createDirectories(SETTINGS_DIR);
            // Simple JSON serialization (no library dependency)
            StringBuilder sb = new StringBuilder("{\n");
            sb.append("  \"windowX\": ").append(windowX).append(",\n");
            sb.append("  \"windowY\": ").append(windowY).append(",\n");
            sb.append("  \"windowWidth\": ").append(windowWidth).append(",\n");
            sb.append("  \"windowHeight\": ").append(windowHeight).append(",\n");
            sb.append("  \"maximized\": ").append(maximized).append(",\n");
            sb.append("  \"darkTheme\": ").append(darkTheme).append(",\n");
            sb.append("  \"minimapVisible\": ").append(minimapVisible).append(",\n");
            sb.append("  \"fontSize\": ").append(fontSize).append(",\n");
            sb.append("  \"tabSize\": ").append(tabSize).append(",\n");
            sb.append("  \"wordWrap\": ").append(wordWrap).append(",\n");
            sb.append("  \"fontFamily\": \"").append(escapeJson(fontFamily)).append("\",\n");
            sb.append("  \"autoSave\": ").append(autoSave).append(",\n");
            sb.append("  \"autoSaveInterval\": ").append(autoSaveInterval).append(",\n");
            sb.append("  \"editorPadding\": ").append(editorPadding).append(",\n");
            sb.append("  \"sidebarVisible\": ").append(sidebarVisible).append(",\n");
            sb.append("  \"rightPanelVisible\": ").append(rightPanelVisible).append(",\n");
            sb.append("  \"wordCountGoal\": ").append(wordCountGoal).append(",\n");
            sb.append("  \"splitDivider0\": ").append(splitDivider0).append(",\n");
            sb.append("  \"splitDivider1\": ").append(splitDivider1).append(",\n");
            sb.append("  \"gitPanelVisible\": ").append(gitPanelVisible).append(",\n");
            sb.append("  \"outlineVisible\": ").append(outlineVisible).append(",\n");
            sb.append("  \"lastProjectPath\": \"").append(escapeJson(lastProjectPath)).append("\",\n");
            sb.append("  \"openFiles\": [");
            for (int i = 0; i < openFiles.size(); i++) {
                if (i > 0) sb.append(", ");
                sb.append("\"").append(escapeJson(openFiles.get(i))).append("\"");
            }
            sb.append("],\n");
            sb.append("  \"recentFiles\": [");
            for (int i = 0; i < recentFiles.size(); i++) {
                if (i > 0) sb.append(", ");
                sb.append("\"").append(escapeJson(recentFiles.get(i))).append("\"");
            }
            sb.append("]\n}");
            Files.writeString(SETTINGS_FILE, sb.toString());
        } catch (IOException e) {
            System.err.println("Failed to save settings: " + e.getMessage());
        }
    }

    public static EditorSettings load() {
        EditorSettings settings = new EditorSettings();
        if (!Files.exists(SETTINGS_FILE)) return settings;

        try {
            String json = Files.readString(SETTINGS_FILE);
            settings.windowX = parseDouble(json, "windowX", -1);
            settings.windowY = parseDouble(json, "windowY", -1);
            settings.windowWidth = parseDouble(json, "windowWidth", 1200);
            settings.windowHeight = parseDouble(json, "windowHeight", 800);
            settings.maximized = parseBoolean(json, "maximized", false);
            settings.darkTheme = parseBoolean(json, "darkTheme", true);
            settings.minimapVisible = parseBoolean(json, "minimapVisible", true);
            settings.fontSize = (int) parseDouble(json, "fontSize", 15);
            settings.tabSize = (int) parseDouble(json, "tabSize", 4);
            settings.wordWrap = parseBoolean(json, "wordWrap", true);
            settings.fontFamily = parseString(json, "fontFamily", "Menlo");
            settings.autoSave = parseBoolean(json, "autoSave", false);
            settings.autoSaveInterval = (int) parseDouble(json, "autoSaveInterval", 30);
            settings.editorPadding = (int) parseDouble(json, "editorPadding", 0);
            settings.sidebarVisible = parseBoolean(json, "sidebarVisible", true);
            settings.rightPanelVisible = parseBoolean(json, "rightPanelVisible", false);
            settings.wordCountGoal = (int) parseDouble(json, "wordCountGoal", 0);
            settings.splitDivider0 = parseDouble(json, "splitDivider0", 0.18);
            settings.splitDivider1 = parseDouble(json, "splitDivider1", 0.82);
            settings.gitPanelVisible = parseBoolean(json, "gitPanelVisible", false);
            settings.outlineVisible = parseBoolean(json, "outlineVisible", false);
            settings.lastProjectPath = parseString(json, "lastProjectPath", "");
            settings.openFiles = parseStringArray(json, "openFiles");
            settings.recentFiles = parseStringArray(json, "recentFiles");
        } catch (IOException e) {
            System.err.println("Failed to load settings: " + e.getMessage());
        }
        return settings;
    }

    public void addRecentFile(String path) {
        recentFiles.remove(path);
        recentFiles.add(0, path);
        if (recentFiles.size() > 20) {
            recentFiles = new ArrayList<>(recentFiles.subList(0, 20));
        }
    }

    // Simple JSON parsers (no library dependency)
    private static double parseDouble(String json, String key, double defaultVal) {
        try {
            int idx = json.indexOf("\"" + key + "\"");
            if (idx < 0) return defaultVal;
            int colonIdx = json.indexOf(":", idx);
            int endIdx = json.indexOf(",", colonIdx);
            if (endIdx < 0) endIdx = json.indexOf("}", colonIdx);
            return Double.parseDouble(json.substring(colonIdx + 1, endIdx).trim());
        } catch (Exception e) { return defaultVal; }
    }

    private static boolean parseBoolean(String json, String key, boolean defaultVal) {
        try {
            int idx = json.indexOf("\"" + key + "\"");
            if (idx < 0) return defaultVal;
            int colonIdx = json.indexOf(":", idx);
            int endIdx = json.indexOf(",", colonIdx);
            if (endIdx < 0) endIdx = json.indexOf("}", colonIdx);
            return Boolean.parseBoolean(json.substring(colonIdx + 1, endIdx).trim());
        } catch (Exception e) { return defaultVal; }
    }

    private static String parseString(String json, String key, String defaultVal) {
        try {
            int idx = json.indexOf("\"" + key + "\"");
            if (idx < 0) return defaultVal;
            int colonIdx = json.indexOf(":", idx);
            int firstQuote = json.indexOf("\"", colonIdx + 1);
            int secondQuote = json.indexOf("\"", firstQuote + 1);
            return json.substring(firstQuote + 1, secondQuote);
        } catch (Exception e) { return defaultVal; }
    }

    private static List<String> parseStringArray(String json, String key) {
        List<String> result = new ArrayList<>();
        try {
            int idx = json.indexOf("\"" + key + "\"");
            if (idx < 0) return result;
            int bracketStart = json.indexOf("[", idx);
            int bracketEnd = json.indexOf("]", bracketStart);
            String arrayStr = json.substring(bracketStart + 1, bracketEnd);
            String[] parts = arrayStr.split(",");
            for (String part : parts) {
                String trimmed = part.trim();
                if (trimmed.startsWith("\"") && trimmed.endsWith("\"")) {
                    result.add(trimmed.substring(1, trimmed.length() - 1));
                }
            }
        } catch (Exception e) { /* ignore */ }
        return result;
    }

    private String escapeJson(String s) {
        return s.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
