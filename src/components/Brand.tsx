export default function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`brand ${compact ? 'brand-compact' : ''}`}>
      <img src="/brand-mark.svg" width="48" height="48" alt="" />
      {!compact && (
        <span className="brand-name">
          Delta<span>Script</span>
          <small>CÙNG BẠN CHINH PHỤC TOÁN 9</small>
        </span>
      )}
    </span>
  );
}
