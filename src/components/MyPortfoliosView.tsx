/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Briefcase, TrendingUp, PieChart as PieChartIcon, Settings, Trash2, HelpCircle } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import { Portfolio, DailySimulationRow, RiskIndicators } from "../types";

interface MyPortfoliosViewProps {
  portfolios: Portfolio[];
  portfolioSimulations: Record<string, DailySimulationRow[]>;
  selectedPortfolioId: string;
  onSelectPortfolio: (id: string) => void;
  onRenamePortfolio: (id: string, newName: string) => void;
  onDeletePortfolio: (id: string) => void;
  calculateRiskIndicators: (rows: DailySimulationRow[]) => RiskIndicators;
}

export function MyPortfoliosView({
  portfolios,
  portfolioSimulations,
  selectedPortfolioId,
  onSelectPortfolio,
  onRenamePortfolio,
  onDeletePortfolio,
  calculateRiskIndicators
}: MyPortfoliosViewProps) {
  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1 px-1.5 bg-blue-600/10 border border-blue-200 rounded-lg text-blue-600">
            <Briefcase className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-800 tracking-tight">我的组合 ({portfolios.length} 个)</h2>
            <p className="text-[10px] text-slate-400 mt-0.5 font-medium">查看并管理已创建的各种 TAA 理财及大类自平衡事后模拟组合</p>
          </div>
        </div>
      </div>

      {portfolios.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center shadow-xs">
          <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-600">暂无任何组合资产数据</p>
          <p className="text-xs text-slate-400 mt-1">您可以点击左侧的“创建组合”开始新增</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {portfolios.map((p) => {
            const cardRows = portfolioSimulations[p.id] || [];
            const cardLatestRow = cardRows[cardRows.length - 1];
            const cardLatestNav = cardLatestRow ? cardLatestRow.nav : 1.0;
            const cardMetrics = calculateRiskIndicators(cardRows);
            const isDefaultSaved = p.id === "hctz-001" || p.id === "hctz-002" || p.id === "hctz-003";

            // Calculate dynamic duration in days (Jan 4, 2016 -> June 8, 2026 is exactly 3808)
            const startDay = new Date(p.createdAt).getTime();
            const endDay = new Date("2026-06-08").getTime();
            const calculatedDays = Math.floor((endDay - startDay) / (1000 * 60 * 60 * 24));

            // Downsample sparkline to make chart rendering extremely efficient
            const sparkData = cardRows
              .filter((_, idx) => idx % 6 === 0)
              .map((row) => ({
                date: row.date,
                "组合净值": parseFloat(row.nav.toFixed(4))
              }));

            const accumReturn = cardLatestRow ? cardLatestRow.cumulativeReturn : 0;
            const annReturn = cardMetrics.annualizedReturn;

            return (
              <div
                key={p.id}
                onClick={() => onSelectPortfolio(p.id)}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-300 relative overflow-hidden flex flex-col group cursor-pointer hover:-translate-y-0.5"
              >
                {/* Diagonal Category Tag */}
                <div className="absolute top-0 left-0 bg-blue-600 text-white font-bold text-[9px] tracking-wider px-3.5 py-1 rounded-br-2xl shadow-xs uppercase z-10">
                  {p.category || "指数"}
                </div>

                {/* Edit Controls */}
                <div className="absolute top-2.5 right-2.5 flex items-center gap-1 z-20">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const newNamePrompt = prompt("请输入新的组合名称:", p.name);
                      if (newNamePrompt && newNamePrompt.trim() !== "") {
                        onRenamePortfolio(p.id, newNamePrompt.substring(0, 20));
                      }
                    }}
                    className="p-1 bg-white border border-slate-200 text-slate-400 hover:text-slate-600 rounded-lg shadow-xs hover:shadow-sm"
                    title="重命名组合"
                  >
                    <Settings className="w-3.5 h-3.5" />
                  </button>
                  {!isDefaultSaved && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`确认要删除投资组合 "${p.name}" 吗？该操作不可逆。`)) {
                          onDeletePortfolio(p.id);
                        }
                      }}
                      className="p-1 bg-white border border-slate-200 text-rose-400 hover:text-rose-600 rounded-lg shadow-xs hover:shadow-sm"
                      title="删除组合"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="p-5 flex-1 flex flex-col pt-9">
                  {/* Setup Age Indicator */}
                  <div className="text-purple-600 text-[11px] font-bold text-center bg-purple-50 border border-purple-100 rounded-full px-2.5 py-0.5 w-fit mx-auto">
                    成立时长[天]: {calculatedDays}
                  </div>

                  {/* Title */}
                  <h3 className="text-sm font-extrabold text-slate-800 text-center tracking-tight mt-3 line-clamp-1 group-hover:text-blue-600 transition-colors duration-200">
                    {p.name}
                  </h3>

                  {/* Manager Name */}
                  <div className="text-center mt-2.5 mb-5 shrink-0">
                    <span className="text-[9px] text-slate-400 block font-bold uppercase tracking-wider">管理人</span>
                    <span className="text-xs font-semibold mt-0.5 text-slate-600 inline-flex items-center gap-1.5 bg-slate-50 px-2 py-0.5 rounded border border-slate-200/50">
                      {p.manager || "荣海青"}
                      <HelpCircle 
                        className="w-3 h-3 text-slate-300 hover:text-slate-500 cursor-pointer" 
                        onClick={(e) => {
                          e.stopPropagation();
                          alert(`该组合由资深量化交易投研经理 [${p.manager || '荣海青'}] 主导编制。配置全周期资产日频清算数据。`);
                        }}
                      />
                    </span>
                  </div>

                  {/* Three Key Metrics Grid */}
                  <div className="grid grid-cols-3 border-t border-slate-100 pt-4 text-center mt-auto gap-1">
                    <div className="flex flex-col items-center">
                      <span className="text-[9px] text-slate-400 font-bold pb-1 block">组合净值</span>
                      <span className="text-xs font-black text-rose-600 font-mono tracking-tight">{cardLatestNav.toFixed(4)}</span>
                    </div>
                    <div className="flex flex-col items-center border-x border-slate-100">
                      <span className="text-[9px] text-slate-400 font-bold pb-1 block">年化收益率</span>
                      <span className="text-xs font-black text-rose-600 font-mono tracking-tight flex items-center justify-center">
                        <span className="text-[10px] font-black leading-none pb-0.5 mr-0.5 mt-0.5">↑</span>
                        {annReturn >= 0 ? "+" : ""}{annReturn.toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-[9px] text-slate-400 font-bold pb-1 block">累计盈亏率</span>
                      <span className="text-xs font-black text-rose-600 font-mono tracking-tight">{accumReturn.toFixed(2)}%</span>
                    </div>
                  </div>
                </div>

                {/* Miniature Sparkline Chart Area */}
                <div className="h-16 w-full bg-slate-50 border-t border-slate-100 flex items-end relative overflow-hidden group-hover:bg-blue-50/20 transition-all duration-200">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={sparkData} margin={{ top: 12, right: 0, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id={`sparkGrad-${p.id}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#2563eb" stopOpacity={0.16} />
                          <stop offset="100%" stopColor="#2563eb" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <Area
                        type="monotone"
                        dataKey="组合净值"
                        stroke="#2563eb"
                        strokeWidth={1.5}
                        fill={`url(#sparkGrad-${p.id})`}
                        fillOpacity={1}
                        dot={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
