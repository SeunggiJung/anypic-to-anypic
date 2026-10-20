/**
 * Hand-written practical tips for high-demand conversions (English).
 * They add "things that only apply to this combination" on top of the generated comparison text.
 * Combinations not listed here show only the generated paragraphs.
 */
export interface PairNote {
  tips: string[];
}

export const PAIR_NOTES: Record<string, PairNote> = {
  "webp-to-jpg": {
    tips: [
      "Most of the time, saving an image from a website with \"Save image as\" gives you a .webp file. The server sent WebP to your browser; the image itself is unchanged and only the extension is unfamiliar.",
      "PowerPoint, word processors, older versions of Photoshop and some online-shop product forms reject WebP. Converting to JPG at a quality around 90 makes it open anywhere without a big difference in size.",
      "If the WebP has a transparent background, JPG needs a background color. For a white-background product photo keep the default (white); for an image on a dark screen, pick black or the matching color.",
    ],
  },
  "webp-to-png": {
    tips: [
      "If you need the WebP's transparent background, convert to PNG rather than JPG. The alpha channel is preserved.",
      "Converting a lossy WebP to PNG doesn't bring back information that was already lost. What you get is a safe intermediate file that adds no further degradation when you edit and save later.",
    ],
  },
  "heic-to-jpg": {
    tips: [
      "On your iPhone, go to Settings > Camera > Formats and choose \"Most Compatible\" and new photos are saved as JPG from the start. Use this converter for the photos you've already taken, many at once.",
      "HEIC is about half the size of JPG, but at the same visual quality the converted file can end up larger. Keeping the quality slider between 80 and 90 balances size and quality well.",
      "EXIF data such as GPS location is removed during conversion, so it also works as a privacy step before posting photos on social networks or resale sites.",
    ],
  },
  "heic-to-png": {
    tips: [
      "Saving a photo as PNG easily makes it three or four times the size of a JPG. Unless you need an editing master or want to avoid JPG compression noise, JPG is recommended.",
      "Extras inside the HEIC, such as the short video of a Live Photo or depth data, are not converted. Only the main photo is saved as PNG.",
    ],
  },
  "heic-to-webp": {
    tips: [
      "If the HEIC photo is for a website or blog, WebP is better than JPG for file size. Around quality 80, it shrinks a lot with no noticeable difference.",
    ],
  },
  "png-to-jpg": {
    tips: [
      "Screenshots, document captures and text-heavy images get blocky artifacts around the letters as JPG. Photos are fine, but if the text matters, keep PNG or raise the quality to 95 or more.",
      "A transparent PNG becomes JPG with the transparent areas filled by the background color. Choose white if the logo will sit on white paper, or a matching color for dark surfaces.",
      "A PNG photo over 10MB typically shrinks to around 1MB as JPG, which helps you get under email and upload limits.",
    ],
  },
  "png-to-webp": {
    tips: [
      "If a site-speed tool such as Lighthouse recommends improving image formats or sizes, converting PNG photos to WebP is the easiest fix. Transparency is preserved too.",
      "For simple images such as logos, a low quality can blur the edges, so keep it at 85 or above and check the size change in the result screen.",
    ],
  },
  "png-to-ico": {
    tips: [
      "An image for a favicon works best when it's square. If the aspect ratio differs, it is centered and the leftover area is left transparent.",
      "ICO is limited to 256×256. Larger images are scaled down with their aspect ratio kept. To stay recognizable at small sizes, avoid images with a lot of text and use a simple shape.",
      "Current browsers also accept PNG favicons, but Windows shortcut icons and older environments still need .ico.",
    ],
  },
  "jpg-to-png": {
    tips: [
      "Converting JPG to PNG doesn't improve quality or make the background transparent. Information lost when the JPG was saved can't be restored, and a transparent background needs a separate background-removal step.",
      "People convert to PNG mostly to keep editing without further degradation, or because a place accepts only PNG. The file can become several times larger.",
    ],
  },
  "jpg-to-webp": {
    tips: [
      "At the same quality the size typically drops by about 20-35%. You can see the actual reduction right in the result screen.",
      "Compressing JPG with a lossy format again degrades it a tiny bit more. If you have the original, convert from it to WebP, with quality between 80 and 90 recommended.",
    ],
  },
  "svg-to-png": {
    tips: [
      "SVG has no resolution, so you need to set the size yourself when converting to PNG. Set the width in px in the options and it is drawn sharply at that size. If you may need it larger later, specify a generous size from the start.",
      "The background stays transparent. If you need a white background, convert to JPG instead and pick the background color.",
      "If the SVG links to external fonts or external images, they can be missing when the browser draws it. An SVG whose text has been converted to outlines is the safest.",
    ],
  },
  "png-to-svg": {
    tips: [
      "A logo PNG with a transparent background converts best. Start with 4-8 colors and medium detail, then enlarge the result preview to check it. If the outline is rough, raise the colors or detail; if the file is too large, lower them.",
      "A small PNG with soft edges can give lumpy outlines. If you can, convert from an original that is at least twice as large.",
      "It is normal for the result to differ a little from the original. If the exact shape matters, as with a brand logo, first check whether an original vector file (AI, Figma and so on) exists.",
    ],
  },
  "jpg-to-svg": {
    tips: [
      "Because of compression noise, a JPG has slightly different colors mixed in even where the color looks the same, so even a flat-color logo can be split into messy shapes. Try lowering the colors and setting the detail to simple.",
      "If it's a photo, this conversion isn't recommended. If the result screen shows the photo warning, JPG or WebP is a better choice than SVG.",
      "JPG has no transparent background, so a white background is included as one big shape. After converting, delete the background shape in an editor before using it.",
    ],
  },
  "svg-to-jpg": {
    tips: [
      "The vector's transparent background is filled with the background color you choose in JPG. If you need a white background for a logo on a social network or document, the default works as is.",
    ],
  },
  "svg-to-ico": {
    tips: [
      "You can make a favicon straight from an SVG logo. If you don't set a size, it is fitted inside 256×256 with the aspect ratio kept.",
    ],
  },
  "gif-to-png": {
    tips: [
      "An animated GIF saves only its first frame as PNG. If you need the motion, use a video conversion tool instead of this conversion.",
      "GIF has at most 256 colors, so converting to PNG doesn't add colors. It does give you a format that can handle transparent edges more smoothly.",
    ],
  },
  "gif-to-jpg": {
    tips: [
      "An animated GIF converts only its first frame. A still-image GIF can be made smaller as JPG, but sharp shapes and text can blur.",
    ],
  },
  "tiff-to-jpg": {
    tips: [
      "TIFFs from scanners are very large. As JPG they often shrink to a tenth or less, depending on the scan resolution, which makes email attachments and uploads easy.",
      "Multi-page TIFFs convert only the first page. To split a multi-page document into images, use files separated per page.",
    ],
  },
  "tiff-to-png": {
    tips: [
      "For images where the text matters, such as scanned documents, PNG is sharper than JPG. It is lossless, so TIFF's quality is kept as it is. Multi-page TIFFs still convert only the first page.",
    ],
  },
  "avif-to-jpg": {
    tips: [
      "AVIF is a newer format, so older programs, messengers and upload forms often can't open it. Converting to JPG makes it open almost everywhere.",
      "Because AVIF is much smaller at the same quality, converting to JPG can make the file nearly twice as large. If size is the problem, try lowering quality to around 80.",
    ],
  },
  "avif-to-png": {
    tips: [
      "AVIF supports transparency, so PNG is the safest choice when you need an AVIF with a transparent background to work in places that can't open it.",
    ],
  },
  "bmp-to-jpg": {
    tips: [
      "BMP has no compression, so converting to JPG usually shrinks it to a tenth or less. This helps the most when you're cleaning up picture files made by old programs.",
    ],
  },
  "bmp-to-png": {
    tips: [
      "Like BMP, PNG has no quality loss, but the file is much smaller. If you want to keep the quality and only reduce the size, PNG is a better fit than JPG.",
    ],
  },
  "ico-to-png": {
    tips: [
      "If the ICO file contains several sizes, only one of the images is used. If you need a specific size, adjust it after converting with the size option.",
      "PNG is the easiest format to edit a favicon or put it into a document.",
    ],
  },
  "png-to-gif": {
    tips: [
      "Converting PNG to GIF reduces colors to at most 256. Photos can show color banding, so it suits images with simple colors such as logos and pixel art.",
      "Transparency is kept, but semi-transparent edges are split into transparent or opaque, which can look like stair steps.",
    ],
  },
  "png-to-bmp": {
    tips: [
      "Use BMP only when legacy equipment or software requires it. The file becomes several times the size of the PNG. Transparent areas are filled with the background color you choose.",
    ],
  },
  "jpg-to-ico": {
    tips: [
      "A photo makes a hard-to-read favicon at small sizes. A square photo with a face or a simple subject large in the center is easiest to recognize.",
    ],
  },
  "webp-to-gif": {
    tips: [
      "An animated WebP converts only its first frame to GIF. Use this when you need to upload a still WebP image to a place that only accepts GIF.",
    ],
  },
};
