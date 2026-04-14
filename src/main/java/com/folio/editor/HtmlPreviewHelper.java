package com.folio.editor;

import javafx.concurrent.Worker;
import javafx.scene.layout.BorderPane;
import javafx.scene.web.WebEngine;
import javafx.scene.web.WebView;

/**
 * Helper for HTML live preview functionality.
 * For .html/.htm files, loads raw HTML content into a WebView directly.
 * Used by EditorTabManager to create a SplitPane with EditorPane and live preview.
 */
public class HtmlPreviewHelper extends BorderPane {

    private final WebView webView;
    private final WebEngine webEngine;
    private boolean isDark = true;
    private boolean ready = false;
    private String pendingHtml = null;

    public HtmlPreviewHelper() {
        webView = new WebView();
        webEngine = webView.getEngine();
        setCenter(webView);

        webEngine.getLoadWorker().stateProperty().addListener((obs, oldState, newState) -> {
            if (newState == Worker.State.SUCCEEDED) {
                ready = true;
                if (pendingHtml != null) {
                    doUpdateContent(pendingHtml);
                    pendingHtml = null;
                }
            }
        });

        // Load a blank page initially
        webEngine.loadContent("<html><body></body></html>");
    }

    /**
     * Update the HTML preview with raw HTML content.
     */
    public void updateContent(String html) {
        if (!ready) {
            pendingHtml = html;
            return;
        }
        doUpdateContent(html);
    }

    private void doUpdateContent(String html) {
        webEngine.loadContent(html);
    }

    /**
     * Set dark/light mode for the preview background.
     */
    public void setDarkMode(boolean dark) {
        this.isDark = dark;
    }

    /**
     * Scroll the preview to a percentage.
     */
    public void scrollToPercent(double percent) {
        if (!ready) return;
        try {
            webEngine.executeScript(
                    "window.scrollTo(0, (document.body.scrollHeight - window.innerHeight) * " + percent + ");"
            );
        } catch (Exception ignored) {}
    }

    /**
     * Get the WebView instance.
     */
    public WebView getWebView() {
        return webView;
    }

    /**
     * Check if a file extension represents an HTML file.
     */
    public static boolean isHtmlFile(String extension) {
        if (extension == null) return false;
        String ext = extension.toLowerCase();
        return ext.equals("html") || ext.equals("htm");
    }
}
