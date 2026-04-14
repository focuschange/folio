package com.folio.editor;

import org.fxmisc.richtext.CodeArea;
import org.fxmisc.richtext.model.StyleSpans;
import org.fxmisc.richtext.model.StyleSpansBuilder;

import java.util.Collection;
import java.util.Collections;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class MarkdownSyntaxHighlighter {

    private static final String HEADER_PATTERN = "(?m)^#{1,6}\\s+.*$";
    private static final String BOLD_PATTERN = "\\*\\*[^*]+\\*\\*|__[^_]+__";
    private static final String ITALIC_PATTERN = "(?<![*_])\\*[^*]+\\*(?![*_])|(?<![*_])_[^_]+_(?![*_])";
    private static final String CODE_BLOCK_PATTERN = "```[\\s\\S]*?```";
    private static final String INLINE_CODE_PATTERN = "`[^`\\n]+`";
    private static final String LINK_PATTERN = "\\[([^\\]]+)]\\(([^)]+)\\)";
    private static final String IMAGE_PATTERN = "!\\[([^\\]]*)]\\(([^)]+)\\)";
    private static final String BLOCKQUOTE_PATTERN = "(?m)^>\\s+.*$";
    private static final String LIST_PATTERN = "(?m)^\\s*[-*+]\\s+.*$|^\\s*\\d+\\.\\s+.*$";
    private static final String HORIZONTAL_RULE_PATTERN = "(?m)^([-*_]){3,}\\s*$";
    private static final String STRIKETHROUGH_PATTERN = "~~[^~]+~~";

    private static final Pattern PATTERN = Pattern.compile(
            "(?<CODEBLOCK>" + CODE_BLOCK_PATTERN + ")"
                    + "|(?<HEADER>" + HEADER_PATTERN + ")"
                    + "|(?<BOLD>" + BOLD_PATTERN + ")"
                    + "|(?<ITALIC>" + ITALIC_PATTERN + ")"
                    + "|(?<INLINECODE>" + INLINE_CODE_PATTERN + ")"
                    + "|(?<IMAGE>" + IMAGE_PATTERN + ")"
                    + "|(?<LINK>" + LINK_PATTERN + ")"
                    + "|(?<BLOCKQUOTE>" + BLOCKQUOTE_PATTERN + ")"
                    + "|(?<LIST>" + LIST_PATTERN + ")"
                    + "|(?<HR>" + HORIZONTAL_RULE_PATTERN + ")"
                    + "|(?<STRIKETHROUGH>" + STRIKETHROUGH_PATTERN + ")"
    );

    public static StyleSpans<Collection<String>> computeHighlighting(String text) {
        Matcher matcher = PATTERN.matcher(text);
        int lastKwEnd = 0;
        StyleSpansBuilder<Collection<String>> spansBuilder = new StyleSpansBuilder<>();

        while (matcher.find()) {
            String styleClass =
                    matcher.group("CODEBLOCK") != null ? "code-block" :
                    matcher.group("HEADER") != null ? "header" :
                    matcher.group("BOLD") != null ? "bold" :
                    matcher.group("ITALIC") != null ? "italic" :
                    matcher.group("INLINECODE") != null ? "inline-code" :
                    matcher.group("IMAGE") != null ? "image" :
                    matcher.group("LINK") != null ? "link" :
                    matcher.group("BLOCKQUOTE") != null ? "blockquote" :
                    matcher.group("LIST") != null ? "list" :
                    matcher.group("HR") != null ? "hr" :
                    matcher.group("STRIKETHROUGH") != null ? "strikethrough" :
                    null;

            if (styleClass != null) {
                spansBuilder.add(Collections.emptyList(), matcher.start() - lastKwEnd);
                spansBuilder.add(Collections.singleton(styleClass), matcher.end() - matcher.start());
                lastKwEnd = matcher.end();
            }
        }
        spansBuilder.add(Collections.emptyList(), text.length() - lastKwEnd);

        return spansBuilder.create();
    }

    public static void apply(CodeArea codeArea) {
        codeArea.multiPlainChanges()
                .successionEnds(java.time.Duration.ofMillis(50))
                .subscribe(ignore -> {
                    try {
                        codeArea.setStyleSpans(0, computeHighlighting(codeArea.getText()));
                    } catch (Exception e) {
                        // ignore highlighting errors
                    }
                });
    }
}
