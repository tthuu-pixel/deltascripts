# Danh sách model AI

Đối chiếu ngày 23/10/2026. Học sinh và quản trị dùng chung danh sách gợi ý trong `shared/ai.ts`; **Kiểm tra & lấy mô hình/model** bổ sung ID do API tài khoản trả về. Có thể dùng **Model khác** để nhập một model mới hoặc model qua gateway riêng của admin.

| Nhà cung cấp | Các ID gợi ý                                                                                        | Mặc định cho cấu hình mới |
| ------------ | --------------------------------------------------------------------------------------------------- | ------------------------- |
| Gemini       | `gemini-4-argon`, `gemini-3.8-flash`, `gemini-3.5-flash-lite`                                       | `gemini-3.8-flash`        |
| OpenAI / GPT | `gpt-6.1-sol`, `gpt-6-astra`, `gpt-6-sol`, `gpt-6-luna`                                             | `gpt-6.1-sol`             |
| Claude       | `claude-opus-5-5`, `claude-sonnet-5-5`, `claude-haiku-5-5`, `claude-mythos-5-1`, `claude-fable-5-1` | `claude-sonnet-5-5`       |
| DeepSeek     | `deepseek-flash` (V4.1 Flash), `deepseek-v4-pro` (V4 Pro)                                           | `deepseek-flash`          |

Danh sách là gợi ý từ SDK/tài liệu, không xác nhận mọi tài khoản đều được cấp quyền. Việc lấy danh sách model cũng không thay thế một lần gọi tạo nội dung thành công. Các tùy chọn ngoài danh sách vẫn được giữ khi đang chọn hoặc API tài khoản trả về.

Cấu hình admin trong D1 và cấu hình cá nhân đã lưu trong tab được giữ nguyên, gồm API key, Base URL và model đã chọn. Cập nhật danh sách không tự chuyển model cho cấu hình đang có. `GEMINI_MODEL` trong Wrangler được đổi sang `gemini-3.8-flash`, làm giá trị dự phòng cho request không truyền tên model; tên model cụ thể trong request được ưu tiên.

## Tương thích model suy luận

- Gemini 3 dùng mức suy luận `LOW` với trần tổng token tối thiểu 8.192; Gemini 4 Argon cần tối thiểu 32.768 để có chỗ cho suy luận và câu trả lời theo hướng dẫn nâng cấp chính thức.
- GPT-6 dùng `reasoning_effort=low` với trần tổng token tối thiểu 16.384. Đây là giới hạn, không phải số token luôn tiêu thụ.
- Khi dịch vụ báo hết giới hạn token, ứng dụng báo chưa tạo đủ câu trả lời thay vì hiển thị lời giải đang bị cắt. Tham số token của các model cũ đã lưu được giữ theo cơ chế cũ.
- Vẫn áp dụng giới hạn thời gian và kích thước phản hồi. Ứng dụng không tự gọi nhiều lần hoặc tự chuyển sang model khác khi một yêu cầu lỗi.

## Nguồn chính thức

- [Google Gemini Cookbook](https://github.com/google-gemini/cookbook/blob/main/quickstarts/Get_started.ipynb): tên model và hướng dẫn nâng cấp Gemini 4 Argon.
- [OpenAI Python SDK — ChatModel](https://github.com/openai/openai-python/blob/main/src/openai/types/shared/chat_model.py): ID model dùng trong API.
- [Anthropic Python SDK — Model](https://github.com/anthropics/anthropic-sdk-python/blob/main/src/anthropic/types/model.py): ID các dòng Claude mới.
- [DeepSeek Harness — adapter chính thức](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/llm/llm-deepseek/README.md): danh mục `deepseek-flash` và `deepseek-v4-pro`; [cấu hình](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/llm/llm-deepseek/src/config.ts) xác định hai dòng V4.1 Flash và V4 Pro.
