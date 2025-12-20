'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  Send,
  FileText,
  ChevronDown,
  ChevronUp,
  Loader2,
  RotateCcw,
} from 'lucide-react';
import { useClerkToken } from '@/hooks/useClerkToken';

/* ---------------- Types ---------------- */

interface Doc {
  pageContent: string;
  metadata: {
    source: string;
    pdf?: { totalPages: number };
    loc?: {
      pageNumber: number;
      lines?: { from: number; to: number };
    };
  };
  id: string;
}

interface IMessage {
  role: 'assistant' | 'user';
  content?: string;
  documents?: Doc[];
}

/* ---------------- PDF PANEL ---------------- */

const PDFPanel = ({
  pdfUrl,
  fileName,
  onReplace,
}: {
  pdfUrl: string;
  fileName: string;
  onReplace: () => void;
}) => {
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b px-4 py-3 flex items-center justify-between bg-white">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600" />
          <span className="text-sm font-medium text-gray-800 truncate">
            {fileName}
          </span>
        </div>
        <button
          onClick={onReplace}
          className="text-xs flex items-center gap-1 text-gray-500 hover:text-blue-600"
        >
          <RotateCcw className="w-4 h-4" />
          Replace
        </button>
      </div>

      {/* PDF Preview */}
      <iframe
        src={pdfUrl}
        className="flex-1 w-full"
        title="PDF Preview"
      />
    </div>
  );
};

/* ---------------- FILE UPLOAD ---------------- */

const FileUploadSection = ({
  onUploaded,
}: {
  onUploaded: (pdf: { name: string; url: string }) => void;
}) => {
  const [uploading, setUploading] = useState(false);

  const { getAuthToken } = useClerkToken();

  const handleUpload = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/pdf';

     const token = await getAuthToken();

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setUploading(true);
      const formData = new FormData();
      formData.append('pdf', file);

      try {
        const res = await fetch('http://localhost:8000/upload/pdf', {
          method: 'POST',
          headers: {
            "Authorization": `Bearer ${token}`,
          },
          body: formData,
        });

        const data = await res.json();

        onUploaded({
          name: data.originalName,
          url: `http://localhost:8000${data.url}`,
        });
      } catch (err) {
        console.error('Upload failed', err);
      } finally {
        setUploading(false);
      }
    };

    input.click();
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-8">
      <div
        onClick={handleUpload}
        className="border-4 border-dashed border-gray-300 rounded-2xl p-12 cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all"
      >
        <div className="flex flex-col items-center text-center">
          {uploading ? (
            <>
              <Loader2 className="w-14 h-14 animate-spin text-blue-500 mb-4" />
              <p className="text-gray-600">Uploading PDF…</p>
            </>
          ) : (
            <>
              <Upload className="w-14 h-14 text-gray-400 mb-4" />
              <p className="text-lg font-semibold">Upload PDF</p>
              <p className="text-sm text-gray-500 mt-1">
                Click to browse
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

/* ---------------- CHAT ---------------- */

const SourceDocument = ({ doc, index }: { doc: Doc; index: number }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="border rounded-lg bg-white">
      <div
        onClick={() => setOpen(!open)}
        className="flex justify-between items-center p-3 cursor-pointer hover:bg-gray-50"
      >
        <span className="text-sm font-medium">
          Source {index + 1} — Page {doc.metadata.loc?.pageNumber}
        </span>
        {open ? <ChevronUp /> : <ChevronDown />}
      </div>

      {open && (
        <div className="p-4 border-t text-sm whitespace-pre-wrap">
          {doc.pageContent}
        </div>
      )}
    </div>
  );
};

const ChatSection = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMsg = input;
    setInput('');
    setMessages((m) => [...m, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const res = await fetch(
        `http://localhost:8000/chat?message=${encodeURIComponent(userMsg)}`
      );
      const data = await res.json();

      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          content: data.message,
          documents: data.docs,
        },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: 'assistant', content: 'Error occurred.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="flex-1 overflow-y-auto p-6">
        {messages.map((m, i) => (
          <div key={i} className="mb-6">
            <div
              className={`rounded-xl px-4 py-3 ${
                m.role === 'user'
                  ? 'bg-blue-600 text-white ml-auto w-fit'
                  : 'bg-white border'
              }`}
            >
              {m.content}
            </div>

            {m.documents && (
              <div className="mt-3 space-y-2">
                {m.documents.map((d, idx) => (
                  <SourceDocument key={d.id} doc={d} index={idx} />
                ))}
              </div>
            )}
          </div>
        ))}

        {loading && <Loader2 className="animate-spin text-gray-400" />}
        <div ref={endRef} />
      </div>

      <div className="border-t p-4 bg-white flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Ask something about the PDF…"
          className="flex-1 border rounded-xl px-4 py-2"
        />
        <button
          onClick={sendMessage}
          className="bg-blue-600 text-white px-5 rounded-xl"
          disabled={input === ""}
        >
          <Send />
        </button>
      </div>
    </div>
  );
};

/* ---------------- MAIN ---------------- */

export default function RAGPDFInterface() {
  const [pdf, setPdf] = useState<{
    name: string;
    url: string;
  } | null>(null);

  return (
    <div className="h-screen flex">
      {/* LEFT */}
      <div className="w-[45%] border-r">
        {!pdf ? (
          <FileUploadSection onUploaded={setPdf} />
        ) : (
          <PDFPanel
            fileName={pdf.name}
            pdfUrl={pdf.url}
            onReplace={() => setPdf(null)}
          />
        )}
      </div>

      {/* RIGHT */}
      <div className="w-[60%]">
        <ChatSection />
      </div>
    </div>
  );
}
