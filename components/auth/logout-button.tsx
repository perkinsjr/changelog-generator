"use client";

import { useState, useEffect } from "react";
import { LogOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/lib/auth/client";
import { toast } from "sonner";

interface LogoutButtonProps {
  variant?: "default" | "outline" | "ghost" | "destructive";
  size?: "default" | "sm" | "lg";
  className?: string;
  showConfirmation?: boolean;
  children?: React.ReactNode;
}

export function LogoutButton({
  variant = "ghost",
  size = "default",
  className = "",
  showConfirmation = true,
  children,
}: LogoutButtonProps) {
  const { signOut, isLoading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleSignOut = async () => {
    try {
      setIsLoading(true);
      await signOut();
      // Success toast removed as it may not be visible after redirect
    } catch (error) {
      console.error("Failed to sign out:", error);
      toast.error("Failed to sign out. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const loading = isLoading || authLoading;

  const renderButton = (onClick?: () => void) => (
    <Button
      onClick={onClick}
      disabled={loading}
      variant={variant}
      size={size}
      className={className}
    >
      {loading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <LogOut className="mr-2 h-4 w-4" />
      )}
      {children || (loading ? "Signing out..." : "Sign out")}
    </Button>
  );

  if (!showConfirmation) {
    return renderButton(handleSignOut);
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{renderButton()}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Sign out</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to sign out? You'll need to authenticate again
            to access your private repositories.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleSignOut} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing out...
              </>
            ) : (
              "Sign out"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
