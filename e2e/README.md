# e2e (브라우저 end-to-end 테스트)

실제 Chrome(playwright-core, `channel: "chrome"`)으로 사이트를 열어 변환 결과를 **픽셀/바이트 단위로** 검증한다.
단위 테스트(`npm test`)가 다루지 못하는 것: Worker, 다운로드, 언어 전환, 실제 HEIC/SVG/ZIP 등.

## 실행
```bash
npm run build                      # out/ 생성
npx serve out -l 4173 --no-clipboard   # 별도 터미널에서 정적 서버
npm run e2e                        # 전부 실행 (처음엔 샘플 파일을 자동으로 받음)
# 라이브 사이트 검증:
SITE=https://anypictoanypic.com npm run e2e
node e2e/svg.e2e.mjs               # 하나만
```
- `SITE`: 검사할 사이트 주소(기본 `http://localhost:4173`). 끝에 `/` 없이.
- Chrome이 설치돼 있어야 한다. (playwright 브라우저 다운로드 불필요)
- `e2e/samples/`(gitignore)에 `sample.heic`, `photo.png` 필요 → `node e2e/get-samples.mjs`.

## 스위트
| 파일 | 검증 내용 |
|---|---|
| convert.e2e.mjs | 6개 출력 형식의 실제 바이트 형식, TIFF·SVG 입력, 확장자 위장, 투명→JPG 배경, 리사이즈, ZIP |
| heic.e2e.mjs | 실제 HEIC 감지·변환·결과 내용 |
| resize.e2e.mjs | 직접 지정(contain/cover/stretch/center)·정렬·도트·ICO·SVG·설정 기억·영어 UI |
| svg.e2e.mjs | SVG 트레이싱 결과를 실제로 그려 색/투명 확인, 사진·축소·용량 경고, 색 수 설정 |
| i18n.e2e.mjs | 루트 리다이렉트(브라우저 언어), 언어 전환, hreflang/canonical, 링크 전수, 404, sitemap |

## 알아 둘 점
- **로컬 DNS 문제**: 이 PC(통신사 DNS)는 일부 도메인의 IPv4를 못 돌려줘서 라이브 도메인 접속이 실패할 수 있다.
  `curl --resolve anypictoanypic.com:443:104.21.85.163 ...` 처럼 IP를 지정하거나 `*.workers.dev` 주소로 검사한다.
- 파일 업로드는 `input[type=file]`에 `setInputFiles`로 넣는다. 결과 확인은 다운로드 파일을 읽어 픽셀을 검사한다.
- 모든 스크립트는 코드 안에서 생성한 이미지를 쓰므로 외부 파일 의존은 위 두 샘플뿐이다.
