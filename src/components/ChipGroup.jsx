// Single-choice chips: faster and more touch-friendly than a dropdown for short lists.
export default function ChipGroup({ label, options, value, onChange, className = '' }) {
  return (
    <div className="field">
      <span className="field-label">{label}</span>
      <div role="group" aria-label={label} className={`chip-group ${className}`}>
        {options.map(o => (
          <button type="button" key={o.value} className="seg" aria-pressed={o.value === value}
            onClick={() => onChange(o.value)}>
            <span className="seg-main">{o.label}</span>
            {o.sub && <span className="seg-sub">{o.sub}</span>}
          </button>
        ))}
      </div>
    </div>
  )
}
