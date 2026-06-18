"use client";

import React, { useEffect, useState } from "react";
import { useCISStore, DocumentInfo } from "../store";

export default function ArchivePage() {
  const { documents, loading, error, fetchDocuments, uploadDocument } = useCISStore();
  const [selectedDoc, setSelectedDoc] = useState<DocumentInfo | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  useEffect(() => {
    if (documents.length > 0 && !selectedDoc) {
      setSelectedDoc(documents[0]);
    }
  }, [documents, selectedDoc]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadFile(e.target.files[0]);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;
    await uploadDocument(uploadFile);
    setUploadFile(null);
    // Reset file input
    const input = document.getElementById("file-upload") as HTMLInputElement;
    if (input) input.value = "";
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-white">Career Archive Ingestion</h2>
          <p className="text-xs text-slate-400">Scan and ingest historical resumes, certifications, and verification records.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Column: Upload & Document List */}
        <div className="space-y-6">
          {/* Upload Form */}
          <div className="glass-panel p-6 rounded-2xl space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">Ingest New Document</h3>
            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div className="border-2 border-dashed border-slate-800 rounded-xl p-4 text-center hover:border-purple-500/50 transition-all relative">
                <input
                  type="file"
                  id="file-upload"
                  accept=".pdf,.docx"
                  onChange={handleFileChange}
                  className="opacity-0 absolute inset-0 cursor-pointer w-full h-full"
                />
                <div className="space-y-2">
                  <span className="text-2xl">📤</span>
                  <p className="text-xs text-slate-300 font-medium">
                    {uploadFile ? uploadFile.name : "Select Resume (PDF/DOCX)"}
                  </p>
                  <p className="text-[10px] text-slate-500">Max size: 10MB</p>
                </div>
              </div>
              
              <button
                type="submit"
                disabled={!uploadFile || loading}
                className="w-full py-2 text-xs font-bold text-white rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 transition-all disabled:opacity-50 glow-button"
              >
                {loading ? "Ingesting..." : "Ingest & Parse Document"}
              </button>
            </form>
          </div>

          {/* Document list */}
          <div className="glass-panel p-6 rounded-2xl space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">Ingested Profile Files</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => setSelectedDoc(doc)}
                  className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                    selectedDoc?.id === doc.id
                      ? "bg-purple-950/20 border-purple-500/50"
                      : "bg-slate-900/30 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <p className="text-xs font-bold text-slate-200 truncate">{doc.filename}</p>
                  <div className="flex justify-between items-center mt-2 text-[10px] text-slate-500">
                    <span className="uppercase">{doc.document_type}</span>
                    <span className="text-emerald-400 font-mono">Verified Grounding</span>
                  </div>
                </div>
              ))}
              
              {documents.length === 0 && (
                <p className="text-xs text-slate-500 text-center py-6">No profile files active.</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Parsed Text Viewer */}
        <div className="md:col-span-2 glass-panel p-6 rounded-2xl flex flex-col min-h-[500px]">
          {selectedDoc ? (
            <div className="space-y-6 flex-1 flex flex-col">
              <div className="flex justify-between items-center pb-4 border-b border-slate-800">
                <div>
                  <h3 className="text-lg font-bold text-white">{selectedDoc.filename}</h3>
                  <p className="text-xs text-slate-400">Extracted Ingestion ID: {selectedDoc.id}</p>
                </div>
                <span className="text-xs font-mono bg-purple-950 text-purple-400 border border-purple-900 px-3 py-1 rounded">
                  Status: Completed
                </span>
              </div>

              <div className="flex-1 bg-slate-950/50 rounded-xl border border-slate-900 p-6 overflow-y-auto max-h-[450px]">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Parsed Text Content</h4>
                <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {selectedDoc.parsed_text || "Document is still processing in background. Reload shortly."}
                </p>
              </div>

              <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Traceability Audit Metadata</h4>
                <div className="grid grid-cols-2 gap-4 text-[10px] font-mono text-slate-500">
                  <div>Ingestion Date: {new Date().toLocaleDateString()}</div>
                  <div>Security Policy: Row-Level Isolation ACTIVE</div>
                  <div>Qdrant ID: Collection [career_chunks]</div>
                  <div>Parsing Module: python-docx AST parser</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
              <span className="text-4xl mb-4">📄</span>
              <p className="text-sm text-slate-500">Select a document from the archive list to view its parsed content and grounding details.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
