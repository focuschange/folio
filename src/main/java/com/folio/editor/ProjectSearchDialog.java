package com.folio.editor;

import javafx.application.Platform;
import javafx.geometry.Insets;
import javafx.scene.control.*;
import javafx.scene.input.KeyCode;
import javafx.scene.layout.*;
import javafx.stage.Popup;
import javafx.stage.Stage;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.function.BiConsumer;
import java.util.stream.Stream;

/**
 * #22 Project-wide search dialog (Cmd+Shift+F).
 * Searches all files in the project root for a query string.
 */
public class ProjectSearchDialog {

    public record SearchResult(Path filePath, int lineNumber, String lineContent) {
        @Override
        public String toString() {
            return filePath.getFileName() + ":" + lineNumber + ": " + lineContent.trim();
        }
    }

    private final Popup popup;
    private final TextField searchField;
    private final CheckBox caseSensitiveBox;
    private final CheckBox regexBox;
    private final ListView<SearchResult> resultsList;
    private final Label statusLabel;
    private final VBox container;

    private Path projectRoot;
    private BiConsumer<Path, Integer> onResultSelected;
    private Thread searchThread;

    public ProjectSearchDialog() {
        popup = new Popup();
        popup.setAutoHide(true);

        container = new VBox(4);
        container.getStyleClass().add("project-search");
        container.setPrefWidth(600);
        container.setMaxHeight(500);
        container.setPadding(new Insets(8));

        Label titleLabel = new Label("Search in Project");
        titleLabel.getStyleClass().add("project-search-title");

        searchField = new TextField();
        searchField.setPromptText("Search in files...");
        searchField.getStyleClass().add("find-field");

        caseSensitiveBox = new CheckBox("Case Sensitive");
        caseSensitiveBox.getStyleClass().add("find-option");
        regexBox = new CheckBox("Regex");
        regexBox.getStyleClass().add("find-option");

        HBox options = new HBox(10, caseSensitiveBox, regexBox);
        options.setPadding(new Insets(2, 0, 2, 0));

        statusLabel = new Label("Enter a search term");
        statusLabel.getStyleClass().add("match-count");

        resultsList = new ListView<>();
        resultsList.getStyleClass().add("project-search-results");
        resultsList.setPrefHeight(350);
        resultsList.setCellFactory(lv -> new ListCell<>() {
            @Override
            protected void updateItem(SearchResult item, boolean empty) {
                super.updateItem(item, empty);
                if (empty || item == null) {
                    setGraphic(null);
                    setText(null);
                } else {
                    VBox cell = new VBox(1);
                    Label fileLine = new Label(item.filePath().getFileName() + ":" + item.lineNumber());
                    fileLine.getStyleClass().add("quick-access-item-label");
                    Label context = new Label(item.lineContent().trim());
                    context.getStyleClass().add("quick-access-item-detail");
                    context.setMaxWidth(560);
                    context.setWrapText(false);
                    cell.getChildren().addAll(fileLine, context);
                    setGraphic(cell);
                }
            }
        });

        container.getChildren().addAll(titleLabel, searchField, options, statusLabel, resultsList);

        // Wire events
        searchField.setOnKeyPressed(event -> {
            if (event.getCode() == KeyCode.ESCAPE) {
                popup.hide();
                event.consume();
            } else if (event.getCode() == KeyCode.DOWN) {
                resultsList.requestFocus();
                if (!resultsList.getItems().isEmpty()) {
                    resultsList.getSelectionModel().selectFirst();
                }
                event.consume();
            } else if (event.getCode() == KeyCode.ENTER) {
                runSearch();
                event.consume();
            }
        });

        resultsList.setOnKeyPressed(event -> {
            if (event.getCode() == KeyCode.ENTER) {
                openSelected();
                event.consume();
            } else if (event.getCode() == KeyCode.ESCAPE) {
                popup.hide();
                event.consume();
            }
        });

        resultsList.setOnMouseClicked(event -> {
            if (event.getClickCount() == 2) {
                openSelected();
            }
        });

        popup.getContent().add(container);
    }

    public void show(Stage stage, Path projectRoot) {
        this.projectRoot = projectRoot;
        searchField.clear();
        resultsList.getItems().clear();
        statusLabel.setText("Enter a search term");

        double x = stage.getX() + (stage.getWidth() - 600) / 2;
        double y = stage.getY() + 60;
        popup.show(stage, x, y);
        searchField.requestFocus();
    }

    public void setOnResultSelected(BiConsumer<Path, Integer> handler) {
        this.onResultSelected = handler;
    }

    private void runSearch() {
        String query = searchField.getText();
        if (query == null || query.isEmpty() || projectRoot == null) return;

        // Cancel any running search
        if (searchThread != null && searchThread.isAlive()) {
            searchThread.interrupt();
        }

        statusLabel.setText("Searching...");
        resultsList.getItems().clear();

        boolean caseSensitive = caseSensitiveBox.isSelected();
        boolean regex = regexBox.isSelected();

        searchThread = new Thread(() -> {
            List<SearchResult> results = new ArrayList<>();
            try (Stream<Path> walk = Files.walk(projectRoot)) {
                walk.filter(Files::isRegularFile)
                        .filter(p -> !isExcluded(p))
                        .forEach(filePath -> {
                            if (Thread.currentThread().isInterrupted()) return;
                            searchFile(filePath, query, caseSensitive, regex, results);
                        });
            } catch (IOException ignored) {
            }

            Platform.runLater(() -> {
                resultsList.getItems().setAll(results);
                statusLabel.setText(results.size() + " results found");
                if (!results.isEmpty()) {
                    resultsList.getSelectionModel().selectFirst();
                }
            });
        }, "project-search");
        searchThread.setDaemon(true);
        searchThread.start();
    }

    private boolean isExcluded(Path path) {
        String pathStr = path.toString();
        return pathStr.contains("/.git/") || pathStr.contains("/node_modules/")
                || pathStr.contains("/build/") || pathStr.contains("/target/")
                || pathStr.contains("/.gradle/") || pathStr.contains("/.idea/");
    }

    private void searchFile(Path filePath, String query, boolean caseSensitive,
                            boolean regex, List<SearchResult> results) {
        try {
            // Skip binary files by checking initial bytes
            byte[] bytes = Files.readAllBytes(filePath);
            if (bytes.length > 2_000_000) return; // Skip files > 2MB
            for (int i = 0; i < Math.min(512, bytes.length); i++) {
                if (bytes[i] == 0) return; // Binary file
            }

            String content = new String(bytes, StandardCharsets.UTF_8);
            String[] lines = content.split("\n", -1);

            for (int i = 0; i < lines.length; i++) {
                if (Thread.currentThread().isInterrupted()) return;
                if (results.size() >= 1000) return; // Limit results

                String line = lines[i];
                boolean matches;
                if (regex) {
                    try {
                        int flags = caseSensitive ? 0 : java.util.regex.Pattern.CASE_INSENSITIVE;
                        matches = java.util.regex.Pattern.compile(query, flags).matcher(line).find();
                    } catch (Exception e) {
                        matches = false;
                    }
                } else {
                    if (caseSensitive) {
                        matches = line.contains(query);
                    } else {
                        matches = line.toLowerCase().contains(query.toLowerCase());
                    }
                }

                if (matches) {
                    results.add(new SearchResult(filePath, i + 1, line));
                }
            }
        } catch (IOException ignored) {
        }
    }

    private void openSelected() {
        SearchResult selected = resultsList.getSelectionModel().getSelectedItem();
        if (selected != null && onResultSelected != null) {
            popup.hide();
            onResultSelected.accept(selected.filePath(), selected.lineNumber());
        }
    }
}
