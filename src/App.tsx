import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import EditorAdapter from './EditorAdapter';
import { commissions, decodeImage, makeStarter, normalizeUpload, type Direction } from './art';
import { blobToDataUrl, dataUrlToBlob, readArtwork, writeArtwork } from './storage';
import { renderCover, renderStage, type Paint, type Scene } from './render';
import type { ImageEditorInstance } from '@unlayer/react-image-editor';

type Screen = 'welcome' | 'garage' | 'editor' | 'reveal' | 'cover';
type Session = { key: number; image: string };
const STARTER_NAME = 'SUNSET COURIER';

function Stage({ artSrc, paint, scene, shutter = 1, lights = false, className = '' }: { artSrc: string | null; paint: Paint; scene: Scene; shutter?: number; lights?: boolean; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let active = true;
    const draw = async () => {
      let art: HTMLImageElement | null = null;
      if (artSrc) { try { art = await decodeImage(artSrc); } catch { /* preview retains the body if decode fails */ } }
      if (active && ref.current) renderStage(ref.current.getContext('2d')!, { art, paint, scene, shutter, lights });
    };
    void draw();
    return () => { active = false; };
  }, [artSrc, paint, scene, shutter, lights]);
  return <canvas ref={ref} className={`stage ${className}`} width={1200} height={650} aria-label={`${paint} custom coupe in the ${scene}, with ${artSrc ? 'panel artwork' : 'plain panels'}`} role="img" />;
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

function safeName(name: string) { return (name.trim() || 'UNTITLED BUILD').replace(/[^a-z0-9-]+/gi, '-').replace(/^-|-$/g, '').slice(0, 40).toLowerCase(); }

export default function App() {
  const [screen, setScreen] = useState<Screen>('welcome');
  const [direction, setDirection] = useState<Direction>('sunset');
  const [freshSeed, setFreshSeed] = useState(false);
  const [applied, setApplied] = useState<string | null>(null);
  const [paint, setPaint] = useState<Paint>('graphite');
  const [buildName, setBuildName] = useState(STARTER_NAME);
  const [before, setBefore] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [editorReady, setEditorReady] = useState(false);
  const [error, setError] = useState('');
  const [persisted, setPersisted] = useState(true);
  const [busy, setBusy] = useState(false);
  const [scene, setScene] = useState<Scene>('garage');
  const [shutter, setShutter] = useState(1);
  const [lights, setLights] = useState(false);
  const [revealLabel, setRevealLabel] = useState('');
  const sessionId = useRef(0);
  const saveId = useRef(0);
  const persistence = useRef(Promise.resolve());
  const revealTimers = useRef<number[]>([]);
  const editorInstance = useRef<ImageEditorInstance | null>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const starter = useMemo(() => makeStarter(direction), [direction]);

  useEffect(() => {
    let alive = true;
    try {
      const settings = JSON.parse(localStorage.getItem('vicechrome-settings') || '{}') as { paint?: Paint; buildName?: string; direction?: Direction };
      if (settings.paint && ['graphite', 'ivory', 'coral'].includes(settings.paint)) setPaint(settings.paint);
      if (settings.buildName) setBuildName(settings.buildName.slice(0, 28));
      if (settings.direction && commissions.some(c => c.id === settings.direction)) setDirection(settings.direction);
    } catch { /* browsing continues without settings */ }
    readArtwork().then(async blob => { if (blob && alive && saveId.current === 0) { const url = await blobToDataUrl(blob); if (alive && saveId.current === 0) setApplied(url); } }).catch(() => { if (alive) setPersisted(false); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    try { localStorage.setItem('vicechrome-settings', JSON.stringify({ paint, buildName, direction })); }
    catch { /* settings remain available in this session */ }
  }, [paint, buildName, direction]);

  const closeEditor = useCallback(() => {
    if (editorInstance.current?.hasChanges() && !window.confirm('Leave the editor? Unsaved changes will be discarded.')) return;
    editorInstance.current = null;
    setSession(null); setScreen('garage'); setError('');
  }, []);

  useEffect(() => {
    if (screen !== 'editor') return;
    const guard = (event: BeforeUnloadEvent) => { if (editorInstance.current?.hasChanges()) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, [screen]);

  function openEditor(source?: string) {
    editorInstance.current = null;
    setEditorReady(false);
    setError(''); setSession({ key: ++sessionId.current, image: source || (freshSeed || !applied ? starter : applied) });
    setFreshSeed(false); setScreen('editor');
  }

  async function acceptSave(result: { dataUrl: string; blob: Blob }) {
    const id = ++saveId.current;
    try {
      const image = await decodeImage(result.dataUrl);
      if (image.naturalWidth < 64 || image.naturalHeight < 64 || image.naturalWidth > 6000 || image.naturalHeight > 6000) throw new Error('Saved artwork dimensions are outside the supported range.');
      if (id !== saveId.current) return;
      const blob = result.blob?.size ? result.blob : dataUrlToBlob(result.dataUrl);
      setApplied(result.dataUrl); setBefore(false); setSession(null); setScreen('garage'); setError(''); setPersisted(true);
      persistence.current = persistence.current.catch(() => {}).then(async () => {
        if (id !== saveId.current) return;
        try { await writeArtwork(blob); } catch { if (id === saveId.current) setPersisted(false); }
      });
    } catch (e) { if (id === saveId.current) setError(e instanceof Error ? e.message : 'Could not apply this image.'); }
  }

  async function upload(file?: File) {
    if (!file) return;
    try { setBusy(true); setError(''); const source = await normalizeUpload(file); openEditor(source); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not open this file.'); }
    finally { setBusy(false); if (uploadRef.current) uploadRef.current.value = ''; }
  }

  function stopReveal() { revealTimers.current.forEach(window.clearTimeout); revealTimers.current = []; }
  function finishReveal() { stopReveal(); setScene('boulevard'); setShutter(1); setLights(true); setScreen('cover'); }
  function rollOut() {
    if (!applied) return;
    stopReveal(); setScreen('reveal'); setScene('garage'); setShutter(0); setLights(false); setRevealLabel('THE SHUTTER RISES');
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { finishReveal(); return; }
    revealTimers.current = [
      window.setTimeout(() => { setShutter(1); setRevealLabel('LIGHT FINDS THE LINE'); }, 400),
      window.setTimeout(() => { setLights(true); setRevealLabel('SOLERA BAY IS WAITING'); }, 2600),
      window.setTimeout(() => { setScene('boulevard'); setRevealLabel('ONE OF ONE'); }, 4200),
      window.setTimeout(finishReveal, 6800),
    ];
  }

  async function saveCover() {
    if (!applied) return;
    try {
      setBusy(true); setError('');
      await document.fonts.ready;
      const art = await decodeImage(applied);
      const canvas = document.createElement('canvas');
      renderCover(canvas.getContext('2d')!, { art, paint, scene: 'boulevard' }, buildName);
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error('PNG export failed.')), 'image/png'));
      download(blob, `vicechrome-${safeName(buildName)}-cover.png`);
    } catch (e) { setError(e instanceof Error ? e.message : 'Cover export failed.'); }
    finally { setBusy(false); }
  }

  function saveFlat() { if (applied) download(dataUrlToBlob(applied), `vicechrome-${safeName(buildName)}-panel-art.png`); }
  function saveFromEditor() {
    const dataUrl = editorInstance.current?.getImage();
    if (!dataUrl) { setError('The editor is still loading. Please try again.'); return; }
    void acceptSave({ dataUrl, blob: dataUrlToBlob(dataUrl) });
  }
  function goHome() {
    if (screen === 'editor' && editorInstance.current?.hasChanges() && !window.confirm('Leave the editor? Unsaved changes will be discarded.')) return;
    if (screen === 'reveal') stopReveal();
    editorInstance.current = null; setSession(null); setScreen('welcome');
  }
  const shownArt = before ? null : applied || starter;

  return <div className="app">
    <header className="topbar"><button className="wordmark" onClick={goHome} aria-label="Vicechrome home"><span className="mark">V/C</span> VICECHROME</button><span className="top-center">SOLERA BAY <span className="dot">●</span> CUSTOM CAR STUDIO</span><span className="top-right">EST. 2026 <span className="top-line" /></span></header>

    {screen === 'welcome' && <main className="welcome"><div className="welcome-copy"><p className="eyebrow"><span className="signal" /> THE CITY IS YOUR CANVAS / ISSUE 001</p><h1>MAKE IT<br/><em>YOURS.</em><br/>THEN MAKE<br/>AN ENTRANCE.</h1><p className="intro">One coupe. Your signature. A whole city to see it. Design the panel art, roll out of the garage, and take home the cover.</p><button className="primary" onClick={() => setScreen('garage')}>ENTER THE GARAGE <span>↗</span></button><div className="welcome-meta"><span>01 / DESIGN</span><span>02 / REVEAL</span><span>03 / COLLECT</span></div></div><div className="hero-visual"><Stage artSrc={makeStarter('sunset')} paint="graphite" scene="boulevard" lights/><div className="hero-caption"><span>FEATURE BUILD</span><strong>Sunset Courier</strong><span>01 / 03</span></div></div></main>}

    {screen === 'garage' && <main className="garage"><div className="section-top"><div><p className="eyebrow">THE WORKSHOP / BAY 01</p><h2>YOUR RIDE.<br/><em>YOUR MARK.</em></h2></div><p className="section-note">Create panel art in the Unlayer Image Editor. Save it, see those same pixels on the car, then take your build to the boulevard.</p></div><div className="garage-grid"><section className="garage-stage"><div className="stage-bar"><span className="stage-label"><span className="signal" /> {applied ? 'ARTWORK APPLIED' : 'FEATURE PREVIEW'}</span><button className="text-button" disabled={!applied} onClick={() => setBefore(!before)}>{before ? 'SHOW AFTER' : 'BEFORE / AFTER'} ↔</button></div><Stage artSrc={shownArt} paint={paint} scene="garage" lights/><div className="stage-footer"><span>VC-01 / COASTAL COUPE</span><span>{applied ? 'REVISION SAVED TO PANEL' : 'SELECT A DIRECTION TO BEGIN'}</span></div></section><aside className="controls"><div className="control-block"><div className="control-heading"><span>01</span><h3>CHOOSE A DIRECTION</h3></div><div className="commissions">{commissions.map(c => <button key={c.id} className={`commission ${direction === c.id ? 'selected' : ''}`} onClick={() => { setDirection(c.id); setFreshSeed(true); }} aria-pressed={direction === c.id}><span className={`swatch ${c.id}`} /><span><strong>{c.title}</strong><small>{c.brief}</small></span><span className="commission-arrow">↗</span></button>)}</div></div><div className="control-block compact"><div className="control-heading"><span>02</span><h3>SET THE TONE</h3></div><label className="field-label" htmlFor="buildName">BUILD NAME</label><input id="buildName" value={buildName} maxLength={28} onChange={e => setBuildName(e.target.value)} placeholder="Name your build"/><div className="paint-row"><span>BODY FINISH</span><div>{(['graphite', 'ivory', 'coral'] as Paint[]).map(p => <button key={p} title={p} aria-label={`${p} body finish`} aria-pressed={paint === p} onClick={() => setPaint(p)} className={`paint-dot ${p} ${paint === p ? 'active' : ''}`} />)}</div></div></div><button className="primary wide" onClick={() => openEditor()}>{applied && !freshSeed ? 'EDIT APPLIED ART' : 'DESIGN YOUR PANEL ART'} <span>↗</span></button><button className="secondary wide" disabled={!applied} onClick={rollOut}>ROLL OUT <span>→</span></button><div className="upload-line"><button onClick={() => uploadRef.current?.click()} disabled={busy}>IMPORT A PNG, JPEG OR WEBP</button><input ref={uploadRef} hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={e => void upload(e.target.files?.[0])}/><span>MAX 8 MB</span></div>{!persisted && <p className="notice">Browser storage is unavailable. You can still edit and download; your build may not survive a reload.</p>}{error && <p className="error" role="alert">{error}</p>}</aside></div></main>}

    {screen === 'editor' && session && <main className="editor-screen"><div className="editor-header"><div><p className="eyebrow">VICECHROME / WORKSHOP TOOL</p><h2>DESIGN YOUR <em>PANEL ART.</em></h2></div><button className="editor-back" onClick={closeEditor}>← BACK TO GARAGE</button></div><div className="editor-note"><span className="signal" /> Edit with Unlayer, then save to apply the flattened image. Reopening a saved design treats existing text and stickers as pixels.</div><div className="mobile-editor-actions"><button onClick={closeEditor}>CANCEL</button><button onClick={saveFromEditor} disabled={!editorReady}>SAVE ARTWORK ✓</button></div>{error && <div className="editor-error" role="alert">{error} <button onClick={() => { setEditorReady(false); setSession({ ...session, key: ++sessionId.current }); setError(''); }}>RETRY EDITOR</button></div>}<div className="editor-frame" key={session.key}><EditorAdapter image={session.image} onLoaded={editor => { editorInstance.current = editor; setEditorReady(true); }} onSave={result => void acceptSave(result)} onCancel={closeEditor} onFailure={setError}/></div></main>}

    {screen === 'reveal' && <main className="reveal"><div className="reveal-top"><span className="eyebrow">THE GARAGE OPENS / 001</span><button className="text-button" onClick={finishReveal}>SKIP REVEAL →</button></div><Stage artSrc={applied} paint={paint} scene={scene} shutter={shutter} lights={lights} className="reveal-stage"/><div className="reveal-title"><p>{revealLabel}</p><h2>{buildName || 'UNTITLED BUILD'}</h2></div></main>}

    {screen === 'cover' && <main className="cover-screen"><div className="cover-heading"><div><p className="eyebrow">SOLERA BAY / THE BOULEVARD</p><h2>ONE OF <em>ONE.</em></h2><p>The cover is yours. The panel carries the exact image saved from your editor session.</p></div><div className="cover-actions"><button className="primary" onClick={() => void saveCover()} disabled={busy}>{busy ? 'RENDERING…' : 'SAVE COVER'} <span>↓</span></button><button className="secondary" onClick={saveFlat}>SAVE FLAT ART <span>↓</span></button><button className="text-button" onClick={() => openEditor(applied || starter)}>EDIT AGAIN ↗</button><button className="text-button" onClick={rollOut}>REPLAY REVEAL ↻</button></div></div><div className="cover-preview"><Stage artSrc={applied} paint={paint} scene="boulevard" lights/><div><span>VICECHROME / 001</span><strong>{buildName || 'UNTITLED BUILD'}</strong><small>DESIGN THE WRAP. OWN THE BOULEVARD.</small></div></div>{error && <p className="error" role="alert">{error}</p>}<button className="return-link" onClick={() => setScreen('garage')}>← RETURN TO GARAGE</button></main>}

    <footer><span>VICECHROME © 2026</span><span>AN ORIGINAL FAN CONCEPT SET IN FICTIONAL SOLERA BAY</span><span>DESIGN THE WRAP. OWN THE BOULEVARD.</span></footer>
  </div>;
}
