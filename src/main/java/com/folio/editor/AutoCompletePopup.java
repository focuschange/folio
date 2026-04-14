package com.folio.editor;

import javafx.geometry.Bounds;
import javafx.scene.control.ListView;
import javafx.scene.control.ListCell;
import javafx.scene.input.KeyCode;
import javafx.scene.input.KeyEvent;
import javafx.stage.Popup;
import org.fxmisc.richtext.CodeArea;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Word-based autocomplete popup for the code editor.
 * Shows prefix matches from unique words in the current document.
 * Can be triggered with Ctrl+Space or automatically after 3+ characters.
 */
public class AutoCompletePopup {

    private final Popup popup;
    private final ListView<CompletionItem> listView;
    private CodeArea codeArea;
    private SnippetManager snippetManager;
    private String currentPrefix = "";
    private int wordStart = -1;

    private static final int MAX_ITEMS = 15;
    private static final int MIN_AUTO_TRIGGER_LENGTH = 3;

    /**
     * Represents a completion item shown in the popup.
     */
    public static class CompletionItem {
        public final String text;
        public final String label;
        public final boolean isSnippet;

        public CompletionItem(String text, String label, boolean isSnippet) {
            this.text = text;
            this.label = label;
            this.isSnippet = isSnippet;
        }

        @Override
        public String toString() {
            return label;
        }
    }

    public AutoCompletePopup() {
        popup = new Popup();
        popup.setAutoHide(true);

        listView = new ListView<>();
        listView.setPrefWidth(300);
        listView.setPrefHeight(200);
        listView.getStyleClass().add("autocomplete-list");

        listView.setCellFactory(lv -> new ListCell<>() {
            @Override
            protected void updateItem(CompletionItem item, boolean empty) {
                super.updateItem(item, empty);
                if (empty || item == null) {
                    setText(null);
                    setStyle("");
                } else {
                    setText(item.label);
                    if (item.isSnippet) {
                        setStyle("-fx-text-fill: #e5c07b;");
                    } else {
                        setStyle("");
                    }
                }
            }
        });

        listView.setOnMouseClicked(event -> {
            if (event.getClickCount() == 2) {
                applySelectedCompletion();
            }
        });

        listView.setOnKeyPressed(this::handleListKeyPress);

        popup.getContent().add(listView);
    }

    public void setCodeArea(CodeArea codeArea) {
        this.codeArea = codeArea;
    }

    public void setSnippetManager(SnippetManager snippetManager) {
        this.snippetManager = snippetManager;
    }

    /**
     * Trigger autocomplete at the current caret position.
     * Called by Ctrl+Space or automatically after typing 3+ chars.
     */
    public void trigger() {
        if (codeArea == null) return;

        int caretPos = codeArea.getCaretPosition();
        String text = codeArea.getText();

        // Find the word prefix before the caret
        wordStart = caretPos;
        while (wordStart > 0 && isWordChar(text.charAt(wordStart - 1))) {
            wordStart--;
        }

        if (wordStart >= caretPos) {
            hide();
            return;
        }

        currentPrefix = text.substring(wordStart, caretPos);
        if (currentPrefix.isEmpty()) {
            hide();
            return;
        }

        List<CompletionItem> items = collectCompletions(text, currentPrefix);
        if (items.isEmpty()) {
            hide();
            return;
        }

        showPopup(items);
    }

    /**
     * Try auto-triggering based on current word length.
     */
    public void autoTrigger() {
        if (codeArea == null) return;

        int caretPos = codeArea.getCaretPosition();
        String text = codeArea.getText();

        int start = caretPos;
        while (start > 0 && isWordChar(text.charAt(start - 1))) {
            start--;
        }

        if (caretPos - start >= MIN_AUTO_TRIGGER_LENGTH) {
            trigger();
        } else {
            hide();
        }
    }

    /**
     * Collect completion items from document words and snippets.
     */
    private List<CompletionItem> collectCompletions(String text, String prefix) {
        List<CompletionItem> items = new ArrayList<>();
        String lowerPrefix = prefix.toLowerCase();

        // Collect unique words from document
        Set<String> words = new TreeSet<>();
        StringBuilder wordBuf = new StringBuilder();
        for (int i = 0; i < text.length(); i++) {
            char c = text.charAt(i);
            if (isWordChar(c)) {
                wordBuf.append(c);
            } else {
                if (wordBuf.length() > 0) {
                    String word = wordBuf.toString();
                    if (word.toLowerCase().startsWith(lowerPrefix) && !word.equals(prefix) && word.length() > 1) {
                        words.add(word);
                    }
                    wordBuf.setLength(0);
                }
            }
        }
        // Handle last word
        if (wordBuf.length() > 0) {
            String word = wordBuf.toString();
            if (word.toLowerCase().startsWith(lowerPrefix) && !word.equals(prefix) && word.length() > 1) {
                words.add(word);
            }
        }

        // Add word completions
        for (String word : words) {
            items.add(new CompletionItem(word, word, false));
            if (items.size() >= MAX_ITEMS) break;
        }

        // Add snippet completions
        if (snippetManager != null) {
            List<SnippetManager.Snippet> snippets = snippetManager.getMatchingSnippets(prefix);
            for (SnippetManager.Snippet snippet : snippets) {
                String label = snippet.prefix() + "  [snippet] " + snippet.description();
                items.add(new CompletionItem(snippet.body(), label, true));
                if (items.size() >= MAX_ITEMS) break;
            }
        }

        return items;
    }

    private void showPopup(List<CompletionItem> items) {
        listView.getItems().setAll(items);
        listView.getSelectionModel().selectFirst();

        if (!popup.isShowing()) {
            Optional<Bounds> caretBounds = codeArea.getCaretBounds();
            if (caretBounds.isPresent()) {
                Bounds bounds = caretBounds.get();
                popup.show(codeArea.getScene().getWindow(),
                        bounds.getMinX(),
                        bounds.getMaxY() + 2);
            }
        }
    }

    public void hide() {
        popup.hide();
        currentPrefix = "";
        wordStart = -1;
    }

    public boolean isShowing() {
        return popup.isShowing();
    }

    /**
     * Apply the currently selected completion.
     */
    public void applySelectedCompletion() {
        CompletionItem selected = listView.getSelectionModel().getSelectedItem();
        if (selected == null || codeArea == null || wordStart < 0) {
            hide();
            return;
        }

        int caretPos = codeArea.getCaretPosition();
        codeArea.replaceText(wordStart, caretPos, selected.text);
        hide();
    }

    private void handleListKeyPress(KeyEvent event) {
        if (event.getCode() == KeyCode.ENTER || event.getCode() == KeyCode.TAB) {
            applySelectedCompletion();
            event.consume();
        } else if (event.getCode() == KeyCode.ESCAPE) {
            hide();
            event.consume();
        }
    }

    /**
     * Handle key events forwarded from the editor.
     * Returns true if the event was consumed.
     */
    public boolean handleKeyEvent(KeyEvent event) {
        if (!popup.isShowing()) return false;

        if (event.getCode() == KeyCode.UP) {
            int idx = listView.getSelectionModel().getSelectedIndex();
            if (idx > 0) {
                listView.getSelectionModel().select(idx - 1);
                listView.scrollTo(idx - 1);
            }
            return true;
        } else if (event.getCode() == KeyCode.DOWN) {
            int idx = listView.getSelectionModel().getSelectedIndex();
            if (idx < listView.getItems().size() - 1) {
                listView.getSelectionModel().select(idx + 1);
                listView.scrollTo(idx + 1);
            }
            return true;
        } else if (event.getCode() == KeyCode.ENTER || event.getCode() == KeyCode.TAB) {
            applySelectedCompletion();
            return true;
        } else if (event.getCode() == KeyCode.ESCAPE) {
            hide();
            return true;
        }

        return false;
    }

    private boolean isWordChar(char c) {
        return Character.isLetterOrDigit(c) || c == '_' || c == '$';
    }
}
