package com.folio.model;

import javafx.beans.property.*;

import java.nio.file.Path;

public class EditorDocument {

    private final StringProperty content = new SimpleStringProperty("");
    private final ObjectProperty<Path> filePath = new SimpleObjectProperty<>(null);
    private final BooleanProperty dirty = new SimpleBooleanProperty(false);
    private final ObjectProperty<EditorMode> mode = new SimpleObjectProperty<>(EditorMode.TEXT);
    private String savedContent = "";

    public EditorDocument() {}

    public EditorDocument(Path path, String content) {
        this.filePath.set(path);
        this.content.set(content);
        this.savedContent = content;
    }

    public String getContent() { return content.get(); }
    public void setContent(String value) {
        content.set(value);
        dirty.set(!value.equals(savedContent));
    }
    public StringProperty contentProperty() { return content; }

    public Path getFilePath() { return filePath.get(); }
    public void setFilePath(Path value) { filePath.set(value); }
    public ObjectProperty<Path> filePathProperty() { return filePath; }

    public boolean isDirty() { return dirty.get(); }
    public BooleanProperty dirtyProperty() { return dirty; }

    public EditorMode getMode() { return mode.get(); }
    public void setMode(EditorMode value) { mode.set(value); }
    public ObjectProperty<EditorMode> modeProperty() { return mode; }

    public void markSaved() {
        savedContent = content.get();
        dirty.set(false);
    }

    public boolean isMarkdown() {
        Path path = filePath.get();
        if (path == null) return false;
        String name = path.getFileName().toString().toLowerCase();
        return name.endsWith(".md") || name.endsWith(".markdown");
    }

    public String getFileName() {
        Path path = filePath.get();
        if (path == null) return "Untitled";
        return path.getFileName().toString();
    }
}
