// components/MarkdownRenderer.tsx
'use client'

import React, { useEffect } from 'react' // Import useEffect
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import rehypeKatex from 'rehype-katex'
import rehypeRaw from 'rehype-raw';
import 'katex/dist/katex.min.css'
import { cn } from '@/lib/utils' // Assuming this is for tailwind-merge or similar
import Mermaid, { fixCommonErrors } from './MermaidChart'
import { useTheme } from 'next-themes'
import Link from 'next/link'
import { CopyButton } from './CopyButton'

interface MarkdownRendererProps {
  content: string
  className?: string
}

// Helper function to extract text content from React nodes
const reactNodeToString = (node: React.ReactNode): string => {
  if (typeof node === 'string') return node
  if (typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(reactNodeToString).join('')
  if (React.isValidElement(node) && node.props && typeof node.props === 'object' && 'children' in node.props) {
    return reactNodeToString(node.props.children as React.ReactNode)
  }
  return ''
}

// Function to check for Arabic characters
const containsArabic = (text: string) => {
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text)
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  const { theme } = useTheme();
  // Fix: Initialize useState with a valid state, e.g., false
  useEffect(() => {
    const linkId = 'highlight-js-theme';

    const applyTheme = () => {
      const existingLink = document.getElementById(linkId) as HTMLLinkElement;
      const isDarkMode = theme === 'dark'; // Assuming 'dark' class is on <html> or <body>

      const w = isDarkMode ? 'atom-one-dark.css' : 'atom-one-light.css'; // Choose your light theme

      if (existingLink) {
        existingLink.href = `/styles/${w}`; // Update existing link
      } else {
        const link = document.createElement('link');
        link.id = linkId;
        link.rel = 'stylesheet';
        link.href = `/styles/${w}`;
        document.head.appendChild(link);
      }
    };

    // Apply theme on component mount
    applyTheme();

    // Set up a MutationObserver to listen for changes to the 'dark' class
    const observer = new MutationObserver(applyTheme);
    // Observe the <html> element for attribute changes (specifically 'class')
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    // Clean up observer on component unmount
    return () => {
      observer.disconnect();
    };
  }, [theme]); // Empty dependency array means this effect runs once on mount and cleans up on unmount

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
            const codeContent = reactNodeToString(children);
            const match = /language-(\w+)/.exec(className || '')
            if (match && match?.[1] === 'markdown') return <MarkdownRenderer content={codeContent} />
            // Check if this is inline code by looking at the parent node
            // rehype-highlight adds `hljs` class to code blocks. Inline code doesn't get this.
            // A more robust check might be `match` for block code or checking for `node.properties.className?.includes('hljs')`
            const isBlock = match && match[1] && className?.includes('hljs');

            if (isBlock && match && match?.[1] === 'mermaid') {
              return (
                <Mermaid chart={fixCommonErrors(String(children))} />
              );
            }
            const isArabic = containsArabic(codeContent);

            if (isBlock && (match?.[1] === 'arabic' || isArabic)) {

              return (
                <div className="relative my-4">
                  <CopyButton value={codeContent} className='absolute left-2 top-2 p-1 rounded bg-gray-700 text-white text-xs z-[1]'/>
                  <div className={cn(
                    "my-6 p-6 border-2 border-green-500 rounded-lg bg-green-50 dark:bg-green-950/20",
                    'font-arabic',
                    "text-xl leading-relaxed text-right direction-rtl flex flex-col items-end", // Large font, RTL
                    "quran-ayat-container rounded-lg overflow-x-auto p-4" // Custom class for additional CSS
                  )}>
                    {reactNodeToString(children).split('\n').map((c, key) => (<span key={key} className="block mb-2 last:mb-0 leading-relaxed">{c}</span>))}
                  </div>
                </div>
              );
            }

            if (!isBlock) { // If it's not a block code, treat as 
              const httpHttpsLinkRegex = /^(https?:\/\/)?(www\.)?([a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.[a-zA-Z]{2,6}(?:\.[a-zA-Z]{2,6})*)(?:[\/\w .-]*)*\/?$/igm;
              let linkText = String(children);
              if(httpHttpsLinkRegex.test(linkText)){
                if (!linkText.startsWith('http://') && !linkText.startsWith('https://')) {
                    linkText = `http://${linkText}`;
                }
                return (<Link href={linkText} target="_blank" rel="noopener noreferrer" className="text-islamic-green line-clamp-2 dark:text-soft-blue hover:underline">{children}</Link>)
              }
              return (
                <code
                  className={cn(
                    "bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm",
                    {
                      'font-amiri': isArabic,
                    }
                  )}
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
                  <div className="text-xs text-gray-400 absolute top-2 right-10 z-[1]"> {/* Add z-index to ensure visibility */}
                    {match[1]}
                  </div>
                )}
                <CopyButton value={codeContent} className="absolute right-2 top-2 p-1 z-[1]"/>
                <pre className="rounded-lg overflow-x-auto p-4 bg-gray-50 dark:bg-gray-800">
                  <code {...props}>
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