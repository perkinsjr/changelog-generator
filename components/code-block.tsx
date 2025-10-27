"use client";

interface CodeBlockProps {
  children: string;
  language?: string;
  inline?: boolean;
}

export function CodeBlock({ children, language, inline }: CodeBlockProps) {
  if (inline) {
    return <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">{children}</code>;
  }

  return (
    <div className="my-4 overflow-x-auto rounded-lg bg-[#1e1e1e] p-4">
      <pre className="font-mono text-sm text-[#d4d4d4]">
        <code>{children}</code>
      </pre>
      {language && <div className="mt-2 text-xs text-muted-foreground opacity-50">{language}</div>}
    </div>
  );
}
