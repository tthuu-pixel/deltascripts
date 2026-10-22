import type { TopicSummary } from '../../../shared/content';
export default function TopicPicker({
  topics,
  value,
  onChange,
  disabled = false,
  label = 'Chuyên đề',
}: {
  topics: TopicSummary[];
  value: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <fieldset className="topic-picker" disabled={disabled}>
      <legend>
        {label} <small>tối đa 10</small>
      </legend>
      {topics.length ? (
        <div className="topic-picker-options">
          {topics.map((topic) => (
            <label key={topic.id}>
              <input
                type="checkbox"
                checked={value.includes(topic.id)}
                disabled={!value.includes(topic.id) && value.length >= 10}
                onChange={() =>
                  onChange(
                    value.includes(topic.id)
                      ? value.filter((id) => id !== topic.id)
                      : [...value, topic.id],
                  )
                }
              />
              <span>
                {topic.title}
                {!topic.published && <small> · nháp</small>}
              </span>
            </label>
          ))}
        </div>
      ) : (
        <p className="muted">Tạo chuyên đề trong mục Chuyên đề trước khi phân loại câu hỏi.</p>
      )}
    </fieldset>
  );
}
