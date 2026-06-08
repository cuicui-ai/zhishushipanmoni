/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface IndexInfo {
  ticker: string;
  name: string;
  category: "股票" | "黄金" | "债券" | "货币";
  description: string;
}

export interface RebalancingRecord {
  date: string; // YYYY-MM-DD
  weights: Record<string, number>; // ticker -> percentage (0 to 100)
}

export interface Portfolio {
  id: string;
  name: string;
  keywords: string[];
  principal: number; // default 100,000,000.00 (1 yi)
  benchmarkTicker: string; // e.g. "000300.SH"
  description: string;
  isPublic: boolean;
  createdAt: string;
  rebalancingHistory: RebalancingRecord[];
  manager?: string;
  category?: string;
}

export interface DailySimulationRow {
  date: string;
  totalAssets: number;
  nav: number; // net value starting at 1.0000
  dailyReturn: number; // percentage
  cumulativeReturn: number; // percentage
  drawdown: number; // percentage
  assetMarketValues: Record<string, number>;
  assetWeights: Record<string, number>;
  assetQuantities: Record<string, number>;
  benchmarkNav: number; // NAV of benchmark starting at 1.0000
  benchmarkReturn: number;
}

export interface RiskIndicators {
  cumulativeReturn: number;
  annualizedReturn: number;
  maxDrawdown: number;
  volatility: number;
  sharpeRatio: number;
  beta: number;
  alpha: number;
  varValue: number; // Value at Risk 95%
}

export interface MonthlyReturn {
  year: number;
  month: number; // 1-12
  returnVal: number; // percentage
}
