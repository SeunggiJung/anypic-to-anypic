import { TRAITS, type FormatId } from "../../../formats";
import { fullFormat, kindOf, sizeRatio, type Change, type FullFormat, type PairContent } from "../../../seo/pairLogic";
import type { Pair } from "../../../seo/pairs";
import { FORMAT_TEXT } from "./formats";
import { PAIR_NOTES } from "./pairNotes";
import { svgChanges, svgFaq, svgLeadSecond, svgWhen } from "./svgTarget";

const full = (id: FormatId) => fullFormat(id, FORMAT_TEXT);

const COMPRESSION_LABEL: Record<FullFormat["compression"], string> = {
  lossy: "Lossy",
  lossless: "Lossless",
  both: "Lossy or lossless",
  none: "None (uncompressed)",
  vector: "Vector (stored as math)",
};

const APP_LABEL = ["", "very limited", "limited", "moderate", "broad", "nearly everywhere"];

const yesNo = (v: boolean) => (v ? "Yes" : "No");

function sizeSentence(from: FullFormat, to: FullFormat, ratio: number | null): string {
  if (from.id === "svg") {
    return `${from.name} is a resolution-independent vector, so its size depends on how complex the shapes are. A simple logo is far smaller as ${from.name} than as ${to.name}, but once rasterized it needs pixel data for the exact width and height you choose.`;
  }
  if (to.id === "ico") {
    return "ICO holds images of up to 256×256, so a large original shrinks a lot. If the image is already small, the difference is negligible.";
  }
  if (from.id === "ico") {
    return "ICO files are small icons, so the size difference after any conversion is only a few KB.";
  }
  if (ratio === null) {
    return "The size change depends on the image content. The result screen shows the sizes before and after.";
  }
  const note = "This is for photos; for simple images such as logos and screenshots, PNG can actually come out smaller.";
  if (ratio >= 2.5) return `For the same photo, ${to.name} is much larger than ${from.name} (roughly ${Math.round(ratio)}× or so). ${note}`;
  if (ratio >= 1.3) return `For the same photo, ${to.name} tends to be larger than ${from.name} (about ${ratio.toFixed(1)}×). ${note}`;
  if (ratio > 0.77) return `${from.name} and ${to.name} are about the same size for photos, and the quality setting can tip it either way.`;
  if (ratio > 0.4) return `At the same quality, ${to.name} tends to be smaller than ${from.name} (roughly ${Math.round((1 - ratio) * 100)}% smaller). ${note}`;
  return `${to.name} is far smaller than ${from.name} (roughly 1/${Math.round(1 / ratio)} the size). ${note}`;
}

/** Quality-setting advice that depends on the source format */
function sizeHint(from: FullFormat): string {
  switch (kindOf(from.id)) {
    case "vector":
      return "Because the source is a vector, output size (width in px) drives file size more than quality does, so decide the size first and keep quality around 90.";
    case "lossy":
      return `${from.name} is already lossy, so pushing quality too low stacks up visible degradation. Even when size matters, try not to go below 80.`;
    default:
      return `${from.name} is lossless, so lowering quality to around 80 usually still looks natural. Lower it when size matters, and raise it to 95 or more for archiving.`;
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

  if (from.transparency && !to.transparency) {
    out.push({
      title: "Transparent areas are filled with the background color you choose",
      body: `${to.name} can't represent transparency. Transparent and semi-transparent areas are composited onto the background color in the options (white by default), so pick a matching color first if the image will be used on a dark screen.`,
    });
  } else if (from.transparency && to.id === "gif") {
    out.push({
      title: "Semi-transparency is simplified to transparent or opaque",
      body: "GIF doesn't support partial transparency. Soft fading edges and shadows can look jagged, like stair steps.",
    });
  } else if (!from.transparency && to.transparency) {
    out.push({
      title: "Converting doesn't add a transparent background",
      body: `${from.name} has no transparency information, so converting to ${to.name} keeps the background as it is. To remove a background you need a separate background-removal tool.`,
    });
  }

  if (from.id === "svg") {
    out.push({
      title: "The vector becomes a fixed-size pixel image",
      body: `The moment you convert ${from.name} to ${to.name}, the resolution is fixed. Set the width in px in the options first so it is drawn sharply at the size you need; enlarging it later makes it blurry.`,
    });
  } else if (tk === "lossy" && fk === "lossless") {
    out.push({
      title: "Lossy compression is applied",
      body: `${from.name} loses no quality, but ${to.name} drops information the eye barely notices to shrink the file. Even next to the ${from.name} original, the default quality of 90 is hard to tell apart, and the slider lets you tune size against quality.`,
    });
  } else if (tk === "lossy" && fk === "lossy") {
    out.push({
      title: "An already-compressed image is compressed again",
      body: `Both ${from.name} and ${to.name} are lossy, so converting ${from.name} to ${to.name} adds a little more degradation. Keeping quality at 90 or higher usually avoids visible differences, and it's best to convert from the original only once.`,
    });
  } else if (tk === "lossless" && fk === "lossy") {
    out.push({
      title: "Quality doesn't improve, but it doesn't get worse either",
      body: `Information lost when ${from.name} was saved can't be recovered. ${to.name} is lossless, so it keeps the image exactly as it is now and later edits and saves add no further degradation. File size will grow, though.`,
    });
  } else if (to.id === "gif") {
    out.push({
      title: "Colors are reduced to at most 256",
      body: "GIF can use only 256 colors per image. Logos and pixel art stay nearly the same, but photos and gradients can show color banding.",
    });
  } else {
    out.push({
      title: "Pixel values are preserved exactly",
      body: `${from.name} and ${to.name} are both lossless, so there is no change in quality. Only the file structure, compatibility and size differ.`,
    });
  }

  if (from.animation && !to.animation) {
    out.push({
      title: "Moving images keep only their first frame",
      body: `${to.name} can't hold animation. If your ${from.name} file is animated, only the first frame is converted.`,
    });
  }
  if (from.id === "tiff") {
    out.push({
      title: "Multi-page TIFFs convert only the first page",
      body: "A TIFF can hold several pages in one file. This converter turns the first page into an image.",
    });
  }
  if (from.id === "heic") {
    out.push({
      title: "Live Photo video and depth data are dropped",
      body: "Besides the main photo, a HEIC can contain extras such as a short video and a depth map. The result contains only the main photo.",
    });
  }
  if (from.id === "ico") {
    out.push({
      title: "An ICO with several sizes uses just one of them",
      body: "An ICO can hold multiple sizes such as 16×16, 32×32 and 256×256. The result is one of those images. If you need a large image, use an ICO that contains the biggest size.",
    });
  }
  if (to.id === "ico") {
    out.push({
      title: "It is fitted into a square of at most 256×256",
      body: "ICO is limited to 256×256. Larger images are scaled down with their aspect ratio kept, and images that aren't square are centered with the leftover area left transparent.",
    });
  }
  if (to.id === "bmp") {
    out.push({
      title: "With no compression, the file size grows a lot",
      body: "BMP stores pixels as they are. A 1920×1080 image becomes about 6MB, so unless equipment or software requires BMP, another format is recommended.",
    });
  }

  out.push({
    title: to.hasQuality ? "You can adjust quality, size and background color" : `${to.name} has no quality setting`,
    body: to.hasQuality
      ? `When converting ${from.name} to ${to.name}, you can use the quality slider (default 90), exact width-and-height sizing with margin fill, and percentage resizing. ${sizeHint(from)}`
      : `${to.name} is ${COMPRESSION_LABEL[to.compression].toLowerCase()}, so the quality slider doesn't apply. Instead, when converting from ${from.name} you can manage file size by resizing (exact width and height, or a percentage).`,
  });

  out.push({ title: "How the file size changes", body: sizeSentence(from, to, sizeRatio(from.id, to.id)) });

  const diff = TRAITS[to.id].appSupport - TRAITS[from.id].appSupport;
  if (diff >= 1) {
    out.push({
      title: `${to.name} opens in more places`,
      body: `Support for ${from.name} in programs, document tools and upload forms is ${APP_LABEL[TRAITS[from.id].appSupport]}, while ${to.name} is ${APP_LABEL[TRAITS[to.id].appSupport]}. If you need to upload somewhere ${from.name} wouldn't open, try again after converting.`,
    });
  } else if (diff <= -1) {
    out.push({
      title: `${to.name} has narrower support than ${from.name}`,
      body: `${from.name} support is ${APP_LABEL[TRAITS[from.id].appSupport]} and ${to.name} support is ${APP_LABEL[TRAITS[to.id].appSupport]}. Check that the recipient can open ${to.name} first, and if you're not sure, JPG or PNG is safer.`,
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
    out.push(`You need to upload to a program, messenger or upload form that can't open ${from.name}`);
  }
  if (!TRAITS[from.id].browserOpen) out.push(`You want to use it on a website or blog but browsers can't display ${from.name}`);
  if (ratio !== null && ratio < 0.8) out.push(`You need to shrink a ${from.name} file for an email attachment or an upload size limit`);
  if (to.id === "webp") out.push(`You want to make ${from.name} images lighter so pages load faster`);
  if (to.id === "png" && kindOf(from.id) === "lossy") out.push("You'll edit it several times and want an intermediate file that no longer degrades");
  if (to.id === "png" && from.id === "svg") out.push("You're putting a logo or icon into a document, social network or presentation that doesn't support vectors");
  if (to.id === "jpg" && from.transparency) out.push("You're submitting to a place that doesn't need transparency (print, certificates, a product's main image) with a white background");
  if (to.id === "ico") out.push("You're making a website favicon or a Windows shortcut icon");
  if (to.id === "gif") out.push("You must upload a still image to an old board or system that only accepts GIF");
  if (to.id === "bmp") out.push("You need to feed legacy equipment or embedded software that only reads BMP");
  if (from.id === "heic") out.push("You want to open photos taken on an iPhone on a Windows PC or Android");
  if (from.id === "tiff") out.push("You need to share a scanned or print-ready TIFF on the web or by messenger");
  if (from.id === "ico") out.push("You want to pull a favicon or icon file out as an ordinary image for editing or documents");

  if (out.length < 3) out.push(`You're preparing an image for typical ${to.name} uses (${to.useCases.slice(0, 2).join(", ").toLowerCase()})`);
  if (out.length < 3) out.push(`You want to tidy a ${from.name} file into a format that's easier to edit or archive`);
  return out;
}

function buildTable(pair: Pair) {
  const from = full(pair.from);
  const to = full(pair.to);
  const fr = TRAITS[from.id];
  const tr = TRAITS[to.id];
  const photo = (v: number | null) => (v === null ? "n/a" : v === 1 ? "baseline (1×)" : `about ${v}×`);
  return [
    { label: "Compression", from: COMPRESSION_LABEL[from.compression], to: COMPRESSION_LABEL[to.compression] },
    { label: "Transparent background", from: yesNo(from.transparency), to: yesNo(to.transparency) },
    { label: "Animation", from: yesNo(from.animation), to: yesNo(to.animation) },
    { label: "Introduced", from: `${from.year}`, to: `${to.year}` },
    { label: "Support in programs and upload forms", from: APP_LABEL[fr.appSupport], to: APP_LABEL[tr.appSupport] },
    { label: "Shown directly in browsers", from: yesNo(fr.browserOpen), to: yesNo(tr.browserOpen) },
    { label: "Photo file size (JPG = 1)", from: photo(fr.photoSize), to: photo(tr.photoSize) },
  ];
}

function gainSummary(from: FullFormat, to: FullFormat): string {
  const parts: string[] = [];
  if (TRAITS[to.id].appSupport > TRAITS[from.id].appSupport) parts.push("you can open it in more places");
  const ratio = sizeRatio(from.id, to.id);
  if (ratio !== null && ratio < 0.8) parts.push("the file gets smaller");
  if (!from.transparency && to.transparency) parts.push("you get a format that supports transparency");
  if (from.transparency && !to.transparency) parts.push("a solid background replaces transparency");
  if (ratio !== null && ratio > 1.3) parts.push("the file grows");
  if (to.id === "ico") parts.push("it can be used as an icon or favicon");
  if (!parts.length) parts.push("compatibility and typical uses change");
  const joined = parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}` : parts[0];
  return `${joined}. See the comparison below for what changes.`.replace(/^./, (c) => c.toUpperCase());
}

function buildLead(pair: Pair): string[] {
  const from = full(pair.from);
  const to = full(pair.to);
  const fromTr = TRAITS[from.id];

  let p1 = `${from.name} is ${from.summary}.`;
  if (!fromTr.browserOpen) p1 += " Browsers can't display it directly, so converting is needed to use or share it on the web.";
  else if (fromTr.appSupport <= 3) p1 += ` Current browsers open ${from.name}, but support in programs and services is uneven.`;
  else p1 += ` ${from.name} opens in most environments, but another format such as ${to.name} may suit some uses better.`;

  const p2 =
    pair.to === "svg"
      ? svgLeadSecond(from, to.summary)
      : `${to.name} is ${to.summary}. When you convert ${from.name} to ${to.name}, ${gainSummary(from, to).replace(/^./, (c) => c.toLowerCase())}`;
  const p3 = `This converter reads the file itself to confirm it is ${from.name}, then converts it to ${to.name} right in your browser. Your image is never uploaded.`;
  return [p1, p2, p3];
}

function buildFaq(pair: Pair, changes: Change[]): PairContent["faq"] {
  if (pair.to === "svg") return svgFaq(full(pair.from));
  const from = full(pair.from);
  const to = full(pair.to);
  const fk = kindOf(from.id);
  const tk = kindOf(to.id);
  const faq: PairContent["faq"] = [];

  let quality: string;
  if (fk === "vector") {
    quality = `${from.name} is a resolution-independent vector, so it is drawn sharply at the size you set. Once saved as ${to.name}, though, it is a fixed pixel image, so decide the size you need first.`;
  } else if (to.id === "gif") {
    quality = "Because of GIF's 256-color limit, photos can look coarse. Logos and simple graphics show almost no difference.";
  } else if (fk === "lossless" && tk === "lossless") {
    quality = `No. ${from.name} and ${to.name} are both lossless, so pixel values stay exactly the same.`;
  } else if (fk === "lossy" && tk === "lossless") {
    quality = `It doesn't get worse. Information already lost in ${from.name} can't come back, but ${to.name} is lossless, so it preserves the image as it is now.`;
  } else if (fk === "lossless" && tk === "lossy") {
    quality = `${to.name} is lossy, so it can differ very slightly from the ${from.name} original. At the default quality of 90 it is hard to tell apart by eye, and you can adjust it with the slider.`;
  } else {
    quality = "Both are lossy, so each conversion adds a little degradation. Converting just once at quality 90 or higher rarely shows a visible difference.";
  }
  faq.push({ q: `Does converting ${from.name} to ${to.name} reduce quality?`, a: quality });

  faq.push({
    q: "What happens to the file size?",
    a: `${sizeSentence(from, to, sizeRatio(from.id, to.id))} When conversion finishes, the size of each ${from.name} original and ${to.name} result and the change are shown per file.`,
  });

  if (from.transparency && !to.transparency) {
    faq.push({
      q: `What happens to the background when I convert a transparent ${from.name} to ${to.name}?`,
      a: `${to.name} doesn't support transparency, so transparent areas are filled with a background color. It's white by default and you can change it in the options.`,
    });
  } else if (from.animation && !to.animation) {
    faq.push({
      q: `Can animated ${from.name} files be converted?`,
      a: `${to.name} doesn't support animation, so only the first frame is saved. To keep the motion you need to choose a format that supports animation.`,
    });
  } else if (changes.some((c) => c.title.startsWith("Multi-page"))) {
    faq.push({
      q: "Can multi-page TIFFs be converted?",
      a: "Only the first page is converted. To turn every page into an image, upload each page as a separate file.",
    });
  } else if (to.id === "ico") {
    faq.push({
      q: "What kind of image works best for a favicon?",
      a: "A square image with a simple shape. ICO is limited to 256×256, and since it is shown tiny, avoid images with a lot of text so it stays recognizable.",
    });
  } else {
    const [s1, s2] = to.strengths;
    faq.push({
      q: `What are the benefits of saving as ${to.name}?`,
      a: `Benefits of ${to.name} include "${s1}"${s2 ? ` and "${s2}"` : ""}. In some cases keeping ${from.name} is better, so check the comparison table above for how the two formats differ.`,
    });
  }

  faq.push({
    q: `Why won't my ${from.name} file open?`,
    a: `${from.compatibility} In that case, converting ${from.name} to ${to.name} ${TRAITS[to.id].appSupport >= TRAITS[from.id].appSupport ? "makes it open in more places" : `lets you use it for ${to.useCases[0].toLowerCase()} and other uses that need ${to.name}`}.`,
  });

  faq.push({
    q: "Is my file uploaded to a server?",
    a: `No. Your ${from.name} file is read and converted to ${to.name} only inside this browser and is never sent to a server. EXIF data such as shooting location is also removed during conversion.`,
  });
  return faq;
}

export function buildPairContent(pair: Pair): PairContent {
  const from = full(pair.from);
  const to = full(pair.to);
  const changes = buildChanges(pair);
  const h1 = `${from.name} to ${to.name} Converter`;
  return {
    title: `${h1} – Free Online`,
    description: `Convert ${from.name} files to ${to.name} for free. ${changes[0].title}. No sign-up; it runs in your browser and nothing is uploaded.`,
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
