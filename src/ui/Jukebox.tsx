// Le jukebox : la liste de tes liens YouTube (dans le meuble du bureau), et le petit lecteur qui s'affiche en bas à
// gauche du bureau tant que la musique joue (lecture, pause, suivant, en boucle).
import { useCallback, useState } from 'react';
import { jukebox } from '../audio/music.ts';
import { sfx } from '../audio/sfx.ts';
import { useOffice } from '../state/store.ts';
import { party } from './interact.ts';
import { Shell } from './Rooms.tsx';

const REPEAT_LABEL = { off: 'Sans boucle', all: 'En boucle : la liste', one: 'En boucle : ce morceau' } as const;
const REPEAT_ICON = { off: '➡️', all: '🔁', one: '🔂' } as const;

function Controls({ small }: { small?: boolean }) {
  const m = useOffice((s) => s.music);
  return (
    <div className={`jk-controls ${small ? 'small' : ''}`}>
      <button title="Morceau précédent" onClick={() => jukebox.prev()} disabled={!m.list.length}>⏮</button>
      <button className="jk-play" title={m.playing ? 'Pause (J)' : 'Lecture (J)'} onClick={() => jukebox.toggle()} disabled={!m.list.length}>{m.playing ? '⏸' : '▶'}</button>
      <button title="Morceau suivant" onClick={() => jukebox.next()} disabled={!m.list.length}>⏭</button>
      <button className={m.repeat !== 'off' ? 'on' : ''} title={REPEAT_LABEL[m.repeat]} onClick={() => jukebox.cycleRepeat()}>{REPEAT_ICON[m.repeat]}</button>
      <button className={m.shuffle ? 'on' : ''} title={m.shuffle ? 'Lecture aléatoire : oui' : 'Lecture aléatoire : non'} onClick={() => jukebox.toggleShuffle()}>🔀</button>
      {!small && (
        <label className="jk-volume" title="Le volume">
          🔈<input type="range" min={0} max={100} value={Math.round(m.volume * 100)} onChange={(e) => jukebox.setVolume(Number(e.target.value) / 100)} />
        </label>
      )}
    </div>
  );
}

export function JukeboxRoom() {
  const m = useOffice((s) => s.music);
  const [link, setLink] = useState('');
  const [err, setErr] = useState('');
  const add = () => {
    const e = jukebox.add(link);
    if (e) { setErr(e); sfx('no'); return; }
    setLink('');
    setErr('');
    sfx('check');
    // le premier morceau ajouté démarre tout de suite
    if (!m.list.length) jukebox.play(0);
  };
  return (
    <Shell title="Le jukebox" sub={m.list.length ? `${m.list.length} morceau${m.list.length > 1 ? 'x' : ''} · ${REPEAT_LABEL[m.repeat].toLowerCase()}` : 'Colle tes liens YouTube'}>
      <form className="drawer-add" onSubmit={(e) => { e.preventDefault(); add(); }}>
        <input id="yt-link" className="text" placeholder="Un lien YouTube (https://www.youtube.com/watch?v=…)" value={link} onChange={(e) => { setLink(e.target.value); setErr(''); }} />
        <button className="btn small primary" type="submit" disabled={!link.trim()}>Ajouter</button>
      </form>
      {err && <small className="err-text">{err}</small>}
      {m.error && <small className="err-text">{m.error}</small>}
      <Controls />
      {m.list.length > 0 ? (
        <ol className="jk-list">
          {m.list.map((t, i) => (
            <li key={t.id} className={i === m.index && m.loaded ? 'on' : ''}>
              <button className="jk-track" onClick={() => { sfx('click'); jukebox.play(i); }} title="Écouter">
                <span className="jk-num">{i === m.index && m.playing ? '♪' : i + 1}</span>
                <span className="jk-title">{t.title}</span>
              </button>
              <button className="jk-del" title="Retirer de la liste" onClick={() => jukebox.remove(i)}>×</button>
            </li>
          ))}
        </ol>
      ) : <p className="muted small">La liste est vide. Copie l’adresse d’une vidéo ou d’une musique sur YouTube, colle-la ici, puis clique sur « Ajouter ».</p>}
      <p className="small muted">La vidéo s’affiche en petit en bas à gauche du bureau. Elle vient de youtube-nocookie.com (sans cookie publicitaire). Ta liste reste dans ce navigateur. Raccourci : <kbd>J</kbd> pour lecture ou pause.</p>
      <div className="row">
        <button className="btn small" onClick={() => { useOffice.setState({ modal: null }); party(); }}>🪩 Mode soirée</button>
        {m.loaded && <button className="btn small ghost" onClick={() => jukebox.stop()}>Éteindre le jukebox</button>}
      </div>
    </Shell>
  );
}

/** Le petit robot du jukebox, en bas à gauche du bureau : il vole tant que la musique joue, des notes sortent de sa
 *  tête, et un clic ouvre le jukebox. La vidéo YouTube reste cachée sous lui (c'est elle qui joue le son). */
export function MusicDock() {
  const loaded = useOffice((s) => s.music.loaded);
  const playing = useOffice((s) => s.music.playing);
  const title = useOffice((s) => s.music.list[s.music.index]?.title ?? '');
  const filming = useOffice((s) => s.filming);
  const host = useCallback((el: HTMLDivElement | null) => jukebox.attach(el), []);
  return (
    <div className={`music-dock ${loaded ? 'shown' : ''} ${playing ? 'playing' : ''} ${filming ? 'filming' : ''}`} aria-hidden={!loaded}>
      <button className="dock-bot" title={`♪ ${title} · ouvrir le jukebox`} onClick={() => { sfx('open'); useOffice.setState({ modal: { kind: 'jukebox' } }); }}>
        <span className="bot-notes" aria-hidden><i>♪</i><i>♫</i><i>♪</i></span>
        <svg viewBox="0 0 16 16" width="56" height="56" shapeRendering="crispEdges" aria-hidden>
          <rect x="7" y="0" width="2" height="2" fill="#ff8a3d" />
          <rect x="3" y="2" width="10" height="7" fill="#d9d4e8" />
          <rect x="4" y="3" width="8" height="5" fill="#1c1826" />
          <rect x="5" y="4" width="2" height="2" fill="#3ddc97" />
          <rect x="9" y="4" width="2" height="2" fill="#3ddc97" />
          <rect x="6" y="7" width="4" height="1" fill="#ff5fa2" />
          <rect x="5" y="9" width="6" height="4" fill="#b8b2cc" />
          <rect x="2" y="10" width="2" height="2" fill="#d9d4e8" />
          <rect x="12" y="10" width="2" height="2" fill="#d9d4e8" />
          <rect x="6" y="13" width="4" height="1" fill="#ff8a3d" />
          <rect className="bot-flame" x="7" y="14" width="2" height="2" fill="#ffd23d" />
        </svg>
      </button>
      <div className="dock-screen" ref={host} />
    </div>
  );
}
