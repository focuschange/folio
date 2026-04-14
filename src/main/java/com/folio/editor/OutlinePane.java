package com.folio.editor;

import javafx.geometry.Insets;
import javafx.scene.control.*;
import javafx.scene.layout.BorderPane;
import javafx.scene.layout.VBox;

import java.util.ArrayList;
import java.util.List;
import java.util.function.Consumer;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * #25 Symbol/Outline navigation pane.
 * Parses the document for symbols (markdown headings, Java class/method declarations)
 * and displays them as a tree for quick navigation.
 */
public class OutlinePane extends BorderPane {

    public record Symbol(String name, String kind, int line, int level) {
        @Override
        public String toString() {
            return name;
        }
    }

    private final TreeView<Symbol> treeView;
    private Consumer<Integer> onNavigateToLine;

    // Regex patterns for Java symbols
    private static final Pattern JAVA_CLASS = Pattern.compile(
            "^\\s*(?:public|private|protected)?\\s*(?:abstract|static|final)?\\s*(?:class|interface|enum|record)\\s+(\\w+)");
    private static final Pattern JAVA_METHOD = Pattern.compile(
            "^\\s*(?:public|private|protected)?\\s*(?:static|final|abstract|synchronized)?\\s*(?:<[^>]+>\\s+)?\\w[\\w<>\\[\\],\\s]*\\s+(\\w+)\\s*\\(");
    // Markdown headings
    private static final Pattern MD_HEADING = Pattern.compile("^(#{1,6})\\s+(.+)");

    public OutlinePane() {
        setPrefWidth(200);
        setMinWidth(120);
        getStyleClass().add("outline-pane");

        Label header = new Label("OUTLINE");
        header.getStyleClass().add("side-panel-header");
        header.setPadding(new Insets(8, 8, 4, 8));

        treeView = new TreeView<>();
        treeView.setShowRoot(false);
        treeView.getStyleClass().add("outline-tree");

        treeView.setCellFactory(tv -> new TreeCell<>() {
            @Override
            protected void updateItem(Symbol item, boolean empty) {
                super.updateItem(item, empty);
                if (empty || item == null) {
                    setText(null);
                    setGraphic(null);
                } else {
                    String icon;
                    switch (item.kind()) {
                        case "class" -> icon = "C";
                        case "interface" -> icon = "I";
                        case "enum" -> icon = "E";
                        case "record" -> icon = "R";
                        case "method" -> icon = "M";
                        case "heading" -> icon = "H" + item.level();
                        default -> icon = "-";
                    }
                    setText("[" + icon + "] " + item.name());
                }
            }
        });

        treeView.setOnMouseClicked(event -> {
            if (event.getClickCount() == 2) {
                TreeItem<Symbol> selected = treeView.getSelectionModel().getSelectedItem();
                if (selected != null && selected.getValue() != null && onNavigateToLine != null) {
                    onNavigateToLine.accept(selected.getValue().line());
                }
            }
        });

        VBox content = new VBox(header, treeView);
        VBox.setVgrow(treeView, javafx.scene.layout.Priority.ALWAYS);
        setCenter(content);
    }

    public void setOnNavigateToLine(Consumer<Integer> handler) {
        this.onNavigateToLine = handler;
    }

    public void updateOutline(String text, String fileExtension) {
        TreeItem<Symbol> root = new TreeItem<>(new Symbol("root", "", 0, 0));
        root.setExpanded(true);

        if (text == null || text.isEmpty()) {
            treeView.setRoot(root);
            return;
        }

        List<Symbol> symbols = parseSymbols(text, fileExtension);
        buildTree(root, symbols);
        treeView.setRoot(root);
    }

    private List<Symbol> parseSymbols(String text, String extension) {
        List<Symbol> symbols = new ArrayList<>();
        String[] lines = text.split("\n", -1);

        if ("md".equals(extension) || "markdown".equals(extension)) {
            for (int i = 0; i < lines.length; i++) {
                Matcher m = MD_HEADING.matcher(lines[i]);
                if (m.find()) {
                    int level = m.group(1).length();
                    String name = m.group(2).trim();
                    symbols.add(new Symbol(name, "heading", i + 1, level));
                }
            }
        } else if ("java".equals(extension)) {
            for (int i = 0; i < lines.length; i++) {
                String line = lines[i];
                Matcher classM = JAVA_CLASS.matcher(line);
                if (classM.find()) {
                    String kind = "class";
                    if (line.contains("interface")) kind = "interface";
                    else if (line.contains("enum")) kind = "enum";
                    else if (line.contains("record")) kind = "record";
                    symbols.add(new Symbol(classM.group(1), kind, i + 1, 1));
                    continue;
                }
                Matcher methodM = JAVA_METHOD.matcher(line);
                if (methodM.find()) {
                    String methodName = methodM.group(1);
                    // Skip common keywords that match the pattern
                    if (!methodName.equals("if") && !methodName.equals("for") && !methodName.equals("while")
                            && !methodName.equals("switch") && !methodName.equals("catch")
                            && !methodName.equals("return") && !methodName.equals("new")) {
                        symbols.add(new Symbol(methodName + "()", "method", i + 1, 2));
                    }
                }
            }
        } else {
            // Generic: look for function-like patterns
            Pattern funcPattern = Pattern.compile("^\\s*(?:function|def|fn|func|sub)\\s+(\\w+)");
            for (int i = 0; i < lines.length; i++) {
                Matcher m = funcPattern.matcher(lines[i]);
                if (m.find()) {
                    symbols.add(new Symbol(m.group(1) + "()", "method", i + 1, 1));
                }
            }
        }

        return symbols;
    }

    private void buildTree(TreeItem<Symbol> root, List<Symbol> symbols) {
        // For Java: nest methods under classes
        TreeItem<Symbol> currentClass = null;
        for (Symbol sym : symbols) {
            TreeItem<Symbol> item = new TreeItem<>(sym);
            item.setExpanded(true);
            if (sym.level() <= 1) {
                root.getChildren().add(item);
                currentClass = item;
            } else {
                if (currentClass != null) {
                    currentClass.getChildren().add(item);
                } else {
                    root.getChildren().add(item);
                }
            }
        }
    }
}
