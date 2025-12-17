import 'dotenv/config';
import { Worker } from 'bullmq';
import { QdrantVectorStore } from '@langchain/qdrant';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { CharacterTextSplitter } from '@langchain/textsplitters';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';

const worker = new Worker(
  'file-upload-queue',
  async (job) => {
    try {
      console.log('📄 Job received');

      const data = JSON.parse(job.data);
      const filePath = data.path.replace(/\\/g, '/');

      console.log('1️⃣ Loading PDF...');
      const loader = new PDFLoader(filePath);
      const docs = await loader.load();
      console.log(`Pages loaded: ${docs.length}`);

      console.log('2️⃣ Splitting...');
      const splitter = new CharacterTextSplitter({
        chunkSize: 500,
        chunkOverlap: 100,
      });
      const splitDocs = await splitter.splitDocuments(docs);
      console.log(`Chunks created: ${splitDocs.length}`);

      console.log('3️⃣ Initializing Gemini embeddings...');
      const embeddings = new GoogleGenerativeAIEmbeddings({
        model: 'text-embedding-004',
        apiKey: process.env.GEMINI_API_KEY,
      });

      console.log('4️⃣ Writing to Qdrant...');
      await QdrantVectorStore.fromDocuments(
        splitDocs,
        embeddings,
        {
          url: 'http://localhost:6333',
          collectionName: 'pdf-db-testing',
        }
      );

      console.log('✅ Vectors stored successfully');
    } catch (err) {
      console.error('❌ Worker failed:', err);
    }
  },
  {
    connection: {
      host: 'localhost',
      port: 6379,
    },
  }
);
