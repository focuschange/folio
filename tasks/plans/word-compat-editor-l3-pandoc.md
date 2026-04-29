---
title: Word 호환 편집기 (L3 양방향 + pandoc sidecar)
status: draft
created: 2026-04-28
owner: leesangho
estimate: 2.5–4주 (1인 풀타임)
---

# Word 호환 편집기 (L3 + pandoc)

> 이 plan은 사용자 요청으로 **저장만** 해둔 상태입니다. 진행 시작 시 status 를 `in_progress` 로 변경하고 Step 2(Implement) 로 넘어갑니다.

## 0. 목표 / 비목표

### 목표
- `.docx` 를 Folio 에서 **열기 / 편집 / 저장**.
- 보존 포맷: 굵기, 기울임, 밑줄, 헤딩(H1~H6), 단락, 리스트(번호/불릿), 표, 인라인 코드, 링크, 이미지(읽기), 수평선, 인용문.
- 변환 실패 / 손실은 **사용자에게 명시 경고**, 작업은 계속 가능.

### 비목표 (이번 마일스톤 제외)
- 추적변경, 주석, 매크로
- 머리글/바닥글, 페이지 번호, 섹션 구분
- 정교한 스타일(폰트 패밀리/색/크기), 페이지 레이아웃, 목차 자동 생성
- 그림 편집, 도형, SmartArt, 차트
- `.doc` (구 바이너리) — `.docx` 만 지원

---

## 1. 아키텍처 결정

### (a) 에디터 코어
- Monaco 는 **그대로 유지**. 새 "Word 모드"는 별도 컴포넌트.
- WYSIWYG: **TipTap** (ProseMirror 기반, MIT, 표/이미지/헤딩 확장 풍부).

### (b) 변환 엔진
- **pandoc sidecar 번들** (Tauri sidecar 기능, 사용자 설치 불필요).
- 플랫폼별 바이너리: `pandoc-aarch64-apple-darwin`, `pandoc-x86_64-apple-darwin`.
- 라이선스: GPL — `THIRD_PARTY_NOTICES` 동봉. sidecar 호출은 링킹 아님 → Folio 본체 라이선스 영향 없음.
- 앱 크기 +30MB 감수.

### (c) 변환 흐름
```
[열기]   .docx ──pandoc──▶ HTML ──TipTap import──▶ 편집 가능 문서
[저장]   TipTap doc ──HTML export──▶ pandoc ──▶ .docx
[자동저장]  미저장 변경은 .md(자체 캐시) 로, 명시적 저장 시에만 docx 변환
```

### (d) 모드 분리
- `EditorTab` 에 `editorKind: 'monaco' | 'tiptap'` 추가.
- `.docx` 는 항상 `tiptap`. 그 외 파일은 `monaco` 유지 (변경 없음).
- `EditorArea` 가 `editorKind` 로 분기 렌더.

---

## 2. 변경 범위 — 파일별

### Rust 백엔드 (`web/src-tauri/`)
| 파일 | 변경 |
|------|------|
| `tauri.conf.json` | sidecar 등록, 번들 리소스 추가 |
| `src/commands/file_commands.rs` | `.docx` 분기 (또는 별도 명령으로 분리) |
| `src/commands/docx_commands.rs` (신규) | pandoc sidecar 호출 래퍼. 임시파일 경유 |
| `src/lib.rs` | 새 명령 등록 |
| `Cargo.toml` | `tauri-plugin-shell` 추가 |
| `binaries/` (신규) | pandoc 바이너리 (mac arm64/x64 우선; win/linux 후속) |

### React 프론트엔드 (`web/src/`)
| 파일 | 변경 |
|------|------|
| `package.json` | `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-table`, `@tiptap/extension-image`, `@tiptap/extension-link`, `@tiptap/extension-underline` |
| `components/Editor/TipTapEditor.tsx` (신규) | 본체 |
| `components/Editor/TipTapToolbar.tsx` (신규) | 굵기/기울임/헤딩/리스트/표/이미지/링크 |
| `components/Editor/EditorArea.tsx` | `editorKind` 분기 |
| `components/Editor/EditorTabs.tsx` | docx 탭 표시 + 인코딩/언어 메뉴 비활성 |
| `components/FileTree/FileTree.tsx` | `.docx` 더블클릭 → docx 열기 |
| `components/Layout/MenuBar.tsx` | "파일 열기"에 .docx 필터 |
| `hooks/useFileSystem.ts` | `openDocx`, `saveDocx` |
| `store/useAppStore.ts` | `editorKind` 필드, docx 저장 로직 |
| `types/index.ts` | `EditorTab` 에 `editorKind`, `htmlContent?` |
| `utils/docxConverter.ts` (신규) | TipTap HTML ↔ pandoc HTML 정합 헬퍼 |

### 검색/Git/세션
| 영역 | 변경 |
|------|------|
| `ProjectSearch` | docx 검색 제외 (이번 범위 외 인덱싱) |
| `GitPanel` | docx diff 의미 없음 안내 |
| `useSession.ts` | docx 탭 복원 시 재변환 |

---

## 3. 단계별 구현 계획

| Step | 작업 | 산출물 | 예상 |
|------|------|--------|------|
| 1 | pandoc sidecar 셋업 | `tauri.conf.json` + `binaries/`. Rust 에서 `pandoc --version` 성공 | 0.5일 |
| 2 | Rust `docx_commands` | `read_docx_as_html`, `write_html_as_docx`. 한글 round-trip 수동 검증 | 1일 |
| 3 | TipTap 도입 (최소) | 굵기/기울임/헤딩/리스트 동작 | 1.5일 |
| 4 | EditorArea 분기 | docx 탭 → TipTap, 그 외 → Monaco | 0.5일 |
| 5 | 열기/저장 워크플로 | `.docx` 더블클릭 열기, ⌘S 로 pandoc 저장 | 1일 |
| 6 | 표·이미지 | TipTap 표 확장 + 이미지(base64 inline) | 2일 |
| 7 | 툴바 UI | 12~15개 버튼, ⌘B/I/U, 헤딩 드롭다운 | 1.5일 |
| 8 | dirty / 자동저장 | htmlContent 변경 → dirty=true. 자동저장은 .md 캐시 | 1일 |
| 9 | 손실 경고 다이얼로그 | "추적변경/주석/스타일 손실 가능" — 다시 보지 않기 옵션 | 0.5일 |
| 10 | 세션 복원 | docx 탭 재변환 복원 | 0.5일 |
| 11 | 검색/Git 분기 | docx 제외 / 안내 | 0.5일 |
| 12 | 테스트 round-trip | 한글/영문/표/이미지/리스트 5종 | 1일 |
| 13 | 빌드 통합 (Mac arm64) | `npx tauri build` → /Applications 에서 동작 | 0.5일 |

**총 약 11.5일 (1인 풀타임 ≈ 2.5주)**. 변환 품질 이슈 슬립 감안 → **3~4주 현실 추정**.

> Win/Linux pandoc 바이너리 처리 / 서명 / notarization 은 **이번 마일스톤 범위 외** (후속).

---

## 4. ⚠️ 사이드이펙트 점검

- [ ] 앱 번들 크기: ~25MB → ~55MB
- [ ] 세션: 신규 `editorKind` 옵셔널 → 하위 호환 유지 (없으면 `monaco` 폴백)
- [ ] Monaco 단축키 충돌: TipTap 모드일 때만 자체 키 처리
- [ ] 마크다운 미리보기: 영향 없음
- [ ] 검색 인덱스: docx 미지원 사실 사용자 안내 필요
- [ ] Git diff: docx binary 안내
- [ ] 자동저장: docx 30초마다 변환 비용 ↑ → .md 사이드 캐시 우회
- [ ] pandoc GPL: `THIRD_PARTY_NOTICES` 추가
- [ ] macOS notarization: sidecar 바이너리 entitlements 설정
- [ ] 인코딩: pandoc 호출은 임시파일 경유 (stdin pipe 보다 안전)
- [ ] 이미지: pandoc 추출 → base64 inline → 저장 시 재임베드

---

## 5. 검증 전략

### 자동 (Step 4 — Verify)
- `npx tsc --noEmit`
- `cargo check`
- `npx tauri build` (번들 성공 + 크기 보고)

### 수동 QA (Step 5)
1. 순수 텍스트 docx (한/영) → 글자 동일
2. 포맷 docx (H1~H3, B/I/U, 리스트) → 보존
3. 표 docx (3x3) → 내용 보존, 셀 병합 손실 가능 (경고)
4. 이미지 docx (PNG 1장) → 보임/저장 유지
5. 복잡 docx (추적변경, 주석, 머리글) → "지원 안 함" 경고 노출

### 알려진 손실 (사전 고지)
- 폰트/색/크기 (표준 스타일만)
- 페이지 레이아웃, 머리글/바닥글, 페이지 번호
- 추적변경, 주석, 매크로, 수식, 차트, SmartArt, 도형

---

## 6. 마일스톤 단위 출시 제안

- **M1** (Step 1~5): 읽기/저장 + 기본 서식 — "alpha, 표/이미지 없음"
- **M2** (Step 6~9): 표·이미지·툴바 완성 — "beta, 일반 문서 OK"
- **M3** (Step 10~13): 세션·검색·Git·빌드 — "stable"

각 마일스톤마다 develop 머지 + 사용자 피드백.

---

## 7. 미결정 / 재논의 항목 (착수 전 확정)

1. **단일 PR vs 마일스톤 분할** — 권장: 분할 (M1 부터 단계 출시)
2. **첫 출발점**: M1 alpha 만 (약 1주) vs 전체 묶음
3. **pandoc 바이너리 호스팅**: 저장소 직접 포함 vs LFS vs 다운로드 후 검증
4. **저장 단축키 동작**: ⌘S 로 즉시 docx 변환 vs "저장 시 변환" 옵션
5. **자동저장 캐시 위치**: `~/.folio/cache/docx-autosave/` 등 정책 결정

---

## 변경 이력
- 2026-04-28: 초안 작성, status=draft (사용자 요청으로 다른 작업 우선, 보류)
