from pathlib import Path
root=Path(__file__).resolve().parents[1]
p=root/'frontend/app.js'
s=p.read_text(encoding='utf-8')
if 'class="home-heading"' in s:
    print('Simplified interface already applied.')
    raise SystemExit(0)
start=s.index("function art(type='bag')")
end=s.index('function card(item)',start)
s=s[:start]+'''function art() { return '<svg class="item-visual" viewBox="0 0 48 48" fill="none" aria-hidden="true"><rect x="8" y="8" width="32" height="32" rx="3" stroke="currentColor" stroke-width="1.5"/><circle cx="18" cy="18" r="3" stroke="currentColor" stroke-width="1.5"/><path d="m10 34 10-10 6 6 5-5 7 8" stroke="currentColor" stroke-width="1.5"/></svg>'; }
function photo(item) { return item.image ? `<img src="${esc(item.image)}" alt="${esc(item.title)}">` : `<div class="no-photo">${art()}<span>暂无照片</span><small>${esc(item.category)}</small></div>`; }
'''+s[end:]
s=s.replace('<p class="eyebrow">FINDBACK / CAMPUS SERVICE</p>','')
s=s.replace("const [data, stats] = await Promise.all([api(`/items?${params}`),api('/stats')]);","const data = await api(`/items?${params}`);")
a=s.index('  return `<section class="hero">',s.index('async function home()'))
b=s.index('<form id="search-form"',a)
s=s[:a]+'''  return `<section class="home-heading"><div><h1>校园失物招领</h1><p>查找失物、发布招领信息，核对物品特征后再交接。</p></div><div class="actions"><a class="primary" href="#/publish/lost">发布寻物</a><a class="secondary" href="#/publish/found">发布招领</a></div></section><div class="section-title"><h2>物品信息</h2><span>共 ${data.total} 条结果</span></div>'''+s[b:]
s=s.replace('试试搜索：双肩包、耳机、蓝色钥匙…','搜索物品名称或描述')
s=s.replace('查找物品 ↗','搜索')
s=s.replace("found?'给一件失物，留一盏灯。':'把线索留下，让寻找开始。'","found?'发布招领信息':'发布寻物信息'")
s=s.replace('<label>无照片时的示意图<select name="visual">${[[\'bag\',\'双肩包\'],[\'headphones\',\'耳机\'],[\'keys\',\'钥匙\'],[\'book\',\'书籍\'],[\'cup\',\'杯子\'],[\'umbrella\',\'雨伞\']].map(([v,t])=>`<option value="${v}">${t}</option>`).join(\'\')}</select></label>','')
s=s.replace('<p class="eyebrow">A SMALL ACT OF KINDNESS</p><h3 style="margin-top:16px">让善意走完最后一公里。</h3>','<h3>填写说明</h3>')
replacements={
 '⌖ ':'地点：','◷ ':'日期：','查看详情 ↗':'查看详情',
 '先核验，再交接。':'认领核验问题',
 '这件物品的归途':'处理记录',
 '跟进每一条信息，直到物品找到归处。':'查看发布状态、认领申请和审核意见。',
 '捡到的善意和遗失的线索，都可以从这里开始。':'发布寻物或招领信息后，会在这里显示。',
 '把善意，变成一段完整的归途。':'使用说明',
 '登录后，继续这段归途。':'请先登录',
 '回到广场继续寻找。':'请返回物品列表。',
 '这是我的，申请认领 ↗':'申请认领',
 '我捡到东西了':'发布招领',
 '进入物品详情 ↗':'查看物品详情',
 '提交发布，等待审核 ↗':'提交审核',
 '基础版演示指南与当前能力边界':'功能说明与演示步骤',
}
for a,b in replacements.items():s=s.replace(a,b)
p.write_text(s,encoding='utf-8')
p=root/'frontend/index.html';s=p.read_text(encoding='utf-8')
s=s.replace('拾光 FindBack · 让遗失有归途','拾光 · 校园失物招领')
s=s.replace('拾光 <small>FIND BACK</small>','拾光 <small>校园失物招领</small>')
s=s.replace('校园服务概念 · 教学演示环境','课程演示').replace('数据均为示例，请勿上传真实证件和联系方式','示例数据，请勿填写真实个人信息')
s=s.replace('拾起遗失，光照归途。<span>Gamers2 · 软件工程实践 · 基础版</span>','校园失物招领系统 · Gamers2<span>软件工程实践课程项目</span>')
s=s.replace('<p class="eyebrow">WELCOME TO FINDBACK</p>','').replace('<h2 id="auth-title">让遗失有归途</h2>','<h2 id="auth-title">登录</h2>')
s=s.replace('选择演示身份，体验完整交接流程。','课程答辩可使用以下演示身份，也可以登录自己的账号。')
p.write_text(s,encoding='utf-8')
print('Updated functional copy and homepage structure.')
