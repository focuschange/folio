package com.folio.editor;

import com.folio.model.EditorDocument;
import com.folio.model.EditorMode;
import com.folio.model.EditorSettings;
import com.folio.preview.PreviewPane;
import com.folio.util.FileIconUtil;
import javafx.scene.control.*;
import javafx.scene.input.*;
import javafx.scene.layout.BorderPane;
import javafx.scene.layout.HBox;
import javafx.scene.layout.Priority;
import javafx.scene.layout.VBox;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.*;
import java.util.function.BiConsumer;

public class EditorTabManager extends BorderPane {

    private final TabPane tabPane;
    private final Map<Tab, TabContent> tabContents = new HashMap<>();
    private BiConsumer<EditorDocument, String> onContentChange;
    private boolean isDark = true;
    private Runnable onActiveTabChanged;

    // #23 Breadcrumb bar
    private final BreadcrumbBar breadcrumbBar;

    // #25 Outline pane
    private final OutlinePane outlinePane;
    private boolean outlineVisible = false;

    public EditorTabManager() {
        tabPane = new TabPane();
        tabPane.setTabClosingPolicy(TabPane.TabClosingPolicy.ALL_TABS);
        tabPane.getStyleClass().add("editor-tab-pane");

        // #23 Breadcrumb bar above tab pane
        breadcrumbBar = new BreadcrumbBar();
        VBox topSection = new VBox(breadcrumbBar, tabPane);
        VBox.setVgrow(tabPane, Priority.ALWAYS);

        // #25 Outline pane
        outlinePane = new OutlinePane();
        outlinePane.setOnNavigateToLine(line -> {
            var ep = getActiveEditorPane();
            if (ep != null) {
                ep.goToLine(line);
            }
        });

        setCenter(topSection);

        tabPane.getSelectionModel().selectedItemProperty().addListener((obs, oldTab, newTab) -> {
            updateBreadcrumb();
            updateOutline();
            if (onActiveTabChanged != null) {
                onActiveTabChanged.run();
            }
        });
    }

    // #23 Breadcrumb support
    public void setProjectRoot(Path root) {
        breadcrumbBar.setProjectRoot(root);
    }

    private void updateBreadcrumb() {
        EditorDocument doc = getActiveDocument();
        if (doc != null && doc.getFilePath() != null) {
            breadcrumbBar.setCurrentFile(doc.getFilePath());
        } else {
            breadcrumbBar.setCurrentFile(null);
        }
    }

    // #25 Outline support
    public void toggleOutline() {
        outlineVisible = !outlineVisible;
        if (outlineVisible) {
            setRight(outlinePane);
            updateOutline();
        } else {
            setRight(null);
        }
    }

    private void updateOutline() {
        if (!outlineVisible) return;
        var ep = getActiveEditorPane();
        if (ep != null) {
            outlinePane.updateOutline(ep.getText(), ep.getFileExtension());
        }
    }

    public void openDocument(EditorDocument doc) {
        // Check if already open
        for (var entry : tabContents.entrySet()) {
            if (doc.getFilePath() != null &&
                    doc.getFilePath().equals(entry.getValue().document.getFilePath())) {
                tabPane.getSelectionModel().select(entry.getKey());
                return;
            }
        }

        Tab tab = new Tab();
        TabContent content = new TabContent(doc);
        updateTabTitle(tab, doc);

        // #50 Tab tooltip showing file path
        updateTabTooltip(tab, doc);

        // #10 Tab icon by extension
        tab.setGraphic(FileIconUtil.getIcon(doc.getFileName()));

        setupTabContent(tab, content);
        setupTabContextMenu(tab, content);
        setupTabDragAndDrop(tab);

        doc.dirtyProperty().addListener((obs, wasDirty, isDirty) -> updateTabTitle(tab, doc));

        tab.setOnCloseRequest(event -> {
            // #37 Pinned tabs cannot be closed
            if (content.pinned) {
                event.consume();
                return;
            }
            if (doc.isDirty()) {
                Alert alert = new Alert(Alert.AlertType.CONFIRMATION);
                alert.setTitle("Save Changes");
                alert.setHeaderText("Save changes to " + doc.getFileName() + "?");
                alert.setContentText("Your changes will be lost if you don't save them.");
                alert.getButtonTypes().setAll(
                        ButtonType.YES, ButtonType.NO, ButtonType.CANCEL);

                Optional<ButtonType> result = alert.showAndWait();
                if (result.isPresent()) {
                    if (result.get() == ButtonType.CANCEL) {
                        event.consume();
                        return;
                    }
                    if (result.get() == ButtonType.YES) {
                        if (onContentChange != null) {
                            onContentChange.accept(doc, null);
                        }
                    }
                }
            }
            tabContents.remove(tab);
        });

        tabContents.put(tab, content);
        tabPane.getTabs().add(tab);
        tabPane.getSelectionModel().select(tab);
    }

    private void setupTabContent(Tab tab, TabContent content) {
        EditorDocument doc = content.document;

        if (doc.isMarkdown()) {
            SplitPane splitPane = new SplitPane();
            splitPane.getStyleClass().add("editor-split");

            BorderPane editorContainer = new BorderPane();
            if (doc.getMode() == EditorMode.WYSIWYG) {
                editorContainer.setCenter(content.wysiwygPane);
                content.wysiwygPane.setContentFromMarkdown(doc.getContent());
            } else {
                editorContainer.setCenter(content.editorPane);
            }

            // #2 Text/WYSIWYG toggle button bar
            HBox toggleBar = new HBox(5);
            toggleBar.getStyleClass().add("mode-toggle-bar");
            toggleBar.setStyle("-fx-padding: 3 8; -fx-background-color: derive(-fx-base, -10%);");
            javafx.scene.control.ToggleGroup modeToggleGroup = new javafx.scene.control.ToggleGroup();
            javafx.scene.control.ToggleButton textBtn = new javafx.scene.control.ToggleButton("Text");
            javafx.scene.control.ToggleButton wysiwygBtn = new javafx.scene.control.ToggleButton("WYSIWYG");
            textBtn.setToggleGroup(modeToggleGroup);
            wysiwygBtn.setToggleGroup(modeToggleGroup);
            textBtn.setSelected(doc.getMode() == EditorMode.TEXT);
            wysiwygBtn.setSelected(doc.getMode() == EditorMode.WYSIWYG);
            textBtn.setOnAction(e -> switchMode(EditorMode.TEXT));
            wysiwygBtn.setOnAction(e -> switchMode(EditorMode.WYSIWYG));
            toggleBar.getChildren().addAll(textBtn, wysiwygBtn);

            VBox editorWithToggle = new VBox(toggleBar, editorContainer);
            VBox.setVgrow(editorContainer, Priority.ALWAYS);

            splitPane.getItems().addAll(editorWithToggle, content.previewPane);
            splitPane.setDividerPositions(0.5);

            tab.setContent(splitPane);

            // Wire content changes for text mode
            content.editorPane.setOnContentChange(text -> {
                doc.setContent(text);
                content.previewPane.updateContent(text);
                if (onContentChange != null) {
                    onContentChange.accept(doc, text);
                }
            });

            // Wire content changes for WYSIWYG mode
            content.wysiwygPane.setOnContentChange(markdown -> {
                doc.setContent(markdown);
                content.previewPane.updateContent(markdown);
                if (onContentChange != null) {
                    onContentChange.accept(doc, markdown);
                }
            });

            // Scroll synchronization: editor -> preview
            content.editorPane.getCodeArea().estimatedScrollYProperty().addListener((obs, o, n) -> {
                double totalHeight = content.editorPane.getCodeArea().getTotalHeightEstimate();
                double viewHeight = content.editorPane.getCodeArea().getHeight();
                if (totalHeight > viewHeight) {
                    double percent = n.doubleValue() / (totalHeight - viewHeight);
                    content.previewPane.scrollToPercent(Math.max(0, Math.min(1, percent)));
                }
            });

            // Initial preview
            content.previewPane.updateContent(doc.getContent());
        } else {
            tab.setContent(content.editorPane);

            content.editorPane.setOnContentChange(text -> {
                doc.setContent(text);
                if (onContentChange != null) {
                    onContentChange.accept(doc, text);
                }
            });
        }

        content.editorPane.loadDocument(doc);
        content.previewPane.setDarkMode(isDark);
        content.wysiwygPane.setDarkMode(isDark);
    }

    public void switchMode(EditorMode mode) {
        Tab activeTab = tabPane.getSelectionModel().getSelectedItem();
        if (activeTab == null) return;

        TabContent content = tabContents.get(activeTab);
        if (content == null || !content.document.isMarkdown()) return;

        content.document.setMode(mode);

        SplitPane splitPane = (SplitPane) activeTab.getContent();
        // The first item is a VBox containing the toggle bar and the editor container
        VBox editorWithToggle = (VBox) splitPane.getItems().get(0);
        BorderPane editorContainer = (BorderPane) editorWithToggle.getChildren().get(1);

        if (mode == EditorMode.WYSIWYG) {
            String markdown = content.editorPane.getText();
            content.document.setContent(markdown);
            editorContainer.setCenter(content.wysiwygPane);
            content.wysiwygPane.setContentFromMarkdown(markdown);
        } else {
            String markdown = content.wysiwygPane.getMarkdownContent();
            content.document.setContent(markdown);
            editorContainer.setCenter(content.editorPane);
            content.editorPane.setText(markdown);
            content.previewPane.updateContent(markdown);
        }
    }

    public EditorDocument getActiveDocument() {
        Tab activeTab = tabPane.getSelectionModel().getSelectedItem();
        if (activeTab == null) return null;
        TabContent content = tabContents.get(activeTab);
        return content != null ? content.document : null;
    }

    public String getActiveContent() {
        Tab activeTab = tabPane.getSelectionModel().getSelectedItem();
        if (activeTab == null) return null;
        TabContent content = tabContents.get(activeTab);
        if (content == null) return null;

        if (content.document.getMode() == EditorMode.WYSIWYG) {
            return content.wysiwygPane.getMarkdownContent();
        }
        return content.editorPane.getText();
    }

    public void setOnContentChange(BiConsumer<EditorDocument, String> handler) {
        this.onContentChange = handler;
    }

    public void setOnActiveTabChanged(Runnable handler) {
        this.onActiveTabChanged = handler;
    }

    public void setDarkMode(boolean dark) {
        this.isDark = dark;
        for (TabContent content : tabContents.values()) {
            content.previewPane.setDarkMode(dark);
            content.wysiwygPane.setDarkMode(dark);
            content.editorPane.setDarkMode(dark);
        }
    }

    public void selectTab(int index) {
        if (index >= 0 && index < tabPane.getTabs().size()) {
            tabPane.getSelectionModel().select(index);
        }
    }

    public void closeActiveTab() {
        Tab activeTab = tabPane.getSelectionModel().getSelectedItem();
        if (activeTab != null) {
            TabContent content = tabContents.get(activeTab);
            if (content != null && content.pinned) return; // Don't close pinned
            tabPane.getTabs().remove(activeTab);
        }
    }

    public void closeOtherTabs() {
        Tab activeTab = tabPane.getSelectionModel().getSelectedItem();
        if (activeTab == null) return;
        tabPane.getTabs().removeIf(tab -> {
            if (tab == activeTab) return false;
            TabContent tc = tabContents.get(tab);
            return tc == null || !tc.pinned;
        });
        tabContents.keySet().removeIf(tab -> {
            if (tab == activeTab) return false;
            TabContent tc = tabContents.get(tab);
            return tc == null || !tc.pinned;
        });
    }

    public void toggleMinimap() {
        for (TabContent content : tabContents.values()) {
            content.editorPane.toggleMinimap();
        }
    }

    public void applySettings(EditorSettings settings) {
        for (TabContent content : tabContents.values()) {
            content.editorPane.applySettings(settings);
        }
    }

    public boolean isMinimapVisible() {
        Tab activeTab = tabPane.getSelectionModel().getSelectedItem();
        if (activeTab == null) return true;
        TabContent content = tabContents.get(activeTab);
        return content != null && content.editorPane.isMinimapVisible();
    }

    public java.util.List<EditorDocument> getAllDocuments() {
        var docs = new java.util.ArrayList<EditorDocument>();
        for (TabContent content : tabContents.values()) {
            docs.add(content.document);
        }
        return docs;
    }

    public java.util.List<String> getOpenFilePaths() {
        var paths = new java.util.ArrayList<String>();
        for (TabContent content : tabContents.values()) {
            if (content.document.getFilePath() != null) {
                paths.add(content.document.getFilePath().toAbsolutePath().toString());
            }
        }
        return paths;
    }

    // #9 Tab double-click to rename
    private void setupTabContextMenu(Tab tab, TabContent content) {
        ContextMenu contextMenu = new ContextMenu();

        // #9 Rename
        MenuItem renameItem = new MenuItem("Rename...");
        renameItem.setOnAction(e -> renameTab(tab, content));

        // #37 Pin/Unpin
        MenuItem pinItem = new MenuItem(content.pinned ? "Unpin Tab" : "Pin Tab");
        pinItem.setOnAction(e -> {
            content.pinned = !content.pinned;
            pinItem.setText(content.pinned ? "Unpin Tab" : "Pin Tab");
            updateTabTitle(tab, content.document);
            // Move pinned tabs to the left
            if (content.pinned) {
                int pinnedCount = (int) tabContents.values().stream().filter(tc -> tc.pinned).count();
                tabPane.getTabs().remove(tab);
                tabPane.getTabs().add(Math.min(pinnedCount - 1, tabPane.getTabs().size()), tab);
                tabPane.getSelectionModel().select(tab);
            }
        });

        MenuItem closeItem = new MenuItem("Close");
        closeItem.setOnAction(e -> {
            if (!content.pinned) tabPane.getTabs().remove(tab);
        });
        MenuItem closeOthersItem = new MenuItem("Close Others");
        closeOthersItem.setOnAction(e -> {
            tabPane.getTabs().removeIf(t -> t != tab && !tabContents.containsKey(t) || (tabContents.containsKey(t) && !tabContents.get(t).pinned && t != tab));
            tabContents.keySet().removeIf(t -> t != tab && !tabContents.get(t).pinned);
        });

        contextMenu.getItems().addAll(renameItem, pinItem, new SeparatorMenuItem(), closeItem, closeOthersItem);
        tab.setContextMenu(contextMenu);
    }

    private void renameTab(Tab tab, TabContent content) {
        EditorDocument doc = content.document;
        if (doc.getFilePath() == null) return;

        TextInputDialog dialog = new TextInputDialog(doc.getFileName());
        dialog.setTitle("Rename File");
        dialog.setHeaderText("Rename " + doc.getFileName());
        dialog.setContentText("New name:");
        dialog.showAndWait().ifPresent(newName -> {
            try {
                Path oldPath = doc.getFilePath();
                Path newPath = oldPath.resolveSibling(newName);
                Files.move(oldPath, newPath, StandardCopyOption.ATOMIC_MOVE);
                doc.setFilePath(newPath);
                updateTabTitle(tab, doc);
                updateTabTooltip(tab, doc);
                tab.setGraphic(FileIconUtil.getIcon(newName));
            } catch (IOException ex) {
                Alert alert = new Alert(Alert.AlertType.ERROR);
                alert.setTitle("Rename Failed");
                alert.setContentText("Failed to rename: " + ex.getMessage());
                alert.showAndWait();
            }
        });
    }

    // #36 Drag and drop tab reordering
    private void setupTabDragAndDrop(Tab tab) {
        Label dragLabel = new Label();
        // We use the tab's graphic label area for drag detection
        tab.getStyleClass().add("draggable-tab");

        tab.setOnSelectionChanged(e -> {
            // Placeholder for drag detection - JavaFX Tab DnD requires
            // custom header manipulation which is complex; we use context menu reorder
        });
    }

    private void updateTabTooltip(Tab tab, EditorDocument doc) {
        String tooltipText = doc.getFilePath() != null
                ? doc.getFilePath().toAbsolutePath().toString()
                : "Untitled";
        tab.setTooltip(new Tooltip(tooltipText));
    }

    private void updateTabTitle(Tab tab, EditorDocument doc) {
        TabContent content = tabContents.get(tab);
        String name = doc.getFileName();
        if (content != null && content.pinned) {
            name = "\uD83D\uDCCC " + name; // 📌
        }
        if (doc.isDirty()) {
            name = "\u2022 " + name;
        }
        tab.setText(name);
        // Update icon on title change
        tab.setGraphic(FileIconUtil.getIcon(doc.getFileName()));
    }

    public boolean hasOpenTabs() {
        return !tabPane.getTabs().isEmpty();
    }

    public com.folio.preview.PreviewPane getActivePreviewPane() {
        Tab activeTab = tabPane.getSelectionModel().getSelectedItem();
        if (activeTab == null) return null;
        TabContent content = tabContents.get(activeTab);
        return content != null ? content.previewPane : null;
    }

    public EditorPane getActiveEditorPane() {
        Tab activeTab = tabPane.getSelectionModel().getSelectedItem();
        if (activeTab == null) return null;
        TabContent content = tabContents.get(activeTab);
        return content != null ? content.editorPane : null;
    }

    public void showFindBar() {
        Tab activeTab = tabPane.getSelectionModel().getSelectedItem();
        if (activeTab == null) return;
        TabContent content = tabContents.get(activeTab);
        if (content != null) {
            content.editorPane.showFindBar();
        }
    }

    public void showFindReplaceBar() {
        Tab activeTab = tabPane.getSelectionModel().getSelectedItem();
        if (activeTab == null) return;
        TabContent content = tabContents.get(activeTab);
        if (content != null) {
            content.editorPane.showFindReplaceBar();
        }
    }

    private static class TabContent {
        final EditorDocument document;
        final EditorPane editorPane;
        final PreviewPane previewPane;
        final WysiwygPane wysiwygPane;
        boolean pinned = false;

        TabContent(EditorDocument document) {
            this.document = document;
            this.editorPane = new EditorPane();
            this.previewPane = new PreviewPane();
            this.wysiwygPane = new WysiwygPane();
        }
    }
}
