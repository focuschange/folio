package com.folio.editor;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Utility methods for Markdown operations including TOC generation.
 */
public class MarkdownUtils {

    private static final Pattern HEADING_PATTERN = Pattern.compile("^(#{1,6})\\s+(.+)$", Pattern.MULTILINE);

    /**
     * Generates a Markdown Table of Contents from headings in the given text.
     * @param markdownText the source markdown
     * @return a string containing the generated TOC in markdown format
     */
    public static String generateTOC(String markdownText) {
        List<HeadingEntry> headings = scanHeadings(markdownText);
        if (headings.isEmpty()) {
            return "<!-- No headings found -->";
        }

        StringBuilder toc = new StringBuilder();
        toc.append("## Table of Contents\n\n");
        for (HeadingEntry heading : headings) {
            int indent = (heading.level - 1) * 2;
            toc.append(" ".repeat(indent));
            toc.append("- [").append(heading.text).append("](#").append(slugify(heading.text)).append(")\n");
        }
        return toc.toString();
    }

    /**
     * Scans the given markdown text and returns a list of heading entries.
     */
    public static List<HeadingEntry> scanHeadings(String markdownText) {
        List<HeadingEntry> headings = new ArrayList<>();
        Matcher matcher = HEADING_PATTERN.matcher(markdownText);
        while (matcher.find()) {
            int level = matcher.group(1).length();
            String text = matcher.group(2).trim();
            headings.add(new HeadingEntry(level, text, matcher.start()));
        }
        return headings;
    }

    /**
     * Converts heading text to a URL-friendly slug.
     */
    public static String slugify(String text) {
        return text.toLowerCase()
                .replaceAll("[^a-z0-9\\s-]", "")
                .replaceAll("\\s+", "-")
                .replaceAll("-+", "-")
                .replaceAll("^-|-$", "");
    }

    /**
     * Represents a heading found in markdown text.
     */
    public static class HeadingEntry {
        public final int level;
        public final String text;
        public final int position;

        public HeadingEntry(int level, String text, int position) {
            this.level = level;
            this.text = text;
            this.position = position;
        }
    }
}
