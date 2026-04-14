package com.folio.editor;

import com.folio.git.GitService;
import com.folio.model.EditorDocument;
import com.folio.model.EditorSettings;
import javafx.animation.PauseTransition;
import javafx.scene.Node;
import javafx.scene.image.Image;
import javafx.scene.input.*;
import javafx.scene.layout.BorderPane;
import javafx.scene.paint.Color;
import javafx.scene.shape.Rectangle;
import javafx.util.Duration;
import org.fxmisc.richtext.CodeArea;
import org.fxmisc.richtext.LineNumberFactory;
import org.fxmisc.richtext.model.StyleSpans;
import org.fxmisc.richtext.model.StyleSpansBuilder;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;
import java.util.function.Consumer;
import java.util.function.IntFunction;

public class EditorPane extends BorderPane {

    private static final Map<String, String> BRACKET_PAIRS = Map.of(
            "{", "}", "(", ")", "[", "]", "\"", "\"", "'", "'"
    );
    private static final Map<String, String> CLOSE_TO_OPEN = Map.of(
            "}", "{", ")", "(", "]", "["
    );

    private final CodeArea codeArea;
    private final FindReplaceBar findReplaceBar;
    private final Minimap minimap;
    private Consumer<String> onContentChange;
    private boolean suppressEvents = false;
    private String fileExtension = "";

    // #24 Bookmarks
    private final Set<Integer> bookmarks = new TreeSet<>();

    // #27 Gutter diff markers
    private final Map<Integer, GitService.DiffHunk.Type> diffMarkers = new HashMap<>();

    public EditorPane() {
        codeArea = new CodeArea();
        codeArea.setParagraphGraphicFactory(LineNumberFactory.get(codeArea));
        codeArea.setWrapText(true);
        codeArea.getStyleClass().add("code-area");

        findReplaceBar = new FindReplaceBar();
        findReplaceBar.setCodeArea(codeArea);

        minimap = new Minimap();
        minimap.setCodeArea(codeArea);

        setTop(findReplaceBar);
        setCenter(codeArea);
        setRight(minimap);

        setupAutoIndent();
        setupAutoBracket();
        setupTabIndent();
        setupBracketMatching();
        setupMarkdownShortcuts();
        setupImagePaste();
        setupBookmarkKeys();
        setupGutterFactory();

        PauseTransition debounce = new PauseTransition(Duration.millis(200));
        codeArea.textProperty().addListener((obs, oldText, newText) -> {
            if (!suppressEvents) {
                debounce.setOnFinished(e -> {
                    if (onContentChange != null) {
                        onContentChange.accept(newText);
                    }
                });
                debounce.playFromStart();
            }
        });
    }

    private void setupAutoIndent() {
        codeArea.addEventFilter(KeyEvent.KEY_PRESSED, event -> {
            if (event.getCode() == KeyCode.ENTER && !event.isShiftDown()) {
                int caretPos = codeArea.getCaretPosition();
                int currentPara = codeArea.getCurrentParagraph();
                String currentLine = codeArea.getParagraph(currentPara).getText();

                // Extract leading whitespace
                StringBuilder indent = new StringBuilder();
                for (char c : currentLine.toCharArray()) {
                    if (c == ' ' || c == '\t') indent.append(c);
                    else break;
                }

                // Extra indent after { or :
                String trimmed = currentLine.trim();
                if (trimmed.endsWith("{") || trimmed.endsWith(":")) {
                    indent.append("    ");
                }
                // Markdown list continuation
                if (trimmed.matches("^[-*+]\\s+.*") || trimmed.matches("^\\d+\\.\\s+.*")) {
                    // If the list item is empty (just the marker), clear it
                    if (trimmed.matches("^[-*+]\\s*$") || trimmed.matches("^\\d+\\.\\s*$")) {
                        // Replace the current line with empty
                        int lineStart = codeArea.getAbsolutePosition(currentPara, 0);
                        codeArea.replaceText(lineStart, caretPos, "");
                        event.consume();
                        return;
                    }
                }

                codeArea.insertText(caretPos, "\n" + indent);
                event.consume();
            }
        });
    }

    private void setupAutoBracket() {
        codeArea.setOnKeyTyped(event -> {
            String typed = event.getCharacter();
            if (typed.isEmpty()) return;

            int caretPos = codeArea.getCaretPosition();
            String text = codeArea.getText();

            // Auto-close brackets
            if (BRACKET_PAIRS.containsKey(typed)) {
                String close = BRACKET_PAIRS.get(typed);
                // For quotes, only auto-close if not already inside a quote
                if (typed.equals("\"") || typed.equals("'")) {
                    // Check if the char before caret is a backslash (escaped)
                    if (caretPos > 1 && text.charAt(caretPos - 2) == '\\') return;
                    // Check if closing an existing quote
                    if (caretPos < text.length() && String.valueOf(text.charAt(caretPos)).equals(typed)) {
                        codeArea.deleteText(caretPos, caretPos + 1);
                        return;
                    }
                }
                codeArea.insertText(caretPos, close);
                codeArea.moveTo(caretPos);
            }

            // Skip over closing bracket if typed
            if (CLOSE_TO_OPEN.containsKey(typed)) {
                if (caretPos < text.length() && String.valueOf(text.charAt(caretPos)).equals(typed)) {
                    codeArea.deleteText(caretPos, caretPos + 1);
                }
            }
        });
    }

    private void setupTabIndent() {
        codeArea.addEventFilter(KeyEvent.KEY_PRESSED, event -> {
            if (event.getCode() == KeyCode.TAB) {
                String selection = codeArea.getSelectedText();
                if (selection.contains("\n")) {
                    // Block indent/dedent
                    int start = codeArea.getSelection().getStart();
                    int end = codeArea.getSelection().getEnd();
                    String selected = codeArea.getText(start, end);

                    if (event.isShiftDown()) {
                        // Dedent
                        String dedented = selected.lines()
                                .map(line -> line.startsWith("    ") ? line.substring(4) :
                                        line.startsWith("\t") ? line.substring(1) : line)
                                .reduce((a, b) -> a + "\n" + b)
                                .orElse(selected);
                        codeArea.replaceText(start, end, dedented);
                    } else {
                        // Indent
                        String indented = selected.lines()
                                .map(line -> "    " + line)
                                .reduce((a, b) -> a + "\n" + b)
                                .orElse(selected);
                        codeArea.replaceText(start, end, indented);
                    }
                } else {
                    if (event.isShiftDown()) {
                        // Dedent current line
                        int para = codeArea.getCurrentParagraph();
                        String line = codeArea.getParagraph(para).getText();
                        int lineStart = codeArea.getAbsolutePosition(para, 0);
                        if (line.startsWith("    ")) {
                            codeArea.replaceText(lineStart, lineStart + 4, "");
                        } else if (line.startsWith("\t")) {
                            codeArea.replaceText(lineStart, lineStart + 1, "");
                        }
                    } else {
                        // Insert 4 spaces
                        codeArea.insertText(codeArea.getCaretPosition(), "    ");
                    }
                }
                event.consume();
            }
        });
    }

    // #18 Bracket matching highlight
    private int lastBracketMatchA = -1;
    private int lastBracketMatchB = -1;

    private void setupBracketMatching() {
        codeArea.caretPositionProperty().addListener((obs, oldPos, newPos) -> {
            clearBracketHighlight();
            int pos = newPos.intValue();
            String text = codeArea.getText();
            if (text.isEmpty()) return;

            char charBefore = pos > 0 ? text.charAt(pos - 1) : 0;
            char charAfter = pos < text.length() ? text.charAt(pos) : 0;

            int bracketPos = -1;
            char bracketChar = 0;
            if ("([{".indexOf(charAfter) >= 0) {
                bracketPos = pos;
                bracketChar = charAfter;
            } else if (")]}".indexOf(charAfter) >= 0) {
                bracketPos = pos;
                bracketChar = charAfter;
            } else if ("([{".indexOf(charBefore) >= 0) {
                bracketPos = pos - 1;
                bracketChar = charBefore;
            } else if (")]}".indexOf(charBefore) >= 0) {
                bracketPos = pos - 1;
                bracketChar = charBefore;
            }

            if (bracketPos >= 0) {
                int matchPos = findMatchingBracket(text, bracketPos, bracketChar);
                if (matchPos >= 0) {
                    highlightBracketPair(bracketPos, matchPos);
                }
            }
        });
    }

    private int findMatchingBracket(String text, int pos, char bracket) {
        char open, close;
        boolean forward;
        switch (bracket) {
            case '(' -> { open = '('; close = ')'; forward = true; }
            case ')' -> { open = '('; close = ')'; forward = false; }
            case '[' -> { open = '['; close = ']'; forward = true; }
            case ']' -> { open = '['; close = ']'; forward = false; }
            case '{' -> { open = '{'; close = '}'; forward = true; }
            case '}' -> { open = '{'; close = '}'; forward = false; }
            default -> { return -1; }
        }

        int depth = 0;
        if (forward) {
            for (int i = pos; i < text.length(); i++) {
                char c = text.charAt(i);
                if (c == open) depth++;
                else if (c == close) depth--;
                if (depth == 0) return i;
            }
        } else {
            for (int i = pos; i >= 0; i--) {
                char c = text.charAt(i);
                if (c == close) depth++;
                else if (c == open) depth--;
                if (depth == 0) return i;
            }
        }
        return -1;
    }

    private void highlightBracketPair(int posA, int posB) {
        lastBracketMatchA = posA;
        lastBracketMatchB = posB;
        try {
            // Apply bracket-match style at both positions
            StyleSpansBuilder<Collection<String>> builderA = new StyleSpansBuilder<>();
            builderA.add(Collections.singleton("bracket-match"), 1);
            codeArea.setStyleSpans(posA, builderA.create());

            StyleSpansBuilder<Collection<String>> builderB = new StyleSpansBuilder<>();
            builderB.add(Collections.singleton("bracket-match"), 1);
            codeArea.setStyleSpans(posB, builderB.create());
        } catch (Exception ignored) {
            // Ignore if positions are invalid
        }
    }

    private void clearBracketHighlight() {
        if (lastBracketMatchA >= 0 || lastBracketMatchB >= 0) {
            // Re-apply syntax highlighting to clear bracket matches
            try {
                codeArea.setStyleSpans(0,
                        SyntaxHighlightEngine.computeHighlighting(codeArea.getText(), fileExtension));
            } catch (Exception ignored) {}
            lastBracketMatchA = -1;
            lastBracketMatchB = -1;
        }
    }

    // #32 Markdown shortcuts (Cmd+B, Cmd+I, Cmd+K)
    private void setupMarkdownShortcuts() {
        codeArea.addEventFilter(KeyEvent.KEY_PRESSED, event -> {
            if (!isMarkdownFile()) return;
            if (!event.isMetaDown() && !event.isControlDown()) return;

            switch (event.getCode()) {
                case B -> {
                    wrapSelection("**", "**");
                    event.consume();
                }
                case I -> {
                    wrapSelection("*", "*");
                    event.consume();
                }
                case K -> {
                    if (!event.isShiftDown()) {
                        insertLinkTemplate();
                        event.consume();
                    }
                }
                default -> {}
            }
        });
    }

    private boolean isMarkdownFile() {
        return "md".equals(fileExtension) || "markdown".equals(fileExtension);
    }

    private void wrapSelection(String prefix, String suffix) {
        String selected = codeArea.getSelectedText();
        if (selected.isEmpty()) {
            int pos = codeArea.getCaretPosition();
            codeArea.insertText(pos, prefix + suffix);
            codeArea.moveTo(pos + prefix.length());
        } else {
            int start = codeArea.getSelection().getStart();
            int end = codeArea.getSelection().getEnd();
            codeArea.replaceText(start, end, prefix + selected + suffix);
            codeArea.selectRange(start + prefix.length(), start + prefix.length() + selected.length());
        }
    }

    private void insertLinkTemplate() {
        String selected = codeArea.getSelectedText();
        int start = codeArea.getSelection().getStart();
        int end = codeArea.getSelection().getEnd();
        if (selected.isEmpty()) {
            int pos = codeArea.getCaretPosition();
            codeArea.insertText(pos, "[](url)");
            codeArea.moveTo(pos + 1); // position inside []
        } else {
            codeArea.replaceText(start, end, "[" + selected + "](url)");
            // Select "url" for easy replacement
            codeArea.selectRange(start + selected.length() + 3, start + selected.length() + 6);
        }
    }

    // #29 Image paste from clipboard for markdown
    public void setupImagePaste() {
        codeArea.addEventFilter(KeyEvent.KEY_PRESSED, event -> {
            if (!isMarkdownFile()) return;
            if ((event.isMetaDown() || event.isControlDown()) && event.getCode() == KeyCode.V) {
                Clipboard clipboard = Clipboard.getSystemClipboard();
                if (clipboard.hasImage() && !clipboard.hasString()) {
                    Image image = clipboard.getImage();
                    if (image != null) {
                        pasteImageFromClipboard(image);
                        event.consume();
                    }
                }
            }
        });
    }

    private void pasteImageFromClipboard(Image image) {
        try {
            // Determine save directory
            Path saveDir;
            EditorDocument doc = currentDocument;
            if (doc != null && doc.getFilePath() != null) {
                saveDir = doc.getFilePath().getParent().resolve("images");
            } else {
                saveDir = Path.of(System.getProperty("user.home"), "folio-images");
            }
            Files.createDirectories(saveDir);

            // Generate unique filename
            String filename = "image-" + System.currentTimeMillis() + ".png";
            Path imagePath = saveDir.resolve(filename);

            // Write image to file using pixel reader
            int width = (int) image.getWidth();
            int height = (int) image.getHeight();
            java.awt.image.BufferedImage bImg = new java.awt.image.BufferedImage(
                    width, height, java.awt.image.BufferedImage.TYPE_INT_ARGB);
            javafx.scene.image.PixelReader reader = image.getPixelReader();
            for (int y = 0; y < height; y++) {
                for (int x = 0; x < width; x++) {
                    bImg.setRGB(x, y, reader.getArgb(x, y));
                }
            }
            javax.imageio.ImageIO.write(bImg, "png", imagePath.toFile());

            // Insert markdown image reference
            String relativePath = "images/" + filename;
            int pos = codeArea.getCaretPosition();
            codeArea.insertText(pos, "![](" + relativePath + ")");
        } catch (Exception e) {
            // Fallback: just paste normally
            codeArea.paste();
        }
    }

    // #24 Bookmark key handlers
    private void setupBookmarkKeys() {
        codeArea.addEventFilter(KeyEvent.KEY_PRESSED, event -> {
            if (event.getCode() == KeyCode.F2) {
                if (event.isMetaDown() || event.isControlDown()) {
                    // Cmd+F2: toggle bookmark on current line
                    toggleBookmark(codeArea.getCurrentParagraph());
                    event.consume();
                } else {
                    // F2: go to next bookmark
                    goToNextBookmark();
                    event.consume();
                }
            }
        });
    }

    public void toggleBookmark(int line) {
        if (bookmarks.contains(line)) {
            bookmarks.remove(line);
        } else {
            bookmarks.add(line);
        }
        // Force gutter refresh
        codeArea.setParagraphGraphicFactory(null);
        setupGutterFactory();
    }

    public void goToNextBookmark() {
        if (bookmarks.isEmpty()) return;
        int currentLine = codeArea.getCurrentParagraph();
        // Find next bookmark after current line
        Optional<Integer> next = bookmarks.stream().filter(b -> b > currentLine).findFirst();
        if (next.isEmpty()) {
            // Wrap around
            next = bookmarks.stream().findFirst();
        }
        next.ifPresent(line -> {
            codeArea.moveTo(line, 0);
            codeArea.requestFollowCaret();
        });
    }

    public Set<Integer> getBookmarks() {
        return Collections.unmodifiableSet(bookmarks);
    }

    // #27 Gutter factory with line numbers, bookmark indicators, and diff markers
    private void setupGutterFactory() {
        IntFunction<Node> lineNumberFactory = LineNumberFactory.get(codeArea);
        codeArea.setParagraphGraphicFactory(lineIdx -> {
            Node lineNumber = lineNumberFactory.apply(lineIdx);

            javafx.scene.layout.HBox gutter = new javafx.scene.layout.HBox(0);
            gutter.setAlignment(javafx.geometry.Pos.CENTER_LEFT);

            // Diff marker (thin colored bar on the left)
            Rectangle diffRect = new Rectangle(3, 16);
            GitService.DiffHunk.Type diffType = diffMarkers.get(lineIdx + 1); // 1-based
            if (diffType != null) {
                switch (diffType) {
                    case ADDED -> diffRect.setFill(Color.web("#73c991"));
                    case MODIFIED -> diffRect.setFill(Color.web("#e2c08d"));
                    case DELETED -> diffRect.setFill(Color.web("#c74e39"));
                }
            } else {
                diffRect.setFill(Color.TRANSPARENT);
            }

            // Bookmark indicator
            javafx.scene.control.Label bookmarkLabel = new javafx.scene.control.Label();
            if (bookmarks.contains(lineIdx)) {
                bookmarkLabel.setText("\u25CF "); // Filled circle
                bookmarkLabel.setStyle("-fx-text-fill: #007acc; -fx-font-size: 10px;");
            } else {
                bookmarkLabel.setText("  ");
                bookmarkLabel.setStyle("-fx-font-size: 10px;");
            }
            bookmarkLabel.setMinWidth(14);

            gutter.getChildren().addAll(diffRect, bookmarkLabel, lineNumber);
            return gutter;
        });
    }

    // #27 Set diff markers from GitService
    public void setDiffMarkers(List<GitService.DiffHunk> hunks) {
        diffMarkers.clear();
        if (hunks != null) {
            for (GitService.DiffHunk hunk : hunks) {
                for (int i = 0; i < hunk.lineCount(); i++) {
                    diffMarkers.put(hunk.startLine() + i, hunk.type());
                }
            }
        }
        // Refresh gutter
        codeArea.setParagraphGraphicFactory(null);
        setupGutterFactory();
    }

    private EditorDocument currentDocument;

    public void loadDocument(EditorDocument doc) {
        this.currentDocument = doc;
        suppressEvents = true;
        codeArea.replaceText(doc.getContent());
        codeArea.getUndoManager().forgetHistory();
        suppressEvents = false;

        if (doc.getFilePath() != null) {
            String name = doc.getFilePath().getFileName().toString();
            int dotIdx = name.lastIndexOf('.');
            fileExtension = dotIdx >= 0 ? name.substring(dotIdx + 1).toLowerCase() : "";
        }

        applySyntaxHighlighting();
    }

    private void applySyntaxHighlighting() {
        SyntaxHighlightEngine.apply(codeArea, fileExtension);
        try {
            codeArea.setStyleSpans(0,
                    SyntaxHighlightEngine.computeHighlighting(codeArea.getText(), fileExtension));
        } catch (Exception e) {
            // ignore
        }
    }

    public String getFileExtension() {
        return fileExtension;
    }

    public void setFileExtension(String ext) {
        this.fileExtension = ext;
        applySyntaxHighlighting();
    }

    public String getText() {
        return codeArea.getText();
    }

    public void setText(String text) {
        suppressEvents = true;
        codeArea.replaceText(text);
        suppressEvents = false;
    }

    public void setOnContentChange(Consumer<String> handler) {
        this.onContentChange = handler;
    }

    public CodeArea getCodeArea() {
        return codeArea;
    }

    // Undo/Redo
    public void undo() { codeArea.undo(); }
    public void redo() { codeArea.redo(); }

    // Clipboard
    public void cut() { codeArea.cut(); }
    public void copy() { codeArea.copy(); }
    public void paste() { codeArea.paste(); }
    public void selectAll() { codeArea.selectAll(); }

    // Find & Replace
    public void showFindBar() { findReplaceBar.showFind(); }
    public void showFindReplaceBar() { findReplaceBar.showFindReplace(); }

    // Go to Line
    public void goToLine(int line) {
        if (line < 1) line = 1;
        int totalLines = codeArea.getParagraphs().size();
        if (line > totalLines) line = totalLines;
        codeArea.moveTo(line - 1, 0);
        codeArea.requestFollowCaret();
        codeArea.requestFocus();
    }

    // Statistics
    public int getCaretLine() { return codeArea.getCurrentParagraph() + 1; }
    public int getCaretColumn() { return codeArea.getCaretColumn() + 1; }
    public int getTotalLines() { return codeArea.getParagraphs().size(); }

    public void applySettings(EditorSettings settings) {
        codeArea.setStyle(String.format(
                "-fx-font-family: \"%s\"; -fx-font-size: %dpx;",
                settings.fontFamily, settings.fontSize));
        codeArea.setWrapText(settings.wordWrap);
        if (settings.editorPadding > 0) {
            codeArea.setPadding(new javafx.geometry.Insets(settings.editorPadding));
        }
    }

    public void setDarkMode(boolean isDark) {
        minimap.setDarkMode(isDark);
    }

    public void toggleMinimap() {
        if (getRight() == minimap) {
            setRight(null);
        } else {
            setRight(minimap);
        }
    }

    public boolean isMinimapVisible() {
        return getRight() == minimap;
    }
}
