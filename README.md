# 5io AI Tools

面向支持 Agent Skills 的开发助手。六个 `5io-*` Skill 共用同一份源码，适合需要跨会话、跨分支持续开发的项目。小改动可直接实现并跑相关快测，复杂改动按「探索 → 方案 → 实现 → 独立审查 → 验收」推进。

## 安装

### Codex 市场

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

### Claude Code 市场

在本仓库根目录本地验证并安装：

```sh
claude plugin validate .
claude plugin marketplace add ./
claude plugin install 5io-dev-workflow@5io-ai-tools
```

Claude 市场清单推送到 GitHub 后，把上面的 `marketplace add ./` 换成 `marketplace add 5io/ai-tools` 从远端安装。在 Claude Code 会话中用 `/5io-dev-workflow:5io-plan` 调用方案 Skill；其他 Skill 使用相同的插件前缀。[Claude Code 市场文档](https://code.claude.com/docs/en/plugin-marketplaces)

### 项目级安装

把 [skills](plugins/5io-dev-workflow/skills) 下所需的 `5io-*` **目录**复制到目标仓库下列位置。最终路径例如 `.agents/skills/5io-plan/SKILL.md`。使用仓库复制时，可以把复制后的 Skill 提交到目标仓库，与团队共享。每个客户端任选市场或项目级安装，避免同时加载同名 Skill。

| 平台 | 目标仓库目录 |
| --- | --- |
| [Codex](https://learn.chatgpt.com/docs/build-skills)、[Cursor](https://cursor.com/docs/skills)、[GitHub Copilot](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/customize-cloud-agent/add-skills)、[Gemini CLI](https://geminicli.com/docs/cli/skills/)、[OpenCode](https://opencode.ai/docs/skills/) | `.agents/skills/` |
| [Claude Code](https://code.claude.com/docs/en/skills) | `.claude/skills/` |

其他支持 Agent Skills 的工具可以使用其本地 Skill 目录。只支持普通聊天的助手也可以直接使用下面的提示词，按需提供相关仓库文件。

## 六个 Skill

从所在客户端的 Skill 选择器选择，或在请求中点名，例如「使用 5io-plan，先给这次改动写方案」。Codex 可以输入 `$` 选择。Claude Code 市场安装后的入口带插件前缀，直接放进 `.claude/skills/` 后使用 `/5io-plan`。

| Skill | 适用场景与调用示例 |
| --- | --- |
| [5io-explore](plugins/5io-dev-workflow/skills/5io-explore/SKILL.md) | 只读追踪导出链路，列出可复用入口和快测命令。 |
| [5io-plan](plugins/5io-dev-workflow/skills/5io-plan/SKILL.md) | 先给批量操作写一份方案，等我确认交互和验收后再实现。 |
| [5io-delegate](plugins/5io-dev-workflow/skills/5io-delegate/SKILL.md) | 按确认版方案准备一份能交给独立 worktree 的实现交接单。 |
| [5io-code-review](plugins/5io-dev-workflow/skills/5io-code-review/SKILL.md) | 对照方案审查这个 PR，报告行为偏差、可复现回归和测试缺口。 |
| [5io-bug-fix](plugins/5io-dev-workflow/skills/5io-bug-fix/SKILL.md) | 日报偶发漏计，先找最小复现和错误来源。 |
| [5io-govern](plugins/5io-dev-workflow/skills/5io-govern/SKILL.md) | 里程碑已收尾，盘点过期规则、缺失的验收记录和遗留 worktree。 |

## 带进一个项目

1. 把 [AGENTS.md 模板](templates/AGENTS.md) 并入目标仓库约定，填好项目入口、验证命令和合并检查。如果客户端使用其他规则文件，从该文件引用 `AGENTS.md`，或在提示词里明确要求读取。
2. 使用 [人话方案提示词](prompts/人话方案.md)。跨模块改动可用 [里程碑模板](templates/里程碑方案.md) 存档。另有 [技术选型、里程碑拆解与性能排查提示词](prompts/补充工作流.md)。
3. 确认后从包含方案的基线启动实现会话。适合隔离的 Git 任务可以用 worktree，交接时提供方案路径、范围和验收。日常实现使用项目常用模型，复杂设计、疑难根因和高风险审查按需升级。
4. 用 [独立 diff 审查提示词](prompts/独立-diff-审查.md) 另开聊天，只交接确认版方案、基线和待审版本。审查后按项目既有 CI 和人工验收完成交付。

## 市场与维护

仓库同时提供 [Codex 市场](.agents/plugins/marketplace.json) 和 [Claude Code 市场](.claude-plugin/marketplace.json)。两者共用 `5io-ai-tools` 市场名与 `5io-dev-workflow` 插件名，指向同一个插件目录。新增同类流程放进现有插件，有独立安装场景的工具可另建包并同步两份市场条目。插件路径相对仓库根目录，Skill 在各自包内保持单一来源。

提交前运行 `node scripts/check-marketplace.mjs` 和 `git diff --check`。发布时同步更新两个宿主的插件版本。增加或调整市场条目时，使用对应客户端验证安装与发现。

方法参考 [Oil 欧呦的 oil-dev-skills](https://github.com/oil-oil/oil-dev-skills)，本仓库的具体流程按跨平台开发场景重新编写。项目使用 [MIT 许可证](LICENSE)。
