package com.folio.editor;

import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.control.*;
import javafx.scene.input.KeyCode;
import javafx.scene.layout.HBox;
import javafx.scene.layout.Priority;
import javafx.scene.layout.VBox;
import org.fxmisc.richtext.CodeArea;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.regex.PatternSyntaxException;

public class FindReplaceBar extends VBox {

    private final TextField searchField;
    private final TextField replaceField;
    private final Label matchCountLabel;
    private final HBox replaceRow;
    private final CheckBox caseSensitiveBox;
    private final CheckBox regexBox;
    private final CheckBox wholeWordBox;

    private CodeArea codeArea;
    private final List<int[]> matches = new ArrayList<>();
    private int currentMatchIndex = -1;

    public FindReplaceBar() {
        getStyleClass().add("find-bar");
        setSpacing(4);
        setPadding(new Insets(6, 10, 6, 10));

        // Search row
        searchField = new TextField();
        searchField.setPromptText("Search...");
        searchField.getStyleClass().add("find-field");
        HBox.setHgrow(searchField, Priority.ALWAYS);

        caseSensitiveBox = new CheckBox("Aa");
        caseSensitiveBox.setTooltip(new Tooltip("Case Sensitive"));
        caseSensitiveBox.getStyleClass().add("find-option");

        wholeWordBox = new CheckBox("W");
        wholeWordBox.setTooltip(new Tooltip("Whole Word"));
        wholeWordBox.getStyleClass().add("find-option");

        regexBox = new CheckBox(".*");
        regexBox.setTooltip(new Tooltip("Regular Expression"));
        regexBox.getStyleClass().add("find-option");

        matchCountLabel = new Label("");
        matchCountLabel.getStyleClass().add("match-count");
        matchCountLabel.setMinWidth(70);
        matchCountLabel.setAlignment(Pos.CENTER);

        Button prevBtn = new Button("\u25B2");
        prevBtn.setTooltip(new Tooltip("Previous Match (Shift+Enter)"));
        prevBtn.getStyleClass().add("find-nav-btn");
        prevBtn.setOnAction(e -> findPrevious());

        Button nextBtn = new Button("\u25BC");
        nextBtn.setTooltip(new Tooltip("Next Match (Enter)"));
        nextBtn.getStyleClass().add("find-nav-btn");
        nextBtn.setOnAction(e -> findNext());

        Button closeBtn = new Button("\u2715");
        closeBtn.setTooltip(new Tooltip("Close (Esc)"));
        closeBtn.getStyleClass().add("find-close-btn");
        closeBtn.setOnAction(e -> hide());

        HBox searchRow = new HBox(6, searchField, caseSensitiveBox, wholeWordBox, regexBox,
                matchCountLabel, prevBtn, nextBtn, closeBtn);
        searchRow.setAlignment(Pos.CENTER_LEFT);

        // Replace row
        replaceField = new TextField();
        replaceField.setPromptText("Replace...");
        replaceField.getStyleClass().add("find-field");
        HBox.setHgrow(replaceField, Priority.ALWAYS);

        Button replaceBtn = new Button("Replace");
        replaceBtn.getStyleClass().add("find-action-btn");
        replaceBtn.setOnAction(e -> replaceCurrent());

        Button replaceAllBtn = new Button("Replace All");
        replaceAllBtn.getStyleClass().add("find-action-btn");
        replaceAllBtn.setOnAction(e -> replaceAll());

        replaceRow = new HBox(6, replaceField, replaceBtn, replaceAllBtn);
        replaceRow.setAlignment(Pos.CENTER_LEFT);

        getChildren().addAll(searchRow);

        // Wire events
        searchField.textProperty().addListener((obs, o, n) -> performSearch());
        caseSensitiveBox.selectedProperty().addListener((obs, o, n) -> performSearch());
        regexBox.selectedProperty().addListener((obs, o, n) -> performSearch());
        wholeWordBox.selectedProperty().addListener((obs, o, n) -> performSearch());

        searchField.setOnKeyPressed(event -> {
            if (event.getCode() == KeyCode.ENTER) {
                if (event.isShiftDown()) findPrevious();
                else findNext();
                event.consume();
            } else if (event.getCode() == KeyCode.ESCAPE) {
                hide();
                event.consume();
            }
        });

        replaceField.setOnKeyPressed(event -> {
            if (event.getCode() == KeyCode.ENTER) {
                replaceCurrent();
                event.consume();
            } else if (event.getCode() == KeyCode.ESCAPE) {
                hide();
                event.consume();
            }
        });

        setVisible(false);
        setManaged(false);
    }

    public void setCodeArea(CodeArea codeArea) {
        this.codeArea = codeArea;
    }

    public void showFind() {
        replaceRow.setVisible(false);
        replaceRow.setManaged(false);
        if (!getChildren().contains(replaceRow)) {
            // already removed or not added
        }
        getChildren().remove(replaceRow);
        setVisible(true);
        setManaged(true);
        searchField.requestFocus();

        // Pre-fill with selected text
        String selected = codeArea != null ? codeArea.getSelectedText() : "";
        if (!selected.isEmpty() && !selected.contains("\n")) {
            searchField.setText(selected);
        }
        searchField.selectAll();
        performSearch();
    }

    public void showFindReplace() {
        if (!getChildren().contains(replaceRow)) {
            getChildren().add(replaceRow);
        }
        replaceRow.setVisible(true);
        replaceRow.setManaged(true);
        setVisible(true);
        setManaged(true);
        searchField.requestFocus();

        String selected = codeArea != null ? codeArea.getSelectedText() : "";
        if (!selected.isEmpty() && !selected.contains("\n")) {
            searchField.setText(selected);
        }
        searchField.selectAll();
        performSearch();
    }

    public void hide() {
        setVisible(false);
        setManaged(false);
        clearHighlights();
        matches.clear();
        currentMatchIndex = -1;
        matchCountLabel.setText("");
        if (codeArea != null) {
            codeArea.requestFocus();
        }
    }

    private void performSearch() {
        matches.clear();
        currentMatchIndex = -1;
        clearHighlights();

        if (codeArea == null) return;
        String query = searchField.getText();
        if (query.isEmpty()) {
            matchCountLabel.setText("");
            return;
        }

        String text = codeArea.getText();
        try {
            Pattern pattern = buildPattern(query);
            Matcher matcher = pattern.matcher(text);
            while (matcher.find()) {
                matches.add(new int[]{matcher.start(), matcher.end()});
            }
        } catch (PatternSyntaxException e) {
            matchCountLabel.setText("Invalid");
            matchCountLabel.setStyle("-fx-text-fill: #f44;");
            return;
        }

        matchCountLabel.setStyle("");
        if (matches.isEmpty()) {
            matchCountLabel.setText("No results");
        } else {
            // Find the match nearest to the caret
            int caretPos = codeArea.getCaretPosition();
            currentMatchIndex = 0;
            for (int i = 0; i < matches.size(); i++) {
                if (matches.get(i)[0] >= caretPos) {
                    currentMatchIndex = i;
                    break;
                }
            }
            updateMatchLabel();
            highlightCurrentMatch();
        }
    }

    private void findNext() {
        if (matches.isEmpty()) return;
        currentMatchIndex = (currentMatchIndex + 1) % matches.size();
        updateMatchLabel();
        highlightCurrentMatch();
    }

    private void findPrevious() {
        if (matches.isEmpty()) return;
        currentMatchIndex = (currentMatchIndex - 1 + matches.size()) % matches.size();
        updateMatchLabel();
        highlightCurrentMatch();
    }

    private void replaceCurrent() {
        if (matches.isEmpty() || codeArea == null || currentMatchIndex < 0) return;

        int[] match = matches.get(currentMatchIndex);
        String replacement = replaceField.getText();

        codeArea.replaceText(match[0], match[1], replacement);

        // Re-search after replacement
        performSearch();
    }

    private void replaceAll() {
        if (matches.isEmpty() || codeArea == null) return;

        String replacement = replaceField.getText();
        // Replace from end to start to preserve positions
        for (int i = matches.size() - 1; i >= 0; i--) {
            int[] match = matches.get(i);
            codeArea.replaceText(match[0], match[1], replacement);
        }

        performSearch();
    }

    private void highlightCurrentMatch() {
        if (codeArea == null || matches.isEmpty() || currentMatchIndex < 0) return;
        int[] match = matches.get(currentMatchIndex);
        codeArea.selectRange(match[0], match[1]);
        codeArea.requestFollowCaret();
    }

    private void clearHighlights() {
        // Deselect
        if (codeArea != null) {
            codeArea.deselect();
        }
    }

    private void updateMatchLabel() {
        if (matches.isEmpty()) {
            matchCountLabel.setText("No results");
        } else {
            matchCountLabel.setText((currentMatchIndex + 1) + "/" + matches.size());
        }
    }

    private Pattern buildPattern(String query) {
        int flags = regexBox.isSelected() ? 0 : Pattern.LITERAL;
        if (!caseSensitiveBox.isSelected()) {
            flags |= Pattern.CASE_INSENSITIVE;
        }

        if (wholeWordBox.isSelected() && !regexBox.isSelected()) {
            return Pattern.compile("\\b" + Pattern.quote(query) + "\\b",
                    flags & ~Pattern.LITERAL);
        }

        return Pattern.compile(query, flags);
    }
}
