package com.folio.filetree;

import javafx.collections.FXCollections;
import javafx.collections.ObservableList;
import javafx.scene.control.TreeItem;

import java.io.IOException;
import java.nio.file.DirectoryStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

public class FileTreeItem extends TreeItem<Path> {

    private boolean isFirstTimeChildren = true;
    private boolean isFirstTimeLeaf = true;
    private boolean isLeaf;

    public FileTreeItem(Path path) {
        super(path);
    }

    @Override
    public ObservableList<TreeItem<Path>> getChildren() {
        if (isFirstTimeChildren) {
            isFirstTimeChildren = false;
            super.getChildren().setAll(buildChildren());
        }
        return super.getChildren();
    }

    @Override
    public boolean isLeaf() {
        if (isFirstTimeLeaf) {
            isFirstTimeLeaf = false;
            isLeaf = !Files.isDirectory(getValue());
        }
        return isLeaf;
    }

    public void refresh() {
        isFirstTimeChildren = true;
        isFirstTimeLeaf = true;
        super.getChildren().clear();
        getChildren();
    }

    private ObservableList<TreeItem<Path>> buildChildren() {
        Path path = getValue();
        if (path != null && Files.isDirectory(path)) {
            List<TreeItem<Path>> children = new ArrayList<>();
            try (DirectoryStream<Path> stream = Files.newDirectoryStream(path)) {
                for (Path entry : stream) {
                    if (!entry.getFileName().toString().startsWith(".")) {
                        children.add(new FileTreeItem(entry));
                    }
                }
            } catch (IOException e) {
                // ignore unreadable directories
            }

            children.sort(Comparator.<TreeItem<Path>, Boolean>comparing(
                            item -> !Files.isDirectory(item.getValue()))
                    .thenComparing(item -> item.getValue().getFileName().toString().toLowerCase()));

            return FXCollections.observableArrayList(children);
        }
        return FXCollections.emptyObservableList();
    }
}
