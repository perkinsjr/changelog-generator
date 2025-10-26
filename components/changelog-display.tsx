"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Copy, Download, Check, CheckCircle } from "lucide-react";
import { MDXRenderer } from "@/components/mdx-renderer";
import { Spinner } from "@/components/ui/spinner";
import { useState } from "react";

interface ChangelogDisplayProps {
  changelog: string;
  isGenerating: boolean;
}

export function ChangelogDisplay({
  changelog,
  isGenerating,
}: ChangelogDisplayProps) {
  const [isCopied, setIsCopied] = useState(false);
  const [isDownloaded, setIsDownloaded] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(changelog);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([changelog], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `changelog-${new Date().toISOString().split("T")[0]}.mdx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setIsDownloaded(true);
    setTimeout(() => setIsDownloaded(false), 2000);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generated Changelog
          </CardTitle>
          {changelog && !isGenerating && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleCopy}>
                {isCopied ? (
                  <Check className="mr-2 h-4 w-4" />
                ) : (
                  <Copy className="mr-2 h-4 w-4" />
                )}
                {isCopied ? "Copied!" : "Copy"}
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload}>
                {isDownloaded ? (
                  <CheckCircle className="mr-2 h-4 w-4" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                {isDownloaded ? "Downloaded!" : "Download"}
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isGenerating && !changelog && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center space-y-4">
              <Spinner className="mx-auto h-8 w-8" />
              <p className="text-muted-foreground">
                Fetching pull requests and generating changelog...
              </p>
            </div>
          </div>
        )}
        {changelog && (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <MDXRenderer content={changelog} />
            {isGenerating && (
              <div className="mt-4 flex items-center gap-2 text-muted-foreground">
                <Spinner className="h-4 w-4" />
                <span className="text-sm">Generating...</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
