package com.folio.editor;

import com.folio.model.EditorDocument;
import com.folio.model.EditorMode;
import com.folio.preview.PreviewPane;
import javafx.scene.control.*;
import javafx.scene.layout.BorderPane;
import javafx.scene.layout.Priority;
import javafx.scene.layout.VBox;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.function.BiConsumer;

public class EditorTabManager extends BorderPane {

    private final TabPane tabPane;
    private final Map<Tab, TabContent> tabContents = new HashMap<>();
    private BiConsumer<EditorDocument, String> onContentChange;
    private boolean isDark = true;
    private Runnable onActiveTabChanged;

    public EditorTabManager() {
        tabPane = new TabPane();
        tabPane.setTabClosingPolicy(TabPane.TabClosingPolicy.ALL_TABS);
        tabPane.getStyleClass().add("editor-tab-pane");
        setCenter(tabPane);

        tabPane.getSelectionModel().selectedItemProperty().addListener((obs, oldTab, newTab) -> {
            if (onActiveTabChanged != null) {
                onActiveTabChanged.run();
            }
        });
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
        updateTabTitle(tab, doc);

        TabContent content = new TabContent(doc);
        setupTabContent(tab, content);

        doc.dirtyProperty().addListener((obs, wasDirty, isDirty) -> updateTabTitle(tab, doc));

        tab.setOnCloseRequest(event -> {
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
                        // Trigger save via callback
                        if (onContentChange != null) {
                            onContentChange.accept(doc, null); // signal save
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

            splitPane.getItems().addAll(editorContainer, content.previewPane);
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
        BorderPane editorContainer = (BorderPane) splitPane.getItems().get(0);

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
            tabPane.getTabs().remove(activeTab);
        }
    }

    public void closeOtherTabs() {
        Tab activeTab = tabPane.getSelectionModel().getSelectedItem();
        if (activeTab == null) return;
        tabPane.getTabs().removeIf(tab -> tab != activeTab);
        tabContents.keySet().removeIf(tab -> tab != activeTab);
    }

    public void toggleMinimap() {
        for (TabContent content : tabContents.values()) {
            content.editorPane.toggleMinimap();
        }
    }

    public boolean isMinimapVisible() {
        Tab activeTab = tabPane.getSelectionModel().getSelectedItem();
        if (activeTab == null) return true;
        TabContent content = tabContents.get(activeTab);
        return content != null && content.editorPane.isMinimapVisible();
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

    private void updateTabTitle(Tab tab, EditorDocument doc) {
        String name = doc.getFileName();
        if (doc.isDirty()) {
            name = "\u2022 " + name;
        }
        tab.setText(name);
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

        TabContent(EditorDocument document) {
            this.document = document;
            this.editorPane = new EditorPane();
            this.previewPane = new PreviewPane();
            this.wysiwygPane = new WysiwygPane();
        }
    }
}
