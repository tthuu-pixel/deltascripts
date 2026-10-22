# Mẫu trình bày lời giải (bắt buộc theo đúng khuôn này)

Mục lục: quy tắc chung; phương trình; hệ phương trình; ẩn phụ; nhiều ý; chữ “hoặc”; phép tính dài/ngắn; câu chữ; cấp lớp.

Ở chế độ Chuẩn hóa, chỉ sửa cách trình bày lời giải đã có. Mẫu dưới đây dùng tạo lời giải mới khi được yêu cầu Giải bài/Soạn mới; không dùng để bổ sung hay đổi phép suy luận của nguồn.

## 0. Quy tắc chung

- Mỗi câu một dòng, kết thúc bằng `\\` (trừ dòng cuối và dòng ngay trước `align*`/`itemize`/`enumerate`).
- Không dòng trống. Nội dung `\loigiai{` thụt thêm 1 tab so với `\loigiai`.
- Không `\Rightarrow`, `\Leftrightarrow`, `\implies`, `\hoac{}`, `$$...$$`, `\[...\]`.
- Biến đổi nhiều bước → `align*`, dấu `&` đặt trước dấu `=`.
- Khi viết lời giải mới, kết luận bắt đầu bằng “Vậy …”; chỉ ghi đơn vị nếu đại lượng có đơn vị.
- Mã mẫu có dấu `<...>` là khung cần điền theo bài thật; không sao chép nguyên dấu đó vào tài liệu giao người dùng.

## 1. Khung chuẩn — bài toán lập phương trình

```latex
\loigiai{
	Gọi <đại lượng cần tìm> là $x$ (<đơn vị>, <điều kiện>).\\
	<Biểu diễn đại lượng 1> là $\dfrac{...}{x}$ (<đơn vị>).\\
	<Biểu diễn đại lượng 2> là $x+a$ (<đơn vị>).\\
	<Biểu diễn đại lượng 3> là $\dfrac{...}{x+a}$ (<đơn vị>).\\
	Vì <dữ kiện then chốt> nên ta có phương trình
	\begin{align*}
		\dfrac{S}{x}-\dfrac{S}{x+a}&=k.
	\end{align*}
	Quy đồng và khử mẫu phương trình trên, ta được
	\begin{align*}
		S(x+a)-Sx&=kx(x+a)\\
		\ldots&=\ldots\\
		x^2+bx+c&=0.
	\end{align*}
	Giải phương trình trên, ta được $x=x_1$ (thỏa mãn) và $x=x_2$ (loại).\\
	Vậy <trả lời đúng câu hỏi của đề> là $x_1$ <đơn vị>.
}
```

Ghi chú:
- Ghi rõ **giá trị** của nghiệm bị loại (`$x=-30$ (loại)`), không viết “một nghiệm âm”.
- Nếu đề hỏi đại lượng khác với ẩn (thời gian khi ẩn là vận tốc, số người thực tế…), phải thêm một dòng tính rồi mới kết luận.

## 2. Khung chuẩn — bài toán lập hệ phương trình

```latex
\loigiai{
	Gọi <đại lượng 1> là $x$ (<đơn vị>) và <đại lượng 2> là $y$ (<đơn vị>), điều kiện <...>.\\
	<Diễn giải dữ kiện 1> nên ta có phương trình <pt 1>.\\
	<Diễn giải dữ kiện 2> nên ta có phương trình <pt 2>.\\
	Ta có hệ phương trình $\heva{&<pt 1>&(1)\\&<pt 2>&(2)}$\\
	Nhân hai vế của $(1)$ với $k$, ta được <...>.\\
	Trừ vế theo vế phương trình $(2)$ cho đẳng thức vừa nhận được, ta có
	\begin{align*}
		\ldots&=\ldots\\
		x&=x_0.
	\end{align*}
	Suy ra $y=y_0$ (thỏa mãn điều kiện).\\
	Vậy <kết luận>.
}
```

Khi phương trình cần rút gọn trước khi vào hệ:
```latex
	Rút gọn phương trình thứ nhất, ta được
	\begin{align*}
		\ldots&=\ldots\\
		x-y&=3.
	\end{align*}
```

## 3. Đặt ẩn phụ (vòi nước, công việc, xuôi ngược dòng)

```latex
	Đặt $u=\dfrac{1}{x}$ và $v=\dfrac{1}{y}$ với $u>0$, $v>0$, ta được hệ phương trình $\heva{&u+v=\dfrac{1}{6}&(1)\\&3u+8v=\dfrac{5}{6}&(2)}$\\
	...
	Suy ra $x=10$ và $y=15$ (thỏa mãn điều kiện).\\
```

## 4. Bài có nhiều ý (a, b)

```latex
\loigiai{
	\begin{enumerate}
		\item <lời giải ý a, các dòng kết thúc bằng \\>
		\item <lời giải ý b>
	\end{enumerate}
}
```
`\item` thụt 2 tab, nội dung tiếp theo cùng mức với `\item`.

## 5. Chữ “hoặc” thay cho `\hoac{}`

```latex
\begin{align*}
	\left|x-\dfrac{1}{2}\right|-5 &= -2\\
	\left|x-\dfrac{1}{2}\right| &= 3\\
	\text{Suy ra } x-\dfrac{1}{2} = 3 &\text{ hoặc } x-\dfrac{1}{2} = -3\\
	\text{Suy ra } x = \dfrac{7}{2} &\text{ hoặc } x = -\dfrac{5}{2}.
\end{align*}
```
Hai điều kiện đồng thời thì dùng `\text{ và }`.

## 6. Phép tính dài trình bày dọc

```latex
\begin{align*}
	1\dfrac{3}{5} - \left|\dfrac{5}{2}\right| + \dfrac{-1}{4} + \dfrac{21}{8} &= \dfrac{8}{5} - \dfrac{5}{2} - \dfrac{1}{4} + \dfrac{21}{8}\\
	&= \dfrac{64}{40} - \dfrac{100}{40} - \dfrac{10}{40} + \dfrac{105}{40}\\
	&= \dfrac{59}{40}.
\end{align*}
```

## 7. Phép tính ngắn gộp một dòng

`Xét $\widehat{ABC}$ có $Bm$ là tia phân giác.\\` rồi `Suy ra $\widehat{ABC}=2\cdot\widehat{ABm}=2\cdot 37^\circ=74^\circ$ (tính chất tia phân giác).`

## 8. Câu chữ chuẩn hay dùng

| Tình huống | Câu chuẩn |
|---|---|
| Đổi đơn vị | `Đổi $1$ giờ $40$ phút $=\dfrac{5}{3}$ giờ.\\` |
| Đặt ẩn | `Gọi ... là $x$ (<đơn vị>, $x>0$).\\` |
| Lập pt | `Vì ... nên ta có phương trình` |
| Khử mẫu | `Quy đồng và khử mẫu phương trình trên, ta được` |
| Khai triển | `Khai triển và rút gọn phương trình thứ nhất, ta được` |
| Cộng/trừ hệ | `Cộng vế theo vế hai phương trình trên, ta được` |
| Thế | `Từ phương trình thứ hai suy ra $y=x+4$, thay vào phương trình thứ nhất ta được` |
| Nghiệm | `Giải phương trình trên, ta được $x=a$ (thỏa mãn) và $x=b$ (loại).\\` |
| Kết luận | `Vậy ... là $...$ <đơn vị>.` |

## 9. Ngôn ngữ theo cấp lớp

- Lớp 7 trở xuống: không dùng “phương trình”, “nghiệm”. Dùng “bài toán tìm $x$”; vô nghiệm ghi “không có giá trị nào của $x$ thỏa mãn”.
- Lớp 8, 9: dùng thuật ngữ phù hợp kiến thức đã học; không mặc định học sinh lớp 8 đã học hệ phương trình.
