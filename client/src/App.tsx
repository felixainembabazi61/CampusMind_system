import { FormEvent, useEffect, useState } from 'react';
import {
  Home, CalendarDays, FileText, BookOpen, MessageCircle, Users, Activity,
  Settings, LogOut, Menu, X, ShieldCheck, Plus, Search, Send, CheckCircle2,
  Clock, UserRound, Sparkles, ClipboardList, HeartHandshake
} from 'lucide-react';
import { api, post, patch, del } from './api';

type Role='student'|'counselor'|'peer_mentor'|'administrator';
type User={id:number;fullName:string;email:string;role:Role;department?:string|null;studentNumber?:string|null};
type Page='Overview'|'Appointments'|'Intake forms'|'Peer stories'|'Community forum'|'Messages'|'Counselors'|'User Management'|'Reports'|'Settings';
const nav:{page:Page;roles:Role[];icon:any}[]=[
  {page:'Overview',roles:['student','counselor','peer_mentor','administrator'],icon:Home},
  {page:'Appointments',roles:['student','counselor','administrator'],icon:CalendarDays},
  {page:'Intake forms',roles:['student','counselor','administrator'],icon:FileText},
  {page:'Peer stories',roles:['student','peer_mentor','administrator'],icon:BookOpen},
  {page:'Community forum',roles:['student','counselor','peer_mentor','administrator'],icon:MessageCircle},
  {page:'Messages',roles:['student','counselor','administrator'],icon:MessageCircle},
  {page:'Counselors',roles:['student','administrator'],icon:Users},
  {page:'User Management',roles:['administrator'],icon:ShieldCheck},
  {page:'Reports',roles:['administrator'],icon:Activity},
  {page:'Settings',roles:['student','counselor','peer_mentor','administrator'],icon:Settings}
];
const roleName:Record<Role,string>={student:'Student',counselor:'Counselor',peer_mentor:'Peer Mentor',administrator:'Administrator'};
function App(){
  const [user,setUser]=useState<User|null>(null);
  const [checking,setChecking]=useState(true);
  const [page,setPage]=useState<Page>('Overview');
  const [mobile,setMobile]=useState(false);
  const [toast,setToast]=useState('');
  const [busy,setBusy]=useState(false);
  const [data,setData]=useState<any>({});
  const [modal,setModal]=useState('');
  const [search,setSearch]=useState('');
  const [activeConversation,setActiveConversation]=useState<number|null>(null);
  const [message,setMessage]=useState('');
  const [loginMode,setLoginMode]=useState<'login'|'register'>('login');

  const notify=(s:string)=>{setToast(s);window.setTimeout(()=>setToast(''),3500)};
  const load=async(p:Page)=>{
    if(!user)return;
    setBusy(true);
    try{
      if(p==='Overview'){
        const calls:any[]=[];
        if(user.role==='administrator') calls.push(api('/reports/summary').then(x=>({summary:x})));
        if(['student','counselor','administrator'].includes(user.role)){
          calls.push(api('/appointments').then(x=>({appointments:x.appointments})));
          calls.push(api('/intakes').then(x=>({intakes:x.requests})));
        }
        calls.push(api('/community/stories').then(x=>({stories:x.stories})));
        calls.push(api('/community/posts').then(x=>({posts:x.posts})));
        const parts=await Promise.all(calls);setData((old:any)=>Object.assign({},old,...parts));
      }else if(p==='Appointments'){const x=await api('/appointments');setData((o:any)=>({...o,appointments:x.appointments}));}
      else if(p==='Intake forms'){
        const x=await api('/intakes');
        let counselors:any[]=[];
        if(user.role==='administrator'){
          const c=await api('/users/counselors');counselors=c.counselors;
        }
        setData((o:any)=>({...o,intakes:x.requests,counselors}));
      }
      else if(p==='Peer stories'){
        const x=await api('/community/stories');
        let pending:any[]=[];
        if(['peer_mentor','administrator'].includes(user.role)){
          const q=await api('/community/stories/pending');pending=q.stories;
        }
        setData((o:any)=>({...o,stories:x.stories,pendingStories:pending}));
      }
      else if(p==='Community forum'){const x=await api('/community/posts');setData((o:any)=>({...o,posts:x.posts}));}
      else if(p==='Counselors'){const x=await api('/users/counselors');setData((o:any)=>({...o,counselors:x.counselors}));}
      else if(p==='User Management'){const x=await api('/users');setData((o:any)=>({...o,users:x.users}));}
      else if(p==='Reports'){const x=await api('/reports/summary');setData((o:any)=>({...o,summary:x}));}
      else if(p==='Messages'){const x=await api('/messages/conversations');setData((o:any)=>({...o,conversations:x.conversations}));}
    }catch(e:any){notify(e.message);}
    finally{setBusy(false);}
  };
  useEffect(()=>{api('/auth/me').then(x=>setUser(x.user)).catch(()=>setUser(null)).finally(()=>setChecking(false));},[]);
  useEffect(()=>{if(user)load(page);},[user,page]);
  const signOut=async()=>{try{await post('/auth/logout',{});}finally{setUser(null);setData({});setPage('Overview');}};
  
const submitAuth = async (e: FormEvent<HTMLFormElement>) => {
  e.preventDefault();

  const form = e.currentTarget;
  const f = new FormData(form);
  const body = Object.fromEntries(f.entries());

  setBusy(true);

  try {
    if (loginMode === 'register') {
      // Create the student account.
      await post('/auth/register', body);

      // Return the user to the sign-in form.
      form.reset();
      setLoginMode('login');
      notify('Registration successful! Please sign in to continue.');
      return;
    }

    // Authenticate the user.
    await post('/auth/login', body);

    // Verify that the authentication cookie works.
    const session = await api('/auth/me');
    console.log('AUTH SESSION RESPONSE:', session);
console.log('AUTHENTICATED USER:', session.user);

setUser(session.user);
setPage('Overview');

console.log('Dashboard transition requested');
notify('Welcome to CampusMind.');

    // Load the authenticated user into the application.
    setUser(session.user);
    setPage('Overview');

    notify('Welcome to CampusMind.');
  } catch (err: any) {
    notify(err.message || 'Authentication failed. Please try again.');
  } finally {
    setBusy(false);
  }
};

  const submitModal=async(e:FormEvent<HTMLFormElement>)=>{
    e.preventDefault();const f=new FormData(e.currentTarget);const v=Object.fromEntries(f.entries());
    setBusy(true);
    try{
      if(modal==='appointment')await post('/appointments',{...v,counselorId:Number(v.counselorId)});
      if(modal==='intake')await post('/intakes',v);
      if(modal==='story')await post('/community/stories',v);
      if(modal==='post')await post('/community/posts',v);
      if(modal==='staff')await post('/users',{...v});
      if(modal==='conversation'){
        const result=await post('/messages/conversations',{counselorId:Number(v.counselorId)});
        setActiveConversation(result.conversationId);
      }
      setModal('');notify('Saved successfully.');load(page);
    }catch(err:any){notify(err.message);}finally{setBusy(false);}
  };
  const changeAppointment=async(id:number,status:string)=>{
    try{await patch(`/appointments/${id}/status`,{status});notify('Appointment updated.');load(page);}
    catch(e:any){notify(e.message);}
  };
  const updateIntake=async(id:number,status:string,assigned?:number)=>{
    try{await patch(`/intakes/${id}`,{status,assignedCounselorId:assigned||null});notify('Support request updated.');load(page);}
    catch(e:any){notify(e.message);}
  };
  const moderateStory=async(id:number,status:string)=>{
    try{await patch(`/community/stories/${id}/moderate`,{status});notify('Story moderation updated.');load(page);}
    catch(e:any){notify(e.message);}
  };
  const sendMessage=async(e:FormEvent)=>{
    e.preventDefault();if(!activeConversation||!message.trim())return;
    try{await post(`/messages/conversations/${activeConversation}/messages`,{body:message.trim()});setMessage('');notify('Message sent.');}
    catch(err:any){notify(err.message);}
  };

  if(checking)return <div className="center-screen"><div className="brand-mark"><Sparkles/></div><p>Loading CampusMind…</p></div>;
  if(!user)return <div className="auth-shell"><div className="auth-art"><div className="brand"><div className="brand-mark"><Sparkles/></div><div><b>campus<span>mind</span></b><small>STUDENT WELLNESS HUB</small></div></div><div className="auth-copy"><span>✦ A SPACE TO PAUSE & GROW</span><h1>You deserve support<br/>at every step.</h1><p>A thoughtful campus community where students can find guidance, connection and support.</p><div className="auth-note"><HeartHandshake/><span>Support starts with a conversation.</span></div></div><small className="auth-foot">CampusMind · Fictional university system prototype</small></div><div className="auth-form-wrap"><form className="auth-form" onSubmit={submitAuth}><span className="eyebrow">WELCOME TO CAMPUSMIND</span><h2>{loginMode==='login'?'Sign in to your account':'Create your student account'}</h2><p>{loginMode==='login'?'Continue to your university support workspace.':'Student self-registration. Staff roles are assigned by administrators.'}</p>{loginMode==='register'&&<><label>Full name<input name="fullName" required minLength={2} maxLength={120}/></label><label>Student number (optional)<input name="studentNumber" maxLength={60}/></label><label>Department (optional)<input name="department" maxLength={120}/></label></>}<label>Email address<input name="email" type="email" required autoComplete="username"/></label><label>Password<input name="password" type="password" required minLength={10} autoComplete={loginMode==='login'?'current-password':'new-password'}/></label><button className="btn primary wide" disabled={busy}>{busy?'Please wait…':loginMode==='login'?'Sign in →':'Create account →'}</button><button type="button" className="text-btn" onClick={()=>setLoginMode(loginMode==='login'?'register':'login')}>{loginMode==='login'?"New student? Create an account":"Already registered? Sign in"}</button><div className="privacy"><ShieldCheck size={16}/> Your account is authenticated by the CampusMind server. Never share your password.</div></form></div>{toast&&<div className="toast">{toast}</div>}</div>;

  const visibleNav=nav.filter(n=>n.roles.includes(user.role));
  const title=page==='Overview'?`Welcome, ${user.fullName.split(' ')[0]}`:page;
  const filtered=(items:any[])=>items?.filter(x=>JSON.stringify(x).toLowerCase().includes(search.toLowerCase()))||[];
  const Modal=()=>modal&&<div className="modal-backdrop" onClick={e=>{if(e.target===e.currentTarget)setModal('');}}><div className="modal"><div className="modal-head"><div><span className="eyebrow">CAMPUSMIND WORKSPACE</span><h2>{({appointment:'Request an appointment',intake:'New support request',story:'Share a peer story',post:'Start a discussion',staff:'Create staff account'} as any)[modal]}</h2></div><button className="icon-btn" onClick={()=>setModal('')}><X/></button></div><form onSubmit={submitModal}>
    {modal==='appointment'&&<><label>Counselor<select name="counselorId" required>{(data.counselors||[]).map((c:any)=><option value={c.id} key={c.id}>{c.fullName}</option>)}</select></label><label>Date<input name="date" type="date" min={new Date().toISOString().slice(0,10)} required/></label><label>Time<input name="time" type="time" required/></label><label>Format<select name="mode"><option value="in_person">In person</option><option value="online">Online</option></select></label><label>Reason category<select name="category">{['Academic support','Personal development','Social adjustment','Study skills','Other'].map(x=><option>{x}</option>)}</select></label><label>Optional note<textarea name="note" maxLength={1000}/></label></>}
    {modal==='intake'&&<><label>Topic<input name="topic" required maxLength={100}/></label><label>Priority<select name="priority"><option value="normal">Normal</option><option value="timely">Prefer a timely response</option></select></label><label>Details<textarea name="details" required minLength={12} maxLength={5000}/></label></>}
    {(modal==='story'||modal==='post')&&<><label>Title<input name="title" required minLength={4} maxLength={180}/></label><label>Category<select name="category">{(modal==='story'?['Finding balance','Study skills','Campus life','Personal growth']:['Study & academic life','Campus connections','Personal growth','Student support']).map(x=><option>{x}</option>)}</select></label><label>Message<textarea name="body" required minLength={12} maxLength={5000}/></label></>}
    {modal==='conversation'&&<label>Counselor<select name="counselorId" required>{(data.counselors||[]).map((c:any)=><option value={c.id} key={c.id}>{c.fullName}</option>)}</select></label>}
    {modal==='staff'&&<><label>Full name<input name="fullName" required maxLength={120}/></label><label>Email<input name="email" type="email" required/></label><label>Temporary password<input name="password" type="password" minLength={10} required/></label><label>Role<select name="role"><option value="counselor">Counselor</option><option value="peer_mentor">Peer mentor</option><option value="administrator">Administrator</option></select></label><label>Department<input name="department" maxLength={120}/></label></>}
    <button className="btn primary wide" disabled={busy}>{busy?'Saving…':'Save →'}</button></form></div></div>;

  return <div className="app-shell"><aside className={`sidebar ${mobile?'open':''}`}><div className="brand"><div className="brand-mark"><Sparkles/></div><div><b>campus<span>mind</span></b><small>STUDENT WELLNESS HUB</small></div><button className="mobile-close" onClick={()=>setMobile(false)}><X/></button></div><div className="university">●　Northbridge University</div><div className="nav-label">WORKSPACE</div>{visibleNav.map(n=><button key={n.page} className={`nav-item ${page===n.page?'active':''}`} onClick={()=>{setPage(n.page);setMobile(false);setSearch('');}}><n.icon size={17}/>{n.page}</button>)}<div className="sidebar-help"><ShieldCheck/><b>Support with care</b><p>Access campus counseling and peer-support services.</p></div><div className="sidebar-user"><div className="avatar">{user.fullName.split(' ').map(x=>x[0]).slice(0,2).join('')}</div><div><b>{user.fullName}</b><small>{roleName[user.role]}</small></div><button className="logout" onClick={signOut} title="Sign out"><LogOut size={16}/></button></div></aside>
  {mobile&&<button className="mobile-backdrop" onClick={()=>setMobile(false)}/>}
  <main className="main"><header className="topbar"><button className="hamb" onClick={()=>setMobile(true)}><Menu/></button><div className="crumb">CampusMind　/　<b>{page}</b></div><div className="top-actions"><div className="search"><Search size={15}/><input placeholder="Search this page…" value={search} onChange={e=>setSearch(e.target.value)}/></div><span className="role-pill">{roleName[user.role]}</span><div className="avatar">{user.fullName.split(' ').map(x=>x[0]).slice(0,2).join('')}</div></div></header>
  <div className="content"><div className="page-heading"><div><span className="eyebrow">CAMPUSMIND · {roleName[user.role].toUpperCase()}</span><h1>{title}</h1><p>{page==='Overview'?'A little progress each day adds up to a lot.':`Manage ${page.toLowerCase()} in your university support workspace.`}</p></div>{busy&&<span className="loading">Refreshing…</span>}</div>

  {page==='Overview'&&<><section className="hero"><div><span>✦　A SPACE TO PAUSE & GROW</span><h2>You deserve support<br/>at every step.</h2><p>Whether you need a listening ear, a fresh perspective, or a little direction, your campus community is here.</p>{user.role==='student'&&<button className="btn light" onClick={async()=>{await load('Counselors');setPage('Counselors');}}>Explore support →</button>}</div><div className="hero-symbol">✳</div></section><div className="stats">{(user.role==='administrator'?[['Active users',data.summary?.users??'—'],['Students',data.summary?.students??'—'],['Open appointments',data.summary?.activeAppointments??'—'],['Open intakes',data.summary?.openIntakes??'—']]:[['Appointments',data.appointments?.length??'—'],['Support requests',data.intakes?.length??'—'],['Peer stories',data.stories?.length??'—'],['Community discussions',data.posts?.length??'—']]).map(([label,value])=><div className="stat"><span>{label}</span><b>{value}</b><small>Live database records</small></div>)}</div><div className="panel-grid"><section className="panel"><div className="panel-title"><div><h3>Recent appointments</h3><p>Current schedule from the database.</p></div><button className="link-btn" onClick={()=>setPage('Appointments')}>View all →</button></div>{(data.appointments||[]).slice(0,4).map((a:any)=><div className="list-row"><CalendarDays/><div><b>{a.student_name||'Your appointment'} · {a.counselor_name}</b><small>{String(a.appointment_date).slice(0,10)} · {String(a.appointment_time).slice(0,5)} · {a.status}</small></div></div>)}{!data.appointments?.length&&<p className="empty">No appointment records yet.</p>}</section><section className="panel"><div className="panel-title"><div><h3>Quick actions</h3><p>Go directly to a workspace.</p></div></div>{user.role==='student'&&<><button className="quick-action" onClick={()=>{setPage('Counselors');}}><Users/> Find a counselor <span>→</span></button><button className="quick-action" onClick={()=>setModal('intake')}><FileText/> Submit a support request <span>→</span></button><button className="quick-action" onClick={()=>setModal('appointment')}><CalendarDays/> Request an appointment <span>→</span></button></>}{user.role==='administrator'&&<><button className="quick-action" onClick={()=>setModal('staff')}><Plus/> Create staff account <span>→</span></button><button className="quick-action" onClick={()=>setPage('User Management')}><Users/> Manage users <span>→</span></button><button className="quick-action" onClick={()=>setPage('Reports')}><Activity/> View reports <span>→</span></button></>}{user.role==='counselor'&&<><button className="quick-action" onClick={()=>setPage('Appointments')}><CalendarDays/> Review appointments <span>→</span></button><button className="quick-action" onClick={()=>setPage('Intake forms')}><FileText/> Review assigned intakes <span>→</span></button></>}{user.role==='peer_mentor'&&<button className="quick-action" onClick={()=>setPage('Peer stories')}><BookOpen/> Moderate peer stories <span>→</span></button>}</section></div></>}

  {page==='Appointments'&&<section className="panel"><div className="panel-title"><div><h3>Appointment management</h3><p>Only records you are authorized to access are shown.</p></div>{user.role==='student'&&<button className="btn primary" onClick={async()=>{const x=await api('/users/counselors');setData((o:any)=>({...o,counselors:x.counselors}));setModal('appointment');}}>＋ Request appointment</button>}</div><div className="table-wrap"><table><thead><tr><th>STUDENT</th><th>COUNSELOR</th><th>DATE & TIME</th><th>FORMAT</th><th>STATUS</th><th>ACTION</th></tr></thead><tbody>{filtered(data.appointments||[]).map((a:any)=><tr><td>{a.student_name}</td><td>{a.counselor_name}</td><td>{String(a.appointment_date).slice(0,10)}<small>{String(a.appointment_time).slice(0,5)}</small></td><td>{a.session_mode}</td><td><span className="status">{a.status}</span></td><td>{user.role==='counselor'&&a.status==='pending'&&<><button className="tiny-btn" onClick={()=>changeAppointment(a.id,'approved')}>Approve</button> <button className="tiny-btn danger" onClick={()=>changeAppointment(a.id,'declined')}>Decline</button></>}{user.role==='student'&&['pending','approved'].includes(a.status)&&<button className="tiny-btn danger" onClick={()=>del(`/appointments/${a.id}`).then(()=>load(page)).catch((e:any)=>notify(e.message))}>Cancel</button>}</td></tr>)}</tbody></table>{!data.appointments?.length&&<p className="empty">No appointments found.</p>}</div></section>}

  {page==='Intake forms'&&<section className="panel"><div className="panel-title"><div><h3>Support intake requests</h3><p>Student requests are visible only to the student and authorized assigned staff.</p></div>{user.role==='student'&&<button className="btn primary" onClick={()=>setModal('intake')}>＋ New request</button>}</div>{filtered(data.intakes||[]).map((i:any)=><article className="record"><div className="record-top"><b>{i.topic}</b><span className="status">{i.status}</span></div>{user.role!=='student'&&<small>Student: {i.student_name}</small>}<p>{i.details}</p><small>Priority: {i.priority} · {String(i.created_at).slice(0,10)}</small>{user.role!=='student'&&<div className="inline-actions"><select id={`intake-${i.id}`} defaultValue={i.status}><option value="submitted">Submitted</option><option value="under_review">Under review</option><option value="referred">Referred</option><option value="closed">Closed</option></select>{user.role==='administrator'&&<select id={`assign-${i.id}`} defaultValue={i.assigned_counselor_id||''}><option value="">Unassigned</option>{(data.counselors||[]).map((c:any)=><option value={c.id} key={c.id}>{c.fullName}</option>)}</select>}<button className="tiny-btn" onClick={()=>updateIntake(i.id,(document.getElementById(`intake-${i.id}`) as HTMLSelectElement).value,user.role==='administrator'?Number((document.getElementById(`assign-${i.id}`) as HTMLSelectElement).value):undefined)}>Save changes</button></div>}</article>)}{!data.intakes?.length&&<p className="empty">No support requests found.</p>}<div className="privacy"><ShieldCheck/> Handle intake details confidentially. This student project is not a clinical records platform.</div></section>}

  {page==='Peer stories'&&<><div className="toolbar"><span>APPROVED COMMUNITY STORIES</span>{['student','peer_mentor'].includes(user.role)&&<button className="btn primary" onClick={()=>setModal('story')}>＋ Submit story</button>}</div>{user.role==='peer_mentor'||user.role==='administrator'?<section className="panel moderation"><div className="panel-title"><div><h3>Story moderation queue</h3><p>Review submissions before they appear publicly.</p></div></div>{(data.pendingStories||[]).map((s:any)=><article className="record"><b>{s.title}</b><small>By {s.author} · {s.category}</small><p>{s.body}</p><div className="inline-actions"><button className="tiny-btn" onClick={()=>moderateStory(s.id,'published')}>Approve & publish</button><button className="tiny-btn danger" onClick={()=>moderateStory(s.id,'rejected')}>Reject</button></div></article>)}{!data.pendingStories?.length&&<p className="empty">No stories waiting for review.</p>}</section>:null}<div className="story-grid">{filtered(data.stories||[]).map((s:any)=><article className="story-card"><span>{s.category}</span><h3>{s.title}</h3><p>{s.body}</p><small>Shared by {s.author} · {String(s.created_at).slice(0,10)}</small></article>)}</div>{!data.stories?.length&&<p className="empty">No published stories yet.</p>}</>}

  {page==='Community forum'&&<><div className="toolbar"><span>COMMUNITY DISCUSSIONS</span><button className="btn primary" onClick={()=>setModal('post')}>＋ Start discussion</button></div>{filtered(data.posts||[]).map((p:any)=><article className="panel forum-card"><small>{p.author} · {p.category} · {String(p.created_at).slice(0,10)}</small><h3>{p.title}</h3><p>{p.body}</p></article>)}{!data.posts?.length&&<p className="empty">No discussions yet.</p>}</>}

  {page==='Messages'&&<section className="panel"><div className="panel-title"><div><h3>Secure participant conversations</h3><p>Messages are restricted to the student and counselor in each conversation.</p></div>{user.role==='student'&&<button className="btn primary" onClick={async()=>{const x=await api('/users/counselors');setData((o:any)=>({...o,counselors:x.counselors}));setModal('conversation');}}>＋ Contact counselor</button>}</div>{(data.conversations||[]).map((c:any)=><button className="conversation" onClick={()=>setActiveConversation(c.id)}><MessageCircle/>{c.student_name} · {c.counselor_name}<span>Open →</span></button>)}{activeConversation&&<Conversation id={activeConversation} onClose={()=>setActiveConversation(null)}/>}</section>}

  {page==='Counselors'&&<div className="story-grid">{(data.counselors||[]).map((c:any)=><article className="panel counselor-card"><div className="avatar large">{c.fullName.split(' ').map((x:string)=>x[0]).slice(0,2).join('')}</div><h3>{c.fullName}</h3><p>{c.department||'University Counseling Services'}</p><button className="btn primary" onClick={async()=>{try{const x=await post('/messages/conversations',{counselorId:c.id});await load('Messages');setPage('Messages');setActiveConversation(x.conversationId);}catch(e:any){notify(e.message);}}}>Start conversation</button></article>)}</div>}

  {page==='User Management'&&<section className="panel"><div className="panel-title"><div><h3>University accounts</h3><p>Create staff accounts and manage account access.</p></div><button className="btn primary" onClick={()=>setModal('staff')}>＋ Create staff</button></div><div className="table-wrap"><table><thead><tr><th>NAME</th><th>EMAIL</th><th>ROLE</th><th>DEPARTMENT</th><th>STATUS</th><th>ACTION</th></tr></thead><tbody>{filtered(data.users||[]).map((u:any)=><tr><td>{u.fullName}</td><td>{u.email}</td><td>{roleName[u.role as Role]}</td><td>{u.department}</td><td>{u.isActive?'Active':'Inactive'}</td><td><button className="tiny-btn" onClick={()=>patch(`/users/${u.id}/status`,{isActive:!u.isActive}).then(()=>load(page)).catch((e:any)=>notify(e.message))}>{u.isActive?'Deactivate':'Activate'}</button></td></tr>)}</tbody></table></div></section>}

  {page==='Reports'&&<><div className="privacy">Reports contain aggregate operational counts, not counseling narratives.</div><div className="stats">{Object.entries(data.summary||{}).map(([k,v])=><div className="stat"><span>{k.replace(/[A-Z]/g,m=>' '+m).toUpperCase()}</span><b>{String(v)}</b><small>Current database total</small></div>)}</div></>}

  {page==='Settings'&&<section className="panel"><h3>Account details</h3><div className="setting-row"><span>Full name</span><b>{user.fullName}</b></div><div className="setting-row"><span>Email</span><b>{user.email}</b></div><div className="setting-row"><span>Role</span><b>{roleName[user.role]}</b></div><div className="setting-row"><span>Department</span><b>{user.department||'Not specified'}</b></div><div className="privacy"><ShieldCheck/> Role changes are restricted to administrators. Sign out when using a shared computer.</div></section>}
  <footer>© 2026 CampusMind · University Counseling & Peer Support <span><ShieldCheck size={13}/> Authenticated local system</span></footer></div></main><Modal/>{toast&&<div className="toast"><CheckCircle2 size={17}/>{toast}<button onClick={()=>setToast('')}>×</button></div>}<div className="demo-ribbon">LOCAL DEVELOPMENT BUILD · CONNECTED TO MYSQL API</div></div>;
}

function Conversation({id,onClose}:{id:number;onClose:()=>void}){
  const [items,setItems]=useState<any[]>([]);
  const [draft,setDraft]=useState('');
  const [error,setError]=useState('');
  const refresh=()=>api(`/messages/conversations/${id}/messages`).then(x=>setItems(x.messages)).catch((e:any)=>setError(e.message));
  useEffect(()=>{refresh();},[id]);
  const send=async(e:FormEvent)=>{e.preventDefault();if(!draft.trim())return;try{await post(`/messages/conversations/${id}/messages`,{body:draft});setDraft('');refresh();}catch(e:any){setError(e.message);}};
  return <div className="conversation-panel"><div className="panel-title"><b>Conversation</b><button className="link-btn" onClick={onClose}>Close</button></div>{error&&<p className="error">{error}</p>}<div className="message-list">{items.map(m=><div className="message-item"><small>{m.sender_name} · {String(m.created_at).slice(0,16)}</small><p>{m.body}</p></div>)}</div><form className="message-send" onSubmit={send}><input value={draft} onChange={e=>setDraft(e.target.value)} maxLength={4000} placeholder="Write a message…"/><button className="btn primary"><Send size={15}/> Send</button></form></div>;
}
export default App;
