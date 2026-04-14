package com.folio;

import com.folio.editor.EditorTabManager;
import com.folio.editor.QuickAccessDialog;
import com.folio.filetree.FileTreePane;
import com.folio.model.EditorDocument;
import com.folio.model.EditorMode;
import com.folio.model.EditorSettings;
import javafx.scene.control.*;
import javafx.scene.input.*;
import javafx.scene.layout.BorderPane;
import javafx.scene.layout.HBox;
import javafx.scene.layout.Priority;
import javafx.stage.Stage;

import java.nio.file.Files;
import java.nio.file.Path;

public class MainController extends BorderPane {

    private final Stage stage;
    private final EditorTabManager tabManager;
    private final FileTreePane fileTreePane;
    private final FileOperationManager fileOps;
    private final ThemeManager themeManager;
    private final QuickAccessDialog quickAccessDialog;
    private final EditorSettings settings;

    // Status bar labels
    private final Label statusLabel = new Label("Ready");
    private final Label cursorPosLabel = new Label("");
    private final Label statsLabel = new Label("");
    private final Label modeLabel = new Label("");

    // Menu state
    private RadioMenuItem textModeItem;
    private RadioMenuItem wysiwygModeItem;

    public MainController(Stage stage) {
        this(stage, new EditorSettings());
    }

    public MainController(Stage stage, EditorSettings settings) {
        this.stage = stage;
        this.settings = settings;
        this.tabManager = new EditorTabManager();
        this.fileTreePane = new FileTreePane();
        this.fileOps = new FileOperationManager(stage, tabManager, fileTreePane, settings);
        this.themeManager = new ThemeManager(tabManager);
        this.quickAccessDialog = new QuickAccessDialog();

        fileOps.setOnFileChanged(this::updateStatusBar);

        setupLayout();
        setupMenuBar();
        setupFileTree();
        setupTabManager();
        setupDragAndDrop();
    }

    // --- Layout ---

    private void setupLayout() {
        SplitPane mainSplit = new SplitPane();
        mainSplit.getStyleClass().add("main-split");

        fileTreePane.setMinWidth(150);
        fileTreePane.setPrefWidth(220);

        mainSplit.getItems().addAll(fileTreePane, tabManager);
        mainSplit.setDividerPositions(0.2);
        SplitPane.setResizableWithParent(fileTreePane, false);

        HBox statusBar = new HBox(10);
        statusBar.getStyleClass().add("status-bar");
        statusBar.getChildren().addAll(statusLabel,
                new Separator(), cursorPosLabel,
                new Separator(), statsLabel,
                new Separator(), modeLabel);
        HBox.setHgrow(statusLabel, Priority.ALWAYS);

        setCenter(mainSplit);
        setBottom(statusBar);
    }

    // --- Menu ---

    private void setupMenuBar() {
        MenuBar menuBar = new MenuBar();
        menuBar.setUseSystemMenuBar(true);
        menuBar.getMenus().addAll(buildFileMenu(), buildEditMenu(), buildViewMenu());
        setTop(menuBar);
    }

    private Menu buildFileMenu() {
        Menu menu = new Menu("File");

        menu.getItems().addAll(
                menuItem("New", KeyCode.N, KeyCombination.META_DOWN, e -> fileOps.newFile()),
                new SeparatorMenuItem(),
                menuItem("Open File...", KeyCode.O, KeyCombination.META_DOWN, e -> fileOps.openFile()),
                menuItem("Open Folder...", KeyCode.O, e -> fileOps.openFolder(),
                        KeyCombination.META_DOWN, KeyCombination.SHIFT_DOWN),
                new SeparatorMenuItem(),
                menuItem("Save", KeyCode.S, KeyCombination.META_DOWN, e -> fileOps.saveFile()),
                menuItem("Save As...", KeyCode.S, e -> fileOps.saveFileAs(),
                        KeyCombination.META_DOWN, KeyCombination.SHIFT_DOWN),
                new SeparatorMenuItem(),
                menuItem("Export as HTML...", null, null, e -> fileOps.exportAsHtml()),
                menuItem("Print / Export PDF...", KeyCode.P, e -> fileOps.printDocument(),
                        KeyCombination.META_DOWN, KeyCombination.ALT_DOWN)
        );
        return menu;
    }

    private Menu buildEditMenu() {
        Menu menu = new Menu("Edit");

        menu.getItems().addAll(
                menuItem("Undo", KeyCode.Z, KeyCombination.META_DOWN,
                        e -> withEditor(ep -> ep.undo())),
                menuItem("Redo", KeyCode.Z, e -> withEditor(ep -> ep.redo()),
                        KeyCombination.META_DOWN, KeyCombination.SHIFT_DOWN),
                new SeparatorMenuItem(),
                menuItem("Cut", KeyCode.X, KeyCombination.META_DOWN,
                        e -> withEditor(ep -> ep.cut())),
                menuItem("Copy", KeyCode.C, KeyCombination.META_DOWN,
                        e -> withEditor(ep -> ep.copy())),
                menuItem("Paste", KeyCode.V, KeyCombination.META_DOWN,
                        e -> withEditor(ep -> ep.paste())),
                new SeparatorMenuItem(),
                menuItem("Select All", KeyCode.A, KeyCombination.META_DOWN,
                        e -> withEditor(ep -> ep.selectAll())),
                new SeparatorMenuItem(),
                menuItem("Find...", KeyCode.F, KeyCombination.META_DOWN,
                        e -> tabManager.showFindBar()),
                menuItem("Find and Replace...", KeyCode.H, KeyCombination.META_DOWN,
                        e -> tabManager.showFindReplaceBar()),
                new SeparatorMenuItem(),
                menuItem("Go to Line...", KeyCode.G, KeyCombination.META_DOWN,
                        e -> showGoToLineDialog())
        );
        return menu;
    }

    private Menu buildViewMenu() {
        Menu menu = new Menu("View");

        // Markdown mode
        Menu modeMenu = new Menu("Markdown Mode");
        ToggleGroup modeGroup = new ToggleGroup();
        textModeItem = new RadioMenuItem("Text Mode");
        textModeItem.setToggleGroup(modeGroup);
        textModeItem.setSelected(true);
        textModeItem.setAccelerator(new KeyCodeCombination(KeyCode.DIGIT1, KeyCombination.META_DOWN));
        textModeItem.setOnAction(e -> tabManager.switchMode(EditorMode.TEXT));
        wysiwygModeItem = new RadioMenuItem("WYSIWYG Mode");
        wysiwygModeItem.setToggleGroup(modeGroup);
        wysiwygModeItem.setAccelerator(new KeyCodeCombination(KeyCode.DIGIT2, KeyCombination.META_DOWN));
        wysiwygModeItem.setOnAction(e -> tabManager.switchMode(EditorMode.WYSIWYG));
        modeMenu.getItems().addAll(textModeItem, wysiwygModeItem);

        // Theme
        Menu themeMenu = new Menu("Theme");
        ToggleGroup themeGroup = new ToggleGroup();
        RadioMenuItem darkItem = new RadioMenuItem("Dark");
        darkItem.setToggleGroup(themeGroup);
        darkItem.setSelected(true);
        darkItem.setOnAction(e -> themeManager.setTheme(true, getScene()));
        RadioMenuItem lightItem = new RadioMenuItem("Light");
        lightItem.setToggleGroup(themeGroup);
        lightItem.setOnAction(e -> themeManager.setTheme(false, getScene()));
        themeMenu.getItems().addAll(darkItem, lightItem);

        // Minimap
        CheckMenuItem minimapItem = new CheckMenuItem("Minimap");
        minimapItem.setSelected(settings.minimapVisible);
        minimapItem.setAccelerator(new KeyCodeCombination(KeyCode.M,
                KeyCombination.META_DOWN, KeyCombination.SHIFT_DOWN));
        minimapItem.setOnAction(e -> tabManager.toggleMinimap());

        menu.getItems().addAll(
                modeMenu, themeMenu, new SeparatorMenuItem(),
                minimapItem, new SeparatorMenuItem(),
                menuItem("Command Palette...", KeyCode.P, e -> showCommandPalette(),
                        KeyCombination.META_DOWN, KeyCombination.SHIFT_DOWN),
                menuItem("Quick Open...", KeyCode.P, KeyCombination.META_DOWN,
                        e -> showQuickOpen()),
                new SeparatorMenuItem(),
                menuItem("Close Tab", KeyCode.W, KeyCombination.META_DOWN,
                        e -> tabManager.closeActiveTab()),
                menuItem("Refresh File Tree", KeyCode.R, e -> fileTreePane.refresh(),
                        KeyCombination.META_DOWN, KeyCombination.SHIFT_DOWN)
        );
        return menu;
    }

    // --- Menu helper ---

    private MenuItem menuItem(String text, KeyCode key, KeyCombination.Modifier mod,
                              javafx.event.EventHandler<javafx.event.ActionEvent> handler) {
        MenuItem item = new MenuItem(text);
        if (key != null && mod != null) {
            item.setAccelerator(new KeyCodeCombination(key, mod));
        }
        item.setOnAction(handler);
        return item;
    }

    private MenuItem menuItem(String text, KeyCode key,
                              javafx.event.EventHandler<javafx.event.ActionEvent> handler,
                              KeyCombination.Modifier... mods) {
        MenuItem item = new MenuItem(text);
        if (key != null && mods.length > 0) {
            item.setAccelerator(new KeyCodeCombination(key, mods));
        }
        item.setOnAction(handler);
        return item;
    }

    private void withEditor(java.util.function.Consumer<com.folio.editor.EditorPane> action) {
        var ep = tabManager.getActiveEditorPane();
        if (ep != null) action.accept(ep);
    }

    // --- Wiring ---

    private void setupFileTree() {
        fileTreePane.setOnFileOpen(fileOps::openFilePath);
    }

    private void setupTabManager() {
        tabManager.setOnContentChange((doc, content) -> updateStatusBar());
        tabManager.setOnActiveTabChanged(() -> {
            updateStatusBar();
            var ep = tabManager.getActiveEditorPane();
            if (ep != null) {
                ep.getCodeArea().caretPositionProperty().addListener(
                        (obs, o, n) -> updateCursorInfo());
            }
        });
    }

    private void setupDragAndDrop() {
        addEventFilter(DragEvent.DRAG_OVER, event -> {
            if (event.getDragboard().hasFiles()) {
                event.acceptTransferModes(TransferMode.COPY, TransferMode.MOVE);
            }
            event.consume();
        });
        addEventFilter(DragEvent.DRAG_DROPPED, event -> {
            Dragboard db = event.getDragboard();
            boolean success = false;
            if (db.hasFiles()) {
                for (var file : db.getFiles()) {
                    Path path = file.toPath();
                    if (Files.isDirectory(path)) {
                        fileOps.setProjectRoot(path);
                    } else {
                        fileOps.openFilePath(path);
                    }
                }
                success = true;
            }
            event.setDropCompleted(success);
            event.consume();
        });
    }

    // --- Status bar ---

    private void updateStatusBar() {
        EditorDocument doc = tabManager.getActiveDocument();
        if (doc == null) {
            statusLabel.setText("Ready");
            modeLabel.setText("");
            cursorPosLabel.setText("");
            statsLabel.setText("");
            return;
        }

        statusLabel.setText(doc.getFilePath() != null ? doc.getFilePath().toString() : "Untitled");

        var ep = tabManager.getActiveEditorPane();
        String lang = ep != null
                ? com.folio.editor.SyntaxHighlightEngine.detectLanguage(ep.getFileExtension())
                : "Plain Text";

        if (doc.isMarkdown()) {
            String modeStr = doc.getMode() == EditorMode.WYSIWYG ? "WYSIWYG" : "Text";
            modeLabel.setText(lang + " | " + modeStr);
            (doc.getMode() == EditorMode.WYSIWYG ? wysiwygModeItem : textModeItem).setSelected(true);
        } else {
            modeLabel.setText(lang);
        }
        updateCursorInfo();
        updateDocStats();
    }

    private void updateCursorInfo() {
        var ep = tabManager.getActiveEditorPane();
        if (ep != null) {
            cursorPosLabel.setText("Ln " + ep.getCaretLine() + ", Col " + ep.getCaretColumn());
        }
    }

    private void updateDocStats() {
        String content = tabManager.getActiveContent();
        if (content != null && !content.isEmpty()) {
            int lines = content.split("\n", -1).length;
            long words = java.util.Arrays.stream(content.split("\\s+"))
                    .filter(s -> !s.isEmpty()).count();
            statsLabel.setText(lines + " lines, " + words + " words, " + content.length() + " chars");
        } else {
            statsLabel.setText("0 lines");
        }
    }

    // --- Dialogs ---

    private void showGoToLineDialog() {
        var ep = tabManager.getActiveEditorPane();
        if (ep == null) return;
        TextInputDialog dialog = new TextInputDialog(String.valueOf(ep.getCaretLine()));
        dialog.setTitle("Go to Line");
        dialog.setHeaderText("Enter line number (1-" + ep.getTotalLines() + "):");
        dialog.setContentText("Line:");
        dialog.showAndWait().ifPresent(input -> {
            try { ep.goToLine(Integer.parseInt(input.trim())); }
            catch (NumberFormatException ignored) {}
        });
    }

    private void showCommandPalette() {
        var items = new java.util.ArrayList<QuickAccessDialog.Item>();
        items.add(new QuickAccessDialog.Item("New File", "File", fileOps::newFile));
        items.add(new QuickAccessDialog.Item("Open File...", "File", fileOps::openFile));
        items.add(new QuickAccessDialog.Item("Open Folder...", "File", fileOps::openFolder));
        items.add(new QuickAccessDialog.Item("Save", "File", fileOps::saveFile));
        items.add(new QuickAccessDialog.Item("Save As...", "File", fileOps::saveFileAs));
        items.add(new QuickAccessDialog.Item("Export as HTML...", "File", fileOps::exportAsHtml));
        items.add(new QuickAccessDialog.Item("Print / Export PDF...", "File", fileOps::printDocument));
        items.add(new QuickAccessDialog.Item("Undo", "Edit", () -> withEditor(ep -> ep.undo())));
        items.add(new QuickAccessDialog.Item("Redo", "Edit", () -> withEditor(ep -> ep.redo())));
        items.add(new QuickAccessDialog.Item("Find...", "Edit", tabManager::showFindBar));
        items.add(new QuickAccessDialog.Item("Find and Replace...", "Edit", tabManager::showFindReplaceBar));
        items.add(new QuickAccessDialog.Item("Go to Line...", "Edit", this::showGoToLineDialog));
        items.add(new QuickAccessDialog.Item("Dark Theme", "View", () -> themeManager.setTheme(true, getScene())));
        items.add(new QuickAccessDialog.Item("Light Theme", "View", () -> themeManager.setTheme(false, getScene())));
        items.add(new QuickAccessDialog.Item("Text Mode", "Markdown", () -> tabManager.switchMode(EditorMode.TEXT)));
        items.add(new QuickAccessDialog.Item("WYSIWYG Mode", "Markdown", () -> tabManager.switchMode(EditorMode.WYSIWYG)));
        items.add(new QuickAccessDialog.Item("Toggle Minimap", "View", tabManager::toggleMinimap));
        items.add(new QuickAccessDialog.Item("Quick Open...", "View", this::showQuickOpen));
        items.add(new QuickAccessDialog.Item("Refresh File Tree", "View", fileTreePane::refresh));
        quickAccessDialog.show(stage, "Command Palette", items);
    }

    private void showQuickOpen() {
        Path root = fileOps.getCurrentProjectRoot();
        if (root == null) { fileOps.openFile(); return; }
        var items = new java.util.ArrayList<QuickAccessDialog.Item>();
        fileOps.collectFiles(root, items, 0, 500);
        quickAccessDialog.show(stage, "Quick Open \u2014 " + root.getFileName(), items);
    }

    // --- Public API (used by App.java) ---

    public void openFileFromPath(Path path) {
        fileOps.openFilePath(path);
    }

    public void applyInitialTheme() {
        themeManager.setTheme(settings.darkTheme, getScene());
    }

    public void saveSession(EditorSettings s) {
        s.darkTheme = themeManager.isDark();
        s.minimapVisible = tabManager.isMinimapVisible();
        s.openFiles = tabManager.getOpenFilePaths();
        Path root = fileOps.getCurrentProjectRoot();
        if (root != null) s.lastProjectPath = root.toAbsolutePath().toString();
    }

    public void restoreSession() {
        if (!settings.lastProjectPath.isEmpty()) {
            Path projectPath = Path.of(settings.lastProjectPath);
            if (Files.isDirectory(projectPath)) {
                fileOps.setProjectRoot(projectPath);
            }
        }
        for (String filePath : settings.openFiles) {
            Path path = Path.of(filePath);
            if (Files.exists(path)) fileOps.openFilePath(path);
        }
    }
}
