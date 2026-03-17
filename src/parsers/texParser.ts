import { v4 as uuidv4 } from 'uuid';
import { Question } from '../types';

export const normalizeTexContent = (text: string): string => {
  console.log('normalizeTexContent input type:', typeof text);
  if (typeof text === 'string') {
    console.log('normalizeTexContent input preview:', text.slice(0, 100));
  }
  if (typeof text !== 'string') {
    console.warn('normalizeTexContent received non-string input:', typeof text);
    return '';
  }
  let normalized = text;
  
  // Remove comments and metadata
  normalized = normalized.replace(/%.*$/gm, '');
  normalized = normalized.replace(/\[\s*Câu.*?\]/gi, '');
  normalized = normalized.replace(/\[\s*Bài.*?\]/gi, '');
  normalized = normalized.replace(/%\[.*?\]/gs, '');
  normalized = normalized.replace(/\[[\s\d\,\.]*(?:điểm)?\s*\]/gims, '');

  // Normalize delimiters
  normalized = normalized.replace(/\\\[(.*?)\\\]/gs, (_, p1) => `$${p1}$`);
  normalized = normalized.replace(/\\\((.*?)\\\)/gs, (_, p1) => `$${p1}$`);
  normalized = normalized.replace(/\$\$(.*?)\$\$/gs, (_, p1) => `$${p1}$`);
  normalized = normalized.replace(/\$\{(.*?)\}/gs, (_, p1) => `$${p1}$`);

  // Basic formatting
  normalized = normalized.replace(/\\mathbf\{((?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*)\}/gs, '$1');
  normalized = normalized.replace(/\\mathrm\{((?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*)\}/gs, '$1');
  normalized = normalized.replace(/\\textbf\{((?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*)\}/gs, '<strong>$1</strong>');
  normalized = normalized.replace(/=>/g, 'Suy ra');

  normalized = normalized.replace(/\\begin\{center\}(.*?)\\end\{center\}/gs, '<div class="text-center my-2">$1</div>');

  // Handle \heva - Use the stable HTML block structure
  normalized = normalized.replace(
    /\\heva\s*\{((?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*)\}/gs,
    (_, content) => {
      const lines = content
        .split('\\\\')
        .map((line: string) => line.replace(/&/g, '').trim())
        .filter(Boolean);
      
      const divs = lines
        .map((line: string) => `<div>$${line}$</div>`)
        .join('');

      return `<div class="heva-block"><div class="heva-brace">{</div><div class="heva-lines">${divs}</div></div>`;
    }
  );

  // Handle math environments - Convert to line blocks for stability
  const processMathEnv = (_: string, env: string, content: string) => {
    const lines = content.split('\\\\')
      .map(line => line.replace(/&/g, '').replace(/\\,/g, '').trim())
      .filter(line => line.length > 0);
    const divs = lines.map(line => `<div>$${line}$</div>`).join('');
    return `<div class="math-block-center text-center my-4 space-y-1">${divs}</div>`;
  };

  normalized = normalized.replace(/\${0,2}\s*\\begin\{(align|align\*|aligned|equation|equation\*|eqnarray|eqnarray\*)\}(.*?)\\end\{\1\}\s*\${0,2}/gs, processMathEnv);

  // Handle tabular - Convert to HTML table
  const processTabular = (_: string, content: string) => {
    const cleanContent = content.replace(/\\hline/g, '');
    const rows = cleanContent.split('\\\\').map(r => r.trim()).filter(r => r.length > 0);
    let html = '<div class="overflow-x-auto my-4"><table class="latex-table border-collapse border border-gray-300 min-w-full">';
    for (const row of rows) {
      html += '<tr>';
      const cells = row.split('&').map(c => c.trim());
      for (const cell of cells) {
        html += `<td class="border border-gray-300 p-2 text-center">${cell}</td>`;
      }
      html += '</tr>';
    }
    html += '</table></div>';
    return html;
  };
  normalized = normalized.replace(/\\begin\{tabular\}\{.*?\}(.*?)\\end\{tabular\}/gs, processTabular);

  normalized = normalized.replace(/\\begin\{enumerate\}/g, '<ol class="list-decimal ml-6 my-2">');
  normalized = normalized.replace(/\\end\{enumerate\}/g, '</ol>');
  normalized = normalized.replace(/\\begin\{itemize\}/g, '<ul class="list-disc ml-6 my-2">');
  normalized = normalized.replace(/\\end\{itemize\}/g, '</ul>');
  normalized = normalized.replace(/\\item/g, '<li>');

  normalized = normalized.replace(/\\\\/g, '<br/>');

  normalized = normalized
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(Boolean)
    .map(p => `<div class="mb-2">${p}</div>`)
    .join('');

  return normalized;
};

const extractLoigiai = (text: string): { statement: string, solution: string } => {
  if (typeof text !== 'string') return { statement: '', solution: '' };
  const loigiaiIndex = text.indexOf('\\loigiai');
  if (loigiaiIndex === -1) {
    return { statement: text.trim(), solution: "" };
  }

  const statement = text.substring(0, loigiaiIndex);
  
  let braceStartIndex = text.indexOf('{', loigiaiIndex);
  if (braceStartIndex === -1) {
    return { statement: statement.trim(), solution: "" };
  }

  let braceCount = 1;
  let endIndex = braceStartIndex + 1;
  
  while (braceCount > 0 && endIndex < text.length) {
    if (text[endIndex] === '{') {
      if (text[endIndex - 1] !== '\\') {
        braceCount++;
      }
    } else if (text[endIndex] === '}') {
      if (text[endIndex - 1] !== '\\') {
        braceCount--;
      }
    }
    endIndex++;
  }

  const solution = text.substring(braceStartIndex + 1, endIndex - 1);
  
  return { statement: statement.trim(), solution: solution.trim() };
};

const processTikzAndImages = async (text: string): Promise<{ html: string, tikzBlocks: string[], imageRefs: string[] }> => {
  if (typeof text !== 'string') return { html: '', tikzBlocks: [], imageRefs: [] };
  
  // Remove comments first to prevent extracting commented-out tikzpictures
  let html = text.replace(/(^|[^\\])%.*$/gm, '$1');
  
  const tikzBlocks: string[] = [];
  const imageRefs: string[] = [];

  // Extract tikzpicture
  const tikzRegex = /\\begin\{tikzpicture\}(.*?)\\end\{tikzpicture\}/gs;
  let match;
  
  while ((match = tikzRegex.exec(html)) !== null) {
    tikzBlocks.push(match[0]);
  }

  // Extract includegraphics
  const imgRegex = /\\includegraphics(?:\[.*?\])?\{([^}]+)\}/g;
  let imgMatch;
  while ((imgMatch = imgRegex.exec(html)) !== null) {
    imageRefs.push(imgMatch[1]);
  }

  // Normalize the remaining text
  html = normalizeTexContent(html);

  return { html, tikzBlocks, imageRefs };
};

export const parseTexFile = async (file: File): Promise<Question[]> => {
  console.log("received tex file", file.name);
  const text = await file.text();
  console.log("tex file loaded");

  const questions: Question[] = [];
  
  const envRegex = /\\begin\{(bt|ex|vd|bai|cau|problem|question)\}(.*?)\\end\{\1\}/gs;
  let match;
  let count = 1;
  let blocksFound = 0;

  while ((match = envRegex.exec(text)) !== null) {
    blocksFound++;
    const envType = match[1];
    const content = match[2];
    
    const { statement, solution } = extractLoigiai(content);
    
    let labelPrefix = "Câu";
    if (envType === "bt" || envType === "bai") labelPrefix = "Bài";
    else if (envType === "vd") labelPrefix = "Ví dụ";
    else if (envType === "problem" || envType === "question" || envType === "cau" || envType === "ex") labelPrefix = "Câu";

    let number = count;
    let label = `${labelPrefix} ${count}`;

    let rawStatement = statement;
    // Try to extract number from the statement if it exists like [Câu 1]
    const matchLabel = rawStatement.match(/(?:\\textbf\{)?\[?(?:Câu|Bài|Ví dụ)\s+(\d+)\]?[\.\:]?(?:\s*\([^)]+\))?(?:\})?/i);
    if (matchLabel) {
      number = parseInt(matchLabel[1], 10);
      label = matchLabel[0].replace(/\\textbf\{/i, '').replace(/\}/, '').trim();
    }

    const { html: statementHtml, tikzBlocks: sTikz, imageRefs: sImg } = await processTikzAndImages(rawStatement);
    const { html: solutionHtml, tikzBlocks: solTikz, imageRefs: solImg } = await processTikzAndImages(solution);

    questions.push({
      id: uuidv4(),
      label,
      number,
      statementRaw: statementHtml.trim(),
      solutionRaw: solutionHtml.trim(),
      sourceType: "tex",
      rawTikzBlocks: [...sTikz, ...solTikz],
      rawImageRefs: [...sImg, ...solImg]
    });
    
    count++;
  }

  // Fallback if no environments found
  if (blocksFound === 0) {
    console.log("No environments found, falling back to regex split");
    const DELIMITER = "___QUESTION_SPLIT___";
    const splitText = text.replace(/(?:^|\n)\s*(?:\\textbf\{)?\s*(\[?(?:Câu|Bài|Ví dụ)\s+\d+\]?[\.\:]?(?:\s*\([^)]+\))?)\s*(?:\})?/gi, (match, label) => {
      return `${DELIMITER}${label}`;
    });

    const rawBlocks = splitText.split(DELIMITER).filter(b => b.trim().length > 0);
    
    for (const block of rawBlocks) {
      if (!block.trim()) continue;
      
      let label = "Câu";
      let number = count;
      
      const matchLabel = block.match(/^(\[?(?:Câu|Bài|Ví dụ)\s+(\d+)\]?[\.\:]?(?:\s*\([^)]+\))?)/i);
      if (matchLabel) {
        label = matchLabel[1].trim();
        number = parseInt(matchLabel[2], 10);
      } else {
        label = `Câu ${count}`;
      }
      
      const { statement, solution } = extractLoigiai(block);
      
      const cleanStatement = statement.replace(/^(\[?(?:Câu|Bài|Ví dụ)\s+\d+\]?[\.\:]?(?:\s*\([^)]+\))?)\s*/i, '').trim();

      const { html: statementHtml, tikzBlocks: sTikz, imageRefs: sImg } = await processTikzAndImages(cleanStatement);
      const { html: solutionHtml, tikzBlocks: solTikz, imageRefs: solImg } = await processTikzAndImages(solution);

      questions.push({
        id: uuidv4(),
        label,
        number,
        statementRaw: statementHtml.trim(),
        solutionRaw: solutionHtml.trim(),
        sourceType: "tex",
        rawTikzBlocks: [...sTikz, ...solTikz],
        rawImageRefs: [...sImg, ...solImg]
      });
      
      count++;
    }
  }

  console.log("blocks found", blocksFound);
  console.log("questions parsed", questions.length);
  return questions;
};
