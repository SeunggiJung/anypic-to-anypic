# AnyPicToAnyPic

어떤 이미지든 올리면 형식을 자동 감지하고, 원하는 형식으로 **브라우저 안에서** 바꿔 주는 이미지 변환 사이트. 서버가 없고(정적 export) 이미지는 어디로도 전송되지 않습니다. 한국어·English 지원, 새 언어를 쉽게 추가할 수 있게 설계했습니다. 기획은 [PLAN.md](./PLAN.md) 참고.

## 시작하기

```bash
npm install
npm run dev      # http://localhost:3000  (루트는 /ko/ 또는 /en/ 로 이동)
npm test         # 단위 테스트 (형식 감지, EXIF, 리사이즈, 언어별 랜딩 콘텐츠 품질)
npm run lint
npm run build    # out/ 폴더에 정적 사이트 생성
```

## 지원 형식

| | 읽기 | 저장 |
|---|---|---|
| PNG, JPG, WebP, GIF(정지), BMP, ICO | ○ | ○ |
| AVIF | ○ | 브라우저가 지원할 때만 (기능 감지 후 버튼 활성화) |
| HEIC, TIFF | ○ | – |
| SVG | ○ | ○ (래스터 → SVG는 트레이싱: 추정이라 원본과 같지 않고 사진에는 부적합, 변환 전·후 경고 표시) |

## 크기 조절

변환 옵션의 **크기**에서 고릅니다: 원본 유지 / 가로 기준(px) / 세로 기준(px) / 비율(%) / **직접 지정(가로×세로)**. 직접 지정은 맞추는 방법을 고를 수 있습니다 — 늘리거나 줄여서 맞춤(stretch), 비율 유지 + 중앙 정렬 + 여백 채우기(contain), 비율 유지 + 꽉 채우고 잘라내기(cover), 원본 크기 유지 + 중앙 배치(center). 여백은 투명 지원 형식(PNG/WebP/GIF/ICO)에서는 투명이고, 그 외 형식이나 "배경색으로 채우기"를 켠 경우에는 지정한 색입니다. 계산 로직은 `lib/converters/size.ts`의 `computeLayout`(순수 함수, 단위 테스트 있음)이며, SVG는 벡터 상태로 목표 크기에 맞춰 그려서 선명합니다.

- **이미지 위치**: contain/cover/center에서 3×3 격자로 정렬 위치를 고릅니다(`alignX/alignY` = 0, 0.5, 1).
- **도트 모드**(`pixelArt`): 보간 없이 확대·축소해 픽셀 아트가 번지지 않게 합니다.
- **설정 기억**: 마지막 옵션을 `localStorage`(`anypic:options:v1`)에 저장하고 불러올 때 값을 검증합니다(`lib/optionsStore.ts`, 테스트 있음). 랜딩 페이지가 미리 고른 출력 형식은 저장된 형식을 덮어쓰지 않습니다. 저장 항목이 바뀌면 키 버전을 올리세요.

## 주소 구조와 언어

모든 페이지는 언어 접두사 아래에 있습니다: `/ko/…`, `/en/…`. 루트(`/`)는 빌드 후처리(`scripts/write-root.mjs`)가 만드는 작은 페이지로, **저장된 선택 → 브라우저 언어 → 기본 언어(ko)** 순으로 보냅니다. 헤더 오른쪽의 지구본 버튼으로 언어를 바꾸면 같은 페이지의 다른 언어판으로 이동하고 선택이 저장됩니다. 각 페이지에는 `hreflang`·canonical이 들어가고 sitemap에도 언어별 대체 주소가 포함됩니다.

### 언어 추가하기 (예: 일본어 `ja`)

1. `lib/i18n/config.ts`의 `LOCALES`에 `"ja"`, `LOCALE_META`에 `{ label: "日本語", htmlLang: "ja", ogLocale: "ja_JP" }` 추가
2. `lib/i18n/messages/ja.ts` — `ko.ts`와 같은 구조의 UI 문구 (`Messages` 타입이 빠진 키를 알려 줍니다). `lib/i18n/index.ts`의 `MESSAGES`에 등록
3. `lib/i18n/content/ja/formats.ts` — 형식별 설명(`FormatText`). `lib/i18n/index.ts`의 `FORMAT_TEXT`에 등록
4. `lib/i18n/content/ja/pair.ts`, `pairNotes.ts` — 조합 랜딩 페이지 생성기와 직접 쓴 팁. `lib/i18n/pairContent.ts`의 `BUILDERS`에 등록 (영어판 `en/pair.ts`를 복사해 번역하는 것이 가장 쉽습니다)
5. `content/pages/ja/{about,privacy,terms,contact}.mdx` — 정적 페이지 (`lib/pages.ts`의 `POLICY_DATE`에 시행일 추가)
6. `content/guides/ja/*.mdx` — 가이드(선택). 파일 이름(슬러그)은 다른 언어와 같게 유지하면 언어 전환 링크가 이어집니다. 없는 글은 그 언어의 목록·sitemap·hreflang에서 자동으로 빠집니다.
7. `npm test` — 새 언어도 조합 콘텐츠 품질 테스트(`lib/i18n/content/pairContent.test.ts`)를 자동으로 거칩니다.

언어 전환 메뉴, sitemap, 정적 경로는 `LOCALES`에서 자동으로 만들어집니다.

## 구조

```
app/
  [lang]/                  모든 페이지 (루트 레이아웃 포함)
    page.tsx               메인 변환기
    [pair]/page.tsx        형식 조합 랜딩 (webp-to-jpg …, 언어마다 54개)
    formats/               형식 설명 (목록 + [format])
    guides/                가이드 (목록 + [slug])
    about, privacy, terms, contact   content/pages/<언어>/*.mdx 를 렌더링
  global-not-found.tsx     404 (주소의 언어로 표시)
  sitemap.ts, robots.ts
components/                Dropzone, FileList, FormatSelector, OptionsPanel, ResultList,
                           LanguageSwitcher, ThemeToggle, AdSlot …
lib/
  formats.ts               형식 메타데이터 (이름·MIME·특성 수치, 언어 무관)
  i18n/                    config(언어 목록), messages/(UI 문구), content/<언어>/(형식 설명·조합 생성기)
  detectFormat.ts          매직 넘버 감지
  converters/              core(디코드→리사이즈→인코드), encoders(BMP/ICO/GIF), exif, size
  worker/convert.worker.ts Web Worker 진입점
  convertClient.ts         Worker 풀, HEIC/SVG 전처리
  seo/                     조합 목록, 공통 판단 로직(pairLogic), 메타데이터 헬퍼
content/
  pages/<언어>/            소개·방침·약관·문의 (MDX, %SITE_NAME% 같은 토큰 사용)
  guides/<언어>/           가이드 원고 (_template.mdx 복사해서 작성)
scripts/                   빌드 후처리 (prefetch 파일명 보정, 루트 리다이렉트 페이지)
```

## 런칭 전에 바꿀 것

환경 변수(`.env.local` 또는 배포 환경)로 설정합니다.

| 변수 | 기본값 | 설명 |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://anypic.example` | **실제 도메인.** canonical·sitemap·hreflang·구조화 데이터에 쓰입니다 |
| `NEXT_PUBLIC_CONTACT_EMAIL` | `contact@anypictoanypic.com` | 문의·개인정보처리방침에 표시되는 이메일 |
| `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | – | Search Console 소유 확인 값 (HTML 태그 방식의 content 값) |
| `NEXT_PUBLIC_NAVER_SITE_VERIFICATION` | – | 네이버 서치어드바이저 소유 확인 값 |
| `NEXT_PUBLIC_BING_SITE_VERIFICATION` | – | Bing Webmaster 소유 확인 값 (선택) |
| `NEXT_PUBLIC_ADSENSE_CLIENT` | – | 애드센스 게시자 ID(`ca-pub-…`). 값이 있으면 승인 전에도 `google-adsense-account` 태그가 출력됩니다 |

- `content/pages/<언어>/about.mdx`: 누가, 왜 만들었는지를 본인의 이야기로 보강하면 승인에 유리합니다.
- `content/guides/`: 언어마다 초안 12편이 들어 있습니다. **사실 관계와 문장을 직접 검수**하고 본인 경험·스크린샷을 더하세요. 승인 전 10~15편을 목표로 합니다.
- `lib/i18n/content/<언어>/pairNotes.ts`: 검색 수요가 큰 조합에 팁을 더 쓰면 랜딩 페이지가 더 고유해집니다.

## SEO

- **sitemap.xml / robots.txt**: 빌드 때 자동 생성됩니다 (언어별 URL + hreflang 대체 주소, 가이드는 작성/수정일 포함).
- **메타데이터**: 페이지마다 고유한 title·description, canonical, hreflang, Open Graph/Twitter 카드(언어별 공유 이미지 `public/og/og-<언어>.png`)가 들어갑니다.
- **구조화 데이터(JSON-LD)**: 홈(WebSite·WebApplication), 조합 랜딩(BreadcrumbList·WebApplication·FAQPage), 형식 설명(BreadcrumbList·FAQPage), 가이드(Article, 작성자=운영자).
- **감사**: `npm run build && npm run seo:audit` — 모든 페이지의 제목·설명 길이/중복, h1 개수, canonical, hreflang 상호 참조, JSON-LD 유효성, 내부 링크, sitemap 일치를 점검합니다. 콘텐츠를 추가한 뒤마다 돌려 보세요.
- **배포 후 할 일**: Search Console·네이버 서치어드바이저에 소유 확인 후 `https://도메인/sitemap.xml` 제출. 소유 확인 값은 위 환경 변수로 넣고 재배포하면 태그가 출력됩니다.

## 광고(AdSense)

승인 전에는 프로덕션 빌드에 광고 코드가 전혀 포함되지 않습니다. 승인 후 환경 변수만 설정하면 켜집니다.

```
NEXT_PUBLIC_ADS_ENABLED=true
NEXT_PUBLIC_ADSENSE_CLIENT=ca-pub-XXXXXXXXXXXXXXXX
NEXT_PUBLIC_ADSENSE_SLOT_CONTENT=...   # 메인·랜딩 본문 중간
NEXT_PUBLIC_ADSENSE_SLOT_ARTICLE=...   # 가이드 본문 중간·하단
NEXT_PUBLIC_ADSENSE_SLOT_SIDEBAR=...   # 가이드 데스크톱 사이드바
```

그리고 `public/ads.txt.sample`을 `public/ads.txt`로 바꿔 게시자 ID를 넣으세요. 개발 모드(`npm run dev`)에서는 슬롯 위치가 점선 박스로 보입니다. 변환·다운로드 버튼 근처에는 광고를 두지 마세요.

## 배포 (Cloudflare Workers 정적 에셋)

`npm run build`가 만드는 `out/`을 `wrangler.jsonc`가 정적 에셋으로 배포합니다. 서버 코드는 없습니다.

- `html_handling: "force-trailing-slash"`: 모든 주소가 `/`로 끝납니다 (`/ko/about` → `/ko/about/` 로 307).
- `not_found_handling: "404-page"`: 없는 주소는 `out/404.html`을 404 상태로 돌려줍니다.
- `public/_headers`(보안 헤더, `_next/static` 1년 캐시)도 에셋과 함께 적용됩니다.

**로컬에서 확인**: `npm run cf:preview` (빌드 후 `wrangler dev`, 기본 http://localhost:8787)
**수동 배포**: `npx wrangler login` 후 `npm run cf:deploy`

**Git 연동 자동 배포 (권장)**: Cloudflare 대시보드 → Workers & Pages → Create → Import a repository (Workers Builds)
- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`
- 환경 변수는 **Settings → Build → Variables and secrets** 에 넣습니다. `NEXT_PUBLIC_*` 값은 빌드 때 사이트에 구워지므로 런타임 변수가 아니라 *빌드 변수*여야 하고, 바꾸면 다시 빌드해야 합니다. (`NEXT_PUBLIC_SITE_URL` 필수, 전체 목록은 `.env.example`)
- Node 버전은 `.node-version`(22)을 따릅니다.
- 배포 후 사용자 지정 도메인은 Worker의 Settings → Domains & Routes 에서 연결합니다.

> 다른 정적 호스팅(Cloudflare Pages, Vercel)도 `out/`만 올리면 동작합니다. Vercel용 헤더는 `vercel.json`에 있습니다.

배포 후 Google Search Console·네이버 서치어드바이저에 `sitemap.xml`을 제출하세요.

## 알아 둘 점

- 이 프로젝트의 Next.js는 학습 데이터와 다른 변경점이 있는 버전입니다. 코드를 고치기 전에 `node_modules/next/dist/docs/`의 해당 문서를 확인하세요 (`AGENTS.md` 참고).
- 404 페이지는 실험 기능 `globalNotFound`를 사용합니다(루트 레이아웃이 `[lang]` 아래에 있기 때문).
- AVIF 랜딩 페이지(`*-to-avif`)는 만들지 않았습니다. 대부분의 브라우저에서 Canvas로 AVIF를 저장할 수 없어 도구가 비활성인 페이지가 되기 때문입니다.
- 움직이는 GIF/WebP, 여러 페이지 TIFF는 첫 장면(페이지)만 변환됩니다.
