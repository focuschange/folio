package com.folio.editor;

import javafx.geometry.Insets;
import javafx.scene.canvas.Canvas;
import javafx.scene.canvas.GraphicsContext;
import javafx.scene.layout.Pane;
import javafx.scene.paint.Color;
import org.fxmisc.richtext.CodeArea;

public class Minimap extends Pane {

    private static final double CHAR_WIDTH = 1.2;
    private static final double LINE_HEIGHT = 2.5;
    private static final double MAP_WIDTH = 80;

    private final Canvas canvas;
    private CodeArea codeArea;
    private boolean isDark = true;

    public Minimap() {
        setPrefWidth(MAP_WIDTH);
        setMinWidth(MAP_WIDTH);
        setMaxWidth(MAP_WIDTH);
        getStyleClass().add("minimap");

        canvas = new Canvas(MAP_WIDTH, 600);
        getChildren().add(canvas);

        setOnMouseClicked(event -> {
            if (codeArea == null) return;
            double clickY = event.getY();
            double totalLines = codeArea.getParagraphs().size();
            double canvasHeight = canvas.getHeight();
            if (canvasHeight <= 0 || totalLines <= 0) return;

            int targetLine = (int) (clickY / canvasHeight * totalLines);
            targetLine = Math.max(0, Math.min((int) totalLines - 1, targetLine));
            codeArea.moveTo(targetLine, 0);
            codeArea.requestFollowCaret();
        });

        setOnMouseDragged(event -> {
            if (codeArea == null) return;
            double clickY = Math.max(0, Math.min(event.getY(), canvas.getHeight()));
            double totalLines = codeArea.getParagraphs().size();
            if (canvas.getHeight() <= 0 || totalLines <= 0) return;

            int targetLine = (int) (clickY / canvas.getHeight() * totalLines);
            targetLine = Math.max(0, Math.min((int) totalLines - 1, targetLine));
            codeArea.moveTo(targetLine, 0);
            codeArea.requestFollowCaret();
        });
    }

    public void setCodeArea(CodeArea codeArea) {
        this.codeArea = codeArea;
        codeArea.textProperty().addListener((obs, o, n) -> render());
        codeArea.estimatedScrollYProperty().addListener((obs, o, n) -> render());
        heightProperty().addListener((obs, o, n) -> {
            canvas.setHeight(n.doubleValue());
            render();
        });
        render();
    }

    public void setDarkMode(boolean dark) {
        this.isDark = dark;
        render();
    }

    public void render() {
        if (codeArea == null) return;

        double w = canvas.getWidth();
        double h = canvas.getHeight();
        GraphicsContext gc = canvas.getGraphicsContext2D();

        // Background
        gc.setFill(isDark ? Color.web("#1a1a1a") : Color.web("#f0f0f0"));
        gc.fillRect(0, 0, w, h);

        var paragraphs = codeArea.getParagraphs();
        int totalLines = paragraphs.size();
        if (totalLines == 0) return;

        double lineH = Math.min(LINE_HEIGHT, h / totalLines);

        // Draw code lines
        Color textColor = isDark ? Color.web("#808080", 0.6) : Color.web("#666666", 0.5);
        Color keywordColor = isDark ? Color.web("#c586c0", 0.5) : Color.web("#af00db", 0.4);
        Color commentColor = isDark ? Color.web("#6a9955", 0.4) : Color.web("#008000", 0.3);

        for (int i = 0; i < totalLines; i++) {
            String line = paragraphs.get(i).getText();
            double y = i * lineH;
            if (y > h) break;

            String trimmed = line.trim();
            if (trimmed.startsWith("//") || trimmed.startsWith("#") || trimmed.startsWith("--")) {
                gc.setFill(commentColor);
            } else if (trimmed.startsWith("import ") || trimmed.startsWith("public ")
                    || trimmed.startsWith("private ") || trimmed.startsWith("class ")
                    || trimmed.startsWith("def ") || trimmed.startsWith("function ")) {
                gc.setFill(keywordColor);
            } else {
                gc.setFill(textColor);
            }

            int leadingSpaces = line.length() - line.stripLeading().length();
            double xOffset = leadingSpaces * CHAR_WIDTH;
            double lineWidth = Math.min(line.stripTrailing().length() * CHAR_WIDTH, w - xOffset);
            if (lineWidth > 0) {
                gc.fillRect(xOffset, y, lineWidth, Math.max(1, lineH - 0.5));
            }
        }

        // Draw viewport indicator
        double totalHeight = codeArea.getTotalHeightEstimate();
        double viewHeight = codeArea.getHeight();
        double scrollY = codeArea.getEstimatedScrollY();

        if (totalHeight > viewHeight && totalHeight > 0) {
            double viewportTop = (scrollY / totalHeight) * h;
            double viewportHeight = (viewHeight / totalHeight) * h;
            viewportHeight = Math.max(viewportHeight, 20);

            gc.setFill(isDark ? Color.web("#ffffff", 0.08) : Color.web("#000000", 0.06));
            gc.fillRect(0, viewportTop, w, viewportHeight);

            gc.setStroke(isDark ? Color.web("#ffffff", 0.15) : Color.web("#000000", 0.1));
            gc.setLineWidth(1);
            gc.strokeRect(0.5, viewportTop + 0.5, w - 1, viewportHeight - 1);
        }
    }
}
