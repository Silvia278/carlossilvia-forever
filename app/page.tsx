"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

const API_BASE = typeof window !== "undefined" && window.location.hostname.endsWith("github.io")
  ? "https://carlos-silvia-forever.jjtctftr76.chatgpt.site" : "";
const apiUrl = (path:string) => `${API_BASE}${path}`;
const assetUrl = (path:string) => typeof window !== "undefined" && window.location.hostname.endsWith("github.io") ? `/carlossilvia-forever${path}` : path;

type Entry = { id:number; kind:string; author:string; title:string; content:string; mood:string; category:string; eventDate:string; eventTime:string; together:boolean };
type Comment = { id:number; entryId:number; author:string; content:string };
type Memory = { id:number; author:string; title:string; note:string; memoryDate:string; objectKey:string };

const START = new Date("2025-03-15T00:00:00+08:00");
const today = () => new Date().toISOString().slice(0, 10);
const nowTime = () => new Date().toTimeString().slice(0, 5);
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
  const days = Math.max(1, Math.floor((Date.now() - START.getTime()) / 86400000) + 1);

  const request = (path:string, init:RequestInit = {}, authToken = token) => fetch(apiUrl(path), {
    ...init, headers: { ...Object.fromEntries(new Headers(init.headers).entries()), authorization: `Bearer ${authToken}` },
  });
  const refresh = async (authToken = token) => {
    const [a, b] = await Promise.all([request("/api/entries", {}, authToken), request("/api/memories", {}, authToken)]);
    if (a.status === 401 || b.status === 401) { logout(); return; }
    const entryData = await a.json(); const memoryData = await b.json();
    setEntries(entryData.entries ?? []); setComments(entryData.comments ?? []); setMemories(memoryData.memories ?? []);
  };
  useEffect(() => { const savedToken = localStorage.getItem("forever-token") ?? ""; const savedAuthor = localStorage.getItem("forever-author") ?? ""; if (savedToken && savedAuthor) { setToken(savedToken); setAuthor(savedAuthor); refresh(savedToken); } setBooting(false); }, []);
  const logout = () => { localStorage.removeItem("forever-token"); localStorage.removeItem("forever-author"); setToken(""); };
  const dayEntries = useMemo(() => entries.filter(e => e.eventDate === date && e.kind !== "secret"), [entries, date]);
  const secrets = useMemo(() => entries.filter(e => e.kind === "secret").reverse(), [entries]);
  const moveDate = (n:number) => { const d = new Date(`${date}T12:00:00`); d.setDate(d.getDate()+n); setDate(d.toISOString().slice(0,10)); };
  const say = (text:string) => { setNotice(text); setTimeout(()=>setNotice(""), 2500); };

  async function addEntry(event:FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    const body = Object.fromEntries(form); body.author = author; body.eventDate = date; body.together = form.has("together") ? "true" : "";
    const response = await request("/api/entries", { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({ ...body, together:form.has("together") }) });
    if (!response.ok) return say("暂时没有保存成功，请再试一次");
    event.currentTarget.reset(); setComposerOpen(false); await refresh(); say("已经写进你们的故事里了 ♡");
  }
  async function addComment(entryId:number, content:string) {
    if (!content.trim()) return;
    await request("/api/comments", { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({ entryId, content, author }) });
    await refresh();
  }
  async function addMemory(event:FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget); form.set("author", author);
    const response = await request("/api/memories", { method:"POST", body:form });
    if (!response.ok) return say("照片没有上传成功，请检查大小后再试");
    event.currentTarget.reset(); await refresh(); say("新的回忆已收藏 ♡");
  }

  async function login(event:FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoginError(""); const form = new FormData(event.currentTarget);
    const response = await fetch(apiUrl("/api/login"), { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify(Object.fromEntries(form)) });
    const data = await response.json();
    if (!response.ok) { setLoginError(data.error ?? "登录失败，请重试"); return; }
    localStorage.setItem("forever-token", data.token); localStorage.setItem("forever-author", data.username);
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
      <div className="identity"><span>今天是</span><button onClick={logout} title="退出登录"><b className={author.toLowerCase()}>{author[0]}</b>{author} · 退出</button></div>
    </header>

    {tab === "home" && <section className="home">
      <div className="hero-copy">
        <p className="eyebrow">CARLOS & SILVIA · SINCE 15.03.2025</p>
        <h1>世界很大，<br/>而我的坐标是你。</h1>
        <p className="intro">隔着时区分享日落，也在同一本日记里醒来。<br/>这里收藏每一个普通，却因为彼此而特别的日子。</p>
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
        ]).map(e=><article key={e.id} className={`mini-card ${e.author.toLowerCase()}`}><div><b>{e.author[0]}</b><span>{e.author} · {e.eventTime}</span></div><h3>{e.title}</h3><p>{e.content}</p><em>{e.mood}</em></article>)}
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
            <button className="primary" type="submit">添加到今日日记</button>
          </form>}
          <div className="day-list">{dayEntries.length===0?<div className="empty"><span>☼</span><h3>这一天还是空白</h3><p>写下一件小事，让对方参与到你的今天。</p></div>:dayEntries.map(e=><JournalCard key={e.id} entry={e} comments={comments.filter(c=>c.entryId===e.id)} onComment={addComment} />)}</div>
        </>}
        {view === "timeline" && <div className="timeline">{dayEntries.length===0?<div className="empty"><span>⌛</span><h3>今天还没有时间刻度</h3></div>:dayEntries.map(e=><div className="timeline-row" key={e.id}><time>{e.eventTime}</time><i className={e.together?"together":e.author.toLowerCase()}/><JournalCard entry={e} comments={comments.filter(c=>c.entryId===e.id)} onComment={addComment}/></div>)}</div>}
      </div>
    </section>}

    {tab === "memories" && <section className="memories page-section">
      <div className="section-title"><p className="eyebrow">THE DISTANCE BETWEEN US</p><h1>回忆是可以抵达的地方</h1><p>把见过的海、牵过的手，还有每一次重逢，都留在这里。</p></div>
      <form className="upload-card" onSubmit={addMemory}><div><span>＋</span><strong>放进一张新的回忆</strong><small>JPG、PNG、WEBP · 最大 10MB</small></div><input aria-label="选择照片" name="photo" type="file" accept="image/*" required/><input name="title" placeholder="给这段回忆一个名字" required/><input name="memoryDate" type="date" defaultValue={today()} required/><input name="note" placeholder="那天，你最想记住什么？"/><button className="primary">收藏回忆</button></form>
      <div className="photo-grid">{memories.map(m=><figure key={`m-${m.id}`}><img src={apiUrl(`/api/photos/${encodeURIComponent(m.objectKey)}`)} alt={m.title}/><figcaption><small>{m.memoryDate.replaceAll("-",".")}</small><h3>{m.title}</h3><p>{m.note}</p></figcaption></figure>)}{seedMemories.map((m,i)=><figure key={m.src} className={i===0?"wide":""}><img src={m.src} alt={m.title}/><figcaption><small>{m.date}</small><h3>{m.title}</h3><p>{m.note}</p></figcaption></figure>)}</div>
    </section>}

    {tab === "secrets" && <section className="secrets page-section">
      <div className="section-title"><p className="eyebrow">JUST BETWEEN YOU & ME</p><h1>只说给你听</h1><p>有些话不好意思当面说，就折好放进这里，等你来拆。</p></div>
      <form className="secret-form" onSubmit={addEntry}><input type="hidden" name="kind" value="secret"/><input type="hidden" name="eventTime" value={nowTime()}/><input type="hidden" name="mood" value="秘密"/><input type="hidden" name="category" value="Love"/><label>信封上写什么<input name="title" placeholder="比如：等你睡醒再打开" required/></label><label>只给你的话<textarea name="content" placeholder="偷偷告诉你……" required/></label><button className="primary">把悄悄话封好</button></form>
      <div className="letter-grid">{secrets.length===0?<div className="empty"><span>✉</span><h3>第一封信，等你来写</h3><p>它会安静地待在这里，直到对方打开。</p></div>:secrets.map(s=><button className={`letter ${s.author.toLowerCase()} ${openSecret===s.id?"opened":""}`} key={s.id} onClick={()=>setOpenSecret(openSecret===s.id?null:s.id)}><span className="seal">{s.author[0]}</span><small>{s.author} 留给你的 · {s.eventDate}</small><h3>{s.title}</h3>{openSecret===s.id?<p>{s.content}</p>:<em>轻轻点一下，拆开这封信</em>}</button>)}</div>
    </section>}

    {notice && <div className="toast">{notice}</div>}
    <footer><span>S</span><i>∞</i><span>C</span><p>无论相隔多远，我们始终在同一个故事里。</p><small>CARLOS & SILVIA · FOREVER, ON PURPOSE.</small></footer>
  </main>;
}

function JournalCard({entry,comments,onComment}:{entry:Entry;comments:Comment[];onComment:(id:number,value:string)=>void}) {
  const [value,setValue]=useState("");
  return <article className={`journal-card ${entry.together?"together":entry.author.toLowerCase()}`}><div className="card-meta"><b>{entry.together?"我们":entry.author}</b><span>{entry.eventTime} · {entry.category}</span><em>{entry.mood}</em></div><h3>{entry.title}</h3>{entry.content&&<p>{entry.content}</p>}{comments.map(c=><div className="comment" key={c.id}><b>{c.author[0]}</b><span>{c.content}</span></div>)}<form onSubmit={e=>{e.preventDefault();onComment(entry.id,value);setValue("")}}><input aria-label="留言" value={value} onChange={e=>setValue(e.target.value)} placeholder="给对方留句话……"/><button>发送</button></form></article>
}
