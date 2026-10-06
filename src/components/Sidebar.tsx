import React, { useRef, useState } from 'react';
import { Upload, Play, Sparkles, FileSpreadsheet, Settings2, CheckCircle2, AlertCircle, Download, SlidersHorizontal, FileDown } from 'lucide-react';
import * as XLSX from 'xlsx';
import { CandidateInput, ExamCategory, ExamConfig, PeriodicPeriod, SurveyPeriod } from '../types';
import { downloadSampleTemplateExcel } from '../utils/templateExport';
import { cleanGroupString } from '../utils/subjectHelper';

interface SidebarProps {
  config: ExamConfig;
  onChangeConfig: (newConfig: Partial<ExamConfig>) => void;
  onLoadSampleData: () => void;
  onUploadData: (data: CandidateInput[], filename: string, originalKeys?: string[]) => void;
  onExecuteAllocation: () => void;
  onOpenColumnConfig?: () => void;
  candidatesCount: number;
  isProcessing: boolean;
  uploadedFileName: string | null;
}

export const Sidebar: React.FC<SidebarProps> = ({
  config,
  onChangeConfig,
  onLoadSampleData,
  onUploadData,
  onExecuteAllocation,
  onOpenColumnConfig,
  candidatesCount,
  isProcessing,
  uploadedFileName,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);

  const handleDownloadTemplate = async () => {
    try {
      setIsDownloadingTemplate(true);
      await downloadSampleTemplateExcel(config.examCategory);
    } catch (err: any) {
      alert('Lỗi tải file mẫu: ' + (err?.message || 'Không thể tạo file'));
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  const handleCategoryChange = (cat: ExamCategory) => {
    if (cat.includes('Kiểm tra')) {
      onChangeConfig({ examCategory: 'Kiểm tra định kỳ', subPeriod: 'Giữa kỳ 1' });
    } else {
      onChangeConfig({ examCategory: 'Thi thử / Khảo sát', subPeriod: 'Lần 1' });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawJson: any[] = XLSX.utils.sheet_to_json(ws);

        if (!rawJson || rawJson.length === 0) {
          alert('File Excel không có dữ liệu!');
          return;
        }

        // Lấy tất cả tên cột gốc trong file
        const originalKeys = Object.keys(rawJson[0] || {});
        const hasColM1 = originalKeys.some(k => k.toLowerCase() === 'm1' || k.toLowerCase() === 'môn bắt buộc 1');
        const hasColM2 = originalKeys.some(k => k.toLowerCase() === 'm2' || k.toLowerCase() === 'môn bắt buộc 2');

        // Map and validate columns, nhận diện linh hoạt cột Nhóm / Tổ hợp
        const mappedData: CandidateInput[] = rawJson.map((row, idx) => {
          let detectedGroup = String(
            row.Nhóm || row.nhóm || row.Nhom || row.nhom ||
            row['Tổ hợp'] || row['tổ hợp'] || row['TỔ HỢP'] ||
            row.ToHop || row.tohop || row.TOHOP ||
            row['Tổ hợp môn'] || row['Nhóm môn'] || row['Mã nhóm'] || row['Tên nhóm'] ||
            row['Môn lựa chọn'] || row['Môn tự chọn'] || row.Ban || row.ban || ''
          ).trim();

          // Nếu chưa có mà file có các cột môn tự chọn riêng lẻ
          if (!detectedGroup) {
            const electives = [
              row.TC1 || row.tc1 || row['Môn 1'] || row['Môn tự chọn 1'],
              row.TC2 || row.tc2 || row['Môn 2'] || row['Môn tự chọn 2'],
              row.TC3 || row.tc3 || row['Môn 3'] || row['Môn tự chọn 3'],
              row.TC4 || row.tc4 || row['Môn 4'] || row['Môn tự chọn 4'],
            ].filter(Boolean);
            if (electives.length >= 2) {
              detectedGroup = electives.join('-');
            }
          }

          const cleanedGroup = cleanGroupString(detectedGroup);

          // Xử lý linh hoạt môn bắt buộc cho cả thí sinh chính quy và thí sinh tự do:
          // Nếu file có cột M1/M2 nhưng ô để trống -> Thí sinh tự do không thi môn đó
          let finalM1 = '';
          const rawM1 = row.M1 !== undefined ? row.M1 : row.m1;
          if (rawM1 !== undefined && rawM1 !== null && String(rawM1).trim() !== '') {
            finalM1 = String(rawM1).trim();
          } else if (!hasColM1) {
            finalM1 = 'Ngữ văn'; // Môn bắt buộc mặc định nếu file không có cột M1
          }

          let finalM2 = '';
          const rawM2 = row.M2 !== undefined ? row.M2 : row.m2;
          if (rawM2 !== undefined && rawM2 !== null && String(rawM2).trim() !== '') {
            finalM2 = String(rawM2).trim();
          } else if (!hasColM2) {
            finalM2 = 'Toán'; // Môn bắt buộc mặc định nếu file không có cột M2
          }

          return {
            ...row,
            TT: Number(row.TT || row.tt || row.STT || row.stt || idx + 1),
            SBD: String(row.SBD || row.sbd || row['Số báo danh'] || ''),
            CCD: String(row.CCD || row.ccd || row.CCCD || row.cccd || ''),
            Lớp: String(row.Lớp || row.lớp || row.Lop || row.lop || '12'),
            'Họ tên': String(row['Họ tên'] || row['Họ và tên'] || row.HoTen || row.hoten || `Thí sinh ${idx + 1}`),
            'Ngày sinh': String(row['Ngày sinh'] || row.NgaySinh || row.ngaysinh || '01/01/2008'),
            Nhóm: cleanedGroup,
            M1: finalM1,
            M2: finalM2,
            TC1: String(row.TC1 !== undefined && row.TC1 !== null ? row.TC1 : (row.tc1 || '')).trim(),
            TC2: String(row.TC2 !== undefined && row.TC2 !== null ? row.TC2 : (row.tc2 || '')).trim(),
          };
        });

        onUploadData(mappedData, file.name, originalKeys);
      } catch (err: any) {
        alert('Lỗi khi đọc file Excel: ' + (err?.message || 'Định dạng không hợp lệ'));
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <aside id="streamlit-sidebar" className="w-80 sm:w-88 bg-slate-900 text-slate-100 flex flex-col border-r border-slate-800 shrink-0 h-screen sticky top-0 overflow-y-auto">
      {/* Header Brand */}
      <div className="p-5 border-b border-slate-800 bg-slate-950/40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/20">
            🏛️
          </div>
          <div>
            <h1 className="font-bold text-base tracking-tight text-white leading-tight">
              Quản lý Phòng thi
            </h1>
            <p className="text-xs text-slate-400">Xếp phòng & Biểu mẫu A4</p>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-6 flex-1 text-sm">
        {/* BƯỚC 1: CHỌN LOẠI KỲ THI TRƯỚC */}
        <div className="space-y-3 bg-blue-950/20 border border-blue-900/40 p-3.5 rounded-xl">
          <label className="text-xs font-bold uppercase tracking-wider text-blue-300 flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[11px]">1</span>
            Chọn Loại kỳ thi
          </label>

          {/* Selectbox Loại kỳ thi */}
          <div className="space-y-1.5">
            <select
              id="select-exam-category"
              value={config.examCategory.includes('Kiểm tra') ? 'Kiểm tra định kỳ' : 'Thi thử / Khảo sát'}
              onChange={(e) => handleCategoryChange(e.target.value as ExamCategory)}
              className="w-full bg-slate-800 border border-blue-500/50 text-slate-100 font-semibold rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="Kiểm tra định kỳ">Kiểm tra định kỳ (Theo nhóm)</option>
              <option value="Thi thử / Khảo sát">Thi thử / Khảo sát (Tối ưu cặp môn)</option>
            </select>
          </div>

          {/* Selectbox phụ theo Loại kỳ thi */}
          {config.examCategory.includes('Kiểm tra') ? (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Giai đoạn:</span>
                <span className="text-emerald-400 font-medium">Chia phòng theo Nhóm (Văn, Toán, Sử, Anh + Tự chọn)</span>
              </div>
              <select
                id="select-sub-period"
                value={config.subPeriod}
                onChange={(e) => onChangeConfig({ subPeriod: e.target.value as PeriodicPeriod })}
                className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="Giữa kỳ 1">Giữa kỳ 1</option>
                <option value="Cuối kỳ 1">Cuối kỳ 1</option>
                <option value="Giữa kỳ 2">Giữa kỳ 2</option>
                <option value="Cuối kỳ 2">Cuối kỳ 2</option>
              </select>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Đợt khảo sát:</span>
                <span className="text-blue-400 font-medium">Tối ưu ghép ca TC1 & TC2</span>
              </div>
              <select
                id="select-sub-survey"
                value={config.subPeriod}
                onChange={(e) => onChangeConfig({ subPeriod: e.target.value as SurveyPeriod })}
                className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="Lần 1">Lần 1</option>
                <option value="Lần 2">Lần 2</option>
                <option value="Lần 3">Lần 3</option>
              </select>
            </div>
          )}
        </div>

        {/* BƯỚC 2: TẢI FILE MẪU HOẶC UPLOAD DỮ LIỆU */}
        <div className="space-y-2.5">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-slate-700 text-white flex items-center justify-center text-[11px]">2</span>
            Tải mẫu & Nhập dữ liệu
          </label>

          {/* Tải file mẫu chuẩn theo loại kỳ thi đã chọn */}
          <div className="flex gap-2">
            <button
              id="btn-download-template"
              type="button"
              disabled={isDownloadingTemplate}
              onClick={handleDownloadTemplate}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 text-xs font-semibold rounded-lg bg-emerald-950/70 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/60 transition-colors cursor-pointer"
              title={`Tải file mẫu Excel chuẩn cho: ${config.examCategory}`}
            >
              <FileDown className="w-4 h-4 text-emerald-400 shrink-0" />
              {isDownloadingTemplate ? 'Đang tạo mẫu...' : 'Tải file mẫu (.xlsx)'}
            </button>

            {onOpenColumnConfig && (
              <button
                id="btn-open-col-config-sidebar"
                type="button"
                onClick={onOpenColumnConfig}
                className="flex items-center justify-center gap-1.5 py-2 px-2.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
                title="Cấu hình các cột hiển thị và xuất file"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-blue-400" />
                Cấu hình cột
              </button>
            )}
          </div>
          
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".xlsx, .xls, .csv"
            className="hidden"
          />

          <button
            id="btn-upload-file"
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-700 hover:border-blue-500/80 bg-slate-800/50 hover:bg-slate-800 transition-all rounded-xl p-4 text-center cursor-pointer group"
          >
            <Upload className="w-6 h-6 text-slate-400 group-hover:text-blue-400 transition-colors" />
            <div className="text-xs">
              <span className="font-semibold text-blue-400 group-hover:underline">Chọn file Excel tải lên</span>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {config.examCategory.includes('Kiểm tra')
                  ? 'Gồm: TT, CCCD, Lớp, Họ tên, Ngày sinh, Nhóm (VD: Địa-GDKPTL-CNCN-Tin)'
                  : 'Gồm: TT, CCCD, Lớp, Họ tên, Ngày sinh, M1, M2, TC1, TC2'}
              </div>
            </div>
          </button>

          {uploadedFileName && (
            <div className="flex items-center gap-2 text-xs bg-emerald-950/40 text-emerald-300 border border-emerald-800/60 rounded-lg p-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <div className="truncate font-medium flex-1">{uploadedFileName}</div>
              <span className="text-[10px] bg-emerald-900/60 px-1.5 py-0.5 rounded text-emerald-200">
                {candidatesCount} HS
              </span>
            </div>
          )}

          {/* Dữ liệu mẫu kiểm thử */}
          <button
            id="btn-load-sample"
            type="button"
            onClick={onLoadSampleData}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Nạp dữ liệu mẫu ({config.examCategory.includes('Kiểm tra') ? 'Theo nhóm' : 'Theo cặp môn TC'})
          </button>
        </div>

        {/* BƯỚC 3: CẤU HÌNH PHÒNG THI VÀ SỐ BÁO DANH */}
        <div className="space-y-4 pt-2 border-t border-slate-800/80">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-slate-700 text-white flex items-center justify-center text-[11px]">3</span>
            Cấu hình SBD & Phòng thi
          </label>

          {/* Số báo danh mẫu đầu tiên */}
          <div className="space-y-1.5 bg-slate-950/40 p-3 rounded-lg border border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-300">
                SBD mẫu bắt đầu:
              </label>
              <span className="text-xs font-mono font-bold text-emerald-400">
                {config.startSbd || '52830001'}
              </span>
            </div>
            <input
              id="input-start-sbd"
              type="text"
              value={config.startSbd || '52830001'}
              onChange={(e) => onChangeConfig({ startSbd: e.target.value.trim() })}
              placeholder="VD: 52830001, 0680001, 240001..."
              className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-xs font-mono font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
            <div className="flex items-center gap-1.5 pt-1">
              <span className="text-[10px] text-slate-400">Gợi ý:</span>
              {(['52830001', '0680001', '240001', 'P001'] as const).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => onChangeConfig({ startSbd: preset })}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold transition-colors cursor-pointer ${
                    config.startSbd === preset
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 leading-tight">
              Tự động sắp xếp A-Z (Tên - Họ đệm) và đánh SBD tự động tăng dần.
            </p>
          </div>

          {/* Number input Số thí sinh tối đa / phòng */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-300">Số thí sinh tối đa / phòng:</label>
              <span className="text-xs font-bold text-blue-400">{config.maxPerRoom}</span>
            </div>
            <input
              id="input-max-per-room"
              type="number"
              min={10}
              max={50}
              value={config.maxPerRoom}
              onChange={(e) => onChangeConfig({ maxPerRoom: Math.max(10, Math.min(50, Number(e.target.value) || 24)) })}
              className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            <p className="text-[11px] text-slate-400">
              Quy chuẩn: 24 thí sinh/phòng.
            </p>
          </div>

          {/* Tùy chọn chia đều sĩ số các phòng trong nhóm (Dành cho Kiểm tra định kỳ) */}
          {config.examCategory.includes('Kiểm tra') ? (
            <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-800">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.balanceRoomsInGroup !== false}
                  onChange={(e) => onChangeConfig({ balanceRoomsInGroup: e.target.checked })}
                  className="mt-0.5 rounded bg-slate-800 border-slate-700 text-blue-500 focus:ring-blue-500"
                />
                <div className="text-xs">
                  <span className="font-semibold text-slate-200">Chia đều sĩ số trong nhóm</span>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                    Cân đối sĩ số giữa các phòng thi của cùng nhóm (VD: 50 HS chia 17-17-16 thay vì 24-24-2).
                  </p>
                </div>
              </label>
            </div>
          ) : (
            /* Thuật toán: Chuẩn Bộ GD&ĐT (Rolling-Fit 2.0) */
            <div className="bg-emerald-950/40 p-3 rounded-lg border border-emerald-700/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                  🏛️ Thuật toán Bộ GD&ĐT (Rolling-Fit 2.0)
                </span>
                <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.5 rounded font-mono font-bold">
                  Chuẩn Quốc gia
                </span>
              </div>
              <div className="text-[11px] text-slate-300 space-y-1 leading-relaxed">
                <p>
                  • <strong>1 SBD &amp; 1 Phòng thi cố định</strong> từ đầu đến cuối kỳ thi (cả 4 môn Toán, Văn, Ca 1, Ca 2).
                </p>
                <p>
                  • <strong>Gom nhóm theo tần suất tổ hợp môn</strong>: Ưu tiên xếp các tổ hợp có đông thí sinh nhất lên trước (A-Z trong từng cụm).
                </p>
                <p>
                  • <strong>Cắt phòng cuốn chiếu 24 HS/phòng</strong>: Tuyệt đại đa số phòng thi thuần 1 môn; các phòng giao thoa chia theo khối môn liền kề rõ ràng.
                </p>
              </div>
            </div>
          )}

          {/* LỰA CHỌN PHƯƠNG ÁN XẾP PHÒNG THI */}
          <div className="space-y-2 bg-slate-950/40 p-3 rounded-lg border border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200">
                Phương án phòng thi (Toán, Văn, Tự chọn):
              </label>
            </div>
            <div className="space-y-2">
              {/* Phương án 1 */}
              <label
                className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all ${
                  (!config.roomAssignmentModel || config.roomAssignmentModel === 'moet_fixed')
                    ? 'bg-emerald-950/60 border-emerald-500/80 text-emerald-100 ring-1 ring-emerald-500/50'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="roomAssignmentModel"
                  value="moet_fixed"
                  checked={!config.roomAssignmentModel || config.roomAssignmentModel === 'moet_fixed'}
                  onChange={() => onChangeConfig({ roomAssignmentModel: 'moet_fixed' })}
                  className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                />
                <div className="space-y-0.5 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-emerald-300">Phương án 1 (Chuẩn 100% Bộ GD&ĐT)</span>
                    <span className="text-[9px] bg-emerald-600 text-white font-bold px-1.5 py-0.2 rounded-full">
                      Kiến nghị
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-snug">
                    <strong>1 SBD &amp; 1 Phòng thi cố định</strong> cho toàn bộ kỳ thi. Thí sinh ngồi chung 1 phòng từ Ngữ văn, Toán đến Ca 1, Ca 2. Dán thẻ bàn 1 lần duy nhất.
                  </p>
                </div>
              </label>

              {/* Phương án 2 */}
              <label
                className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all ${
                  config.roomAssignmentModel === 'two_phase_split'
                    ? 'bg-blue-950/60 border-blue-500/80 text-blue-100 ring-1 ring-blue-500/50'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="roomAssignmentModel"
                  value="two_phase_split"
                  checked={config.roomAssignmentModel === 'two_phase_split'}
                  onChange={() => onChangeConfig({ roomAssignmentModel: 'two_phase_split' })}
                  className="mt-0.5 text-blue-600 focus:ring-blue-500"
                />
                <div className="space-y-0.5 text-xs">
                  <span className="font-bold text-slate-200">Phương án 2 (Tách 2 giai đoạn)</span>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    Ngữ văn &amp; Toán chia phòng tuần tự theo SBD A-Z toàn trường (P01..Pn); buổi Tự chọn thí sinh di chuyển sang phòng tổ hợp.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Cấu hình Số / Mã phòng bắt đầu (VD: 01, P01, A01...) */}
          <div className="space-y-1.5 bg-slate-950/40 p-3 rounded-lg border border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-300">
                Số / Mã phòng bắt đầu:
              </label>
              <span className="text-xs font-bold text-amber-400">{config.startRoomCode || '01'}</span>
            </div>
            <input
              id="input-start-room-code"
              type="text"
              value={config.startRoomCode || '01'}
              onChange={(e) => onChangeConfig({ startRoomCode: e.target.value })}
              placeholder="VD: 01, P01, A01, 1..."
              className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-xs font-mono font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
            <div className="flex items-center gap-1.5 pt-1">
              <span className="text-[10px] text-slate-400">Gợi ý:</span>
              {(['01', 'P01', 'A01', '1'] as const).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => onChangeConfig({ startRoomCode: preset })}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold transition-colors cursor-pointer ${
                    config.startRoomCode === preset
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Thông tin in ấn A4 (Header) */}
          <details className="text-xs bg-slate-950/30 border border-slate-800 rounded-lg p-3 space-y-2">
            <summary className="font-semibold text-slate-300 cursor-pointer hover:text-white flex items-center justify-between">
              <span>Thông tin in ấn A4 (Header)</span>
              <span className="text-[10px] text-slate-400">Tùy biến ▾</span>
            </summary>
            <div className="space-y-2 pt-2 text-[11px]">
              <p className="text-[10px] text-blue-400 leading-snug">
                * Nhập dữ liệu để hiển thị, để trống ô nào sẽ tự động ẩn ô đó trên bản in & Excel.
              </p>
              <div>
                <label className="text-slate-400 block mb-1">Tên Sở GD&ĐT (Cấp trên):</label>
                <input
                  type="text"
                  value={config.deptName ?? ''}
                  onChange={(e) => onChangeConfig({ deptName: e.target.value })}
                  placeholder="Để trống để ẩn"
                  className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded px-2 py-1"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Tên Trường / Hội đồng thi:</label>
                <input
                  type="text"
                  value={config.schoolName ?? ''}
                  onChange={(e) => onChangeConfig({ schoolName: e.target.value })}
                  placeholder="Để trống để ẩn"
                  className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded px-2 py-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">Quốc hiệu:</label>
                  <input
                    type="text"
                    value={config.countryTitle ?? 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM'}
                    onChange={(e) => onChangeConfig({ countryTitle: e.target.value })}
                    placeholder="Để trống để ẩn"
                    className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded px-2 py-1"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Tiêu ngữ:</label>
                  <input
                    type="text"
                    value={config.mottoTitle ?? 'Độc lập - Tự do - Hạnh phúc'}
                    onChange={(e) => onChangeConfig({ mottoTitle: e.target.value })}
                    placeholder="Để trống để ẩn"
                    className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded px-2 py-1"
                  />
                </div>
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Tiêu đề chính của biểu mẫu:</label>
                <input
                  type="text"
                  value={config.sheetTitle ?? 'DANH SÁCH THÍ SINH VÀ PHIẾU THU BÀI THI TỔNG HỢP CÁC MÔN'}
                  onChange={(e) => onChangeConfig({ sheetTitle: e.target.value })}
                  placeholder="DANH SÁCH THÍ SINH VÀ PHIẾU THU BÀI THI TỔNG HỢP CÁC MÔN"
                  className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded px-2 py-1 font-medium"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">Mã Điểm thi:</label>
                  <input
                    type="text"
                    value={config.examCenterCode}
                    onChange={(e) => onChangeConfig({ examCenterCode: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 text-slate-200 font-mono font-semibold rounded px-2 py-1"
                  />
                  <div className="flex gap-1 pt-1">
                    <button
                      type="button"
                      onClick={() => onChangeConfig({ examCenterCode: 'NBK-CH' })}
                      className="text-[9px] px-1.5 py-0.5 bg-blue-900/60 text-blue-300 hover:bg-blue-800 rounded font-mono"
                    >
                      NBK-CH
                    </button>
                    <button
                      type="button"
                      onClick={() => onChangeConfig({ examCenterCode: '5283' })}
                      className="text-[9px] px-1.5 py-0.5 bg-slate-800 text-slate-400 hover:bg-slate-700 rounded font-mono"
                    >
                      5283
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Năm học:</label>
                  <input
                    type="text"
                    value={config.schoolYear}
                    onChange={(e) => onChangeConfig({ schoolYear: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 text-slate-200 font-semibold rounded px-2 py-1"
                  />
                  <div className="flex gap-1 pt-1">
                    <button
                      type="button"
                      onClick={() => onChangeConfig({ schoolYear: '2026 - 2027' })}
                      className="text-[9px] px-1.5 py-0.5 bg-blue-900/60 text-blue-300 hover:bg-blue-800 rounded font-mono"
                    >
                      2026 - 2027
                    </button>
                    <button
                      type="button"
                      onClick={() => onChangeConfig({ schoolYear: '2025 - 2026' })}
                      className="text-[9px] px-1.5 py-0.5 bg-slate-800 text-slate-400 hover:bg-slate-700 rounded font-mono"
                    >
                      2025 - 2026
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </details>

          {/* Chân phiếu thu bài (Footer chữ ký & Ngày tháng) */}
          <details className="text-xs bg-slate-950/30 border border-slate-800 rounded-lg p-3 space-y-2">
            <summary className="font-semibold text-slate-300 cursor-pointer hover:text-white flex items-center justify-between">
              <span>Chân phiếu thu bài (Footer)</span>
              <span className="text-[10px] text-slate-400">Tùy biến ▾</span>
            </summary>
            <div className="space-y-2 pt-2 text-[11px]">
              <p className="text-[10px] text-blue-400 leading-snug">
                * Nhập dữ liệu để hiển thị; nếu để trống ô nào, hệ thống sẽ bỏ trống cả tiêu đề và phần ký, ghi rõ họ tên.
              </p>
              <div>
                <label className="text-slate-400 block mb-1">Giám thị 1 (Trái):</label>
                <input
                  type="text"
                  value={config.supervisor1Title ?? ''}
                  onChange={(e) => onChangeConfig({ supervisor1Title: e.target.value })}
                  placeholder="GIÁM THỊ 1 (Tùy biến hoặc để trống)"
                  className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded px-2 py-1"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Giám thị 2 (Giữa):</label>
                <input
                  type="text"
                  value={config.supervisor2Title ?? ''}
                  onChange={(e) => onChangeConfig({ supervisor2Title: e.target.value })}
                  placeholder="GIÁM THỊ 2 (Tùy biến hoặc để trống)"
                  className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded px-2 py-1"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Dòng Ngày tháng năm (Trước người ký):</label>
                <input
                  type="text"
                  value={config.dateLine ?? ''}
                  onChange={(e) => onChangeConfig({ dateLine: e.target.value })}
                  placeholder="VD: Ngày ..... tháng ..... năm 20..... hoặc Gia Lai, ngày..."
                  className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded px-2 py-1"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Người ký xác nhận (Phải):</label>
                <input
                  type="text"
                  value={config.leaderTitle ?? ''}
                  onChange={(e) => onChangeConfig({ leaderTitle: e.target.value })}
                  placeholder="TRƯỞNG ĐIỂM THI hoặc HIỆU TRƯỞNG (Để trống nếu không có)"
                  className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded px-2 py-1"
                />
              </div>
              <p className="text-[10px] text-slate-500 italic leading-relaxed">
                * Tất cả các ô tiêu đề được căn chính giữa ô, chuẩn khổ giấy A4 trên cả Excel và Xem in.
              </p>
            </div>
          </details>
        </div>

        {/* Action Button: Thực hiện Xếp Phòng */}
        <div className="pt-2 border-t border-slate-800/80">
          <button
            id="btn-execute-allocation"
            type="button"
            disabled={candidatesCount === 0 || isProcessing}
            onClick={onExecuteAllocation}
            className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-sm shadow-lg transition-all cursor-pointer ${
              candidatesCount === 0 || isProcessing
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-600/30 active:scale-[0.98]'
            }`}
          >
            <Play className={`w-4 h-4 fill-current ${isProcessing ? 'animate-spin' : ''}`} />
            {isProcessing ? 'Đang xếp phòng...' : 'Thực hiện Xếp Phòng'}
          </button>

          {candidatesCount === 0 && (
            <p className="text-[11px] text-amber-400/90 text-center mt-2 flex items-center justify-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              Vui lòng tải file hoặc chọn nạp dữ liệu mẫu.
            </p>
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800 text-[11px] text-slate-400 text-center">
        Thuật toán Pandas Groupby & Openpyxl A4
      </div>
    </aside>
  );
};
