# ai-tools 仓库约定

- 本仓库维护通用 Codex 工作流。面向使用者的项目规则示例放在 `templates/`，这里记录本仓库自身的维护规则。
- 插件放在 `plugins/<plugin>/`，Skill 放在包内 `skills/<skill>/SKILL.md`。名称用 `5io-` 前缀，Skill 目录名与 YAML 的 `name` 一致。
- 优先让每个 Skill 可单独使用。引用运行时资料时用包内相对路径。项目命令、分支名、模型及业务约束由使用者或目标仓库提供。
- 新增插件包时更新 `.agents/plugins/marketplace.json`。发布变更时更新对应插件版本和 README。
- 改动后运行 `node scripts/check-marketplace.mjs` 和 `git diff --check`。改动安装路径或 manifest 格式时，再用隔离配置检验 Codex 市场能否发现插件。
