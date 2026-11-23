# ai-tools 仓库约定

- 本仓库维护跨平台 Agent Skills 和开发工作流。面向使用者的项目规则示例放在 `templates/`，这里记录本仓库自身的维护规则。
- 插件放在 `plugins/<plugin>/`，Skill 放在包内 `skills/<skill>/SKILL.md`。名称用 `5io-` 前缀，Skill 目录名与 YAML 的 `name` 一致。
- 优先让每个 Skill 可单独使用。引用运行时资料时用包内相对路径。项目命令、分支名、模型及业务约束由使用者或目标仓库提供。
- 新增插件包时同步 Codex 和 Claude Code 的市场条目。发布时同步两份插件 manifest 的版本，并更新 README。
- 改动后运行 `node scripts/check-marketplace.mjs` 和 `git diff --check`。改动安装路径或 manifest 格式时，用可用的宿主客户端在隔离配置中检验发现与安装。
- 改动范围检查或方案交接时，运行 `node --test tests/workflows.test.mjs`，验证临时 Git 仓库中的范围分类和里程碑样例。
