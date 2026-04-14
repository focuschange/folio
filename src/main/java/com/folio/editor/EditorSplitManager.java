package com.folio.editor;

import com.folio.model.EditorDocument;
import javafx.geometry.Orientation;
import javafx.scene.Node;
import javafx.scene.control.SplitPane;

/**
 * Manages editor split view functionality.
 * Allows splitting the editor horizontally (right) or vertically (down)
 * with two EditorPane instances sharing the same document content.
 */
public class EditorSplitManager {

    /**
     * Result of a split operation, containing the SplitPane and both editor panes.
     */
    public static class SplitResult {
        public final SplitPane splitPane;
        public final EditorPane primaryEditor;
        public final EditorPane secondaryEditor;

        public SplitResult(SplitPane splitPane, EditorPane primaryEditor, EditorPane secondaryEditor) {
            this.splitPane = splitPane;
            this.primaryEditor = primaryEditor;
            this.secondaryEditor = secondaryEditor;
        }
    }

    /**
     * Create a split view with the given editor as the primary pane.
     *
     * @param primaryEditor the existing editor pane
     * @param doc the document to share
     * @param horizontal true for split right, false for split down
     * @return SplitResult containing the split pane and both editors
     */
    public static SplitResult createSplit(EditorPane primaryEditor, EditorDocument doc, boolean horizontal) {
        EditorPane secondaryEditor = new EditorPane();

        // Load the same document content
        secondaryEditor.setText(doc.getContent());
        secondaryEditor.setFileExtension(primaryEditor.getFileExtension());

        // Sync content changes between editors
        primaryEditor.setOnContentChange(text -> {
            if (!secondaryEditor.getText().equals(text)) {
                secondaryEditor.setText(text);
            }
            doc.setContent(text);
        });

        secondaryEditor.setOnContentChange(text -> {
            if (!primaryEditor.getText().equals(text)) {
                primaryEditor.setText(text);
            }
            doc.setContent(text);
        });

        SplitPane splitPane = new SplitPane();
        splitPane.setOrientation(horizontal ? Orientation.HORIZONTAL : Orientation.VERTICAL);
        splitPane.getItems().addAll(primaryEditor, secondaryEditor);
        splitPane.setDividerPositions(0.5);

        return new SplitResult(splitPane, primaryEditor, secondaryEditor);
    }

    /**
     * Check if a node is already in a split view.
     */
    public static boolean isSplit(Node content) {
        return content instanceof SplitPane sp && sp.getItems().size() > 1
                && sp.getItems().stream().anyMatch(n -> n instanceof EditorPane);
    }

    /**
     * Remove the split view and return just the primary editor.
     */
    public static EditorPane unsplit(SplitPane splitPane) {
        if (splitPane.getItems().isEmpty()) return null;

        Node first = splitPane.getItems().get(0);
        if (first instanceof EditorPane ep) {
            return ep;
        }
        return null;
    }
}
