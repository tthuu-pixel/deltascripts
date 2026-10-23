# Quản lý nội dung học sinh

Mở **`/admin`** và đăng nhập bằng tài khoản quản lý hiện có. Trang giáo viên được đổi thành trang quản trị; tài khoản, mật khẩu, mã học sinh và câu hỏi cũ vẫn được giữ.

## Tạo chuyên đề và bài học

1. Chọn **Chuyên đề → Tạo chuyên đề**.
2. Nhập tên, nhóm, mô tả ngắn, chọn màu. Mô tả ngắn nêu nội dung, phương pháp và những dạng bài thuộc chuyên đề: đây là tiêu chí chính để AI phân loại. Chuyên đề chưa có mô tả không được gửi cho AI đối chiếu. Bấm nút biểu tượng để mở bảng 100 icon toán cấp 2, chỉ có hình, rồi bấm icon muốn dùng. Nhóm chuyên đề do bạn tự đặt, ví dụ Đại số hoặc Hình học.
3. Nhập **Lý thuyết** và **Ví dụ** ở hai vùng riêng; mỗi vùng có nút nhập file TeX và xem trước. Cả hai đều là tùy chọn. Khi mở chuyên đề, học sinh có ba tab **Lý thuyết**, **Ví dụ** và **Bài tập vận dụng**. Bài vận dụng tự hiện danh sách đề bài trong đúng chuyên đề (10 bài mỗi trang), mỗi bài có nút **Đáp án** để mở/ẩn lời giải riêng.
4. Dùng **Xem trước** để kiểm tra công thức và hình TikZ. Hình TikZ hiển thị bằng một nửa chiều rộng phù hợp ban đầu, căn giữa và giữ tỷ lệ; áp dụng cả ảnh lấy từ cache, không đổi mã vẽ. File TeX có `document` được tách phần thân và các khai báo hình vẽ; nguồn toán học không bị tự viết lại.
5. Bấm **Lưu chuyên đề**. Mặc định lưu nháp; bật **Xuất bản chuyên đề cho học sinh** khi muốn cho hiện.

Dùng mũi tên để đổi thứ tự chuyên đề. Xóa chuyên đề chỉ bỏ chuyên đề và các liên kết phân loại, không xóa câu hỏi trong kho. Chuyên đề cũ viết trong mã nguồn đã được thay bằng nội dung do người quản trị tự biên soạn; hệ thống không tự xuất bản bài mẫu.

Danh mục [18 chuyên đề toán thực tế](practical-topics.md) được chuẩn bị theo bốn nhóm kiến thức, không chia lớp. Chuyên đề mới lưu nháp; người quản trị tự bổ sung nội dung và xuất bản.

## Nhập và phân loại câu hỏi

1. Chọn **Ngân hàng câu hỏi**, tải `.tex` hoặc `.docx` lên. Một file có thể chứa nhiều câu; giới hạn file là 20 MB.
2. Cửa sổ **Chuẩn hóa & kiểm tra** tự mở. Xem các thay đổi, cảnh báo có số dòng, đề/lời giải và hình. Có thể sửa nguồn đang dùng, mở **Nguồn gốc để đối chiếu** hoặc **Dùng lại nội dung gốc**. Bấm **Duyệt và dùng bản này** rồi mới lưu. Một câu có thể thuộc tối đa 10 chuyên đề, dùng chung một bản ghi.
3. Chọn chuyên đề thủ công nếu cần. Số thứ tự/nhãn trong nguồn chỉ giúp tham chiếu bài gốc; không phải nhóm phân loại và không bị giới hạn trong 1–7.
4. Bấm **Lưu lên hệ thống**. Mặc định lưu nháp. Có thể chọn **Xuất bản ngay sau khi lưu**.
5. Với câu đã có, lọc theo chuyên đề hoặc trạng thái; tìm theo nhãn/nội dung; bấm **Chọn hết** để chọn tất cả câu khớp bộ lọc trên mọi trang, hoặc chọn riêng một trang. **Bỏ chọn** xóa lựa chọn; chuyển trang giữ lựa chọn, đổi bộ lọc sẽ xóa lựa chọn. Thao tác phân loại/xóa được chia thành đợt tối đa 100 câu; nếu có lỗi, các câu đã xử lý được bỏ khỏi lựa chọn để có thể thử lại phần còn lại. Có ba cách gán chuyên đề: thêm, thay toàn bộ hoặc bỏ khỏi chuyên đề. Có thể xuất bản/thu về nháp cùng lúc.
6. Chọn **Chỉnh sửa** trên từng câu để sửa đề bài, lời giải, nhãn, chuyên đề và trạng thái, rồi xem trước trước khi lưu.

Các câu cũ chưa được phân loại nằm ở bộ lọc **Chưa gắn chuyên đề**. Bạn có thể phân loại lại mà không cần tải nguồn lên lần nữa.

**Hai trạng thái xuất bản độc lập:** để dùng trong bài tập chuyên đề hoặc tạo đề, cả chuyên đề và câu hỏi phải được xuất bản, đồng thời câu hỏi phải được gắn vào chuyên đề đó. Bài nháp không được API trả về cho học sinh, kể cả khi biết ID.

## Nhập tự động bằng một nút

- Bấm **AI nhập tự động** ở Ngân hàng câu hỏi rồi chọn file `.tex`/`.docx`. AI chỉ nhận các bài tự luận trong môi trường `bt`, bỏ qua `ex` và nguồn ngoài `bt`; tự chuẩn hóa, đối chiếu mô tả ngắn để gắn các chuyên đề hiện có và lưu các câu đủ điều kiện. Không cần duyệt từng câu hoặc bấm lưu thêm lần nữa.
- Nếu đã mở cửa sổ duyệt, bấm **AI xử lý và thêm tất cả**. Kết quả phân loại đã nhận được sẽ được dùng lại. Có thể bật **Xuất bản các câu xử lý được**; mặc định lưu nháp.
- Bảng **Kết quả AI tự động** ghi số câu đã thêm và các câu cần làm riêng cùng lý do. Câu sai cú pháp, chưa khớp chuyên đề hoặc quá lớn không chặn các câu khác. Tệp đọc lỗi được liệt kê riêng; tệp đọc được vẫn tiếp tục. Lỗi cấu hình AI, API hoặc mạng nằm ở nhóm **Chờ thử lại**, không bị tính là câu cần sửa thủ công; nguyên nhân được hiện ngay để khắc phục rồi tiếp tục.
- Sửa câu còn lại hoặc chọn chuyên đề thủ công rồi bấm lại nút AI; các câu đã lưu được bỏ qua. Các câu đã sửa đủ thông tin được lưu mà không cần trả phí AI phân loại lại.
- Có nút dừng; yêu cầu ghi đang chạy được đợi xác nhận trước khi dừng. Có thể tiếp tục trong cửa sổ hiện tại. Giữ tab mở tới khi hoàn tất; bản nhập chờ xử lý chưa được phục hồi sau khi đóng hoặc tải lại trang.
- Nguồn TeX, lời giải và khai báo TikZ gốc được giữ để đối chiếu. Hệ thống chỉ áp dụng các quy tắc chuẩn hóa đã hỗ trợ, không tự dựng lại hình, thay số liệu, thêm đáp án hoặc tạo chuyên đề mới. Những trường hợp chưa chắc chắn được giữ cho người quản trị xử lý riêng.
- Việc lưu theo đợt dùng lại ID câu hỏi khi thử lại, tránh tạo bản trùng nếu mạng bị ngắt lúc chờ xác nhận. Câu được AI nhận dạng nhưng chưa được lưu vẫn nằm trong bản nhập.

## Chuẩn hóa và AI phân loại

AI nhập tự động, quét kho và phân loại câu đã chọn chỉ xử lý bài có nguồn TeX trong môi trường `bt`. `ex`, `vd`, Word và nguồn không xác định được môi trường được báo **Bỏ qua**, không gửi đến dịch vụ AI và không tự thêm vào chuyên đề. Các bài đã có vẫn được giữ nguyên; nhập thủ công và nội dung lý thuyết/ví dụ vẫn hỗ trợ các nguồn khác.

- Chuẩn hóa file mới chạy trong Web Worker trên trình duyệt. Các quy tắc tự động hiện gồm: tách điểm số/tùy chọn nguồn đầu bài, bỏ nội dung comment mã nguồn đã nhận diện, chuẩn hóa `frac`, `ne/ge/le`, `quad`, `choiceTFt`, `loigiaiTF` và tùy chọn `enumerate`. Giữ nội dung toán, thứ tự, nguồn từng câu và khai báo hình vẽ. Macro, đường dẫn, comment kỹ thuật và mã TikZ được bảo vệ khỏi phép thay thế rộng.
- Bộ kiểm tra xét ngoặc, môi trường, dấu phân cách công thức và báo tệp/thư viện ngoài cần kiểm tra. Lỗi cấu trúc phải sửa trước khi duyệt. Các quy tắc cần hiểu ngữ cảnh như `cases`, phép suy ra, đổi dữ kiện hay dựng lại hình cần người biên soạn kiểm tra; hệ thống không tự sửa toán và không khẳng định đã biên dịch toàn bộ tài liệu.
- Với câu đã lưu: chọn các câu hoặc dùng **Chọn hết**, bấm **Chuẩn hóa & kiểm tra câu đã chọn**, duyệt rồi **Áp dụng các bài đã duyệt**. Không có thao tác tự sửa toàn bộ kho. Nguồn gốc vẫn được giữ.
- Vào **Cấu hình AI** chọn Gemini, OpenAI/GPT, Claude hoặc DeepSeek; nhập Base URL, API key rồi chọn **Mô hình** trong danh sách xổ xuống. **Kiểm tra & lấy model** đọc danh sách model từ dịch vụ. Chọn **Model khác** nếu cần nhập tên model mới bằng tay. Đây là một cấu hình hoạt động tại một thời điểm; đổi nhà cung cấp/Base URL cần nhập lại key. Kiểm tra danh sách model không thay thế việc thử phân loại với model đã chọn.
- Khi nhập file, AI **tự quét toàn bộ bản nhập** nếu đã lưu API key/model, tự gắn các chuyên đề đã có và báo số câu đã khớp/cần kiểm tra. Không cần bấm AI hoặc mở từng câu. Duyệt cả đợt rồi lưu; lỗi cú pháp hoặc chưa khớp chuyên đề mới cần xử lý riêng. AI không nhận dạng Câu 1–7, không suy loại bài từ số thứ tự nguồn.
- Với kho đã có, bấm **AI quét và sắp xếp toàn bộ kho**: quét mọi trang, cả nháp và đã xuất bản, độc lập với bộ lọc hiện tại. Chuyên đề phù hợp được tự gắn thêm ngay; nguồn, lời giải, liên kết thủ công và trạng thái xuất bản được giữ. Cũng có thể chọn riêng câu để mở bản duyệt tự quét.
- Quét kho dùng mốc bắt đầu và con trỏ ổn định, đọc 50 câu mỗi trang; các bản ghi mới sau mốc này để lần quét sau. Từng lượt AI tối đa 10 câu và 80.000 ký tự; nguồn vượt 20.000 ký tự/câu được báo xử lý riêng, không cắt nội dung rồi đoán. Một lượt lỗi không làm mất kết quả lượt khác; lỗi cấu hình/kết nối nghiêm trọng sẽ dừng để sửa. Khi gặp hạn mức, tự chờ một phút và thử lại tối đa hai lần/lượt.
- Có tiến độ, **Dừng quét**, **Tiếp tục quét**, danh sách chưa khớp/lỗi và báo cáo JSON đầy đủ. Câu đã thành công không gọi AI lại khi tiếp tục cùng đợt. Giữ cửa sổ mở; khi tải lại trang, các liên kết đã ghi vẫn còn nhưng muốn tiếp tục sẽ cần bắt đầu một đợt mới. AI không tự tạo chuyên đề hay tự xuất bản câu hỏi.
- Chỉ đề bài và danh sách chuyên đề có mô tả ngắn được gửi đến dịch vụ khi tự quét bản nhập hoặc bạn quét kho/câu đã chọn. Lời giải không được gửi trong yêu cầu phân loại. Bài chưa khớp được giữ để quản trị viên chọn chuyên đề. Hạn mức/chi phí API thuộc tài khoản nhà cung cấp, độc lập với hosting và gói chat.
- Cấu hình phân loại chỉ dành cho admin, độc lập với trợ lý AI của học sinh hiện tại. Key được mã hóa AES-GCM trong D1 bằng secret máy chủ `AI_SETTINGS_KEY`, không trả lại key cho trình duyệt. Trình duyệt không lưu key vào localStorage/sessionStorage. Không tự động chạy AI khi học sinh mở bài.
- Trước lần triển khai đầu tiên, thiết lập một secret ngẫu nhiên ít nhất 32 ký tự bằng `node scripts/wrangler.mjs secret put AI_SETTINGS_KEY`; khi chạy cục bộ, đặt vào `.dev.vars` riêng. Giữ nguyên secret ở các lần triển khai sau; thay secret sẽ cần nhập lại API key. Không đưa giá trị thật vào Git. Migration `0005_admin_ai.sql` chỉ thêm bảng cấu hình, không sửa câu hỏi hay chuyên đề.

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
