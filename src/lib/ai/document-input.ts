import * as pdfjs from "pdfjs-dist";
import type {
  DocumentGenerationInput,
  ModelMeta,
  ProjectSource,
} from "./types";

// Client-side worker setup. Mirrors src/lib/document-service.ts.
if (typeof window !== "undefined") {
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.mjs",
    import.meta.url
  ).toString();
}

// Providers that don't accept PDFs directly — we rasterize for them.
const NEEDS_RASTERIZATION: ModelMeta["providerId"][] = ["openai", "openrouter"];

const DEFAULT_MAX_PAGES = 20;
const RENDER_SCALE = 1.5; // ~150 DPI when base is 72

export async function rasterizePdfPages(
  bytes: Uint8Array,
  opts: { maxPages?: number } = {}
): Promise<{ mimeType: "image/png"; data: Uint8Array }[]> {
  const maxPages = opts.maxPages ?? DEFAULT_MAX_PAGES;
  const pdf = await pdfjs.getDocument(bytes).promise;
  const pageCount = Math.min(pdf.numPages, maxPages);
  const images: { mimeType: "image/png"; data: Uint8Array }[] = [];

  for (let i = 1; i <= pageCount; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: RENDER_SCALE });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not get 2d canvas context");
    await page.render({ canvas, canvasContext: ctx, viewport }).promise;

    const blob: Blob = await new Promise((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png");
    });
    const buf = new Uint8Array(await blob.arrayBuffer());
    images.push({ mimeType: "image/png", data: buf });
  }

  return images;
}

// Text extraction fallback (same impl as src/lib/document-service.ts, duplicated to avoid cycle).
async function extractPdfText(bytes: Uint8Array): Promise<string> {
  const pdf = await pdfjs.getDocument(bytes).promise;
  let full = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- pdfjs TextItem types don't ship a discriminator
      .map((item: any) => ("str" in item ? item.str : ""))
      .join(" ");
    full += pageText + "\n\n";
  }
  return full;
}

export async function buildDocumentInput(
  source: ProjectSource,
  model: ModelMeta
): Promise<DocumentGenerationInput> {
  if (source.kind === "pdf" && model.supportsVision) {
    if (NEEDS_RASTERIZATION.includes(model.providerId)) {
      const images = await rasterizePdfPages(source.bytes);
      return { kind: "multi-image", images };
    }
    return { kind: "file", mimeType: "application/pdf", data: source.bytes };
  }

  if (source.kind === "pdf") {
    const text = await extractPdfText(source.bytes);
    return { kind: "text", content: text };
  }

  // docx and text sources are already extracted text
  return { kind: "text", content: source.text };
}
