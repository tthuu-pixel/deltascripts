# DeltaScript – Hỗ trợ học tập Toán 9

React/Vite cho giao diện, Cloudflare Workers cho API và Cloudflare D1 (SQLite) cho dữ liệu. Web và API dùng cùng tên miền. Không cần máy chủ Node chạy thường trực, PostgreSQL, Google Sheets hoặc kho ảnh riêng khi chỉ nhập nguồn TeX.

## Giao diện và không gian học tập

Nhận diện dùng xanh dương, đỏ san hô và vàng; logo/favicon và bộ icon SVG riêng. Phông Manrope được phục vụ từ `public/fonts` kèm giấy phép OFL, không gọi Google Fonts khi mở trang. Giao diện có bố cục cho máy tính và điện thoại, điều khiển bằng bàn phím, trạng thái đang tải/trống/lỗi và hỗ trợ giảm chuyển động.

Ảnh nền hình học được tạo riêng cho dự án và phục vụ tại `public/images`: WebP khoảng 27 KB cho máy tính, 9 KB cho điện thoại. Minh họa SVG dùng tam giác vuông, đường tròn và căn thức; không dùng phương trình đường tròn trong hệ tọa độ. Xem [nội dung chuyên đề và cách thêm nguồn](docs/curriculum.md).

Các trang học bên trong dùng nền chuyển sắc nhẹ và màu nhận diện: xanh cho lý thuyết, đỏ cho ví dụ, vàng cho vận dụng. Góc học tập có nội dung hướng dẫn tự học, trình bày bài, kiểm tra lỗi, kế hoạch một tuần và cách hỏi bài; người quản trị vẫn sửa được nội dung trong **Trang học sinh**.

Học sinh có ba tab: **Chuyên đề**, **Tạo đề thi** và **Góc học tập**. Người quản trị đổi tên, mô tả, thứ tự và trạng thái ẩn/hiện của các tab ngay trên web. Nội dung chuyên đề và góc học tập do chủ web tự đưa lên; không còn bài mẫu viết cứng trong giao diện.

Mở **`/admin`** để vào **Trang quản trị** bằng tài khoản giáo viên/quản lý hiện có. Bạn quản lý chuyên đề và lý thuyết; ở ngân hàng câu hỏi, chỉ cần tải file TeX lên để AI nhận dạng, gắn chuyên đề và xuất bản. Một câu dùng chung cho nhiều chuyên đề, luyện tập và tạo đề; không cần nhập lặp lại. Luồng tải file AI tự xuất bản; biên tập thủ công vẫn mặc định lưu nháp. Câu hỏi và chuyên đề có trạng thái xuất bản riêng; học sinh chỉ nhận nội dung đã xuất bản.

Mỗi chuyên đề có ba mục **Lý thuyết**, **Ví dụ** và **Bài tập vận dụng**. Lý thuyết/ví dụ nhập TeX riêng; bài vận dụng hiển thị danh sách đề bài trong đúng chuyên đề, mỗi bài có nút **Đáp án** để mở/ẩn lời giải. Danh sách tải 10 bài mỗi trang. Bảng chọn có 100 icon toán cấp 2, chỉ hiện hình.

Trang admin mặc định có **Nhập file TeX (.tex)**. AI chỉ nhận dạng và gắn chuyên đề theo mô tả, không sửa mã, lời giải hay chuẩn hóa. Nguồn TeX, `ex/bt`, `immini` và TikZ được giữ nguyên. Chỉ xử lý `bt` và `ex` tự luận không có lựa chọn; trắc nghiệm có lựa chọn vẫn bỏ qua. Cấu hình hỗ trợ Gemini, GPT, Claude và DeepSeek; key mã hóa ở máy chủ. Biên tập thủ công và nút AI chuẩn hóa LaTeX cho các câu được chọn là các thao tác riêng, không chạy khi nhập file.

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

Giáo viên đăng nhập, tạo mã 8 chữ/số. Trong **Ngân hàng câu hỏi**, chọn **Nhập file TeX (.tex)**, đưa `.tex` lên là xong: AI chỉ phân loại theo mô tả chuyên đề đã xuất bản, gắn chuyên đề và xuất bản, giữ nguyên mã nguồn/lời giải. Không cần mở bảng duyệt, chọn chuyên đề hoặc bật xuất bản. Tiến trình được lưu trên D1; Cron trên máy chủ nhận việc mỗi phút; việc gọi AI không phụ thuộc trang đang mở. Khi báo máy chủ đã nhận đủ, có thể đóng trang. Nguồn đang gửi được giữ trong IndexedDB và tự gửi tiếp khi mở lại cùng trình duyệt. Gửi lại cùng nguồn không tạo câu trùng. Các câu lỗi dịch vụ hoặc chưa đạt kiểm tra được giữ để tự thử lại; cấu hình AI phải có key/model hoạt động. Cần nhập Word hay sửa riêng thì mở **Biên tập thủ công (tùy chọn)**. Học sinh học theo chuyên đề hoặc tạo đề 7 câu theo cấu hình quản trị viên. Nguồn mới không cần Google Sheets; nâng cấp giữ dữ liệu D1 hiện có.

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
- TikZ biên dịch ngoài Workers, tối đa hai tác vụ đồng thời. Hình hiển thị ở một nửa chiều rộng vừa khung ban đầu, căn giữa và giữ tỷ lệ; không thay mã nguồn. Cache trình duyệt tối đa 40 ảnh nhỏ, mỗi ảnh tối đa 600.000 ký tự base64; khóa gồm toàn bộ tài liệu và endpoint. Cache có thể bị xóa và không dùng chung giữa các thiết bị. Không lưu PNG trong D1.

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

## Viết lại chuyên đề theo tài liệu tháng 10/2026

`content/ts10-topics.json` là bản biên soạn 14 chuyên đề, 112 dạng bài và 28 ví dụ có lời giải từ tài liệu người quản trị cung cấp. Nội dung học sinh gồm kiến thức, cách tiếp cận, lưu ý, các dạng mở rộng và ví dụ. Mã CĐ01–CĐ14 dùng để tra cứu kiến thức, không gắn lại số Câu 1–7 cho ngân hàng. Phần hướng dẫn AI, thống kê tần suất chưa kiểm chứng và cấu hình biên dịch trong tài liệu nguồn không được đưa vào bài học.

- Xem kế hoạch: `npm run topics:rewrite -- --remote` (bỏ `--remote` để dùng D1 cục bộ).
- Áp dụng và xuất bản toàn bộ 14 chuyên đề: `npm run topics:rewrite -- --remote --apply`.
- Lệnh này **ghi đè có chủ đích** tiêu đề, mô tả, lý thuyết, ví dụ, icon, thứ tự và trạng thái của các chuyên đề trong kế hoạch; nên dùng sau khi đối chiếu nội dung. Không chạy seed danh mục 18 mục cũ sau khi viết lại.
- Trước khi ghi, CLI sao lưu riêng vào `.data/backups/curriculum-*.json` (không commit). Chuyên đề ngoài kế hoạch làm lệnh dừng để đối chiếu. Những chỉnh sửa mới có kiểm tra phiên bản; câu hỏi được gắn sang nhóm mới trước khi bỏ nhóm cũ, đồng thời chuyển các lựa chọn trong cấu hình tạo đề.
- Nguồn câu hỏi, lời giải, trạng thái nháp/xuất bản, tài khoản và cấu hình trang học sinh được giữ nguyên. “Xuất bản tất cả” trong lệnh này chỉ áp dụng chuyên đề, không xuất bản các câu hỏi nháp. Lệnh viết lại chuyên đề không gọi dịch vụ AI. Quy tắc xử lý câu hiện hành nằm ở mục “AI chỉ phân chuyên đề” bên dưới.
- Chạy lại ngay trên cùng nội dung không tạo bản trùng hoặc tăng phiên bản. Sau khi quản trị viên biên tập thêm trên web, chạy lại có `--apply` sẽ thay nội dung đó bằng bản trong Git; chỉnh sửa thường ngày nên thực hiện ở trang quản trị.


## AI chỉ phân chuyên đề

- AI quét kho chỉ đọc đề bài để chọn chuyên đề theo mô tả. Không gửi lời giải hay yêu cầu viết lại mã; mã vẽ, khai báo và comment được bỏ khỏi bản gửi AI để giảm dữ liệu, nguồn lưu giữ nguyên.
- Kết quả AI chỉ có ID câu, ID chuyên đề và lý do. Các trường mã nguồn bất ngờ trong phản hồi bị bỏ qua. Cờ `repair` từ giao diện cũ không kích hoạt sửa nguồn nữa. Quét kho chỉ cập nhật liên kết chuyên đề, giữ trạng thái xuất bản, đề, đáp án và TikZ.
- Tải file mặc định chỉ tách bài, không chuẩn hóa hoặc sửa cú pháp. `ex` tự luận vẫn được gắn chuyên đề, giữ nguyên môi trường. Các chức năng biên tập/chuẩn hóa thủ công chỉ chạy khi quản trị viên chủ động chọn.
- Các lượt đang chờ được chuyển sang phân loại nhẹ bằng migration `0009_classification_only.sql`, bỏ lease/thời gian chờ sửa mã cũ. Bản nhập đã chuẩn hóa nhưng còn giữ `originalRaw` được lấy lại từ nguồn ban đầu. Không ghi đè các câu đã xuất bản trước khi nâng cấp.
- Lịch sử nguồn cũ vẫn chỉ quản trị đọc được; AI không đọc hay viết lại lịch sử này.

### Hàng đợi tự xuất bản

Migration `0008_automatic_imports.sql` thêm biên nhận tải lên, nguồn theo SHA-256 và lease xử lý. Tải tối đa 100 tệp/10.000 câu mỗi lượt, gửi từng phần tối đa 15 câu để phù hợp số truy vấn của D1 Free. Mỗi nguồn chỉ có một tác vụ hoạt động; lease hết hạn được tự nhận lại. Snapshot nguồn, câu hỏi, liên kết chuyên đề và trạng thái xuất bản được ghi trong cùng giao dịch. Chỉ cron `* * * * *` phân loại theo đợt tối đa 6 nguồn/lượt, tổng tối đa 6 nguồn đang xử lý; tải file và GET tiến độ không gọi AI; kiểm thử kiểm soát số truy vấn dưới giới hạn D1 Free. Tiến trình tồn tại khi không có trình duyệt mở.

Lỗi mạng, timeout hoặc dịch vụ tạm ngừng thử lại sau khoảng một phút; HTTP 429 tuân thủ Retry-After (mặc định một phút), lỗi key/model/số dư chờ 15 phút. Kết quả chưa phân loại được lùi tối đa năm phút. Mỗi lượt cron có ngân sách 180 giây, yêu cầu AI tối đa 150 giây, lease ít nhất 210 giây để tránh tác vụ chậm bị nhận trùng. Lưu cấu hình AI mới đánh thức các câu đang chờ ngay. Chỉ chuyên đề đã xuất bản và có mô tả được chọn cho luồng tự xuất bản. Các nguồn trắc nghiệm có lựa chọn tiếp tục được bỏ qua theo phạm vi nhập tự luận. Câu đã xóa không bị cron khôi phục; chỉ tải lại chính nguồn đó mới tạo lượt nhập mới.

Khi quay về tab, focus cửa sổ hoặc có mạng trở lại, giao diện đọc ngay tiến độ từ máy chủ. Trạng thái hiện giờ thử lại; lease đã hết hạn được tính là chờ khôi phục. Việc cập nhật giao diện không khởi chạy thêm yêu cầu AI.


## Xóa danh sách nhập và AI chuẩn hóa LaTeX theo chuyên đề

- **Xóa danh sách nhập** nằm trong cột nhập file bên trái. Thao tác xóa các lượt tải và nguồn hàng đợi, hủy phần còn chờ; giữ nguyên câu hỏi/chuyên đề đã lưu. Máy chủ tăng generation để chặn các bản tải dở từ tab hoặc trình duyệt cũ tự gửi lại. Nút không xóa lịch sử nguồn đã lưu của câu hỏi trong kho.
- Trong **Ngân hàng câu hỏi**, chọn chuyên đề ở bộ lọc, chọn từng câu hoặc **Chọn hết**, rồi bấm **AI chuẩn hóa LaTeX (N câu)**. Chọn hết áp dụng bộ lọc trên tất cả các trang. Một yêu cầu nhận tối đa 10.000 ID, ghi hàng đợi nguyên tử và dùng ID ổn định để thử lại khi mất phản hồi.
- Đây là chế độ **Chuẩn hóa** của skill `chuan-hoa-latex-toan`: chỉ sửa cú pháp, định dạng và môi trường. Không kiểm tra/sửa đáp án, không viết thêm lời giải. Prompt dùng bản quy tắc người dùng cung cấp trong `server/normalization-rules.ts`. TikZ/macro được khóa và phục hồi nguyên văn; giữ immini, bảng và bố cục cột. Chuẩn hóa tự luận `ex` thành `bt`, giữ trắc nghiệm và shortans trong `ex`.
- Mã được kiểm tra về cú pháp, dấu hiệu thay đổi nội dung, thứ tự ý, cấu trúc bảng và token hình. Kết quả không đạt được giữ bản gốc và báo cần kiểm tra; không đánh dấu thành công. Việc kiểm tra này không phải chứng minh đúng toán học hoặc biên dịch toàn bộ tài liệu.
- Mỗi thay đổi nguồn có snapshot trước khi sửa trong `question_revisions`, cùng giao dịch với lưu mã và xác nhận hoàn thành. Kết quả cũ không ghi đè nguồn vừa được chỉnh ở nơi khác. Nhãn, thứ tự, preamble, liên kết chuyên đề và trạng thái xuất bản được giữ. Một câu dùng chung nhiều chuyên đề vẫn chỉ có một bản ghi nguồn.
- Chuẩn hóa chạy bằng cron, không phụ thuộc cửa sổ admin. Mỗi lượt tối đa hai câu; khi cùng có nhập file và chuẩn hóa thì luân phiên để hai hàng đợi đều tiếp tục. Bộ đếm tiến độ lưu trong D1 để cập nhật giao diện không quét lại nguồn hay toàn bộ danh sách câu mỗi lần.
- Migration `0010_admin_normalization.sql` chỉ thêm bảng điều khiển và hàng đợi/counter, không chuẩn hóa hay xóa dữ liệu cũ khi triển khai. Chủ web chọn câu và bấm nút để bắt đầu.
