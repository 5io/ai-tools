---
name: 5io-plan
description: "Plan a repository change when user-visible trade-offs, cross-module behavior, interfaces, or data compatibility need alignment before implementation."
---

# 人话方案

先只读核对实际入口、可复用实现和验证命令。范围与验收明确的小改动可直接按用户授权进行。对有取舍的任务先对齐，再落地。跨模块里程碑可把确认版存入仓库，便于后续聊天按同一版本接手。

方案用产品和工程都能读懂的语言写清：

1. 用户怎么用。写入口、默认行为、反馈和失败后的恢复路径。
2. 大概怎么做。写改动模块、复用点、影响范围和范围外事项，附关键文件路径。
3. 有哪些取舍。只把会改变用户体验、数据兼容性或交付范围的问题交给用户，附建议和理由。
4. 怎么验收。写前置条件、操作、预期结果和已核实的测试命令。

用户要求先规划时，在确认前保持只读。必要时邀请有独立上下文的审查者用真实文件核对方案，按宿主能力与授权执行。
