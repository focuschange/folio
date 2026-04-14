package com.folio.editor;

import javafx.geometry.Insets;
import javafx.scene.control.Label;
import javafx.scene.layout.HBox;

import java.nio.file.Path;

/**
 * #23 Breadcrumb navigation bar.
 * Shows the file path as clickable segments: project > src > main > File.java
 */
public class BreadcrumbBar extends HBox {

    private Path projectRoot;
    private Path currentFile;

    public BreadcrumbBar() {
        setSpacing(0);
        setPadding(new Insets(4, 8, 4, 8));
        getStyleClass().add("breadcrumb-bar");
    }

    public void setProjectRoot(Path root) {
        this.projectRoot = root;
        update();
    }

    public void setCurrentFile(Path file) {
        this.currentFile = file;
        update();
    }

    private void update() {
        getChildren().clear();
        if (currentFile == null) return;

        Path display;
        if (projectRoot != null && currentFile.startsWith(projectRoot)) {
            display = projectRoot.relativize(currentFile);
            // Add project root name first
            addSegment(projectRoot.getFileName() != null
                    ? projectRoot.getFileName().toString() : projectRoot.toString(), true);
        } else {
            display = currentFile;
        }

        for (int i = 0; i < display.getNameCount(); i++) {
            boolean isLast = (i == display.getNameCount() - 1);
            String name = display.getName(i).toString();
            addSegment(name, !isLast);
        }
    }

    private void addSegment(String name, boolean addSeparator) {
        Label segment = new Label(name);
        segment.getStyleClass().add("breadcrumb-segment");
        segment.setCursor(javafx.scene.Cursor.HAND);
        getChildren().add(segment);

        if (addSeparator) {
            Label sep = new Label("  >  ");
            sep.getStyleClass().add("breadcrumb-separator");
            getChildren().add(sep);
        }
    }
}
