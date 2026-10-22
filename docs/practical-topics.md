# Danh mục chuyên đề toán thực tế

Danh mục dựa trên khung 18 chuyên đề do chủ dự án cung cấp. Chuyên đề được gộp theo mảng kiến thức, không chia lớp 8 và lớp 9. Mô tả ngắn giúp AI nhận dạng dạng bài; phần lý thuyết và ví dụ để người quản trị tự đưa lên.

| Thứ tự | Nhóm                 | Tên chuyên đề                                     |
| ------ | -------------------- | ------------------------------------------------- |
| 1      | Đại số               | Biểu thức đại số, đa thức và hằng đẳng thức       |
| 2      | Đại số               | Phân thức đại số                                  |
| 3      | Đại số               | Giải bài toán bằng cách lập phương trình          |
| 4      | Đại số               | Giải bài toán bằng cách lập hệ phương trình       |
| 5      | Đại số               | Phương trình bậc hai và bài toán lập phương trình |
| 6      | Đại số               | Bất phương trình bậc nhất một ẩn                  |
| 7      | Hàm số và đồ thị     | Hàm số bậc nhất và đồ thị                         |
| 8      | Hàm số và đồ thị     | Hàm số y = ax² (a ≠ 0)                            |
| 9      | Hình học và đo lường | Định lí Thalès và đường trung bình                |
| 10     | Hình học và đo lường | Tam giác đồng dạng và định lí Pythagore           |
| 11     | Hình học và đo lường | Tỉ số lượng giác và hệ thức trong tam giác vuông  |
| 12     | Hình học và đo lường | Đường tròn, cung, hình quạt và hình vành khuyên   |
| 13     | Hình học và đo lường | Hình chóp tam giác đều, hình chóp tứ giác đều     |
| 14     | Hình học và đo lường | Hình trụ, hình nón, hình cầu                      |
| 15     | Thống kê và xác suất | Dữ liệu và biểu đồ                                |
| 16     | Thống kê và xác suất | Tần số và tần số tương đối                        |
| 17     | Thống kê và xác suất | Xác suất thực nghiệm và biến cố đơn giản          |
| 18     | Thống kê và xác suất | Xác suất trong phép thử hai bước                  |

Hai mục xác suất được đặt theo nội dung, thay cho hai tên “Xác suất” trùng nhau trong khung ban đầu. Một bài có thể được gắn vào nhiều chuyên đề nếu phù hợp.

## Thêm danh mục vào D1

Chuyên đề là dữ liệu trong D1. Thêm danh mục không cần build hoặc triển khai lại Worker. Lệnh chỉ chạy khi được gọi, không tự tạo lại chuyên đề sau mỗi lần mở trang hoặc deploy.

```bash
# Xem trước, chưa ghi dữ liệu
npm run topics:seed -- --remote
# Ghi danh mục vào D1 thật
npm run topics:seed -- --remote --apply
```

Bỏ `--remote` để dùng D1 cục bộ đã chạy migrations; có thể chọn `--persist-to` tương tự lệnh tạo admin.

- Mọi chuyên đề mới đều lưu nháp, có icon, màu xanh/đỏ/vàng và mô tả. Lý thuyết, ví dụ để trống; không tạo câu hỏi hoặc tự gọi AI.
- Tái sử dụng chuyên đề có cùng tên (không phân biệt hoa/thường và khoảng trắng); chuyên đề đã được seed có ID ổn định để dùng lại khi đổi tên. Giữ tên, nội dung, trạng thái xuất bản và các liên kết câu hỏi của chuyên đề đã có. Chỉ sắp thứ tự và gán nhóm của danh mục.
- Tên và mô tả tab chuyên đề có chữ “lớp 8” hoặc “lớp 9” được bỏ phần chỉ lớp; các trường khác được giữ nguyên. Tên tab do chủ web đặt, như “Nắm chắc kiến thức”, vẫn được giữ.
- Trước mỗi lần ghi, sao lưu chuyên đề và cấu hình trang vào `.data/backups/` ngoài Git. Lệnh có thể chạy lại để bổ sung phần còn thiếu; không đưa khóa hoặc nội dung riêng vào log.

Sau khi thêm, mở **Quản trị → Chuyên đề**, bổ sung lý thuyết/ví dụ và xuất bản khi sẵn sàng. AI phân loại trong admin đọc được cả chuyên đề nháp, nên có thể xếp câu hỏi trước khi xuất bản.
