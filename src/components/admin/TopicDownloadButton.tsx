import { useState } from 'react';
import type { TopicSummary } from '../../../shared/content';
import { downloadTopicQuestions } from '../../services/topicTexArchive';
import Icon from '../Icons';
export default function TopicDownloadButton({
  topic,
  disabled = false,
  onError,
  onDownloaded,
}: {
  topic: Pick<TopicSummary, 'id' | 'title'>;
  disabled?: boolean;
  onError: (message: string) => void;
  onDownloaded?: (count: number) => void;
}) {
  const [loading, setLoading] = useState(false),
    [progress, setProgress] = useState({ received: 0, total: 0 });
  async function download() {
    if (loading) return;
    setLoading(true);
    onError('');
    try {
      const count = await downloadTopicQuestions(topic, (received, total) =>
        setProgress({ received, total }),
      );
      onDownloaded?.(count);
    } catch (error) {
      onError((error as Error).message);
    } finally {
      setLoading(false);
    }
  }
  return (
    <button
      type="button"
      className="btn btn-secondary"
      disabled={disabled || loading}
      onClick={() => void download()}
      title="Tải toàn bộ đề và lời giải, gồm cả câu nháp và đã xuất bản"
      aria-label={`Tải tất cả câu hỏi của ${topic.title} (.tex)`}
    >
      <Icon name="download" size={18} />
      {loading
        ? progress.total
          ? `Đang gộp ${progress.received}/${progress.total} câu…`
          : 'Đang lấy câu hỏi…'
        : 'Tải tất cả câu hỏi (.tex)'}
    </button>
  );
}
