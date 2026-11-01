const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const categories = ['数码电子','证件卡片','钥匙配饰','书籍文具','生活用品','其他'];
const places = ['图书馆','教学楼','食堂','运动场','宿舍区','其他'];
const statusName = { open:'寻找中', claimed:'交接中', returned:'已归还', closed:'已关闭', pending:'待处理', approved:'已通过', rejected:'未通过' };
let me = null, routeVersion = 0, detail = null, toastTimer, uploadImage = '';
let filters = { q:'', type:'', category:'', place:'', status:'', page:1 };
const badge = (s, label) => `<span class="badge ${esc(s)}">${esc(label || statusName[s] || s)}</span>`;
const date = s => new Date(s).toLocaleString('zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false});
const options = (values, selected='', empty='请选择') => `<option value="">${empty}</option>` + values.map(v=>`<option${v===selected?' selected':''}>${esc(v)}</option>`).join('');
function toast(text, error=false) { $('#toast').textContent=text; $('#toast').className=`visible${error?' error':''}`; clearTimeout(toastTimer); toastTimer=setTimeout(()=>$('#toast').className='',4300); }
async function api(path, data, method) {
  const response = await fetch(`/api${path}`, { method:method || (data?'POST':'GET'), credentials:'same-origin', ...(data ? { headers:{'Content-Type':'application/json'}, body:JSON.stringify(data) } : {}) });
  const result = await response.json();
  if (!response.ok) { if(response.status===401) { me=null; account(); } throw new Error(result.error || `请求失败 (${response.status})`); }
  return result;
}
function art() { return '<svg class="item-visual" viewBox="0 0 48 48" fill="none" aria-hidden="true"><rect x="8" y="8" width="32" height="32" rx="3" stroke="currentColor" stroke-width="1.5"/><circle cx="18" cy="18" r="3" stroke="currentColor" stroke-width="1.5"/><path d="m10 34 10-10 6 6 5-5 7 8" stroke="currentColor" stroke-width="1.5"/></svg>'; }
const demoPhotos = Object.fromEntries(['bag','headphones','keys','book','cup','umbrella'].map(name=>['demo-'+name,'/images/'+name+'.jpg']));
function photo(item, detail=false) {
  const sample=!item.image&&demoPhotos[item.id],src=item.image||sample;
  if(src) return `<img src="${esc(src)}" alt="${esc(item.title)}${sample?'（示例配图）':''}">${sample?`<span class="photo-label">${detail?'示例配图 · 课程演示使用':'示例配图'}</span>`:''}`;
  return `<div class="no-photo">${art()}<span>暂无照片</span><small>${esc(item.category)}</small></div>`;
}
function card(item) {
  return `<a class="item-card" href="#/item/${encodeURIComponent(item.id)}"><div class="card-art">${photo(item)}${badge(item.type,item.type==='found'?'拾物招领':'寻物启事')}</div><div class="card-body"><h3>${esc(item.title)}</h3><div class="card-meta"><span>地点：${esc(item.place)}</span><span>日期：${esc(item.happened_on)}</span></div><div class="card-bottom"><span>${item.moderation==='approved'?esc(statusName[item.status]):'内容待审核'}</span><span>查看详情</span></div></div></a>`;
}
function empty(title, hint, link='', label='') { return `<div class="empty"><h3>${esc(title)}</h3><p>${esc(hint)}</p>${link?`<a class="primary" href="${link}">${esc(label)}</a>`:''}</div>`; }
function pageHead(title, subtitle, button='') { return `<div class="page-head"><div><h1>${esc(title)}</h1><p class="muted">${esc(subtitle)}</p></div>${button}</div>`; }
function account() {
  $('#account').innerHTML = me ? `${me.role==='admin'?'<a href="#/admin">管理后台</a>':''}<button class="account-button" data-action="auth">${esc(me.name)} · 切换</button><button data-action="logout" aria-label="退出登录">退出</button>` : '<button class="account-button" data-action="auth">登录 / 演示身份 ↗</button>';
}
async function unread() { if(!me) { $('#unread').hidden=true; return; } try { const r=await api('/notices'); $('#unread').hidden=!r.notices.some(n=>!n.is_read); } catch {} }
function requireLogin() { if(me) return true; $('#auth-dialog').showModal(); return false; }
async function home() {
  const params = new URLSearchParams(Object.entries(filters).filter(([,v])=>v!==''));
  const data = await api(`/items?${params}`);
  return `<section class="home-heading"><div><h1>校园失物招领</h1><p>查找失物、发布招领信息，核对物品特征后再交接。</p></div><div class="actions"><a class="primary" href="#/publish/lost">发布寻物</a><a class="secondary" href="#/publish/found">发布招领</a></div></section><section class="catalog"><div class="section-title"><h2>物品信息</h2><span>共 ${data.total} 条结果</span></div><form id="search-form" class="searchbar"><input name="q" aria-label="搜索物品" value="${esc(filters.q)}" placeholder="搜索物品名称或描述" maxlength="100"><button class="primary">搜索</button></form><div class="filters"><div class="tabs">${[['','全部信息'],['found','拾物招领'],['lost','寻物启事']].map(([v,t])=>`<button class="tab ${filters.type===v?'selected':''}" data-action="filter" data-key="type" data-value="${v}">${t}</button>`).join('')}</div><select id="place-filter" aria-label="地点筛选">${options(places,filters.place,'全部地点')}</select><select id="status-filter" aria-label="状态筛选"><option value="">全部状态</option>${['open','claimed','returned'].map(v=>`<option value="${v}"${filters.status===v?' selected':''}>${statusName[v]}</option>`).join('')}</select></div><div class="filters">${['',...categories].map(v=>`<button class="chip ${filters.category===v?'selected':''}" data-action="filter" data-key="category" data-value="${v}">${v||'全部分类'}</button>`).join('')}<button class="chip" data-action="clear-filter">清除筛选</button></div>${data.items.length?`<div class="grid">${data.items.map(card).join('')}</div>`:empty('暂时没有匹配的物品','换个关键词，或发布一条寻物启事。','#/publish/lost','发布寻物启事')}<div class="pagination"><button class="secondary" data-action="page" data-value="-1"${filters.page<=1?' disabled':''}>上一页</button><span>第 ${data.page} 页 · 共 ${data.total} 条</span><button class="secondary" data-action="page" data-value="1"${filters.page*12>=data.total?' disabled':''}>下一页</button></div></section>`;
}
function claimHTML(claim, item) {
  const owner = me?.id===item.owner_id;
  return `<article class="claim"><div class="row">${badge(claim.status)}<span class="muted">${esc(owner?claim.applicant_name:'我的认领申请')}</span><small class="right muted">${date(claim.created_at)}</small></div><div class="private"><b>私密核验信息</b><p>${esc(claim.evidence)}</p></div>${claim.review_note?`<p class="muted">人工核验意见：${esc(claim.review_note)}</p>`:''}${owner&&claim.status==='pending'&&item.status==='open'?`<div class="row"><button class="primary" data-action="review" data-id="${claim.id}" data-decision="approved">核对后通过</button><button class="danger" data-action="review" data-id="${claim.id}" data-decision="rejected">核验未通过</button></div>`:''}${claim.status==='approved'?`<div class="progress"><span class="${claim.owner_confirmed?'done':''}">${claim.owner_confirmed?'✓':'○'} 拾主确认交出</span><span class="${claim.applicant_confirmed?'done':''}">${claim.applicant_confirmed?'✓':'○'} 失主确认收取</span></div>${(owner?!claim.owner_confirmed:!claim.applicant_confirmed)?`<button class="primary" data-action="confirm" data-id="${claim.id}">${owner?'我已交出物品':'我已收到物品'}</button>`:`<p class="muted">${claim.owner_confirmed&&claim.applicant_confirmed?'双方已确认，物品已归还。':'本方已确认，等待另一方完成。'}</p>`}`:''}</article>`;
}
async function itemPage(iid) {
  const data = await api(`/items/${encodeURIComponent(iid)}`); detail=data;
  const i=data.item, own=me?.id===i.owner_id;
  return `<div class="breadcrumb"><a href="#/">失物广场</a> / ${i.type==='found'?'拾物招领':'寻物启事'} / 物品详情</div><section class="detail-grid"><div class="detail-art">${photo(i,true)}</div><div class="detail-info"><div class="row">${badge(i.type,i.type==='found'?'拾物招领':'寻物启事')}${badge(i.status)}${i.moderation!=='approved'?badge(i.moderation,'内容'+(i.moderation==='pending'?'待审核':'未通过')):''}</div><h1>${esc(i.title)}</h1><dl class="meta-list"><dt>物品分类</dt><dd>${esc(i.category)}</dd><dt>${i.type==='found'?'拾取地点':'遗失地点'}</dt><dd>${esc(i.place)}</dd><dt>发生日期</dt><dd>${esc(i.happened_on)}</dd><dt>发布者</dt><dd>${esc(i.owner_name)}</dd></dl><p class="description">${esc(i.description)}</p>${i.type==='found'?`<div class="notice-box"><b>认领核验问题</b><br>${esc(i.question)}<br>答案不会出现在公开页面。</div>`:'<div class="notice-box">发现线索后，请到“发布招领”发布拾物信息。公开页面不展示联系方式。</div>'}<div class="row">${i.type==='found'&&i.status==='open'&&!own?`<button class="primary" data-action="claim" data-id="${i.id}"${data.claims.some(c=>['pending','approved'].includes(c.status))?' disabled':''}>${data.claims.some(c=>['pending','approved'].includes(c.status))?'已申请，等待人工核验':'申请认领'}</button>`:''}${own&&i.status==='open'?`<button class="secondary" data-action="close-item" data-id="${i.id}">关闭此帖</button>`:''}<a class="secondary" href="#/">返回广场</a></div></div></section>${own&&i.type==='found'?`<section class="panel"><h2>拾主专属核验参考</h2><p class="private">${esc(i.private_note)}</p><p class="fine">仅本帖发布者可见。请人工核对申请内容，平台不会自动判断所有权。</p></section>`:''}${me?`<section class="panel"><h2>${own?'收到的认领申请':'我的认领进度'}</h2>${data.claims.length?data.claims.map(c=>claimHTML(c,i)).join(''):empty('还没有认领申请',own?'收到申请后可在这里核验。':'提交后可以在这里查看结果。')}</section>`:''}${data.events.length?`<section class="panel"><h2>处理记录</h2><div class="timeline">${data.events.map(e=>`<div><p>${esc(e.action)}</p><small>${date(e.created_at)} · ${esc(e.note)}</small></div>`).join('')}</div></section>`:''}`;
}
function publishPage(type) {
  uploadImage=''; const found=type==='found';
  return `${pageHead(found?'发布招领信息':'发布寻物信息','公开信息通过审核后展示，私密核验信息始终单独保存。')}<div class="form-layout"><form class="form" id="publish-form" data-type="${found?'found':'lost'}"><div class="row" style="margin-bottom:24px"><a class="tab ${!found?'selected':''}" href="#/publish/lost">寻物启事</a><a class="tab ${found?'selected':''}" href="#/publish/found">拾物招领</a></div><label>物品标题<input name="title" required minlength="4" maxlength="60" placeholder="例如：图书馆捡到一个绿色双肩包"></label><div class="two"><label>物品分类<select name="category" required>${options(categories)}</select></label><label>发生地点<select name="place" required>${options(places)}</select></label></div><div class="two"><label>${found?'拾取':'遗失'}日期<input name="happened_on" type="date" required max="${new Date().toISOString().slice(0,10)}" value="${new Date().toISOString().slice(0,10)}"></label></div><div class="upload"><b>添加物品图片（可选）</b><p>仅支持 PNG / JPEG / WebP · 自动压缩<br>请裁去姓名、证件号码和联系方式</p><input id="photo-input" aria-label="物品图片" type="file" accept="image/png,image/jpeg,image/webp"><img id="photo-preview" alt="待上传图片预览" hidden></div><label>公开描述<textarea name="description" required minlength="8" maxlength="1000" placeholder="描述外观、时间和地点，不要填写联系方式或能证明归属的秘密细节。"></textarea></label>${found?'<label>向认领者提出的问题<input name="question" required minlength="4" maxlength="120" placeholder="例如：包内有什么未出现在照片中的物品？"></label><label>私密核验参考（仅自己可见）<textarea name="private_note" required minlength="2" maxlength="500" placeholder="记录核验参考。不要把它放在公开描述里。"></textarea></label>':''}<div class="notice-box">提交后进入内容审核队列；通过后可在广场找到。图片尚未接入自动脱敏，不会绕过人工审核。</div><button class="primary wide-button" type="submit">提交审核</button></form><aside class="side-note"><h3>填写说明</h3><ol><li>先检查照片中有没有个人信息。</li><li>保留一两个只有失主知道的特征。</li><li>对方提交认领后，认真核对。</li><li>建议在校园公共地点交接。</li><li>双方确认，才算完成归还。</li></ol></aside></div>`;
}
async function minePage() { const data=await api('/items?mine=1'); return `${pageHead('我的发布','查看发布状态、认领申请和审核意见。','<a class="primary" href="#/publish/found">＋ 发布信息</a>')}${data.items.length?`<div class="grid">${data.items.map(card).join('')}</div>`:empty('还没有发布信息','发布寻物或招领信息后，会在这里显示。','#/publish/found','发布拾物信息')}`; }
async function claimsPage() { const data=await api('/claims'); return `${pageHead('认领与交接','申请、人工核验和双方确认，每一步都有记录。')}${data.claims.length?data.claims.map(c=>`<section class="panel"><div class="row"><h2>${esc(c.title)}</h2><a class="secondary right" href="#/item/${c.item_id}">查看物品详情</a></div>${claimHTML(c,{owner_id:c.owner_id,status:c.item_status})}</section>`).join(''):empty('还没有需要处理的认领','先到广场找找，或者查看自己发布的物品。','#/','浏览失物广场')}`; }
async function messagesPage() { const data=await api('/notices'); return `${pageHead('消息中心','发布审核、认领核验和交接进展，在这里收到。','<button class="secondary" data-action="read-all">全部标为已读</button>')}<div class="panel">${data.notices.length?data.notices.map(n=>`<a class="message ${n.is_read?'':'unread'}" href="#/item/${esc(n.item_id)}"><span class="message-icon">↗</span><div><h3>${esc(n.title)}</h3><p>${esc(n.body)}</p><small>${date(n.created_at)}</small></div></a>`).join(''):empty('还没有消息','有新的认领和审核进度时，会在这里通知你。')}</div>`; }
async function adminPage() { const data=await api('/admin/items'); return `${pageHead('内容审核工作台','核查公开文字、图片中的个人信息，审核意见会通知发布者。')}<div class="notice-box warn">管理员负责内容审核，认领的私密证据由拾主核验。教学演示账号不具备校园工作人员身份。</div><section class="panel"><div class="table-wrap"><table><thead><tr><th>物品</th><th>发布者</th><th>内容状态</th><th>业务状态</th><th>操作</th></tr></thead><tbody>${data.items.map(i=>`<tr><td><b>${esc(i.title)}</b><p class="fine">${esc(i.description)}</p>${i.image?`<a href="#/item/${i.id}">查看待审核图片 ↗</a>`:''}</td><td>${esc(i.owner_name)}</td><td>${badge(i.moderation)}</td><td>${badge(i.status)}</td><td><div class="row"><button class="secondary" data-action="moderate" data-id="${i.id}" data-decision="approved">${i.moderation==='approved'?'重新通过':'审核通过'}</button><button class="danger" data-action="moderate" data-id="${i.id}" data-decision="rejected">不予公开</button></div></td></tr>`).join('')}</tbody></table></div></section>`; }
function helpPage() { return `${pageHead('使用说明','功能说明与演示步骤')}<section class="help-section"><h2>两分钟答辩演示</h2><ol><li>点击右上角“演示身份”，先选择“我是失主”。</li><li>在广场打开绿色双肩包，提交私密特征：包里有一本黄色封面的高等数学笔记。</li><li>切换为“我是拾主”，打开认领与交接，核对参考内容后通过。</li><li>拾主确认交出，再切回失主确认收到。检查物品变为“已归还”。</li><li>发布一条拾物信息，切换管理员审核，再回广场查找。</li></ol></section><section class="help-section"><h2>这版已经实现什么</h2><p>账号注册与登录、HTTP 会话、后端数据库、物品发布与检索、内容审核、私密认领、人工核验、双向交接、站内通知和事件时间线。刷新页面和重启服务后，数据库记录仍然存在。</p></section><section class="help-section"><h2>与完整需求的边界</h2><p>这是课程 A 方案的教学演示版本。没有接入校园身份认证、图片语义匹配、自动图像脱敏、微信推送和真实服务点。图片发布前走人工审核。演示管理员可切换仅为答辩使用，真实试点必须关闭 DEMO_MODE 并另行配置管理权限。</p></section><section class="help-section"><h2>保护个人信息</h2><p>不要上传真实证件、住址、电话号码和私密证据。演示账号之间的数据用于共同展示，不作为私人存储。普通账号的核验参考仅发布者可见，申请证据仅申请者和拾主可见。任何已公开照片都应在上传前裁去敏感内容。</p></section>`; }
async function render() {
  const version=++routeVersion;
  const parts=(location.hash.slice(1)||'/').split('/').filter(Boolean), section=parts[0]||'home';
  document.querySelectorAll('[data-nav]').forEach(n=>n.classList.toggle('active',n.dataset.nav===section));
  $('#content').innerHTML='<div class="loading">正在读取最新记录…</div>';
  if(['publish','me','claims','messages','admin'].includes(section)&&!me) { $('#content').innerHTML=empty('请先登录','可以使用课程演示身份，或注册自己的账号。'); $('#content').insertAdjacentHTML('beforeend','<div style="text-align:center;margin-top:20px"><button class="primary" data-action="auth">选择登录身份</button></div>'); requireLogin(); return; }
  try {
    let html;
    if(section==='home') html=await home();
    else if(section==='item'&&parts[1]) html=await itemPage(parts[1]);
    else if(section==='publish') html=publishPage(parts[1]||'lost');
    else if(section==='me') html=await minePage();
    else if(section==='claims') html=await claimsPage();
    else if(section==='messages') html=await messagesPage();
    else if(section==='admin') html=await adminPage();
    else if(section==='help') html=helpPage();
    else html=empty('这个页面暂时不存在','请返回物品列表。','#/','返回广场');
    if(version!==routeVersion) return;
    $('#content').innerHTML=html; await unread();
  } catch(error) { if(version===routeVersion) $('#content').innerHTML=`<div class="error-box"><h2>这一步暂时没有完成。</h2><p style="margin:15px 0">${esc(error.message)}</p><button class="secondary" data-action="refresh">重新加载</button> <a class="secondary" href="#/">返回广场</a></div>`; }
}
function openAction(title, html) { $('#action-title').textContent=title; $('#action-content').innerHTML=html; $('#action-dialog').showModal(); }
document.addEventListener('click',async event=>{
  const button=event.target.closest('[data-action]'); if(!button) return;
  const {action,id,decision,persona}=button.dataset;
  try {
    if(action==='auth') return $('#auth-dialog').showModal();
    if(action==='close-auth') return $('#auth-dialog').close();
    if(action==='close-action') return $('#action-dialog').close();
    if(action==='demo') { button.disabled=true; const r=await api('/demo',{persona}); me=r.user; account(); $('#auth-dialog').close(); toast('已切换到'+me.name); await render(); return; }
    if(action==='logout') { await api('/logout',{}); me=null; account(); toast('已退出'); await render(); return; }
    if(action==='refresh') return render();
    if(action==='filter') { filters[button.dataset.key]=button.dataset.value; filters.page=1; return render(); }
    if(action==='clear-filter') { filters={q:'',type:'',category:'',place:'',status:'',page:1}; return render(); }
    if(action==='page') { filters.page=Math.max(1,filters.page+Number(button.dataset.value)); return render(); }
    if(action==='claim') { if(!requireLogin()) return; return openAction('提交认领申请',`<p class="muted">请回答：${esc(detail.item.question)}</p><form id="claim-form" data-id="${id}"><label>私密特征<textarea name="evidence" required minlength="6" maxlength="800" placeholder="描述公开照片里看不到的细节。"></textarea></label><p class="fine">仅你和本帖拾主可见，由拾主人工作出判断。</p><button class="primary wide-button">提交申请</button></form>`); }
    if(action==='review') return openAction(decision==='approved'?'确认人工核验通过':'记录未通过原因',`<form id="review-form" data-id="${id}" data-decision="${decision}"><label>核验意见<textarea name="note" required minlength="2" maxlength="500" placeholder="说明已核对哪些特征，不要在意见中复制私密参考答案。"></textarea></label><p class="fine">此意见会通知申请者。通过后进入交接，不能直接标为归还。</p><button class="primary wide-button">确认核验结论</button></form>`);
    if(action==='moderate') return openAction(decision==='approved'?'内容审核通过':'内容不予公开',`<form id="moderate-form" data-id="${id}" data-decision="${decision}"><label>审核意见<textarea name="note" required minlength="2" maxlength="500" placeholder="检查文字和图片中是否含个人信息，记录审核意见。"></textarea></label><button class="primary wide-button">确认内容审核</button></form>`);
    if(action==='confirm') { button.disabled=true; const r=await api(`/claims/${id}/confirm`,{}); toast(r.item.status==='returned'?'双方已确认，物品归还完成。':'已记录本方确认，等待另一方。'); return render(); }
    if(action==='close-item') return openAction('关闭这条信息',`<p class="muted">关闭后不再接受新的认领申请，待处理的申请会结束。</p><form id="close-form" data-id="${id}" style="margin-top:20px"><button class="danger wide-button">确认关闭此帖</button></form>`);
    if(action==='read-all') { await api('/notices/read',{}); toast('消息已标为已读'); return render(); }
  } catch(error) { toast(error.message,true); } finally { button.disabled=false; }
});
document.addEventListener('submit',async event=>{
  const form=event.target; if(!(form instanceof HTMLFormElement)) return; event.preventDefault();
  const submit=event.submitter, data=Object.fromEntries(new FormData(form));
  if(submit) submit.disabled=true;
  try {
    if(form.id==='auth-form') { const r=await api(submit?.value==='register'?'/register':'/login',data); me=r.user; account(); $('#auth-dialog').close(); toast('欢迎，'+me.name); return render(); }
    if(form.id==='search-form') { filters.q=data.q; filters.page=1; return render(); }
    if(form.id==='publish-form') { const r=await api('/items',{...data,type:form.dataset.type,image:uploadImage}); toast('发布已保存，等待内容审核'); location.hash=`/item/${r.id}`; return; }
    if(form.id==='claim-form') await api(`/items/${form.dataset.id}/claims`,data);
    if(form.id==='review-form') await api(`/claims/${form.dataset.id}/review`,{...data,decision:form.dataset.decision});
    if(form.id==='moderate-form') await api(`/admin/items/${form.dataset.id}`,{...data,decision:form.dataset.decision});
    if(form.id==='close-form') await api(`/items/${form.dataset.id}/close`,{});
    $('#action-dialog').close(); toast('操作已保存'); await render();
  } catch(error) { toast(error.message,true); } finally { if(submit) submit.disabled=false; }
});
document.addEventListener('change',async event=>{
  if(event.target.id==='place-filter') { filters.place=event.target.value; filters.page=1; return render(); }
  if(event.target.id==='status-filter') { filters.status=event.target.value; filters.page=1; return render(); }
  if(event.target.id==='photo-input') {
    const file=event.target.files[0]; uploadImage=''; $('#photo-preview').hidden=true;
    if(!file) return;
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>8*1024*1024) return toast('请选择 8 MB 内的 JPG、PNG 或 WebP 图片',true);
    try {
      const bitmap=await createImageBitmap(file), scale=Math.min(1,1000/Math.max(bitmap.width,bitmap.height));
      const canvas=document.createElement('canvas'); canvas.width=Math.round(bitmap.width*scale); canvas.height=Math.round(bitmap.height*scale); canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height); bitmap.close();
      let quality=.8, result=canvas.toDataURL('image/jpeg',quality);
      while(result.length>330000&&quality>.2) { quality-=.1; result=canvas.toDataURL('image/jpeg',quality); }
      if(result.length>330000) throw new Error('图片仍过大，请选择更小或更简单的图片。');
      uploadImage=result; $('#photo-preview').src=result; $('#photo-preview').hidden=false; toast('图片已压缩，发布后等待人工审核');
    } catch(error) { toast(error.message,true); }
  }
});
window.addEventListener('hashchange',()=>{ window.scrollTo(0,0); render(); });
async function start() { try { me=(await api('/me')).user; account(); await render(); } catch(error) { $('#content').innerHTML=`<div class="error-box">无法连接后端：${esc(error.message)} <button data-action="refresh">重新加载</button></div>`; } }
start();
