import {
  formatHomeTime,
  getOccupantLabel,
  OCCUPANTS,
  QUICK_NOTE_TARGETS,
} from "../homeData";

export function SidePanel({
  currentCopy,
  currentMode,
  validation,
  debugVisible,
  quickNotes,
  totalNoteCount,
  totalLetterCount,
  latestLetter,
  homeUpdatedAt,
  noteDraft,
  noteAuthorId,
  onResetScene,
  onToggleTv,
  onToggleDebug,
  onOpenLetters,
  onNoteDraftChange,
  onNoteAuthorChange,
  onSaveNote,
  onRemoveNote,
  onResetHomeData,
}) {
  const activeQuickNoteConfig = QUICK_NOTE_TARGETS[currentMode] ?? null;

  return (
    <aside className="side-panel">
      <section className="note-card">
        <p className="card-kicker">当前互动</p>
        <h2>{currentCopy.title}</h2>
        <p>{currentCopy.body}</p>
        {activeQuickNoteConfig && quickNotes.length > 0 ? (
          <p className="inline-note-preview">
            最近留话：{quickNotes[0].body}
          </p>
        ) : null}
      </section>

      <section className="memory-card">
        <div className="memory-header">
          <div>
            <p className="card-kicker">小家记录</p>
            <h2>最近留下的痕迹</h2>
            {homeUpdatedAt ? (
              <p className="memory-updated-at">最近更新：{formatHomeTime(homeUpdatedAt)}</p>
            ) : null}
          </div>
          <button type="button" className="secondary-button" onClick={onOpenLetters}>
            打开信件板
          </button>
        </div>
        <div className="memory-stats">
          <div>
            <span className="memory-stat-value">{totalNoteCount}</span>
            <span className="memory-stat-label">全屋便签</span>
          </div>
          <div>
            <span className="memory-stat-value">{totalLetterCount}</span>
            <span className="memory-stat-label">长信数量</span>
          </div>
        </div>
        {latestLetter ? (
          <article className="letter-preview-card">
            <p className="letter-preview-meta">
              {getOccupantLabel(latestLetter.authorId)} · {formatHomeTime(latestLetter.updatedAt)}
            </p>
            <h3>{latestLetter.title}</h3>
            <p>{latestLetter.body}</p>
          </article>
        ) : (
          <p className="empty-state">信件板上还没有长信，可以先留一封慢慢看的话。</p>
        )}
      </section>

      {activeQuickNoteConfig ? (
        <section className="compose-card">
          <p className="card-kicker">{activeQuickNoteConfig.shortTitle}便签</p>
          <h2>{activeQuickNoteConfig.title}</h2>
          <p className="compose-helper">
            这里适合留一句轻一点的话，让这个角落慢慢有你们的生活痕迹。
          </p>

          <div className="author-switch" role="group" aria-label="选择便签署名">
            {OCCUPANTS.map((person) => (
              <button
                key={person.id}
                type="button"
                className={person.id === noteAuthorId ? "author-chip is-active" : "author-chip"}
                onClick={() => onNoteAuthorChange(person.id)}
              >
                {person.label}
              </button>
            ))}
          </div>

          <label className="field-label" htmlFor="quick-note-input">
            写一句留在这里的话
          </label>
          <textarea
            id="quick-note-input"
            className="text-field"
            value={noteDraft}
            onChange={(event) => onNoteDraftChange(event.target.value)}
            placeholder={activeQuickNoteConfig.placeholder}
            maxLength={90}
          />
          <div className="compose-actions">
            <span className="field-meta">{noteDraft.length}/90</span>
            <button type="button" disabled={!noteDraft.trim()} onClick={onSaveNote}>
              保存便签
            </button>
          </div>

          <div className="note-thread" aria-live="polite">
            {quickNotes.length > 0 ? (
              quickNotes.map((note) => (
                <article key={note.id} className="note-thread-item">
                  <div className="note-thread-meta">
                    <span>{getOccupantLabel(note.authorId)}</span>
                    <span>{formatHomeTime(note.createdAt)}</span>
                  </div>
                  <p>{note.body}</p>
                  <button
                    type="button"
                    className="link-button"
                    aria-label={`删除便签 ${note.body}`}
                    onClick={() => onRemoveNote(note.id)}
                  >
                    删除
                  </button>
                </article>
              ))
            ) : (
              <p className="empty-state">{activeQuickNoteConfig.empty}</p>
            )}
          </div>
        </section>
      ) : null}

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
          <button type="button" className="secondary-button" onClick={onResetHomeData}>
            重置本地记录
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
