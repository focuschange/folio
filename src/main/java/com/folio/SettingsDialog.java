package com.folio;

import com.folio.model.EditorSettings;
import javafx.geometry.Insets;
import javafx.scene.control.*;
import javafx.scene.layout.GridPane;
import javafx.scene.layout.HBox;
import javafx.scene.text.Font;

import java.util.List;

public class SettingsDialog extends Dialog<EditorSettings> {

    private final EditorSettings settings;

    // Editor
    private final ComboBox<String> fontFamilyBox;
    private final Spinner<Integer> fontSizeSpinner;
    private final Spinner<Integer> tabSizeSpinner;
    private final CheckBox wordWrapCheck;
    private final CheckBox minimapCheck;

    // Theme
    private final ToggleGroup themeGroup;
    private final RadioButton darkRadio;
    private final RadioButton lightRadio;

    // Auto-save
    private final CheckBox autoSaveCheck;
    private final Spinner<Integer> autoSaveIntervalSpinner;

    // Layout padding
    private final Spinner<Integer> editorPaddingSpinner;

    public SettingsDialog(EditorSettings settings) {
        this.settings = settings;

        setTitle("Preferences");
        setHeaderText("Editor Settings");

        // Font family
        fontFamilyBox = new ComboBox<>();
        List<String> monoFonts = Font.getFamilies().stream()
                .filter(f -> f.toLowerCase().contains("mono") || f.toLowerCase().contains("menlo")
                        || f.toLowerCase().contains("consolas") || f.toLowerCase().contains("courier")
                        || f.toLowerCase().contains("sf mono") || f.toLowerCase().contains("fira"))
                .toList();
        fontFamilyBox.getItems().addAll(monoFonts.isEmpty()
                ? List.of("Menlo", "Monaco", "Consolas", "Courier New") : monoFonts);
        if (!fontFamilyBox.getItems().contains(settings.fontFamily)) {
            fontFamilyBox.getItems().add(0, settings.fontFamily);
        }
        fontFamilyBox.setValue(settings.fontFamily);
        fontFamilyBox.setEditable(true);

        // Font size
        fontSizeSpinner = new Spinner<>(8, 72, settings.fontSize);
        fontSizeSpinner.setEditable(true);
        fontSizeSpinner.setPrefWidth(80);

        // Tab size
        tabSizeSpinner = new Spinner<>(1, 16, settings.tabSize);
        tabSizeSpinner.setEditable(true);
        tabSizeSpinner.setPrefWidth(80);

        // Word wrap
        wordWrapCheck = new CheckBox("Word Wrap");
        wordWrapCheck.setSelected(settings.wordWrap);

        // Minimap
        minimapCheck = new CheckBox("Show Minimap");
        minimapCheck.setSelected(settings.minimapVisible);

        // Theme
        themeGroup = new ToggleGroup();
        darkRadio = new RadioButton("Dark");
        darkRadio.setToggleGroup(themeGroup);
        lightRadio = new RadioButton("Light");
        lightRadio.setToggleGroup(themeGroup);
        (settings.darkTheme ? darkRadio : lightRadio).setSelected(true);

        // Auto-save
        autoSaveCheck = new CheckBox("Auto Save");
        autoSaveCheck.setSelected(settings.autoSave);
        autoSaveIntervalSpinner = new Spinner<>(5, 300, settings.autoSaveInterval);
        autoSaveIntervalSpinner.setEditable(true);
        autoSaveIntervalSpinner.setPrefWidth(80);
        autoSaveIntervalSpinner.setDisable(!settings.autoSave);
        autoSaveCheck.selectedProperty().addListener((obs, o, n) -> autoSaveIntervalSpinner.setDisable(!n));

        // Editor padding
        editorPaddingSpinner = new Spinner<>(0, 50, settings.editorPadding);
        editorPaddingSpinner.setEditable(true);
        editorPaddingSpinner.setPrefWidth(80);

        // Layout
        TabPane tabPane = new TabPane();
        tabPane.setTabClosingPolicy(TabPane.TabClosingPolicy.UNAVAILABLE);
        tabPane.getTabs().addAll(
                createEditorTab(),
                createAppearanceTab(),
                createLayoutTab()
        );

        getDialogPane().setContent(tabPane);
        getDialogPane().setPrefSize(480, 400);
        getDialogPane().getButtonTypes().addAll(ButtonType.OK, ButtonType.CANCEL);

        setResultConverter(button -> {
            if (button == ButtonType.OK) {
                applySettings();
                return settings;
            }
            return null;
        });
    }

    private Tab createEditorTab() {
        Tab tab = new Tab("Editor");
        GridPane grid = createGrid();
        int row = 0;
        grid.add(new Label("Font Family:"), 0, row);
        grid.add(fontFamilyBox, 1, row++);
        grid.add(new Label("Font Size:"), 0, row);
        grid.add(fontSizeSpinner, 1, row++);
        grid.add(new Label("Tab Size:"), 0, row);
        grid.add(tabSizeSpinner, 1, row++);
        grid.add(wordWrapCheck, 0, row++, 2, 1);
        grid.add(new Label(""), 0, row++); // spacer
        grid.add(autoSaveCheck, 0, row);
        HBox autoSaveBox = new HBox(5, new Label("Interval (sec):"), autoSaveIntervalSpinner);
        autoSaveBox.setAlignment(javafx.geometry.Pos.CENTER_LEFT);
        grid.add(autoSaveBox, 1, row);
        tab.setContent(grid);
        return tab;
    }

    private Tab createAppearanceTab() {
        Tab tab = new Tab("Appearance");
        GridPane grid = createGrid();
        int row = 0;
        grid.add(new Label("Theme:"), 0, row);
        HBox themeBox = new HBox(10, darkRadio, lightRadio);
        grid.add(themeBox, 1, row++);
        grid.add(minimapCheck, 0, row++, 2, 1);
        tab.setContent(grid);
        return tab;
    }

    private Tab createLayoutTab() {
        Tab tab = new Tab("Layout");
        GridPane grid = createGrid();
        int row = 0;
        grid.add(new Label("Editor Padding:"), 0, row);
        grid.add(editorPaddingSpinner, 1, row++);
        tab.setContent(grid);
        return tab;
    }

    private GridPane createGrid() {
        GridPane grid = new GridPane();
        grid.setHgap(10);
        grid.setVgap(10);
        grid.setPadding(new Insets(20));
        return grid;
    }

    private void applySettings() {
        settings.fontFamily = fontFamilyBox.getValue();
        settings.fontSize = fontSizeSpinner.getValue();
        settings.tabSize = tabSizeSpinner.getValue();
        settings.wordWrap = wordWrapCheck.isSelected();
        settings.minimapVisible = minimapCheck.isSelected();
        settings.darkTheme = darkRadio.isSelected();
        settings.autoSave = autoSaveCheck.isSelected();
        settings.autoSaveInterval = autoSaveIntervalSpinner.getValue();
        settings.editorPadding = editorPaddingSpinner.getValue();
    }
}
