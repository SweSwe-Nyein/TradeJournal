import React from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';

export const defaultMarkdownComponents: Components = {
  h1: ({ node, ...props }) => (
    <h1 className="text-sm font-bold text-zinc-100 mt-2.5 mb-1 border-b border-zinc-800 pb-0.5 first:mt-0 font-sans" {...props} />
  ),
  h2: ({ node, ...props }) => (
    <h2 className="text-xs font-bold text-zinc-100 mt-2 mb-1 first:mt-0 font-sans" {...props} />
  ),
  h3: ({ node, ...props }) => (
    <h3 className="text-xs font-semibold text-zinc-200 mt-1.5 mb-0.5 uppercase tracking-wider first:mt-0 font-sans" {...props} />
  ),
  h4: ({ node, ...props }) => (
    <h4 className="text-xs font-semibold text-zinc-200 mt-1 mb-0.5 first:mt-0 font-sans" {...props} />
  ),
  h5: ({ node, ...props }) => (
    <h5 className="text-xs font-medium text-zinc-300 mt-1 mb-0.5 first:mt-0 font-sans" {...props} />
  ),
  h6: ({ node, ...props }) => (
    <h6 className="text-xs font-medium text-zinc-400 mt-1 mb-0.5 first:mt-0 font-sans" {...props} />
  ),
  p: ({ node, ...props }) => (
    <p className="text-xs text-zinc-300 leading-relaxed mb-1.5 last:mb-0 whitespace-pre-line break-words font-sans" {...props} />
  ),
  strong: ({ node, ...props }) => (
    <strong className="font-semibold text-zinc-100" {...props} />
  ),
  em: ({ node, ...props }) => (
    <em className="italic text-zinc-200" {...props} />
  ),
  ul: ({ node, ...props }) => (
    <ul className="list-disc list-outside pl-4 space-y-1 text-xs text-zinc-300 my-1.5 marker:text-zinc-500 font-sans" {...props} />
  ),
  ol: ({ node, ...props }) => (
    <ol className="list-decimal list-outside pl-4 space-y-1 text-xs text-zinc-300 my-1.5 marker:text-zinc-500 font-sans" {...props} />
  ),
  li: ({ node, ...props }) => (
    <li className="text-xs leading-relaxed text-zinc-300 pl-0.5 font-sans" {...props} />
  ),
  hr: ({ node, ...props }) => (
    <hr className="my-2 border-zinc-800" {...props} />
  ),
  a: ({ node, ...props }) => (
    <a
      className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2 break-all transition-colors"
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    />
  ),
  blockquote: ({ node, ...props }) => (
    <blockquote className="border-l-2 border-emerald-600/60 pl-2.5 my-1.5 italic text-zinc-400 text-xs font-sans" {...props} />
  ),
  code: ({ node, className, children, ...props }) => (
    <code className="bg-zinc-950 px-1 py-0.5 rounded text-[11px] font-mono text-emerald-300 border border-zinc-800" {...props}>
      {children}
    </code>
  ),
  pre: ({ node, ...props }) => (
    <pre className="bg-zinc-950 p-2 rounded text-[11px] font-mono text-zinc-200 border border-zinc-800 overflow-x-auto my-1.5" {...props} />
  ),
};

export interface MarkdownRendererProps {
  content?: string | null;
  className?: string;
  components?: Components;
}

export function MarkdownRenderer({ content, className = '', components }: MarkdownRendererProps) {
  if (!content) return null;

  return (
    <div className={`break-words ${className}`}>
      <ReactMarkdown components={{ ...defaultMarkdownComponents, ...components }}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
