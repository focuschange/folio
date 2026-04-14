package com.folio.preview;

import javafx.concurrent.Worker;
import javafx.scene.layout.BorderPane;
import javafx.scene.web.WebEngine;
import javafx.scene.web.WebView;

public class PreviewPane extends BorderPane {

    private final WebView webView;
    private final WebEngine webEngine;
    private final MarkdownRenderer markdownRenderer;
    private boolean isDark = true;
    private boolean ready = false;
    private String pendingMarkdown = null;
    private String lastRenderedHtml = "";

    public PreviewPane() {
        webView = new WebView();
        webEngine = webView.getEngine();
        markdownRenderer = new MarkdownRenderer();

        setCenter(webView);

        webEngine.getLoadWorker().stateProperty().addListener((obs, oldState, newState) -> {
            if (newState == Worker.State.SUCCEEDED) {
                ready = true;
                if (pendingMarkdown != null) {
                    doUpdateContent(pendingMarkdown);
                    pendingMarkdown = null;
                }
            }
        });

        loadBaseTemplate();
    }

    private void loadBaseTemplate() {
        webEngine.loadContent(buildHtml(""));
    }

    public void updateContent(String markdown) {
        if (!ready) {
            pendingMarkdown = markdown;
            return;
        }
        doUpdateContent(markdown);
    }

    private void doUpdateContent(String markdown) {
        String htmlContent = markdownRenderer.renderToHtml(markdown);
        lastRenderedHtml = htmlContent;
        String escaped = escapeForJs(htmlContent);
        try {
            webEngine.executeScript(
                    "document.getElementById('content').innerHTML = '" + escaped + "';"
                            + "if(typeof hljs!=='undefined'){document.querySelectorAll('pre code').forEach(b=>hljs.highlightElement(b));}"
                            + "if(typeof renderMathInElement!=='undefined'){renderMathInElement(document.getElementById('content'),{delimiters:["
                            + "{left:'$$',right:'$$',display:true},"
                            + "{left:'$',right:'$',display:false},"
                            + "{left:'\\\\(',right:'\\\\)',display:false},"
                            + "{left:'\\\\[',right:'\\\\]',display:true}"
                            + "]});}"
            );
        } catch (Exception e) {
            ready = false;
            webEngine.loadContent(buildHtml(htmlContent));
        }
    }

    public void setDarkMode(boolean dark) {
        this.isDark = dark;
        if (ready) {
            try {
                webEngine.executeScript(
                        "document.body.className = '" + (dark ? "dark" : "light") + "';"
                );
            } catch (Exception ignored) {}
        }
    }

    public void scrollToPercent(double percent) {
        if (!ready) return;
        try {
            webEngine.executeScript(
                    "window.scrollTo(0, (document.body.scrollHeight - window.innerHeight) * " + percent + ");"
            );
        } catch (Exception ignored) {}
    }

    public WebView getWebView() {
        return webView;
    }

    public String getFullHtmlForExport() {
        return buildExportHtml(lastRenderedHtml);
    }

    private String buildHtml(String content) {
        String theme = isDark ? "dark" : "light";
        return "<!DOCTYPE html>\n"
                + "<html><head><meta charset=\"UTF-8\">\n"
                // highlight.js CDN
                + "<link rel=\"stylesheet\" href=\"https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/"
                + (isDark ? "github-dark" : "github") + ".min.css\">\n"
                + "<script src=\"https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js\"></script>\n"
                // KaTeX CDN
                + "<link rel=\"stylesheet\" href=\"https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css\">\n"
                + "<script src=\"https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js\"></script>\n"
                + "<script src=\"https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js\"></script>\n"
                + "<style>\n"
                + CSS_STYLES
                + "</style></head>\n"
                + "<body class=\"" + theme + "\">\n"
                + "<div id=\"content\">" + content + "</div>\n"
                + "<script>\n"
                + "document.addEventListener('DOMContentLoaded', function() {\n"
                + "  if(typeof hljs!=='undefined') hljs.highlightAll();\n"
                + "  if(typeof renderMathInElement!=='undefined') renderMathInElement(document.getElementById('content'),{delimiters:[\n"
                + "    {left:'$$',right:'$$',display:true},\n"
                + "    {left:'$',right:'$',display:false},\n"
                + "    {left:'\\\\(',right:'\\\\)',display:false},\n"
                + "    {left:'\\\\[',right:'\\\\]',display:true}\n"
                + "  ]});\n"
                + "});\n"
                + "</script>\n"
                + "</body></html>";
    }

    private String buildExportHtml(String content) {
        return "<!DOCTYPE html>\n"
                + "<html><head><meta charset=\"UTF-8\">\n"
                + "<title>Exported Document</title>\n"
                + "<link rel=\"stylesheet\" href=\"https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css\">\n"
                + "<script src=\"https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js\"></script>\n"
                + "<link rel=\"stylesheet\" href=\"https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css\">\n"
                + "<script src=\"https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js\"></script>\n"
                + "<script src=\"https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js\"></script>\n"
                + "<style>\n" + CSS_EXPORT_STYLES + "</style></head>\n"
                + "<body>\n"
                + "<article class=\"markdown-body\">" + content + "</article>\n"
                + "<script>hljs.highlightAll();\n"
                + "renderMathInElement(document.querySelector('.markdown-body'),{delimiters:[\n"
                + "  {left:'$$',right:'$$',display:true},{left:'$',right:'$',display:false}\n"
                + "]});</script>\n"
                + "</body></html>";
    }

    private String escapeForJs(String text) {
        return text
                .replace("\\", "\\\\")
                .replace("'", "\\'")
                .replace("\n", "\\n")
                .replace("\r", "\\r");
    }

    private static final String CSS_STYLES =
            ":root {\n"
                    + "  --bg-dark: #1e1e1e; --fg-dark: #d4d4d4;\n"
                    + "  --bg-light: #ffffff; --fg-light: #24292e;\n"
                    + "  --code-bg-dark: #2d2d2d; --code-bg-light: #f6f8fa;\n"
                    + "  --border-dark: #404040; --border-light: #e1e4e8;\n"
                    + "  --link-dark: #58a6ff; --link-light: #0366d6;\n"
                    + "}\n"
                    + "body.dark { background: var(--bg-dark); color: var(--fg-dark); }\n"
                    + "body.light { background: var(--bg-light); color: var(--fg-light); }\n"
                    + "body { font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;\n"
                    + "  font-size: 14px; line-height: 1.6; padding: 20px; margin: 0; word-wrap: break-word; }\n"
                    + "h1,h2,h3,h4,h5,h6 { margin-top: 24px; margin-bottom: 16px; font-weight: 600; line-height: 1.25; }\n"
                    + "h1 { font-size: 2em; border-bottom: 1px solid; padding-bottom: .3em; }\n"
                    + "body.dark h1 { border-color: var(--border-dark); }\n"
                    + "body.light h1 { border-color: var(--border-light); }\n"
                    + "h2 { font-size: 1.5em; border-bottom: 1px solid; padding-bottom: .3em; }\n"
                    + "body.dark h2 { border-color: var(--border-dark); }\n"
                    + "body.light h2 { border-color: var(--border-light); }\n"
                    + "h3 { font-size: 1.25em; }\n"
                    + "code { font-family: 'SF Mono','Menlo','Monaco',monospace; font-size: 85%; padding: 0.2em 0.4em; border-radius: 6px; }\n"
                    + "body.dark code { background: var(--code-bg-dark); }\n"
                    + "body.light code { background: var(--code-bg-light); }\n"
                    + "pre { padding: 16px; overflow: auto; border-radius: 6px; line-height: 1.45; }\n"
                    + "body.dark pre { background: var(--code-bg-dark); }\n"
                    + "body.light pre { background: var(--code-bg-light); }\n"
                    + "pre code { padding: 0; background: transparent; font-size: 100%; }\n"
                    + "blockquote { padding: 0 1em; margin: 0; border-left: 0.25em solid; }\n"
                    + "body.dark blockquote { border-color: var(--border-dark); color: #8b949e; }\n"
                    + "body.light blockquote { border-color: var(--border-light); color: #6a737d; }\n"
                    + "table { border-collapse: collapse; width: 100%; margin: 16px 0; }\n"
                    + "th,td { padding: 6px 13px; border: 1px solid; }\n"
                    + "body.dark th, body.dark td { border-color: var(--border-dark); }\n"
                    + "body.light th, body.light td { border-color: var(--border-light); }\n"
                    + "body.dark th { background: #2d2d2d; }\n"
                    + "body.light th { background: #f6f8fa; }\n"
                    + "body.dark a { color: var(--link-dark); }\n"
                    + "body.light a { color: var(--link-light); }\n"
                    + "img { max-width: 100%; }\n"
                    + "hr { height: 0.25em; padding: 0; margin: 24px 0; border: 0; }\n"
                    + "body.dark hr { background: var(--border-dark); }\n"
                    + "body.light hr { background: var(--border-light); }\n"
                    + "input[type='checkbox'] { margin-right: 0.5em; }\n"
                    + ".katex-display { overflow-x: auto; overflow-y: hidden; }\n";

    private static final String CSS_EXPORT_STYLES =
            "body { font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;\n"
                    + "  font-size: 14px; line-height: 1.6; padding: 40px; margin: 0 auto; max-width: 900px; color: #24292e; }\n"
                    + "h1,h2,h3,h4,h5,h6 { margin-top: 24px; margin-bottom: 16px; font-weight: 600; }\n"
                    + "h1 { font-size: 2em; border-bottom: 1px solid #e1e4e8; padding-bottom: .3em; }\n"
                    + "h2 { font-size: 1.5em; border-bottom: 1px solid #e1e4e8; padding-bottom: .3em; }\n"
                    + "code { font-family: 'SF Mono','Menlo',monospace; font-size: 85%; padding: 0.2em 0.4em; background: #f6f8fa; border-radius: 6px; }\n"
                    + "pre { padding: 16px; overflow: auto; background: #f6f8fa; border-radius: 6px; line-height: 1.45; }\n"
                    + "pre code { padding: 0; background: transparent; }\n"
                    + "blockquote { padding: 0 1em; border-left: 0.25em solid #e1e4e8; color: #6a737d; }\n"
                    + "table { border-collapse: collapse; width: 100%; margin: 16px 0; }\n"
                    + "th,td { padding: 6px 13px; border: 1px solid #e1e4e8; }\n"
                    + "th { background: #f6f8fa; }\n"
                    + "a { color: #0366d6; }\n"
                    + "img { max-width: 100%; }\n"
                    + "hr { height: 0.25em; background: #e1e4e8; border: 0; margin: 24px 0; }\n"
                    + ".katex-display { overflow-x: auto; }\n";
}
