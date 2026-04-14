package com.folio.editor;

import org.fxmisc.richtext.CodeArea;

import java.util.*;

/**
 * Code folding service that identifies foldable regions in code:
 * matching braces {}, markdown heading sections, and comment blocks.
 * Provides fold/unfold functionality for the editor.
 */
public class CodeFoldingService {

    private final CodeArea codeArea;
    private final Map<Integer, FoldRegion> foldRegions = new TreeMap<>();
    private final Set<Integer> collapsedRegions = new HashSet<>();

    public CodeFoldingService(CodeArea codeArea) {
        this.codeArea = codeArea;
    }

    /**
     * Represents a foldable region in the document.
     */
    public static class FoldRegion {
        public final int startLine;
        public final int endLine;
        public final String type; // "brace", "comment", "heading"
        public final String placeholder;

        public FoldRegion(int startLine, int endLine, String type, String placeholder) {
            this.startLine = startLine;
            this.endLine = endLine;
            this.type = type;
            this.placeholder = placeholder;
        }
    }

    /**
     * Scan the document and identify all foldable regions.
     */
    public List<FoldRegion> scanFoldableRegions() {
        foldRegions.clear();
        List<FoldRegion> regions = new ArrayList<>();
        String text = codeArea.getText();
        String[] lines = text.split("\n", -1);

        // Find brace-matching regions
        scanBraceRegions(lines, regions);

        // Find comment block regions
        scanCommentBlocks(lines, regions);

        // Find markdown heading sections
        scanMarkdownHeadings(lines, regions);

        for (FoldRegion region : regions) {
            foldRegions.put(region.startLine, region);
        }

        return regions;
    }

    private void scanBraceRegions(String[] lines, List<FoldRegion> regions) {
        Deque<Integer> braceStack = new ArrayDeque<>();

        for (int i = 0; i < lines.length; i++) {
            String line = lines[i];
            for (int j = 0; j < line.length(); j++) {
                char c = line.charAt(j);
                if (c == '{') {
                    braceStack.push(i);
                } else if (c == '}' && !braceStack.isEmpty()) {
                    int startLine = braceStack.pop();
                    if (i > startLine) {
                        String trimmed = lines[startLine].trim();
                        String placeholder = trimmed.length() > 40
                                ? trimmed.substring(0, 40) + "..."
                                : trimmed + " ...}";
                        regions.add(new FoldRegion(startLine, i, "brace", placeholder));
                    }
                }
            }
        }
    }

    private void scanCommentBlocks(String[] lines, List<FoldRegion> regions) {
        int commentStart = -1;
        for (int i = 0; i < lines.length; i++) {
            String trimmed = lines[i].trim();
            if (trimmed.startsWith("/*") && commentStart == -1) {
                commentStart = i;
            }
            if (trimmed.contains("*/") && commentStart != -1) {
                if (i > commentStart) {
                    regions.add(new FoldRegion(commentStart, i, "comment", "/* ... */"));
                }
                commentStart = -1;
            }
        }
    }

    private void scanMarkdownHeadings(String[] lines, List<FoldRegion> regions) {
        List<int[]> headings = new ArrayList<>(); // [line, level]

        for (int i = 0; i < lines.length; i++) {
            String trimmed = lines[i].trim();
            if (trimmed.startsWith("#")) {
                int level = 0;
                while (level < trimmed.length() && trimmed.charAt(level) == '#') {
                    level++;
                }
                if (level <= 6 && level < trimmed.length() && trimmed.charAt(level) == ' ') {
                    headings.add(new int[]{i, level});
                }
            }
        }

        for (int h = 0; h < headings.size(); h++) {
            int startLine = headings.get(h)[0];
            int level = headings.get(h)[1];
            int endLine = lines.length - 1;

            // Find the next heading of same or higher level
            for (int n = h + 1; n < headings.size(); n++) {
                if (headings.get(n)[1] <= level) {
                    endLine = headings.get(n)[0] - 1;
                    break;
                }
            }

            if (endLine > startLine) {
                String placeholder = lines[startLine].trim() + " ...";
                regions.add(new FoldRegion(startLine, endLine, "heading", placeholder));
            }
        }
    }

    /**
     * Toggle fold state for the region starting at the given line.
     */
    public void toggleFold(int line) {
        FoldRegion region = foldRegions.get(line);
        if (region == null) {
            // Try to find the nearest region containing this line
            region = findRegionContaining(line);
            if (region == null) return;
        }

        if (collapsedRegions.contains(region.startLine)) {
            unfold(region);
        } else {
            fold(region);
        }
    }

    /**
     * Fold (collapse) a region - hides lines between start+1 and end.
     */
    public void fold(FoldRegion region) {
        if (region.endLine <= region.startLine) return;

        try {
            // Use RichTextFX paragraph folding
            for (int i = region.startLine + 1; i <= region.endLine && i < codeArea.getParagraphs().size(); i++) {
                codeArea.foldParagraphs(i, i);
            }
            collapsedRegions.add(region.startLine);
        } catch (Exception e) {
            // Folding may not be fully supported in all versions
            System.err.println("Fold failed: " + e.getMessage());
        }
    }

    /**
     * Unfold (expand) a region.
     */
    public void unfold(FoldRegion region) {
        try {
            for (int i = region.startLine + 1; i <= region.endLine && i < codeArea.getParagraphs().size(); i++) {
                codeArea.unfoldParagraphs(i);
            }
            collapsedRegions.remove(region.startLine);
        } catch (Exception e) {
            System.err.println("Unfold failed: " + e.getMessage());
        }
    }

    /**
     * Fold all regions in the document.
     */
    public void foldAll() {
        scanFoldableRegions();
        for (FoldRegion region : foldRegions.values()) {
            fold(region);
        }
    }

    /**
     * Unfold all regions in the document.
     */
    public void unfoldAll() {
        for (FoldRegion region : foldRegions.values()) {
            unfold(region);
        }
        collapsedRegions.clear();
    }

    /**
     * Check if a line is the start of a collapsed region.
     */
    public boolean isCollapsed(int line) {
        return collapsedRegions.contains(line);
    }

    /**
     * Get the fold region starting at the given line, if any.
     */
    public FoldRegion getRegionAt(int line) {
        return foldRegions.get(line);
    }

    private FoldRegion findRegionContaining(int line) {
        FoldRegion best = null;
        for (FoldRegion region : foldRegions.values()) {
            if (region.startLine <= line && region.endLine >= line) {
                if (best == null || region.startLine > best.startLine) {
                    best = region;
                }
            }
        }
        return best;
    }

    /**
     * Get all currently collapsed region start lines.
     */
    public Set<Integer> getCollapsedLines() {
        return Collections.unmodifiableSet(collapsedRegions);
    }
}
