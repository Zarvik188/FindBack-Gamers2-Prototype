# 代码规范

本项目使用原生 HTML/CSS/JavaScript 和 Node.js ES Modules。代码规则参考 [Google JavaScript Style Guide](https://google.github.io/styleguide/jsguide.html)，按现有基础版采用以下约定：

- JavaScript 使用 `const`/`let`，不使用 `var`；模块使用 `import`/`export`。
- 函数、变量使用 camelCase，常量使用有意义的名称；HTTP API 使用 JSON。
- 页面状态与后端状态一致；鉴权、私密字段过滤与关键状态转换由服务端执行。
- SQL 参数绑定，不将用户输入拼接为 SQL；密码仅保存带盐哈希。
- 用户输入以文本或经转义的方式显示，避免直接拼接未经处理的 HTML。
- 修改权限、核验、交接规则后运行 `npm test`；发布前运行语法检查。
- 不提交数据库、会话、密钥、环境变量文件、依赖目录或私人托管元数据。
- 生成配图明确标注为课程示例；实际贡献、讨论照片与测试结果须与真实记录一致。
