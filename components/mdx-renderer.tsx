"use client";

import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CodeBlock } from "./code-block";

interface MDXRendererProps {
  content: string;
}

function MDXRendererComponent({ content }: MDXRendererProps) {
  // Don't render if content is empty or just whitespace
  if (!content || !content.trim()) {
    return null;
  }

  return (
    <ReactMarkdown
      key={content.length} // Force re-render when content changes
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => (
          <h1 className="mb-4 mt-8 text-4xl font-bold tracking-tight text-balance first:mt-0">
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2 className="mb-3 mt-8 text-3xl font-bold tracking-tight text-balance">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="mb-3 mt-6 text-2xl font-semibold tracking-tight">{children}</h3>
        ),
        h4: ({ children }) => <h4 className="mb-2 mt-4 text-xl font-semibold">{children}</h4>,
        h5: ({ children }) => <h5 className="mb-2 mt-4 text-lg font-semibold">{children}</h5>,
        h6: ({ children }) => <h6 className="mb-2 mt-4 text-base font-semibold">{children}</h6>,
        p: ({ children }) => <p className="mb-4 leading-relaxed">{children}</p>,
        a: ({ href, children }) => (
          <a
            href={href}
            className="text-accent hover:underline font-medium"
            target="_blank"
            rel="noopener noreferrer"
          >
            {children}
          </a>
        ),
        ul: ({ children }) => <ul className="mb-4 ml-6 list-disc space-y-2">{children}</ul>,
        ol: ({ children }) => <ol className="mb-4 ml-6 list-decimal space-y-2">{children}</ol>,
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        blockquote: ({ children }) => (
          <blockquote className="my-4 border-l-4 border-accent pl-4 italic text-muted-foreground">
            {children}
          </blockquote>
        ),
        code: ({ inline, className, children, ...props }: any) => {
          const match = /language-(\w+)/.exec(className || "");
          const language = match ? match[1] : undefined;
          return (
            <CodeBlock inline={inline} language={language}>
              {String(children).replace(/\n$/, "")}
            </CodeBlock>
          );
        },
        pre: ({ children }) => <>{children}</>, // Simplified pre tag to avoid double wrapping
        hr: () => <hr className="my-8 border-border" />,
        table: ({ children }) => (
          <div className="my-4 overflow-x-auto">
            <table className="w-full border-collapse">{children}</table>
          </div>
        ),
        thead: ({ children }) => <thead className="bg-muted">{children}</thead>,
        tbody: ({ children }) => <tbody className="divide-y divide-border">{children}</tbody>,
        tr: ({ children }) => <tr className="border-b border-border">{children}</tr>,
        th: ({ children }) => <th className="px-4 py-2 text-left font-semibold">{children}</th>,
        td: ({ children }) => <td className="px-4 py-2">{children}</td>,
        strong: ({ children }) => <strong className="font-bold">{children}</strong>,
        em: ({ children }) => <em className="italic">{children}</em>,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

// Memoize the component to prevent unnecessary re-renders
export const MDXRenderer = memo(MDXRendererComponent, (prevProps, nextProps) => {
  // Only re-render if content actually changed
  return prevProps.content === nextProps.content;
});

MDXRenderer.displayName = "MDXRenderer";
