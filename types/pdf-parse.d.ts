/**
 * pdf-parse ships types for its package root but not the inner module. We
 * import `pdf-parse/lib/pdf-parse.js` directly to avoid the package root's
 * debug-mode file read (which throws ENOENT once bundled for serverless).
 * Declare the subpath so TypeScript knows its shape.
 */
declare module "pdf-parse/lib/pdf-parse.js" {
  interface PdfParseResult {
    text: string;
    numpages: number;
    numrender: number;
    info: unknown;
    metadata: unknown;
    version: string;
  }
  function pdfParse(
    dataBuffer: Buffer,
    options?: Record<string, unknown>,
  ): Promise<PdfParseResult>;
  export default pdfParse;
}
