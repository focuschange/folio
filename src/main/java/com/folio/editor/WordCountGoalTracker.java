package com.folio.editor;

import javafx.scene.control.Label;

/**
 * Tracks word count progress toward a goal.
 * If a word count goal > 0 is set, displays progress in status bar:
 * "245/1000 words (24.5%)"
 */
public class WordCountGoalTracker {

    private int goal = 0;

    public WordCountGoalTracker() {
    }

    /**
     * Set the word count goal.
     * @param goal target word count (0 to disable)
     */
    public void setGoal(int goal) {
        this.goal = Math.max(0, goal);
    }

    /**
     * Get the current goal.
     */
    public int getGoal() {
        return goal;
    }

    /**
     * Check if a goal is active.
     */
    public boolean hasGoal() {
        return goal > 0;
    }

    /**
     * Count words in the given text.
     */
    public static int countWords(String text) {
        if (text == null || text.isBlank()) return 0;
        return (int) java.util.Arrays.stream(text.split("\\s+"))
                .filter(s -> !s.isEmpty())
                .count();
    }

    /**
     * Format the word count progress string for the status bar.
     * Returns null if no goal is set.
     *
     * @param currentText the current document text
     * @return formatted progress string, or null if no goal
     */
    public String formatProgress(String currentText) {
        if (goal <= 0) return null;

        int wordCount = countWords(currentText);
        double percent = (double) wordCount / goal * 100.0;
        percent = Math.min(percent, 999.9); // Cap display

        return String.format("%d/%d words (%.1f%%)", wordCount, goal, percent);
    }

    /**
     * Get the progress ratio (0.0 to 1.0+).
     */
    public double getProgress(String currentText) {
        if (goal <= 0) return 0.0;
        int wordCount = countWords(currentText);
        return (double) wordCount / goal;
    }

    /**
     * Check if the goal has been reached.
     */
    public boolean isGoalReached(String currentText) {
        if (goal <= 0) return false;
        return countWords(currentText) >= goal;
    }

    /**
     * Update a label with the current progress.
     */
    public void updateLabel(Label label, String currentText) {
        if (label == null) return;

        String progress = formatProgress(currentText);
        if (progress != null) {
            label.setText(progress);

            // Color coding: green when reached, yellow when close, default otherwise
            double ratio = getProgress(currentText);
            if (ratio >= 1.0) {
                label.setStyle("-fx-text-fill: #4ec9b0;"); // green
            } else if (ratio >= 0.8) {
                label.setStyle("-fx-text-fill: #e5c07b;"); // yellow
            } else {
                label.setStyle(""); // default
            }
        } else {
            label.setText("");
            label.setStyle("");
        }
    }
}
