# Bộ quy tắc chuẩn hóa LaTeX Toán THCS – THPT

Các quy tắc cú pháp ở đây dùng cho mọi đầu ra LaTeX. Quy tắc bảo toàn áp dụng cho nội dung nguồn trong chế độ Chuẩn hóa; chế độ Giải bài/Soạn mới được tạo lời giải theo yêu cầu.

Mục lục: I–II bảo toàn và nguồn đề; III–X môi trường và danh sách; XI–XIV công thức, số, đơn vị; XV–XVII file đáp án và bố cục; XVIII–XXIV lời giải, TikZ và kiểm tra cuối.

## I. Nguyên tắc chung

1. Giữ nguyên 100% nội dung gốc.
2. Không kiểm tra, không tự ý sửa đúng sai của đề bài, đáp án hoặc lời giải (trừ khi được yêu cầu).
3. Không tự thêm, bớt hoặc thay đổi dữ kiện toán học.
4. Giữ nguyên thứ tự các bài, câu hỏi, ý hỏi, phương án và lời giải.
5. Xuất kết quả trong code block LaTeX.
6. Không viết giải thích trong code block.
7. Không để bất kỳ dòng trống nào.
8. Không cắt mất nội dung.
9. Giữ nguyên bảng biểu, `center`, `immini`, `multicols`, `listEX`…
10. Không xóa `\loigiai{...}`, không tự ý đổi nội dung lời giải.
11. Chỉ chuẩn hóa cú pháp, định dạng và môi trường.
12. Thụt lề bằng tab: mỗi cấp môi trường hoặc khối `\loigiai{...}` thêm một tab; áp dụng cho cả đề, lời giải, bảng và TikZ. Không chuyển khoảng trắng cần thiết thành comment hoặc ngược lại.

## II. Xóa dòng trống, comment và thông tin nguồn

1. Xóa toàn bộ dòng trống.
2. Xóa các dòng phân cách: `%%%=====EX_1=====%%%`, `%%%=====VD_1=====%%%`, `%%%==========%%%`.
3. Xóa mã phân loại: `%[0D1H2-1]`, `%[0D2V1-3]%`, `%[Dự án ...]`, `%[Dự án ...]%[0D2N2-1]`.
4. Xóa tùy chọn nguồn đề sau môi trường nếu `[...]` chỉ là nguồn đề, trường, năm học hoặc mã đề:
   `\begin{ex}[Trích đề ...]` → `\begin{ex}`.
5. Xóa dòng nguồn đề đứng riêng: `[THPT Nguyễn Thị Minh Khai - GHKI-NH24-25]`, `[SGK Toán 10 - Kết nối tri thức]`, `[SBT Toán 10 - Cánh Diều]`, `[Tài liệu Thầy ...]`.
6. Xóa các dòng nguồn đề dạng `\textit{(Trích đề ...)}\\`, `(\textit{Trích đề ...})\\`, `[\textit{Trích đề ...}]`, `(\textit{\footnotesize Trích đề ...})\\`.
7. Xóa dấu `\\` thừa đi kèm trước hoặc sau các dòng nguồn đề.
8. **Không** xóa `\textit{...}` thuộc nội dung thực sự của bài học.
9. Xóa comment nguồn/đường phân cách đã xác định; giữ `%` có vai trò kỹ thuật như nối dòng macro. Tên trường/người/địa danh nằm trong tình huống bài toán là nội dung, không phải nguồn để xóa.

## III. Chuẩn hóa tiêu đề phần

```latex
\subsubsection{\textbf{PHẦN I. }Câu trắc nghiệm nhiều phương án lựa chọn.}
```
đổi thành
```latex
\ind{PHẦN I.}
\inden{Câu trắc nghiệm nhiều phương án lựa chọn.}
```
Tương tự với PHẦN II, III, IV, V, PHẦN 1, PHẦN 2… Dạng `{\bf PHẦN I. ...}` cũng đổi tương tự. Không để `\\` sau `\inden{...}`.

## IIIb. Cấu trúc đề ôn tập (chuẩn `\deontap`)

Mỗi đề ôn tập bắt đầu bằng `\deontap{N}`, **không** dùng `\section{...}`, **không** ghi dòng “Thời gian làm bài”.

```latex
\deontap{1}
\ind{A.}
\inden{TRẮC NGHIỆM (3,0 điểm)}
\setcounter{ex}{0}
\Opensolutionfile{ans}[ans/6C1-De1]
\Opensolutionfile{ansbook}[ansbook/6C1-De1]
\begin{ex}
	...
\end{ex}
\Closesolutionfile{ans}
\Closesolutionfile{ansbook}
\ind{B.}
\inden{TỰ LUẬN (7,0 điểm)}
\setcounter{bt}{0}
\begin{bt}
	...
\end{bt}
```

- Đề ôn tập dùng `\deontap{N}`; bài học/chuyên đề dùng `\section{Tên bài}`.
- Thụt lề bằng tab: nội dung trong `ex`/`bt` thụt 1 tab; trong `enumerate` thụt 2 tab; trong `center`/`tikzpicture` thụt lùi dần theo cấp lồng nhau.

## IV. Trắc nghiệm nhiều lựa chọn

```latex
\begin{ex}
	Nội dung câu hỏi
	\choice
	{Phương án A}
	{\True Phương án B}
	{Phương án C}
	{Phương án D}
	\loigiai{
		Lời giải
	}
\end{ex}
```
- Dạng `\choice` chuẩn có 4 phương án; nếu nguồn thiếu/thừa thì giữ nội dung và báo điểm cần xác nhận, không tự tạo hoặc xóa phương án.
- Chỉ giữ/thêm `\True` khi nguồn đã chỉ rõ đáp án đúng. Nếu chưa có đáp án thì không tự giải để đánh dấu trong chế độ Chuẩn hóa. Với Soạn mới/Giải bài, xác định đáp án đúng bằng kiểm chứng.
- Xóa dấu `\\` thừa ở cuối câu hỏi.
- Không để `}\end{ex}` trên cùng một dòng.

## V. Trắc nghiệm đúng – sai

- Đổi `\choiceTFt` → `\choiceTF`; `\loigiaiTF` → `\loigiai`.
- Giữ `\True` ở các ý đúng, không thêm chữ Đúng/Sai nếu bản gốc không có.

```latex
\begin{ex}
	Nội dung chung.
	\choiceTF
	{\True Mệnh đề a}
	{Mệnh đề b}
	{\True Mệnh đề c}
	{Mệnh đề d}
	\loigiai{
		\begin{itemchoice}
			\itemch Lời giải ý a.
			\itemch Lời giải ý b.
			\itemch Lời giải ý c.
			\itemch Lời giải ý d.
		\end{itemchoice}
	}
\end{ex}
```

## VI. Trả lời ngắn

```latex
\begin{ex}
	Nội dung câu hỏi.
	\shortans[oly]{Đáp án}
	\loigiai{
		Lời giải.
	}
\end{ex}
```
Xóa `\par` đứng trước `\shortans`.

## VII. Phần tự luận

- Đổi `\begin{ex}` → `\begin{bt}`, `\end{ex}` → `\end{bt}`, `\setcounter{ex}{0}` → `\setcounter{bt}{0}`.
- Giữ nguyên `\loigiai{...}`, TikZ, bảng biểu, `immini`, `enumerate`, `itemize`…
- `dang` phải rỗng, `bt` nằm ngoài, đề mục dạng dùng `[...]`:
```latex
\begin{dang}[Tên dạng]
\end{dang}
\begin{bt}
	...
\end{bt}
```

## VIII. Môi trường ví dụ

- Giữ `\begin{vd}[Tên dạng]…\end{vd}`; bắt buộc có tiêu đề ngắn trong `[...]`.
- Nếu bản gốc thiếu tiêu đề thì tự đặt tiêu đề ngắn phù hợp nội dung.
- Không đưa tên trường, nguồn đề hoặc năm học vào `[...]`.

## IX. Lý thuyết và hộp

1. Xóa môi trường `khung4`, giữ nội dung bên trong.
2. Đổi `note` → `luuy`.
3. Xóa môi trường `boxdn`, giữ nội dung bên trong.
4. `\indam{Nội dung}` → chỉ giữ `Nội dung`.
5. Giữ nguyên: `dang`, `tomtat`, `luuy`, `nx`, `tc`, `dn`, `kttrongtam`, `ghinho`, `itemize`, `enumerate`…

## X. Enumerate và itemize

- Xóa các tùy chọn `[a)]`, `[1)]`, `[•]` → `\begin{enumerate}`.
- Giữ nguyên các `\item`, không đổi thứ tự, không tự thêm nhãn a), b), c).
- Chuyển `\item[a)]`, `\item[1)]` và các nhãn a), b), 1), 2) gõ tay dùng làm ý hỏi thành `\item` trơn trong `enumerate`. Áp dụng đồng thời cho đề và lời giải, giữ nguyên các cấp lồng nhau. Đáp án đúng–sai dùng `itemchoice`/`\itemch` theo mục V.
- Không coi số đánh dấu hệ thức `(1)`, `(2)` trong chứng minh là nhãn ý hỏi. Nếu lời giải nguồn thiếu một ý, không tự bịa lời giải để đủ số `\item`; báo ngoài mã. Khi viết lời giải mới, số/cấp ý phải khớp đề.
- Không để dòng trống trong `enumerate` hoặc `itemize`.

## XI. Công thức toán

1. Công thức trong văn bản dùng `$...$`; không dùng `\[...\]` hay `$$...$$`. `align*` là môi trường toán độc lập được phép cho phép tính dài, không bọc thêm `$` ở ngoài hoặc trong từng dòng. Hệ trong văn bản dùng `$\heva{...}$`.
2. `\frac` → `\dfrac`.
3. Xóa toàn bộ `\quad`. Có thể dùng `\;` khi cần phân cách nhẹ.
4. Không dư dấu `$`; không dùng `${13}$`, viết `$13$`.
5. Chuẩn khoảng trắng: `$x\in\mathbb{R}$`, `$A\subset B$`, `$x=1$`.
6. Dùng `\neq`, `\geq`, `\leq`.
7. Hệ phương trình: `$\heva{&2x+3y=5\\&x-y=1}$`.
   Đổi `cases` biểu diễn hệ phương trình sang `heva`, giữ đủ mọi dòng. `cases` biểu diễn hàm từng đoạn không phải hệ phương trình: giữ ý nghĩa các nhánh, không tự đổi thành hệ.
8. Không tự sửa biểu thức toán học có thể sai trong bản gốc.
9. Dấu nhân hai đại lượng dùng `\cdot`, không dùng dấu chấm `.`. Tam giác đồng dạng dùng `\backsim`; không đổi `\sim` ở ngữ cảnh khác như phân phối xác suất.
10. Trong lời giải không dùng `\Rightarrow`, `\Leftrightarrow`, `\implies`, `\hoac{}`; diễn đạt bằng “Suy ra”, “tương đương”, “hoặc” theo đúng ý nghĩa gốc. Khi người dùng yêu cầu chuẩn hóa một mệnh đề logic trong đề/lý thuyết, không làm mất ý nghĩa tương đương.
11. Không áp dụng thay số thập phân/dấu nhân/math delimiter vào tọa độ và biểu thức máy của TikZ/PGF, đường dẫn, tên macro hay mã chương trình. `(2.5,0)` vẫn là cú pháp TikZ, không chuyển thành `(2{,}5,0)`.

## XII. Số, số thập phân và đơn vị

1. Các số trong nội dung toán học đặt trong `$...$`.
2. Số lớn dùng dấu cách mảnh: `$100\,000$`, `$46\,656$`.
3. Không tách số nếu là năm học, mã bài hoặc chỉ số cần giữ ngữ nghĩa.
4. Số thập phân dùng dấu phẩy trong ngoặc nhọn: `$2{,}5$`, `$812{,}5$`.
5. Đơn vị: `$10$ cm`, `$240$ cm$^2$`, `$50\,000$ đồng`, `$100\,000$ đồng/vé`.
6. Lũy thừa: `$2^3$`, `$5^{20}$`, `$\left(\dfrac{4}{9}\right)^5$`.
7. Giữ `^\circ` và `\%` trong math mode theo quy ước v14: `$45^\circ$`, `$30\%$`. Chỉ đổi khi người dùng yêu cầu rõ.

## XIII. Tập hợp, khoảng và dấu phân cách

- Xóa khoảng trắng thừa: `$\{1;2;3\}$`.
- Chuẩn hóa: `$(-\infty;1)$`, `$[-2;3)$`, `$\left[\dfrac{1}{3};+\infty\right)$`.
- Dùng `$\{x\in\mathbb{R}\mid x<1\}$`, `$\{x\in\mathbb{N}\mid x\text{ là số lẻ}\}$`.

## XIV. Ký hiệu hình học

- `//` → `\parallel`; `\angle AIB` → `\widehat{AIB}`.
- Góc `$xOy$` → `$\widehat{xOy}$`; khi đã dùng `\widehat{...}` thì bỏ chữ “góc” nếu câu vẫn tự nhiên.
- Điểm, tia, đường thẳng đặt trong math mode: `$A$`, `$Ox$`, `$Oy$`.
- Tam giác: `$\triangle ABC$`. Vuông góc: `\perp`.
- Chỉ đổi `//` thành `\parallel` khi đó là quan hệ hai đường thẳng, không đổi URL hoặc chú thích chương trình.

## XV. Lệnh mở và đóng file đáp án

Chỉ áp dụng cho phần trắc nghiệm:
```latex
\setcounter{ex}{0}
\Opensolutionfile{ans}[ans/ten-file]
\Opensolutionfile{ansbook}[ansbook/ten-file]
...
\Closesolutionfile{ans}
\Closesolutionfile{ansbook}
```
- Tên file theo quy ước: `ans/6C1-De1`, `ansbook/6C1-De1` (đề 2 là `6C1-De2`…).
- Nếu bản gốc chỉ mở `ans` mà không mở `ansbook` thì giữ nguyên, **không** tự thêm.
- Không đóng `ansbook` nếu chưa mở. Không tự xóa các lệnh đã có.
- Phần tự luận **không** dùng `\Opensolutionfile`.

## XVI. Cấu trúc xuất kết quả

1. Với tài liệu theo bài/chuyên đề/đề ôn tập, mỗi code block chứa đúng 1 `\section` hoặc đúng 1 `\deontap{N}`. Với một bài hoặc đoạn mã độc lập, không tự thêm wrapper nếu người dùng không yêu cầu.
2. Trong bài tập, `dang` rỗng dùng `[...]`, `bt` nằm ngoài. Trong lý thuyết đầu chương, `dang` có nội dung dùng `{...}` theo `ly-thuyet-dau-chuong.md`.
3. Hình độc lập đặt trong `\begin{center}...\end{center}`. Hình đã ở đối số `immini`, ô bảng hoặc khung có căn chỉnh riêng thì giữ cấu trúc đó, không bọc thêm `center` làm hỏng bố cục.

## XVII. Chia cột

- Giữ bố cục cột nguồn khi chỉ chuẩn hóa. Khi soạn mới hoặc được giao bố trí lại, câu hỏi nhiều ý ngắn mặc định 2 cột (`\begin{multicols}{2}`).
  - Câu ngắn (đáp số một dòng, số/căn/phân số đơn giản) → 3 hoặc 4 cột.
  - Câu dài (nhiều bước biến đổi, biểu thức cồng kềnh) → 1 cột.
- Phần lời giải: không chia cột.
- Số cột không vượt số ý; một ý độc lập dùng một cột. Không bọc cả bài chứa `\loigiai` trong `multicols` rồi yêu cầu lời giải một cột.

## XVIII. Trình bày lời giải

Xem chi tiết ở `mau-loi-giai.md`. Tóm tắt:

1. Ngôn ngữ lớp 7 trở xuống: không dùng “phương trình”, “nghiệm”; dùng “bài toán tìm $x$”, “không có giá trị nào của $x$ thỏa mãn”.
2. Không dùng `\Rightarrow`, `\implies` — thay bằng chữ “Suy ra”.
3. Không dùng `\hoac{}` — dùng chữ “hoặc” căn cột trong `align*` với một dấu `&` duy nhất ngay trước `\text{ hoặc }`.
4. Phép tính dài → trình bày dọc bằng `align*`.
5. Phép tính ngắn → gộp một dòng.
6. Lời giải chi tiết nhưng không dài dòng bằng lời; ưu tiên công thức.
7. Xuống dòng trong lời giải dùng `\\`, không để dòng trống.

## XIX–XX. TikZ

- Hình học phẳng: xem `tikz-hinh-hoc.md`.
- Biểu đồ: xem `tikz-bieu-do.md`.
- Nếu chỉ chuẩn hóa TikZ nguồn, bảo toàn số liệu và quan hệ hình học nguồn. Sửa lỗi cú pháp rõ; nếu nghi hình nguồn sai quan hệ thì báo riêng, không tự đổi dữ kiện/dựng lại hình trừ khi được giao kiểm tra hoặc sửa hình.

## XXI. Regex xóa nguồn đề

Xem `regex-texstudio.md`.

## XXII. Mẫu kết quả chuẩn

```latex
\ind{PHẦN I.}
\inden{Câu trắc nghiệm nhiều phương án lựa chọn.}
\setcounter{ex}{0}
\Opensolutionfile{ans}[ans/ten-file]
\begin{ex}
	Nội dung câu hỏi.
	\choice
	{Phương án A}
	{\True Phương án B}
	{Phương án C}
	{Phương án D}
	\loigiai{
		Lời giải.
	}
\end{ex}
\Closesolutionfile{ans}
```

Tự luận:
```latex
\ind{PHẦN IV.}
\inden{Tự luận}
\setcounter{bt}{0}
\begin{dang}[Tên dạng]
\end{dang}
\begin{bt}
	Nội dung bài toán.
	\begin{multicols}{2}
		\begin{enumerate}
			\item Ý thứ nhất.
			\item Ý thứ hai.
		\end{enumerate}
	\end{multicols}
	\loigiai{
		Lời giải.
	}
\end{bt}
```

## XXIII. Lưu ý cuối

1. Không dư dấu `$`, không sai cú pháp môi trường, không để dòng trống.
2. Không xóa lời giải; không tự sửa nội dung toán học.
3. Không giữ metadata nguồn đề, tên trường nguồn, dự án nguồn hoặc mã phân loại; giữ các tên thuộc nội dung tình huống bài toán.
4. Tự luận dùng `bt`; trắc nghiệm dùng `ex`; ví dụ dùng `vd[Tên dạng]`.
5. Đúng – sai dùng `\choiceTF` và `itemchoice`; trả lời ngắn giữ `\shortans[oly]{...}`.
6. Mỗi code block một `\section` hoặc một `\deontap{N}` khi đầu vào là tài liệu cấp bài/chuyên đề/đề; đoạn độc lập giữ đúng phạm vi người dùng giao.
7. Giữ hoặc chia cột câu hỏi theo mục XVII; lời giải một cột.
8. Dùng chữ “Suy ra”, chữ “hoặc”.
9. Chỉ vẽ cung cho góc đề nhắc tới.
10. `\tikzset` đặt NGOÀI `tikzpicture`; không dùng biến `e`, `y` trong `declare function`.
11. Trình bày sạch, gọn. Chỉ khẳng định đã biên dịch khi thực sự có đủ class/preamble và đã chạy trình biên dịch thành công.

## XXIV. Nhắc việc khi xử lý

Nếu phát hiện đề gốc có mâu thuẫn số liệu hoặc lỗi gõ trong chế độ Chuẩn hóa: **không tự sửa đề**, giữ nguyên cả đề và lời giải nguồn, rồi ghi chú riêng **ngoài** code block. Chỉ tạo/viết lại lời giải khi yêu cầu còn bao gồm chế độ Giải bài. Xem thêm `soan-de-moi.md` mục “Kiểm tra tính hợp lý”.
