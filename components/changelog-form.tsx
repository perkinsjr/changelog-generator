"use client";

import { AlertCircle, Calendar, GitBranch, Info } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { useFingerprint } from "@/hooks/use-fingerprint";

interface ChangelogFormProps {
  onGenerate: (changelog: string) => void;
  isGenerating: boolean;
  setIsGenerating: (value: boolean) => void;
}

export function ChangelogForm({ onGenerate, isGenerating, setIsGenerating }: ChangelogFormProps) {
  const [repository, setRepository] = useState("");
  const [dateRange, setDateRange] = useState<{
    startDate: string;
    endDate: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { fingerprint, isLoading: fingerprintLoading } = useFingerprint();

  // Form validation
  const isFormValid = () => {
    if (!repository.trim()) {
      return false;
    }
    if (!fingerprint || fingerprintLoading) {
      return false;
    }

    if (!dateRange || !dateRange.startDate || !dateRange.endDate) {
      return false;
    }
    return new Date(dateRange.endDate) >= new Date(dateRange.startDate);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    setError(null);
    onGenerate("");

    if (!fingerprint) {
      setError("Fingerprint not available. Please try again.");
      setIsGenerating(false);
      return;
    }

    try {
      const response = await fetch("/api/generate-changelog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repository,
          startDate: dateRange?.startDate,
          endDate: dateRange?.endDate,
          identifier: fingerprint,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate changelog");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          accumulatedText += chunk;
          onGenerate(accumulatedText);
        }
      }
    } catch (error) {
      console.error("Error generating changelog:", error);
      const errorMessage = error instanceof Error ? error.message : "An error occurred";
      setError(errorMessage);
      onGenerate("");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitBranch className="h-5 w-5" />
          Repository Configuration
        </CardTitle>
        <CardDescription>
          Enter the GitHub repository and select a time frame for changelog generation
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Alert className="mb-4">
          <Info className="h-4 w-4" />
          <AlertTitle>Rate Limiting</AlertTitle>
          <AlertDescription>
            This service is rate limited to 5 requests per minute per user to ensure fair usage.
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="repository">GitHub Repository</Label>
            <Input
              id="repository"
              placeholder="owner/repository (e.g., vercel/next.js)"
              value={repository}
              onChange={(e) => setRepository(e.target.value)}
              required
              disabled={isGenerating}
            />
            <p className="text-sm text-muted-foreground">
              Enter the repository in owner/name format
            </p>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Date Range
            </Label>
            <DateRangePicker onDateChange={setDateRange} disabled={isGenerating} />
            <p className="text-sm text-muted-foreground">
              Select a date range for the changelog. The calendar will automatically prevent invalid
              date ranges and swap dates if needed.
            </p>
            {dateRange && (
              <div className="mt-2 p-2 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-md">
                <p className="text-sm text-green-700 dark:text-green-300">
                  ✅ Date range selected: {new Date(dateRange.startDate).toLocaleDateString()} to{" "}
                  {new Date(dateRange.endDate).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isGenerating || fingerprintLoading || !isFormValid()}
          >
            {isGenerating
              ? "Generating..."
              : fingerprintLoading
                ? "Loading..."
                : !dateRange
                  ? "Select dates to continue"
                  : "Generate Changelog"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
