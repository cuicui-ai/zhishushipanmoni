/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for JSON parsing
  app.use(express.json());

  // API Route: Server Status Ping
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // API Route: AI Performance and Diagnosis Attribution via Gemini
  app.post("/api/analyze", async (req: express.Request, res: express.Response) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
        return res.status(400).json({
          error: "MISSING_API_KEY",
          message: "未检测到有效的 GEMINI_API_KEY 环境变量。请在 AI Studio 主菜单的 Settings > Secrets 中配置您的 API 密钥。"
        });
      }

      const { portfolioName, description, metrics, rebalancingDates, holdingWeights } = req.body;

      if (!metrics) {
        return res.status(400).json({
          error: "INVALID_REQUEST",
          message: "缺少必要性能指标数据以进行智能分析。"
        });
      }

      // Initialize the official @google/genai SDK on server-side
      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const prompt = `你是一位顶尖的华尔街量化投资理财专家与高级组合投资顾问。请针对以下实盘模拟组合运行的各项数据，提供深度绩效归因诊断与后期调整配置方案。

组合基础配置：
- 组合名称: ${portfolioName || "模拟实盘一号"}
- 原投资策略说明: ${description || "未提供详细投资逻辑"}
- 本次主要涉及的持仓品种: ${holdingWeights || "沪深300、恒生科技、Au99.99、中证短债、中证短融"}

组合绩效分析指标 (模拟绩效区间：2025年6月至2026年6月)：
- 累计收益率: ${metrics.cumulativeReturn}%
- 年化收益率: ${metrics.annualizedReturn}%
- 最大回撤 (Max Drawdown): ${metrics.maxDrawdown}%
- 波动率 (Volatility): ${metrics.volatility}%
- 夏普比率 (Sharpe Ratio): ${metrics.sharpeRatio}
- Beta 系数: ${metrics.beta}
- 詹森超额阿尔法 (Alpha): ${metrics.alpha}%
- 95% 在险价值 (VaR): ${metrics.varValue}%

经历了 ${rebalancingDates ? rebalancingDates.length : 0} 次调仓，发生的历史调仓日期分别为：
${rebalancingDates ? rebalancingDates.join(", ") : "未检索到具体的历史调仓频率"}

请为该组合量身定制一份专业的 **「汇成指数组合投资诊断书」**，请用严谨、客观、深度的中文投资银行业界语言书写，包含以下核心章节。排版上使用 Markdown 格式输出，利用列表和加粗突出重点。不要包含任何冗余客套话或技术环境指令。

1. **组合表现归因与业绩评价 (Performance Evaluation & Attribution)**:
   - 分析当前累计收益率 ${metrics.cumulativeReturn}% 与最大回撤 ${metrics.maxDrawdown}% 的平衡性，评价这个策略是否属于进取型、平稳型还是防御型。
   - 归纳黄金 (AU0004) 在这轮行情中的暴涨表现或短债 (h11015) 纯债底仓，各自为组合贡献了怎样的风险平抑作用与收益赋能。

2. **量化风险指标专项诊断 (Risk Metrics Analysis)**:
   - 解读 Beta 值为 ${metrics.beta}，Alpha 指标为 ${metrics.alpha}% 的深层含义，以及在险价值 VaR 为 ${metrics.varValue}% 的潜在单日最大下行预警。
   - 说明在目前的波动率（${metrics.volatility}%）下持有此组合的安全边界。

3. **调仓行为科学性评估 (Rebalancing Pattern Review)**:
   - 评价该调仓记录的时间安排、以及由于调仓所产生的仓位集中度变化是否对降低风险起到了实质性的改善。
   - 给出对于高频调仓与季度 rebalance（重新再平衡）之间的得失对比，结合满额无摩擦成交的特征给出中肯的运作评级。

4. **前瞻性资产配置建议与战术调整 (Tactical Asset Allocation - TAA)**:
   - 给出未来 1-2 季度的明确调配配比分配建议（需要包含股票、债券、黄金、现金等资产具体的百分比建议）。
   - 给出如何平抑日历回撤、以及在高息环境下应该增加还是减少指数工具配置的明确答案。`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });

      return res.json({ analysis: response.text });
    } catch (error: any) {
      console.error("Gemini backend diagnostic exception:", error);
      return res.status(500).json({
        error: "SERVER_ERROR",
        message: error.message || "Gemini 智能代理微服务运算异常，请检查 API 密钥或稍后重试。"
      });
    }
  });

  // Serve static assets in production, otherwise delegate to Vite Dev Server
  if (process.env.NODE_ENV === "production") {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Express] Huicheng Server bootstrapping running on host 0.0.0.0, port ${PORT}`);
  });
}

startServer();
