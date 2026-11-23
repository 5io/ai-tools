# 5io AI Tools

面向 ChatGPT Codex 的通用开发工作流。适合需要跨聊天、跨分支持续开发的项目。小改动可直接实现并跑相关快测，复杂改动按「探索 → 方案 → 实现 → 独立审查 → 验收」推进。

## 安装

在本仓库根目录测试本地版本：

```sh
codex plugin marketplace add .
codex plugin add 5io-dev-workflow@5io-ai-tools
```

市场文件发布到 GitHub 后，可以在任意目录从远端安装：

```sh
codex plugin marketplace add 5io/ai-tools
codex plugin add 5io-dev-workflow@5io-ai-tools
```

桌面端也可以在 Plugins 中添加仓库 `5io/ai-tools`，再安装 `5io-dev-workflow`。添加的是仓库的 [Codex 市场](https://learn.chatgpt.com/docs/developer-commands)，包是否可用取决于客户端版本和工作区设置。更新远端市场用 `codex plugin marketplace upgrade 5io-ai-tools`，然后重新安装该插件。

只用一个 Skill 时，可以把它的整个目录复制到目标仓库的 `.agents/skills/`。市场安装和仓库复制任选一种，避免出现两个同名入口。也可以直接粘贴下方的提示词，无需安装。

## 六个 Skill

在 Codex 中输入 `$` 并选中对应 Skill。若客户端显示带插件前缀的名称，以选择器出现的名称为准。

| Skill | 适用场景与调用示例 |
| --- | --- |
| [5io-explore](plugins/5io-dev-workflow/skills/5io-explore/SKILL.md) | 只读追踪导出链路，列出可复用入口和快测命令。 |
| [5io-plan](plugins/5io-dev-workflow/skills/5io-plan/SKILL.md) | 先给批量操作写一份方案，等我确认交互和验收后再实现。 |
| [5io-delegate](plugins/5io-dev-workflow/skills/5io-delegate/SKILL.md) | 按确认版方案准备一份能交给独立 worktree 的实现交接单。 |
| [5io-code-review](plugins/5io-dev-workflow/skills/5io-code-review/SKILL.md) | 对照方案审查这个 PR，报告行为偏差、可复现回归和测试缺口。 |
| [5io-bug-fix](plugins/5io-dev-workflow/skills/5io-bug-fix/SKILL.md) | 日报偶发漏计，先找最小复现和错误来源。 |
| [5io-govern](plugins/5io-dev-workflow/skills/5io-govern/SKILL.md) | 里程碑已收尾，盘点过期规则、缺失的验收记录和遗留 worktree。 |

## 带进一个项目

1. 把 [AGENTS.md 模板](templates/AGENTS.md) 并入目标仓库约定，填好项目入口、验证命令和合并检查。
2. 在 Plan Mode 使用 [人话方案提示词](prompts/人话方案.md)。跨模块改动可用 [里程碑模板](templates/里程碑方案.md) 存档。另有 [技术选型、里程碑拆解与性能排查提示词](prompts/补充工作流.md)。
3. 确认后从包含方案的基线启动实现聊天。适合隔离的 Git 任务用 Worktree，交接时提供方案路径、范围和验收。日常实现可用 Sol，涉及复杂设计、疑难根因和高风险审查时可用 Astra，按当前可用模型选择。
4. 用 [独立 diff 审查提示词](prompts/独立-diff-审查.md) 另开聊天，只交接确认版方案、基线和待审版本。审查后按项目既有 CI 和人工验收完成交付。

## 市场与维护

市场入口为 [marketplace.json](.agents/plugins/marketplace.json)。`5io-ai-tools` 是市场名，`5io-dev-workflow` 是当前可安装的插件名。六个相关 Skill 一起发布，每个 Skill 保持独立可读。新增同类流程放进现有插件，拥有不同安装场景的工具可独立建包并添加市场条目。插件路径相对仓库根目录，Skill 在各自包内保持单一来源。

提交前运行 `node scripts/check-marketplace.mjs` 和 `git diff --check`。发布时更新受影响插件的版本。增加或调整市场条目时，在本地验证一次安装与发现。

方法参考 [Oil 欧呦的 oil-dev-skills](https://github.com/oil-oil/oil-dev-skills)，本仓库的具体流程面向 Codex 重新编写。项目使用 [MIT 许可证](LICENSE)。
