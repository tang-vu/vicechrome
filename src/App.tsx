import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import EditorAdapter from './EditorAdapter';
import { commissions, decodeImage, makeStarter, normalizeUpload, type Direction } from './art';
import { blobToDataUrl, dataUrlToBlob, readArtwork, writeArtwork } from './storage';
import { renderCover, renderStage, type Paint, type Scene } from './render';
import type { ImageEditorInstance } from '@unlayer/react-image-editor';

type Screen = 'welcome' | 'garage' | 'editor' | 'reveal' | 'cover';
type Session = { key: number; image: string };
const STARTER_NAME = 'SUNSET COURIER';

function Stage({ artSrc, paint, scene, shutter = 1, lights = false, lightSweep, className = '' }: { artSrc: string | null; paint: Paint; scene: Scene; shutter?: number; lights?: boolean; lightSweep?: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [art, setArt] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    let active = true;
    setArt(null);
    if (artSrc) void decodeImage(artSrc).then(image => { if (active) setArt(image); }).catch(() => { /* retain body */ });
    return () => { active = false; };
  }, [artSrc]);
  useEffect(() => { if (ref.current) renderStage(ref.current.getContext('2d')!, { art, paint, scene, shutter, lights, lightSweep }); }, [art, paint, scene, shutter, lights, lightSweep]);
  return <canvas ref={ref} className={`stage ${className}`} width={1200} height={650} aria-label={`${paint} custom coupe in the ${scene}, with ${artSrc ? 'panel artwork' : 'plain panels'}`} role="img" />;
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

function displayName(name: string) { return name.trim() || 'UNTITLED BUILD'; }
function safeName(name: string) { return displayName(name).replace(/[^a-z0-9-]+/gi, '-').replace(/^-|-$/g, '').slice(0, 40).toLowerCase() || 'untitled-build'; }

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
  const [coverBlob, setCoverBlob] = useState<Blob | null>(null);
  const [scene, setScene] = useState<Scene>('garage');
  const [shutter, setShutter] = useState(1);
  const [lights, setLights] = useState(false);
  const [lightSweep, setLightSweep] = useState<number | undefined>();
  const [revealLabel, setRevealLabel] = useState('');
  const sessionId = useRef(0);
  const saveId = useRef(0);
  const persistence = useRef(Promise.resolve());
  const revealFrame = useRef<number | null>(null);
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

  function stopReveal() { if (revealFrame.current !== null) cancelAnimationFrame(revealFrame.current); revealFrame.current = null; }
  function finishReveal() { stopReveal(); setScene('boulevard'); setShutter(1); setLightSweep(undefined); setLights(true); setScreen('cover'); }
  function rollOut() {
    if (!applied) return;
    stopReveal(); setScreen('reveal'); setScene('garage'); setShutter(0); setLights(false); setLightSweep(undefined); setRevealLabel('THE SHUTTER RISES');
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { finishReveal(); return; }
    const start = performance.now();
    const ease = (value: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, value)), 3);
    const frame = (now: number) => {
      const elapsed = now - start;
      if (elapsed < 1450) setShutter(ease(elapsed / 1450));
      else { setShutter(1); setLights(true); setLightSweep(Math.min(1, (elapsed - 1450) / 1450)); setRevealLabel('LIGHT FINDS THE LINE'); }
      if (elapsed >= 2900) { setLightSweep(undefined); setScene('boulevard'); setRevealLabel('SOLERA BAY IS WAITING'); }
      if (elapsed >= 4700) { finishReveal(); return; }
      revealFrame.current = requestAnimationFrame(frame);
    };
    revealFrame.current = requestAnimationFrame(frame);
  }
  useEffect(() => () => { if (revealFrame.current !== null) cancelAnimationFrame(revealFrame.current); }, []);

  useEffect(() => {
    if (screen !== 'cover' || !applied) return;
    let active = true;
    setCoverBlob(null);
    const prepare = async () => {
      try {
        await Promise.all([document.fonts.load('900 170px "Barlow Condensed"'), document.fonts.load('700 30px "DM Sans"')]);
        const art = await decodeImage(applied);
        const canvas = document.createElement('canvas');
        renderCover(canvas.getContext('2d')!, { art, paint, scene: 'boulevard' }, displayName(buildName));
        const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error('PNG export failed.')), 'image/png'));
        if (active) setCoverBlob(blob);
      } catch (e) { if (active) setError(e instanceof Error ? e.message : 'Cover export failed.'); }
    };
    void prepare();
    return () => { active = false; };
  }, [screen, applied, paint, buildName]);

  function saveCover() { if (coverBlob) download(coverBlob, `vicechrome-${safeName(buildName)}-cover.png`); }

  function saveFlat() { if (applied) download(dataUrlToBlob(applied), `vicechrome-${safeName(buildName)}-panel-art.png`); }
  function saveFromEditor() {
    const dataUrl = editorInstance.current?.getImage();
    if (!dataUrl) { setError('The editor is still loading. Please try again.'); return; }
    void acceptSave({ dataUrl, blob: dataUrlToBlob(dataUrl) });
  }
  function goHome() {
    if (screen === 'editor' && editorInstance.current?.hasChanges() && !window.confirm('Leave the editor? Unsaved changes will be discarded.')) return;
    stopReveal();
    editorInstance.current = null; setSession(null); setScreen('welcome');
  }
  const shownArt = before ? null : applied || starter;
  const previewTitleSize = Math.min(8, 125 / displayName(buildName).length);

  return <div className="app">
    <header className="topbar"><button className="wordmark" onClick={goHome} aria-label="Vicechrome home"><span className="mark">V/C</span> VICECHROME</button><span className="top-center">SOLERA BAY <span className="dot">●</span> CUSTOM CAR STUDIO</span><span className="top-right">EST. 2026 <span className="top-line" /></span></header>

    {screen === 'welcome' && <main className="welcome"><div className="welcome-copy"><p className="eyebrow"><span className="signal" /> THE CITY IS YOUR CANVAS / ISSUE 001</p><h1>MAKE IT<br/><em>YOURS.</em><br/>THEN MAKE<br/>AN ENTRANCE.</h1><p className="intro">One coupe. Your signature. A whole city to see it. Design the panel art, roll out of the garage, and take home the cover.</p><button className="primary" onClick={() => setScreen('garage')}>ENTER THE GARAGE <span>↗</span></button><div className="welcome-meta"><span>01 / DESIGN</span><span>02 / REVEAL</span><span>03 / COLLECT</span></div></div><div className="hero-visual"><Stage artSrc={makeStarter('sunset')} paint="graphite" scene="boulevard" lights/><div className="hero-caption"><span>FEATURE BUILD</span><strong>Sunset Courier</strong><span>01 / 03</span></div></div></main>}

    {screen === 'garage' && <main className="garage"><div className="section-top"><div><p className="eyebrow">THE WORKSHOP / BAY 01</p><h2>YOUR RIDE.<br/><em>YOUR MARK.</em></h2></div><p className="section-note">Create panel art in the Unlayer Image Editor. Save it, see those same pixels on the car, then take your build to the boulevard.</p></div><div className="garage-grid"><section className="garage-stage"><div className="stage-bar"><span className="stage-label"><span className="signal" /> {applied ? 'ARTWORK APPLIED' : 'FEATURE PREVIEW'}</span><button className="text-button" disabled={!applied} onClick={() => setBefore(!before)}>{before ? 'SHOW AFTER' : 'BEFORE / AFTER'} ↔</button></div><Stage artSrc={shownArt} paint={paint} scene="garage" lights/><div className="stage-footer"><span>VC-01 / COASTAL COUPE</span><span>{applied ? 'REVISION SAVED TO PANEL' : 'SELECT A DIRECTION TO BEGIN'}</span></div></section><aside className="controls"><div className="control-block"><div className="control-heading"><span>01</span><h3>CHOOSE A DIRECTION</h3></div><div className="commissions">{commissions.map(c => <button key={c.id} className={`commission ${direction === c.id ? 'selected' : ''}`} onClick={() => { setDirection(c.id); setFreshSeed(true); }} aria-pressed={direction === c.id}><span className={`swatch ${c.id}`} /><span><strong>{c.title}</strong><small>{c.brief}</small></span><span className="commission-arrow">↗</span></button>)}</div></div><div className="control-block compact"><div className="control-heading"><span>02</span><h3>SET THE TONE</h3></div><label className="field-label" htmlFor="buildName">BUILD NAME</label><input id="buildName" value={buildName} maxLength={28} onChange={e => setBuildName(e.target.value)} placeholder="Name your build"/><div className="paint-row"><span>BODY FINISH</span><div>{(['graphite', 'ivory', 'coral'] as Paint[]).map(p => <button key={p} title={p} aria-label={`${p} body finish`} aria-pressed={paint === p} onClick={() => setPaint(p)} className={`paint-dot ${p} ${paint === p ? 'active' : ''}`} />)}</div></div></div><button className="primary wide" onClick={() => openEditor()}>{applied && !freshSeed ? 'EDIT APPLIED ART' : 'DESIGN YOUR PANEL ART'} <span>↗</span></button><button className="secondary wide" disabled={!applied} onClick={rollOut}>ROLL OUT <span>→</span></button><div className="upload-line"><button onClick={() => uploadRef.current?.click()} disabled={busy}>IMPORT A PNG, JPEG OR WEBP</button><input ref={uploadRef} hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={e => void upload(e.target.files?.[0])}/><span>MAX 8 MB</span></div>{!persisted && <p className="notice">Browser storage is unavailable. You can still edit and download; your build may not survive a reload.</p>}{error && <p className="error" role="alert">{error}</p>}</aside></div></main>}

    {screen === 'editor' && session && <main className="editor-screen"><div className="editor-header"><div><p className="eyebrow">VICECHROME / WORKSHOP TOOL</p><h2>DESIGN YOUR <em>PANEL ART.</em></h2></div><button className="editor-back" onClick={closeEditor}>← BACK TO GARAGE</button></div><div className="editor-note"><span className="signal" /> Edit with Unlayer, then save to apply the flattened image. Reopening a saved design treats existing text and stickers as pixels. <span className="mobile-editor-hint">Swipe sideways between tools and canvas.</span></div><div className="mobile-editor-actions"><button onClick={closeEditor}>CANCEL</button><button onClick={saveFromEditor} disabled={!editorReady}>SAVE ARTWORK ✓</button></div>{error && <div className="editor-error" role="alert">{error} <button onClick={() => { setEditorReady(false); setSession({ ...session, key: ++sessionId.current }); setError(''); }}>RETRY EDITOR</button></div>}<div className="editor-frame" key={session.key}><EditorAdapter image={session.image} onLoaded={editor => { editorInstance.current = editor; setEditorReady(true); }} onSave={result => void acceptSave(result)} onCancel={closeEditor} onFailure={setError}/></div></main>}

    {screen === 'reveal' && <main className="reveal"><div className="reveal-top"><span className="eyebrow">THE GARAGE OPENS / 001</span><button className="text-button" onClick={finishReveal}>SKIP REVEAL →</button></div><Stage artSrc={applied} paint={paint} scene={scene} shutter={shutter} lights={lights} lightSweep={lightSweep} className="reveal-stage"/><div className="reveal-title"><p>{revealLabel}</p><h2>{displayName(buildName)}</h2></div></main>}

    {screen === 'cover' && <main className="cover-screen"><div className="cover-heading"><div><p className="eyebrow">SOLERA BAY / THE BOULEVARD</p><h2>ONE OF <em>ONE.</em></h2><p>The cover is yours. The panel carries the exact image saved from your editor session.</p></div><div className="cover-actions"><button className="primary" onClick={saveCover} disabled={!coverBlob}>{!coverBlob ? 'RENDERING…' : 'SAVE COVER'} <span>↓</span></button><button className="secondary" onClick={saveFlat}>SAVE FLAT ART <span>↓</span></button><button className="text-button" onClick={() => openEditor(applied || starter)}>EDIT AGAIN ↗</button><button className="text-button" onClick={rollOut}>REPLAY REVEAL ↻</button></div></div><div className="cover-preview"><Stage artSrc={applied} paint={paint} scene="boulevard" lights/><div><span>VICECHROME / 001</span><strong style={{ fontSize: `clamp(24px, ${previewTitleSize}vw, 90px)` }}>{displayName(buildName)}</strong><small>DESIGN YOUR MARK. OWN THE BOULEVARD.</small></div></div>{error && <p className="error" role="alert">{error}</p>}<button className="return-link" onClick={() => setScreen('garage')}>← RETURN TO GARAGE</button></main>}

    <footer><span>VICECHROME © 2026</span><span>AN ORIGINAL FAN CONCEPT SET IN FICTIONAL SOLERA BAY</span><span>DESIGN YOUR MARK. OWN THE BOULEVARD.</span></footer>
  </div>;
}




