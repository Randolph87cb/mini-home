export function SidePanel({
  currentCopy,
  validation,
  debugVisible,
  onResetScene,
  onToggleTv,
  onToggleDebug,
}) {
  return (
    <aside className="side-panel">
      <section className="note-card">
        <p className="card-kicker">当前互动</p>
        <h2>{currentCopy.title}</h2>
        <p>{currentCopy.body}</p>
      </section>

      <section className="control-card">
        <p className="card-kicker">客厅状态</p>
        <p>{currentCopy.status}</p>
        <div className="control-actions">
          <button type="button" onClick={onResetScene}>
            回到沙发
          </button>
          <button type="button" onClick={onToggleTv}>
            切换电视
          </button>
          <button type="button" onClick={onToggleDebug}>
            {debugVisible ? "隐藏校验" : "显示校验"}
          </button>
        </div>
      </section>

      <section className="validation-card">
        <div className="validation-header">
          <div>
            <p className="card-kicker">场景校验</p>
            <h2>{validation.title}</h2>
          </div>
          <span className={`validation-badge ${validation.badgeLevel}`}>{validation.badge}</span>
        </div>
        <ul className="validation-list">
          {validation.checks.map((check) => (
            <li key={check.message} className={`validation-item-${check.level}`}>
              {check.message}
            </li>
          ))}
        </ul>
      </section>
    </aside>
  );
}
