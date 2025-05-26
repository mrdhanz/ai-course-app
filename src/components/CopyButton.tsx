// components/CopyButton.tsx
'use client'

import React, { useState } from 'react'
import { Copy, Check } from 'lucide-react'

export const CopyButton = ({ value }: { value: string }) => {
  const [copied, setCopied] = useState(false)

  const copyToClipboard = () => {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={copyToClipboard}
      className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
      title="Copy to clipboard"
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
    </button>
  )
}