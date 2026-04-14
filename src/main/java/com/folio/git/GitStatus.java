package com.folio.git;

/**
 * #26 Git file status enum.
 */
public enum GitStatus {
    MODIFIED("M", "#e2c08d"),   // Yellow/amber for modified
    ADDED("A", "#73c991"),      // Green for added/staged
    UNTRACKED("?", "#73c991"),  // Green for untracked (new)
    DELETED("D", "#c74e39"),    // Red for deleted
    RENAMED("R", "#73c991"),    // Green for renamed
    COPIED("C", "#73c991"),     // Green for copied
    CONFLICTED("U", "#e51400"); // Red for conflicts

    private final String code;
    private final String color;

    GitStatus(String code, String color) {
        this.code = code;
        this.color = color;
    }

    public String getCode() { return code; }
    public String getColor() { return color; }

    public static GitStatus fromPorcelainCode(String code) {
        if (code == null || code.isEmpty()) return null;
        return switch (code.trim()) {
            case "M", "MM", "AM" -> MODIFIED;
            case "A" -> ADDED;
            case "?", "??" -> UNTRACKED;
            case "D" -> DELETED;
            case "R" -> RENAMED;
            case "C" -> COPIED;
            case "U", "UU", "AA", "DD" -> CONFLICTED;
            default -> {
                if (code.contains("M")) yield MODIFIED;
                if (code.contains("A")) yield ADDED;
                if (code.contains("D")) yield DELETED;
                if (code.contains("?")) yield UNTRACKED;
                yield null;
            }
        };
    }
}
