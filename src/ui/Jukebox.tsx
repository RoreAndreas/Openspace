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

/** Le petit lecteur, en bas à gauche du bureau (il reste là quand on ferme la fenêtre du jukebox). */
export function MusicDock() {
  const loaded = useOffice((s) => s.music.loaded);
  const title = useOffice((s) => s.music.list[s.music.index]?.title ?? '');
  const filming = useOffice((s) => s.filming);
  const [small, setSmall] = useState(false);
  const host = useCallback((el: HTMLDivElement | null) => jukebox.attach(el), []);
  return (
    <div className={`music-dock ${loaded ? 'shown' : ''} ${small ? 'small' : ''} ${filming ? 'filming' : ''}`} aria-hidden={!loaded}>
      <div className="dock-head">
        <span className="dock-title" title={title}>♪ {title}</span>
        <button title={small ? 'Agrandir' : 'Réduire'} onClick={() => setSmall(!small)}>{small ? '▢' : '–'}</button>
        <button title="La liste du jukebox" onClick={() => { sfx('open'); useOffice.setState({ modal: { kind: 'jukebox' } }); }}>☰</button>
        <button title="Éteindre le jukebox" onClick={() => jukebox.stop()}>×</button>
      </div>
      <div className="dock-screen" ref={host} />
      <Controls small />
    </div>
  );
}
