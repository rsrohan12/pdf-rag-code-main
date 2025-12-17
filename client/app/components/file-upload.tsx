// import React, { useState, useRef, useEffect } from 'react';
// import { Upload, Send, FileText, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';

// interface Doc {
//   pageContent: string;
//   metadata: {
//     source: string;
//     pdf?: {
//       totalPages: number;
//     };
//     loc?: {
//       pageNumber: number;
//       lines?: {
//         from: number;
//         to: number;
//       };
//     };
//   };
//   id: string;
// }

// interface IMessage {
//   role: 'assistant' | 'user';
//   content?: string;
//   documents?: Doc[];
// }

// const FileUploadSection = () => {
//   const [uploading, setUploading] = useState(false);
//   const [uploadedFile, setUploadedFile] = useState<string | null>(null);

//   const handleFileUpload = () => {
//     const input = document.createElement('input');
//     input.type = 'file';
//     input.accept = 'application/pdf';
//     input.onchange = async (e) => {
//       const file = (e.target as HTMLInputElement).files?.[0];
//       if (file) {
//         setUploading(true);
//         const formData = new FormData();
//         formData.append('pdf', file);

//         try {
//           await fetch('http://localhost:8000/upload/pdf', {
//             method: 'POST',
//             body: formData,
//           });
//           setUploadedFile(file.name);
//         } catch (error) {
//           console.error('Upload failed:', error);
//         } finally {
//           setUploading(false);
//         }
//       }
//     };
//     input.click();
//   };

//   return (
//     <div className="h-full flex flex-col items-center justify-center p-8">
//       <div className="w-full max-w-md">
//         <div className="text-center mb-8">
//           <h1 className="text-3xl font-bold text-gray-800 mb-2">RAG PDF Assistant</h1>
//           <p className="text-gray-600">Upload a PDF and ask questions about it</p>
//         </div>

//         <div
//           onClick={handleFileUpload}
//           className="border-4 border-dashed border-gray-300 rounded-2xl p-12 hover:border-blue-500 hover:bg-blue-50 transition-all cursor-pointer group"
//         >
//           <div className="flex flex-col items-center justify-center text-center">
//             {uploading ? (
//               <>
//                 <Loader2 className="w-16 h-16 text-blue-500 mb-4 animate-spin" />
//                 <p className="text-gray-600">Uploading...</p>
//               </>
//             ) : (
//               <>
//                 <Upload className="w-16 h-16 text-gray-400 group-hover:text-blue-500 mb-4 transition-colors" />
//                 <p className="text-lg font-semibold text-gray-700 mb-2">Upload PDF File</p>
//                 <p className="text-sm text-gray-500">Click to browse or drag and drop</p>
//               </>
//             )}
//           </div>
//         </div>

//         {uploadedFile && (
//           <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
//             <FileText className="w-5 h-5 text-green-600" />
//             <div className="flex-1">
//               <p className="text-sm font-medium text-green-800">File uploaded successfully</p>
//               <p className="text-xs text-green-600">{uploadedFile}</p>
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };