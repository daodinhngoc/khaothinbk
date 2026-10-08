import React, { useState } from 'react';
import { CandidateAssigned, ColumnDefinition, ExamConfig } from '../types';
import { calculateFitWidths, DEFAULT_ATTENDANCE_COLUMNS } from '../utils/columnDefaults';
import { getRoomCode, getRoomDisplayLabel } from '../utils/optimizer';
import { getCompulsoryCandidateAssignments, sortCandidatesInRoomForShift } from '../utils/excelExport';
import { ChevronLeft, ChevronRight, FileText, Printer, X, CheckSquare, Square } from 'lucide-react';

interface PrintA4PreviewProps {
  candidates: CandidateAssigned[];
  totalRooms: number;
  config: ExamConfig;
  columns?: ColumnDefinition[];
  onClose: () => void;
}

export const PrintA4Preview: React.FC<PrintA4PreviewProps> = ({
  candidates,
  totalRooms,
  config,
  columns,
  onClose
}) => {
  const [currentRoom, setCurrentRoom] = useState<number>(1);
  const [shift, setShift] = useState<'CA 1' | 'CA 2' | 'Toán' | 'Ngữ văn'>('CA 1');
  const [printAllRooms, setPrintAllRooms] = useState<boolean>(false);

  const isCompulsory = shift === 'Toán' || shift === 'Ngữ văn';
  const model = config.roomAssignmentModel || 'moet_fixed';
  const { assignedCandidates: compAssigned, totalRooms: compRooms } = getCompulsoryCandidateAssignments(
    candidates,
    config.maxPerRoom || 24,
    model
  );

  const effectiveTotalRooms = (isCompulsory && model === 'two_phase_split') ? compRooms : totalRooms;
  const effectiveCandidates = (isCompulsory && model === 'two_phase_split') ? compAssigned : candidates;

  const subjectKey = shift === 'CA 1' ? 'TC1' : 'TC2';

  // Danh sách các cột được kích hoạt
  const activeCols = (columns && columns.length > 0 ? columns : DEFAULT_ATTENDANCE_COLUMNS).filter(
    c => c.enabled !== false
  );

  // Tính toán % độ rộng cho từng cột để bảng luôn fit 100% chiều rộng trang A4
  const fitCols = calculateFitWidths(activeCols, 100);

  // Font size responsive theo số lượng cột
  const tableFontSize = activeCols.length > 10 ? 'text-[9.5px]' : activeCols.length > 8 ? 'text-[10px]' : 'text-[11px]';
  const tableCellPadding = activeCols.length > 10 ? 'py-0.5 px-0.5' : 'py-1 px-1';

  const handlePrint = () => {
    window.print();
  };

  // Các phòng cần render (Tất cả các phòng hoặc chỉ phòng đang chọn)
  const roomsToRender = printAllRooms
    ? Array.from({ length: effectiveTotalRooms }, (_, i) => i + 1)
    : [currentRoom];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:m-0 print:bg-white print:static print:inset-auto">
      <div className="bg-slate-100 rounded-2xl w-full max-w-5xl max-h-[96vh] flex flex-col shadow-2xl border border-slate-300 overflow-hidden print:border-none print:shadow-none print:max-h-none print:w-full print:rounded-none">
        
        {/* Top Action Bar - Ẩn khi in */}
        <div className="print:hidden bg-slate-800 text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-400" />
            <div>
              <h2 className="font-bold text-sm sm:text-base leading-tight">
                Biểu mẫu A4: Danh sách dán phòng & Phiếu thu bài thi
              </h2>
              <p className="text-[11px] text-slate-400">
                {printAllRooms ? `Đang bật in TẤT CẢ ${effectiveTotalRooms} phòng (1 lượt)` : `Đang xem Phòng ${currentRoom}/${effectiveTotalRooms}`}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Shift / Subject selector */}
            <div className="flex flex-wrap bg-slate-700 p-0.5 rounded-lg text-xs font-semibold gap-0.5">
              <button
                type="button"
                onClick={() => { setShift('Ngữ văn'); setCurrentRoom(1); }}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  shift === 'Ngữ văn' ? 'bg-rose-600 text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                Ngữ văn (M1)
              </button>
              <button
                type="button"
                onClick={() => { setShift('Toán'); setCurrentRoom(1); }}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  shift === 'Toán' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                Toán (M2)
              </button>
              <button
                type="button"
                onClick={() => { setShift('CA 1'); setCurrentRoom(1); }}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  shift === 'CA 1' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                Ca 1 (TC1)
              </button>
              <button
                type="button"
                onClick={() => { setShift('CA 2'); setCurrentRoom(1); }}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  shift === 'CA 2' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                Ca 2 (TC2)
              </button>
            </div>

            {/* Checkbox / Nút chuyển chế độ In tất cả phòng */}
            <button
              type="button"
              onClick={() => setPrintAllRooms(!printAllRooms)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                printAllRooms
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'bg-slate-700 border-slate-600 text-slate-300 hover:text-white'
              }`}
            >
              {printAllRooms ? <CheckSquare className="w-3.5 h-3.5 text-white" /> : <Square className="w-3.5 h-3.5" />}
              <span>In cả {effectiveTotalRooms} phòng (1 lượt)</span>
            </button>

            {/* Room Stepper (nếu không in tất cả) */}
            {!printAllRooms && (
              <div className="flex items-center gap-1 bg-slate-700 px-2 py-1 rounded-lg text-xs">
                <button
                  disabled={currentRoom <= 1}
                  onClick={() => setCurrentRoom(p => Math.max(1, p - 1))}
                  className="hover:text-blue-300 disabled:opacity-30 cursor-pointer"
                  title="Phòng trước"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-mono font-bold px-1">
                  {getRoomDisplayLabel(currentRoom, config.startRoomCode)} ({currentRoom}/{effectiveTotalRooms})
                </span>
                <button
                  disabled={currentRoom >= effectiveTotalRooms}
                  onClick={() => setCurrentRoom(p => Math.min(effectiveTotalRooms, p + 1))}
                  className="hover:text-blue-300 disabled:opacity-30 cursor-pointer"
                  title="Phòng tiếp theo"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{printAllRooms ? `In cả ${effectiveTotalRooms} phòng` : `In Phòng ${currentRoom}`}</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Đóng xem trước"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Paper Container - Simulating standard A4 page (Mỗi phòng 1 sheet ngắt trang chuẩn) */}
        <div className="p-4 sm:p-8 overflow-y-auto flex-1 flex flex-col items-center gap-8 bg-slate-200/70 print:bg-white print:p-0 print:m-0 print:gap-0">
          {roomsToRender.map((rNo) => {
            const rCandidates = sortCandidatesInRoomForShift(
              effectiveCandidates.filter((c: CandidateAssigned) => c['Phòng thi'] === rNo),
              isCompulsory ? 'M1' : subjectKey,
              config.sortSbdAscendingInRoom ?? true
            );
            const uniqueSubjsList = isCompulsory
              ? [shift]
              : Array.from(new Set(rCandidates.map((c: CandidateAssigned) => c[subjectKey]))).filter(Boolean);
            const isMultiSubjectRoom = uniqueSubjsList.length > 1;
            const subjectsInR = isCompulsory
              ? shift
              : uniqueSubjsList.join(', ');

            return (
              <div
                key={rNo}
                className="page-break-after-always print-page-break w-full max-w-[210mm] min-h-[297mm] bg-white text-black p-8 sm:p-12 shadow-xl border border-slate-300 font-serif text-[12.5px] leading-snug flex flex-col justify-between print:shadow-none print:border-0 print:m-0 print:p-0 print:max-w-none"
                style={{ fontFamily: '"Times New Roman", Times, serif' }}
              >
                <div>
                  {/* Header Top */}
                  <div className="grid grid-cols-2 gap-4 pb-4">
                    <div className="text-center space-y-0.5">
                      {config.deptName && (
                        <div className="font-bold text-xs uppercase tracking-wide">{config.deptName}</div>
                      )}
                      {config.schoolName && (
                        <div className="font-bold text-xs uppercase underline tracking-wide">{config.schoolName}</div>
                      )}
                    </div>
                    <div className="text-center space-y-0.5">
                      {(config.countryTitle ?? 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM') && (
                        <div className="font-bold text-xs uppercase">
                          {config.countryTitle ?? 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM'}
                        </div>
                      )}
                      {(config.mottoTitle ?? 'Độc lập - Tự do - Hạnh phúc') && (
                        <div className="font-bold text-xs underline">
                          {config.mottoTitle ?? 'Độc lập - Tự do - Hạnh phúc'}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Title Section */}
                  <div className="text-center my-4 space-y-1">
                    <h1 className="text-lg font-bold uppercase tracking-wide">
                      DANH SÁCH THÍ SINH DÁN PHÒNG & PHIẾU THU BÀI THI
                    </h1>
                    <div className="font-bold text-xs uppercase">
                      KỲ THI: {config.examCategory} ({config.subPeriod}) - {isCompulsory ? `MÔN BẮT BUỘC: ${shift.toUpperCase()}` : shift} ({config.schoolYear})
                    </div>
                    <div className="font-bold text-xs">
                      Điểm thi: {config.examCenterCode} &nbsp;&nbsp;|&nbsp;&nbsp; Phòng thi số: {getRoomCode(rNo, config.startRoomCode)} &nbsp;&nbsp;|&nbsp;&nbsp; Môn thi: {subjectsInR || 'Theo tổ hợp'}
                    </div>
                  </div>

                  {/* Candidate Table */}
                  <div className="mt-4 border-t border-l border-black">
                    <table className={`w-full border-collapse text-center table-fixed ${tableFontSize}`}>
                      <thead>
                        <tr className="bg-slate-100 font-bold">
                          {fitCols.map(({ col, percent }) => (
                            <th
                              key={col.id}
                              style={{ width: `${percent}%` }}
                              className={`border-r border-b border-black ${tableCellPadding} ${
                                col.align === 'left' ? 'text-left' : col.align === 'right' ? 'text-right' : 'text-center'
                              } truncate`}
                              title={col.headerName}
                            >
                              {col.headerName}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rCandidates.map((cand: CandidateAssigned, candIdx: number) => (
                          <tr key={cand.SBD || candIdx} className="h-6.5">
                            {fitCols.map(({ col }) => {
                              let val: React.ReactNode = '';

                              if (col.id === 'att_stt' || col.fieldKey === 'STT_Phong') {
                                val = candIdx + 1;
                              } else if (col.id === 'att_sbd' || col.fieldKey === 'SBD') {
                                val = <span className="font-mono font-bold">{cand.SBD}</span>;
                              } else if (col.id === 'att_hoten' || col.fieldKey === 'Họ tên') {
                                val = <span className="font-medium truncate block">{cand['Họ tên']}</span>;
                              } else if (col.id === 'att_ngaysinh' || col.fieldKey === 'Ngày sinh') {
                                val = cand['Ngày sinh'];
                              } else if (col.id === 'att_lop' || col.fieldKey === 'Lớp') {
                                val = cand.Lớp;
                              } else if (col.id === 'att_made' || col.headerName.toLowerCase().includes('mã đề')) {
                                val = '';
                              } else if (col.id === 'att_kynop' || col.headerName.toLowerCase().includes('ký nộp')) {
                                val = '';
                              } else if (col.id === 'att_ghichu' || col.headerName.toLowerCase().includes('ghi chú')) {
                                const rawNote = col.fieldKey && cand[col.fieldKey] ? String(cand[col.fieldKey]).trim() : '';
                                const isStaleSubjectNote = rawNote && (
                                  rawNote.toLowerCase().includes('vật lí') ||
                                  rawNote.toLowerCase().includes('vật lý') ||
                                  rawNote.toLowerCase().includes('hóa học') ||
                                  rawNote.toLowerCase().includes('sinh học') ||
                                  rawNote.toLowerCase().includes('lịch sử') ||
                                  rawNote.toLowerCase().includes('địa lí') ||
                                  rawNote.toLowerCase().includes('địa lý') ||
                                  rawNote.toLowerCase().includes('gdkt') ||
                                  rawNote.toLowerCase().includes('tin học') ||
                                  rawNote.toLowerCase().includes('công nghệ') ||
                                  rawNote.toLowerCase().startsWith('môn:')
                                );
                                const cleanAdminNote = isStaleSubjectNote ? '' : rawNote;

                                if (isCompulsory) {
                                  // Môn Bắt buộc (Toán, Ngữ văn): để trống hoàn toàn (tiêu đề đã có tên môn)
                                  val = cleanAdminNote;
                                } else {
                                  // Môn tự chọn (CA 1 / CA 2): Thống nhất 100% tất cả các phòng đều ghi Môn: [TC1/TC2]
                                  const currentSubj = cand[subjectKey] || '';
                                  val = currentSubj ? `Môn: ${currentSubj}` : '';
                                  if (cleanAdminNote) {
                                    val = val ? `${val} (${cleanAdminNote})` : cleanAdminNote;
                                  }
                                }
                              } else if (col.fieldKey && cand[col.fieldKey] !== undefined) {
                                if (col.fieldKey === 'TC1' || col.fieldKey === 'TC2' || col.id === 'TC1' || col.id === 'TC2') {
                                  val = cand[subjectKey] || '';
                                } else {
                                  val = cand[col.fieldKey];
                                }
                              } else if (col.defaultValue !== undefined) {
                                val = col.defaultValue;
                              }

                              return (
                                <td
                                  key={col.id}
                                  className={`border-r border-b border-black ${tableCellPadding} ${
                                    col.align === 'left' ? 'text-left' : col.align === 'right' ? 'text-right' : 'text-center'
                                  } truncate`}
                                >
                                  {val}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Footer Section */}
                <div className="pt-5 space-y-2 text-xs">
                  <div className="font-bold">
                    - Tổng số thí sinh theo danh sách phòng thi: {String(rCandidates.length).padStart(2, '0')} thí sinh.
                  </div>
                  <div className="font-bold">
                    - Số thí sinh có mặt: .......... | Số thí sinh vắng: .......... (Số báo danh vắng: .......................................)
                  </div>
                  <div className="italic text-[11px]">
                    * Lưu ý: Giám thị kiểm tra kỹ SBD, số tờ giấy thi và yêu cầu thí sinh ký nộp bài đầy đủ trước khi rời phòng thi.
                  </div>

                  {/* Signatures */}
                  <div className="pt-2">
                    {(() => {
                      const dateStr = config.dateLine !== undefined
                        ? config.dateLine.trim()
                        : (config.locationName && config.locationName.trim()
                            ? `${config.locationName.trim()}, ngày ..... tháng ..... năm 20.....`
                            : 'Ngày ..... tháng ..... năm 20.....');
                      return dateStr ? (
                        <div className="text-right italic pr-8 mb-2">
                          {dateStr}
                        </div>
                      ) : null;
                    })()}

                    <div className="grid grid-cols-2 text-center pt-1">
                      <div>
                        {config.supervisor1Title && config.supervisor1Title.trim() ? (
                          <>
                            <div className="font-bold uppercase">{config.supervisor1Title.trim()}</div>
                            <div className="italic text-[11px] mt-0.5">(Ký và ghi rõ họ tên)</div>
                            <div className="h-14"></div>
                          </>
                        ) : null}
                      </div>
                      <div>
                        {config.supervisor2Title && config.supervisor2Title.trim() ? (
                          <>
                            <div className="font-bold uppercase">{config.supervisor2Title.trim()}</div>
                            <div className="italic text-[11px] mt-0.5">(Ký và ghi rõ họ tên)</div>
                            <div className="h-14"></div>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
