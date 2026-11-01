import fs from 'node:fs/promises';
import path from 'node:path';
import {Presentation,PresentationFile} from '@oai/artifact-tool';
const root=path.resolve('FindBack_A'),build=path.join(root,'.ppt-build'),out=path.join(root,'交付');
await fs.mkdir(build,{recursive:true});await fs.mkdir(out,{recursive:true});
const P='https://modao.cc/proto/mZBdN92Gtntbi9MCoK4oiE/sharing?view_mode=device&screen=rbpVZhjdku4xrr7am&canvasId=rcVZhmZ6fw9Zfa16';
const U='https://findback-gamers2.x1013956.chatgpt.site';
const C={bg:'#FFFFFF',ink:'#253247',green:'#2D665B',muted:'#697586',line:'#DCE2E8',pale:'#EDF3ED',white:'#FFFFFF',amber:'#986633'};
const font='Microsoft YaHei';
const deck=Presentation.create({slideSize:{width:1280,height:720}});
function box(s,x,y,w,h,fill=C.white,line='none',geometry='rect'){return s.shapes.add({geometry,position:{left:x,top:y,width:w,height:h},fill,line:{fill:line,width:line==='none'?0:1}})}
function txt(s,v,x,y,w,h,size=23,color=C.ink,bold=false){let t=box(s,x,y,w,h,'none');t.text=v;t.text.style={fontSize:size,typeface:font,color,bold,autoFit:'shrinkText',insets:0};return t;}
function slide(n,k,h,sub=''){let s=deck.slides.add();s.background.fill=C.bg;txt(s,'软件工程实践 · 原型设计',64,35,1150,24,14,C.green,true);txt(s,h,64,79,1150,62,36,C.ink,true);if(sub)txt(s,sub,66,150,1140,44,19,C.muted);box(s,64,678,1152,1,C.line);txt(s,'Gamers2 · EE308FZ 软件工程 · 原型设计与基础版',64,691,1030,17,11,C.muted);txt(s,String(n).padStart(2,'0'),1160,689,56,20,13,C.muted,true);return s;}
function note(s,t){s.speakerNotes.text=t;}
function link(s,label,url,x,y,w,h){box(s,x,y,w,h,C.green);return txt(s,[[{run:label,style:{bold:true,color:C.white,underline:'sng'},link:{uri:url,isExternal:true}}]],x+18,y+15,w-36,h-23,23,C.white,true);}
async function img(s,name,x,y,w,h,fit='contain'){s.images.add({blob:new Uint8Array(await fs.readFile(path.join(root,'docs/assets',name))),contentType:'image/jpeg',alt:name,fit,position:{left:x,top:y,width:w,height:h}});}
function table(s,values,x,y,w,h,widths){const t=s.tables.add({rows:values.length,columns:values[0].length,left:x,top:y,width:w,height:h,values,columnWidths:widths});t.borders.assign({fill:C.line,width:1});for(let r=0;r<values.length;r++)for(let c=0;c<values[0].length;c++){const ce=t.getCell(r,c);ce.fill=r===0?C.green:r%2?C.white:C.pale;ce.text.style={fontSize:18,typeface:font,color:r===0?C.white:C.ink,bold:r===0,autoFit:'shrinkText'};}return t;}
function line(s,a,b,c,y){txt(s,a,72,y,50,48,30,C.green,true);txt(s,b,145,y,320,36,25,C.ink,true);txt(s,c,485,y,710,58,21,C.muted);}

{
let s=slide(1,'PROTOTYPE DESIGN','拾光 FindBack','校园失物招领基础版 · 原型设计与实现汇报初版');
txt(s,'校园失物招领系统\n原型与功能演示',72,236,640,150,45,C.ink,true);
txt(s,'查找 → 私密核验 → 双向确认',76,414,670,38,25,C.green,true);
txt(s,'Gamers2 · 14 人团队\n2026 年 11 月 1 日',76,482,650,60,20,C.muted);
link(s,'原型链接：点击打开墨刀 ↗',P,76,572,600,62);
txt(s,[[{run:P.replace('?','\n?'),style:{underline:'sng'},link:{uri:P,isExternal:true}}]],76,639,1136,36,15,C.green);
box(s,806,231,388,345,C.pale);txt(s,'本次展示',840,263,310,40,28,C.ink,true);txt(s,'发布与搜索\n认领申请与人工核验\n双向交接与消息\n\n原型工具：墨刀',842,333,310,200,22,C.ink);
note(s,'主入口使用教师作业清单中的墨刀。原型为模拟数据，实际前后端独立运行。本次为初版，不能把后续规划或团队未确认的信息当成已完成。作业来源 https://bbs.csdn.net/topics/620556488 。');
}
{
let s=slide(2,'01 / PURPOSE','本次原型的三个重点','沿用拾光 FindBack 选题，本次先完成发布、认领、核验与交接基础流程。');
line(s,'01','信息容易被淹没','广场提供关键词、类别、地点与状态筛选。',235);
line(s,'02','仅凭照片难判断归属','失主提交未公开特征，由拾主人工作出核验结论。',350);
line(s,'03','交接结果缺少回执','双方分别确认，单方操作不能直接标记为已归还。',465);
txt(s,'当前范围：校园服务概念与教学演示；图像匹配、校园认证和小程序留待后续。',76,594,1120,44,20,C.muted);
note(s,'这些是产品设计动机，不代表已经完成真实校园调研。基础版是既有 SRS 的范围收缩。角色包括访客、失主、拾主和内容管理员。');
}
{
let s=slide(3,'02 / FLOW','主要操作流程与页面状态','内容审核决定能否公开；认领核验决定是否进入交接。');
table(s,[['阶段','谁来操作','页面反馈'],['发布与公开审核','发布者 → 内容管理员','待审核 / 已通过 / 未通过'],['浏览与认领','失主','寻找中 → 申请待处理'],['人工核验','拾主','核验通过 → 交接中'],['确认交出','拾主','仅拾主确认，仍为交接中'],['确认收到','失主','双方确认 → 已归还']],72,220,1136,370,[255,300,581]);
txt(s,'核验未通过可重新申请；物品关闭后停止认领；关键操作生成站内通知。',76,614,1110,36,21,C.green,true);
note(s,'后端物品状态值 open / claimed / returned / closed，claimed 在界面显示交接中。审核状态与认领状态独立。避免把公开内容审核通过等同于认领成功。');
}
{
let s=slide(4,'03 / HOME','首页与物品检索','首页给出两个发布入口，列表保留地点、日期和状态。');
await img(s,'home-top.jpg',72,216,785,413);
txt(s,'搜索和组合筛选',900,239,300,40,26,C.ink,true);txt(s,'关键词 + 信息类型\n分类 + 地点 + 状态\n\n空结果有提示\n一键清除筛选',900,307,285,260,23,C.muted);
note(s,'截图来自配套实际系统，物品信息均为示例。可在墨刀中点击筛选、详情和认领按钮；六件示例物品使用生成配图并标注；其余无照片记录使用占位提示。');
}
{
let s=slide(5,'04 / PUBLISH','公开描述与私密参考信息分开填写','提交后进入待审核；审核通过的信息才出现在公共广场。');
await img(s,'publish-form.jpg',72,215,688,430);
txt(s,'公开给大家看的',804,237,370,35,25,C.ink,true);txt(s,'物品信息、图片、地点、\n日期、描述与核验问题',804,292,360,82,22,C.muted);
txt(s,'留给拾主核验的',804,417,370,35,25,C.ink,true);txt(s,'私密参考信息\n不返回公共列表',804,470,360,75,22,C.muted);txt(s,'图片需人工审核，暂未实现自动脱敏。',804,584,355,54,18,C.amber);
note(s,'实际系统已走完发布笔袋、显示待审核、管理员通过、搜索公开结果的浏览器流程。字段校验不等于完整自动隐私识别。');
}
{
let s=slide(6,'05 / CLAIM','认领申请与人工核验','申请者描述公开图片之外的细节；内容管理员不因此获得私密认领证据。');
await img(s,'claim-dialog.jpg',72,215,535,372);await img(s,'owner-evidence.jpg',645,215,563,372);
txt(s,'失主：提交私密特征',84,610,520,32,23,C.green,true);txt(s,'拾主：核对参考信息并记录结论',657,610,550,32,23,C.green,true);
note(s,'两张截图分别来自失主与拾主演示身份。公开问题可以被看到，参考答案不公开；申请证据只对申请者和物品发布者可见。不能只靠隐藏按钮控制权限，API 也要隔离字段。');
}
{
let s=slide(7,'06 / HANDOVER','双方确认交接','核验通过后先进入交接；进度分别显示“交出”和“收取”。');
await img(s,'returned-progress.jpg',72,222,720,407);
txt(s,'拾主确认交出',836,247,350,40,27,C.ink,true);txt(s,'仍为交接中',838,305,350,34,24,C.muted);
txt(s,'失主确认收取',836,414,350,40,27,C.ink,true);txt(s,'双方已确认 → 已归还',838,473,360,72,25,C.green,true);
note(s,'实际浏览器验证：双方确认后 item.status=returned，刷新仍保留；页面显示双方已确认，物品已归还。没有真实线下交接证据，只有教学流程验证。');
}
{
let s=slide(8,'07 / IMPLEMENTATION','基础版实现与验证结果','前端 HTML/CSS/JavaScript → HTTP API → SQLite；云端复用业务模块适配 D1。');
table(s,[['验证范围','当前结果'],['接口测试','18 / 18 通过：权限、私密字段、审核、交接、会话、持久化'],['本地浏览器','认领至归还全流程；发布 → 管理员审核 → 公开搜索'],['墨刀分享预览','分享页与认领、核验、交接流程已检查'],['构建与部署','构建通过；演示站部署成功，当前账号私有']],72,220,1136,330,[270,866]);
txt(s,'未验证：真实校园试点、压测、图像匹配准确率、生产运行指标。',76,588,1120,40,22,C.amber,true);
note(s,'测试记录 docs/test-results.txt。竞争申请测试只验证一条获批，不是负载测试。早期 SRS 计划 Java/Spring Boot，本基础版用 Node.js/SQLite，不能声称已按原栈完成全部系统。');
}
{
let s=slide(9,'08 / ITERATION','设计中遇到的问题','把设计上的模糊点，变成可以检查的规则。');
table(s,[['困难','调整与尝试','当前结果'],['范围过大','先收缩到发布、认领、核验、交接','基础流程可独立演示'],['审核含义混淆','拆分公开审核与认领核验','界面与 API 含义一致'],['私密证据泄露风险','分离问题、参考答案和申请证据','接口测试验证读取权限'],['单方提前结束','两个独立确认标记','双方确认才归还'],['墨刀原生转换等待','改用官方 HTML 组件并嵌入正式页','分享预览已可操作']],72,218,1136,390,[230,480,426]);
note(s,'墨刀采用官方 HTML 导入组件，保留内部 JavaScript 交互，未宣称所有控件已转换为原生图层。官方功能说明 https://modao.cc/feature/html-editor/ 。');
}
{
let s=slide(10,'09 / TEAM','本次分工与贡献比例','');
table(s,[['成员 / 学号后3位','实际完成工作','贡献'],['Sun Zikun / 315','范围、排期与汇总','13%'],['Luo Yuhan / 313','接口、部署与归档','11%'],['Zhou Debin / 329','角色与需求追踪','6%'],['Zheng Ziyang / 327','规则与异常路径','6%'],['Wu Junjia / 223','视觉、布局与原型演示','7%'],['Zheng Zongyuan / 328','广场与搜索','6%'],['Zuo Xiangrong / 230','详情与认领','6%']],72,218,548,360,[220,248,80]);
table(s,[['成员 / 学号后3位','实际完成工作','贡献'],['Li Jianhang / 210','发布与消息','6%'],['Liu Peikun / 213','发布与审核接口','6%'],['Wang Qiushi / 317','认领与状态规则','6%'],['Xiao Zhengyu / 318','会话、通知与权限','6%'],['Liu Junye / 212','匹配后续规划','6%'],['Xu Yichao / 319','正常与异常验收','6%'],['Zhou Shengdong / 330','兼容与材料一致性','9%']],652,218,556,360,[222,254,80]);
txt(s,'13% + 11% + 9% + 7% + 10 × 6% = 100%。',76,611,1120,40,19,C.muted,true);
note(s,'本次四名成员姓名统一使用拼音英文：Sun Zikun 13%、Luo Yuhan 11%、Zhou Shengdong 9%、Wu Junjia 7%；其余 10 人各 6%，合计 100%。Wu Junjia 负责原型演示；Zhou Shengdong 负责兼容和材料一致性检查。本页分工表记录本次实际完成的工作，人员、任务与贡献比例保持既有对应关系。');
}
{
let s=slide(11,'10 / LIVE DEMO','现场演示','演示负责人：Wu Junjia。放映时点击绿色按钮；编辑时右键选择“打开超链接”。');
line(s,'1','失主找物品','选择“我是失主” → 搜索并打开图书馆双肩包。',228);
line(s,'2','提交与核验','描述黄色封面的高等数学笔记 → 切换拾主核验。',318);
line(s,'3','双方交接确认','拾主确认交出 → 切换失主确认收到 → 查看消息。',408);
link(s,'原型链接：点击打开墨刀 ↗',P,76,540,648,68);
txt(s,[[{run:P.replace('?','\n?'),style:{underline:'sng'},link:{uri:P,isExternal:true}}]],76,620,1136,44,18,C.green);
txt(s,[[{run:'配套实际系统（账号私有）↗',style:{underline:'sng'},link:{uri:U,isExternal:true}}]],780,554,420,50,21,C.green,true);
note(s,`演示负责人：Wu Junjia。点击原型按钮；若屏幕比例较小，可在墨刀调整预览缩放。完整演示按 README 操作。原型 ${P} 。实际系统 ${U} 当前账号私有，不要向老师承诺可免登录访问。`);
}
{
let s=slide(12,'11 / TEAM DISCUSSION','团队讨论与提交准备','本次原型讨论现场（团队提供）');
await img(s,'09-team-discussion.jpg',72,210,600,450);
txt(s,'协作感受',724,222,480,40,28,C.ink,true);
txt(s,'主要以宿舍为单位分配任务。\n熟人协作方便沟通、推进更快，\n也便于自主安排时间与做法。',724,278,474,92,23,C.muted);
txt(s,'已补齐',724,379,480,36,26,C.green,true);
txt(s,'分工、贡献比例与感受评价\n讨论照片与公开附件',724,425,474,76,22,C.ink);
txt(s,'提交前检查',724,526,480,34,25,C.ink,true);
txt(s,'博客图片、目录与公开链接\n课程提交与答辩演练',724,573,474,80,21,C.muted);
note(s,'照片由团队本次提供，作为原型讨论现场记录。照片中可见成员围绕电脑查看页面；拍摄日期、具体讨论主题和参与者身份未另行确认，因此不补写。实际完成工作与团队协作感受已补充，队友评价已填写于博客第 8.3 节。贡献比例、英文姓名、Wu Junjia 演示职责与前页一致，博客及课程提交状态仍以实际平台记录为准。队友评价：这次合作中，队友们各有侧重。Sun Zikun 负责统筹，让任务安排更清楚；Luo Yuhan 负责接口、部署和归档，为系统运行和材料交付提供支持；Wu Junjia 负责原型视觉、布局和演示准备，让功能展示更直观；Zhou Shengdong 负责兼容与材料一致性检查，帮助完善细节。其他成员在页面、业务规则和测试上的工作也同样重要。以宿舍为单位合作，让我们沟通更方便，也更容易配合彼此的时间和习惯。');
}

for(const [i,s]of deck.slides.items.entries()){const b=await deck.export({slide:s,format:'png',scale:1});await fs.writeFile(path.join(build,`slide-${String(i+1).padStart(2,'0')}.png`),new Uint8Array(await b.arrayBuffer()));}
await(await PresentationFile.exportPptx(deck)).save(path.join(build,'candidate.pptx'));
console.log(JSON.stringify({slides:deck.slides.items.length,candidate:path.join(build,'candidate.pptx')}));
