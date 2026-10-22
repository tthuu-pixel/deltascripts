import { useEffect, useRef, useState } from 'react';
import { topicIcons, type ContentColor, type TopicIcon } from '../../../shared/content';
import Icon from '../Icons';
export default function IconPicker({
  value,
  color,
  disabled,
  onChange,
}: {
  value: TopicIcon;
  color: ContentColor;
  disabled: boolean;
  onChange: (icon: TopicIcon) => void;
}) {
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null),
    trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const element = dialog.current;
    if (open) element?.showModal();
    else element?.close();
    return () => element?.close();
  }, [open]);
  function close() {
    setOpen(false);
    trigger.current?.focus();
  }
  return (
    <div className="field topic-icon-field">
      <span>Biểu tượng</span>
      <button
        ref={trigger}
        type="button"
        className={`topic-icon-trigger tone-${color}`}
        aria-label="Chọn biểu tượng chuyên đề"
        aria-haspopup="dialog"
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        <Icon name={value} size={32} />
        <Icon name="chevron" size={16} />
      </button>
      <dialog
        ref={dialog}
        className="icon-picker-dialog"
        aria-labelledby="icon-picker-title"
        onCancel={(e) => {
          e.preventDefault();
          close();
        }}
      >
        <div className="icon-picker-heading">
          <h3 id="icon-picker-title">Chọn biểu tượng</h3>
          <button
            type="button"
            className="icon-button"
            aria-label="Đóng bảng biểu tượng"
            onClick={close}
          >
            <Icon name="close" size={22} />
          </button>
        </div>
        {open && (
          <div className="math-icon-grid" role="group" aria-label="50 biểu tượng toán học">
            {topicIcons.map((icon, index) => (
              <button
                type="button"
                key={icon}
                className={`math-icon-option ${value === icon ? `is-selected tone-${color}` : ''}`}
                aria-label={`Biểu tượng ${String(index + 1).padStart(2, '0')}`}
                aria-pressed={value === icon}
                onClick={() => {
                  onChange(icon);
                  close();
                }}
              >
                <Icon name={icon} size={30} />
                {value === icon && <Icon name="check" size={12} className="icon-selected-mark" />}
              </button>
            ))}
          </div>
        )}
      </dialog>
    </div>
  );
}
