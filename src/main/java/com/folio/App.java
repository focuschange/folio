package com.folio;

import com.folio.model.EditorSettings;
import javafx.application.Application;
import javafx.scene.Scene;
import javafx.stage.Stage;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

public class App extends Application {

    private MainController mainController;
    private EditorSettings settings;

    @Override
    public void start(Stage primaryStage) {
        settings = EditorSettings.load();

        primaryStage.setTitle("Folio");
        primaryStage.setMinWidth(800);
        primaryStage.setMinHeight(600);

        mainController = new MainController(primaryStage, settings);

        double width = settings.windowWidth > 0 ? settings.windowWidth : 1200;
        double height = settings.windowHeight > 0 ? settings.windowHeight : 800;
        Scene scene = new Scene(mainController, width, height);
        primaryStage.setScene(scene);

        // Restore window position
        if (settings.windowX >= 0 && settings.windowY >= 0) {
            primaryStage.setX(settings.windowX);
            primaryStage.setY(settings.windowY);
        }
        if (settings.maximized) {
            primaryStage.setMaximized(true);
        }

        mainController.applyInitialTheme();
        primaryStage.show();

        // Open files from command-line arguments
        var params = getParameters().getRaw();
        if (!params.isEmpty()) {
            for (String arg : params) {
                Path path = Paths.get(arg);
                if (Files.exists(path)) {
                    mainController.openFileFromPath(path);
                }
            }
        } else {
            // Restore session: project and open files
            mainController.restoreSession();
        }

        // macOS: handle files opened via Dock drag or Finder "Open With"
        setupMacOSOpenFileHandler(primaryStage);

        // Save settings on close
        primaryStage.setOnCloseRequest(event -> saveAndExit(primaryStage));
    }

    private void saveAndExit(Stage primaryStage) {
        settings.windowX = primaryStage.getX();
        settings.windowY = primaryStage.getY();
        settings.windowWidth = primaryStage.getWidth();
        settings.windowHeight = primaryStage.getHeight();
        settings.maximized = primaryStage.isMaximized();
        mainController.saveSession(settings);
        settings.save();
    }

    private void setupMacOSOpenFileHandler(Stage primaryStage) {
        try {
            // Use java.awt.Desktop for macOS file open events
            if (java.awt.Desktop.isDesktopSupported()) {
                java.awt.Desktop desktop = java.awt.Desktop.getDesktop();
                desktop.setOpenFileHandler(e -> {
                    for (java.io.File file : e.getFiles()) {
                        javafx.application.Platform.runLater(() ->
                                mainController.openFileFromPath(file.toPath()));
                    }
                });
                desktop.setAboutHandler(e -> {
                    javafx.application.Platform.runLater(() -> {
                        javafx.scene.control.Alert about = new javafx.scene.control.Alert(
                                javafx.scene.control.Alert.AlertType.INFORMATION);
                        about.setTitle("About Folio");
                        about.setHeaderText("Folio 1.0.0");
                        about.setContentText("A modern text editor with Markdown support.\n\n"
                                + "Features:\n"
                                + "- Syntax highlighting (13+ languages)\n"
                                + "- Markdown live preview with WYSIWYG mode\n"
                                + "- Code minimap, Find & Replace\n"
                                + "- Command Palette, Quick Open\n"
                                + "- Dark / Light themes");
                        about.showAndWait();
                    });
                });
                desktop.setQuitHandler((e, response) -> {
                    javafx.application.Platform.runLater(() -> {
                        saveAndExit(primaryStage);
                        javafx.application.Platform.exit();
                    });
                    response.performQuit();
                });
            }
        } catch (Exception e) {
            // Not on macOS or Desktop not supported — ignore
        }
    }

    public static void main(String[] args) {
        System.setProperty("apple.laf.useScreenMenuBar", "true");
        System.setProperty("com.apple.mrj.application.apple.menu.about.name", "Folio");
        launch(args);
    }
}
