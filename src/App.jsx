import React,{useEffect,useMemo,useRef,useState} from 'react';
import {Upload,Search,Image as ImageIcon,FileVideo,FileText,ScanLine,ArrowRight,Download,RefreshCw,ShieldCheck,Menu,X,ChevronLeft,RotateCcw,RotateCw,Plus,Trash2,Merge,Maximize2,FileOutput,Layers,CheckCircle2,Sparkles,Crop} from 'lucide-react';
import {PDFDocument} from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc=pdfWorker;

const tools=[
{id:'image-compressor',name:'Image Compressor',desc:'Shrink JPG, PNG, WebP and AVIF images in your browser.',icon:ImageIcon,cat:'Images'},
{id:'video-compressor',name:'Video Compressor',desc:'Reduce video size with browser-native encoding.',icon:FileVideo,cat:'Video'},
{id:'pdf-compressor',name:'PDF Compressor',desc:'Optimize and re-save PDFs for smaller, cleaner files.',icon:FileText,cat:'PDF'},
{id:'pdf-merger',name:'PDF Merger',desc:'Combine multiple PDFs and keep them in your chosen order.',icon:Merge,cat:'PDF'},
{id:'scanner',name:'AI Document Scanner',desc:'Scan documents with camera or upload, crop manually or automatically, and enhance.',icon:ScanLine,cat:'Scanner'},
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

// Realistic Flatbed Scan Algorithm: removes shadows, whitens dirty paper, sharpens text
function applyRealisticDocumentClean(ctx, c, mode = 'color') {
  const imgData = ctx.getImageData(0, 0, c.width, c.height);
  const d = imgData.data;
  const w = c.width, h = c.height;

  // Background illumination estimation across uniform tiles
  const tileSize = Math.max(20, Math.floor(Math.min(w, h) / 12));
  const tilesX = Math.ceil(w / tileSize);
  const tilesY = Math.ceil(h / tileSize);
  const bgGrid = new Float32Array(tilesX * tilesY);

  for (let ty = 0; ty < tilesY; ty++) {
    for (let tx = 0; tx < tilesX; tx++) {
      let maxL = 0;
      const x0 = tx * tileSize, y0 = ty * tileSize;
      const x1 = Math.min(w, x0 + tileSize), y1 = Math.min(h, y0 + tileSize);

      for (let y = y0; y < y1; y += 2) {
        for (let x = x0; x < x1; x += 2) {
          const idx = (y * w + x) * 4;
          const lum = 0.299 * d[idx] + 0.587 * d[idx + 1] + 0.114 * d[idx + 2];
          if (lum > maxL) maxL = lum;
        }
      }
      bgGrid[ty * tilesX + tx] = Math.max(90, maxL);
    }
  }

  // Normalize lighting and expand dynamic range
  for (let y = 0; y < h; y++) {
    const ty = Math.min(tilesY - 1, Math.floor(y / tileSize));
    for (let x = 0; x < w; x++) {
      const tx = Math.min(tilesX - 1, Math.floor(x / tileSize));
      const bg = bgGrid[ty * tilesX + tx];
      const i = (y * w + x) * 4;

      if (mode === 'bw') {
        const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        const val = (lum / bg) * 255;
        const finalVal = val > 185 ? 255 : Math.max(0, val * 0.7);
        d[i] = d[i + 1] = d[i + 2] = finalVal;
      } else {
        for (let ch = 0; ch < 3; ch++) {
          let val = (d[i + ch] / bg) * 255;
          if (val > 215) {
            val = 255;
          } else if (val < 110) {
            val = val * 0.82;
          } else {
            val = (val - 110) * (255 / 105);
          }
          d[i + ch] = Math.min(255, Math.max(0, val));
        }
      }
    }
  }

  // Light text-edge sharpening
  const src = new Uint8ClampedArray(d);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      for (let k = 0; k < 3; k++) {
        const i = (y * w + x) * 4 + k;
        const lap = 5 * src[i] - src[i - 4] - src[i + 4] - src[i - w * 4] - src[i + w * 4];
        d[i] = Math.min(255, Math.max(0, lap));
      }
    }
  }
  ctx.putImageData(imgData, 0, 0);
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

const filters=[
  'Original',
  'Realistic Clean ✨',
  'Magic Color',
  'Black & White',
  'Document Crisp',
  'Receipt',
  'ID Card',
  'Grayscale',
  'Blueprint'
];

function Scanner(){
  const [file,setFile]=useState(null);
  const [filter,setFilter]=useState('Original');
  const [rotation,setRotation]=useState(0);
  const [busy,setBusy]=useState(false);
  const [cropMode,setCropMode]=useState('auto'); 
  const [crop,setCrop]=useState({x:0,y:0,w:1,h:1});
  const [draggingHandle,setDraggingHandle]=useState(null);
  const canvasRef=useRef(null);
  const imgRef=useRef(null);

  const drawBase=(targetFilter=filter)=>{
    const im=imgRef.current, c=canvasRef.current;
    if(!im||!c)return;

    const rad=rotation*Math.PI/180;
    const sourceW=im.width*crop.w;
    const sourceH=im.height*crop.h;
    const sourceX=im.width*crop.x;
    const sourceY=im.height*crop.y;
    const swap=rotation%180!==0;

    c.width=swap?sourceH:sourceW;
    c.height=swap?sourceW:sourceH;

    const ctx=c.getContext('2d');
    ctx.save();
    ctx.translate(c.width/2,c.height/2);
    ctx.rotate(rad);
    ctx.drawImage(im,sourceX,sourceY,sourceW,sourceH,-sourceW/2,-sourceH/2,sourceW,sourceH);
    ctx.restore();

    if(targetFilter==='Original') return;

    if(targetFilter==='Realistic Clean ✨'){
      applyRealisticDocumentClean(ctx,c,'bw');
      return;
    }
    if(targetFilter==='Magic Color'){
      applyRealisticDocumentClean(ctx,c,'color');
      return;
    }

    const data=ctx.getImageData(0,0,c.width,c.height);
    const d=data.data;

    for(let i=0;i<d.length;i+=4){
      let r=d[i],g=d[i+1],b=d[i+2];
      const lum=0.299*r+0.587*g+0.114*b;

      if(targetFilter==='Grayscale'){
        d[i]=d[i+1]=d[i+2]=lum;
      }else if(targetFilter==='Black & White'){
        const val=lum>148?255:0;
        d[i]=d[i+1]=d[i+2]=val;
      }else if(targetFilter==='Document Crisp'){
        // High-contrast clean paper
        const paper=lum>180?255:lum*0.8;
        d[i]=d[i+1]=d[i+2]=paper;
      }else if(targetFilter==='Receipt'){
        const v=lum>195?255:lum<90?0:lum*0.6;
        d[i]=d[i+1]=d[i+2]=v;
      }else if(targetFilter==='ID Card'){
        // Preserves badge photo vibrancy while normalizing document
        d[i]=Math.min(255,r*1.12);
        d[i+1]=Math.min(255,g*1.12);
        d[i+2]=Math.min(255,b*1.12);
      }else if(targetFilter==='Blueprint'){
        d[i]=15;
        d[i+1]=Math.min(255,lum*0.45+20);
        d[i+2]=Math.min(255,lum*1.2+60);
      }
    }
    ctx.putImageData(data,0,0);
  };

  useEffect(()=>{drawBase(filter)},[file,filter,rotation,crop]);

  const choose=async(fs)=>{
    const f=fs[0];
    if(!f)return;
    setFile(f);
    const im=await loadImage(f);
    imgRef.current=im;
    const detected=detectDocumentCrop(im);
    setCrop(detected);
    setCropMode('auto');
    setTimeout(()=>drawBase('Original'),0);
  };

  const handleAutoCrop=()=>{
    if(!imgRef.current)return;
    setCrop(detectDocumentCrop(imgRef.current));
    setCropMode('auto');
  };

  const handleResetCrop=()=>{
    setCrop({x:0,y:0,w:1,h:1});
    setCropMode('full');
  };

  const applyRealisticMode=()=>{
    if(!file||!imgRef.current)return;
    setBusy(true);
    setTimeout(()=>{
      setFilter('Realistic Clean ✨');
      setBusy(false);
    },100);
  };

  const exportFile=async(type)=>{
    const b=await new Promise(r=>canvasRef.current.toBlob(r,type,0.92));
    downloadBlob(b,type==='image/jpeg'?'scan.jpg':'scan.png');
  };

  const exportPdf=async()=>{
    setBusy(true);
    const b=await new Promise(r=>canvasRef.current.toBlob(r,'image/jpeg',0.92));
    const d=await PDFDocument.create();
    const jpg=await d.embedJpg(await b.arrayBuffer());
    const page=d.addPage([jpg.width*0.5,jpg.height*0.5]);
    page.drawImage(jpg,{x:0,y:0,width:page.getWidth(),height:page.getHeight()});
    downloadBlob(new Blob([await d.save()],{type:'application/pdf'}),'scanned-document.pdf');
    setBusy(false);
  };

  return (
    <div className="scanner">
      <DropZone accept="image/*" onFiles={choose}>
        <ScanLine size={34}/>
        <strong>{file?file.name:'Upload or capture document'}</strong>
        <span>Automatic edge detection, custom manual cropping, and clean realistic restoration</span>
      </DropZone>

      {file&&(
        <>
          <div className="aiPanel">
            <div>
              <div className="eyebrow" style={{display:'flex',alignItems:'center',gap:'4px'}}>
                <Sparkles size={14}/> REALISTIC SCANNER
              </div>
              <h3>Automatic Shadow Removal & Paper Whitening</h3>
              <p>Eliminates uneven phone lighting, flattens background, and boosts ink contrast without distortion.</p>
            </div>
            <button className="aiButton" disabled={busy} onClick={applyRealisticMode}>
              {busy ? 'Enhancing…' : '✨ Apply Realistic Scan'}
              <small>Unlimited free runs</small>
            </button>
          </div>

          {/* Manual & Auto Crop Controls */}
          <div style={{
            display:'flex',
            flexWrap:'wrap',
            alignItems:'center',
            justifyContent:'space-between',
            background:'rgba(255,255,255,0.03)',
            padding:'10px 14px',
            borderRadius:'8px',
            border:'1px solid rgba(255,255,255,0.08)',
            gap:'12px',
            marginTop:'8px'
          }}>
            <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
              <Crop size={18}/>
              <span style={{fontSize:'0.85rem',fontWeight:600}}>Crop Mode:</span>
              <button 
                className={cropMode==='auto'?'primary':''} 
                style={{padding:'4px 10px',fontSize:'0.8rem'}}
                onClick={handleAutoCrop}
              >
                Auto Detect Edges
              </button>
              <button 
                className={cropMode==='full'?'primary':''} 
                style={{padding:'4px 10px',fontSize:'0.8rem'}}
                onClick={handleResetCrop}
              >
                Full Image
              </button>
            </div>

            {/* Quick Inset Sliders for Fine Manual Adjustment */}
            <div style={{display:'flex',alignItems:'center',gap:'10px',fontSize:'0.8rem'}}>
              <span>Fine Crop:</span>
              <label>X: <input type="range" min="0" max="0.4" step="0.01" value={crop.x} onChange={e=>setCrop(c=>({...c,x:+e.target.value}))}/></label>
              <label>Y: <input type="range" min="0" max="0.4" step="0.01" value={crop.y} onChange={e=>setCrop(c=>({...c,y:+e.target.value}))}/></label>
              <label>W: <input type="range" min="0.2" max="1" step="0.01" value={crop.w} onChange={e=>setCrop(c=>({...c,w:+e.target.value}))}/></label>
              <label>H: <input type="range" min="0.2" max="1" step="0.01" value={crop.h} onChange={e=>setCrop(c=>({...c,h:+e.target.value}))}/></label>
            </div>
          </div>

          <div className="filterrow">
            {filters.map(f=>(
              <button 
                key={f} 
                className={`${filter===f?'selected':''} ${f.includes('✨')?'aiFilter':''}`} 
                onClick={()=>setFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="scanpreview">
            <canvas ref={canvasRef}/>
          </div>

          <div className="actions">
            <button onClick={()=>setRotation((rotation+270)%360)}><RotateCcw size={18}/> Rotate left</button>
            <button onClick={()=>setRotation((rotation+90)%360)}><RotateCw size={18}/> Rotate right</button>
            <button className="primary" onClick={()=>exportFile('image/jpeg')}><Download size={18}/> JPG</button>
            <button className="primary" disabled={busy} onClick={exportPdf}><FileText size={18}/> PDF</button>
          </div>
          <div className="notice">100% private. All processing, crop detection, and document enhancements happen inside your browser.</div>
        </>
      )}
    </div>
  );
}

function App(){
  const [active,setActive]=useState(location.hash.slice(1)||'');
  const [query,setQuery]=useState('');
  const [menu,setMenu]=useState(false);
  const open=id=>{setActive(id);location.hash=id;window.scrollTo({top:0,behavior:'smooth'});setMenu(false)};

  useEffect(()=>{
    const fn=()=>setActive(location.hash.slice(1));
    addEventListener('hashchange',fn);
    return()=>removeEventListener('hashchange',fn);
  },[]);

  const shown=useMemo(()=>tools.filter(t=>(t.name+t.desc+t.cat).toLowerCase().includes(query.toLowerCase())),[query]);
  const tool=tools.find(t=>t.id===active);

  const render=()=>{
    if(!tool)return null;
    const back=()=>open('');
    const C=tool.id==='image-compressor'?ImageCompressor:tool.id==='image-resizer'?()=> <ImageResize/>:tool.id==='image-converter'?()=> <ImageResize convert/>:tool.id==='video-compressor'?VideoCompressor:tool.id==='pdf-compressor'?()=> <PdfTool kind="compress"/>:tool.id==='pdf-merger'?()=> <PdfTool kind="merge"/>:tool.id==='pdf-splitter'?()=> <PdfTool kind="split"/>:tool.id==='images-to-pdf'?ImagesToPdf:tool.id==='pdf-to-images'?PdfToImages:Scanner;
    return <ToolShell tool={tool} onBack={back}><C/></ToolShell>;
  };

  return (
    <div className="app">
      <header>
        <button className="brand" onClick={()=>open('')}>
          <span className="brandmark">TF</span>
          <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
            <span>ToolForge <em>AI</em></span>
            <span style={{
              fontSize: '0.72rem',
              fontWeight: 500,
              padding: '2px 8px',
              borderRadius: '9999px',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#9ca3af'
            }}>
              by Sulieman Khan
            </span>
          </div>
        </button>
        <nav>
          <button onClick={()=>document.getElementById('tools')?.scrollIntoView({behavior:'smooth'})}>All tools</button>
          <a href="#privacy">Privacy</a>
        </nav>
        <button className="menubtn" onClick={()=>setMenu(!menu)}>{menu?<X/>:<Menu/>}</button>
      </header>

      {menu&&<div className="mobilemenu"><button onClick={()=>open('')}>All tools</button><a href="#privacy">Privacy</a></div>}

      {active ? render() : (
        <>
          <section className="hero">
            <div className="badge"><ShieldCheck size={16}/> Private by design · Browser-first processing</div>
            <h1>Powerful tools.<br/><span>No complicated software.</span></h1>
            <p>Compress, convert, merge, resize and scan files in seconds — right in your browser.</p>
            <div style={{fontSize: '0.9rem', color: '#9ca3af', marginTop: '-12px', marginBottom: '16px'}}>
              Created with ❤️ by <strong style={{color: '#ffffff'}}>Muhammad Sulieman Khan</strong>
            </div>
            <div className="search"><Search size={20}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="What do you want to do?"/></div>
          </section>

          <section id="tools" className="tools">
            <div className="sectiontitle">
              <div><div className="eyebrow">TOOLKIT</div><h2>{query?`Results for “${query}”`:'Everything you need'}</h2></div>
              <span>{shown.length} tools</span>
            </div>
            <div className="grid">
              {shown.map(t=>{
                const Icon=t.icon;
                return (
                  <button className="card" key={t.id} onClick={()=>open(t.id)}>
                    <div className="cardicon"><Icon size={22}/></div>
                    <div className="cardtext">
                      <h3>{t.name}</h3>
                      <p>{t.desc}</p>
                      <small>{t.cat}</small>
                    </div>
                    <ArrowRight className="arrow" size={19}/>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="trust">
            <div><ShieldCheck/><h3>Your files stay yours.</h3><p>Whenever possible, processing happens locally on your device. No account required.</p></div>
            <div><RefreshCw/><h3>Simple workflow.</h3><p>Upload, adjust, process, download. No bloated desktop software.</p></div>
            <div><Download/><h3>Ready to export.</h3><p>Clean results with clear file sizes and one-click downloads.</p></div>
          </section>
        </>
      )}

      <footer id="privacy">
        <div>
          <span className="brandmark">TF</span>
          <strong>ToolForge AI</strong>
        </div>
        <p>Fast browser tools for everyday files.</p>
        <span>© 2026 ToolForge AI · Created by Muhammad Sulieman Khan · Your files are processed locally whenever possible.</span>
      </footer>
    </div>
  );
}

export default App;
