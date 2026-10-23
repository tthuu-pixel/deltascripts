# DeltaScript – Hỗ trợ học tập Toán 9

React/Vite cho giao diện, Cloudflare Workers cho API và Cloudflare D1 (SQLite) cho dữ liệu. Web và API dùng cùng tên miền. Không cần máy chủ Node chạy thường trực, PostgreSQL, Google Sheets hoặc kho ảnh riêng khi chỉ nhập nguồn TeX.

## Giao diện và không gian học tập

Nhận diện dùng xanh dương, đỏ san hô và vàng; logo/favicon và bộ icon SVG riêng. Phông Manrope được phục vụ từ `public/fonts` kèm giấy phép OFL, không gọi Google Fonts khi mở trang. Giao diện có bố cục cho máy tính và điện thoại, điều khiển bằng bàn phím, trạng thái đang tải/trống/lỗi và hỗ trợ giảm chuyển động.

Ảnh nền hình học được tạo riêng cho dự án và phục vụ tại `public/images`: WebP khoảng 27 KB cho máy tính, 9 KB cho điện thoại. Minh họa SVG dùng tam giác vuông, đường tròn và căn thức; không dùng phương trình đường tròn trong hệ tọa độ. Xem [nội dung chuyên đề và cách thêm nguồn](docs/curriculum.md).

Học sinh có ba tab: **Chuyên đề**, **Tạo đề thi** và **Góc học tập**. Người quản trị đổi tên, mô tả, thứ tự và trạng thái ẩn/hiện của các tab ngay trên web. Nội dung chuyên đề và góc học tập do chủ web tự đưa lên; không còn bài mẫu viết cứng trong giao diện.

Mở **`/admin`** để vào **Trang quản trị** bằng tài khoản giáo viên/quản lý hiện có. Bạn tạo chuyên đề, nhập lý thuyết từ TeX (tùy chọn), nhập Word/TeX vào kho câu hỏi, sửa nguồn/lời giải, phân loại theo chuyên đề, rồi chọn xuất bản. Một câu dùng chung cho nhiều chuyên đề, luyện tập và tạo đề; không cần nhập lặp lại. Bài mới mặc định là bản nháp. Câu hỏi và chuyên đề có trạng thái xuất bản riêng; học sinh chỉ nhận nội dung đã xuất bản.

Mỗi chuyên đề có ba mục **Lý thuyết**, **Ví dụ** và **Bài tập vận dụng**. Lý thuyết/ví dụ nhập TeX riêng; bài vận dụng hiển thị danh sách đề bài trong đúng chuyên đề, mỗi bài có nút **Đáp án** để mở/ẩn lời giải. Danh sách tải 10 bài mỗi trang. Bảng chọn có 50 icon toán cấp 2, chỉ hiện hình.

Trang admin có **Chuẩn hóa & kiểm tra** khi nhập bài và cho các câu đã chọn: đối chiếu nguồn gốc, sửa lỗi cú pháp, xem trước rồi duyệt. Mục **Cấu hình AI** hỗ trợ Gemini, GPT, Claude và DeepSeek: nhập file sẽ tự quét tất cả câu và xếp vào chuyên đề đã có, dựa vào mô tả ngắn của từng chuyên đề; bạn duyệt cả đợt trước khi lưu. Nút **AI quét và sắp xếp toàn bộ kho** tự xử lý mọi trang và ghi liên kết chuyên đề, có tiến độ/dừng/tiếp tục và báo cáo câu cần kiểm tra. Key mã hóa ở máy chủ.

Mục **Cấu hình tạo đề** có 7 vị trí Câu 1–Câu 7, mỗi vị trí có mô tả và các chuyên đề được chọn. Khi tạo đề, hệ thống lấy một câu ngẫu nhiên cho mỗi vị trí, không trùng nguồn. Số Câu chỉ là vị trí trong đề; ngân hàng không phân loại theo số câu. Cần cấu hình đủ 7 vị trí trước khi học sinh tạo đề.

Xem [hướng dẫn quản trị nội dung](docs/curriculum.md). Chuyên đề, bài học, cấu hình tab và câu hỏi nằm trong D1. GitHub lưu mã nguồn, ảnh, phông chữ và tài liệu. AI chỉ được tải khi người dùng mở; đóng/mở hộp thoại giữ cuộc trò chuyện trong cùng ngữ cảnh. Đồng hồ đề thi và ảnh TikZ giữ cơ chế lưu/cache đã có.

## Bản đang chạy

Bản chính thức: **https://deltascript.tthuu-pixel.workers.dev**. Kiểm tra trình duyệt thực tế tải trang thành công, không có lỗi JavaScript; `/api/health` xác nhận kết nối D1. API từ chối người chưa đăng nhập và thông tin đăng nhập không hợp lệ. Luồng quản trị và học sinh được kiểm thử bằng D1 và trình duyệt cục bộ.

D1 bắt đầu với kho câu hỏi trống. Người quản lý triển khai có thể cấp một liên kết riêng để chủ web tự tạo tài khoản giáo viên bằng trình duyệt, không cần cài Node.js trên máy cá nhân:

```sh
npm run admin:setup -- --remote --origin https://deltascript.tthuu-pixel.workers.dev
```

Liên kết nằm trong `.data/admin-setup-link.json` (file riêng, quyền 0600, không đưa vào Git), hết hạn sau 24 giờ và chỉ dùng một lần. Gửi riêng cho chủ web. Chủ web mở liên kết, chọn email, nhập mật khẩu ít nhất 12 ký tự và xác nhận lại để đăng nhập. Token nằm trong fragment URL, được bỏ khỏi thanh địa chỉ sau khi mở và không được lưu vào localStorage/sessionStorage; D1 chỉ lưu hash. API không nhận đăng ký nếu chưa cấp liên kết, liên kết sai/hết hạn/đã dùng, hoặc đã có bất kỳ giáo viên nào. Tạo lại liên kết khi DB chưa có giáo viên sẽ thu hồi liên kết cũ. Đây là bước thiết lập tài khoản đầu tiên, không dùng để đổi mật khẩu hay thêm giáo viên.

Người quản lý cũng có thể tạo hoặc đổi mật khẩu bằng terminal trong thư mục dự án có cấu hình Cloudflare:

```sh
npm run admin:create -- email-cua-ban@example.com --remote
```

Thay email bằng email bạn muốn dùng, nhập mật khẩu khi terminal hỏi, rồi đăng nhập trên web để tạo mã học sinh và nhập nguồn TeX. Mật khẩu không hiển thị; không gửi mật khẩu qua chat.

## Chạy cục bộ

Yêu cầu Node.js 22.12+ (đã kiểm tra trên Node 24), npm.

```sh
npm ci
npm run build
npm run db:migrate
npm run admin:create -- email-cua-ban@example.com
npm run dev
```

CLI hỏi mật khẩu trong terminal, không hiển thị và không nhận mật khẩu qua tham số. Mật khẩu dài 12–256 ký tự. Không có tài khoản mặc định. Tạo lại email có sẵn sẽ đổi mật khẩu và thu hồi các phiên giáo viên cũ.

`npm run dev` áp dụng migrations cục bộ rồi chạy Vite cổng 3000 và Workers cổng 3001. Vite chuyển `/api` đến Workers. `npm run start` phục vụ bản build bằng Workers ở cổng 3000; chạy `npm run db:migrate` trước. Hai cách dùng cùng dữ liệu D1 cục bộ trong `.data/d1`. Các lệnh mặc định này không ghi vào Cloudflare thật. Không xóa thư mục dữ liệu khi khắc phục lỗi.

Wrangler giữ log và cấu hình CLI trong `.data`, trừ khi môi trường đã cung cấp đường dẫn XDG/log riêng. Dùng các lệnh npm hoặc `node scripts/wrangler.mjs ...` để dùng thống nhất vị trí đăng nhập. `.data`, `.dev.vars`, `.env`, `.wrangler` và kết quả kiểm thử đều bị loại khỏi Git. Dữ liệu PGlite cũ trong `.data/postgres` được giữ nguyên nhưng ứng dụng mới không dùng nữa.

Giáo viên đăng nhập, tạo mã 8 chữ/số, nhập `.tex`/`.docx` và xem trước, sau đó bấm **Lưu lên hệ thống** để thêm vào kho. Chọn file theo luồng duyệt chưa tự ghi dữ liệu. Nút **AI nhập tự động** xử lý và thêm thẳng các câu đủ điều kiện, gắn chuyên đề và để riêng các câu cần sửa; mặc định lưu nháp. Trong cửa sổ duyệt cũng có nút **AI xử lý và thêm tất cả**. Mỗi câu là một bản ghi; một file có thể chứa nhiều câu. Học sinh nhập tên, lớp, mã rồi học theo chuyên đề hoặc tạo đề 7 câu theo cấu hình của quản trị viên. Nguồn mới không cần Google Sheets; nâng cấp giữ nguyên câu hỏi đã có trong D1. Đã bỏ chức năng xuất nguồn cũ trong trình duyệt.

## Triển khai Cloudflare

Dùng tài khoản Cloudflare của bạn trên gói Workers Free; tên miền `workers.dev` đủ để bắt đầu. Không cần mua domain hoặc bật Workers Paid. Free có giới hạn và không đảm bảo miễn phí ở mọi quy mô; ứng dụng không tự nâng gói hoặc thanh toán.

Tại terminal trên máy có thể mở trình duyệt:

```sh
npm run cf:login
npm run cf:setup
npm run deploy
npm run admin:create -- email-cua-ban@example.com --remote
```

- `cf:setup` kiểm tra đăng nhập, tạo DB `deltascript` với gợi ý vùng APAC, rồi ghi ID thật vào binding `DB` trong `wrangler.jsonc`. Gợi ý vùng không bảo đảm vị trí cụ thể. Lệnh không tạo lại khi ID đã được cấu hình. Nếu tên đã tồn tại hoặc không đọc được ID sau khi tạo, kiểm tra D1 Dashboard thay vì tạo thêm database.
- `deploy` build giao diện, kiểm tra bundle Workers bằng dry-run, kiểm tra ID/đăng nhập, áp dụng migrations lên D1 và triển khai Workers cùng static assets. Lỗi migration dừng triển khai. Các thay đổi schema về sau cần migration mới và sao lưu trước.
- Lệnh tạo giáo viên chỉ tác động D1 thật khi có `--remote`; nó gửi truy vấn có tham số qua HTTPS đến API D1, chỉ chuyển hash mật khẩu và không đưa SQL/hash vào tham số lệnh hoặc log. Hỗ trợ token cấu hình bảo mật và đăng nhập Wrangler. Trigger DB thu hồi phiên cũ cùng transaction đổi mật khẩu. Không gửi mật khẩu qua chat, Git, logs hay tham số dòng lệnh.
- Mở URL mà Wrangler trả về, kiểm tra `/api/health`, đăng nhập, tạo mã, nhập một câu, ôn tập và tạo đề.

Trong môi trường cloud không mở được luồng OAuth, cung cấp **qua phần cấu hình bảo mật**:

| Biến                    | Mục đích                                                                                                           |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `CLOUDFLARE_API_TOKEN`  | Token cho tài khoản đích, có quyền Workers Scripts Edit, D1 Edit và quyền đọc thông tin tài khoản cần cho Wrangler |
| `CLOUDFLARE_ACCOUNT_ID` | ID tài khoản Cloudflare đích                                                                                       |

Không đặt token trong `wrangler.jsonc`, `.env.example`, `VITE_*` hoặc chat. Không cần đưa token vào Workers đang chạy: chỉ công cụ triển khai dùng nó. Dùng token giới hạn ở tài khoản đích. `npm run cf:whoami` kiểm tra trạng thái đăng nhập; không dùng token làm tham số lệnh.

Dữ liệu D1 cục bộ không tự được chuyển lên Cloudflare; sau khi triển khai, nhập các file TeX trên web thật. Không có tài khoản hoặc database thật được tạo bởi build/dry-run, các lệnh chạy cục bộ hoặc bộ test. Placeholder `database_id` toàn số 0 chỉ dùng cục bộ; lệnh deploy từ chối nó.

## Hiệu năng, dung lượng và gói miễn phí

Tài liệu Cloudflare được đối chiếu ngày 22/10/2026:

- [D1 Free](https://developers.cloudflare.com/d1/platform/limits/): tối đa 500 MB mỗi DB, 5 GB cộng dồn trên tài khoản.
- [D1 usage](https://developers.cloudflare.com/d1/platform/pricing/): 5 triệu hàng đọc/ngày, 100.000 hàng ghi/ngày. Quota đếm hàng bị quét và cả cập nhật chỉ mục, không chỉ số câu trả về/lưu.
- [Workers Free](https://developers.cloudflare.com/workers/platform/pricing/): 100.000 lượt gọi động/ngày, 10 ms CPU mỗi lần gọi. Static assets không tính như lượt gọi Worker động khi được phục vụ trực tiếp. Cần theo dõi mức dùng thực tế trên Cloudflare; kiểm thử local không chứng minh mức CPU hoặc độ trễ trên host thật.

Ứng dụng phục vụ static assets trực tiếp và chỉ ưu tiên Workers cho `/api`. API dùng Web APIs/Web Crypto; không mang Express, driver PostgreSQL hoặc PGlite vào bundle. Mật khẩu băm bằng PBKDF2-SHA256 có salt, 100.000 vòng; token phiên ngẫu nhiên chỉ lưu hash trong DB. Cookie HttpOnly/SameSite, Secure khi qua HTTPS. Rate limit lưu trong D1 để không mất hiệu lực khi chuyển isolate.

Tạo đề tra liên kết chuyên đề, chọn tối đa 7 ID ứng viên cho mỗi vị trí, ghép thành 7 câu không trùng rồi mới đọc nguồn của 7 câu đã chọn. Không quét nội dung TeX của toàn kho để bốc câu. Lượt đọc nguồn kiểm tra lại trạng thái xuất bản và liên kết; dữ liệu vừa đổi sẽ được báo để tạo lại. Nếu một vị trí chưa chọn chuyên đề, không có câu đã xuất bản hoặc các vị trí không đủ 7 câu khác nhau, API trả lỗi rõ ràng thay vì trả đề thiếu/lặp bài.

Danh sách admin phân trang 20 câu; bài tập chuyên đề phân trang 10 câu. Dữ liệu cũ và cột đánh số nội bộ được giữ để tương thích lưu trữ, nhưng không dùng để phân loại hay tạo đề. Migration `0006_exam_settings.sql` chỉ thêm cấu hình đề, không sửa nguồn hoặc liên kết chuyên đề.

Nguồn TeX 1–2 KB/câu có thể lưu trực tiếp trong D1, cùng đề/lời giải và các chỉ mục. Dung lượng DB sẽ lớn hơn tổng tệp gốc; theo dõi dung lượng và quota thực tế trong Cloudflare. Kiểm thử cục bộ có nguồn giả lập để kiểm tra giới hạn và truy vấn; không phải cam kết độ trễ hoặc chi phí trên host thật.

Nhập theo đợt tối đa 100 câu để tuân thủ giới hạn D1; các phần đã lưu được xác nhận riêng và dùng lại ID khi thử lại. Chia lô không làm hạn mức ngày tăng lên. Cron dọn phiên hết hạn, cửa sổ rate limit và lịch sử đăng nhập cũ hơn 30 ngày; mã truy cập và nguồn câu hỏi không bị cron xóa.

## Công thức, TikZ và AI

Bản gốc [skill chuẩn hóa LaTeX 15.0.1](docs/latex-rules/SKILL.md) được giữ nguyên. Bộ nhập/hiển thị áp dụng các quy tắc cú pháp xác định, bảo toàn dữ kiện và lời giải; không tự chứng minh hoặc sửa nội dung toán học.

- Hỗ trợ `bt/ex/vd/bai/cau/problem/question`, nhãn Câu/Bài, `loigiai` và `loigiaiTF` dạng lệnh hoặc môi trường. Word đọc trong Web Worker, hỗ trợ văn bản, bảng, ảnh và OMML cơ bản. File tối đa 20 MB; cấu trúc không hỗ trợ hoặc ảnh Word quá 400 KB bị báo lỗi thay vì mất nội dung âm thầm.
- Giữ macro/style ngoài hình bằng `latexPreamble`: `def`, `newcommand`/`renewcommand`/`providecommand`, `DeclareMathOperator`, `tikzset`, `usetikzlibrary`, `usepgflibrary`, `pgfkeys`, các lệnh đặt macro PGF, `definecolor`/`colorlet`. Macro cấp câu được truyền cho hình trong lời giải. Macro cục bộ của một hình không truyền sang hình khác.
- Nhận `\begin {tikzpicture}` và `\tikz[...]{...}`; giữ tọa độ dấu chấm, `%` kỹ thuật và `\\` trong nhãn. Khai báo cần preamble được đặt trước `\begin{document}`. Wrapper mặc định dùng TikZ thuần; chỉ nạp gói tkz-euclide/pgfplots khi nguồn cũ dùng chúng. Báo lỗi ngoặc/môi trường và compiler; chữ vẫn đọc được khi hình lỗi.
- Khi hiển thị, nhận bí danh `frac` → `dfrac`, `ne/ge/le` → `neq/geq/leq`, `quad` → `;`, `choiceTFt` → `choiceTF`; phương án hiển thị không lộ dấu `True`. Không tự thêm phương án hoặc đổi số liệu. HTML được lọc bằng DOMPurify; KaTeX không bật trust.
- TikZ biên dịch ngoài Workers, tối đa hai tác vụ đồng thời. Cache trình duyệt tối đa 40 ảnh nhỏ, mỗi ảnh tối đa 600.000 ký tự base64; khóa gồm toàn bộ tài liệu và endpoint. Cache có thể bị xóa và không dùng chung giữa các thiết bị. Không lưu PNG trong D1.

Macro/class/font riêng hoặc file `\input` đi kèm cần kiểm tra với nguồn thật. Các mẫu thử không chứng minh tương thích mọi tài liệu. Chưa tự động hóa các quy tắc cần hiểu nghĩa như phân loại hệ/hàm từng đoạn, suy luận hình học hoặc kiểm chứng lời giải.

`VITE_TIKZ_API_URL` trong `.env` dùng lúc build, mặc định `https://tikz-fly.fly.dev`. Dịch vụ compiler và Gemini có hạn mức/chi phí riêng; gói miễn phí lưu web/DB không bảo đảm hai dịch vụ này miễn phí hay luôn hoạt động.

Gemini là tùy chọn. Chạy cục bộ: sao chép `.dev.vars.example` thành `.dev.vars`. Trên Cloudflare: `node scripts/wrangler.mjs secret put GEMINI_API_KEY`; đổi model qua `vars.GEMINI_MODEL` trong Wrangler. Trong **Cài đặt**, học sinh có thể chọn Gemini, GPT, Claude hoặc DeepSeek, nhập API key và chọn **Mô hình** bằng danh sách xổ xuống; nút kiểm tra tải model từ tài khoản, mục **Model khác** hỗ trợ tên mới. Mỗi nhà cung cấp giữ cấu hình riêng; key cá nhân được ưu tiên, Gemini có thể dùng key máy chủ khi không nhập key. Key cá nhân chỉ giữ trong sessionStorage của tab và gửi đến API khi dùng AI; đăng xuất sẽ xóa key. Server không ghi key vào log hoặc gửi lại browser. `APP_ORIGIN` tùy chọn cho origin chính thức; production cùng tên miền không cần thêm CORS. Các bài AI tạo vẫn cần đối chiếu tính đúng đắn.

## Kiểm thử

```sh
npm run lint
npm test
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e
npm run build
```

Nếu chưa có Chromium: `npx playwright install chromium` rồi chạy `npm run test:e2e`.

Các test chạy bundle Worker thực bằng workerd và D1 cục bộ, không dùng SQLite giả hoặc DB thật. Kiểm tra xác thực/phân quyền, cookie, thu hồi phiên, rate limit qua nhiều request, transaction/rollback, nhập theo lô, chỉ mục chọn câu, restart dữ liệu và dọn lịch sử. Bộ trình duyệt kiểm tra đăng nhập, nhập Word/TeX, đề thi/đồng hồ, mobile AI và cache TikZ. AI thường được giả lập ở ranh giới dịch vụ ngoài.

Kiểm tra compiler thật, ảnh PNG hiển thị và cache qua tải lại trang:

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:tikz
```

Kiểm tra này cần mạng, dùng tam giác, hình đường cao và biểu đồ tròn; tôn trọng HTTPS_PROXY và xác minh TLS. Test thông thường bỏ qua ca mạng này. Kết quả Playwright nằm trong `test-results`.
