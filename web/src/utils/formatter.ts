// Format code by language using prettier (browser standalone) or sql-formatter.
// Returns formatted code, or original code if formatting fails / language not supported.

export interface FormatResult {
  code: string;
  formatted: boolean;  // true if a formatter was applied successfully
  formatter: string | null;  // 'prettier' | 'sql-formatter' | null
  error?: string;
}

/**
 * Format an entire document by language.
 */
export async function formatCode(code: string, language: string): Promise<FormatResult> {
  try {
    if (language === 'sql') {
      const { format } = await import('sql-formatter');
      const formatted = format(code, { language: 'sql' });
      return { code: formatted, formatted: true, formatter: 'sql-formatter' };
    }

    const parser = getPrettierParser(language);
    if (!parser) {
      return { code, formatted: false, formatter: null };
    }

    const prettier = await import('prettier/standalone');
    const plugins = await loadPrettierPlugins(parser);

    const formatted = await prettier.format(code, {
      parser,
      plugins: plugins as never[],
      tabWidth: 2,
      useTabs: false,
      semi: true,
      singleQuote: false,
      trailingComma: 'es5',
      printWidth: 100,
      proseWrap: 'preserve',
    });

    return { code: formatted, formatted: true, formatter: 'prettier' };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { code, formatted: false, formatter: null, error: msg };
  }
}

/**
 * Format only the selected text. Preserves leading indentation.
 */
export async function formatSelection(selectedText: string, language: string): Promise<FormatResult> {
  // Detect leading indentation of the FIRST line to re-apply to the result
  const lines = selectedText.split('\n');
  const firstLineIndent = lines[0].match(/^[\s]*/)?.[0] ?? '';

  // Format selection without leading indent for prettier (it would treat it as syntax)
  const trimmed = selectedText.replace(/^\s+/, '');
  const result = await formatCode(trimmed, language);

  if (!result.formatted) return result;

  // Re-apply original first-line indent and indent subsequent lines uniformly
  const formattedLines = result.code.replace(/\n$/, '').split('\n');
  const reIndented = formattedLines
    .map((line, i) => i === 0 ? firstLineIndent + line : firstLineIndent + line)
    .join('\n');

  return { ...result, code: reIndented };
}

function getPrettierParser(language: string): string | null {
  switch (language) {
    case 'javascript':
    case 'jsx':
      return 'babel';
    case 'typescript':
    case 'tsx':
      return 'typescript';
    case 'json':
    case 'jsonc':
      return 'json';
    case 'css':
      return 'css';
    case 'scss':
      return 'scss';
    case 'less':
      return 'less';
    case 'html':
      return 'html';
    case 'markdown':
      return 'markdown';
    case 'yaml':
      return 'yaml';
    case 'graphql':
      return 'graphql';
    default:
      return null;
  }
}

async function loadPrettierPlugins(parser: string): Promise<unknown[]> {
  const plugins: unknown[] = [];
  // Plugins are imported dynamically per parser to keep bundle small at runtime
  switch (parser) {
    case 'babel':
    case 'json':
      plugins.push((await import('prettier/plugins/babel')).default);
      plugins.push((await import('prettier/plugins/estree')).default);
      break;
    case 'typescript':
      plugins.push((await import('prettier/plugins/typescript')).default);
      plugins.push((await import('prettier/plugins/estree')).default);
      break;
    case 'css':
    case 'scss':
    case 'less':
      plugins.push((await import('prettier/plugins/postcss')).default);
      break;
    case 'html':
      plugins.push((await import('prettier/plugins/html')).default);
      break;
    case 'markdown':
      plugins.push((await import('prettier/plugins/markdown')).default);
      break;
    case 'yaml':
      plugins.push((await import('prettier/plugins/yaml')).default);
      break;
    case 'graphql':
      plugins.push((await import('prettier/plugins/graphql')).default);
      break;
  }
  return plugins;
}

/**
 * True if the given language has a built-in formatter.
 */
export function isFormatSupported(language: string): boolean {
  if (language === 'sql') return true;
  return getPrettierParser(language) !== null;
}
