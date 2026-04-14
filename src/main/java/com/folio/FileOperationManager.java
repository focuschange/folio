package com.folio;

import com.folio.editor.EditorTabManager;
import com.folio.filetree.FileTreePane;
import com.folio.model.EditorDocument;
import com.folio.model.EditorSettings;
import javafx.stage.DirectoryChooser;
import javafx.stage.FileChooser;
import javafx.stage.Stage;

import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

public class FileOperationManager {

    private final Stage stage;
    private final EditorTabManager tabManager;
    private final FileTreePane fileTreePane;
    private final EditorSettings settings;
    private Path currentProjectRoot;
    private Runnable onFileChanged;

    public FileOperationManager(Stage stage, EditorTabManager tabManager,
                                FileTreePane fileTreePane, EditorSettings settings) {
        this.stage = stage;
        this.tabManager = tabManager;
        this.fileTreePane = fileTreePane;
        this.settings = settings;
    }

    public void setOnFileChanged(Runnable handler) {
        this.onFileChanged = handler;
    }

    public Path getCurrentProjectRoot() {
        return currentProjectRoot;
    }

    public void newFile() {
        EditorDocument doc = new EditorDocument();
        tabManager.openDocument(doc);
    }

    public void openFile() {
        FileChooser fileChooser = new FileChooser();
        fileChooser.setTitle("Open File");
        fileChooser.getExtensionFilters().addAll(
                new FileChooser.ExtensionFilter("All Files", "*.*"),
                new FileChooser.ExtensionFilter("Markdown Files", "*.md", "*.markdown"),
                new FileChooser.ExtensionFilter("Text Files", "*.txt"),
                new FileChooser.ExtensionFilter("Java Files", "*.java")
        );
        File file = fileChooser.showOpenDialog(stage);
        if (file != null) {
            openFilePath(file.toPath());
        }
    }

    public void openFolder() {
        DirectoryChooser directoryChooser = new DirectoryChooser();
        directoryChooser.setTitle("Open Folder");
        File directory = directoryChooser.showDialog(stage);
        if (directory != null) {
            setProjectRoot(directory.toPath());
        }
    }

    public void setProjectRoot(Path path) {
        currentProjectRoot = path;
        fileTreePane.setRootDirectory(path);
        stage.setTitle("Folio - " + path.getFileName());
    }

    public void openFilePath(Path path) {
        try {
            String content = Files.readString(path, StandardCharsets.UTF_8);
            EditorDocument doc = new EditorDocument(path, content);
            tabManager.openDocument(doc);
            settings.addRecentFile(path.toAbsolutePath().toString());
            if (onFileChanged != null) onFileChanged.run();
        } catch (IOException e) {
            showError("Failed to open file", e.getMessage());
        }
    }

    public void saveFile() {
        EditorDocument doc = tabManager.getActiveDocument();
        if (doc == null) return;

        String content = tabManager.getActiveContent();
        if (content != null) doc.setContent(content);

        if (doc.getFilePath() == null) {
            saveFileAs();
            return;
        }

        try {
            Files.writeString(doc.getFilePath(), doc.getContent(), StandardCharsets.UTF_8);
            doc.markSaved();
            if (onFileChanged != null) onFileChanged.run();
        } catch (IOException e) {
            showError("Failed to save file", e.getMessage());
        }
    }

    public void saveFileAs() {
        EditorDocument doc = tabManager.getActiveDocument();
        if (doc == null) return;

        String content = tabManager.getActiveContent();
        if (content != null) doc.setContent(content);

        FileChooser fileChooser = new FileChooser();
        fileChooser.setTitle("Save As");
        fileChooser.getExtensionFilters().addAll(
                new FileChooser.ExtensionFilter("Markdown Files", "*.md"),
                new FileChooser.ExtensionFilter("Text Files", "*.txt"),
                new FileChooser.ExtensionFilter("All Files", "*.*")
        );
        if (doc.getFilePath() != null) {
            fileChooser.setInitialDirectory(doc.getFilePath().getParent().toFile());
            fileChooser.setInitialFileName(doc.getFileName());
        }

        File file = fileChooser.showSaveDialog(stage);
        if (file != null) {
            try {
                Files.writeString(file.toPath(), doc.getContent(), StandardCharsets.UTF_8);
                doc.setFilePath(file.toPath());
                doc.markSaved();
                if (onFileChanged != null) onFileChanged.run();
            } catch (IOException e) {
                showError("Failed to save file", e.getMessage());
            }
        }
    }

    public void exportAsHtml() {
        var doc = tabManager.getActiveDocument();
        var preview = tabManager.getActivePreviewPane();
        if (doc == null || preview == null || !doc.isMarkdown()) {
            showError("Export", "Only Markdown files can be exported as HTML.");
            return;
        }

        FileChooser fileChooser = new FileChooser();
        fileChooser.setTitle("Export as HTML");
        fileChooser.getExtensionFilters().add(
                new FileChooser.ExtensionFilter("HTML Files", "*.html"));
        if (doc.getFilePath() != null) {
            fileChooser.setInitialDirectory(doc.getFilePath().getParent().toFile());
            String name = doc.getFileName().replaceAll("\\.(md|markdown)$", ".html");
            fileChooser.setInitialFileName(name);
        }

        File file = fileChooser.showSaveDialog(stage);
        if (file != null) {
            try {
                String html = preview.getFullHtmlForExport();
                Files.writeString(file.toPath(), html, StandardCharsets.UTF_8);
            } catch (IOException e) {
                showError("Export failed", e.getMessage());
            }
        }
    }

    public void printDocument() {
        var preview = tabManager.getActivePreviewPane();
        if (preview == null) return;
        try {
            javafx.print.PrinterJob job = javafx.print.PrinterJob.createPrinterJob();
            if (job != null && job.showPrintDialog(stage)) {
                preview.getWebView().getEngine().print(job);
                job.endJob();
            }
        } catch (Exception e) {
            showError("Print failed", e.getMessage());
        }
    }

    public void collectFiles(Path dir, java.util.List<com.folio.editor.QuickAccessDialog.Item> items,
                             int depth, int maxItems) {
        if (depth > 8 || items.size() >= maxItems) return;
        try (var stream = Files.list(dir)) {
            for (Path entry : stream.sorted().toList()) {
                if (items.size() >= maxItems) break;
                String name = entry.getFileName().toString();
                if (name.startsWith(".")) continue;
                if (Files.isDirectory(entry)) {
                    if (name.equals("node_modules") || name.equals("build") || name.equals("target")
                            || name.equals(".git") || name.equals(".gradle")) continue;
                    collectFiles(entry, items, depth + 1, maxItems);
                } else {
                    String relativePath = currentProjectRoot.relativize(entry).toString();
                    items.add(new com.folio.editor.QuickAccessDialog.Item(
                            name, relativePath, () -> openFilePath(entry)));
                }
            }
        } catch (IOException ignored) {}
    }

    private void showError(String title, String message) {
        javafx.scene.control.Alert alert = new javafx.scene.control.Alert(
                javafx.scene.control.Alert.AlertType.ERROR);
        alert.setTitle(title);
        alert.setContentText(message);
        alert.showAndWait();
    }
}
