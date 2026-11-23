---
name: 5io-delegate
description: "Prepare or execute a bounded handoff for implementation, parallel exploration, or independent review using the host's available delegation and worktree features."
---

# 任务交接

交接单包括目标、方案路径及版本、基线、改动边界、必复用入口、验收场景和要求回报的证据。不确定项标记为待核实。

- 实现任务需要共享仓库时，先确认接收方能看到方案和目标快照。并行写入分配独立 worktree 和清晰的路径责任。
- 探索和审查任务使用只读契约。独立审查交接方案、基线与 diff，省略原实现过程中的说服性说明。
- 宿主有原生委派能力且获授权时可直接使用。否则交付可粘贴到新聊天的交接单。模型按项目约定与宿主可用性选择。
- 收到结果后核对实际 diff、验证输出与未完成项。需要整合时检查重叠变更并按目标仓库流程进行。

交接本身不授予执行外部命令、推送或合并的权限。
