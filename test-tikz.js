async function test() {
  const source = `\\documentclass[tikz,border=2pt]{standalone}
\\usepackage[utf8]{inputenc}
\\usepackage[T5]{fontenc}
\\usepackage{amsmath,amssymb,amsfonts}
\\usetikzlibrary{calc,angles,quotes,intersections,through,backgrounds,patterns}
\\begin{document}
\\begin{tikzpicture}
\\draw (0,0) -- (1,1) node[above] {Điểm A};
\\end{tikzpicture}
\\end{document}`;

  const response = await fetch('https://tikz-fly.fly.dev/compile', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      source: source
    }),
  });

  const text = await response.text();
  console.log(response.status);
  console.log(text.substring(text.length - 500));
}

test();
