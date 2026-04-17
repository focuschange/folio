export interface Snippet {
  prefix: string;
  label: string;
  body: string;
  description: string;
}

export const snippetsByLanguage: Record<string, Snippet[]> = {
  java: [
    { prefix: 'sout', label: 'System.out.println', body: 'System.out.println($1);', description: 'Print to stdout' },
    { prefix: 'main', label: 'main method', body: 'public static void main(String[] args) {\n\t$1\n}', description: 'Main method' },
    { prefix: 'fori', label: 'for loop', body: 'for (int ${1:i} = 0; ${1:i} < ${2:length}; ${1:i}++) {\n\t$3\n}', description: 'For loop with index' },
    { prefix: 'foreach', label: 'for-each loop', body: 'for (${1:type} ${2:item} : ${3:collection}) {\n\t$4\n}', description: 'Enhanced for loop' },
    { prefix: 'try', label: 'try-catch', body: 'try {\n\t$1\n} catch (${2:Exception} ${3:e}) {\n\t${4:e.printStackTrace();}\n}', description: 'Try-catch block' },
    { prefix: 'class', label: 'class', body: 'public class ${1:ClassName} {\n\t$2\n}', description: 'Class declaration' },
  ],
  python: [
    { prefix: 'def', label: 'function', body: 'def ${1:name}(${2:params}):\n\t${3:pass}', description: 'Function definition' },
    { prefix: 'class', label: 'class', body: 'class ${1:ClassName}:\n\tdef __init__(self${2:, params}):\n\t\t${3:pass}', description: 'Class definition' },
    { prefix: 'ifmain', label: 'if __name__', body: 'if __name__ == "__main__":\n\t${1:main()}', description: 'Main guard' },
    { prefix: 'try', label: 'try-except', body: 'try:\n\t${1:pass}\nexcept ${2:Exception} as ${3:e}:\n\t${4:raise}', description: 'Try-except block' },
    { prefix: 'with', label: 'with statement', body: 'with ${1:expression} as ${2:variable}:\n\t${3:pass}', description: 'With statement' },
    { prefix: 'for', label: 'for loop', body: 'for ${1:item} in ${2:iterable}:\n\t${3:pass}', description: 'For loop' },
  ],
  javascript: [
    { prefix: 'clg', label: 'console.log', body: 'console.log($1);', description: 'Console log' },
    { prefix: 'fn', label: 'arrow function', body: 'const ${1:name} = (${2:params}) => {\n\t$3\n};', description: 'Arrow function' },
    { prefix: 'afn', label: 'async function', body: 'const ${1:name} = async (${2:params}) => {\n\t$3\n};', description: 'Async arrow function' },
    { prefix: 'imp', label: 'import', body: "import { $2 } from '$1';", description: 'Import statement' },
    { prefix: 'try', label: 'try-catch', body: 'try {\n\t$1\n} catch (${2:error}) {\n\t$3\n}', description: 'Try-catch block' },
    { prefix: 'map', label: 'array map', body: '${1:array}.map((${2:item}) => {\n\t$3\n})', description: 'Array map' },
  ],
  typescript: [
    { prefix: 'clg', label: 'console.log', body: 'console.log($1);', description: 'Console log' },
    { prefix: 'int', label: 'interface', body: 'interface ${1:Name} {\n\t${2:key}: ${3:type};\n}', description: 'Interface' },
    { prefix: 'type', label: 'type alias', body: 'type ${1:Name} = ${2:type};', description: 'Type alias' },
    { prefix: 'fn', label: 'typed arrow function', body: 'const ${1:name} = (${2:params}: ${3:type}): ${4:ReturnType} => {\n\t$5\n};', description: 'Typed arrow function' },
    { prefix: 'afn', label: 'async function', body: 'const ${1:name} = async (${2:params}): Promise<${3:ReturnType}> => {\n\t$4\n};', description: 'Async typed function' },
  ],
  html: [
    { prefix: '!', label: 'HTML5 boilerplate', body: '<!DOCTYPE html>\n<html lang="en">\n<head>\n\t<meta charset="UTF-8">\n\t<meta name="viewport" content="width=device-width, initial-scale=1.0">\n\t<title>${1:Document}</title>\n</head>\n<body>\n\t$2\n</body>\n</html>', description: 'HTML5 boilerplate' },
    { prefix: 'div', label: 'div', body: '<div class="$1">\n\t$2\n</div>', description: 'Div with class' },
    { prefix: 'a', label: 'anchor', body: '<a href="$1">$2</a>', description: 'Anchor tag' },
    { prefix: 'img', label: 'image', body: '<img src="$1" alt="$2" />', description: 'Image tag' },
    { prefix: 'link', label: 'CSS link', body: '<link rel="stylesheet" href="$1">', description: 'CSS link tag' },
    { prefix: 'script', label: 'script', body: '<script src="$1"></script>', description: 'Script tag' },
  ],
  groovy: [
    { prefix: 'println', label: 'println', body: 'println $1', description: 'Print to stdout' },
    { prefix: 'def', label: 'def variable', body: 'def ${1:name} = ${2:value}', description: 'Dynamic variable' },
    { prefix: 'method', label: 'method', body: 'def ${1:name}(${2:args}) {\n\t$3\n}', description: 'Method definition' },
    { prefix: 'class', label: 'class', body: 'class ${1:ClassName} {\n\t$2\n}', description: 'Class declaration' },
    { prefix: 'each', label: 'each loop', body: '${1:collection}.each { ${2:item} ->\n\t$3\n}', description: 'Collection each' },
    { prefix: 'closure', label: 'closure', body: '{ ${1:args} -> $2 }', description: 'Closure' },
    { prefix: 'task', label: 'gradle task', body: "task ${1:taskName} {\n\tdoLast {\n\t\t$2\n\t}\n}", description: 'Gradle task' },
    { prefix: 'if', label: 'if statement', body: 'if (${1:condition}) {\n\t$2\n}', description: 'If statement' },
    { prefix: 'try', label: 'try-catch', body: 'try {\n\t$1\n} catch (${2:Exception} ${3:e}) {\n\t$4\n}', description: 'Try-catch' },
    { prefix: 'gstring', label: 'gstring', body: '"${1:text} ${${2:var}}"', description: 'Interpolated string' },
  ],
  shell: [
    { prefix: 'shebang', label: 'shebang', body: '#!/usr/bin/env bash\n\nset -euo pipefail\n\n$1', description: 'Bash shebang with strict mode' },
    { prefix: 'if', label: 'if statement', body: 'if [[ ${1:condition} ]]; then\n\t$2\nfi', description: 'If statement' },
    { prefix: 'ife', label: 'if-else', body: 'if [[ ${1:condition} ]]; then\n\t$2\nelse\n\t$3\nfi', description: 'If-else statement' },
    { prefix: 'for', label: 'for loop', body: 'for ${1:item} in ${2:list}; do\n\t$3\ndone', description: 'For loop' },
    { prefix: 'fori', label: 'for C-style', body: 'for ((${1:i}=0; ${1:i}<${2:n}; ${1:i}++)); do\n\t$3\ndone', description: 'C-style for loop' },
    { prefix: 'while', label: 'while loop', body: 'while [[ ${1:condition} ]]; do\n\t$2\ndone', description: 'While loop' },
    { prefix: 'case', label: 'case statement', body: 'case "${1:var}" in\n\t${2:pattern})\n\t\t$3\n\t\t;;\n\t*)\n\t\t$4\n\t\t;;\nesac', description: 'Case statement' },
    { prefix: 'fn', label: 'function', body: '${1:name}() {\n\t$2\n}', description: 'Function definition' },
    { prefix: 'args', label: 'args parse', body: 'while [[ $# -gt 0 ]]; do\n\tcase "$1" in\n\t\t-${1:f}|--${2:flag})\n\t\t\t$3\n\t\t\tshift\n\t\t\t;;\n\t\t*)\n\t\t\techo "Unknown: $1"\n\t\t\texit 1\n\t\t\t;;\n\tesac\ndone', description: 'Parse CLI arguments' },
    { prefix: 'check', label: 'command check', body: 'if ! command -v ${1:cmd} &> /dev/null; then\n\techo "${1:cmd} not installed" >&2\n\texit 1\nfi', description: 'Check command exists' },
    { prefix: 'trap', label: 'trap cleanup', body: 'cleanup() {\n\t$1\n}\ntrap cleanup EXIT', description: 'Trap EXIT for cleanup' },
  ],
  markdown: [
    { prefix: 'link', label: 'link', body: '[$1]($2)', description: 'Markdown link' },
    { prefix: 'img', label: 'image', body: '![$1]($2)', description: 'Markdown image' },
    { prefix: 'table', label: 'table', body: '| $1 | $2 |\n| --- | --- |\n| $3 | $4 |', description: 'Markdown table' },
    { prefix: 'code', label: 'code block', body: '```$1\n$2\n```', description: 'Fenced code block' },
    { prefix: 'task', label: 'task list', body: '- [ ] $1\n- [ ] $2', description: 'Task list' },
  ],
};
