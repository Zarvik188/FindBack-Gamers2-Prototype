import fs from 'node:fs/promises';
const base=new URL('../',import.meta.url),out=new URL('prototype-html/',base);
await fs.mkdir(out,{recursive:true});
const source=await fs.readFile(new URL('frontend/app.js',base),'utf8');
const prefix=source.slice(0,source.indexOf("document.addEventListener('click'"));
let cookie='';
const apiFetch=(url,opts={})=>fetch('http://127.0.0.1:5180'+url,{...opts,headers:{...opts.headers,Cookie:cookie}});
const ui=new Function('document','fetch',prefix+`;return {home,itemPage,publishPage,minePage,claimsPage,messagesPage,adminPage,helpPage,art,setUser:(u)=>{me=u},getDetail:()=>detail};`)({querySelector:()=>({})},apiFetch);
async function call(path,data){const r=await apiFetch('/api'+path,{method:data?'POST':'GET',...(data?{headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}:{})});return {body:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};}
async function role(persona){const r=await call('/demo',{persona});cookie=r.cookie;ui.setUser(r.body.user);}
await role('claimant');
const css=(await fs.readFile(new URL('frontend/style.css',base),'utf8')).replace(/@import\s+url\([\s\S]*?\);/g,'');
const staticIndex=await fs.readFile(new URL('frontend/index.html',base),'utf8');
const header=staticIndex.match(/<header[\s\S]*?<\/header>/)[0].replace('<div id="account"></div>','<div id="account"><button class="account-button">小罗 · 演示身份</button></div>');
const screens=[];
screens.push(['01-失物广场',await ui.home()]);
screens.push(['02-物品详情',await ui.itemPage('demo-bag')]);
screens.push(['03-发布拾物',ui.publishPage('found')]);
screens.push(['04-私密认领',`<div class="page-head"><h1>提交认领申请</h1><a class="secondary" href="02-物品详情.html">返回物品详情</a></div><div class="form-layout"><form class="form"><h2>这可能是你的双肩包</h2><p class="notice-box">请回答：包内有哪件特殊物品？<br>回答仅申请人和拾主可见。</p><label>私密特征<textarea>包里有一本黄色封面的高等数学笔记。</textarea></label><a class="primary" href="05-人工核验.html">提交申请，等待人工核验</a><p class="fine">原型示例，不会自动判断所有权。</p></form><aside class="side-note"><h3>先核验，再交接。</h3><p class="muted">不公开证件和联系方式，不以先到先得代替归属核验。</p></aside></div>`]);
let d=(await call('/items/demo-bag')).body;
let claim=d.claims.find(c=>c.status==='pending'||c.status==='approved');
if(!claim&&d.item.status==='open'){const r=await call('/items/demo-bag/claims',{evidence:'包里有一本黄色封面的高等数学笔记。'});claim={id:r.body.id};}
await role('owner');
screens.push(['05-人工核验',await ui.itemPage('demo-bag')]);
if(claim){d=(await call('/items/demo-bag')).body;const c=d.claims.find(x=>x.id===claim.id);if(c?.status==='pending')await call(`/claims/${claim.id}/review`,{decision:'approved',note:'已核对包内物品描述，特征一致。'});}
screens.push(['06-双向交接',await ui.itemPage('demo-bag')]);
screens.push(['07-消息中心',await ui.messagesPage()]);
await role('admin');screens.push(['08-内容审核',await ui.adminPage()]);
const filenames=screens.map(s=>s[0]+'.html');
for(const [name,content]of screens){
 let html=`<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><title>${name} · 拾光 FindBack</title><style>${css}\nbody{width:1440px;min-width:1440px;margin:0;background:#f7f8f3;font-family:'Microsoft YaHei',sans-serif}.header{position:relative}main{min-height:600px} .prototype-nav{display:flex;gap:16px;padding:18px 130px;background:#edf2e7;font-size:12px} .prototype-nav a{text-decoration:underline} </style></head><body>${header}<div class="demo-strip">墨刀交互原型 · Gamers2 · 页面 ${name} · 示例内容</div><main id="content">${content}</main><div class="prototype-nav">${screens.map(([n])=>`<a href="${n}.html">${n.slice(3)}</a>`).join('')}</div></body></html>`;
 html=html.replaceAll('href="#/item/demo-bag"','href="02-物品详情.html"').replaceAll('href="#/publish/found"','href="03-发布拾物.html"').replaceAll('href="#/claims"','href="06-双向交接.html"').replaceAll('href="#/messages"','href="07-消息中心.html"').replaceAll('href="#/admin"','href="08-内容审核.html"').replaceAll('href="#/"','href="01-失物广场.html"');
 for(const photoName of ['bag','headphones','keys','book','cup','umbrella']) html=html.replaceAll('/images/'+photoName+'.jpg','data:image/jpeg;base64,'+(await fs.readFile(new URL('frontend/images/'+photoName+'.jpg',base))).toString('base64'));
 await fs.writeFile(new URL(name+'.html',out),html);
}
console.log(JSON.stringify({pages:filenames,output:out.pathname},null,2));
