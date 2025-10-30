"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/lib/auth/client";
import { NavigationHeader } from "@/components/navigation-header";
import { LoginButton } from "@/components/auth/login-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ChangelogDisplay } from "@/components/changelog-display";
import { Mail, ArrowLeft, Sparkles } from "lucide-react";
import Link from "next/link";

export default function EmailGeneratorPage() {
  const [changelogContent, setChangelogContent] = useState("");
  const [repository, setRepository] = useState("");
  const [dateRange, setDateRange] = useState("");
  const [email, setEmail] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const { isAuthenticated, isLoading } = useAuth();
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  const handleGenerate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!changelogContent.trim()) {
      setError("Please provide changelog content");
      return;
    }

    setIsGenerating(true);
    setError("");
    setEmail("");

    // Cleanup any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const response = await fetch("/api/generate-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          changelogContent,
          repository,
          dateRange,
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        let errorMessage = "Failed to generate email";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // Response was not JSON, use default message
        }
        throw new Error(errorMessage);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = "";

      if (reader) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            accumulatedText += chunk;
            setEmail(accumulatedText);
          }
        } finally {
          reader.releaseLock();
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return; // Request was aborted, don't set error state
      }
      console.error("Error generating email:", error);
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <NavigationHeader />
        <main className="mx-auto max-w-5xl px-4 py-12">
          <div className="flex items-center justify-center">
            <div className="h-8 w-32 bg-muted animate-pulse rounded-md" />
          </div>
        </main>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <NavigationHeader />
        <main className="mx-auto max-w-3xl px-4 py-12">
          <div className="text-center space-y-6">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold">Authentication Required</h1>
              <p className="text-muted-foreground">
                Please sign in to access the email generator
              </p>
            </div>
            <div className="space-y-4">
              <LoginButton size="lg" />
              <div>
                <Link href="/">
                  <Button variant="outline">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Home
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <NavigationHeader />
      <main className="mx-auto max-w-5xl px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight flex items-center gap-3">
              <Mail className="h-8 w-8" />
              Email Generator
            </h1>
            <p className="text-lg text-muted-foreground">
              Transform your changelog into an engaging email announcement
            </p>
          </div>
        </div>

        <div className="space-y-8">
          {/* Input Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Email Configuration
              </CardTitle>
              <CardDescription>
                Provide your changelog content and optional context to generate
                a compelling email
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleGenerate} className="space-y-6">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="repository">Repository (Optional)</Label>
                    <Input
                      id="repository"
                      placeholder="owner/repository"
                      value={repository}
                      onChange={(e) => setRepository(e.target.value)}
                      disabled={isGenerating}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dateRange">Date Range (Optional)</Label>
                    <Input
                      id="dateRange"
                      placeholder="e.g., Jan 1 - Jan 31, 2024"
                      value={dateRange}
                      onChange={(e) => setDateRange(e.target.value)}
                      disabled={isGenerating}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="changelog">Changelog Content *</Label>
                  <Textarea
                    id="changelog"
                    placeholder="Paste your changelog content here..."
                    value={changelogContent}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setChangelogContent(e.target.value)
                    }
                    rows={12}
                    required
                    disabled={isGenerating}
                    className="min-h-[300px] font-mono text-sm"
                  />
                  <p className="text-sm text-muted-foreground">
                    Paste the changelog you want to convert into an email. This
                    could be from the main generator or any other source.
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isGenerating || !changelogContent.trim()}
                >
                  {isGenerating ? (
                    <>
                      <Sparkles className="h-4 w-4 mr-2 animate-pulse" />
                      Generating Email...
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4 mr-2" />
                      Generate Email
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Email Output */}
          {(email || isGenerating) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Generated Email
                </CardTitle>
                <CardDescription>
                  Your changelog has been transformed into an engaging email
                  announcement
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChangelogDisplay
                  changelog={email}
                  isGenerating={isGenerating}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
