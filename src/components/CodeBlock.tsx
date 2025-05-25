import { Highlight, themes, Language, PrismTheme } from 'prism-react-renderer';

interface Props {
    children: string;
    language: Language;
    theme?: PrismTheme;
}

const CodeBlock = ({ children, language, theme }: Props) => {
    // Select the theme, defaulting to GitHub theme if none is provided.
    const selectedTheme = theme || themes.github;

    return (
        <Highlight code={children} language={language} theme={selectedTheme}>
            {({ className, style, tokens, getLineProps, getTokenProps }) => (
                <pre className={className} style={style}>
                    {tokens.map((line, i) => {
                        const props = { line }
                        return (
                            <div key={Math.random() + i} {...getLineProps({ ...props })}>
                                {line.map((token, x) => {
                                    const props = { token }
                                    return (
                                        <span key={Math.random() + x} {...getTokenProps({ ...props })} />
                                    )
                                })}
                            </div>
                        )
                    })}
                </pre>
            )}
        </Highlight>
    );
};

export default CodeBlock;
