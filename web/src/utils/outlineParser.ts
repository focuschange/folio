import type { OutlineSymbol } from '../types';

function parseMarkdown(content: string): OutlineSymbol[] {
  const symbols: OutlineSymbol[] = [];
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      symbols.push({
        name: match[2].trim(),
        kind: 'heading',
        line: i + 1,
      });
    }
  }
  return symbols;
}

function parseTypeScript(content: string): OutlineSymbol[] {
  const symbols: OutlineSymbol[] = [];
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // class
    const classMatch = line.match(/^\s*(?:export\s+)?(?:abstract\s+)?class\s+(\w+)/);
    if (classMatch) {
      symbols.push({ name: classMatch[1], kind: 'class', line: i + 1 });
      continue;
    }
    // interface
    const ifaceMatch = line.match(/^\s*(?:export\s+)?interface\s+(\w+)/);
    if (ifaceMatch) {
      symbols.push({ name: ifaceMatch[1], kind: 'interface', line: i + 1 });
      continue;
    }
    // enum
    const enumMatch = line.match(/^\s*(?:export\s+)?enum\s+(\w+)/);
    if (enumMatch) {
      symbols.push({ name: enumMatch[1], kind: 'enum', line: i + 1 });
      continue;
    }
    // function declarations & arrow functions
    const funcMatch = line.match(/^\s*(?:export\s+)?(?:async\s+)?function\s+(\w+)/);
    if (funcMatch) {
      symbols.push({ name: funcMatch[1], kind: 'function', line: i + 1 });
      continue;
    }
    // const arrow functions (top-level)
    const arrowMatch = line.match(/^\s*(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?(?:\([^)]*\)|[a-zA-Z_]\w*)\s*(?::\s*[^=]+)?\s*=>/);
    if (arrowMatch) {
      symbols.push({ name: arrowMatch[1], kind: 'function', line: i + 1 });
      continue;
    }
    // type alias
    const typeMatch = line.match(/^\s*(?:export\s+)?type\s+(\w+)\s*=/);
    if (typeMatch) {
      symbols.push({ name: typeMatch[1], kind: 'interface', line: i + 1 });
      continue;
    }
  }
  return symbols;
}

function parsePython(content: string): OutlineSymbol[] {
  const symbols: OutlineSymbol[] = [];
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const classMatch = line.match(/^class\s+(\w+)/);
    if (classMatch) {
      symbols.push({ name: classMatch[1], kind: 'class', line: i + 1 });
      continue;
    }
    const defMatch = line.match(/^\s*(?:async\s+)?def\s+(\w+)/);
    if (defMatch) {
      symbols.push({ name: defMatch[1], kind: 'function', line: i + 1 });
      continue;
    }
  }
  return symbols;
}

function parseJava(content: string): OutlineSymbol[] {
  const symbols: OutlineSymbol[] = [];
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const classMatch = line.match(/^\s*(?:public|private|protected)?\s*(?:static\s+)?(?:abstract\s+)?(?:final\s+)?class\s+(\w+)/);
    if (classMatch) {
      symbols.push({ name: classMatch[1], kind: 'class', line: i + 1 });
      continue;
    }
    const ifaceMatch = line.match(/^\s*(?:public|private|protected)?\s*interface\s+(\w+)/);
    if (ifaceMatch) {
      symbols.push({ name: ifaceMatch[1], kind: 'interface', line: i + 1 });
      continue;
    }
    const enumMatch = line.match(/^\s*(?:public|private|protected)?\s*enum\s+(\w+)/);
    if (enumMatch) {
      symbols.push({ name: enumMatch[1], kind: 'enum', line: i + 1 });
      continue;
    }
    const methodMatch = line.match(/^\s*(?:public|private|protected)\s+(?:static\s+)?(?:[\w<>\[\],\s]+)\s+(\w+)\s*\(/);
    if (methodMatch && !['if', 'for', 'while', 'switch', 'catch', 'class', 'interface', 'enum', 'new', 'return'].includes(methodMatch[1])) {
      symbols.push({ name: methodMatch[1], kind: 'method', line: i + 1 });
      continue;
    }
  }
  return symbols;
}

function parseRust(content: string): OutlineSymbol[] {
  const symbols: OutlineSymbol[] = [];
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const fnMatch = line.match(/^\s*(?:pub\s+)?(?:async\s+)?fn\s+(\w+)/);
    if (fnMatch) {
      symbols.push({ name: fnMatch[1], kind: 'function', line: i + 1 });
      continue;
    }
    const structMatch = line.match(/^\s*(?:pub\s+)?struct\s+(\w+)/);
    if (structMatch) {
      symbols.push({ name: structMatch[1], kind: 'class', line: i + 1 });
      continue;
    }
    const traitMatch = line.match(/^\s*(?:pub\s+)?trait\s+(\w+)/);
    if (traitMatch) {
      symbols.push({ name: traitMatch[1], kind: 'interface', line: i + 1 });
      continue;
    }
    const enumMatch = line.match(/^\s*(?:pub\s+)?enum\s+(\w+)/);
    if (enumMatch) {
      symbols.push({ name: enumMatch[1], kind: 'enum', line: i + 1 });
      continue;
    }
    const implMatch = line.match(/^\s*impl(?:<[^>]+>)?\s+(\w+)/);
    if (implMatch) {
      symbols.push({ name: `impl ${implMatch[1]}`, kind: 'class', line: i + 1 });
      continue;
    }
  }
  return symbols;
}

function parseGo(content: string): OutlineSymbol[] {
  const symbols: OutlineSymbol[] = [];
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const funcMatch = line.match(/^func\s+(?:\([^)]+\)\s+)?(\w+)/);
    if (funcMatch) {
      symbols.push({ name: funcMatch[1], kind: 'function', line: i + 1 });
      continue;
    }
    const typeMatch = line.match(/^type\s+(\w+)\s+(struct|interface)/);
    if (typeMatch) {
      symbols.push({ name: typeMatch[1], kind: typeMatch[2] === 'interface' ? 'interface' : 'class', line: i + 1 });
      continue;
    }
  }
  return symbols;
}

export function parseOutline(content: string, language: string): OutlineSymbol[] {
  switch (language) {
    case 'markdown':
      return parseMarkdown(content);
    case 'typescript':
    case 'javascript':
    case 'typescriptreact':
    case 'javascriptreact':
    case 'tsx':
    case 'jsx':
      return parseTypeScript(content);
    case 'python':
      return parsePython(content);
    case 'java':
      return parseJava(content);
    case 'rust':
      return parseRust(content);
    case 'go':
      return parseGo(content);
    default:
      return [];
  }
}
