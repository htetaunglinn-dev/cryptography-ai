"use client";

import { useState } from "react";
import type { ClaudeAnalysis } from "@/types";
import { TradingSignal } from "./TradingSignal";
import { RiskScore } from "./RiskScore";
import { formatCurrency, formatRelativeTime } from "@/lib/utils";

interface ClaudeInsightsPanelProps {
  analysis: ClaudeAnalysis | null;
  isLoading: boolean;
  onRefresh: () => void;
}

export function ClaudeInsightsPanel({
  analysis,
  isLoading,
  onRefresh,
}: ClaudeInsightsPanelProps) {
  const [activeTab, setActiveTab] = useState<
    "overview" | "patterns" | "levels"
  >("overview");

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border border-gray-800 bg-gray-900 p-8">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-gray-700 border-t-blue-500 mx-auto" />
          <p className="text-sm text-gray-400">
            Claude AI is analyzing the market...
          </p>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="flex h-fit flex-col items-center justify-center rounded-lg border border-gray-800 bg-gray-900 p-6">
        <div className="text-center space-y-3">
          <div className="mx-auto h-12 w-12 rounded-full bg-gray-800 flex items-center justify-center">
            <svg
              className="h-6 w-6 text-gray-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>
          <p className="text-sm text-gray-400">No analysis available yet</p>
          <button
            onClick={onRefresh}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition"
          >
            Generate Analysis
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col space-y-4">
      <div className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-900 p-4">
        <div>
          <h2 className="text-lg font-bold text-white">Claude AI Insights</h2>
          <p className="text-xs text-gray-400">
            Updated {formatRelativeTime(analysis.timestamp)}
          </p>
        </div>
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition disabled:opacity-50"
        >
          Refresh
        </button>
      </div>

      <TradingSignal
        signal={analysis.signal}
        confidence={analysis.confidence}
      />

      <RiskScore assessment={analysis.riskAssessment} />

      <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
        <div className="mb-4 flex space-x-2 border-b border-gray-800">
          {(["overview", "patterns", "levels"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-2 text-sm font-medium transition ${
                activeTab === tab
                  ? "border-b-2 border-blue-500 text-blue-500"
                  : "text-gray-400 hover:text-gray-300"
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {activeTab === "overview" && (
          <div className="space-y-3">
            <div>
              <h4 className="mb-2 text-xs font-semibold text-gray-400">
                Market Summary
              </h4>
              <p className="text-sm text-gray-300">
                {analysis.marketAnalysis.summary}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-xs text-gray-400">Trend</span>
                <p
                  className={`text-sm font-semibold ${
                    analysis.marketAnalysis.trend === "bullish"
                      ? "text-green-500"
                      : analysis.marketAnalysis.trend === "bearish"
                      ? "text-red-500"
                      : "text-yellow-500"
                  }`}
                >
                  {analysis.marketAnalysis.trend.toUpperCase()}
                </p>
              </div>

              <div>
                <span className="text-xs text-gray-400">Momentum</span>
                <p className="text-sm font-semibold text-white">
                  {analysis.marketAnalysis.momentum}
                </p>
              </div>
            </div>

            <div>
              <h4 className="mb-2 text-xs font-semibold text-gray-400">
                Key Insights
              </h4>
              <ul className="space-y-1">
                {analysis.marketAnalysis.insights.map((insight, index) => (
                  <li
                    key={index}
                    className="text-xs text-gray-300 flex items-start"
                  >
                    <span className="mr-2 text-blue-500">→</span>
                    <span>{insight}</span>
                  </li>
                ))}
              </ul>
            </div>

            {(analysis.suggestedEntry ||
              analysis.suggestedExit ||
              analysis.stopLoss) && (
              <div className="border-t border-gray-800 pt-3">
                <h4 className="mb-2 text-xs font-semibold text-gray-400">
                  Price Targets
                </h4>
                <div className="space-y-1">
                  {analysis.suggestedEntry && (
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Entry:</span>
                      <span className="font-semibold text-green-500">
                        {formatCurrency(analysis.suggestedEntry)}
                      </span>
                    </div>
                  )}
                  {analysis.suggestedExit && (
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Exit:</span>
                      <span className="font-semibold text-blue-500">
                        {formatCurrency(analysis.suggestedExit)}
                      </span>
                    </div>
                  )}
                  {analysis.stopLoss && (
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Stop Loss:</span>
                      <span className="font-semibold text-red-500">
                        {formatCurrency(analysis.stopLoss)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "patterns" && (
          <div className="space-y-3">
            {analysis.patterns.length > 0 ? (
              analysis.patterns.map((pattern, index) => (
                <div
                  key={index}
                  className="rounded-md border border-gray-800 bg-gray-950 p-3"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-white">
                      {pattern.name}
                    </h4>
                    <span
                      className={`text-xs font-medium ${
                        pattern.type === "bullish"
                          ? "text-green-500"
                          : pattern.type === "bearish"
                          ? "text-red-500"
                          : "text-yellow-500"
                      }`}
                    >
                      {pattern.type.toUpperCase()} ({pattern.confidence}%)
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">{pattern.description}</p>

                  {(pattern.targetPrice || pattern.stopLoss) && (
                    <div className="mt-2 flex gap-3 text-xs">
                      {pattern.targetPrice && (
                        <div>
                          <span className="text-gray-500">Target: </span>
                          <span className="font-semibold text-green-500">
                            {formatCurrency(pattern.targetPrice)}
                          </span>
                        </div>
                      )}
                      {pattern.stopLoss && (
                        <div>
                          <span className="text-gray-500">SL: </span>
                          <span className="font-semibold text-red-500">
                            {formatCurrency(pattern.stopLoss)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="text-center text-sm text-gray-400">
                No patterns detected
              </p>
            )}
          </div>
        )}

        {activeTab === "levels" && (
          <div className="space-y-4">
            <div>
              <h4 className="mb-2 text-xs font-semibold text-gray-400">
                Support Levels
              </h4>
              {analysis.marketAnalysis.keyLevels.support.length > 0 ? (
                <div className="space-y-1">
                  {analysis.marketAnalysis.keyLevels.support.map(
                    (level, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between rounded bg-green-500/10 px-2 py-1"
                      >
                        <span className="text-xs text-gray-400">
                          S{index + 1}
                        </span>
                        <span className="text-sm font-semibold text-green-500">
                          {formatCurrency(level)}
                        </span>
                      </div>
                    )
                  )}
                </div>
              ) : (
                <p className="text-xs text-gray-500">
                  No support levels identified
                </p>
              )}
            </div>

            <div>
              <h4 className="mb-2 text-xs font-semibold text-gray-400">
                Resistance Levels
              </h4>
              {analysis.marketAnalysis.keyLevels.resistance.length > 0 ? (
                <div className="space-y-1">
                  {analysis.marketAnalysis.keyLevels.resistance.map(
                    (level, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between rounded bg-red-500/10 px-2 py-1"
                      >
                        <span className="text-xs text-gray-400">
                          R{index + 1}
                        </span>
                        <span className="text-sm font-semibold text-red-500">
                          {formatCurrency(level)}
                        </span>
                      </div>
                    )
                  )}
                </div>
              ) : (
                <p className="text-xs text-gray-500">
                  No resistance levels identified
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
