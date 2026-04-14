package com.folio.editor;

import com.folio.model.EditorDocument;
import javafx.animation.PauseTransition;
import javafx.scene.input.KeyCode;
import javafx.scene.input.KeyEvent;
import javafx.scene.layout.BorderPane;
import javafx.util.Duration;
import org.fxmisc.richtext.CodeArea;
import org.fxmisc.richtext.LineNumberFactory;

import java.util.Map;
import java.util.function.Consumer;

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

    public void loadDocument(EditorDocument doc) {
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
