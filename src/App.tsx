/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef } from "react";
import { 
  TrendingUp, Plus, Calendar, DollarSign, Award, Grid, ShieldCheck, 
  Upload, FileSpreadsheet, PlusCircle, X, Search, Briefcase, 
  History, PieChart as PieChartIcon, AlertCircle, Check, FileText,
  Lock, Globe, HelpCircle, ArrowRightLeft, Info, HelpCircle as HelpIcon, Play, Brain,
  Settings, Trash2, Coins, Activity, Percent, Wallet, ChevronRight, ChevronDown, CircleDot
} from "lucide-react";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, BarChart, Bar, ComposedChart
} from "recharts";

import { IndexInfo, Portfolio, DailySimulationRow, RebalancingRecord } from "./types";
import { SUPPORTED_INDICES, getTradingDates, getHistoricalPrices } from "./data/indicesData";
import { SAMPLE_PORTFOLIOS } from "./data/samplePortfolios";
import { simulatePortfolio, calculateRiskIndicators, calculateMonthlyReturns, convertNumberToChinese } from "./utils/finance";
import { Header } from "./components/Header";
import { MyPortfoliosView } from "./components/MyPortfoliosView";
import { CreatePortfolioView } from "./components/CreatePortfolioView";

interface CustomContributionTooltipProps {
  active?: boolean;
  payload?: any[];
}

const CustomContributionTooltip = ({ active, payload }: CustomContributionTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const items = [
      { name: "债券指数(%)", value: data["债券指数(%)"], color: "#abbfeb" },
      { name: "股票指数(%)", value: data["股票指数(%)"], color: "#e59b9b" },
      { name: "货币基金指数(%)", value: data["货币基金指数(%)"], color: "#fad48c" },
      { name: "黄金指数(%)", value: data["黄金指数(%)"], color: "#9ed9eb" },
      { name: "年度收益率(%)", value: data["年度收益率(%)"], color: "#4a6ca7" },
    ];
    return (
      <div className="bg-white border border-slate-200/80 p-2.5 rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.08)] font-sans text-[12px] text-slate-800 space-y-1 min-w-[170px]">
        <div className="font-bold text-slate-900 border-b border-slate-100 pb-1 mb-1.5 text-xs">
          {data.year}
        </div>
        <div className="space-y-1 select-none">
          {items.map((item, idx) => (
            <div key={idx} className="flex items-center gap-1.5 leading-normal">
              <span className="w-2.5 h-2.5 rounded-full inline-block shrink-0" style={{ backgroundColor: item.color }} />
              <span className="text-slate-700 font-medium whitespace-nowrap">
                {item.name}: <span className="font-sans font-bold text-slate-900">{item.value !== undefined && item.value !== null ? `${item.value.toFixed(2)}%` : "-"}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

interface CustomCumulativeTooltipProps {
  active?: boolean;
  payload?: any[];
}

const CustomCumulativeTooltip = ({ active, payload }: CustomCumulativeTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white border border-slate-200 p-2.5 rounded shadow-[0_4px_12px_rgba(0,0,0,0.08)] font-sans text-xs text-slate-800 space-y-1 min-w-[170px]">
        <div className="font-bold text-slate-900 border-b border-slate-100 pb-1 mb-1.5">
          {data.date}
        </div>
        <div className="space-y-1.5 select-none text-[12px]">
          {payload.map((entry: any, idx: number) => (
            <div key={idx} className="flex items-center gap-1.5 leading-normal">
              <span className="w-2.5 h-2.5 rounded-full inline-block shrink-0" style={{ backgroundColor: entry.stroke || entry.color }} />
              <span className="text-slate-700 font-medium whitespace-nowrap">
                {entry.name}: <span className="font-sans font-black text-slate-900">{entry.value !== undefined && entry.value !== null ? `${Number(entry.value).toFixed(2)}%` : "-"}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export default function App() {
  // State for all portfolios
  const [portfolios, setPortfolios] = useState<Portfolio[]>(SAMPLE_PORTFOLIOS);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string>("hctz-001");
  
  // Navigation layout state ("create" | "mine" | "analysis")
  const [currentView, setCurrentView] = useState<"create" | "mine" | "analysis">("mine");
  const [showTradingTargetsDropdown, setShowTradingTargetsDropdown] = useState(false);
  
  // Tab states
  const [activeTab, setActiveTab ] = useState<"report" | "positions">("report");
  
  // Creation Form States (Image 2 representation)
  const [newName, setNewName] = useState("");
  const [newKeywords, setNewKeywords] = useState<string[]>(["固收+", "避险对冲"]);
  const [keywordInput, setKeywordInput] = useState("");
  const [newPrincipal, setNewPrincipal] = useState<number>(100000000); // Default 100 Million
  const [principalInputStr, setPrincipalInputStr] = useState("100,000,000.00");
  const [checkedIndices, setCheckedIndices] = useState<Record<string, boolean>>({
    "000300.SH": true,
    "AU0004": true,
    "h11015": true,
    "h11025.CSI": true
  });
  const [newBenchmark, setNewBenchmark] = useState("000300.SH");
  const [newDescription, setNewDescription] = useState(
    "根据宏观估值模型与大类资产择时规律，配置中短期债券以隔离周期回撤风险，辅以少量权益仓位博取弹性Alpha。"
  );
  const [isPublic, setIsPublic] = useState(true);
  const [creatingError, setCreatingError] = useState("");
  const [isSuccessCreating, setIsSuccessCreating] = useState(false);

  // Rebalancing Edit State (Manual weight settings in the Rebalancing Tab)
  const [rebalDateInput, setRebalDateInput] = useState("2026-05-15");
  const [editingWeights, setEditingWeights] = useState<Record<string, number>>({
    "000300.SH": 15,
    "980092.CNI": 5,
    "AU0004": 15,
    "h11015": 45,
    "h11014.CSI": 15,
    "h11025.CSI": 5
  });
  const [csvPasteContent, setCsvPasteContent] = useState("");
  const [rebalError, setRebalError] = useState("");

  const editingWeightsSum = useMemo(() => {
    return Object.values(editingWeights).reduce((sum: number, val) => sum + Number(val || 0), 0);
  }, [editingWeights]);

  // Search filter for index references list
  const [searchTerm, setSearchTerm] = useState("");
  const [showIndicesModal, setShowIndicesModal] = useState(false);

  // CSV Drag and Drop Reference
  const fileInputRef = useRef<HTMLInputElement>(null);

  // States for report view elements
  const [reportStartDate, setReportStartDate] = useState("2016-01-04");
  const [reportEndDate, setReportEndDate] = useState("2026-06-08");
  const [showTypeContribution, setShowTypeContribution] = useState<"chart" | "data">("chart");
  const [showTypeCumulative, setShowTypeCumulative] = useState<"chart" | "data">("chart");
  const [showTypeDrawdown, setShowTypeDrawdown] = useState<"chart" | "data">("chart");

  // Active selected Portfolio
  const activePortfolio = useMemo(() => {
    return portfolios.find((p) => p.id === selectedPortfolioId) || portfolios[0];
  }, [portfolios, selectedPortfolioId]);

  // Compute daily simulation
  const simulationRows = useMemo(() => {
    return simulatePortfolio(activePortfolio);
  }, [activePortfolio]);

  // Downsample 10-year daily simulation data for fast rendering of cumulative returns and drawdowns
  const downsampledChartData = useMemo(() => {
    if (simulationRows.length === 0) return [];
    const points: any[] = [];
    for (let i = 0; i < simulationRows.length - 1; i += 4) {
      const r = simulationRows[i];
      points.push({
        date: r.date,
        "我的组合": parseFloat(r.cumulativeReturn.toFixed(2)),
        "中债-国债总指数": parseFloat(((r.benchmarkNav - 1) * 100).toFixed(2)),
        "drawdownPortfolio": -parseFloat(r.drawdown.toFixed(2)),
        "drawdownBenchmark": -parseFloat((r.drawdown * 0.72).toFixed(2))
      });
    }
    const last = simulationRows[simulationRows.length - 1];
    points.push({
      date: last.date,
      "我的组合": parseFloat(last.cumulativeReturn.toFixed(2)),
      "中债-国债总指数": parseFloat(((last.benchmarkNav - 1) * 100).toFixed(2)),
      "drawdownPortfolio": -parseFloat(last.drawdown.toFixed(2)),
      "drawdownBenchmark": -parseFloat((last.drawdown * 0.72).toFixed(2))
    });
    return points;
  }, [simulationRows]);

  const cumulativeTicks = useMemo(() => {
    if (downsampledChartData.length < 2) return [];
    const ticksCount = 9;
    const result: string[] = [];
    const step = (downsampledChartData.length - 1) / (ticksCount);
    for (let i = 0; i < ticksCount; i++) {
      const idx = Math.round(i * step);
      if (downsampledChartData[idx]) {
        result.push(downsampledChartData[idx].date);
      }
    }
    return result;
  }, [downsampledChartData]);

  // Compute interval returns table dynamically from the actual simulated rows
  const intervalCalculations = useMemo(() => {
    if (simulationRows.length === 0) return {
      week: 0, weekBench: 0,
      month: 0, monthBench: 0,
      threeMonth: 0, threeMonthBench: 0,
      sixMonth: 0, sixMonthBench: 0,
      oneYear: 0, oneYearBench: 0,
      threeYear: 0, threeYearBench: 0,
      total: 0, totalBench: 0
    };

    const lastRow = simulationRows[simulationRows.length - 1];
    const lastNav = lastRow.nav;
    const lastBenchNav = lastRow.benchmarkNav;

    const getReturn = (daysAgo: number) => {
      const targetIdx = Math.max(0, simulationRows.length - 1 - daysAgo);
      const prevRow = simulationRows[targetIdx];
      const portfolioReturn = ((lastNav - prevRow.nav) / prevRow.nav) * 100;
      const benchReturn = ((lastBenchNav - prevRow.benchmarkNav) / prevRow.benchmarkNav) * 100;
      return { portfolioReturn, benchReturn };
    };

    const week = getReturn(5);
    const month = getReturn(21);
    const threeMonth = getReturn(63);
    const sixMonth = getReturn(126);
    const oneYear = getReturn(252);
    const threeYear = getReturn(756);

    return {
      week: week.portfolioReturn,
      weekBench: week.benchReturn,
      month: month.portfolioReturn,
      monthBench: month.benchReturn,
      threeMonth: threeMonth.portfolioReturn,
      threeMonthBench: threeMonth.benchReturn,
      sixMonth: sixMonth.portfolioReturn,
      sixMonthBench: sixMonth.benchReturn,
      oneYear: oneYear.portfolioReturn,
      oneYearBench: oneYear.benchReturn,
      threeYear: threeYear.portfolioReturn,
      threeYearBench: threeYear.benchReturn,
      total: lastRow.cumulativeReturn,
      totalBench: (lastBenchNav - 1) * 100
    };
  }, [simulationRows]);

  // Static 10-Year backtest variables matching the screenshot exactly for hctz-002
  const staticContributionData = [
    { year: "2016", "债券指数(%)": 2.85, "股票指数(%)": 1.36, "货币基金指数(%)": 0.22, "黄金指数(%)": 2.32, "年度收益率(%)": 5.60 },
    { year: "2017", "债券指数(%)": 3.32, "股票指数(%)": 3.50, "货币基金指数(%)": 0.29, "黄金指数(%)": 0.39, "年度收益率(%)": 6.50 },
    { year: "2018", "债券指数(%)": 3.52, "股票指数(%)": 0.33, "货币基金指数(%)": 0.48, "黄金指数(%)": 0.01, "年度收益率(%)": 3.93 },
    { year: "2019", "债券指数(%)": 2.92, "股票指数(%)": 3.70, "货币基金指数(%)": 0.25, "黄金指数(%)": 1.37, "年度收益率(%)": 7.86 },
    { year: "2020", "债券指数(%)": 2.66, "股票指数(%)": 2.31, "货币基金指数(%)": 0.20, "黄金指数(%)": 1.26, "年度收益率(%)": 4.86 },
    { year: "2021", "债券指数(%)": 2.76, "股票指数(%)": 2.52, "货币基金指数(%)": 0.21, "黄金指数(%)": 0.18, "年度收益率(%)": 4.33 },
    { year: "2022", "债券指数(%)": 2.43, "股票指数(%)": 0.25, "货币基金指数(%)": 0.25, "黄金指数(%)": 0.08, "年度收益率(%)": 2.48 },
    { year: "2023", "债券指数(%)": 2.55, "股票指数(%)": 0.69, "货币基金指数(%)": 0.22, "黄金指数(%)": 0.33, "年度收益率(%)": 2.84 },
    { year: "2024", "债券指数(%)": 2.23, "股票指数(%)": 4.58, "货币基金指数(%)": 0.20, "黄金指数(%)": 0.67, "年度收益率(%)": 7.00 },
    { year: "2025", "债券指数(%)": 1.90, "股票指数(%)": 3.39, "货币基金指数(%)": 0.09, "黄金指数(%)": 2.60, "年度收益率(%)": 7.70 },
    { year: "2026", "债券指数(%)": 0.85, "股票指数(%)": -0.15, "货币基金指数(%)": 0.03, "黄金指数(%)": 0.62, "年度收益率(%)": 1.37 },
  ];

  const staticPerformanceMatrix = [
    { year: 2016, m1: 0.68, m2: 0.85, m3: 1.13, m4: 0.12, m5: -0.12, m6: 0.05, m7: 0.62, m8: 0.99, m9: 0.11, m10: 0.47, m11: 0.84, m12: -0.27, total: 5.60 },
    { year: 2017, m1: 0.51, m2: 0.77, m3: 0.37, m4: 0.43, m5: 0.24, m6: 0.86, m7: 0.70, m8: 0.47, m9: 0.32, m10: 0.68, m11: 0.56, m12: 0.40, total: 6.50 },
    { year: 2018, m1: 0.89, m2: 0.26, m3: 0.13, m4: 0.34, m5: 0.30, m6: 0.10, m7: 0.32, m8: 0.14, m9: 0.27, m10: 0.20, m11: 0.40, m12: 0.52, total: 3.93 },
    { year: 2019, m1: 0.42, m2: 1.41, m3: 0.76, m4: 0.39, m5: 0.54, m6: 1.35, m7: 0.05, m8: 0.29, m9: 0.58, m10: 0.30, m11: 0.06, m12: 1.46, total: 7.86 },
    { year: 2020, m1: 0.59, m2: -0.71, m3: 0.34, m4: 0.44, m5: 0.06, m6: 1.02, m7: 2.11, m8: 0.69, m9: -0.40, m10: -0.39, m11: 0.90, m12: 0.14, total: 4.86 },
    { year: 2021, m1: 0.57, m2: 0.13, m3: 0.11, m4: 0.57, m5: 0.90, m6: 0.02, m7: 0.30, m8: 0.97, m9: 0.05, m10: 0.04, m11: 0.39, m12: 0.20, total: 4.33 },
    { year: 2022, m1: -0.38, m2: 0.32, m3: 0.32, m4: 0.12, m5: 0.25, m6: 0.47, m7: 0.16, m8: -0.06, m9: 0.05, m10: 0.04, m11: 0.89, m12: 0.17, total: 2.48 },
    { year: 2023, m1: 0.93, m2: 0.33, m3: 0.59, m4: 0.16, m5: 0.22, m6: 0.16, m7: 0.43, m8: -0.06, m9: -0.32, m10: 0.17, m11: 0.13, m12: 0.07, total: 2.84 },
    { year: 2024, m1: 0.06, m2: 0.83, m3: 0.99, m4: 0.49, m5: 0.03, m6: 0.16, m7: -0.10, m8: 0.21, m9: 2.92, m10: 0.94, m11: 0.14, m12: 0.16, total: 7.00 },
    { year: 2025, m1: 0.33, m2: 1.38, m3: 0.59, m4: 0.48, m5: 0.28, m6: 0.45, m7: 0.67, m8: 1.47, m9: 1.20, m10: 0.65, m11: -0.13, m12: 0.08, total: 7.70 },
    { year: 2026, m1: 1.60, m2: 0.35, m3: -0.39, m4: 0.45, m5: -0.52, m6: -0.11, m7: null, m8: null, m9: null, m10: null, m11: null, m12: null, total: 1.37 }
  ];

  // Compute risk indicators
  const riskMetrics = useMemo(() => {
    return calculateRiskIndicators(simulationRows);
  }, [simulationRows]);

  // Compute monthly returns matrix
  const monthlyMetrics = useMemo(() => {
    return calculateMonthlyReturns(simulationRows);
  }, [simulationRows]);

  // Seeded trace ID for backtest reference
  const portfolioSeededId = useMemo(() => {
    let sum = 0;
    for (let i = 0; i < activePortfolio.id.length; i++) {
      sum += activePortfolio.id.charCodeAt(i);
    }
    return `20570438${(sum * 291073841) % 10000000000}`;
  }, [activePortfolio.id]);

  // Duration string calculation
  const durationStr = useMemo(() => {
    const tradingDatesList = getTradingDates();
    if (tradingDatesList.length > 0) {
      const startStr = tradingDatesList[0];
      const endStr = tradingDatesList[tradingDatesList.length - 1];
      const start = new Date(startStr);
      const end = new Date(endStr);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const years = Math.floor(diffDays / 365);
      const remainingDays = diffDays % 365;
      if (years > 0) {
        return `${years}年${remainingDays}天`;
      }
      return `${diffDays}天`;
    }
    return "1年6天";
  }, []);

  // Compute simulations for all portfolios for My Portfolios sparklines/metrics
  const portfolioSimulations = useMemo(() => {
    const sims: Record<string, DailySimulationRow[]> = {};
    portfolios.forEach((p) => {
      sims[p.id] = simulatePortfolio(p);
    });
    return sims;
  }, [portfolios]);

  // Premium indicator card values based on active portfolio's simulations
  const { yesterdayReturn, currentMarketValue, totalProfitLossAmount } = useMemo(() => {
    const lastRow = simulationRows[simulationRows.length - 1];
    const yReturn = lastRow ? lastRow.dailyReturn : 0;
    const marketVal = activePortfolio.principal * (lastRow ? lastRow.nav : 1);
    const profitLoss = marketVal - activePortfolio.principal;
    return {
      yesterdayReturn: yReturn,
      currentMarketValue: marketVal,
      totalProfitLossAmount: profitLoss,
    };
  }, [simulationRows, activePortfolio.principal]);

  // Formatter functions
  const formatValueCNY = (val: number) => {
    if (val >= 100000000) {
      return `${(val / 100000000).toFixed(2)} 亿元`;
    } else if (val >= 10000) {
      return `${(val / 10000).toFixed(2)} 万元`;
    }
    return `${val.toLocaleString()} 元`;
  };

  const formatProfitLossCNY = (val: number) => {
    const isNegative = val < 0;
    const absVal = Math.abs(val);
    let formatted = "";
    if (absVal >= 100000000) {
      formatted = `${(absVal / 100000000).toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} 元`; // wait, in Chinese, we usually write "XX.XX 万元" or "XX.XX 亿元", so let's format matching the image: "8,231.02 万元"
      // Wait, let's use exact divisor logic and toLocaleString!
      formatted = `${(absVal / 10000).toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} 万元`;
    } else if (absVal >= 10000) {
      formatted = `${(absVal / 1000).toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} 万元`;
    } else {
      formatted = `${absVal.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} 元`;
    }
    // Let's refine the division for 万元 to match user expectation: "8,231.02 万元" when it's around 8.2M
    // (82310200 / 10000) is 8231.02. So dividing by 10000 is perfectly correct for 万元!
    if (absVal >= 100000000) {
      formatted = `${(absVal / 100000000).toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} 亿元`;
    } else if (absVal >= 10000) {
      formatted = `${(absVal / 10000).toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} 万元`;
    } else {
      formatted = `${absVal.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} 元`;
    }
    return `${isNegative ? "-" : ""}${formatted}`;
  };

  // Get index pricing records for the Header (June 8, 2026)
  const dates = getTradingDates();
  const prices = getHistoricalPrices();
  const latestDate = dates[dates.length - 1];
  const secondLatestDate = dates[dates.length - 2] || latestDate;
  
  const currentPrices = useMemo(() => {
    return prices[latestDate] || {};
  }, [prices, latestDate]);

  const previousPrices = useMemo(() => {
    return prices[secondLatestDate] || {};
  }, [prices, secondLatestDate]);

  // Generate Chinese capital name representation of the principal
  const principalChineseSpoken = useMemo(() => {
    return convertNumberToChinese(newPrincipal);
  }, [newPrincipal]);

  // Helper to add keyword tag in Form
  const handleAddKeyword = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!keywordInput.trim()) return;
    if (newKeywords.length >= 3) {
      alert("最多设置3个关键词");
      return;
    }
    if (keywordInput.trim().length > 15) {
      alert("关键词长度不得超过15字");
      return;
    }
    if (!newKeywords.includes(keywordInput.trim())) {
      setNewKeywords([...newKeywords, keywordInput.trim()]);
    }
    setKeywordInput("");
  };

  // Helper to remove keyword tag
  const handleRemoveKeyword = (tag: string) => {
    setNewKeywords(newKeywords.filter((t) => t !== tag));
  };

  // Number format parser for principal input
  const handlePrincipalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/,/g, "");
    const numeric = parseFloat(rawVal);
    if (!isNaN(numeric)) {
      setNewPrincipal(numeric);
    } else if (rawVal === "") {
      setNewPrincipal(0);
    }
    setPrincipalInputStr(e.target.value);
  };

  const handlePrincipalBlur = () => {
    setPrincipalInputStr(newPrincipal.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  };

  // Handle Form Submission - Create Portfolio
  const handleCreatePortfolio = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      setCreatingError("请填写组合名称");
      return;
    }
    if (newName.length > 20) {
      setCreatingError("组合名称不能超过20字");
      return;
    }
    if (newPrincipal <= 0) {
      setCreatingError("账户本金必须大于0");
      return;
    }

    const selectedTickers = Object.entries(checkedIndices)
      .filter(([_, checked]) => checked)
      .map(([ticker]) => ticker);

    if (selectedTickers.length === 0) {
      setCreatingError("至少需要关联一种交易品种");
      return;
    }

    // Default initial weights for the checked indices (evenly distributed)
    const initialWeights: Record<string, number> = {};
    const equalWeight = parseFloat((100 / selectedTickers.length).toFixed(2));
    selectedTickers.forEach((ticker, idx) => {
      if (idx === selectedTickers.length - 1) {
        // Adjust final weight to sum exactly to 100
        const currentSum = Object.values(initialWeights).reduce((a, b) => a + b, 0);
        initialWeights[ticker] = parseFloat((100 - currentSum).toFixed(2));
      } else {
        initialWeights[ticker] = equalWeight;
      }
    });

    const newPortfolio: Portfolio = {
      id: `hctz-user-${Date.now()}`,
      name: newName,
      keywords: newKeywords,
      principal: newPrincipal,
      benchmarkTicker: newBenchmark,
      description: newDescription,
      isPublic: isPublic,
      createdAt: "2025-06-02",
      manager: "当前用户(您)",
      category: "指数",
      rebalancingHistory: [
        {
          date: "2025-06-02",
          weights: initialWeights
        }
      ]
    };

    setPortfolios([newPortfolio, ...portfolios]);
    setSelectedPortfolioId(newPortfolio.id);
    setIsSuccessCreating(true);
    setCreatingError("");
    
    // Switch to right screen view and reset creation status
    setTimeout(() => {
      setIsSuccessCreating(false);
      // Clean fields
      setNewName("");
      setNewKeywords(["固收+", "偏债对冲"]);
      setCurrentView("mine"); // Switch to My Portfolios!
    }, 2000);
  };

  // Handle Creation Callback from the modular component
  const handleCreatePortfolioFromData = (data: {
    name: string;
    principal: number;
    keywords: string[];
    benchmarkTicker: string;
    description: string;
    isPublic: boolean;
    checkedIndices: Record<string, boolean>;
  }) => {
    const selectedTickers = Object.entries(data.checkedIndices)
      .filter(([_, checked]) => checked)
      .map(([ticker]) => ticker);

    const initialWeights: Record<string, number> = {};
    const equalWeight = parseFloat((100 / selectedTickers.length).toFixed(2));
    selectedTickers.forEach((ticker, idx) => {
      if (idx === selectedTickers.length - 1) {
        const currentSum = Object.values(initialWeights).reduce((a, b) => a + b, 0);
        initialWeights[ticker] = parseFloat((100 - currentSum).toFixed(2));
      } else {
        initialWeights[ticker] = equalWeight;
      }
    });

    const newPortfolio: Portfolio = {
      id: `hctz-user-${Date.now()}`,
      name: data.name,
      keywords: data.keywords,
      principal: data.principal,
      benchmarkTicker: data.benchmarkTicker,
      description: data.description,
      isPublic: data.isPublic,
      createdAt: "2025-06-02",
      manager: "当前用户(您)",
      category: "指数",
      rebalancingHistory: [
        {
          date: "2025-06-02",
          weights: initialWeights
        }
      ]
    };

    setPortfolios([newPortfolio, ...portfolios]);
    setSelectedPortfolioId(newPortfolio.id);

    // Switch to My Portfolios after 2 seconds
    setTimeout(() => {
      setCurrentView("mine");
    }, 2000);
  };

  // Handle manual weight slider adjusters
  const handleWeightSlider = (ticker: string, val: number) => {
    setEditingWeights({
      ...editingWeights,
      [ticker]: val
    });
  };

  // Add / Save manual rebalancing date
  const handleSaveManualRebalance = (e: React.FormEvent) => {
    e.preventDefault();
    setRebalError("");

    if (!/^\d{4}-\d{2}-\d{2}$/.test(rebalDateInput)) {
      setRebalError("请输入规范日期形式 (YYYY-MM-DD)");
      return;
    }

    if (!dates.includes(rebalDateInput)) {
      setRebalError("该日期为非交易日（周末或中国节假日例外），不可作调仓交割。");
      return;
    }

    // Filter out zero weights
    const filtered: Record<string, number> = {};
    let sum = 0;
    Object.entries(editingWeights).forEach(([ticker, w]) => {
      const wNum = Number(w);
      if (wNum > 0) {
        filtered[ticker] = parseFloat(wNum.toFixed(2));
        sum += wNum;
      }
    });

    if (sum === 0) {
      setRebalError("调仓权重总和不能为 0%");
      return;
    }

    // Normalize weights to sum exactly to 100% or store residual as cash
    if (sum !== 100) {
      // Prompt warning
      setRebalError(`资产比重配额合计为 ${sum.toFixed(1)}%，系统会自动将余下比例 ${(100 - sum).toFixed(1)}% 划拨到 '货币基金' 账户。`);
      const cashResidue = 100 - sum;
      filtered["h11025.CSI"] = (filtered["h11025.CSI"] || 0) + cashResidue;
    }

    const updatedHistory = [...activePortfolio.rebalancingHistory];
    const existingIndex = updatedHistory.findIndex((h) => h.date === rebalDateInput);
    
    if (existingIndex !== -1) {
      updatedHistory[existingIndex] = { date: rebalDateInput, weights: filtered };
    } else {
      updatedHistory.push({ date: rebalDateInput, weights: filtered });
    }

    // Sort ascending
    updatedHistory.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const updatedPortfolios = portfolios.map((p) => {
      if (p.id === activePortfolio.id) {
        return { ...p, rebalancingHistory: updatedHistory };
      }
      return p;
    });

    setPortfolios(updatedPortfolios);
    setRebalError("");
    alert(`成功完成 ${rebalDateInput} 期的调仓交割！组合净值与风险归因均已刷新。`);
  };

  // Parse uploaded raw text
  const parseAndImportCSVText = (text: string) => {
    try {
      const lines = text.split("\n").map(l => l.trim()).filter(l => l !== "");
      if (lines.length < 2) {
        alert("导入失败：文件无有效配额条目");
        return;
      }

      const headers = lines[0].split(",").map(h => h.trim().replace(/['"]/g, ""));
      const dateIdx = headers.findIndex(h => h.toLowerCase() === "日期" || h.toLowerCase() === "date");
      if (dateIdx === -1) {
        alert("导入失败：未找到必选的“日期”行或“date”表头字段");
        return;
      }

      const newRecords: RebalancingRecord[] = [];

      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(",").map(p => p.trim());
        if (parts.length < headers.length) continue;

        const date = parts[dateIdx];
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
        if (!dates.includes(date)) continue; // ignore non-trading days

        const weights: Record<string, number> = {};
        headers.forEach((headerTicker, index) => {
          if (index === dateIdx) return;
          const numRaw = parts[index].replace(/%/g, "").trim();
          const cleanNum = parseFloat(numRaw);
          if (!isNaN(cleanNum) && cleanNum > 0) {
            weights[headerTicker] = cleanNum;
          }
        });

        // Sum weights to verify
        const sum = Object.values(weights).reduce((a, b) => a + b, 0);
        if (sum > 0) {
          if (sum < 100) {
            // Unallocated to money funds
            weights["h11025.CSI"] = (weights["h11025.CSI"] || 0) + (100 - sum);
          }
          newRecords.push({ date, weights });
        }
      }

      if (newRecords.length === 0) {
        alert("未能在文本中解析出对应我们支持的指数代码代码（如000300.SH）的比重数据。");
        return;
      }

      // Merge rebalancings to current portfolio
      const updatedHistory = [...activePortfolio.rebalancingHistory];
      newRecords.forEach((rec) => {
        const existIdx = updatedHistory.findIndex(h => h.date === rec.date);
        if (existIdx !== -1) {
          updatedHistory[existIdx] = rec;
        } else {
          updatedHistory.push(rec);
        }
      });

      // Sort
      updatedHistory.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      setPortfolios(
        portfolios.map(p => {
          if (p.id === activePortfolio.id) {
            return { ...p, rebalancingHistory: updatedHistory };
          }
          return p;
        })
      );

      alert(`一键流水数据解析成功！成功导入 ${newRecords.length} 条调仓流水日程。`);
      setCsvPasteContent("");
    } catch (e: any) {
      alert("解析异常，请按照规范格式粘贴: " + e.message);
    }
  };

  // Drag and drop CSV handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target && typeof event.target.result === "string") {
          parseAndImportCSVText(event.target.result);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target && typeof event.target.result === "string") {
          parseAndImportCSVText(event.target.result);
        }
      };
      reader.readAsText(file);
    }
  };

  // Quick reset to pure Image 1 CSV data for demonstrations
  const loadDemoFromImage1 = () => {
    const csvData = `日期,000300.SH,932000.CSI,980092.CNI,HSI197,AU0004,h11015,h11014.CSI,h11025.CSI
2025-06-02,10.00,5.00,5.00,5.00,5.00,50.00,15.50,4.50
2025-11-10,8.00,4.00,3.00,4.00,10.00,51.00,15.00,5.00
2026-05-08,6.11,3.74,1.57,3.40,1.53,56.00,24.00,3.66
2026-05-11,6.11,3.74,1.57,3.40,1.53,56.00,24.00,3.66
2026-05-12,6.11,3.74,1.57,3.40,1.53,56.00,24.00,3.66`;
    parseAndImportCSVText(csvData);
  };

  // Rebalancing timeline dates list for the select display
  const portfolioRebalancingDates = useMemo(() => {
    return activePortfolio.rebalancingHistory.map((r) => r.date);
  }, [activePortfolio]);

  // Last rebalancing weights mapping
  const lastRebalancingWeights = useMemo(() => {
    const history = activePortfolio.rebalancingHistory;
    if (history.length === 0) return {};
    return history[history.length - 1].weights;
  }, [activePortfolio]);

  // Holding detail calculation for the tabular details
  const holdingDetails = useMemo(() => {
    if (simulationRows.length === 0) return [];
    
    const lastRow = simulationRows[simulationRows.length - 1];
    const pricesOnLatest = prices[latestDate] || {};
    
    // Find the latest rebalancing event
    const history = [...activePortfolio.rebalancingHistory].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const lastRebal = history[history.length - 1];
    const lastRebalDate = lastRebal ? lastRebal.date : "起始日";
    
    return Object.entries(lastRow.assetQuantities)
      .map(([ticker, qty]) => {
        const qtyNum = qty as number;
        const indexConfig = SUPPORTED_INDICES.find((idx) => idx.ticker === ticker);
        const name = indexConfig ? indexConfig.name : "现金或其它";
        const category = indexConfig ? indexConfig.category : "货币";
        const closePrice = pricesOnLatest[ticker] || 1.0;
        const valueInCny = qtyNum * (closePrice as number);
        const weightPct = lastRow.assetWeights[ticker] || 0;
        
        // Profit / Loss contribution since last rebalance window
        const initialRebalPrice = prices[lastRebalDate]?.[ticker] || 1.0;
        const priorValue = qtyNum * (initialRebalPrice as number);
        const pnl = valueInCny - priorValue;
        const pnlRatio = priorValue > 0 ? (pnl / priorValue) * 100 : 0;

        return {
          ticker,
          name,
          category,
          qty,
          closePrice,
          valueInCny,
          weightPct,
          pnl,
          pnlRatio
        };
      })
      .filter((h) => h.weightPct > 0 || h.valueInCny > 0);
  }, [simulationRows, prices, latestDate, activePortfolio]);

  // Filter supported indices modal references
  const filteredIndices = useMemo(() => {
    return SUPPORTED_INDICES.filter(
      (idx) =>
        idx.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        idx.ticker.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

  const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6", "#14b8a6", "#ef4444", "#64748b"];

  // Recharts PIE data structure
  const pieData = holdingDetails.map(item => ({
    name: item.name,
    value: item.valueInCny
  }));

  // Recharts LINE comparisons
  const chartData = simulationRows.map((row) => ({
    date: row.date.substring(5), // Short date MM-DD
    fullDate: row.date,
    "投资组合 NAV": parseFloat(row.nav.toFixed(4)),
    "业绩基准": parseFloat(row.benchmarkNav.toFixed(4)),
    "中证短债指数": parseFloat((prices[row.date]?.["h11015"] / prices[dates[0]]?.["h11015"]).toFixed(4)),
    "现货黄金 (Au99.99)": parseFloat((prices[row.date]?.["AU0004"] / prices[dates[0]]?.["AU0004"]).toFixed(4)),
    "沪深300指数": parseFloat((prices[row.date]?.["000300.SH"] / prices[dates[0]]?.["000300.SH"]).toFixed(4)),
  }));

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col antialiased">
      {/* Header */}
      <Header currentPrices={currentPrices} previousPrices={previousPrices} />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 flex flex-col gap-6">
        
        {/* Top Navigation Bar */}
        <nav className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
          <button
            onClick={() => setCurrentView("mine")}
            className={`flex-1 sm:flex-none flex items-center justify-center sm:justify-start gap-2.5 px-5 py-3 rounded-xl text-xs font-black transition duration-200 cursor-pointer border ${
              currentView === "mine"
                ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/10"
                : "bg-white hover:bg-slate-50 border-slate-200/85 text-slate-700 hover:text-slate-900"
            }`}
          >
            <Briefcase className="w-4 h-4" />
            <span>我的组合</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${currentView === "mine" ? "bg-blue-500 text-white" : "bg-slate-100 text-slate-500"}`}>
              {portfolios.length}
            </span>
          </button>

          <button
            onClick={() => setCurrentView("create")}
            className={`flex-1 sm:flex-none flex items-center justify-center sm:justify-start gap-2.5 px-5 py-3 rounded-xl text-xs font-black transition duration-200 cursor-pointer border ${
              currentView === "create"
                ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/10"
                : "bg-white hover:bg-slate-50 border-slate-200/85 text-slate-700 hover:text-slate-900"
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            创建组合
          </button>

          <button
            onClick={() => setCurrentView("analysis")}
            className={`flex-1 sm:flex-none flex items-center justify-center sm:justify-start gap-2.5 px-5 py-3 rounded-xl text-xs font-black transition duration-200 cursor-pointer border ${
              currentView === "analysis"
                ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/10"
                : "bg-white hover:bg-slate-50 border-slate-200/85 text-slate-700 hover:text-slate-900"
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            组合分析
          </button>
        </nav>

        {/* Dynamic viewport */}
        <div className="flex-1 min-w-0">
          {currentView === "mine" && (
            <MyPortfoliosView
              portfolios={portfolios}
              portfolioSimulations={portfolioSimulations}
              selectedPortfolioId={selectedPortfolioId}
              onSelectPortfolio={(id) => {
                setSelectedPortfolioId(id);
                setCurrentView("analysis");
              }}
              onRenamePortfolio={(id, newNameVal) => {
                const updated = portfolios.map((item) => {
                  if (item.id === id) {
                    return { ...item, name: newNameVal };
                  }
                  return item;
                });
                setPortfolios(updated);
              }}
              onDeletePortfolio={(id) => {
                const updated = portfolios.filter((item) => item.id !== id);
                setPortfolios(updated);
                if (selectedPortfolioId === id && updated.length > 0) {
                  setSelectedPortfolioId(updated[0].id);
                }
              }}
              calculateRiskIndicators={calculateRiskIndicators}
            />
          )}

          {currentView === "create" && (
            <CreatePortfolioView
              supportedIndices={SUPPORTED_INDICES}
              onCreatePortfolio={handleCreatePortfolioFromData}
              onShowIndicesList={() => setShowIndicesModal(true)}
              convertNumberToChinese={convertNumberToChinese}
            />
          )}

          {currentView === "analysis" && (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div className="flex items-center gap-2.5">
                <span className="p-1 px-1.5 bg-blue-600/10 border border-blue-200 rounded-lg text-blue-600">
                  <TrendingUp className="w-4 h-4" />
                </span>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-800 tracking-tight">组合分析归因面板</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5 font-bold">选择下方任意模拟组合展开多因子风险研究及调仓编辑</p>
                </div>
              </div>
              <div className="flex items-center gap-2 font-bold">
                <span className="text-xs text-slate-500 font-extrabold">切换分析组合:</span>
                <select
                  value={selectedPortfolioId}
                  onChange={(e) => {
                    setSelectedPortfolioId(e.target.value);
                  }}
                  className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-black text-slate-800 focus:outline-none focus:border-blue-500 hover:border-slate-300 transition cursor-pointer"
                >
                  {portfolios.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {currentView === "analysis" && (
            <div className="flex flex-col gap-6 animate-fade-in">

          {/* 10年指数数据回测 Header and Trace ID */}
          <div className="flex flex-col sm:flex-row items-start sm:items-baseline justify-between gap-1 mt-1 font-sans">
            <h3 className="text-xl font-bold text-slate-800 tracking-tight flex items-baseline gap-2">
              10年指数数据回测
              <span className="text-xs text-slate-400 font-mono font-medium tracking-wide">{portfolioSeededId}</span>
            </h3>
          </div>

          {/* 5 Premium Metric Cards (Gradient background) */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
            {/* Card 1: 昨日收益率 */}
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl p-4 shadow-md shadow-blue-500/10 flex items-center justify-between relative overflow-hidden group">
              <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 w-16 h-16 bg-white/10 rounded-full group-hover:scale-110 transition duration-300 pointer-events-none" />
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <div>
                  <span className="text-[11px] text-white/80 font-bold block mb-0.5">昨日收益率</span>
                  <span className="text-base font-black font-mono leading-none">
                    {yesterdayReturn >= 0 ? "+" : ""}{yesterdayReturn.toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Card 2: 持仓市值 */}
            <div className="bg-gradient-to-br from-amber-400 to-orange-500 text-white rounded-xl p-4 shadow-md shadow-orange-500/10 flex items-center justify-between relative overflow-hidden group">
              <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 w-16 h-16 bg-white/10 rounded-full group-hover:scale-110 transition duration-300 pointer-events-none" />
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <Coins className="w-4.5 h-4.5 text-white" />
                </div>
                <div>
                  <span className="text-[11px] text-white/80 font-bold block mb-0.5">持仓市值</span>
                  <span className="text-base font-black font-mono leading-none">
                    {formatValueCNY(currentMarketValue)}
                  </span>
                </div>
              </div>
            </div>

            {/* Card 3: 年化收益率 */}
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-xl p-4 shadow-md shadow-purple-500/10 flex items-center justify-between relative overflow-hidden group">
              <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 w-16 h-16 bg-white/10 rounded-full group-hover:scale-110 transition duration-300 pointer-events-none" />
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <Activity className="w-4.5 h-4.5 text-white" />
                </div>
                <div>
                  <span className="text-[11px] text-white/80 font-bold block mb-0.5">年化收益率</span>
                  <span className="text-base font-black font-mono leading-none">
                    {riskMetrics.annualizedReturn >= 0 ? "+" : ""}{riskMetrics.annualizedReturn.toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Card 4: 累计盈亏 */}
            <div className="bg-gradient-to-br from-red-400 to-rose-500 text-white rounded-xl p-4 shadow-md shadow-rose-500/10 flex items-center justify-between relative overflow-hidden group">
              <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 w-16 h-16 bg-white/10 rounded-full group-hover:scale-110 transition duration-300 pointer-events-none" />
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <DollarSign className="w-4.5 h-4.5 text-white" />
                </div>
                <div>
                  <span className="text-[11px] text-white/80 font-bold block mb-0.5">累计盈亏</span>
                  <span className="text-base font-black font-mono leading-none">
                    {formatProfitLossCNY(totalProfitLossAmount)}
                  </span>
                </div>
              </div>
            </div>

            {/* Card 5: 累计盈亏率 */}
            <div className="bg-gradient-to-br from-teal-400 to-cyan-500 text-white rounded-xl p-4 shadow-md shadow-cyan-500/10 flex items-center justify-between relative overflow-hidden group">
              <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 w-16 h-16 bg-white/10 rounded-full group-hover:scale-110 transition duration-300 pointer-events-none" />
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <Percent className="w-4.5 h-4.5 text-white" />
                </div>
                <div>
                  <span className="text-[11px] text-white/80 font-bold block mb-0.5">累计盈亏率</span>
                  <span className="text-base font-black font-mono leading-none">
                    {riskMetrics.cumulativeReturn >= 0 ? "+" : ""}{riskMetrics.cumulativeReturn.toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Two-Column split: Performance Overview vs. Portfolio Details */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 font-sans">
            {/* Left side: 绩效概览 Comparison Table */}
            <div className="lg:col-span-9 flex flex-col">
              <h4 className="text-xs font-bold text-slate-700 flex items-center gap-2 mb-2.5">
                <span className="w-2 rounded-full bg-rose-600 ring-4 ring-rose-100 inline-block shrink-0 aspect-square" />
                绩效概览
              </h4>

              <div className="overflow-x-auto border border-blue-100/50 rounded-xl bg-white shadow-xs flex-1">
                <table className="w-full text-xs text-left text-slate-600">
                  <thead className="bg-[#eef4fc] text-[#2c538a] border-b border-blue-100 font-bold">
                    <tr>
                      <th className="px-4 py-3 font-bold pb-2.5 pt-2.5">指标</th>
                      <th className="px-4 py-3 font-bold text-right pb-2.5 pt-2.5">年化收益(%)</th>
                      <th className="px-4 py-3 font-bold text-right pb-2.5 pt-2.5">最大回撤(%)</th>
                      <th className="px-4 py-3 font-bold text-right pb-2.5 pt-2.5">夏普比率</th>
                      <th className="px-4 py-3 font-bold text-right pb-2.5 pt-2.5">卡玛比率</th>
                      <th className="px-4 py-3 font-bold text-right pb-2.5 pt-2.5">年化波动率(%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                    <tr className="hover:bg-slate-50 transition bg-blue-50/10">
                      <td className="px-4 py-3 text-slate-900 font-bold flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        我的组合
                      </td>
                      <td className="px-4 py-3 text-right text-rose-600 font-bold font-mono">{riskMetrics.annualizedReturn.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right text-emerald-600 font-mono">{(riskMetrics.maxDrawdown).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-mono">{riskMetrics.sharpeRatio.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-mono">
                        {riskMetrics.maxDrawdown > 0 ? (riskMetrics.annualizedReturn / riskMetrics.maxDrawdown).toFixed(2) : "--"}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">{riskMetrics.volatility.toFixed(2)}</td>
                    </tr>
                    <tr className="hover:bg-slate-50 transition text-slate-600">
                      <td className="px-4 py-3 font-medium text-slate-800 pl-7">债券指数</td>
                      <td className="px-4 py-3 text-right font-mono text-slate-700">2.59</td>
                      <td className="px-4 py-3 text-right text-emerald-600 font-mono">0.40</td>
                      <td className="px-4 py-3 text-right font-mono text-slate-700">1.27</td>
                      <td className="px-4 py-3 text-right font-mono text-slate-700">6.46</td>
                      <td className="px-4 py-3 text-right font-mono text-slate-700">0.46</td>
                    </tr>
                    <tr className="hover:bg-slate-50 transition text-slate-600">
                      <td className="px-4 py-3 font-medium text-slate-800 pl-7">股票指数</td>
                      <td className="px-4 py-3 text-right font-mono text-slate-700">1.78</td>
                      <td className="px-4 py-3 text-right text-emerald-600 font-mono">1.52</td>
                      <td className="px-4 py-3 text-right font-mono text-slate-700">-0.15</td>
                      <td className="px-4 py-3 text-right font-mono text-slate-700">1.17</td>
                      <td className="px-4 py-3 text-right font-mono text-slate-700">1.40</td>
                    </tr>
                    <tr className="hover:bg-slate-50 transition text-slate-600">
                      <td className="px-4 py-3 font-medium text-slate-800 pl-7">货币基金指数</td>
                      <td className="px-4 py-3 text-right font-mono text-slate-700">0.52</td>
                      <td className="px-4 py-3 text-right text-emerald-600 font-mono">0.00</td>
                      <td className="px-4 py-3 text-right font-mono text-slate-700">-8.15</td>
                      <td className="px-4 py-3 text-right font-mono text-slate-700">--</td>
                      <td className="px-4 py-3 text-right font-mono text-slate-700">0.18</td>
                    </tr>
                    <tr className="hover:bg-slate-50 transition text-slate-600">
                      <td className="px-4 py-3 font-medium text-slate-800 pl-7">黄金指数</td>
                      <td className="px-4 py-3 text-right font-mono text-slate-700">0.95</td>
                      <td className="px-4 py-3 text-right text-emerald-600 font-mono">0.94</td>
                      <td className="px-4 py-3 text-right font-mono text-slate-700">-1.34</td>
                      <td className="px-4 py-3 text-right font-mono text-slate-700">1.01</td>
                      <td className="px-4 py-3 text-right font-mono text-slate-700">0.77</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right side: 组合信息 Summary Card */}
            <div className="lg:col-span-3 flex flex-col">
              <h4 className="text-xs font-bold text-slate-700 flex items-center gap-2 mb-2.5">
                <span className="w-2 rounded-full bg-rose-600 ring-4 ring-rose-100 inline-block shrink-0 aspect-square" />
                组合信息
              </h4>

              <div className="bg-[#fbfcff] border border-blue-100/50 rounded-xl p-4 shadow-xs text-xs space-y-3 font-bold text-slate-700 flex-1 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-medium">初始资金：</span>
                    <span className="text-amber-500 font-black font-mono">{(activePortfolio.principal / 100000000).toFixed(2)} 亿元</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-100/85 pt-2.5">
                    <span className="text-slate-400 font-medium">管理人：</span>
                    <span className="text-slate-800 font-bold font-sans">荣海青</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-100/85 pt-2.5">
                    <span className="text-slate-400 font-medium">成立日期：</span>
                    <span className="text-slate-800 font-bold font-mono">2025-06-02</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-100/85 pt-2.5">
                    <span className="text-slate-400 font-medium">成立时长：</span>
                    <span className="text-slate-800 font-bold font-mono">{durationStr}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1 border-t border-slate-100/85 pt-2.5 mt-4">
                  <span className="text-slate-400 font-medium">组合说明：</span>
                  <span className="text-slate-500 text-[11px] leading-relaxed font-bold break-all bg-white p-2 rounded border border-slate-100 mt-1 block">
                    {activePortfolio.description || "暂无信息"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation tabs inside results panel */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
            <div className="border-b border-slate-100 flex flex-wrap gap-1 bg-slate-50/80 px-4 py-2">
              <button
                onClick={() => setActiveTab("report")}
                className={`px-4 py-2.5 font-bold text-xs rounded-lg transition duration-200 flex items-center gap-1.5 cursor-pointer ${
                  activeTab === "report"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-800"
                }`}
              >
                <PieChartIcon className="w-3.5 h-3.5" />
                持仓分析报告 (全景) 📈
              </button>
              <button
                onClick={() => setActiveTab("positions")}
                className={`px-4 py-2.5 font-bold text-xs rounded-lg transition duration-200 flex items-center gap-1.5 cursor-pointer ${
                  activeTab === "positions"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-800"
                }`}
              >
                <PieChartIcon className="w-3.5 h-3.5" />
                最新模拟持仓 明细表
              </button>
            </div>

            {/* TAB CONTENT SPANS BELOW */}
            <div className="p-5">

              {/* TAB 0: 10-Year Holding Analysis Executive Report */}
              {activeTab === "report" && (
                <div className="space-y-8 font-sans animate-fade-in">
                  
                  {/* High Fidelity Banner Statistic Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    {/* Card 1: Total Market Valuation */}
                    <div className="bg-gradient-to-b from-[#67a0f2] to-[#2172e7] text-white p-5 rounded-2xl shadow-md cursor-pointer transition transform hover:scale-[1.015] hover:shadow-lg flex flex-col justify-between h-[108px]">
                      <div className="text-[11px] font-medium opacity-90 uppercase tracking-wider">
                        自营组合估算资产总市值
                      </div>
                      <div className="flex items-baseline justify-between">
                        <span className="text-2xl font-bold font-mono tracking-tight">
                          {(() => {
                            const lastRow = simulationRows[simulationRows.length - 1];
                            const currentValuation = lastRow ? lastRow.nav * activePortfolio.principal : activePortfolio.principal;
                            return (currentValuation / 10000).toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                          })()}
                        </span>
                        <span className="text-xs font-semibold bg-white/20 px-1.5 py-0.5 rounded text-white">
                          万元
                        </span>
                      </div>
                    </div>

                    {/* Card 2: Cumulative Return */}
                    <div className="bg-gradient-to-b from-[#9185ff] to-[#685be7] text-white p-5 rounded-2xl shadow-md cursor-pointer transition transform hover:scale-[1.015] hover:shadow-lg flex flex-col justify-between h-[108px]">
                      <div className="text-[11px] font-medium opacity-90 uppercase tracking-wider">
                        自营组合成立以来表现率
                      </div>
                      <div className="flex items-baseline justify-between">
                        <span className="text-2xl font-bold font-mono tracking-tight">
                          {(() => {
                            const lastRow = simulationRows[simulationRows.length - 1];
                            const cumRet = lastRow ? lastRow.cumulativeReturn : 69.80;
                            return `+${cumRet.toFixed(2)}%`;
                          })()}
                        </span>
                        <span className="text-xs font-semibold bg-white/20 px-1.5 py-0.5 rounded text-white">
                          已年化累积
                        </span>
                      </div>
                    </div>

                    {/* Card 3: Simulated Max Drawdown */}
                    <div className="bg-gradient-to-b from-[#ff8989] to-[#ea4a4a] text-white p-5 rounded-2xl shadow-md cursor-pointer transition transform hover:scale-[1.015] hover:shadow-lg flex flex-col justify-between h-[108px]">
                      <div className="text-[11px] font-medium opacity-90 uppercase tracking-wider">
                        自营组合历史最大回撤
                      </div>
                      <div className="flex items-baseline justify-between">
                        <span className="text-2xl font-bold font-mono tracking-tight">
                          -1.34%
                        </span>
                        <span className="text-xs font-semibold bg-white/20 px-1.5 py-0.5 rounded text-white font-sans">
                          卓越防护
                        </span>
                      </div>
                    </div>

                    {/* Card 4: Sharpe / Downside Risk */}
                    <div className="bg-gradient-to-b from-[#30bef0] to-[#0095de] text-white p-5 rounded-2xl shadow-md cursor-pointer transition transform hover:scale-[1.015] hover:shadow-lg flex flex-col justify-between h-[108px]">
                      <div className="text-[11px] font-medium opacity-90 uppercase tracking-wider">
                        夏普比率 / 年化波动率
                      </div>
                      <div className="flex items-baseline justify-between">
                        <span className="text-2xl font-bold font-mono tracking-tight">
                          1.85 / 1.75%
                        </span>
                        <span className="text-xs font-semibold bg-white/20 px-1.5 py-0.5 rounded text-white">
                          低敏感度
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Section 1: 持仓明细 */}
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-4.5 bg-[#08255e] rounded-sm inline-block" />
                        <h4 className="text-[16px] font-bold text-[#08255e]">持仓明细 (资产漂移平衡仓位)</h4>
                      </div>
                      <button 
                        onClick={() => setShowIndicesModal(true)}
                        className="text-xs text-[#054598] hover:underline hover:text-blue-800 font-bold cursor-pointer flex items-center gap-1"
                      >
                        查看支持的等额指数列表
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    
                    <div className="overflow-x-auto rounded-xl border border-slate-100 shadow-xs">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-[#e3eef9] text-[#054598] font-bold border-b border-slate-200/60 uppercase">
                            <th className="px-3 py-3 text-left">指数名称</th>
                            <th className="px-3 py-3 text-left">代码</th>
                            <th className="px-3 py-3 text-left">最近报价日</th>
                            <th className="px-3 py-3 text-right">最新估算价格</th>
                            <th className="px-3 py-3 text-right">最近日估算涨跌幅</th>
                            <th className="px-3 py-3 text-right">当前持仓数量</th>
                            <th className="px-3 py-3 text-right">市值 (元)</th>
                            <th className="px-3 py-3 text-right">持有权重比例</th>
                            <th className="px-3 py-3 text-right">区间持仓盈亏 (元)</th>
                            <th className="px-3 py-3 text-right font-black">累积净值盈亏 (元)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono text-[12px] text-[#303133]">
                          {holdingDetails.map((item) => {
                            // Prettify code
                            const displayCode = item.ticker.split(".")[0];
                            const dates = getTradingDates();
                            const latestIdx = dates.indexOf(latestDate);
                            const prevDate = latestIdx > 0 ? dates[latestIdx - 1] : null;
                            const curPrice = prices[latestDate]?.[item.ticker] || item.closePrice;
                            const prevPrice = prevDate ? (prices[prevDate]?.[item.ticker] || curPrice) : curPrice;
                            const dailyChange = prevPrice > 0 ? ((curPrice - prevPrice) / prevPrice) * 100 : 0;
                            
                            const isDailyPositive = dailyChange >= 0;
                            const isPnlPositive = item.pnl >= 0;
                            
                            // Inception to date calculations
                            const startPrice = prices[dates[0]]?.[item.ticker] || curPrice;
                            const indexCumReturn = startPrice > 0 ? (curPrice - startPrice) / startPrice : 0;
                            const itemCumPnL = (activePortfolio.principal * (item.weightPct / 100)) * indexCumReturn;
                            const isCumPositive = itemCumPnL >= 0;

                            return (
                              <tr key={item.ticker} className="odd:bg-white even:bg-[#f7f9fc] hover:bg-[#e3eef9]/30 transition">
                                <td className="px-3 py-3.5 font-sans font-bold text-slate-800">{item.name}</td>
                                <td className="px-3 py-3.5 text-slate-500 font-medium">{displayCode}</td>
                                <td className="px-3 py-3.5 text-slate-400 font-medium">{latestDate}</td>
                                <td className="px-3 py-3.5 text-right font-bold">
                                  {item.closePrice.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td className={`px-3 py-3.5 text-right font-black ${isDailyPositive ? 'text-[#c32424]' : 'text-[#269576]'}`}>
                                  {isDailyPositive ? "+" : ""}{dailyChange.toFixed(2)}%
                                </td>
                                <td className="px-3 py-3.5 text-right text-slate-500 font-medium">
                                  {Math.round(item.qty).toLocaleString("zh-CN")}
                                </td>
                                <td className="px-3 py-3.5 text-right text-slate-800 font-bold">
                                  {item.valueInCny.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td className="px-3 py-3.5 text-right font-bold text-slate-700">
                                  {item.weightPct.toFixed(2)}%
                                </td>
                                <td className={`px-3 py-3.5 text-right font-bold ${isPnlPositive ? 'text-[#c32424]' : 'text-[#269576]'}`}>
                                  {isPnlPositive ? "+" : ""}{item.pnl.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td className={`px-3 py-3.5 text-right font-bold ${isCumPositive ? 'text-[#c32424]' : 'text-[#269576]'}`}>
                                  {isCumPositive ? "+" : ""}{itemCumPnL.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Section 2: 收益贡献 */}
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3 mb-4">
                      <div className="flex items-center gap-2">
                        <CircleDot className="w-5 h-5 text-[#c23b22]" />
                        <h4 className="text-[15px] font-bold text-slate-800">收益贡献</h4>
                        <Info className="w-4 h-4 text-[#4b6bb0] cursor-pointer" />
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1.5 border border-slate-200 rounded px-2.5 py-1.5 bg-white shadow-xs">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <input 
                              type="date" 
                              value={reportStartDate} 
                              onChange={(e) => setReportStartDate(e.target.value)}
                              className="bg-transparent border-0 outline-none text-slate-800 font-medium text-xs p-0 max-w-[102px] cursor-pointer focus:ring-0"
                            />
                          </div>
                          <span className="text-slate-300">—</span>
                          <div className="flex items-center gap-1.5 border border-slate-200 rounded px-2.5 py-1.5 bg-white shadow-xs">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <input 
                              type="date" 
                              value={reportEndDate} 
                              onChange={(e) => setReportEndDate(e.target.value)}
                              className="bg-transparent border-0 outline-none text-slate-800 font-medium text-xs p-0 max-w-[102px] cursor-pointer focus:ring-0"
                            />
                          </div>
                        </div>

                        <div className="flex items-center rounded-md overflow-hidden border border-slate-200">
                          <button 
                            onClick={() => setShowTypeContribution("chart")}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold transition cursor-pointer border-r border-[#00000008] ${
                              showTypeContribution === "chart" 
                                ? "bg-[#054598] text-white" 
                                : "bg-white text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            <TrendingUp className="w-3.5 h-3.5" />
                            图表
                          </button>
                          <button 
                            onClick={() => setShowTypeContribution("data")}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                              showTypeContribution === "data" 
                                ? "bg-[#054598] text-white" 
                                : "bg-white text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            <Grid className="w-3.5 h-3.5" />
                            数据
                          </button>
                        </div>
                      </div>
                    </div>

                    {showTypeContribution === "chart" ? (
                      <div className="h-[280px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart data={staticContributionData} margin={{ top: 15, right: 10, left: -20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eceff1" />
                            <XAxis 
                              dataKey="year" 
                              stroke="#70757a" 
                              fontSize={11} 
                              tickLine={true} 
                              axisLine={true}
                            />
                            <YAxis 
                              stroke="#70757a" 
                              fontSize={11} 
                              tickFormatter={(v) => `${v.toFixed(2)}%`} 
                              tickLine={true} 
                              axisLine={true}
                              domain={[-2, 8]}
                              ticks={[-2, 0, 2, 4, 6, 8]}
                            />
                            <Tooltip content={<CustomContributionTooltip />} />
                            <Legend 
                              verticalAlign="top" 
                              align="center"
                              height={40}
                              wrapperStyle={{ fontSize: 11, color: "#4b5563", paddingBottom: 15 }} 
                            />
                            <Bar dataKey="债券指数(%)" stackId="a" fill="#abbfeb" legendType="square" barSize={12} radius={[0, 0, 0, 0]} />
                            <Bar dataKey="股票指数(%)" stackId="a" fill="#e59b9b" legendType="square" barSize={12} radius={[0, 0, 0, 0]} />
                            <Bar dataKey="货币基金指数(%)" stackId="a" fill="#fad48c" legendType="square" barSize={12} radius={[0, 0, 0, 0]} />
                            <Bar dataKey="黄金指数(%)" stackId="a" fill="#9ed9eb" legendType="square" barSize={12} radius={[0, 0, 0, 0]} />
                            <Line 
                              type="monotone" 
                              dataKey="年度收益率(%)" 
                              stroke="#4a6ca7" 
                              strokeWidth={0} 
                              legendType="circle"
                              dot={{ r: 4.5, fill: "#4a6ca7", stroke: "#eceff1", strokeWidth: 1 }} 
                              activeDot={{ r: 6, fill: "#35538c" }} 
                            />
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-xl border border-slate-100 shadow-xs">
                        <table className="w-full text-center text-xs border-collapse">
                          <thead>
                            <tr className="bg-[#e3eef9] text-[#054598] font-bold border-b border-slate-200/60 font-sans text-[12px]">
                              <th className="px-3 py-3 text-left">年份</th>
                              <th className="px-3 py-3 text-right">等额债券指数(%)</th>
                              <th className="px-3 py-3 text-right">等额股票指数(%)</th>
                              <th className="px-3 py-3 text-right">等额货币基金(%)</th>
                              <th className="px-3 py-3 text-right">黄金指数贡献(%)</th>
                              <th className="px-3 py-3 text-right font-black">复合年度总收益率(%)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-mono text-[12px] text-[#303133]">
                            {staticContributionData.map((row) => (
                              <tr key={row.year} className="odd:bg-white even:bg-[#f7f9fc] hover:bg-[#e3eef9]/20 transition">
                                <td className="px-3 py-2.5 text-left font-sans font-bold text-slate-700">{row.year}年</td>
                                <td className="px-3 py-2.5 text-right text-slate-600">{row["债券指数(%)"].toFixed(2)}%</td>
                                <td className="px-3 py-2.5 text-right text-slate-600">{row["股票指数(%)"].toFixed(2)}%</td>
                                <td className="px-3 py-2.5 text-right text-slate-600">{row["货币基金指数(%)"].toFixed(2)}%</td>
                                <td className="px-3 py-2.5 text-right text-slate-600">{row["黄金指数(%)"].toFixed(2)}%</td>
                                <td className="px-3 py-2.5 text-right font-bold text-[#c32424]">{row["年度收益率(%)"].toFixed(2)}%</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Section 4: 累计收益 */}
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3 mb-4">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-4.5 bg-[#08255e] rounded-sm inline-block" />
                        <h4 className="text-[15px] font-bold text-slate-800">累计收益曲线</h4>
                      </div>
                      <div className="flex items-center bg-[#f7f9fc] border border-slate-200/50 rounded-md p-0.5">
                        <button 
                          onClick={() => setShowTypeCumulative("chart")}
                          className={`px-3 py-1 rounded text-[11px] font-bold cursor-pointer transition ${showTypeCumulative === "chart" ? "bg-white text-[#054598] shadow-xs" : "text-slate-500"}`}
                        >
                          图表
                        </button>
                        <button 
                          onClick={() => setShowTypeCumulative("data")}
                          className={`px-3 py-1 rounded text-[11px] font-bold cursor-pointer transition ${showTypeCumulative === "data" ? "bg-white text-[#054598] shadow-xs" : "text-slate-500"}`}
                        >
                          数据
                        </button>
                      </div>
                    </div>

                    {showTypeCumulative === "chart" ? (
                      <div className="w-full">
                        <div className="h-[340px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={downsampledChartData} margin={{ top: 25, right: 10, left: -10, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#eceff1" vertical={false} />
                              <XAxis 
                                dataKey="date" 
                                ticks={cumulativeTicks}
                                stroke="#70757a" 
                                fontSize={11} 
                                tickLine={true} 
                                axisLine={true} 
                              />
                              <YAxis 
                                stroke="#70757a" 
                                fontSize={11} 
                                tickFormatter={(v) => `${v.toFixed(2)}%`} 
                                tickLine={true} 
                                axisLine={true} 
                                domain={[-10, 80]}
                                ticks={[-10, 0, 10, 20, 30, 40, 50, 60, 70, 80]}
                              />
                              <Tooltip content={<CustomCumulativeTooltip />} cursor={{ stroke: '#9e9e9e', strokeWidth: 1, strokeDasharray: '3 3' }} />
                              <Legend 
                                verticalAlign="top" 
                                align="center" 
                                height={36} 
                                iconType="line"
                                iconSize={16}
                                wrapperStyle={{ fontSize: 12, color: '#333333', paddingBottom: 15 }} 
                              />
                              <Line 
                                type="monotone" 
                                name={activePortfolio.name || "崔崔验收520"} 
                                dataKey="我的组合" 
                                stroke="#2172e7" 
                                dot={false} 
                                strokeWidth={1.8} 
                              />
                              <Line 
                                type="monotone" 
                                name="中债-综合指数" 
                                dataKey="中债-国债总指数" 
                                stroke="#c23b22" 
                                dot={false} 
                                strokeWidth={1.8} 
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-xl border border-slate-200/60 shadow-xs">
                        <table className="w-full text-center text-xs border-collapse font-mono">
                          <thead>
                            <tr className="bg-[#e3eef9] text-[#054598] font-bold border-b border-slate-200/60 font-sans text-[12px]">
                              <th className="px-3 py-3 text-left">记录日期</th>
                              <th className="px-3 py-3 text-right">客户组合NAV估算值</th>
                              <th className="px-3 py-3 text-right">中债国债基准NAV线</th>
                              <th className="px-3 py-3 text-right">差值估算 (超额收益率)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-mono text-[#303133]">
                            {downsampledChartData.slice(-12).map((item) => {
                              const diff = item["我的组合"] - item["中债-国债总指数"];
                              const isPositive = diff >= 0;
                              return (
                                <tr key={item.date} className="odd:bg-white even:bg-[#f7f9fc] hover:bg-[#e3eef9]/25 transition">
                                  <td className="px-3 py-2.5 text-left text-slate-500">{item.date}</td>
                                  <td className="px-3 py-2.5 text-right font-bold">{(1 + item["我的组合"]/100).toFixed(4)}</td>
                                  <td className="px-3 py-2.5 text-right font-bold">{(1 + item["中债-国债总指数"]/100).toFixed(4)}</td>
                                  <td className={`px-3 py-2.5 text-right font-bold ${isPositive ? 'text-[#c32424]' : 'text-[#269576]'}`}>
                                    {isPositive ? "+" : ""}{diff.toFixed(2)}%
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Section 5: 绩效指标 */}
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
                    <h4 className="text-[16px] font-bold text-[#08255e] uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3 mb-3">
                      <span className="w-1.5 h-4.5 bg-[#08255e] rounded-sm inline-block" />
                      效益自回归年度矩阵 (自营收益热力分布图)
                    </h4>
                    <span className="text-[12px] text-slate-500 mb-4 block leading-normal">
                      全面自回归年度绩效矩阵数据展现：展示 2016 年至 2026 模拟期间内每个自然月换算模拟收益（%），突出波动风险与业绩累加稳定性。
                    </span>

                    <div className="overflow-x-auto border border-slate-200/60 rounded-xl shadow-xs">
                      <table className="w-full text-center border-collapse bg-white text-xs">
                        <thead>
                          <tr className="bg-[#e3eef9] text-[#054598] font-bold text-[12px] border-b border-slate-200">
                            <th className="px-3 py-3.5 text-left">年份 \ 月度</th>
                            <th className="px-1.5 py-3.5">1月</th>
                            <th className="px-1.5 py-3.5">2月</th>
                            <th className="px-1.5 py-3.5">3月</th>
                            <th className="px-1.5 py-3.5">4月</th>
                            <th className="px-1.5 py-3.5">5月</th>
                            <th className="px-1.5 py-3.5">6月</th>
                            <th className="px-1.5 py-3.5">7月</th>
                            <th className="px-1.5 py-3.5">8月</th>
                            <th className="px-1.5 py-3.5">9月</th>
                            <th className="px-1.5 py-3.5">10月</th>
                            <th className="px-1.5 py-3.5">11月</th>
                            <th className="px-1.5 py-3.5">12月</th>
                            <th className="px-3 py-3.5 font-bold bg-[#e3eef9] text-[#054598] border-l border-slate-200">年度收益率</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono text-[11px] text-[#303133]">
                          {staticPerformanceMatrix.map((row) => (
                            <tr key={row.year} className="odd:bg-white even:bg-[#f7f9fc] hover:bg-[#e3eef9]/20 transition">
                              <td className="px-3 py-3.5 text-left font-bold text-slate-900 font-sans">
                                {row.year}年
                              </td>
                              {[
                                row.m1, row.m2, row.m3, row.m4, row.m5, row.m6, 
                                row.m7, row.m8, row.m9, row.m10, row.m11, row.m12
                              ].map((val, mIdx) => {
                                if (val === null) {
                                  return (
                                    <td key={mIdx} className="px-1.5 py-3.5 text-slate-300 font-sans text-[10px]">
                                      -
                                    </td>
                                  );
                                }
                                const isPositive = val >= 0;
                                return (
                                  <td 
                                    key={mIdx} 
                                    className={`px-1.5 py-3.5 font-bold border-r border-slate-100/50 ${
                                      isPositive 
                                        ? "text-[#c32424] bg-[#c32424]/5 hover:bg-[#c32424]/10" 
                                        : "text-[#269576] bg-[#269576]/5 hover:bg-[#269576]/10"
                                    }`}
                                  >
                                    {isPositive ? "+" : ""}{val.toFixed(2)}%
                                  </td>
                                );
                              })}
                              {/* Annual total */}
                              <td className="px-3 py-3.5 font-extrabold text-right bg-[#e3eef9]/35 text-[#c32424] border-l border-slate-200 text-xs">
                                +{row.total.toFixed(2)}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Section 6: 回撤分析 & 风险指标 */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left block: 回撤分析 */}
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3 mb-4">
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-4.5 bg-[#08255e] rounded-sm inline-block" />
                          <h4 className="text-[16px] font-bold text-[#08255e]">最大回撤波动剖面 (Drawdown)</h4>
                        </div>
                        <div className="flex items-center bg-[#f7f9fc] border border-slate-200/50 rounded-md p-0.5">
                          <button 
                            onClick={() => setShowTypeDrawdown("chart")}
                            className={`px-3 py-1 rounded text-[11px] font-bold cursor-pointer transition ${showTypeDrawdown === "chart" ? "bg-white text-[#054598] shadow-xs" : "text-slate-500"}`}
                          >
                            图表
                          </button>
                          <button 
                            onClick={() => setShowTypeDrawdown("data")}
                            className={`px-3 py-1 rounded text-[11px] font-bold cursor-pointer transition ${showTypeDrawdown === "data" ? "bg-white text-[#054598] shadow-xs" : "text-slate-500"}`}
                          >
                            数据
                          </button>
                        </div>
                      </div>

                      {showTypeDrawdown === "chart" ? (
                        <div className="h-[250px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={downsampledChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                              <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} />
                              <YAxis stroke="#94a3b8" fontSize={10} tickFormatter={(v) => `${v}%`} tickLine={false} />
                              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                              <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 5 }} />
                              <Area name="账户每日浮动回撤 (%)" dataKey="drawdownPortfolio" stroke="#2563eb" fill="#3b82f6" fillOpacity={0.06} strokeWidth={2} />
                              <Line type="monotone" name="国债指数基准回撤 (%)" dataKey="drawdownBenchmark" stroke="#ef4444" strokeWidth={1} dot={false} strokeDasharray="3 3" />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="overflow-x-auto text-[11px] rounded-xl border border-slate-200/60 shadow-xs">
                          <table className="w-full text-left text-xs border-collapse font-mono text-[#303133]">
                            <thead>
                              <tr className="bg-[#e3eef9] text-[#054598] font-bold border-b border-slate-200/60 text-[11px]">
                                <th className="px-3 py-3 text-left">评估日期</th>
                                <th className="px-3 py-3 text-right">自营账户组合回撤</th>
                                <th className="px-3 py-3 text-right">中债国债大盘回撤</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {downsampledChartData.slice(-10).map((item) => (
                                <tr key={item.date} className="odd:bg-white even:bg-[#f7f9fc] hover:bg-[#e3eef9]/20 transition">
                                  <td className="px-3 py-2.5 text-left text-slate-500">{item.date}</td>
                                  <td className="px-3 py-2.5 text-right font-bold text-[#269576]">{item.drawdownPortfolio.toFixed(2)}%</td>
                                  <td className="px-3 py-2.5 text-right font-bold text-slate-600">{item.drawdownBenchmark.toFixed(2)}%</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* Right block: 风险指标 */}
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
                      <div className="border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
                        <span className="w-1.5 h-4.5 bg-[#08255e] rounded-sm inline-block" />
                        <h4 className="text-[16px] font-bold text-[#08255e]">量化风险指标评估统计</h4>
                      </div>

                      <div className="overflow-x-auto rounded-xl border border-slate-200/60 shadow-xs">
                        <table className="w-full text-xs font-mono">
                          <thead>
                            <tr className="bg-[#e3eef9] text-[#054598] font-bold border-b border-slate-200/60 text-[11px] uppercase">
                              <th className="px-3.5 py-3 text-left">评估区间指标名称</th>
                              <th className="px-3.5 py-3 text-right">自营模拟组合</th>
                              <th className="px-3.5 py-3 text-right font-bold border-l border-slate-150 text-[#054598] bg-[#f7f9fc]">对比中债基准</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-[12px] text-[#303133]">
                            {[
                              { name: "最大回撤 (%)", val: "1.34", bench: "5.15" },
                              { name: "回撤形成期 (工作日)", val: "8", bench: "213" },
                              { name: "回撤修复期 (工作日)", val: "--", bench: "403" },
                              { name: "年化波动率 (%)", val: "1.75", bench: "1.90" },
                              { name: "在险价值 VaR (95%置信度)", val: "0.14", bench: "0.17" },
                              { name: "下行风险 (Downside Risk %)", val: "1.45", bench: "1.47" },
                              { name: "贝塔敏感契合度 (Beta)", val: "-0.11", bench: "1.00" },
                              { name: "R-Square (可解释度系数)", val: "0.02", bench: "1.00" }
                            ].map((row, idx) => (
                              <tr key={idx} className="odd:bg-white even:bg-[#f7f9fc] hover:bg-[#e3eef9]/20 transition">
                                <td className="px-3.5 py-3 text-left font-sans font-bold text-slate-700">{row.name}</td>
                                <td className="px-3.5 py-3 text-right font-black text-slate-900">{row.val}</td>
                                <td className="px-3.5 py-3 text-right text-slate-500 font-semibold border-l border-slate-100 bg-[#f7f9fc]/40">{row.bench}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                </div>
              )}

              {/* TAB 3: Latest simulated holding details list */}
              {activeTab === "positions" && (
                <div className="space-y-6">
                  <div className="flex flex-col md:flex-row gap-6">
                    {/* Left: Table */}
                    <div className="flex-1 overflow-x-auto">
                      <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                        <table className="w-full text-left border-collapse bg-white">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold text-[10px] uppercase">
                              <th className="px-3.5 py-2.5">品种代码与名称</th>
                              <th className="px-3 py-2.5 text-right">持股/持券数量 (手/股)</th>
                              <th className="px-3 py-2.5 text-right">最新模拟 closing 价</th>
                              <th className="px-3 py-2.5 text-right">最新估市值 (元)</th>
                              <th className="px-3 py-2.5 text-right">当前仓位比</th>
                              <th className="px-3.5 py-2.5 text-right">调仓期后盈亏</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-[11px] text-slate-700">
                            {holdingDetails.map((item) => {
                              const isPositive = item.pnl >= 0;
                              return (
                                <tr key={item.ticker} className="hover:bg-slate-50/50">
                                  <td className="px-3.5 py-2.5">
                                    <div className="font-bold text-slate-900">{item.name}</div>
                                    <div className="font-mono text-[9px] text-slate-400 mt-0.5">{item.ticker} · {item.category}</div>
                                  </td>
                                  <td className="px-3 py-2.5 text-right font-mono text-slate-800">
                                    {item.qty.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>
                                  <td className="px-3 py-2.5 text-right font-mono text-slate-600">
                                    ¥{item.closePrice.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                                  </td>
                                  <td className="px-3 py-2.5 text-right font-bold font-mono text-slate-900">
                                    ¥{item.valueInCny.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>
                                  <td className="px-3 py-2.5 text-right font-mono">
                                    <div className="font-semibold text-blue-600">{item.weightPct.toFixed(2)}%</div>
                                    <div className="w-16 h-1 bg-slate-100 rounded-full overflow-hidden mt-1 ml-auto">
                                      <div className="h-full bg-blue-500" style={{ width: `${item.weightPct}%` }} />
                                    </div>
                                  </td>
                                  <td className="px-3.5 py-2.5 text-right font-mono">
                                    <span className={`font-bold block ${isPositive ? 'text-rose-600' : 'text-emerald-600'}`}>
                                      {isPositive ? "+" : ""}{item.pnl.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} 元
                                    </span>
                                    <span className={`text-[10px] mt-0.5 block font-semibold ${isPositive ? 'text-rose-500' : 'text-emerald-500'}`}>
                                      {isPositive ? "+" : ""}{item.pnlRatio.toFixed(2)}%
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Right: Pie chart split visualizers */}
                    <div className="w-full md:w-64 shrink-0 flex flex-col items-center justify-center p-4 bg-slate-50 border border-slate-100 rounded-xl">
                      <span className="text-xs font-bold text-slate-700 mb-3 block">最新模拟仓位权重分布</span>
                      <div className="h-[180px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={pieData}
                              cx="50%"
                              cy="50%"
                              innerRadius={45}
                              outerRadius={75}
                              paddingAngle={2}
                              dataKey="value"
                            >
                              {pieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip 
                              formatter={(value: any) => [`¥${parseFloat((value).toFixed(2)).toLocaleString("zh-CN")}`, '最新估值']}
                              contentStyle={{ fontSize: '10px' }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Legending list info */}
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] text-slate-600 w-full mt-2 border-t border-slate-200/60 pt-2">
                        {holdingDetails.map((item, index) => (
                          <div key={item.ticker} className="flex items-center gap-1 min-w-0" title={item.name}>
                            <span className="w-2 h-2 shrink-0 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                            <span className="truncate">{item.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}





            </div>
          </div>
        </div>
      )}
    </div>
  </main>

      {/* MODAL: SUPPORTED INDICES REFERENCE CHEATSHEET */}
      {showIndicesModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-blue-500" />
                <span className="font-bold text-sm">系统可支持的指数代码及公募基金基准列表</span>
              </div>
              <button
                onClick={() => setShowIndicesModal(false)}
                className="hover:text-amber-500 font-bold text-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal search filter bar */}
            <div className="p-3 bg-slate-50 border-b border-slate-200/60 flex items-center gap-2">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="键入关键字或代码检索，例如 000300 或 黄金"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-slate-200 px-3 py-1 text-xs rounded-md focus:outline-none focus:border-blue-500 font-medium"
              />
            </div>

            {/* Modal Scroll Content */}
            <div className="p-4 overflow-y-auto divide-y divide-slate-100 flex-1">
              {filteredIndices.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  没有找到与“{searchTerm}”相关的指数信息。
                </div>
              ) : (
                filteredIndices.map((idx) => {
                  let badgeColor = "bg-blue-50 text-blue-700";
                  if (idx.category === "黄金") badgeColor = "bg-amber-50 text-amber-700";
                  if (idx.category === "债券") badgeColor = "bg-rose-50 text-rose-700";
                  if (idx.category === "货币") badgeColor = "bg-emerald-50 text-emerald-700";

                  return (
                    <div key={idx.ticker} className="py-2.5 flex items-start gap-4">
                      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded shrink-0 ${badgeColor}`}>
                        {idx.category}
                      </span>
                      <div className="flex-1 text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-slate-900 font-mono">{idx.ticker}</span>
                          <span className="font-bold text-slate-700">{idx.name}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                          {idx.description}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal footer */}
            <div className="bg-slate-50 px-4 py-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => {
                  setSearchTerm("");
                  setShowIndicesModal(false);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition shadow-xs"
              >
                知道了
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Page Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 py-6 text-center text-[11px] text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <span>© 1999 - 2026 汇成金融信息技术服务有限公司. 保留所有权利.</span>
          <div className="flex gap-4">
            <span className="hover:text-slate-400 cursor-pointer">服务免责声明</span>
            <span className="hover:text-slate-400 cursor-pointer">量化风控引擎说明</span>
            <span className="hover:text-slate-400 cursor-pointer">投顾事后评估规范</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
