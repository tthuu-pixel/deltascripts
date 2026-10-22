# Viết phần lý thuyết đầu chương

Mục lục: bố cục; hai ngữ cảnh `dang`; `luuy`; `nx`; kho công thức cho các dạng bài toán thực tế.

Các mẫu nội dung dưới đây chủ yếu phục vụ chương giải bài toán bằng phương trình/hệ phương trình. Giữ hệ môi trường khi viết chương khác, nhưng chọn nội dung theo chủ đề thật; không áp đặt lập bảng, đặt ẩn hoặc loại nghiệm cho một chương hình học không cần chúng. Khi chỉ chuẩn hóa lý thuyết có sẵn, giữ nội dung nguồn.

## Bố cục chuẩn

```latex
\chapter{Tên chương}
\begin{tomtat}[Phương pháp thực hiện]
	...các bước...
\end{tomtat}
\begin{luuy}
	...các lưu ý bám sát bộ bài tập bên dưới...
\end{luuy}
\begin{nx}
	...kĩ thuật lập bảng + một bảng minh họa...
\end{nx}
\begin{dang}{Tên dạng 1}
	Các quan hệ cần nhớ.
	\begin{enumerate}
		\item ...
	\end{enumerate}
\end{dang}
\begin{dang}{Tên dạng 2}
	...
\end{dang}
\baitap
```

**Chú ý phân biệt hai ngữ cảnh của `dang`:**

| Ngữ cảnh | Cú pháp |
|---|---|
| Lý thuyết đầu chương (có nội dung bên trong) | `\begin{dang}{Tên dạng} ... \end{dang}` — ngoặc nhọn |
| Phân loại trong phần bài tập (rỗng, `bt` nằm ngoài) | `\begin{dang}[Tên dạng]\end{dang}` — ngoặc vuông |

## Cách viết mục `luuy`

**Không** viết lưu ý chung chung. Đọc toàn bộ bộ bài tập của chương rồi rút ra $6$–$8$ ý, mỗi ý:
- mở đầu bằng một cụm in đậm đặt tên tình huống (`\textbf{Ba loại đối tượng, hai ẩn}`, `\textbf{Dạng kế hoạch -- thực tế}`),
- nêu đúng thao tác then chốt của các bài trong chương,
- kèm công thức tổng quát nếu có.

Với chương phương trình/hệ phương trình, hai ý cuối dành cho:
- **điều kiện của ẩn và việc loại nghiệm** (nguyên dương, lớn hơn vận tốc dòng nước, lớn hơn số người vắng…);
- **trả lời đúng câu hỏi**: nhiều đề hỏi đại lượng khác với ẩn đã đặt.

## Cách viết mục `nx`

Với chương giải bài toán bằng phương trình/hệ phương trình, viết kĩ thuật **lập bảng**, kèm một bảng `tabular` lấy số liệu từ bài đầu của chương. Chương khác dùng nhận xét phù hợp chủ đề. Nếu chưa có bộ bài tập, không nói đã đọc toàn bộ hoặc tự gán số liệu ví dụ cho “bài đầu tiên”; dùng ví dụ được ghi rõ là minh họa hoặc hỏi tài liệu cần thiết.

```latex
\begin{center}
	\begin{tabular}{|l|c|c|c|}
		\hline
		& Tổng khối lượng & Năng suất mỗi ngày & Số ngày\\
		\hline
		Kế hoạch & $120$ & $x$ & $\dfrac{120}{x}$\\
		\hline
		Thực tế & $120$ & $x+10$ & $\dfrac{120}{x+10}$\\
		\hline
	\end{tabular}
\end{center}
```

## Kho nội dung cho các khối `dang`

### Toán chuyển động
- $s=vt$, $v=\dfrac{s}{t}$, $t=\dfrac{s}{v}$; đổi thời gian về giờ trước khi lập phương trình.
- Dòng nước: $v_{\text{xuôi}}=v+v_n$, $v_{\text{ngược}}=v-v_n$, điều kiện $v>v_n$.
- Ngược chiều gặp nhau: $s_1+s_2=AB$. Cùng chiều đuổi kịp: hai quãng đường bằng nhau.
- Xuất phát lệch giờ: xe đi trước có thời gian nhiều hơn đúng bằng khoảng lệch; có nghỉ thì trừ thời gian nghỉ.

### Toán năng suất, công việc, vòi nước
- Khối lượng công việc $=$ năng suất $\times$ thời gian.
- Không cho khối lượng cụ thể thì coi cả công việc là $1$; làm xong trong $x$ thì mỗi đơn vị thời gian làm được $\dfrac{1}{x}$.
- Làm chung: $\dfrac{1}{x}+\dfrac{1}{y}=\dfrac{1}{t}$. Có vòi tháo: $\dfrac{1}{x}-\dfrac{1}{y}$, cần $\dfrac{1}{x}>\dfrac{1}{y}$.
- Đặt ẩn phụ $u=\dfrac{1}{x}$, $v=\dfrac{1}{y}$.
- Vượt mức $a\%$: nhân $\left(1+\dfrac{a}{100}\right)$.

### Toán hỗn hợp, dung dịch, hợp kim
- Khối lượng chất tan $=$ nồng độ $\times$ khối lượng dung dịch.
- Trộn: khối lượng hỗn hợp và khối lượng chất quan tâm đều cộng lại.
- Thêm nước / bay hơi: lượng chất tan không đổi.
- Hao hụt $a\%$: thành phẩm bằng $\left(1-\dfrac{a}{100}\right)$ lần nguyên liệu.

### Toán đếm, tính điểm, mua bán
- Hai phương trình: **số lượng** và **giá trị**.
- Ba loại đối tượng → dùng dữ kiện phụ để biểu diễn loại thứ ba theo hai ẩn.
- Điểm $=$ điểm cộng $-$ điểm trừ; số câu sai $=$ tổng $-$ đúng $-$ bỏ trống.
- Trò chơi đối kháng: tìm **đại lượng bất biến**.
- Giảm $a\%$: nhân $\left(1-\dfrac{a}{100}\right)$; tiền lãi một năm $=$ vốn $\times$ lãi suất.

### Toán chia đều chi phí
- Mỗi người đóng $=\dfrac{\text{tổng chi phí}}{\text{số người}}$.
- Vắng $a$ người, mỗi người đóng thêm $m$: $\dfrac{S}{x-a}-\dfrac{S}{x}=m$.
- Chi phí hỗn hợp với $k,p>0$: $T(x)=\dfrac{k}{x}+px$. Với ứng viên nguyên dương $x_0$, có $T(x)-T(x_0)=\dfrac{(x-x_0)(px-k/x_0)}{x}$. Muốn kết luận $x_0$ cho GTNN phải chứng minh tích không âm trên mọi $x$ nguyên dương hợp lệ; không coi một $x_0$ bất kỳ là điểm nhỏ nhất. Trong dạng cũ $T=\dfrac{(x-x_0)(px-q)}{x}+T_0$, phải đặt $q=k/x_0$ và $T_0=px_0+k/x_0$.

### Toán hình học, số học, tuổi
- HCN: chu vi $2(a+b)$, diện tích $ab$; thay đổi kích thước thì khai triển tích mới rồi trừ tích cũ.
- Tam giác vuông: $a^2+b^2=c^2$, diện tích $\dfrac{1}{2}ab$; hệ gồm một pt bậc nhất và một pt bậc hai.
- Số hai chữ số: $\overline{ab}=10a+b$, số ngược lại $10b+a$.
- Tuổi: hiệu số tuổi không đổi.
