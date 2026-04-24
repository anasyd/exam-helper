import { Router } from "express";
import { Readable } from "stream";
import { requireAuth, type AuthedRequest } from "../middleware/auth-guard.js";
import { filesBucket } from "../db.js";
import { logger } from "../logger.js";

export const demoRouter = Router();
demoRouter.use(requireAuth);

const PROJECT_ID = "demo-intro-to-qc";
const FILE_NAME = "mit-8370x-week1.pdf";

// Lazily generated once per process start and cached
let cachedPdf: Buffer | null = null;

async function buildDemoPdf(): Promise<Buffer> {
  if (cachedPdf) return cachedPdf;

  // Dynamic import: pdfkit is CommonJS, loads fine inside ESM
  const PDFDocumentModule = await import("pdfkit");
  const PDFDocument = PDFDocumentModule.default as typeof import("pdfkit");

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 72, size: "LETTER" });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => {
      cachedPdf = Buffer.concat(chunks);
      resolve(cachedPdf);
    });
    doc.on("error", reject);

    // ── Title ──
    doc
      .fontSize(22)
      .font("Helvetica-Bold")
      .text("Introduction to Quantum Computing", { align: "center" });
    doc.moveDown(0.4);
    doc
      .fontSize(12)
      .font("Helvetica")
      .fillColor("#555555")
      .text("MIT 8.370x — Week 1 Lecture Notes", { align: "center" });
    doc.fillColor("black").moveDown(2);

    // ── Section helper ──
    const section = (title: string, body: string) => {
      doc.fontSize(14).font("Helvetica-Bold").text(title);
      doc.moveDown(0.3);
      doc.fontSize(11).font("Helvetica").text(body, { lineGap: 3 });
      doc.moveDown(1.2);
    };

    section(
      "1. Qubits and Superposition",
      "A qubit (quantum bit) is the fundamental unit of quantum information. Unlike classical " +
        "bits that are deterministically 0 or 1, a qubit can exist in a superposition of both " +
        "states simultaneously: |ψ⟩ = α|0⟩ + β|1⟩, where |α|² + |β|² = 1. When measured, " +
        "the qubit collapses to |0⟩ with probability |α|² or |1⟩ with probability |β|². This " +
        "probabilistic, superposed nature enables quantum parallelism — performing computations " +
        "across all possible inputs at once.",
    );

    section(
      "2. The Bloch Sphere",
      "The Bloch sphere is a geometric representation of a single qubit state. Any pure qubit " +
        "state corresponds to a unique point on the surface of the unit sphere. The north pole " +
        "represents |0⟩ and the south pole |1⟩. Superposition states map to points on the " +
        "equator or elsewhere on the sphere. This visualisation helps build intuition for " +
        "single-qubit gate operations.",
    );

    section(
      "3. Quantum Gates",
      "Quantum gates manipulate qubits analogously to logic gates in classical circuits. " +
        "Key single-qubit gates include:\n\n" +
        "  • Hadamard (H): Maps |0⟩ → (|0⟩+|1⟩)/√2, creating equal superposition.\n" +
        "  • Pauli-X: Bit-flip; maps |0⟩ → |1⟩ and |1⟩ → |0⟩.\n" +
        "  • Pauli-Z: Phase-flip; maps |1⟩ → −|1⟩, leaves |0⟩ unchanged.\n" +
        "  • Pauli-Y: Combines X and Z operations.\n\n" +
        "The CNOT gate is the canonical two-qubit gate. It flips the target qubit if and only " +
        "if the control qubit is |1⟩. Together with single-qubit gates, CNOT forms a universal " +
        "gate set capable of implementing any quantum algorithm.",
    );

    section(
      "4. Quantum Entanglement",
      "Entanglement is a uniquely quantum phenomenon in which two or more qubits share a " +
        "combined quantum state that cannot be decomposed into independent single-qubit states. " +
        "Measuring one entangled qubit instantly determines the state of its partner, regardless " +
        "of separation. Bell states (e.g. (|00⟩+|11⟩)/√2) are the canonical maximally " +
        "entangled two-qubit states. Entanglement underlies quantum teleportation, " +
        "superdense coding, and quantum key distribution (QKD).",
    );

    section(
      "5. Shor's Algorithm",
      "Shor's algorithm (1994) efficiently factors large integers on a quantum computer, " +
        "achieving exponential speedup over the best known classical algorithms. Classical " +
        "integer factoring underpins RSA and related public-key cryptosystems; a sufficiently " +
        "large quantum computer running Shor's algorithm would break RSA-2048 in polynomial " +
        "time. The algorithm uses the Quantum Fourier Transform (QFT) to find the period of a " +
        "modular exponential function, which reduces factoring to period-finding. This result " +
        "has driven significant investment in post-quantum cryptography standards.",
    );

    section(
      "6. Grover's Algorithm",
      "Grover's algorithm provides a quadratic speedup for unstructured database search. " +
        "A classical search over N items requires O(N) queries; Grover's requires only O(√N). " +
        "The algorithm amplifies the amplitude of the target state through repeated application " +
        "of an oracle (which marks the target) and a diffusion operator (which amplifies the " +
        "marked state). While the speedup is not exponential, it is provably optimal for " +
        "unstructured search and has broad implications for cryptographic hash collision " +
        "finding and optimisation problems.",
    );

    section(
      "7. Quantum Decoherence and Error Correction",
      "Qubits are extremely sensitive to environmental noise — a phenomenon called decoherence. " +
        "Interactions with the environment cause quantum states to lose their coherence and " +
        "collapse, destroying any computation in progress. Quantum Error Correction (QEC) " +
        "encodes a logical qubit across multiple physical qubits so that errors can be detected " +
        "and corrected without measuring (and thus collapsing) the logical state. The Shor code " +
        "encodes one logical qubit into 9 physical qubits. Modern approaches such as the " +
        "surface code are considered the most practical path to fault-tolerant quantum computing.",
    );

    doc.end();
  });
}

// POST /api/demo/seed — upload the demo PDF to GridFS for the authenticated user (idempotent)
demoRouter.post("/seed", async (req, res) => {
  const { userId } = req as unknown as AuthedRequest;

  try {
    const bucket = filesBucket();

    // Idempotency: return existing file if already seeded for this user
    const existing = await bucket
      .find({ "metadata.userId": userId, "metadata.projectId": PROJECT_ID })
      .limit(1)
      .toArray();

    if (existing.length > 0) {
      res.json({ documentFileId: existing[0]!._id.toString(), projectId: PROJECT_ID });
      return;
    }

    const pdfBuffer = await buildDemoPdf();

    const uploadStream = bucket.openUploadStream(FILE_NAME, {
      metadata: { userId, projectId: PROJECT_ID, contentType: "application/pdf" },
    });

    await new Promise<void>((resolve, reject) => {
      Readable.from(pdfBuffer).pipe(uploadStream);
      uploadStream.once("finish", resolve);
      uploadStream.once("error", reject);
    });

    const documentFileId = uploadStream.id.toString();
    logger.debug({ userId, documentFileId }, "demo pdf seeded");

    res.json({ documentFileId, projectId: PROJECT_ID });
  } catch (err) {
    logger.error({ err }, "demo seed failed");
    res.status(500).json({ error: "Demo seed failed" });
  }
});
