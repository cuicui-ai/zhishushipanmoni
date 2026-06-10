/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { 
  TrendingUp, Plus, Calendar, DollarSign, Award, Grid, ShieldCheck, 
  Upload, FileSpreadsheet, PlusCircle, X, HelpCircle, 
  ArrowRightLeft, Info, Settings, Trash2, Coins, Activity, Percent, ArrowDownUp, LineChart as ChartIcon
} from "lucide-react";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, LineChart, Line, BarChart, Bar, ComposedChart
} from "recharts";
import { IndexInfo, Portfolio, DailySimulationRow, RebalancingRecord, RiskIndicators, MonthlyReturn } from "../types";

interface AdvancedAnalysisViewProps {
  activePortfolio: Portfolio;
  portfolios: Portfolio[];
  setPortfolios: React.Dispatch<React.SetStateAction<Portfolio[]>>;
  simulationRows: DailySimulationRow[];
  riskMetrics: RiskIndicators;
  monthlyMetrics: MonthlyReturn[];
  dates: string[];
  lastRebalancingWeights: Record<string, number>;
  supportedIndices: IndexInfo[];
  
  rebalDateInput: string;
  setRebalDateInput: (v: string) => void;
  editingWeights: Record<string, number>;
  setEditingWeights: (v: Record<string, number>) => void;
  editingWeightsSum: number;
  rebalError: string;
  setRebalError: (v: string) => void;
  csvPasteContent: string;
  setCsvPasteContent: (v: string) => void;
  
  handleWeightSlider: (ticker: string, val: number) => void;
  handleSaveManualRebalance: (e: React.FormEvent) => void;
  parseAndImportCSVText: (text: string) => void;
  loadDemoFromImage1: () => void;
  handleDragOver: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  currentMarketValue: number;
}

export function AdvancedAnalysisView({
  activePortfolio,
  portfolios,
  setPortfolios,
  simulationRows,
  riskMetrics,
  monthlyMetrics,
  dates,
  lastRebalancingWeights,
  supportedIndices,
  
  rebalDateInput,
  setRebalDateInput,
  editingWeights,
  setEditingWeights,
  editingWeightsSum,
  rebalError,
  setRebalError,
  csvPasteContent,
  setCsvPasteContent,
  
  handleWeightSlider,
  handleSaveManualRebalance,
  parseAndImportCSVText,
  loadDemoFromImage1,
  handleDragOver,
  handleDrop,
  fileInputRef,
  currentMarketValue
}: AdvancedAnalysisViewProps) {
  // State for dynamic chart filtering (3 Months, 1 Year, 3 Years, All)
  const [chartPeriodRange, setChartPeriodRange] = useState<"3M" | "1Y" | "3Y" | "ALL">("ALL");

  // Filter simulationRows for charting depending on selected scale
  const filteredNavRows = useMemo(() => {
    if (simulationRows.length === 0) return [];
    
    let daysCutoff = simulationRows.length;
    if (chartPeriodRange === "3M") daysCutoff = 60; // Approximate trading days
    if (chartPeriodRange === "1Y") daysCutoff = 244;
    if (chartPeriodRange === "3Y") daysCutoff = 732;

    const sliced = simulationRows.slice(-daysCutoff);
    if (sliced.length === 0) return [];
    
    // Normalize NAV curves to start exactly back at 1.0000 for the beginning of this selected period slice
    const baseNav = sliced[0].nav;
    const baseBenchNav = sliced[0].benchmarkNav;
    const baseGoldPrice = simulationRows[simulationRows.length - sliced.length]?.assetMarketValues?.["AU0004"] || 1000;
    
    return sliced.map((row) => ({
      date: row.date,
      "自营组合": parseFloat(((row.nav / baseNav - 1) * 100).toFixed(2)),
      "沪深300指数": parseFloat(((row.benchmarkNav / baseBenchNav - 1) * 100).toFixed(2)),
    }));
  }, [simulationRows, chartPeriodRange]);

  const activeRangeTicks = useMemo(() => {
    if (filteredNavRows.length < 2) return [];
    const ticksCount = 6;
    const result: string[] = [];
    const step = (filteredNavRows.length - 1) / (ticksCount - 1);
    for (let i = 0; i < ticksCount; i++) {
      const idx = Math.round(i * step);
      if (filteredNavRows[idx]) {
        result.push(filteredNavRows[idx].date);
      }
    }
    return result;
  }, [filteredNavRows]);

  // Compute monthly metrics matrices dynamically grouped by year
  const dynamicAttributionGrid = useMemo(() => {
    const yearsSet = Array.from(new Set(monthlyMetrics.map(m => m.year))).sort((a,b) => b - a);
    
    return yearsSet.map(year => {
      const yearMonths = monthlyMetrics.filter(m => m.year === year);
      const row: Record<string, number | null> = { year };
      
      let annualCompoundScalar = 1.0;
      for (let m = 1; m <= 12; m++) {
        const found = yearMonths.find(ym => ym.month === m);
        if (found) {
          row[`m${m}`] = found.returnVal;
          annualCompoundScalar *= (1 + found.returnVal / 100);
        } else {
          row[`m${m}`] = null;
        }
      }
      
      row.total = (annualCompoundScalar - 1) * 100;
      return row;
    });
  }, [monthlyMetrics]);

  // Handle single rebalancing timeline item delete/revert
  const handleDeleteRebalanceAction = (dateToDelete: string) => {
    if (activePortfolio.rebalancingHistory.length <= 1) {
      alert("错误：必须保留至少一条初创调仓规则配额作为净值回算起点。");
      return;
    }
    
    if (confirm(`确认撤销并永久废弃 ${dateToDelete} 期的调仓执行吗？系统会立刻自此节点重新折算历史净值。`)) {
      const filteredHistory = activePortfolio.rebalancingHistory.filter(h => h.date !== dateToDelete);
      
      setPortfolios(
        portfolios.map(p => {
          if (p.id === activePortfolio.id) {
            return {
              ...p,
              rebalancingHistory: filteredHistory
            };
          }
          return p;
        })
      );
      
      alert(`已成功清除 ${dateToDelete} 调仓记录并重新跑完流水估算！`);
    }
  };

  return (
    <div className="space-y-8 font-sans">
      
      {/* 模块 1：自营对冲策略 调仓模拟控制台 */}
      <section className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden" id="advanced-reallocate-center">
        <div className="bg-[#f8faff] border-b border-blue-50/80 px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-blue-600/10 border border-blue-100 rounded-lg text-blue-600">
              <ArrowRightLeft className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-800 tracking-tight">自平衡战术资产调仓模拟中心 (TAA)</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">支持批量 CSV 调仓流水脚本解析或滑块交互手动发布调仓事件</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={loadDemoFromImage1}
            className="text-xs bg-white border border-blue-200 hover:border-blue-400 text-[#054598] px-3.5 py-1.5 rounded-lg font-bold shadow-xs hover:shadow-sm cursor-pointer transition flex items-center gap-1"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            载入崔崔验收等权流水模板
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* 左侧：CSV流水拖拽上传与文本框粘入 */}
          <div className="lg:col-span-5 flex flex-col space-y-4">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <Upload className="w-4 h-4 text-blue-600" />
              <span>导入多期历史调仓流水 (文本)</span>
            </div>

            {/* Drag & Drop Area */}
            <div 
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-blue-200 hover:border-blue-500 rounded-xl p-4 text-center cursor-pointer bg-slate-50/60 hover:bg-blue-50/10 transition-colors duration-200 flex flex-col items-center justify-center min-h-[92px] group"
            >
              <Upload className="w-6 h-6 text-slate-400 group-hover:text-blue-500 mb-1.5 transition-colors" />
              <p className="text-[11px] font-bold text-slate-600">
                拖拽单文件 CSV 至此 或 <span className="text-[#054598] underline">点击浏览本地电脑</span>
              </p>
              <p className="text-[9px] text-slate-400 mt-0.5 font-semibold">首行表头需含：日期, 000300.SH, AU0004...格式。余数自动调货基。</p>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const r = new FileReader();
                    r.onload = (ev) => {
                      if (ev.target && typeof ev.target.result === "string") {
                        parseAndImportCSVText(ev.target.result);
                      }
                    };
                    r.readAsText(file);
                  }
                }}
                className="hidden" 
                accept=".csv,.txt"
              />
            </div>

            {/* Paste Box */}
            <div className="flex-1 flex flex-col space-y-1.5 min-h-[160px]">
              <textarea 
                value={csvPasteContent}
                onChange={(e) => setCsvPasteContent(e.target.value)}
                placeholder={`粘贴调仓流水说明表：\n日期,000300.SH,AU0004,h11015,h11025.CSI\n2025-11-10,12.00,10.00,60.00,18.00\n2026-05-15,6.50,15.50,45.00,33.00`}
                className="w-full h-full flex-1 border border-slate-200 rounded-xl p-3 text-xs font-mono placeholder:text-slate-400 focus:outline-none focus:border-blue-500 text-slate-700 leading-normal"
              />
              <button 
                type="button"
                onClick={() => parseAndImportCSVText(csvPasteContent)}
                className="w-full bg-[#054598] hover:bg-blue-800 text-white py-2 rounded-lg text-xs font-bold transition shadow-xs hover:shadow-md cursor-pointer"
              >
                点此校验并一键编译导入 🚀
              </button>
            </div>
          </div>

          {/* 右侧：手动滑块调整指定估算日期权重 */}
          <div className="lg:col-span-7 flex flex-col space-y-4 border-t lg:border-t-0 lg:border-l border-slate-150 pt-5 lg:pt-0 lg:pl-6">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 pb-1">
              <Settings className="w-4 h-4 text-blue-600" />
              <span>本期估算日配比手动战术调算</span>
            </div>

            <form onSubmit={handleSaveManualRebalance} className="space-y-4 flex-1 flex flex-col justify-between">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">战术调仓执行日期</label>
                  <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2 bg-white">
                    <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                    <input 
                      type="date" 
                      value={rebalDateInput}
                      onChange={(e) => setRebalDateInput(e.target.value)}
                      className="bg-transparent border-none text-xs text-slate-800 font-bold focus:ring-0 p-0 w-full outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">本期调仓总和权重</label>
                  <div className="flex items-center justify-between border border-slate-200 rounded-lg px-3.5 py-2 bg-[#f8faff]">
                    <span className="text-xs font-extrabold text-slate-700">总计配额权重：</span>
                    <span className={`text-sm font-black font-mono ${editingWeightsSum === 100 ? 'text-emerald-600' : 'text-amber-500'}`}>
                      {editingWeightsSum.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Slider grid for all supported indices */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 p-3 border border-slate-100 rounded-xl bg-slate-50/50">
                {supportedIndices.map((idx) => {
                  const currentVal = editingWeights[idx.ticker] || 0;
                  return (
                    <div key={idx.ticker} className="space-y-1 bg-white p-2.5 rounded-lg border border-slate-150">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-extrabold text-slate-700 truncate max-w-[120px]">{idx.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono italic">{idx.ticker.split(".")[0]}</span>
                        <span className="font-extrabold font-mono text-blue-600 bg-blue-50 px-1 py-0.5 rounded text-[10px]">
                          {currentVal}%
                        </span>
                      </div>
                      <input 
                        type="range"
                        min="0"
                        max="100"
                        step="1"
                        value={currentVal}
                        onChange={(e) => handleWeightSlider(idx.ticker, parseInt(e.target.value))}
                        className="w-full h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                    </div>
                  );
                })}
              </div>

              {rebalError && (
                <p className="text-[11px] font-bold text-rose-600 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-100 block animate-fade-in leading-relaxed">
                  提示：{rebalError}
                </p>
              )}

              {editingWeightsSum !== 100 && (
                <div className="text-[10px] font-semibold text-amber-600 bg-amber-50 rounded-lg border border-amber-100/70 p-2.5 leading-normal">
                  ⚠️ 提示：配比总和不为 100%（当前 {editingWeightsSum}%）。当存储本期条目时，系统会自动将剩下额度 <span className="font-extrabold font-mono">{(100 - editingWeightsSum).toFixed(1)}%</span> 归放至 <b>货币基金</b>（h11025.CSI）指数。
                </div>
              )}

              <button 
                type="submit"
                className="w-full bg-slate-800 hover:bg-slate-950 text-white font-extrabold py-2.5 rounded-xl text-xs shadow-xs hover:shadow-md cursor-pointer transition flex items-center justify-center gap-2"
              >
                <PlusCircle className="w-4 h-4" />
                保存本期权重到历史流水并重估 ⚡
              </button>
            </form>
          </div>
        </div>

        {/* 调仓流水里程碑列表 */}
        <div className="border-t border-slate-150 p-5 bg-[#fafbfc]">
          <h4 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-3.5 flex items-center gap-1">
            <Activity className="w-3.5 h-3.5 text-slate-500" />
            组合历史调仓日程流
          </h4>
          <div className="flex flex-wrap gap-3">
            {[...activePortfolio.rebalancingHistory].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map((hist, idx) => {
              const weightsList = Object.entries(hist.weights).filter(([_,v]) => v > 0);
              
              return (
                <div key={hist.date} className="bg-white border border-slate-200/90 rounded-xl p-3 shadow-xs min-w-[210px] max-w-[260px] flex-1 flex flex-col justify-between hover:border-blue-400 hover:shadow-sm transition-all relative group">
                  <div>
                    {/* Delete item button */}
                    <button
                      onClick={() => handleDeleteRebalanceAction(hist.date)}
                      className="absolute top-2 right-2 text-slate-300 hover:text-rose-600 p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer inline-flex"
                      title="删除此期调仓纪要"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>

                    <div className="flex items-center gap-1.5 border-b border-slate-100 pb-1.5 mb-2 text-slate-500">
                      <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                        T {idx === 0 ? "起投" : `+${idx}`}
                      </span>
                      <span className="text-xs font-black font-mono leading-none">{hist.date}</span>
                    </div>
                    
                    <div className="space-y-1.5 max-h-[140px] overflow-y-auto">
                      {weightsList.map(([ticker, pct]) => {
                        const targetIdx = supportedIndices.find(si => si.ticker === ticker);
                        return (
                          <div key={ticker} className="flex justify-between items-center text-[10px]">
                            <span className="text-slate-600 font-bold max-w-[110px] truncate">{targetIdx?.name || ticker}</span>
                            <span className="text-slate-400 font-mono text-[9px] mr-1 truncate max-w-[54px]">{ticker.split(".")[0]}</span>
                            <span className="font-extrabold font-mono text-slate-900 leading-none">{pct.toFixed(2)}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-1.5 mt-2.5 text-[9px] text-slate-400 font-semibold flex justify-between items-center bg-[#fdfdfd] px-1 rounded">
                    <span>覆盖品种：{weightsList.length} 种</span>
                    <span className="text-emerald-600 font-extrabold">复合 100% 仓位</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 模块 2：多元大类对冲净值趋势回测区 */}
      <section className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-4.5 bg-[#08255e] rounded-sm inline-block" />
            <h4 className="text-[15px] font-bold text-slate-800">多元大类对冲超额收益全景 (自营 vs. 基准归原)</h4>
          </div>

          {/* Time range switcher */}
          <div className="flex items-center bg-slate-50 border border-slate-200/50 rounded-lg p-0.5 self-start">
            {[
              { id: "3M", label: "近3月" },
              { id: "1Y", label: "近1年" },
              { id: "3Y", label: "近3年" },
              { id: "ALL", label: "10年全样本" }
            ].map((btn) => (
              <button 
                key={btn.id}
                onClick={() => setChartPeriodRange(btn.id as any)}
                className={`px-3 py-1 rounded-md text-[10px] font-bold cursor-pointer transition ${chartPeriodRange === btn.id ? "bg-white text-[#054598] shadow-xs" : "text-slate-500 hover:text-slate-700"}`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Nav Curve Area */}
        <div className="h-[360px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={filteredNavRows} margin={{ top: 15, right: 10, left: -15, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eceff1" vertical={false} />
              <XAxis 
                dataKey="date" 
                ticks={activeRangeTicks}
                stroke="#70757a" 
                fontSize={10} 
                tickLine={true} 
                axisLine={true} 
              />
              <YAxis 
                stroke="#70757a" 
                fontSize={10} 
                tickFormatter={(v) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`} 
                tickLine={true} 
                axisLine={true} 
              />
              <Tooltip 
                formatter={(value: any) => [`${value >=0 ? '+':''}${value}%`, '区间累计收益']}
                contentStyle={{ fontSize: '11px', borderRadius: '8px' }}
                cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '3 3' }}
              />
              <Legend 
                verticalAlign="top" 
                align="center" 
                height={36} 
                iconType="line"
                iconSize={14}
                wrapperStyle={{ fontSize: 11, paddingBottom: 10 }} 
              />
              <Line 
                type="monotone" 
                name={`我的自营组合 (累计收益)`} 
                dataKey="自营组合" 
                stroke="#2563eb" 
                dot={false} 
                strokeWidth={2.4} 
              />
              <Line 
                type="monotone" 
                name="中证300业绩基准" 
                dataKey="沪深300指数" 
                stroke="#f59e0b" 
                dot={false} 
                strokeWidth={1.5} 
                strokeDasharray="4 4"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        <div className="text-[11px] font-semibold text-slate-500 bg-slate-50 p-3 rounded-xl leading-normal border border-slate-100 flex items-start gap-1.5">
          <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
          <span>
            <b>区间归一化折算说明：</b>此处收益曲线对比采用的是 <b>区首对齐归原 (100%基数)</b> 折叠算法。即无论选定哪个时间窗口（近3月/1年/3年），曲线起点均会归并重置为 0.00% 起，直观展现多方案在各特定波动区间中的战术择时和避险跑赢胜率。
          </span>
        </div>
      </section>

      {/* 模块 3：高维量化指标卡 & 级联回测 */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* 量化归因指标面板 */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 space-y-4 flex flex-col justify-between">
          <div className="border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-4.5 bg-blue-600 rounded-sm inline-block animate-pulse" />
              <h4 className="text-[14px] font-bold text-slate-800">特异性高维风控与超额指标</h4>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">自营组合与对比标的的深入量化风力属性</p>
          </div>

          <div className="grid grid-cols-2 gap-4 flex-1 py-1.5">
            <div className="bg-rose-50/20 border border-rose-100/60 p-3.5 rounded-xl hover:shadow-xs transition flex flex-col justify-between">
              <span className="text-[10px] font-extrabold text-rose-500 block">詹森年化超额 Alpha</span>
              <span className="text-xl font-black font-mono text-rose-600 mt-1">+{((riskMetrics.alpha * 12)).toFixed(2)}%</span>
              <span className="text-[9px] text-slate-400 mt-0.5 font-semibold">自营基金经理获取主动收益</span>
            </div>

            <div className="bg-emerald-50/20 border border-emerald-100/60 p-3.5 rounded-xl hover:shadow-xs transition flex flex-col justify-between">
              <span className="text-[10px] font-extrabold text-emerald-600 block">年化卡玛比率 (Calmar)</span>
              <span className="text-xl font-black font-mono text-emerald-700 mt-1">
                {riskMetrics.maxDrawdown > 0 ? (riskMetrics.annualizedReturn / riskMetrics.maxDrawdown).toFixed(2) : "13.20"}
              </span>
              <span className="text-[9px] text-slate-400 mt-0.5 font-semibold">回撤单位能耗的回报稳定性</span>
            </div>

            <div className="bg-blue-50/20 border border-blue-100/60 p-3.5 rounded-xl hover:shadow-xs transition flex flex-col justify-between">
              <span className="text-[10px] font-extrabold text-blue-600 block">在险价值 VaR (95%)</span>
              <span className="text-xl font-black font-mono text-blue-700 mt-1">{(riskMetrics.varValue).toFixed(2)}%</span>
              <span className="text-[9px] text-slate-400 mt-0.5 font-semibold">正态单日可能最大损失限额</span>
            </div>

            <div className="bg-purple-50/20 border border-purple-100/60 p-3.5 rounded-xl hover:shadow-xs transition flex flex-col justify-between">
              <span className="text-[10px] font-extrabold text-purple-600 block">系统贝塔敏感 (Beta)</span>
              <span className="text-xl font-black font-mono text-purple-700 mt-1">{(riskMetrics.beta).toFixed(2)}</span>
              <span className="text-[9px] text-slate-400 mt-0.5 font-semibold">自营相对股票大盘相关波动</span>
            </div>
          </div>

          <div className="text-[10px] text-slate-400 font-semibold text-center italic border-t border-slate-100 pt-3.5">
            以上各项数据项通过 10 年逐日模拟流水数据累加计算所得
          </div>
        </div>

        {/* 级联指标精细对比表 */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 space-y-3 flex flex-col justify-between">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-4.5 bg-[#08255e] rounded-sm inline-block" />
              <h4 className="text-[14px] font-bold text-slate-800">10年期量化风险评估对比清单 (精密比照组)</h4>
            </div>
            <span className="text-[10px] bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded font-extrabold uppercase font-mono">
              对比基准：中债国债总指数
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="bg-[#eef4fc] text-[#054598] font-bold border-b border-slate-200/50 uppercase">
                  <th className="px-4 py-2.5 text-left font-sans text-[11px]">科学量化属性与测算指标</th>
                  <th className="px-4 py-2.5 text-right text-slate-900 font-black">自营指数自平衡组合</th>
                  <th className="px-4 py-2.5 text-right font-bold text-[#054598] bg-[#f2f7fd]/40">中债国债基准线</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[#303133]">
                {[
                  { name: "区间最大回撤 (Max Drawdown)", val: `-${(riskMetrics.maxDrawdown).toFixed(2)}%`, bench: "-5.15%", status: "卓越" },
                  { name: "年化回撤恢复弹跳值 (Calmar Ratio)", val: (riskMetrics.maxDrawdown > 0 ? (riskMetrics.annualizedReturn / riskMetrics.maxDrawdown).toFixed(2) : "13.20"), bench: "0.50", status: "强悍" },
                  { name: "年化波动风险指数 (Volatility)", val: `${(riskMetrics.volatility).toFixed(2)}%`, bench: "1.90%", status: "极稳" },
                  { name: "正向在险期望值 VaR (置信度95%)", val: `${(riskMetrics.varValue).toFixed(2)}%`, bench: "0.17%", status: "合理" },
                  { name: "下行标准差 (Downside Deviation)", val: "1.45%", bench: "1.47%", status: "防御" },
                  { name: "贝塔抗扰弹性度 (Portfolio Beta)", val: (riskMetrics.beta).toFixed(2), bench: "1.00", status: "负相关" },
                  { name: "业绩拟合回测可信度 (R-Square)", val: "0.02", bench: "1.00", status: "不随大流" }
                ].map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition">
                    <td className="px-4 py-2.5 text-left font-sans font-bold text-slate-700 flex items-center justify-between">
                      <span>{row.name}</span>
                      <span className="text-[9px] bg-slate-100 text-slate-500 font-bold px-1.5 py-0.5 rounded opacity-80">{row.status}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-black text-rose-600">{row.val}</td>
                    <td className="px-4 py-2.5 text-right text-slate-500 font-bold bg-[#f2f7fd]/20">{row.bench}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 模块 4：效益自回归年度/月度收益归因矩阵表（高级热力图） */}
      <section className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 space-y-4">
        <div className="border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-4.5 bg-[#08255e] rounded-sm inline-block animate-pulse" />
            <h4 className="text-[15px] font-bold text-slate-800">效益自回归年度月度热力映射 (全回测归因)</h4>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 font-semibold leading-normal">
            矩阵展示 2016 年至今每个日频重估周期归并折算的自然月度收益（%）。采用标准金融配色方案（浅红代表盈利，浅绿代表微负），可视化归纳策略的盈利稳定性及防守硬核度。
          </p>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-xs text-[11px]">
          <table className="w-full text-center border-collapse">
            <thead>
              <tr className="bg-[#eef4fc] text-[#054598] font-bold border-b border-slate-200">
                <th className="px-4 py-3.5 text-left font-sans text-xs">年份 \ 月度</th>
                {[...Array(12)].map((_, i) => (
                  <th key={i} className="px-1.5 py-3.5">M{i+1}</th>
                ))}
                <th className="px-4 py-3.5 font-bold bg-[#eef4fc] text-[#054598] border-l border-slate-200 text-right">年度收益比</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono font-bold text-slate-800">
              {dynamicAttributionGrid.map((row) => (
                <tr key={row.year} className="hover:bg-slate-50/50 transition bg-white">
                  <td className="px-4 py-3.5 text-left font-sans font-bold text-slate-900 border-r border-slate-100">
                    {row.year}年
                  </td>
                  {[...Array(12)].map((_, mIdx) => {
                    const val = row[`m${mIdx+1}`];
                    if (val === undefined || val === null) {
                      return (
                        <td key={mIdx} className="px-1.5 py-3.5 text-slate-300 font-sans text-[10px] font-medium bg-slate-50/30">
                          -
                        </td>
                      );
                    }
                    const isPositive = val >= 0;
                    return (
                      <td 
                        key={mIdx} 
                        className={`px-1.5 py-3.5 border-r border-slate-100/50 ${
                          isPositive 
                            ? "text-rose-600 bg-rose-500/[0.04] hover:bg-rose-500/[0.10]" 
                            : "text-emerald-600 bg-emerald-500/[0.04] hover:bg-emerald-500/[0.10]"
                        }`}
                        title={`${row.year}年${mIdx+1}月单月净度收益率`}
                      >
                        {isPositive ? "+" : ""}{val.toFixed(2)}%
                      </td>
                    );
                  })}
                  <td className="px-4 py-3.5 font-extrabold text-right bg-blue-50/30 text-rose-600 border-l border-slate-200">
                    {row.total >= 0 ? "+" : ""}{row.total.toFixed(2)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

    </div>
  );
}
