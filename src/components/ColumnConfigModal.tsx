import React, { useState } from 'react';
import { X, SlidersHorizontal, Plus, Trash2, ArrowUp, ArrowDown, RotateCcw, Check, CheckCircle2, Layout, Eye, Sparkles } from 'lucide-react';
import { ColumnDefinition, ExportColumnsConfig } from '../types';
import { calculateFitWidths, DEFAULT_ATTENDANCE_COLUMNS, DEFAULT_OVERALL_COLUMNS } from '../utils/columnDefaults';

interface ColumnConfigModalProps {
  config: ExportColumnsConfig;
  availableFileKeys?: string[];
  onSave: (newConfig: ExportColumnsConfig) => void;
  onClose: () => void;
}

export const ColumnConfigModal: React.FC<ColumnConfigModalProps> = ({
  config,
  availableFileKeys = [],
  onSave,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'attendance' | 'overall'>('attendance');
  const [attendanceCols, setAttendanceCols] = useState<ColumnDefinition[]>(config.attendanceColumns);
  const [overallCols, setOverallCols] = useState<ColumnDefinition[]>(config.overallColumns);

  // Form thêm cột mới
  const [newColName, setNewColName] = useState('');
  const [newColSource, setNewColSource] = useState<'empty' | 'existing'>('empty');
  const [selectedSourceKey, setSelectedSourceKey] = useState(availableFileKeys[0] || '');
  const [newColAlign, setNewColAlign] = useState<'left' | 'center' | 'right'>('center');
  const [newColWidth, setNewColWidth] = useState<number>(2);

  const currentCols = activeTab === 'attendance' ? attendanceCols : overallCols;
  const setCurrentCols = activeTab === 'attendance' ? setAttendanceCols : setOverallCols;

  // Toggle bật/tắt cột
  const handleToggleColumn = (id: string) => {
    setCurrentCols(prev =>
      prev.map(col => (col.id === id ? { ...col, enabled: !col.enabled } : col))
    );
  };

  // Đổi tên tiêu đề
  const handleHeaderNameChange = (id: string, name: string) => {
    setCurrentCols(prev =>
      prev.map(col => (col.id === id ? { ...col, headerName: name } : col))
    );
  };

  // Đổi căn lề
  const handleAlignChange = (id: string, align: 'left' | 'center' | 'right') => {
    setCurrentCols(prev =>
      prev.map(col => (col.id === id ? { ...col, align } : col))
    );
  };

  // Đổi độ rộng
  const handleWidthChange = (id: string, widthWeight: number) => {
    setCurrentCols(prev =>
      prev.map(col => (col.id === id ? { ...col, widthWeight } : col))
    );
  };

  // Di chuyển lên
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    setCurrentCols(prev => {
      const next = [...prev];
      const temp = next[index - 1];
      next[index - 1] = next[index];
      next[index] = temp;
      return next;
    });
  };

  // Di chuyển xuống
  const handleMoveDown = (index: number) => {
    if (index >= currentCols.length - 1) return;
    setCurrentCols(prev => {
      const next = [...prev];
      const temp = next[index + 1];
      next[index + 1] = next[index];
      next[index] = temp;
      return next;
    });
  };

  // Xóa cột tùy biến
  const handleDeleteColumn = (id: string) => {
    setCurrentCols(prev => prev.filter(c => c.id !== id));
  };

  // Thêm cột mới
  const handleAddCustomColumn = () => {
    if (!newColName.trim()) {
      alert('Vui lòng nhập tên tiêu đề cột!');
      return;
    }

    const newId = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const fieldKey = newColSource === 'existing' ? selectedSourceKey : '';

    const newCol: ColumnDefinition = {
      id: newId,
      fieldKey: fieldKey,
      headerName: newColName.trim(),
      enabled: true,
      widthWeight: newColWidth,
      align: newColAlign,
      isCustom: true,
      defaultValue: '',
      targetSheets: [activeTab]
    };

    setCurrentCols(prev => [...prev, newCol]);
    setNewColName('');
  };

  // Khôi phục mặc định
  const handleResetDefaults = () => {
    if (confirm('Bạn có chắc muốn đặt lại cấu hình cột về mặc định ban đầu?')) {
      if (activeTab === 'attendance') {
        setAttendanceCols(DEFAULT_ATTENDANCE_COLUMNS);
      } else {
        setOverallCols(DEFAULT_OVERALL_COLUMNS);
      }
    }
  };

  // Lưu toàn bộ cấu hình
  const handleApply = () => {
    onSave({
      overallColumns: overallCols,
      attendanceColumns: attendanceCols,
    });
    onClose();
  };

  // Tính preview phân bổ fit A4
  const activeColumns = currentCols.filter(c => c.enabled);
  const previewFitWidths = calculateFitWidths(activeColumns, 100);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-600/30 border border-blue-500/40 text-blue-400">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-white">Cấu hình Cột Dữ liệu Xuất file & In ấn A4</h2>
              <p className="text-xs text-slate-400">
                Tùy biến cột, thêm cột mới, tự động co giãn vừa vặn 1 trang A4
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('attendance')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-t border-x cursor-pointer ${
              activeTab === 'attendance'
                ? 'bg-white text-blue-600 border-slate-200 -mb-px shadow-xs'
                : 'bg-transparent text-slate-600 border-transparent hover:text-slate-900'
            }`}
          >
            📋 File 2 & 3: Phiếu Thu Bài & Bản In A4 ({attendanceCols.filter(c => c.enabled).length} cột)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('overall')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-t border-x cursor-pointer ${
              activeTab === 'overall'
                ? 'bg-white text-blue-600 border-slate-200 -mb-px shadow-xs'
                : 'bg-transparent text-slate-600 border-transparent hover:text-slate-900'
            }`}
          >
            📊 File 1: Danh Sách Chia Phòng Tổng Thể ({overallCols.filter(c => c.enabled).length} cột)
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* Fit A4 Badge Notification */}
          <div className="bg-blue-50 border border-blue-200 text-blue-900 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
              <div>
                <span className="font-bold">Cơ chế Tự động Co giãn A4:</span> Hệ thống tự tính toán tỷ lệ độ rộng để toàn bộ {activeColumns.length} cột vừa khít đúng 1 khổ giấy in, không bị tràn hay rớt dòng.
              </div>
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg font-bold shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Khổ in: {activeColumns.length > 9 ? 'A4 Ngang (Landscape)' : 'A4 Dọc (Portrait)'}
            </div>
          </div>

          {/* Form Thêm cột mới */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-emerald-600" />
              Thêm cột mới vào danh sách xuất:
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
              <div className="sm:col-span-1.5">
                <input
                  type="text"
                  placeholder="Tên tiêu đề cột (VD: Chữ ký Giám thị 1)"
                  value={newColName}
                  onChange={e => setNewColName(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <select
                  value={newColSource}
                  onChange={e => setNewColSource(e.target.value as any)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="empty">Cột trống (để ký / ghi tay)</option>
                  {availableFileKeys.length > 0 && (
                    <option value="existing">Lấy từ dữ liệu file gốc</option>
                  )}
                </select>
              </div>

              {newColSource === 'existing' && (
                <div>
                  <select
                    value={selectedSourceKey}
                    onChange={e => setSelectedSourceKey(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {availableFileKeys.map(k => (
                      <option key={k} value={k}>{k}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex gap-2">
                <select
                  value={newColAlign}
                  onChange={e => setNewColAlign(e.target.value as any)}
                  className="w-1/2 bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="center">Căn giữa</option>
                  <option value="left">Căn trái</option>
                  <option value="right">Căn phải</option>
                </select>

                <button
                  type="button"
                  onClick={handleAddCustomColumn}
                  className="w-1/2 flex items-center justify-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-1.5 px-3 rounded-lg transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Thêm cột
                </button>
              </div>
            </div>
          </div>

          {/* Danh sách các cột */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-700">
              <div className="flex items-center gap-2">
                <span>Hiện/Ẩn</span>
                <span>Thứ tự & Tên tiêu đề</span>
              </div>
              <div className="flex items-center gap-6">
                <span>Độ rộng</span>
                <span>Căn lề</span>
                <span>Thao tác</span>
              </div>
            </div>

            <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
              {currentCols.map((col, idx) => (
                <div
                  key={col.id}
                  className={`px-4 py-2.5 flex items-center justify-between gap-3 text-xs transition-colors ${
                    col.enabled ? 'bg-white' : 'bg-slate-50/60 opacity-60'
                  }`}
                >
                  {/* Left: Checkbox + Move buttons + Header input */}
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <input
                      type="checkbox"
                      checked={col.enabled}
                      onChange={() => handleToggleColumn(col.id)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />

                    <div className="flex flex-col gap-0.5 shrink-0">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMoveUp(idx)}
                        className="p-0.5 text-slate-400 hover:text-slate-800 disabled:opacity-20 cursor-pointer"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === currentCols.length - 1}
                        onClick={() => handleMoveDown(idx)}
                        className="p-0.5 text-slate-400 hover:text-slate-800 disabled:opacity-20 cursor-pointer"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                    </div>

                    <span className="text-slate-400 font-mono text-[11px] w-5 text-center">
                      {idx + 1}.
                    </span>

                    <input
                      type="text"
                      value={col.headerName}
                      disabled={!col.enabled}
                      onChange={e => handleHeaderNameChange(col.id, e.target.value)}
                      className="border border-slate-300 rounded px-2.5 py-1 text-xs font-semibold text-slate-800 max-w-xs focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-slate-100"
                    />

                    {col.isCustom ? (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-medium">
                        Cột tự tạo
                      </span>
                    ) : (
                      <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-mono">
                        Key: {col.fieldKey || 'trống'}
                      </span>
                    )}
                  </div>

                  {/* Right: Width weight + Alignment + Delete */}
                  <div className="flex items-center gap-3 shrink-0">
                    <select
                      value={col.widthWeight}
                      disabled={!col.enabled}
                      onChange={e => handleWidthChange(col.id, Number(e.target.value))}
                      className="border border-slate-300 rounded px-2 py-1 text-xs bg-white focus:outline-none disabled:bg-slate-100"
                    >
                      <option value={1}>Hẹp (1x)</option>
                      <option value={1.5}>Vừa (1.5x)</option>
                      <option value={2}>Chuẩn (2x)</option>
                      <option value={3}>Rộng (3x)</option>
                      <option value={4}>Rất rộng (4x)</option>
                    </select>

                    <select
                      value={col.align}
                      disabled={!col.enabled}
                      onChange={e => handleAlignChange(col.id, e.target.value as any)}
                      className="border border-slate-300 rounded px-2 py-1 text-xs bg-white focus:outline-none disabled:bg-slate-100"
                    >
                      <option value="center">Giữa</option>
                      <option value="left">Trái</option>
                      <option value="right">Phải</option>
                    </select>

                    {col.isCustom ? (
                      <button
                        type="button"
                        onClick={() => handleDeleteColumn(col.id)}
                        className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors cursor-pointer"
                        title="Xóa cột này"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <div className="w-5.5"></div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mini Layout Preview */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-blue-600" />
              Mô phỏng tỷ lệ chiều rộng cột trên 1 trang A4 (Tổng = 100%):
            </div>
            <div className="w-full flex rounded-lg overflow-hidden border border-slate-300 h-8 text-[11px] font-bold">
              {previewFitWidths.map(({ col, percent }, i) => (
                <div
                  key={col.id}
                  style={{ width: `${percent}%` }}
                  className={`flex items-center justify-center px-1 truncate border-r last:border-r-0 border-slate-300 text-slate-700 ${
                    i % 2 === 0 ? 'bg-blue-100/80' : 'bg-slate-100'
                  }`}
                  title={`${col.headerName}: ${percent}%`}
                >
                  {col.headerName} ({percent}%)
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 font-medium px-3 py-2 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Khôi phục mặc định
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Check className="w-4 h-4" />
              Áp dụng & Lưu cấu hình
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
