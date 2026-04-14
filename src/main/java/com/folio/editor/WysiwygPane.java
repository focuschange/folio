package com.folio.editor;

import com.vladsch.flexmark.html2md.converter.FlexmarkHtmlConverter;
import com.folio.preview.MarkdownRenderer;
import javafx.geometry.Insets;
import javafx.scene.control.Button;
import javafx.scene.control.Separator;
import javafx.scene.control.ToolBar;
import javafx.scene.control.Tooltip;
import javafx.scene.layout.BorderPane;
import javafx.scene.layout.Priority;
import javafx.scene.layout.VBox;
import javafx.scene.web.WebEngine;
import javafx.scene.web.WebView;
import netscape.javascript.JSObject;

import java.util.function.Consumer;

public class WysiwygPane extends BorderPane {

    private final WebView webView;
    private final WebEngine webEngine;
    private final MarkdownRenderer markdownRenderer;
    private final FlexmarkHtmlConverter htmlToMdConverter;
    private Consumer<String> onContentChange;
    private boolean isDark = true;
    private boolean ready = false;

    public WysiwygPane() {
        webView = new WebView();
        webEngine = webView.getEngine();
        markdownRenderer = new MarkdownRenderer();
        htmlToMdConverter = FlexmarkHtmlConverter.builder().build();

        ToolBar toolbar = createToolbar();
        toolbar.getStyleClass().add("wysiwyg-toolbar");

        VBox container = new VBox(toolbar, webView);
        VBox.setVgrow(webView, Priority.ALWAYS);
        setCenter(container);

        webEngine.setOnAlert(event -> {
            // JS alert bridge fallback
        });

        loadWysiwygTemplate();
    }

    private void loadWysiwygTemplate() {
        String html = buildWysiwygHtml("");
        webEngine.loadContent(html);

        webEngine.getLoadWorker().stateProperty().addListener((obs, oldState, newState) -> {
            if (newState == javafx.concurrent.Worker.State.SUCCEEDED) {
                setupJsBridge();
                ready = true;
            }
        });
    }

    private void setupJsBridge() {
        try {
            JSObject window = (JSObject) webEngine.executeScript("window");
            window.setMember("javaApp", new JsBridge());
            webEngine.executeScript("""
                var observer = new MutationObserver(function(mutations) {
                    var content = document.getElementById('editor').innerHTML;
                    window.javaApp.onContentChange(content);
                });
                var config = { childList: true, subtree: true, characterData: true };
                var target = document.getElementById('editor');
                if (target) observer.observe(target, config);

                document.getElementById('editor').addEventListener('input', function() {
                    window.javaApp.onContentChange(this.innerHTML);
                });
            """);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public class JsBridge {
        public void onContentChange(String html) {
            javafx.application.Platform.runLater(() -> {
                if (onContentChange != null) {
                    String markdown = htmlToMdConverter.convert(html);
                    onContentChange.accept(markdown);
                }
            });
        }
    }

    private ToolBar createToolbar() {
        Button boldBtn = toolButton("B", "Bold (Cmd+B)", "bold");
        boldBtn.setStyle("-fx-font-weight: bold;");

        Button italicBtn = toolButton("I", "Italic (Cmd+I)", "italic");
        italicBtn.setStyle("-fx-font-style: italic;");

        Button strikeBtn = toolButton("S\u0336", "Strikethrough", "strikeThrough");

        Button h1Btn = toolButton("H1", "Heading 1", "formatBlock", "h1");
        Button h2Btn = toolButton("H2", "Heading 2", "formatBlock", "h2");
        Button h3Btn = toolButton("H3", "Heading 3", "formatBlock", "h3");

        Button codeBtn = new Button("<>");
        codeBtn.setTooltip(new Tooltip("Inline Code"));
        codeBtn.setOnAction(e -> execScript(
                "document.execCommand('insertHTML', false, '<code>' + window.getSelection().toString() + '</code>')"));

        Button ulBtn = toolButton("\u2022", "Unordered List", "insertUnorderedList");
        Button olBtn = toolButton("1.", "Ordered List", "insertOrderedList");
        Button quoteBtn = toolButton("\u201C", "Blockquote", "formatBlock", "blockquote");

        Button linkBtn = new Button("\uD83D\uDD17");
        linkBtn.setTooltip(new Tooltip("Insert Link"));
        linkBtn.setOnAction(e -> {
            javafx.scene.control.TextInputDialog dialog = new javafx.scene.control.TextInputDialog("https://");
            dialog.setTitle("Insert Link");
            dialog.setHeaderText("Enter URL:");
            dialog.showAndWait().ifPresent(url -> {
                execScript("document.execCommand('createLink', false, '" + escapeJs(url) + "')");
            });
        });

        Button hrBtn = new Button("---");
        hrBtn.setTooltip(new Tooltip("Horizontal Rule"));
        hrBtn.setOnAction(e -> execScript("document.execCommand('insertHorizontalRule')"));

        return new ToolBar(
                boldBtn, italicBtn, strikeBtn,
                new Separator(),
                h1Btn, h2Btn, h3Btn,
                new Separator(),
                codeBtn, ulBtn, olBtn, quoteBtn,
                new Separator(),
                linkBtn, hrBtn
        );
    }

    private Button toolButton(String text, String tooltip, String command) {
        Button btn = new Button(text);
        btn.setTooltip(new Tooltip(tooltip));
        btn.setOnAction(e -> execScript("document.execCommand('" + command + "')"));
        btn.setMinWidth(30);
        return btn;
    }

    private Button toolButton(String text, String tooltip, String command, String value) {
        Button btn = new Button(text);
        btn.setTooltip(new Tooltip(tooltip));
        btn.setOnAction(e -> execScript(
                "document.execCommand('" + command + "', false, '" + value + "')"));
        btn.setMinWidth(30);
        return btn;
    }

    public void setContentFromMarkdown(String markdown) {
        String html = markdownRenderer.renderToHtml(markdown);
        String escaped = escapeJs(html);
        if (ready) {
            execScript("document.getElementById('editor').innerHTML = '" + escaped + "'");
        }
    }

    public String getMarkdownContent() {
        if (!ready) return "";
        try {
            String html = (String) webEngine.executeScript("document.getElementById('editor').innerHTML");
            return htmlToMdConverter.convert(html);
        } catch (Exception e) {
            return "";
        }
    }

    public void setOnContentChange(Consumer<String> handler) {
        this.onContentChange = handler;
    }

    public void setDarkMode(boolean dark) {
        this.isDark = dark;
        if (ready) {
            execScript("document.body.className = '" + (dark ? "dark" : "light") + "'");
        }
    }

    private void execScript(String script) {
        try {
            webEngine.executeScript(script);
        } catch (Exception e) {
            // ignore script errors
        }
    }

    private String escapeJs(String text) {
        return text
                .replace("\\", "\\\\")
                .replace("'", "\\'")
                .replace("\n", "\\n")
                .replace("\r", "\\r");
    }

    private String buildWysiwygHtml(String content) {
        String theme = isDark ? "dark" : "light";
        return "<!DOCTYPE html>\n"
                + "<html><head><meta charset=\"UTF-8\">\n"
                + "<style>\n"
                + ":root { --bg-dark: #1e1e1e; --fg-dark: #d4d4d4; --bg-light: #ffffff; --fg-light: #24292e; }\n"
                + "body.dark { background: var(--bg-dark); color: var(--fg-dark); }\n"
                + "body.light { background: var(--bg-light); color: var(--fg-light); }\n"
                + "body { font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;\n"
                + "  font-size: 14px; line-height: 1.6; margin: 0; padding: 0; }\n"
                + "#editor { min-height: 100vh; padding: 20px; outline: none; word-wrap: break-word; }\n"
                + "#editor:focus { outline: none; }\n"
                + "#editor h1 { font-size: 2em; font-weight: 600; border-bottom: 1px solid #404040; padding-bottom: .3em; }\n"
                + "#editor h2 { font-size: 1.5em; font-weight: 600; border-bottom: 1px solid #404040; padding-bottom: .3em; }\n"
                + "#editor h3 { font-size: 1.25em; font-weight: 600; }\n"
                + "#editor code { font-family: 'SF Mono',Menlo,monospace; font-size: 85%; padding: 0.2em 0.4em; border-radius: 6px; }\n"
                + "body.dark #editor code { background: #2d2d2d; }\n"
                + "body.light #editor code { background: #f6f8fa; }\n"
                + "#editor blockquote { padding: 0 1em; margin: 0; border-left: 0.25em solid #404040; color: #8b949e; }\n"
                + "#editor a { color: #58a6ff; }\n"
                + "body.light #editor a { color: #0366d6; }\n"
                + "#editor img { max-width: 100%; }\n"
                + "#editor table { border-collapse: collapse; width: 100%; }\n"
                + "#editor th, #editor td { padding: 6px 13px; border: 1px solid #404040; }\n"
                + "body.light #editor th, body.light #editor td { border-color: #e1e4e8; }\n"
                + "</style></head>\n"
                + "<body class=\"" + theme + "\">\n"
                + "<div id=\"editor\" contenteditable=\"true\">" + content + "</div>\n"
                + "</body></html>";
    }
}
