import React, { useState } from 'react';
import { X, Printer, Users, Building, ShieldCheck, FileText, ShieldAlert } from 'lucide-react';
import { InvigilatorPlanResult, ExamSession, Invigilator } from '../../types/invigilator';
import { cleanSubjectName, formatSessionShortLabel } from '../../utils/invigilatorAlgorithm';
import { buildGeneralAnnouncementData } from '../../utils/generalAnnouncementHelper';

interface PrintInvigilatorPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: InvigilatorPlanResult;
  sessions: ExamSession[];
  invigilators?: Invigilator[];
  schoolName: string;
  examName?: string;
  academicYear?: string;
  customDutyOverrides?: Record<string, Record<string, boolean>>;
}

export const PrintInvigilatorPlanModal: React.FC<PrintInvigilatorPlanModalProps> = ({
  isOpen,
  onClose,
  plan,
  sessions,
  invigilators = [],
  schoolName,
  examName,
  academicYear,
  customDutyOverrides
}) => {
  const [printType, setPrintType] = useState<'general' | 'rooms' | 'council' | 'stats'>('general');
  const [selectedSessionId, setSelectedSessionId] = useState<string>('all');
  const [overrideSignatories, setOverrideSignatories] = useState<Record<string, { leaderId?: string; secretaryId?: string }>>({});
  const isSurveyMock = plan.mode === 'survey_mock';

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const effectiveExamName = examName || plan.examName || (isSurveyMock ? 'KỲ THI KHẢO SÁT / THI THỬ TỐT NGHIỆP THPT' : 'KỲ THI KIỂM TRA ĐỊNH KỲ');
  const effectiveAcademicYear = academicYear || plan.academicYear || 'NĂM HỌC 2025 - 2026';

  const generalData = buildGeneralAnnouncementData(
    plan,
    sessions,
    invigilators,
    schoolName,
    effectiveExamName,
    effectiveAcademicYear,
    customDutyOverrides
  );

  const sessionsToPrint = selectedSessionId === 'all'
    ? plan.sessions
    : plan.sessions.filter(s => s.sessionId === selectedSessionId);

  // Tìm thông tin Ban Lãnh đạo
  const president = invigilators.find(i => i.role === 'Chủ tịch') || invigilators.find(i => i.note?.toLowerCase().includes('hiệu trưởng'));
  const vicePresident = invigilators.find(i => i.role === 'Phó Chủ tịch') || invigilators.find(i => i.note?.toLowerCase().includes('phó hiệu trưởng'));
  const secretaries = invigilators.filter(i => i.role === 'Thư ký');
  const supervisors = invigilators.filter(i => i.role === 'Giám sát');
  const councilMembers = invigilators.filter(i => i.role && i.role !== 'Giám thị');

  // Hàm xác định chính xác Lãnh đạo & Thư ký trực ca theo từng buổi thi
  const getSessionSignatories = (sessionId: string) => {
    const shift = generalData.shifts.find(sh => sh.sessionIds.includes(sessionId));
    const shiftKey = shift?.shiftKey || '';

    // Danh sách Thư ký được phân công trực ca buổi này
    const shiftSecretaries = generalData.rows.filter(r =>
      r.groupType === 'leadership' &&
      (r.role.includes('Thư ký') || r.code.startsWith('TK') || r.note.toLowerCase().includes('thư ký')) &&
      Boolean(r.shiftDuties[shiftKey])
    );

    // Danh sách Lãnh đạo được phân công trực ca buổi này
    const shiftLeaders = generalData.rows.filter(r =>
      r.groupType === 'leadership' &&
      (r.role.includes('Chủ tịch') || r.role.includes('Phó Chủ tịch') || r.code.startsWith('BGH') || r.note.toLowerCase().includes('hiệu trưởng')) &&
      Boolean(r.shiftDuties[shiftKey])
    );

    // Thư ký trực ca được chọn
    const activeSecretary = (overrideSignatories[sessionId]?.secretaryId
      ? invigilators.find(i => i.id === overrideSignatories[sessionId].secretaryId)
      : undefined) ||
      shiftSecretaries[0] ||
      secretaries[0] ||
      invigilators.find(i => i.role === 'Thư ký');

    // Lãnh đạo trực ca được chọn
    const activeLeader = (overrideSignatories[sessionId]?.leaderId
      ? invigilators.find(i => i.id === overrideSignatories[sessionId].leaderId)
      : undefined) ||
      shiftLeaders[0] ||
      president ||
      vicePresident ||
      invigilators.find(i => i.role === 'Chủ tịch' || i.role === 'Phó Chủ tịch');

    const isVicePresident = (activeLeader?.role || '').includes('Phó Chủ tịch') ||
      (activeLeader?.note || '').toLowerCase().includes('phó hiệu trưởng') ||
      (activeLeader?.code || '').startsWith('BGH02');

    return {
      shift,
      shiftSecretaries,
      shiftLeaders,
      activeSecretary,
      activeLeader,
      isVicePresident
    };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[95vh] flex flex-col overflow-hidden text-slate-800">
        
        {/* Header - Screen only */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center border border-blue-400/30">
              <Printer className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">Xem & In Biểu Mẫu A4 Dán Bảng</h2>
              <p className="text-xs text-slate-300">Biểu mẫu chuẩn quy chế Bộ GD&ĐT - Căn lề và ngắt trang tự động</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Chọn loại văn bản in */}
            <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setPrintType('general')}
                className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                  printType === 'general' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-300 hover:text-white'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                1. Bảng tổng quát (Bảo mật phòng)
              </button>
              <button
                type="button"
                onClick={() => setPrintType('rooms')}
                className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                  printType === 'rooms' ? 'bg-blue-600 text-white font-bold' : 'text-slate-300 hover:text-white'
                }`}
              >
                2. Phân công chi tiết phòng
              </button>
              <button
                type="button"
                onClick={() => setPrintType('council')}
                className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                  printType === 'council' ? 'bg-blue-600 text-white font-bold' : 'text-slate-300 hover:text-white'
                }`}
              >
                3. Dán cửa phòng Hội đồng
              </button>
              <button
                type="button"
                onClick={() => setPrintType('stats')}
                className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                  printType === 'stats' ? 'bg-blue-600 text-white font-bold' : 'text-slate-300 hover:text-white'
                }`}
              >
                4. Bảng chấm công
              </button>
            </div>

            {printType === 'rooms' && (
              <select
                value={selectedSessionId}
                onChange={(e) => setSelectedSessionId(e.target.value)}
                className="bg-slate-800 text-white text-xs border border-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-hidden"
              >
                <option value="all">In tất cả các buổi thi</option>
                {plan.sessions.map(s => (
                  <option key={s.sessionId} value={s.sessionId}>
                    {s.sessionName} ({cleanSubjectName(s.subjectName)})
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              In ngay (Ctrl + P)
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Paper Area */}
        <div className="p-6 sm:p-8 overflow-y-auto flex-1 bg-slate-100 print:bg-white print:p-0">
          <div className={`${printType === 'general' ? 'max-w-[297mm]' : 'max-w-[210mm]'} mx-auto space-y-8 print:space-y-0 print:max-w-none`}>

            {/* ========================================================================= */}
            {/* LOẠI 0: BẢNG PHÂN CÔNG TỔNG QUÁT THEO BUỔI (BẢO MẬT PHÒNG THI) */}
            {/* ========================================================================= */}
            {printType === 'general' && (
              <div className="bg-white p-6 sm:p-8 rounded-xl shadow-md border border-slate-200 print:shadow-none print:border-none print:p-4 print:m-0 font-sans text-slate-800">
                {/* Header Tiêu đề chuẩn */}
                <div className="grid grid-cols-2 text-center text-xs font-bold mb-3 pb-2 border-b border-slate-300">
                  <div>
                    <p className="uppercase">{schoolName}</p>
                    <p className="text-[11px] font-semibold text-slate-600">HỘI ĐỒNG COI THI</p>
                  </div>
                  <div>
                    <p className="uppercase">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
                    <p className="text-[11px] font-normal underline">Độc lập - Tự do - Hạnh phúc</p>
                  </div>
                </div>

                <div className="text-center my-3">
                  <h3 className="text-base sm:text-lg font-bold uppercase text-[#002060] print:text-black">
                    DANH SÁCH CÁN BỘ LÃNH ĐẠO, THƯ KÝ, GIÁM SÁT VÀ GIÁM THỊ COI THI
                  </h3>
                  <p className="text-xs font-bold text-red-700 uppercase mt-0.5">
                    {generalData.examName} {generalData.academicYear}
                  </p>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-900 border border-amber-200 rounded-md text-[11px] font-medium mt-1.5 print:hidden">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                    Chế độ bảo mật: Công bố trước các buổi làm nhiệm vụ để giáo viên chuẩn bị - Không hiển thị số phòng thi.
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse border border-slate-400 my-3">
                    <thead>
                      <tr className="bg-[#002060] text-white print:bg-slate-800 print:text-white text-center font-bold">
                        <th className="border border-slate-400 py-2 px-1 w-10">STT</th>
                        <th className="border border-slate-400 py-2 px-1.5 w-16">Mã GV</th>
                        <th className="border border-slate-400 py-2 px-2 text-left">Họ và tên</th>
                        <th className="border border-slate-400 py-2 px-2 text-left">Đơn vị / Tổ CM</th>
                        <th className="border border-slate-400 py-2 px-2 text-left">Môn giảng dạy</th>
                        <th className="border border-slate-400 py-2 px-2">Nhiệm vụ HĐ thi</th>
                        {generalData.shifts.map(s => (
                          <th key={s.shiftKey} className="border border-slate-400 py-2 px-1.5 min-w-[100px] text-center font-bold">
                            <div>Buổi {s.shiftNumber} - {s.period}</div>
                            <div className="text-[10px] font-normal opacity-90">({s.dateStr})</div>
                          </th>
                        ))}
                        <th className="border border-slate-400 py-2 px-1.5 w-16 text-center">Tổng số buổi</th>
                        <th className="border border-slate-400 py-2 px-2 text-left">Ghi chú phân công</th>
                      </tr>
                    </thead>
                    <tbody>
                      {generalData.rows.map((row) => {
                        const isLeadership = row.groupType === 'leadership';
                        const isSupervisor = row.groupType === 'supervisor';
                        const isSupport = row.groupType === 'support';
                        const rowClass = isLeadership
                          ? 'bg-[#FFFF00]/90 print:bg-yellow-200 text-slate-950 font-medium'
                          : isSupervisor
                          ? 'bg-[#F3E8FF] print:bg-purple-100 text-slate-900'
                          : isSupport
                          ? 'bg-[#E0F2FE] print:bg-sky-100 text-slate-950 font-medium'
                          : 'bg-white hover:bg-slate-50 text-slate-800';

                        return (
                          <tr key={`${row.groupType}_${row.id}_${row.stt}`} className={`${rowClass} border-b border-slate-300`}>
                            <td className="border border-slate-400 py-1.5 px-1 text-center font-semibold">{row.stt}</td>
                            <td className={`border border-slate-400 py-1.5 px-1 text-center font-mono ${
                              isSupervisor ? 'text-red-700 font-bold italic' : (isSupport ? 'text-sky-800 font-bold' : (isLeadership ? 'font-bold' : ''))
                            }`}>
                              {row.code}
                            </td>
                            <td className={`border border-slate-400 py-1.5 px-2 ${isLeadership ? 'font-bold' : (isSupport ? 'font-semibold' : 'font-medium')}`}>
                              {row.fullName}
                            </td>
                            <td className="border border-slate-400 py-1.5 px-2">{row.schoolOrDept}</td>
                            <td className="border border-slate-400 py-1.5 px-2 text-center">{row.subject}</td>
                            <td className={`border border-slate-400 py-1.5 px-2 text-center font-bold ${
                              isLeadership ? 'text-purple-900' : (isSupervisor ? 'text-indigo-900' : (isSupport ? 'text-sky-900' : 'text-slate-700'))
                            }`}>
                              {row.role}
                            </td>
                            {generalData.shifts.map(s => (
                              <td key={s.shiftKey} className="border border-slate-400 py-1.5 px-1.5 text-center font-bold text-slate-900 text-sm">
                                {row.shiftDuties[s.shiftKey] ? 'x' : ''}
                              </td>
                            ))}
                            <td className="border border-slate-400 py-1.5 px-1 text-center font-bold text-blue-900">
                              {row.totalDuties > 0 ? row.totalDuties : ''}
                            </td>
                            <td className="border border-slate-400 py-1.5 px-2 text-[11px] italic text-slate-600">
                              {row.note}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Footer Chữ ký */}
                <div className="grid grid-cols-2 text-center text-xs font-bold mt-8 pt-4">
                  <div>
                    <p className="uppercase">THƯ KÝ HỘI ĐỒNG THI</p>
                    <p className="text-[11px] font-normal italic text-slate-500 mt-0.5">(Ký và ghi rõ họ tên)</p>
                    <div className="h-16"></div>
                  </div>
                  <div>
                    <p className="text-[11px] font-normal italic text-slate-500 mb-1">
                      Ngày ..... tháng ..... năm 20.....
                    </p>
                    <p className="uppercase">CHỦ TỊCH HỘI ĐỒNG THI</p>
                    <p className="text-[11px] font-normal italic text-slate-500 mt-0.5">(Ký và đóng dấu)</p>
                    <div className="h-16 flex items-end justify-center">
                      <p className="font-semibold text-slate-700">{president?.fullName || ''}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* LOẠI 1: BẢNG PHÂN CÔNG GIÁM THỊ THEO TỪNG BUỔI (DÁN BẢNG TIN) */}
            {/* ========================================================================= */}
            {printType === 'rooms' && sessionsToPrint.map((session, sIdx) => (
              <div
                key={session.sessionId}
                className="bg-white p-6 sm:p-8 rounded-xl shadow-md border border-slate-200 print:shadow-none print:border-none print:p-6 print:m-0"
                style={{ pageBreakAfter: sIdx < sessionsToPrint.length - 1 ? 'always' : 'auto' }}
              >
                {/* Header Tiêu đề chuẩn */}
                <div className="grid grid-cols-2 text-center text-xs font-bold mb-4 pb-2 border-b border-slate-200">
                  <div>
                    <p className="uppercase">{schoolName}</p>
                    <p className="text-[11px] font-semibold text-slate-600">HỘI ĐỒNG COI THI</p>
                  </div>
                  <div>
                    <p className="uppercase">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
                    <p className="text-[11px] font-normal underline">Độc lập - Tự do - Hạnh phúc</p>
                  </div>
                </div>

                <div className="text-center my-3">
                  <h3 className="text-sm sm:text-base font-bold uppercase text-blue-900 print:text-black">
                    BẢNG PHÂN CÔNG GIÁM THỊ COI THI
                  </h3>
                  <p className="text-xs font-bold text-red-700 uppercase mt-0.5">
                    {effectiveExamName} - {effectiveAcademicYear}
                  </p>
                  <p className="text-xs font-bold text-slate-800 mt-0.5">
                    {session.sessionName.toUpperCase()} - MÔN: {cleanSubjectName(session.subjectName).toUpperCase()}
                  </p>
                  <p className="text-[11px] text-slate-600 italic mt-0.5">
                    Thời gian thi: {session.shiftTime} | Ngày thi: {session.date}
                  </p>
                </div>

                {/* Phần 1: Cán bộ giám sát hành lang */}
                {session.supervisors && session.supervisors.length > 0 && (
                  <div className="my-3">
                    <h4 className="text-xs font-bold uppercase text-purple-900 mb-1.5 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-purple-600 inline-block"></span>
                      I. CÁN BỘ GIÁM SÁT HÀNH LANG PHÒNG THI ({session.supervisors.length} cán bộ)
                    </h4>
                    <table className="w-full text-xs text-left border-collapse border border-black mb-3">
                      <thead>
                        <tr className="bg-purple-50 print:bg-slate-100 text-center font-bold">
                          <th className="border border-black py-1.5 px-1 w-10">STT</th>
                          <th className="border border-black py-1.5 px-1.5 w-16">Mã CB</th>
                          <th className="border border-black py-1.5 px-2 text-left">Họ và tên Cán bộ Giám sát</th>
                          <th className="border border-black py-1.5 px-2 text-left">Đơn vị / Tổ CM</th>
                          <th className="border border-black py-1.5 px-2 text-center">Môn dạy</th>
                          <th className="border border-black py-1.5 px-2 text-left">Khu vực hành lang phụ trách</th>
                          <th className="border border-black py-1.5 px-2 w-16 text-center">Ký nhận</th>
                        </tr>
                      </thead>
                      <tbody>
                        {session.supervisors.map((sup, idx) => (
                          <tr key={sup.id} className="hover:bg-slate-50">
                            <td className="border border-black py-1 px-1 text-center font-medium">{idx + 1}</td>
                            <td className="border border-black py-1 px-1.5 text-center font-mono font-bold text-red-700">{sup.code}</td>
                            <td className="border border-black py-1 px-2 font-semibold">{sup.fullName}</td>
                            <td className="border border-black py-1 px-2 text-slate-700">{sup.schoolOrDept}</td>
                            <td className="border border-black py-1 px-2 text-center">{sup.subject}</td>
                            <td className="border border-black py-1 px-2 text-[11px] text-slate-600">{sup.note || `Giám sát hành lang Khu vực ${idx + 1}`}</td>
                            <td className="border border-black py-1 px-2 text-center"></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Phần 2: Cán bộ giám thị dự phòng */}
                {session.reserveInvigilators && session.reserveInvigilators.length > 0 && (
                  <div className="my-3">
                    <h4 className="text-xs font-bold uppercase text-sky-900 mb-1.5 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-sky-600 inline-block"></span>
                      II. CÁN BỘ GIÁM THỊ DỰ PHÒNG TẠI HỘI ĐỒNG ({session.reserveInvigilators.length} cán bộ)
                    </h4>
                    <table className="w-full text-xs text-left border-collapse border border-black mb-3">
                      <thead>
                        <tr className="bg-sky-50 print:bg-slate-100 text-center font-bold">
                          <th className="border border-black py-1.5 px-1 w-10">STT</th>
                          <th className="border border-black py-1.5 px-1.5 w-16">Mã CB</th>
                          <th className="border border-black py-1.5 px-2 text-left">Họ và tên Giám thị dự phòng</th>
                          <th className="border border-black py-1.5 px-2 text-left">Đơn vị / Tổ CM</th>
                          <th className="border border-black py-1.5 px-2 text-center">Môn dạy</th>
                          <th className="border border-black py-1.5 px-2 text-center">Điện thoại liên hệ</th>
                          <th className="border border-black py-1.5 px-2 w-16 text-center">Ký nhận</th>
                        </tr>
                      </thead>
                      <tbody>
                        {session.reserveInvigilators.map((res, idx) => (
                          <tr key={res.id} className="hover:bg-slate-50">
                            <td className="border border-black py-1 px-1 text-center font-medium">{idx + 1}</td>
                            <td className="border border-black py-1 px-1.5 text-center font-mono font-bold">{res.code}</td>
                            <td className="border border-black py-1 px-2 font-semibold">{res.fullName}</td>
                            <td className="border border-black py-1 px-2 text-slate-700">{res.schoolOrDept}</td>
                            <td className="border border-black py-1 px-2 text-center">{res.subject}</td>
                            <td className="border border-black py-1 px-2 text-center text-slate-600">{res.phone || '-'}</td>
                            <td className="border border-black py-1 px-2 text-center"></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Phần 3: Bảng phân công phòng chính thức */}
                {(() => {
                  const isDualInvigilator = isSurveyMock && (plan.invigilatorsPerRoom ?? (session.roomAssignments.some(r => !!r.invigilator2) ? 2 : 1)) === 2;
                  return (
                    <div className="my-3">
                      <h4 className="text-xs font-bold uppercase text-slate-900 mb-1.5 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-600 inline-block"></span>
                        III. PHÂN CÔNG GIÁM THỊ COI THI PHÒNG THI CHÍNH THỨC ({session.roomAssignments.length} phòng)
                      </h4>
                      <table className="w-full text-xs text-left border-collapse border border-black my-2">
                      <thead>
                        <tr className="bg-slate-100 print:bg-slate-50 text-center font-bold">
                          <th className="border border-black py-2 px-1.5 w-10">STT</th>
                          <th className="border border-black py-2 px-2 w-20">Phòng thi</th>
                          {isDualInvigilator ? (
                            <>
                              <th className="border border-black py-2 px-3">Giám thị 1</th>
                              <th className="border border-black py-2 px-2.5 w-32">Đơn vị / Tổ</th>
                              <th className="border border-black py-2 px-3">Giám thị 2</th>
                              <th className="border border-black py-2 px-2.5 w-32">Đơn vị / Tổ</th>
                              <th className="border border-black py-2 px-2 w-16">Ký nhận</th>
                            </>
                          ) : (
                            <>
                              <th className="border border-black py-2 px-3">Giám thị coi thi (Họ tên)</th>
                              <th className="border border-black py-2 px-3 w-36">Đơn vị / Tổ CM</th>
                              <th className="border border-black py-2 px-2.5 w-24 text-center">Môn dạy</th>
                              <th className="border border-black py-2 px-2.5 w-28 text-center">Điện thoại</th>
                              <th className="border border-black py-2 px-2 w-20 text-center">Ký nhận</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {session.roomAssignments.map((room, rIdx) => (
                          <tr key={room.roomNo} className="hover:bg-slate-50">
                            <td className="border border-black py-1.5 px-1.5 text-center font-medium">{rIdx + 1}</td>
                            <td className="border border-black py-1.5 px-2 text-center font-bold text-blue-900 print:text-black">
                              {room.roomLabel}
                            </td>
                            {isDualInvigilator ? (
                              <>
                                <td className="border border-black py-1.5 px-3 font-semibold">{room.invigilator1?.fullName}</td>
                                <td className="border border-black py-1.5 px-2.5 text-slate-600 print:text-black">{room.invigilator1?.schoolOrDept}</td>
                                <td className="border border-black py-1.5 px-3 font-semibold">{room.invigilator2?.fullName}</td>
                                <td className="border border-black py-1.5 px-2.5 text-slate-600 print:text-black">{room.invigilator2?.schoolOrDept}</td>
                                <td className="border border-black py-1.5 px-2 text-center"></td>
                              </>
                            ) : (
                              <>
                                <td className="border border-black py-1.5 px-3 font-semibold">{room.invigilator1?.fullName}</td>
                                <td className="border border-black py-1.5 px-3 text-slate-600 print:text-black">{room.invigilator1?.schoolOrDept}</td>
                                <td className="border border-black py-1.5 px-2.5 text-center">{room.invigilator1?.subject}</td>
                                <td className="border border-black py-1.5 px-2.5 text-center text-slate-600">{room.invigilator1?.phone || '-'}</td>
                                <td className="border border-black py-1.5 px-2 text-center"></td>
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  );
                })()}

                {/* Cán bộ ký biên bản buổi thi này - Tự động theo phân công trực ca */}
                {(() => {
                  const sigInfo = getSessionSignatories(session.sessionId);
                  const activeSecretaryName = sigInfo.activeSecretary?.fullName || 'Thư ký Hội đồng';
                  const activeLeaderName = sigInfo.activeLeader?.fullName || president?.fullName || 'Chủ tịch Hội đồng';
                  const isVP = sigInfo.isVicePresident;

                  return (
                    <div className="mt-8 pt-4 border-t border-slate-200 print:border-none print:pt-2">
                      {/* Thanh công cụ xem & chọn cán bộ ký trên màn hình (Ẩn khi in ấn) */}
                      <div className="print:hidden mb-4 p-3 bg-blue-50/80 border border-blue-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse"></span>
                          <div>
                            <span className="font-bold text-blue-950">Chữ ký theo ca trực: </span>
                            <span className="text-slate-600">
                              Tự động lấy đúng Thư ký & Lãnh đạo trực ca {session.sessionName} (có thể đổi trực tiếp):
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-700 font-medium">Thư ký ký:</span>
                            <select
                              value={sigInfo.activeSecretary?.id || ''}
                              onChange={(e) => setOverrideSignatories(prev => ({
                                ...prev,
                                [session.sessionId]: { ...(prev[session.sessionId] || {}), secretaryId: e.target.value }
                              }))}
                              className="bg-white border border-blue-300 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-800 shadow-2xs focus:outline-hidden"
                            >
                              {(secretaries.length > 0 ? secretaries : invigilators.slice(0, 5)).map(s => {
                                const onDuty = sigInfo.shiftSecretaries.some(sec => sec.id === s.id || sec.code === s.code);
                                return (
                                  <option key={s.id} value={s.id}>
                                    {onDuty ? '⭐ ' : ''}{s.fullName} ({s.code}{onDuty ? ' - Trực ca này' : ''})
                                  </option>
                                );
                              })}
                            </select>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-700 font-medium">Lãnh đạo ký:</span>
                            <select
                              value={sigInfo.activeLeader?.id || ''}
                              onChange={(e) => setOverrideSignatories(prev => ({
                                ...prev,
                                [session.sessionId]: { ...(prev[session.sessionId] || {}), leaderId: e.target.value }
                              }))}
                              className="bg-white border border-blue-300 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-800 shadow-2xs focus:outline-hidden"
                            >
                              {[president, vicePresident, ...councilMembers.filter(m => m.id !== president?.id && m.id !== vicePresident?.id)].filter(Boolean).map(l => {
                                const onDuty = sigInfo.shiftLeaders.some(ldr => ldr.id === l!.id || ldr.code === l!.code);
                                return (
                                  <option key={l!.id} value={l!.id}>
                                    {onDuty ? '⭐ ' : ''}{l!.fullName} ({l!.role || 'Lãnh đạo'}{onDuty ? ' - Trực ca này' : ''})
                                  </option>
                                );
                              })}
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Footer Chữ ký hiển thị trên bản in */}
                      <div className="grid grid-cols-2 text-center text-xs font-bold">
                        <div>
                          <p className="uppercase font-bold tracking-wide">THƯ KÝ TRỰC CA</p>
                          <p className="text-[11px] font-normal italic text-slate-500 mt-0.5">(Ký và ghi rõ họ tên)</p>
                          <div className="h-16 flex items-end justify-center">
                            <p className="font-semibold text-slate-800">{activeSecretaryName}</p>
                          </div>
                        </div>
                        <div>
                          <p className="text-[11px] font-normal italic text-slate-500 mb-1">
                            Ngày ..... tháng ..... năm 20.....
                          </p>
                          {isVP ? (
                            <>
                              <p className="uppercase font-bold tracking-wide">KT. CHỦ TỊCH HỘI ĐỒNG</p>
                              <p className="uppercase text-[11px] font-bold text-slate-700">PHÓ CHỦ TỊCH</p>
                            </>
                          ) : (
                            <p className="uppercase font-bold tracking-wide">CHỦ TỊCH HỘI ĐỒNG / TRƯỞNG ĐIỂM THI</p>
                          )}
                          <p className="text-[11px] font-normal italic text-slate-500 mt-0.5">(Ký và đóng dấu)</p>
                          <div className="h-16 flex items-end justify-center">
                            <p className="font-semibold text-slate-800">{activeLeaderName}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

              </div>
            ))}

            {/* ========================================================================= */}
            {/* LOẠI 2: DANH SÁCH ĐIỀU HÀNH & GIÁM SÁT (DÁN CỬA PHÒNG HỘI ĐỒNG) */}
            {/* ========================================================================= */}
            {printType === 'council' && (
              <div className="bg-white p-6 sm:p-8 rounded-xl shadow-md border border-slate-200 print:shadow-none print:border-none print:p-6 print:m-0">
                {/* Header Tiêu đề chuẩn */}
                <div className="grid grid-cols-2 text-center text-xs font-bold mb-4 pb-2 border-b border-slate-200">
                  <div>
                    <p className="uppercase">{schoolName}</p>
                    <p className="text-[11px] font-semibold text-slate-600">HỘI ĐỒNG COI THI</p>
                  </div>
                  <div>
                    <p className="uppercase">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
                    <p className="text-[11px] font-normal underline">Độc lập - Tự do - Hạnh phúc</p>
                  </div>
                </div>

                <div className="text-center my-4">
                  <h3 className="text-base font-bold uppercase text-blue-900 print:text-black">
                    DANH SÁCH BAN ĐIỀU HÀNH, THƯ KÝ & GIÁM SÁT HỘI ĐỒNG COI THI
                  </h3>
                  <p className="text-xs italic text-slate-600 mt-1">
                    (Niêm yết công khai tại Cửa phòng Hội đồng Điểm thi)
                  </p>
                </div>

                {/* Phần 1: Ban Lãnh đạo & Thư ký */}
                <div className="my-5">
                  <h4 className="text-xs font-bold uppercase text-slate-800 mb-2 border-l-4 border-blue-600 pl-2">
                    I. BAN LÃNH ĐẠO VÀ THƯ KÝ HỘI ĐỒNG
                  </h4>
                  <table className="w-full text-xs text-left border-collapse border border-black">
                    <thead>
                      <tr className="bg-slate-100 print:bg-slate-50 text-center font-bold">
                        <th className="border border-black py-2 px-1.5 w-10">STT</th>
                        <th className="border border-black py-2 px-2.5 w-24">Mã cán bộ</th>
                        <th className="border border-black py-2 px-3">Họ và tên</th>
                        <th className="border border-black py-2 px-3 w-36">Nhiệm vụ trong HĐ</th>
                        <th className="border border-black py-2 px-3 w-40">Đơn vị / Tổ CM</th>
                        <th className="border border-black py-2 px-3 w-44 text-center">Buổi trực ca phân công</th>
                        <th className="border border-black py-2 px-3">Ghi chú cụ thể</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(councilMembers.length > 0 ? councilMembers : invigilators.slice(0, 6)).map((m, idx) => {
                        const rowData = generalData.rows.find(r => r.id === m.id || r.code === m.code);
                        const assignedShifts = generalData.shifts
                          .filter(sh => rowData?.shiftDuties[sh.shiftKey])
                          .map(sh => `Buổi ${sh.shiftNumber}`)
                          .join(', ');

                        return (
                          <tr key={m.id} className="hover:bg-slate-50">
                            <td className="border border-black py-2 px-1.5 text-center font-medium">{idx + 1}</td>
                            <td className="border border-black py-2 px-2 text-center font-mono font-bold">{m.code}</td>
                            <td className="border border-black py-2 px-3 font-semibold">{m.fullName}</td>
                            <td className="border border-black py-2 px-3 text-center font-bold text-blue-900 print:text-black">
                              {m.role || 'Ủy viên'}
                            </td>
                            <td className="border border-black py-2 px-3 text-slate-600 print:text-black">{m.schoolOrDept}</td>
                            <td className="border border-black py-2 px-3 text-center font-semibold text-slate-800">
                              {assignedShifts || 'Toàn bộ các buổi'}
                            </td>
                            <td className="border border-black py-2 px-3 text-slate-600 print:text-black">{m.note || m.phone || '-'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Phần 2: Lịch thi và cấu hình các buổi */}
                <div className="my-5">
                  <h4 className="text-xs font-bold uppercase text-slate-800 mb-2 border-l-4 border-blue-600 pl-2">
                    II. LỊCH THI VÀ CẤU HÌNH NHÂN SỰ CÁC BUỔI THI
                  </h4>
                  <table className="w-full text-xs text-left border-collapse border border-black">
                    <thead>
                      <tr className="bg-slate-100 print:bg-slate-50 text-center font-bold">
                        <th className="border border-black py-2 px-1.5 w-10">STT</th>
                        <th className="border border-black py-2 px-3">Tên buổi thi</th>
                        <th className="border border-black py-2 px-3">Môn thi</th>
                        <th className="border border-black py-2 px-2.5 text-center">Ngày thi</th>
                        <th className="border border-black py-2 px-3 text-center">Thời gian làm bài</th>
                        <th className="border border-black py-2 px-2 text-center">Cấu hình phòng & nhân sự</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessions.map((s, idx) => (
                        <tr key={s.id} className="hover:bg-slate-50">
                          <td className="border border-black py-2 px-1.5 text-center font-medium">{idx + 1}</td>
                          <td className="border border-black py-2 px-3 font-bold">{s.sessionName}</td>
                          <td className="border border-black py-2 px-3 font-semibold text-blue-900 print:text-black">{cleanSubjectName(s.subjectName)}</td>
                          <td className="border border-black py-2 px-2.5 text-center">{s.date}</td>
                          <td className="border border-black py-2 px-3 text-center">{s.shiftTime}</td>
                          <td className="border border-black py-2 px-2 text-center">
                            <span className="font-bold text-slate-900">{s.numRooms}</span> phòng
                            <div className="text-[10px] text-slate-600">
                              (GS: {s.numSupervisors ?? Math.ceil(s.numRooms / 4)} | DP: {s.numReserves ?? 2})
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Footer Chữ ký */}
                <div className="grid grid-cols-2 text-center text-xs font-bold mt-10 pt-4">
                  <div>
                    <p className="uppercase">THƯ KÝ HỘI ĐỒNG</p>
                    <p className="text-[11px] font-normal italic text-slate-500 mt-0.5">(Ký và ghi rõ họ tên)</p>
                    <div className="h-16 flex items-end justify-center">
                      <p className="font-semibold text-slate-700">{secretaries[0]?.fullName || ''}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] font-normal italic text-slate-500 mb-1">
                      Ngày ..... tháng ..... năm 20.....
                    </p>
                    <p className="uppercase">CHỦ TỊCH HỘI ĐỒNG / TRƯỞNG ĐIỂM THI</p>
                    <p className="text-[11px] font-normal italic text-slate-500 mt-0.5">(Ký và đóng dấu)</p>
                    <div className="h-16 flex items-end justify-center">
                      <p className="font-semibold text-slate-700">{president?.fullName || ''}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* LOẠI 3: BẢNG CHẤM CÔNG VÀ ĐÁNH GIÁ ĐỊNH MỨC CÔNG BẰNG */}
            {/* ========================================================================= */}
            {printType === 'stats' && (
              <div className="bg-white p-6 sm:p-8 rounded-xl shadow-md border border-slate-200 print:shadow-none print:border-none print:p-6 print:m-0">
                {/* Header Tiêu đề chuẩn */}
                <div className="grid grid-cols-2 text-center text-xs font-bold mb-4 pb-2 border-b border-slate-200">
                  <div>
                    <p className="uppercase">{schoolName}</p>
                    <p className="text-[11px] font-semibold text-slate-600">HỘI ĐỒNG COI THI</p>
                  </div>
                  <div>
                    <p className="uppercase">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
                    <p className="text-[11px] font-normal underline">Độc lập - Tự do - Hạnh phúc</p>
                  </div>
                </div>

                <div className="text-center my-4">
                  <h3 className="text-base font-bold uppercase text-blue-900 print:text-black">
                    BẢNG TỔNG HỢP SỐ CA COI THI & CHẤM CÔNG THANH TOÁN
                  </h3>
                  <p className="text-xs font-bold text-red-700 uppercase mt-0.5">
                    {effectiveExamName} - {effectiveAcademicYear}
                  </p>
                  <p className="text-xs italic text-slate-600 mt-1">
                    (Phục vụ đối soát định mức và thanh toán chế độ bồi dưỡng coi thi)
                  </p>
                </div>

                <table className="w-full text-xs text-left border-collapse border border-black my-4">
                  <thead>
                    <tr className="bg-slate-100 print:bg-slate-50 text-center font-bold">
                      <th className="border border-black py-2 px-1.5 w-10">STT</th>
                      <th className="border border-black py-2 px-2 w-20">Mã GV</th>
                      <th className="border border-black py-2 px-3">Họ và tên</th>
                      <th className="border border-black py-2 px-3 w-32">Đơn vị / Tổ CM</th>
                      <th className="border border-black py-2 px-2 text-center">Môn dạy</th>
                      <th className="border border-black py-2 px-2 text-center w-16">Số ca coi</th>
                      <th className="border border-black py-2 px-3">Chi tiết các ca làm nhiệm vụ</th>
                      <th className="border border-black py-2 px-2 w-20 text-center">Ký nhận</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plan.stats.map((st, idx) => (
                      <tr key={st.invigilatorId} className="hover:bg-slate-50">
                        <td className="border border-black py-1.5 px-1.5 text-center font-medium">{idx + 1}</td>
                        <td className="border border-black py-1.5 px-2 text-center font-mono">{st.code}</td>
                        <td className="border border-black py-1.5 px-3 font-semibold">{st.fullName}</td>
                        <td className="border border-black py-1.5 px-3 text-slate-600 print:text-black">{st.schoolOrDept}</td>
                        <td className="border border-black py-1.5 px-2 text-center">{st.subject}</td>
                        <td className="border border-black py-1.5 px-2 text-center font-bold text-blue-900 print:text-black">
                          {st.totalAssigned}
                        </td>
                        <td className="border border-black py-1.5 px-3 text-slate-600 print:text-black text-[11px]">
                          {st.sessionDetails.map(d => {
                            const sPrefix = formatSessionShortLabel(d.sessionName);
                            if (d.role === 'Giám sát') return `${sPrefix}: Giám sát`;
                            if (d.role === 'Dự phòng') return `${sPrefix}: Dự phòng`;
                            return `${sPrefix}: P${String(d.roomNo).padStart(2, '0')}`;
                          }).join(', ') || 'Không có ca'}
                        </td>
                        <td className="border border-black py-1.5 px-2 text-center"></td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Footer Chữ ký */}
                <div className="grid grid-cols-2 text-center text-xs font-bold mt-10 pt-4">
                  <div>
                    <p className="uppercase">NGƯỜI LẬP BIỂU</p>
                    <p className="text-[11px] font-normal italic text-slate-500 mt-0.5">(Ký và ghi rõ họ tên)</p>
                    <div className="h-16"></div>
                  </div>
                  <div>
                    <p className="text-[11px] font-normal italic text-slate-500 mb-1">
                      Ngày ..... tháng ..... năm 20.....
                    </p>
                    <p className="uppercase">HIỆU TRƯỞNG / CHỦ TỊCH HỘI ĐỒNG</p>
                    <p className="text-[11px] font-normal italic text-slate-500 mt-0.5">(Ký và đóng dấu)</p>
                    <div className="h-16 flex items-end justify-center">
                      <p className="font-semibold text-slate-700">{president?.fullName || ''}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
};
