package com.folio.editor;

import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.control.*;
import javafx.scene.input.KeyCode;
import javafx.scene.layout.*;
import javafx.stage.Popup;
import javafx.stage.Stage;

import java.util.ArrayList;
import java.util.List;
import java.util.function.Consumer;

public class QuickAccessDialog {

    public record Item(String label, String detail, Runnable action) {
        @Override
        public String toString() { return label; }
    }

    private final Popup popup;
    private final TextField searchField;
    private final ListView<Item> listView;
    private final Label titleLabel;
    private final VBox container;
    private List<Item> allItems = new ArrayList<>();

    public QuickAccessDialog() {
        popup = new Popup();
        popup.setAutoHide(true);

        container = new VBox(0);
        container.getStyleClass().add("quick-access");
        container.setPrefWidth(500);
        container.setMaxHeight(400);

        titleLabel = new Label();
        titleLabel.getStyleClass().add("quick-access-title");
        titleLabel.setPadding(new Insets(8, 12, 4, 12));

        searchField = new TextField();
        searchField.setPromptText("Type to search...");
        searchField.getStyleClass().add("quick-access-field");
        VBox.setMargin(searchField, new Insets(4, 8, 4, 8));

        listView = new ListView<>();
        listView.getStyleClass().add("quick-access-list");
        listView.setPrefHeight(300);
        listView.setCellFactory(lv -> new ListCell<>() {
            @Override
            protected void updateItem(Item item, boolean empty) {
                super.updateItem(item, empty);
                if (empty || item == null) {
                    setGraphic(null);
                } else {
                    VBox cell = new VBox(1);
                    Label name = new Label(item.label());
                    name.getStyleClass().add("quick-access-item-label");
                    if (item.detail() != null && !item.detail().isEmpty()) {
                        Label detail = new Label(item.detail());
                        detail.getStyleClass().add("quick-access-item-detail");
                        cell.getChildren().addAll(name, detail);
                    } else {
                        cell.getChildren().add(name);
                    }
                    setGraphic(cell);
                }
            }
        });

        container.getChildren().addAll(titleLabel, searchField, listView);

        // Key handling
        searchField.textProperty().addListener((obs, o, n) -> filterItems(n));
        searchField.setOnKeyPressed(event -> {
            if (event.getCode() == KeyCode.ESCAPE) {
                popup.hide();
                event.consume();
            } else if (event.getCode() == KeyCode.DOWN) {
                listView.requestFocus();
                if (!listView.getItems().isEmpty()) {
                    listView.getSelectionModel().selectFirst();
                }
                event.consume();
            } else if (event.getCode() == KeyCode.ENTER) {
                executeSelected();
                event.consume();
            }
        });

        listView.setOnKeyPressed(event -> {
            if (event.getCode() == KeyCode.ENTER) {
                executeSelected();
                event.consume();
            } else if (event.getCode() == KeyCode.ESCAPE) {
                popup.hide();
                event.consume();
            }
        });

        listView.setOnMouseClicked(event -> {
            if (event.getClickCount() == 2) {
                executeSelected();
            }
        });

        popup.getContent().add(container);
    }

    public void show(Stage stage, String title, List<Item> items) {
        this.allItems = new ArrayList<>(items);
        titleLabel.setText(title);
        searchField.clear();
        listView.getItems().setAll(items);
        if (!items.isEmpty()) {
            listView.getSelectionModel().selectFirst();
        }

        // Position at top center of stage
        double x = stage.getX() + (stage.getWidth() - 500) / 2;
        double y = stage.getY() + 60;
        popup.show(stage, x, y);
        searchField.requestFocus();
    }

    public void hide() {
        popup.hide();
    }

    private void filterItems(String query) {
        if (query == null || query.isEmpty()) {
            listView.getItems().setAll(allItems);
        } else {
            String lower = query.toLowerCase();
            List<Item> filtered = allItems.stream()
                    .filter(item -> fuzzyMatch(item.label().toLowerCase(), lower)
                            || (item.detail() != null && fuzzyMatch(item.detail().toLowerCase(), lower)))
                    .toList();
            listView.getItems().setAll(filtered);
        }
        if (!listView.getItems().isEmpty()) {
            listView.getSelectionModel().selectFirst();
        }
    }

    private boolean fuzzyMatch(String text, String query) {
        int ti = 0, qi = 0;
        while (ti < text.length() && qi < query.length()) {
            if (text.charAt(ti) == query.charAt(qi)) qi++;
            ti++;
        }
        return qi == query.length();
    }

    private void executeSelected() {
        Item selected = listView.getSelectionModel().getSelectedItem();
        if (selected != null) {
            popup.hide();
            selected.action().run();
        }
    }

    public VBox getContainer() {
        return container;
    }
}
