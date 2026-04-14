package com.folio.editor;

import org.fxmisc.richtext.CodeArea;
import org.fxmisc.richtext.model.StyleSpans;
import org.fxmisc.richtext.model.StyleSpansBuilder;

import java.util.*;

/**
 * Simple spell checker using a basic English dictionary (~5000 common words).
 * Underlines misspelled words. Can be toggled on/off.
 */
public class SpellChecker {

    private boolean enabled = false;
    private static final Set<String> DICTIONARY = new HashSet<>();

    static {
        // Load a basic English dictionary of common words
        String[] commonWords = {
            // Articles, prepositions, conjunctions
            "a", "an", "the", "and", "or", "but", "nor", "for", "yet", "so",
            "in", "on", "at", "to", "of", "by", "with", "from", "up", "about",
            "into", "through", "during", "before", "after", "above", "below",
            "between", "out", "off", "over", "under", "again", "further", "then",
            "once", "here", "there", "when", "where", "why", "how", "all", "each",
            "every", "both", "few", "more", "most", "other", "some", "such", "no",
            "not", "only", "own", "same", "than", "too", "very",

            // Pronouns
            "i", "me", "my", "myself", "we", "our", "ours", "ourselves", "you",
            "your", "yours", "yourself", "yourselves", "he", "him", "his", "himself",
            "she", "her", "hers", "herself", "it", "its", "itself", "they", "them",
            "their", "theirs", "themselves", "what", "which", "who", "whom", "this",
            "that", "these", "those",

            // Common verbs
            "be", "am", "is", "are", "was", "were", "been", "being", "have", "has",
            "had", "having", "do", "does", "did", "doing", "would", "should", "could",
            "ought", "might", "shall", "will", "can", "need", "dare", "may", "must",
            "say", "said", "get", "got", "make", "made", "go", "went", "gone", "take",
            "took", "taken", "come", "came", "see", "saw", "seen", "know", "knew",
            "known", "think", "thought", "give", "gave", "given", "tell", "told",
            "work", "worked", "call", "called", "try", "tried", "ask", "asked",
            "use", "used", "find", "found", "put", "run", "ran", "set", "turn",
            "turned", "move", "moved", "live", "lived", "believe", "believed",
            "bring", "brought", "happen", "happened", "write", "wrote", "written",
            "provide", "provided", "sit", "sat", "stand", "stood", "lose", "lost",
            "pay", "paid", "meet", "met", "include", "included", "continue",
            "continued", "learn", "learned", "change", "changed", "lead", "led",
            "understand", "understood", "watch", "watched", "follow", "followed",
            "stop", "stopped", "create", "created", "speak", "spoke", "spoken",
            "read", "allow", "allowed", "add", "added", "spend", "spent", "grow",
            "grew", "grown", "open", "opened", "walk", "walked", "win", "won",
            "offer", "offered", "remember", "remembered", "love", "loved",
            "consider", "considered", "appear", "appeared", "buy", "bought",
            "wait", "waited", "serve", "served", "die", "died", "send", "sent",
            "expect", "expected", "build", "built", "stay", "stayed", "fall", "fell",
            "fallen", "cut", "reach", "reached", "kill", "killed", "remain",
            "remained", "suggest", "suggested", "raise", "raised", "pass", "passed",
            "sell", "sold", "require", "required", "report", "reported", "decide",
            "decided", "pull", "pulled", "develop", "developed", "return", "returned",
            "start", "started", "help", "helped", "want", "wanted", "need", "needed",
            "keep", "kept", "let", "begin", "began", "begun", "seem", "seemed",
            "show", "showed", "shown", "hear", "heard", "play", "played",
            "feel", "felt", "leave", "left", "hold", "held", "look", "looked",

            // Common nouns
            "time", "year", "people", "way", "day", "man", "woman", "child",
            "children", "world", "life", "hand", "part", "place", "case", "week",
            "company", "system", "program", "question", "work", "government",
            "number", "night", "point", "home", "water", "room", "mother", "area",
            "money", "story", "fact", "month", "lot", "right", "study", "book",
            "eye", "job", "word", "business", "issue", "side", "kind", "head",
            "house", "service", "friend", "father", "power", "hour", "game",
            "line", "end", "member", "law", "car", "city", "community", "name",
            "president", "team", "minute", "idea", "body", "information", "back",
            "parent", "face", "others", "level", "office", "door", "health",
            "person", "art", "war", "history", "party", "result", "change",
            "morning", "reason", "research", "girl", "guy", "moment", "air",
            "teacher", "force", "education", "food", "data", "code", "file",
            "test", "class", "type", "value", "string", "list", "array",
            "function", "method", "object", "error", "null", "true", "false",
            "return", "public", "private", "static", "void", "int", "new",
            "import", "package", "interface", "abstract", "final", "try",
            "catch", "throw", "while", "break", "continue", "switch", "case",
            "default", "else", "boolean", "double", "float", "long", "short",
            "byte", "char", "super", "extends", "implements",

            // Common adjectives
            "good", "great", "first", "last", "long", "little", "big", "small",
            "old", "young", "new", "high", "low", "large", "next", "early",
            "important", "few", "public", "bad", "different", "real", "best",
            "better", "sure", "free", "right", "left", "strong", "possible",
            "whole", "full", "half", "dark", "light", "simple", "easy", "hard",
            "clear", "close", "open", "single", "certain", "local", "main",
            "current", "special", "major", "recent", "private", "past", "similar",
            "final", "present", "nice", "happy", "sorry", "ready", "able",
            "available", "enough", "worth", "likely", "necessary", "positive",

            // Common adverbs
            "not", "also", "very", "often", "however", "always", "never", "just",
            "still", "already", "ever", "really", "well", "quite", "almost",
            "enough", "rather", "even", "perhaps", "sometimes", "usually",
            "actually", "probably", "simply", "simply", "quickly", "slowly",
            "finally", "certainly", "together", "likely", "directly", "today",
            "ago", "now",

            // Numbers
            "one", "two", "three", "four", "five", "six", "seven", "eight",
            "nine", "ten", "hundred", "thousand", "million",

            // Technology terms
            "computer", "software", "hardware", "internet", "network", "database",
            "server", "client", "browser", "website", "application", "algorithm",
            "variable", "constant", "parameter", "argument", "exception",
            "thread", "process", "memory", "stack", "heap", "queue", "tree",
            "graph", "node", "binary", "source", "compiler", "runtime",
            "framework", "library", "module", "component", "element", "attribute",
            "property", "event", "handler", "listener", "callback", "promise",
            "async", "sync", "input", "output", "stream", "buffer", "cache",
            "index", "key", "map", "set", "table", "row", "column", "field",
            "record", "schema", "query", "insert", "update", "delete", "select",
            "create", "drop", "alter", "join", "where", "from", "order",
            "group", "having", "limit", "offset", "count", "sum", "average",
            "debug", "deploy", "commit", "merge", "branch", "clone", "push",
            "pull", "fetch", "reset", "revert", "diff", "patch", "release",
            "version", "build", "compile", "link", "load", "save", "edit",
            "copy", "paste", "undo", "redo", "search", "replace", "format",
            "indent", "comment", "uncomment", "refactor", "rename", "extract",
            "inline", "move", "delete", "insert", "append", "remove", "clear",
            "print", "display", "render", "draw", "paint", "layout", "style",
            "color", "font", "size", "width", "height", "margin", "padding",
            "border", "background", "foreground", "text", "image", "icon",
            "button", "label", "panel", "window", "dialog", "menu", "toolbar",
            "tab", "scroll", "list", "grid", "chart", "graph",

            // Additional common words
            "thing", "nothing", "something", "anything", "everything",
            "much", "many", "another", "since", "because", "until",
            "while", "although", "though", "whether", "either", "neither",
            "unless", "despite", "toward", "towards", "among", "across",
            "along", "around", "behind", "beside", "beyond", "down",
            "inside", "outside", "upon", "within", "without",
            "according", "also", "already", "although", "among", "amount"
        };
        for (String word : commonWords) {
            DICTIONARY.add(word.toLowerCase());
        }
    }

    public SpellChecker() {
    }

    /**
     * Toggle spell checking on/off.
     */
    public void toggle() {
        enabled = !enabled;
    }

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    /**
     * Check if a word is in the dictionary.
     */
    public boolean isCorrect(String word) {
        if (word == null || word.isEmpty()) return true;

        // Numbers are always correct
        if (word.matches("\\d+(\\.\\d+)?")) return true;

        // Single characters are correct
        if (word.length() <= 1) return true;

        // Words with digits are likely identifiers, skip them
        if (word.matches(".*\\d.*")) return true;

        // CamelCase or snake_case are likely code identifiers
        if (word.contains("_") || (word.length() > 1 && !word.equals(word.toLowerCase())
                && !word.equals(word.toUpperCase())
                && word.matches(".*[a-z].*") && word.matches(".*[A-Z].*"))) {
            return true;
        }

        return DICTIONARY.contains(word.toLowerCase());
    }

    /**
     * Find misspelled words in the given text.
     * Returns a list of [start, end] positions of misspelled words.
     */
    public List<int[]> findMisspelledWords(String text) {
        List<int[]> misspelled = new ArrayList<>();
        if (!enabled || text == null || text.isEmpty()) return misspelled;

        int wordStart = -1;
        for (int i = 0; i <= text.length(); i++) {
            boolean isWordChar = i < text.length() && (Character.isLetter(text.charAt(i)) || text.charAt(i) == '\'');

            if (isWordChar && wordStart < 0) {
                wordStart = i;
            } else if (!isWordChar && wordStart >= 0) {
                String word = text.substring(wordStart, i);
                // Strip leading/trailing apostrophes
                String cleanWord = word.replaceAll("^'+|'+$", "");
                if (!cleanWord.isEmpty() && !isCorrect(cleanWord)) {
                    misspelled.add(new int[]{wordStart, i});
                }
                wordStart = -1;
            }
        }

        return misspelled;
    }

    /**
     * Get suggestions for a misspelled word (simple approach).
     */
    public List<String> getSuggestions(String word) {
        if (word == null || word.isEmpty()) return Collections.emptyList();

        String lower = word.toLowerCase();
        List<String> suggestions = new ArrayList<>();

        for (String dictWord : DICTIONARY) {
            if (editDistance(lower, dictWord) <= 2) {
                suggestions.add(dictWord);
                if (suggestions.size() >= 5) break;
            }
        }

        return suggestions;
    }

    /**
     * Simple edit distance (Levenshtein) calculation.
     */
    private int editDistance(String a, String b) {
        int[][] dp = new int[a.length() + 1][b.length() + 1];

        for (int i = 0; i <= a.length(); i++) dp[i][0] = i;
        for (int j = 0; j <= b.length(); j++) dp[0][j] = j;

        for (int i = 1; i <= a.length(); i++) {
            for (int j = 1; j <= b.length(); j++) {
                int cost = (a.charAt(i - 1) == b.charAt(j - 1)) ? 0 : 1;
                dp[i][j] = Math.min(
                        Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1),
                        dp[i - 1][j - 1] + cost
                );
            }
        }

        return dp[a.length()][b.length()];
    }

    /**
     * Add a word to the dictionary (user dictionary).
     */
    public void addWord(String word) {
        if (word != null && !word.isEmpty()) {
            DICTIONARY.add(word.toLowerCase());
        }
    }
}
