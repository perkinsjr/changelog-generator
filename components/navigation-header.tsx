"use client";

import React, { useState } from "react";
import { useAuth } from "@/lib/auth/client";
import { LoginButton } from "@/components/auth/login-button";
import { UserProfile } from "@/components/auth/user-profile";
import { Button } from "@/components/ui/button";
import { MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";

interface NavigationHeaderProps {
  className?: string;
}

export function NavigationHeader({ className = "" }: NavigationHeaderProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch with theme
  React.useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    const currentTheme = theme === "system" ? resolvedTheme : theme;
    setTheme(currentTheme === "dark" ? "light" : "dark");
  };

  return (
    <header
      className={`border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 ${className}`}
    >
      <div className="container flex h-16 items-center justify-between">
        {/* Empty space for alignment */}
        <div></div>

        {/* Navigation Actions */}
        <div className="flex items-center gap-3">
          {/* Theme Toggle */}
          {mounted && (
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="w-9 px-0"
            >
              <SunIcon className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <MoonIcon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>
          )}

          {/* Authentication */}
          <div className="flex items-center gap-2">
            {isLoading ? (
              <div className="h-9 w-24 bg-muted animate-pulse rounded-md" />
            ) : isAuthenticated ? (
              <UserProfile />
            ) : (
              <LoginButton size="sm" />
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
