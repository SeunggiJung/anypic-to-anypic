# HANDOFF — AnyPicToAnyPic 인수인계

> 새 세션에서 이 프로젝트를 이어받는 Claude(또는 사람)를 위한 문서입니다. **이 파일 → CLAUDE.md → README.md** 순서로 읽으면 됩니다.
> 마지막 갱신: **2026-10-20**. 상태가 바뀌면 이 파일을 같이 고치세요 (맨 아래 "갱신 규칙").
> ⚠ 이 저장소는 **공개(public)** 일 수 있습니다. 계정 이름·토큰·실명 같은 개인 정보는 이 문서에 쓰지 마세요.

---

## 0. 30초 요약

- **무엇**: 어떤 이미지든 올리면 형식을 자동 감지해 원하는 형식·크기로 **브라우저 안에서** 바꿔 주는 사이트. 서버 없음(정적 export). 한국어/English.
- **어디**: https://anypictoanypic.com (정식 주소는 **www 없는** 쪽, www는 301 리다이렉트)
- **상태**: 개발·배포·도메인·검색엔진 등록까지 **완료**. 지금은 **기다림 + 콘텐츠 다듬기 + 애드센스 신청 준비** 단계.
- **다음 큰 이벤트**: 2026-11-17경 애드센스 신청(조건 충족 시). 일정은 아래 §4.
- **운영자(사용자)**: 게임을 개발하는 개인. 한국어로 대화. **사이트에 실명이 나오면 안 됨**(§6).

---

## 1. 인프라 지도

| 항목 | 상태 | 비고 |
|---|---|---|
| 호스팅 | Cloudflare **Workers 정적 에셋** | Worker 이름 `anypic-to-anypic`, `wrangler.jsonc`가 `./out`을 에셋으로 배포 |
| 배포 방식 | **Git 연동 자동 배포 (Workers Builds)** | `main`에 push → 자동 빌드·배포 (약 1분). Build `npm run build`, Deploy `npx wrangler deploy`. Node는 `.node-version`(22) |
| 도메인 | `anypictoanypic.com` (Cloudflare Registrar) | 자동 갱신 확인 필요: 2027-09-20 |
| www → 루트 | Cloudflare Redirect Rule, **301**, 경로·쿼리 유지 | 사용자가 대시보드에서 설정 |
| HTTPS | "Always Use HTTPS" 켬 | http → 301 → https |
| workers.dev 주소 | 아직 열려 있음 (canonical은 정식 도메인을 가리킴) | 도메인 안정화 후 끌 수 있음 |
| 저장소 | GitHub, 브랜치 `main` 하나 | **현재 public** (§7 참고). 주소는 `gh repo view`로 확인 |
| Google Search Console | **도메인 속성**, Cloudflare DNS로 소유확인 완료 | 사이트맵 제출·주요 URL 색인 요청 완료 |
| 네이버 서치어드바이저 | 소유확인 완료 (HTML 태그) | 사이트맵 제출/수집 요청은 **사용자 확인 필요**(2026-10-20 안내함) |
| Bing | **미등록** (선택) | Search Console에서 가져오기로 등록 가능 |
| 애드센스 | **미신청** | §4 일정 참고 |

### Cloudflare 빌드 변수 (Settings → Build → Variables and secrets)
`NEXT_PUBLIC_*` 값은 **빌드 때 사이트에 구워집니다**. 바꾸면 **반드시 재배포**(빈 커밋 push)해야 반영됩니다.

| 변수 | 값/상태 |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://anypictoanypic.com` ✅ 설정됨 (canonical·sitemap·hreflang·JSON-LD가 이 값 사용) |
| `NEXT_PUBLIC_NAVER_SITE_VERIFICATION` | ✅ 설정됨 (루트·모든 페이지에 meta 태그 출력) |
| `NEXT_PUBLIC_CONTACT_EMAIL` | 미설정 → 기본값 `tmdrl8336@naver.com` |
| `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | 미설정 (Google은 DNS로 확인해서 불필요) |
| `NEXT_PUBLIC_BING_SITE_VERIFICATION` | 미설정 |
| `NEXT_PUBLIC_ADSENSE_CLIENT` | **미설정** — 애드센스 게시자 ID(`ca-pub-…`). 넣으면 확인용 meta 태그가 나옴 |
| `NEXT_PUBLIC_ADS_ENABLED` | 미설정(=광고 꺼짐). 승인 후 `true` |
| `NEXT_PUBLIC_ADSENSE_SLOT_CONTENT / _ARTICLE / _SIDEBAR` | 미설정. 승인 후 광고 단위 ID |

전체 목록과 설명은 `.env.example`.

---

## 2. 지금까지 만든 것 (기능)

- **변환**: 입력 PNG·JPG·WebP·AVIF·GIF·BMP·ICO·TIFF·HEIC·SVG(매직 넘버로 감지, 확장자 위장도 처리) → 출력 PNG·JPG·WebP·GIF·BMP·ICO·**SVG**(AVIF 출력은 브라우저가 지원할 때만).
- **크기 조절**: 원본/가로/세로/비율/**직접 지정(가로×세로)** + 맞춤(stretch·contain·cover·center) + 정렬 3×3 + 도트(픽셀 아트) 모드 + 여백 색/투명. SVG 입력은 벡터 상태로 목표 크기에 맞춰 그림.
- **SVG 출력(트레이싱)**: `imagetracerjs`(Unlicense) + **자체 median-cut 팔레트**. 변환 전 주의사항 박스, 변환 후 경고(사진 감지·해상도 축소·경로 과다·원본보다 큼), 결과 미리보기. 20만 경로 초과 시 중단.
- **일괄 변환 + ZIP**, 변환 전후 용량 비교, EXIF 제거(JPG→JPG에서만 유지 옵션), **설정 기억**(localStorage `anypic:options:v1`).
- **i18n**: `/ko/…`, `/en/…`. 루트 `/`는 빌드 후처리가 만드는 언어 선택/리다이렉트 페이지(§5).
- **콘텐츠**: 조합 랜딩 63개/언어(`png-to-svg` 등, AVIF 출력 제외) · 형식 설명 10개/언어 · **가이드 13편/언어** · 소개/방침/약관/문의. 총 **186 URL**.
- **SEO**: sitemap(hreflang), robots, canonical, OG 이미지(`public/og`), JSON-LD, `npm run seo:audit`.
- **광고 준비**: `AdSlot` — 변수 없으면 프로덕션에 광고 코드가 **전혀** 없음. `public/ads.txt.sample` 있음.

---

## 3. 품질 현황 (2026-10-20)

| 검사 | 결과 |
|---|---|
| `npm run lint` / `npx tsc --noEmit` | 통과 |
| `npm test` (vitest) | **75개 통과** (형식 감지, EXIF, 레이아웃 계산, 트레이싱/팔레트, 조합 콘텐츠 품질·중복, 설정 저장) |
| `npm run seo:audit` | **186페이지, 문제 0** (title/description 길이·중복, h1, canonical, hreflang 상호참조, JSON-LD, 내부 링크, sitemap 일치) |
| `npm run e2e` | **5개 스위트, 116개 검증, 실패 0** (실제 Chrome, 라이브 사이트에도 실행 가능 `SITE=https://… npm run e2e`) |
| Lighthouse (이전 측정) | 성능 99 / 접근성 100 / 권장사항 100 / SEO 100 |

알려진 제한: 움직이는 GIF/WebP·다중 페이지 TIFF는 첫 장면만, 파일당 50MB, 크기는 px 단위만(DPI 없음), 자르기는 9칸 정렬만, SVG 트레이싱은 추정이라 사진에 부적합.

---

## 4. 앞으로 할 일 (사용자 일정)

사용자에게 PDF(`AnyPic-할일계획.pdf`)와 캘린더용 `.ics`를 바탕화면에 만들어 줬습니다. 같은 내용입니다.

| 날짜 | 할 일 | 상태 |
|---|---|---|
| 10/20 (오늘) | 네이버: 사이트맵 제출 + 웹 페이지 수집 요청 4개(`/ko/`, `/en/`, `/ko/png-to-svg/`, `/ko/guides/`, **한 번에 주소 하나씩**). (선택) Bing | ☐ 사용자 확인 필요 |
| 10/23부터 매주 금 ×4 | 가이드 글 1편 쓰기 (게임 개발 경험 주제) | ☐ |
| **10/27 (1주)** | Search Console **색인 현황 1차 확인** — 확인만, 고치지 않기. "발견됨 – 현재 색인 생성 안 됨"이 많은 건 정상 | ☐ |
| **11/03 (2주)** | **소개 페이지 + 가이드 13편 검수 마감** (사용자 목소리로 다듬기, 아래 §8 팩트체크) | ☐ |
| **11/10 (3주)** | **애드센스 신청 가능 여부 판단**: 구글 색인 절반 이상 / 본인 목소리로 다듬음 / 방문 있음 / 가이드 13편+ / 정책 페이지 정상 | ☐ |
| **11/17 (4주)** | **애드센스 신청 목표일** (판단이 "충족"일 때만) | ☐ |
| 12/01 | 애드센스 결과 확인, 성과 점검, 반려 시 보강 후 재신청 | ☐ |
| 2027-09-20 | 도메인 자동 갱신/결제 수단 확인 | ☐ |

### 애드센스 신청 절차 (Claude가 도울 부분 표시)
1. 사용자: adsense.google.com 가입 → 사이트 `anypictoanypic.com` 추가.
2. 사용자: 게시자 ID(`ca-pub-…`)를 Cloudflare 빌드 변수 `NEXT_PUBLIC_ADSENSE_CLIENT`에 저장 → **Claude: 빈 커밋으로 재배포** (루트와 모든 페이지에 `google-adsense-account` 태그).
3. **Claude**: `public/ads.txt.sample` → `ads.txt` 로 이름 변경 + 게시자 ID 입력 → push.
4. 사용자: 애드센스에서 "검토 요청". 심사 며칠~4주.
5. 승인 후: 사용자가 광고 단위 3개(content/article/sidebar) 생성 → 슬롯 ID를 변수에 입력 + `NEXT_PUBLIC_ADS_ENABLED=true` → **Claude 재배포**. 사용자: 애드센스 "개인정보 보호 및 메시지"에서 **EU/영국용 동의 메시지(CMP)** 설정. 본인 광고 클릭 금지.
   - 광고는 변환·다운로드 버튼 근처에 두지 않는 배치가 이미 되어 있음(홈·랜딩은 본문 중간, 가이드는 중간/하단/데스크톱 사이드바).

### 아이디어 (사용자가 원하면)
가이드 주제 목록·초안(게임 개발 경험 기반: 스프라이트 시트 규격, 텍스처 크기, 아이콘 세트) · 소개 페이지에 경험담 반영 · 다른 형식/기능(자르기 위치 지정, 크기 프리셋 저장, 스프라이트 시트 분할) · Bing 등록.

---

## 5. 개발·운영 방법

```bash
npm install
npm run dev            # http://localhost:3000 → /ko/ 또는 /en/
npm test               # 단위 테스트
npm run lint && npx tsc --noEmit
npm run build          # out/ 생성 (+ prefetch 파일명 보정 + 루트 페이지 생성)
npm run seo:audit      # build 후 SEO 감사
# e2e: 별도 터미널에서 npx serve out -l 4173 --no-clipboard 를 띄운 뒤
npm run e2e            # (처음 한 번 샘플 자동 다운로드) / 라이브: SITE=https://… npm run e2e
```

### 배포 / 재배포
- 코드·콘텐츠 수정 → `git push origin main` → Cloudflare가 자동 빌드·배포.
- **빌드 변수를 바꾼 뒤** 또는 **강제로 다시 빌드**: `git commit --allow-empty -m "..." && git push`.
- 빌드 결과 확인: `gh api repos/<소유자>/<저장소>/commits/main/check-runs --jq '.check_runs[0] | "\(.status) \(.conclusion)"'` (빌드가 `in_progress` → `completed success` 로 바뀜, 보통 1~1.5분). 소유자/저장소는 `gh repo view --json nameWithOwner`.
- `gh`는 Bash PATH에 없음 → `"/c/Program Files/GitHub CLI/gh.exe"` (이미 로그인됨).
- 라이브 점검: `curl --resolve anypictoanypic.com:443:104.21.85.163 https://anypictoanypic.com/...` (§7 로컬 DNS 문제 참고).

### 코드 지도
```
app/[lang]/…            모든 페이지(루트 레이아웃 포함). app/sitemap.ts, robots.ts, global-not-found.tsx
components/             Converter(상태 머신), OptionsPanel, ResultList, LanguageSwitcher, AdSlot …
lib/converters/         core(디코드→레이아웃→인코드), size(computeLayout), vectorize(SVG 트레이싱), encoders, exif
lib/i18n/               config(언어 목록), messages/{ko,en}, content/{ko,en}/(형식 설명·조합 생성기·팁)
lib/seo/                조합 목록(pairs), 공통 로직(pairLogic), 메타 헬퍼
content/pages|guides/   <언어>/*.mdx (정적 페이지·가이드)
scripts/                flatten-prefetch(Windows 빌드 보정), write-root(루트 `/` 페이지), seo-audit
e2e/                    브라우저 테스트 (README 참고)
```
새 언어 추가 절차는 README "언어 추가하기". 새 가이드는 `content/guides/{ko,en}/<같은 파일명>.mdx` (템플릿 `_template.mdx`).

---

## 6. 사용자 결정·선호 (바꾸지 말 것)

- **사이트에 실명이 나오면 안 됨.** 소개는 "게임을 개발하는 개인 개발자", 방침/약관은 "AnyPicToAnyPic 운영자". 구조화 데이터의 작성자/발행자는 Organization. (사용자가 직접 요청해 제거함.)
- 사이트 이름은 **AnyPicToAnyPic**(로고는 `Pic` 강조). 정식 주소는 www 없는 `anypictoanypic.com`.
- 문의 이메일: `tmdrl8336@naver.com`(기본값, 사이트에 공개됨).
- 커밋 작성자는 이 저장소에서 **익명**(`AnyPicToAnyPic <anypic@users.noreply.github.com>`, 저장소 로컬 git config). 전역 git 설정은 건드리지 않음. 커밋 메시지 끝에 `Co-Authored-By: Claude …` 트레일러.
- **AVIF 출력 랜딩 페이지는 만들지 않음** (대부분 브라우저가 canvas로 AVIF를 못 만들어서). 변환기 본체에서는 지원 시 선택 가능.
- 광고는 승인 전에는 프로덕션 빌드에 **코드가 전혀 없어야** 함. 변환 버튼 근처 광고 금지.
- 한국어로 대화. 사용자는 배포·검색엔진 설정이 처음이라 **클릭할 곳·입력할 값을 구체적으로** 안내하면 좋아함. 되돌릴 수 없는 작업(강제 push, 저장소 삭제 등)은 **사전 확인**.
- 이 사이트의 핵심 약속: **파일이 서버로 전송되지 않음**. 어떤 변경도 이 약속을 깨면 안 됨(업로드·분석 스크립트 추가 금지, 광고는 이미지 내용과 무관해야 함).

---

## 7. 함정 / 알려진 이슈 (실제로 겪은 것)

1. **Bash 도구가 heredoc·`node -e` 안의 역슬래시를 지움** → 정규식(`/\/$/`, `\w`, `\[`)이 있는 코드가 문법 오류. **역슬래시가 들어간 코드·파일은 Write/Edit 도구로** 저장하세요(여러 번 겪음).
2. **PowerShell 5.1의 `Get-Content`/`Set-Content`는 UTF-8 한글을 깨뜨림**(BOM·ANSI). 한글 파일은 Write/Edit로.
3. **이 PC의 통신사 DNS가 `anypictoanypic.com`의 IPv4를 못 돌려줌**(폰/타 DNS는 정상) → 로컬 `curl`이 "Could not resolve host". `--resolve 도메인:443:104.21.85.163` 또는 workers.dev 주소 사용.
4. **Next.js는 학습 데이터와 다른 버전(16.x)**. API를 바꾸기 전에 `node_modules/next/dist/docs/`와 `AGENTS.md` 확인. `output: "export"`, `trailingSlash: true`, 404는 실험 기능 `globalNotFound`(루트 레이아웃이 `[lang]` 아래라서).
5. **MDX front matter(YAML)**: `title`/`description`에 `: `(콜론+공백)이 있으면 **큰따옴표로 감싸기** — 아니면 빌드가 깨짐(두 번 겪음). MDX 본문에 `<`·중괄호를 그대로 쓰면 코드로 해석됨.
6. **루트 `/`는 Next가 만드는 페이지가 아님** — `scripts/write-root.mjs`가 빌드 후 `out/index.html`을 생성. 소유확인/애드센스 태그가 **여기에도** 들어가야 함(이미 처리됨). 이 스크립트는 `lib/i18n/config.ts`의 `LOCALES`/`DEFAULT_LOCALE`/`LOCALE_META` 줄을 **정규식으로 읽으므로** 그 줄 형식을 바꾸지 말 것.
7. `scripts/flatten-prefetch.mjs`: Windows 빌드에서 prefetch 파일이 중첩 디렉터리로 써지는 문제 보정. 삭제 금지.
8. **imagetracerjs의 자체 색 양자화를 쓰지 말 것** — 색 수가 적으면 작은 영역 색이 사라지거나 엉뚱한 색이 됨(8색에서 파란색이 보라색). 자체 `buildPalette`(median cut)를 쓰고 `colorquantcycles: 1`.
9. 구조화 데이터·메타는 페이지마다 `lib/seo/meta.ts`의 `pageMetadata`로. 자식 페이지가 `alternates`를 다시 정의하면 부모 값이 통째로 덮어써짐.
10. `eslint`는 `e2e/**`, `.wrangler/**`를 무시.
11. **저장소가 public으로 보임 (2026-10-20 확인)**. 처음엔 private로 만들었고, 같은 날 09:50 KST에 공개로 전환됨(사용자가 Cloudflare 연결 중 바꿨을 가능성). 문제점: 한 번 정리한 옛 커밋(실명이 들어 있던 `6259ab0`, `f6d367c`)이 GitHub 서버에 **SHA를 알면 아직 조회됨**. 사용자에게 알렸고 선택 대기: ① 그대로 두기(SHA는 추측 불가라 위험은 낮음) ② 저장소 삭제 후 같은 이름으로 재생성(옛 객체 완전 제거, 단 `delete_repo` 권한 승인 + Cloudflare Git 연결 재설정 필요) ③ private로 되돌리기. **사용자 결정 없이 삭제·강제 push 금지.**

---

## 8. 열린 질문 / 확인 필요

- 저장소 공개 여부(§7-11)에 대한 사용자 결정.
- 네이버 서치어드바이저에 사이트맵 제출·수집 요청을 했는지(사용자 확인).
- **가이드 팩트체크**(11/03 마감): 제가 도구로 직접 확인하지 못하고 일반 지식으로 쓴 부분 — `apple-touch-icon`은 180×180 PNG 권장 / Google 검색 파비콘은 48px 배수 / 윈도우·맥·폰에서 EXIF 확인하는 메뉴 경로 / 개발자 도구 메뉴 이름(Network, Fetch/XHR, Offline). 영어 번역도 사용자 검수 필요.
- **소개 페이지**(`content/pages/{ko,en}/about.mdx`)는 사용자의 "만든 이유" 설명을 바탕으로 한 초안. 본인 경험담을 더하면 애드센스 승인에 유리.
- 가이드 글의 문체는 AI 초안이라 사용자 말투로 다듬을 필요가 있음.

---

## 9. 새 세션 시작 체크리스트

1. 오늘 날짜를 §4와 비교 → 지금 해야 할 일이 무엇인지 사용자에게 알려 주기.
2. `git status` / `git log --oneline | head` / 빌드 상태(`check-runs`) 확인.
3. 사용자가 가져온 화면/메시지(Search Console, 서치어드바이저, 애드센스)가 있으면 §4·§8 기준으로 정상/비정상 판단.
4. 코드 수정 전: `npm test`, 수정 후: `npm run lint && npx tsc --noEmit && npm test && npm run build && npm run seo:audit`, 동작 변경이면 `npm run e2e`.
5. 끝나면 **이 파일의 상태(§1, §3, §4, §8)를 갱신**하고 커밋.

## 갱신 규칙

- 인프라·변수·일정·사용자 결정이 바뀌면 이 파일을 같이 고친다. 코드 구조 설명은 README에 두고 여기에는 **상태와 할 일**만 둔다.
- 날짜가 지난 일정은 상태 칸을 ☑ 로 바꾸고 결과를 한 줄 적는다.
