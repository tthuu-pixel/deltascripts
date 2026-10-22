import React, { useEffect, useMemo, useRef } from 'react';
import DOMPurify from 'dompurify';
import renderMathInElement from 'katex/contrib/auto-render';
import 'katex/dist/katex.min.css';
import { prepareContent } from '../utils/displayContent';
import { escapeHtml } from '../parsers/texParser';
import { compileTikz } from '../services/compileTikz';
import { drawingPreamble } from '../../shared/texSyntax';

const LatexContent = React.memo(
  ({
    html,
    className = '',
    plainText = false,
    preamble = '',
    context = '',
    renderFigures = true,
  }: {
    html: string;
    className?: string;
    plainText?: boolean;
    preamble?: string;
    context?: string;
    renderFigures?: boolean;
  }) => {
    const ref = useRef<HTMLDivElement>(null);
    const prepared = useMemo(() => {
      if (plainText) return { html: escapeHtml(html), tikz: [], error: '' };
      try {
        return {
          ...prepareContent(html, [preamble, drawingPreamble(context)].filter(Boolean).join('\n')),
          error: '',
        };
      } catch (error) {
        return { html: escapeHtml(html), tikz: [], error: (error as Error).message };
      }
    }, [html, plainText, preamble, context]);
    useEffect(() => {
      const root = ref.current;
      if (!root) return;
      let active = true;
      root.innerHTML = DOMPurify.sanitize(prepared.html, {
        USE_PROFILES: { html: true },
        FORBID_TAGS: ['style', 'form', 'input', 'button', 'iframe'],
        FORBID_ATTR: ['style'],
      });
      renderMathInElement(root, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '$', right: '$', display: false },
          { left: '\\(', right: '\\)', display: false },
          { left: '\\[', right: '\\]', display: true },
        ],
        throwOnError: false,
        strict: false,
        trust: false,
        macros: {
          '\\heva': '\\left\\{\\begin{aligned}#1\\end{aligned}\\right.',
          '\\hoac': '\\left[\\begin{aligned}#1\\end{aligned}\\right.',
        },
      });
      for (const block of prepared.tikz) {
        const target = root.querySelector<HTMLElement>(`[data-tikz-id="${block.key}"]`);
        if (!target) continue;
        if (!renderFigures) {
          target.textContent = 'Hình minh họa — mở đề bài để xem.';
          continue;
        }
        const show = () => {
          void compileTikz(block.source)
            .then((result) => {
              if (active) target.innerHTML = DOMPurify.sanitize(result);
            })
            .catch((error: Error) => {
              if (!active) return;
              target.textContent = (error.message || 'Chưa tải được hình TikZ.') + ' ';
              const button = document.createElement('button');
              button.type = 'button';
              button.textContent = 'Thử lại';
              button.className = 'text-button';
              button.onclick = () => {
                button.disabled = true;
                show();
              };
              target.appendChild(button);
            });
        };
        show();
      }
      return () => {
        active = false;
      };
    }, [prepared, renderFigures]);
    return (
      <>
        {prepared.error && (
          <p role="alert" className="text-amber-700">
            {prepared.error}
          </p>
        )}
        <div
          ref={ref}
          className={`math-content max-w-none ${plainText ? 'whitespace-pre-wrap' : ''} ${className}`}
        />
      </>
    );
  },
);
export default LatexContent;
