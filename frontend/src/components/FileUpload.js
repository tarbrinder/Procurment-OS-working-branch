import { useState, useRef } from "react";
import { uploadFile } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Paperclip, X, FileText, Image, File } from "lucide-react";
import { toast } from "sonner";

const FILE_ICONS = { "application/pdf": FileText, "image/": Image };

const getIcon = (type) => {
  for (const [key, Icon] of Object.entries(FILE_ICONS)) {
    if (type?.startsWith(key)) return Icon;
  }
  return File;
};

export const FileUpload = ({ rfqId, glid, viewType, onFilesUploaded, compact = false }) => {
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState([]);
  const inputRef = useRef(null);

  const handleSelect = async (e) => {
    const selected = Array.from(e.target.files);
    const oversized = selected.filter((f) => f.size > 10 * 1024 * 1024);
    if (oversized.length) {
      toast.error(`Files over 10MB: ${oversized.map((f) => f.name).join(", ")}`);
      return;
    }
    setUploading(true);
    const uploaded = [];
    for (const file of selected) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("rfq_id", rfqId);
      formData.append("uploaded_by_glid", glid);
      formData.append("uploaded_by_type", viewType);
      try {
        const res = await uploadFile(formData);
        uploaded.push(res.data);
      } catch (err) {
        toast.error(`Failed to upload ${file.name}`);
      }
    }
    setFiles((prev) => [...prev, ...uploaded]);
    if (onFilesUploaded) onFilesUploaded(uploaded);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const removeFile = (fileId) => {
    setFiles((prev) => prev.filter((f) => f.file_id !== fileId));
  };

  return (
    <div data-testid="file-upload">
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".pdf,.png,.jpg,.jpeg,.xlsx,.xls,.dwg,.dxf"
        onChange={handleSelect}
        className="hidden"
      />
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        data-testid="file-upload-btn"
      >
        <Paperclip size={14} /> {uploading ? "Uploading..." : compact ? "Attach" : "Attach Files"}
      </Button>
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {files.map((f) => {
            const Icon = getIcon(f.content_type);
            return (
              <div
                key={f.file_id}
                className="flex items-center gap-1 text-xs px-2 py-1 bg-slate-100 border border-slate-200 rounded"
              >
                <Icon size={12} />
                <span className="max-w-[120px] truncate">{f.filename}</span>
                <button onClick={() => removeFile(f.file_id)} className="text-slate-400 hover:text-red-500">
                  <X size={12} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const FileList = ({ files }) => {
  if (!files || files.length === 0) return null;
  const backendUrl = process.env.REACT_APP_BACKEND_URL;
  return (
    <div className="flex flex-wrap gap-2 mt-1">
      {files.map((f) => {
        const Icon = getIcon(f.content_type);
        return (
          <a
            key={f.file_id}
            href={`${backendUrl}${f.download_url}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-xs px-2 py-1 bg-slate-50 border border-slate-200 rounded hover:bg-slate-100 text-slate-700"
          >
            <Icon size={12} /> {f.filename} <span className="text-slate-400">({(f.size_bytes / 1024).toFixed(0)}KB)</span>
          </a>
        );
      })}
    </div>
  );
};
