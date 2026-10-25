// Le tiroir de l'analyste : les références qu'il garde sous la main pour chaque mission.
//   - les couleurs (la charte) ;
//   - les types de texte (typographies, ton, formats attendus) ;
//   - les informations à retenir pour la suite (ajoutées par toi, ou par l'analyste lui-même).
// Tout reste dans ce navigateur.
import { create } from 'zustand';
import { lsGet, lsSet } from './db.ts';

export interface ColorRef { id: string; name: string; hex: string }
export interface TextRef { id: string; label: string; value: string }
export interface NoteRef { id: string; text: string; at: number; by: 'toi' | 'analyste'; mission?: string }

export interface DrawerData { colors: ColorRef[]; texts: TextRef[]; notes: NoteRef[] }

const EMPTY: DrawerData = { colors: [], texts: [], notes: [] };
const MAX_NOTES = 60;
const uid = () => Math.random().toString(36).slice(2, 9);

interface DrawerStore extends DrawerData {
  addColor: (name: string, hex: string) => void;
  addText: (label: string, value: string) => void;
  addNote: (text: string, by: NoteRef['by'], mission?: string) => void;
  update: <K extends keyof DrawerData>(kind: K, id: string, patch: Partial<DrawerData[K][number]>) => void;
  remove: (kind: keyof DrawerData, id: string) => void;
  replaceAll: (d: DrawerData) => void;
}

const save = (d: DrawerData) => lsSet('drawer', { colors: d.colors, texts: d.texts, notes: d.notes });
const initial = (() => {
  const d = lsGet<Partial<DrawerData>>('drawer', EMPTY);
  return { colors: Array.isArray(d.colors) ? d.colors : [], texts: Array.isArray(d.texts) ? d.texts : [], notes: Array.isArray(d.notes) ? d.notes : [] };
})();

export const useDrawer = create<DrawerStore>((set, get) => {
  const commit = (patch: Partial<DrawerData>) => { set(patch); save(get()); };
  return {
    ...initial,
    addColor: (name, hex) => commit({ colors: [...get().colors, { id: uid(), name: name.trim() || 'Couleur', hex }] }),
    addText: (label, value) => commit({ texts: [...get().texts, { id: uid(), label: label.trim() || 'Texte', value: value.trim() }] }),
    addNote: (text, by, mission) => {
      const t = text.trim().slice(0, 600);
      if (!t || get().notes.some((n) => n.text.toLowerCase() === t.toLowerCase())) return;
      commit({ notes: [...get().notes, { id: uid(), text: t, at: Date.now(), by, mission }].slice(-MAX_NOTES) });
    },
    update: (kind, id, patch) => commit({ [kind]: (get()[kind] as { id: string }[]).map((x) => (x.id === id ? { ...x, ...patch } : x)) } as Partial<DrawerData>),
    remove: (kind, id) => commit({ [kind]: (get()[kind] as { id: string }[]).filter((x) => x.id !== id) } as Partial<DrawerData>),
    replaceAll: (d) => commit({ colors: d.colors ?? [], texts: d.texts ?? [], notes: d.notes ?? [] }),
  };
});

/** Le tiroir, tel que l'équipe le lit dans ses consignes. */
export function drawerPrompt(d: DrawerData = useDrawer.getState()): string {
  if (!d.colors.length && !d.texts.length && !d.notes.length) return '';
  const out = ['## Le tiroir de l’analyste (références à respecter)'];
  if (d.colors.length) out.push('Couleurs de la charte :', ...d.colors.map((c) => `- ${c.name} : ${c.hex}`));
  if (d.texts.length) out.push('Types de texte (typographies, ton, formats) :', ...d.texts.map((t) => `- ${t.label} : ${t.value}`));
  if (d.notes.length) out.push('Informations à retenir :', ...d.notes.map((n) => `- ${n.text}`));
  return out.join('\n');
}
