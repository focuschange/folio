package com.folio.editor;

import javafx.scene.control.Tooltip;
import javafx.scene.input.MouseEvent;
import javafx.util.Duration;
import org.fxmisc.richtext.CodeArea;

/**
 * Adds tooltip preview to the Minimap showing ~5 lines of code
 * around the hovered position.
 */
public class MinimapTooltipHandler {

    private static final int PREVIEW_LINES = 5;
    private final Tooltip tooltip;

    public MinimapTooltipHandler() {
        tooltip = new Tooltip();
        tooltip.setStyle(
                "-fx-font-family: 'Menlo', 'Monaco', monospace; "
                + "-fx-font-size: 11px; "
                + "-fx-background-color: #2d2d2d; "
                + "-fx-text-fill: #cccccc; "
                + "-fx-border-color: #555555; "
                + "-fx-border-width: 1; "
                + "-fx-padding: 5;"
        );
        tooltip.setShowDelay(Duration.millis(300));
        tooltip.setHideDelay(Duration.millis(100));
        tooltip.setShowDuration(Duration.seconds(10));
        tooltip.setWrapText(false);
        tooltip.setMaxWidth(500);
    }

    /**
     * Install the tooltip handler on a Minimap pane.
     *
     * @param minimap the minimap Pane
     * @param codeArea the associated CodeArea
     * @param mapHeight a way to get the minimap height
     */
    public void install(javafx.scene.layout.Pane minimap, CodeArea codeArea) {
        minimap.setOnMouseMoved(event -> showPreview(event, minimap, codeArea));
        minimap.setOnMouseExited(event -> tooltip.hide());
    }

    private void showPreview(MouseEvent event, javafx.scene.layout.Pane minimap, CodeArea codeArea) {
        if (codeArea == null) return;

        int totalLines = codeArea.getParagraphs().size();
        if (totalLines == 0) return;

        double canvasHeight = minimap.getHeight();
        if (canvasHeight <= 0) return;

        // Calculate which line the mouse is over
        int hoveredLine = (int) (event.getY() / canvasHeight * totalLines);
        hoveredLine = Math.max(0, Math.min(totalLines - 1, hoveredLine));

        // Get ~5 lines around the hovered position
        int startLine = Math.max(0, hoveredLine - PREVIEW_LINES / 2);
        int endLine = Math.min(totalLines - 1, startLine + PREVIEW_LINES - 1);
        startLine = Math.max(0, endLine - PREVIEW_LINES + 1);

        StringBuilder preview = new StringBuilder();
        for (int i = startLine; i <= endLine; i++) {
            String lineText = codeArea.getParagraph(i).getText();
            // Truncate long lines
            if (lineText.length() > 60) {
                lineText = lineText.substring(0, 60) + "...";
            }
            String lineNum = String.format("%4d", i + 1);
            if (i > startLine) preview.append('\n');
            preview.append(lineNum).append("  ").append(lineText);
        }

        tooltip.setText(preview.toString());

        // Position near the mouse
        double screenX = event.getScreenX() - 320;
        double screenY = event.getScreenY() - 40;

        if (!tooltip.isShowing()) {
            tooltip.show(minimap, screenX, screenY);
        } else {
            tooltip.setAnchorX(screenX);
            tooltip.setAnchorY(screenY);
        }
    }

    /**
     * Uninstall the tooltip handler.
     */
    public void uninstall(javafx.scene.layout.Pane minimap) {
        minimap.setOnMouseMoved(null);
        minimap.setOnMouseExited(null);
        tooltip.hide();
    }
}
