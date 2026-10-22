# Vẽ biểu đồ bằng TikZ

Mục lục: preamble; nguyên tắc; cột đơn; cột ghép; đường một/hai chuỗi; biểu đồ tròn.

## Preamble

```latex
\usepackage{tikz}
\usetikzlibrary{calc,intersections,angles,quotes,patterns,through}
```

## Nguyên tắc chung

- Với trục số/thời gian, khoảng cách phải tỉ lệ với giá trị/thời gian thật; chỉ cách đều nếu các giá trị cách đều. Với nhóm phân loại, các nhóm có thể cách đều và không cần mốc 0 giả. Cột nằm giữa vị trí nhóm; trục số có mũi tên và nhãn ở cuối.
- Trục tung có vạch ngang song song trục hoành, giá trị tăng đều, giá trị lớn nhất lớn hơn nhưng sát giá trị lớn nhất của dữ liệu; số trên trục tung màu đen.
- **Chiều cao cột = giá trị ghi trên cột = giá trị trên trục tung.** Không dùng “giá trị giả”.
- Mỗi cột/điểm ghi giá trị số trong `$...$`, ưu tiên phía trên; có thể dịch nhãn điểm để tránh đường và các nhãn khác. Dữ liệu và biểu thức tọa độ PGF vẫn dùng cú pháp máy, không bọc `$` hoặc đổi dấu thập phân bên trong phép tính.
- Tên biểu đồ in đậm, canh giữa; biểu đồ cột đặt dưới trục hoành, biểu đồ đường và tròn đặt phía trên.

## 1. Biểu đồ cột đơn

```latex
\begin{center}
	\begin{tikzpicture}[>=stealth,declare function={kc=2.4; rc=1.2; kcy=0.25;}]
		\foreach \yt in {5,10,15,20,25}{
			\draw[gray!35] (0,{\yt*kcy}) node[left,text=black]{$\yt$} -- +(9,0);
		}
		\foreach \i/\yt in {1/10,2/15,3/20}{
			\fill[blue!60] ({\i*kc-0.5*rc},0) rectangle +(rc,{\yt*kcy});
			\node[above=2pt] at (\i*kc,{\yt*kcy}) {$\yt$};
		}
		\foreach \i in {0,1,2,3}{
			\path (\i*kc,0) node[below=3pt]{$\i$};
		}
		\draw[->] (0,0)--({3*kc+0.5*kc},0) node[below right=4pt]{Tên trục hoành};
		\draw[->] (0,0)--(0,{26*kcy}) node[above left]{Tên trục tung};
		\node[below=14pt, font=\bfseries] at ({(3*kc+0.5*kc)/2},0) {Tên biểu đồ};
	\end{tikzpicture}
\end{center}
```

## 2. Biểu đồ cột ghép

```latex
\begin{center}
	\begin{tikzpicture}[>=stealth,declare function={kc=2.6; rc=0.8; kcy=0.1;}]
		\foreach \yt in {10,20,30,40,50,60}{
			\draw[gray!35] (0,{\yt*kcy}) node[left,text=black]{$\yt$} -- +(9.2,0);
		}
		\foreach \i/\a/\b in {1/10/20,2/12/25,3/14/30}{
			\draw[pattern=north east lines] ({\i*kc-rc},0) rectangle +(rc,{\a*kcy});
			\node[above=2pt] at ({\i*kc-0.5*rc},{\a*kcy}) {$\a$};
			\draw[blue,pattern=vertical lines,pattern color=blue] ({\i*kc},0) rectangle +(rc,{\b*kcy});
			\node[above=2pt] at ({\i*kc+0.5*rc},{\b*kcy}) {$\b$};
		}
		\foreach \i in {0,1,2,3}{
			\node[below=3pt] at (\i*kc,0) {$\i$};
		}
		\draw[->] (0,0)--({3*kc+0.7*kc},0) node[below right=4pt]{Tên trục hoành};
		\draw[->] (0,0)--(0,{62*kcy}) node[above left]{Tên trục tung};
		\node[below=16pt,font=\bfseries] at ({(3*kc+0.7*kc)/2},0) {Tên biểu đồ};
	\end{tikzpicture}
\end{center}
```

## 3. Biểu đồ đường (một đường)

```latex
\begin{center}
	\begin{tikzpicture}[>=stealth,declare function={kc=2.4; kcy=0.2;}]
		\foreach \y in {5,10,15,20,25,30}{
			\draw[gray!35] (0,{\y*kcy}) -- +(9.5,0);
			\node[left,text=black] at (0,{\y*kcy}) {$\y$};
		}
		\path ({kc},{10*kcy}) coordinate (A);
		\foreach[count=\i] \yt/\xt in {10/1,15/2,20/3}{
			\draw[blue,very thick] (A)--({\xt*kc},{\yt*kcy}) coordinate (A);
			\draw[blue,dashed] ({\xt*kc},0)--({\xt*kc},{\yt*kcy});
			\fill[blue] ({\xt*kc},0) circle (1.2pt) ({\xt*kc},{\yt*kcy}) circle (1.8pt);
			\node[below=4pt] at ({\xt*kc},0) {$\xt$};
			\node[above=4pt] at ({\xt*kc},{\yt*kcy}) {$\yt$};
		}
		\draw[->] (0,0)--(9.5,0) node[below right=4pt]{Tên trục hoành};
		\draw[->] (0,0)--(0,{32*kcy}) node[above left]{Tên trục tung};
		\node[left] at (0,0) {$0$};
		\node[font=\bfseries,align=center] at (4.75,{35*kcy}) {Tên biểu đồ};
	\end{tikzpicture}
\end{center}
```

## 4. Biểu đồ đường (hai đường)

```latex
\begin{center}
	\begin{tikzpicture}[>=stealth,declare function={kc=2.6; kcy=0.12;}]
		\foreach \y in {20,40,60,80,100}{
			\draw[gray!35] (0,{\y*kcy}) -- +(11,0);
			\node[left,text=black] at (0,{\y*kcy}) {$\y$};
		}
		\path ({kc},{50*kcy}) coordinate (A);
		\foreach[count=\i] \y/\x in {50/1,60/2,47/3,70/4}{
			\draw[blue,ultra thick,dashed] (A)--({\i*kc},{\y*kcy}) coordinate (A);
			\fill[blue] ({\i*kc},{\y*kcy}) circle (2pt);
			\node[below right=3pt] at ({\i*kc},{\y*kcy}) {$\y$};
			\node[below=4pt] at ({\i*kc},0) {$\x$};
		}
		\path ({kc},{60*kcy}) coordinate (B);
		\foreach[count=\i] \y in {60,40,55,88}{
			\draw[orange!85!black,ultra thick] (B)--({\i*kc},{\y*kcy}) coordinate (B);
			\fill[orange!85!black] ({\i*kc},{\y*kcy}) circle (2pt);
			\node[above=4pt] at ({\i*kc},{\y*kcy}) {$\y$};
		}
		\draw[->] (0,0)--(11,0);
		\draw[->] (0,0)--(0,{105*kcy});
		\node[left] at (0,0) {$0$};
		\begin{scope}[shift={(2.2,-1.2)}]
			\draw[blue,ultra thick,dashed] (0,0)--+(1.2,0);
			\node[right] at (1.4,0) {Chú giải 1};
			\draw[orange!85!black,ultra thick] (6,0)--+(1.2,0);
			\node[right] at (7.4,0) {Chú giải 2};
		\end{scope}
		\node[font=\bfseries,align=center] at (5.5,{112*kcy}) {TÊN BIỂU ĐỒ\\DÒNG THỨ HAI};
	\end{tikzpicture}
\end{center}
```

## 5. Biểu đồ tròn

Góc bắt đầu $90^\circ$, vẽ theo chiều kim đồng hồ, góc mỗi phần $=$ phần trăm $\times\,3{,}6$. Tổng các phần bằng $100$ (cho phép sai số làm tròn đã giải thích). Nếu đầu vào thiếu nhóm hoặc tổng sai, không tự tăng/giảm một lát để ép về $100$; yêu cầu xác nhận hoặc ghi rõ cách chuẩn hóa được phép. Dùng `remember` để truyền góc sang vòng lặp tiếp theo, không dùng `\global` làm rò trạng thái sang hình khác. Mỗi lát một pattern khác nhau, nhãn phần trăm đặt trong lát trên nền trắng, chú giải bên phải.

```latex
\begin{center}
	\begin{tikzpicture}[join=round, cap=round, font=\scriptsize]
		\def\R{3}
				\def\patA{dots}
		\def\patB{north east lines}
		\def\patC{crosshatch}
		\def\patD{horizontal lines}
		\foreach \name/\p/\pat [count=\i from 0,remember=\gockt as \gocbd (initially 90)] in
		{%
			{Phần thứ nhất}/43/\patA,
			{Phần thứ hai}/36/\patB,
			{Phần thứ ba}/14/\patC,
			{Phần thứ tư}/7/\patD
		}
		{
			\pgfmathsetmacro\gockt{\gocbd-\p*3.6}
			\draw[pattern=\pat] (0,0) -- (\gocbd:\R) arc (\gocbd:\gockt:\R) -- cycle;
			\node[fill=white,inner sep=1pt] at ({(\gocbd+\gockt)/2}:0.65*\R) {$\p\%$};
			\draw[pattern=\pat] (\R+1.5,\R-0.7*\i) rectangle +(0.5,-0.5);
			\node[right] at (\R+2.1,\R-0.7*\i-0.25) {\name};
		}
		\node[above=10pt,font=\bfseries] at (current bounding box.north) {Tên biểu đồ};
	\end{tikzpicture}
\end{center}
```
