package com.folio.editor;

import org.fxmisc.richtext.CodeArea;
import org.fxmisc.richtext.model.StyleSpans;
import org.fxmisc.richtext.model.StyleSpansBuilder;

import java.time.Duration;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class SyntaxHighlightEngine {

    private static final Map<String, Pattern> LANGUAGE_PATTERNS = new HashMap<>();
    private static final Set<String> SUPPORTED_EXTENSIONS = new HashSet<>();

    static {
        SUPPORTED_EXTENSIONS.addAll(List.of(
                "md", "markdown", "java", "py", "js", "ts", "json", "xml", "html",
                "htm", "css", "sql", "sh", "bash", "yaml", "yml", "properties", "go",
                "rs", "c", "cpp", "h", "hpp", "kt", "kts", "swift"
        ));

        // Java / C-like languages
        String javaKeywords = String.join("|",
                "abstract", "assert", "boolean", "break", "byte", "case", "catch",
                "char", "class", "const", "continue", "default", "do", "double",
                "else", "enum", "extends", "final", "finally", "float", "for",
                "goto", "if", "implements", "import", "instanceof", "int", "interface",
                "long", "native", "new", "package", "private", "protected", "public",
                "return", "short", "static", "strictfp", "super", "switch",
                "synchronized", "this", "throw", "throws", "transient", "try",
                "var", "void", "volatile", "while", "yield", "record", "sealed", "permits");
        LANGUAGE_PATTERNS.put("java", Pattern.compile(
                "(?<KEYWORD>\\b(" + javaKeywords + ")\\b)"
                        + "|(?<STRING>\"([^\"\\\\]|\\\\.)*\"|'([^'\\\\]|\\\\.)*')"
                        + "|(?<COMMENT>//[^\n]*|/\\*[\\s\\S]*?\\*/)"
                        + "|(?<NUMBER>\\b\\d+(\\.\\d+)?[fFdDlL]?\\b)"
                        + "|(?<ANNOTATION>@\\w+)"
                        + "|(?<FUNCTION>\\b[a-z][a-zA-Z0-9_]*(?=\\s*\\())"
                        + "|(?<TYPE>\\b[A-Z][a-zA-Z0-9_]*\\b)"
        ));

        // Python
        String pyKeywords = String.join("|",
                "False", "None", "True", "and", "as", "assert", "async", "await",
                "break", "class", "continue", "def", "del", "elif", "else", "except",
                "finally", "for", "from", "global", "if", "import", "in", "is",
                "lambda", "nonlocal", "not", "or", "pass", "raise", "return",
                "try", "while", "with", "yield");
        LANGUAGE_PATTERNS.put("py", Pattern.compile(
                "(?<KEYWORD>\\b(" + pyKeywords + ")\\b)"
                        + "|(?<STRING>\"\"\"[\\s\\S]*?\"\"\"|'''[\\s\\S]*?'''|\"([^\"\\\\]|\\\\.)*\"|'([^'\\\\]|\\\\.)*')"
                        + "|(?<COMMENT>#[^\n]*)"
                        + "|(?<NUMBER>\\b\\d+(\\.\\d+)?\\b)"
                        + "|(?<ANNOTATION>@\\w+)"
                        + "|(?<FUNCTION>\\b[a-z_][a-zA-Z0-9_]*(?=\\s*\\())"
                        + "|(?<TYPE>\\b[A-Z][a-zA-Z0-9_]*\\b)"
        ));

        // JavaScript / TypeScript
        String jsKeywords = String.join("|",
                "async", "await", "break", "case", "catch", "class", "const", "continue",
                "debugger", "default", "delete", "do", "else", "export", "extends",
                "finally", "for", "from", "function", "if", "import", "in", "instanceof",
                "let", "new", "of", "return", "static", "super", "switch", "this",
                "throw", "try", "typeof", "var", "void", "while", "with", "yield",
                "type", "interface", "enum", "implements", "namespace", "readonly");
        Pattern jsPattern = Pattern.compile(
                "(?<KEYWORD>\\b(" + jsKeywords + ")\\b)"
                        + "|(?<STRING>`[^`]*`|\"([^\"\\\\]|\\\\.)*\"|'([^'\\\\]|\\\\.)*')"
                        + "|(?<COMMENT>//[^\n]*|/\\*[\\s\\S]*?\\*/)"
                        + "|(?<NUMBER>\\b\\d+(\\.\\d+)?\\b)"
                        + "|(?<FUNCTION>\\b[a-z_$][a-zA-Z0-9_$]*(?=\\s*\\())"
                        + "|(?<TYPE>\\b[A-Z][a-zA-Z0-9_]*\\b)"
        );
        LANGUAGE_PATTERNS.put("js", jsPattern);
        LANGUAGE_PATTERNS.put("ts", jsPattern);

        // JSON
        LANGUAGE_PATTERNS.put("json", Pattern.compile(
                "(?<STRING>\"([^\"\\\\]|\\\\.)*\")"
                        + "|(?<NUMBER>\\b-?\\d+(\\.\\d+)?([eE][+-]?\\d+)?\\b)"
                        + "|(?<KEYWORD>\\b(true|false|null)\\b)"
        ));

        // XML / HTML
        Pattern xmlPattern = Pattern.compile(
                "(?<COMMENT><!--[\\s\\S]*?-->)"
                        + "|(?<TAG></?\\w[^>]*>)"
                        + "|(?<STRING>\"[^\"]*\"|'[^']*')"
        );
        LANGUAGE_PATTERNS.put("xml", xmlPattern);
        LANGUAGE_PATTERNS.put("html", xmlPattern);
        LANGUAGE_PATTERNS.put("htm", xmlPattern);

        // CSS
        LANGUAGE_PATTERNS.put("css", Pattern.compile(
                "(?<COMMENT>/\\*[\\s\\S]*?\\*/)"
                        + "|(?<KEYWORD>@\\w+|!important)"
                        + "|(?<STRING>\"([^\"\\\\]|\\\\.)*\"|'([^'\\\\]|\\\\.)*')"
                        + "|(?<NUMBER>\\b\\d+(\\.\\d+)?(px|em|rem|vh|vw|%)?\\b)"
                        + "|(?<TAG>[.#]?[a-zA-Z][a-zA-Z0-9_-]*(?=\\s*\\{))"
        ));

        // SQL
        String sqlKeywords = String.join("|",
                "SELECT", "FROM", "WHERE", "INSERT", "INTO", "UPDATE", "DELETE",
                "CREATE", "ALTER", "DROP", "TABLE", "INDEX", "VIEW", "JOIN",
                "LEFT", "RIGHT", "INNER", "OUTER", "ON", "AND", "OR", "NOT",
                "IN", "IS", "NULL", "LIKE", "ORDER", "BY", "GROUP", "HAVING",
                "LIMIT", "OFFSET", "AS", "SET", "VALUES", "DISTINCT", "COUNT",
                "SUM", "AVG", "MAX", "MIN", "BETWEEN", "EXISTS", "UNION", "ALL",
                "select", "from", "where", "insert", "into", "update", "delete",
                "create", "alter", "drop", "table", "join", "left", "right",
                "inner", "outer", "on", "and", "or", "not", "in", "is", "null",
                "like", "order", "by", "group", "having", "limit", "as", "set", "values");
        LANGUAGE_PATTERNS.put("sql", Pattern.compile(
                "(?<KEYWORD>\\b(" + sqlKeywords + ")\\b)"
                        + "|(?<STRING>'([^'\\\\]|\\\\.)*')"
                        + "|(?<COMMENT>--[^\n]*|/\\*[\\s\\S]*?\\*/)"
                        + "|(?<NUMBER>\\b\\d+(\\.\\d+)?\\b)"
        ));

        // Shell
        LANGUAGE_PATTERNS.put("sh", Pattern.compile(
                "(?<KEYWORD>\\b(if|then|else|elif|fi|for|while|do|done|case|esac|in|function|return|local|export|source|alias|unalias)\\b)"
                        + "|(?<STRING>\"([^\"\\\\]|\\\\.)*\"|'[^']*')"
                        + "|(?<COMMENT>#[^\n]*)"
                        + "|(?<NUMBER>\\b\\d+\\b)"
        ));
        LANGUAGE_PATTERNS.put("bash", LANGUAGE_PATTERNS.get("sh"));

        // YAML
        LANGUAGE_PATTERNS.put("yaml", Pattern.compile(
                "(?<KEYWORD>\\b(true|false|null|yes|no)\\b)"
                        + "|(?<TAG>^\\s*[\\w.-]+(?=\\s*:))"
                        + "|(?<STRING>\"([^\"\\\\]|\\\\.)*\"|'[^']*')"
                        + "|(?<COMMENT>#[^\n]*)"
                        + "|(?<NUMBER>\\b\\d+(\\.\\d+)?\\b)",
                Pattern.MULTILINE
        ));
        LANGUAGE_PATTERNS.put("yml", LANGUAGE_PATTERNS.get("yaml"));

        // C-like (C, C++, Go, Rust, Kotlin, Swift) — reuse Java pattern as base
        for (String ext : List.of("c", "cpp", "h", "hpp", "go", "rs", "kt", "kts", "swift")) {
            LANGUAGE_PATTERNS.put(ext, LANGUAGE_PATTERNS.get("java"));
        }

        // Markdown — delegate to existing MarkdownSyntaxHighlighter
        // (handled separately in computeHighlighting)
    }

    public static StyleSpans<Collection<String>> computeHighlighting(String text, String extension) {
        if (extension.equals("md") || extension.equals("markdown")) {
            return MarkdownSyntaxHighlighter.computeHighlighting(text);
        }

        Pattern pattern = LANGUAGE_PATTERNS.get(extension);
        if (pattern == null) {
            // Plain text — no highlighting
            StyleSpansBuilder<Collection<String>> builder = new StyleSpansBuilder<>();
            builder.add(Collections.emptyList(), text.length());
            return builder.create();
        }

        return computeFromPattern(text, pattern);
    }

    private static StyleSpans<Collection<String>> computeFromPattern(String text, Pattern pattern) {
        Matcher matcher = pattern.matcher(text);
        int lastEnd = 0;
        StyleSpansBuilder<Collection<String>> builder = new StyleSpansBuilder<>();

        while (matcher.find()) {
            String styleClass = null;
            try { if (matcher.group("KEYWORD") != null) styleClass = "keyword"; } catch (IllegalArgumentException ignored) {}
            if (styleClass == null) try { if (matcher.group("STRING") != null) styleClass = "string"; } catch (IllegalArgumentException ignored) {}
            if (styleClass == null) try { if (matcher.group("COMMENT") != null) styleClass = "comment"; } catch (IllegalArgumentException ignored) {}
            if (styleClass == null) try { if (matcher.group("NUMBER") != null) styleClass = "number"; } catch (IllegalArgumentException ignored) {}
            if (styleClass == null) try { if (matcher.group("ANNOTATION") != null) styleClass = "annotation"; } catch (IllegalArgumentException ignored) {}
            if (styleClass == null) try { if (matcher.group("TAG") != null) styleClass = "tag"; } catch (IllegalArgumentException ignored) {}
            if (styleClass == null) try { if (matcher.group("FUNCTION") != null) styleClass = "function"; } catch (IllegalArgumentException ignored) {}
            if (styleClass == null) try { if (matcher.group("TYPE") != null) styleClass = "type"; } catch (IllegalArgumentException ignored) {}

            if (styleClass != null) {
                builder.add(Collections.emptyList(), matcher.start() - lastEnd);
                builder.add(Collections.singleton(styleClass), matcher.end() - matcher.start());
                lastEnd = matcher.end();
            }
        }
        builder.add(Collections.emptyList(), text.length() - lastEnd);
        return builder.create();
    }

    public static void apply(CodeArea codeArea, String extension) {
        codeArea.multiPlainChanges()
                .successionEnds(Duration.ofMillis(50))
                .subscribe(ignore -> {
                    try {
                        codeArea.setStyleSpans(0,
                                computeHighlighting(codeArea.getText(), extension));
                    } catch (Exception e) {
                        // ignore highlighting errors
                    }
                });
    }

    public static Set<String> getSupportedExtensions() {
        return Collections.unmodifiableSet(SUPPORTED_EXTENSIONS);
    }

    public static String detectLanguage(String extension) {
        if (extension == null || extension.isEmpty()) return "Plain Text";
        return switch (extension.toLowerCase()) {
            case "md", "markdown" -> "Markdown";
            case "java" -> "Java";
            case "py" -> "Python";
            case "js" -> "JavaScript";
            case "ts" -> "TypeScript";
            case "json" -> "JSON";
            case "xml" -> "XML";
            case "html", "htm" -> "HTML";
            case "css" -> "CSS";
            case "sql" -> "SQL";
            case "sh", "bash" -> "Shell";
            case "yaml", "yml" -> "YAML";
            case "go" -> "Go";
            case "rs" -> "Rust";
            case "c", "h" -> "C";
            case "cpp", "hpp" -> "C++";
            case "kt", "kts" -> "Kotlin";
            case "swift" -> "Swift";
            case "properties" -> "Properties";
            case "txt" -> "Plain Text";
            default -> "Plain Text";
        };
    }
}
