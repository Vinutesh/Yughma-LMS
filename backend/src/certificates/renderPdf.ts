import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { getObjectBuffer } from "../storage/r2.js";

export interface CertificateOverlayLayoutShape {
  name: { x: number; y: number };
  course: { x: number; y: number };
  date: { x: number; y: number };
}

export interface CertificatePdfInput {
  recipientName: string;
  sourceTitle: string;
  issuedAt: Date;
  verificationCode: string;
  orgName: string;
  /** Set only when the template has a background AND storage is
   * configured — the caller decides whether to attempt this path at all,
   * this function just renders whichever shape it's given. */
  backgroundStorageKey: string | null;
  overlayLayout: CertificateOverlayLayoutShape | null;
}

/**
 * Renders one certificate as a PDF, in either of the two shapes
 * `CertificateFace.tsx` renders on screen — this is the print/download
 * counterpart to that component, not a separate design. A template with a
 * background+layout gets its design embedded as a full-page image with the
 * three dynamic fields drawn at their saved percentages (PDF's y-axis
 * counts up from the bottom, unlike CSS, hence the flip below); a template
 * with neither falls back to a plain recreation of the app's fixed layout.
 * `pdf-lib` specifically (pure JS, no native binary) — this runs on
 * Vercel, and this codebase already hit a real, documented outage from a
 * native-binary dependency once (see schema.prisma's own generator
 * comment); nothing here repeats that mistake.
 */
export async function renderCertificatePdf(input: CertificatePdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  // DD/MM/YYYY, matching CertificateFace.tsx's own `formatLongDate` — the
  // PDF is the print/download counterpart to that on-screen view, not a
  // separately-designed layout, so the date format has to match.
  const dateLabel = [
    String(input.issuedAt.getDate()).padStart(2, "0"),
    String(input.issuedAt.getMonth() + 1).padStart(2, "0"),
    input.issuedAt.getFullYear(),
  ].join("/");

  if (input.backgroundStorageKey && input.overlayLayout) {
    const imageBytes = await getObjectBuffer(input.backgroundStorageKey);
    const isPng = input.backgroundStorageKey.toLowerCase().endsWith(".png");
    const image = isPng ? await doc.embedPng(imageBytes) : await doc.embedJpg(imageBytes);
    const { width, height } = image.scale(1);
    const page = doc.addPage([width, height]);
    page.drawImage(image, { x: 0, y: 0, width, height });

    const font = await doc.embedFont(StandardFonts.HelveticaBold);
    const drawCentered = (text: string, pos: { x: number; y: number }, size: number) => {
      const textWidth = font.widthOfTextAtSize(text, size);
      page.drawText(text, {
        x: (pos.x / 100) * width - textWidth / 2,
        y: height - (pos.y / 100) * height - size / 2,
        size,
        font,
        color: rgb(0.06, 0.09, 0.16),
      });
    };
    const fieldSize = Math.max(14, height * 0.032);
    drawCentered(input.recipientName, input.overlayLayout.name, fieldSize);
    drawCentered(input.sourceTitle, input.overlayLayout.course, fieldSize * 0.75);
    drawCentered(dateLabel, input.overlayLayout.date, Math.max(11, height * 0.02));

    const codeFont = await doc.embedFont(StandardFonts.Helvetica);
    const codeText = `Verification code: ${input.verificationCode}`;
    const codeSize = Math.max(9, height * 0.014);
    const codeWidth = codeFont.widthOfTextAtSize(codeText, codeSize);
    page.drawText(codeText, {
      x: width / 2 - codeWidth / 2,
      y: Math.max(10, height * 0.02),
      size: codeSize,
      font: codeFont,
      color: rgb(0.45, 0.45, 0.5),
    });

    return doc.save();
  }

  // Fixed layout fallback — landscape, matches CertificateFace's default
  // design closely enough to read as the same certificate, not pixel-exact.
  const width = 792;
  const height = 612;
  const page = doc.addPage([width, height]);
  page.drawRectangle({ x: 0, y: 0, width, height, color: rgb(1, 1, 1) });
  page.drawRectangle({
    x: 24,
    y: 24,
    width: width - 48,
    height: height - 48,
    borderColor: rgb(0.78, 0.64, 0.2),
    borderWidth: 1.5,
  });

  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const center = (text: string, y: number, font: typeof bold, size: number, color = rgb(0.06, 0.09, 0.16)) => {
    const w = font.widthOfTextAtSize(text, size);
    page.drawText(text, { x: width / 2 - w / 2, y, size, font, color });
  };

  const muted = rgb(0.45, 0.45, 0.5);
  center(input.orgName.toUpperCase(), height - 90, bold, 11, muted);
  center("Certificate of Completion", height - 130, bold, 28);
  center("This certifies that", height - 190, regular, 12, muted);
  center(input.recipientName, height - 225, bold, 24);
  center(`has completed ${input.sourceTitle}`, height - 262, regular, 14);
  center(`on ${dateLabel}`, height - 285, regular, 11, muted);
  center(`Verification code: ${input.verificationCode}`, 55, regular, 10, muted);

  return doc.save();
}
