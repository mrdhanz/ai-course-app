'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { toPng, toSvg } from 'html-to-image'
import { CopyButton } from './CopyButton'
import { ZoomIn, ZoomOut, Download, Play, Maximize, Minimize } from 'lucide-react'
import mermaid from 'mermaid'
import { useTheme } from 'next-themes'

interface MermaidProps {
    chart: string
    className?: string;
}

// Common mermaid syntax fixes (omitted for brevity, assume it's the same as your provided code)
export const fixCommonErrors = (chart: string): string => {
    let fixed = chart

    if (new RegExp(/classDiagram/g).test(chart)) {
        // Step 1: Replace 'interface' keyword with 'class'
        fixed = fixed.replaceAll(/interface\s+([A-Za-z0-9_]+)\s*\{([\s\S]*?)\}/g, (match, className, content) => {
            if (className.startsWith('I') && /[A-Z]/.test(className[1])) { // Simple heuristic: starts with 'I' and next is uppercase
                return `class ${className} {\n        ${content.includes('<<interface>>') ? '' : '<<interface>>'}${content}\n    }`;
            } else {
                return match; // Return the original match if not an interface (to avoid adding stereotype to all classes)
            }
        });
    }

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

    // Fix diamond node syntax (new)
    fixed = fixed.replace(
        /(\w+)\{([^}]*)\}(?!")/g,
        (_, nodeId, content) => {
            return `${nodeId}{"${content.trim().replace(/"/g, '\\"')}"}`
        }
    )
    // 15. Fix malformed node declarations with parentheses (new)
    fixed = fixed.replace(
        /(\w+)\(("[^"]*"|\([^)]*\))\)+/g,
        (match, id, label) => {
            // Remove extra trailing parentheses
            const cleanLabel = label.replace(/\)+$/, '');
            return `${id}(${cleanLabel})`;
        }
    );

    fixed = fixed.replace(
        /(\w+)\s*---\s*([^-]+)\s*-->/g,
        (_, from, label) => `${from} --- ${label.trim().replace(" ", '')} -->`
    );

    if (new RegExp(/subgraph/g).test(chart)) {
        fixed = fixed.replace(
            /subgraph\s+([^\s"]+)\s+"([^"]+)"/g,
            'subgraph "$1 $2"'
        ).replace(/(subgraph\s+)(.*?)(?=(\s*[\n{]|$))/gm, (match, prefix, subgraphName) => {
            // Trim whitespace from the captured name for accurate checking
            const trimmedName = subgraphName.trim();

            if (trimmedName.includes('["') || trimmedName.includes('{"')) {
                return match;
            }
            // Check if the name is already quoted
            const isAlreadyQuoted = trimmedName.startsWith('"') && trimmedName.endsWith('"');

            // Check if the name contains characters that require quoting (spaces, or any non-alphanumeric, non-underscore character)
            // A more robust check for "special characters" in Mermaid names might be anything that isn't a letter, number, or underscore, or a simple dash.
            const needsQuoting = !/^[a-zA-Z0-9_]+$/.test(trimmedName); // True if contains anything other than basic alphanumeric/underscore

            if (!isAlreadyQuoted && needsQuoting) {
                // If it's not already quoted but needs quoting, add quotes
                return `${prefix}"${trimmedName}"`;
            }
            // Otherwise, return the original match (no change needed)
            return match;
        });
    }

    if (chart.includes('erDiagram')) {
        // Fix 1: Remove backslash-escaped quotes and potentially the preceding curly brace from relationship labels.
        // This regex looks for '||--o{"<Entity> : \"<relationship_label>\"' or '||--o{<Entity> : \"<relationship_label>\"'
        // It captures the entity name and the relationship label, then reconstructs it correctly.
        fixed = fixed.replace(/\|\|--o\{"?([a-zA-Z0-9_ ]+)\s*:\s*\\"([a-zA-Z0-9_ ]+)\\"/g, '||--o{$1 : $2');
        // Fix 2: Remove any remaining backslash-escaped quotes around relationship labels (e.g., : \"contains\")
        fixed = fixed.replace(/:\s*\\"([a-zA-Z0-9_ ]+)\\"/g, ': $1');
        // Fix 3: Correct stray double quotes at the end of attribute definitions within entity blocks
        // This targets patterns like 'int Level"}' and fixes them to 'int Level\n}'
        fixed = fixed.replace(/([a-zA-Z0-9_ ]+)"\s*}/g, '$1\n}');

        // Fix 4: Remove C-style single-line comments (//)
        fixed = fixed.replace(/\s*\/\/.*$/gm, '');
    }

    fixed = fixed.replace(/([A-Z0-9]+)(\[|\{)(.*?)(\]|\})/g, (_, nodeId, openingBracket, labelContent, closingBracket) => {
        let cleanedLabel = labelContent;

        // Remove any existing backslashes before quotes
        cleanedLabel = cleanedLabel.replace(/\\"/g, '"');
        cleanedLabel = cleanedLabel.replace(/\\'/g, "'");

        // Remove any immediately adjacent quotes at the very start/end of the label content
        // (e.g., if it was '["Text"]' and the inner "" are part of content)
        if (cleanedLabel.startsWith('"') && cleanedLabel.endsWith('"')) {
            cleanedLabel = cleanedLabel.substring(1, cleanedLabel.length - 1);
        }
        if (cleanedLabel.startsWith("'") && cleanedLabel.endsWith("'")) {
            cleanedLabel = cleanedLabel.substring(1, cleanedLabel.length - 1);
        }

        // Now, replace any remaining double quotes within the label with single quotes
        // This is the Mermaid standard for inner quotes.
        cleanedLabel = cleanedLabel.replace(/"/g, "'");

        // Reconstruct the node with consistent outer brackets/quotes
        // We ensure that the outer container uses the correct type based on the original structure.
        let finalNode;
        if (openingBracket === '[' && closingBracket === ']') {
            finalNode = `${nodeId}["${cleanedLabel}"]`;
        } else if (openingBracket === '{' && closingBracket === '}') {
            finalNode = `${nodeId}{"${cleanedLabel}"}`; // Use double quotes for consistency inside braces too, then fix inner
        } else {
            // Fallback for truly malformed, try to enclose in []
            finalNode = `${nodeId}["${cleanedLabel}"]`;
        }

        // Mermaid can sometimes handle mixed outer quotes depending on the shape,
        // but for consistency and to avoid the original mismatch, we enforce this.
        return finalNode;
    });
    fixed = fixed.replaceAll('&gt;', '>')
    fixed = fixed.replace(
        /^(\s*[A-Z0-9]+\s*(?:--?>>?|--?x|--?o|x--?|o--?)\s*[A-Z0-9]+:\s*)([\s\S]*?)$/gm,
        (_, arrowAndLabelPrefix, descriptionContent) => {
            // Remove any internal newlines or excessive whitespace from the description content
            // We want to preserve single spaces between words but remove multi-spaces and newlines.
            const cleanedDescription = descriptionContent
                                        .replace(/\s+/g, ' ') // Replace multiple spaces/newlines with a single space
                                        .trim().replace(';', ':'); // Trim leading/trailing whitespace

            return `${arrowAndLabelPrefix}${cleanedDescription}`;
        }
    );

    if(new RegExp(/(.) -- (.)\[/g).test(fixed)){
        fixed = fixed.replace(/(.) -- (.)\[/g, `$1 --> $2[`);
    }

    if(new RegExp(/(.) --> end/g).test(fixed)){
        fixed = fixed.replace(/(.) --> end/g, `$1 --> finish`);
    }

    fixed = fixed.replace(/(\d+)\.\s/g, (_, p1) => {
        return `${p1}.`;
    }).replaceAll('`', '');

    fixed = fixed.replace(/(\w+)\(\s*"?\\?"(.*?)(?:\\?"?["']?)?\s*\)/gm, '$1("$2")');

    fixed = fixed.replace(/(\w+)\[\s*"?\\?"(.*?)(?:\\?"?["']?)?\s*\]/gm, '$1["$2"]');
    

    return fixed
}

export function Mermaid({ chart, className = '' }: MermaidProps) {
    const { theme } = useTheme();
    const mermaidRef = useRef<HTMLDivElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const [view, setView] = useState<'diagram' | 'code'>('code')
    const [scale, setScale] = useState(1)
    const [parseError, setParseError] = useState(false)
    const [isFullscreen, setIsFullscreen] = useState(false);
    const fixedChart = fixCommonErrors(chart); // Apply fixes here

    const toggleFullscreen = useCallback(() => {
        if (containerRef.current) {
            if (!document.fullscreenElement) {
                containerRef.current.requestFullscreen().catch(err => {
                    console.error(`Error attempting to enable fullscreen mode: ${err.message} (${err.name})`);
                });
            } else {
                document.exitFullscreen();
            }
        }
    }, []);

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
        };
    }, []);

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
                        useMaxWidth: true
                    },
                    flowchart: {
                        useMaxWidth: true,
                        htmlLabels: true
                    },
                })

                await mermaid.parse(fixedChart)
                const { svg } = await mermaid.render('mermaid-graph', fixedChart)
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
                <div className="flex justify-between items-center mb-2 flex-wrap"> {/* Added flex-wrap */}
                    <div className="text-sm font-medium text-red-600 dark:text-red-400 mb-2 sm:mb-0"> {/* Adjusted margin */}
                        Mermaid Syntax Error
                    </div>
                    <div className="flex space-x-2"> {/* Ensured buttons stay together */}
                        <button
                            onClick={() => window.open('https://www.mermaidchart.com/play?utm_source=' + window.location.origin)}
                            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                            title="Playground"
                        >
                            <Play className="h-4 w-4" />
                        </button>
                        <CopyButton value={fixedChart} />
                    </div>
                </div>
                <pre className="text-red-600 dark:text-red-400 text-sm whitespace-pre-wrap overflow-auto max-h-96 w-full"> {/* Added w-full */}
                    {fixedChart}
                </pre>
            </div>
        )
    }

    return (
        <div
            ref={containerRef}
            className={`rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden ${className} ${isFullscreen ? 'fixed inset-0 z-50 flex flex-col' : ''}`}
        >
            <div className={`flex justify-between items-center border-b px-4 py-2 bg-gray-50 dark:bg-gray-800 flex-wrap ${isFullscreen ? 'sticky top-0' : ''}`}> {/* Added flex-wrap */}
                <div className="flex space-x-2 mb-2 sm:mb-0"> {/* Adjusted margin */}
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

                <div className="flex items-center space-x-2 flex-wrap"> {/* Added flex-wrap */}
                    {view === 'code' ? (
                        <button
                            onClick={() => window.open('https://www.mermaidchart.com/play?utm_source=' + window.location.origin)}
                            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                            title="Playground"
                        >
                            <Play className="h-4 w-4" />
                        </button>
                    ) : (
                        <>
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
                            <button
                                onClick={toggleFullscreen}
                                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                                title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                            >
                                {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                            </button>
                        </>
                    )}

                    <CopyButton value={fixedChart} />
                </div>
            </div>

            <div className={`overflow-auto bg-white dark:bg-gray-900 ${isFullscreen ? 'flex-grow' : ''}`}>
                {view === 'diagram' ? (
                    <div
                        className="mermaid-container"
                        style={{
                            minHeight: '200px',
                            resize: isFullscreen ? 'none' : 'vertical', // Allow vertical resize when not in fullscreen
                            overflow: 'auto',
                            height: isFullscreen ? '100%' : 'auto', // Take full height in fullscreen
                            width: '100%' // Ensure container takes full width
                        }}
                    >
                        <div className="mermaid" ref={mermaidRef} style={{
                            transform: `scale(${scale})`,
                            transformOrigin: 'top left',
                        }} />
                    </div>
                ) : (
                    <pre className="text-sm p-4 bg-gray-50 dark:bg-gray-800 rounded overflow-auto h-full w-full"> {/* h-full and w-full */}
                        {fixedChart}
                    </pre>
                )}
            </div>
        </div>
    )
}

export default Mermaid