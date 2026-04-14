# Folio

A modern, beautiful text editor with Markdown support built with **Tauri + React + TypeScript + Tailwind CSS + Monaco Editor**.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Platform](https://img.shields.io/badge/platform-macOS-lightgrey.svg)

## Features

### Editor
- **Monaco Editor** (VS Code engine) with 100+ language syntax highlighting
- Multi-tab editing with drag & drop reorder, pin, rename
- Auto-completion, code folding, bracket matching, multi-cursor
- Emmet support for HTML/CSS
- Find & Replace with regex support
- Project-wide search (Cmd+Shift+F)

### Markdown
- Live preview with split view (Text / WYSIWYG toggle)
- GitHub Flavored Markdown (tables, task lists, strikethrough)
- KaTeX math rendering ($inline$ and $$block$$)
- Syntax-highlighted code blocks
- Markdown shortcuts (Cmd+B bold, Cmd+I italic)
- Table editor, TOC generation, image paste from clipboard

### File Management
- File tree with 40+ extension icons and filter (wildcard support)
- Multi-root workspace (add/remove directories)
- Context menu: New File, New Folder, Rename, Delete, File Info, Copy Path
- Recent file history
- Auto-save support

### Git Integration
- File tree git status coloring (modified, added, untracked, deleted)
- Git panel: stage, commit, push, pull
- Commit log viewer
- Branch display

### UI/UX
- Dark / Light theme with Tailwind CSS
- Resizable 3-panel layout (Sidebar | Editor | Right Panel)
- Icon toolbar with tooltips
- Status bar: file path, cursor position, word count, encoding, language
- Breadcrumb navigation
- Zen Mode (distraction-free fullscreen)
- Integrated terminal
- Session restore (window size, open tabs, panel states)

### Settings
- Font family & size
- Tab size, word wrap
- Auto-save interval
- Theme preference
- Editor padding

## Screenshots

| Dark Theme | Light Theme |
|:---:|:---:|
| *Coming soon* | *Coming soon* |

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) 18+
- [Rust](https://www.rust-lang.org/tools/install) 1.70+
- [Tauri CLI](https://v2.tauri.app/start/prerequisites/)

### Install & Run

```bash
# Clone
git clone https://github.com/focuschange/folio.git
cd folio/web

# Install dependencies
npm install

# Development mode (hot reload)
npx tauri dev

# Production build
npx tauri build
```

The built app will be at:
- `.app`: `web/src-tauri/target/release/bundle/macos/Folio.app`
- `.dmg`: `web/src-tauri/target/release/bundle/dmg/Folio_1.0.0_aarch64.dmg`

### Install to Applications

```bash
cp -r web/src-tauri/target/release/bundle/macos/Folio.app /Applications/
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Tailwind CSS 3 |
| Editor | Monaco Editor (@monaco-editor/react) |
| Build | Vite |
| Backend | Rust, Tauri 2.x |
| State | Zustand |
| Markdown | react-markdown, remark-gfm, rehype-highlight, KaTeX |
| Icons | lucide-react |

## Project Structure

```
folio/
├── web/                        # Tauri + React app
│   ├── src/
│   │   ├── components/         # React components
│   │   │   ├── Layout/         # MainLayout, Toolbar, StatusBar, Sidebar
│   │   │   ├── Editor/         # Monaco, Tabs, Breadcrumb
│   │   │   ├── FileTree/       # File tree browser
│   │   │   ├── Markdown/       # Preview, Table editor
│   │   │   ├── Search/         # Project search
│   │   │   ├── Git/            # Git panel
│   │   │   ├── Terminal/       # Integrated terminal
│   │   │   └── Settings/       # Settings dialog
│   │   ├── hooks/              # Custom React hooks
│   │   ├── store/              # Zustand state management
│   │   ├── utils/              # Utilities
│   │   └── types/              # TypeScript types
│   ├── src-tauri/
│   │   ├── src/commands/       # Rust backend commands
│   │   ├── Cargo.toml
│   │   └── tauri.conf.json
│   └── package.json
├── src/                        # JavaFX version (legacy)
├── CLAUDE.md                   # Claude Code project guide
└── README.md
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Cmd+O | Open File |
| Cmd+Shift+F | Search in Project |
| Cmd+Shift+P | Command Palette |
| Cmd+B | Toggle Sidebar / Bold (in Markdown) |
| Cmd+I | Italic (in Markdown) |
| Cmd+F | Find |
| Cmd+H | Find & Replace |
| Cmd+S | Save |
| Cmd+W | Close Tab |
| Cmd+, | Settings |
| Ctrl+` | Toggle Terminal |
| Cmd+D | Select Next Occurrence |
| F2 | Next Bookmark |

## Legacy JavaFX Version

The original JavaFX version is in the root directory with 45 Java files and AtlantaFX theme. Build with:

```bash
./gradlew build
./gradlew run
```

## License

MIT

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
