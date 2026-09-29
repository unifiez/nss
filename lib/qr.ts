import QRCode from "qrcode";
import { getProfileUrl } from "@/lib/site-url";
/** Render a QR code as a PNG data URL, generated on the server. */
export async function qrDataUrl(url: string, dark: string): Promise<string> {
  return QRCode.toDataURL(url, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 320,
    color: { dark, light: "#ffffff" },
  });
}

export async function profileQrDataUrl(id: string, accent: string): Promise<string> {
  return qrDataUrl(getProfileUrl(id), accent);
}
