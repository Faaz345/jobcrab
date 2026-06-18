"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, FileText, X, Loader2, ClipboardPaste } from "lucide-react";
import { LiquidButton as Button } from "@/components/ui/liquid-glass-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

interface ResumeUploadProps {
  onUploadSuccess: () => void;
}

export function ResumeUpload({ onUploadSuccess }: ResumeUploadProps) {
  const [activeTab, setActiveTab] = useState("paste");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Paste tab state
  const [name, setName] = useState("");
  const [rawText, setRawText] = useState("");
  const [isDefault, setIsDefault] = useState(false);

  // File tab state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type === "application/pdf") {
      setSelectedFile(file);
      setFileName(file.name.replace(".pdf", ""));
    } else {
      setError("Only PDF files are accepted.");
    }
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        setSelectedFile(file);
        setFileName(file.name.replace(".pdf", ""));
        setError(null);
      }
    },
    []
  );

  async function handleTextSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsUploading(true);

    try {
      const res = await fetch("/api/resume/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, rawText, isDefault }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Upload failed");
      }

      setName("");
      setRawText("");
      setIsDefault(false);
      onUploadSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleFileSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFile) return;
    setError(null);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("name", fileName || selectedFile.name);
      formData.append("isDefault", isDefault.toString());

      const res = await fetch("/api/resume/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Upload failed");
      }

      setSelectedFile(null);
      setFileName("");
      setIsDefault(false);
      onUploadSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Upload className="h-5 w-5 text-primary" />
          Upload Base Resume
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4 w-full">
            <TabsTrigger value="paste" className="flex-1">
              <ClipboardPaste className="h-4 w-4" />
              Paste Text
            </TabsTrigger>
            <TabsTrigger value="file" className="flex-1">
              <FileText className="h-4 w-4" />
              Upload PDF
            </TabsTrigger>
          </TabsList>

          {/* Paste Tab */}
          <TabsContent value="paste">
            <form onSubmit={handleTextSubmit} className="space-y-4">
              <div>
                <Label htmlFor="resume-name">Resume Name</Label>
                <Input
                  id="resume-name"
                  placeholder="e.g. My Backend Developer Resume"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="resume-text">Resume Text</Label>
                <Textarea
                  id="resume-text"
                  placeholder="Paste your full resume text here..."
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  required
                  rows={12}
                  className="font-mono text-sm"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  {rawText.length} characters (minimum 50)
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is-default-paste"
                  checked={isDefault}
                  onCheckedChange={(checked) =>
                    setIsDefault(checked === true)
                  }
                />
                <Label htmlFor="is-default-paste" className="text-sm font-normal">
                  Set as default resume
                </Label>
              </div>
              <Button
                type="submit"
                disabled={isUploading || !name || rawText.length < 50}
                className="w-full"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Upload Resume
                  </>
                )}
              </Button>
            </form>
          </TabsContent>

          {/* File Upload Tab */}
          <TabsContent value="file">
            <form onSubmit={handleFileSubmit} className="space-y-4">
              {/* Drag & Drop Zone */}
              <div
                className={`relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-all duration-200 ${
                  isDragging
                    ? "border-primary bg-primary/5"
                    : selectedFile
                      ? "border-emerald-500/50 bg-emerald-500/5"
                      : "border-muted-foreground/25 hover:border-muted-foreground/50"
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {selectedFile ? (
                  <div className="flex items-center gap-3">
                    <FileText className="h-8 w-8 text-emerald-400" />
                    <div>
                      <p className="font-medium">{selectedFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(selectedFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedFile(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <Upload className="mb-3 h-10 w-10 text-muted-foreground" />
                    <p className="mb-1 text-sm font-medium">
                      Drop your PDF here or{" "}
                      <button
                        type="button"
                        className="text-primary underline underline-offset-2"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        browse
                      </button>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      PDF files only, max 5MB
                    </p>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {selectedFile && (
                <div>
                  <Label htmlFor="file-name">Resume Name</Label>
                  <Input
                    id="file-name"
                    placeholder="e.g. My Resume"
                    value={fileName}
                    onChange={(e) => setFileName(e.target.value)}
                  />
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is-default-file"
                  checked={isDefault}
                  onCheckedChange={(checked) =>
                    setIsDefault(checked === true)
                  }
                />
                <Label htmlFor="is-default-file" className="text-sm font-normal">
                  Set as default resume
                </Label>
              </div>

              <Button
                type="submit"
                disabled={isUploading || !selectedFile}
                className="w-full"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing PDF...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Upload PDF
                  </>
                )}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        {/* Error message */}
        {error && (
          <div className="mt-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
