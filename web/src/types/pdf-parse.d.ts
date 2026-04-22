declare module 'pdf-parse' {
  interface PDFData {
    numpages: number;
    numrender: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- pre-existing, deferred
    info: Record<string, any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- pre-existing, deferred
    metadata: Record<string, any>;
    text: string;
    version: string;
  }

  function pdfParse(
    dataBuffer: Buffer | Uint8Array,
    options?: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- pre-existing, deferred
      pagerender?: (pageData: any) => string;
      max?: number;
      version?: string;
    }
  ): Promise<PDFData>;

  export = pdfParse;
}