package com.folio.editor;

import javafx.geometry.Insets;
import javafx.scene.Scene;
import javafx.scene.control.*;
import javafx.scene.layout.*;
import javafx.scene.paint.Color;
import javafx.scene.text.Text;
import javafx.scene.text.TextFlow;
import javafx.stage.FileChooser;
import javafx.stage.Stage;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

/**
 * Two-panel side-by-side file comparison viewer.
 * Uses a simple line-by-line diff algorithm (no external library).
 * Highlights added (green), removed (red), and unchanged lines.
 */
public class DiffViewer extends Stage {

    private final VBox leftPanel;
    private final VBox rightPanel;
    private final ScrollPane leftScroll;
    private final ScrollPane rightScroll;
    private final Label leftFileLabel;
    private final Label rightFileLabel;

    private boolean isDark = true;

    public DiffViewer() {
        setTitle("Compare Files");

        leftFileLabel = new Label("(No file selected)");
        leftFileLabel.setStyle("-fx-font-weight: bold; -fx-padding: 5;");
        rightFileLabel = new Label("(No file selected)");
        rightFileLabel.setStyle("-fx-font-weight: bold; -fx-padding: 5;");

        leftPanel = new VBox();
        leftPanel.setPadding(new Insets(5));
        leftPanel.setSpacing(0);

        rightPanel = new VBox();
        rightPanel.setPadding(new Insets(5));
        rightPanel.setSpacing(0);

        leftScroll = new ScrollPane(leftPanel);
        leftScroll.setFitToWidth(true);
        leftScroll.setHbarPolicy(ScrollPane.ScrollBarPolicy.AS_NEEDED);
        leftScroll.setVbarPolicy(ScrollPane.ScrollBarPolicy.ALWAYS);

        rightScroll = new ScrollPane(rightPanel);
        rightScroll.setFitToWidth(true);
        rightScroll.setHbarPolicy(ScrollPane.ScrollBarPolicy.AS_NEEDED);
        rightScroll.setVbarPolicy(ScrollPane.ScrollBarPolicy.ALWAYS);

        // Sync scrolling
        leftScroll.vvalueProperty().addListener((obs, o, n) -> rightScroll.setVvalue(n.doubleValue()));
        rightScroll.vvalueProperty().addListener((obs, o, n) -> leftScroll.setVvalue(n.doubleValue()));

        // File chooser buttons
        Button leftBtn = new Button("Choose File...");
        leftBtn.setOnAction(e -> chooseLeftFile());
        Button rightBtn = new Button("Choose File...");
        rightBtn.setOnAction(e -> chooseRightFile());

        HBox leftHeader = new HBox(10, leftFileLabel, leftBtn);
        leftHeader.setPadding(new Insets(5));
        leftHeader.setAlignment(javafx.geometry.Pos.CENTER_LEFT);

        HBox rightHeader = new HBox(10, rightFileLabel, rightBtn);
        rightHeader.setPadding(new Insets(5));
        rightHeader.setAlignment(javafx.geometry.Pos.CENTER_LEFT);

        VBox leftContainer = new VBox(leftHeader, leftScroll);
        VBox.setVgrow(leftScroll, Priority.ALWAYS);

        VBox rightContainer = new VBox(rightHeader, rightScroll);
        VBox.setVgrow(rightScroll, Priority.ALWAYS);

        SplitPane splitPane = new SplitPane(leftContainer, rightContainer);
        splitPane.setDividerPositions(0.5);

        Scene scene = new Scene(splitPane, 1000, 600);
        setScene(scene);
    }

    private Path leftFilePath;
    private Path rightFilePath;

    private void chooseLeftFile() {
        FileChooser fc = new FileChooser();
        fc.setTitle("Choose Left File");
        java.io.File file = fc.showOpenDialog(this);
        if (file != null) {
            leftFilePath = file.toPath();
            leftFileLabel.setText(leftFilePath.getFileName().toString());
            if (rightFilePath != null) {
                performDiff();
            }
        }
    }

    private void chooseRightFile() {
        FileChooser fc = new FileChooser();
        fc.setTitle("Choose Right File");
        java.io.File file = fc.showOpenDialog(this);
        if (file != null) {
            rightFilePath = file.toPath();
            rightFileLabel.setText(rightFilePath.getFileName().toString());
            if (leftFilePath != null) {
                performDiff();
            }
        }
    }

    /**
     * Compare two files and display the diff.
     */
    public void compare(Path file1, Path file2) {
        leftFilePath = file1;
        rightFilePath = file2;
        leftFileLabel.setText(file1.getFileName().toString());
        rightFileLabel.setText(file2.getFileName().toString());
        performDiff();
    }

    /**
     * Compare two strings and display the diff.
     */
    public void compare(String text1, String text2, String label1, String label2) {
        leftFileLabel.setText(label1);
        rightFileLabel.setText(label2);

        String[] lines1 = text1.split("\n", -1);
        String[] lines2 = text2.split("\n", -1);

        displayDiff(lines1, lines2);
    }

    private void performDiff() {
        try {
            String[] lines1 = Files.readString(leftFilePath).split("\n", -1);
            String[] lines2 = Files.readString(rightFilePath).split("\n", -1);
            displayDiff(lines1, lines2);
        } catch (IOException e) {
            leftPanel.getChildren().clear();
            leftPanel.getChildren().add(new Label("Error reading file: " + e.getMessage()));
        }
    }

    private void displayDiff(String[] lines1, String[] lines2) {
        leftPanel.getChildren().clear();
        rightPanel.getChildren().clear();

        List<DiffLine> diff = computeDiff(lines1, lines2);

        int leftLineNum = 0;
        int rightLineNum = 0;

        for (DiffLine dl : diff) {
            switch (dl.type) {
                case EQUAL:
                    leftLineNum++;
                    rightLineNum++;
                    addLine(leftPanel, leftLineNum, dl.text, LineType.NORMAL);
                    addLine(rightPanel, rightLineNum, dl.text, LineType.NORMAL);
                    break;
                case REMOVED:
                    leftLineNum++;
                    addLine(leftPanel, leftLineNum, dl.text, LineType.REMOVED);
                    addLine(rightPanel, -1, "", LineType.EMPTY);
                    break;
                case ADDED:
                    rightLineNum++;
                    addLine(leftPanel, -1, "", LineType.EMPTY);
                    addLine(rightPanel, rightLineNum, dl.text, LineType.ADDED);
                    break;
            }
        }
    }

    private enum LineType { NORMAL, ADDED, REMOVED, EMPTY }

    private void addLine(VBox panel, int lineNum, String text, LineType type) {
        String lineNumStr = lineNum > 0 ? String.format("%4d", lineNum) : "    ";
        Label lineLabel = new Label(lineNumStr + "  " + text);
        lineLabel.setStyle("-fx-font-family: 'Menlo', 'Monaco', monospace; -fx-font-size: 13px; -fx-padding: 1 5 1 5;");
        lineLabel.setMaxWidth(Double.MAX_VALUE);

        String bgColor;
        String fgColor = isDark ? "#e0e0e0" : "#24292e";

        switch (type) {
            case ADDED:
                bgColor = isDark ? "#1a3d1a" : "#e6ffec";
                fgColor = isDark ? "#7ee77e" : "#22863a";
                break;
            case REMOVED:
                bgColor = isDark ? "#3d1a1a" : "#ffeef0";
                fgColor = isDark ? "#ee7777" : "#cb2431";
                break;
            case EMPTY:
                bgColor = isDark ? "#252525" : "#fafbfc";
                fgColor = isDark ? "#555555" : "#999999";
                break;
            default:
                bgColor = isDark ? "#1e1e1e" : "#ffffff";
                break;
        }

        lineLabel.setStyle(lineLabel.getStyle()
                + " -fx-background-color: " + bgColor + ";"
                + " -fx-text-fill: " + fgColor + ";");

        panel.getChildren().add(lineLabel);
    }

    public void setDarkMode(boolean dark) {
        this.isDark = dark;
    }

    // --- Simple LCS-based diff algorithm ---

    private enum DiffType { EQUAL, ADDED, REMOVED }

    private static class DiffLine {
        final DiffType type;
        final String text;

        DiffLine(DiffType type, String text) {
            this.type = type;
            this.text = text;
        }
    }

    /**
     * Compute line-by-line diff using Longest Common Subsequence.
     */
    private static List<DiffLine> computeDiff(String[] lines1, String[] lines2) {
        int m = lines1.length;
        int n = lines2.length;

        // Compute LCS table
        int[][] lcs = new int[m + 1][n + 1];
        for (int i = 1; i <= m; i++) {
            for (int j = 1; j <= n; j++) {
                if (lines1[i - 1].equals(lines2[j - 1])) {
                    lcs[i][j] = lcs[i - 1][j - 1] + 1;
                } else {
                    lcs[i][j] = Math.max(lcs[i - 1][j], lcs[i][j - 1]);
                }
            }
        }

        // Backtrack to build diff
        List<DiffLine> result = new ArrayList<>();
        int i = m, j = n;
        List<DiffLine> stack = new ArrayList<>();

        while (i > 0 || j > 0) {
            if (i > 0 && j > 0 && lines1[i - 1].equals(lines2[j - 1])) {
                stack.add(new DiffLine(DiffType.EQUAL, lines1[i - 1]));
                i--;
                j--;
            } else if (j > 0 && (i == 0 || lcs[i][j - 1] >= lcs[i - 1][j])) {
                stack.add(new DiffLine(DiffType.ADDED, lines2[j - 1]));
                j--;
            } else if (i > 0) {
                stack.add(new DiffLine(DiffType.REMOVED, lines1[i - 1]));
                i--;
            }
        }

        // Reverse the stack
        for (int k = stack.size() - 1; k >= 0; k--) {
            result.add(stack.get(k));
        }

        return result;
    }
}
