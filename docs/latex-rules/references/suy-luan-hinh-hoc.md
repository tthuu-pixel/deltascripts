# Quy tắc suy luận và trình bày lời giải hình học

Đọc cùng `mau-loi-giai.md` khi giải hoặc biên soạn lời giải hình học.

## Phương pháp và phạm vi kiến thức

1. Ưu tiên phương pháp tổng hợp: tam giác đồng dạng, định lý Talet, Pythagore, đường trung bình, đường trung trực, trung điểm, quan hệ song song/vuông góc và các tính chất hình học đã học.
2. Không dùng hệ trục tọa độ hoặc vector để chứng minh hình học, kể cả khi cách đó ngắn hơn, trừ khi người dùng yêu cầu rõ.
3. Chỉ dùng kiến thức học sinh đã học đến thời điểm của đề. Nếu thông tin lớp/chương ảnh hưởng trực tiếp đến phương pháp mà đầu vào chưa cho biết, hỏi người dùng; nếu có cách sơ cấp chắc chắn phù hợp thì chọn cách đó.
4. Với chương “Tỉ số lượng giác của góc nhọn/Hệ thức lượng trong tam giác vuông” trước chương đường tròn, không dùng tứ giác nội tiếp, góc nội tiếp, góc ở tâm, góc tạo bởi tiếp tuyến và dây, phương tích, Ptolemy, định lý sin/cosin, Menelaus, Ceva, tọa độ hoặc vector.

## Tam giác đồng dạng và hệ thức đoạn thẳng

- Phát biểu bằng ký hiệu `\triangle ABI\backsim\triangle CBA` và đúng thứ tự đỉnh tương ứng; không dùng `\sim` và không thay bằng câu văn “tam giác ... đồng dạng tam giác ...”.
- Không viện dẫn trực tiếp các hệ thức lượng trong tam giác vuông như một định lý có sẵn, trừ khi người dùng cho phép. Suy ra đẳng thức tích hoặc bình phương đoạn thẳng tại chỗ bằng hai tam giác đồng dạng: nêu hai góc, kết luận đồng dạng, viết tỉ số cạnh tương ứng, rồi suy ra hệ thức.

Quy tắc này dùng khi tạo/viết lại lời giải. Nếu chỉ chuẩn hóa, giữ lập luận nguồn; không chèn chứng minh mới. Pythagore được trích dẫn trực tiếp như mẫu bên dưới, không thuộc nhóm hệ thức đường cao cần suy ra lại bằng đồng dạng.

Mẫu sau giả sử $ABC$ vuông tại $A$ và $I$ là chân đường cao từ $A$ xuống $BC$:

```latex
Xét $\triangle ABI$ và $\triangle CBA$ có\\
$\widehat{AIB}=\widehat{CAB}=90^\circ$; $\widehat{ABI}=\widehat{CBA}$\\
Suy ra $\triangle ABI\backsim\triangle CBA$ (g.g)\\
Suy ra $\dfrac{AB}{CB}=\dfrac{BI}{BA}$\\
Suy ra $AB^2=BI\cdot BC$ (đpcm).
```

## Trích dẫn định lý hoặc tính chất được phép dùng

Nêu đối tượng đang xét, viết hệ thức, rồi có dòng “Suy ra ...” và ghi tên định lý/tính chất. Không gộp giả thiết và kết luận thành câu “Vì ... nên ...”.

```latex
Xét $\triangle ABC$ vuông tại $A$, ta có $BC^2=AB^2+AC^2$ (định lý Pythagore).\\
Suy ra $AC=\sqrt{BC^2-AB^2}=\sqrt{10^2-6^2}=8$ cm.
```

```latex
Xét $\triangle ABC$ vuông tại $A$, ta có\\
$AM$ là trung tuyến ứng với cạnh huyền $BC$ ($M$ là trung điểm của $BC$)\\
Suy ra $AM=BM=CM=\dfrac{BC}{2}$ (tính chất).
```

## Ghép nhiều kết quả trung gian

- Khi chỉ ghép một hoặc hai kết quả, dùng các dòng “Suy ra” liên tiếp.
- Khi cần từ ba đẳng thức hoặc tỉ số trung gian trở lên để suy ra kết luận cuối, đánh số `(1)`, `(2)`, `(3)` ở cuối các dòng cần dùng; kết luận bằng đúng một dòng “Từ (1), (2), ..., ($n$) suy ra ...”.
- Không dùng chuỗi `\Rightarrow`, không kể lại toàn bộ dây chuyền bằng văn xuôi.

## Dạng cách đều bốn điểm trước chương đường tròn

Không dùng tứ giác nội tiếp. Chọn một trong hai hướng sau khi phù hợp hình:

- **Hai đường trung trực:** gọi giao điểm của hai đường trung trực dễ dựng; dùng hình chữ nhật và Pythagore để so sánh bình phương khoảng cách, đưa hiệu về hệ thức tích đã chứng minh, rồi suy ra điểm thuộc đường trung trực còn lại.
- **Hình bình hành từ hai trung điểm:** khai thác tâm hình chữ nhật và trung điểm cạnh huyền để có các cặp khoảng cách bằng nhau; chứng minh các đường song song/vuông góc cần thiết, dựng hình bình hành và dùng Pythagore trong hai tam giác vuông để hoàn tất.

## Checklist

- Đúng thứ tự đỉnh trong mọi cặp tam giác đồng dạng.
- Mỗi định lý/tính chất đều hợp với tiến độ chương.
- Mọi hệ thức tích đoạn thẳng được suy ra theo quy tắc trên nếu người dùng không cho phép dùng trực tiếp.
- Không có tọa độ/vector hay kiến thức đường tròn học sau thời điểm của đề.
- Kết luận trả lời đúng từng ý, có `(đpcm)` khi thích hợp và không dùng ký hiệu suy ra bị cấm.
