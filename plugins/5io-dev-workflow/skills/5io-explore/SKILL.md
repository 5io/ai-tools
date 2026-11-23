---
name: 5io-explore
description: "Read a repository to trace a feature or bug through real entry points, identify reusable code, and find relevant verification commands before proposing changes."
---

# 只读探索

1. 阅读适用的仓库约定，由实际入口向下跟到关键状态或数据边界。按任务范围取证。
2. 查找同类实现、调用方和测试。区分已确认可复用的实现与需要验证的候选项。
3. 从项目配置、CI 或文档核实最小验证命令及其工作目录。
4. 交付关键路径、复用点、影响范围、验证入口和待核实事项。给关键结论附文件和行号。

保持只读。并行探索只有在可拆成独立问题、且宿主及用户授权允许时才使用。
