# 曲线罗盘

沪深300全收益（H00300）与中证债券型基金指数（H11023）的双曲线观察网页。

这是独立的「曲线罗盘」项目，不包含量化选基项目。

## 运行

```powershell
npm run install:ci
npm run dev
```

本地地址：http://127.0.0.1:5173 。生产构建：`npm run build`。

## 策略口径

- 两个原始指数按2005-01-04归一为1000；原始基值分别为982.79和1036.30。
- 蓝线：`1000 + exp(1/2) * (H11023归一值 - 1000)`。
- 黄线：`2700 + exp(2/3) * (H11023归一值 - 1000)`。
- 空仓：指数与蓝线的**绝对距离严格小于300点**，发出买入信号。
- 持仓：指数**严格大于黄线**，发出清仓信号。
- 收盘判断、下一交易日收盘模拟成交，全仓、收益复投、现金无利息、未扣费用。最后一天的信号不会提前计为成交。
- 持仓状态由2005年起的策略交易唯一推演；页面、买卖提示与通知统一使用该状态，不提供手动覆盖。

## 日更与通知

`/api/market`在服务器读取中证官方接口，两个指数均发布同一日期数据后才追加该日。网页打开后立即读取，每5分钟及重新切回页面时检查。服务器正常响应缓存15分钟，失败1分钟后可重试。无需本机Python进程或API密钥。

接口失败保留历史数据，明确显示数据日期，不把历史信号当作当前可执行提示。以北京时间18点判断应有的工作日数据；未接入交易所节假日日历，因此节假日可能保守显示待更新。

邮件通知使用下述邮箱验证订阅流程；由服务器定时检查，无需网页保持打开，不自动下单。

官方接口：`https://www.csindex.com.cn/csindex-home/perf/index-perf?indexCode=H00300&startDate=20261014&endDate=20261019`，另一个指数使用H11023。

## 验证

```powershell
node --test lib/strategy.test.mjs
node node_modules/typescript/bin/tsc --noEmit
```

历史种子数据随源码保存在 `lib/seed.json`（整理自原始双公式图表数据），截至2026-10-14：5284条共同交易日，5笔完成交易，累计收益3508.168967258214%，年化17.90129906449176%，最大回撤-30.94961178805251%。后续实时数据可能改变最新指标。

界面设计参考 [Anthropic frontend-design skill](https://github.com/anthropics/skills/tree/main/skills/frontend-design)。

当前界面按 [Apple Design skill](https://github.com/bowen31337/apple-design) 调整，支持系统明暗主题、减少动态效果/透明度和增强对比度；切换控件采用可中断弹簧反馈。

液态玻璃使用 [liquid-glass-react](https://github.com/LeonardSEO/liquid-glass-react) 的组件源码，位于 `components/liquid-glass/`，保留上游许可证。支持真实边缘折射、高光胶囊选框、曲线展开，以及右侧浮框自动向左避让。

## 公网部署（Cloudflare Workers）

本项目同时包含网页和 `/api/market` 后端，请部署到 Workers，不使用仅托管静态文件的 GitHub Pages。

```powershell
npx wrangler login
npm run deploy
```

部署名称为 `curve-compass`，部署成功后终端会显示可分享的 `https://curve-compass.<账号子域>.workers.dev` 地址。网站无需访问者登录；指数数据在服务器获取。无需设置 API 密钥，也无需购买域名。

如在 Cloudflare 控制台连接 GitHub 仓库，构建命令使用 `npm run build`，部署命令使用 `npx wrangler deploy --config dist/server/wrangler.json`，项目根目录为仓库根目录。

正式自定义域名：`https://curvecompass.top`，在 `vite.config.ts` 中通过 Workers Custom Domain 配置；域名须由 Cloudflare DNS 激活。原 `workers.dev` 地址继续保留。

## 邮件订阅（Resend + Cloudflare D1）

- 前端按钮弹出邮箱订阅框；用户同意接收通知后发送确认链接。链接30分钟有效，打开后需点击确认，防止邮件预扫描误订阅。
- 未配置发信服务时 `/api/email/status` 返回 `ready:false`，网页不会收集邮箱或声称订阅成功。
- Worker Cron：UTC 周一至周五 10:00–15:30 每半小时执行，即北京时间18:00–23:30。只发送当天、数据新鲜且触发 buy/sell 的信号；等待、持有、过期数据均不发。不补发历史信号。
- D1 记录订阅和发送状态，按订阅者/信号日/信号唯一去重，发送租约防止并发重复，Resend 幂等键防止重试重复。失败最多重试6次。
- 每封信附退订链接，链接打开后需确认退订，再删除邮箱和该订阅的发送记录。
- 验证邮件限制：每IP每小时5次、每邮箱每小时3次、全站每天30次。信号每天最多80次调用，验证与信号合计每天90次调用，按UTC日计；这是适合小规模使用的应用限制，非无限发信。超过容量需先调整服务套餐和应用限额。
- 批量任务每轮取100个尚未发送成功的有效订阅，达到配额或服务商限流会记录失败并后续重试；当天窗口结束后不补发旧日信号。
- 保存邮箱、验证状态和投递状态到 D1；IP只保存加盐哈希用于短期频率限制，过期计数与未确认记录由任务清理。不提供公开订阅名单接口，不在日志中输出邮箱/令牌。

### 启用步骤

1. 在 Resend 注册账号，在 Domains 添加 `curvecompass.top`，按控制台记录完成 SPF/DKIM 等 DNS 验证。不要覆盖网站现有 DNS，不重复建立冲突 SPF 记录。
2. 创建仅发信权限、限定该域名的 API Key。在本项目目录运行以下命令，在 CLI 提示中输入密钥，密钥不可提交到 GitHub 或聊天：

```powershell
node node_modules/wrangler/bin/wrangler.js secret put RESEND_API_KEY --name curve-compass
```

3. 发件人已配置为 `曲线罗盘 <signals@curvecompass.top>`。`EMAIL_TOKEN_SECRET` 已通过 Worker Secret 单独生成，不要随意更换，否则已有验证/退订链接失效。新增环境时自行生成强随机值并设置。
4. D1绑定 `NOTIFICATIONS_DB`；初始化SQL在 `migrations/0001_email.sql`，已在当前生产环境执行。迁移到其他账号时须创建新库并执行迁移。
5. 部署后检查 `/api/email/status`，用自己的邮箱走完整确认和退订流程，并在 Resend 控制台确认投递结果。HTTP/API接受仅代表已提交给服务商，不承诺收件箱送达。服务商账号/域名未就绪时仍不能真正发信。

本地测试可通过 `.dev.vars` 提供密钥，不提交环境文件。后端测试使用真实内存 SQLite 与模拟发信服务，不对外发送邮件：

```powershell
node --test lib/email-notifications.test.mjs
```
