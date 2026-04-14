package com.folio.editor;

import javafx.geometry.Insets;
import javafx.scene.control.*;
import javafx.scene.layout.BorderPane;
import javafx.scene.layout.VBox;

import java.nio.file.Path;
import java.util.List;
import java.util.function.Consumer;

public class SidePanel extends BorderPane {

    private final ListView<String> openFilesList;
    private final ListView<String> recentFilesList;
    private Consumer<String> onFileSelect;

    public SidePanel() {
        setPrefWidth(200);
        setMinWidth(120);
        getStyleClass().add("side-panel");

        // Open Files section
        Label openLabel = new Label("OPEN FILES");
        openLabel.getStyleClass().add("side-panel-header");
        openLabel.setPadding(new Insets(8, 8, 4, 8));

        openFilesList = new ListView<>();
        openFilesList.getStyleClass().add("side-panel-list");
        openFilesList.setPrefHeight(200);
        openFilesList.setOnMouseClicked(e -> {
            if (e.getClickCount() == 2) {
                String selected = openFilesList.getSelectionModel().getSelectedItem();
                if (selected != null && onFileSelect != null) {
                    onFileSelect.accept(selected);
                }
            }
        });

        // Recent Files section
        Label recentLabel = new Label("RECENT FILES");
        recentLabel.getStyleClass().add("side-panel-header");
        recentLabel.setPadding(new Insets(8, 8, 4, 8));

        recentFilesList = new ListView<>();
        recentFilesList.getStyleClass().add("side-panel-list");
        recentFilesList.setOnMouseClicked(e -> {
            if (e.getClickCount() == 2) {
                String selected = recentFilesList.getSelectionModel().getSelectedItem();
                if (selected != null && onFileSelect != null) {
                    onFileSelect.accept(selected);
                }
            }
        });

        VBox content = new VBox(openLabel, openFilesList, recentLabel, recentFilesList);
        VBox.setVgrow(openFilesList, javafx.scene.layout.Priority.ALWAYS);
        VBox.setVgrow(recentFilesList, javafx.scene.layout.Priority.ALWAYS);

        setCenter(content);
    }

    public void updateOpenFiles(List<String> filePaths) {
        openFilesList.getItems().clear();
        for (String path : filePaths) {
            Path p = Path.of(path);
            openFilesList.getItems().add(p.getFileName().toString());
        }
    }

    public void updateRecentFiles(List<String> recentFiles) {
        recentFilesList.getItems().clear();
        for (String path : recentFiles) {
            Path p = Path.of(path);
            recentFilesList.getItems().add(p.getFileName().toString());
        }
    }

    public void setOnFileSelect(Consumer<String> handler) {
        this.onFileSelect = handler;
    }
}
