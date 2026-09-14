// Section masthead: mono index (00–08) + uppercase label + 1px rule.
export function Masthead({ index, label }: { index: string; label: string }) {
  return (
    <div className="masthead">
      <span className="masthead-kicker">
        {index} / {label}
      </span>
      <div className="masthead-rule" />
    </div>
  );
}
