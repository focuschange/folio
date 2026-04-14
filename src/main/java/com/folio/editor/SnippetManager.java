package com.folio.editor;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Manages code snippets/templates per language.
 * Provides hardcoded common snippets for Java, HTML, Python, and JavaScript.
 */
public class SnippetManager {

    /**
     * Represents a code snippet with a trigger prefix.
     */
    public record Snippet(String prefix, String description, String body, String language) {}

    private final Map<String, List<Snippet>> snippetsByLanguage = new HashMap<>();

    public SnippetManager() {
        registerJavaSnippets();
        registerHtmlSnippets();
        registerPythonSnippets();
        registerJavaScriptSnippets();
    }

    private void registerJavaSnippets() {
        List<Snippet> snippets = new ArrayList<>();

        snippets.add(new Snippet("for", "for loop",
                "for (int i = 0; i < length; i++) {\n    \n}", "java"));

        snippets.add(new Snippet("foreach", "enhanced for loop",
                "for (var item : collection) {\n    \n}", "java"));

        snippets.add(new Snippet("if", "if statement",
                "if (condition) {\n    \n}", "java"));

        snippets.add(new Snippet("ifelse", "if-else statement",
                "if (condition) {\n    \n} else {\n    \n}", "java"));

        snippets.add(new Snippet("class", "class declaration",
                "public class ClassName {\n\n    public ClassName() {\n    }\n}", "java"));

        snippets.add(new Snippet("main", "main method",
                "public static void main(String[] args) {\n    \n}", "java"));

        snippets.add(new Snippet("sout", "System.out.println",
                "System.out.println();", "java"));

        snippets.add(new Snippet("try", "try-catch block",
                "try {\n    \n} catch (Exception e) {\n    e.printStackTrace();\n}", "java"));

        snippets.add(new Snippet("switch", "switch statement",
                "switch (variable) {\n    case value1:\n        break;\n    case value2:\n        break;\n    default:\n        break;\n}", "java"));

        snippets.add(new Snippet("while", "while loop",
                "while (condition) {\n    \n}", "java"));

        snippetsByLanguage.put("java", snippets);
    }

    private void registerHtmlSnippets() {
        List<Snippet> snippets = new ArrayList<>();

        snippets.add(new Snippet("html5", "HTML5 boilerplate",
                "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n    <meta charset=\"UTF-8\">\n    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n    <title>Document</title>\n</head>\n<body>\n    \n</body>\n</html>", "html"));

        snippets.add(new Snippet("div", "div element",
                "<div>\n    \n</div>", "html"));

        snippets.add(new Snippet("table", "table element",
                "<table>\n    <thead>\n        <tr>\n            <th>Header</th>\n        </tr>\n    </thead>\n    <tbody>\n        <tr>\n            <td>Data</td>\n        </tr>\n    </tbody>\n</table>", "html"));

        snippets.add(new Snippet("form", "form element",
                "<form action=\"\" method=\"post\">\n    <label for=\"\"></label>\n    <input type=\"text\" id=\"\" name=\"\">\n    <button type=\"submit\">Submit</button>\n</form>", "html"));

        snippets.add(new Snippet("ul", "unordered list",
                "<ul>\n    <li></li>\n    <li></li>\n</ul>", "html"));

        snippets.add(new Snippet("ol", "ordered list",
                "<ol>\n    <li></li>\n    <li></li>\n</ol>", "html"));

        snippets.add(new Snippet("link", "link (CSS stylesheet)",
                "<link rel=\"stylesheet\" href=\"style.css\">", "html"));

        snippets.add(new Snippet("script", "script tag",
                "<script src=\"\"></script>", "html"));

        snippets.add(new Snippet("img", "image element",
                "<img src=\"\" alt=\"\">", "html"));

        snippetsByLanguage.put("html", snippets);
        snippetsByLanguage.put("htm", snippets);
    }

    private void registerPythonSnippets() {
        List<Snippet> snippets = new ArrayList<>();

        snippets.add(new Snippet("def", "function definition",
                "def function_name(params):\n    pass", "py"));

        snippets.add(new Snippet("class", "class definition",
                "class ClassName:\n    def __init__(self):\n        pass", "py"));

        snippets.add(new Snippet("for", "for loop",
                "for item in iterable:\n    pass", "py"));

        snippets.add(new Snippet("if", "if statement",
                "if condition:\n    pass", "py"));

        snippets.add(new Snippet("ifelse", "if-else statement",
                "if condition:\n    pass\nelse:\n    pass", "py"));

        snippets.add(new Snippet("while", "while loop",
                "while condition:\n    pass", "py"));

        snippets.add(new Snippet("try", "try-except block",
                "try:\n    pass\nexcept Exception as e:\n    print(e)", "py"));

        snippets.add(new Snippet("with", "with statement",
                "with open(filename, 'r') as f:\n    content = f.read()", "py"));

        snippets.add(new Snippet("main", "main guard",
                "if __name__ == '__main__':\n    main()", "py"));

        snippetsByLanguage.put("py", snippets);
    }

    private void registerJavaScriptSnippets() {
        List<Snippet> snippets = new ArrayList<>();

        snippets.add(new Snippet("function", "function declaration",
                "function functionName(params) {\n    \n}", "js"));

        snippets.add(new Snippet("arrow", "arrow function",
                "const functionName = (params) => {\n    \n};", "js"));

        snippets.add(new Snippet("class", "class declaration",
                "class ClassName {\n    constructor() {\n        \n    }\n}", "js"));

        snippets.add(new Snippet("for", "for loop",
                "for (let i = 0; i < length; i++) {\n    \n}", "js"));

        snippets.add(new Snippet("foreach", "forEach loop",
                "array.forEach((item) => {\n    \n});", "js"));

        snippets.add(new Snippet("if", "if statement",
                "if (condition) {\n    \n}", "js"));

        snippets.add(new Snippet("ifelse", "if-else statement",
                "if (condition) {\n    \n} else {\n    \n}", "js"));

        snippets.add(new Snippet("try", "try-catch block",
                "try {\n    \n} catch (error) {\n    console.error(error);\n}", "js"));

        snippets.add(new Snippet("promise", "Promise",
                "new Promise((resolve, reject) => {\n    \n});", "js"));

        snippets.add(new Snippet("async", "async function",
                "async function functionName(params) {\n    \n}", "js"));

        snippets.add(new Snippet("log", "console.log",
                "console.log();", "js"));

        snippetsByLanguage.put("js", snippets);
        snippetsByLanguage.put("ts", snippets);
    }

    /**
     * Get all snippets for a specific file extension.
     */
    public List<Snippet> getSnippetsForExtension(String extension) {
        return snippetsByLanguage.getOrDefault(extension, Collections.emptyList());
    }

    /**
     * Get snippets matching a given prefix for the current language.
     */
    public List<Snippet> getMatchingSnippets(String prefix) {
        String lowerPrefix = prefix.toLowerCase();
        List<Snippet> result = new ArrayList<>();

        for (List<Snippet> snippets : snippetsByLanguage.values()) {
            for (Snippet snippet : snippets) {
                if (snippet.prefix().toLowerCase().startsWith(lowerPrefix)) {
                    result.add(snippet);
                }
            }
        }

        return result;
    }

    /**
     * Get snippets matching a given prefix for a specific language extension.
     */
    public List<Snippet> getMatchingSnippets(String prefix, String extension) {
        String lowerPrefix = prefix.toLowerCase();
        List<Snippet> snippets = snippetsByLanguage.getOrDefault(extension, Collections.emptyList());

        return snippets.stream()
                .filter(s -> s.prefix().toLowerCase().startsWith(lowerPrefix))
                .collect(Collectors.toList());
    }

    /**
     * Get a specific snippet by exact prefix for a given extension.
     */
    public Optional<Snippet> getSnippet(String prefix, String extension) {
        List<Snippet> snippets = snippetsByLanguage.getOrDefault(extension, Collections.emptyList());
        return snippets.stream()
                .filter(s -> s.prefix().equals(prefix))
                .findFirst();
    }

    /**
     * Get all supported language extensions.
     */
    public Set<String> getSupportedExtensions() {
        return Collections.unmodifiableSet(snippetsByLanguage.keySet());
    }
}
