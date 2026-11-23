---
name: 5io-bug-fix
description: "Investigate a defect with an unclear cause, isolate the earliest incorrect behavior, and verify an authorized fix against the original failure."
---

# 根因排错

1. 记录预期、实际现象、环境和最小触发条件。能复现时保留失败输出或测试。无法复现时给出观察证据、已排除假设和下一条最有区分力的检查。
2. 从错误结果回溯到状态首次出错的边界。按证据选择对照实验、日志、调用链或提交对比。区分触发条件和根因。
3. 只有在修复获授权时改代码。尽量在错误状态产生处修复。发现同类路径时判断是否共因，按任务范围处理。
4. 复跑原场景和相关快测。已有测试无法捕获关键回归时补一个针对性测试。汇报证据、修复位置和未验证项。
