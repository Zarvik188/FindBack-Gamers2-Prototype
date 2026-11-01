import fs from 'node:fs/promises';
const base=new URL('../',import.meta.url);
const css=(await fs.readFile(new URL('frontend/style.css',base),'utf8')).replace(/@import\s+url\([\s\S]*?\);/g,'');
let html=await fs.readFile(new URL('frontend/index.html',base),'utf8');
let app=await fs.readFile(new URL('frontend/app.js',base),'utf8');
const embeddedPhotos={};
for(const name of ['bag','headphones','keys','book','cup','umbrella']) embeddedPhotos['demo-'+name]='data:image/jpeg;base64,'+(await fs.readFile(new URL('frontend/images/'+name+'.jpg',base))).toString('base64');
app=app.replace("Object.fromEntries(['bag','headphones','keys','book','cup','umbrella'].map(name=>['demo-'+name,'/images/'+name+'.jpg']))",JSON.stringify(embeddedPhotos));
const r=await fetch('http://127.0.0.1:5180/api/demo',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({persona:'claimant'})});
const items=(await(await fetch('http://127.0.0.1:5180/api/items')).json()).items.map(i=>({...i,status:'open',active_claim_id:null}));
const shim=`
// This is a self-contained interaction prototype, not the real backend.
let protoHash='#/';
const location={get hash(){return protoHash},set hash(v){protoHash=v;window.dispatchEvent(new Event('hashchange'))}};
document.addEventListener('click',e=>{const a=e.target.closest('a');if(a&&a.getAttribute('href')?.startsWith('#/')){e.preventDefault();location.hash=a.getAttribute('href');}});
const prototypeItems=${JSON.stringify(items)};
const prototypeClaims=[],prototypeNotices=[];
const demoUsers={owner:{id:'demo-owner',name:'拾主 · 小林',role:'student'},claimant:{id:'demo-claimant',name:'失主 · 小罗',role:'student'},admin:{id:'demo-admin',name:'内容管理员',role:'admin'}};
let currentUser=null;
const originalFetch=window.fetch.bind(window);
window.fetch=async(input,opts={})=>{
 if(!String(input).startsWith('/api'))return originalFetch(input,opts);
 const url=new URL(input,'https://prototype.local'),p=url.pathname.slice(4),b=JSON.parse(opts.body||'{}'),method=opts.method||'GET';
 const stamp=()=>new Date().toISOString(),nid=()=>crypto.randomUUID();let result={},code=200;
 const error=(msg,status=400)=>{result={error:msg};code=status};
 const notify=(uid,iid,title,body)=>prototypeNotices.unshift({id:nid(),user_id:uid,item_id:iid,title,body,is_read:0,created_at:stamp()});
 if(p==='/me')result={user:currentUser};
 else if(p==='/demo'){currentUser=demoUsers[b.persona];result={user:currentUser};}
 else if(p==='/logout'){currentUser=null;result={ok:true};}
 else if(p==='/register'||p==='/login'){currentUser={id:'proto-personal',name:b.name||'原型体验者',role:'student'};result={user:currentUser};}
 else if(p==='/stats')result={found:prototypeItems.filter(i=>i.type==='found').length,lost:prototypeItems.filter(i=>i.type==='lost').length,returned:prototypeItems.filter(i=>i.status==='returned').length};
 else if(p==='/items'&&method==='GET'){
 let list=prototypeItems.filter(i=>i.moderation==='approved');if(url.searchParams.get('mine')==='1')list=prototypeItems.filter(i=>i.owner_id===currentUser?.id);
 for(const key of ['type','category','place','status'])if(url.searchParams.get(key))list=list.filter(i=>i[key]===url.searchParams.get(key));const q=url.searchParams.get('q');if(q)list=list.filter(i=>(i.title+i.description).includes(q));
 const page=Number(url.searchParams.get('page')||1);result={items:list.slice((page-1)*12,page*12),total:list.length,page,page_size:12};
 }else if(p==='/items'&&method==='POST'){
 const item={...b,id:nid(),owner_id:currentUser.id,owner_name:currentUser.name,status:'open',moderation:'pending',created_at:stamp(),updated_at:stamp()};prototypeItems.unshift(item);notify(currentUser.id,item.id,'发布成功，等待审核','切换管理员后可以审核此条示例。');result={id:item.id};
 }else if(p==='/claims'&&method==='GET')result={claims:prototypeClaims.filter(c=>c.applicant_id===currentUser?.id||prototypeItems.find(i=>i.id===c.item_id)?.owner_id===currentUser?.id).map(c=>({...c,...Object.fromEntries(['title','owner_id'].map(k=>[k,prototypeItems.find(i=>i.id===c.item_id)[k]])),item_status:prototypeItems.find(i=>i.id===c.item_id).status}))};
 else if(p==='/notices')result={notices:prototypeNotices.filter(n=>n.user_id===currentUser?.id)};
 else if(p==='/notices/read'){prototypeNotices.filter(n=>n.user_id===currentUser?.id).forEach(n=>n.is_read=1);result={ok:true};}
 else if(p==='/admin/items')result={items:prototypeItems};
 else {
 const parts=p.split('/').filter(Boolean);const item=prototypeItems.find(i=>i.id===parts[1]);const claim=prototypeClaims.find(c=>c.id===parts[1]);
 if(parts[0]==='items'&&item&&parts.length===2){const copy={...item};if(currentUser?.id===item.owner_id)copy.private_note=item.private_note||(item.id==='demo-bag'?'一本黄色封面的高等数学笔记':'请核对申请者提供的未公开细节。');else delete copy.private_note;result={item:copy,claims:prototypeClaims.filter(c=>c.item_id===item.id&&(c.applicant_id===currentUser?.id||item.owner_id===currentUser?.id)),events:[]};}
 else if(parts[0]==='items'&&item&&parts[2]==='claims'){
 const c={id:nid(),item_id:item.id,applicant_id:currentUser.id,applicant_name:currentUser.name,evidence:b.evidence,status:'pending',owner_confirmed:0,applicant_confirmed:0,created_at:stamp(),updated_at:stamp()};prototypeClaims.unshift(c);notify(item.owner_id,item.id,'收到新的认领申请','请人工核对私密特征。');result={id:c.id};
 }else if(parts[0]==='items'&&item&&parts[2]==='close'){item.status='closed';result={ok:true};}
 else if(parts[0]==='claims'&&claim&&parts[2]==='review'){claim.status=b.decision;claim.review_note=b.note;const i=prototypeItems.find(i=>i.id===claim.item_id);if(b.decision==='approved'){i.status='claimed';i.active_claim_id=claim.id;}notify(claim.applicant_id,i.id,b.decision==='approved'?'认领核验通过':'认领核验未通过',b.note);result={ok:true};}
 else if(parts[0]==='claims'&&claim&&parts[2]==='confirm'){const i=prototypeItems.find(i=>i.id===claim.item_id);claim[currentUser.id===i.owner_id?'owner_confirmed':'applicant_confirmed']=1;if(claim.owner_confirmed&&claim.applicant_confirmed)i.status='returned';notify(currentUser.id===i.owner_id?claim.applicant_id:i.owner_id,i.id,'交接进度已更新','双方都确认才标为已归还。');result={ok:true,item:i};}
 else if(parts[0]==='admin'&&parts[1]==='items'){const i=prototypeItems.find(i=>i.id===parts[2]);if(i){i.moderation=b.decision;notify(i.owner_id,i.id,'内容审核结果',b.note);result={ok:true};}else error('示例不存在');}
 else error('原型示例暂不支持此动作');
 }
 return new Response(JSON.stringify(result),{status:code,headers:{'Content-Type':'application/json'}});
};
`;
html=html.replace('<title>拾光 · 校园失物招领</title>','<title>拾光 · 墨刀交互原型</title>').replace('<link rel="stylesheet" href="/style.css">',`<style>${css}</style>`).replace('<link rel="icon" href="/favicon.svg">','');
html=html.replace('课程演示','墨刀原型').replace('示例数据，请勿填写真实个人信息','模拟数据，请勿填写真实个人信息');
const script=shim+app.replaceAll('当前演示数据库统计 · 实时读取','原型模拟数据 · 可操作演示').replace('数据库记录仍然存在','数据库持久化由配套实际系统验证');
html=html.replace('<script type="module" src="/app.js"></script>','<script type="module">'+script.replaceAll('</script>','<\\/script>')+'</script>');
await fs.mkdir(new URL('prototype-html/',base),{recursive:true});
await fs.writeFile(new URL('prototype-html/拾光FindBack-完整交互原型.html',base),html);
console.log('Self-contained MoDao interaction prototype generated.');
