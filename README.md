# DocsTalks 📄🤖  
**RAG-based PDF Assistant**

DocsTalks is a full-stack **Retrieval-Augmented Generation (RAG)** application that allows users to upload PDFs and ask context-aware questions grounded strictly in the document content. It uses asynchronous background processing, vector search, and short-term conversation memory.

🔗 **Live:** https://docs-talk.vercel.app  
🔗 **GitHub:** https://github.com/rsrohan12/DocsTalk  

---

## ✨ Features
- Upload and manage PDF documents
- Ask document-grounded questions (RAG)
- Semantic search using vector embeddings
- Conversation-aware follow-up questions
- Asynchronous PDF ingestion with background workers
- Secure authentication with Clerk
- Scalable storage using Supabase

---


## 🧠 Architecture

```txt
Frontend (Next.js)
↓
Backend API (Express)
↓
Supabase Storage
↓
Redis Queue (BullMQ)
↓
Background Worker
↓
Qdrant Vector DB
```

---

## 🛠️ Tech Stack

**Frontend:** Next.js, React, Tailwind CSS, Shadcn/UI, Clerk  
**Backend:** Node.js, Express.js, MongoDB  
**Infrastructure:** Supabase Storage, Redis, BullMQ, Qdrant  
**AI / RAG:** Google GenAI Embeddings, Groq, LangChain  

---

## ⚙️ Environment Variables

### Frontend
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_BACKEND_URL=
NEXT_PUBLIC_BACKGROUND_WORKER_URL=
```
### Backend
```env
GEMINI_API_KEY=
GROQ_API_KEY=
MONGODB_URI=
CLERK_SECRET_KEY=
REDIS_URL=
QDRANT_URL=
QDRANT_API_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```
## 🚀 Local Setup

```bash
git clone https://github.com/rsrohan12/DocsTalk.git
cd DocsTalk
```

## Backend

```bash
cd server
npm install
npm run dev
```

## Worker

```bash
cd worker
npm install
npm run dev
```

## Frontend

```bash
cd client
npm install
npm run dev
```

---

## 💬 Conversation Memory

DocsTalks supports short-term conversation memory per document using a sliding window of recent messages, enabling natural follow-up questions while keeping answers strictly document-grounded.

---

## 👨‍💻 Author

Rohan Thakur
GitHub: https://github.com/rsrohan12

LinkedIn: https://www.linkedin.com/in/rohan-thakur-a4167a244/

⭐ If you like this project, give it a star!


---

