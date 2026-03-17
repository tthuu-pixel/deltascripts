const API_BASE_URL = 'https://tikz-fly.fly.dev';

export const compileTikz = async (source: string): Promise<string> => {
  console.log("TikZ source length:", source.length);
  try {
    const fullSource = `\\documentclass[tikz,border=2pt]{standalone}
\\usepackage[utf8]{inputenc}
\\usepackage[T5]{fontenc}
\\usepackage{amsmath,amssymb,amsfonts,mathrsfs}
\\usepackage{tikz}
\\usepackage{tkz-euclide}
\\usetikzlibrary{calc,angles,quotes,intersections,through,backgrounds,patterns,shapes.geometric,arrows.meta}
\\usepackage{pgfplots}
\\pgfplotsset{compat=1.18}
\\begin{document}
${source}
\\end{document}`;

    const response = await fetch(`${API_BASE_URL}/compile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source: fullSource
      }),
    });

    console.log("TikZ compile response:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("TikZ API Error Response:", errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const contentType = response.headers.get('content-type');
    let base64 = '';

    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      base64 = data?.base64 || data?.image || data?.image_base64 || data?.png || data?.png_base64 || data?.result?.base64 || data?.output?.base64 || '';
    } else {
      const blob = await response.blob();
      base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          const b64 = result.includes(',') ? result.split(',')[1] : result;
          resolve(b64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }

    if (base64) {
      return `<img src="data:image/png;base64,${base64}" class="max-w-full my-2 rounded"/>`;
    } else {
      throw new Error("No image data returned");
    }
  } catch (error) {
    console.error("TikZ compilation error:", error);
    return `<div class="tikz-placeholder p-4 bg-gray-100 border border-gray-300 rounded text-center text-gray-500 italic my-2">[Hình minh họa TikZ]</div>`;
  }
};
