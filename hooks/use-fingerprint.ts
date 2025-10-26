"use client";

import { useEffect, useState } from "react";
import FingerprintJS from "@fingerprintjs/fingerprintjs";

export function useFingerprint() {
  const [fingerprint, setFingerprint] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const generateFingerprint = async () => {
      try {
        const fp = await FingerprintJS.load();
        const result = await fp.get();
        setFingerprint(result.visitorId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to generate fingerprint");
      } finally {
        setIsLoading(false);
      }
    };

    generateFingerprint();
  }, []);

  return { fingerprint, isLoading, error };
}
