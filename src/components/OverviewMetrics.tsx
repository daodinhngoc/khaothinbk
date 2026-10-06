import React from 'react';
import { Users, School, Layers, CheckCircle, Split } from 'lucide-react';
import { OptimizationResult, ExamConfig } from '../types';

interface OverviewMetricsProps {
  result: OptimizationResult;
  config: ExamConfig;
}

export const OverviewMetrics: React.FC<OverviewMetricsProps> = ({ result, config }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Metric 1 */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs flex items-center gap-3.5">
        <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
          <Users className="w-6 h-6" />
        </div>
        <div>
          <div className="text-xs font-medium text-slate-500">Tổng số thí sinh</div>
          <div className="text-2xl font-bold text-slate-800 tracking-tight">
            {result.totalCandidates.toLocaleString('vi-VN')}
            <span className="text-xs font-normal text-slate-500 ml-1.5">học sinh</span>
          </div>
          <div className="text-[11px] text-emerald-600 font-medium mt-0.5">
            100% đã được gán phòng
          </div>
        </div>
      </div>

      {/* Metric 2 */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs flex items-center gap-3.5">
        <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
          <School className="w-6 h-6" />
        </div>
        <div>
          <div className="text-xs font-medium text-slate-500">Tổng số phòng thi</div>
          <div className="text-2xl font-bold text-slate-800 tracking-tight">
            {result.totalRooms}
            <span className="text-xs font-normal text-slate-500 ml-1.5">phòng</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Định mức: tối đa {config.maxPerRoom} HS/phòng
          </div>
        </div>
      </div>

      {/* Metric 3 */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs flex items-center gap-3.5">
        <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
          <Layers className="w-6 h-6" />
        </div>
        <div>
          <div className="text-xs font-medium text-slate-500">Tổ hợp tự chọn</div>
          <div className="text-2xl font-bold text-slate-800 tracking-tight">
            {result.combosCount}
            <span className="text-xs font-normal text-slate-500 ml-1.5">tổ hợp</span>
          </div>
          <div className="text-[11px] text-emerald-600 font-medium mt-0.5 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" /> Chuẩn hóa không phân biệt thứ tự
          </div>
        </div>
      </div>

      {/* Metric 4 */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs flex items-center gap-3.5">
        <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
          <Split className="w-6 h-6" />
        </div>
        <div>
          <div className="text-xs font-medium text-slate-500">Thí sinh phòng cuối (P.{result.totalRooms})</div>
          <div className="text-2xl font-bold text-slate-800 tracking-tight">
            {result.lastRoomCandidatesCount}
            <span className="text-xs font-normal text-slate-500 ml-1.5">/ {config.maxPerRoom} HS</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {result.lastRoomCandidatesCount === config.maxPerRoom ? 'Phòng đầy đủ chỉ tiêu' : 'Phòng chứa số dư thí sinh'}
          </div>
        </div>
      </div>
    </div>
  );
};
