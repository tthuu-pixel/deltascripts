import JSZip from 'jszip';
import { v4 as uuidv4 } from 'uuid';
import { Question } from '../types';

export const normalizeWordContent = (text: string): string => {
  console.log('normalizeWordContent input type:', typeof text);
  if (typeof text === 'string') {
    console.log('normalizeWordContent input preview:', text.slice(0, 100));
  }
  if (typeof text !== 'string') {
    console.warn('normalizeWordContent received non-string input:', typeof text);
    return '';
  }
  let normalized = text;
  
  // Remove comments and metadata
  normalized = normalized.replace(/%.*$/gm, '');
  normalized = normalized.replace(/\[\s*Câu.*?\]/gi, '');
  normalized = normalized.replace(/\[\s*Bài.*?\]/gi, '');
  normalized = normalized.replace(/%\[.*?\]/gs, '');
  normalized = normalized.replace(/\[[\s\d\,\.]*(?:điểm)?\s*\]/gims, '');

  // 1. Chuẩn hóa delimiter math
  normalized = normalized.replace(/\\\[(.*?)\\\]/gs, (_, p1) => `$${p1}$`);
  normalized = normalized.replace(/\\\((.*?)\\\)/gs, (_, p1) => `$${p1}$`);
  normalized = normalized.replace(/\$\$(.*?)\$\$/gs, (_, p1) => `$${p1}$`);
  normalized = normalized.replace(/\$\{(.*?)\}/gs, (_, p1) => `$${p1}$`);

  // 2. Làm sạch cơ bản
  normalized = normalized.replace(/\\mathbf\{((?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*)\}/gs, '$1');
  normalized = normalized.replace(/\\mathrm\{((?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*)\}/gs, '$1');
  normalized = normalized.replace(/\\textbf\{((?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*)\}/gs, '<strong>$1</strong>');
  normalized = normalized.replace(/=>/g, 'Suy ra');

  // 3. Xử lý align / aligned / equation / eqnarray
  const processMathEnv = (_: string, env: string, content: string) => {
    const lines = content.split('\\\\')
      .map(line => line.replace(/&/g, '').replace(/\\,/g, '').trim())
      .filter(line => line.length > 0);
    const divs = lines.map(line => `<div>$${line}$</div>`).join('');
    return `<div class="math-block-center text-center my-4 space-y-1">${divs}</div>`;
  };

  normalized = normalized.replace(/\${0,2}\s*\\begin\{(align|align\*|aligned|equation|equation\*|eqnarray|eqnarray\*)\}(.*?)\\end\{\1\}\s*\${0,2}/gs, processMathEnv);

  // 3.5. Xử lý \heva
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

  // 3.6. Xử lý \begin{center}
  normalized = normalized.replace(/\\begin\{center\}(.*?)\\end\{center\}/gs, '<div class="text-center my-2">$1</div>');

  // 4. Xử lý tabular
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
  normalized = normalized.replace(/\\begin\{tabular\}\{[^}]*\}(.*?)\\end\{tabular\}/gs, processTabular);

  // 5. Xử lý itemize / enumerate
  normalized = normalized.replace(/\\begin\{enumerate\}/g, '<ol class="list-decimal ml-6 my-2">');
  normalized = normalized.replace(/\\end\{enumerate\}/g, '</ol>');
  normalized = normalized.replace(/\\begin\{itemize\}/g, '<ul class="list-disc ml-6 my-2">');
  normalized = normalized.replace(/\\end\{itemize\}/g, '</ul>');
  normalized = normalized.replace(/\\item/g, '<li>');

  // 6. Xử lý \\ còn lại -> <br/>
  normalized = normalized.replace(/\\\\/g, '<br/>');

  return normalized;
};

export const parseWordFile = async (file: File): Promise<Question[]> => {
  try {
    console.log("received file", file.name);
    const zip = new JSZip();
    const arrayBuffer = await file.arrayBuffer();
    console.log("arrayBuffer loaded");
    await zip.loadAsync(arrayBuffer);

    const documentXml = await zip.file("word/document.xml")?.async("string");
    const relsXml = await zip.file("word/_rels/document.xml.rels")?.async("string");

    if (!documentXml) {
      throw new Error("Không tìm thấy word/document.xml");
    }
    console.log("document.xml loaded");

    const relsMap: Record<string, string> = {};
    if (relsXml) {
      const parser = new DOMParser();
      const relsDoc = parser.parseFromString(relsXml, "application/xml");
      const relationships = relsDoc.getElementsByTagName("Relationship");
      for (let i = 0; i < relationships.length; i++) {
        const rel = relationships[i];
        const id = rel.getAttribute("Id");
        const target = rel.getAttribute("Target");
        if (id && target) {
          relsMap[id] = target;
        }
      }
    }
    console.log("relationships parsed");

    const imagesMap: Record<string, string> = {};
    for (const [id, target] of Object.entries(relsMap)) {
      if (target.startsWith("media/")) {
        const imageFile = zip.file(`word/${target}`);
        if (imageFile) {
          const base64 = await imageFile.async("base64");
          const ext = target.split('.').pop()?.toLowerCase() || 'png';
          let mime = 'image/png';
          if (ext === 'jpeg' || ext === 'jpg') mime = 'image/jpeg';
          else if (ext === 'gif') mime = 'image/gif';
          else if (ext === 'svg') mime = 'image/svg+xml';
          imagesMap[id] = `data:${mime};base64,${base64}`;
        }
      }
    }
    console.log("images extracted");

    const parser = new DOMParser();
    const doc = parser.parseFromString(documentXml, "application/xml");
    
    const body = doc.getElementsByTagName("w:body")[0];
    let fullHtml = "";
    
    if (body) {
      for (let i = 0; i < body.childNodes.length; i++) {
        const node = body.childNodes[i];
        if (node.nodeName === "w:p") {
          let pText = "";
          const runs = (node as Element).getElementsByTagName("w:r");
          for (let j = 0; j < runs.length; j++) {
            const r = runs[j];
            const texts = r.getElementsByTagName("w:t");
            for (let k = 0; k < texts.length; k++) {
              pText += texts[k].textContent || "";
            }
            const drawings = r.getElementsByTagName("w:drawing");
            for (let k = 0; k < drawings.length; k++) {
              const blips = drawings[k].getElementsByTagName("a:blip");
              for (let l = 0; l < blips.length; l++) {
                const embedId = blips[l].getAttribute("r:embed");
                if (embedId && imagesMap[embedId]) {
                  pText += `<img src="${imagesMap[embedId]}" class="max-w-full h-auto my-2 rounded" />`;
                }
              }
            }
          }
          if (pText.trim() || pText.includes('<img')) {
            fullHtml += `<p class="mb-2">${pText}</p>\n`;
          }
        } else if (node.nodeName === "w:tbl") {
          let tableHtml = `<table class="border-collapse border border-gray-300 w-full my-4">\n`;
          const rows = (node as Element).getElementsByTagName("w:tr");
          for (let r = 0; r < rows.length; r++) {
            tableHtml += `  <tr>\n`;
            const cells = rows[r].getElementsByTagName("w:tc");
            for (let c = 0; c < cells.length; c++) {
              let cellText = "";
              const cellParas = cells[c].getElementsByTagName("w:p");
              for (let p = 0; p < cellParas.length; p++) {
                const runs = cellParas[p].getElementsByTagName("w:r");
                for (let j = 0; j < runs.length; j++) {
                  const texts = runs[j].getElementsByTagName("w:t");
                  for (let k = 0; k < texts.length; k++) {
                    cellText += texts[k].textContent || "";
                  }
                }
                cellText += "<br/>";
              }
              tableHtml += `    <td class="border border-gray-300 p-2">${cellText}</td>\n`;
            }
            tableHtml += `  </tr>\n`;
          }
          tableHtml += `</table>\n`;
          fullHtml += tableHtml;
        }
      }
    }
    console.log("html converted");
    
    const normalizedHtml = normalizeWordContent(fullHtml);
       const questions: Question[] = [];
    
    const DELIMITER = "___QUESTION_SPLIT___";
    // Improved regex to catch more variations of "Câu X" or "Bài X"
    const splitHtml = normalizedHtml.replace(/(?:^|<p[^>]*>|<div[^>]*>|<br\s*\/?>|<strong>)\s*(\[?(?:Câu|Bài)\s+\d+\]?[\.\:]?(?:\s*\([^)]+\))?)\s*(?:<\/strong>)?/gi, (match, label) => {
      return `${DELIMITER}${label}`;
    });

    const rawBlocks = splitHtml.split(DELIMITER).filter(b => b.trim().length > 0);
    const blocks: { label: string, number: number, content: string }[] = [];

    for (const block of rawBlocks) {
      if (!block.trim()) continue;
      
      let label = "Câu";
      let number = 1;
      
      const match = block.match(/^(\[?(?:Câu|Bài)\s+(\d+)\]?[\.\:]?(?:\s*\([^)]+\))?)/i);
      if (match) {
        label = match[1].trim();
        number = parseInt(match[2], 10);
      } else {
        label = `Câu ${blocks.length + 1}`;
        number = blocks.length + 1;
      }
      
      blocks.push({ label, number, content: block });
    }

    const solutionRegex = /(?:<p[^>]*>\s*|<br\s*\/?>\s*|<strong[^>]*>\s*|\s|^)(?:\[?LỜI GIẢI\]?|Lời giải:?|Hướng dẫn giải:?)(?:\s*<\/strong>)?(?:\s*<\/p>|\s*<br\s*\/?>|\s|$)/i;

    for (const block of blocks) {
      const parts = block.content.split(solutionRegex);
      
      let statementHtml = parts[0];
      let solutionHtml = "";
      
      if (parts.length > 1) {
        solutionHtml = parts.slice(1).join("").trim();
      }

      // Clean up the label from the start of the statement
      const cleanStatement = statementHtml.replace(/^(\[?(?:Câu|Bài)\s+\d+\]?[\.\:]?(?:\s*\([^)]+\))?)\s*/i, '').trim();

      questions.push({
        id: uuidv4(),
        label: block.label,
        number: block.number,
        statementRaw: cleanStatement,
        solutionRaw: solutionHtml,
        sourceType: "word"
      });
    }

    console.log("questions parsed", questions.length);
    return questions;

  } catch (error) {
    console.error("Error in parseWordFile:", error);
    throw error;
  }
};
