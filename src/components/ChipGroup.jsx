// Single-choice segmented control: segments share one frame, like the column heads of a tide table.
// Faster and more touch-friendly than a dropdown for short lists.
export default function ChipGroup({ label, note, options, value, onChange, className = '' }) {
  return (
    <div className="field">
      <span className="field-label">{label}{note && <span className="field-note">{note}</span>}</span>
      <div role="group" aria-label={label} className={`segments ${className}`}>
        {options.map(o => (
          <button type="button" key={o.value} className="seg" aria-pressed={o.value === value}
            aria-label={o.name} onClick={() => onChange(o.value)}>
            {o.top && <span className="seg-top">{o.top}</span>}
            <span className="seg-main">{o.main}</span>
            {o.unit && <span className="seg-unit">{o.unit}</span>}
          </button>
        ))}
      </div>
    </div>
  )
}
