import { useState } from 'react';
import type { TopicSummary } from '../../../shared/content';
import TopicPicker from './TopicPicker';
export interface QuestionChanges {
  published?: boolean;
  topicIds?: string[];
  mode?: 'add' | 'replace' | 'remove';
}
export default function BulkQuestionActions({
  count,
  topics,
  busy,
  onApply,
}: {
  count: number;
  topics: TopicSummary[];
  busy: boolean;
  onApply: (changes: QuestionChanges) => void;
}) {
  const [mode, setMode] = useState<'keep' | 'add' | 'replace' | 'remove'>('keep'),
    [ids, setIds] = useState<string[]>([]),
    [status, setStatus] = useState('keep');
  const hasTopics = mode !== 'keep' && (mode === 'replace' || ids.length > 0);
  return (
    <section className="bulk-classification surface" aria-label="Phân loại câu đã chọn">
      <h3>Cập nhật {count} câu đã chọn</h3>
      <div className="admin-form-grid">
        <label className="field">
          <span>Gán chuyên đề</span>
          <select
            aria-label="Gán chuyên đề"
            disabled={busy}
            value={mode}
            onChange={(e) => setMode(e.target.value as typeof mode)}
          >
            <option value="keep">Giữ nguyên chuyên đề</option>
            <option value="add">Thêm vào chuyên đề</option>
            <option value="replace">Thay toàn bộ chuyên đề</option>
            <option value="remove">Bỏ khỏi chuyên đề</option>
          </select>
        </label>
        <label className="field">
          <span>Trạng thái câu hỏi</span>
          <select
            aria-label="Trạng thái câu hỏi"
            disabled={busy}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="keep">Giữ nguyên trạng thái</option>
            <option value="draft">Chuyển về bản nháp</option>
            <option value="published">Xuất bản cho học sinh</option>
          </select>
        </label>
      </div>
      {mode !== 'keep' && (
        <TopicPicker
          topics={topics}
          value={ids}
          disabled={busy}
          onChange={setIds}
          label="Chọn chuyên đề để áp dụng"
        />
      )}
      <button
        type="button"
        className="btn btn-primary"
        disabled={busy || (!hasTopics && status === 'keep')}
        onClick={() => {
          if (
            mode === 'replace' &&
            !ids.length &&
            !confirm(`Bỏ tất cả nhãn chuyên đề của ${count} câu đã chọn?`)
          )
            return;
          onApply({
            ...(status !== 'keep' ? { published: status === 'published' } : {}),
            ...(hasTopics ? { topicIds: ids, mode: mode as 'add' | 'replace' | 'remove' } : {}),
          });
        }}
      >
        Áp dụng cho {count} câu
      </button>
    </section>
  );
}
