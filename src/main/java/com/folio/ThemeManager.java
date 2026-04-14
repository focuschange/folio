package com.folio;

import com.folio.editor.EditorTabManager;
import javafx.application.Application;
import javafx.scene.Scene;

import atlantafx.base.theme.CupertinoDark;
import atlantafx.base.theme.CupertinoLight;
import atlantafx.base.theme.PrimerDark;
import atlantafx.base.theme.PrimerLight;
import atlantafx.base.theme.NordDark;
import atlantafx.base.theme.NordLight;
import atlantafx.base.theme.Dracula;

public class ThemeManager {

    private final EditorTabManager tabManager;
    private boolean isDark = true;

    public ThemeManager(EditorTabManager tabManager) {
        this.tabManager = tabManager;
    }

    public boolean isDark() {
        return isDark;
    }

    public void setTheme(boolean dark, Scene scene) {
        this.isDark = dark;
        tabManager.setDarkMode(dark);

        // Apply AtlantaFX base theme
        if (dark) {
            Application.setUserAgentStylesheet(new CupertinoDark().getUserAgentStylesheet());
        } else {
            Application.setUserAgentStylesheet(new CupertinoLight().getUserAgentStylesheet());
        }

        // Apply custom CSS on top
        if (scene != null) {
            scene.getStylesheets().clear();
            String css = dark ? "app-dark.css" : "app-light.css";
            var resource = getClass().getResource("/com/folio/css/" + css);
            if (resource != null) {
                scene.getStylesheets().add(resource.toExternalForm());
            }
            String editorCssName = dark ? "editor.css" : "editor-light.css";
            var editorCss = getClass().getResource("/com/folio/css/" + editorCssName);
            if (editorCss != null) {
                scene.getStylesheets().add(editorCss.toExternalForm());
            }
        }
    }
}
