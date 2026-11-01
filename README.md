# 拾光 FindBack · Gamers2 基础版

校园失物招领课程演示。原型使用墨刀；实际系统包含独立前端、HTTP API 和 SQLite 持久化。

## 作业与公开附件

- [教师原文：Prototype Design](https://bbs.csdn.net/topics/620556488)，截止 2026-11-01 23:59（北京时间）。
- [公开源码仓库](https://github.com/Zarvik188/FindBack-Gamers2-Prototype)，默认分支 `main`。
- [下载答辩 PPT](https://github.com/Zarvik188/FindBack-Gamers2-Prototype/raw/refs/heads/main/deliverables/FindBack-Prototype.pptx)：12 页，第 1、11 页含完整网址与可点击原型按钮。
- [PDF 备用稿](https://github.com/Zarvik188/FindBack-Gamers2-Prototype/blob/main/deliverables/FindBack-Prototype.pdf)。
- [下载全部源码 ZIP](https://github.com/Zarvik188/FindBack-Gamers2-Prototype/archive/refs/heads/main.zip)。
- [博客初稿](docs/拾光FindBack-原型设计作业-博客初版.md)、[作业逐项核对](docs/assignment-checklist.md)、[代码规范](codestyle.md)。

## 入口

- [墨刀交互原型](https://modao.cc/proto/mZBdN92Gtntbi9MCoK4oiE/sharing?view_mode=device&screen=rbpVZhjdku4xrr7am&canvasId=rcVZhmZ6fw9Zfa16)：模拟数据，刷新重置。
- [墨刀编辑项目](https://modao.cc/proto/design/pb2mvxifnjjqt5ecl)：需要项目账号权限；正式页面内为 HTML 交互组件，并非每个控件均转换成墨刀原生图层。
- [实际系统演示站](https://findback-gamers2.x1013956.chatgpt.site)：当前为创建者账号私有；答辩主入口使用墨刀。
- `prototype-html/拾光FindBack-完整交互原型.html`：完整原型的离线备份，可直接用现代浏览器打开；不连接真实 API。

## 本地启动

需要 Node.js 24 或更高版本（使用内置 `node:sqlite`），无须安装后端依赖。在本目录执行：

```powershell
npm start
```

浏览器打开 http://127.0.0.1:5180 。按 Ctrl+C 停止。也可以双击 `启动FindBack.cmd`。默认仅监听本机；不需要云账号。首次选择演示身份时生成六条示例物品。

数据库自动保存在 `backend/data/findback.db`，关闭重开仍保留数据。可通过 `PORT`、`FINDBACK_DB` 指定端口和数据库路径。`DEMO_MODE=false` 可关闭服务端演示身份入口，页面仍保留演示说明；新注册账号为普通用户，不会自动成为管理员。

```powershell
npm test
```

18 项接口测试覆盖权限、私密字段、审核、交接、会话和持久化，使用独立临时数据库。当前结果见 `docs/test-results.txt`。这不是压力测试或校园实地试点报告。

## 功能与技术

前端为 HTML/CSS/JavaScript；后端为 Node.js HTTP 服务和共享业务模块，数据库为 SQLite。`site/` 为同一业务模块的 Vinext / Cloudflare Workers / D1 部署适配，不是另一套产品逻辑。

已实现发布失物/拾物、分类地点状态筛选与搜索、物品详情、私密认领申请、拾主人工作出核验结论、双方交接确认、站内通知、公开内容审核和基础账号登录。公开参考答案、申请者证据分别按角色隔离；后台内容管理员不因此获得认领证据。

示例身份可直接切换，适合教学演示，不具备校园身份认证意义。六条教学示例使用 `frontend/images/` 中生成的物品配图，并标注“示例配图”；其他无图片的信息仍显示“暂无照片”。支持压缩后的小型图片上传，图片内容仍需人工审核。配图提示词与来源记录见 `docs/item-photo-sources.json`。

本版没有实现图像候选匹配、校园统一身份认证、小程序、微信消息、图片自动脱敏、真实定位或生产级运维。早期 SRS 中的上述能力仍是后续规划；本版技术栈也与早期 Java/Spring Boot 计划不同。

## 目录

| 路径 | 内容 |
| --- | --- |
| `frontend/` | 浏览器页面、样式和交互 |
| `backend/service.mjs` | 统一业务 API、鉴权与状态转换 |
| `backend/schema.sql` | 六张业务表与索引 |
| `backend/database.mjs` | SQLite 的 D1 接口适配 |
| `backend/server.mjs` | 本机服务入口 |
| `tests/` | 独立数据库接口测试 |
| `prototype-html/` | 墨刀组件导入源与八张静态设计参考页 |
| `docs/` | 博客、截图、验收记录和交付说明 |
| `scripts/` | 原型生成和云端源码同步脚本 |
| `site/` | 云端部署源码；本机运行不依赖此目录 |

## 课堂演示

1. 墨刀打开首页，选择“我是失主”，筛选、搜索并打开绿色双肩包。
2. 点击申请认领，描述图片之外的细节，例如“包内有一本黄色封面的高等数学笔记”。
3. 切换“我是拾主”，查看私密证据并作出人工核验结论。
4. 拾主确认交出，状态仍为交接中；切换失主确认收取，才显示已归还。
5. 打开消息页，说明状态变化如何通知双方。刷新原型可重置模拟数据。
6. 实际系统可另行演示发布待审核、管理员审核和数据库刷新持久化。

## 交付边界

本仓库提供可编辑 PPT/PDF、原型源码、前后端与测试，博客已填写公开仓库及附件链接。贡献比例已填写：孙梓焜、罗钰涵、周胜东、吴浚嘉各 10%，其余 10 人各 6%，合计 100%。真实成员完成情况、讨论照片与个人感受仍需团队依据真实记录补齐。尚未代发布 CSDN 博客或向课程作业页提交；GitHub 上传不能替代上述提交。


## 源码与生成说明

`prototype-html/拾光FindBack-完整交互原型.html` 是导入墨刀的 HTML 交互组件源文件，图片、样式和模拟请求已内嵌，可下载后双击打开。墨刀项目中的原生页面布局与分享设置由墨刀管理，GitHub 不替代墨刀项目。

`npm start` 启动真实前后端后，可运行 `node scripts/make-interactive-prototype.mjs` 重新生成离线交互原型。`node scripts/make-prototype.mjs` 生成八张静态参考页。两种原型使用教学示例，不代表真实校园数据。生成物品配图的提示词与来源见 `docs/item-photo-sources.json`。

云端适配源码保留在 `site/`，私人托管元数据与凭据已排除。普通课程演示只需根目录的 `npm start`，无须云端账号。
