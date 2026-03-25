# SSR Runtime Blocker

时间：`2026-03-25`

命令：

```bash
node scripts/qa/run-ssr-smoke.mjs \
  --routes /dashboard \
  --fail-fast
```

结果：
- API build：PASS
- Web build：PASS
- Runtime fetch：FAIL

错误：

```text
TypeError: fetch failed
cause: Error: connect EPERM 127.0.0.1:3101 - Local (0.0.0.0:0)
```

判断：
- 当前失败发生在 sandbox localhost 连接阶段
- 不是已确认的页面级 `500`
- 需在允许本地端口访问的环境重跑 `run-ssr-smoke.mjs`
