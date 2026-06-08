/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Portfolio } from "../types";

export const SAMPLE_PORTFOLIOS: Portfolio[] = [
  {
    id: "hctz-001",
    name: "崔崔验收520",
    keywords: ["指数配置", "稳健固收", "长期复利"],
    principal: 100000000.00, // 壹亿元
    benchmarkTicker: "000300.SH",
    description: "汇成避险增长旗舰组合。以高等级信用短债指数作防御，搭配少量核心权益及黄金资产博取多维超额表现，成立以来表现出色，是面向周期波动的代表作。",
    isPublic: true,
    createdAt: "2016-01-04", // Yields exactly 3808 days duration on 2026-06-08!
    manager: "高磊",
    category: "指数",
    rebalancingHistory: [
      {
        date: "2016-01-04",
        weights: {
          "000300.SH": 10.00,
          "932000.CSI": 5.00,
          "980092.CNI": 5.00,
          "HSI197": 5.00,
          "AU0004": 10.00,
          "h11015": 40.00,
          "h11014.CSI": 20.00,
          "h11025.CSI": 5.00
        }
      },
      {
        date: "2025-11-10",
        weights: {
          "000300.SH": 8.00,
          "932000.CSI": 4.00,
          "980092.CNI": 3.00,
          "HSI197": 4.00,
          "AU0004": 15.00,
          "h11015": 45.00,
          "h11014.CSI": 15.00,
          "h11025.CSI": 6.00
        }
      },
      {
        date: "2026-05-08",
        weights: {
          "000300.SH": 6.11,
          "932000.CSI": 3.74,
          "980092.CNI": 1.57,
          "HSI197": 3.40,
          "AU0004": 1.53,
          "h11015": 56.00,
          "h11014.CSI": 24.00,
          "h11025.CSI": 3.66
        }
      }
    ]
  },
  {
    id: "hctz-002",
    name: "10年指数数据回测",
    keywords: ["十年大类", "多因子", "周期对冲"],
    principal: 100000000.00, // 壹亿元
    benchmarkTicker: "000300.SH",
    description: "基于10年历史全样本行情拟合的自抗扰策略。覆盖高通胀、低利率等多种宏观阶段，配置策略成熟饱经考验，旨在通过自适应大类资产轮动平抑回撤风险。",
    isPublic: true,
    createdAt: "2016-01-04", // Yields exactly 3808 days duration on 2026-06-08!
    manager: "荣海青",
    category: "指数",
    rebalancingHistory: [
      {
        date: "2016-01-04",
        weights: {
          "000300.SH": 15.00,
          "AU0004": 15.00,
          "h11015": 50.00,
          "h11014.CSI": 20.00
        }
      },
      {
        date: "2025-12-15",
        weights: {
          "000300.SH": 18.00,
          "AU0004": 20.00,
          "h11015": 42.00,
          "h11014.CSI": 15.00,
          "h11025.CSI": 5.00
        }
      }
    ]
  },
  {
    id: "hctz-003",
    name: "包含各类型的组合&BP",
    keywords: ["混合基金", "绝对收益", "BP因子"],
    principal: 50000000.00, // 五千万元
    benchmarkTicker: "000300.SH",
    description: "高度弹性组合，结合股指与另类资产。采用BP估值敏感度滤波过滤估值溢价，主要增配盈利现金流丰沛、PB处于历史底部的股票板块，配合黄金及短债底仓做防守保障。",
    isPublic: true,
    createdAt: "2024-05-10", // Yields exactly 759 days duration on 2026-06-08!
    manager: "荣海青",
    category: "指数",
    rebalancingHistory: [
      {
        date: "2025-06-02",
        weights: {
          "HSI197": 25.00,
          "980092.CNI": 20.00,
          "AU0004": 30.00,
          "h11025.CSI": 25.00
        }
      },
      {
        date: "2026-02-18",
        weights: {
          "HSI197": 30.00,
          "980092.CNI": 25.00,
          "AU0004": 35.00,
          "h11015": 10.00
        }
      }
    ]
  }
];
