---
name: 5io-code-review
description: "Independently review a defined Git diff or pull request against a confirmed plan, repository rules, and verifiable behavior."
---

# 独立 diff 审查

只读工作树和必要的项目资料。确认基线、待审版本和实际范围。对工作区改动区分 staged、unstaged 和未跟踪文件。范围不全时报告缺口，并审查已明确的部分。

1. 先核查范围漂移、禁改路径和遗漏的验收条件。
2. 跟读关键路径及调用方。按改动核对正常场景、失败和恢复，以及相关兼容性、权限和并发问题。
3. 检查重复实现和实际运行成本。检查相关测试是否能捕捉这次改动会引入的回归。
4. 给出结论和发现。每条写文件与行号、触发条件、影响及修正方向，分为阻塞和建议。标明实际检查过的范围、已有证据和仍需复跑的场景。

发现需要产品决定的取舍时单列。只报告有证据的问题。
