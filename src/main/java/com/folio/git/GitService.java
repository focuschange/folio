package com.folio.git;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.file.Path;
import java.util.*;

/**
 * #26 Git service for querying git status, diff, log, and executing commands.
 */
public class GitService {

    private final Path workingDirectory;

    public GitService(Path workingDirectory) {
        this.workingDirectory = workingDirectory;
    }

    /**
     * Check if the working directory is inside a git repository.
     */
    public boolean isGitRepository() {
        try {
            List<String> output = runGitCommand("rev-parse", "--is-inside-work-tree");
            return !output.isEmpty() && "true".equals(output.get(0).trim());
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * #26 Get the git status of all files as a map of relative path to GitStatus.
     */
    public Map<Path, GitStatus> getStatus() {
        Map<Path, GitStatus> statusMap = new HashMap<>();
        try {
            List<String> output = runGitCommand("status", "--porcelain");
            for (String line : output) {
                if (line.length() < 4) continue;
                String statusCode = line.substring(0, 2).trim();
                String filePath = line.substring(3).trim();
                // Handle renames (format: "R  old -> new")
                if (filePath.contains(" -> ")) {
                    filePath = filePath.substring(filePath.indexOf(" -> ") + 4);
                }
                GitStatus status = GitStatus.fromPorcelainCode(statusCode);
                if (status != null) {
                    statusMap.put(Path.of(filePath), status);
                }
            }
        } catch (Exception e) {
            // Not a git repo or git not available
        }
        return statusMap;
    }

    /**
     * #27 Get diff for a specific file. Returns list of changed line ranges.
     * Each DiffHunk contains the start line and count of changed lines.
     */
    public List<DiffHunk> getDiff(Path file) {
        List<DiffHunk> hunks = new ArrayList<>();
        try {
            Path relativePath = workingDirectory.relativize(file);
            List<String> output = runGitCommand("diff", "--unified=0", relativePath.toString());
            for (String line : output) {
                if (line.startsWith("@@")) {
                    // Parse @@ -a,b +c,d @@ format
                    int plusIdx = line.indexOf('+', 2);
                    if (plusIdx < 0) continue;
                    int spaceIdx = line.indexOf(' ', plusIdx);
                    if (spaceIdx < 0) spaceIdx = line.indexOf('@', plusIdx);
                    if (spaceIdx < 0) continue;

                    String range = line.substring(plusIdx + 1, spaceIdx);
                    int startLine;
                    int count;
                    if (range.contains(",")) {
                        String[] parts = range.split(",");
                        startLine = Integer.parseInt(parts[0]);
                        count = Integer.parseInt(parts[1]);
                    } else {
                        startLine = Integer.parseInt(range);
                        count = 1;
                    }

                    // Determine if this is an addition, modification, or deletion
                    // Check the minus part
                    int minusIdx = line.indexOf('-', 2);
                    int minusPlusIdx = line.indexOf('+', minusIdx);
                    String minusRange = line.substring(minusIdx + 1, minusPlusIdx).trim().replace(",", " ");
                    String[] minusParts = minusRange.split("\\s+");
                    int oldCount = minusParts.length > 1 ? Integer.parseInt(minusParts[1]) : 1;

                    DiffHunk.Type type;
                    if (oldCount == 0) {
                        type = DiffHunk.Type.ADDED;
                    } else if (count == 0) {
                        type = DiffHunk.Type.DELETED;
                    } else {
                        type = DiffHunk.Type.MODIFIED;
                    }

                    if (count == 0) {
                        // For deletions, mark the line after the deletion point
                        hunks.add(new DiffHunk(startLine, 1, type));
                    } else {
                        hunks.add(new DiffHunk(startLine, count, type));
                    }
                }
            }
        } catch (Exception e) {
            // Ignore errors
        }
        return hunks;
    }

    /**
     * #28 Get recent commits.
     */
    public List<String> getRecentCommits(int count) {
        try {
            return runGitCommand("log", "--oneline", "-" + count);
        } catch (Exception e) {
            return List.of();
        }
    }

    /**
     * #28 Stage a file.
     */
    public String gitAdd(String pathSpec) {
        try {
            List<String> output = runGitCommand("add", pathSpec);
            return output.isEmpty() ? "Staged: " + pathSpec : String.join("\n", output);
        } catch (Exception e) {
            return "Error: " + e.getMessage();
        }
    }

    /**
     * #28 Commit with message.
     */
    public String gitCommit(String message) {
        try {
            List<String> output = runGitCommand("commit", "-m", message);
            return String.join("\n", output);
        } catch (Exception e) {
            return "Error: " + e.getMessage();
        }
    }

    /**
     * #28 Push to remote.
     */
    public String gitPush() {
        try {
            List<String> output = runGitCommand("push");
            return output.isEmpty() ? "Push completed" : String.join("\n", output);
        } catch (Exception e) {
            return "Error: " + e.getMessage();
        }
    }

    /**
     * #28 Pull from remote.
     */
    public String gitPull() {
        try {
            List<String> output = runGitCommand("pull");
            return output.isEmpty() ? "Pull completed" : String.join("\n", output);
        } catch (Exception e) {
            return "Error: " + e.getMessage();
        }
    }

    /**
     * Get the current branch name.
     */
    public String getCurrentBranch() {
        try {
            List<String> output = runGitCommand("rev-parse", "--abbrev-ref", "HEAD");
            return output.isEmpty() ? "" : output.get(0).trim();
        } catch (Exception e) {
            return "";
        }
    }

    private List<String> runGitCommand(String... args) throws IOException {
        List<String> command = new ArrayList<>();
        command.add("git");
        command.addAll(Arrays.asList(args));

        ProcessBuilder pb = new ProcessBuilder(command);
        pb.directory(workingDirectory.toFile());
        pb.redirectErrorStream(true);

        Process process = pb.start();
        List<String> output = new ArrayList<>();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
            String line;
            while ((line = reader.readLine()) != null) {
                output.add(line);
            }
        }
        try {
            process.waitFor();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        return output;
    }

    /**
     * #27 Represents a contiguous range of changed lines in a diff.
     */
    public record DiffHunk(int startLine, int lineCount, Type type) {
        public enum Type {
            ADDED, MODIFIED, DELETED
        }
    }
}
