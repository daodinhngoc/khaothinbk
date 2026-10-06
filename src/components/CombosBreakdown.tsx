import React from 'react';
import { Layers, Users, BookOpen } from 'lucide-react';
import { OptimizationResult } from '../types';

interface CombosBreakdownProps {
  result: OptimizationResult;
}

export const CombosBreakdown: React.FC<CombosBreakdownProps> = ({ result }) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600" />
            Thống kê Phân bổ Tổ hợp Môn Tự chọn
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Tất cả thí sinh cùng tổ hợp tự chọn được gom nhóm liên tục và sắp xếp SBD tăng dần trước khi cắt phòng.
          </p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg">
          {result.combosCount} tổ hợp môn
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-2">
        {result.combosDistribution.map((item, idx) => {
          const percentage = ((item.count / result.totalCandidates) * 100).toFixed(1);
          return (
            <div
              key={item.combo}
              className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 flex flex-col justify-between hover:bg-slate-100/70 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-800 font-mono flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                  {item.combo}
                </span>
                <span className="text-xs font-bold text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-full">
                  {item.count} HS
                </span>
              </div>

              {/* Progress bar */}
              <div className="space-y-1">
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full rounded-full"
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-[11px] text-slate-500">
                  <span>Tỷ lệ tham gia</span>
                  <span className="font-semibold text-slate-700">{percentage}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
