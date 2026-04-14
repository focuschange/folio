package com.folio;

import com.folio.editor.*;
import com.folio.git.GitPanel;
import com.folio.git.GitService;
import com.folio.filetree.FileTreePane;
import com.folio.model.EditorDocument;
import com.folio.model.EditorMode;
import com.folio.model.EditorSettings;
import javafx.animation.KeyFrame;
import javafx.animation.Timeline;
import javafx.geometry.Side;
import javafx.scene.control.*;
import javafx.scene.input.*;
import javafx.scene.layout.BorderPane;
import javafx.scene.layout.HBox;
import javafx.scene.layout.Priority;
import javafx.stage.Stage;
import javafx.util.Duration;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.TreeSet;

public class MainController extends BorderPane {

    private final Stage stage;
    private final EditorTabManager tabManager;
    private final FileTreePane fileTreePane;
    private final FileOperationManager fileOps;
    private final ThemeManager themeManager;
    private final QuickAccessDialog quickAccessDialog;
    private final EditorSettings settings;

    // #22 Project-wide search
    private final ProjectSearchDialog projectSearchDialog;

    // #28 Git panel
    private final GitPanel gitPanel;
    private boolean gitPanelVisible = false;

    // Status bar labels
    private final Label statusLabel = new Label("Ready");
    private final Label cursorPosLabel = new Label("");
    private final Label statsLabel = new Label("");
    private final Label modeLabel = new Label("");
    private final Label encodingLabel = new Label("UTF-8");

    // #38 Auto-save timer
    private Timeline autoSaveTimeline;

    // Layout
    private SplitPane mainSplit;
    private final SidePanel sidePanel;
    private HBox statusBar;
    private boolean sidebarVisible = true;
    private boolean rightPanelVisible = false;
    private boolean zenMode = false;
    private double savedDividerPos = 0.2;

    // Menu state
    private RadioMenuItem textModeItem;
    private RadioMenuItem wysiwygModeItem;
    private Menu recentFilesMenu;

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
        this.sidePanel = new SidePanel();
        this.projectSearchDialog = new ProjectSearchDialog();
        this.gitPanel = new GitPanel();

        // #22 Wire project search result handler
        projectSearchDialog.setOnResultSelected((path, line) -> {
            fileOps.openFilePath(path);
            // After opening, go to line
            javafx.application.Platform.runLater(() -> {
                var ep = tabManager.getActiveEditorPane();
                if (ep != null) ep.goToLine(line);
            });
        });

        fileOps.setOnFileChanged(() -> {
            updateStatusBar();
            if (recentFilesMenu != null) refreshRecentFilesMenu();
        });

        // Wire project root changes for breadcrumb and git panel
        fileOps.setOnProjectRootChanged(this::onProjectRootChanged);

        setupLayout();
        setupMenuBar();
        setupFileTree();
        setupTabManager();
        setupDragAndDrop();
        setupAutoSave();
    }

    // --- Layout ---

    private void setupLayout() {
        mainSplit = new SplitPane();
        mainSplit.getStyleClass().add("main-split");

        fileTreePane.setMinWidth(150);
        fileTreePane.setPrefWidth(220);
        sidePanel.setMinWidth(80);
        sidePanel.setPrefWidth(140);
        sidePanel.setMaxWidth(250);

        mainSplit.getItems().addAll(fileTreePane, tabManager);
        SplitPane.setResizableWithParent(fileTreePane, false);

        // Restore layout from saved settings
        sidebarVisible = settings.sidebarVisible;
        rightPanelVisible = settings.rightPanelVisible;
        savedDividerPos = settings.splitDivider0;

        if (!sidebarVisible) {
            mainSplit.getItems().remove(fileTreePane);
        }
        if (rightPanelVisible) {
            mainSplit.getItems().add(sidePanel);
            SplitPane.setResizableWithParent(sidePanel, false);
        }

        // Apply saved divider positions after layout is rendered
        javafx.application.Platform.runLater(() -> {
            if (sidebarVisible && rightPanelVisible) {
                mainSplit.setDividerPositions(settings.splitDivider0, settings.splitDivider1);
            } else if (sidebarVisible) {
                mainSplit.setDividerPositions(settings.splitDivider0);
            } else if (rightPanelVisible) {
                mainSplit.setDividerPositions(settings.splitDivider1);
            }
        });

        statusBar = new HBox(10);
        statusBar.getStyleClass().add("status-bar");
        statusBar.getChildren().addAll(statusLabel,
                new Separator(), cursorPosLabel,
                new Separator(), statsLabel,
                new Separator(), encodingLabel,
                new Separator(), modeLabel);
        HBox.setHgrow(statusLabel, Priority.ALWAYS);

        // #46 Make mode label clickable for language selection
        modeLabel.setOnMouseClicked(e -> showLanguageSelector());
        modeLabel.setTooltip(new Tooltip("Click to change language"));
        modeLabel.setCursor(javafx.scene.Cursor.HAND);

        // #39 Make encoding label clickable for encoding selection
        encodingLabel.setOnMouseClicked(e -> showEncodingSelector());
        encodingLabel.setTooltip(new Tooltip("Click to change encoding"));
        encodingLabel.setCursor(javafx.scene.Cursor.HAND);

        // #48 Status bar copy on click (exclude modeLabel and encodingLabel which have custom handlers)
        for (Label label : List.of(statusLabel, cursorPosLabel, statsLabel)) {
            label.setTooltip(new Tooltip("Click to copy"));
            label.setCursor(javafx.scene.Cursor.HAND);
            label.setOnMouseClicked(e -> {
                String text = label.getText();
                if (text != null && !text.isEmpty()) {
                    ClipboardContent cc = new ClipboardContent();
                    cc.putString(text);
                    Clipboard.getSystemClipboard().setContent(cc);
                    String original = label.getText();
                    label.setText("Copied!");
                    javafx.animation.PauseTransition pt = new javafx.animation.PauseTransition(javafx.util.Duration.millis(800));
                    pt.setOnFinished(ev -> label.setText(original));
                    pt.play();
                }
            });
        }

        setCenter(mainSplit);
        setBottom(statusBar);
    }

    // --- Menu ---

    private void setupMenuBar() {
        MenuBar menuBar = new MenuBar();
        // macOS 시스템 메뉴바에 노출
        menuBar.setUseSystemMenuBar(true);

        // Folio 앱 메뉴 (Settings 포함)
        Menu appMenu = new Menu("Folio");
        MenuItem prefsItem = new MenuItem("Settings...");
        prefsItem.setAccelerator(new KeyCodeCombination(KeyCode.COMMA, KeyCombination.META_DOWN));
        prefsItem.setOnAction(e -> showSettingsDialog());
        appMenu.getItems().add(prefsItem);

        menuBar.getMenus().addAll(appMenu, buildFileMenu(), buildEditMenu(), buildViewMenu(), buildMarkdownMenu());

        // 아이콘 툴바 생성
        ToolBar toolBar = createToolBar();
        toolBar.getStyleClass().add("icon-toolbar");

        javafx.scene.layout.VBox topContainer = new javafx.scene.layout.VBox(menuBar, toolBar);
        setTop(topContainer);
    }

    private ToolBar createToolBar() {
        // --- File ---
        Button newBtn = toolBtn("\uD83D\uDCC4", "New File (⌘N)", e -> fileOps.newFile());
        Button openBtn = toolBtn("\uD83D\uDCC2", "Open File (⌘O)", e -> fileOps.openFile());
        Button saveBtn = toolBtn("\uD83D\uDCBE", "Save (⌘S)", e -> fileOps.saveFile());

        // --- Edit ---
        Button undoBtn = toolBtn("↩", "Undo (⌘Z)", e -> withEditor(ep -> ep.undo()));
        Button redoBtn = toolBtn("↪", "Redo (⌘⇧Z)", e -> withEditor(ep -> ep.redo()));
        Button cutBtn = toolBtn("✂", "Cut (⌘X)", e -> withEditor(ep -> ep.cut()));
        Button copyBtn = toolBtn("\uD83D\uDCCB", "Copy (⌘C)", e -> withEditor(ep -> ep.copy()));
        Button pasteBtn = toolBtn("\uD83D\uDCCE", "Paste (⌘V)", e -> withEditor(ep -> ep.paste()));

        // --- Search ---
        Button findBtn = toolBtn("\uD83D\uDD0D", "Find (⌘F)", e -> tabManager.showFindBar());
        Button searchBtn = toolBtn("\uD83D\uDD0E", "Search in Project (⌘⇧F)", e -> showProjectSearch());

        // --- View ---
        Button sidebarBtn = toolBtn("\uD83D\uDCC1", "Toggle Sidebar (⌘B)", e -> toggleSidebar());
        Button outlineBtn = toolBtn("\u2630", "Toggle Outline (⌘⇧O)", e -> tabManager.toggleOutline());
        Button zenBtn = toolBtn("\u26F6", "Zen Mode", e -> toggleZenMode());

        // --- Markdown ---
        Button boldBtn = toolBtn("B", "Bold (⌘B)", e -> withEditor(ep -> {
            var ca = ep.getCodeArea();
            String sel = ca.getSelectedText();
            if (!sel.isEmpty()) ca.replaceSelection("**" + sel + "**");
        }));
        boldBtn.setStyle(boldBtn.getStyle() + "-fx-font-weight: bold;");
        Button italicBtn = toolBtn("I", "Italic (⌘I)", e -> withEditor(ep -> {
            var ca = ep.getCodeArea();
            String sel = ca.getSelectedText();
            if (!sel.isEmpty()) ca.replaceSelection("*" + sel + "*");
        }));
        italicBtn.setStyle(italicBtn.getStyle() + "-fx-font-style: italic;");
        Button tocBtn = toolBtn("\u2261", "Insert TOC", e -> {
            var ep = tabManager.getActiveEditorPane();
            if (ep != null) {
                String toc = com.folio.editor.MarkdownUtils.generateTOC(ep.getText());
                ep.getCodeArea().insertText(ep.getCodeArea().getCaretPosition(), toc);
            }
        });
        Button tableBtn = toolBtn("\u25A6", "Insert Table", e -> {
            var ep = tabManager.getActiveEditorPane();
            if (ep != null) {
                com.folio.editor.TableEditorDialog dlg = new com.folio.editor.TableEditorDialog();
                dlg.initOwner(stage);
                dlg.showAndWait().ifPresent(md -> ep.getCodeArea().insertText(ep.getCodeArea().getCaretPosition(), md));
            }
        });

        // --- Git ---
        Button gitBtn = toolBtn("\u2442", "Git Panel", e -> toggleGitPanel());

        // --- Settings ---
        Button settingsBtn = toolBtn("\u2699", "Settings (⌘,)", e -> showSettingsDialog());

        return new ToolBar(
                newBtn, openBtn, saveBtn,
                new Separator(),
                undoBtn, redoBtn, cutBtn, copyBtn, pasteBtn,
                new Separator(),
                findBtn, searchBtn,
                new Separator(),
                sidebarBtn, outlineBtn, zenBtn,
                new Separator(),
                boldBtn, italicBtn, tocBtn, tableBtn,
                new Separator(),
                gitBtn,
                new Separator(),
                settingsBtn
        );
    }

    private Button toolBtn(String icon, String tooltip, javafx.event.EventHandler<javafx.event.ActionEvent> handler) {
        Button btn = new Button(icon);
        btn.getStyleClass().add("toolbar-btn");
        btn.setTooltip(new Tooltip(tooltip));
        btn.setOnAction(handler);
        btn.setFocusTraversable(false);
        return btn;
    }

    private Menu buildFileMenu() {
        Menu menu = new Menu("File");

        // #5 Recent Files submenu
        Menu recentMenu = new Menu("Recent Files");
        buildRecentFilesMenu(recentMenu);

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
                recentMenu,
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
                // #22 Project-wide search
                menuItem("Search in Project...", KeyCode.F, e -> showProjectSearch(),
                        KeyCombination.META_DOWN, KeyCombination.SHIFT_DOWN),
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

        // #6 Toggle Sidebar
        CheckMenuItem sidebarItem = new CheckMenuItem("Toggle Sidebar");
        sidebarItem.setSelected(sidebarVisible);
        sidebarItem.setAccelerator(new KeyCodeCombination(KeyCode.B, KeyCombination.META_DOWN));
        sidebarItem.setOnAction(e -> toggleSidebar());

        // #7 Toggle Right Panel
        CheckMenuItem rightPanelItem = new CheckMenuItem("Toggle Right Panel");
        rightPanelItem.setSelected(rightPanelVisible);
        rightPanelItem.setAccelerator(new KeyCodeCombination(KeyCode.B,
                KeyCombination.META_DOWN, KeyCombination.SHIFT_DOWN));
        rightPanelItem.setOnAction(e -> toggleRightPanel());

        // #33 Zen Mode
        MenuItem zenModeItem = menuItem("Zen Mode", KeyCode.F11, e -> toggleZenMode(),
                KeyCombination.META_DOWN);

        // #25 Outline toggle
        CheckMenuItem outlineItem = new CheckMenuItem("Toggle Outline");
        outlineItem.setAccelerator(new KeyCodeCombination(KeyCode.O,
                KeyCombination.META_DOWN, KeyCombination.SHIFT_DOWN));
        outlineItem.setOnAction(e -> tabManager.toggleOutline());

        // #28 Git Panel toggle
        CheckMenuItem gitPanelItem = new CheckMenuItem("Git Panel");
        gitPanelItem.setSelected(gitPanelVisible);
        gitPanelItem.setOnAction(e -> toggleGitPanel());

        menu.getItems().addAll(
                modeMenu, themeMenu, new SeparatorMenuItem(),
                minimapItem, sidebarItem, rightPanelItem, outlineItem,
                new SeparatorMenuItem(),
                gitPanelItem,
                new SeparatorMenuItem(),
                zenModeItem,
                new SeparatorMenuItem(),
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

    // --- Markdown menu (#31, #30) ---

    private Menu buildMarkdownMenu() {
        Menu menu = new Menu("Markdown");
        menu.getItems().addAll(
                menuItem("Insert Table of Contents", null, null, e -> insertTOC()),
                menuItem("Insert Table...", null, null, e -> showTableEditor()),
                new SeparatorMenuItem(),
                menuItem("Bold", null, null, e -> withEditor(ep -> {
                    if (ep.getCodeArea().getSelectedText().isEmpty()) return;
                    int s = ep.getCodeArea().getSelection().getStart();
                    int en = ep.getCodeArea().getSelection().getEnd();
                    String sel = ep.getCodeArea().getSelectedText();
                    ep.getCodeArea().replaceText(s, en, "**" + sel + "**");
                })),
                menuItem("Italic", null, null, e -> withEditor(ep -> {
                    if (ep.getCodeArea().getSelectedText().isEmpty()) return;
                    int s = ep.getCodeArea().getSelection().getStart();
                    int en = ep.getCodeArea().getSelection().getEnd();
                    String sel = ep.getCodeArea().getSelectedText();
                    ep.getCodeArea().replaceText(s, en, "*" + sel + "*");
                })),
                menuItem("Insert Link", null, null, e -> withEditor(ep -> {
                    int pos = ep.getCodeArea().getCaretPosition();
                    ep.getCodeArea().insertText(pos, "[](url)");
                }))
        );
        return menu;
    }

    private void insertTOC() {
        var ep = tabManager.getActiveEditorPane();
        if (ep == null) return;
        String text = ep.getText();
        String toc = MarkdownUtils.generateTOC(text);
        int pos = ep.getCodeArea().getCaretPosition();
        ep.getCodeArea().insertText(pos, toc + "\n");
    }

    private void showTableEditor() {
        TableEditorDialog dialog = new TableEditorDialog();
        dialog.initOwner(stage);
        dialog.showAndWait().ifPresent(tableMarkdown -> {
            var ep = tabManager.getActiveEditorPane();
            if (ep != null) {
                int pos = ep.getCodeArea().getCaretPosition();
                ep.getCodeArea().insertText(pos, tableMarkdown);
            }
        });
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
                // #27 Load diff markers for the active file
                loadDiffMarkers(ep);
            }
            // Update side panel
            if (rightPanelVisible) {
                sidePanel.updateOpenFiles(tabManager.getOpenFilePaths());
                sidePanel.updateRecentFiles(settings.recentFiles);
            }
        });
    }

    // #27 Load gutter diff markers for an editor pane
    private void loadDiffMarkers(com.folio.editor.EditorPane ep) {
        Path projectRoot = fileOps.getCurrentProjectRoot();
        EditorDocument doc = tabManager.getActiveDocument();
        if (projectRoot == null || doc == null || doc.getFilePath() == null) return;
        Thread t = new Thread(() -> {
            GitService gitService = new GitService(projectRoot);
            if (gitService.isGitRepository()) {
                var hunks = gitService.getDiff(doc.getFilePath());
                javafx.application.Platform.runLater(() -> ep.setDiffMarkers(hunks));
            }
        }, "git-diff");
        t.setDaemon(true);
        t.start();
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
                        onProjectRootChanged(path);
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
            encodingLabel.setText("");
            return;
        }

        statusLabel.setText(doc.getFilePath() != null ? doc.getFilePath().toString() : "Untitled");
        encodingLabel.setText(doc.getEncoding());

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

    // --- Auto-save (#38) ---

    private void setupAutoSave() {
        autoSaveTimeline = new Timeline(new KeyFrame(
                Duration.seconds(settings.autoSaveInterval), e -> {
            if (settings.autoSave) {
                fileOps.autoSaveAll();
            }
        }));
        autoSaveTimeline.setCycleCount(Timeline.INDEFINITE);
        if (settings.autoSave) {
            autoSaveTimeline.play();
        }
    }

    public void updateAutoSave() {
        if (autoSaveTimeline != null) {
            autoSaveTimeline.stop();
        }
        if (settings.autoSave) {
            autoSaveTimeline = new Timeline(new KeyFrame(
                    Duration.seconds(settings.autoSaveInterval), e -> fileOps.autoSaveAll()));
            autoSaveTimeline.setCycleCount(Timeline.INDEFINITE);
            autoSaveTimeline.play();
        }
    }

    // --- Language selector (#46) ---

    private void showLanguageSelector() {
        var ep = tabManager.getActiveEditorPane();
        if (ep == null) return;

        ContextMenu popup = new ContextMenu();
        // Plain text option
        MenuItem plainText = new MenuItem("Plain Text");
        plainText.setOnAction(e -> {
            ep.setFileExtension("");
            updateStatusBar();
        });
        popup.getItems().add(plainText);
        popup.getItems().add(new SeparatorMenuItem());

        // All supported languages sorted
        TreeSet<String> extensions = new TreeSet<>(SyntaxHighlightEngine.getSupportedExtensions());
        for (String ext : extensions) {
            String langName = SyntaxHighlightEngine.detectLanguage(ext);
            MenuItem item = new MenuItem(langName + " (." + ext + ")");
            item.setOnAction(e -> {
                ep.setFileExtension(ext);
                updateStatusBar();
            });
            popup.getItems().add(item);
        }

        popup.show(modeLabel, Side.TOP, 0, 0);
    }

    // --- Encoding selector (#39) ---

    private void showEncodingSelector() {
        EditorDocument doc = tabManager.getActiveDocument();
        if (doc == null) return;

        ContextMenu popup = new ContextMenu();
        String[] encodings = {"UTF-8", "UTF-16", "ISO-8859-1", "US-ASCII", "EUC-KR", "Shift_JIS", "GB2312", "Big5"};
        for (String enc : encodings) {
            MenuItem item = new MenuItem(enc);
            if (enc.equals(doc.getEncoding())) {
                item.setStyle("-fx-font-weight: bold;");
            }
            item.setOnAction(e -> {
                doc.setEncoding(enc);
                encodingLabel.setText(enc);
            });
            popup.getItems().add(item);
        }

        popup.show(encodingLabel, Side.TOP, 0, 0);
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
        items.add(new QuickAccessDialog.Item("Toggle Sidebar", "View", this::toggleSidebar));
        items.add(new QuickAccessDialog.Item("Toggle Right Panel", "View", this::toggleRightPanel));
        items.add(new QuickAccessDialog.Item("Zen Mode", "View", this::toggleZenMode));
        items.add(new QuickAccessDialog.Item("Search in Project...", "Edit", this::showProjectSearch));
        items.add(new QuickAccessDialog.Item("Toggle Outline", "View", tabManager::toggleOutline));
        items.add(new QuickAccessDialog.Item("Git Panel", "View", this::toggleGitPanel));
        items.add(new QuickAccessDialog.Item("Toggle Bookmark", "Edit", () -> withEditor(ep -> ep.toggleBookmark(ep.getCodeArea().getCurrentParagraph()))));
        items.add(new QuickAccessDialog.Item("Next Bookmark", "Edit", () -> withEditor(EditorPane::goToNextBookmark)));
        items.add(new QuickAccessDialog.Item("Preferences...", "Edit", this::showSettingsDialog));
        quickAccessDialog.show(stage, "Command Palette", items);
    }

    private void showQuickOpen() {
        Path root = fileOps.getCurrentProjectRoot();
        if (root == null) { fileOps.openFile(); return; }
        var items = new java.util.ArrayList<QuickAccessDialog.Item>();
        fileOps.collectFiles(root, items, 0, 500);
        quickAccessDialog.show(stage, "Quick Open \u2014 " + root.getFileName(), items);
    }

    // #22 Project-wide search
    private void showProjectSearch() {
        Path root = fileOps.getCurrentProjectRoot();
        if (root == null) return;
        projectSearchDialog.show(stage, root);
    }

    // --- Panel toggles ---

    // #28 Git Panel toggle
    private void toggleGitPanel() {
        gitPanelVisible = !gitPanelVisible;
        if (gitPanelVisible) {
            mainSplit.getItems().add(gitPanel);
            SplitPane.setResizableWithParent(gitPanel, false);
            gitPanel.setProjectRoot(fileOps.getCurrentProjectRoot());
        } else {
            mainSplit.getItems().remove(gitPanel);
        }
    }

    private void toggleSidebar() {
        if (sidebarVisible) {
            savedDividerPos = mainSplit.getDividerPositions()[0];
            mainSplit.getItems().remove(fileTreePane);
        } else {
            mainSplit.getItems().add(0, fileTreePane);
            SplitPane.setResizableWithParent(fileTreePane, false);
            mainSplit.setDividerPositions(savedDividerPos);
        }
        sidebarVisible = !sidebarVisible;
        settings.sidebarVisible = sidebarVisible;
    }

    private void toggleRightPanel() {
        if (rightPanelVisible) {
            mainSplit.getItems().remove(sidePanel);
        } else {
            mainSplit.getItems().add(sidePanel);
            SplitPane.setResizableWithParent(sidePanel, false);
        }
        rightPanelVisible = !rightPanelVisible;
        settings.rightPanelVisible = rightPanelVisible;
        if (rightPanelVisible) {
            sidePanel.updateOpenFiles(tabManager.getOpenFilePaths());
            sidePanel.updateRecentFiles(settings.recentFiles);
        }
    }

    private void toggleZenMode() {
        zenMode = !zenMode;
        if (zenMode) {
            // Hide all panels, full screen
            if (sidebarVisible) toggleSidebar();
            if (rightPanelVisible) toggleRightPanel();
            setBottom(null);
            setTop(null);
            stage.setFullScreen(true);
        } else {
            // Restore
            stage.setFullScreen(false);
            setupMenuBar();
            setBottom(statusBar);
            if (!sidebarVisible) toggleSidebar();
        }
    }

    // --- Settings dialog ---

    private void showSettingsDialog() {
        SettingsDialog dialog = new SettingsDialog(settings);
        dialog.initOwner(stage);
        dialog.showAndWait().ifPresent(result -> {
            themeManager.setTheme(settings.darkTheme, getScene());
            applyEditorSettings();
            updateAutoSave();
            settings.save();
        });
    }

    public void applyEditorSettings() {
        tabManager.applySettings(settings);
    }

    // --- Recent files ---

    private void buildRecentFilesMenu(Menu menu) {
        this.recentFilesMenu = menu;
        refreshRecentFilesMenu();
    }

    private void refreshRecentFilesMenu() {
        recentFilesMenu.getItems().clear();
        if (settings.recentFiles.isEmpty()) {
            MenuItem empty = new MenuItem("(No recent files)");
            empty.setDisable(true);
            recentFilesMenu.getItems().add(empty);
        } else {
            for (String filePath : settings.recentFiles) {
                Path p = Path.of(filePath);
                MenuItem item = new MenuItem(p.getFileName().toString());
                item.setOnAction(e -> {
                    if (Files.exists(p)) fileOps.openFilePath(p);
                });
                item.setMnemonicParsing(false);
                Tooltip.install(item.getGraphic(), new Tooltip(filePath));
                recentFilesMenu.getItems().add(item);
            }
            recentFilesMenu.getItems().add(new SeparatorMenuItem());
            MenuItem clearItem = new MenuItem("Clear Recent Files");
            clearItem.setOnAction(e -> {
                settings.recentFiles.clear();
                refreshRecentFilesMenu();
            });
            recentFilesMenu.getItems().add(clearItem);
        }
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
        s.sidebarVisible = sidebarVisible;
        s.rightPanelVisible = rightPanelVisible;
        s.gitPanelVisible = gitPanelVisible;

        // Save divider positions
        double[] dividers = mainSplit.getDividerPositions();
        if (sidebarVisible && rightPanelVisible && dividers.length >= 2) {
            s.splitDivider0 = dividers[0];
            s.splitDivider1 = dividers[1];
        } else if (sidebarVisible && dividers.length >= 1) {
            s.splitDivider0 = dividers[0];
        } else if (rightPanelVisible && dividers.length >= 1) {
            s.splitDivider1 = dividers[0];
        }

        Path root = fileOps.getCurrentProjectRoot();
        if (root != null) s.lastProjectPath = root.toAbsolutePath().toString();
    }

    public void restoreSession() {
        if (!settings.lastProjectPath.isEmpty()) {
            Path projectPath = Path.of(settings.lastProjectPath);
            if (Files.isDirectory(projectPath)) {
                fileOps.setProjectRoot(projectPath);
                onProjectRootChanged(projectPath);
            }
        }
        for (String filePath : settings.openFiles) {
            Path path = Path.of(filePath);
            if (Files.exists(path)) fileOps.openFilePath(path);
        }
    }

    /**
     * Called when the project root is set/changed.
     * Wires breadcrumb bar, git panel, and git status in file tree.
     */
    private void onProjectRootChanged(Path root) {
        // #23 Breadcrumb
        tabManager.setProjectRoot(root);
        // #28 Git panel
        if (gitPanelVisible) {
            gitPanel.setProjectRoot(root);
        }
    }
}
