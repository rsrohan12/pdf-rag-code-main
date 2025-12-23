import "dotenv/config";
import { Worker } from "bullmq";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { CharacterTextSplitter } from "@langchain/textsplitters";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { QdrantVectorStore } from "@langchain/qdrant";
import { redis } from "./lib/redis.js";
import http from "http";
import { supabase } from "./lib/supabase.js";
import axios from "axios";
import pdfParse from "pdf-parse";
import { Document } from "@langchain/core/documents";

const worker = new Worker(
  "file-upload-queue",
  async (job) => {
    const { pdfId, filePath } = job.data;

    if (!pdfId || !filePath) {
      throw new Error("Missing pdfId or filePath");
    }

    console.log(`📄 Processing PDF ${pdfId}`);

    // ===============================
    // 1️⃣ Generate signed URL (Supabase)
    // ===============================
    const { data, error } = await supabase.storage
      .from("pdfs")
      .createSignedUrl(filePath, 60 * 10); // 10 minutes

    if (error || !data?.signedUrl) {
      throw new Error("Failed to generate signed URL");
    }

    // ===============================
    // 2️⃣ Download PDF (Axios)
    // ===============================
    console.log("➡️ Downloading PDF via axios");

    const response = await axios.get(data.signedUrl, {
      responseType: "arraybuffer",
      timeout: 15000,
      maxContentLength: 50 * 1024 * 1024,
    });

    const buffer = Buffer.from(response.data);

    console.log("✅ PDF downloaded, size:", buffer.length);

    // ===============================
    // 3️⃣ Parse PDF
    // ===============================
    console.log("➡️ Parsing PDF with pdf-parse");

    const pdfData = await pdfParse(buffer);

    if (!pdfData.text || !pdfData.text.trim()) {
      throw new Error("PDF contains no extractable text (likely scanned)");
    }

    console.log("✅ PDF parsed, text length:", pdfData.text.length);

    // ===============================
    // 4️⃣ Create LangChain Document
    // ===============================
    const document = new Document({
      pageContent: pdfData.text,
      metadata: { pdfId },
    });

    // ===============================
    // 5️⃣ Split text
    // ===============================
    const splitter = new CharacterTextSplitter({
      chunkSize: 500,
      chunkOverlap: 100,
    });

    const splitDocs = await splitter.splitDocuments([document]);

    console.log("✅ Split into chunks:", splitDocs.length);

    // ===============================
    // 6️⃣ Embeddings
    // ===============================
    const embeddings = new GoogleGenerativeAIEmbeddings({
      model: "text-embedding-004",
      apiKey: process.env.GEMINI_API_KEY,
    });

    // ===============================
    // 7️⃣ Store in Qdrant
    // ===============================
    await QdrantVectorStore.fromDocuments(splitDocs, embeddings, {
      url: process.env.QDRANT_URL,
      apiKey: process.env.QDRANT_API_KEY,
      collectionName: process.env.QDRANT_COLLECTION,
    });

    console.log(`✅ Indexed PDF ${pdfId}`);
  },
  {
    connection: redis,
  }
);

// ===============================
// Dummy server (Render / Railway)
// ===============================
const PORT = process.env.PORT || 10000;
http
  .createServer((_, res) => {
    res.end("Worker running");
  })
  .listen(PORT, () => {
    console.log(`🟢 Worker listening on ${PORT}`);
  });

export default worker;
