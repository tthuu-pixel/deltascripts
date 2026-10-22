# Quản lý nội dung học sinh

Mở **`/admin`** và đăng nhập bằng tài khoản quản lý hiện có. Trang giáo viên được đổi thành trang quản trị; tài khoản, mật khẩu, mã học sinh và câu hỏi cũ vẫn được giữ.

## Tạo chuyên đề và bài học

1. Chọn **Chuyên đề → Tạo chuyên đề**.
2. Nhập tên, nhóm, mô tả, chọn màu. Bấm nút biểu tượng để mở bảng 50 icon toán cấp 2, chỉ có hình, rồi bấm icon muốn dùng. Nhóm chuyên đề do bạn tự đặt, ví dụ Đại số hoặc Hình học.
3. Nhập **Lý thuyết** và **Ví dụ** ở hai vùng riêng; mỗi vùng có nút nhập file TeX và xem trước. Cả hai đều là tùy chọn. Khi mở chuyên đề, học sinh có ba tab **Lý thuyết**, **Ví dụ** và **Bài tập vận dụng**. Bài vận dụng tự hiện danh sách đề bài trong đúng chuyên đề (10 bài mỗi trang), mỗi bài có nút **Đáp án** để mở/ẩn lời giải riêng. Không cần chọn dạng Câu 1–Câu 7 trong tab này; phần **Luyện câu hỏi** vẫn luyện theo dạng câu như trước.
4. Dùng **Xem trước** để kiểm tra công thức và hình TikZ. File TeX có `document` được tách phần thân và các khai báo hình vẽ; nguồn toán học không bị tự viết lại.
5. Bấm **Lưu chuyên đề**. Mặc định lưu nháp; bật **Xuất bản chuyên đề cho học sinh** khi muốn cho hiện.

Dùng mũi tên để đổi thứ tự chuyên đề. Xóa chuyên đề chỉ bỏ chuyên đề và các liên kết phân loại, không xóa câu hỏi trong kho. Chuyên đề cũ viết trong mã nguồn đã được thay bằng nội dung do người quản trị tự biên soạn; hệ thống không tự xuất bản bài mẫu.

## Nhập và phân loại câu hỏi

1. Chọn **Ngân hàng câu hỏi**, tải `.tex` hoặc `.docx` lên. Một file có thể chứa nhiều câu; giới hạn file là 20 MB.
2. Cửa sổ **Chuẩn hóa & kiểm tra** tự mở. Xem các thay đổi, cảnh báo có số dòng, đề/lời giải và hình. Có thể sửa nguồn đang dùng, mở **Nguồn gốc để đối chiếu** hoặc **Dùng lại nội dung gốc**. Bấm **Duyệt và dùng bản này** rồi mới lưu. Một câu có thể thuộc tối đa 10 chuyên đề, dùng chung một bản ghi.
3. Nếu số câu trong file không phải dạng Câu 1–Câu 7, chọn **Dạng câu cho bản nhập** để gán cả bản nhập vào dạng phù hợp. Nhãn gốc và dạng câu là hai thông tin riêng.
4. Bấm **Lưu lên hệ thống**. Mặc định lưu nháp. Có thể chọn **Xuất bản ngay sau khi lưu**.
5. Với câu đã có, lọc theo chuyên đề, dạng câu hoặc trạng thái; tìm theo nhãn/nội dung; chọn một trang để phân loại hàng loạt. Có ba cách gán chuyên đề: thêm, thay toàn bộ hoặc bỏ khỏi chuyên đề. Có thể đổi dạng câu và xuất bản/thu về nháp cùng lúc.
6. Chọn **Chỉnh sửa** trên từng câu để sửa đề bài, lời giải, dạng câu, nhãn, chuyên đề và trạng thái, rồi xem trước trước khi lưu.

Các câu cũ chưa được phân loại nằm ở bộ lọc **Chưa gắn chuyên đề**. Bạn có thể phân loại lại mà không cần tải nguồn lên lần nữa.

**Hai trạng thái xuất bản độc lập:** câu hỏi đã xuất bản được dùng trong luyện Câu 1–Câu 7 và tạo đề. Để hiện trong một chuyên đề, cả chuyên đề và câu hỏi phải được xuất bản, đồng thời câu hỏi phải được gắn vào chuyên đề đó. Bài nháp không được API trả về cho học sinh, kể cả khi biết ID.

## Chuẩn hóa và AI phân loại

- Chuẩn hóa file mới chạy trong Web Worker trên trình duyệt. Các quy tắc tự động hiện gồm: tách điểm số/tùy chọn nguồn đầu bài, bỏ nội dung comment mã nguồn đã nhận diện, chuẩn hóa `frac`, `ne/ge/le`, `quad`, `choiceTFt`, `loigiaiTF` và tùy chọn `enumerate`. Giữ nội dung toán, thứ tự, nguồn từng câu và khai báo hình vẽ. Macro, đường dẫn, comment kỹ thuật và mã TikZ được bảo vệ khỏi phép thay thế rộng.
- Bộ kiểm tra xét ngoặc, môi trường, dấu phân cách công thức và báo tệp/thư viện ngoài cần kiểm tra. Lỗi cấu trúc phải sửa trước khi duyệt. Các quy tắc cần hiểu ngữ cảnh như `cases`, phép suy ra, đổi dữ kiện hay dựng lại hình cần người biên soạn kiểm tra; hệ thống không tự sửa toán và không khẳng định đã biên dịch toàn bộ tài liệu.
- Với câu đã lưu: chọn các câu trên trang, bấm **Chuẩn hóa & kiểm tra câu đã chọn**, duyệt rồi **Áp dụng các bài đã duyệt**. Không có thao tác tự sửa toàn bộ kho. Nguồn gốc vẫn được giữ.
- Vào **Cấu hình AI** chọn Gemini, OpenAI/GPT, Claude hoặc DeepSeek; nhập Base URL, API key và model. **Kiểm tra & lấy model** đọc danh sách model từ dịch vụ. Có thể nhập tên model mới bằng tay. Đây là một cấu hình hoạt động tại một thời điểm; đổi nhà cung cấp/Base URL cần nhập lại key. Kiểm tra danh sách model không thay thế việc thử phân loại với model đã chọn.
- Trong cửa sổ duyệt bản nhập, bấm **AI gợi ý chuyên đề**. Với kho đã có, chọn câu rồi bấm **AI phân loại câu đã chọn**. Mỗi yêu cầu tối đa 10 câu, 20.000 ký tự/câu, tổng 80.000 ký tự. Kết quả có lý do, dạng câu và các chuyên đề để bạn sửa trước khi áp dụng. Bài không khớp giữ ở trạng thái chưa gắn chuyên đề; AI không tạo chuyên đề hay xuất bản câu hỏi.
- Chỉ đề bài, danh sách chuyên đề và tối đa một đoạn đề mẫu cho mỗi dạng Câu 1–7 được gửi đến dịch vụ khi bạn bấm AI. Lời giải không được gửi trong yêu cầu phân loại. Dạng câu chưa rõ được giữ để quản trị viên quyết định. Hạn mức/chi phí API thuộc tài khoản nhà cung cấp, độc lập với hosting và gói chat.
- Cấu hình phân loại chỉ dành cho admin, độc lập với trợ lý AI của học sinh hiện tại. Key được mã hóa AES-GCM trong D1 bằng secret máy chủ `AI_SETTINGS_KEY`, không trả lại key cho trình duyệt. Trình duyệt không lưu key vào localStorage/sessionStorage. Không tự động chạy AI khi học sinh mở bài.
- Trước lần triển khai đầu tiên, thiết lập một secret ngẫu nhiên ít nhất 32 ký tự bằng `node scripts/wrangler.mjs secret put AI_SETTINGS_KEY`; khi chạy cục bộ, đặt vào `.dev.vars` riêng. Giữ nguyên secret ở các lần triển khai sau; thay secret sẽ cần nhập lại API key. Không đưa giá trị thật vào Git. Migration `0005_admin_ai.sql` chỉ thêm bảng cấu hình, không sửa câu hỏi hay chuyên đề.

## Cấu hình các tab học sinh

Trong **Trang học sinh**, bạn có thể chỉnh lời chào, giới thiệu, tên và mô tả của bốn tab, thứ tự, trạng thái ẩn/hiện, lời giới thiệu chuyên đề và nội dung Góc học tập. Luôn cần ít nhất một tab hiển thị. Các tab giữ chức năng chuyên đề, luyện câu hỏi, tạo đề và bài hướng dẫn; hiện chưa có trình tạo thêm loại tab tùy ý.

Bấm **Lưu trang học sinh** để áp dụng. Học sinh tải lại trang hoặc chọn **Cập nhật nội dung** để nhận bài và cấu hình mới. Nếu tab đang mở bị ẩn, giao diện chuyển sang tab đang hiển thị đầu tiên. Đề đang làm vẫn được giữ trong phiên trình duyệt.

## Dữ liệu và nâng cấp

- GitHub lưu mã nguồn, ảnh nền, phông chữ và tài liệu. Chuyên đề, lý thuyết, cấu hình tab, câu hỏi, tài khoản và mã truy cập được lưu trong Cloudflare D1.
- Migration `0004_topic_examples.sql` thêm ví dụ và khai báo hình vẽ riêng, giữ nguyên lý thuyết, icon, trạng thái và các câu hỏi đã có.
- Migration `0003_managed_content.sql` thêm quản trị nội dung, giữ nguyên câu hỏi cũ và trạng thái đã xuất bản của chúng; không nhập nội dung mẫu. Chỉ câu đã xuất bản được tính vào kho ngẫu nhiên và đề thi.
- Quan hệ câu hỏi–chuyên đề và bộ đếm được cập nhật trong cùng transaction. Phân loại không sao chép nguồn TeX. Bộ đếm trang chuyên đề tránh phải quét toàn bộ nguồn câu hỏi mỗi lần mở danh sách.
- Chuyên đề và cấu hình trang có số phiên bản; nếu cửa sổ khác đã lưu, hệ thống yêu cầu tải lại để tránh ghi đè bản mới.
- Trước khi triển khai migration trên dữ liệu thật, lưu bookmark D1 Time Travel vào thư mục riêng ngoài Git. Khôi phục database là thao tác riêng cần cân nhắc các dữ liệu được ghi sau bookmark; không tự khôi phục trong lệnh deploy.
