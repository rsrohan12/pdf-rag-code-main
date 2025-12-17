'use client'

import React, { useState, useRef, useEffect } from 'react';
import { Upload, Send, FileText, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';

interface Doc {
  pageContent: string;
  metadata: {
    source: string;
    pdf?: {
      totalPages: number;
    };
    loc?: {
      pageNumber: number;
      lines?: {
        from: number;
        to: number;
      };
    };
  };
  id: string;
}

interface IMessage {
  role: 'assistant' | 'user';
  content?: string;
  documents?: Doc[];
}

const FileUploadSection = () => {
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);

  const handleFileUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/pdf';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        setUploading(true);
        const formData = new FormData();
        formData.append('pdf', file);

        try {
          await fetch('http://localhost:8000/upload/pdf', {
            method: 'POST',
            body: formData,
          });
          setUploadedFile(file.name);
        } catch (error) {
          console.error('Upload failed:', error);
        } finally {
          setUploading(false);
        }
      }
    };
    input.click();
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">RAG PDF Assistant</h1>
          <p className="text-gray-600">Upload a PDF and ask questions about it</p>
        </div>

        <div
          onClick={handleFileUpload}
          className="border-4 border-dashed border-gray-300 rounded-2xl p-12 hover:border-blue-500 hover:bg-blue-50 transition-all cursor-pointer group"
        >
          <div className="flex flex-col items-center justify-center text-center">
            {uploading ? (
              <>
                <Loader2 className="w-16 h-16 text-blue-500 mb-4 animate-spin" />
                <p className="text-gray-600">Uploading...</p>
              </>
            ) : (
              <>
                <Upload className="w-16 h-16 text-gray-400 group-hover:text-blue-500 mb-4 transition-colors" />
                <p className="text-lg font-semibold text-gray-700 mb-2">Upload PDF File</p>
                <p className="text-sm text-gray-500">Click to browse or drag and drop</p>
              </>
            )}
          </div>
        </div>

        {uploadedFile && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
            <FileText className="w-5 h-5 text-green-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-green-800">File uploaded successfully</p>
              <p className="text-xs text-green-600">{uploadedFile}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const SourceDocument = ({ doc, index }: { doc: Doc; index: number }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
      <div
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-medium text-gray-700">
            Source {index + 1} - Page {doc.metadata.loc?.pageNumber || 'N/A'}
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-gray-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-500" />
        )}
      </div>
      
      {expanded && (
        <div className="p-4 bg-gray-50 border-t border-gray-200">
          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed mb-3">
            {doc.pageContent}
          </p>
          <div className="flex flex-wrap gap-2 text-xs text-gray-500">
            <span className="px-2 py-1 bg-white rounded border border-gray-200">
              Page {doc.metadata.loc?.pageNumber}
            </span>
            {doc.metadata.loc?.lines && (
              <span className="px-2 py-1 bg-white rounded border border-gray-200">
                Lines {doc.metadata.loc.lines.from}-{doc.metadata.loc.lines.to}
              </span>
            )}
            {doc.metadata.pdf?.totalPages && (
              <span className="px-2 py-1 bg-white rounded border border-gray-200">
                Total Pages: {doc.metadata.pdf.totalPages}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const ChatMessage = ({ message }: { message: IMessage }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-6`}>
      <div className={`max-w-3xl ${isUser ? 'w-auto' : 'w-full'}`}>
        <div
          className={`rounded-2xl px-5 py-3 ${
            isUser
              ? 'bg-blue-600 text-white'
              : 'bg-white border border-gray-200 text-gray-800'
          }`}
        >
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
        </div>

        {!isUser && message.documents && message.documents.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Sources ({message.documents.length})
            </p>
            {message.documents.map((doc, idx) => (
              <SourceDocument key={doc.id} doc={doc} index={idx} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const ChatSection = () => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!message.trim()) return;

    const userMessage = message;
    setMessage('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const res = await fetch(`http://localhost:8000/chat?message=${encodeURIComponent(userMessage)}`);
      const data = await res.json();
      
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data?.message,
          documents: data?.docs,
        },
      ]);
    } catch (error) {
      console.error('Chat failed:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h2 className="text-xl font-semibold text-gray-800">Chat with your PDF</h2>
        <p className="text-sm text-gray-500 mt-1">Ask questions about the uploaded document</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-gray-400">
              <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No messages yet</p>
              <p className="text-sm mt-2">Start by asking a question about your PDF</p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, idx) => (
              <ChatMessage key={idx} message={msg} />
            ))}
            {loading && (
              <div className="flex justify-start mb-6">
                <div className="bg-white border border-gray-200 rounded-2xl px-5 py-3">
                  <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-200 px-6 py-4">
        <div className="flex gap-3 max-w-4xl mx-auto">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask a question about your PDF..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={!message.trim() || loading}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            <Send className="w-5 h-5" />
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default function RAGPDFInterface() {
  return (
    <div className="h-screen w-screen flex bg-gray-100">
      <div className="w-[35%] bg-white border-r border-gray-200">
        <FileUploadSection />
      </div>
      <div className="w-[65%]">
        <ChatSection />
      </div>
    </div>
  );
}