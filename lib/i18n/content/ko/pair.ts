import { TRAITS, type FormatId } from "../../../formats";
import { FORMAT_TEXT } from "./formats";
import { PAIR_NOTES } from "./pairNotes";
import { svgChanges, svgFaq, svgLeadSecond, svgWhen } from "./svgTarget";
import {
  fullFormat,
  kindOf,
  sizeRatio,
  type Change,
  type FullFormat,
  type PairContent,
} from "../../../seo/pairLogic";
import type { Pair } from "../../../seo/pairs";

const full = (id: FormatId) => fullFormat(id, FORMAT_TEXT);

// 형식 이름은 모두 모음으로 끝나게 읽으므로(피/지/프/코 등) 조사는 를·로·와로 고정할 수 있다.
const OBJ = "를";
const TO = "로";

const COMPRESSION_LABEL: Record<FullFormat["compression"], string> = {
  lossy: "손실 압축",
  lossless: "무손실 압축",
  both: "손실·무손실 모두 가능",
  none: "압축 없음",
  vector: "벡터(수식으로 저장)",
};

const APP_LABEL = ["", "매우 제한적", "제한적", "보통", "넓음", "거의 모든 곳"];

const yesNo = (v: boolean) => (v ? "지원" : "미지원");

function sizeSentence(from: FullFormat, to: FullFormat, ratio: number | null): string {
  if (from.id === "svg") {
    return `${from.name}는 해상도가 없는 벡터라 용량이 도형의 복잡도에 달려 있습니다. 단순한 로고는 ${from.name}가 ${to.name}보다 훨씬 작지만, 래스터로 바꾸면 지정한 크기(가로×세로)만큼의 픽셀 정보가 필요합니다.`;
  }
  if (to.id === "ico") {
    return `ICO는 최대 256×256 이미지를 담는 형식이라 원본이 클수록 용량이 크게 줄어듭니다. 이미 작은 이미지라면 용량 차이가 거의 없습니다.`;
  }
  if (from.id === "ico") {
    return `ICO는 작은 크기의 아이콘이라 어떤 형식으로 바꿔도 용량 차이는 몇 KB 수준입니다.`;
  }
  if (ratio === null) return `용량 변화는 이미지 내용에 따라 달라집니다. 결과 화면에서 변환 전후 크기를 바로 확인할 수 있습니다.`;
  const note = "사진 기준이며 로고·스크린샷처럼 색이 단순한 이미지는 반대로 PNG가 더 작게 나오기도 합니다.";
  if (ratio >= 2.5) return `같은 사진이라면 ${to.name}가 ${from.name}보다 용량이 크게 늘어납니다(대략 ${Math.round(ratio)}배 안팎). ${note}`;
  if (ratio >= 1.3) return `같은 사진이라면 ${to.name}가 ${from.name}보다 용량이 커지는 편입니다(대략 ${ratio.toFixed(1)}배). ${note}`;
  if (ratio > 0.77) return `${from.name}와 ${to.name}는 사진 기준으로 용량이 비슷한 수준입니다. 품질 설정에 따라 오히려 달라질 수 있습니다.`;
  if (ratio > 0.4) return `같은 화질이라면 ${to.name}가 ${from.name}보다 용량이 줄어드는 편입니다(대략 ${Math.round((1 - ratio) * 100)}% 감소). ${note}`;
  return `${to.name}가 ${from.name}보다 용량이 훨씬 작습니다(대략 ${Math.round(1 / ratio)}분의 1). ${note}`;
}

/** 원본 형식에 따라 달라지는 품질 설정 조언 */
function sizeHint(from: FullFormat): string {
  switch (kindOf(from.id)) {
    case "vector":
      return "벡터 원본이라 품질보다 출력 크기(가로 px)가 용량을 좌우하므로, 필요한 크기를 먼저 정한 뒤 품질은 90 안팎으로 두세요.";
    case "lossy":
      return `${from.name}는 이미 손실 압축된 파일이어서 품질을 지나치게 낮추면 열화가 겹쳐 보입니다. 용량이 중요해도 80 밑으로는 내리지 않는 편이 좋습니다.`;
    default:
      return `${from.name} 원본은 무손실이라 품질을 80 안팎까지 낮춰도 대부분 자연스럽습니다. 용량이 중요하면 낮추고, 보관용이라면 95 이상으로 올리세요.`;
  }
}

function buildChanges(pair: Pair): Change[] {
  // 도착 형식이 SVG면 래스터를 도형으로 다시 그리는 트레이싱이라 전용 문단을 쓴다
  if (pair.to === "svg") return svgChanges(full(pair.from));
  const from = full(pair.from);
  const to = full(pair.to);
  const fk = kindOf(from.id);
  const tk = kindOf(to.id);
  const out: Change[] = [];

  // 투명도
  if (from.transparency && !to.transparency) {
    out.push({
      title: "투명 배경은 선택한 배경색으로 채워집니다",
      body: `${to.name}는 투명을 표현할 수 없습니다. 투명하거나 반투명한 부분은 옵션의 배경색(기본 흰색)으로 합성되므로, 어두운 화면에 쓸 이미지라면 변환 전에 맞는 색을 고르세요.`,
    });
  } else if (from.transparency && to.id === "gif") {
    out.push({
      title: "반투명은 '투명/불투명' 두 단계로 단순화됩니다",
      body: "GIF는 부분 투명을 지원하지 않습니다. 부드럽게 흐려지는 가장자리나 그림자는 계단처럼 거칠게 보일 수 있습니다.",
    });
  } else if (!from.transparency && to.transparency) {
    out.push({
      title: "변환해도 투명 배경이 생기지는 않습니다",
      body: `${from.name}에는 투명 정보가 없어서 ${to.name}로 바꿔도 배경은 그대로 남습니다. 배경을 없애려면 별도의 배경 제거 도구가 필요합니다.`,
    });
  }

  // 압축 방식
  if (from.id === "svg") {
    out.push({
      title: "벡터가 지정한 크기의 픽셀 이미지로 고정됩니다",
      body: `${from.name}를 ${to.name}${TO} 바꾸면 그 순간 해상도가 정해집니다. 옵션의 가로 px을 먼저 지정해 필요한 크기로 선명하게 그린 뒤 저장하세요. 나중에 키우면 흐려집니다.`,
    });
  } else if (tk === "lossy" && fk === "lossless") {
    out.push({
      title: "손실 압축이 적용됩니다",
      body: `${from.name}는 화질 손실이 없지만 ${to.name}는 사람 눈에 덜 띄는 정보를 덜어내 용량을 줄입니다. ${from.name} 원본과 나란히 놓아도 기본 품질 90에서는 구분하기 어렵고, 슬라이더로 용량과 화질을 직접 조절할 수 있습니다.`,
    });
  } else if (tk === "lossy" && fk === "lossy") {
    out.push({
      title: "이미 한 번 손실 압축된 이미지를 다시 압축합니다",
      body: `${from.name}도 ${to.name}도 손실 압축이라 ${from.name}${OBJ} ${to.name}${TO} 바꿀 때마다 미세한 열화가 쌓입니다. 품질을 90 이상으로 두면 눈에 띄는 차이는 대부분 없고, 가능하면 원본에서 한 번만 변환하세요.`,
    });
  } else if (tk === "lossless" && fk === "lossy") {
    out.push({
      title: "화질이 좋아지지는 않지만 더 나빠지지도 않습니다",
      body: `${from.name}를 저장할 때 사라진 정보는 되살릴 수 없습니다. ${to.name}는 무손실이라 지금 상태를 그대로 담고, 이후 편집·저장에서 추가 열화가 생기지 않습니다. 대신 용량은 커집니다.`,
    });
  } else if (to.id === "gif") {
    out.push({
      title: "색이 최대 256색으로 줄어듭니다",
      body: "GIF는 한 이미지에 256색까지만 쓸 수 있습니다. 로고·도트 그래픽은 거의 그대로지만 사진이나 그라데이션은 색 띠(밴딩)가 보일 수 있습니다.",
    });
  } else {
    out.push({
      title: "픽셀 값이 그대로 보존됩니다",
      body: `${from.name}와 ${to.name} 모두 무손실이어서 화질 변화가 없습니다. 달라지는 것은 파일 구조와 호환성, 용량뿐입니다.`,
    });
  }

  // 입력 형식 고유 사항
  if (from.animation && !to.animation) {
    out.push({
      title: "움직이는 이미지는 첫 장면만 저장됩니다",
      body: `${to.name}는 애니메이션을 담지 못합니다. ${from.name} 파일이 움직이는 이미지라면 첫 프레임 한 장만 변환됩니다.`,
    });
  }
  if (from.id === "tiff") {
    out.push({
      title: "여러 페이지 TIFF는 첫 페이지만 변환됩니다",
      body: "TIFF는 한 파일에 여러 장(페이지)을 담을 수 있습니다. 이 변환기는 첫 페이지를 이미지로 만듭니다.",
    });
  }
  if (from.id === "heic") {
    out.push({
      title: "라이브 포토의 영상·깊이 정보는 버려집니다",
      body: "HEIC에는 대표 사진 외에 짧은 영상, 깊이 맵 같은 부가 정보가 함께 들어 있을 수 있습니다. 변환 결과에는 대표 사진 한 장만 담깁니다.",
    });
  }
  if (from.id === "ico") {
    out.push({
      title: "여러 크기가 든 ICO는 하나의 크기만 사용됩니다",
      body: "ICO는 16×16, 32×32, 256×256 등 여러 크기를 담을 수 있습니다. 변환 결과는 그중 하나의 이미지입니다. 큰 이미지가 필요하면 가장 큰 크기가 들어 있는 ICO를 쓰세요.",
    });
  }
  if (to.id === "ico") {
    out.push({
      title: "256×256 안에서 정사각형으로 맞춰집니다",
      body: "ICO는 최대 256×256까지입니다. 이보다 크면 비율을 유지해 줄이고, 정사각형이 아니면 가운데에 놓은 뒤 남는 곳은 투명하게 둡니다.",
    });
  }
  if (to.id === "bmp") {
    out.push({
      title: "압축이 없어 용량이 크게 늘어납니다",
      body: "BMP는 픽셀을 그대로 저장합니다. 1920×1080 이미지는 약 6MB가 되므로 BMP만 받는 장비·프로그램이 아니라면 다른 형식을 권장합니다.",
    });
  }

  // 옵션 안내: 출력 형식에 따라 쓸 수 있는 설정이 다르다
  out.push({
    title: to.hasQuality ? "품질·크기·배경색을 조절할 수 있습니다" : `${to.name}는 품질 설정이 없습니다`,
    body: to.hasQuality
      ? `${from.name}에서 ${to.name}${TO} 바꿀 때 품질 슬라이더(기본 90)와 가로·세로 px 지정, 비율 리사이즈, 여백 채우기를 쓸 수 있습니다. ${sizeHint(from)}`
      : `${to.name}는 ${COMPRESSION_LABEL[to.compression]} 방식이라 품질 슬라이더가 적용되지 않습니다. 대신 ${from.name}에서 바꿀 때 크기(가로·세로 px, 비율)를 조절해 용량을 관리할 수 있습니다.`,
  });

  // 용량과 호환성
  out.push({ title: "용량은 이렇게 달라집니다", body: sizeSentence(from, to, sizeRatio(from.id, to.id)) });

  const diff = TRAITS[to.id].appSupport - TRAITS[from.id].appSupport;
  if (diff >= 1) {
    out.push({
      title: `${to.name}가 더 많은 곳에서 열립니다`,
      body: `${from.name}는 프로그램·문서 도구·업로드 폼에서의 지원이 ${APP_LABEL[TRAITS[from.id].appSupport]} 수준이고, ${to.name}는 ${APP_LABEL[TRAITS[to.id].appSupport]} 수준입니다. ${from.name}가 열리지 않던 곳에 올려야 한다면 변환 후 다시 시도해 보세요.`,
    });
  } else if (diff <= -1) {
    out.push({
      title: `${to.name}는 ${from.name}보다 지원 범위가 좁습니다`,
      body: `${from.name}는 ${APP_LABEL[TRAITS[from.id].appSupport]} 수준, ${to.name}는 ${APP_LABEL[TRAITS[to.id].appSupport]} 수준의 지원을 받습니다. 받는 쪽이 ${to.name}를 열 수 있는지 먼저 확인하고, 확실하지 않다면 JPG나 PNG가 안전합니다.`,
    });
  }
  return out;
}

function buildWhen(pair: Pair): string[] {
  if (pair.to === "svg") return svgWhen(full(pair.from));
  const from = full(pair.from);
  const to = full(pair.to);
  const out: string[] = [];
  const ratio = sizeRatio(from.id, to.id);

  if (TRAITS[to.id].appSupport > TRAITS[from.id].appSupport) {
    out.push(`${from.name}를 열지 못하는 프로그램, 메신저, 업로드 폼에 이미지를 올려야 할 때`);
  }
  if (!TRAITS[from.id].browserOpen) out.push(`웹사이트·블로그에 올리려는데 브라우저가 ${from.name}를 표시하지 못할 때`);
  if (ratio !== null && ratio < 0.8) out.push(`이메일 첨부나 업로드 용량 제한 때문에 ${from.name} 파일 크기를 줄여야 할 때`);
  if (to.id === "webp") out.push(`웹페이지 로딩 속도를 높이려고 ${from.name} 이미지를 더 가볍게 만들 때`);
  if (to.id === "png" && kindOf(from.id) === "lossy") out.push("편집을 여러 번 거쳐야 해서 더 이상 열화되지 않는 중간 파일이 필요할 때");
  if (to.id === "png" && from.id === "svg") out.push("벡터를 지원하지 않는 문서·SNS·프레젠테이션에 로고나 아이콘을 넣을 때");
  if (to.id === "jpg" && from.transparency) out.push("투명 배경이 필요 없는 곳(인쇄, 증명서, 상품 대표 이미지)에 흰 배경으로 제출할 때");
  if (to.id === "ico") out.push("웹사이트 파비콘이나 윈도우 바로가기 아이콘을 만들 때");
  if (to.id === "gif") out.push("GIF만 받는 오래된 게시판·시스템에 정지 이미지를 올려야 할 때");
  if (to.id === "bmp") out.push("BMP만 읽는 구형 장비나 임베디드 소프트웨어에 넣어야 할 때");
  if (from.id === "heic") out.push("아이폰으로 찍은 사진을 윈도우 PC나 안드로이드에서 열고 싶을 때");
  if (from.id === "tiff") out.push("스캔본·인쇄용 TIFF를 웹이나 메신저로 공유해야 할 때");
  if (from.id === "ico") out.push("파비콘·아이콘 파일에서 일반 이미지로 꺼내 편집하거나 문서에 쓰고 싶을 때");

  if (out.length < 3) out.push(`${to.name}의 대표적인 용도(${to.useCases.slice(0, 2).join(", ")})로 쓸 이미지를 준비할 때`);
  if (out.length < 3) out.push(`${from.name} 파일을 다시 편집하거나 보관하기 쉬운 형식으로 정리할 때`);
  return out;
}

function buildTable(pair: Pair) {
  const from = full(pair.from);
  const to = full(pair.to);
  const fr = TRAITS[from.id];
  const tr = TRAITS[to.id];
  const photo = (v: number | null) => (v === null ? "해당 없음" : v === 1 ? "기준(1배)" : `약 ${v}배`);
  return [
    { label: "압축 방식", from: COMPRESSION_LABEL[from.compression], to: COMPRESSION_LABEL[to.compression] },
    { label: "투명 배경", from: yesNo(from.transparency), to: yesNo(to.transparency) },
    { label: "애니메이션", from: yesNo(from.animation), to: yesNo(to.animation) },
    { label: "등장 시기", from: `${from.year}년`, to: `${to.year}년` },
    { label: "프로그램·업로드 폼 지원", from: APP_LABEL[fr.appSupport], to: APP_LABEL[tr.appSupport] },
    { label: "브라우저 직접 표시", from: yesNo(fr.browserOpen), to: yesNo(tr.browserOpen) },
    { label: "사진 용량(JPG=1)", from: photo(fr.photoSize), to: photo(tr.photoSize) },
  ];
}

function buildLead(pair: Pair): string[] {
  const from = full(pair.from);
  const to = full(pair.to);
  const fromTr = TRAITS[from.id];

  let p1 = `${from.name}는 ${from.summary}입니다.`;
  if (!fromTr.browserOpen) p1 += ` 브라우저가 직접 표시하지 못해 웹에서 쓰거나 공유하려면 변환이 필요합니다.`;
  else if (fromTr.appSupport <= 3) p1 += ` ${from.name}는 최신 브라우저에서는 열리지만 프로그램이나 서비스에 따라 지원이 고르지 않습니다.`;
  else p1 += ` ${from.name}는 대부분의 환경에서 열리지만 용도에 따라 ${to.name} 같은 다른 형식이 더 알맞을 수 있습니다.`;

  const p2 =
    pair.to === "svg"
      ? svgLeadSecond(from, to.summary)
      : `${to.name}는 ${to.summary}입니다. ${from.name}${OBJ} ${to.name}${TO} 바꾸면 ${gainSummary(from, to)}`;
  const p3 = `이 변환기는 파일 내용을 읽어 ${from.name}가 맞는지 확인한 뒤 브라우저 안에서 바로 ${to.name}${TO} 바꿔 줍니다. 이미지는 서버로 전송되지 않습니다.`;
  return [p1, p2, p3];
}

function gainSummary(from: FullFormat, to: FullFormat): string {
  const parts: string[] = [];
  if (TRAITS[to.id].appSupport > TRAITS[from.id].appSupport) parts.push("더 넓은 환경에서 열 수 있고");
  const ratio = sizeRatio(from.id, to.id);
  if (ratio !== null && ratio < 0.8) parts.push("파일 용량을 줄일 수 있으며");
  if (!from.transparency && to.transparency) parts.push("투명을 지원하는 형식을 쓸 수 있고");
  if (from.transparency && !to.transparency) parts.push("투명 배경 대신 단색 배경이 적용되며");
  if (ratio !== null && ratio > 1.3) parts.push("용량은 늘어나지만");
  if (to.id === "ico") parts.push("아이콘·파비콘으로 쓸 수 있게 되며");
  if (!parts.length) parts.push("호환성과 용도가 달라지며");
  return `${parts.join(" ")} 아래 비교에서 달라지는 점을 확인하세요.`;
}

function buildFaq(pair: Pair, changes: Change[]): PairContent["faq"] {
  if (pair.to === "svg") return svgFaq(full(pair.from));
  const from = full(pair.from);
  const to = full(pair.to);
  const fk = kindOf(from.id);
  const tk = kindOf(to.id);
  const faq: PairContent["faq"] = [];

  // 화질
  let quality: string;
  if (fk === "vector") {
    quality = `${from.name}는 해상도가 없는 벡터라 지정한 크기로 선명하게 그려집니다. 다만 ${to.name}${TO} 저장한 뒤에는 고정된 픽셀 이미지가 되므로 필요한 크기를 먼저 정하세요.`;
  } else if (to.id === "gif") {
    quality = "GIF는 256색 제한 때문에 사진은 색이 거칠어질 수 있습니다. 로고나 단순한 그래픽은 거의 차이가 없습니다.";
  } else if (fk === "lossless" && tk === "lossless") {
    quality = `떨어지지 않습니다. ${from.name}와 ${to.name} 모두 무손실이라 픽셀 값이 그대로 유지됩니다.`;
  } else if (fk === "lossy" && tk === "lossless") {
    quality = `더 떨어지지 않습니다. 이미 ${from.name}에서 사라진 정보가 돌아오지는 않지만, ${to.name}는 무손실이라 지금 상태를 그대로 보존합니다.`;
  } else if (fk === "lossless" && tk === "lossy") {
    quality = `${to.name}는 손실 압축이라 ${from.name} 원본과 비교하면 아주 조금 달라질 수 있습니다. 기본 품질 90에서는 육안으로 구분하기 어렵고, 슬라이더로 직접 조절할 수 있습니다.`;
  } else {
    quality = `둘 다 손실 압축이라 다시 변환하는 만큼 미세한 열화가 쌓입니다. 품질 90 이상으로 한 번만 변환하면 눈에 띄는 차이는 거의 없습니다.`;
  }
  faq.push({ q: `${from.name}${OBJ} ${to.name}${TO} 바꾸면 화질이 떨어지나요?`, a: quality });

  // 용량
  faq.push({
    q: `변환하면 파일 크기는 어떻게 되나요?`,
    a: `${sizeSentence(from, to, sizeRatio(from.id, to.id))} 변환이 끝나면 ${from.name} 원본과 ${to.name} 결과의 크기와 증감률이 파일마다 표시됩니다.`,
  });

  // 조합에만 해당하는 질문
  if (from.transparency && !to.transparency) {
    faq.push({
      q: `투명한 ${from.name}를 ${to.name}${TO} 바꾸면 배경은 어떻게 되나요?`,
      a: `${to.name}는 투명을 지원하지 않아 투명한 부분이 배경색으로 채워집니다. 기본은 흰색이며 옵션에서 원하는 색으로 바꿀 수 있습니다.`,
    });
  } else if (from.animation && !to.animation) {
    faq.push({
      q: `움직이는 ${from.name} 파일도 변환되나요?`,
      a: `${to.name}는 애니메이션을 지원하지 않아 첫 장면 한 장만 저장됩니다. 움직임을 유지하려면 애니메이션을 지원하는 형식을 선택해야 합니다.`,
    });
  } else if (changes.some((c) => c.title.startsWith("여러 페이지"))) {
    faq.push({
      q: "여러 페이지로 된 TIFF도 변환되나요?",
      a: "첫 페이지만 변환됩니다. 여러 페이지를 모두 이미지로 만들려면 페이지를 분리한 파일을 각각 올려 주세요.",
    });
  } else if (to.id === "ico") {
    faq.push({
      q: "파비콘으로 쓰려면 어떤 이미지가 좋나요?",
      a: "정사각형에 단순한 도형이 좋습니다. ICO는 최대 256×256까지이며, 작게 보여도 알아볼 수 있도록 글자가 많은 이미지는 피하세요.",
    });
  } else {
    const [s1, s2] = to.strengths;
    faq.push({
      q: `${to.name}${TO} 저장하면 어떤 점이 좋은가요?`,
      a: `${to.name}의 장점으로는 "${s1}"${s2 ? `, "${s2}"` : ""} 등이 있습니다. 반대로 ${from.name}${TO} 두는 편이 나은 경우도 있으니 아래 비교표에서 두 형식의 차이를 확인하세요.`,
    });
  }

  // 열리지 않는 이유 / 호환성
  faq.push({
    q: `${from.name} 파일이 열리지 않는 이유는 무엇인가요?`,
    a: `${from.compatibility} 이럴 때 ${from.name}${OBJ} ${to.name}${TO} 바꾸면 ${TRAITS[to.id].appSupport >= TRAITS[from.id].appSupport ? "더 많은 환경에서 열립니다" : `${to.useCases[0]} 같은 ${to.name}가 필요한 용도에 맞게 활용할 수 있습니다`}.`,
  });

  // 프라이버시
  faq.push({
    q: "파일이 서버에 업로드되나요?",
    a: `아니요. ${from.name} 파일은 이 브라우저 안에서만 읽고 ${to.name}${TO} 변환되며 서버로 전송되지 않습니다. 촬영 위치 같은 EXIF 정보도 변환 과정에서 제거됩니다.`,
  });
  return faq;
}

export function buildPairContent(pair: Pair): PairContent {
  const from = full(pair.from);
  const to = full(pair.to);
  const changes = buildChanges(pair);
  const h1 = `${from.name}${OBJ} ${to.name}${TO} 변환`;
  return {
    title: `${h1} – 무료 온라인 변환기`,
    description: `${from.name} 파일을 ${to.name}${TO} 무료 변환하세요. ${changes[0].title}. 가입 없이 브라우저에서 바로 처리되고 파일은 서버로 전송되지 않습니다.`,
    h1,
    lead: buildLead(pair),
    fromIntro: from.description[0],
    toIntro: to.description[0],
    table: buildTable(pair),
    changes,
    when: buildWhen(pair),
    tips: PAIR_NOTES[pair.slug]?.tips ?? [],
    faq: buildFaq(pair, changes),
  };
}
