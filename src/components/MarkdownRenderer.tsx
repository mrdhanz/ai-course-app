// components/MarkdownRenderer.tsx
'use client'

import React, { useState, useEffect } from 'react' // Import useEffect
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import rehypeKatex from 'rehype-katex'
import rehypeRaw from 'rehype-raw';
import Script from 'next/script';
import 'katex/dist/katex.min.css'
import 'highlight.js/styles/github-dark.css' // Or your preferred highlight.js theme
import { cn } from '@/lib/utils' // Assuming this is for tailwind-merge or similar
import hljs from 'highlight.js/lib/core'
import dart from 'highlight.js/lib/languages/dart' // Import Dart language definition
import javascript from 'highlight.js/lib/languages/javascript'; // Example: Add another common language
import typescript from 'highlight.js/lib/languages/typescript';
import python from 'highlight.js/lib/languages/python';
import rust from 'highlight.js/lib/languages/rust';
import go from 'highlight.js/lib/languages/go';
import cpp from 'highlight.js/lib/languages/cpp';
import csharp from 'highlight.js/lib/languages/csharp';
import java from 'highlight.js/lib/languages/java';
import php from 'highlight.js/lib/languages/php';
import ruby from 'highlight.js/lib/languages/ruby';
import swift from 'highlight.js/lib/languages/swift';
import kotlin from 'highlight.js/lib/languages/kotlin';
import sql from 'highlight.js/lib/languages/sql';
import json from 'highlight.js/lib/languages/json';
import yaml from 'highlight.js/lib/languages/yaml';
import xml from 'highlight.js/lib/languages/xml';
import bash from 'highlight.js/lib/languages/bash';
import powershell from 'highlight.js/lib/languages/powershell';
import diff from 'highlight.js/lib/languages/diff';
import graphql from 'highlight.js/lib/languages/graphql';
import markdown from 'highlight.js/lib/languages/markdown';
import css from 'highlight.js/lib/languages/css';
import scss from 'highlight.js/lib/languages/scss';
import less from 'highlight.js/lib/languages/less';
import html from 'highlight.js/lib/languages/xml'; // HTML often uses XML for highlighting
import plaintext from 'highlight.js/lib/languages/plaintext';
import { useTheme } from 'next-themes'


// Register languages once when the component file is processed on the client side
// This ensures they are registered before rehypeHighlight tries to use them.
hljs.registerLanguage('dart', dart);
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('python', python);
hljs.registerLanguage('rust', rust);
hljs.registerLanguage('go', go);
hljs.registerLanguage('cpp', cpp);
hljs.registerLanguage('csharp', csharp);
hljs.registerLanguage('java', java);
hljs.registerLanguage('php', php);
hljs.registerLanguage('ruby', ruby);
hljs.registerLanguage('swift', swift);
hljs.registerLanguage('kotlin', kotlin);
hljs.registerLanguage('sql', sql);
hljs.registerLanguage('json', json);
hljs.registerLanguage('yaml', yaml);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('powershell', powershell);
hljs.registerLanguage('diff', diff);
hljs.registerLanguage('graphql', graphql);
hljs.registerLanguage('markdown', markdown);
hljs.registerLanguage('css', css);
hljs.registerLanguage('scss', scss);
hljs.registerLanguage('less', less);
hljs.registerLanguage('html', html); // Use xml for html
hljs.registerLanguage('plaintext', plaintext);


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
  if (React.isValidElement(node)) {
    // @ts-ignore - children prop exists on ReactElement
    return reactNodeToString(node.props.children)
  }
  return ''
}

export function MarkdownRenderer({ content, isGenerated, className }: MarkdownRendererProps) {
  const {theme} = useTheme();
  useEffect(() => {
    const renderMermaid = () => {
      // @ts-ignore
      if (typeof window !== 'undefined' && window.mermaid) {
      // @ts-ignore
        window.mermaid.initialize({ startOnLoad: true });
      // @ts-ignore
        window.mermaid.contentLoaded(); // Re-scans for mermaid diagrams
      } else {
        // If mermaid isn't ready yet, try again
        setTimeout(renderMermaid, 100);
      }
    };

    if(isGenerated || theme)
      renderMermaid();

    // You might also consider using a custom renderer for code blocks
    // within ReactMarkdown to have more control over each diagram.
  }, [theme, isGenerated]); // Re-run if content changes
  return (
    <div className={cn('prose dark:prose-invert max-w-none', className)}>
      {/* Load Mermaid.js from CDN or local bundle */}
      <Script
        src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js" // Use a specific version
        strategy="afterInteractive" // Load after hydration, in the browser
        onError={(e) => console.error('Mermaid script failed to load', e)}
      />

      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        // Pass the hljs instance directly to rehypeHighlight
        rehypePlugins={[[rehypeHighlight, { highlight: hljs }], rehypeKatex, rehypeRaw]}
        components={{
          p: ({ node, ...props }) => (
            <p className="mb-4 leading-relaxed" {...props} />
          ),
          h1: ({ node, ...props }) => (
            <h1 className="text-3xl font-bold mb-4 mt-8" {...props} />
          ),
          h2: ({ node, ...props }) => (
            <h2 className="text-2xl font-bold mb-3 mt-6" {...props} />
          ),
          h3: ({ node, ...props }) => (
            <h3 className="text-xl font-bold mb-2 mt-4" {...props} />
          ),
          ul: ({ node, ...props }) => (
            <ul className="list-disc pl-6 mb-4" {...props} />
          ),
          ol: ({ node, ...props }) => (
            <ol className="list-decimal pl-6 mb-4" {...props} />
          ),
          li: ({ node, ...props }) => (
            <li className="mb-2" {...props} />
          ),
          blockquote: ({ node, ...props }) => (
            <blockquote
              className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 italic mb-4"
              {...props}
            />
          ),
          code: ({ node, className, children, ...props }) => {
            // Fix: Initialize useState with a valid state, e.g., false
            const [copied, setCopied] = useState(false)

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
            if (match?.[1] === 'mermaid') {
              // Mermaid expects content inside <pre class="mermaid">
              return (
                <pre className="mermaid">
                  {String(children).replace(/\n$/, '')}
                </pre>
              );
            }
            // Check if this is inline code by looking at the parent node
            // rehype-highlight adds `hljs` class to code blocks. Inline code doesn't get this.
            // A more robust check might be `match` for block code or checking for `node.properties.className?.includes('hljs')`
            const isBlock = match && match[1] && className?.includes('hljs');

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
          a: ({ node, ...props }) => (
            <a
              className="text-blue-600 dark:text-blue-400 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            />
          ),
          table: ({ node, ...props }) => (
            <div className="overflow-x-auto">
              <table className="min-w-full mb-4" {...props} />
            </div>
          ),
          th: ({ node, ...props }) => (
            <th
              className="border px-4 py-2 text-left bg-gray-100 dark:bg-gray-800"
              {...props}
            />
          ),
          td: ({ node, ...props }) => (
            <td className="border px-4 py-2" {...props} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}