package com.folio.terminal;

import javafx.application.Platform;
import javafx.geometry.Insets;
import javafx.scene.control.Label;
import javafx.scene.control.TextArea;
import javafx.scene.control.TextField;
import javafx.scene.input.KeyCode;
import javafx.scene.layout.*;

import java.io.*;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

/**
 * Integrated terminal pane using TextArea and ProcessBuilder.
 * Runs commands and displays output. Toggle with Ctrl+`.
 * Placed in the bottom panel.
 */
public class TerminalPane extends VBox {

    private final TextArea outputArea;
    private final TextField inputField;
    private final Label promptLabel;
    private Path workingDirectory;
    private Process currentProcess;
    private final List<String> commandHistory = new ArrayList<>();
    private int historyIndex = -1;
    private boolean visible = false;

    public TerminalPane() {
        getStyleClass().add("terminal-pane");
        setSpacing(0);
        setPadding(new Insets(0));
        setMinHeight(150);
        setPrefHeight(200);

        // Header
        HBox header = new HBox(10);
        header.setPadding(new Insets(4, 8, 4, 8));
        header.setStyle("-fx-background-color: #2d2d2d; -fx-border-color: #404040; -fx-border-width: 0 0 1 0;");

        Label titleLabel = new Label("Terminal");
        titleLabel.setStyle("-fx-text-fill: #cccccc; -fx-font-weight: bold; -fx-font-size: 12px;");

        Label closeLabel = new Label("x");
        closeLabel.setStyle("-fx-text-fill: #999999; -fx-cursor: hand; -fx-font-size: 12px;");
        closeLabel.setOnMouseClicked(e -> toggleVisibility());

        Region spacer = new Region();
        HBox.setHgrow(spacer, Priority.ALWAYS);
        header.getChildren().addAll(titleLabel, spacer, closeLabel);

        // Output area
        outputArea = new TextArea();
        outputArea.setEditable(false);
        outputArea.setWrapText(true);
        outputArea.setStyle(
                "-fx-control-inner-background: #1e1e1e; "
                + "-fx-text-fill: #cccccc; "
                + "-fx-font-family: 'Menlo', 'Monaco', 'Consolas', monospace; "
                + "-fx-font-size: 13px; "
                + "-fx-highlight-fill: #264f78;"
        );
        VBox.setVgrow(outputArea, Priority.ALWAYS);

        // Input field with prompt
        promptLabel = new Label("$ ");
        promptLabel.setStyle(
                "-fx-text-fill: #4ec9b0; "
                + "-fx-font-family: 'Menlo', 'Monaco', monospace; "
                + "-fx-font-size: 13px; "
                + "-fx-padding: 4 0 4 8;"
        );

        inputField = new TextField();
        inputField.setStyle(
                "-fx-background-color: #1e1e1e; "
                + "-fx-text-fill: #cccccc; "
                + "-fx-font-family: 'Menlo', 'Monaco', 'Consolas', monospace; "
                + "-fx-font-size: 13px; "
                + "-fx-border-color: #404040; "
                + "-fx-border-width: 1 0 0 0;"
        );
        inputField.setPromptText("Enter command...");
        HBox.setHgrow(inputField, Priority.ALWAYS);

        inputField.setOnKeyPressed(event -> {
            if (event.getCode() == KeyCode.ENTER) {
                executeCommand(inputField.getText().trim());
                inputField.clear();
                event.consume();
            } else if (event.getCode() == KeyCode.UP) {
                navigateHistory(-1);
                event.consume();
            } else if (event.getCode() == KeyCode.DOWN) {
                navigateHistory(1);
                event.consume();
            } else if (event.getCode() == KeyCode.C && event.isControlDown()) {
                interruptProcess();
                event.consume();
            }
        });

        HBox inputBar = new HBox(promptLabel, inputField);
        inputBar.setStyle("-fx-background-color: #1e1e1e;");
        inputBar.setAlignment(javafx.geometry.Pos.CENTER_LEFT);

        getChildren().addAll(header, outputArea, inputBar);

        // Default working directory
        workingDirectory = Path.of(System.getProperty("user.dir"));

        appendOutput("Terminal ready. Working directory: " + workingDirectory + "\n");
    }

    /**
     * Execute a command string.
     */
    public void executeCommand(String command) {
        if (command.isEmpty()) return;

        // Add to history
        commandHistory.add(command);
        historyIndex = commandHistory.size();

        appendOutput("$ " + command + "\n");

        // Handle built-in commands
        if (command.equals("clear") || command.equals("cls")) {
            outputArea.clear();
            return;
        }

        if (command.startsWith("cd ")) {
            handleCd(command.substring(3).trim());
            return;
        }

        if (command.equals("pwd")) {
            appendOutput(workingDirectory.toString() + "\n");
            return;
        }

        // Execute external command
        Thread execThread = new Thread(() -> {
            try {
                ProcessBuilder pb = new ProcessBuilder();

                // Use shell to handle pipes, redirects, etc.
                String os = System.getProperty("os.name").toLowerCase();
                if (os.contains("win")) {
                    pb.command("cmd", "/c", command);
                } else {
                    pb.command("/bin/sh", "-c", command);
                }

                pb.directory(workingDirectory.toFile());
                pb.redirectErrorStream(true);

                currentProcess = pb.start();

                try (BufferedReader reader = new BufferedReader(
                        new InputStreamReader(currentProcess.getInputStream()))) {
                    String line;
                    while ((line = reader.readLine()) != null) {
                        final String output = line;
                        Platform.runLater(() -> appendOutput(output + "\n"));
                    }
                }

                int exitCode = currentProcess.waitFor();
                if (exitCode != 0) {
                    Platform.runLater(() -> appendOutput("[Exit code: " + exitCode + "]\n"));
                }

            } catch (IOException e) {
                Platform.runLater(() -> appendOutput("Error: " + e.getMessage() + "\n"));
            } catch (InterruptedException e) {
                Platform.runLater(() -> appendOutput("[Interrupted]\n"));
                Thread.currentThread().interrupt();
            } finally {
                currentProcess = null;
            }
        });

        execThread.setDaemon(true);
        execThread.start();
    }

    private void handleCd(String path) {
        Path newDir;
        if (path.equals("~")) {
            newDir = Path.of(System.getProperty("user.home"));
        } else if (path.startsWith("/") || path.startsWith("~")) {
            newDir = Path.of(path.replace("~", System.getProperty("user.home")));
        } else {
            newDir = workingDirectory.resolve(path).normalize();
        }

        if (java.nio.file.Files.isDirectory(newDir)) {
            workingDirectory = newDir;
            appendOutput("Changed directory to: " + workingDirectory + "\n");
        } else {
            appendOutput("cd: no such directory: " + path + "\n");
        }
    }

    private void interruptProcess() {
        if (currentProcess != null && currentProcess.isAlive()) {
            currentProcess.destroyForcibly();
            appendOutput("\n[Process interrupted]\n");
        }
    }

    private void navigateHistory(int direction) {
        if (commandHistory.isEmpty()) return;

        historyIndex += direction;
        if (historyIndex < 0) historyIndex = 0;
        if (historyIndex >= commandHistory.size()) {
            historyIndex = commandHistory.size();
            inputField.clear();
            return;
        }

        inputField.setText(commandHistory.get(historyIndex));
        inputField.positionCaret(inputField.getText().length());
    }

    private void appendOutput(String text) {
        outputArea.appendText(text);
        outputArea.setScrollTop(Double.MAX_VALUE);
    }

    /**
     * Toggle terminal visibility.
     */
    public void toggleVisibility() {
        visible = !visible;
        setVisible(visible);
        setManaged(visible);
        if (visible) {
            inputField.requestFocus();
        }
    }

    public boolean isTerminalVisible() {
        return visible;
    }

    /**
     * Set the working directory for the terminal.
     */
    public void setWorkingDirectory(Path path) {
        if (path != null && java.nio.file.Files.isDirectory(path)) {
            this.workingDirectory = path;
        }
    }

    /**
     * Get the current working directory.
     */
    public Path getWorkingDirectory() {
        return workingDirectory;
    }

    /**
     * Focus the input field.
     */
    public void focusInput() {
        inputField.requestFocus();
    }
}
