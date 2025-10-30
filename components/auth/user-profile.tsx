"use client";

import { useState, useEffect } from "react";
import { User, Github, Mail, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth/client";
import { LogoutButton } from "./logout-button";

// Helper function to generate user initials
function getUserInitials(name?: string, email?: string): string {
  if (name) {
    const trimmedName = name.trim();
    if (trimmedName) {
      const initials = trimmedName
        .split(" ")
        .filter((n: string) => n.length > 0)
        .map((n: string) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();

      if (initials.length === 0) {
        return trimmedName.slice(0, 2).toUpperCase();
      }
      return initials;
    }
  }
  return email?.[0]?.toUpperCase() || "U";
}

interface UserProfileProps {
  showDropdown?: boolean;
  className?: string;
}

export function UserProfile({
  showDropdown = true,
  className = "",
}: UserProfileProps) {
  const { user, isAuthenticated } = useAuth();
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [user?.image]);

  if (!isAuthenticated || !user) {
    return null;
  }

  const initials = getUserInitials(user.name, user.email);

  const profileContent = (
    <div className="flex items-center space-x-2">
      <Avatar className="h-8 w-8">
        <AvatarImage
          src={!imageError ? user.image || "" : ""}
          alt={user.name || user.email || "User"}
          onError={() => setImageError(true)}
        />
        <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-col">
        <span className="text-sm font-medium leading-none">
          {user.name || user.email}
        </span>
        {user.name && user.email && (
          <span className="text-xs text-muted-foreground">{user.email}</span>
        )}
      </div>
    </div>
  );

  if (!showDropdown) {
    return <div className={className}>{profileContent}</div>;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className={`h-auto p-2 ${className}`}>
          {profileContent}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80" align="end">
        <DropdownMenuLabel className="p-4">
          <div className="flex items-start space-x-3">
            <Avatar className="h-12 w-12">
              <AvatarImage
                src={!imageError ? user.image || "" : ""}
                alt={user.name || user.email || "User"}
                onError={() => setImageError(true)}
              />
              <AvatarFallback className="bg-primary/10 text-primary text-lg font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-1">
              <div className="flex items-center space-x-2">
                <h4 className="text-sm font-semibold">
                  {user.name || user.email}
                </h4>
                <Badge variant="secondary" className="text-xs">
                  <Github className="mr-1 h-3 w-3" />
                  GitHub
                </Badge>
              </div>
              {user.email && (
                <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                  <Mail className="h-3 w-3" />
                  <span>{user.email}</span>
                </div>
              )}
            </div>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <div className="p-2 space-y-1">
          <DropdownMenuItem disabled>
            <Github className="mr-2 h-4 w-4" />
            <span>View GitHub Profile</span>
            <Badge variant="outline" className="ml-auto text-xs">
              Soon
            </Badge>
          </DropdownMenuItem>

          <DropdownMenuItem disabled>
            <User className="mr-2 h-4 w-4" />
            <span>Account Settings</span>
            <Badge variant="outline" className="ml-auto text-xs">
              Soon
            </Badge>
          </DropdownMenuItem>
        </div>

        <DropdownMenuSeparator />

        <div className="p-2">
          <LogoutButton
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            showConfirmation={true}
          />
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Compact version for header/navbar
export function UserProfileCompact({ className = "" }: { className?: string }) {
  const { user, isAuthenticated } = useAuth();
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [user?.image]);

  if (!isAuthenticated || !user) {
    return null;
  }

  const initials = getUserInitials(user.name, user.email);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`h-8 w-8 rounded-full p-0 ${className}`}
        >
          <Avatar className="h-8 w-8">
            <AvatarImage
              src={!imageError ? user.image || "" : ""}
              alt={user.name || user.email || "User"}
              onError={() => setImageError(true)}
            />
            <AvatarFallback className="bg-primary/10 text-primary text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium">{user.name || user.email}</p>
            {user.name && user.email && (
              <p className="text-xs text-muted-foreground">{user.email}</p>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled>
          <Github className="mr-2 h-4 w-4" />
          View Profile
          <ExternalLink className="ml-auto h-3 w-3" />
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <div className="p-1">
          <LogoutButton
            variant="ghost"
            size="sm"
            className="w-full justify-start h-8"
            showConfirmation={false}
          >
            Sign out
          </LogoutButton>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
