"use client";

import { useState, useRef, useEffect } from "react";
import { Github, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/client";
import { toast } from "sonner";

interface LoginButtonProps {
  variant?: "default" | "outline" | "ghost" | "link";
  size?: "default" | "sm" | "lg";
  className?: string;
  children?: React.ReactNode;
}

export function LoginButton({
  variant = "default",
  size = "default",
  className = "",
  children,
}: LoginButtonProps) {
  const { signIn, isLoading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleSignIn = async () => {
    try {
      setIsLoading(true);
      await signIn();
    } catch (error) {
      console.error("Failed to sign in:", error);
      if (isMountedRef.current) {
        toast.error("Failed to sign in with GitHub. Please try again.");
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  const loading = isLoading || authLoading;

  return (
    <Button
      onClick={handleSignIn}
      disabled={loading}
      variant={variant}
      size={size}
      className={className}
    >
      {loading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Github className="mr-2 h-4 w-4" />
      )}
      {children || (loading ? "Signing in..." : "Continue with GitHub")}
    </Button>
  );
}
