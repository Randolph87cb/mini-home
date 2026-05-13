export function LetterOverlay({ manifest, open, onClose }) {
  if (!open || !manifest) {
    return null;
  }

  const letterOpenState = manifest.states.find((item) => item.id === "letter-open");

  return (
    <div className="letter-overlay" aria-hidden="false">
      <div className="letter-panel">
        <button className="overlay-close" type="button" onClick={onClose}>
          收起信件
        </button>
        <img src={letterOpenState?.src} alt="展开的信件" />
        <div className="letter-copy">
          <p className="letter-kicker">信件板</p>
          <h2>留给你慢慢看的话</h2>
          <p>
            今天也想把一些没那么适合一句话说完的心情，安静地放在这里。以后你回来看到这封信，就像回到这个客厅一样。
          </p>
        </div>
      </div>
    </div>
  );
}
