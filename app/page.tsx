"use client";

import { useState } from "react";
import { ChangelogDisplay } from "@/components/changelog-display";
import { ChangelogForm } from "@/components/changelog-form";
import { useAuth } from "@/lib/auth/client";
import { LoginButton } from "@/components/auth/login-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GitBranchIcon, Mail, ArrowRight } from "lucide-react";
import { RepositoryManagement } from "@/components/repository-management";
import { NavigationHeader } from "@/components/navigation-header";
import Link from "next/link";

export default function Home() {
  const [changelog, setChangelog] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedRepository, setSelectedRepository] = useState<string>("");
  const { isAuthenticated, isLoading, user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <NavigationHeader />
      <main>
        <div className="mx-auto max-w-5xl px-4 py-12">
          {/* Hero Section */}
          <div className="mb-12 text-center">
            <h1 className="mb-3 text-5xl font-bold tracking-tight text-balance">
              AI Changelog Generator
            </h1>
            <p className="text-lg text-muted-foreground text-balance">
              Generate detailed changelogs from GitHub pull requests using AI
            </p>
          </div>

          {/* Repository Management */}
          {isAuthenticated && (
            <RepositoryManagement
              onRepositorySelect={(repo) =>
                setSelectedRepository(repo.full_name)
              }
              selectedRepository={selectedRepository}
            />
          )}

          {/* Main Form */}
          <div className="space-y-8">
            <ChangelogForm
              onGenerate={setChangelog}
              isGenerating={isGenerating}
              setIsGenerating={setIsGenerating}
              preselectedRepository={selectedRepository}
            />

            {(changelog || isGenerating) && (
              <ChangelogDisplay
                changelog={changelog}
                isGenerating={isGenerating}
              />
            )}
          </div>

          {/* Email Generator CTA for Authenticated Users */}
          {isAuthenticated && changelog && !isGenerating && (
            <Card className="mt-8 border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-start gap-3">
                    <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                        Create an Email Announcement
                      </h3>
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        Transform this changelog into a compelling email that
                        highlights the most important features for your users.
                      </p>
                    </div>
                  </div>
                  <Link href="/email">
                    <Button size="sm" className="flex-shrink-0">
                      <Mail className="h-4 w-4 mr-2" />
                      Generate Email
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Anonymous User Notice */}
          {!isAuthenticated && !isLoading && changelog && (
            <Card className="mt-8 border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-amber-500 rounded-full mt-2 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      <strong>Anonymous Mode:</strong> You're using limited
                      GitHub API access.
                      <LoginButton
                        variant="link"
                        className="p-0 ml-1 h-auto text-amber-800 dark:text-amber-200 underline"
                      >
                        Sign in
                      </LoginButton>{" "}
                      for private repos and higher rate limits.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
