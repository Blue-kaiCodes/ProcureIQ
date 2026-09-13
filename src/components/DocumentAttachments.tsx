import React, { useState, useRef } from "react";
import { Attachment } from "../types";
import { Upload, FileText, Download, X, Paperclip, Check } from "lucide-react";
import { customFetch as fetch } from "../lib/api";

interface DocumentAttachmentsProps {
  requestId: string;
  attachments?: Attachment[];
  uploadedBy: string;
  onAttachmentUploaded: () => Promise<void>;
}

export default function DocumentAttachments({
  requestId,
  attachments = [],
  uploadedBy,
  onAttachmentUploaded,
}: DocumentAttachmentsProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await uploadFileMock(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await uploadFileMock(e.target.files[0]);
    }
  };

  const uploadFileMock = async (file: File) => {
    try {
      setIsUploading(true);
      // Determine document category based on file extension or name
      let docType: "quotation" | "invoice" | "specification" | "contract" | "other" = "other";
      const name = file.name.toLowerCase();
      if (name.includes("quote") || name.includes("offer") || name.includes("pricing")) {
        docType = "quotation";
      } else if (name.includes("invoice") || name.includes("bill")) {
        docType = "invoice";
      } else if (name.includes("spec") || name.includes("technical") || name.includes("data")) {
        docType = "specification";
      } else if (name.includes("contract") || name.includes("agreement")) {
        docType = "contract";
      }

      const formattedSize = file.size > 1024 * 1024 
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.round(file.size / 1024)} KB`;

      const response = await fetch(`/api/requests/${requestId}/attachments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: file.name,
          type: docType,
          fileSize: formattedSize,
          uploadedBy: uploadedBy,
        }),
      });

      const data = await response.json();
      if (data.success) {
        await onAttachmentUploaded();
      }
    } catch (err) {
      console.error("Mock attachment upload failed:", err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const getDocTypeColor = (type: string) => {
    switch (type) {
      case "quotation":
        return "bg-emerald-50 text-emerald-700 border-emerald-100";
      case "invoice":
        return "bg-blue-50 text-blue-700 border-blue-100";
      case "specification":
        return "bg-amber-50 text-amber-700 border-amber-100";
      case "contract":
        return "bg-purple-50 text-purple-700 border-purple-100";
      default:
        return "bg-gray-50 text-gray-700 border-gray-100";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-gray-100">
        <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
          <Paperclip className="w-3.5 h-3.5 text-gray-400" />
          Supporting Files & Technical Attachments
        </h4>
        <span className="text-[10px] font-mono text-gray-400">{attachments.length} Attached Files</span>
      </div>

      {/* Attachment grid */}
      <div className="grid grid-cols-2 gap-3">
        {attachments.map((attach) => (
          <div
            key={attach.id}
            className="p-3 border border-gray-200 hover:border-gray-300 rounded flex justify-between items-center transition-colors bg-white shadow-3xs"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className={`w-8 h-8 rounded border flex items-center justify-center shrink-0 ${getDocTypeColor(attach.type)}`}>
                <FileText className="w-4 h-4" />
              </span>
              <div className="min-w-0 space-y-0.5">
                <p className="text-xs font-bold text-gray-800 truncate" title={attach.name}>
                  {attach.name}
                </p>
                <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-mono">
                  <span>{attach.fileSize}</span>
                  <span>•</span>
                  <span className="capitalize">{attach.type}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                // Simulate simple downloaded toast
                alert(`Downloading simulated file: ${attach.name}`);
              }}
              className="p-1 text-gray-400 hover:text-[#714B67] rounded hover:bg-gray-100 transition-colors cursor-pointer"
              title="Download File"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Interactive Drag and Drop Upload Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border border-dashed rounded p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-150 select-none ${
          isDragging
            ? "border-[#714B67] bg-[#714B67]/5"
            : "border-gray-200 bg-gray-50/50 hover:bg-gray-50 hover:border-gray-300"
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          className="hidden"
          accept=".pdf,.xlsx,.xls,.doc,.docx,.png,.jpg,.jpeg"
        />
        
        {isUploading ? (
          <div className="space-y-1">
            <div className="w-5 h-5 border-2 border-[#714B67] border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs font-bold text-gray-600">Uploading attachment to Odoo store...</p>
          </div>
        ) : (
          <div className="space-y-1 text-xs">
            <Upload className="w-5 h-5 text-gray-400 mx-auto mb-1" />
            <p className="font-bold text-gray-700">Drag & drop files here, or <span className="text-[#714B67] hover:underline">browse</span></p>
            <p className="text-[10px] text-gray-400">Supports PDF, Excel, Word, or Images up to 25MB</p>
          </div>
        )}
      </div>
    </div>
  );
}
