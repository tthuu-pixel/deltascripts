import React, { useEffect, useRef } from 'react';
import renderMathInElement from 'katex/contrib/auto-render';
import 'katex/dist/katex.min.css';

interface LatexContentProps {
  html: string;
  className?: string;
}

const LatexContent: React.FC<LatexContentProps> = React.memo(({ html, className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      try {
        renderMathInElement(containerRef.current, {
          delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '$', right: '$', display: false },
            { left: '\\(', right: '\\)', display: false },
            { left: '\\[', right: '\\]', display: true }
          ],
          throwOnError: false,
          errorColor: '#cc0000',
          strict: false,
          trust: true
        });
      } catch (error) {
        console.error("KaTeX render error:", error);
      }
    }
  }, [html]);

  return (
    <div 
      ref={containerRef} 
      className={`prose max-w-none ${className}`}
      dangerouslySetInnerHTML={{ __html: html }} 
    />
  );
});

export default LatexContent;
