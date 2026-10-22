# Changelog

## 15.0.1 — 2026-09-12

- Rà lại v14 và v15 bằng thực thi: v15.0.0 có 3/19 khối TikZ đầy đủ lỗi `Unknown arrow tip kind 'Stealth'` với các thư viện được công bố; đổi sang `stealth` và thống nhất các ví dụ theo thứ tự khai báo → vẽ → ký hiệu → nhãn điểm.
- Sửa các path giao đường tròn thiếu `sort by`, chỉ rõ hướng chạy để đặt tên tiếp điểm trên/dưới; dùng hình chiếu và đối xứng cho giao thứ hai đã có một điểm trên đường tròn. Sửa gạch giữa cung dựa trên phân giác thật và tiêu đề mẫu hình thang/đường song song.
- Khôi phục quy tắc tab, `item` trơn ở cả đề/lời giải, `cdot`, `backsim`; buộc đọc quy tắc cú pháp ở mọi chế độ tạo LaTeX.
- Làm rõ ngoại lệ `align*`, hàm từng đoạn, tọa độ PGF và khung `immini`; không suy diễn đáp án `True`, không tạo lời giải còn thiếu hoặc chia số cột vượt số ý khi chỉ chuẩn hóa.
- Viết lại regex xóa nguồn theo tiền tố cụ thể để giữ tiêu đề ví dụ, khoảng số và chữ in nghiêng có nội dung. Đưa regex có dấu `|` ra code block để tránh vỡ bảng Markdown.
- Sửa trục số biểu đồ có độ lệch gốc; bỏ biến toàn cục trong biểu đồ tròn; làm rõ khoảng cách số khác khoảng cách nhóm phân loại.
- Làm rõ thang điểm 2/1/0 của bài đếm, điều kiện công thức chi phí và phạm vi các mẫu lý thuyết phương trình; khoảng giá/vận tốc chỉ là gợi ý soạn dữ liệu giả định.
- Dùng `VERSION` làm nguồn phiên bản duy nhất; bổ sung script biên dịch mẫu và các ca hành vi. Phân biệt kiểm tra cấu trúc, biên dịch mẫu TikZ và tương thích macro/class của người dùng.
- Kiểm chứng tại bản sửa: 19 khối TikZ đầy đủ (18 hình và một khung) biên dịch bằng XeLaTeX; mẫu gạch cung rời biên dịch bằng pdfLaTeX; xem 18 hình. Thử độc lập ba yêu cầu chuẩn hóa, soạn hệ phương trình và vẽ tiếp tuyến. Kiểm tra 11 ca khớp regex bằng Python `re` và 15 phép thế ngược số liệu. Chưa thử giao diện TeXstudio hoặc class/macro riêng của người dùng; 16 ca trong `regression-tests.md` là đặc tả, không phải 16 test tự động đã chạy.

## 15.0.0 — 2026-09-12

- Chuyển gói từ Claude Plugin sang Codex Skill; bỏ phụ thuộc vào `.claude-plugin/plugin.json` và thêm `agents/openai.yaml`.
- Tách rõ bảy chế độ: chuẩn hóa, giải bài, kiểm tra đề, soạn mới, lý thuyết đầu chương, regex TeXstudio và cập nhật skill.
- Ngăn xung đột giữa yêu cầu “giữ nguyên nội dung” với yêu cầu “thế ngược, kiểm tra và sửa đề”.
- Rút gọn `SKILL.md` thành bộ định tuyến; chuyển quy tắc TikZ dài sang các tài liệu hình học và biểu đồ riêng.
- Chọn nội dung TikZ hình học trong `SKILL.md` v14 làm nguồn chuyển đổi; bản này chưa biên dịch toàn bộ mẫu và vẫn còn một số xung đột được sửa ở 15.0.1.
- Bổ sung quy tắc an toàn cho nội dung trích dẫn/file đầu vào, kiểm chứng thông tin thực tế có thể thay đổi và không tuyên bố đã biên dịch khi chưa biên dịch.
- Bổ sung quy trình cập nhật phiên bản, changelog và regression tests để skill có thể phát triển dần qua từng lần sử dụng.
