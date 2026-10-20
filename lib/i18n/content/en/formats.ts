import type { FormatId } from "../../../formats";
import type { FormatText } from "../../../formatText";

/** Per-format descriptive text (English). Names, MIME types and numeric traits live in lib/formats.ts. */
export const FORMAT_TEXT: Record<FormatId, FormatText> = {
  png: {
    summary: "a versatile lossless format with transparency support",
    description: [
      "PNG (Portable Network Graphics) is a lossless format created in 1996 to avoid the patent problems around GIF. Because not a single pixel changes when you save and reopen it, it suits original artwork that goes through many edits.",
      "It has an alpha channel, so soft shadows and smooth edges on a logo can be saved without a background. The downside is that photos, where colors change continuously, compress poorly and can be several times larger than the same scene saved as JPG.",
    ],
    strengths: [
      "Lossless compression: no quality loss no matter how often you save",
      "Alpha channel (semi-transparency) support",
      "Crisp edges for text, line art and screenshots",
      "Opens in almost every browser and program",
    ],
    weaknesses: [
      "Photos are much larger than JPG or WebP",
      "Standard PNG has no animation (APNG is a separate extension)",
    ],
    useCases: ["Logos and icons", "Screenshots", "Images that need a transparent background", "Intermediate files for editing"],
    compatibility:
      "Supported by every modern browser, operating system and image editor. It is the safest choice when you want to avoid compatibility problems.",
    history: [
      "PNG was developed in the mid-1990s as a freely usable replacement for GIF after the patent issues around GIF's LZW compression became public. It became a W3C recommendation in 1996 and was later adopted as an ISO standard (ISO/IEC 15948).",
      "Unlike GIF it has no 256-color limit and supports an alpha channel, which made it the default format for logos, icons and screenshots on the web.",
    ],
  },
  jpg: {
    summary: "the most widely used lossy format for photos",
    description: [
      "JPG (JPEG) is a lossy format standardized in 1992. It drops information the human eye is less sensitive to, making photos very small. It is the format cameras and smartphones save by default, so it is the one you meet most often.",
      "Because it is lossy, quality drops slightly every time you re-save, and it doesn't support transparency. Converting a transparent PNG to JPG means the transparent areas must be filled with some color, so this site lets you pick the background color yourself.",
    ],
    strengths: [
      "Stores photos in very small files",
      "Opens on virtually every device and service",
      "Quality setting lets you trade file size against quality",
    ],
    weaknesses: [
      "No transparent background",
      "Quality degrades each time it is re-saved",
      "Blocky artifacts appear around sharp text and line art",
    ],
    useCases: ["Sharing photos", "Blog and online-shop product photos", "Email attachments", "Images for official or school submissions"],
    compatibility:
      "The most compatible photo format. Old software, print shops and upload forms mostly ask for JPG.",
    history: [
      "JPEG takes its name from the Joint Photographic Experts Group, which published the standard (ITU-T T.81) in 1992. It uses the discrete cosine transform (DCT) to exploit the fact that our eyes are less sensitive to small differences in color.",
      "It became the de facto standard for photos with the spread of digital cameras, and most cameras and smartphones still save it by default. The extensions .jpg and .jpeg are the same format.",
    ],
  },
  webp: {
    summary: "a web format that is smaller than JPG and supports transparency and animation",
    description: [
      "WebP is a web image format Google released in 2010. At the same quality it can be roughly 25-35% smaller than JPG, and it handles lossy and lossless compression, transparency and animation in a single format.",
      "People often run into \"this WebP won't open\" after saving an image from the web. Browsers can read it, but older editors, some upload forms and document tools can't. Converting it to JPG or PNG solves that.",
    ],
    strengths: [
      "Smaller files than JPG at the same quality",
      "Supports transparency and animation",
      "Supported by all major browsers today",
    ],
    weaknesses: [
      "Older programs and some upload forms may reject it",
      "Print shops and official submissions often still require JPG or PNG",
    ],
    useCases: ["Optimizing website images", "Transparent web graphics", "Short animations"],
    compatibility:
      "All current browsers, including Chrome, Edge, Firefox and Safari, support it. Support in editing software and document tools varies by version.",
    history: [
      "Google released WebP in 2010 after acquiring the video codec company On2, building on the keyframe technology of its VP8 video codec. Lossless compression and transparency were added in 2012.",
      "For a long time only Chrome-family browsers fully supported it. Firefox and Safari joined around 2019-2020, so every major browser can now display it.",
    ],
  },
  avif: {
    summary: "a next-generation format with the highest compression efficiency available",
    description: [
      "AVIF is an image format released in 2019 that builds on the still-image technology of the AV1 video codec. At the same quality it can be around 50% smaller than JPG, so websites sensitive to file size are adopting it quickly.",
      "However, encoding is slower, and the ability for browsers to create AVIF via Canvas exists only in some environments. This site checks whether your browser can save AVIF before offering it.",
    ],
    strengths: [
      "Top-tier compression efficiency",
      "Supports transparency, HDR and wide color gamut",
      "Animation is possible",
    ],
    weaknesses: [
      "Slow to encode",
      "Doesn't open in some browsers and programs yet",
      "Creating AVIF directly in the browser is supported in few environments",
    ],
    useCases: ["Optimizing images on high-traffic websites", "Storing high-quality photos in small files"],
    compatibility:
      "Recent versions of Chrome, Firefox and Safari can display it, but support in editors, messengers and upload forms is still uneven.",
    history: [
      "AVIF was created by the Alliance for Open Media, whose members include Google, Netflix and Mozilla, as the still-image format of the AV1 video codec. The specification was published in 2019.",
      "Chrome added support in 2020, Firefox in 2021 and Safari in 2022. Compression efficiency is excellent, but encoding is slow and support in editing tools is not yet wide.",
    ],
  },
  gif: {
    summary: "limited to 256 colors, and synonymous with short moving images",
    description: [
      "GIF is one of the oldest web image formats, created in 1987, and can use only up to 256 colors per image. The compression itself is lossless, but reducing the colors to 256 makes photos look visibly coarse.",
      "Transparency is on/off only, so semi-transparent shadows can't be represented. GIF output on this site creates a single still image and does not convert animation.",
    ],
    strengths: [
      "The animation standard that plays everywhere",
      "Small files for simple graphics and icons",
    ],
    weaknesses: [
      "256-color limit makes photos look poor",
      "No semi-transparency (only transparent or opaque)",
      "The same content as WebP or AVIF is much smaller",
    ],
    useCases: ["Simple logos and pixel art", "Uploading still images to legacy systems that only accept GIF"],
    compatibility: "Opens in all browsers, messengers and online communities.",
    history: [
      "GIF (Graphics Interchange Format) was created by CompuServe in 1987 to exchange images over slow modems. The 1989 specification (89a) added transparent colors and animation.",
      "The patent issues around LZW compression that surfaced in the late 1990s led to the creation of PNG, but GIF is still widely used because short moving images play everywhere.",
    ],
  },
  bmp: {
    summary: "Windows' basic bitmap that stores pixels as they are, without compression",
    description: [
      "BMP is a bitmap format from Windows that mostly stores pixel values as they are, without compression. Its simple structure makes it easy for programs to read, but the files are so large that it is rarely used on the web.",
      "For example, a 1920×1080 image saved as BMP is about 6MB, while the same image as JPG is a few hundred KB. Unless old equipment or software demands BMP, other formats are recommended.",
    ],
    strengths: ["Simple structure with broad compatibility", "No decompression step needed"],
    weaknesses: ["Very large files", "Transparency support is inconsistent (saved as opaque here)"],
    useCases: ["Input for legacy equipment and software", "Simple image-processing exercises"],
    compatibility: "Opens on Windows and in most image viewers, and web browsers can display it too.",
    history: [
      "BMP is the bitmap graphics format of Windows. It matured into the device-independent DIB format around Windows 3.0 (1990) and was the default format of Windows Paint for a long time.",
      "Its simple structure makes it easy to read and write, but because it isn't compressed the files are large, and it gave way to JPG and PNG as the web spread.",
    ],
  },
  ico: {
    summary: "a container format for favicons and Windows icons",
    description: [
      "ICO is the format used for Windows icons and website favicons. Its distinguishing feature is that one file can hold several sizes, such as 16×16, 32×32 and 256×256.",
      "This site packs PNG data scaled to at most 256×256 into an ICO container. Images that aren't square are centered with their aspect ratio preserved, and the leftover area is left transparent.",
    ],
    strengths: ["The standard favicon format", "Supports transparency", "Can hold multiple sizes in one file"],
    weaknesses: ["Limited to 256×256", "Unsuitable for ordinary photos"],
    useCases: ["Website favicons", "Windows program icons"],
    compatibility: "Every browser recognizes it as a favicon, and Windows Explorer can use it as an icon directly.",
    history: [
      "ICO is the icon file format that goes back to Windows 1.0 (1985). Early icons held only small bitmaps, but since Windows Vista it can embed PNG data directly, which allows high-resolution 256×256 icons.",
      "On the web, it became the de facto standard for site icons (favicons) after Internet Explorer introduced favicon.ico around 1999.",
    ],
  },
  tiff: {
    summary: "a high-quality format used for scans, print and photo archives",
    description: [
      "TIFF has long been used for scanners, publishing and print, and for archiving original photos. It is a flexible container that supports lossless compression as well as several other compression methods and high bit depths.",
      "Browsers can't display it directly, so it needs converting before going on the web. This site reads TIFF as input and converts it to PNG, JPG, WebP and more. Exporting to TIFF isn't supported.",
    ],
    strengths: ["High-quality originals", "Many color modes and bit depths", "Common for scanned documents"],
    weaknesses: ["Large files", "Browsers can't display it", "Many variants, so compatibility differs between programs"],
    useCases: ["Scanned documents", "Print-ready originals", "Photo archives"],
    compatibility: "Most browsers other than Safari can't display TIFF. Professional editors and OS default viewers can open it.",
    history: [
      "TIFF (Tagged Image File Format) was created by Aldus in 1986 for exchanging desktop-publishing and scanner images. Adobe has maintained the specification since acquiring Aldus.",
      "Its tag-based structure holds many color modes and compression methods, so it has long been used in professional fields such as scanning, print, and medical and map imagery.",
    ],
  },
  heic: {
    summary: "the high-efficiency format iPhone photos use by default",
    description: [
      "HEIC is HEVC (H.265) compression packaged in the HEIF container, and Apple adopted it as the default camera format from iOS 11. At the same quality it takes up about half the space of JPG.",
      "The problem is that Windows, parts of Android and many web upload forms can't open HEIC. This site decodes HEIC inside your browser and converts it to JPG, PNG and more, so your photos are never uploaded.",
    ],
    strengths: ["About half the size of JPG", "Supports 10-bit color depth and extras such as Live Photos"],
    weaknesses: ["Poor compatibility on Windows and web services", "Patent and licensing issues limit browser support"],
    useCases: ["Storing iPhone photos", "Keeping high-quality photos small"],
    compatibility: "Opens without trouble on Apple devices, but Windows needs an extension and most browsers can't display it.",
    history: [
      "HEIC is the HEVC (H.265) compression packaged in the HEIF (High Efficiency Image File Format) container that MPEG standardized in 2015.",
      "Apple made it the default photo format in iOS 11 and macOS High Sierra in 2017, which is how ordinary users came to know it. HEVC carries patent royalties, so default support in Windows and browsers is limited.",
    ],
  },
  svg: {
    summary: "an XML-based vector format that stays sharp at any size",
    description: [
      "SVG stores lines, shapes and curves as math in text (XML) instead of pixels. It stays sharp however far you zoom, and a simple logo can be just a few KB.",
      "On this site SVG is supported only as input, which is turned into a raster image (PNG, JPG and so on). If the SVG has no size information, it is drawn 1024px wide. Converting raster images to SVG isn't supported.",
    ],
    strengths: ["Independent of resolution", "Editable and stylable as code", "Very small files for simple graphics"],
    weaknesses: ["Unsuitable for photos", "Complex SVGs can be slow to render", "Some services reject SVG uploads"],
    useCases: ["Logos and icons", "Illustrations", "Responsive web graphics"],
    compatibility: "Every current browser supports it, but social networks, messengers and some upload forms don't accept SVG.",
    history: [
      "SVG (Scalable Vector Graphics) was published by the W3C as a 1.0 recommendation in 2001, and version 1.1 from 2003 served as the standard for a long time. Because it's XML you can open it in a text editor.",
      "It is independent of resolution and can be handled with CSS and JavaScript, so it is now the default format for web logos, icons and data visualization.",
    ],
  },
};
