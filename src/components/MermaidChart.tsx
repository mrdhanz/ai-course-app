// components/Mermaid.tsx
'use client'

import React, { useEffect, useRef, useState } from 'react'
import { toPng, toSvg } from 'html-to-image'
import { CopyButton } from './CopyButton'
import { ZoomIn, ZoomOut, Download, Play } from 'lucide-react'
import mermaid from 'mermaid'
import { useTheme } from 'next-themes'

interface MermaidProps {
    chart: string
    className?: string;
}

// Common mermaid syntax fixes
export const fixCommonErrors = (chart: string): string => {
    let fixed = chart

    // 1. Fix state diagram cycles by ensuring no state is its own parent
    if (chart.includes('stateDiagram')) {
        fixed = fixed.replace(/state (\w+)\s*{\s*\1/g, (_, stateName) => {
            return `state ${stateName} {\n    [*] --> ${stateName}Entry\n    ${stateName}Entry`
        })
    }

    // 2. Fix enum declarations
    fixed = fixed.replace(/enum\s+(\w+)\s*{/g, 'class $1 {\n    <<enumeration>>')

    // 3. Fix arrow directions
    fixed = fixed.replace(/<\|--/g, '<|--').replace(/\|>--/g, '|>--')

    // 4. Ensure proper spacing in relationships
    fixed = fixed.replace(/"\s*(\d+)\s*"\s*([*o])?--\s*"\s*(\d+)\s*"\s*([*o])?/g, '"$1" $2-- "$3" $4')

    // 5. Add missing initial/terminal states
    if (chart.includes('stateDiagram') && !chart.includes('[*]')) {
        fixed = fixed.replace(/(stateDiagram[^\{]*\{)/, '$1\n    [*] --> InitialState\n    ')
    }

    // 7. Fix node labels with special characters (new)
    fixed = fixed.replace(
        /(\w+)\[(.*?)\]/g,
        (_, id, label) => `${id}["${label.replace(/"/g, '\\"')}"]`
    )

    // Fix edge labels with special characters (new)
    fixed = fixed.replace(
        /\|(.*?)\|/g,
        (_, label) => `|"${label.trim().replace(/"/g, '\\"')}"|`
    )


    // Fix complex edge labels with multiple connectors
    fixed = fixed.replace(
        /(\w+)\s*(--|==)\s*([^->|]+)\s*(--|==)>(\|.*?\|)\s*(\w+)/g,
        (_, from, conn1, mid, conn2, label, to) => {
            return `${from} ${conn1}${conn2}>${label} ${to}\n    ${from} -. "${mid}" .-> ${from}`
        }
    )
    // 11. Fix parentheses in node definitions (new)
    fixed = fixed.replace(/(\w+)\((.*?)\)/g, (_, id, label) =>
        `${id}("${label.replace(/"/g, '\\"')}")`
    )
    fixed = fixed.replace(/\|\s*""\s*\|/g, '||') // Fix empty quote relationship syntax

    return fixed
}

export function Mermaid({ chart, className = '' }: MermaidProps) {
    const { theme } = useTheme();
    const mermaidRef = useRef<HTMLDivElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const [view, setView] = useState<'diagram' | 'code'>('code')
    const [scale, setScale] = useState(1)
    const [parseError, setParseError] = useState(false)
    const fixedChart = chart

    useEffect(() => {
        if (view !== 'diagram' || !fixedChart || !mermaidRef.current) return

        const renderDiagram = async () => {
            try {
                mermaid.initialize({
                    startOnLoad: false,
                    theme: theme === 'dark' ? 'dark' : 'default',
                    securityLevel: 'loose',
                    fontFamily: 'inherit',
                    markdownAutoWrap: true,
                    darkMode: theme === 'dark',
                    wrap: true,
                    er: {
                        useMaxWidth: true,  // Makes ER diagrams responsive
                        diagramPadding: 15
                    },
                    flowchart: {
                        useMaxWidth: true,
                        htmlLabels: true    // Enables text wrapping
                    }
                })

                await mermaid.parse(fixedChart)
                const { svg, } = await mermaid.render('mermaid-graph', fixedChart)
                mermaidRef.current!.innerHTML = svg
                setParseError(false)
            } catch (error) {
                console.error('Mermaid error:', error)
                setParseError(true)
            }
        }

        renderDiagram()
    }, [fixedChart, view, theme])

    const handleDownload = async (format: 'png' | 'svg') => {
        if (!mermaidRef.current) return

        try {
            const dataUrl = format === 'png'
                ? await toPng(mermaidRef.current)
                : await toSvg(mermaidRef.current)

            const link = document.createElement('a')
            link.download = `diagram.${format}`
            link.href = dataUrl
            link.click()
        } catch (error) {
            console.error('Download failed:', error)
        }
    }

    const zoomIn = () => setScale(prev => Math.min(prev + 0.1, 2))
    const zoomOut = () => setScale(prev => Math.max(prev - 0.1, 0.5))
    const resetZoom = () => setScale(1)

    if (parseError) {
        return (
            <div className={`bg-red-50 dark:bg-red-900/10 p-4 rounded-lg border border-red-200 dark:border-red-800 ${className}`}>
                <div className="flex justify-between items-center mb-2">
                    <div className="text-sm font-medium text-red-600 dark:text-red-400">
                        Mermaid Syntax Error
                    </div>
                    <CopyButton value={fixedChart} />
                </div>
                <pre className="text-red-600 dark:text-red-400 text-sm whitespace-pre-wrap overflow-auto max-h-96">
                    {fixedChart}
                </pre>
            </div>
        )
    }

    return (
        <div
            ref={containerRef}
            className={`rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden ${className}`}
        >
            <div className="flex justify-between items-center border-b px-4 py-2 bg-gray-50 dark:bg-gray-800">
                <div className="flex space-x-2">
                    <button
                        onClick={() => setView('diagram')}
                        className={`px-3 py-1 text-sm rounded-md ${view === 'diagram' ? 'bg-primary text-primary-foreground' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                    >
                        Diagram
                    </button>
                    <button
                        onClick={() => setView('code')}
                        className={`px-3 py-1 text-sm rounded-md ${view === 'code' ? 'bg-primary text-primary-foreground' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                    >
                        Code
                    </button>
                </div>

                <div className="flex items-center space-x-2">
                    {view === 'code' ? <button
                        onClick={()=> window.open('https://www.mermaidchart.com/play?utm_source='+window.location.origin)}
                        className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                        title="Playground"
                    >
                        <Play className="h-4 w-4" />
                    </button> : <></>}
                    
                    <button
                        onClick={zoomOut}
                        className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                        title="Zoom Out"
                    >
                        <ZoomOut className="h-4 w-4" />
                    </button>
                    <button
                        onClick={resetZoom}
                        className="text-xs px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                        {Math.round(scale * 100)}%
                    </button>
                    <button
                        onClick={zoomIn}
                        className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                        title="Zoom In"
                    >
                        <ZoomIn className="h-4 w-4" />
                    </button>

                    <div className="relative group">
                        <button
                            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                            title="Download"
                        >
                            <Download className="h-4 w-4" />
                        </button>
                        <div className="absolute right-0 mt-1 w-32 bg-white dark:bg-gray-800 shadow-lg rounded-md py-1 z-10 hidden group-hover:block">
                            <button
                                onClick={() => handleDownload('png')}
                                className="block w-full text-left px-4 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm"
                            >
                                Download PNG
                            </button>
                            <button
                                onClick={() => handleDownload('svg')}
                                className="block w-full text-left px-4 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm"
                            >
                                Download SVG
                            </button>
                        </div>
                    </div>

                    <CopyButton value={fixedChart} />
                </div>
            </div>

            <div className="overflow-auto  bg-white dark:bg-gray-900">
                {view === 'diagram' ? (
                    <div
                        className="mermaid-container"
                        style={{
                            minHeight: '200px',
                            resize: 'both',
                            overflow: 'auto'
                        }}
                    >
                        <div className="mermaid" ref={mermaidRef} style={{
                            transform: `scale(${scale})`,
                            transformOrigin: 'top left'
                        }} />
                    </div>
                ) : (
                    <pre className="text-sm p-4 bg-gray-50 dark:bg-gray-800 rounded overflow-auto max-h-96">
                        {fixedChart}
                    </pre>
                )}
            </div>
        </div>
    )
}


export default Mermaid