'use client';
import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { Search, Globe2, Image as ImageIcon, ExternalLink, AlertCircle, LoaderCircle } from 'lucide-react';
type Result = { thumbnail: string; original?: string; title?: string; source?: string; width?: number; height?: number };
type Payload = { query: string; images: Result[]; error?: string; pageUrl?: string };
export default function Home() {
  const [query,setQuery] = useState('');
  const [status,setStatus] = useState<'idle'|'running'|'done'|'error'>('idle');
  const [data,setData] = useState<Payload | null>(null);
  const [message,setMessage] = useState('');
  const inTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
  useEffect(() => {
    if (!inTauri) return;
    let cancelled = false;
    let remove: undefined | (() => void);
    listen<Payload>('seekye:results', e => {
      if (cancelled) return;
      setData(e.payload);
      setStatus(e.payload.error ? 'error' : 'done');
      setMessage(e.payload.error || '');
    }).then(unlisten => { if (cancelled) unlisten(); else remove = unlisten; });
    return () => { cancelled = true; remove?.(); };
  }, [inTauri]);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setStatus('running'); setData(null); setMessage('');
    try {
      if (!inTauri) throw new Error('Open SeekYe through the Tauri desktop app. The web preview cannot control WKWebView.');
      await invoke('search_images', { query: query.trim() });
    } catch (err) { setStatus('error'); setMessage(String(err)); }
  }
  return <main className="shell">
    <aside className="side">
      <div className="brand"><div className="brandmark"><Search size={22}/></div><strong>SeekYe</strong></div>
      <div className="navactive"><ImageIcon size={17}/> Image discovery</div>
      <div className="navitem"><Globe2 size={17}/> Engine: Yandex</div>
      <div className="sidebar-bottom"><span className="dot"/> Native WebView automation<br/><small>Tauri 2 · macOS ARM64</small></div>
    </aside>
    <section className="content">
      <div className="top"><span>Workspace / Image discovery</span><span className="environment">LOCAL DESKTOP</span></div>
      <header><div className="eyebrow">AUTOMATION / 01</div><h1>Discover images, automatically.</h1><p>SeekYe opens Yandex, enters your request, switches to Images and extracts the available results into a structured gallery.</p></header>
      <form className="searchbar" onSubmit={submit}>
        <Search size={21} color="#99a6b8"/>
        <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search Yandex Images..." aria-label="Image search query"/>
        <button type="submit" disabled={status==='running'}>{status==='running'?<LoaderCircle className="spin" size={17}/>:<Search size={17}/>} {status==='running'?'Searching':'Run search'}</button>
      </form>
      <div className="metarow"><span><span className="minidot"/> Browser: WKWebView</span><span>Output: JSON + image gallery</span><span>Automation runs in a separate browser window</span></div>
      <div className="resulthead"><div><h2>Search results</h2><p>{data? `${data.images.length} images extracted for “${data.query}”` : 'Images appear here once a search completes.'}</p></div>{data&&<button className="export" onClick={()=>{const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='seekye-images.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}}>Export JSON</button>}</div>
      {message&&<div className="error"><AlertCircle size={17}/>{message}</div>}
      {status==='running' && <div className="loading"><LoaderCircle className="spin"/> Waiting for Yandex image results. Check the browser window for consent or verification challenges.</div>}
      {!data && status!=='running' && <div className="empty"><div className="empty-icon"><ImageIcon size={34}/></div><h3>No images yet</h3><p>Enter a query to launch your first automated search.</p></div>}
      {data && <div className="gallery">{data.images.map((item,i)=><article key={i} className="tile"><div className="thumb"><img src={item.thumbnail} alt={item.title||`Result ${i+1}`} loading="lazy" referrerPolicy="no-referrer" onError={e=>{e.currentTarget.style.opacity='0.15'}}/></div><div className="tilefoot"><div><strong title={item.title}>{item.title||`Image ${i+1}`}</strong><small>{item.source||'Yandex Images'}{item.width&&item.height?` · ${item.width}×${item.height}`:''}</small></div><a href={item.original||item.thumbnail} target="_blank" rel="noreferrer" aria-label="Open original image"><ExternalLink size={16}/></a></div></article>)}</div>}
      {data?.pageUrl&&<p className="source">Source: {data.pageUrl}</p>}
    </section>
  </main>;
}
