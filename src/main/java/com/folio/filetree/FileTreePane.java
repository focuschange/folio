package com.folio.filetree;

import javafx.geometry.Insets;
import javafx.scene.control.*;
import javafx.scene.input.KeyCode;
import javafx.scene.layout.BorderPane;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Optional;
import java.util.function.Consumer;

public class FileTreePane extends BorderPane {

    private final TreeView<Path> treeView;
    private final TextField filterField;
    private Consumer<Path> onFileOpen;

    public FileTreePane() {
        treeView = new TreeView<>();
        treeView.setShowRoot(true);
        treeView.getStyleClass().add("file-tree");

        // Filter field
        filterField = new TextField();
        filterField.setPromptText("Filter files...");
        filterField.getStyleClass().add("file-tree-filter");
        filterField.textProperty().addListener((obs, o, n) -> applyFilter(n));
        filterField.setOnKeyPressed(event -> {
            if (event.getCode() == KeyCode.ESCAPE) {
                filterField.clear();
                event.consume();
            }
        });
        BorderPane.setMargin(filterField, new Insets(4));

        treeView.setCellFactory(tv -> {
            TreeCell<Path> cell = new TreeCell<>() {
                @Override
                protected void updateItem(Path item, boolean empty) {
                    super.updateItem(item, empty);
                    if (empty || item == null) {
                        setText(null);
                        setGraphic(null);
                        setContextMenu(null);
                    } else {
                        String name = item.getFileName() != null
                                ? item.getFileName().toString()
                                : item.toString();
                        boolean isDir = Files.isDirectory(item);
                        String icon = isDir ? "\uD83D\uDCC1 " : getFileIcon(name);
                        setText(icon + name);
                        setContextMenu(createContextMenu(item, isDir));
                    }
                }
            };
            return cell;
        });

        treeView.setOnMouseClicked(event -> {
            if (event.getClickCount() == 2) {
                var selectedItem = treeView.getSelectionModel().getSelectedItem();
                if (selectedItem != null && !Files.isDirectory(selectedItem.getValue())) {
                    if (onFileOpen != null) {
                        onFileOpen.accept(selectedItem.getValue());
                    }
                }
            }
        });

        setTop(filterField);
        setCenter(treeView);
    }

    private ContextMenu createContextMenu(Path path, boolean isDir) {
        ContextMenu menu = new ContextMenu();

        if (isDir) {
            MenuItem newFileItem = new MenuItem("New File...");
            newFileItem.setOnAction(e -> createNewFile(path));

            MenuItem newFolderItem = new MenuItem("New Folder...");
            newFolderItem.setOnAction(e -> createNewFolder(path));

            menu.getItems().addAll(newFileItem, newFolderItem, new SeparatorMenuItem());
        }

        MenuItem renameItem = new MenuItem("Rename...");
        renameItem.setOnAction(e -> renameItem(path));

        MenuItem deleteItem = new MenuItem("Delete");
        deleteItem.setOnAction(e -> deleteItem(path));

        MenuItem copyPathItem = new MenuItem("Copy Path");
        copyPathItem.setOnAction(e -> {
            javafx.scene.input.ClipboardContent content = new javafx.scene.input.ClipboardContent();
            content.putString(path.toAbsolutePath().toString());
            javafx.scene.input.Clipboard.getSystemClipboard().setContent(content);
        });

        if (isDir) {
            menu.getItems().addAll(renameItem, deleteItem, new SeparatorMenuItem(), copyPathItem);
        } else {
            MenuItem openItem = new MenuItem("Open");
            openItem.setOnAction(e -> { if (onFileOpen != null) onFileOpen.accept(path); });
            menu.getItems().addAll(openItem, new SeparatorMenuItem(),
                    renameItem, deleteItem, new SeparatorMenuItem(), copyPathItem);
        }

        return menu;
    }

    private void createNewFile(Path parentDir) {
        TextInputDialog dialog = new TextInputDialog("untitled.txt");
        dialog.setTitle("New File");
        dialog.setHeaderText("Create new file in " + parentDir.getFileName());
        dialog.setContentText("File name:");
        dialog.showAndWait().ifPresent(name -> {
            try {
                Path newFile = parentDir.resolve(name);
                Files.createFile(newFile);
                refresh();
                if (onFileOpen != null) onFileOpen.accept(newFile);
            } catch (IOException e) {
                showError("Failed to create file: " + e.getMessage());
            }
        });
    }

    private void createNewFolder(Path parentDir) {
        TextInputDialog dialog = new TextInputDialog("new-folder");
        dialog.setTitle("New Folder");
        dialog.setHeaderText("Create new folder in " + parentDir.getFileName());
        dialog.setContentText("Folder name:");
        dialog.showAndWait().ifPresent(name -> {
            try {
                Files.createDirectories(parentDir.resolve(name));
                refresh();
            } catch (IOException e) {
                showError("Failed to create folder: " + e.getMessage());
            }
        });
    }

    private void renameItem(Path path) {
        String currentName = path.getFileName().toString();
        TextInputDialog dialog = new TextInputDialog(currentName);
        dialog.setTitle("Rename");
        dialog.setHeaderText("Rename " + currentName);
        dialog.setContentText("New name:");
        dialog.showAndWait().ifPresent(newName -> {
            try {
                Files.move(path, path.resolveSibling(newName), StandardCopyOption.ATOMIC_MOVE);
                refresh();
            } catch (IOException e) {
                showError("Failed to rename: " + e.getMessage());
            }
        });
    }

    private void deleteItem(Path path) {
        String name = path.getFileName().toString();
        Alert alert = new Alert(Alert.AlertType.CONFIRMATION);
        alert.setTitle("Delete");
        alert.setHeaderText("Delete " + name + "?");
        alert.setContentText("This action cannot be undone.");
        Optional<ButtonType> result = alert.showAndWait();
        if (result.isPresent() && result.get() == ButtonType.OK) {
            try {
                if (Files.isDirectory(path)) {
                    deleteRecursive(path);
                } else {
                    Files.deleteIfExists(path);
                }
                refresh();
            } catch (IOException e) {
                showError("Failed to delete: " + e.getMessage());
            }
        }
    }

    private void deleteRecursive(Path dir) throws IOException {
        try (var stream = Files.walk(dir)) {
            stream.sorted(java.util.Comparator.reverseOrder())
                    .forEach(p -> { try { Files.deleteIfExists(p); } catch (IOException ignored) {} });
        }
    }

    private void applyFilter(String filterText) {
        // Simple approach: collapse and re-expand to trigger filtering
        // The filter is applied visually through tree cell opacity
        if (filterText == null || filterText.isEmpty()) {
            setAllVisible(treeView.getRoot());
        } else {
            filterTree(treeView.getRoot(), filterText.toLowerCase());
        }
    }

    private boolean filterTree(TreeItem<Path> item, String filter) {
        if (item == null) return false;
        boolean anyChildMatch = false;
        for (var child : item.getChildren()) {
            boolean childMatch = filterTree(child, filter);
            anyChildMatch |= childMatch;
        }
        String name = item.getValue().getFileName() != null
                ? item.getValue().getFileName().toString().toLowerCase() : "";
        boolean selfMatch = name.contains(filter);
        // Expand if any child matches
        if (anyChildMatch) item.setExpanded(true);
        return selfMatch || anyChildMatch;
    }

    private void setAllVisible(TreeItem<Path> item) {
        if (item == null) return;
        for (var child : item.getChildren()) {
            setAllVisible(child);
        }
    }

    public void setRootDirectory(Path directory) {
        FileTreeItem rootItem = new FileTreeItem(directory);
        rootItem.setExpanded(true);
        treeView.setRoot(rootItem);
    }

    public void setOnFileOpen(Consumer<Path> handler) {
        this.onFileOpen = handler;
    }

    public void refresh() {
        var root = treeView.getRoot();
        if (root instanceof FileTreeItem fti) {
            fti.refresh();
        }
    }

    private void showError(String message) {
        Alert alert = new Alert(Alert.AlertType.ERROR);
        alert.setTitle("Error");
        alert.setContentText(message);
        alert.showAndWait();
    }

    private String getFileIcon(String name) {
        String lower = name.toLowerCase();
        if (lower.endsWith(".md") || lower.endsWith(".markdown")) return "\uD83D\uDCDD ";
        if (lower.endsWith(".java")) return "\u2615 ";
        if (lower.endsWith(".json")) return "\uD83D\uDCCB ";
        if (lower.endsWith(".xml")) return "\uD83D\uDCCB ";
        if (lower.endsWith(".html") || lower.endsWith(".htm")) return "\uD83C\uDF10 ";
        if (lower.endsWith(".css")) return "\uD83C\uDFA8 ";
        if (lower.endsWith(".js") || lower.endsWith(".ts")) return "\uD83D\uDFE8 ";
        if (lower.endsWith(".py")) return "\uD83D\uDC0D ";
        if (lower.endsWith(".txt")) return "\uD83D\uDCC4 ";
        if (lower.endsWith(".png") || lower.endsWith(".jpg") || lower.endsWith(".gif")) return "\uD83D\uDDBC\uFE0F ";
        if (lower.endsWith(".sh") || lower.endsWith(".bash")) return "\uD83D\uDCBB ";
        if (lower.endsWith(".sql")) return "\uD83D\uDDC3\uFE0F ";
        if (lower.endsWith(".yaml") || lower.endsWith(".yml")) return "\u2699\uFE0F ";
        if (lower.endsWith(".gradle") || lower.endsWith(".kts")) return "\uD83D\uDC18 ";
        return "\uD83D\uDCC4 ";
    }
}
