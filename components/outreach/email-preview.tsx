"use client";

import { Card, CardContent } from "@/components/ui/card";

interface EmailPreviewProps {
  bodyHtml: string;
}

export function EmailPreview({ bodyHtml }: EmailPreviewProps) {
  // Wrap simple HTML draft body into clean email rendering template with standard typography
  const fullHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            font-size: 14px;
            line-height: 1.6;
            color: #333333;
            margin: 0;
            padding: 20px;
          }
          p {
            margin-top: 0;
            margin-bottom: 16px;
          }
          strong {
            color: #111111;
          }
          ul, ol {
            margin-top: 0;
            margin-bottom: 16px;
            padding-left: 20px;
          }
          li {
            margin-bottom: 6px;
          }
        </style>
      </head>
      <body>
        ${bodyHtml || "<p><i>No preview available.</i></p>"}
      </body>
    </html>
  `;

  return (
    <Card className="overflow-hidden border shadow-sm">
      <CardContent className="p-0">
        <div className="bg-muted/30 px-4 py-2 border-b text-xs text-muted-foreground flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
          <span className="ml-2 font-mono">Email Preview Client</span>
        </div>
        <iframe
          srcDoc={fullHtml}
          title="Email Preview"
          sandbox="allow-same-origin"
          className="w-full h-[500px] border-none bg-white"
        />
      </CardContent>
    </Card>
  );
}
