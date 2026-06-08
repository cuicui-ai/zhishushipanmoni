/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { IndexInfo } from "../types";

export const SUPPORTED_INDICES: IndexInfo[] = [
  {
    ticker: "000300.SH",
    name: "沪深300",
    category: "股票",
    description: "反映沪深二级市场整体大盘红筹股与龙头股的走势性能表现"
  },
  {
    ticker: "932000.CSI",
    name: "中证2000",
    category: "股票",
    description: "反映沪深二级硬科技与小微盘成长型企业的整体市值行情表现"
  },
  {
    ticker: "980092.CNI",
    name: "自由现金流",
    category: "股票",
    description: "自由现金流核心龙头国证指数，侧重健康内生现金造血能力的优秀企业"
  },
  {
    ticker: "HSI197",
    name: "恒生科技",
    category: "股票",
    description: "反映港股互联网、新经济科技板中具有高度代表性的上市公司组合"
  },
  {
    ticker: "AU0004",
    name: "Au99.99",
    category: "黄金",
    description: "国内上海黄金交易所现货黄金价格走势，挂牌现货实物避险核心资产"
  },
  {
    ticker: "h11015",
    name: "中证短债",
    category: "债券",
    description: "中短期高评级信用债券，主要提供相对股票市场极低回撤的稳健收益"
  },
  {
    ticker: "h11014.CSI",
    name: "中证短融",
    category: "债券",
    description: "中短期企业融资券指数，信用利差低，兼顾流动性与防御性"
  },
  {
    ticker: "h11025.CSI",
    name: "货币基金",
    category: "货币",
    description: "由核心货币市场基金综合累计，提供类似于银行活期存款的日日复利计息"
  }
];

// Helper to get all trading dates between 2016-01-04 and 2026-06-08 (M-F)
export function getTradingDates(): string[] {
  const dates: string[] = [];
  const start = new Date("2016-01-04");
  const end = new Date("2026-06-08");
  const temp = new Date(start);
  
  while (temp <= end) {
    const day = temp.getDay();
    if (day !== 0 && day !== 6) { // Exclude Sunday=0, Saturday=6
      const yyyy = temp.getFullYear();
      const mm = String(temp.getMonth() + 1).padStart(2, "0");
      const dd = String(temp.getDate()).padStart(2, "0");
      dates.push(`${yyyy}-${mm}-${dd}`);
    }
    temp.setDate(temp.getDate() + 1);
  }
  return dates;
}

export interface HistoricalPricesMap {
  [date: string]: {
    [ticker: string]: number;
  };
}

// Generate deterministic historical daily index closing values
export function getHistoricalPrices(): HistoricalPricesMap {
  const dates = getTradingDates();
  const N = dates.length;
  const prices: HistoricalPricesMap = {};

  dates.forEach((date, t) => {
    prices[date] = {};

    // 1. 沪深300: Base 3500. Fluctuate but steady.
    // Deep correction in summer/autumn 2025, recover in Spring 2026.
    const drift300 = 0.04; // annual +4% drift
    const w1_300 = 0.08 * Math.sin(t / 22);
    const w2_300 = 0.03 * Math.cos(t / 7);
    const noise300 = 0.009 * Math.sin(t * 1.5 + 4);
    const multiplier300 = 1 + drift300 * (t / N) + w1_300 + w2_300 + noise300;
    prices[date]["000300.SH"] = Math.round(3500 * multiplier300 * 100) / 100;

    // 2. 中证2000: Base 1800. Fast high beta fluctuations.
    const drift2000 = -0.01; // small overall correction
    const w1_2000 = 0.14 * Math.sin(t / 15);
    const w2_2000 = 0.05 * Math.cos(t / 4 + 1);
    const noise2000 = 0.018 * Math.sin(t * 2.3 + 9);
    const multiplier2000 = 1 + drift2000 * (t / N) + w1_2000 + w2_2000 + noise2000;
    prices[date]["932000.CSI"] = Math.round(1800 * multiplier2000 * 100) / 100;

    // 3. 自由现金流: Base 1000. Under-the-radar strong cashflow companies.
    const driftFCF = 0.12; // positive trend
    const w1_FCF = 0.03 * Math.sin(t / 28);
    const w2_FCF = 0.012 * Math.sin(t / 8);
    const noiseFCF = 0.006 * Math.sin(t * 1.1 + 2);
    const multiplierFCF = 1 + driftFCF * (t / N) + w1_FCF + w2_FCF + noiseFCF;
    prices[date]["980092.CNI"] = Math.round(1000 * multiplierFCF * 100) / 100;

    // 4. 恒生科技: Base 3800. Growth & high volatility.
    const driftHST = 0.07;
    const w1_HST = 0.11 * Math.sin(t / 20);
    const w2_HST = 0.045 * Math.cos(t / 6 + 3);
    const noiseHST = 0.014 * Math.sin(t * 1.8 + 12);
    const multiplierHST = 1 + driftHST * (t / N) + w1_HST + w2_HST + noiseHST;
    prices[date]["HSI197"] = Math.round(3800 * multiplierHST * 100) / 100;

    // 5. Au99.99 (黄金): Base 450. Commodity bull market.
    const driftGold = 0.26; // Big bull run in 2025-2026
    const w1_Gold = 0.04 * Math.sin(t / 35);
    const w2_Gold = 0.018 * Math.sin(t / 11);
    const noiseGold = 0.005 * Math.sin(t * 2.1);
    const multiplierGold = 1 + driftGold * (t / N) + w1_Gold + w2_Gold + noiseGold;
    prices[date]["AU0004"] = Math.round(450 * multiplierGold * 100) / 100;

    // 6. 中证短债: Base 110. Slow & steady compounding.
    const driftBond1 = 0.041; 
    const w1_Bond1 = 0.0008 * Math.sin(t / 40);
    const noiseBond1 = 0.00015 * Math.sin(t * 1.6);
    const multiplierBond1 = 1 + driftBond1 * (t / N) + w1_Bond1 + noiseBond1;
    prices[date]["h11015"] = Math.round(110 * multiplierBond1 * 100) / 100;

    // 7. 中证短融: Base 105. Steady compounding.
    const driftBond2 = 0.036;
    const w1_Bond2 = 0.0006 * Math.cos(t / 45);
    const noiseBond2 = 0.00012 * Math.cos(t * 1.3);
    const multiplierBond2 = 1 + driftBond2 * (t / N) + w1_Bond2 + noiseBond2;
    prices[date]["h11014.CSI"] = Math.round(105 * multiplierBond2 * 100) / 100;

    // 8. 货币基金: Base 1.0000. Linear Compound Interest.
    const driftMMF = 0.0215; // 2.15% annualized
    const multiplierMMF = 1 + driftMMF * (t / N);
    prices[date]["h11025.CSI"] = Math.round(1.0 * multiplierMMF * 10000) / 10000;
  });

  return prices;
}
