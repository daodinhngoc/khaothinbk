import React, { useState } from 'react';
import { Code2, Copy, Check, Download, X, Terminal, FileCode } from 'lucide-react';

interface PythonCodeModalProps {
  onClose: () => void;
}

const PYTHON_CODE = `# ==============================================================================
# HỆ THỐNG TỐI ƯU XẾP PHÒNG THI & XUẤT BIỂU MẪU EXCEL TỰ ĐỘNG
# Nền tảng: Python 3.10+ / Streamlit / Pandas / Openpyxl
# ==============================================================================

import io
import math
import streamlit as st
import pandas as pd
from openpyxl import Workbook
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
from openpyxl.utils import get_column_letter

# ------------------------------------------------------------------------------
# 1. CẤU HÌNH GIAO DIỆN STREAMLIT
# ------------------------------------------------------------------------------
st.set_page_config(
    page_title="Hệ thống Tối ưu Xếp phòng thi & Xuất biểu mẫu",
    page_icon="📋",
    layout="wide"
)

# ------------------------------------------------------------------------------
# 2. THUẬT TOÁN XẾP PHÒNG THI TỐI ƯU (CORE PANDAS)
# ------------------------------------------------------------------------------
def standardize_combination(tc1: str, tc2: str) -> str:
    """
    Chuẩn hóa tổ hợp tự chọn:
    Ghép TC1 và TC2 thành chuỗi chuẩn không phân biệt thứ tự (Vật lý - Hóa học)
    """
    clean_tc1 = str(tc1).strip() if pd.notna(tc1) else ""
    clean_tc2 = str(tc2).strip() if pd.notna(tc2) else ""
    sorted_combo = sorted([clean_tc1, clean_tc2])
    return f"{sorted_combo[0]} - {sorted_combo[1]}"


def optimize_exam_room_assignment(df_input: pd.DataFrame, max_per_room: int = 24):
    """
    Thuật toán Bộ GD&ĐT Rolling-Fit 2.0 (Chuẩn Quốc gia):
    1. Cố định 1 SBD & 1 Phòng thi duy nhất cho tất cả các môn.
    2. Chuẩn hóa tổ hợp tự chọn (TC1 & TC2).
    3. Đếm tần suất và gom nhóm theo Tổ hợp môn: tổ hợp đông thí sinh nhất xếp lên đầu.
    4. Cắt phòng cuốn chiếu (Rolling Fill) 24 thí sinh/phòng.
    """
    df = df_input.copy()
    
    # Chuẩn hóa tổ hợp
    df['ToHop_ChuanHoa'] = df.apply(
        lambda r: standardize_combination(r.get('TC1', ''), r.get('TC2', '')), axis=1
    )
    
    # Đếm tần suất tổ hợp: đông nhất xếp trước
    combo_counts = df['ToHop_ChuanHoa'].value_counts()
    df['Combo_Freq'] = df['ToHop_ChuanHoa'].map(combo_counts)
    
    # Sắp xếp ưu tiên: Tần suất tổ hợp giảm dần -> Tên tổ hợp -> SBD tăng dần
    df['SBD'] = df['SBD'].astype(str)
    df = df.sort_values(by=['Combo_Freq', 'ToHop_ChuanHoa', 'SBD'], ascending=[False, True, True]).reset_index(drop=True)
    df.drop(columns=['Combo_Freq'], inplace=True)
    
    # Cắt phòng cuốn chiếu định mức 24 thí sinh/phòng
    total_students = len(df)
    total_rooms = math.ceil(total_students / max_per_room) if total_students > 0 else 0
    
    room_assignments = []
    stt_in_room = []
    
    for idx in range(total_students):
        room_no = (idx // max_per_room) + 1
        seq_in_room = (idx % max_per_room) + 1
        room_assignments.append(room_no)
        stt_in_room.append(seq_in_room)
        
    df['Phòng thi'] = room_assignments
    df['STT_Phong'] = stt_in_room
    df['TT'] = range(1, total_students + 1)
    
    return df, total_rooms


def assign_rooms_for_compulsory_subjects(df_input: pd.DataFrame, max_per_room: int = 24):
    """
    Xếp phòng cho 2 môn bắt buộc (Toán & Ngữ văn - M1 & M2):
    Toàn bộ thí sinh đều thi môn chung. Sắp xếp theo SBD tăng dần và phân bổ đều 24 HS/phòng.
    """
    df = df_input.copy()
    df['SBD'] = df['SBD'].astype(str)
    df = df.sort_values(by=['SBD'], ascending=[True]).reset_index(drop=True)
    
    total_students = len(df)
    total_rooms = math.ceil(total_students / max_per_room) if total_students > 0 else 0
    
    room_assignments = []
    stt_in_room = []
    
    for idx in range(total_students):
        room_no = (idx // max_per_room) + 1
        seq_in_room = (idx % max_per_room) + 1
        room_assignments.append(room_no)
        stt_in_room.append(seq_in_room)
        
    df['Phòng thi'] = room_assignments
    df['STT_Phong'] = stt_in_room
    df['TT'] = range(1, total_students + 1)
    
    return df, total_rooms


# ------------------------------------------------------------------------------
# 3. HÀM XUẤT BIỂU MẪU OPENPYXL (CHUẨN IN ẤN A4)
# ------------------------------------------------------------------------------
def export_attendance_sheet_openpyxl(
    df_assigned: pd.DataFrame,
    exam_title: str,
    shift_name: str,
    subject_col: str,
    dept_name: str = "SỞ GD&ĐT GIA LAI",
    school_name: str = "TRƯỜNG THPT NGUYỄN BỈNH KHIÊM",
    exam_center_code: str = "NBK-CH"
):
    """
    Xuất biểu mẫu Phiếu thu bài thi / Danh sách dán phòng với Openpyxl.
    Mỗi phòng thi trên một Sheet riêng biệt, định dạng trang in A4.
    """
    wb = Workbook()
    wb.remove(wb.active)  # Xóa sheet rỗng mặc định
    
    # Định nghĩa Font & Border
    font_bold_11 = Font(name="Times New Roman", size=11, bold=True)
    font_title = Font(name="Times New Roman", size=14, bold=True)
    font_cell = Font(name="Times New Roman", size=10)
    font_italic_10 = Font(name="Times New Roman", size=10, italic=True)
    
    thin_border = Border(
        left=Side(style="thin", color="000000"),
        right=Side(style="thin", color="000000"),
        top=Side(style="thin", color="000000"),
        bottom=Side(style="thin", color="000000")
    )
    header_fill = PatternFill(start_color="F1F5F9", end_color="F1F5F9", fill_type="solid")
    
    align_center = Alignment(horizontal="center", vertical="center", wrap_text=True)
    align_left = Alignment(horizontal="left", vertical="center")
    
    rooms = sorted(df_assigned['Phòng thi'].unique())
    
    for room_no in rooms:
        df_room = df_assigned[df_assigned['Phòng thi'] == room_no].copy()
        ws = wb.create_sheet(title=f"Phòng_{room_no:02d}")
        
        # Setup trang in A4
        ws.page_setup.paperSize = ws.PAPERSIZE_A4
        ws.page_setup.orientation = ws.ORIENTATION_PORTRAIT
        ws.sheet_properties.pageSetUpPr.fitToPage = True
        ws.page_setup.fitToWidth = 1
        ws.page_setup.fitToHeight = 0
        
        # Header Quốc hiệu & Tiêu ngữ
        ws['A1'] = dept_name.upper()
        ws['A1'].font = font_bold_11
        ws['A1'].alignment = align_center
        ws.merge_cells('A1:D1')
        
        ws['A2'] = school_name.upper()
        ws['A2'].font = Font(name="Times New Roman", size=10, bold=True, underline="single")
        ws['A2'].alignment = align_center
        ws.merge_cells('A2:D2')
        
        ws['E1'] = "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM"
        ws['E1'].font = font_bold_11
        ws['E1'].alignment = align_center
        ws.merge_cells('E1:H1')
        
        ws['E2'] = "Độc lập - Tự do - Hạnh phúc"
        ws['E2'].font = Font(name="Times New Roman", size=10, bold=True, underline="single")
        ws['E2'].alignment = align_center
        ws.merge_cells('E2:H2')
        
        # Tiêu đề biểu mẫu
        ws['A4'] = "DANH SÁCH THÍ SINH DÁN PHÒNG & PHIẾU THU BÀI THI"
        ws['A4'].font = font_title
        ws['A4'].alignment = align_center
        ws.merge_cells('A4:H4')
        
        ws['A5'] = f"KỲ THI: {exam_title.upper()} - {shift_name.upper()}"
        ws['A5'].font = font_bold_11
        ws['A5'].alignment = align_center
        ws.merge_cells('A5:H5')
        
        # Sắp xếp thí sinh trong phòng: Nhóm theo môn thi ca hiện tại, trong từng môn sắp SBD tăng dần
        df_room = df_room.copy()
        df_room['SBD_num'] = pd.to_numeric(df_room['SBD'], errors='coerce')
        df_room = df_room.sort_values(by=[subject_col, 'SBD_num', 'SBD']).drop(columns=['SBD_num'])

        unique_mon_list = [str(m) for m in df_room[subject_col].dropna().unique() if str(m).strip()]
        unique_mons = ", ".join(unique_mon_list)
        is_multi_mon = len(unique_mon_list) > 1
        ws['A6'] = f"Điểm thi: {exam_center_code}   |   Phòng thi số: {room_no:02d}   |   Môn thi: {unique_mons}"
        ws['A6'].font = font_bold_11
        ws['A6'].alignment = align_center
        ws.merge_cells('A6:H6')
        
        # Header Bảng 8 cột
        headers = ['STT', 'Số báo danh', 'Họ và tên thí sinh', 'Ngày sinh', 'Lớp', 'Mã đề thi/ Số tờ', 'Ký nộp', 'Ghi chú']
        start_row = 8
        for col_idx, h in enumerate(headers, 1):
            cell = ws.cell(row=start_row, column=col_idx, value=h)
            cell.font = font_bold_11
            cell.fill = header_fill
            cell.alignment = align_center
            cell.border = thin_border
            
        current_row = start_row + 1
        for idx, (_, r) in enumerate(df_room.iterrows(), 1):
            ws.cell(row=current_row, column=1, value=idx).alignment = align_center
            ws.cell(row=current_row, column=2, value=str(r['SBD'])).alignment = align_center
            ws.cell(row=current_row, column=3, value=str(r['Họ tên'])).alignment = align_left
            ws.cell(row=current_row, column=4, value=str(r['Ngày sinh'])).alignment = align_center
            ws.cell(row=current_row, column=5, value=str(r['Lớp'])).alignment = align_center
            ws.cell(row=current_row, column=6, value="").alignment = align_center
            ws.cell(row=current_row, column=7, value="").alignment = align_center
            # Cột Ghi chú: Thống nhất ghi rõ môn tự chọn cho 100% các phòng thi CA 1 / CA 2
            note_val = f"Môn: {r[subject_col]}"
            ws.cell(row=current_row, column=8, value=note_val).alignment = align_left
            
            for c in range(1, 9):
                cell = ws.cell(row=current_row, column=c)
                cell.font = font_cell
                cell.border = thin_border
            current_row += 1
            
        # Footer & Chữ ký Giám thị
        sum_row = current_row + 1
        ws.cell(row=sum_row, column=1, value=f"- Tổng số thí sinh: {len(df_room):02d} thí sinh.").font = font_bold_11
        ws.merge_cells(start_row=sum_row, start_column=1, end_row=sum_row, end_column=8)
        
        # Chữ ký 2 giám thị
        sig_row = sum_row + 4
        ws.cell(row=sig_row, column=2, value="GIÁM THỊ 1").font = font_bold_11
        ws.merge_cells(start_row=sig_row, start_column=2, end_row=sig_row, end_column=3)
        ws.cell(row=sig_row, column=6, value="GIÁM THỊ 2").font = font_bold_11
        ws.merge_cells(start_row=sig_row, start_column=6, end_row=sig_row, end_column=8)
        
    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return buf


# ------------------------------------------------------------------------------
# 4. HÀM THỐNG KÊ THEO CA VÀ XUẤT EXCEL (CA 1, CA 2)
# ------------------------------------------------------------------------------
def generate_shift_statistics(df_assigned: pd.DataFrame, subject_col: str) -> pd.DataFrame:
    """
    Tạo Bảng Thống kê Theo Ca (TT; Phòng; Các môn; Tổng số thí sinh).
    """
    records = []
    rooms = sorted(df_assigned['Phòng thi'].unique())
    for idx, room_no in enumerate(rooms, start=1):
        df_room = df_assigned[df_assigned['Phòng thi'] == room_no]
        subj_counts = df_room[subject_col].value_counts()
        subjects_detail = ", ".join([f"{subj} ({count})" for subj, count in subj_counts.items()])
        records.append({
            "TT": idx,
            "Phòng": f"Phòng {room_no:02d}",
            "Các môn": subjects_detail,
            "Tổng số thí sinh": len(df_room)
        })
    return pd.DataFrame(records)


def export_shift_summary_openpyxl(
    df_assigned: pd.DataFrame,
    exam_title: str,
    shift_name: str,
    subject_col: str,
    dept_name: str = "SỞ GD&ĐT GIA LAI",
    school_name: str = "TRƯỜNG THPT NGUYỄN BỈNH KHIÊM",
    exam_center_code: str = "NBK-CH"
) -> io.BytesIO:
    """
    Xuất File Excel Bảng Thống kê Theo Ca 1 / Ca 2 bằng Openpyxl chuẩn A4.
    """
    wb = Workbook()
    ws = wb.active
    ws.title = f"ThongKe_{shift_name.replace(' ', '')}"
    
    # Setup A4 dọc
    ws.page_setup.paperSize = ws.PAPERSIZE_A4
    ws.page_setup.orientation = ws.ORIENTATION_PORTRAIT
    ws.sheet_properties.pageSetUpPr.fitToPage = True
    ws.page_setup.fitToWidth = 1
    ws.page_setup.fitToHeight = 0
    
    # Styles
    f_bold = Font(name="Times New Roman", size=11, bold=True)
    f_title = Font(name="Times New Roman", size=13, bold=True)
    f_cell = Font(name="Times New Roman", size=10)
    f_italic = Font(name="Times New Roman", size=10, italic=True)
    thin_border = Border(
        left=Side(style="thin", color="000000"), right=Side(style="thin", color="000000"),
        top=Side(style="thin", color="000000"), bottom=Side(style="thin", color="000000")
    )
    fill_header = PatternFill(start_color="F1F5F9", end_color="F1F5F9", fill_type="solid")
    fill_total = PatternFill(start_color="E2E8F0", end_color="E2E8F0", fill_type="solid")
    
    # 1. Header cơ quan & Quốc hiệu
    ws['A1'] = dept_name.upper(); ws['A1'].font = f_bold; ws.merge_cells('A1:B1')
    ws['A2'] = school_name.upper(); ws['A2'].font = Font(name="Times New Roman", size=10, bold=True, underline="single"); ws.merge_cells('A2:B2')
    ws['C1'] = "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM"; ws['C1'].font = f_bold; ws.merge_cells('C1:D1')
    ws['C2'] = "Độc lập - Tự do - Hạnh phúc"; ws['C2'].font = Font(name="Times New Roman", size=10, bold=True, underline="single"); ws.merge_cells('C2:D2')
    
    # 2. Tiêu đề
    ws['A4'] = f"BẢNG TỔNG HỢP THỐNG KÊ THÍ SINH DỰ THI THEO PHÒNG - {shift_name.upper()}"
    ws['A4'].font = f_title; ws['A4'].alignment = Alignment(horizontal="center"); ws.merge_cells('A4:D4')
    ws['A5'] = f"KỲ THI: {exam_title.upper()} - MÔN THI: {subject_col.upper()}"
    ws['A5'].font = f_bold; ws['A5'].alignment = Alignment(horizontal="center"); ws.merge_cells('A5:D5')
    ws['A6'] = f"Điểm thi: {exam_center_code}   |   Tổng số: {df_assigned['Phòng thi'].nunique()} phòng ({len(df_assigned)} thí sinh)"
    ws['A6'].font = f_italic; ws['A6'].alignment = Alignment(horizontal="center"); ws.merge_cells('A6:D6')
    
    # 3. Bảng dữ liệu 4 cột
    headers = ['TT', 'Phòng', 'Các môn', 'Tổng số thí sinh']
    ws.row_dimensions[8].height = 26
    for c_idx, h in enumerate(headers, 1):
        cell = ws.cell(row=8, column=c_idx, value=h)
        cell.font = f_bold; cell.alignment = Alignment(horizontal="center", vertical="center")
        cell.fill = fill_header; cell.border = thin_border
        
    df_stats = generate_shift_statistics(df_assigned, subject_col)
    cur_row = 9
    for _, r in df_stats.iterrows():
        ws.row_dimensions[cur_row].height = 22
        ws.cell(row=cur_row, column=1, value=r['TT']).alignment = Alignment(horizontal="center")
        ws.cell(row=cur_row, column=2, value=str(r['Phòng'])).alignment = Alignment(horizontal="center")
        ws.cell(row=cur_row, column=3, value=str(r['Các môn'])).alignment = Alignment(horizontal="left")
        ws.cell(row=cur_row, column=4, value=int(r['Tổng số thí sinh'])).alignment = Alignment(horizontal="center")
        for col in range(1, 5):
            ws.cell(row=cur_row, column=col).font = f_cell
            ws.cell(row=cur_row, column=col).border = thin_border
        cur_row += 1
        
    # 4. Tổng cộng
    ws.row_dimensions[cur_row].height = 24
    ws.cell(row=cur_row, column=2, value="TỔNG CỘNG").alignment = Alignment(horizontal="center")
    overall_counts = df_assigned[subject_col].value_counts()
    ws.cell(row=cur_row, column=3, value=", ".join([f"{s}: {c}" for s, c in overall_counts.items()])).alignment = Alignment(horizontal="left")
    ws.cell(row=cur_row, column=4, value=len(df_assigned)).alignment = Alignment(horizontal="center")
    for col in range(1, 5):
        c_box = ws.cell(row=cur_row, column=col)
        c_box.font = f_bold; c_box.fill = fill_total; c_box.border = thin_border
    cur_row += 1
    
    # 5. Chữ ký
    date_r = cur_row + 2
    ws.cell(row=date_r, column=3, value="Ngày ..... tháng ..... năm 20.....").font = f_italic
    ws.merge_cells(start_row=date_r, start_column=3, end_row=date_r, end_column=4)
    sig_r = date_r + 1
    ws.cell(row=sig_r, column=1, value="NGƯỜI LẬP BẢNG").font = f_bold; ws.merge_cells(start_row=sig_r, start_column=1, end_row=sig_r, end_column=2)
    ws.cell(row=sig_r, column=3, value="CHỦ TỊCH HỘI ĐỒNG / TRƯỞNG ĐIỂM THI").font = f_bold; ws.merge_cells(start_row=sig_r, start_column=3, end_row=sig_r, end_column=4)
    
    ws.column_dimensions['A'].width = 8
    ws.column_dimensions['B'].width = 18
    ws.column_dimensions['C'].width = 46
    ws.column_dimensions['D'].width = 22
    
    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return buf
`;


export const PythonCodeModal: React.FC<PythonCodeModalProps> = ({ onClose }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(PYTHON_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPy = () => {
    const blob = new Blob([PYTHON_CODE], { type: 'text/x-python;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'app.py';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadReqs = () => {
    const text = `streamlit>=1.30.0\npandas>=2.0.0\nopenpyxl>=3.1.2\nxlsxwriter>=3.1.0\n`;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'requirements.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div className="bg-slate-900 text-slate-100 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-700 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Toàn bộ Mã nguồn Python (app.py)</h3>
              <p className="text-xs text-slate-400">Streamlit + Pandas Data Analysis + Openpyxl Excel Automation</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Đã sao chép!' : 'Sao chép mã'}
            </button>

            <button
              type="button"
              onClick={handleDownloadPy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Tải app.py
            </button>

            <button
              type="button"
              onClick={handleDownloadReqs}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              requirements.txt
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer ml-2"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Command Quick guide */}
        <div className="bg-slate-950 px-6 py-2.5 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
          <div className="flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5 text-blue-400" />
            <span>Lệnh chạy: <strong className="text-emerald-400">streamlit run app.py</strong></span>
          </div>
          <span className="text-[11px] text-slate-500">Python 3.10+ | Pandas 2+ | Openpyxl 3.1+</span>
        </div>

        {/* Code Body */}
        <div className="p-6 overflow-y-auto font-mono text-xs text-slate-200 leading-relaxed bg-slate-950/60">
          <pre>
            <code>{PYTHON_CODE}</code>
          </pre>
        </div>
      </div>
    </div>
  );
};
