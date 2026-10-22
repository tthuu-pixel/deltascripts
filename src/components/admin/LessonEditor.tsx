import { lazy, Suspense, useRef, useState } from 'react';
import { readLessonSource } from '../../../shared/lesson';
import Icon from '../Icons';
const LatexContent = lazy(() => import('../LatexContent'));
export default function LessonEditor({
  label,
  value,
  preamble = '',
  onChange,
  disabled = false,
  maxLength = 500_000,
}: {
  label: string;
  value: string;
  preamble?: string;
  onChange: (value: string, preamble: string) => void;
  disabled?: boolean;
  maxLength?: number;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState(false),
    [error, setError] = useState(''),
    [reading, setReading] = useState(false);
  return (
    <section className="lesson-editor">
      <div className="editor-toolbar">
        <strong>{label}</strong>
        <div>
          <input
            ref={input}
            type="file"
            accept=".tex,.txt"
            className="visually-hidden"
            aria-label={`Nhập file ${label.toLowerCase()}`}
            disabled={disabled || reading}
            onChange={async (event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (!file) return;
              setError('');
              setReading(true);
              try {
                if (file.size > Math.min(1_500_000, maxLength * 3))
                  throw new Error('File bài học quá lớn. Hãy chia thành bài nhỏ hơn.');
                if (value.trim() && !confirm('Thay nội dung đang soạn bằng file này?')) return;
                const parsed = readLessonSource(await file.text());
                if (parsed.theory.length > maxLength || parsed.preamble.length > 50_000)
                  throw new Error(
                    'Nội dung vượt giới hạn. Hãy chia bài học thành các phần nhỏ hơn.',
                  );
                onChange(parsed.theory, parsed.preamble);
                setPreview(false);
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setReading(false);
              }
            }}
          />
          <button
            className="text-button"
            type="button"
            disabled={disabled || reading}
            onClick={() => input.current?.click()}
          >
            <Icon name="upload" size={17} />
            {reading ? 'Đang đọc…' : 'Nhập file TeX'}
          </button>
          <button
            className="text-button"
            type="button"
            disabled={disabled || reading}
            aria-pressed={preview}
            onClick={() => setPreview(!preview)}
          >
            <Icon name={preview ? 'practice' : 'eye'} size={17} />
            {preview ? 'Soạn nội dung' : 'Xem trước'}
          </button>
        </div>
      </div>
      {error && (
        <p role="alert" className="notice notice-error">
          {error}
        </p>
      )}
      {preview ? (
        <div className="editor-preview">
          <Suspense fallback={<p role="status">Đang mở bản xem trước…</p>}>
            <LatexContent html={value || 'Chưa có nội dung.'} preamble={preamble} />
          </Suspense>
        </div>
      ) : (
        <label className="field">
          <span className="visually-hidden">{label}</span>
          <textarea
            aria-label={label}
            value={value}
            disabled={disabled || reading}
            maxLength={maxLength}
            rows={12}
            onChange={(e) => onChange(e.target.value, preamble)}
            placeholder="Nhập văn bản, công thức LaTeX hoặc tải file .tex của bạn."
          />
        </label>
      )}
      <p className="field-help">
        Có thể để trống. Dùng $…$ cho công thức và mã TikZ cho hình vẽ. Nhập file chỉ thay bản đang
        soạn; bấm Lưu để ghi lên hệ thống.
      </p>
      {preamble && (
        <details>
          <summary>Khai báo LaTeX từ file</summary>
          <textarea
            aria-label={`Khai báo ${label.toLowerCase()}`}
            disabled={disabled}
            value={preamble}
            maxLength={50_000}
            rows={4}
            onChange={(e) => onChange(value, e.target.value)}
          />
        </details>
      )}
    </section>
  );
}
