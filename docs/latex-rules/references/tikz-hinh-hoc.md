# Vẽ hình học phẳng bằng TikZ

Mục lục: khung 4 bước; dựng điểm; giao đường tròn; đường phụ và phân giác; ký hiệu góc/đoạn; nhãn điểm; mẫu cát tuyến; 11 mẫu hình; checklist.

Đây là nguồn chuẩn duy nhất cho hình học TikZ của skill. Nguyên tắc bao trùm: **TikZ thuần** — không dùng `tkz-euclide`, không dùng `pgfplots`. Thư viện cần có trong preamble: `\usetikzlibrary{angles,quotes,calc,intersections}` (thêm `decorations.markings` nếu cần mũi tên giữa đoạn). Dùng `scale` khi cần. Không dùng `e`, `y` làm tên hàm trong `declare function`; dùng `dx`, `dy`, `hg`... (tên tọa độ `(y)` và biến vòng lặp `\y` vẫn hợp lệ). `\tikzset` cho kiểu dùng chung đặt ngoài hình. Tọa độ máy dùng dấu chấm thập phân; quy tắc `$...$` chỉ áp dụng cho nhãn. Mọi tham số độ dài chính khai báo bằng `\def` hoặc `declare function`; hạn chế số trần lặp lại trong `\draw`. Đường khuất trong hình không gian dùng `[dashed]`. Nhãn không được đè lên đường thẳng.

### Khung chuẩn 4 bước — bắt buộc đúng thứ tự

```latex
\begin{tikzpicture}[scale=1, font=\footnotesize, line join=round, line cap=round, >=stealth, declare function={r=3;}]
	% BƯỚC 1 — KHAI BÁO: mọi điểm dựng bằng \path ... coordinate (X)
	% BƯỚC 2 — VẼ: các \draw nối hình
	% BƯỚC 3 — CHÚ THÍCH: góc, kí hiệu đoạn bằng nhau, số đo
	% BƯỚC 4 — XUẤT HIỆN ĐIỂM: \foreach vẽ chấm tròn + nhãn
\end{tikzpicture}
```

Khung trên chỉ mô tả thứ tự, không phải hình hoàn chỉnh. Mã giao người dùng bỏ comment thuyết minh; giữ `%` cần thiết về cú pháp. Bước 1 chỉ khai báo điểm/path vô hình. Bước 2 vẽ nét đứt rồi nét liền. Bước 3 thêm cung góc/gạch đoạn/nhãn số đo. Bước 4 vẽ chấm và nhãn điểm sau cùng. `\path pic[draw,...]` cũng vẽ nét nên thuộc bước 3. Điểm riêng của ký hiệu trang trí có thể khai báo tại bước 3.

### Thư viện dựng điểm bằng phép biến hình — ưu tiên tuyệt đối, không tự tính tọa độ

| Phép dựng | Cú pháp |
|---|---|
| Điểm gốc | `\path (0,0) coordinate (O);` |
| Điểm theo góc–bán kính | `\path (60:r) coordinate (A);` |
| Trung điểm $AB$ | `\path ($(A)!0.5!(B)$) coordinate (M);` |
| Đối xứng của $B$ qua $O$ | `\path ($(B)!2!(O)$) coordinate (Q);` (đối xứng qua điểm nào thì điểm đó ở vị trí số 2) |
| Hình chiếu $A$ lên $BC$ | `\path ($(B)!(A)!(C)$) coordinate (H);` |
| Đỉnh $D$ hình bình hành $ABCD$ | `\path ($(A)+(C)-(B)$) coordinate (D);` |
| Quay $B$ quanh $O$ góc $-90^\circ$ (**tâm quay đứng TRƯỚC**) | `\path ($(O)!1!-90:(B)$) coordinate (Q);` |
| Đường vuông góc với $XY$ **tại $X$** | `\path ($(X)!1!90:(Y)$) coordinate (Xx);` — đường cần tìm là `X--Xx` |
| Trung trực của $AB$ | `\path ($(A)!0.5!(B)$) coordinate (M) ($(M)!1!90:(B)$) coordinate (Mx);` — đường `M--Mx` |
| Điểm cách $O$ khoảng $r$, phương cực $40^\circ$ | `\path ($(O)+(40:r)$) coordinate (C);` |
| Đối xứng $A$ qua đường $CD$ | `\path ($(C)!(A)!(D)$) coordinate (Ah) ($(A)!2!(Ah)$) coordinate (B);` |
| Trọng tâm tam giác $ABC$ | `\path (barycentric cs:A=1,B=1,C=1) coordinate (G);` |
| Trực tâm tam giác $ABC$ | `\path ($(B)!(A)!(C)$) coordinate (AH) ($(A)!(B)!(C)$) coordinate (BH) (intersection of A--AH and B--BH) coordinate (H);` |
| Giao hai đường thẳng | `\path (intersection of A--O and B--C) coordinate (H);` |
| Tiếp tuyến tại $A$ của $(O)$ | `\path ($(A)!1!-90:(O)$) coordinate (B);` (quay $O$ quanh $A$ nên $AB\perp AO$: $AB$ là tiếp tuyến) |

**CẢNH BÁO cú pháp quay — lỗi âm thầm nguy hiểm nhất.** Trong `($(X)!1!<góc>:(Y)$)` thì **TÂM QUAY là `X`, điểm đứng TRƯỚC dấu `!`**; `Y` là điểm bị quay. Muốn dựng đường vuông góc với $XY$ **tại $X$** phải viết `($(X)!1!90:(Y)$)`; viết ngược thành `($(Y)!1!90:(X)$)` là quay quanh $Y$ — đường thu được KHÔNG vuông góc tại $X$ và mọi giao điểm dựng sau đó đều sai vị trí, nhưng file VẪN BIÊN DỊCH BÌNH THƯỜNG, không báo lỗi. Mẫu đúng cho bài "hai đường trung trực cắt nhau tại $T$":
```latex
\path ($(D)!0.5!(E)$) coordinate (I)
      ($(I)!1!90:(E)$) coordinate (Ix)   % ĐÚNG: quay E quanh I => I--Ix vuông góc DE tại I
      ($(B)!0.5!(C)$) coordinate (K)
      ($(K)!1!90:(C)$) coordinate (Kx)   % ĐÚNG: quay C quanh K => K--Kx vuông góc BC tại K
      (intersection of I--Ix and K--Kx) coordinate (T)
;
```
Sau khi dựng, BẮT BUỘC đánh ký hiệu góc vuông tại đúng điểm (`right angle = T--I--D`, `right angle = T--K--B`) để nhìn hình là biết phép quay đúng hay sai, và đối chiếu vị trí giao điểm với dự đoán hình học (nằm trong hay ngoài tam giác). Khi nghi ngờ, biên dịch thử bằng `standalone` và xem ảnh trước khi gửi.

Nguyên tắc: điểm nào tính được bằng phép dựng hình (trung điểm, đối xứng, hình chiếu, quay) thì BẮT BUỘC dùng cú pháp `calc` ở trên. Giao **hai đường thẳng** luôn dùng `(intersection of ... and ...)`, TUYỆT ĐỐI không dùng thư viện `intersections`. Chỉ khi không còn cách nào (có đường tròn) mới dùng `intersections`. Các đỉnh chính đã biết số liệu (ví dụ ba đỉnh tam giác dựng từ độ dài cạnh cho trước) được phép gõ tọa độ tay như điểm gốc.

### Giao điểm với đường tròn — chỗ sai nhiều nhất

Một cát tuyến không tiếp xúc cắt đường tròn tại hai điểm; tiếp tuyến có một điểm chung, đường ngoài không có điểm chung. `name intersections` đánh số `intersection-1`/`intersection-2` theo thứ tự thuật toán quét, KHÔNG theo thứ tự hình học — cấm dựa vào quy ước "intersection-1 thường là...". Đổi bán kính, đổi góc, đổi thứ tự khai báo path là số thứ tự đảo ngay.

**Cách 1 (ưu tiên tuyệt đối, không cần thư viện)** — đối xứng qua hình chiếu tâm. Dây cung qua $D$ (đã biết trên đường tròn) và $M$, cắt đường tròn lần hai tại $C$:
```latex
\path ($(M)!(O)!(D)$) coordinate (x)   % x = hình chiếu tâm O lên dây MD
      ($(D)!2!(x)$)   coordinate (C);  % C = đối xứng của D qua x (hình chiếu tâm = trung điểm dây)
```

**Cách 2** — `name intersections` có định hướng bằng `sort by` (khi chưa biết trước điểm nào trên đường tròn):
```latex
\path[name path=dtO] ($(O)+(0:r)$) arc[start angle=0,end angle=360,radius=r];
\path[name path=dtAB] (A)--(B);   % hướng quét: từ A sang B
\path[name intersections={of=dtO and dtAB, by=F, sort by=dtAB}];
% sort by=dtAB => giao ĐẦU TIÊN (gần A nhất) là F, xác định tuyệt đối
```
`sort by=` là BẮT BUỘC mỗi khi cắt đường tròn. Cần điểm xa hơn thì ĐẢO CHIỀU path thành `(B)--(A)`, không khai báo thêm biến.

**Cách 3** — cần cả hai giao điểm: vẫn dùng `sort by` theo một path đã biết điểm bắt đầu và chiều chạy. Với hai tiếp tuyến từ $A$ nằm bên phải $O$, path `dtO` khai báo từ điểm phải nhất, ngược chiều kim đồng hồ, nên giao trên là $B$, giao dưới là $C$. Không tổng quát hóa quy ước này sang hình có hướng khác.
```latex
\path[name path=dtO] ($(O)+(0:r)$) arc[start angle=0,end angle=360,radius=r];
\path[name intersections={of=dtO and dtOA,sort by=dtO,by={B,C}}];
```

CẤM: `by={E, D_dummy}` (sinh biến rác); `by={E, F}` khi chỉ cần `E`; thiếu `sort by`. Tự kiểm sau khi lấy giao điểm: điểm mới có trùng điểm đã biết trên đường tròn không (trùng => lấy nhầm, đảo chiều path); vị trí nhãn đúng phía như hình đề không; nhiều giao điểm cùng loại thì kiểm tra từng điểm một, không kiểm tra gộp.

### Kéo dài bằng điểm ảo

`name intersections` chỉ xét phần path đã khai báo, nên phải kéo đủ dài và kiểm tra số giao (`total`) trước khi dùng kết quả. `intersection of` xét hai đường thẳng vô hạn; không kéo dài vô hình chỉ để tìm giao hai đường này. Hệ số $1{,}5$–$2$ là gợi ý khởi đầu, không bảo đảm path chạm đường tròn ở mọi cấu hình. Ba quy tắc:

1. Điểm ảo tạo bằng nội suy hệ số $>1$: `($(A)!1.5!(D)$)`, hoặc bằng vector `+(góc:độ dài)`.
2. Path chỉ phục vụ tìm giao điểm phải dùng `\path`, không vẽ ra. Đầu mút kéo dài của đường/tia cần hiển thị vẫn được dùng trong `\draw`.
3. Path kéo dài vô hình dùng `overlay` để không tính vào khung bao. Tia và đường phụ cần nhìn thấy không dùng `overlay`.

```latex
\path[name path=circleO] (O) circle (\R);
\path[name path=lineAD, overlay] (D) -- +(90:2*\R);
\path[name intersections={of=circleO and lineAD, by=A, sort by=lineAD}];
```

Hệ số khuyến nghị: cắt đường tròn bán kính $R$ dùng `+(góc:2*\R)`; cắt đường thẳng khác dùng `($(A)!2!(B)$)` (hệ số $1{,}5$–$2$); kéo dài 2 phía để vẽ đường đầy đủ dùng $1{,}3$–$1{,}5$. Muốn vẽ trọn một đường phụ (trung trực, đường vuông góc) đi qua HAI điểm đã có $P$ và $T$ thì lấy luôn hai đầu mút `($(T)!1.3!(P)$)` và `($(P)!1.2!(T)$)` — cách này luôn đi qua đúng cả hai điểm, không phụ thuộc hướng quay. Đặt tên điểm ảo có hậu tố (`Bx`, `Ax`, `b'`, `y_end`) và TUYỆT ĐỐI không đưa vào `\foreach` xuất hiện điểm ở bước 4. `overlay` chỉ dùng cho đường PHỤ TRỢ vô hình; tia THỰC SỰ được vẽ ra (có nhãn) thì dùng `\draw` và KHÔNG dùng `overlay`.

### Đường phân giác

CẤM dùng hàm tính góc (`atan2`, `\pgfmathanglebetweenpoints`...). Dùng nguyên lý tam giác cân: lấy hai điểm cách đỉnh MỘT KHOẢNG BẰNG NHAU trên hai cạnh, trung điểm của chúng nằm trên tia phân giác.

Mẫu tách bước (phân giác $AD$ của tam giác $ABC$):
```latex
\path ($(A)!1cm!(B)$) coordinate (Ap)
      ($(A)!1cm!(C)$) coordinate (Aq)      % PHẢI cùng 1cm
      ($(Ap)!.5!(Aq)$) coordinate (At)
      (intersection of A--At and B--C) coordinate (D);
\draw (A)--(D);
```
Ba lỗi thường gặp: hai khoảng cách khác nhau (`!1cm!` và `!2cm!`) => không phải phân giác; dùng `!0.5!` thay `!1cm!` => thành trung tuyến khi $AB\neq AC$; quên `(intersection of ...)` mà vẽ thẳng `(A)--(At)` => tia quá ngắn, không chạm $BC$.

### Ký hiệu góc và đoạn bằng nhau

Gom các ký hiệu cùng loại trong một `\foreach`. Chỉ vẽ cung cho góc được cho hoặc dùng trong bài; đánh dấu góc vuông ở phép dựng cần kiểm tra. Hai nửa phân giác dùng cùng bán kính và cùng loại ký hiệu; các cặp khác nhau dùng số cung/gạch khác nhau. Bán kính có đơn vị `pt`/`mm` rõ ràng. Không dùng trung điểm hai đầu mút cạnh có độ dài bất kỳ để xác định giữa cung góc: trung điểm đó có thể không nằm trên phân giác.

```latex
\foreach \x/\y/\z in {B/A/C,D/A/E}
	\path pic[draw,angle radius=6pt] {right angle=\x--\y--\z};
\foreach \x/\y/\z in {B/O/A} \foreach \rad in {10pt,14pt}
	\path pic[draw,angle radius=\rad] {angle=\x--\y--\z};
\foreach \x/\y in {A/B,A/C}
	\draw ($(\x)!.5!(\y)!4pt!90:(\x)$)--($(\x)!.5!(\y)!4pt!-90:(\x)$);
\foreach \x/\y in {A/B,A/C} \foreach \tl in {.49,.51}
	\draw ($(\x)!\tl!(\y)!4pt!90:(\x)$)--($(\x)!\tl!(\y)!4pt!-90:(\x)$);
```

Gạch giữa cung: lấy hai điểm cách đỉnh cùng `1cm`, dựng điểm giữa chúng rồi đặt gạch theo tia phân giác. Mẫu cho góc một gạch; thêm hai gạch đối xứng quanh tia giữa khi cần hai gạch.

```latex
\foreach \x/\y/\z/\rad in {C/B/A/10,A/C/B/10}{
	\path ($(\y)!1cm!(\x)$) coordinate (Gx)
		($(\y)!1cm!(\z)$) coordinate (Gz)
		($(Gx)!.5!(Gz)$) coordinate (Gmid);
	\path pic[draw,angle radius=\rad pt] {angle=\x--\y--\z};
	\pgfmathsetlengthmacro{\radin}{(\rad-2)*1pt}
	\pgfmathsetlengthmacro{\radout}{(\rad+2)*1pt}
	\draw ($(\y)!\radin!(Gmid)$)--($(\y)!\radout!(Gmid)$);
}
```

Dấu X, XX của đoạn vẫn dựng bằng `calc`; các dấu khác loại không được dùng để ngầm khẳng định các đoạn bằng nhau.

```latex
\foreach \x/\y in {A/B,A/C}
	\draw ($(\x)!.5!(\y)!4pt!60:(\x)$)--($(\x)!.5!(\y)!4pt!-120:(\x)$)
		($(\x)!.5!(\y)!4pt!120:(\x)$)--($(\x)!.5!(\y)!4pt!-60:(\x)$);
\foreach \x/\y in {A/B,A/C} \foreach \tl in {.48,.52}
	\draw ($(\x)!\tl!(\y)!4pt!60:(\x)$)--($(\x)!\tl!(\y)!4pt!-120:(\x)$)
		($(\x)!\tl!(\y)!4pt!120:(\x)$)--($(\x)!\tl!(\y)!4pt!-60:(\x)$);
```

### Nhãn số đo và đơn vị trong hình vẽ — Số trong `$`, ĐƠN VỊ ngoài `$`

Quy tắc này áp dụng cho mọi nhãn số liệu trong hình vẽ (độ dài cạnh, bán kính, diện tích, chu vi, số đo góc).

| Đúng | Sai |
|---|---|
| `$5$ cm` | `$5\text{cm}$`, `$5 \text{ cm}$`, `$5cm$` |
| `$5$ cm$^2$` | `$5\text{cm}^2$` |
| `$1{,}5$ m` | `$1,5$ m` |
| `$45^\circ$` | `$45$ độ`, `$45\text{độ}$` |
| `$30\%$` | `$30$%` |

Chỉ SỐ nằm trong cặp `$`; ĐƠN VỊ (cm, m, dm, kg, s...) viết thường ngoài `$`, cách số đúng một khoảng trắng; số mũ của đơn vị vẫn bọc `$`: `cm$^2$`. Riêng `^\circ` và `\%` là ký hiệu toán nên nằm TRONG `$`. TUYỆT ĐỐI không dùng `\text{}` để bọc đơn vị trong nhãn hình vẽ. Ví dụ: `\draw (A)--(B) node[midway,sloped,above]{$6$ cm};`

### Quy tắc xuất hiện điểm (bước 4)

```latex
\foreach \d/\g in {O/-45, A/180, B/90, C/-90}
  \path[draw=black, fill=white] (\d) circle (1pt) + (\g:9pt) node {$\d$};
```
Đổi tên hiển thị khác tên tọa độ thì dùng 3 tham số, in ra `\z`: `\foreach \d/\g/\z in {A/180/M, ...} \path[draw=black, fill=white] (\d) circle (1pt) + (\g:9pt) node {$\z$};`

- BẮT BUỘC dùng `\foreach` với tham số GÓC (độ). TUYỆT ĐỐI KHÔNG dùng `above/below/left/right/north/south...` cho NHÃN ĐIỂM (A, B, C, O, H...) — luôn dùng `\foreach` góc như trên. Không dùng `\tkzLabelPoints`.
- Nhãn TIA/ĐƯỜNG THẲNG (x, y, z, a, b) thì ĐƯỢC PHÉP dùng `above/below/left/right`, ví dụ `(O)--(x) node[below]{$x$};`.
- Nhãn ĐỘ DÀI trên cạnh ĐƯỢC PHÉP dùng `node[midway,sloped,above]{$6$ cm}`.
- Nhãn số đo GÓC quanh một đỉnh dùng `\node at ($(\x)+(\y:\z mm)$) {$\t$};`.
- Bán kính chấm $1$–$1{,}5$pt; khoảng cách nhãn $8$–$9$pt; `fill=white` cho chấm rỗng, giữ nhất quán trong cùng một đề. Chọn góc đặt nhãn theo hướng đi ra khỏi hình (trái $180$, phải $0$, trên $90$, dưới $-90$, chéo $\pm45$/$\pm135$).
- Danh sách `\foreach` này CHỈ chứa điểm THẬT. Điểm ảo/phụ trợ (Ap, Aq, At, x, y_end) KHÔNG được liệt kê.

### Nối điểm liên tục — không tách \draw rời rạc

| Sai | Đúng |
|---|---|
| `\draw (A)--(B) (B)--(C);` | `\draw (A)--(B)--(C);` |
| `\draw (A)--(B) (B)--(C) (C)--(A);` | `\draw (A)--(B)--(C)--cycle;` |
| `\draw (A)--(B); \draw (B)--(C);` | `\draw (A)--(B)--(C);` |

Lý do: mỗi lệnh `--(X)` rời tạo một path riêng; với `line cap=round` hai path gặp nhau tạo cục u, và `line join` không áp dụng giữa hai path khác nhau. Ghép các đoạn có điểm chung thành chuỗi dài nhất (đi một nét bút); chuỗi khép kín kết thúc bằng `--cycle` (không lặp lại điểm đầu); các chuỗi rời nhau và đường tròn gộp chung vào MỘT `\draw`. Chỉ tách sang `\draw` riêng khi cần thuộc tính khác (`dashed`, màu, mũi tên).

### Hai mẫu nhanh cho hình "đường thẳng song song bị cắt bởi cát tuyến" — dùng ngay, khỏi dựng lại từ đầu

**Mẫu 1 — hai (hoặc ba) đường thẳng song song bị cắt bởi cát tuyến**, góc so le/đồng vị/trong cùng phía:

```latex
\begin{tikzpicture}[scale=.8,font=\footnotesize,line cap=round,line join=round,>=stealth]
	\def\r{4.5}
	\path (0,0) coordinate (b) ++(0:\r) coordinate (bp)
		(0,2.2) coordinate (a) ++(0:\r) coordinate (ap)
		(2.5,-.8) coordinate (cp) ++(98:3.9) coordinate (c)
		(intersection of a--ap and c--cp) coordinate (M)
		(intersection of b--bp and c--cp) coordinate (N);
	\draw (a)--(ap) (b)--(bp) (c)--(cp);
	\foreach \u/\v/\w/\idx in {cp/M/ap/1,c/N/b/2}{
		\path pic[draw,angle radius=9pt,"$\idx$",angle eccentricity=.6]{angle=\u--\v--\w};
		\path pic[angle radius=8pt,"$82^\circ$",angle eccentricity=1.8]{angle=\u--\v--\w};
	}
	\foreach \p/\pos/\label in {a/180/a,ap/0/a',b/180/b,bp/0/b',c/90/c,cp/-90/c'}
		\node at ($(\p)+(\pos:8pt)$) {$\label$};
	\foreach \p/\pos in {M/60,N/-40}
		\path[draw,fill=white] (\p) circle (1pt) +(\pos:9pt) node {$\p$};
\end{tikzpicture}
```

Khai báo đường bằng điểm gốc + góc/độ dài; giao điểm dựng bằng `intersection of`. Gom đường cùng kiểu trong một `\draw`; chuyển mọi `pic` và nhãn ra sau đường. Đặt số thứ tự góc gần đỉnh, số đo xa hơn để không chồng chữ. Chữ thường dùng cho đường/tia, chữ hoa cho giao điểm. Khi thêm đường song song hoặc cát tuyến, dựng từ quan hệ hình học của bài, không sao chép máy móc tọa độ/số đo mẫu.

**Mẫu 2 — hai đường thẳng song song dọc bị cắt bởi hai cát tuyến**

```latex
\begin{tikzpicture}[scale=.8,font=\footnotesize,line cap=round,line join=round,>=stealth]
	\path (0,-.5) coordinate (m) (0,4.5) coordinate (mp)
		(3,-.5) coordinate (n) (3,4.5) coordinate (np)
		(-1.5,.5) coordinate (x) (4.5,3.2) coordinate (xp)
		(-1.5,3.5) coordinate (y) (4.5,1.2) coordinate (yp)
		(intersection of m--mp and x--xp) coordinate (A)
		(intersection of n--np and x--xp) coordinate (B)
		(intersection of m--mp and y--yp) coordinate (C)
		(intersection of n--np and y--yp) coordinate (D);
	\draw (m)--(mp) (n)--(np) (x)--(xp) (y)--(yp);
	\foreach \p/\pos/\label in {A/110/2,A/-60/1}
		\node at ($(\p)+(\pos:12pt)$) {$\label$};
	\foreach \p/\pos/\label in {m/180/m,mp/90/m',n/0/n,np/90/n',x/-160/x,xp/20/x',y/160/y,yp/20/y'}
		\node at ($(\p)+(\pos:8pt)$) {$\label$};
	\foreach \p/\pos in {A/20,B/160,C/20,D/160}
		\path[draw,fill=white] (\p) circle (1pt) +(\pos:9pt) node {$\p$};
\end{tikzpicture}
```

Một điểm có nhiều nhãn: tạo nhiều node số góc với góc/khoảng cách riêng, chỉ vẽ chấm điểm một lần. Không đánh dấu hai góc tùy ý bằng nhau chỉ vì chúng nằm giữa hai đường song song; xác minh cặp góc thật sự tương ứng với cùng cát tuyến. Không dùng ký hiệu ô vuông để đánh dấu góc chưa vuông.

### Thư viện mẫu hình vẽ cơ bản khác — copy và chỉnh lại tọa độ/tên điểm/góc, không chép máy móc số liệu

**1. Tam giác nội tiếp đường tròn $(O)$, $AH$ là đường cao**
```latex
\begin{tikzpicture}[scale=1, font=\footnotesize, line join=round, line cap=round, >=stealth, declare function={r=3;}]
	\def\gocA{110}
	\path (0,0) coordinate (O)
		(\gocA:r) coordinate (A)
		(210:r) coordinate (B)
		(-30:r) coordinate (C)
		($(B)!(A)!(C)$) coordinate (H)
	;
	\draw (A)--(B)--(C)--cycle (O) circle(r) (A)--(H);
	\foreach \x/\y/\z in {A/H/C}
	\path pic[draw=black, angle radius=6pt] {right angle = \x--\y--\z};
	\foreach \d/\g in {O/-45, A/100, B/-135, C/-30, H/-90}
	\path[draw, fill=white] (\d) circle(1pt) + (\g:9pt) node {$\d$};
\end{tikzpicture}
```

**2. Tiếp tuyến $AB$, $AC$ kẻ từ $A$ đến đường tròn $(O)$**
```latex
\begin{tikzpicture}[scale=1, font=\footnotesize, line join=round, line cap=round, >=stealth, declare function={r=3;d=7;}]
	\path (0,0) coordinate (O)
		(d,0) coordinate (A);
	\path[name path=dtO] ($(O)+(0:r)$) arc[start angle=0,end angle=360,radius=r];
	\path ($(O)!.5!(A)$) coordinate (I);
	\path[name path=dtOA,overlay] let \p1=($(I)-(A)$) in (I) circle ({veclen(\x1,\y1)});
	\path[name intersections={of=dtO and dtOA,sort by=dtO,by={B,C}}];
	\draw (A)--(B)--(O)--(C)--cycle (O)--(A) (O) circle(r);
	\foreach \x/\y/\z in {A/B/O, A/C/O}
	\path pic[draw=black, angle radius=6pt] {right angle = \x--\y--\z};
	\foreach \d/\g in {O/135, A/0, B/90, C/-90}
	\path[draw=black, fill=white] (\d) circle(1pt) + (\g:9pt) node {$\d$};
\end{tikzpicture}
```

**3. Cát tuyến $MCD$ và hai tiếp tuyến $MA$, $MB$**
```latex
\begin{tikzpicture}[scale=1, font=\footnotesize, line join=round, line cap=round, >=stealth, declare function={r=3;d=7;}]
	\path (0,0) coordinate (O)
		(d,0) coordinate (M)
		(140:r) coordinate (D)
		($(M)!(O)!(D)$) coordinate (x)
		($(D)!2!(x)$) coordinate (C);
	\path[name path=dtO] ($(O)+(0:r)$) arc[start angle=0,end angle=360,radius=r];
	\path ($(O)!.5!(M)$) coordinate (I);
	\path[name path=dtOM,overlay] let \p1=($(I)-(M)$) in (I) circle ({veclen(\x1,\y1)});
	\path[name intersections={of=dtO and dtOM,sort by=dtO,by={A,B}}];
	\path (intersection of A--C and M--B) coordinate (E)
		(intersection of A--B and M--D) coordinate (K)
		(intersection of A--B and M--O) coordinate (H)
	;
	\draw (M)--(B)--(O)--(A)--cycle
		(O)--(M)--(D)--(A) (H)--(C)--(B)--(A)--(E)--(H)--(D)--(O)--(C);
	\foreach \x/\y/\z in {M/A/O, M/B/O, O/H/B}
	\path pic[draw=black, angle radius=6pt] {right angle = \x--\y--\z};
	\foreach \d/\g in {O/-135, A/90, B/-90, M/0, C/60, D/180, E/-90, K/120, H/-45}
	\path[draw=black, fill=white] (\d) circle(1pt) + (\g:9pt) node {$\d$};
\end{tikzpicture}
```

**4. Tam giác $ABC$, đường tròn đường kính $BC$ cắt $AB$, $AC$ tại $F$, $E$**
```latex
\begin{tikzpicture}[scale=1, font=\footnotesize, line join=round, line cap=round, >=stealth, declare function={r=3;}]
	\path (0,0) coordinate(O);
	\path[name path=dtO] (O) circle(r);
	\path (-r,0) coordinate(B)
		( r,0) coordinate(C);
	\path (-1.5,4) coordinate(A);
	\path ($(A)!(O)!(B)$) coordinate (Hb)
		($(B)!2!(Hb)$) coordinate (F)
		($(A)!(O)!(C)$) coordinate (Hc)
		($(C)!2!(Hc)$) coordinate (E);
	\draw (A)--(B)--(C)--cycle (C)--(F) (B)--(E)
		(O) circle(r);
	\foreach \x/\y/\z in {B/E/C, B/F/C}
	\path pic[draw=black, angle radius=6pt] {right angle = \x--\y--\z};
	\foreach \d/\g in {O/-90, A/90, B/180, C/0, E/60, F/120}
	\path[draw, fill=white] (\d) circle(1pt) + (\g:9pt) node {$\d$};
\end{tikzpicture}
```

**5. Hai góc kề bù**
```latex
\begin{tikzpicture}[scale=1, font=\footnotesize, line join=round, line cap=round, >=stealth]
	\foreach \x/\y/\z in {0/0/O, 0/3/y, 50/3/m, 180/2.5/x}
	\path (\x:\y) coordinate (\z);
	\draw (y) node[below]{$y$}--(O)--(x) node[below]{$x$} (O)--(m) node[left]{$z$};
	\path ($(O)!1cm!(y)$) coordinate (Uy)
		($(O)!1cm!(m)$) coordinate (Um)
		($(Uy)!.5!(Um)$) coordinate (Ub);
	\path pic[draw,angle radius=12pt] {angle=y--O--m};
	\draw ($(O)!10pt!(Ub)$)--($(O)!14pt!(Ub)$);
	\path pic[draw,angle radius=10pt] {angle=m--O--x};
	\foreach \d/\g in {O/-90}
	\path[draw=black, fill=white] (\d) circle(1pt) + (\g:9pt) node {$\d$};
\end{tikzpicture}
```

**6. Hai góc đối đỉnh**
```latex
\begin{tikzpicture}[scale=1, font=\footnotesize, line join=round, line cap=round, >=stealth]
	\foreach \x/\y/\z in {0/0/O, -20/2/m, 28/2.5/n, 160/2/a, 208/2.5/b}
	\path (\x:\y) coordinate (\z);
	\draw (m)--(a) node[above]{$a$} (n)--(b) node[below]{$b$};
	\foreach \x/\y/\z/\t in {O/0/5/4, O/90/4/2, O/180/5/1, O/-60/5/3}
	\node at ($(\x)+(\y:\z mm)$) {$\t$};
	\foreach \d/\g in {O/-90}
	\path[draw=black, fill=white] (\d) circle(1pt) + (\g:9pt) node {$\d$};
\end{tikzpicture}
```

**7. Ba đường thẳng song song, mô hình chữ M** (mũi tên giữa đoạn biểu thị đường thẳng, dùng `decorations.markings`):
```latex
\begin{tikzpicture}[font=\footnotesize, line cap=round, line join=round, >=stealth, declare function={r=3;},
	arrowmid/.style={decoration={markings, mark=at position 0.5 with {\arrow{>}}}, postaction={decorate}}]
	\foreach \x/\y/\z in {0/0/A, -3/0/B, -3/1.5/x, 2.5/1.5/y, -2/-2/m, 2.5/-2/n}
	\path(\x,\y) coordinate(\z);
	\path ($(A)+(120:1)$) coordinate (Ax)
		($(A)+(-110:1)$) coordinate (Ay)
		(intersection of A--Ax and x--y) coordinate (D)
		(intersection of A--Ay and m--n) coordinate (E)
		($(A)!1.5!(D)$) coordinate (z)
	;
	\draw[arrowmid] (D)--(x) node[above]{$x$};
	\draw[arrowmid] (A)--(B);
	\draw[arrowmid] (E)--(n) node[below]{$n$};
	\draw (z) node[above]{$z$}--(A)--(E);
	\foreach \x/\y/\z/\t in {D/145/6/60}
	\node at ($(\x)+(\y:\z mm)$) {$\t^\circ$};
	\foreach \t/\g in {A/0, B/180, D/0, E/180}
	\draw[fill=black] (\t) circle (1pt) node[shift={(\g:8pt)}]{$\t$};
\end{tikzpicture}
```

**8. Hình thang $ABCD$ ($AD \parallel BC$, hai cạnh bên kéo dài thành tia)**
```latex
\begin{tikzpicture}[font=\footnotesize, line cap=round, line join=round, >=stealth, declare function={r=3;}]
	\foreach \x/\y/\z in {0/0/A, 3/0/D, -1/0/n, 4/0/x, 0/3/m, 3.5/3/y}
	\path(\x,\y) coordinate(\z);
	\path ($(A)+(71:4)$) coordinate (a)
		($(D)+(97:3.75)$) coordinate (b)
		(intersection of A--a and m--y) coordinate (B)
		(intersection of D--b and m--y) coordinate (C)
		($(B)!1.3!(A)$) coordinate (z)
		($(C)!1.3!(D)$) coordinate (t)
	;
	\draw (m) node[above]{$m$}--(y) (n) node[above]{$n$}--(x) (z)--(a) node[left]{$a$} (t)--(b) node[right]{$b$};
	\foreach \x/\y/\z/\t in {D/145/5/3, D/45/4/1, D/215/5/4, C/-50/4/1}
	\node at ($(\x)+(\y:\z mm)$) {$\t$};
	\foreach \t/\g in {A/130, B/140, D/-50, C/40}
	\draw[fill=black] (\t) circle (1pt) node[shift={(\g:8pt)}]{$\t$};
\end{tikzpicture}
```

**9. Hình thang có hai cạnh bên $AB$, $CD$ được kéo dài (góc tùy chỉnh)**
```latex
\begin{tikzpicture}[scale=1, line join=round, line cap=round, >=stealth]
	\def\a{1.5}
	\def\gH{80} \def\gK{120}
	\path (0,0) coordinate (H)
		(\gH:\a) coordinate (F)
		(0:{\a+1}) coordinate (K)
		($(F)+(180:1.4)$) coordinate (a)
		($(K)+(\gK:1)$) coordinate (i)
		(intersection of F--a and K--i) coordinate (I)
	;
	\path ($(H)!1.5!(F)$) coordinate (Kx);
	\draw (a)--($(a)!1.5!(I)$)
		($(H)+(180:.9)$)--($(K)+(0:1)$)
		($(F)!1.5!(H)$) node[right]{$x$}--(Kx)
		($(K)!1.5!(I)$)--($(I)!1.5!(K)$)
	;
	\path pic[draw=black, angle radius=.4cm, angle eccentricity=1.6, "$80^\circ$"] {angle = I--F--Kx};
	\path pic[draw=black, angle radius=.4cm, angle eccentricity=1.6, "$80^\circ$"] {angle = K--H--F};
	\path pic[draw=black, angle radius=.5cm, angle eccentricity=1.6, "$60^\circ$"] {angle = I--K--H};
	\foreach \x/\g/\ten in {H/140/B, K/-120/C, F/120/A, I/60/D}
	\fill[black](\x) circle (1pt) +(\g:5mm) node {$\ten$};
\end{tikzpicture}
```

**10. Hình thang có 2 góc vuông (ba tia song song $y$, $z$, cạnh xiên $x$, đáy $c$)**
```latex
\begin{tikzpicture}[font=\footnotesize, line join=round, line cap=round, >=stealth, scale=1]
	\def\h{2.5}
	\path (1.5,0) coordinate (B)
		(6,0) coordinate (N)
		(6,\h) coordinate (M)
		($(B)+(60:{\h/sin(60)})$) coordinate (A)
		($(A)+(-2,0)$) coordinate (y_start)
		($(M)+(2,0)$) coordinate (y_end)
		($(B)+(-2,0)$) coordinate (z_start)
		($(N)+(2,0)$) coordinate (z_end)
		($(A)+(60:1.2)$) coordinate (x_top)
		($(B)+(-120:1.2)$) coordinate (x_bot)
		($(M)+(0,1)$) coordinate (c_top)
		($(N)+(0,-1)$) coordinate (c_bot)
	;
	\draw (y_start)--(y_end) node[pos=0.1, above]{$y$} node[pos=0.9, above]{$y'$};
	\draw (z_start)--(z_end) node[pos=0.1, above]{$z$} node[pos=0.9, above]{$z'$};
	\draw (x_bot) node[left]{$x'$}--(x_top) node[left]{$x$};
	\draw (c_bot) node[right]{$c$}--(c_top);
	\path pic[draw=black, fill=orange!30, angle radius=5mm, "$60^\circ$"] {angle = M--A--x_top};
	\foreach \p/\q/\r in {A/M/N, M/N/B}
	\path pic[draw=black!60, fill=green!15, angle radius=3mm] {right angle = \p--\q--\r};
	\foreach \x/\pos in {A/180, B/-60, M/45, N/-45}
	\filldraw[fill=blue!70, draw=black] (\x) circle (1.2pt) node[shift={(\pos:3.5mm)}]{$\x$};
\end{tikzpicture}
```

**11. Đường thẳng $MN$ qua đỉnh $A$ của tam giác $ABC$, song song $BC$**
```latex
\begin{tikzpicture}[font=\footnotesize, line cap=round, line join=round, scale=1, >=stealth, declare function={r=3;}]
	\foreach \x/\y/\z in {0/0/B, 4/0/C}
	\path(\x,\y) coordinate(\z);
	\path ($(B)+(55:1)$) coordinate (Bx)
		($(C)+(140:1)$) coordinate (Cx)
		(intersection of B--Bx and C--Cx) coordinate (A)
		($(A)+(0:2)$) coordinate (N)
		($(A)+(180:2)$) coordinate (M)
	;
	\draw (A)--(B)--(C)--cycle (M)--(N);
	\foreach \x/\y/\z/\t in {B/25/6/55, A/210/6/55, A/-20/6/40, C/160/6/40}
	\node at ($(\x)+(\y:\z mm)$) {$\t^\circ$};
	\foreach \t/\g in {A/90, B/210, C/-30, M/90, N/90}
	\draw[fill=black] (\t) circle (1pt) node[shift={(\g:8pt)}]{$\t$};
\end{tikzpicture}
```

### Checklist tự kiểm TikZ trước khi trả kết quả

- [ ] Mọi điểm dùng trong `\draw` đều đã khai báo ở bước 1 (bằng `\path`/`coordinate`, không gõ tọa độ tay trừ điểm gốc/đỉnh đã biết số liệu).
- [ ] **Mọi phép quay `($(X)!1!<góc>:(Y)$)` đã đặt TÂM QUAY (`X`) đứng TRƯỚC** — đường vuông góc/trung trực dựng xong có ký hiệu góc vuông tại đúng điểm và vị trí giao điểm khớp dự đoán hình học (trong hay ngoài tam giác).
- [ ] Mọi `name intersections` với đường tròn có `sort by=` theo path có hướng rõ và đúng số giao; hoặc dùng phép dựng hình học. Kiểm tra riêng từng giao điểm, không suy ra vị trí từ tên mặc định.
- [ ] Path kéo dài chỉ phục vụ tính giao có `overlay`; nét cần nhìn thấy không dùng `overlay`.
- [ ] Không còn `\draw (A)--(B) (B)--(C)` rời rạc — đã gộp chuỗi; các chuỗi rời nhau và đường tròn đã gộp vào một `\draw`.
- [ ] Danh sách xuất hiện điểm (bước 4) không lẫn điểm ảo/phụ trợ.
- [ ] Không còn `above/below/left/right/north/south` cho NHÃN ĐIỂM; không còn `\tkzLabelPoints`, `\tkzMarkRightAngle`; không dùng `atan2`/`\pgfmathanglebetweenpoints` cho phân giác.
- [ ] Các ký hiệu góc/đoạn cùng loại đã gộp chung một `\foreach`.
- [ ] Đường của hình chính vẽ một lần ngoài vòng lặp chú thích. `\draw` dùng vẽ chính gạch/ô vuông ký hiệu được phép nằm trong vòng lặp tương ứng.
- [ ] Nhãn số đo/đơn vị đúng quy tắc "số trong `$`, đơn vị ngoài `$`".
- [ ] Đã đóng dấu `;` sau mỗi lệnh `\path`/`\draw`.
