"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { strToU8, zipSync } from "fflate";

const API_BASE = typeof window !== "undefined" && window.location.hostname.endsWith("github.io")
  ? "https://carlos-silvia-forever.jjtctftr76.chatgpt.site" : "";
const apiUrl = (path:string) => `${API_BASE}${path}`;
const assetUrl = (path:string) => typeof window !== "undefined" && window.location.hostname.endsWith("github.io") ? `/carlossilvia-forever${path}` : path;

type Entry = { id:number; kind:string; author:string; title:string; content:string; mood:string; category:string; eventDate:string; eventTime:string; together:boolean };
type Comment = { id:number; entryId:number; author:string; content:string };
type Memory = { id:number; author:string; title:string; note:string; memoryDate:string; objectKey:string };

const START = new Date("2025-03-15T00:00:00+08:00");
const singaporeParts = (options:Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-CA", { timeZone:"Asia/Singapore", ...options }).formatToParts(new Date());
const part = (parts:Intl.DateTimeFormatPart[], type:string) => parts.find(item=>item.type===type)?.value ?? "";
const today = () => { const parts=singaporeParts({year:"numeric",month:"2-digit",day:"2-digit"}); return `${part(parts,"year")}-${part(parts,"month")}-${part(parts,"day")}`; };
const nowTime = () => { const parts=singaporeParts({hour:"2-digit",minute:"2-digit",hourCycle:"h23"}); return `${part(parts,"hour")}:${part(parts,"minute")}`; };
const shiftDate = (value:string, amount:number) => { const [year,month,day]=value.split("-").map(Number); return new Date(Date.UTC(year,month-1,day+amount)).toISOString().slice(0,10); };
const utf8Text = (value:string) => { const content=strToU8(value); const result=new Uint8Array(content.length+3); result.set([0xef,0xbb,0xbf]); result.set(content,3); return result; };
const seedMemories = [
  { src:assetUrl("/memories/first-photo.JPG"), title:"第一张属于我们的合照", date:"2025.03.15", note:"故事从这一刻，有了我们。" },
  { src:assetUrl("/memories/polaroid.jpeg"), title:"留在掌心里的我们", date:"2025.09.01", note:"一张小小的拍立得，装下很大的喜欢。" },
  { src:assetUrl("/memories/anniversary.JPG"), title:"我们的第一个周年", date:"2026.03.15", note:"距离没有让爱变淡，它只是让每次见面更珍贵。" },
];

export default function Home() {
  const [tab, setTab] = useState("home");
  const [author, setAuthor] = useState("Silvia");
  const [token, setToken] = useState("");
  const [booting, setBooting] = useState(true);
  const [loginError, setLoginError] = useState("");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [date, setDate] = useState(today());
  const [view, setView] = useState("write");
  const [openSecret, setOpenSecret] = useState<number | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [sending, setSending] = useState("");
  const days = Math.max(0, Math.floor((Date.now() - START.getTime()) / 86400000));

  const request = (path:string, init:RequestInit = {}, authToken = token) => fetch(apiUrl(path), {
    ...init, headers: { ...Object.fromEntries(new Headers(init.headers).entries()), authorization: `Bearer ${authToken}` },
  });
  const refresh = async (authToken = token) => {
    const stamp = Date.now();
    const [a, b] = await Promise.all([request(`/api/entries?refresh=${stamp}`, { cache:"no-store" }, authToken), request(`/api/memories?refresh=${stamp}`, { cache:"no-store" }, authToken)]);
    if (a.status === 401 || b.status === 401) { logout(); return; }
    const entryData = await a.json(); const memoryData = await b.json();
    setEntries(entryData.entries ?? []); setComments(entryData.comments ?? []); setMemories(memoryData.memories ?? []);
  };
  useEffect(() => {
    const savedToken = sessionStorage.getItem("forever-token") ?? "";
    const tokenAuthor = savedToken.split(".")[0];
    if (savedToken && ["Carlos", "Silvia"].includes(tokenAuthor)) {
      setToken(savedToken); setAuthor(tokenAuthor); refresh(savedToken);
    }
    localStorage.removeItem("forever-token"); localStorage.removeItem("forever-author");
    setBooting(false);
  }, []);
  const logout = () => {
    sessionStorage.removeItem("forever-token");
    setToken(""); setEntries([]); setComments([]); setMemories([]); setLoginError("");
  };
  const dayEntries = useMemo(() => entries.filter(e => e.eventDate === date && e.kind !== "secret"), [entries, date]);
  const secrets = useMemo(() => entries.filter(e => e.kind === "secret").reverse(), [entries]);
  const moveDate = (n:number) => setDate(current=>shiftDate(current,n));
  const say = (text:string) => { setNotice(text); setTimeout(()=>setNotice(""), 2500); };
  const errorMessage = async (response:Response, fallback:string) => {
    try { const data = await response.json(); return data.error || fallback; } catch { return fallback; }
  };

  async function addEntry(event:FormEvent<HTMLFormElement>) {
    event.preventDefault(); const target = event.currentTarget; const form = new FormData(target); const isSecret = form.get("kind") === "secret";
    setSending(isSecret ? "secret" : "entry"); say(isSecret ? "正在封好悄悄话……" : "正在保存日记……");
    try {
      const body = Object.fromEntries(form); body.eventDate = date; body.together = form.has("together") ? "true" : "";
      const response = await request("/api/entries", { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({ ...body, together:form.has("together") }) });
      if (!response.ok) return say(await errorMessage(response, "发送失败，请再试一次"));
      target.reset(); setComposerOpen(false); say(isSecret ? "悄悄话发送成功，正在刷新 ♡" : "日记发送成功，正在刷新 ♡"); await refresh();
    } catch { say("网络暂时没有回应，请检查网络后重试"); } finally { setSending(""); }
  }
  async function addComment(entryId:number, content:string) {
    if (!content.trim()) return;
    setSending(`comment-${entryId}`); say("正在发送留言……");
    try {
      const response = await request("/api/comments", { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({ entryId, content }) });
      if (!response.ok) return say(await errorMessage(response, "留言发送失败，请重试"));
      say("留言发送成功，正在刷新 ♡"); await refresh();
    } catch { say("网络暂时没有回应，请检查网络后重试"); } finally { setSending(""); }
  }
  async function addMemory(event:FormEvent<HTMLFormElement>) {
    event.preventDefault(); const target = event.currentTarget; const form = new FormData(target); const file = form.get("photo");
    if (!(file instanceof File) || !file.size) return say("请先选择一张照片");
    setSending("memory"); say(`正在上传 ${file.name}，大照片需要一点时间……`);
    try {
      const response = await request("/api/memories", { method:"POST", body:file, headers:{
        "content-type": file.type || "application/octet-stream",
        "x-file-name": encodeURIComponent(file.name),
        "x-memory-title": encodeURIComponent(String(form.get("title") ?? "")),
        "x-memory-date": String(form.get("memoryDate") ?? ""),
        "x-memory-note": encodeURIComponent(String(form.get("note") ?? "")),
      } });
      if (!response.ok) return say(await errorMessage(response, "照片上传失败，请重试"));
      target.reset(); say("照片上传成功，正在刷新相册 ♡"); await refresh();
    } catch { say("上传中断了，请检查网络后重试"); } finally { setSending(""); }
  }
  async function deleteItem(kind:"entry"|"comment"|"memory", id:number, label:string) {
    if (!window.confirm(`确定删除这${label}吗？删除后无法恢复。`)) return;
    const key = `delete-${kind}-${id}`;
    setSending(key); say(`正在删除${label}……`);
    try {
      const paths = { entry:"/api/entries", comment:"/api/comments", memory:"/api/memories" };
      const response = await request(`${paths[kind]}?id=${id}`, { method:"DELETE" });
      if (!response.ok) return say(await errorMessage(response, `${label}删除失败，请重试`));
      if (kind === "entry" && openSecret === id) setOpenSecret(null);
      say(`${label}删除成功，正在刷新 ♡`); await refresh();
    } catch { say("网络暂时没有回应，请检查网络后重试"); } finally { setSending(""); }
  }
  async function exportBackup() {
    setSending("backup"); say("正在整理全部回忆和原图，请稍候……");
    try {
      const files:Record<string,Uint8Array> = {};
      const backup = { exportedAt:new Date().toISOString(), timeZone:"Asia/Singapore", couple:"Carlos & Silvia", entries, comments, memories };
      files["我们的回忆数据.json"] = strToU8(JSON.stringify(backup,null,2));
      const formatEntries = (items:Entry[],label:string) => items.map(entry=>{
        const replies=comments.filter(comment=>comment.entryId===entry.id).map(comment=>`  ${comment.author} 回复：${comment.content}`).join("\n");
        return `【${label}】${entry.eventDate} ${entry.eventTime} · ${entry.author}\n${entry.title}\n${entry.content}${replies?`\n${replies}`:""}`;
      }).join("\n\n————————————\n\n");
      const diaryText=formatEntries(entries.filter(entry=>entry.kind!=="secret"),"日记");
      const secretText=formatEntries(entries.filter(entry=>entry.kind==="secret"),"悄悄话");
      files["我们的日记.txt"] = utf8Text(diaryText || "还没有写下日记。");
      files["我们的悄悄话.txt"] = utf8Text(secretText || "还没有写下悄悄话。");
      files["备份说明.txt"] = utf8Text("Carlos & Silvia 的完整回忆备份\n\n包含：日记、悄悄话、留言、回忆资料和照片原图。\n所有 TXT 文稿均采用适用于 macOS 的 UTF-8 编码。\n请把这个 ZIP 文件保存在安全的私人网盘或硬盘中，不要公开分享。");
      const safeName=(value:string)=>value.replace(/[\\/:*?\"<>|]/g,"-").slice(0,60) || "回忆";
      for (const memory of memories) {
        const response=await request(`/api/photos/${encodeURIComponent(memory.objectKey)}`,{cache:"no-store"});
        if(!response.ok) throw new Error(`无法读取照片：${memory.title}`);
        const extension=memory.objectKey.match(/\.([a-zA-Z0-9]{2,5})$/)?.[1]?.toLowerCase() || "jpg";
        files[`照片/${memory.memoryDate}-${safeName(memory.title)}-${memory.id}.${extension}`]=new Uint8Array(await response.arrayBuffer());
      }
      for (let index=0;index<seedMemories.length;index++) {
        const memory=seedMemories[index]; const response=await fetch(memory.src,{cache:"no-store"});
        if(!response.ok) throw new Error(`无法读取照片：${memory.title}`);
        const extension=memory.src.match(/\.([a-zA-Z0-9]{2,5})$/)?.[1]?.toLowerCase() || "jpg";
        files[`照片/${memory.date.replaceAll(".","-")}-${safeName(memory.title)}-初始${index+1}.${extension}`]=new Uint8Array(await response.arrayBuffer());
      }
      say("正在生成 ZIP 备份包……");
      const archive=zipSync(files,{level:0}); const url=URL.createObjectURL(new Blob([archive],{type:"application/zip"}));
      const link=document.createElement("a"); link.href=url; link.download=`Carlos-Silvia-全部回忆-${today()}.zip`; document.body.appendChild(link); link.click(); link.remove();
      setTimeout(()=>URL.revokeObjectURL(url),30000); say("全部回忆已成功导出 ♡");
    } catch(error) { say(error instanceof Error?`${error.message}，请重试`:"备份生成失败，请重试"); } finally { setSending(""); }
  }

  async function login(event:FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoginError(""); const form = new FormData(event.currentTarget);
    const response = await fetch(apiUrl("/api/login"), { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify(Object.fromEntries(form)) });
    const data = await response.json();
    if (!response.ok) { setLoginError(data.error ?? "登录失败，请重试"); return; }
    sessionStorage.setItem("forever-token", data.token);
    setToken(data.token); setAuthor(data.username); await refresh(data.token);
  }

  if (booting) return <main className="login-page"><div className="login-card"><p>正在翻开我们的故事……</p></div></main>;
  if (!token) return <main className="login-page"><div className="login-photo"><img src={assetUrl("/memories/polaroid.jpeg")} alt="我们的合照"/><span className="tape"/></div><form className="login-card" onSubmit={login}><div className="login-mark"><span>S</span><i>∞</i><span>C</span></div><p className="eyebrow">OUR PRIVATE UNIVERSE</p><h1>欢迎回到<br/>我们的故事里</h1><p>两座城市，同一本日记。<br/>请选择你是谁，再轻轻推开这扇门。</p><label>你是谁<select name="username" defaultValue="Silvia"><option>Silvia</option><option>Carlos</option></select></label><label>属于我们的密码<input name="password" type="password" autoComplete="current-password" placeholder="输入密码" required/></label>{loginError&&<div className="login-error">{loginError}</div>}<button className="primary" type="submit">进入我们的宇宙 <span>↗</span></button><small>SINCE 15.03.2025 · FOR OUR EYES ONLY</small></form></main>;

  return <main>
    <header className="topbar">
      <button className="wordmark" onClick={()=>setTab("home")}><span>S</span><i>∞</i><span>C</span></button>
      <nav aria-label="主要导航">
        {[["home","我们的宇宙"],["diary","双人日记"],["memories","回忆相册"],["secrets","悄悄话"]].map(([id,label])=><button key={id} className={tab===id?"active":""} onClick={()=>setTab(id)}>{label}</button>)}
      </nav>
      <div className="identity"><span>当前身份</span><button type="button" className="account-button" onClick={logout} aria-label={`当前是 ${author}，点击切换账号`} title="切换账号"><b className={author.toLowerCase()}>{author[0]}</b><span>{author} · 切换账号</span></button></div>
    </header>

    {tab === "home" && <section className="home">
      <div className="hero-copy">
        <p className="eyebrow">CARLOS & SILVIA · SINCE 15.03.2025</p>
        <h1>世界很大，<br/>而我的坐标是你。</h1>
        <p className="intro">隔着国界，却共享同一刻日落，也在同一本日记里醒来。<br/>这里收藏每一个普通，却因为彼此而特别的日子。</p>
        <button className="primary" onClick={()=>{setTab("diary");setComposerOpen(true)}}>写下今天 <span>↗</span></button>
      </div>
      <div className="hero-photo"><img src={assetUrl("/memories/polaroid.jpeg")} alt="Carlos 与 Silvia 的合照"/><span className="tape"/><p>to the moon<br/>& back</p></div>
      <div className="counter-card"><small>WE HAVE BEEN IN LOVE FOR</small><div><strong>{days.toLocaleString()}</strong><span>天</span></div><p>还会有很多很多天 ···</p></div>
      <div className="distance-line"><span>✦</span><i/><p>跨越距离，抵达你</p><i/><span>✦</span></div>
      <div className="recent-block"><div><p className="eyebrow">RECENT MOMENTS</p><h2>刚刚发生的小事</h2></div><button onClick={()=>setTab("diary")}>查看全部 →</button></div>
      <div className="mini-grid">
        {(entries.filter(e=>e.kind!=="secret").slice(-3).reverse().length ? entries.filter(e=>e.kind!=="secret").slice(-3).reverse() : [
          {id:-1,author:"Silvia",title:"今天也很想你",content:"把晚霞拍给你看，就像我们看了同一场日落。",mood:"想念",category:"Love",eventDate:today(),eventTime:"18:26",together:false,kind:"diary"},
          {id:-2,author:"Carlos",title:"晚安电话打了 48 分钟",content:"听见你的声音，一天才算完整。",mood:"开心",category:"日常",eventDate:today(),eventTime:"23:10",together:false,kind:"diary"}
        ]).map(e=><article key={e.id} className={`mini-card ${e.author.toLowerCase()}`}><div><b>{e.author[0]}</b><span>{e.author} · {e.eventTime}</span></div>{e.id>0&&e.author===author&&<button type="button" className="delete-button corner-delete" onClick={()=>deleteItem("entry",e.id,"条日记")} disabled={sending===`delete-entry-${e.id}`}>删除</button>}<h3>{e.title}</h3><p>{e.content}</p><em>{e.mood}</em></article>)}
      </div>
    </section>}

    {tab === "diary" && <section className="diary page-section">
      <div className="section-title"><p className="eyebrow">OUR SHARED JOURNAL</p><h1>同一本日记，两座城市</h1><p>你写下此刻，我就离你的今天更近一点。</p></div>
      <div className="date-switch"><button aria-label="前一天" onClick={()=>moveDate(-1)}>‹</button><div><strong>{new Date(`${date}T12:00:00`).toLocaleDateString("zh-CN",{year:"numeric",month:"long",day:"numeric"})}</strong><span>{new Date(`${date}T12:00:00`).toLocaleDateString("zh-CN",{weekday:"long"})}</span></div><button aria-label="后一天" onClick={()=>moveDate(1)}>›</button></div>
      <div className="journal-shell">
        <div className="view-tabs"><button className={view==="write"?"active":""} onClick={()=>setView("write")}>写日程</button><button className={view==="timeline"?"active":""} onClick={()=>setView("timeline")}>时间轴</button></div>
        {view === "write" && <>
          <button className="add-button" onClick={()=>setComposerOpen(!composerOpen)}>＋ {composerOpen?"收起":"添加今天的记录"}</button>
          {composerOpen && <form className="entry-form" onSubmit={addEntry}>
            <input type="hidden" name="kind" value="diary"/><div className="form-row"><label>时间<input name="eventTime" type="time" defaultValue={nowTime()} required/></label><label>心情<select name="mood"><option>开心</option><option>想念</option><option>平静</option><option>疲惫</option><option>委屈</option><option>期待</option></select></label></div>
            <label>做了什么<input name="title" placeholder="今天发生了什么……" required/></label><label>想说的话<textarea name="content" placeholder="心情、补充，或想让对方知道的话……"/></label>
            <fieldset><legend>分类</legend>{["工作","用餐","运动","约会","家务","休闲","Love","其他"].map(x=><label key={x}><input type="radio" name="category" value={x} defaultChecked={x==="Love"}/><span>{x}</span></label>)}</fieldset>
            <label className="check"><input type="checkbox" name="together"/>这是我们两个人共同完成的</label>
            <button className="primary" type="submit" disabled={!!sending}>{sending==="entry"?"正在保存……":"添加到今日日记"}</button>
          </form>}
          <div className="day-list">{dayEntries.length===0?<div className="empty"><span>☼</span><h3>这一天还是空白</h3><p>写下一件小事，让对方参与到你的今天。</p></div>:dayEntries.map(e=><JournalCard key={e.id} entry={e} comments={comments.filter(c=>c.entryId===e.id)} onComment={addComment} onDelete={deleteItem} currentAuthor={author} sending={sending} />)}</div>
        </>}
        {view === "timeline" && <div className="timeline">{dayEntries.length===0?<div className="empty"><span>⌛</span><h3>今天还没有时间刻度</h3></div>:dayEntries.map(e=><div className="timeline-row" key={e.id}><time>{e.eventTime}</time><i className={e.together?"together":e.author.toLowerCase()}/><JournalCard entry={e} comments={comments.filter(c=>c.entryId===e.id)} onComment={addComment} onDelete={deleteItem} currentAuthor={author} sending={sending}/></div>)}</div>}
      </div>
    </section>}

    {tab === "memories" && <section className="memories page-section">
      <div className="section-title"><p className="eyebrow">THE DISTANCE BETWEEN US</p><h1>回忆是可以抵达的地方</h1><p>把见过的海、牵过的手，还有每一次重逢，都留在这里。</p></div>
      <form className="upload-card" onSubmit={addMemory}><div><span>＋</span><strong>放进一张新的回忆</strong><small>JPG、PNG、HEIC、WEBP · 最大 25MB</small></div><input aria-label="选择照片" name="photo" type="file" accept="image/*,.heic,.heif" required/><input name="title" placeholder="给这段回忆一个名字" required/><input name="memoryDate" type="date" defaultValue={today()} required/><input name="note" placeholder="那天，你最想记住什么？"/><button className="primary" disabled={!!sending}>{sending==="memory"?"照片上传中……":"收藏回忆"}</button></form>
      <div className="photo-grid">{memories.map(m=><figure key={`m-${m.id}`}>{m.author===author&&<button type="button" className="delete-button photo-delete" onClick={()=>deleteItem("memory",m.id,"张照片")} disabled={sending===`delete-memory-${m.id}`}>删除</button>}<ProtectedPhoto memory={m} token={token}/><figcaption><small>{m.memoryDate.replaceAll("-",".")} · {m.author}</small><h3>{m.title}</h3><p>{m.note}</p></figcaption></figure>)}{seedMemories.map((m,i)=><figure key={m.src} className={i===0?"wide":""}><img src={m.src} alt={m.title}/><figcaption><small>{m.date}</small><h3>{m.title}</h3><p>{m.note}</p></figcaption></figure>)}</div>
    </section>}

    {tab === "secrets" && <section className="secrets page-section">
      <div className="section-title"><p className="eyebrow">JUST BETWEEN YOU & ME</p><h1>只说给你听</h1><p>有些话不好意思当面说，就折好放进这里，等你来拆。</p></div>
      <form className="secret-form" onSubmit={addEntry}><input type="hidden" name="kind" value="secret"/><input type="hidden" name="eventTime" value={nowTime()}/><input type="hidden" name="mood" value="秘密"/><input type="hidden" name="category" value="Love"/><label>信封上写什么<input name="title" placeholder="比如：等你睡醒再打开" required/></label><label>只给你的话<textarea name="content" placeholder="偷偷告诉你……" required/></label><button className="primary" disabled={!!sending}>{sending==="secret"?"正在发送……":"把悄悄话封好"}</button></form>
      <div className="letter-grid">{secrets.length===0?<div className="empty"><span>✉</span><h3>第一封信，等你来写</h3><p>它会安静地待在这里，直到对方打开。</p></div>:secrets.map(s=><article className={`letter ${s.author.toLowerCase()} ${openSecret===s.id?"opened":""}`} key={s.id}><button type="button" className="letter-main" onClick={()=>setOpenSecret(openSecret===s.id?null:s.id)}><span className="seal">{s.author[0]}</span><small>{s.author} 留给你的 · {s.eventDate}</small><h3>{s.title}</h3>{openSecret===s.id?<p>{s.content}</p>:<em>轻轻点一下，拆开这封信</em>}</button>{s.author===author&&<button type="button" className="delete-button letter-delete" onClick={()=>deleteItem("entry",s.id,"封悄悄话")} disabled={sending===`delete-entry-${s.id}`}>删除</button>}</article>)}</div>
    </section>}

    {notice && <div className="toast">{notice}</div>}
    <footer><span>S</span><i>∞</i><span>C</span><p>无论相隔多远，我们始终在同一个故事里。</p><button type="button" className="backup-button" onClick={exportBackup} disabled={!!sending}>{sending==="backup"?"正在整理全部回忆……":"↓ 导出全部回忆"}</button><small>CARLOS & SILVIA · FOREVER, ON PURPOSE.</small></footer>
  </main>;
}

function ProtectedPhoto({memory,token}:{memory:Memory;token:string}) {
  const [src,setSrc]=useState("");
  const [failed,setFailed]=useState(false);
  useEffect(()=>{
    let objectUrl=""; let cancelled=false;
    setSrc(""); setFailed(false);
    fetch(apiUrl(`/api/photos/${encodeURIComponent(memory.objectKey)}`), { headers:{authorization:`Bearer ${token}`}, cache:"no-store" })
      .then(response=>{if(!response.ok)throw new Error("photo");return response.blob()})
      .then(blob=>{if(cancelled)return;objectUrl=URL.createObjectURL(blob);setSrc(objectUrl)})
      .catch(()=>{if(!cancelled)setFailed(true)});
    return ()=>{cancelled=true;if(objectUrl)URL.revokeObjectURL(objectUrl)};
  },[memory.objectKey,token]);
  if (failed) return <div className="photo-loading">照片读取失败，请刷新重试</div>;
  if (!src) return <div className="photo-loading">正在安全读取照片…</div>;
  return <img src={src} alt={memory.title}/>;
}

function JournalCard({entry,comments,onComment,onDelete,currentAuthor,sending}:{entry:Entry;comments:Comment[];onComment:(id:number,value:string)=>Promise<void>;onDelete:(kind:"entry"|"comment"|"memory",id:number,label:string)=>Promise<void>;currentAuthor:string;sending:string}) {
  const [value,setValue]=useState("");
  const commenting=sending===`comment-${entry.id}`;
  return <article className={`journal-card ${entry.together?"together":entry.author.toLowerCase()}`}><div className="card-meta"><b>{entry.together?"我们":entry.author}</b><span>{entry.eventTime} · {entry.category}</span><em>{entry.mood}</em>{entry.author===currentAuthor&&<button type="button" className="delete-button" onClick={()=>onDelete("entry",entry.id,"条日记")} disabled={sending===`delete-entry-${entry.id}`}>删除</button>}</div><h3>{entry.title}</h3>{entry.content&&<p>{entry.content}</p>}{comments.map(c=><div className="comment" key={c.id}><b>{c.author[0]}</b><span>{c.content}</span>{c.author===currentAuthor&&<button type="button" className="delete-button comment-delete" onClick={()=>onDelete("comment",c.id,"条留言")} disabled={sending===`delete-comment-${c.id}`}>删除</button>}</div>)}<form onSubmit={async e=>{e.preventDefault();if(!value.trim())return;await onComment(entry.id,value);setValue("")}}><input aria-label="留言" value={value} onChange={e=>setValue(e.target.value)} placeholder="给对方留句话……" disabled={commenting}/><button disabled={commenting}>{commenting?"发送中……":"发送"}</button></form></article>
}
