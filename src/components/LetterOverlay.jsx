import { formatHomeTime, getOccupantLabel, OCCUPANTS } from "../homeData";

export function LetterOverlay({
  manifest,
  open,
  letters,
  activeLetterId,
  isCreatingLetter,
  letterDraft,
  onClose,
  onSelectLetter,
  onCreateLetter,
  onDraftChange,
  onSaveLetter,
  onDeleteLetter,
}) {
  if (!open || !manifest) {
    return null;
  }

  const letterOpenState = manifest.states.find((item) => item.id === "letter-open");
  const activeLetter = letters.find((item) => item.id === activeLetterId) ?? null;
  const isNewLetter = isCreatingLetter || activeLetterId === null;

  return (
    <div className="letter-overlay" aria-hidden="false">
      <div className="letter-panel">
        <div className="letter-aside">
          <button className="overlay-close" type="button" onClick={onClose}>
            收起信件
          </button>
          <img src={letterOpenState?.src} alt="展开的信件" />
          <div className="letter-copy">
            <p className="letter-kicker">信件板</p>
            <h2>留给你慢慢看的话</h2>
            <p>这里适合放那些不想被一句话说完的心情。每一封信都会保存在这台设备里。</p>
          </div>
        </div>

        <div className="letter-workspace">
          <div className="letter-toolbar">
            <div>
              <p className="card-kicker">长信记录</p>
              <h2>{letters.length} 封信</h2>
            </div>
            <button type="button" className="secondary-button" onClick={onCreateLetter}>
              写新信
            </button>
          </div>

          <div className="letter-layout">
            <div className="letter-list" role="list" aria-label="信件列表">
              {letters.map((letter) => (
                <button
                  key={letter.id}
                  type="button"
                  className={letter.id === activeLetterId ? "letter-list-item is-active" : "letter-list-item"}
                  onClick={() => onSelectLetter(letter.id)}
                >
                  <span className="letter-list-title">{letter.title}</span>
                  <span className="letter-list-meta">
                    {getOccupantLabel(letter.authorId)} · {formatHomeTime(letter.updatedAt)}
                  </span>
                </button>
              ))}
            </div>

            <div className="letter-editor">
              <label className="field-label" htmlFor="letter-title-input">
                信的标题
              </label>
              <input
                id="letter-title-input"
                className="text-input"
                value={letterDraft.title}
                onChange={(event) => onDraftChange({ ...letterDraft, title: event.target.value })}
                placeholder="比如：今天晚一点回来"
                maxLength={48}
              />

              <div className="author-switch" role="group" aria-label="选择信件署名">
                {OCCUPANTS.map((person) => (
                  <button
                    key={person.id}
                    type="button"
                    className={person.id === letterDraft.authorId ? "author-chip is-active" : "author-chip"}
                    onClick={() => onDraftChange({ ...letterDraft, authorId: person.id })}
                  >
                    {person.label}
                  </button>
                ))}
              </div>

              <label className="field-label" htmlFor="letter-body-input">
                想慢慢留给对方的话
              </label>
              <textarea
                id="letter-body-input"
                className="text-field letter-body-field"
                value={letterDraft.body}
                onChange={(event) => onDraftChange({ ...letterDraft, body: event.target.value })}
                placeholder="写一封可以让对方慢慢看的信。"
                maxLength={600}
              />

              <div className="compose-actions">
                <span className="field-meta">{letterDraft.body.length}/600</span>
                <div className="stack-actions">
                  {!isNewLetter && activeLetter ? (
                    <button
                      type="button"
                      className="link-button"
                      aria-label={`删除信件 ${activeLetter.title}`}
                      onClick={() => onDeleteLetter(activeLetter.id)}
                    >
                      删除这封信
                    </button>
                  ) : null}
                  <button
                    type="button"
                    disabled={!letterDraft.title.trim() || !letterDraft.body.trim()}
                    onClick={onSaveLetter}
                  >
                    {isNewLetter ? "保存这封信" : "更新这封信"}
                  </button>
                </div>
              </div>

              {activeLetter ? (
                <p className="field-meta">
                  上次更新：{formatHomeTime(activeLetter.updatedAt)} · {getOccupantLabel(activeLetter.authorId)}
                </p>
              ) : (
                <p className="field-meta">写一封新的长信。</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
