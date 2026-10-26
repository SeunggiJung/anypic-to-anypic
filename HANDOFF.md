# HANDOFF — AnyPicToAnyPic 인수인계

> 새 세션에서 이 프로젝트를 이어받는 Claude(또는 사람)를 위한 문서입니다. **이 파일 → CLAUDE.md → README.md** 순서로 읽으면 됩니다.
> 마지막 갱신: **2026-10-26**. 상태가 바뀌면 이 파일을 같이 고치세요 (맨 아래 "갱신 규칙").
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
| 네이버 서치어드바이저 | 소유확인 완료 (HTML 태그) | 사이트맵 제출 + 수집 요청 완료 (2026-10-20, 사용자 확인) |
| Bing | **미등록** (선택) | Search Console에서 가져오기로 등록 가능 |
| 애드센스 | **미신청** | §4 일정 참고 |

### Cloudflare 빌드 변수 (Settings → Build → Variables and secrets)
`NEXT_PUBLIC_*` 값은 **빌드 때 사이트에 구워집니다**. 바꾸면 **반드시 재배포**(빈 커밋 push)해야 반영됩니다.

| 변수 | 값/상태 |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://anypictoanypic.com` ✅ 설정됨 (canonical·sitemap·hreflang·JSON-LD가 이 값 사용) |
| `NEXT_PUBLIC_NAVER_SITE_VERIFICATION` | ✅ 설정됨 (루트·모든 페이지에 meta 태그 출력) |
| `NEXT_PUBLIC_CONTACT_EMAIL` | 미설정 → 기본값 `contact@anypictoanypic.com` |
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
- **콘텐츠**: 조합 랜딩 63개/언어(`png-to-svg` 등, AVIF 출력 제외) 중 **색인 대상 47개**(나머지 16개는 `noindex, follow` + sitemap·내부 링크에서 제외, `lib/seo/pairs.ts`의 `NOINDEX_SLUGS`) · 형식 설명 10개/언어 · **가이드 13편/언어** · 소개/방침/약관/문의. 총 **186 URL**(sitemap 154개).
- **조합 페이지 템플릿**(`lib/i18n/content/{ko,en}/pair.ts`): 효과는 독립 문장, "열리지 않는 이유" FAQ는 WebP·AVIF·TIFF·HEIC 원본에만(그 외는 `pairSpecificFaq`), EXIF 문구는 EXIF 가능 원본에만, HEIC·TIFF 원본엔 투명 안내 없음, meta description 둘째 문장은 `highlight()`. 판단 헬퍼는 `lib/seo/pairLogic.ts`. 관련 변환 링크는 색인 대상만 6~8개 + 관련 가이드 최대 2개.
- **SEO**: sitemap(hreflang), robots, canonical, OG 이미지(`public/og`), JSON-LD, `npm run seo:audit`.
- **애드센스 스크립트 (2026-10-26 사용자 결정: 지금 신청, 자동 광고 사용)**: `NEXT_PUBLIC_ADSENSE_CLIENT`(게시자 ID)가 있으면 `app/[lang]/layout.tsx`와 `scripts/write-root.mjs`가 모든 페이지·루트의 `<head>`에 `adsbygoogle.js` 스크립트와 `google-adsense-account` meta를 넣는다(변수가 없으면 어느 쪽도 안 나옴). `public/ads.txt`는 게시자 ID로 생성 완료. 자동 광고의 형식·제외 페이지는 AdSense 콘솔에서 조절(변환기가 있는 홈·조합 페이지는 제외, 앵커·전면 광고는 끄는 것을 권고).
- **광고 슬롯**: `AdSlot` — `NEXT_PUBLIC_ADS_ENABLED=true`일 때만 `AdSlotLive`를 동적 import(`next.config.ts`가 이 값을 항상 "true"/"false" 문자열로 고정). 변수 없으면 `out/` 전체에 광고 코드·스크립트 주소가 **전혀** 없음(2026-10-26 grep으로 0건 확인, 켠 빌드에는 들어감 확인). `public/ads.txt.sample` 있음. 광고 영역은 `role="group"`(aside 중첩 없음).
- **접근성**: `Converter`에 항상 마운트된 `role="status"` 알림(파일 추가·삭제·변환 결과), 변환 버튼은 `aria-disabled`, 완료 시 결과 `h2`로 포커스, 삭제·새로 시작·옵션 수정 뒤 포커스 복원(`pendingFocus`). 감사 보고서의 나머지(라디오 화살표 키 #4, 테두리 대비 #6, 언어 메뉴 Esc, 다운로드 버튼 이름 등)는 **미적용** — §4 참고.

---

## 3. 품질 현황 (2026-10-22)

| 검사 | 결과 |
|---|---|
| `npm run lint` / `npx tsc --noEmit` | 통과 |
| `npm test` (vitest) | **84개 통과** (형식 감지, EXIF, 레이아웃 계산, 트레이싱/팔레트, 조합 콘텐츠 품질·중복·noindex 규칙, 설정 저장) |
| `npm run seo:audit` | **186페이지(noindex 32), 문제 0** (title/description 길이·중복, h1, canonical, hreflang 상호참조, JSON-LD, 내부 링크, sitemap 일치, noindex 페이지가 sitemap·색인 대상 페이지의 링크에 없는지) |
| `npm run e2e` | **5개 스위트, 116개 검증, 실패 0** (실제 Chrome, 라이브 사이트에도 실행 가능 `SITE=https://… npm run e2e`) |
| Lighthouse (이전 측정) | 성능 99 / 접근성 100 / 권장사항 100 / SEO 100 |

알려진 제한: 움직이는 GIF/WebP·다중 페이지 TIFF는 첫 장면만, 파일당 50MB, 크기는 px 단위만(DPI 없음), 자르기는 9칸 정렬만, SVG 트레이싱은 추정이라 사진에 부적합.

---

## 4. 앞으로 할 일 (사용자 일정)

사용자에게 PDF(`AnyPic-할일계획.pdf`)와 캘린더용 `.ics`를 바탕화면에 만들어 줬습니다. 같은 내용입니다.

| 날짜 | 할 일 | 상태 |
|---|---|---|
| 10/20 (오늘) | 네이버: 사이트맵 제출 + 웹 페이지 수집 요청 4개(`/ko/`, `/en/`, `/ko/png-to-svg/`, `/ko/guides/`, **한 번에 주소 하나씩**). (선택) Bing | ☑ 네이버 완료 (Bing은 선택, 미등록) |
| 10/23부터 매주 금 ×4 | 가이드 글 1편 쓰기 (게임 개발 경험 주제) | ☐ |
| **10/27 (1주)** | Search Console **색인 현황 1차 확인** — 확인만, 고치지 않기. "발견됨 – 현재 색인 생성 안 됨"이 많은 건 정상 | ☐ |
| **11/03 (2주)** | **소개 페이지 + 가이드 13편 검수 마감** (사용자 목소리로 다듬기, 아래 §8 팩트체크) | ☐ |
| **11/10 (3주)** | **애드센스 신청 가능 여부 판단**: 구글 색인 절반 이상 / 본인 목소리로 다듬음 / 방문 있음 / 가이드 13편+ / 정책 페이지 정상 | ☐ |
| **11/17 (4주)** | **애드센스 신청 목표일** (판단이 "충족"일 때만) | ☐ |
| 12/01 | 애드센스 결과 확인, 성과 점검, 반려 시 보강 후 재신청 | ☐ |
| 2027-09-20 | 도메인 자동 갱신/결제 수단 확인 | ☐ |

### 수정안 진행 (`REVISION_PLAN.md`, 사용자 바탕화면)
- ☑ §1 조합 템플릿 오류 수정 / ☑ §2 의미 없는 조합 16개 noindex 처리 + 관련 링크 정리 / ☑ §5-4 연락 이메일을 `contact@anypictoanypic.com`으로 교체 (2026-10-22, **로컬 반영만 — 커밋·push 전이면 라이브엔 아직**)
- ☐ §3 인기 조합 12개 고유 블록(실측 수치·스크린샷은 사용자가 만들어야 함) · ☐ §4 루트 `/` 처리 · ☐ §5-5 방침 문구 · ☐ §6~7 가이드 추가·이미지·기술 SEO
- **2026-10-26 에이전트 점검 결과**: 구글 색인 195개 중 185개 생성(사용자 확인). 가이드 팩트체크 4건 수정(파비콘 "48px 배수"→Google 문서 기준, DevTools Clear 아이콘, 맥 미리보기 EXIF 경로, 소개 페이지 "자르기" 서술) 커밋 완료. 루트 `/`에서 `noindex`·hreflang 제거(canonical→`/ko/` 유지, description 추가, `seo:audit`에 루트 검사 추가). 남은 SEO 제안: 홈·`/formats/`에 "많이 쓰는 변환" 칩, 검색어 겹치는 페이지 6쌍 정리(제목·H1은 Search Console 데이터 본 뒤), 팁 없는 색인 조합 20개 보강/noindex 판단(11/10), 인기 조합 12개 고유 블록(사용자의 실측·스크린샷 필요), 가이드 주제 8개 후보, `workers.dev` 끄기(`"workers_dev": false`).
- **사용자 확인 필요**: 소개 페이지 "ZIP으로 받아…" 문장·로고 78개/256×256 등 사실, 가이드의 "직접 측정" 표현(HEIC 701KB→417KB 등), 링크 텍스트 "게임 이미지 크기 통일하기" vs 가이드 제목, 문의 페이지 화자(ko "제 쪽"/en "we"), webp 문서 "25~35%" 원문 대조, `unify-image-size-for-games`의 "블록 압축 텍스처는 4의 배수" 출처.
- ☑ 소개 페이지(`content/pages/{ko,en}/about.mdx`)에 게임 사례 섹션 추가(2026-10-22): 사용자가 링크를 그대로 걸기로 결정(`paintochamps.tmdrl8336.workers.dev`, 계정 ID 노출은 사용자가 감수). 근거는 게임 저장소 `CLAUDE.md`·`src/assets/logos/README.md`(로고 78개, 256×256 투명 PNG, 여백 채우기). **"ZIP으로 받아" 문장은 추정이라 사용자 확인 필요.** 게임 사이트의 소개·문의·후원 팝업에 실명이 보이는지 확인할 것(§6 실명 금지).
- 이미 되어 있던 항목: §5-1/5-2(애드센스 변수·AdSlot), §5-3(Search Console 도메인 인증·사이트맵)

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
- 문의 이메일: `contact@anypictoanypic.com`(기본값, 사이트에 공개됨). Cloudflare Email Routing으로 개인 메일에 전달됨.
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
11. **저장소는 public (사용자가 의도함, 2026-10-20)**. Cloudflare 연결이 private에서 안 돼서 사용자가 직접 공개로 전환. **그대로 유지** — 되돌리자고 먼저 제안하지 말 것. 참고: 정리 전 옛 커밋 SHA(`6259ab0`, `f6d367c`)는 GitHub에서 아직 조회될 수 있으나 사용자는 사이트에만 실명이 없으면 된다고 함. 삭제·강제 push는 사용자 확인 후에만.

---

## 8. 열린 질문 / 확인 필요

- (해결) 저장소 공개 여부: public 유지로 결정됨.
- (해결) 네이버 사이트맵 제출·수집 요청: 완료.
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
