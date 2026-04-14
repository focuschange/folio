package com.folio.git;

import javafx.application.Platform;
import javafx.geometry.Insets;
import javafx.scene.control.*;
import javafx.scene.layout.*;

import java.nio.file.Path;
import java.util.List;

/**
 * #28 Simple Git commands UI panel.
 * Provides buttons for git add, commit, push, pull and shows recent commits.
 */
public class GitPanel extends BorderPane {

    private GitService gitService;
    private final TextField commitMessageField;
    private final ListView<String> commitList;
    private final Label branchLabel;
    private final Label statusLabel;
    private final TextArea outputArea;

    public GitPanel() {
        setPrefWidth(250);
        setMinWidth(150);
        getStyleClass().add("git-panel");

        // Header
        Label header = new Label("GIT");
        header.getStyleClass().add("side-panel-header");
        header.setPadding(new Insets(8, 8, 4, 8));

        branchLabel = new Label("Branch: -");
        branchLabel.getStyleClass().add("git-branch-label");
        branchLabel.setPadding(new Insets(2, 8, 4, 8));

        // Commit section
        commitMessageField = new TextField();
        commitMessageField.setPromptText("Commit message...");
        commitMessageField.getStyleClass().add("find-field");

        Button addAllBtn = new Button("Stage All");
        addAllBtn.getStyleClass().add("git-btn");
        addAllBtn.setMaxWidth(Double.MAX_VALUE);
        addAllBtn.setOnAction(e -> doGitAdd());

        Button commitBtn = new Button("Commit");
        commitBtn.getStyleClass().add("git-btn");
        commitBtn.setMaxWidth(Double.MAX_VALUE);
        commitBtn.setOnAction(e -> doGitCommit());

        HBox pushPullBox = new HBox(4);
        Button pushBtn = new Button("Push");
        pushBtn.getStyleClass().add("git-btn");
        pushBtn.setMaxWidth(Double.MAX_VALUE);
        HBox.setHgrow(pushBtn, Priority.ALWAYS);
        pushBtn.setOnAction(e -> doGitPush());

        Button pullBtn = new Button("Pull");
        pullBtn.getStyleClass().add("git-btn");
        pullBtn.setMaxWidth(Double.MAX_VALUE);
        HBox.setHgrow(pullBtn, Priority.ALWAYS);
        pullBtn.setOnAction(e -> doGitPull());

        pushPullBox.getChildren().addAll(pushBtn, pullBtn);

        Button refreshBtn = new Button("Refresh");
        refreshBtn.getStyleClass().add("git-btn");
        refreshBtn.setMaxWidth(Double.MAX_VALUE);
        refreshBtn.setOnAction(e -> refreshCommits());

        // Status/output area
        statusLabel = new Label("");
        statusLabel.getStyleClass().add("git-status-label");
        statusLabel.setPadding(new Insets(4, 8, 2, 8));
        statusLabel.setWrapText(true);

        outputArea = new TextArea();
        outputArea.setEditable(false);
        outputArea.setPrefRowCount(3);
        outputArea.setMaxHeight(80);
        outputArea.getStyleClass().add("git-output");

        // Recent commits
        Label commitsHeader = new Label("RECENT COMMITS");
        commitsHeader.getStyleClass().add("side-panel-header");
        commitsHeader.setPadding(new Insets(8, 8, 4, 8));

        commitList = new ListView<>();
        commitList.getStyleClass().add("side-panel-list");

        VBox controls = new VBox(4,
                header, branchLabel,
                new Separator(),
                commitMessageField, addAllBtn, commitBtn, pushPullBox,
                new Separator(),
                statusLabel, outputArea,
                new Separator(),
                commitsHeader, refreshBtn
        );
        controls.setPadding(new Insets(0, 4, 4, 4));

        setTop(controls);
        setCenter(commitList);
    }

    public void setProjectRoot(Path projectRoot) {
        if (projectRoot == null) {
            this.gitService = null;
            branchLabel.setText("Branch: -");
            commitList.getItems().clear();
            return;
        }
        this.gitService = new GitService(projectRoot);
        refreshBranch();
        refreshCommits();
    }

    public void refreshBranch() {
        if (gitService == null) return;
        Thread t = new Thread(() -> {
            String branch = gitService.getCurrentBranch();
            Platform.runLater(() -> branchLabel.setText("Branch: " + branch));
        }, "git-branch");
        t.setDaemon(true);
        t.start();
    }

    public void refreshCommits() {
        if (gitService == null) return;
        Thread t = new Thread(() -> {
            List<String> commits = gitService.getRecentCommits(20);
            Platform.runLater(() -> {
                commitList.getItems().setAll(commits);
            });
        }, "git-log");
        t.setDaemon(true);
        t.start();
    }

    private void doGitAdd() {
        if (gitService == null) return;
        Thread t = new Thread(() -> {
            String result = gitService.gitAdd(".");
            Platform.runLater(() -> {
                outputArea.setText(result);
                statusLabel.setText("Staged all changes");
                refreshCommits();
            });
        }, "git-add");
        t.setDaemon(true);
        t.start();
    }

    private void doGitCommit() {
        if (gitService == null) return;
        String message = commitMessageField.getText();
        if (message == null || message.trim().isEmpty()) {
            statusLabel.setText("Please enter a commit message");
            return;
        }
        Thread t = new Thread(() -> {
            String result = gitService.gitCommit(message.trim());
            Platform.runLater(() -> {
                outputArea.setText(result);
                statusLabel.setText("Committed");
                commitMessageField.clear();
                refreshCommits();
                refreshBranch();
            });
        }, "git-commit");
        t.setDaemon(true);
        t.start();
    }

    private void doGitPush() {
        if (gitService == null) return;
        statusLabel.setText("Pushing...");
        Thread t = new Thread(() -> {
            String result = gitService.gitPush();
            Platform.runLater(() -> {
                outputArea.setText(result);
                statusLabel.setText("Push completed");
            });
        }, "git-push");
        t.setDaemon(true);
        t.start();
    }

    private void doGitPull() {
        if (gitService == null) return;
        statusLabel.setText("Pulling...");
        Thread t = new Thread(() -> {
            String result = gitService.gitPull();
            Platform.runLater(() -> {
                outputArea.setText(result);
                statusLabel.setText("Pull completed");
                refreshCommits();
                refreshBranch();
            });
        }, "git-pull");
        t.setDaemon(true);
        t.start();
    }
}
