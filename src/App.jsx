import React,{useEffect,useMemo,useRef,useState} from 'react';
import {Upload,Search,Image as ImageIcon,FileVideo,FileText,ScanLine,ArrowRight,Download,RefreshCw,ShieldCheck,Menu,X,ChevronLeft,RotateCcw,RotateCw,Plus,Trash2,Merge,Maximize2,FileOutput,Layers,CheckCircle2} from 'lucide-react';
import {PDFDocument} from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc=pdfWorker;

const tools=[
{id:'image-compressor',name:'Image Compressor',desc:'Shrink JPG, PNG, WebP and AVIF images in your browser.',icon:ImageIcon,cat:'Images'},
{id:'video-compressor',name:'Video Compressor',desc:'Reduce video size with browser-native encoding.',icon:FileVideo,cat:'Video'},
{id:'pdf-compressor',name:'PDF Compressor',desc:'Optimize and re-save PDFs for smaller, cleaner files.',icon:FileText,cat:'PDF'},
{id:'pdf-merger',name:'PDF Merger',desc:'Combine multiple PDFs and keep them in your chosen order.',icon:Merge,cat:'PDF'},
{id:'scanner',name:'AI Document Scanner',desc:'Scan documents with camera or upload, then enhance with 10 filters.',icon:ScanLine,cat:'Scanner'},
{id:'image-resizer',name:'Image Resizer',desc:'Resize images by pixels or percentage without extra software.',icon:Maximize2,cat:'Images'},
{id:'image-converter',name:'Image Converter',desc:'Convert images between JPG, PNG and WebP.',icon:FileOutput,cat:'Images'},
{id:'pdf-to-images',name:'PDF → Images',desc:'Render PDF pages to downloadable PNG images.',icon:Layers,cat:'PDF'},
{id:'images-to-pdf',name:'Images → PDF',desc:'Turn a batch of images into one PDF document.',icon:FileOutput,cat:'PDF'},
{id:'pdf-splitter',name:'PDF Splitter',desc:'Extract selected pages into a new PDF.',icon:FileText,cat:'PDF'}
];

const fmt=(n)=>{if(!n)return '0 B';const u=['B','KB','MB','GB'];let i=0,x=n;while(x>=1024&&i<u.length-1){x/=1024;i++}return `${x.toFixed(x>=100?0:x>=10?1:2)} ${u[i]}`};
const downloadBlob=(blob,name)=>{const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};
const fileUrl=(f)=>URL.createObjectURL(f);
const loadImage=(file)=>new Promise((res,rej)=>{const im=new Image();im.onload=()=>{URL.revokeObjectURL(im.src);res(im)};im.onerror=rej;im.src=fileUrl(file)});
const canvasBlob=(canvas,type,q)=>new Promise(r=>canvas.toBlob(r,type,q));
const ext=(name)=>name.split('.').pop()?.toLowerCase()||'';

function DropZone({multiple,onFiles,accept='*/*',children}){const [drag,setDrag]=useState(false);return <label className={`dropzone ${drag?'drag':''}`} onDragOver={e=>{e.preventDefault();setDrag(true)}} onDragLeave={()=>setDrag(false)} onDrop={e=>{e.preventDefault();setDrag(false);onFiles([...e.dataTransfer.files])}}><input type="file" hidden multiple={multiple} accept={accept} onChange={e=>onFiles([...e.target.files])}/>{children}</label>}
function FilePill({file,onRemove}){return <div className="filepill"><span>{file.name}</span><small>{fmt(file.size)}</small>{onRemove&&<button onClick={onRemove}><X size={16}/></button>}</div>}
function ToolShell({tool,onBack,children}){return <main className="toolpage"><button className="back" onClick={onBack}><ChevronLeft size={18}/> All tools</button><div className="toolhead"><div className="toolicon"><tool.icon size={28}/></div><div><div className="eyebrow">{tool.cat}</div><h1>{tool.name}</h1><p>{tool.desc}</p></div></div>{children}</main>}
function Result({before,after,blob,name,onReset}){return <div className="result"><div className="resulttop"><div><div className="eyebrow">Ready</div><h3>{name}</h3></div><CheckCircle2 size={28}/></div>{before!=null&&after!=null&&<div className="stats"><span>Before <b>{fmt(before)}</b></span><span>After <b>{fmt(after)}</b></span><span className={after<before?'good':''}>{after<before?`${Math.round((1-after/before)*100)}% smaller`:'Optimized'}</span></div>}<div className="actions"><button className="primary" onClick={()=>downloadBlob(blob,name)}><Download size={18}/> Download</button><button onClick={onReset}><RefreshCw size={18}/> Start over</button></div></div>}

function ImageCompressor(){const [files,setFiles]=useState([]),[quality,setQuality]=useState(.72),[format,setFormat]=useState('image/webp'),[busy,setBusy]=useState(false),[results,setResults]=useState([]);const run=async()=>{setBusy(true);const out=[];for(const f of files){const im=await loadImage(f),c=document.createElement('canvas');c.width=im.naturalWidth;c.height=im.naturalHeight;c.getContext('2d').drawImage(im,0,0);const b=await canvasBlob(c,format,quality);out.push({before:f.size,after:b.size,blob:b,name:f.name.replace(/\.[^.]+$/,'')+(format==='image/jpeg'?'.jpg':format==='image/png'?'.png':'.webp')})}setResults(out);setBusy(false)};return <div className="stack"><DropZone multiple accept="image/*" onFiles={setFiles}><Upload size={32}/><strong>Drop images here</strong><span>or tap to browse · batch supported</span></DropZone>{files.length>0&&<div className="filelist">{files.map((f,i)=><FilePill key={i} file={f} onRemove={()=>setFiles(files.filter((_,j)=>j!==i))}/>)}</div>}<div className="controls"><label>Quality <b>{Math.round(quality*100)}%</b><input type="range" min=".2" max="1" step=".01" value={quality} onChange={e=>setQuality(+e.target.value)}/></label><label>Output format<select value={format} onChange={e=>setFormat(e.target.value)}><option value="image/webp">WebP</option><option value="image/jpeg">JPG</option><option value="image/png">PNG</option></select></label></div><button className="primary big" disabled={!files.length||busy} onClick={run}>{busy?'Compressing…':'Compress images'}</button>{results.map((r,i)=><Result key={i}{...r} onReset={()=>setResults([])}/>)}</div>}

function ImageResize({convert=false}){const [files,setFiles]=useState([]),[mode,setMode]=useState('pixels'),[width,setWidth]=useState(1200),[height,setHeight]=useState(1200),[format,setFormat]=useState('image/webp'),[busy,setBusy]=useState(false),[results,setResults]=useState([]);const run=async()=>{setBusy(true);const out=[];for(const f of files){const im=await loadImage(f);let w=width,h=height;if(mode==='percent'){w=Math.max(1,Math.round(im.width*width/100));h=Math.max(1,Math.round(im.height*width/100))}else if(height===0)h=Math.round(im.height*(w/im.width));const c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(im,0,0,w,h);const b=await canvasBlob(c,format,.9);out.push({before:f.size,after:b.size,blob:b,name:f.name.replace(/\.[^.]+$/,'')+(format==='image/jpeg'?'.jpg':format==='image/png'?'.png':'.webp')})}setResults(out);setBusy(false)};return <div className="stack"><DropZone multiple accept="image/*" onFiles={setFiles}><Upload size={32}/><strong>Drop images here</strong><span>Resize or convert locally in your browser</span></DropZone>{files.length>0&&<div className="filelist">{files.map((f,i)=><FilePill key={i} file={f}/>)}</div>}<div className="controls grid3"><label>Mode<select value={mode} onChange={e=>setMode(e.target.value)}><option value="pixels">Pixels</option><option value="percent">Percentage</option></select></label><label>{mode==='percent'?'Scale %':'Width'}<input type="number" min="1" value={width} onChange={e=>setWidth(+e.target.value)}/></label><label>{mode==='percent'?'Height ignored':'Height (0 = auto)'}<input type="number" min="0" value={height} onChange={e=>setHeight(+e.target.value)}/></label></div><label>Output format<select value={format} onChange={e=>setFormat(e.target.value)}><option value="image/webp">WebP</option><option value="image/jpeg">JPG</option><option value="image/png">PNG</option></select></label><button className="primary big" disabled={!files.length||busy} onClick={run}>{busy?'Processing…':convert?'Convert images':'Resize images'}</button>{results.map((r,i)=><Result key={i}{...r} onReset={()=>setResults([])}/>)}</div>}

function VideoCompressor(){const [file,setFile]=useState(null),[scale,setScale]=useState(720),[bitrate,setBitrate]=useState(900000),[busy,setBusy]=useState(false),[result,setResult]=useState(null);const run=async()=>{if(!file)return;setBusy(true);const v=document.createElement('video');v.src=fileUrl(file);v.muted=false;v.playsInline=true;await new Promise((r,j)=>{v.onloadedmetadata=r;v.onerror=j});const ratio=v.videoWidth/v.videoHeight;const w=Math.min(scale,v.videoWidth),h=Math.round(w/ratio);const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d');const stream=c.captureStream(30);try{v.captureStream().getAudioTracks().forEach(t=>stream.addTrack(t))}catch{}const mime=MediaRecorder.isTypeSupported('video/webm;codecs=vp9')?'video/webm;codecs=vp9':'video/webm';const rec=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:bitrate});const chunks=[];rec.ondataavailable=e=>e.data.size&&chunks.push(e.data);const done=new Promise(r=>rec.onstop=r);v.currentTime=0;await v.play();rec.start(250);const draw=()=>{if(v.ended){rec.stop();return}ctx.drawImage(v,0,0,w,h);requestAnimationFrame(draw)};draw();await done;v.pause();const b=new Blob(chunks,{type:'video/webm'});setResult({before:file.size,after:b.size,blob:b,name:file.name.replace(/\.[^.]+$/,'')+'-compressed.webm'});setBusy(false)};return <div className="stack"><DropZone accept="video/*" onFiles={fs=>setFile(fs[0])}><FileVideo size={34}/><strong>{file?file.name:'Drop a video here'}</strong><span>Browser-native WebM encoding · audio preserved when supported</span></DropZone>{file&&<><div className="controls grid2"><label>Max width <select value={scale} onChange={e=>setScale(+e.target.value)}><option value="480">480p</option><option value="720">720p</option><option value="1080">1080p</option></select></label><label>Video bitrate <select value={bitrate} onChange={e=>setBitrate(+e.target.value)}><option value="500000">500 kbps</option><option value="900000">900 kbps</option><option value="1500000">1.5 Mbps</option><option value="2500000">2.5 Mbps</option></select></label></div><button className="primary big" disabled={busy} onClick={run}>{busy?'Encoding video…':'Compress video'}</button></>}{result&&<Result {...result} onReset={()=>setResult(null)}/>}<div className="notice">Video encoding is performed on your device. Very large videos can use significant CPU and memory.</div></div>}

async function mergePdfs(files){const out=await PDFDocument.create();for(const f of files){const d=await PDFDocument.load(await f.arrayBuffer());const pages=await out.copyPages(d,d.getPageIndices());pages.forEach(p=>out.addPage(p))}return new Blob([await out.save({useObjectStreams:true})],{type:'application/pdf'})}
function PdfTool({kind}){const [files,setFiles]=useState([]),[range,setRange]=useState('1'),[busy,setBusy]=useState(false),[result,setResult]=useState(null);const run=async()=>{setBusy(true);let blob,name;if(kind==='merge'){blob=await mergePdfs(files);name='merged.pdf'}else if(kind==='compress'){const d=await PDFDocument.load(await files[0].arrayBuffer());const out=await PDFDocument.create();const pages=await out.copyPages(d,d.getPageIndices());pages.forEach(p=>out.addPage(p));blob=new Blob([await out.save({useObjectStreams:true})],{type:'application/pdf'});name=files[0].name.replace(/\.pdf$/i,'')+'-optimized.pdf'}else{const d=await PDFDocument.load(await files[0].arrayBuffer()),idx=parsePages(range,d.getPageCount());const out=await PDFDocument.create();const pages=await out.copyPages(d,idx);pages.forEach(p=>out.addPage(p));blob=new Blob([await out.save({useObjectStreams:true})],{type:'application/pdf'});name=files[0].name.replace(/\.pdf$/i,'')+'-split.pdf'}setResult({before:files.reduce((a,f)=>a+f.size,0),after:blob.size,blob,name});setBusy(false)};const title=kind==='merge'?'Merge PDFs':kind==='compress'?'Optimize PDF':'Split PDF';return <div className="stack"><DropZone multiple={kind==='merge'} accept="application/pdf" onFiles={setFiles}><FileText size={34}/><strong>Drop {kind==='merge'?'PDFs':'a PDF'} here</strong><span>{kind==='merge'?'Multiple files supported · order is preserved':'PDF processing stays in your browser'}</span></DropZone>{files.length>0&&<div className="filelist">{files.map((f,i)=><FilePill key={i} file={f} onRemove={()=>setFiles(files.filter((_,j)=>j!==i))}/>)}</div>}{kind==='split'&&files.length>0&&<label>Pages to extract<input value={range} onChange={e=>setRange(e.target.value)} placeholder="Example: 1-3,5,8"/></label>}<button className="primary big" disabled={!files.length||busy} onClick={run}>{busy?'Working…':title}</button>{result&&<Result {...result} onReset={()=>setResult(null)}/>}<div className="notice">PDF optimization re-saves document structure; PDFs containing huge embedded images may need image-level recompression for dramatic size reductions.</div></div>}
function parsePages(s,total){const set=new Set();s.split(',').map(x=>x.trim()).filter(Boolean).forEach(part=>{const [a,b]=part.split('-').map(Number);if(Number.isFinite(a)){const end=Number.isFinite(b)?b:a;for(let n=a;n<=end;n++)if(n>=1&&n<=total)set.add(n-1)}});return [...set].sort((a,b)=>a-b)}

function ImagesToPdf(){const [files,setFiles]=useState([]),[busy,setBusy]=useState(false),[result,setResult]=useState(null);const run=async()=>{setBusy(true);const out=await PDFDocument.create();for(const f of files){const im=await loadImage(f),c=document.createElement('canvas');c.width=im.width;c.height=im.height;c.getContext('2d').drawImage(im,0,0);const png=await canvasBlob(c,'image/png');const bytes=await png.arrayBuffer();const img=await out.embedPng(bytes);const page=out.addPage([im.width*.75,im.height*.75]);page.drawImage(img,{x:0,y:0,width:page.getWidth(),height:page.getHeight()})}const blob=new Blob([await out.save()],{type:'application/pdf'});setResult({before:files.reduce((a,f)=>a+f.size,0),after:blob.size,blob,name:'images.pdf'});setBusy(false)};return <div className="stack"><DropZone multiple accept="image/*" onFiles={setFiles}><ImageIcon size={34}/><strong>Drop images here</strong><span>They become pages in one PDF</span></DropZone>{files.length>0&&<div className="filelist">{files.map((f,i)=><FilePill key={i} file={f}/>)}</div>}<button className="primary big" disabled={!files.length||busy} onClick={run}>{busy?'Building PDF…':'Create PDF'}</button>{result&&<Result {...result} onReset={()=>setResult(null)}/>}</div>}

function PdfToImages(){const [file,setFile]=useState(null),[busy,setBusy]=useState(false),[pages,setPages]=useState([]);const run=async()=>{setBusy(true);const pdf=await pdfjsLib.getDocument({data:await file.arrayBuffer()}).promise;const out=[];for(let i=1;i<=pdf.numPages;i++){const p=await pdf.getPage(i),vp=p.getViewport({scale:1.5}),c=document.createElement('canvas');c.width=vp.width;c.height=vp.height;await p.render({canvasContext:c.getContext('2d'),viewport:vp}).promise;const b=await new Promise(r=>c.toBlob(r,'image/png'));out.push({blob:b,name:`page-${i}.png`})}setPages(out);setBusy(false)};return <div className="stack"><DropZone accept="application/pdf" onFiles={fs=>setFile(fs[0])}><FileText size={34}/><strong>{file?file.name:'Drop a PDF here'}</strong><span>Each page is rendered locally to PNG</span></DropZone><button className="primary big" disabled={!file||busy} onClick={run}>{busy?'Rendering…':'Convert to images'}</button>{pages.length>0&&<div className="result"><h3>{pages.length} pages ready</h3><div className="actions"><button className="primary" onClick={()=>pages.forEach(p=>downloadBlob(p.blob,p.name))}><Download size={18}/> Download all</button></div></div>}</div>}

const filters=['Original','Auto Enhance','Document','Black & White','Grayscale','High Contrast','Receipt','ID Card','Sharpen','Blueprint','AI Filter ✨'];



function applyLocalDocumentEnhance(ctx,c,settings={}){
  const data=ctx.getImageData(0,0,c.width,c.height),d=data.data;
  const contrast=settings.contrast??1.35, brightness=settings.brightness??8, threshold=settings.threshold??null;
  for(let i=0;i<d.length;i+=4){
    let r=d[i],g=d[i+1],b=d[i+2],lum=.299*r+.587*g+.114*b;
    if(threshold!==null) r=g=b=lum>threshold?255:0;
    else {
      r=Math.max(0,Math.min(255,(r-128)*contrast+128+brightness));
      g=Math.max(0,Math.min(255,(g-128)*contrast+128+brightness));
      b=Math.max(0,Math.min(255,(b-128)*contrast+128+brightness));
    }
    d[i]=r;d[i+1]=g;d[i+2]=b;
  }
  ctx.putImageData(data,0,0);
}

function detectDocumentCrop(im){
  const max=700,scale=Math.min(1,max/Math.max(im.width,im.height));
  const w=Math.max(1,Math.round(im.width*scale)),h=Math.max(1,Math.round(im.height*scale));
  const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(im,0,0,w,h);
  const d=ctx.getImageData(0,0,w,h).data, border=[];
  for(let x=0;x<w;x+=4){for(const y of [0,Math.max(0,h-1)]){const i=(y*w+x)*4;border.push(.299*d[i]+.587*d[i+1]+.114*d[i+2])}}
  for(let y=0;y<h;y+=4){for(const x of [0,Math.max(0,w-1)]){const i=(y*w+x)*4;border.push(.299*d[i]+.587*d[i+1]+.114*d[i+2])}}
  border.sort((a,b)=>a-b);const bg=border[Math.floor(border.length/2)];
  let minX=w,minY=h,maxX=-1,maxY=-1,count=0;const threshold=24;
  for(let y=0;y<h;y+=2)for(let x=0;x<w;x+=2){const i=(y*w+x)*4,lum=.299*d[i]+.587*d[i+1]+.114*d[i+2];if(Math.abs(lum-bg)>threshold){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);count++}}
  if(count<Math.max(50,w*h*.01)||maxX<0)return {x:0,y:0,w:1,h:1};
  const pad=.018;minX=Math.max(0,minX-pad*w);minY=Math.max(0,minY-pad*h);maxX=Math.min(w,maxX+pad*w);maxY=Math.min(h,maxY+pad*h);
  return {x:minX/w,y:minY/h,w:(maxX-minX)/w,h:(maxY-minY)/h};
}

function Scanner(){
  const [file,setFile]=useState(null),[filter,setFilter]=useState('Original'),[rotation,setRotation]=useState(0),[busy,setBusy]=useState(false),[aiInfo,setAiInfo]=useState(null),[crop,setCrop]=useState({x:0,y:0,w:1,h:1}),canvasRef=useRef(null),imgRef=useRef(null);
  const drawBase=(targetFilter=filter,aiSettings=null)=>{
    const im=imgRef.current,c=canvasRef.current;if(!im||!c)return;
    const rad=rotation*Math.PI/180,sourceW=im.width*crop.w,sourceH=im.height*crop.h,sourceX=im.width*crop.x,sourceY=im.height*crop.y,swap=rotation%180!==0;
    c.width=swap?sourceH:sourceW;c.height=swap?sourceW:sourceH;
    const ctx=c.getContext('2d');ctx.save();ctx.translate(c.width/2,c.height/2);ctx.rotate(rad);ctx.drawImage(im,sourceX,sourceY,sourceW,sourceH,-sourceW/2,-sourceH/2,sourceW,sourceH);ctx.restore();
    if(targetFilter==='Original')return;
    if(targetFilter==='AI Filter ✨') { applyLocalDocumentEnhance(ctx,c,aiSettings||{}); return; }
    const data=ctx.getImageData(0,0,c.width,c.height),d=data.data;
    for(let i=0;i<d.length;i+=4){
      let r=d[i],g=d[i+1],b=d[i+2],lum=.299*r+.587*g+.114*b;
      if(targetFilter==='Grayscale')r=g=b=lum;
      if(targetFilter==='Black & White')r=g=b=lum>155?255:0;
      if(targetFilter==='Document')r=g=b=lum>185?255:Math.max(0,lum-20);
      if(targetFilter==='Receipt')r=g=b=lum>205?255:0;
      if(targetFilter==='High Contrast'){const f=1.7;r=Math.max(0,Math.min(255,(r-128)*f+128));g=Math.max(0,Math.min(255,(g-128)*f+128));b=Math.max(0,Math.min(255,(b-128)*f+128))}
      if(targetFilter==='Auto Enhance'){r=Math.min(255,r*1.08+8);g=Math.min(255,g*1.08+8);b=Math.min(255,b*1.08+8)}
      if(targetFilter==='ID Card'){r=Math.min(255,r*1.12+10);g=Math.min(255,g*1.12+10);b=Math.min(255,b*1.12+10)}
      if(targetFilter==='Blueprint'){r=40;g=Math.min(255,lum*.65+35);b=Math.min(255,lum*1.15+65)}
      d[i]=r;d[i+1]=g;d[i+2]=b;
    }
    if(targetFilter==='Sharpen'){
      const src=new Uint8ClampedArray(d),W=c.width;
      for(let y=1;y<c.height-1;y++)for(let x=1;x<W-1;x++)for(let k=0;k<3;k++){const i=(y*W+x)*4+k;d[i]=Math.max(0,Math.min(255,5*src[i]-src[i-4]-src[i+4]-src[i-W*4]-src[i+W*4]))}
    }
    ctx.putImageData(data,0,0);
  };
  useEffect(()=>{drawBase(filter,aiInfo?.settings)},[file,filter,rotation,aiInfo]);
  const choose=async(fs)=>{const f=fs[0];if(!f)return;setFile(f);setAiInfo(null);const im=await loadImage(f);imgRef.current=im;setCrop(detectDocumentCrop(im));setTimeout(()=>drawBase('Original'),0)};
  const applyAi=()=>{
    if(!file||!imgRef.current)return;
    // Free browser-only smart scan: re-detect edges and apply adaptive document enhancement.
    const nextCrop=detectDocumentCrop(imgRef.current);
    setCrop(nextCrop);
    setAiInfo({summary:'Smart scan completed locally — document edges detected and an adaptive clarity filter was applied.',settings:{contrast:1.45,brightness:8,threshold:null}});
    setFilter('AI Filter ✨');
  };

  const exportFile=async(type)=>{const b=await new Promise(r=>canvasRef.current.toBlob(r,type,.92));downloadBlob(b,type==='image/jpeg'?'scan.jpg':'scan.png')};
  const exportPdf=async()=>{setBusy(true);const b=await new Promise(r=>canvasRef.current.toBlob(r,'image/jpeg',.92)),d=await PDFDocument.create(),jpg=await d.embedJpg(await b.arrayBuffer()),page=d.addPage([jpg.width*.5,jpg.height*.5]);page.drawImage(jpg,{x:0,y:0,width:page.getWidth(),height:page.getHeight()});downloadBlob(new Blob([await d.save()],{type:'application/pdf'}),'scanned-document.pdf');setBusy(false)};
  return <div className="scanner">
    <DropZone accept="image/*" onFiles={choose}><ScanLine size={34}/><strong>{file?file.name:'Upload a document photo'}</strong><span>Auto-detect edges, crop the document, then enhance it</span></DropZone>
    {file&&<>
      <div className="aiPanel"><div><div className="eyebrow">AI SCAN</div><h3>Smart document analysis</h3><p>{aiInfo?.summary||'Detects the document locally and automatically improves clarity.'}</p></div><button className="aiButton" onClick={applyAi}>✨ Smart Auto Scan<small>Free · runs on this device</small></button></div>
      <div className="filterrow">{filters.map(f=><button key={f} className={`${filter===f?'selected':''} ${f.startsWith('AI')?'aiFilter':''}`} onClick={()=>f.startsWith('AI')?applyAi():setFilter(f)}>{f}</button>)}</div>
      <div className="scanpreview"><canvas ref={canvasRef}/></div>
      <div className="actions"><button onClick={()=>setRotation((rotation+270)%360)}><RotateCcw size={18}/> Rotate left</button><button onClick={()=>setRotation((rotation+90)%360)}><RotateCw size={18}/> Rotate right</button><button className="primary" onClick={()=>exportFile('image/jpeg')}><Download size={18}/> JPG</button><button className="primary" disabled={busy} onClick={exportPdf}><FileText size={18}/> PDF</button></div>
      <div className="notice">Auto-crop and Smart Auto Scan run entirely in your browser. No API key, account, upload or AI service is required.</div>
    </>}
  </div>
}

function App(){const [active,setActive]=useState(location.hash.slice(1)||'');const [query,setQuery]=useState('');const [menu,setMenu]=useState(false);const open=id=>{setActive(id);location.hash=id;window.scrollTo({top:0,behavior:'smooth'});setMenu(false)};useEffect(()=>{const fn=()=>setActive(location.hash.slice(1));addEventListener('hashchange',fn);return()=>removeEventListener('hashchange',fn)},[]);const shown=useMemo(()=>tools.filter(t=>(t.name+t.desc+t.cat).toLowerCase().includes(query.toLowerCase())),[query]);const tool=tools.find(t=>t.id===active);const render=()=>{if(!tool)return null;const back=()=>open('');const C=tool.id==='image-compressor'?ImageCompressor:tool.id==='image-resizer'?()=> <ImageResize/>:tool.id==='image-converter'?()=> <ImageResize convert/>:tool.id==='video-compressor'?VideoCompressor:tool.id==='pdf-compressor'?()=> <PdfTool kind="compress"/>:tool.id==='pdf-merger'?()=> <PdfTool kind="merge"/>:tool.id==='pdf-splitter'?()=> <PdfTool kind="split"/>:tool.id==='images-to-pdf'?ImagesToPdf:tool.id==='pdf-to-images'?PdfToImages:Scanner;return <ToolShell tool={tool} onBack={back}><C/></ToolShell>};return <div className="app"><header><button className="brand" onClick={()=>open('')}><span className="brandmark">TF</span><span>ToolForge <em>AI</em></span></button><nav><button onClick={()=>document.getElementById('tools')?.scrollIntoView({behavior:'smooth'})}>All tools</button><a href="#privacy">Privacy</a></nav><button className="menubtn" onClick={()=>setMenu(!menu)}>{menu?<X/>:<Menu/>}</button></header>{menu&&<div className="mobilemenu"><button onClick={()=>open('')}>All tools</button><a href="#privacy">Privacy</a></div>}{active?render():<><section className="hero"><div className="badge"><ShieldCheck size={16}/> Private by design · Browser-first processing</div><h1>Powerful tools.<br/><span>No complicated software.</span></h1><p>Compress, convert, merge, resize and scan files in seconds — right in your browser.</p><div className="search"><Search size={20}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="What do you want to do?"/></div></section><section id="tools" className="tools"><div className="sectiontitle"><div><div className="eyebrow">TOOLKIT</div><h2>{query?`Results for “${query}”`:'Everything you need'}</h2></div><span>{shown.length} tools</span></div><div className="grid">{shown.map(t=>{const Icon=t.icon;return <button className="card" key={t.id} onClick={()=>open(t.id)}><div className="cardicon"><Icon size={22}/></div><div className="cardtext"><h3>{t.name}</h3><p>{t.desc}</p><small>{t.cat}</small></div><ArrowRight className="arrow" size={19}/></button>})}</div></section><section className="trust"><div><ShieldCheck/><h3>Your files stay yours.</h3><p>Whenever possible, processing happens locally on your device. No account required.</p></div><div><RefreshCw/><h3>Simple workflow.</h3><p>Upload, adjust, process, download. No bloated desktop software.</p></div><div><Download/><h3>Ready to export.</h3><p>Clean results with clear file sizes and one-click downloads.</p></div></section></>}<footer id="privacy"><div><span className="brandmark">TF</span><strong>ToolForge AI</strong></div><p>Fast browser tools for everyday files.</p><span>© 2026 ToolForge AI · Your files are processed locally whenever possible.</span></footer></div>}
export default App;
