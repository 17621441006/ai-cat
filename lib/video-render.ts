import {type VideoAsset,type VideoProject,duration} from './video-workbench';

export function wrapVideoText(ctx:CanvasRenderingContext2D,text:string,maxWidth:number){const lines:string[]=[];let line='';for(const char of text){if(char==='\n'){lines.push(line);line='';continue}if(ctx.measureText(line+char).width>maxWidth&&line){lines.push(line);line=char}else line+=char}if(line)lines.push(line);return lines}
export function drawVideoFrame(canvas:HTMLCanvasElement,video:HTMLVideoElement|null,project:VideoProject,time:number){
 const ctx=canvas.getContext('2d');if(!ctx)return;const w=canvas.width,h=canvas.height;
 ctx.fillStyle='#101722';ctx.fillRect(0,0,w,h);
 if(video?.readyState&&video.videoWidth){const scale=Math.min(w/video.videoWidth,h/video.videoHeight),vw=video.videoWidth*scale,vh=video.videoHeight*scale;ctx.drawImage(video,(w-vw)/2,(h-vh)/2,vw,vh)}
 const box=(text:string,y:number,font:number,title=false)=>{ctx.font=`${title?'600':'500'} ${font}px system-ui,"Microsoft YaHei",sans-serif`;const lines=wrapVideoText(ctx,text,w*.86);const lh=font*1.4,bh=lines.length*lh+font*.7,bw=Math.min(w*.94,Math.max(...lines.map(l=>ctx.measureText(l).width))+font*1.6);ctx.fillStyle=title?'rgba(14,27,46,.88)':'rgba(8,14,23,.8)';ctx.fillRect((w-bw)/2,y,bw,bh);ctx.fillStyle='#fff';ctx.textAlign='center';ctx.textBaseline='top';lines.forEach((line,i)=>ctx.fillText(line,w/2,y+font*.35+i*lh));};
 if(project.title.trim()&&time<project.titleEnd)box(project.title,h*.06,w*.028,true);
 if(project.showCaptions){const captions=project.captions.filter(c=>time>=c.start&&time<c.end).map(c=>c.text).join('\n');if(captions){ctx.font=`500 ${w*.024}px system-ui`;const lines=wrapVideoText(ctx,captions,w*.86);box(captions,project.captionPosition==='top'?(project.title.trim()&&time<project.titleEnd?h*.20:h*.07):Math.max(h*.1,h*.88-lines.length*w*.024*1.4),w*.024)}}
}

function canceled(){return new DOMException('已取消导出','AbortError')}
async function waitMedia(media:HTMLMediaElement,event:string,signal?:AbortSignal){return new Promise<void>((resolve,reject)=>{const done=()=>{clean();resolve()},fail=()=>{clean();reject(new Error('素材无法读取，请确认文件可播放，或转为 H.264 MP4 后重试。'))},abort=()=>{clean();reject(canceled())},timer=setTimeout(fail,20000);function clean(){clearTimeout(timer);media.removeEventListener(event,done);media.removeEventListener('error',fail);signal?.removeEventListener('abort',abort)}media.addEventListener(event,done,{once:true});media.addEventListener('error',fail,{once:true});signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort()})}
export async function loadMedia(media:HTMLMediaElement,src:string,signal?:AbortSignal){if(media.getAttribute('src')===src&&media.readyState>=2)return;media.src=src;media.load();if(media.readyState<2)await waitMedia(media,'loadeddata',signal)}
export async function seekMedia(media:HTMLMediaElement,time:number,signal?:AbortSignal){if(Math.abs(media.currentTime-time)<.015)return;media.currentTime=time;await waitMedia(media,'seeked',signal)}
export function recordingType(){if(typeof MediaRecorder==='undefined')return null;return ['video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/webm;codecs=vp8,opus','video/webm'].find(t=>MediaRecorder.isTypeSupported(t))??null}

/** Real-time, on-device rendering of moving video and editable text/audio tracks. */
export async function exportVideo(project:VideoProject,assets:VideoAsset[],onProgress:(value:number)=>void,signal:AbortSignal):Promise<{blob:Blob;extension:string}>{
 const mime=recordingType();if(!mime)throw new Error('当前浏览器不支持视频导出。请用桌面版 Chrome / Edge，或下载剪辑清单与字幕继续编辑。');
 const total=duration(project.clips);if(total<=0||total>120)throw new Error('请保留视频片段，并把总长控制在 120 秒内。');
 if(project.showCaptions&&project.captions.some(c=>c.start<0||c.end<=c.start||c.end>total+.01))throw new Error('有字幕超出片长或结束早于开始，请返回“字幕与校对”调整后导出。');
 const canvas=document.createElement('canvas');canvas.width=1280;canvas.height=720;
 const video=document.createElement('video');video.playsInline=true;video.preload='auto';video.crossOrigin='anonymous';
 const ctx=new AudioContext();const destination=ctx.createMediaStreamDestination();const originalGain=ctx.createGain();originalGain.gain.value=project.originalVolume;ctx.createMediaElementSource(video).connect(originalGain).connect(destination);
 const sounds=project.sounds.map(sound=>{const element=document.createElement('audio');element.crossOrigin='anonymous';element.preload='auto';const gain=ctx.createGain();gain.gain.value=sound.volume;ctx.createMediaElementSource(element).connect(gain).connect(destination);return {sound,element,gain}});
 let recorder:MediaRecorder|undefined;let stream:MediaStream|undefined;const chunks:BlobPart[]=[];
 const stop=()=>{video.pause();sounds.forEach(s=>s.element.pause())};
 const abort=()=>stop();signal.addEventListener('abort',abort,{once:true});
 try{
  await ctx.resume();await document.fonts.ready;
  for(const {sound,element} of sounds)await loadMedia(element,sound.src,signal);
  stream=canvas.captureStream(30);for(const track of destination.stream.getAudioTracks())stream.addTrack(track);
  recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:3500000,audioBitsPerSecond:128000});
  let recordingError:Error|null=null;recorder.addEventListener('dataavailable',event=>{if(event.data.size)chunks.push(event.data)});recorder.addEventListener('error',()=>{recordingError=new Error('浏览器中断了录制，请重试或缩短成片。')});
  let elapsed=0;
  for(const clip of project.clips){
   if(signal.aborted)throw canceled();const asset=assets.find(a=>a.id===clip.assetId);if(!asset)throw new Error('缺少片段素材，请重新添加。');
   await loadMedia(video,asset.src,signal);await seekMedia(video,clip.in,signal);drawVideoFrame(canvas,video,project,elapsed);
   for(const {sound,element} of sounds){const target=elapsed-sound.start;if(target>=0&&target<sound.duration)await seekMedia(element,target,signal)}
   if(recorder.state==='inactive')recorder.start(200);else if(recorder.state==='paused')recorder.resume();
   await video.play();
   await new Promise<void>((resolve,reject)=>{let raf=0;const cancel=()=>{cancelAnimationFrame(raf);signal.removeEventListener('abort',cancel);reject(canceled())};signal.addEventListener('abort',cancel,{once:true});const done=(error?:Error)=>{cancelAnimationFrame(raf);signal.removeEventListener('abort',cancel);if(error)reject(error);else resolve()};const frame=()=>{if(signal.aborted){cancel();return}if(recordingError){done(recordingError);return}if(video.error){done(new Error('读取视频失败，请重试。'));return}const local=Math.max(0,video.currentTime-clip.in),time=elapsed+Math.min(local,clip.out-clip.in);drawVideoFrame(canvas,video,project,time);onProgress(Math.min(99,time/total*100));for(const {sound,element} of sounds){const target=time-sound.start;if(target>=0&&target<sound.duration){if(element.paused){element.currentTime=target;void element.play().catch(()=>done(new Error('音轨无法播放，请换用 MP3 / WAV。')))}}else element.pause()}if(video.currentTime>=clip.out-.025||video.ended){done();return}raf=requestAnimationFrame(frame)};raf=requestAnimationFrame(frame)});
   stop();recorder.pause();elapsed+=clip.out-clip.in;
  }
  const finished=new Promise<void>(resolve=>recorder!.addEventListener('stop',()=>resolve(),{once:true}));recorder.stop();await finished;
  if(signal.aborted)throw canceled();if(recordingError)throw recordingError;if(!chunks.length)throw new Error('没有生成视频内容，请重试。');
  let blob=new Blob(chunks,{type:mime.split(';')[0]});
  if(mime.startsWith('video/webm')){const {fixWebmDuration}=await import('@fix-webm-duration/fix');blob=await fixWebmDuration(blob,total*1000,{logger:false})}
  if(signal.aborted)throw canceled();onProgress(100);return {blob,extension:mime.startsWith('video/mp4')?'mp4':'webm'};
 }finally{
  stop();if(recorder&&recorder.state!=='inactive')recorder.stop();stream?.getTracks().forEach(t=>t.stop());video.removeAttribute('src');video.load();sounds.forEach(({element})=>{element.removeAttribute('src');element.load()});await ctx.close().catch(()=>{});signal.removeEventListener('abort',abort);
 }
}
