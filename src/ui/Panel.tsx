// Le panneau de droite : le plan de Lilou, l'équipe au travail (ce que chacun fait, son rapport),
// les rendus (les fichiers produits) et le fil de ce qui se passe. Sans mission : comment ça marche.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { ROLES } from '../../shared/activity.ts';
import type { Role } from '../../shared/protocol.ts';
import { sfx } from '../audio/sfx.ts';
import { robotSprite } from '../engine/robots.ts';
import { savePref, teamList, useOffice, type AgentView } from '../state/store.ts';
import { fmtDate, fmtDuration } from './format.ts';
import { mdToHtml } from './md.ts';
import { FileActions } from './Rooms.tsx';
import { tidy } from './tidy.ts';

export function Avatar({ role, size = 32 }: { role: Role; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const g = ref.current!.getContext('2d')!;
    g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, 20, 24);
    g.drawImage(robotSprite(role, 'stand', 'down', 0, 'open'), 0, 0);
  }, [role]);
  return <canvas ref={ref} width={20} height={24} className="avatar" style={{ width: size * (20 / 24), height: size }} />;
}

const STATUS: Record<AgentView['status'], string> = { working: 'Au travail', reporting: 'Rend son rapport', done: 'A rendu son travail', failed: 'N’a pas pu finir' };

export function Panel() {
  const mission = useOffice((s) => s.mission);
  const open = useOffice((s) => s.panelOpen);
  return (
    <aside className={`panel ${open ? '' : 'closed'}`} aria-hidden={!open}>
      <div className="panel-inner">
        {mission ? (
          <>
            <PlanSection />
            <TeamSection />
            <FilesSection />
            <FeedSection />
          </>
        ) : <Welcome />}
      </div>
    </aside>
  );
}

/** La languette qui replie ou rouvre le panneau de droite (raccourci : P). */
export function PanelToggle() {
  const open = useOffice((s) => s.panelOpen);
  return (
    <button className={`panel-toggle ${open ? 'open' : ''}`} title={open ? 'Replier le panneau (P)' : 'Ouvrir le panneau : le plan, l’équipe, les rendus (P)'} aria-label={open ? 'Replier le panneau' : 'Ouvrir le panneau'} onClick={() => togglePanel()}>
      <span aria-hidden="true">{open ? '›' : '‹'}</span>
    </button>
  );
}

export function togglePanel() {
  const v = !useOffice.getState().panelOpen;
  sfx('click');
  useOffice.setState({ panelOpen: v });
  savePref('panelOpen', v);
}

function Welcome() {
  const missions = useOffice((s) => s.missions);
  const send = useOffice((s) => s.send);
  const connection = useOffice((s) => s.connection);
  return (
    <>
      <section className="card hint-card">
        <p className="small">📝 <b>Comment ça marche ?</b> Clique sur la note jaune posée à côté du bureau de Lilou. Les idées de mission sont en bas, dans le chat.</p>
      </section>
      {connection === 'live' && (
        <section className="card">
          <h3>Ton équipe</h3>
          <div className="row">
            <button className="btn small" onClick={() => send({ t: 'open_root', rules: true })}>📜 Le règlement</button>
            <button className="btn small" onClick={() => send({ t: 'open_root' })}>🗄️ Le tiroir</button>
            <button className="btn small" onClick={() => { sfx('open'); useOffice.setState({ modal: { kind: 'skills' } }); }}>🎓 Les skills</button>
          </div>
          <p className="small muted">Le règlement, c’est ce que l’équipe doit savoir sur toi : Lilou le lit avant chaque mission. Le tiroir garde tes couleurs, tes types de texte et ce qu’il faut retenir.</p>
        </section>
      )}
      {missions.length > 0 && (
        <section className="card">
          <h3>Dernières missions</h3>
          {missions.slice(0, 4).map((m) => (
            <div key={m.id} className="mini-mission">
              <div><b>{m.title}</b><span className="small muted">{fmtDate(m.createdAt)} · {fmtDuration(m.workMs)} · {m.files.length} rendu{m.files.length > 1 ? 's' : ''}</span></div>
              <div className="row">
                <button className="btn small" onClick={() => { sfx('click'); send({ t: 'replay', missionId: m.id }); }}>Rejouer</button>
                <button className="btn small ghost" onClick={() => send({ t: 'open', missionId: m.id })}>.zip</button>
              </div>
            </div>
          ))}
        </section>
      )}
    </>
  );
}

function PlanSection() {
  const plan = useOffice((s) => s.plan);
  if (!plan.length) return null;
  const done = plan.filter((p) => p.status === 'completed').length;
  return (
    <section className="card">
      <h3>Le plan <span className="count">{done}/{plan.length}</span></h3>
      <ul className="plan">
        {plan.map((p, i) => <li key={i} className={p.status}><i />{p.text}</li>)}
      </ul>
    </section>
  );
}

function TeamSection() {
  const team = useOffice(useShallow(teamList));
  const [open, setOpen] = useState<string | null>(null);
  if (!team.length) {
    return (
      <section className="card">
        <h3>L’équipe</h3>
        <p className="small muted">Lilou lit ta demande et prépare le travail…</p>
      </section>
    );
  }
  const active = team.filter((a) => a.status === 'working' || a.status === 'reporting').length;
  return (
    <section className="card">
      <h3>L’équipe <span className="count">{active ? `${active} au travail` : `${team.length} passé${team.length > 1 ? 's' : ''}`}</span></h3>
      <div className="team">
        {team.map((a) => <AgentCard key={a.id} a={a} open={open === a.id} onToggle={() => { sfx('open'); setOpen(null); useOffice.setState({ modal: { kind: 'agent', id: a.id } }); }} />)}
      </div>
    </section>
  );
}

function AgentCard({ a, open, onToggle }: { a: AgentView; open: boolean; onToggle: () => void }) {
  const role = ROLES[a.role];
  const working = a.status === 'working' || a.status === 'reporting';
  const report = useMemo(() => (open && a.report ? mdToHtml(a.report) : ''), [open, a.report]);
  return (
    <div className={`agent ${a.status} ${open ? 'open' : ''}`} style={{ ['--c' as string]: role.color }}>
      <button className="agent-head" onClick={onToggle}>
        <Avatar role={a.role} size={30} />
        <div className="agent-id">
          <b>{a.name} <span>{role.icon} {role.label}</span></b>
          <span className="agent-task">{a.task}</span>
          <span className="agent-now">{working ? (a.act?.label ?? 'S’installe à son bureau…') : `${STATUS[a.status]}${a.leftAt ? ` · ${fmtDuration(a.leftAt - a.hiredAt)}` : ''}`}</span>
        </div>
        <span className={`agent-status ${a.status}`} />
      </button>
      {open && (
        <div className="agent-more">
          <h4>Sa mission (écrite par Lilou)</h4>
          <p className="brief">{a.prompt}</p>
          {a.acts.length > 0 && (
            <>
              <h4>Ce qu’il a fait</h4>
              <ul className="acts">
                {a.acts.slice(-14).map((x) => <li key={x.id} title={x.detail}>{x.ok === false ? '⚠️ ' : ''}{x.label}</li>)}
              </ul>
            </>
          )}
          {report && (
            <>
              <h4>Son rapport</h4>
              <div className="md" dangerouslySetInnerHTML={{ __html: report }} />
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function FileList() {
  const files = useOffice((s) => s.files);
  const mission = useOffice((s) => s.mission);
  const send = useOffice((s) => s.send);
  const replaying = useOffice((s) => s.replaying);
  if (!mission) return null;
  return <FileActions files={files} missionId={mission.id} disabled={replaying} send={send} />;
}

function FilesSection() {
  const files = useOffice((s) => s.files.length);
  const mission = useOffice((s) => s.mission);
  const send = useOffice((s) => s.send);
  const replaying = useOffice((s) => s.replaying);
  return (
    <section className="card">
      <h3>Les rendus <span className="count">{files}</span></h3>
      {files ? <FileList /> : <p className="small muted">Les fichiers de l’équipe arriveront ici, à lire ou télécharger.</p>}
      {mission && !replaying && <button className="btn small ghost" onClick={() => send({ t: 'open', missionId: mission.id })}>Tout télécharger (.zip)</button>}
    </section>
  );
}

function FeedSection() {
  const feed = useOffice((s) => s.feed);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => { if (box.current) box.current.scrollTop = box.current.scrollHeight; }, [feed.length]);
  return (
    <section className="card">
      <h3>En direct</h3>
      <div className="feed" ref={box}>
        {feed.slice(-60).map((l) => (
          <div key={l.id} className={`feed-line ${l.kind}`}>
            <span className="feed-time">{new Date(l.at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
            <b>{l.who}</b> {tidy(l.kind === 'chef' || l.kind === 'user' ? l.text.slice(0, 220) : l.text)}
          </div>
        ))}
      </div>
    </section>
  );
}
