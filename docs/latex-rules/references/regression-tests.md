# Regression tests

Các ca dưới đây là **đặc tả kiểm thử hành vi**, không phải chương trình tự chạy và chưa mặc nhiên được đánh dấu đạt. Khi cập nhật quy tắc liên quan, đưa đầu vào cho một lượt thực hiện độc lập, đối chiếu bất biến và ghi kết quả thật. Script `scripts/check_examples.py` chỉ biên dịch các mẫu TikZ đầy đủ, không thay thế các ca này.

## RT-001 — Chuẩn hóa không sửa nội dung toán

- **Chế độ:** Chuẩn hóa.
- **Đầu vào:** `Giải phương trình $x+2=5$. Lời giải: $x=4$.`
- **Mong đợi:** Chỉ chuẩn hóa định dạng; giữ nguyên `$x=4$` trong nội dung nguồn. Không chủ động giải kiểm tra; nếu tình cờ thấy sai có thể ghi chú ngoài mã, trừ khi người dùng yêu cầu chỉ mã.
- **Cấm:** Tự đổi `$x=4$` thành `$x=3$`.

## RT-002 — Giải bài được tạo lời giải đúng

- **Chế độ:** Giải bài.
- **Đầu vào:** `Giải phương trình $x+2=5$.`
- **Mong đợi:** Lời giải kết luận `$x=3$`, đúng mẫu lời giải và quy tắc LaTeX.
- **Cấm:** Giữ một đáp án sai chỉ vì chế độ Chuẩn hóa có quy tắc bảo toàn.

## RT-003 — Hệ phương trình

- **Chế độ:** Chuẩn hóa.
- **Đầu vào:** môi trường `cases` chứa hai phương trình.
- **Mong đợi:** Dùng `$\heva{&...\\&...}$` khi việc đổi môi trường không làm thay đổi nội dung.
- **Cấm:** Giữ `cases` cho hệ phương trình. Không áp dụng việc đổi sang `heva` cho một hàm từng đoạn.

## RT-004 — Số thập phân và đơn vị

- **Chế độ:** Chuẩn hóa.
- **Đầu vào:** `Diện tích là 12,5 cm2.`
- **Mong đợi:** `Diện tích là $12{,}5$ cm$^2$.`
- **Cấm:** `$12,5\text{ cm}^2$`.

## RT-005 — Nhiều ý trong đề và lời giải

- **Chế độ:** Chuẩn hóa hoặc Giải bài.
- **Đầu vào:** bài có hai ý `a)`, `b)`.
- **Mong đợi:** Cả đề và lời giải đầy đủ dùng `enumerate` với `\item` trơn, số lượng/cấp ý khớp nhau. Lời giải nguồn thiếu ý thì báo thiếu; không tự bổ sung khi chỉ chuẩn hóa.
- **Cấm:** `\item[a)]` hoặc nhãn `a)` gõ tay.

## RT-006 — Tâm quay trong TikZ

- **Chế độ:** Vẽ hình TikZ.
- **Đầu vào:** dựng đường vuông góc với `$XY$` tại `$X$`.
- **Mong đợi:** Dùng `($(X)!1!90:(Y)$)`; có ký hiệu góc vuông tại `$X$`; vị trí hình phù hợp dự đoán hình học.
- **Cấm:** Đảo thành `($(Y)!1!90:(X)$)`.

## RT-007 — Giao đường tròn có định hướng

- **Chế độ:** Vẽ hình TikZ.
- **Đầu vào:** chỉ cần một trong hai giao điểm của đường thẳng với đường tròn.
- **Mong đợi:** Ưu tiên phép dựng hình học; nếu dùng `name intersections`, phải có `sort by=` và hướng path rõ ràng.
- **Cấm:** Dựa vào `intersection-1` như một quy ước hình học hoặc sinh điểm rác.

## RT-008 — Kiến thức đúng tiến độ

- **Chế độ:** Giải hình học Toán 9 ở chương tỉ số lượng giác/hệ thức lượng trước chương đường tròn.
- **Mong đợi:** Dùng tam giác đồng dạng, Pythagore, Talet, đường trung trực hoặc tỉ số lượng giác đã học.
- **Cấm:** Tứ giác nội tiếp, góc nội tiếp, phương tích, Ptolemy, định lý sin/cosin, tọa độ hoặc vector.

## RT-009 — Cập nhật skill không tạo quy tắc trùng

- **Chế độ:** Cập nhật skill.
- **Đầu vào:** Một yêu cầu mới thay thế quy tắc cũ về cùng một cú pháp.
- **Mong đợi:** Tìm mọi vị trí liên quan, thay/hợp nhất thành một nguồn chuẩn, tăng version, ghi changelog và sửa/thêm regression test.
- **Cấm:** Chèn thêm câu mới nhưng giữ quy tắc cũ trái nghĩa ở file khác.

## RT-010 — Không khẳng định biên dịch khi chưa thử

- **Chế độ:** Bất kỳ chế độ tạo mã.
- **Đầu vào:** Mã phụ thuộc class/preamble mà người dùng chưa cung cấp.
- **Mong đợi:** Kiểm tra tĩnh và nêu chưa biên dịch thử nếu cần báo trạng thái.
- **Cấm:** Khẳng định “biên dịch được ngay” khi chưa có phép thử thực tế.

## RT-011 — Math mode và cú pháp TikZ

- **Chế độ:** Chuẩn hóa.
- **Đầu vào:** `\begin{align*}x+2&=5\\x&=3\end{align*}` và `\path (2.5,0) coordinate (A);`.
- **Mong đợi:** Giữ `align*` độc lập, không thêm `$` bên trong; giữ cú pháp tọa độ máy `(2.5,0)`.
- **Cấm:** `$\begin{align*}...$`, `$(...align...)$`, đổi dấu tọa độ thành `{,}`.

## RT-012 — Trắc nghiệm không có khóa đáp án

- **Chế độ:** Chỉ chuẩn hóa, giữ nội dung nguồn.
- **Đầu vào:** `\begin{ex}Kết quả $2+2$ là\choice{3}{4}{5}{6}\end{ex}`.
- **Mong đợi:** Bọc số theo quy ước và giữ đủ bốn phương án, không có `\True`.
- **Cấm:** Tự thêm `\True` chỉ vì tính được đáp án.

## RT-013 — Regex bảo vệ nội dung

- **Chế độ:** Regex xóa nguồn đề.
- **Đầu vào cần giữ:** `\begin{vd}[Tìm x]`, `[-2;3]`, `\textit{(Đơn vị: cm)}`, `\qquad` khi chỉ tìm `\quad`.
- **Đầu vào cần khớp:** `\begin{ex}[THPT A]`, `[SGK Toán 9]`, `\textit{(Trích đề A)}`.
- **Mong đợi:** Chỉ khớp metadata nguồn đã nêu; regex có `bt|ex|vd` nằm trong code block riêng để Markdown không làm vỡ bảng.
- **Cấm:** Regex xóa mọi ngoặc vuông hoặc mọi chữ in nghiêng.

## RT-014 — Dựng tiếp tuyến trên và dưới

- **Chế độ:** Vẽ hình.
- **Đầu vào:** Đường tròn tâm $O$, bán kính $r=2{,}5$, $M$ bên phải với $OM=6$, hai tiếp tuyến $MA$, $MB$, $A$ ở trên và $B$ ở dưới.
- **Mong đợi:** $OA=OB=r$, $OA\perp MA$, $OB\perp MB$, thứ tự trên/dưới đúng. Khi dùng hai đường tròn, đường tròn phụ không vẽ ra; path được định hướng và có `sort by`.
- **Cấm:** Hai giao trùng nhau, đảo tên trên/dưới, thiếu thư viện mũi tên, nhân đôi nét đường tròn.

## RT-015 — Bố cục và dữ liệu thiếu

- **Chế độ:** Chuẩn hóa một `vd` có hai ý và lời giải một ý.
- **Mong đợi:** Giữ hai ý đề, một ý lời giải và báo lời giải còn thiếu; giữ cột của nguồn hoặc một cột nếu chưa có bố cục.
- **Cấm:** Dàn hai ý thành ba cột, chèn lời giải thứ hai, tự tạo `section`.

## RT-016 — Quy tắc chung áp dụng cho lời giải mới

- **Chế độ:** Soạn bài có nghiệm nguyên đẹp và lời giải, dùng số thập phân và đơn vị.
- **Mong đợi:** Có `bt`, `loigiai`, tab theo cấp, `dfrac`, `{,}`, đơn vị ngoài math; phép tính và mọi dữ kiện nhất quán.
- **Cấm:** Bỏ qua reference chuẩn hóa chỉ vì đang ở chế độ Soạn mới.
