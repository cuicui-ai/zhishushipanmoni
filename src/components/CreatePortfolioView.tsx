/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { AlertCircle, Check, Info, Globe, Lock, PlusCircle } from "lucide-react";
import { IndexInfo } from "../types";

interface CreatePortfolioViewProps {
  supportedIndices: IndexInfo[];
  onCreatePortfolio: (data: {
    name: string;
    principal: number;
    keywords: string[];
    benchmarkTicker: string;
    description: string;
    isPublic: boolean;
    checkedIndices: Record<string, boolean>;
  }) => void;
  onShowIndicesList: () => void;
  convertNumberToChinese: (num: number) => string;
}

export function CreatePortfolioView({
  supportedIndices,
  onCreatePortfolio,
  onShowIndicesList,
  convertNumberToChinese
}: CreatePortfolioViewProps) {
  // Local Form States
  const [name, setName] = useState("");
  const [principal, setPrincipal] = useState<number>(100000000); // 100 Million
  const [principalStr, setPrincipalStr] = useState("100,000,000.00");
  const [keywordInput, setKeywordInput] = useState("");
  const [keywords, setKeywords] = useState<string[]>(["固收+", "避险对冲"]);
  const [checkedIndices, setCheckedIndices] = useState<Record<string, boolean>>({
    "000300.SH": true,
    "AU0004": true,
    "h11015": true,
    "h11025.CSI": true
  });
  const [benchmarkTicker, setBenchmarkTicker] = useState("000300.SH");
  const [description, setDescription] = useState(
    "根据宏观择時规律大类轮动，以优质短债资产提供低波动防御，搭配部分宽幅股票及保值黄金对冲。"
  );
  const [isPublic, setIsPublic] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);
  
  const [error, setError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  // Capital Chinese text helper
  const chineseCapital = useMemo(() => {
    return convertNumberToChinese(principal);
  }, [principal, convertNumberToChinese]);

  const handlePrincipalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/,/g, "");
    const numeric = parseFloat(rawVal);
    if (!isNaN(numeric)) {
      setPrincipal(numeric);
    } else if (rawVal === "") {
      setPrincipal(0);
    }
    setPrincipalStr(e.target.value);
  };

  const handlePrincipalBlur = () => {
    setPrincipalStr(principal.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  };

  const handleAddKeyword = (e: React.MouseEvent) => {
    e.preventDefault();
    const val = keywordInput.trim();
    if (!val) return;
    if (keywords.length >= 3) {
      alert("最多只能设置3个关键词");
      return;
    }
    if (val.length > 15) {
      alert("关键词长度不得超过15字");
      return;
    }
    if (!keywords.includes(val)) {
      setKeywords([...keywords, val]);
    }
    setKeywordInput("");
  };

  const handleRemoveKeyword = (tag: string) => {
    setKeywords(keywords.filter((k) => k !== tag));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("请填写组合名称");
      return;
    }
    if (name.length > 20) {
      setError("组合名称不得超过20字");
      return;
    }
    if (principal <= 0) {
      setError("本金数额大小不能低于等于0");
      return;
    }

    const selectedCount = Object.values(checkedIndices).filter(Boolean).length;
    if (selectedCount === 0) {
      setError("请至少绑定选择一种交易品种");
      return;
    }

    setError("");
    setIsSuccess(true);

    // Call parent handler
    onCreatePortfolio({
      name,
      principal,
      keywords,
      benchmarkTicker,
      description,
      isPublic,
      checkedIndices
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/85 p-6 md:p-8 shadow-xs max-w-4xl mx-auto">
      {/* Target Logo Heading Header */}
      <div className="border-b border-slate-200/60 pb-4 mb-6 flex justify-between items-center bg-white">
        <div className="flex items-center gap-2">
          <div className="w-3.5 h-3.5 rounded-full bg-blue-600 ring-4 ring-blue-100 animate-pulse shrink-0" />
          <h2 className="text-base font-extrabold text-slate-800 tracking-tight">创建组合</h2>
        </div>
        <button
          type="button"
          onClick={onShowIndicesList}
          className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline inline-flex items-center gap-0.5 cursor-pointer"
        >
          查看支持的指数列表
        </button>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3.5 rounded-xl text-xs flex items-center gap-1.5 mb-5 font-medium">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {isSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3.5 rounded-xl text-xs flex items-center gap-1.5 animate-bounce mb-5 font-medium">
          <Check className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>正在配置初始均权并清算模拟资产线...</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 text-xs text-slate-700 font-medium">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
          {/* Left Column */}
          <div className="space-y-4">
            
            {/* 1. Trading Targets Selector */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-bold text-slate-700">
                  * 交易品种：
                </label>
                <button
                  type="button"
                  onClick={onShowIndicesList}
                  className="text-[10px] text-blue-600 hover:underline inline-flex items-center font-bold"
                >
                  查看支持的指数列表 ↗
                </button>
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="w-full bg-white border border-slate-200 px-3 py-2.5 rounded-lg text-xs text-left text-slate-700 flex justify-between items-center hover:border-slate-300 transition cursor-pointer font-bold"
                >
                  <span className="truncate">
                    {Object.entries(checkedIndices).filter(([_, v]) => v).length > 0
                      ? Object.entries(checkedIndices)
                          .filter(([_, v]) => v)
                          .map(([k]) => supportedIndices.find((idx) => idx.ticker === k)?.name || k)
                          .join("、")
                      : "请选择交易品种"}
                  </span>
                  <span className="text-slate-400 text-[10px]">▼</span>
                </button>

                {showDropdown && (
                  <div className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg p-3.5 z-30 max-h-[220px] overflow-y-auto space-y-2">
                    <div className="text-[10px] text-slate-400 pb-2 border-b border-slate-100 flex justify-between font-bold">
                      <span>多选需要的指数（系统将均匀配置初始仓位）</span>
                      <button
                        type="button"
                        onClick={() => setShowDropdown(false)}
                        className="text-blue-600 hover:underline"
                      >
                        确定
                      </button>
                    </div>
                    {supportedIndices.map((idx) => (
                      <label
                        key={idx.ticker}
                        className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer select-none text-xs text-slate-700"
                      >
                        <input
                          type="checkbox"
                          checked={!!checkedIndices[idx.ticker]}
                          onChange={(e) => {
                            setCheckedIndices({
                              ...checkedIndices,
                              [idx.ticker]: e.target.checked
                            });
                          }}
                          className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-slate-800 flex items-center justify-between">
                            <span className="truncate">{idx.name}</span>
                            <span className="text-[9px] font-mono text-slate-400 shrink-0">{idx.ticker}</span>
                          </div>
                          <p className="text-[10px] text-slate-400 truncate mt-0.5">{idx.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 2. Portfolio Name */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-slate-700">
                  * 组合名称：
                </label>
                <span className="text-[10px] text-slate-400">{name.length}/20</span>
              </div>
              <input
                type="text"
                placeholder="请输入您的组合名称"
                value={name}
                onChange={(e) => setName(e.target.value.substring(0, 20))}
                className="w-full bg-white border border-slate-200 px-3 py-2.5 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-bold"
                required
              />
            </div>

            {/* 3. Keywords */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                组合关键词 (最多设置3个关键词)：
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="输入后添加，如'红利避险'"
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  className="flex-1 bg-white border border-slate-200 px-3 py-2.5 rounded-lg text-xs placeholder-slate-400 focus:outline-none focus:border-blue-500 font-semibold"
                />
                <button
                  type="button"
                  onClick={handleAddKeyword}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 rounded-lg text-xs flex items-center justify-center cursor-pointer transition min-w-[60px]"
                >
                  添加
                </button>
              </div>
              {keywords.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {keywords.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 bg-blue-50 border border-blue-100 text-blue-700 text-[10px] px-2.5 py-0.5 rounded-full font-bold animate-fade-in"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveKeyword(tag)}
                        className="hover:text-blue-900 font-bold shrink-0 text-[11px]"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* 4. Principal Input */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                * 账户本金 (元)：
              </label>
              <div className="relative">
                <span className="absolute left-3 inset-y-0 flex items-center text-slate-400 font-mono text-xs font-semibold">
                  ¥
                </span>
                <input
                  type="text"
                  value={principalStr}
                  onChange={handlePrincipalChange}
                  onBlur={handlePrincipalBlur}
                  className="w-full bg-white border border-slate-200 pl-7 pr-3 py-2.5 rounded-lg text-xs text-slate-900 font-bold font-mono focus:outline-none focus:border-blue-500"
                  placeholder="100,000,000.00"
                />
              </div>
              {/* Orange/Golden translation block */}
              <div className="mt-1.5 text-[10.5px] text-amber-600 font-bold bg-amber-500/5 px-3 py-1.5 rounded-lg border border-amber-500/10 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                大写本金：<span className="underline text-amber-700 font-black">{chineseCapital || "零元整"}</span>
              </div>
            </div>

            {/* 5. Benchmark */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                * 业绩基准：
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={benchmarkTicker}
                  onChange={(e) => setBenchmarkTicker(e.target.value)}
                  className="flex-1 bg-white border border-slate-200 px-3 py-2.5 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="000300.SH">000300.SH 沪深300指数 (A股大盘核心权益)</option>
                  <option value="932000.CSI">932000.CSI 中证2000指数 (微盘高弹权益)</option>
                  <option value="980092.CNI">980092.CNI 国证自由现金流指数</option>
                  <option value="HSI197">HSI197 恒生科技指数 (港股红筹代笔)</option>
                  <option value="AU0004">AU0004 现货黄金 (上海黄金现货标的)</option>
                  <option value="h11015">h11015 中证短债指数 (信用纯债防守)</option>
                </select>
                <button
                  type="button"
                  onClick={() => alert("自定义基准权重组包配置成功。已作为底盘基点挂载。")}
                  className="w-8 h-8 bg-blue-50 text-blue-600 rounded-full border border-blue-200 hover:bg-blue-100 flex items-center justify-center shrink-0 cursor-pointer text-sm font-black"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="flex flex-col justify-between space-y-4">
            {/* Description */}
            <div className="flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-slate-700">
                  组合说明：
                </label>
                <span className="text-[10px] text-slate-400">{description.length}/500</span>
              </div>
              <textarea
                placeholder="请输入您的策略分析配制说明，不超过500字"
                value={description}
                onChange={(e) => setDescription(e.target.value.substring(0, 500))}
                className="w-full bg-white border border-slate-200 p-3 rounded-lg text-xs leading-relaxed placeholder-slate-400 focus:outline-none focus:border-blue-500 font-bold flex-1 resize-none h-[180px]"
              />
            </div>

            {/* Public/Private select */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                * 是否公开：
              </label>
              <div className="flex gap-6 p-1.5 bg-slate-50 border border-slate-200 rounded-lg">
                <label className="flex-1 flex items-center justify-center gap-1.5 py-2 px-1 rounded-md bg-white border border-slate-200 cursor-pointer font-extrabold text-slate-700 select-none hover:bg-slate-100/50">
                  <input
                    type="radio"
                    checked={isPublic === true}
                    onChange={() => setIsPublic(true)}
                    className="text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                  />
                  <Globe className="w-3.5 h-3.5 text-blue-500" />
                  公开展示
                </label>
                <label className="flex-1 flex items-center justify-center gap-1.5 py-2 px-1 rounded-md bg-white border border-slate-200 cursor-pointer font-extrabold text-slate-700 select-none hover:bg-slate-100/50">
                  <input
                    type="radio"
                    checked={isPublic === false}
                    onChange={() => setIsPublic(false)}
                    className="text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                  />
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  设为私密
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Submitting centered action bottom */}
        <div className="border-t border-slate-100 pt-6 flex justify-center">
          <button
            type="submit"
            className="px-14 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl cursor-pointer transition shadow-md shadow-blue-600/10 hover:shadow-lg hover:shadow-blue-600/20 text-xs text-center border-none inline-block min-w-[200px]"
          >
            创建组合
          </button>
        </div>
      </form>
    </div>
  );
}
