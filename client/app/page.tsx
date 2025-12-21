"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Upload,
  Send,
  FileText,
  ChevronDown,
  ChevronUp,
  Loader2,
  RotateCcw,
  Menu,
  X,
  Sparkles,
} from "lucide-react";
import { useClerkToken } from "@/hooks/useClerkToken";
import { UserButton } from "@clerk/nextjs";
import { API_BASE_URL } from "@/lib/config";

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
  role: "assistant" | "user";
  content?: string;
  documents?: Doc[];
}

interface PdfItem {
  _id: string;
  originalName: string;
  url: string;
}

/* ---------------- SIDEBAR ---------------- */

const Sidebar = ({
  isOpen,
  onClose,
  pdfs,
  onSelectPdf,
  activePdfId,
}: {
  isOpen: boolean;
  onClose: () => void;
  pdfs: PdfItem[];
  onSelectPdf: (pdf: PdfItem) => void;
  activePdfId?: string;
}) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sidebar */}
      <div className="fixed left-0 top-0 h-full w-80 bg-white shadow-2xl z-50 flex flex-col animate-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b bg-linear-to-r from-blue-50 to-indigo-50">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Your PDFs</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {pdfs.length} document{pdfs.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/50 cursor-pointer rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* PDF List */}
        <div className="flex-1 overflow-y-auto p-4">
          {pdfs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <FileText className="w-16 h-16 mb-3 opacity-30" />
              <p className="text-sm font-medium">No PDFs uploaded yet</p>
              <p className="text-xs mt-1">Upload one to get started</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pdfs.map((pdf) => (
                <button
                  key={pdf._id}
                  onClick={() => {
                    onSelectPdf(pdf);
                    onClose();
                  }}
                  className={`w-full text-left p-3 rounded-xl cursor-pointer border-2 transition-all group ${
                    activePdfId === pdf._id
                      ? "border-blue-500 bg-blue-50 shadow-sm"
                      : "border-gray-200 hover:border-blue-300 hover:bg-blue-50/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-lg ${
                        activePdfId === pdf._id
                          ? "bg-blue-100"
                          : "bg-gray-100 group-hover:bg-blue-100"
                      }`}
                    >
                      <FileText
                        className={`w-5 h-5 ${
                          activePdfId === pdf._id
                            ? "text-blue-600"
                            : "text-gray-500 group-hover:text-blue-600"
                        }`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-medium truncate ${
                          activePdfId === pdf._id
                            ? "text-blue-700"
                            : "text-gray-700"
                        }`}
                      >
                        {pdf.originalName}
                      </p>
                      {activePdfId === pdf._id && (
                        <p className="text-xs text-blue-600 mt-0.5">Active</p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

/* ---------------- SOURCE DOCUMENT ---------------- */

const SourceDocument = ({ doc, index }: { doc: Doc; index: number }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-2 border-gray-200 rounded-xl bg-white overflow-hidden hover:border-blue-300 transition-colors">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex justify-between items-center p-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <FileText className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-gray-800">
              Source {index + 1}
            </p>
            <p className="text-xs text-gray-500">
              Page {doc.metadata.loc?.pageNumber || "N/A"}
              {doc.metadata.loc?.lines && (
                <span className="ml-2">
                  Lines {doc.metadata.loc.lines.from}-{doc.metadata.loc.lines.to}
                </span>
              )}
            </p>
          </div>
        </div>
        {open ? (
          <ChevronUp className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        )}
      </button>

      {open && (
        <div className="px-4 pb-4 pt-2 border-t-2 border-gray-100 bg-gray-50">
          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
            {doc.pageContent}
          </p>
        </div>
      )}
    </div>
  );
};

/* ---------------- PDF PANEL ---------------- */

const PDFPanel = ({
  pdf,
  onReplace,
}: {
  pdf: PdfItem;
  onReplace: () => void;
}) => {
  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="border-b-2 px-6 py-4 flex justify-between items-center bg-white shadow-sm">
        <div className="flex items-center gap-3 min-w-0 flex-1 ml-8">
          <div className="p-2 bg-blue-100 rounded-lg ml-8">
            <FileText className="w-5 h-5 text-blue-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-gray-800">
              {pdf.originalName}
            </p>
            <p className="text-xs text-gray-500">PDF Document</p>
          </div>
        </div>
        <button
          onClick={onReplace}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          <span className="hidden sm:inline">Replace</span>
        </button>
      </div>

      <div className="flex-1 bg-gray-100 p-2">
        <iframe
          src={`${API_BASE_URL}${pdf.url}`}
          className="w-full h-full rounded-lg shadow-inner"
          title="PDF Preview"
        />
      </div>
    </div>
  );
};

/* ---------------- FILE UPLOAD ---------------- */

const FileUploadSection = ({
  onUploaded,
}: {
  onUploaded: (pdf: PdfItem) => void;
}) => {
  const [uploading, setUploading] = useState(false);
  const { getAuthToken } = useClerkToken();

  const handleUpload = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/pdf";

    const token = await getAuthToken();

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setUploading(true);
      const formData = new FormData();
      formData.append("pdf", file);

      try {
        const res = await fetch(`${API_BASE_URL}/upload/pdf`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });

        const data = await res.json();

        onUploaded({
          _id: data.pdfId,
          originalName: data.originalName,
          url: data.url,
        });
      } finally {
        setUploading(false);
      }
    };

    input.click();
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-8 bg-linear-to-br from-blue-50 via-white to-indigo-50">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-2xl mb-4">
            <Sparkles className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            RAG PDF Assistant
          </h1>
          <p className="text-gray-600">
            Upload a PDF document and start asking questions
          </p>
        </div>

        <button
          onClick={handleUpload}
          disabled={uploading}
          className="w-full border-4 cursor-pointer border-dashed border-gray-300 rounded-2xl p-16 hover:border-blue-500 hover:bg-blue-50 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? (
            <div className="flex flex-col items-center">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-3" />
              <p className="text-sm font-medium text-gray-600">Uploading...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <Upload className="w-12 h-12 text-gray-400 group-hover:text-blue-600 mb-3 transition-colors" />
              <p className="text-lg font-semibold text-gray-700 mb-1">
                Upload PDF File
              </p>
              <p className="text-sm text-gray-500">
                Click to browse your files
              </p>
            </div>
          )}
        </button>
      </div>
    </div>
  );
};

/* ---------------- CHAT ---------------- */

const ChatSection = ({ pdfId }: { pdfId?: string }) => {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const { getAuthToken } = useClerkToken();

  useEffect(() => {
    if (!pdfId) {
      setMessages([]);
      return;
    }

    const loadHistory = async () => {
      try {
        const token = await getAuthToken();
        const res = await fetch(
          `${API_BASE_URL}/chat/history?pdfId=${pdfId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        const data = await res.json();
        setMessages(data.messages || []);
      } catch (err) {
        console.error("Failed to load chat history", err);
      }
    };

    loadHistory();
  }, [pdfId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || !pdfId) return;

    const userMsg = input;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: userMsg }]);
    setLoading(true);

    try {
      const token = await getAuthToken();
      const res = await fetch(
        `${API_BASE_URL}/chat?pdfId=${pdfId}&message=${encodeURIComponent(
          userMsg
        )}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await res.json();

      setMessages((m) => [
        ...m,
        { role: "assistant", content: data.message, documents: data.docs },
      ]);
    } catch (err) {
      console.log("Error", err)
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: "Sorry, something went wrong. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-linear-to-b from-gray-50 to-white">
      {/* Header */}
      <div className="border-b-2 bg-white shadow-sm px-6 py-4">
        <h2 className="text-xl font-bold text-gray-800">DocsTalks</h2>
        <p className="text-sm text-gray-500 mt-1">
          Ask questions about your document
        </p>

        <div className="fixed top-7 right-6 z-40">

          <UserButton
            appearance={{
              elements: {
                avatarBox: "w-8 h-8",
              },
            }}
          />

        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center max-w-md">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-linear-to-br from-blue-100 to-indigo-100 rounded-full mb-4">
                <Sparkles className="w-10 h-10 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                Ready to help!
              </h3>
              <p className="text-gray-500 text-sm">
                I&apos;ll analyze your PDF and answer any questions you have about
                its content.
              </p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((m, i) => (
              <div
                key={i}
                className={`mb-6 flex ${
                  m.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-3xl ${m.role === "user" ? "w-auto" : "w-full"}`}
                >
                  <div
                    className={`rounded-2xl px-5 py-3 shadow-sm ${
                      m.role === "user"
                        ? "bg-linear-to-r from-blue-600 to-blue-700 text-white"
                        : "bg-white border-2 border-gray-200 text-gray-800"
                    }`}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {m.content}
                    </p>
                  </div>

                  {m.documents && m.documents.length > 0 && (
                    <div className="mt-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="h-px flex-1 bg-linear-to-r from-transparent via-gray-300 to-transparent" />
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2">
                          Sources ({m.documents.length})
                        </p>
                        <div className="h-px flex-1 bg-linear-to-r from-transparent via-gray-300 to-transparent" />
                      </div>
                      {m.documents.map((d, idx) => (
                        <SourceDocument key={d.id} doc={d} index={idx} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start mb-6">
                <div className="bg-white border-2 border-gray-200 rounded-2xl px-5 py-3 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                    <span className="text-sm text-gray-600">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="border-t-2 bg-white shadow-lg px-6 py-4">
        <div className="flex gap-3 max-w-4xl mx-auto">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
            className="flex-1 border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            placeholder="Ask a question about your PDF..."
            disabled={loading || !pdfId}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading || !pdfId}
            className="px-6 py-3 bg-linear-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg flex items-center gap-2 font-medium"
          >
            <Send className="w-5 h-5" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </div>
      </div>
    </div>
  );
};

/* ---------------- MAIN ---------------- */

export default function RAGPDFInterface() {
  const [pdfs, setPdfs] = useState<PdfItem[]>([]);
  const [activePdf, setActivePdf] = useState<PdfItem | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { getAuthToken } = useClerkToken();

  /* Load sidebar PDFs (ONCE) */
  useEffect(() => {
    const loadPdfs = async () => {
      const token = await getAuthToken();
      const res = await fetch(`${API_BASE_URL}/pdfs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setPdfs(data.pdfs || []);
    };

    loadPdfs();
  }, []);

  /* Restore selected PDF (ONCE on refresh) */
  useEffect(() => {
    const restorePdf = async () => {
      const params = new URLSearchParams(window.location.search);
      const pdfId = params.get("pdfId");
      if (!pdfId) return;

      try {
        const token = await getAuthToken();
        const res = await fetch(`${API_BASE_URL}/pdfs/${pdfId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) return;

        const data = await res.json();
        setActivePdf(data.pdf);
      } catch (e) {
        console.error("Failed to restore PDF", e);
      }
    };

    restorePdf();
  }, []);

  const clearSelectedPdf = () => {
    setActivePdf(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("pdfId");
    window.history.replaceState({}, "", url.pathname);
  };

  return (
    <div className="h-screen flex relative overflow-hidden bg-gray-100">
      {/* Sidebar toggle - Fixed position with proper z-index */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="fixed top-2 left-6 z-30 bg-white p-3 cursor-pointer rounded-xl shadow-lg hover:shadow-xl hover:bg-blue-50 transition-all border-2 border-gray-200 hover:border-blue-300"
        title="Open PDF Library"
      >
        <Menu className="w-6 h-6 text-gray-700" />
      </button>

      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        pdfs={pdfs}
        activePdfId={activePdf?._id}
        onSelectPdf={(pdf) => {
          setActivePdf(pdf);
          window.history.pushState({}, "", `?pdfId=${pdf._id}`);
        }}
      />

      {/* Left Panel - PDF Viewer */}
      <div className="w-[45%] border-r-2 border-gray-200">
        {activePdf ? (
          <PDFPanel pdf={activePdf} onReplace={clearSelectedPdf} />
        ) : (
          <FileUploadSection
            onUploaded={(pdf) => {
              setPdfs((p) => [...p, pdf]);
              setActivePdf(pdf);
              window.history.pushState({}, "", `?pdfId=${pdf._id}`);
            }}
          />
        )}
      </div>

      {/* Right Panel - Chat */}
      <div className="w-[55%]">
        <ChatSection pdfId={activePdf?._id} />
      </div>
    </div>
  );
}