# X Persona (X 人格测试) 🎭

> 输入你的 X 用户名，10 秒内生成你的赛博人格卡；再做一套 32 题自评问卷，看看“别人眼里的你（推文）”和“你眼里的你（问卷）”差多远。

[![License: PolyForm Noncommercial](https://img.shields.io/badge/Code_License-PolyForm_NC_1.0-blue.svg)](LICENSE)
[![Content License: CC BY-NC-SA 4.0](https://img.shields.io/badge/Content-CC_BY--NC--SA_4.0-lightgrey.svg)](LICENSE-CONTENT)
[![Built with React 19](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind-v4-38bdf8.svg)](https://tailwindcss.com/)
[![Tests](https://img.shields.io/badge/Vitest-Passing-brightgreen.svg)]()

---

## 🌟 核心特色

1. **零后端 · 零运维成本**：纯前端静态架构，直连 FxTwitter 公开网关与客户端 IndexedDB 缓存，直接部署于 GitHub Pages。
2. **10 秒即出“统计版人格卡”**：提取发帖节律（夜猫指数、脉冲爆发度）、互动形态（原创/回复/转推）、情绪极性、文本长度与关键词等 40 项特征，无需 LLM 也能立即生成。
3. **16 种 X 原型体系（自创）**：
   - 场域（广播者 B vs 对话者 C）
   - 密度（长文家 E vs 碎片派 S）
   - 温度（冷静派 A vs 情绪派 F）
   - 节律（规律型 K vs 随性型 D）
   - 原型示例：`全网冲浪互动王 (CSFD)`、`凌晨三点发疯文学 (BSFD)`、`精准补刀手 (CSAK)`、`灵感长文狂人 (BEAD)` 等。
4. **自备 LLM（BYOK / 复制粘贴）**：页面生成包含行为事实段与抽样推文的结构化提示词。用户复制到 ChatGPT / Claude / DeepSeek 等，把结果粘贴回来即可渲染扎心毒舌报告与 2027 年预言。
5. **双视角知行合一指数**：内置 32 题 OEJTS 1.2 开源心理学量表（CC BY-NC-SA 4.0），对比推文大数据与主观自评，揭示你的“社交面具 vs 真实潜意识”。
6. **无损 URL 分享**：基于 `lz-string` 压缩将完整分析状态编码进 URL Hash（`#r=...`），任何人打开链接即刻复现完整页面，免数据库存储。

---

## 🏗️ 架构与技术栈

- **前端框架**：React 19 + TypeScript + Vite 8
- **样式方案**：Tailwind CSS v4 + Lucide Icons
- **状态管理**：Zustand + `idb-keyval` (IndexedDB 本地 24h 缓存)
- **中文分词**：`segmentit` 纯前端无 WASM 轻量分词
- **URL 状态压缩**：`lz-string`
- **数据校验**：`zod`
- **单元测试**：Vitest（已覆盖 OEJTS 计分公式、特征提取、URL 编解码）

---

## 🚀 本地开发与构建

```bash
# 进入项目目录
cd x-persona

# 安装依赖
npm install

# 启动本地开发服务
npm run dev

# 运行单元测试
npm test

# 生产环境构建打包
npm run build
```

---

## 📜 许可协议与合规声明

- **代码许可**：[PolyForm Noncommercial 1.0.0](LICENSE)（允许非商业个人与教育用途使用与修改，禁止商业化）。
- **内容许可**（题库翻译、提示词模板、原型文案）：[CC BY-NC-SA 4.0](LICENSE-CONTENT)。
- **署名与来源**：
  - 16 型人格题目与计分算法源自 [Open Extended Jungian Type Scales 1.2 (OEJTS)](https://openpsychometrics.org/tests/OEJTS/) © OpenPsychometrics.org。
  - 公开网关接口基于 [FxTwitter / FixTweet](https://github.com/FixTweet/FxTwitter) (MIT)。
- **免责声明**：本项目仅供娱乐、自我反思与技术交流，不构成任何临床心理评估或医疗诊断。
