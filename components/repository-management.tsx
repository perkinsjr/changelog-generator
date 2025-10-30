"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  StarIcon,
  ClockIcon,
  GitBranchIcon,
  EyeIcon,
  EyeOffIcon,
  ExternalLinkIcon,
  BookmarkIcon,
} from "lucide-react";

export interface Repository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  html_url: string;
  language: string | null;
  stargazers_count: number;
  updated_at: string;
  owner: {
    login: string;
    avatar_url: string;
  };
}

interface RepositoryManagementProps {
  onRepositorySelect?: (repository: Repository) => void;
  selectedRepository?: string;
}

// Validate repository data structure with comprehensive type checking
const validateRepository = (repo: any): repo is Repository => {
  return (
    repo &&
    typeof repo.id === "number" &&
    typeof repo.name === "string" &&
    typeof repo.full_name === "string" &&
    repo.owner &&
    typeof repo.owner.login === "string" &&
    typeof repo.owner.avatar_url === "string" &&
    typeof repo.stargazers_count === "number" &&
    typeof repo.updated_at === "string" &&
    typeof repo.html_url === "string" &&
    typeof repo.private === "boolean" &&
    (repo.description === null || typeof repo.description === "string") &&
    (repo.language === null || typeof repo.language === "string")
  );
};

// Load repositories from localStorage with validation
const loadRepositories = (key: string): Repository[] => {
  if (typeof window === "undefined") return [];

  const stored = localStorage.getItem(key);
  if (!stored) return [];

  try {
    const parsed = JSON.parse(stored);
    if (Array.isArray(parsed) && parsed.every(validateRepository)) {
      return parsed;
    } else {
      console.error(`Invalid ${key} data structure`);
      localStorage.removeItem(key);
      return [];
    }
  } catch (error) {
    console.error(`Failed to parse ${key}:`, error);
    localStorage.removeItem(key);
    return [];
  }
};

export function RepositoryManagement({
  onRepositorySelect,
  selectedRepository,
}: RepositoryManagementProps) {
  const { isAuthenticated } = useAuth();
  const [recentRepos, setRecentRepos] = useState<Repository[]>([]);
  const [favoriteRepos, setFavoriteRepos] = useState<Repository[]>([]);

  // Load repositories from localStorage
  useEffect(() => {
    setRecentRepos(loadRepositories("recentRepositories"));
    setFavoriteRepos(loadRepositories("favoriteRepositories"));
  }, []);

  const addToRecent = (repo: Repository) => {
    setRecentRepos((prev) => {
      const filtered = prev.filter((r) => r.id !== repo.id);
      const updated = [repo, ...filtered].slice(0, 5); // Keep only 5 recent repos

      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("recentRepositories", JSON.stringify(updated));
        } catch (error) {
          console.error("Failed to save recent repositories:", error);
        }
      }

      return updated;
    });
  };

  const toggleFavorite = (repo: Repository) => {
    setFavoriteRepos((prev) => {
      const isFavorite = prev.some((r) => r.id === repo.id);
      let updated: Repository[];

      if (isFavorite) {
        updated = prev.filter((r) => r.id !== repo.id);
      } else {
        updated = [...prev, repo];
      }

      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("favoriteRepositories", JSON.stringify(updated));
        } catch (error) {
          console.error("Failed to save favorite repositories:", error);
        }
      }

      return updated;
    });
  };

  const handleRepositoryClick = (repo: Repository) => {
    addToRecent(repo);
    onRepositorySelect?.(repo);
  };

  const isFavorite = (repo: Repository) => {
    return favoriteRepos.some((r) => r.id === repo.id);
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400)
      return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 2592000)
      return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const RepositoryCard = ({
    repo,
    showTime = false,
  }: {
    repo: Repository;
    showTime?: boolean;
  }) => {
    const isSelected = selectedRepository === repo.full_name;

    return (
      <div
        className={`group relative p-3 rounded-lg border transition-all cursor-pointer hover:shadow-md ${
          isSelected
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50"
        }`}
        role="button"
        tabIndex={0}
        onClick={() => handleRepositoryClick(repo)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleRepositoryClick(repo);
          }
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium truncate text-sm">{repo.name}</h4>
              <div className="flex items-center gap-1 flex-shrink-0">
                {repo.private ? (
                  <EyeOffIcon className="w-3 h-3 text-muted-foreground" />
                ) : (
                  <EyeIcon className="w-3 h-3 text-muted-foreground" />
                )}
                {repo.language && (
                  <Badge variant="outline" className="text-xs px-1 py-0">
                    {repo.language}
                  </Badge>
                )}
              </div>
            </div>

            {repo.description && (
              <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                {repo.description}
              </p>
            )}

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {repo.stargazers_count > 0 && (
                <div className="flex items-center gap-1">
                  <StarIcon className="w-3 h-3" />
                  {repo.stargazers_count}
                </div>
              )}
              {showTime && (
                <div className="flex items-center gap-1">
                  <ClockIcon className="w-3 h-3" />
                  {formatTimeAgo(repo.updated_at)}
                </div>
              )}
              <span className="truncate">{repo.owner.login}</span>
            </div>
          </div>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(repo);
                    }}
                  >
                    <BookmarkIcon
                      className={`w-4 h-4 ${
                        isFavorite(repo)
                          ? "fill-current text-amber-500"
                          : "text-muted-foreground"
                      }`}
                    />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isFavorite(repo)
                    ? "Remove from favorites"
                    : "Add to favorites"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(
                        repo.html_url,
                        "_blank",
                        "noopener,noreferrer",
                      );
                    }}
                  >
                    <ExternalLinkIcon className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>View on GitHub</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>
    );
  };

  if (!isAuthenticated) {
    return null;
  }

  const hasRecentRepos = recentRepos.length > 0;
  const hasFavoriteRepos = favoriteRepos.length > 0;

  if (!hasRecentRepos && !hasFavoriteRepos) {
    return null;
  }

  return (
    <div className="space-y-6">
      {hasFavoriteRepos && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BookmarkIcon className="w-4 h-4 text-amber-500" />
              Favorite Repositories
            </CardTitle>
            <CardDescription>
              Your bookmarked repositories for quick access
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-60">
              <div className="space-y-2">
                {favoriteRepos.map((repo) => (
                  <RepositoryCard key={repo.id} repo={repo} />
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {hasRecentRepos && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClockIcon className="w-4 h-4 text-blue-500" />
              Recent Repositories
            </CardTitle>
            <CardDescription>
              Recently accessed repositories from your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-60">
              <div className="space-y-2">
                {recentRepos.map((repo) => (
                  <RepositoryCard key={repo.id} repo={repo} showTime />
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
