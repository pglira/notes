import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Icon, type IconName } from './icons';
import { addImage, deleteImage, useImageUrl } from './images';
import {
  type Note,
  createNote,
  isEmpty,
  loadNotes,
  putNote,
  saveNotes,
  visibleNotes,
} from './notes';
import { shareNote } from './share';
import { type Theme, useTheme } from './theme';

const THEME_ICONS: Record<Theme, IconName> = { auto: 'auto', light: 'sun', dark: 'moon' };
const THEME_LABELS: Record<Theme, string> = {
  auto: 'Theme: system',
  light: 'Theme: light',
  dark: 'Theme: dark',
};

// The number of cells for thumbnails of a note in the list. When a note has
// more images, the last cell shows the number of the other images.
const THUMBNAILS = 4;
const thumbCount = (note: Note) =>
  note.images.length > THUMBNAILS ? THUMBNAILS - 1 : note.images.length;
const TOAST_MS = 2500;

const formatDate = (at: number) =>
  new Date(at).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });

export default function App() {
  const [notes, setNotes] = useState<Note[]>(loadNotes);
  const [archive, setArchive] = useState(false);
  // The id of the note in the editor, or null for the list.
  const [openId, setOpenId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [theme, nextTheme] = useTheme();

  useEffect(() => saveNotes(notes), [notes]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), TOAST_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  // The editor has its own history entry, so that the back gesture of the
  // system closes the editor. A note that is empty when the editor closes is
  // removed.
  useEffect(() => {
    const onPop = () => setOpenId(null);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    if (openId !== null) return;
    setNotes((ns) => (ns.some(isEmpty) ? ns.filter((n) => !isEmpty(n)) : ns));
  }, [openId]);

  const open = (id: string) => {
    history.pushState({ note: id }, '');
    setOpenId(id);
  };
  const close = () => history.back();

  const add = () => {
    const note = createNote(Date.now());
    setNotes((ns) => [...ns, note]);
    setArchive(false);
    open(note.id);
  };

  const openNote = notes.find((n) => n.id === openId);
  const shown = visibleNotes(notes, archive);
  const archivedCount = notes.filter((n) => n.archived).length;

  return (
    <>
      <main hidden={openNote !== undefined}>
        <header>
          <h1>Notes</h1>
          <div className="header-buttons">
            <button
              className="icon"
              onClick={nextTheme}
              aria-label={THEME_LABELS[theme]}
              title={THEME_LABELS[theme]}
            >
              <Icon name={THEME_ICONS[theme]} />
            </button>
            <button className="add" onClick={add} aria-label="New note" title="New note">
              <Icon name="plus" size={24} />
            </button>
          </div>
        </header>

        <div className="tabs" role="tablist">
          <button role="tab" aria-selected={!archive} onClick={() => setArchive(false)}>
            Notes
          </button>
          <button role="tab" aria-selected={archive} onClick={() => setArchive(true)}>
            Archive{archivedCount > 0 && ` (${archivedCount})`}
          </button>
        </div>

        {shown.length === 0 && (
          <p className="empty">
            {archive ? 'The archive is empty.' : 'No notes. Tap + to add a note.'}
          </p>
        )}

        <ul className="notes">
          {shown.map((note) => (
            <li key={note.id}>
              <button className="card" onClick={() => open(note.id)}>
                {note.text.trim() && <span className="preview">{note.text.trim()}</span>}
                {note.images.length > 0 && (
                  <span className="thumbs">
                    {note.images.slice(0, thumbCount(note)).map((id) => (
                      <Thumbnail key={id} id={id} />
                    ))}
                    {note.images.length > THUMBNAILS && (
                      <span className="more">+{note.images.length - thumbCount(note)}</span>
                    )}
                  </span>
                )}
                <span className="date">{formatDate(note.updatedAt)}</span>
              </button>
            </li>
          ))}
        </ul>
      </main>

      {openNote && (
        <Editor
          key={openNote.id}
          note={openNote}
          onChange={(fields) =>
            setNotes((ns) => {
              const current = ns.find((n) => n.id === openNote.id);
              if (!current) return ns;
              return putNote(ns, { ...current, ...fields(current), updatedAt: Date.now() });
            })
          }
          onClose={close}
          onDelete={() => {
            openNote.images.forEach((id) => deleteImage(id).catch(() => {}));
            setNotes((ns) => ns.filter((n) => n.id !== openNote.id));
            close();
          }}
          onToast={setToast}
        />
      )}

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </>
  );
}

function Thumbnail({ id }: { id: string }) {
  const url = useImageUrl(id);
  return <span className="thumb">{url && <img src={url} alt="" />}</span>;
}

interface EditorProps {
  note: Note;
  // Change fields of the note. The function gets the current note, so that
  // changes that finish later do not undo earlier changes.
  onChange: (fields: (note: Note) => Partial<Note>) => void;
  onClose: () => void;
  onDelete: () => void;
  onToast: (text: string) => void;
}

// The full-screen editor of a note: the text, the images below the text and
// the actions. Each change saves at once.
function Editor({ note, onChange, onClose, onDelete, onToast }: EditorProps) {
  const text = useRef<HTMLTextAreaElement>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  // The image in the full view, or null.
  const [viewing, setViewing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // The text field grows with its text, so that the page scrolls as a whole.
  useLayoutEffect(() => {
    const el = text.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [note.text]);

  // Focus the text of a new note when the editor opens.
  const isNew = useRef(isEmpty(note));
  useEffect(() => {
    if (isNew.current) text.current?.focus();
  }, []);

  useEffect(() => {
    if (!confirmDelete) return;
    const timer = setTimeout(() => setConfirmDelete(false), 3000);
    return () => clearTimeout(timer);
  }, [confirmDelete]);

  const addImages = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    try {
      const ids = await Promise.all([...files].map(addImage));
      onChange((n) => ({ images: [...n.images, ...ids] }));
    } catch {
      onToast('The image could not be added.');
    } finally {
      setBusy(false);
    }
  };

  const share = async () => {
    const result = await shareNote(note);
    if (result === 'copied') onToast('The text is copied to the clipboard.');
    else if (result === 'insecure') onToast('Sharing needs a page that loads over HTTPS.');
    else if (result === 'failed') onToast('Sharing is not possible.');
  };

  return (
    <div className="editor">
      <div className="editor-bar">
        <button className="bar-button" onClick={onClose} aria-label="Back to the list" title="Back">
          <Icon name="back" size={24} />
          Notes
        </button>
        <div className="header-buttons">
          <button
            className="icon"
            onClick={share}
            disabled={isEmpty(note)}
            aria-label="Share"
            title="Share"
          >
            <Icon name="share" />
          </button>
          <button
            className="icon"
            onClick={() => {
              onChange((n) => ({ archived: !n.archived }));
              onToast(note.archived ? 'The note is back in the notes.' : 'The note is in the archive.');
              onClose();
            }}
            disabled={isEmpty(note)}
            aria-label={note.archived ? 'Restore from the archive' : 'Archive'}
            title={note.archived ? 'Restore' : 'Archive'}
          >
            <Icon name={note.archived ? 'unarchive' : 'archive'} />
          </button>
          <button
            className={confirmDelete ? 'icon danger armed' : 'icon danger'}
            onClick={() => (confirmDelete ? onDelete() : setConfirmDelete(true))}
            aria-label={confirmDelete ? 'Tap again to delete' : 'Delete'}
            title={confirmDelete ? 'Tap again to delete' : 'Delete'}
          >
            <Icon name={confirmDelete ? 'check' : 'trash'} />
          </button>
        </div>
      </div>

      {confirmDelete && <p className="confirm">Tap again to delete the note.</p>}

      <textarea
        ref={text}
        value={note.text}
        onChange={(e) => {
          const value = e.target.value;
          onChange(() => ({ text: value }));
        }}
        placeholder="Note"
        aria-label="Text of the note"
      />

      {note.images.length > 0 && (
        <div className="images">
          {note.images.map((id) => (
            <button key={id} className="image" onClick={() => setViewing(id)} aria-label="Show image">
              <Thumbnail id={id} />
            </button>
          ))}
        </div>
      )}

      <label className={busy ? 'add-image busy' : 'add-image'}>
        <Icon name="image" />
        {busy ? 'Adding…' : 'Add images'}
        <input
          type="file"
          accept="image/*"
          multiple
          disabled={busy}
          onChange={(e) => {
            addImages(e.target.files);
            e.target.value = '';
          }}
        />
      </label>

      {viewing && (
        <ImageViewer
          id={viewing}
          onClose={() => setViewing(null)}
          onRemove={() => {
            onChange((n) => ({ images: n.images.filter((i) => i !== viewing) }));
            deleteImage(viewing).catch(() => {});
            setViewing(null);
          }}
        />
      )}
    </div>
  );
}

// An image of a note at full size. "Remove" asks for a second tap.
function ImageViewer({ id, onClose, onRemove }: { id: string; onClose: () => void; onRemove: () => void }) {
  const url = useImageUrl(id);
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="viewer" onClick={onClose}>
      {url && <img src={url} alt="" />}
      <div className="viewer-buttons" onClick={(e) => e.stopPropagation()}>
        <button className={confirm ? 'armed' : undefined} onClick={() => (confirm ? onRemove() : setConfirm(true))}>
          <Icon name="trash" size={18} />
          {confirm ? 'Tap to remove' : 'Remove'}
        </button>
        <button onClick={onClose}>
          <Icon name="close" size={18} />
          Close
        </button>
      </div>
    </div>
  );
}
