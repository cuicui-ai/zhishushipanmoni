/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { TrendingUp, BarChart3, ShieldAlert, Award } from "lucide-react";

interface HeaderProps {
  currentPrices: Record<string, number>;
  previousPrices: Record<string, number>;
}

export function Header({ currentPrices, previousPrices }: HeaderProps) {
  // Let's configure custom tickers and symbols to show
  const tickerItems = [
    { name: "沪深300", ticker: "000300.SH", base: 3500 },
    { name: "中证2000", ticker: "932000.CSI", base: 1800 },
    { name: "自由现金流", ticker: "980092.CNI", base: 1000 },
    { name: "恒生科技", ticker: "HSI197", base: 3800 },
    { name: "Au99.99(黄金)", ticker: "AU0004", base: 450 },
    { name: "中证短债", ticker: "h11015", base: 110 },
    { name: "中证短融", ticker: "h11014.CSI", base: 105 },
    { name: "货币基金", ticker: "h11025.CSI", base: 1.00 },
  ];

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white">
      {/* Upper Brand Nav */}
      <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2.5 rounded-xl shadow-lg shadow-blue-500/20 text-white flex items-center justify-center animate-pulse">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              汇成指数实盘模拟系统 
              <span className="text-xs bg-blue-500/20 border border-blue-500/30 text-blue-400 px-2 py-0.5 rounded font-normal uppercase tracking-wider">
                模拟版 v2.5
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              支持上传调仓流水 · 逐日持仓市值跟踪 · 科学多维度风险归因
            </p>
          </div>
        </div>

        {/* Removed measurement interval and standard metrics boxes as requested */}
      </div>
    </header>
  );
}
