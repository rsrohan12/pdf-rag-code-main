import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { Queue } from 'bullmq';
import { OpenAIEmbeddings } from '@langchain/openai';
import { QdrantVectorStore } from '@langchain/qdrant';
import OpenAI from 'openai';
import { ChatOllama } from "@langchain/ollama";
import { OllamaEmbeddings } from '@langchain/ollama';
import 'dotenv/config';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import Groq from "groq-sdk";

// const client = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
// });
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const queue = new Queue('file-upload-queue', {
  connection: {
    host: 'localhost',
    port: '6379', // Redis host url
  },
});

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});

const upload = multer({ storage: storage });

const app = express();
app.use(cors());

app.get('/', (req, res) => {
  return res.json({ status: 'All Good!' });
});

app.post('/upload/pdf', upload.single('pdf'), async (req, res) => {
  await queue.add(
    'file-ready',
    JSON.stringify({
      filename: req.file.originalname,
      destination: req.file.destination,
      path: req.file.path,
    })
  );
  return res.json({ message: 'uploaded' });
});

app.get('/chat', async (req, res) => {
  try {
    const userQuery = req.query.message;

    // 1️⃣ SAME embeddings as worker
    const embeddings = new GoogleGenerativeAIEmbeddings({
      model: 'text-embedding-004',
      apiKey: process.env.GEMINI_API_KEY,
    });

    // 2️⃣ Load vector store
    const vectorStore = await QdrantVectorStore.fromExistingCollection(
      embeddings,
      {
        url: 'http://localhost:6333', //Qdrant host url
        collectionName: 'pdf-db-testing',
      }
    );

    // 3️⃣ Retrieve (keep k small)
    const retriever = vectorStore.asRetriever({ k: 2 });
    const docs = await retriever.invoke(userQuery);

    const context = docs
      .map(d => d.pageContent)
      .join('\n\n')
      .slice(0, 1500);

    // 4️⃣ Groq chat (FAST)
    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      temperature: 0,
      messages: [
        {
          role: 'system',
          content: `Answer ONLY from the context below. If not found, say "I don't know".\n\n${context}`,
        },
        { role: 'user', content: userQuery },
      ],
    });

    return res.status(200).json({
      success: true,
      message: completion.choices[0].message.content,
      docs,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Chat failed' });
  }
});


app.listen(8000, () => console.log(`Server started on PORT:${8000}`));
