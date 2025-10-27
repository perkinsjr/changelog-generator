"use client";

import { AlertCircle, Calendar, GitBranch, Info } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { useFingerprint } from "@/hooks/use-fingerprint";

interface ChangelogFormProps {
  onGenerate: (changelog: string) => void;
  isGenerating: boolean;
  setIsGenerating: (value: boolean) => void;
}

export function ChangelogForm({
  onGenerate,
  isGenerating,
  setIsGenerating,
}: ChangelogFormProps) {
  const [repository, setRepository] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
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

    if (!startDate || !endDate) {
      return false;
    }
    return new Date(endDate) >= new Date(startDate);
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
      // Debug logging
      console.log("Submitting form with:", {
        repository,
        dateMode: "range",
        startDate,
        endDate,
        identifier: fingerprint,
      });

      const response = await fetch("/api/generate-changelog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repository,
          dateMode: "range",
          startDate,
          endDate,
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
      const errorMessage =
        error instanceof Error ? error.message : "An error occurred";
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
          Enter the GitHub repository and select a time frame for changelog
          generation
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
            This service is rate limited to 5 requests per minute per user to
            ensure fair usage.
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
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <DatePicker
                  value={startDate}
                  onChange={setStartDate}
                  placeholder="Select start date"
                  disabled={isGenerating}
                  maxDate={endDate ? new Date(endDate) : new Date()}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <DatePicker
                  value={endDate}
                  onChange={setEndDate}
                  placeholder="Select end date"
                  disabled={isGenerating}
                  minDate={startDate ? new Date(startDate) : undefined}
                  maxDate={new Date()}
                />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Select a date range for the changelog. End date cannot be before
              start date.
            </p>
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
                : !startDate || !endDate
                  ? "Select dates to continue"
                  : "Generate Changelog"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
