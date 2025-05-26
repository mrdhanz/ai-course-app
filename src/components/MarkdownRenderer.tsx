// components/MarkdownRenderer.tsx
'use client'

import React, { useState } from 'react' // Import useEffect
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import rehypeKatex from 'rehype-katex'
import rehypeRaw from 'rehype-raw';
import 'katex/dist/katex.min.css'
import 'highlight.js/styles/github-dark.css' // Or your preferred highlight.js theme
import { cn } from '@/lib/utils' // Assuming this is for tailwind-merge or similar
import Mermaid, { fixCommonErrors } from './MermaidChart'

interface MarkdownRendererProps {
  content: string
  isGenerated: boolean
  className?: string
}

// Helper function to extract text content from React nodes
const reactNodeToString = (node: React.ReactNode): string => {
  if (typeof node === 'string') return node
  if (typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(reactNodeToString).join('')
  if (React.isValidElement(node) && node.props && typeof node.props === 'object' && 'children' in node.props ) {
    return reactNodeToString(node.props.children as React.ReactNode)
  }
  return ''
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  // Fix: Initialize useState with a valid state, e.g., false
  const [copied, setCopied] = useState(false)
  return (
    <div className={cn('prose dark:prose-invert max-w-none', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        // Pass the hljs instance directly to rehypeHighlight
        rehypePlugins={[rehypeHighlight, rehypeKatex, rehypeRaw]}
        components={{
          p: ({ ...props }) => (
            <p className="mb-4 leading-relaxed" {...props} />
          ),
          h1: ({ ...props }) => (
            <h1 className="text-3xl font-bold mb-4 mt-8" {...props} />
          ),
          h2: ({ ...props }) => (
            <h2 className="text-2xl font-bold mb-3 mt-6" {...props} />
          ),
          h3: ({ ...props }) => (
            <h3 className="text-xl font-bold mb-2 mt-4" {...props} />
          ),
          ul: ({ ...props }) => (
            <ul className="list-disc pl-6 mb-4" {...props} />
          ),
          ol: ({ ...props }) => (
            <ol className="list-decimal pl-6 mb-4" {...props} />
          ),
          li: ({ ...props }) => (
            <li className="mb-2" {...props} />
          ),
          blockquote: ({ ...props }) => (
            <blockquote
              className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 italic mb-4"
              {...props}
            />
          ),
          code: ({ className, children, ...props }) => {

            const copyToClipboard = () => {
              // Ensure children is not empty before trying to copy
              const textToCopy = reactNodeToString(children);
              if (textToCopy) {
                navigator.clipboard.writeText(textToCopy)
                setCopied(true)
                setTimeout(() => setCopied(false), 2000)
              }
            }
            const match = /language-(\w+)/.exec(className || '')
            // Check if this is inline code by looking at the parent node
            // rehype-highlight adds `hljs` class to code blocks. Inline code doesn't get this.
            // A more robust check might be `match` for block code or checking for `node.properties.className?.includes('hljs')`
            const isBlock = match && match[1] && className?.includes('hljs');
            if (isBlock && match && match?.[1] === 'mermaid') {
              return (
                <Mermaid chart={fixCommonErrors(String(children))} />
              );
            }

            if (!isBlock) { // If it's not a block code, treat as inline
              return (
                <code
                  className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm"
                  {...props}
                >
                  {children}
                </code>
              )
            }

            // Block code rendering
            return (
              <div className="relative my-4">
                {match && (
                  <div className="text-xs text-gray-400 absolute top-2 left-2 z-[1]"> {/* Add z-index to ensure visibility */}
                    {match[1]}
                  </div>
                )}
                <button
                  onClick={copyToClipboard}
                  className="absolute right-2 top-2 p-1 rounded bg-gray-700 text-white text-xs z-[1]" // Add z-index
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
                <pre className="rounded-lg overflow-x-auto p-4 bg-gray-900">
                  <code className={className} {...props}>
                    {children}
                  </code>
                </pre>
              </div>
            )
          },
          a: ({ ...props }) => (
            <a
              className="text-blue-600 dark:text-blue-400 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            />
          ),
          table: ({ ...props }) => (
            <div className="overflow-x-auto">
              <table className="min-w-full mb-4" {...props} />
            </div>
          ),
          th: ({ ...props }) => (
            <th
              className="border px-4 py-2 text-left bg-gray-100 dark:bg-gray-800"
              {...props}
            />
          ),
          td: ({ ...props }) => (
            <td className="border px-4 py-2" {...props} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}