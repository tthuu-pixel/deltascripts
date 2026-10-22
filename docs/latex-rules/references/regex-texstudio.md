# Regex TeXstudio có phạm vi rõ ràng

Bật Regular Expression; sao lưu hoặc làm trên bản có lịch sử thay đổi. Xem các kết quả khớp trước khi Replace All. Regex không hiểu cấu trúc LaTeX lồng nhau, nên chỉ dùng các mẫu dưới cho nội dung đơn giản đã nêu.

## 1. Tùy chọn chỉ chứa nguồn đề

Find (một dòng, dấu `|` là phép lựa chọn của regex):

```regex
\\begin\{(bt|ex|vd)\}\[[ \t]*(?:Trích đề|THPT|THCS|SGK|SBT|Tài liệu)[^\]\r\n]*\]
```

Replace:

```text
\begin{\1}
```

Chỉ xóa tùy chọn xác định là nguồn. Giữ `\begin{vd}[Tìm x]`, `\begin{vd}[Tỉ lệ thức]`, các tiêu đề dạng bài và tùy chọn chứa thông tin toán học. Nguồn dùng tiền tố khác cần bổ sung tiền tố cụ thể sau khi xem nội dung; không đổi thành regex xóa mọi `[...]`.

## 2. Dòng nguồn đứng riêng

Find:

```regex
^[ \t]*\[[ \t]*(?:Trích đề|THPT|THCS|SGK|SBT|Tài liệu)[^\]\r\n]*\][ \t]*$
```

Replace rỗng. Giữ dòng khoảng toán học như `[-2;3]`.

## 3. Comment mã phân loại hoặc dự án

Find:

```regex
%(?:\[(?:[0-9]+[A-Za-z][^\]\r\n]*|Dự án[^\]\r\n]*)\]%?)+
```

Replace rỗng sau khi kiểm tra khớp. Không xóa mọi comment `%`: phần trăm có thể nối dòng macro, còn `\%` là ký hiệu hiển thị. Các khối nguồn lẫn loại khác cần kiểm tra riêng.

## 4. Nguồn Trích đề được in nghiêng

Find cho dòng `\textit{(Trích đề ...)}` với xuống dòng `\\` tùy chọn, nội dung không có ngoặc nhọn lồng:

```regex
^[ \t]*\\textit\{\([ \t]*Trích đề[^{}\r\n]*\)\}[ \t]*(?:\\\\)?[ \t]*$
```

Find cho dòng `(\textit{Trích đề ...})`, có thể chứa `\footnotesize`:

```regex
^[ \t]*\([ \t]*\\textit\{(?:\\footnotesize[ \t]*)?Trích đề[^{}\r\n]*\}[ \t]*\)[ \t]*(?:\\\\)?[ \t]*$
```

Find cho dòng `[\textit{Trích đề ...}]`:

```regex
^[ \t]*\[[ \t]*\\textit\{Trích đề[^{}\r\n]*\}[ \t]*\][ \t]*$
```

Replace rỗng. Giữ các đoạn như `\textit{(Đơn vị: cm)}`; không dùng regex xóa tất cả chữ in nghiêng hoặc ngoặc đơn.

## 5. Các thay thế cú pháp đơn giản

| Mục đích | Find | Replace |
|---|---|---|
| Bỏ `indam` khi không có ngoặc lồng | `\\indam\{([^{}]*)\}` | `\1` |
| Xóa một dòng trống | `^[ \t]*\r?\n` | rỗng |
| Xóa dòng phân cách dạng `%===...` | `^[ \t]*%+=+[^\r\n]*$` | rỗng |
| Đổi tên lệnh `frac` | `\\frac\b` | `\dfrac` |
| Bỏ `quad`, không nuốt xuống dòng | `\\quad\b[ \t]*` | rỗng |
| Đổi `choiceTFt` | `\\choiceTFt\b` | `\choiceTF` |
| Đổi `loigiaiTF` | `\\loigiaiTF\b` | `\loigiai` |

Giá trị trong cột Replace là nội dung nhập vào ô Replace của TeXstudio (`\1` là nhóm bắt); không coi chúng là literal replacement string của Python. Khi viết script, dùng cách escape/callback đúng với engine của script đó và kiểm tra bản chênh lệch.

## 6. Dấu thập phân

Find `([0-9]),([0-9])`, Replace `\1{,}\2` **chỉ trong vùng công thức đã chọn và đã xác định là số thập phân**. Không Replace All toàn file: `(2,5)` có thể là tọa độ TikZ hoặc cặp số, không phải số thập phân. Không dùng regex đơn lẻ để suy ra math mode, đổi hàm từng đoạn thành hệ, hoặc xử lý ngoặc nhọn lồng nhau.
