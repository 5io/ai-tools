# 5io AI Tools

面向支持 Agent Skills 的开发助手。六个 `5io-*` Skill 共用同一份源码，适合需要跨会话、跨分支持续开发的项目。小改动可直接实现并跑相关快测，复杂改动按「探索 → 方案 → 实现 → 独立审查 → 验收」推进。

## 它解决什么问题？

- **动手前找准位置。** 先从真实入口追到行为和验证命令，减少重复实现和改错层的问题。
- **换会话还能接着做。** 把确认版方案、改动范围、Git 基线和验收场景随任务交接。接手者能从仓库还原关键决定。
- **合并前发现跑偏。** 先用变更清单对照方案。额外文件、禁改路径和漏掉的验收项会在深审前显现。
- **问题可复现，里程碑可收尾。** 排错时保留修复前后的证据，收尾时核对缺失的验收记录、过期约定和仍有工作的分支。

## 审查前，先对一遍范围

先给审查会话三个输入：确认版方案或验收条件、Git 基线、待审提交或工作区。审查者先列实际变更文件，再逐一对照允许范围、禁改和高风险路径，并标出没有对应 diff 或测试证据的验收项。

例如，方案允许改报表实现及其测试，diff 却还修改了权限配置。先把权限配置记为范围外变更，核对是否有已确认的范围变更，然后再审业务逻辑。授权范围不清时，继续检查明确的部分，并报告需要确认的路径。可直接使用 [独立 diff 审查提示词](prompts/独立-diff-审查.md)。

## 六个 Skill

| Skill | 什么时候用 | 交付什么 |
| --- | --- | --- |
| [5io-explore](plugins/5io-dev-workflow/skills/5io-explore/SKILL.md) | 还没找准入口或影响面 | 有路径证据的调用链、复用点和验证命令 |
| [5io-plan](plugins/5io-dev-workflow/skills/5io-plan/SKILL.md) | 交互、数据或接口仍有取舍 | 人能读懂的方案、待确认事项和可复跑的验收 |
| [5io-delegate](plugins/5io-dev-workflow/skills/5io-delegate/SKILL.md) | 要换会话、并行实现或独立审查 | 带方案版本、基线、范围和验收的交接单 |
| [5io-code-review](plugins/5io-dev-workflow/skills/5io-code-review/SKILL.md) | 有可对照的 diff，准备验收或合并 | 范围核对、阻塞项、建议和验证缺口 |
| [5io-bug-fix](plugins/5io-dev-workflow/skills/5io-bug-fix/SKILL.md) | 已发现缺陷，原因或复现条件不明 | 复现、根因证据及获准修复后的验证 |
| [5io-govern](plugins/5io-dev-workflow/skills/5io-govern/SKILL.md) | 里程碑收尾，或规则和分支状态失真 | 有证据的治理清单，以及待核对的分支和 worktree |

## 怎么用

在客户端选中 Skill，或在任务里点名。Codex 用 `$` 选择，Claude Code 市场安装后可用 `/5io-dev-workflow:5io-plan`，项目级安装后用 `/5io-plan`。

- **小改**。范围和验收明确时直接实现，运行相关快测。
- **复杂功能**。先用 `5io-explore` 查现状、用 `5io-plan` 对齐方案。确认后按需用 `5io-delegate` 交接实现，最后另开会话用 `5io-code-review` 并按项目 CI 验收。
- **疑难 Bug**。先用 `5io-bug-fix` 复现并查根因，跨模块或高风险修复完成后走独立审查。
- **里程碑收尾**。用 `5io-govern` 核对验收、文档和遗留工作。

例如，「用 `5io-plan` 先为批量重试写方案。需要保留失败项，先讲清部分成功后的界面状态及验收，等我确认再改。」也可直接复制 [人话方案](prompts/人话方案.md)、[里程碑模板](templates/里程碑方案.md) 或 [技术选型与性能排查提示词](prompts/补充工作流.md)。

### 安装

#### Codex 市场

在本仓库根目录测试本地版本：

```sh
codex plugin marketplace add .
codex plugin add 5io-dev-workflow@5io-ai-tools
```

可以在任意目录从 GitHub 安装：

```sh
codex plugin marketplace add 5io/ai-tools
codex plugin add 5io-dev-workflow@5io-ai-tools
```

桌面端也可以在 Plugins 中添加仓库 `5io/ai-tools`，再安装 `5io-dev-workflow`。添加的是仓库的 [Codex 市场](https://learn.chatgpt.com/docs/developer-commands)，包是否可用取决于客户端版本和工作区设置。更新远端市场用 `codex plugin marketplace upgrade 5io-ai-tools`，然后重新安装该插件。

#### Claude Code 市场

在本仓库根目录本地验证并安装：

```sh
claude plugin validate .
claude plugin marketplace add ./
claude plugin install 5io-dev-workflow@5io-ai-tools
```

从 GitHub 安装时，将上面的 `marketplace add ./` 换成 `marketplace add 5io/ai-tools`。[Claude Code 市场文档](https://code.claude.com/docs/en/plugin-marketplaces)

#### 项目级安装

把 [skills](plugins/5io-dev-workflow/skills) 下所需的 `5io-*` **目录**复制到目标仓库下列位置。最终路径例如 `.agents/skills/5io-plan/SKILL.md`。使用仓库复制时，可以把复制后的 Skill 提交到目标仓库，与团队共享。每个客户端任选市场或项目级安装，避免同时加载同名 Skill。

| 平台 | 目标仓库目录 |
| --- | --- |
| [Codex](https://learn.chatgpt.com/docs/build-skills)、[Cursor](https://cursor.com/docs/skills)、[GitHub Copilot](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/customize-cloud-agent/add-skills)、[Gemini CLI](https://geminicli.com/docs/cli/skills/)、[OpenCode](https://opencode.ai/docs/skills/) | `.agents/skills/` |
| [Claude Code](https://code.claude.com/docs/en/skills) | `.claude/skills/` |

其他支持 Agent Skills 的工具可以使用其本地 Skill 目录。只支持普通聊天的助手也可以直接使用下面的提示词，按需提供相关仓库文件。

## 项目开发约定（推荐）

把 [AGENTS.md 模板](templates/AGENTS.md) 并入目标仓库。先填真实入口、复用位置、快测命令及工作目录、合并检查、高风险路径和禁改路径。命令以正在运行的 CI 或项目配置为准，路径以当前代码为准。如果客户端使用其他规则入口，从该文件引用 `AGENTS.md`，或在任务开头明确要求读取。

例如，可以约定「报表改动快测跑 `node test.mjs`，涉及权限配置需单独审查，生成目录由构建流程维护」。全团队的固定规则放仓库，某个任务的范围和验收写在该任务方案里。

## 个人偏好

用 [个人偏好模板](templates/个人偏好.md) 保存语言、反馈粒度、交接方式和模型选择等个人默认值。可粘贴进客户端的个人指令，或保存在仓库之外，在任务开头附上。插件没有跨客户端的偏好存储；启用方式由当前客户端决定。个人偏好用于在授权范围内选择工作方式，项目约定和本次任务对范围的要求仍适用。

## 权限与适用边界

| 场景 | 默认工作范围 |
| --- | --- |
| 探索、方案、审查、治理盘点 | 读取相关代码、文档和 Git 信息。先报告建议，治理实施另按任务授权。 |
| 实现、Bug 修复或治理整改 | 按已授权的目标和路径修改，保留其他未提交工作。验证记录区分已运行和待运行。 |
| 委派与隔离 | 宿主支持且任务允许时调用子代理或创建 worktree。缺少能力时可交付交接单。 |
| 外部和破坏性操作 | 推送、合并、删除分支或 worktree、传送仓库内容等操作须落在明确的任务授权和宿主权限内。 |

安装 Skill 不会扩大文件、网络或工具权限。测试若会写入文件，先按当前任务权限判断能否执行；只读任务可列出由实现会话复跑的命令。没有 Git 时，可提供文件快照或变更清单做有限审查。无法读取仓库的助手需要用户提供材料，并明确哪些内容无法核查。

## 市场与维护

仓库同时提供 [Codex 市场](.agents/plugins/marketplace.json) 和 [Claude Code 市场](.claude-plugin/marketplace.json)。两者共用 `5io-ai-tools` 市场名与 `5io-dev-workflow` 插件名，指向同一个插件目录。新增同类流程放进现有插件，有独立安装场景的工具可另建包并同步两份市场条目。插件路径相对仓库根目录，Skill 在各自包内保持单一来源。

提交前运行 `node scripts/check-marketplace.mjs` 和 `git diff --check`。发布时同步更新两个宿主的插件版本。增加或调整市场条目时，使用对应客户端验证安装与发现。
