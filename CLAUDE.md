# CLAUDE.md

AnyPicToAnyPic — 브라우저 안에서 동작하는 이미지 형식 변환 사이트 (Next.js 16 정적 export, Cloudflare Workers 배포, ko/en).

**먼저 `HANDOFF.md`를 읽을 것** (현재 상태, 인프라, 앞으로 할 일, 함정). Next.js 코드를 건드리기 전에는 `AGENTS.md`와 `node_modules/next/dist/docs/`도 확인.

핵심 규칙:
- 사이트(코드·콘텐츠·메타)에 운영자 실명을 절대 넣지 않는다. 운영자는 "게임을 개발하는 개인 개발자".
- 파일은 서버로 전송되지 않는다는 약속을 깨는 변경 금지.
- 커밋은 저장소 로컬의 익명 작성자 설정을 유지, 강제 push·저장소 삭제 등은 사용자 확인 후에만.
- 사용자와는 한국어로 대화하고, 클릭할 곳·입력할 값을 구체적으로 안내.
- Bash 도구는 역슬래시를 지우고 PowerShell은 한글 파일을 깨뜨린다 → 코드/한글 파일은 Write/Edit 도구로.
- 변경 후 검증: `npm run lint && npx tsc --noEmit && npm test && npm run build && npm run seo:audit` (동작 변경 시 `npm run e2e`).
- 상태·일정이 바뀌면 HANDOFF.md를 같이 갱신.
