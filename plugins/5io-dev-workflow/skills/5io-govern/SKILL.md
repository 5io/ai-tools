---
name: 5io-govern
description: "Audit a milestone or repository for stale guidance, duplicated rules, verification gaps, and unresolved Git branches or worktrees."
---

# 里程碑治理

- 对照现有实现及 CI 检查项目说明、验收记录和验证命令。对重复规则找出适合的单一来源。
- 用只读 Git 信息盘点相关分支与 worktree。区分已合并、有未提交或未推送工作、仍在进行，以及状态待确认的项。注明依据和远端信息是否为现有缓存。
- 给出少量可执行的治理项，标明影响、证据和建议顺序。重复出现的问题优先考虑明确约定或现有 CI 可执行的检查。
- 按已经授权的范围修订文件。合并、移除 worktree 或删除分支前核实归属、未提交工作和合并状态，并遵守任务授权。
