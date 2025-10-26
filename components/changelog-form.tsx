"use client";

import type React from "react";
import { useState } from "react";
import { useFingerprint } from "@/hooks/use-fingerprint";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { GitBranch, Calendar, AlertCircle, Info } from "lucide-react";

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
  const [dateMode, setDateMode] = useState<"days" | "range">("days");
  const [days, setDays] = useState("30");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { fingerprint, isLoading: fingerprintLoading } = useFingerprint();

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
          dateMode,
          days: dateMode === "days" ? Number.parseInt(days) : undefined,
          startDate: dateMode === "range" ? startDate : undefined,
          endDate: dateMode === "range" ? endDate : undefined,
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
          if (done) break;

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
              Time Frame
            </Label>
            <Tabs
              value={dateMode}
              onValueChange={(v: string) => setDateMode(v as "days" | "range")}
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="days">Last N Days</TabsTrigger>
                <TabsTrigger value="range">Date Range</TabsTrigger>
              </TabsList>
              <TabsContent value="days" className="space-y-2">
                <Input
                  type="number"
                  placeholder="30"
                  value={days}
                  onChange={(e) => setDays(e.target.value)}
                  min="1"
                  max="365"
                  required={dateMode === "days"}
                  disabled={isGenerating}
                />
                <p className="text-sm text-muted-foreground">
                  Number of days to look back (1-365)
                </p>
              </TabsContent>
              <TabsContent value="range" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required={dateMode === "range"}
                    disabled={isGenerating}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required={dateMode === "range"}
                    disabled={isGenerating}
                  />
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isGenerating || fingerprintLoading}
          >
            {isGenerating
              ? "Generating..."
              : fingerprintLoading
                ? "Loading..."
                : "Generate Changelog"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
