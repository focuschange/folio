package com.folio.editor;

import org.fxmisc.richtext.CodeArea;

import java.util.ArrayList;
import java.util.List;

/**
 * Simplified multi-cursor editing support.
 * Implements "Select Next Occurrence" (Cmd+D) functionality:
 * finds the next occurrence of selected text and adds it to the selection list.
 */
public class MultiCursorHandler {

    private final CodeArea codeArea;
    private final List<int[]> selections = new ArrayList<>(); // [start, end] pairs
    private String searchText = "";

    public MultiCursorHandler(CodeArea codeArea) {
        this.codeArea = codeArea;
    }

    /**
     * Select the next occurrence of the currently selected text (Cmd+D behavior).
     * If nothing is selected, select the current word first.
     */
    public void selectNextOccurrence() {
        String selectedText = codeArea.getSelectedText();

        if (selectedText.isEmpty()) {
            // Select the current word
            selectCurrentWord();
            selectedText = codeArea.getSelectedText();
            if (selectedText.isEmpty()) return;

            searchText = selectedText;
            selections.clear();
            selections.add(new int[]{codeArea.getSelection().getStart(), codeArea.getSelection().getEnd()});
            return;
        }

        // If the search text changed, reset
        if (!selectedText.equals(searchText)) {
            searchText = selectedText;
            selections.clear();
            selections.add(new int[]{codeArea.getSelection().getStart(), codeArea.getSelection().getEnd()});
        }

        // Find next occurrence after the last selection
        String text = codeArea.getText();
        int searchFrom = 0;
        if (!selections.isEmpty()) {
            searchFrom = selections.get(selections.size() - 1)[1];
        }

        int nextIndex = text.indexOf(searchText, searchFrom);
        if (nextIndex < 0) {
            // Wrap around to beginning
            nextIndex = text.indexOf(searchText, 0);
        }

        if (nextIndex >= 0) {
            // Check if we already have this selection
            int finalNextIndex = nextIndex;
            boolean alreadySelected = selections.stream()
                    .anyMatch(s -> s[0] == finalNextIndex);

            if (!alreadySelected) {
                int[] newSelection = new int[]{nextIndex, nextIndex + searchText.length()};
                selections.add(newSelection);

                // Select the new occurrence (RichTextFX single selection)
                // We select the latest one found
                codeArea.selectRange(newSelection[0], newSelection[1]);
                codeArea.requestFollowCaret();
            }
        }
    }

    /**
     * Select all occurrences of the current selection.
     */
    public void selectAllOccurrences() {
        String selectedText = codeArea.getSelectedText();
        if (selectedText.isEmpty()) {
            selectCurrentWord();
            selectedText = codeArea.getSelectedText();
            if (selectedText.isEmpty()) return;
        }

        searchText = selectedText;
        selections.clear();

        String text = codeArea.getText();
        int index = 0;
        while ((index = text.indexOf(searchText, index)) >= 0) {
            selections.add(new int[]{index, index + searchText.length()});
            index += searchText.length();
        }

        // Select the last occurrence for visibility
        if (!selections.isEmpty()) {
            int[] last = selections.get(selections.size() - 1);
            codeArea.selectRange(last[0], last[1]);
        }
    }

    /**
     * Replace all selected occurrences with the given replacement text.
     */
    public void replaceAllSelections(String replacement) {
        if (selections.isEmpty() || searchText.isEmpty()) return;

        // Replace from end to start to preserve positions
        for (int i = selections.size() - 1; i >= 0; i--) {
            int[] sel = selections.get(i);
            codeArea.replaceText(sel[0], sel[1], replacement);
        }

        selections.clear();
        searchText = "";
    }

    /**
     * Clear all additional selections.
     */
    public void clearSelections() {
        selections.clear();
        searchText = "";
    }

    /**
     * Get the number of current selections.
     */
    public int getSelectionCount() {
        return selections.size();
    }

    /**
     * Get all current selections.
     */
    public List<int[]> getSelections() {
        return new ArrayList<>(selections);
    }

    private void selectCurrentWord() {
        int caretPos = codeArea.getCaretPosition();
        String text = codeArea.getText();

        if (text.isEmpty()) return;

        int start = caretPos;
        int end = caretPos;

        // Find word boundaries
        while (start > 0 && isWordChar(text.charAt(start - 1))) {
            start--;
        }
        while (end < text.length() && isWordChar(text.charAt(end))) {
            end++;
        }

        if (start < end) {
            codeArea.selectRange(start, end);
        }
    }

    private boolean isWordChar(char c) {
        return Character.isLetterOrDigit(c) || c == '_';
    }
}
