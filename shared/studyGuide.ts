// Authored starter content, stored as editable HTML/LaTeX in student_settings when seeded.
export const studyGuideContent = String.raw`<div class="study-guide-content" data-study-guide="2026-10">
<div class="guide-welcome">
  <span class="guide-label">BẮT ĐẦU TỪ MỘT VIỆC NHỎ</span>
  <h3>Học ít một, nhưng hiểu đến nơi.</h3>
  <p>Không cần làm thật nhiều bài trong một buổi. Hãy chọn một điều muốn hiểu, tự thử sức và nhìn lại cách mình làm. Góc nhỏ này giúp em xây dựng một nhịp học Toán đều đặn.</p>
</div>
<nav class="guide-shortcuts" aria-label="Nội dung góc học tập">
  <a href="#guide-session">Buổi học 30 phút</a>
  <a href="#guide-writing">Cách trình bày</a>
  <a href="#guide-mistakes">Lỗi thường gặp</a>
  <a href="#guide-week">Kế hoạch một tuần</a>
  <a href="#guide-asking">Khi gặp bài khó</a>
</nav>
<section id="guide-session" class="guide-section">
  <div class="guide-section-heading"><span class="guide-section-number">01</span><div><span class="guide-label">MỘT NHỊP HỌC VỪA SỨC</span><h3>Thử một buổi học 30 phút</h3></div></div>
  <p>Đây là gợi ý để bắt đầu. Em có thể tăng hoặc giảm thời gian theo bài học và sức tập trung của mình.</p>
  <div class="guide-routine">
    <article class="guide-card guide-blue"><span class="guide-time">05 phút</span><h4>Nhớ lại kiến thức</h4><p>Đọc phần Lý thuyết của một chuyên đề. Đóng tài liệu và tự nói lại công thức, điều kiện áp dụng bằng lời của mình.</p></article>
    <article class="guide-card guide-red"><span class="guide-time">15 phút</span><h4>Tự làm một bài</h4><p>Chọn một bài vận dụng vừa sức. Viết rõ dữ kiện và thử làm trước khi mở đáp án. Nếu bí, ghi lại chính xác bước mình đang vướng.</p></article>
    <article class="guide-card guide-yellow"><span class="guide-time">07 phút</span><h4>Đối chiếu cách giải</h4><p>Mở đáp án, so từng bước với bài làm. Tìm điểm khác đầu tiên và giải thích vì sao cần sửa; không chỉ chép lại kết quả.</p></article>
    <article class="guide-card guide-blue"><span class="guide-time">03 phút</span><h4>Chốt một điều nhớ</h4><p>Ghi một kiến thức đã hiểu và một lỗi cần tránh. Hẹn một buổi khác để làm lại bài mà không nhìn lời giải.</p></article>
  </div>
</section>
<section id="guide-writing" class="guide-section">
  <div class="guide-section-heading"><span class="guide-section-number">02</span><div><span class="guide-label">LÀM ĐÚNG, VIẾT RÕ</span><h3>Để người khác hiểu cách em nghĩ</h3></div></div>
  <div class="guide-two-columns">
    <article class="guide-card guide-blue"><h4>Với bài đại số và toán thực tế</h4><ol><li>Đọc yêu cầu; chọn ẩn và ghi điều kiện, đơn vị nếu có.</li><li>Biểu diễn các đại lượng theo ẩn. Khi có nhiều dữ kiện, thử lập một bảng nhỏ.</li><li>Viết phương trình hoặc biểu thức từ mối quan hệ của bài, rồi biến đổi có căn cứ.</li><li>Đối chiếu nghiệm với điều kiện và trả lời đúng câu hỏi, kèm đơn vị.</li></ol><p class="guide-example">Ví dụ: tìm số học sinh thì kết quả phải là số nguyên không âm; nghiệm đại số chưa chắc đã phù hợp thực tế.</p></article>
    <article class="guide-card guide-red"><h4>Với bài hình học và đo lường</h4><ol><li>Vẽ hình theo dữ kiện, ký hiệu rõ điểm, đoạn thẳng và góc.</li><li>Tách điều đã biết và điều cần chứng minh hoặc tính.</li><li>Mỗi kết luận đi kèm lý do: giả thiết, định nghĩa hoặc định lý cùng điều kiện áp dụng.</li><li>Kiểm tra tên điểm, thứ tự đỉnh tương ứng và đơn vị của kết quả.</li></ol><p class="guide-example">Hình vẽ giúp quan sát; một góc nhìn có vẻ vuông hoặc hai đoạn trông bằng nhau chưa thay thế được chứng minh.</p></article>
  </div>
</section>
<section id="guide-mistakes" class="guide-section">
  <div class="guide-section-heading"><span class="guide-section-number">03</span><div><span class="guide-label">DỪNG MỘT CHÚT ĐỂ KIỂM TRA</span><h3>Bốn lỗi nhỏ dễ bỏ sót</h3></div></div>
  <div class="guide-two-columns">
    <article class="guide-card guide-yellow"><h4>Căn bậc hai và dấu</h4><p>Với mọi số thực $x$, ta có $\sqrt{x^2}=|x|$. Chẳng hạn $\sqrt{(-3)^2}=3$, không phải $-3$.</p></article>
    <article class="guide-card guide-blue"><h4>Điều kiện của biểu thức</h4><p>Giữ điều kiện mẫu khác $0$ khi rút gọn: $\dfrac{x^2-9}{x-3}=x+3$ chỉ khi $x\neq3$. Không dùng biểu thức đã rút gọn để thay $x=3$ vào biểu thức gốc.</p></article>
    <article class="guide-card guide-red"><h4>Không bỏ sót nghiệm</h4><p>Phương trình $x^2=9$ có hai nghiệm $x=3$ và $x=-3$. Sau bước bình phương hoặc khử mẫu, hãy kiểm tra lại nghiệm với điều kiện và phương trình ban đầu.</p></article>
    <article class="guide-card guide-yellow"><h4>Đơn vị phải thống nhất</h4><p>Đổi cùng đơn vị trước khi tính. Ví dụ $30$ phút bằng $0{,}5$ giờ. Phân biệt độ dài (cm), diện tích (cm²) và thể tích (cm³).</p></article>
  </div>
</section>
<section id="guide-week" class="guide-section">
  <div class="guide-section-heading"><span class="guide-section-number">04</span><div><span class="guide-label">MỘT TUẦN, MỘT MỤC TIÊU</span><h3>Tự lên lịch học cho mình</h3></div></div>
  <p>Chọn một chuyên đề đang cần củng cố, rồi thử lịch dưới đây. Nếu một buổi chưa hoàn thành, điều chỉnh lịch cho phù hợp thay vì học dồn.</p>
  <ol class="guide-week-plan">
    <li><span>Ngày 1</span><div><h4>Biết mình đang ở đâu</h4><p>Đọc lý thuyết và làm một bài ngắn. Đánh dấu điều đã hiểu, điều chưa chắc.</p></div></li>
    <li><span>Ngày 2</span><div><h4>Đọc một ví dụ thật kỹ</h4><p>Che lời giải, dự đoán bước tiếp theo rồi đối chiếu. Tự giải thích lý do của từng bước.</p></div></li>
    <li><span>Ngày 3</span><div><h4>Tự làm bài cơ bản</h4><p>Chọn vài bài vừa sức. Ưu tiên làm trọn vẹn, trình bày rõ thay vì chạy theo số lượng.</p></div></li>
    <li><span>Ngày 4</span><div><h4>Quay lại lỗi đã gặp</h4><p>Làm lại một bài sai mà không mở đáp án. Viết ngắn cách nhận ra và tránh lỗi đó.</p></div></li>
    <li><span>Ngày 5</span><div><h4>Thử một cách hỏi khác</h4><p>Chọn bài vận dụng khác dữ kiện. Nhận xét điều gì giữ nguyên trong phương pháp giải.</p></div></li>
    <li><span>Ngày 6</span><div><h4>Luyện có thời gian</h4><p>Làm một nhóm bài hoặc đề tham khảo khi đã sẵn sàng. Dành thời gian đọc đề và kiểm tra.</p></div></li>
    <li><span>Ngày 7</span><div><h4>Nhìn lại và nghỉ hợp lý</h4><p>Ghi một tiến bộ, một điều cần hỏi và mục tiêu nhỏ cho tuần sau. Giữ thời gian nghỉ ngơi.</p></div></li>
  </ol>
</section>
<section id="guide-asking" class="guide-section">
  <div class="guide-section-heading"><span class="guide-section-number">05</span><div><span class="guide-label">GẶP BÀI KHÓ LÀ MỘT PHẦN CỦA VIỆC HỌC</span><h3>Hỏi để hiểu, rồi tự làm lại</h3></div></div>
  <div class="guide-two-columns">
    <article class="guide-card guide-blue"><h4>Chuẩn bị một câu hỏi cụ thể</h4><p>Nêu dữ kiện, bước đã thử và chỗ đang vướng khi hỏi thầy cô, bạn học hoặc trợ lý AI.</p><blockquote>“Em đã đặt ẩn và lập được phương trình này, nhưng chưa biết biểu diễn dữ kiện còn lại. Cho em một gợi ý để tự làm tiếp được không?”</blockquote><p>Đọc lại gợi ý, kiểm tra với giả thiết và tự viết lời giải. Nếu hai cách giải khác nhau, hỏi rõ vì sao từng bước hợp lệ.</p></article>
    <article class="guide-card guide-yellow"><h4>Trước khi kết thúc buổi học</h4><ul class="guide-checklist"><li>Em có nói lại được ý chính mà không nhìn tài liệu không?</li><li>Em đã tự thử bài trước khi mở đáp án chưa?</li><li>Em có tìm được nguyên nhân của một lỗi sai không?</li><li>Em biết buổi sau nên bắt đầu từ đâu chưa?</li></ul></article>
  </div>
</section>
<aside class="guide-closing"><span>✦</span><p>Mỗi buổi học không cần hoàn hảo. Chỉ cần em hiểu thêm một điều và biết bước tiếp theo của mình.</p></aside>
</div>`;
