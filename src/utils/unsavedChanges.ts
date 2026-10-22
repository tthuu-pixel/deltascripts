export const beforeContentLeave = 'deltascript:before-content-leave';
export function confirmContentLeave() {
  return (
    window.dispatchEvent(new Event(beforeContentLeave, { cancelable: true })) ||
    window.confirm('Bỏ các thay đổi nội dung chưa lưu?')
  );
}
