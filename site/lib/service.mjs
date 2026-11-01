/** Framework-independent HTTP service. D1-compatible parameterized database API. */
const CATEGORIES = ['数码电子', '证件卡片', '钥匙配饰', '书籍文具', '生活用品', '其他'];
export const VERSION = '1.0.0';
class ApiError extends Error { constructor(status, message) { super(message); this.status = status; } }
const fail = (code, message) => { throw new ApiError(code, message); };
const now = () => new Date().toISOString();
const id = () => crypto.randomUUID();
const hex = bytes => [...new Uint8Array(bytes)].map(x => x.toString(16).padStart(2, '0')).join('');
async function digest(value) { return hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))); }
async function hashPassword(value, salt) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(value), 'PBKDF2', false, ['deriveBits']);
  return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: new TextEncoder().encode(salt), iterations: 100000, hash: 'SHA-256' }, key, 256));
}
function field(body, name, min = 1, max = 500) {
  const value = body[name];
  if (typeof value !== 'string' || value.trim().length < min || value.length > max) fail(400, `${name} 长度需要在 ${min}–${max} 字符之间`);
  return value.trim();
}
const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers } });
const userView = u => u ? { id: u.id, name: u.name, role: u.role, demo: u.email.endsWith('@demo.findback') } : null;
const notice = (db, userId, itemId, title, body) => db.prepare('INSERT INTO notices(id,user_id,item_id,title,body,created_at) VALUES (?,?,?,?,?,?)').bind(id(), userId, itemId, title, body, now());
const event = (db, itemId, actorId, action, note = '') => db.prepare('INSERT INTO events(id,item_id,actor_id,action,note,created_at) VALUES (?,?,?,?,?,?)').bind(id(), itemId, actorId, action, note, now());
function publicItem(item) {
  const { private_note, ...rest } = item;
  // Private answers never appear in public list/detail responses.
  return rest;
}
async function seedDemo(db) {
  const ts = now(), date = ts.slice(0, 10);
  const users = [['demo-owner', '拾主 · 小林', 'owner'], ['demo-claimant', '失主 · 小罗', 'claimant'], ['demo-admin', '内容管理员', 'admin']];
  const statements = users.map(([uid, name, role]) => db.prepare('INSERT OR IGNORE INTO users(id,name,email,role,created_at) VALUES (?,?,?,?,?)').bind(uid, name, `${role}@demo.findback`, role === 'admin' ? 'admin' : 'student', ts));
  const samples = [
    ['demo-bag', 'found', '图书馆捡到一个绿色双肩包', '生活用品', '图书馆', '在二楼靠窗座位附近捡到，已妥善保管。请描述包内一件不在图片中的物品。', '包内有哪件特殊物品？', '一本黄色封面的高等数学笔记', 'bag'],
    ['demo-headphones', 'lost', '寻找一副白色无线耳机', '数码电子', '教学楼', '今天课后发现耳机不见了，可能落在教室。看到的同学请通过平台联系。', '请说明你在哪里发现它。', '', 'headphones'],
    ['demo-keys', 'found', '一串带蓝色挂件的钥匙', '钥匙配饰', '食堂', '食堂入口捡到钥匙一串，已放到服务台。', '钥匙上还有什么特征？', '三把钥匙，挂件背面有一颗星星', 'keys'],
    ['demo-book', 'found', '一本《软件工程》教材', '书籍文具', '教学楼', '教学楼一楼自习区捡到，书页里夹有一张书签。', '书签是什么图案？', '月亮和小猫', 'book'],
    ['demo-cup', 'lost', '灰蓝色保温杯，想找回它', '生活用品', '运动场', '跑步后忘记带走保温杯，无姓名标识。', '请描述杯子的位置。', '', 'cup'],
    ['demo-umbrella', 'found', '黑色折叠伞等待主人', '生活用品', '宿舍区', '宿舍公共区域捡到黑色折叠伞。', '伞柄有什么特征？', '有一小块白色贴纸', 'umbrella']
  ];
  for (const [iid, type, title, category, place, description, question, answer, visual] of samples) {
    statements.push(db.prepare('INSERT OR IGNORE INTO items(id,owner_id,type,title,category,place,happened_on,description,question,private_note,visual,moderation,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(iid, type === 'lost' ? 'demo-claimant' : 'demo-owner', type, title, category, place, date, description, question, answer, visual, 'approved', ts, ts));
  }
  await db.batch(statements);
}
export async function handleApi(request, env) {
  const db = env.DB;
  try {
    if (!db) fail(503, '数据库尚未配置');
    const url = new URL(request.url), route = url.pathname.replace(/\/$/, ''), method = request.method;
    if (method !== 'GET' && method !== 'HEAD') {
      const origin = request.headers.get('origin');
      if (origin && origin !== url.origin) fail(403, '请求来源不匹配');
      if (!(request.headers.get('content-type') || '').includes('application/json')) fail(415, '请使用 JSON 请求');
    }
    let body = {};
    if (method !== 'GET' && method !== 'HEAD') {
      const raw = await request.text();
      if (raw.length > 360000) fail(413, '图片或请求过大，请压缩至 250 KB 以内');
      try { body = JSON.parse(raw || '{}'); } catch { fail(400, 'JSON 格式错误'); }
      if (!body || Array.isArray(body) || typeof body !== 'object') fail(400, '请求应为 JSON 对象');
    }
    const cookieToken = (request.headers.get('cookie') || '').match(/(?:^|;\s*)fb_session=([^;]+)/)?.[1];
    const tokenHash = cookieToken ? await digest(cookieToken) : '';
    const me = tokenHash ? await db.prepare('SELECT u.* FROM users u JOIN sessions s ON s.user_id=u.id WHERE s.token=? AND s.expires_at>?').bind(tokenHash, now()).first() : null;
    const requireUser = () => { if (!me) fail(401, '请先登录后再操作'); return me; };
    const requireAdmin = () => { requireUser(); if (me.role !== 'admin') fail(403, '只有管理员可以执行此操作'); };
    async function loginAs(user) {
      const token = hex(crypto.getRandomValues(new Uint8Array(32))), expires = new Date(Date.now() + 86400000).toISOString();
      await db.prepare('INSERT INTO sessions(token,user_id,expires_at) VALUES (?,?,?)').bind(await digest(token), user.id, expires).run();
      return json({ user: userView(user) }, 200, { 'Set-Cookie': `fb_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=86400${url.protocol === 'https:' ? '; Secure' : ''}` });
    }
    if (route === '/api/health' && method === 'GET') { await db.prepare('SELECT 1').first(); return json({ ok: true, version: VERSION, mode: env.DEMO_MODE === 'false' ? 'standard' : 'teaching-demo' }); }
    if (route === '/api/me' && method === 'GET') return json({ user: userView(me) });
    if (route === '/api/demo' && method === 'POST') {
      if (env.DEMO_MODE === 'false') fail(404, '演示模式未开启');
      if (!['owner', 'claimant', 'admin'].includes(body.persona)) fail(400, '请选择有效演示身份');
      await seedDemo(db);
      return loginAs(await db.prepare('SELECT * FROM users WHERE id=?').bind(`demo-${body.persona}`).first());
    }
    if (route === '/api/register' && method === 'POST') {
      const name = field(body, 'name', 2, 24), email = field(body, 'email', 5, 120).toLowerCase(), password = field(body, 'password', 8, 128);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.endsWith('@demo.findback')) fail(400, '请输入有效邮箱');
      if (await db.prepare('SELECT id FROM users WHERE email=?').bind(email).first()) fail(409, '邮箱已注册');
      const uid = id(), salt = id(), hash = await hashPassword(password, salt);
      await db.prepare('INSERT INTO users(id,name,email,password,salt,role,created_at) VALUES (?,?,?,?,?,?,?)').bind(uid, name, email, hash, salt, 'student', now()).run();
      return loginAs({ id: uid, name, email, role: 'student' });
    }
    if (route === '/api/login' && method === 'POST') {
      const email = field(body, 'email', 1, 120).toLowerCase(), password = field(body, 'password', 1, 128);
      const user = await db.prepare('SELECT * FROM users WHERE email=?').bind(email).first();
      if (!user?.password || await hashPassword(password, user.salt) !== user.password) fail(401, '邮箱或密码不正确');
      return loginAs(user);
    }
    if (route === '/api/logout' && method === 'POST') {
      if (tokenHash) await db.prepare('DELETE FROM sessions WHERE token=?').bind(tokenHash).run();
      return json({ ok: true }, 200, { 'Set-Cookie': 'fb_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0' });
    }
    if (route === '/api/stats' && method === 'GET') {
      const rows = await db.prepare("SELECT type,status,count(*) AS total FROM items WHERE moderation='approved' GROUP BY type,status").all();
      const counts = { found: 0, lost: 0, returned: 0 };
      for (const r of rows.results) { counts[r.type] += r.total; if (r.status === 'returned') counts.returned += r.total; }
      return json(counts);
    }
    if (route === '/api/items' && method === 'GET') {
      const where = ["i.moderation='approved'"], args = [];
      for (const param of ['type', 'category', 'place', 'status']) if (url.searchParams.get(param)) { where.push(`i.${param}=?`); args.push(url.searchParams.get(param)); }
      const q = (url.searchParams.get('q') || '').slice(0, 100);
      if (q) { where.push("(i.title LIKE ? ESCAPE '\\' OR i.description LIKE ? ESCAPE '\\')"); const like = `%${q.replace(/[\\%_]/g, '\\$&')}%`; args.push(like, like); }
      if (url.searchParams.get('mine') === '1') { requireUser(); where.splice(0, 1); where.push('i.owner_id=?'); args.push(me.id); }
      const page = Math.max(1, Math.min(10000, Number(url.searchParams.get('page')) || 1));
      const count = await db.prepare(`SELECT count(*) AS total FROM items i WHERE ${where.join(' AND ')}`).bind(...args).first();
      const rows = await db.prepare(`SELECT i.*,u.name AS owner_name FROM items i JOIN users u ON u.id=i.owner_id WHERE ${where.join(' AND ')} ORDER BY i.created_at DESC, i.id LIMIT 12 OFFSET ?`).bind(...args, (page - 1) * 12).all();
      return json({ items: rows.results.map(publicItem), total: count.total, page, page_size: 12 });
    }
    if (route === '/api/items' && method === 'POST') {
      requireUser();
      const type = field(body, 'type', 4, 5), title = field(body, 'title', 4, 60), category = field(body, 'category', 1, 20), place = field(body, 'place', 1, 40), date = field(body, 'happened_on', 10, 10), description = field(body, 'description', 8, 1000);
      if (!['found', 'lost'].includes(type) || !CATEGORIES.includes(category)) fail(400, '物品类型或分类不正确');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0,10) !== date || date > now().slice(0,10)) fail(400, '日期无效或晚于今天');
      const question = type === 'found' ? field(body, 'question', 4, 120) : '', privateNote = type === 'found' ? field(body, 'private_note', 2, 500) : '';
      const image = body.image || '';
      if (typeof image !== 'string' || image.length > 340000 || (image && !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(image))) fail(400, '仅支持 250 KB 内的 PNG/JPEG/WebP 图片');
      // Phone numbers in public text are rejected. All new posts require human moderation.
      if (/1[3-9]\d{9}/.test(title + description)) fail(400, '请移除公开描述中的手机号码');
      const iid = id(), ts = now();
      await db.batch([
        db.prepare('INSERT INTO items(id,owner_id,type,title,category,place,happened_on,description,question,private_note,image,visual,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(iid, me.id, type, title, category, place, date, description, question, privateNote, image, ['bag','keys','headphones','book','cup','umbrella'].includes(body.visual) ? body.visual : 'bag', ts, ts),
        event(db, iid, me.id, '发布物品', '等待内容审核'),
        notice(db, me.id, iid, '发布成功，等待审核', '管理员审核公开文字和图片后，物品才会出现在广场。')
      ]);
      return json({ id: iid, moderation: 'pending' }, 201);
    }
    const itemMatch = route.match(/^\/api\/items\/([^/]+)$/);
    if (itemMatch && method === 'GET') {
      const item = await db.prepare('SELECT i.*,u.name AS owner_name FROM items i JOIN users u ON u.id=i.owner_id WHERE i.id=?').bind(itemMatch[1]).first();
      if (!item || (item.moderation !== 'approved' && item.owner_id !== me?.id && me?.role !== 'admin')) fail(404, '物品不存在或暂未公开');
      let claims = [];
      if (me) {
        const rows = await db.prepare('SELECT c.*,u.name AS applicant_name FROM claims c JOIN users u ON c.applicant_id=u.id WHERE c.item_id=? AND (?=1 OR c.applicant_id=?) ORDER BY c.created_at DESC').bind(item.id, item.owner_id === me.id ? 1 : 0, me.id).all();
        claims = rows.results;
      }
      const result = publicItem(item);
      if (me?.id === item.owner_id) result.private_note = item.private_note;
      const participant = me && (me.id === item.owner_id || claims.length > 0);
      const events = participant ? (await db.prepare('SELECT action,note,created_at FROM events WHERE item_id=? ORDER BY created_at,id').bind(item.id).all()).results : [];
      return json({ item: result, claims, events });
    }
    const close = route.match(/^\/api\/items\/([^/]+)\/close$/);
    if (close && method === 'POST') {
      requireUser();
      const result = await db.prepare("UPDATE items SET status='closed',updated_at=? WHERE id=? AND owner_id=? AND status='open'").bind(now(), close[1], me.id).run();
      if (!result.meta.changes) fail(409, '仅发布者可关闭尚未进入交接的物品');
      await db.batch([db.prepare("UPDATE claims SET status='rejected',review_note='发布者已关闭帖子',updated_at=? WHERE item_id=? AND status='pending'").bind(now(), close[1]), event(db, close[1], me.id, '关闭物品')]);
      return json({ ok: true });
    }
    const createClaim = route.match(/^\/api\/items\/([^/]+)\/claims$/);
    if (createClaim && method === 'POST') {
      requireUser();
      const item = await db.prepare("SELECT * FROM items WHERE id=? AND moderation='approved'").bind(createClaim[1]).first();
      if (!item) fail(404, '物品不存在');
      if (item.type !== 'found' || item.status !== 'open') fail(409, '此物品暂不接受认领');
      if (item.owner_id === me.id) fail(403, '不能认领自己发布的物品');
      const evidence = field(body, 'evidence', 6, 800), cid = id(), ts = now();
      try {
        await db.batch([
          db.prepare('INSERT INTO claims(id,item_id,applicant_id,evidence,created_at,updated_at) VALUES (?,?,?,?,?,?)').bind(cid, item.id, me.id, evidence, ts, ts),
          notice(db, item.owner_id, item.id, '收到新的认领申请', '请在物品详情中人工核对申请者提供的私密特征。'),
          event(db, item.id, me.id, '提交认领申请', '私密证据仅申请者和拾主可见')
        ]);
      } catch (e) { if (/UNIQUE/.test(String(e))) fail(409, '你已提交申请，请等待处理'); throw e; }
      return json({ id: cid }, 201);
    }
    if (route === '/api/claims' && method === 'GET') {
      requireUser();
      const rows = await db.prepare('SELECT c.*,i.title,i.owner_id,i.status AS item_status,u.name AS applicant_name FROM claims c JOIN items i ON i.id=c.item_id JOIN users u ON u.id=c.applicant_id WHERE c.applicant_id=? OR i.owner_id=? ORDER BY c.created_at DESC').bind(me.id, me.id).all();
      return json({ claims: rows.results });
    }
    const review = route.match(/^\/api\/claims\/([^/]+)\/review$/);
    if (review && method === 'POST') {
      requireUser();
      const claim = await db.prepare('SELECT c.*,i.owner_id,i.status AS item_status,i.active_claim_id FROM claims c JOIN items i ON i.id=c.item_id WHERE c.id=?').bind(review[1]).first();
      if (!claim) fail(404, '申请不存在');
      if (claim.owner_id !== me.id) fail(403, '只有拾主可以核验证据');
      if (claim.status !== 'pending' || claim.item_status !== 'open') fail(409, '此申请或物品状态已变化，请刷新');
      if (!['approved', 'rejected'].includes(body.decision)) fail(400, '核验结论不正确');
      const noteText = field(body, 'note', 2, 500), ts = now();
      if (body.decision === 'approved') {
        const res = await db.batch([
          db.prepare("UPDATE items SET status='claimed',active_claim_id=?,updated_at=? WHERE id=? AND status='open'").bind(claim.id, ts, claim.item_id),
          db.prepare("UPDATE claims SET status='approved',review_note=?,updated_at=? WHERE id=? AND status='pending' AND EXISTS (SELECT 1 FROM items WHERE id=? AND active_claim_id=?)").bind(noteText, ts, claim.id, claim.item_id, claim.id),
          db.prepare("UPDATE claims SET status='rejected',review_note='另一申请已通过核验',updated_at=? WHERE item_id=? AND id<>? AND status='pending' AND EXISTS (SELECT 1 FROM items WHERE id=? AND active_claim_id=?)").bind(ts, claim.item_id, claim.id, claim.item_id, claim.id)
        ]);
        if (!res[0].meta.changes || !res[1].meta.changes) fail(409, '已有其他认领通过，请刷新');
      } else {
        const res = await db.prepare("UPDATE claims SET status='rejected',review_note=?,updated_at=? WHERE id=? AND status='pending'").bind(noteText, ts, claim.id).run();
        if (!res.meta.changes) fail(409, '申请状态已变化');
      }
      await db.batch([notice(db, claim.applicant_id, claim.item_id, body.decision === 'approved' ? '认领核验通过' : '认领核验未通过', noteText), event(db, claim.item_id, me.id, body.decision === 'approved' ? '核验通过' : '核验未通过', '已记录人工核验结论')]);
      return json({ ok: true });
    }
    const confirm = route.match(/^\/api\/claims\/([^/]+)\/confirm$/);
    if (confirm && method === 'POST') {
      requireUser();
      const claim = await db.prepare('SELECT c.*,i.owner_id,i.active_claim_id,i.status AS item_status FROM claims c JOIN items i ON i.id=c.item_id WHERE c.id=?').bind(confirm[1]).first();
      if (!claim) fail(404, '申请不存在');
      if (![claim.owner_id, claim.applicant_id].includes(me.id)) fail(403, '仅交接双方可确认');
      if (claim.status !== 'approved' || claim.active_claim_id !== claim.id || !['claimed','returned'].includes(claim.item_status)) fail(409, '核验通过后才可确认交接');
      const column = me.id === claim.owner_id ? 'owner_confirmed' : 'applicant_confirmed';
      if (!claim[column]) {
        await db.batch([
          db.prepare(`UPDATE claims SET ${column}=1,updated_at=? WHERE id=? AND status='approved'`).bind(now(), claim.id),
          db.prepare("UPDATE items SET status='returned',updated_at=? WHERE id=? AND status='claimed' AND active_claim_id=? AND EXISTS(SELECT 1 FROM claims WHERE id=? AND owner_confirmed=1 AND applicant_confirmed=1)").bind(now(), claim.item_id, claim.id, claim.id),
          event(db, claim.item_id, me.id, me.id === claim.owner_id ? '拾主确认交接' : '失主确认收取'),
          notice(db, me.id === claim.owner_id ? claim.applicant_id : claim.owner_id, claim.item_id, '交接进度已更新', '对方已确认交接，双方均确认后物品才会标为已归还。')
        ]);
      }
      return json({ ok: true, item: await db.prepare('SELECT id,status FROM items WHERE id=?').bind(claim.item_id).first() });
    }
    if (route === '/api/notices' && method === 'GET') { requireUser(); return json({ notices: (await db.prepare('SELECT * FROM notices WHERE user_id=? ORDER BY created_at DESC LIMIT 100').bind(me.id).all()).results }); }
    if (route === '/api/notices/read' && method === 'POST') { requireUser(); await db.prepare('UPDATE notices SET is_read=1 WHERE user_id=?').bind(me.id).run(); return json({ ok: true }); }
    if (route === '/api/admin/items' && method === 'GET') {
      requireAdmin(); return json({ items: (await db.prepare('SELECT i.id,i.title,i.type,i.description,i.image,i.category,i.place,i.moderation,i.status,i.created_at,u.name AS owner_name FROM items i JOIN users u ON u.id=i.owner_id ORDER BY i.created_at DESC LIMIT 100').all()).results });
    }
    const moderate = route.match(/^\/api\/admin\/items\/([^/]+)$/);
    if (moderate && method === 'POST') {
      requireAdmin();
      if (!['approved','rejected'].includes(body.decision)) fail(400, '审核结论不正确');
      const noteText = field(body, 'note', 2, 500);
      const item = await db.prepare('SELECT * FROM items WHERE id=?').bind(moderate[1]).first();
      if (!item) fail(404, '物品不存在');
      await db.batch([
        db.prepare('UPDATE items SET moderation=?,updated_at=? WHERE id=?').bind(body.decision, now(), item.id),
        notice(db, item.owner_id, item.id, body.decision === 'approved' ? '内容审核通过' : '内容暂未通过审核', noteText),
        event(db, item.id, me.id, body.decision === 'approved' ? '内容审核通过' : '内容审核未通过', noteText)
      ]);
      return json({ ok: true });
    }
    fail(404, '接口不存在');
  } catch (error) {
    if (error instanceof ApiError) return json({ error: error.message }, error.status);
    console.error('FindBack API error', error?.message);
    return json({ error: '服务暂时无法处理，请稍后重试' }, 500);
  }
}
