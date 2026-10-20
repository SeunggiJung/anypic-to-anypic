import type { Change, FullFormat } from "../../../seo/pairLogic";

/**
 * Body text for conversions that end in SVG (png-to-svg and so on). Unlike the other pairs this is not a plain format
 * change but tracing (an estimate) that redraws a raster as shapes, so it is written separately to avoid statements
 * that would be false here (such as "pixels are preserved"). Keep the cautions consistent with the converter's own
 * notice (svg.notice in lib/i18n/messages/en.ts).
 */

/** Formats that are often photos */
const PHOTO_FORMATS = ["jpg", "heic", "tiff"];

export function svgChanges(from: FullFormat): Change[] {
  const out: Change[] = [
    {
      title: "It is an estimate, not an exact copy",
      body: `Converting ${from.name} to SVG here means tracing: finding the outlines of areas of color in the image and redrawing them as shapes. It isn't an ordinary conversion that preserves the original pixels, so the result is not identical to your ${from.name} file; edges may shift a little and small details can disappear.`,
    },
  ];

  if (PHOTO_FORMATS.includes(from.id)) {
    out.push({
      title: `${from.name} files are often photos, which don't suit SVG conversion`,
      body: `Photos have continuously changing colors, so splitting them into shapes gives a rough result and a file that can be much larger than your ${from.name} original (a single photo can reach several MB or more). When this site detects an image with many colors like a photo, it shows a warning on the result screen. If your ${from.name} contains a logo or icon, it is fine.`,
    });
  } else if (from.id === "ico") {
    out.push({
      title: "Small icons can come out angular",
      body: `${from.name} icons are usually small, from 16 to 256px, so there is little outline information. The shapes can look angular or crude, so convert from a larger original image to SVG if you can.`,
    });
  } else if (from.id === "gif") {
    out.push({
      title: "Stair-stepped GIF edges are followed as they are",
      body: "GIF has at most 256 colors and no semi-transparency, so edges can look like stair steps. Tracing follows the visible outline, so these rough edges can carry over into the result. An animated GIF uses only its first frame.",
    });
  } else {
    out.push({
      title: `It suits ${from.name} images with few colors and clear edges`,
      body: `${from.name} images with few colors and sharp edges, such as logos, icons and flat-color illustrations, convert fairly well. Photos and images with many gradients come out rough and the file size grows a lot.`,
    });
  }

  out.push({
    title: "Colors are simplified to the number you set",
    body: `SVG reduces the colors to a set number (2-64) to build the shapes. Subtle color differences in your ${from.name} file disappear, and smooth gradients can split into bands. You can adjust the number of colors and the level of detail in the conversion options; for logos and icons, 4-16 colors is often enough.`,
  });

  out.push({
    title: "Text becomes shapes, not a font",
    body: `Text inside the ${from.name} image is drawn as shapes in the SVG, not as text. You can't edit or search it later, and small or blurry text can be hard to read. If you need to edit the text, use the original design file.`,
  });

  out.push(
    from.transparency
      ? {
          title: "Transparent backgrounds are kept",
          body: `Transparent areas of the ${from.name} stay transparent in the SVG. To fill them with a color, turn on "Fill transparent areas and margins with the background color" in the options.`,
        }
      : {
          title: "The background becomes one big shape",
          body: `${from.name} has no transparent background, so the background color is included in the SVG as a large shape. If you don't need it, delete that shape in an editor after converting, or start from an original with a transparent background.`,
        },
  );

  out.push({
    title: "How size and file size change",
    body: `An SVG grows with the number of shapes. A simple logo can be smaller than the ${from.name} original, but a complex image becomes much larger. After converting, the result screen compares the size with the original and tells you when it is larger. Tracing is done on an image reduced to at most 1024px on a side, and only the display size (width and height) of the SVG is set to the size you chose, so it stays sharp when enlarged.`,
  });

  if (from.id === "tiff") {
    out.push({ title: "Multi-page TIFFs convert only the first page", body: "A TIFF can hold several pages in one file. Only the first page is made into an SVG." });
  }
  if (from.id === "heic") {
    out.push({ title: "Live Photo video and depth data are dropped", body: "Only the main photo of the HEIC is made into an SVG." });
  }
  return out;
}

export function svgWhen(from: FullFormat): string[] {
  const out = [
    `You have a ${from.name} logo or icon without an original vector file (AI, Figma and so on) and want a form that doesn't break when enlarged`,
    "You want to change the color or size of a simple graphic with code on the web",
    "You need a base outline for a program that takes outlines (vectors), such as cutting, embroidery or laser tools; the result may need cleaning up",
  ];
  if (from.id === "jpg") out.push("You want to rebuild a low-resolution JPG logo as a vector; if the JPG has compression noise, the result needs cleaning up");
  if (from.id === "ico") out.push("You want to turn a favicon ICO into a vector you can enlarge; small icons can come out with rough outlines");
  return out;
}

export function svgFaq(from: FullFormat): Array<{ q: string; a: string }> {
  return [
    {
      q: `Does converting ${from.name} to SVG improve quality?`,
      a: `No. Vector conversion doesn't create information that wasn't in the original; it approximates the visible areas of color with shapes. If your ${from.name} file is blurry or noisy, the result will be too, and only the outlines of the shapes stay sharp when enlarged.`,
    },
    {
      q: `Can a photo in ${from.name} be converted to SVG?`,
      a: "It can be converted, but it isn't recommended. Photos have continuously changing colors, so the result is rough and the file can grow to several MB or more. Use JPG or WebP for photos, and SVG for logos, icons and flat-color illustrations.",
    },
    {
      q: "Does converting to SVG make the file smaller?",
      a: `A simple ${from.name} image can get smaller, but not always. A complex image creates many shapes and can become much larger than the original. After converting, compare the size with the original on the result screen, and if it is larger, lower the colors or detail and convert again.`,
    },
    {
      q: "Can I edit the text in the image once it is an SVG?",
      a: "No. Text is converted to shapes, not a font, so you can't edit or search it. If you need to edit text, use the original design file.",
    },
    {
      q: "Is my file uploaded to a server?",
      a: `No. Your ${from.name} file is read and converted to SVG only inside this browser and is never sent to a server. EXIF data such as shooting location is also left out of the result.`,
    },
  ];
}

/** Lead paragraph 2: say first that this differs from an ordinary conversion */
export function svgLeadSecond(from: FullFormat, toSummary: string): string {
  return `SVG is ${toSummary}. Converting ${from.name} to SVG is not like changing the format of an ordinary file, though: it is tracing (an estimate) that redraws the image as shapes. It works well for simple images such as logos and icons but not for photos, so read the cautions below first.`;
}
