package com.folio.editor;

import org.fxmisc.richtext.CodeArea;

/**
 * Auto-formatter supporting language-specific formatting:
 * - JSON: pretty print
 * - Markdown: normalize heading spacing
 * - General: fix indentation
 * Triggered via Cmd+Shift+F.
 */
public class AutoFormatter {

    /**
     * Format the content of a CodeArea based on file extension.
     */
    public static void format(CodeArea codeArea, String extension) {
        if (codeArea == null) return;

        String text = codeArea.getText();
        String formatted;

        switch (extension.toLowerCase()) {
            case "json":
                formatted = formatJson(text);
                break;
            case "md":
            case "markdown":
                formatted = formatMarkdown(text);
                break;
            case "java":
            case "js":
            case "ts":
            case "c":
            case "cpp":
            case "h":
            case "hpp":
            case "go":
            case "rs":
            case "kt":
            case "kts":
            case "swift":
            case "css":
                formatted = formatBraceLanguage(text);
                break;
            case "xml":
            case "html":
            case "htm":
                formatted = formatXml(text);
                break;
            default:
                formatted = formatGeneral(text);
                break;
        }

        if (!formatted.equals(text)) {
            int caretPos = Math.min(codeArea.getCaretPosition(), formatted.length());
            codeArea.replaceText(formatted);
            codeArea.moveTo(Math.min(caretPos, formatted.length()));
        }
    }

    /**
     * Pretty-print JSON.
     */
    public static String formatJson(String text) {
        text = text.trim();
        if (text.isEmpty()) return text;

        StringBuilder sb = new StringBuilder();
        int indent = 0;
        boolean inString = false;
        boolean escaped = false;

        for (int i = 0; i < text.length(); i++) {
            char c = text.charAt(i);

            if (escaped) {
                sb.append(c);
                escaped = false;
                continue;
            }

            if (c == '\\' && inString) {
                sb.append(c);
                escaped = true;
                continue;
            }

            if (c == '"') {
                inString = !inString;
                sb.append(c);
                continue;
            }

            if (inString) {
                sb.append(c);
                continue;
            }

            // Skip whitespace outside strings
            if (Character.isWhitespace(c)) {
                continue;
            }

            switch (c) {
                case '{':
                case '[':
                    sb.append(c);
                    // Check if the next non-whitespace is the closing bracket
                    int next = findNextNonWhitespace(text, i + 1);
                    if (next < text.length() && ((c == '{' && text.charAt(next) == '}') ||
                            (c == '[' && text.charAt(next) == ']'))) {
                        // Empty object/array
                        sb.append(text.charAt(next));
                        i = next;
                    } else {
                        indent++;
                        sb.append('\n');
                        appendIndent(sb, indent);
                    }
                    break;
                case '}':
                case ']':
                    indent = Math.max(0, indent - 1);
                    sb.append('\n');
                    appendIndent(sb, indent);
                    sb.append(c);
                    break;
                case ',':
                    sb.append(c);
                    sb.append('\n');
                    appendIndent(sb, indent);
                    break;
                case ':':
                    sb.append(": ");
                    break;
                default:
                    sb.append(c);
                    break;
            }
        }

        return sb.toString();
    }

    private static int findNextNonWhitespace(String text, int from) {
        while (from < text.length() && Character.isWhitespace(text.charAt(from))) {
            from++;
        }
        return from;
    }

    /**
     * Format Markdown: normalize heading spacing.
     */
    public static String formatMarkdown(String text) {
        String[] lines = text.split("\n", -1);
        StringBuilder sb = new StringBuilder();

        for (int i = 0; i < lines.length; i++) {
            String line = lines[i];
            String trimmed = line.trim();

            // Add blank line before headings (if not at start and previous line isn't blank)
            if (trimmed.startsWith("#") && i > 0 && !lines[i - 1].trim().isEmpty()) {
                sb.append('\n');
            }

            sb.append(line);

            // Add blank line after headings (if next line isn't blank)
            if (trimmed.startsWith("#") && i < lines.length - 1 && !lines[i + 1].trim().isEmpty()) {
                sb.append('\n');
                sb.append('\n');
            } else if (i < lines.length - 1) {
                sb.append('\n');
            }
        }

        // Remove triple+ blank lines
        String result = sb.toString();
        while (result.contains("\n\n\n")) {
            result = result.replace("\n\n\n", "\n\n");
        }

        return result;
    }

    /**
     * Format brace-based languages (Java, JS, etc.): fix indentation.
     */
    public static String formatBraceLanguage(String text) {
        String[] lines = text.split("\n", -1);
        StringBuilder sb = new StringBuilder();
        int indent = 0;

        for (int i = 0; i < lines.length; i++) {
            String trimmed = lines[i].trim();

            if (trimmed.isEmpty()) {
                sb.append('\n');
                continue;
            }

            // Decrease indent before closing braces
            if (trimmed.startsWith("}") || trimmed.startsWith(")") || trimmed.startsWith("]")) {
                indent = Math.max(0, indent - 1);
            }

            appendIndent(sb, indent);
            sb.append(trimmed);
            if (i < lines.length - 1) {
                sb.append('\n');
            }

            // Increase indent after opening braces
            // Count net braces on this line
            int openBraces = countChar(trimmed, '{') + countChar(trimmed, '(');
            int closeBraces = countChar(trimmed, '}') + countChar(trimmed, ')');
            // Adjust: we already decremented for leading close brace
            if (trimmed.startsWith("}") || trimmed.startsWith(")")) {
                closeBraces--;
            }
            indent += openBraces - closeBraces;
            indent = Math.max(0, indent);
        }

        return sb.toString();
    }

    /**
     * Format XML/HTML: basic indentation.
     */
    public static String formatXml(String text) {
        String[] lines = text.split("\n", -1);
        StringBuilder sb = new StringBuilder();
        int indent = 0;

        for (int i = 0; i < lines.length; i++) {
            String trimmed = lines[i].trim();

            if (trimmed.isEmpty()) {
                sb.append('\n');
                continue;
            }

            // Decrease indent for closing tags
            if (trimmed.startsWith("</")) {
                indent = Math.max(0, indent - 1);
            }

            appendIndent(sb, indent);
            sb.append(trimmed);
            if (i < lines.length - 1) {
                sb.append('\n');
            }

            // Increase indent for opening tags (not self-closing, not void)
            if (trimmed.matches("<[a-zA-Z][^/]*>") && !trimmed.endsWith("/>")
                    && !isSelfClosingHtmlTag(trimmed)) {
                indent++;
            }
        }

        return sb.toString();
    }

    private static boolean isSelfClosingHtmlTag(String tag) {
        String lower = tag.toLowerCase();
        return lower.startsWith("<br") || lower.startsWith("<hr")
                || lower.startsWith("<img") || lower.startsWith("<input")
                || lower.startsWith("<meta") || lower.startsWith("<link")
                || lower.startsWith("<!") || lower.startsWith("<?");
    }

    /**
     * General formatting: normalize trailing whitespace and ensure final newline.
     */
    public static String formatGeneral(String text) {
        String[] lines = text.split("\n", -1);
        StringBuilder sb = new StringBuilder();

        for (int i = 0; i < lines.length; i++) {
            sb.append(lines[i].stripTrailing());
            if (i < lines.length - 1) {
                sb.append('\n');
            }
        }

        // Ensure file ends with newline
        String result = sb.toString();
        if (!result.isEmpty() && !result.endsWith("\n")) {
            result += "\n";
        }

        return result;
    }

    private static void appendIndent(StringBuilder sb, int level) {
        for (int i = 0; i < level; i++) {
            sb.append("    ");
        }
    }

    private static int countChar(String s, char c) {
        int count = 0;
        boolean inString = false;
        for (int i = 0; i < s.length(); i++) {
            char ch = s.charAt(i);
            if (ch == '"' || ch == '\'') inString = !inString;
            if (!inString && ch == c) count++;
        }
        return count;
    }
}
