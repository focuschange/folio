package com.folio.editor;

import org.fxmisc.richtext.CodeArea;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Simplified Emmet abbreviation expander for HTML files.
 * Supports basic expansions:
 * - Simple tags: div, p, span, etc.
 * - Nesting: div>ul>li
 * - Class: div.className
 * - ID: div#idName
 * - Multiplication: ul>li*3
 * - Combined: div.container>ul>li.item*3
 */
public class EmmetExpander {

    private static final Pattern EMMET_PATTERN = Pattern.compile(
            "[a-zA-Z][a-zA-Z0-9]*([.#][a-zA-Z0-9_-]+)*(>[a-zA-Z][a-zA-Z0-9]*([.#][a-zA-Z0-9_-]+)*(\\*\\d+)?)*"
    );

    // Self-closing HTML tags
    private static final java.util.Set<String> SELF_CLOSING = java.util.Set.of(
            "br", "hr", "img", "input", "meta", "link", "area", "base",
            "col", "embed", "source", "track", "wbr"
    );

    /**
     * Try to expand Emmet abbreviation at the caret position.
     *
     * @param codeArea the code area
     * @param extension the file extension
     * @return true if expansion was performed
     */
    public static boolean tryExpand(CodeArea codeArea, String extension) {
        if (codeArea == null) return false;

        // Only expand in HTML/HTM files
        if (!"html".equals(extension) && !"htm".equals(extension)) return false;

        int caretPos = codeArea.getCaretPosition();
        String text = codeArea.getText();

        // Find the abbreviation before the caret
        int abbrevStart = caretPos;
        while (abbrevStart > 0) {
            char c = text.charAt(abbrevStart - 1);
            if (Character.isLetterOrDigit(c) || c == '.' || c == '#' || c == '>' || c == '*' || c == '-' || c == '_') {
                abbrevStart--;
            } else {
                break;
            }
        }

        if (abbrevStart >= caretPos) return false;

        String abbreviation = text.substring(abbrevStart, caretPos);

        // Validate it looks like an Emmet abbreviation
        if (!isValidEmmetAbbreviation(abbreviation)) return false;

        String expanded = expand(abbreviation);
        if (expanded == null || expanded.equals(abbreviation)) return false;

        codeArea.replaceText(abbrevStart, caretPos, expanded);
        return true;
    }

    /**
     * Check if the string looks like a valid Emmet abbreviation.
     */
    public static boolean isValidEmmetAbbreviation(String abbrev) {
        if (abbrev == null || abbrev.isEmpty()) return false;
        if (!Character.isLetter(abbrev.charAt(0))) return false;

        // Must contain at least one Emmet operator or be a known tag
        boolean hasOperator = abbrev.contains(">") || abbrev.contains(".")
                || abbrev.contains("#") || abbrev.contains("*");

        if (hasOperator) return true;

        // Simple tag name - only expand known HTML tags
        return isKnownHtmlTag(abbrev);
    }

    private static boolean isKnownHtmlTag(String tag) {
        return java.util.Set.of(
                "div", "span", "p", "a", "ul", "ol", "li", "table", "tr", "td", "th",
                "thead", "tbody", "tfoot", "form", "input", "button", "select", "option",
                "textarea", "label", "h1", "h2", "h3", "h4", "h5", "h6",
                "header", "footer", "nav", "main", "section", "article", "aside",
                "img", "br", "hr", "pre", "code", "blockquote", "strong", "em",
                "link", "meta", "script", "style", "head", "body", "html"
        ).contains(tag.toLowerCase());
    }

    /**
     * Expand an Emmet abbreviation into HTML.
     */
    public static String expand(String abbreviation) {
        if (abbreviation == null || abbreviation.isEmpty()) return null;

        try {
            return expandExpression(abbreviation, 0);
        } catch (Exception e) {
            return null;
        }
    }

    private static String expandExpression(String expr, int indentLevel) {
        // Split by top-level > (nesting)
        String[] parts = splitByNesting(expr);

        if (parts.length == 1) {
            return expandSingleElement(parts[0], indentLevel);
        }

        // Build nested structure
        StringBuilder sb = new StringBuilder();
        String indent = "    ".repeat(indentLevel);

        // First element
        String firstPart = parts[0];
        ElementInfo info = parseElement(firstPart);

        String openTag = buildOpenTag(info);
        if (SELF_CLOSING.contains(info.tag.toLowerCase())) {
            sb.append(indent).append(openTag);
            return sb.toString();
        }

        sb.append(indent).append(openTag).append("\n");

        // Recurse for remaining parts
        String remaining = String.join(">", java.util.Arrays.copyOfRange(parts, 1, parts.length));
        sb.append(expandExpression(remaining, indentLevel + 1)).append("\n");

        sb.append(indent).append("</").append(info.tag).append(">");

        return sb.toString();
    }

    private static String expandSingleElement(String element, int indentLevel) {
        String indent = "    ".repeat(indentLevel);

        // Check for multiplication: tag*N
        int multIdx = element.lastIndexOf('*');
        int multiplier = 1;
        String elementPart = element;

        if (multIdx > 0) {
            try {
                multiplier = Integer.parseInt(element.substring(multIdx + 1));
                elementPart = element.substring(0, multIdx);
            } catch (NumberFormatException e) {
                // Not a valid multiplier, treat as part of the tag
            }
        }

        ElementInfo info = parseElement(elementPart);
        StringBuilder sb = new StringBuilder();

        for (int i = 0; i < multiplier; i++) {
            if (i > 0) sb.append("\n");

            String openTag = buildOpenTag(info);

            if (SELF_CLOSING.contains(info.tag.toLowerCase())) {
                sb.append(indent).append(openTag);
            } else {
                sb.append(indent).append(openTag).append("</").append(info.tag).append(">");
            }
        }

        return sb.toString();
    }

    private static String[] splitByNesting(String expr) {
        // Split by > but handle cases like tag.class>child
        return expr.split(">");
    }

    /**
     * Parse an element expression like "div.class#id" into its components.
     */
    static ElementInfo parseElement(String element) {
        ElementInfo info = new ElementInfo();

        // Handle multiplication suffix
        int multIdx = element.lastIndexOf('*');
        if (multIdx > 0) {
            try {
                info.multiplier = Integer.parseInt(element.substring(multIdx + 1));
                element = element.substring(0, multIdx);
            } catch (NumberFormatException e) {
                // Not a multiplier
            }
        }

        // Parse tag, classes, and id
        StringBuilder tagBuf = new StringBuilder();
        StringBuilder currentToken = new StringBuilder();
        char currentType = 't'; // t=tag, .=class, #=id

        for (int i = 0; i < element.length(); i++) {
            char c = element.charAt(i);
            if (c == '.' || c == '#') {
                // Flush current token
                flushToken(info, currentType, currentToken.toString());
                currentToken.setLength(0);
                currentType = c;
            } else {
                currentToken.append(c);
            }
        }
        flushToken(info, currentType, currentToken.toString());

        // Default tag
        if (info.tag.isEmpty()) {
            info.tag = "div";
        }

        return info;
    }

    private static void flushToken(ElementInfo info, char type, String value) {
        if (value.isEmpty()) return;
        switch (type) {
            case 't': info.tag = value; break;
            case '.': info.classes.add(value); break;
            case '#': info.id = value; break;
        }
    }

    private static String buildOpenTag(ElementInfo info) {
        StringBuilder sb = new StringBuilder();
        sb.append("<").append(info.tag);

        if (info.id != null && !info.id.isEmpty()) {
            sb.append(" id=\"").append(info.id).append("\"");
        }

        if (!info.classes.isEmpty()) {
            sb.append(" class=\"").append(String.join(" ", info.classes)).append("\"");
        }

        if (SELF_CLOSING.contains(info.tag.toLowerCase())) {
            sb.append(">");
        } else {
            sb.append(">");
        }

        return sb.toString();
    }

    static class ElementInfo {
        String tag = "";
        String id = "";
        java.util.List<String> classes = new java.util.ArrayList<>();
        int multiplier = 1;
    }
}
