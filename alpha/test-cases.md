# 拾光 FindBack α 测试用例文档

环境：2026-11-21，Windows、Node.js v24.18.0。每项新建独立数据库；持久化使用临时文件。原始日志为 evidence/2026-11-21/extended/api-tests-29.tap。共 29 项，每行对应一个顶层 test，完整请求体和断言以测试代码为准。

| 编号 | 用例 | 前置/场景 | 输入/操作 | 预期结果 | 实际 | 文件 |
| --- | --- | --- | --- | --- | --- | --- |
| TC-01 | 匿名不能发布或读取他人的通知 | 匿名访问 | POST /items、GET /notices | 401 | 通过 | api.test.mjs |
| TC-02 | 演示数据可重复初始化且不会产生重复物品 | 重复初始化 | owner/claimant 分别初始化 | 列表保持 6 条 | 通过 | api.test.mjs |
| TC-03 | 公开列表与详情不暴露核验参考、账号邮箱和密码 | 读取列表与详情 | 检查匿名返回 JSON | 无核验参考、私密答案、邮箱或密码 | 通过 | api.test.mjs |
| TC-04 | 关键词、分类、地点、类型、空结果可组合检索 | 组合筛选及特殊字符 | 绿色+拾物+生活用品+图书馆及无结果查询 | 组合命中 1；空结果 0；百分号按文字搜索 | 通过 | api.test.mjs |
| TC-05 | 发布先保存为待审核，发布者可见，公众不可见 | 发布新物品 | 新增后分别以匿名和发布者查看 | 201 pending；公众 404；发布者可见 | 通过 | api.test.mjs |
| TC-06 | 普通用户不能审核帖子，管理员审核后公开并发通知 | 审核权限 | 普通用户和管理员审核新帖 | 普通用户 403；管理员 200；内容公开并通知 | 通过 | api.test.mjs |
| TC-07 | 帖子字段、未来日期、联系方式和非法图片校验 | 非法输入 | 逐个提交不符合规则的字段 | 400 | 通过 | api.test.mjs |
| TC-08 | 只有拾物开放帖子可认领，不能认领自己的 | 认领限制 | 本人、寻物帖及短证据认领 | 403、409、400 | 通过 | api.test.mjs |
| TC-09 | 认领申请去重，私密证据只有申请者和拾主可见 | 去重和隔离 | 同申请者二次申请、不同身份读取 | 重复 409；证据仅相关方可见 | 通过 | api.test.mjs |
| TC-10 | 只有拾主可核验，未经核验不能确认交接 | 未授权状态操作 | 非拾主核验、未核验确认 | 403、409 | 通过 | api.test.mjs |
| TC-11 | 双方确认才结案，单方确认和重复点击不提前结案 | 确认顺序及幂等 | 通过后单方、双方和重复确认 | 单方 claimed；双方 returned；不提前归还 | 通过 | api.test.mjs |
| TC-12 | 同时认领只能一人通过核验 | 两名申请者竞争 | 先批准第一人，再批准第二人 | 后者 409，另一申请 rejected | 通过 | api.test.mjs |
| TC-13 | 拒绝申请有原因并通知申请人，可重新补证申请 | 拒绝后补证 | 拒绝附原因，再重新申请 | 拒绝 200；再次申请 201；生成通知 | 通过 | api.test.mjs |
| TC-14 | 通知按用户隔离，标已读不影响他人 | 通知隔离 | 不同身份读取和标已读 | 仅影响本人通知 | 通过 | api.test.mjs |
| TC-15 | 账号密码哈希、登录、退出与会话有效性 | 账号和会话 | 注册、错误密码、退出、重复注册 | 哈希非明文；错误 401；退出身份空；重复 409 | 通过 | api.test.mjs |
| TC-16 | 跨源写入拒绝，JSON 类型和格式验证 | 请求检查 | 非法 Origin、无效 JSON | 403、400 | 通过 | api.test.mjs |
| TC-17 | 关闭物品后的认领结束，不能跨用户关闭 | 关闭权限 | 非发布者关闭、发布者关闭、再认领 | 409、200、409 | 通过 | api.test.mjs |
| TC-18 | 数据库重开后已发布的数据仍存在 | 磁盘持久化 | 发布后关闭并重开数据库 | 记录仍存在 | 通过 | api.test.mjs |
| TC-19 | A02: fractional pagination is normalized rather than causing a database error | 小数页码 | 1.1、1.01、2.25 | 200；页码向下取整 | 通过 | alpha.test.mjs |
| TC-20 | A02: pagination rejects nonfinite values by falling back to page one | 异常页码 | NaN、Infinity、abc、负数、0、超大有限数 | 回到 1；超大有限数限制 10000 | 通过 | alpha.test.mjs |
| TC-21 | A03: standard mode disables all demo identities and reports its mode | 标准模式 | DEMO_MODE=false 下 health/demo/me | mode=standard；demo 404；me.user=null | 通过 | alpha.test.mjs |
| TC-22 | A03: expired sessions lose access to private resources | 过期会话 | 将 expires_at 改到过去后访问私有接口 | me.user=null；notices/admin 401 | 通过 | alpha.test.mjs |
| TC-23 | A03: JSON arrays, primitive bodies and wrong media types fail predictably | 非对象请求 | 数组、null、字符串、数字、text/plain | 400；错误媒体类型 415 | 通过 | alpha.test.mjs |
| TC-24 | A03: oversized API bodies are rejected before business processing | 过大请求 | padding 长度 360001 | 413 | 通过 | alpha.test.mjs |
| TC-25 | A03: a third party cannot inspect evidence or confirm another handover | 第三方权限 | 无关用户读取认领/事件并确认交接 | claims/events 空；确认 403 | 通过 | alpha.test.mjs |
| TC-26 | A03: a failed batch rolls back every write in the transaction | 事务回滚 | batch 先改名，再插入重复主键 | batch 拒绝；改名回滚 | 通过 | alpha.test.mjs |

浏览器 6 项检查另见 evidence/2026-11-21/browser-report.json：桌面六件物品、空结果反馈、申请者进度、单方确认、双方确认、390px 无水平溢出。只运行了本地 Edge，不等于跨浏览器或真实校园验收。

## 新增状态回归

| 编号 | 场景 | 操作 | 预期与实际 |
| --- | --- | --- | --- |
| TC-27 | 失主先确认与重复确认 | 批准后失主先点两次，拾主后点两次 | 单方保持 claimed，双方 returned，全部通过 |
| TC-28 | 重叠核验竞争 | 两个申请以 Promise.all 重叠批准 | 一个 200、一个 409，唯一 approved，物品指向正确申请，通过 |
| TC-29 | 核验后非法转换 | 尝试关闭物品或再次拒绝批准申请 | 均为 409，交接状态保持，通过 |

扩展页面检查另有 9 项，与首轮 6 项合计 15 项，见 extended/extended-ui-report.json。
