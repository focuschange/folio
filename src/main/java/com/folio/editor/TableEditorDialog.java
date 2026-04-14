package com.folio.editor;

import javafx.geometry.Insets;
import javafx.scene.control.*;
import javafx.scene.layout.GridPane;
import javafx.scene.layout.HBox;
import javafx.scene.layout.VBox;

/**
 * Grid-based table creator dialog that generates Markdown table syntax.
 */
public class TableEditorDialog extends Dialog<String> {

    private final Spinner<Integer> rowsSpinner;
    private final Spinner<Integer> colsSpinner;
    private GridPane tableGrid;
    private TextField[][] cells;
    private VBox contentBox;

    public TableEditorDialog() {
        setTitle("Insert Markdown Table");
        setHeaderText("Create a table");

        rowsSpinner = new Spinner<>(1, 20, 3);
        rowsSpinner.setPrefWidth(80);
        rowsSpinner.setEditable(true);

        colsSpinner = new Spinner<>(1, 10, 3);
        colsSpinner.setPrefWidth(80);
        colsSpinner.setEditable(true);

        HBox sizeBox = new HBox(10,
                new Label("Rows:"), rowsSpinner,
                new Label("Columns:"), colsSpinner);
        sizeBox.setPadding(new Insets(5));

        Button generateBtn = new Button("Generate Grid");
        generateBtn.setOnAction(e -> buildGrid());

        tableGrid = new GridPane();
        tableGrid.setHgap(5);
        tableGrid.setVgap(5);
        tableGrid.setPadding(new Insets(10));

        contentBox = new VBox(10, sizeBox, generateBtn, tableGrid);
        contentBox.setPadding(new Insets(10));

        ScrollPane scrollPane = new ScrollPane(contentBox);
        scrollPane.setFitToWidth(true);
        scrollPane.setPrefSize(500, 400);

        getDialogPane().setContent(scrollPane);
        getDialogPane().getButtonTypes().addAll(ButtonType.OK, ButtonType.CANCEL);

        // Build initial grid
        buildGrid();

        setResultConverter(button -> {
            if (button == ButtonType.OK) {
                return generateMarkdownTable();
            }
            return null;
        });
    }

    private void buildGrid() {
        tableGrid.getChildren().clear();
        int rows = rowsSpinner.getValue();
        int cols = colsSpinner.getValue();
        cells = new TextField[rows + 1][cols]; // +1 for header row

        // Header row label
        tableGrid.add(new Label("Header"), 0, 0);
        for (int c = 0; c < cols; c++) {
            TextField tf = new TextField("Header " + (c + 1));
            tf.setPrefWidth(120);
            cells[0][c] = tf;
            tableGrid.add(tf, c + 1, 0);
        }

        // Data rows
        for (int r = 0; r < rows; r++) {
            tableGrid.add(new Label("Row " + (r + 1)), 0, r + 1);
            for (int c = 0; c < cols; c++) {
                TextField tf = new TextField("");
                tf.setPrefWidth(120);
                cells[r + 1][c] = tf;
                tableGrid.add(tf, c + 1, r + 1);
            }
        }
    }

    private String generateMarkdownTable() {
        if (cells == null || cells.length == 0) return "";

        int cols = cells[0].length;
        StringBuilder sb = new StringBuilder();

        // Header row
        sb.append("| ");
        for (int c = 0; c < cols; c++) {
            sb.append(getCellText(0, c));
            if (c < cols - 1) sb.append(" | ");
        }
        sb.append(" |\n");

        // Separator row
        sb.append("| ");
        for (int c = 0; c < cols; c++) {
            sb.append("---");
            if (c < cols - 1) sb.append(" | ");
        }
        sb.append(" |\n");

        // Data rows
        for (int r = 1; r < cells.length; r++) {
            sb.append("| ");
            for (int c = 0; c < cols; c++) {
                sb.append(getCellText(r, c));
                if (c < cols - 1) sb.append(" | ");
            }
            sb.append(" |\n");
        }

        return sb.toString();
    }

    private String getCellText(int row, int col) {
        if (cells[row][col] == null) return "";
        String text = cells[row][col].getText();
        return text == null ? "" : text.trim();
    }
}
