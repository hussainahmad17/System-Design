// Previous / Next for cursor pagination. There are no page numbers to jump to:
// a cursor only knows "after this item" or "before this item".
interface Props {
  pageNo: number;
  hasPrev: boolean;
  hasNext: boolean;
  disabled?: boolean;
  onPrev: () => void;
  onNext: () => void;
}

export default function Pager({ pageNo, hasPrev, hasNext, disabled, onPrev, onNext }: Props) {
  if (!hasPrev && !hasNext) return null;
  return (
    <nav className="pager" aria-label="Pages">
      <button className="btn btn--outline" disabled={!hasPrev || disabled} onClick={onPrev}>Previous</button>
      <span className="muted">Page {pageNo}</span>
      <button className="btn btn--outline" disabled={!hasNext || disabled} onClick={onNext}>Next</button>
    </nav>
  );
}
