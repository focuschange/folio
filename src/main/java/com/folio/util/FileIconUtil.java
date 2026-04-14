package com.folio.util;

import javafx.scene.control.Label;
import javafx.scene.paint.Color;

import java.util.Map;

public class FileIconUtil {

    private static final Map<String, String[]> ICON_MAP = Map.ofEntries(
            // [icon, color-hex]
            Map.entry("md", new String[]{"\u25A0", "#519aba"}),        // Markdown
            Map.entry("markdown", new String[]{"\u25A0", "#519aba"}),
            Map.entry("java", new String[]{"\u2615", "#e76f00"}),      // Java
            Map.entry("kt", new String[]{"K", "#7f6cb1"}),             // Kotlin
            Map.entry("kts", new String[]{"K", "#7f6cb1"}),
            Map.entry("py", new String[]{"\u03BB", "#3572A5"}),        // Python
            Map.entry("js", new String[]{"JS", "#f1e05a"}),            // JavaScript
            Map.entry("ts", new String[]{"TS", "#3178c6"}),            // TypeScript
            Map.entry("jsx", new String[]{"JSX", "#61dafb"}),
            Map.entry("tsx", new String[]{"TSX", "#3178c6"}),
            Map.entry("json", new String[]{"{}", "#cbcb41"}),          // JSON
            Map.entry("xml", new String[]{"<>", "#e37933"}),           // XML
            Map.entry("html", new String[]{"<>", "#e34c26"}),          // HTML
            Map.entry("htm", new String[]{"<>", "#e34c26"}),
            Map.entry("css", new String[]{"#", "#563d7c"}),            // CSS
            Map.entry("scss", new String[]{"S", "#c6538c"}),
            Map.entry("sql", new String[]{"DB", "#e38c00"}),           // SQL
            Map.entry("sh", new String[]{"$", "#89e051"}),             // Shell
            Map.entry("bash", new String[]{"$", "#89e051"}),
            Map.entry("yaml", new String[]{"\u2699", "#cb171e"}),      // YAML
            Map.entry("yml", new String[]{"\u2699", "#cb171e"}),
            Map.entry("txt", new String[]{"\u2261", "#999999"}),       // Text
            Map.entry("gradle", new String[]{"\u25B6", "#02303a"}),    // Gradle
            Map.entry("c", new String[]{"C", "#555555"}),
            Map.entry("cpp", new String[]{"C+", "#f34b7d"}),
            Map.entry("h", new String[]{"H", "#555555"}),
            Map.entry("go", new String[]{"Go", "#00ADD8"}),
            Map.entry("rs", new String[]{"Rs", "#dea584"}),
            Map.entry("swift", new String[]{"Sw", "#ffac45"}),
            Map.entry("rb", new String[]{"\u25C6", "#701516"}),
            Map.entry("php", new String[]{"<?", "#4F5D95"}),
            Map.entry("png", new String[]{"\u25A3", "#a074c4"}),
            Map.entry("jpg", new String[]{"\u25A3", "#a074c4"}),
            Map.entry("jpeg", new String[]{"\u25A3", "#a074c4"}),
            Map.entry("gif", new String[]{"\u25A3", "#a074c4"}),
            Map.entry("svg", new String[]{"\u25A3", "#ffb13b"}),
            Map.entry("pdf", new String[]{"PDF", "#e44d26"}),
            Map.entry("properties", new String[]{"\u2699", "#999999"}),
            Map.entry("conf", new String[]{"\u2699", "#999999"}),
            Map.entry("toml", new String[]{"\u2699", "#9c4221"}),
            Map.entry("log", new String[]{"\u2261", "#999999"})
    );

    private static final String[] DEFAULT_ICON = {"\u25CB", "#999999"};
    private static final String[] FOLDER_OPEN_ICON = {"\uD83D\uDCC2", "#dcb67a"};   // 📂
    private static final String[] FOLDER_CLOSED_ICON = {"\uD83D\uDCC1", "#dcb67a"}; // 📁

    public static Label getIcon(String filename) {
        String ext = getExtension(filename);
        String[] iconData = ICON_MAP.getOrDefault(ext, DEFAULT_ICON);
        return createIconLabel(iconData[0], iconData[1]);
    }

    public static Label getFolderIcon(boolean expanded) {
        String[] iconData = expanded ? FOLDER_OPEN_ICON : FOLDER_CLOSED_ICON;
        return createIconLabel(iconData[0], iconData[1]);
    }

    public static String getIconText(String filename) {
        String ext = getExtension(filename);
        String[] iconData = ICON_MAP.getOrDefault(ext, DEFAULT_ICON);
        return iconData[0];
    }

    private static Label createIconLabel(String icon, String colorHex) {
        Label label = new Label(icon);
        label.setTextFill(Color.web(colorHex));
        label.setStyle("-fx-font-size: 12px; -fx-min-width: 18; -fx-alignment: center;");
        return label;
    }

    private static String getExtension(String filename) {
        if (filename == null) return "";
        int dot = filename.lastIndexOf('.');
        return dot >= 0 ? filename.substring(dot + 1).toLowerCase() : "";
    }
}
