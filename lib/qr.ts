import QRCode from "qrcode";

/** Render a QR code as a PNG data URL, generated on the server. */
export async function qrDataUrl(url: string, dark: string): Promise<string> {
  return QRCode.toDataURL(url, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 320,
    color: { dark, light: "#ffffff" },
  });
}

/**
 * Vector QR as an SVG string. This is the good one to print: it is a few KB
 * and stays sharp at any size, so a 20mm card and an A3 poster both look clean.
 * Error correction is raised to H because printed codes get smudged, creased
 * and partially covered by design elements more than screen ones do.
 *
 * `width` matters even for vector output: without an intrinsic size the root
 * <svg> carries only a viewBox, and browsers then report naturalWidth 0 for an
 * <img> that embeds it, which shows up as a blank box. 512 gives the preview a
 * real intrinsic size while leaving the path data fully scalable.
 */
export async function qrSvg(
  url: string,
  dark: string,
  width = 512,
): Promise<string> {
  return QRCode.toString(url, {
    errorCorrectionLevel: "H",
    margin: 1,
    type: "svg",
    width,
    color: { dark, light: "#ffffff" },
  });
}

/**
 * High-resolution raster QR as raw PNG bytes. Use this when handing the file to
 * a printer that wants a bitmap rather than artwork it has to interpret.
 */
export async function qrPngBuffer(
  url: string,
  dark: string,
  width: number,
): Promise<Buffer> {
  return QRCode.toBuffer(url, {
    errorCorrectionLevel: "H",
    margin: 1,
    width,
    color: { dark, light: "#ffffff" },
  });
}
