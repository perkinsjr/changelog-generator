"use client";

import { AlertCircle, Calendar, GitBranch, Info } from "lucide-react";
import type React from "react";
import { useMemo, useState, useEffect } from "react";
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
import { useAuth } from "@/lib/auth/client";
import { RepositorySelector } from "@/components/repository-selector";
import {
  EnhancedErrorHandler,
  parseGitHubError,
  type GitHubError,
} from "@/components/enhanced-error-handler";

interface ChangelogFormProps {
  onGenerate: (changelog: string) => void;
  isGenerating: boolean;
  setIsGenerating: (value: boolean) => void;
  preselectedRepository?: string;
}

export function ChangelogForm({
  onGenerate,
  isGenerating,
  setIsGenerating,
  preselectedRepository,
}: ChangelogFormProps) {
  const [repository, setRepository] = useState(preselectedRepository || "");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState<GitHubError | null>(null);

  const [isRetrying, setIsRetrying] = useState(false);
  const { fingerprint, isLoading: fingerprintLoading } = useFingerprint();
  const { isAuthenticated, user } = useAuth();

  // Update repository when preselected repository changes
  useEffect(() => {
    if (preselectedRepository) {
      setRepository(preselectedRepository);
    }
  }, [preselectedRepository]);

  // Memoize date objects to prevent infinite re-renders
  const startDateMax = useMemo(
    () => (endDate ? new Date(endDate) : new Date()),
    [endDate],
  );
  const endDateMin = useMemo(
    () => (startDate ? new Date(startDate) : undefined),
    [startDate],
  );
  const endDateMax = useMemo(() => new Date(), []);

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

  const submitForm = async () => {
    setIsGenerating(true);
    setError(null);

    // Clear content with a small delay to prevent race conditions
    onGenerate("");
    await new Promise((resolve) => setTimeout(resolve, 100));

    if (!fingerprint) {
      setError(
        parseGitHubError({
          message: "Fingerprint not available. Please try again.",
        }),
      );
      setIsGenerating(false);
      return;
    }

    try {
      // Determine which API endpoint to use
      const apiEndpoint = isAuthenticated
        ? "/api/generate-changelog-auth"
        : "/api/generate-changelog";

      // Debug logging
      console.log("Submitting form with:", {
        repository,
        dateMode: "range",
        startDate,
        endDate,
        identifier: fingerprint,
        endpoint: apiEndpoint,
      });

      const response = await fetch(apiEndpoint, {
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
        const errorData = await response.json();
        const githubError = parseGitHubError({
          response: {
            status: response.status,
            data: errorData,
            headers: Object.fromEntries(response.headers.entries()),
          },
        });
        throw githubError;
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

          // Ensure we have meaningful content before updating
          if (accumulatedText.trim()) {
            onGenerate(accumulatedText);
          }
        }
      }
    } catch (error) {
      console.error("Error generating changelog:", error);
      const githubError =
        error instanceof Error
          ? parseGitHubError(error)
          : parseGitHubError({ message: "An unexpected error occurred" });
      setError(githubError);
      onGenerate("");
    } finally {
      setIsGenerating(false);
      setIsRetrying(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitForm();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitBranch className="h-5 w-5" />
          Repository Configuration
        </CardTitle>
        <CardDescription>
          {isAuthenticated
            ? "Select a repository from your GitHub account or enter manually"
            : "Enter the GitHub repository and select a time frame for changelog generation"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4">
            <EnhancedErrorHandler
              error={error}
              onRetry={async () => {
                setIsRetrying(true);
                setError(null);
                try {
                  await submitForm();
                } catch (error) {
                  console.error("Retry failed:", error);
                } finally {
                  setIsRetrying(false);
                }
              }}
              onDismiss={() => setError(null)}
              isRetrying={isRetrying}
            />
          </div>
        )}

        {!isAuthenticated && (
          <Alert className="mb-4">
            <Info className="h-4 w-4" />
            <AlertTitle>Rate Limiting</AlertTitle>
            <AlertDescription>
              This service is rate limited to 5 requests per minute per user to
              ensure fair usage. Sign in for higher limits and private
              repository access.
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="repository">GitHub Repository</Label>

            {isAuthenticated ? (
              <RepositorySelector
                value={repository}
                onValueChange={setRepository}
                placeholder="Select a repository..."
                disabled={isGenerating}
                className="w-full"
              />
            ) : (
              <>
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
              </>
            )}
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Date Range
            </Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <DatePicker
                  value={startDate}
                  onChange={setStartDate}
                  placeholder="Select start date"
                  disabled={isGenerating}
                  maxDate={startDateMax}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <DatePicker
                  value={endDate}
                  onChange={setEndDate}
                  placeholder="Select end date"
                  disabled={isGenerating}
                  minDate={endDateMin}
                  maxDate={endDateMax}
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
            disabled={
              isGenerating || fingerprintLoading || !isFormValid() || isRetrying
            }
          >
            {isGenerating || isRetrying
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
