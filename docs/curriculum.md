# Quản lý nội dung học sinh

Mở **`/admin`** và đăng nhập bằng tài khoản quản lý hiện có. Trang giáo viên được đổi thành trang quản trị; tài khoản, mật khẩu, mã học sinh và câu hỏi cũ vẫn được giữ.

## Tạo chuyên đề và bài học

1. Chọn **Chuyên đề → Tạo chuyên đề**.
2. Nhập tên, nhóm, mô tả ngắn, chọn màu. Mô tả ngắn nêu nội dung, phương pháp và những dạng bài thuộc chuyên đề: đây là tiêu chí chính để AI phân loại. Chuyên đề chưa có mô tả không được gửi cho AI đối chiếu. Bấm nút biểu tượng để mở bảng 100 icon toán cấp 2, chỉ có hình, rồi bấm icon muốn dùng. Nhóm chuyên đề do bạn tự đặt, ví dụ Đại số hoặc Hình học.
3. Nhập **Lý thuyết** và **Ví dụ** ở hai vùng riêng; mỗi vùng có nút nhập file TeX và xem trước. Cả hai đều là tùy chọn. Khi mở chuyên đề, học sinh có ba tab **Lý thuyết**, **Ví dụ** và **Bài tập vận dụng**. Bài vận dụng tự hiện danh sách đề bài trong đúng chuyên đề (10 bài mỗi trang), mỗi bài có nút **Đáp án** để mở/ẩn lời giải riêng.
4. Dùng **Xem trước** để kiểm tra công thức và hình TikZ. Hình TikZ hiển thị bằng một nửa chiều rộng phù hợp ban đầu, căn giữa và giữ tỷ lệ; áp dụng cả ảnh lấy từ cache, không đổi mã vẽ. File TeX có `document` được tách phần thân và các khai báo hình vẽ; nguồn toán học không bị tự viết lại.
5. Bấm **Lưu chuyên đề**. Mặc định lưu nháp; bật **Xuất bản chuyên đề cho học sinh** khi muốn cho hiện.

Dùng mũi tên để đổi thứ tự chuyên đề. Xóa chuyên đề chỉ bỏ chuyên đề và các liên kết phân loại, không xóa câu hỏi trong kho. Chuyên đề cũ viết trong mã nguồn đã được thay bằng nội dung do người quản trị tự biên soạn; hệ thống không tự xuất bản bài mẫu.

Danh mục hiện hành có 14 chuyên đề, 112 dạng bài và 28 ví dụ được biên soạn theo tài liệu chủ trang gửi. Danh mục 18 mục cũ chỉ là tài liệu khởi tạo. Chuyên đề mới tạo thủ công vẫn mặc định lưu nháp.

## Nhập và phân loại câu hỏi

Luồng mặc định: **Ngân hàng câu hỏi → Tải file · AI tự xuất bản → chọn file `.tex`**. Không cần thao tác duyệt, chọn chuyên đề hoặc lưu/xuất bản riêng; xem tiến trình ngay dưới vùng tải. Sau khi máy chủ nhận đủ, có thể đóng trang, tiến trình vẫn chạy nền và tự thử lại nếu dịch vụ gián đoạn.

Nếu cần biên tập riêng, mở **Biên tập thủ công (tùy chọn)**:

1. Tải `.tex` hoặc `.docx` lên. Một file có thể chứa nhiều câu; giới hạn file là 20 MB.
2. Cửa sổ **Chuẩn hóa & kiểm tra** tự mở. Xem các thay đổi, cảnh báo có số dòng, đề/lời giải và hình. Có thể sửa nguồn đang dùng, mở **Nguồn gốc để đối chiếu** hoặc **Dùng lại nội dung gốc**. Bấm **Duyệt và dùng bản này** rồi mới lưu. Một câu có thể thuộc tối đa 10 chuyên đề, dùng chung một bản ghi.
3. Chọn chuyên đề thủ công nếu cần. Số thứ tự/nhãn trong nguồn chỉ giúp tham chiếu bài gốc; không phải nhóm phân loại và không bị giới hạn trong 1–7.
4. Bấm **Lưu lên hệ thống**. Mặc định lưu nháp. Có thể chọn **Xuất bản ngay sau khi lưu**.
5. Với câu đã có, lọc theo chuyên đề hoặc trạng thái; tìm theo nhãn/nội dung; bấm **Chọn hết** để chọn tất cả câu khớp bộ lọc trên mọi trang, hoặc chọn riêng một trang. **Bỏ chọn** xóa lựa chọn; chuyển trang giữ lựa chọn, đổi bộ lọc sẽ xóa lựa chọn. Thao tác phân loại/xóa được chia thành đợt tối đa 100 câu; nếu có lỗi, các câu đã xử lý được bỏ khỏi lựa chọn để có thể thử lại phần còn lại. Có ba cách gán chuyên đề: thêm, thay toàn bộ hoặc bỏ khỏi chuyên đề. Có thể xuất bản/thu về nháp cùng lúc.
6. Chọn **Chỉnh sửa** trên từng câu để sửa đề bài, lời giải, nhãn, chuyên đề và trạng thái, rồi xem trước trước khi lưu.

Các câu cũ chưa được phân loại nằm ở bộ lọc **Chưa gắn chuyên đề**. Bạn có thể phân loại lại mà không cần tải nguồn lên lần nữa.

**Hai trạng thái xuất bản độc lập:** để dùng trong bài tập chuyên đề hoặc tạo đề, cả chuyên đề và câu hỏi phải được xuất bản, đồng thời câu hỏi phải được gắn vào chuyên đề đó. Bài nháp không được API trả về cho học sinh, kể cả khi biết ID.

## Nhập tự động bằng một nút

- Bấm **Tải file · AI tự xuất bản**, chọn file `.tex`. Hệ thống chỉ nhận dạng, gắn vào chuyên đề đã xuất bản theo mô tả, lưu và xuất bản; giữ nguyên nguồn. Không cần chọn chuyên đề hoặc bấm duyệt. Câu trùng nguồn được nhận diện, không thêm bản sao.
- Nguồn đang gửi được giữ trên trình duyệt; tiến trình AI lưu trên máy chủ. Khi máy chủ nhận đủ, có thể đóng trang. Máy chủ tự nhận việc mỗi phút, độc lập với tab/trình duyệt, và tự thử lại phần chưa xong. Khi quay về tab, tiến độ được tải ngay; lỗi tạm thời hiện giờ thử lại, thường khoảng một phút. Nếu key/hạn mức dịch vụ không hoạt động, tiến trình chờ; thay cấu hình AI đánh thức tiến trình ngay. Các công cụ duyệt cũ nằm trong phần biên tập thủ công, chỉ dùng khi muốn sửa riêng.
- Bài `bt` và bài tự luận ghi nhầm `ex` không có `\choice`, `\choiceTF` hoặc lệnh lựa chọn tương đương đều được xử lý. `ex` tự luận giữ nguyên môi trường. Trắc nghiệm có lựa chọn, `vd`, Word và nguồn ngoài phạm vi tự luận được bỏ qua trong tự động; vẫn có thể nhập thủ công.
- Giữ nguyên `immini`, môi trường, mã TeX, lời giải và TikZ. Mã vẽ và comment chỉ được bỏ khỏi bản đề gửi AI để giảm dữ liệu; không đổi nguồn lưu.
- Giao diện báo tiến độ, số đã thêm và số chờ xử lý lại. AI chỉ trả chuyên đề trong một lượt, không kiểm tra hay sửa toán/cú pháp; kết quả chưa hợp lệ được giữ nguồn, có thể tiếp tục, không giả thành công hoặc ép chọn chuyên đề không liên quan. Lỗi cấu hình/key/mạng vẫn có thông báo để khắc phục. Không thể bảo đảm AI đúng toán học hay phân loại 100%.

## Cấu hình và quét AI

- Vào **Cấu hình AI**, chọn Gemini, OpenAI/GPT, Claude hoặc DeepSeek, nhập Base URL/API key và chọn model. **Kiểm tra & lấy model** đọc danh sách model từ dịch vụ.
- Nút **AI quét và sắp xếp toàn bộ kho** đọc mọi trang, gồm nháp và đã xuất bản. AI chỉ chọn chuyên đề theo mô tả; chỉ lưu liên kết chuyên đề, giữ nguyên nguồn và trạng thái xuất bản. Không phân loại theo Câu 1–7 hoặc tạo chuyên đề mới.
- Chuyên đề chưa có mô tả không được chọn. Phân loại không khớp hoặc lỗi dịch vụ giữ nguồn để tự thử lại. Không ép gắn chuyên đề không liên quan.
- Biên tập, đối chiếu và chuẩn hóa thủ công vẫn nằm trong phần tùy chọn. Không có sửa mã/chuẩn hóa bằng AI.

## Nội dung Góc học tập

Bản nội dung khởi đầu gồm năm phần: buổi học 30 phút; trình bày bài đại số và hình học; bốn lỗi thường gặp; kế hoạch học một tuần; cách hỏi bài và tự kiểm tra. Dùng các đường dẫn đầu bài để chuyển nhanh tới từng phần. Nội dung là HTML/LaTeX lưu trong D1, có thể xem trước và chỉnh tại **Trang học sinh → Nội dung góc học tập**.

Với một môi trường đã có dữ liệu nhưng Góc học tập còn trống, chạy `npm run guide:seed -- --remote` để xem trạng thái, rồi `npm run guide:seed -- --remote --apply` để bổ sung. Lệnh lưu bản cấu hình cũ trong `.data/backups`, chỉ điền nội dung khi còn trống, giữ tiêu đề/tên tab và kiểm tra phiên bản để tránh ghi đè thay đổi đồng thời. Không thay nội dung đã được chủ web biên soạn; bỏ `--remote` để áp dụng trên D1 cục bộ.

## Cấu hình các tab học sinh

Trong **Trang học sinh**, bạn có thể chỉnh lời chào, giới thiệu, tên và mô tả của ba tab, thứ tự, trạng thái ẩn/hiện, lời giới thiệu chuyên đề và nội dung Góc học tập. Luôn cần ít nhất một tab hiển thị. Các tab giữ chức năng chuyên đề, tạo đề và bài hướng dẫn; hiện chưa có trình tạo thêm loại tab tùy ý.

Bấm **Lưu trang học sinh** để áp dụng. Học sinh tải lại trang hoặc chọn **Cập nhật nội dung** để nhận bài và cấu hình mới. Nếu tab đang mở bị ẩn, giao diện chuyển sang tab đang hiển thị đầu tiên. Đề đang làm vẫn được giữ trong phiên trình duyệt.

## Dữ liệu và nâng cấp

- GitHub lưu mã nguồn, ảnh nền, phông chữ và tài liệu. Chuyên đề, lý thuyết, cấu hình tab, câu hỏi, tài khoản và mã truy cập được lưu trong Cloudflare D1.
- Migration `0006_exam_settings.sql` chỉ thêm bảng cấu hình tạo đề; các nguồn, tài khoản và liên kết chuyên đề cũ không thay đổi.
- Migration `0004_topic_examples.sql` thêm ví dụ và khai báo hình vẽ riêng, giữ nguyên lý thuyết, icon, trạng thái và các câu hỏi đã có.
- Migration `0003_managed_content.sql` thêm quản trị nội dung, giữ nguyên câu hỏi cũ và trạng thái đã xuất bản của chúng; không nhập nội dung mẫu. Chỉ câu đã xuất bản được tính vào kho ngẫu nhiên và đề thi.
- Quan hệ câu hỏi–chuyên đề và bộ đếm được cập nhật trong cùng transaction. Phân loại không sao chép nguồn TeX. Bộ đếm trang chuyên đề tránh phải quét toàn bộ nguồn câu hỏi mỗi lần mở danh sách.
- Chuyên đề và cấu hình trang có số phiên bản; nếu cửa sổ khác đã lưu, hệ thống yêu cầu tải lại để tránh ghi đè bản mới.
- Trước khi triển khai migration trên dữ liệu thật, lưu bookmark D1 Time Travel vào thư mục riêng ngoài Git. Khôi phục database là thao tác riêng cần cân nhắc các dữ liệu được ghi sau bookmark; không tự khôi phục trong lệnh deploy.

## Cấu hình tạo đề

1. Mở **Cấu hình tạo đề** trong admin. Có đủ 7 vị trí từ **Câu 1** đến **Câu 7**.
2. Với mỗi vị trí, nhập mô tả ngắn và chọn một hoặc nhiều chuyên đề có sẵn (tối đa 10). Mô tả hiển thị cạnh câu trong đề; các chuyên đề đã chọn quyết định nguồn câu hỏi. Nếu chọn nhiều chuyên đề, lấy một câu từ tập hợp các chuyên đề đó.
3. Bấm **Lưu cấu hình tạo đề**. Số “câu có thể lấy” đếm các nguồn khác nhau đã xuất bản trong chuyên đề đã xuất bản. Có thể lưu dở; cần chọn chuyên đề cho đủ 7 vị trí để tạo đề.
4. Học sinh mở **Tạo đề thi → Tạo đề tham khảo**. Mỗi vị trí lấy một câu ngẫu nhiên; một nguồn không xuất hiện hai lần trong cùng đề dù thuộc nhiều chuyên đề. Thiếu dữ liệu sẽ báo rõ để quản trị viên bổ sung, không tạo đề thiếu.
5. Bắt đầu làm bài để chạy đồng hồ 120 phút. Đề và thời gian còn lại được giữ khi tải lại trong cùng tab; đề đang làm không đổi khi quản trị viên lưu cấu hình mới. Cấu hình mới áp dụng khi tạo đề tiếp theo.

Câu 1–Câu 7 chỉ là **vị trí trong đề thi**. Ngân hàng câu hỏi và AI chỉ dùng chuyên đề để phân loại. Trang học sinh không có tab ôn tập theo câu.

## AI cá nhân cho học sinh

Bấm biểu tượng **Cài đặt** ở đầu trang, chọn Gemini, OpenAI/GPT, Claude hoặc DeepSeek, nhập **API key** và chọn **Mô hình** trong danh sách xổ xuống. **Kiểm tra & lấy mô hình** cập nhật danh sách từ tài khoản API; **Model khác** cho phép nhập tên mới. Bấm **Lưu cấu hình AI** để dùng cho hỏi bài.

Mỗi nhà cung cấp giữ key/model riêng trong `sessionStorage` của tab; chuyển nhà cung cấp để mở lại cấu hình đã lưu. Đóng tab hoặc đăng xuất sẽ xóa key. Key cá nhân được ưu tiên; chỉ Gemini có thể dùng key máy chủ khi không nhập key cá nhân. API học sinh chỉ gọi tên miền chính thức của nhà cung cấp, không đọc key phân loại của admin. Key không nằm trong mã nguồn hay cơ sở dữ liệu. Sử dụng API theo hạn mức/tính phí của tài khoản bạn.

Danh sách gợi ý hiện hành và model mặc định của từng nhà cung cấp nằm trong [danh sách model AI](ai-models.md). Cấu hình bạn đã lưu được giữ nguyên khi danh sách được cập nhật.
