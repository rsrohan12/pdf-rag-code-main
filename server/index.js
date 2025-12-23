import express from "express";
import cors from "cors";
import multer from "multer";
import { Queue } from "bullmq";
import { QdrantVectorStore } from "@langchain/qdrant";
import "dotenv/config";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import Groq from "groq-sdk";
import { connectDB } from "./lib/db.js";
import { requireAuth } from "./middleware.js";
import { Pdf } from "./models/pdf.js";
import { Chat } from "./models/chat.js";
import { redis } from "./lib/redis.js";
import fetch from "node-fetch";
import { ensureQdrantIndex } from "./helpers/qdrantIndex.js";
import { supabase } from "./lib/supabase.js";

// const client = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
// });
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const queue = new Queue("file-upload-queue", {
  connection: redis,
});

// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, 'uploads/');
//   },
//   filename: function (req, file, cb) {
//     const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
//     cb(null, `${uniqueSuffix}-${file.originalname}`);
//   },
// });

// const upload = multer({ storage: storage });

const upload = multer({ storage: multer.memoryStorage() });

const app = express();

app.use(cors());
app.use(express.json());

// app.use("/uploads", express.static("uploads"));

app.get("/", (req, res) => {
  return res.json({ status: "All Good!" });
});

app.post("/upload/pdf", requireAuth, upload.single("pdf"), async (req, res) => {
  try {
    const userId = req.auth.userId;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: "No PDF uploaded" });
    }

    // ✅ sanitize filename
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
    const filePath = `${userId}/${Date.now()}-${safeName}`;

    // 1️⃣ Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("pdfs")
      .upload(filePath, file.buffer, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (uploadError) throw uploadError;

    // 2️⃣ Public preview URL (browser-safe)
    const { data: publicUrlData } = supabase.storage
      .from("pdfs")
      .getPublicUrl(filePath);

    const pdfUrl = publicUrlData.publicUrl;

    // 3️⃣ Save metadata in MongoDB
    const pdf = await Pdf.create({
      userId,
      originalName: file.originalname,
      filePath,
      pdfUrl,
    });

    // 4️⃣ Send job to worker (signed URL generated later)
    await queue.add("file-ready", {
      pdfId: pdf._id.toString(),
      filePath,
    });

    res.json({
      success: true,
      pdfId: pdf._id,
      originalName: pdf.originalName,
      pdfUrl,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "PDF upload failed" });
  }
});

app.get("/chat", requireAuth, async (req, res) => {
  try {
    const { message, pdfId } = req.query;
    const userId = req.auth.userId;

    if (!message || !pdfId) {
      return res.status(400).json({
        success: false,
        error: "message and pdfId are required",
      });
    }

    // 1️⃣ Embeddings (SAME as worker)
    const embeddings = new GoogleGenerativeAIEmbeddings({
      model: "text-embedding-004",
      apiKey: process.env.GEMINI_API_KEY,
    });

    // 2️⃣ Load vector store
    const vectorStore = await QdrantVectorStore.fromExistingCollection(
      embeddings,
      {
        url: process.env.QDRANT_URL,
        apiKey: process.env.QDRANT_API_KEY,
        collectionName: process.env.QDRANT_COLLECTION,
      }
    );

    // 3️⃣ Retrieve ONLY this PDF’s chunks
    const retriever = vectorStore.asRetriever({
      k: 3,
      filter: {
        must: [
          {
            key: "metadata.pdfId",
            match: { value: pdfId },
          },
        ],
      },
    });

    const docs = await retriever.invoke(message);

    const context = docs
      .map((d) => d.pageContent)
      .join("\n\n")
      .slice(0, 2000);

    // 4️⃣ Groq chat
    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      temperature: 0,
      messages: [
        {
          role: "system",
          content: `Answer ONLY from the context below.
            If the answer is not present, say "I don't know".

            Context:
            ${context}`,
        },
        { role: "user", content: message },
      ],
    });

    const aiResponse = completion.choices[0].message.content;

    // 5️⃣ Save chat history (MongoDB)
    await Chat.findOneAndUpdate(
      { pdfId, userId },
      {
        $push: {
          messages: [
            { role: "user", content: message },
            { role: "assistant", content: aiResponse },
          ],
        },
      },
      { upsert: true }
    );

    return res.status(200).json({
      success: true,
      message: aiResponse,
      docs,
    });
  } catch (err) {
    console.error("Chat error:", err);
    return res.status(500).json({
      success: false,
      error: "Chat failed",
    });
  }
});

app.get("/chat/history", requireAuth, async (req, res) => {
  try {
    const { pdfId } = req.query;
    const userId = req.auth.userId;

    if (!pdfId) {
      return res.status(400).json({
        success: false,
        error: "pdfId is required",
      });
    }

    const chat = await Chat.findOne({ pdfId, userId });

    return res.status(200).json({
      success: true,
      messages: chat?.messages || [],
    });
  } catch (err) {
    console.error("Chat history error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to load chat history",
    });
  }
});

app.get("/pdfs", requireAuth, async (req, res) => {
  try {
    const userId = req.auth.userId;

    const pdfs = await Pdf.find({ userId }).sort({ createdAt: -1 });

    res.json({
      success: true,
      pdfs,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch PDFs" });
  }
});

app.get("/pdfs/:pdfId", requireAuth, async (req, res) => {
  const { pdfId } = req.params;
  const userId = req.auth.userId;

  const pdf = await Pdf.findOne({ _id: pdfId, userId });
  if (!pdf) {
    return res.status(404).json({ error: "PDF not found" });
  }

  return res.json({
    success: true,
    pdf,
  });
});

(async () => {
  await connectDB();
  await ensureQdrantIndex();

  app.listen(8000, () => console.log("🚀 Server running on PORT 8000"));
})();
