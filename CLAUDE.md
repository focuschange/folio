# Folio - Project Guide for Claude

## Project Overview
Folio는 마크다운 지원 텍스트 에디터입니다. 두 가지 버전이 존재합니다:
- **JavaFX 버전** (루트): AtlantaFX 테마 적용, 50개 기능 구현
- **Tauri 웹 버전** (`web/`): React + TypeScript + Tailwind CSS + Monaco Editor

## Tech Stack

### JavaFX 버전 (legacy)
- Java 23, JavaFX 23, Gradle (Kotlin DSL)
- RichTextFX (코드 에디터), Flexmark (마크다운), AtlantaFX (테마)
- 빌드: `./gradlew build`, 실행: `./gradlew run`
- 앱 번들: `./scripts/build-dmg.sh`

### Tauri 웹 버전 (active)
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS 3, Monaco Editor
- **Backend**: Rust, Tauri 2.x
- **상태관리**: Zustand
- **마크다운**: react-markdown + remark-gfm + rehype-highlight + KaTeX
- **아이콘**: lucide-react

## Project Structure

```
folio/
├── web/                          # Tauri 웹 버전 (active)
│   ├── src/                      # React frontend
│   │   ├── components/           # UI 컴포넌트
│   │   │   ├── Layout/           # MainLayout, Toolbar, StatusBar, Sidebar
│   │   │   ├── Editor/           # MonacoWrapper, EditorTabs, EditorArea, BreadcrumbBar
│   │   │   ├── FileTree/         # FileTree
│   │   │   ├── Markdown/         # MarkdownPreview, TableEditor
│   │   │   ├── Search/           # ProjectSearch
│   │   │   ├── Git/              # GitPanel
│   │   │   ├── Terminal/         # TerminalPane
│   │   │   └── Settings/         # SettingsDialog
│   │   ├── hooks/                # useFileSystem, useGit, useSettings, useTheme
│   │   ├── store/                # useAppStore (Zustand)
│   │   ├── utils/                # fileIcons, languages, snippets, markdownUtils
│   │   └── types/                # TypeScript 타입 정의
│   ├── src-tauri/                # Rust backend
│   │   ├── src/commands/         # file_commands, git_commands, settings_commands, terminal_commands
│   │   ├── Cargo.toml
│   │   └── tauri.conf.json
│   ├── package.json
│   └── vite.config.ts
├── src/                          # JavaFX 버전 (legacy)
│   └── main/java/com/folio/      # 45 Java files
├── build.gradle.kts
└── scripts/build-dmg.sh
```

## Build & Run Commands

### Tauri 웹 버전
```bash
cd web
npm install                    # 의존성 설치
npm run dev                    # 프론트엔드 dev 서버 (localhost:5173)
npx tauri dev                  # Tauri 개발 모드 (hot reload)
npx tauri build                # 프로덕션 빌드 (.app + .dmg)
npm run build                  # 프론트엔드만 빌드
```

### JavaFX 버전
```bash
./gradlew build                # 빌드
./gradlew run                  # 실행
./scripts/build-dmg.sh         # .app 번들 생성
```

### 앱 설치
```bash
# Tauri 버전
rm -rf /Applications/Folio.app && cp -r web/src-tauri/target/release/bundle/macos/Folio.app /Applications/Folio.app

# JavaFX 버전
rm -rf /Applications/Folio.app && cp -r build/jpackage/Folio.app /Applications/Folio.app
```

## Key Architecture Decisions

### Tauri v2 isTauri 체크
`window.__TAURI_INTERNALS__`를 사용 (v1의 `__TAURI__`와 다름):
```typescript
const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
```

### Tauri 명령 호출 패턴
Dynamic import로 Tauri API를 불러와 웹 모드에서도 크래시 방지:
```typescript
async function tauriInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<T>(cmd, args);
}
```

### 파일 다이얼로그
Rust 백엔드의 `open_folder_dialog` 명령으로 처리 (JS 플러그인 대신):
```rust
#[tauri::command]
pub async fn open_folder_dialog(app: tauri::AppHandle) -> Result<Option<String>, String> {
    // tokio::oneshot::channel로 비동기 처리
}
```

### 리사이저
React state + ref 조합으로 드래그 시 정확한 추적:
- `useRef`로 드래그 시작 시점의 크기 저장
- `useState`로 렌더링 갱신
- `시작 크기 + delta`로 절대 계산

## Rust Backend Commands

| Module | Commands |
|--------|----------|
| file_commands | read_file, write_file, list_directory, get_file_info, rename_file, delete_file, create_file, create_directory, search_in_files, open_folder_dialog |
| git_commands | is_git_repo, git_status, git_diff, git_add, git_commit, git_push, git_pull, git_log, git_branch |
| settings_commands | load_settings, save_settings |
| terminal_commands | run_command |

## Settings
설정 파일: `~/.folio/settings.json`

## TODO
프로젝트 개선 TODO는 Claude memory에 저장:
`/todo` 명령으로 조회/추가
