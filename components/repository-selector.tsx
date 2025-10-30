"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Check,
  ChevronDown,
  Lock,
  Globe,
  Star,
  GitFork,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/client-utils";
import { useAuth } from "@/lib/auth/client";
import {
  filterRepositories,
  sortRepositories,
  type GitHubRepository,
} from "@/lib/github/authenticated";
import { useToast } from "@/hooks/use-toast";

interface RepositorySelectorProps {
  value?: string;
  onValueChange: (repository: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

interface RepositoryItemProps {
  repository: GitHubRepository;
  isSelected: boolean;
  onSelect: () => void;
}

function RepositoryItem({
  repository,
  isSelected,
  onSelect,
}: RepositoryItemProps) {
  return (
    <CommandItem
      value={repository.full_name}
      onSelect={onSelect}
      className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted hover:text-foreground aria-selected:bg-muted aria-selected:text-foreground"
    >
      <div className="flex items-center space-x-3 flex-1 min-w-0">
        <Check
          className={cn(
            "h-4 w-4 shrink-0",
            isSelected ? "opacity-100" : "opacity-0",
          )}
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <span className="font-medium text-sm truncate">
              {repository.name}
            </span>
            <div className="flex items-center space-x-1 shrink-0">
              {repository.private ? (
                <Lock className="h-3 w-3 text-amber-500" />
              ) : (
                <Globe className="h-3 w-3 text-green-500" />
              )}
              {repository.language && (
                <Badge variant="secondary" className="text-xs px-1 py-0">
                  {repository.language}
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-3 text-xs text-muted-foreground">
            <span className="truncate max-w-[200px]">
              {repository.owner.login}
            </span>
            <div className="flex items-center space-x-1">
              <Star className="h-3 w-3" />
              <span>{repository.stargazers_count}</span>
            </div>
            <div className="flex items-center space-x-1">
              <GitFork className="h-3 w-3" />
              <span>{repository.forks_count}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Calendar className="h-3 w-3" />
              <span>
                {new Date(repository.updated_at).toLocaleDateString()}
              </span>
            </div>
          </div>

          {repository.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
              {repository.description}
            </p>
          )}
        </div>
      </div>
    </CommandItem>
  );
}

export function RepositorySelector({
  value = "",
  onValueChange,
  placeholder = "Select a repository...",
  className,
  disabled = false,
}: RepositorySelectorProps) {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [repositories, setRepositories] = useState<GitHubRepository[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<
    "name" | "updated" | "stars" | "created"
  >("updated");
  const [filter, setFilter] = useState<"all" | "public" | "private">("all");
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadRepositories = useCallback(async () => {
    if (!isAuthenticated) {
      setError("Please login to access your repositories");
      return;
    }

    setLoading(true);
    setError(null);
    console.log("Starting to load repositories...");

    try {
      const response = await fetch("/api/repositories?maxRepos=100", {
        method: "GET",
        credentials: "same-origin",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch repositories");
      }

      const data = await response.json();
      console.log("API Response:", data);
      console.log("Repositories count:", data.repositories?.length || 0);
      console.log("First few repositories:", data.repositories?.slice(0, 3));

      const repos = data.repositories || [];
      console.log("About to set repositories:", repos);
      setRepositories(repos);
      console.log("Called setRepositories with:", repos.length, "items");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load repositories";
      console.error("Error loading repositories:", errorMessage);
      setError(errorMessage);
      setRepositories([]); // Clear repositories on error
      toast({
        title: "Error loading repositories",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, toast]);

  const refreshRepositories = useCallback(async () => {
    setRepositories([]);
    await loadRepositories();
  }, [loadRepositories]);

  // Load repositories when popover opens and user is authenticated
  useEffect(() => {
    console.log("useEffect trigger check:", {
      isAuthenticated,
      open,
      repositoriesLength: repositories.length,
      shouldLoad: isAuthenticated && open && repositories.length === 0,
    });

    if (isAuthenticated && open && repositories.length === 0 && !loading) {
      console.log("Triggering loadRepositories...");
      loadRepositories();
    }
  }, [isAuthenticated, open, repositories.length, loading, loadRepositories]);

  // Debug repositories state
  console.log("Current repositories state:", repositories);
  console.log("Repositories length:", repositories.length);

  // Filter and sort repositories
  const filteredAndSortedRepositories = useMemo(() => {
    console.log("Filtering repositories:", {
      totalRepositories: repositories.length,
      filter,
      searchTerm,
      sortBy,
      repositoriesArray: repositories,
    });

    let filtered = repositories;

    // Apply type filter
    if (filter === "public") {
      filtered = filtered.filter((repo) => !repo.private);
    } else if (filter === "private") {
      filtered = filtered.filter((repo) => repo.private);
    }

    console.log("After type filter:", filtered.length, filtered);

    // Apply search filter
    filtered = filterRepositories(filtered, searchTerm);
    console.log("After search filter:", filtered.length, filtered);

    // Apply sorting
    const sorted = sortRepositories(filtered, sortBy);
    console.log("Final filtered repositories:", sorted.length, sorted);

    return sorted;
  }, [repositories, searchTerm, sortBy, filter]);

  const selectedRepository = repositories.find(
    (repo) => repo.full_name === value,
  );

  if (!isAuthenticated) {
    return (
      <div className={cn("relative", className)}>
        <Input
          placeholder="owner/repository (login to browse your repositories)"
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          disabled={disabled}
          className="pr-9"
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <Lock className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between h-auto min-h-[40px] px-3 py-2 hover:bg-muted hover:text-foreground"
            disabled={disabled}
          >
            <div className="flex items-center space-x-2 flex-1 min-w-0">
              {selectedRepository ? (
                <>
                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                    {selectedRepository.private ? (
                      <Lock className="h-4 w-4 text-amber-500 shrink-0" />
                    ) : (
                      <Globe className="h-4 w-4 text-green-500 shrink-0" />
                    )}
                    <span className="truncate font-medium">
                      {selectedRepository.name}
                    </span>
                    <span className="text-muted-foreground text-sm">
                      ({selectedRepository.owner.login})
                    </span>
                  </div>
                </>
              ) : (
                <span className="text-muted-foreground">{placeholder}</span>
              )}
            </div>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>

        <PopoverContent
          className="w-full p-0"
          align="start"
          style={{ width: "var(--radix-popover-trigger-width)" }}
        >
          <Command shouldFilter={false}>
            <div className="border-b p-3 space-y-2">
              <CommandInput
                placeholder="Search repositories..."
                value={searchTerm}
                onValueChange={setSearchTerm}
                className="h-8"
              />

              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1">
                  <label className="text-xs text-muted-foreground">
                    Filter:
                  </label>
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value as typeof filter)}
                    className="text-xs bg-background border border-input rounded px-1 text-foreground"
                  >
                    <option value="all">All</option>
                    <option value="public">Public</option>
                    <option value="private">Private</option>
                  </select>
                </div>

                <div className="flex items-center space-x-1">
                  <label className="text-xs text-muted-foreground">Sort:</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                    className="text-xs bg-background border border-input rounded px-1 text-foreground"
                  >
                    <option value="updated">Updated</option>
                    <option value="name">Name</option>
                    <option value="stars">Stars</option>
                    <option value="created">Created</option>
                  </select>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={refreshRepositories}
                  disabled={loading}
                  className="text-xs h-6 px-2"
                >
                  Refresh
                </Button>
              </div>
            </div>

            <CommandList className="max-h-64">
              {(() => {
                console.log("Render state:", {
                  loading,
                  error,
                  repositoriesLength: repositories.length,
                  filteredLength: filteredAndSortedRepositories.length,
                });

                if (loading) {
                  return <CommandEmpty>Loading repositories...</CommandEmpty>;
                }

                if (error) {
                  return (
                    <CommandEmpty className="text-destructive">
                      <div className="p-2 text-center">
                        <p className="text-sm">{error}</p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={refreshRepositories}
                          className="mt-2"
                        >
                          Try Again
                        </Button>
                      </div>
                    </CommandEmpty>
                  );
                }

                if (filteredAndSortedRepositories.length === 0) {
                  return (
                    <CommandEmpty>
                      <div className="p-2 text-center">
                        <p className="text-sm">
                          {searchTerm
                            ? "No repositories match your search."
                            : "No repositories found."}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Total: {repositories.length}, Filtered:{" "}
                          {filteredAndSortedRepositories.length}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Loading: {loading.toString()}, Error:{" "}
                          {error || "none"}
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={refreshRepositories}
                          className="mt-2"
                        >
                          Refresh
                        </Button>
                      </div>
                    </CommandEmpty>
                  );
                }

                return (
                  <CommandGroup>
                    {filteredAndSortedRepositories.map((repo) => (
                      <RepositoryItem
                        key={repo.id}
                        repository={repo}
                        isSelected={value === repo.full_name}
                        onSelect={() => {
                          onValueChange(repo.full_name);
                          setOpen(false);
                        }}
                      />
                    ))}
                  </CommandGroup>
                );
              })()}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Manual input fallback */}
      <div className="mt-2">
        <Input
          placeholder="Or enter manually: owner/repository"
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          disabled={disabled}
          className="text-xs"
        />
      </div>
    </div>
  );
}
