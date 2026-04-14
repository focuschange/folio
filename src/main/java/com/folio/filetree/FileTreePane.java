package com.folio.filetree;

import javafx.geometry.Insets;
import javafx.scene.control.*;
import javafx.scene.input.KeyCode;
import javafx.scene.layout.BorderPane;

import com.folio.git.GitService;
import com.folio.git.GitStatus;
import com.folio.util.FileIconUtil;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.nio.file.attribute.BasicFileAttributes;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.Optional;
import java.util.function.Consumer;
import java.util.regex.Pattern;

public class FileTreePane extends BorderPane {

    private final TreeView<Path> treeView;
    private final TextField filterField;
    private Consumer<Path> onFileOpen;

    // #26 Git status coloring
    private Map<Path, GitStatus> gitStatusMap = Map.of();
    private Path rootDirectory;

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

        // #11 Modern file tree icons + #26 Git status coloring
        treeView.setCellFactory(tv -> {
            TreeCell<Path> cell = new TreeCell<>() {
                @Override
                protected void updateItem(Path item, boolean empty) {
                    super.updateItem(item, empty);
                    if (empty || item == null) {
                        setText(null);
                        setGraphic(null);
                        setContextMenu(null);
                        setStyle("");
                    } else {
                        String name = item.getFileName() != null
                                ? item.getFileName().toString()
                                : item.toString();
                        boolean isDir = Files.isDirectory(item);
                        setText(name);
                        if (isDir) {
                            TreeItem<Path> treeItem = getTreeItem();
                            setGraphic(FileIconUtil.getFolderIcon(
                                    treeItem != null && treeItem.isExpanded()));
                        } else {
                            setGraphic(FileIconUtil.getIcon(name));
                        }
                        setContextMenu(createContextMenu(item, isDir));

                        // #26 Apply git status color
                        String gitColor = getGitColor(item);
                        if (gitColor != null) {
                            setStyle("-fx-text-fill: " + gitColor + ";");
                        } else {
                            setStyle("");
                        }
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

        // #49 File info
        MenuItem fileInfoItem = new MenuItem("File Info...");
        fileInfoItem.setOnAction(e -> showFileInfo(path));

        if (isDir) {
            menu.getItems().addAll(renameItem, deleteItem, new SeparatorMenuItem(), fileInfoItem, copyPathItem);
        } else {
            MenuItem openItem = new MenuItem("Open");
            openItem.setOnAction(e -> { if (onFileOpen != null) onFileOpen.accept(path); });
            menu.getItems().addAll(openItem, new SeparatorMenuItem(),
                    renameItem, deleteItem, new SeparatorMenuItem(), fileInfoItem, copyPathItem);
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

    // #12 Wildcard filter support
    private boolean filterTree(TreeItem<Path> item, String filter) {
        if (item == null) return false;
        boolean anyChildMatch = false;
        for (var child : item.getChildren()) {
            boolean childMatch = filterTree(child, filter);
            anyChildMatch |= childMatch;
        }
        String name = item.getValue().getFileName() != null
                ? item.getValue().getFileName().toString().toLowerCase() : "";
        boolean selfMatch;
        if (filter.contains("*") || filter.contains("?")) {
            // Convert glob to regex
            String regex = filter.replace(".", "\\.").replace("*", ".*").replace("?", ".");
            selfMatch = Pattern.matches(regex, name);
        } else {
            selfMatch = name.contains(filter);
        }
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
        this.rootDirectory = directory;
        FileTreeItem rootItem = new FileTreeItem(directory);
        rootItem.setExpanded(true);
        treeView.setRoot(rootItem);
        refreshGitStatus();
    }

    // #26 Git status support
    public void refreshGitStatus() {
        if (rootDirectory == null) return;
        Thread t = new Thread(() -> {
            GitService gitService = new GitService(rootDirectory);
            if (gitService.isGitRepository()) {
                Map<Path, GitStatus> status = gitService.getStatus();
                javafx.application.Platform.runLater(() -> {
                    this.gitStatusMap = status;
                    // Force tree cells to refresh
                    treeView.refresh();
                });
            }
        }, "git-status");
        t.setDaemon(true);
        t.start();
    }

    private String getGitColor(Path item) {
        if (gitStatusMap.isEmpty() || rootDirectory == null) return null;
        try {
            Path relative = rootDirectory.relativize(item);
            GitStatus status = gitStatusMap.get(relative);
            if (status != null) return status.getColor();
        } catch (IllegalArgumentException ignored) {}
        return null;
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

    private void showFileInfo(Path path) {
        try {
            BasicFileAttributes attrs = Files.readAttributes(path, BasicFileAttributes.class);
            DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")
                    .withZone(ZoneId.systemDefault());

            long size = attrs.size();
            String sizeStr;
            if (size < 1024) sizeStr = size + " B";
            else if (size < 1024 * 1024) sizeStr = String.format("%.1f KB", size / 1024.0);
            else sizeStr = String.format("%.1f MB", size / (1024.0 * 1024));

            String info = "Name: " + path.getFileName() + "\n"
                    + "Path: " + path.toAbsolutePath() + "\n"
                    + "Size: " + sizeStr + "\n"
                    + "Type: " + (Files.isDirectory(path) ? "Directory" : "File") + "\n"
                    + "Created: " + fmt.format(attrs.creationTime().toInstant()) + "\n"
                    + "Modified: " + fmt.format(attrs.lastModifiedTime().toInstant()) + "\n"
                    + "Readable: " + Files.isReadable(path) + "\n"
                    + "Writable: " + Files.isWritable(path);

            Alert alert = new Alert(Alert.AlertType.INFORMATION);
            alert.setTitle("File Info");
            alert.setHeaderText(path.getFileName().toString());
            alert.setContentText(info);
            alert.showAndWait();
        } catch (IOException e) {
            showError("Failed to get file info: " + e.getMessage());
        }
    }

    private void showError(String message) {
        Alert alert = new Alert(Alert.AlertType.ERROR);
        alert.setTitle("Error");
        alert.setContentText(message);
        alert.showAndWait();
    }

    // Icons now handled by FileIconUtil
}
