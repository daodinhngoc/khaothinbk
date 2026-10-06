# ==============================================================================
# HỆ THỐNG TỐI ƯU XẾP PHÒNG THI & XUẤT BIỂU MẪU EXCEL TỰ ĐỘNG
# Tác giả: Chuyên gia Phân tích Dữ liệu (Pandas) & Tự động hóa Excel (Openpyxl)
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
# 1. CẤU HÌNH TRANG STREAMLIT (PAGE CONFIG)
# ------------------------------------------------------------------------------
st.set_page_config(
    page_title="Hệ thống Tối ưu Xếp phòng thi & Xuất biểu mẫu",
    page_icon="📋",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Thêm tùy biến CSS cho giao diện Streamlit hiện đại, chỉn chu
st.markdown("""
    <style>
    .main-title {
        font-size: 2.1rem;
        font-weight: 700;
        color: #1e3a8a;
        margin-bottom: 0.2rem;
    }
    .sub-title {
        font-size: 1rem;
        color: #475569;
        margin-bottom: 1.5rem;
    }
    .metric-card {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 14px;
        text-align: center;
    }
    .stDownloadButton button {
        width: 100%;
        background-color: #0284c7 !important;
        color: white !important;
        font-weight: 600 !important;
        border-radius: 6px !important;
        height: 3rem !important;
    }
    </style>
""", unsafe_allow_html=True)


# ------------------------------------------------------------------------------
# 2. HÀM TẠO DỮ LIỆU MẪU (MOCK DATA GENERATOR - 684 THÍ SINH)
# ------------------------------------------------------------------------------
def generate_sample_candidate_data(total_candidates=684) -> pd.DataFrame:
    """
    Sinh danh sách thí sinh mẫu gồm 684 học sinh để test ngay ứng dụng.
    Cấu trúc cột: ['TT', 'SBD', 'CCD', 'Lớp', 'Họ tên', 'Ngày sinh', 'M1', 'M2', 'TC1', 'TC2']
    """
    import random
    
    ho = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Huỳnh", "Phan", "Vũ", "Võ", "Đặng", "Bùi", "Đỗ", "Hồ", "Ngô", "Dương"]
    dem = ["Văn", "Thị", "Hữu", "Đức", "Minh", "Thanh", "Quang", "Anh", "Bảo", "Gia", "Tuấn", "Hoài", "Phương"]
    ten = ["An", "Bình", "Cường", "Duy", "Hải", "Hương", "Khoa", "Linh", "Minh", "Nam", "Nhi", "Phúc", "Quân", "Sơn", "Tâm", "Thảo", "Trang", "Tùng", "Vinh", "Yến"]
    
    classes = ["12A1", "12A2", "12A3", "12B1", "12B2", "12C1", "12C2", "12D1"]
    
    # Các cặp môn tự chọn phổ biến (chú ý cố ý đảo chiều để kiểm thử chuẩn hóa)
    combo_pairs = [
        ("Vật lý", "Hóa học"),
        ("Hóa học", "Vật lý"),       # Sẽ được chuẩn hóa trùng cặp trên
        ("Vật lý", "Sinh học"),
        ("Lịch sử", "Địa lý"),
        ("Địa lý", "Lịch sử"),       # Sẽ được chuẩn hóa trùng cặp trên
        ("Lịch sử", "GDCD"),
        ("Hóa học", "Sinh học"),
    ]
    
    data = []
    for i in range(1, total_candidates + 1):
        full_name = f"{random.choice(ho)} {random.choice(dem)} {random.choice(ten)}"
        sbd = f"068{i:04d}"  # Mã SBD ví dụ: 0680001, 0680002...
        cccd = f"0642050{random.randint(10000, 99999)}"
        lop = random.choice(classes)
        day = random.randint(1, 28)
        month = random.randint(1, 12)
        dob = f"{day:02d}/{month:02d}/2008"
        
        tc1, tc2 = random.choice(combo_pairs)
        
        data.append({
            "TT": i,
            "SBD": sbd,
            "CCD": cccd,
            "Lớp": lop,
            "Họ tên": full_name,
            "Ngày sinh": dob,
            "M1": "Toán",
            "M2": "Ngữ văn",
            "TC1": tc1,
            "TC2": tc2
        })
        
    return pd.DataFrame(data)


# ------------------------------------------------------------------------------
# 3. THUẬT TOÁN XẾP PHÒNG THI TỐI ƯU (CORE ALGORITHM)
# ------------------------------------------------------------------------------
def standardize_combination(tc1: str, tc2: str) -> str:
    """
    Chuẩn hóa tổ hợp tự chọn:
    Sắp xếp hai môn theo bảng chữ cái và ghép thành chuỗi đồng nhất.
    Ví dụ: 'Vật lý' và 'Hóa học' -> 'Hóa học - Vật lý'
           'Hóa học' và 'Vật lý' -> 'Hóa học - Vật lý'
    """
    clean_tc1 = str(tc1).strip() if pd.notna(tc1) else ""
    clean_tc2 = str(tc2).strip() if pd.notna(tc2) else ""
    sorted_combo = sorted([clean_tc1, clean_tc2])
    return f"{sorted_combo[0]} - {sorted_combo[1]}"


def assign_rooms_for_compulsory_subjects(df_input: pd.DataFrame, max_per_room: int = 24):
    """
    Xếp phòng cho 2 môn bắt buộc (Toán & Ngữ văn - M1 & M2):
    Toàn bộ thí sinh (ví dụ 684 thí sinh) đều thi môn chung.
    Danh sách sắp xếp theo SBD tăng dần và phân bổ đều 24 HS/phòng.
    (684 HS -> 29 phòng: 28 phòng đầu 24 HS, phòng 29 có 12 HS).
    """
    df = df_input.copy()
    df['SBD'] = df['SBD'].astype(str)
    
    # Sắp xếp danh sách chung theo Số báo danh tăng dần
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


def optimize_exam_room_assignment(df_input: pd.DataFrame, max_per_room: int = 24):
    """
    Thực hiện quy trình xếp phòng thi tối ưu cho Môn tự chọn:
    1. Kiểm tra & chuẩn hóa cột dữ liệu.
    2. Ghép TC1 & TC2 thành tổ hợp chuẩn hóa không phân biệt thứ tự.
    3. Nhóm (Groupby) và sắp xếp học sinh theo Tổ hợp -> sau đó theo SBD tăng dần.
    4. Cắt phòng: Duyệt danh sách tuần tự và gán Phòng thi từ 1 đến N (không vượt quá max_per_room).
    5. Tách thành dữ liệu phục vụ CA 1 (TC1) và CA 2 (TC2).
    """
    df = df_input.copy()
    
    # 3.1 Chuẩn hóa tổ hợp tự chọn
    df['ToHop_ChuanHoa'] = df.apply(lambda r: standardize_combination(r.get('TC1', ''), r.get('TC2', '')), axis=1)
    
    # 3.2 Sắp xếp dữ liệu theo Tổ hợp chuẩn hóa -> sau đó theo Số báo danh (SBD)
    df['SBD'] = df['SBD'].astype(str)
    df = df.sort_values(by=['ToHop_ChuanHoa', 'SBD'], ascending=[True, True]).reset_index(drop=True)
    
    # 3.3 Phân bổ phòng thi
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
    
    # Cập nhật lại số thứ tự tổng thể (TT)
    df['TT'] = range(1, total_students + 1)
    
    return df, total_rooms


# ------------------------------------------------------------------------------
# 4. HÀM THỐNG KÊ THEO CA VÀ ĐỊNH DẠNG XUẤT EXCEL BẰNG OPENPYXL (CHUẨN IN ẤN A4)
# ------------------------------------------------------------------------------
def generate_shift_statistics(df_assigned: pd.DataFrame, subject_col: str) -> pd.DataFrame:
    """
    Tạo Bảng Thống kê Theo Ca (CA 1 hoặc CA 2):
    Cấu trúc gồm 4 cột chính:
    1. TT: Số thứ tự phòng (1, 2, ..., N)
    2. Phòng: Tên phòng thi ('Phòng 01', 'Phòng 02', ...)
    3. Các môn: Danh sách môn thi tự chọn trong phòng kèm số lượng (VD: 'Vật lý (14), Hóa học (10)')
    4. Tổng số thí sinh: Tổng số thí sinh dự thi trong phòng
    """
    records = []
    rooms = sorted(df_assigned['Phòng thi'].unique())
    
    for idx, room_no in enumerate(rooms, start=1):
        df_room = df_assigned[df_assigned['Phòng thi'] == room_no]
        total_in_room = len(df_room)
        
        # Đếm số lượng từng môn trong phòng
        subj_counts = df_room[subject_col].value_counts()
        # Định dạng chuỗi: "Vật lý (14), Hóa học (10)" hoặc "Vật lý (24)"
        subjects_detail = ", ".join([f"{subj} ({count})" for subj, count in subj_counts.items()])
        
        records.append({
            "TT": idx,
            "Phòng": f"Phòng {room_no:02d}",
            "Các môn": subjects_detail,
            "Tổng số thí sinh": total_in_room
        })
        
    return pd.DataFrame(records)


def export_shift_summary_openpyxl(
    df_assigned: pd.DataFrame,
    exam_title: str,
    shift_name: str,
    subject_col: str,
    dept_name: str = "SỞ GD&ĐT GIA LAI",
    school_name: str = "TRƯỜNG THPT CHUYÊN HÙNG VƯƠNG",
    exam_center_code: str = "068"
) -> io.BytesIO:
    """
    Xuất File Excel Bảng Thống kê Theo Ca 1 / Ca 2 bằng Openpyxl chuẩn A4.
    Cấu trúc:
    - Header đầy đủ Quốc hiệu, Tiêu ngữ, Sở GD&ĐT, Trường THPT.
    - Tiêu đề: BẢNG TỔNG HỢP THỐNG KÊ THÍ SINH DỰ THI THEO PHÒNG - [CA 1 / CA 2]
    - Thông tin: Kỳ thi, Năm học, Điểm thi.
    - Bảng 4 cột: ['TT', 'Phòng', 'Các môn', 'Tổng số thí sinh'].
    - Dòng tổng kết số lượng toàn ca và khu vực chữ ký Người lập bảng & Trưởng điểm thi.
    """
    wb = Workbook()
    ws = wb.active
    ws.title = f"ThongKe_{shift_name.replace(' ', '')}"
    
    # Cấu hình in khổ A4 dọc
    ws.page_setup.paperSize = ws.PAPERSIZE_A4
    ws.page_setup.orientation = ws.ORIENTATION_PORTRAIT
    ws.sheet_properties.pageSetUpPr.fitToPage = True
    ws.page_setup.fitToWidth = 1
    ws.page_setup.fitToHeight = 0
    ws.page_margins.left = 0.6
    ws.page_margins.right = 0.5
    ws.page_margins.top = 0.6
    ws.page_margins.bottom = 0.5
    
    font_header_bold = Font(name="Times New Roman", size=11, bold=True)
    font_title_main = Font(name="Times New Roman", size=13, bold=True)
    font_sub_info = Font(name="Times New Roman", size=11, bold=True)
    font_table_header = Font(name="Times New Roman", size=11, bold=True)
    font_table_cell = Font(name="Times New Roman", size=10)
    font_footer_italic = Font(name="Times New Roman", size=10, italic=True)
    
    thin_border_side = Side(border_style="thin", color="000000")
    table_cell_border = Border(
        left=thin_border_side, right=thin_border_side,
        top=thin_border_side, bottom=thin_border_side
    )
    header_fill = PatternFill(start_color="F1F5F9", end_color="F1F5F9", fill_type="solid")
    total_fill = PatternFill(start_color="E2E8F0", end_color="E2E8F0", fill_type="solid")
    
    align_center = Alignment(horizontal="center", vertical="center", wrap_text=True)
    align_left = Alignment(horizontal="left", vertical="center", wrap_text=True)
    
    # 1. Header cơ quan & Quốc hiệu
    ws['A1'] = dept_name.upper()
    ws['A1'].font = font_header_bold
    ws['A1'].alignment = align_center
    ws.merge_cells('A1:B1')
    
    ws['A2'] = school_name.upper()
    ws['A2'].font = Font(name="Times New Roman", size=10, bold=True, underline="single")
    ws['A2'].alignment = align_center
    ws.merge_cells('A2:B2')
    
    ws['C1'] = "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM"
    ws['C1'].font = font_header_bold
    ws['C1'].alignment = align_center
    ws.merge_cells('C1:D1')
    
    ws['C2'] = "Độc lập - Tự do - Hạnh phúc"
    ws['C2'].font = Font(name="Times New Roman", size=10, bold=True, underline="single")
    ws['C2'].alignment = align_center
    ws.merge_cells('C2:D2')
    
    # 2. Tiêu đề chính
    ws['A4'] = f"BẢNG TỔNG HỢP THỐNG KÊ THÍ SINH DỰ THI THEO PHÒNG - {shift_name.upper()}"
    ws['A4'].font = font_title_main
    ws['A4'].alignment = align_center
    ws.merge_cells('A4:D4')
    
    ws['A5'] = f"KỲ THI: {exam_title.upper()} - MÔN THI: {subject_col.upper()}"
    ws['A5'].font = font_sub_info
    ws['A5'].alignment = align_center
    ws.merge_cells('A5:D5')
    
    rooms = sorted(df_assigned['Phòng thi'].unique())
    total_candidates = len(df_assigned)
    ws['A6'] = f"Điểm thi: {exam_center_code}   |   Hội đồng coi thi: {school_name}   |   Tổng số: {len(rooms)} phòng ({total_candidates} thí sinh)"
    ws['A6'].font = Font(name="Times New Roman", size=10, italic=True)
    ws['A6'].alignment = align_center
    ws.merge_cells('A6:D6')
    
    # 3. Bảng dữ liệu thống kê (4 cột)
    headers = ['TT', 'Phòng', 'Các môn', 'Tổng số thí sinh']
    start_row = 8
    ws.row_dimensions[start_row].height = 26
    
    for col_idx, h in enumerate(headers, start=1):
        cell = ws.cell(row=start_row, column=col_idx, value=h)
        cell.font = font_table_header
        cell.alignment = align_center
        cell.fill = header_fill
        cell.border = table_cell_border
        
    df_stats = generate_shift_statistics(df_assigned, subject_col)
    current_row = start_row + 1
    
    for _, r in df_stats.iterrows():
        ws.row_dimensions[current_row].height = 22
        
        ws.cell(row=current_row, column=1, value=r['TT']).alignment = align_center
        ws.cell(row=current_row, column=2, value=str(r['Phòng'])).alignment = align_center
        ws.cell(row=current_row, column=3, value=str(r['Các môn'])).alignment = align_left
        ws.cell(row=current_row, column=4, value=int(r['Tổng số thí sinh'])).alignment = align_center
        
        for c in range(1, 5):
            cell = ws.cell(row=current_row, column=c)
            cell.font = font_table_cell
            cell.border = table_cell_border
        current_row += 1
        
    # 4. Dòng tổng cộng
    total_row = current_row
    ws.row_dimensions[total_row].height = 24
    
    ws.cell(row=total_row, column=1, value="").alignment = align_center
    ws.cell(row=total_row, column=2, value="TỔNG CỘNG").alignment = align_center
    
    overall_counts = df_assigned[subject_col].value_counts()
    overall_summary_str = ", ".join([f"{s}: {c}" for s, c in overall_counts.items()])
    ws.cell(row=total_row, column=3, value=overall_summary_str).alignment = align_left
    ws.cell(row=total_row, column=4, value=total_candidates).alignment = align_center
    
    for c in range(1, 5):
        cell = ws.cell(row=total_row, column=c)
        cell.font = font_header_bold
        cell.fill = total_fill
        cell.border = table_cell_border
    current_row += 1
    
    # 5. Khu vực chữ ký
    date_row = current_row + 2
    ws.cell(row=date_row, column=3, value="Ngày ..... tháng ..... năm 20.....").font = font_footer_italic
    ws.cell(row=date_row, column=3).alignment = align_center
    ws.merge_cells(start_row=date_row, start_column=3, end_row=date_row, end_column=4)
    
    sig_row = date_row + 1
    ws.cell(row=sig_row, column=1, value="NGƯỜI LẬP BẢNG").font = font_header_bold
    ws.cell(row=sig_row, column=1).alignment = align_center
    ws.merge_cells(start_row=sig_row, start_column=1, end_row=sig_row, end_column=2)
    
    ws.cell(row=sig_row + 1, column=1, value="(Ký và ghi rõ họ tên)").font = font_footer_italic
    ws.cell(row=sig_row + 1, column=1).alignment = align_center
    ws.merge_cells(start_row=sig_row + 1, start_column=1, end_row=sig_row + 1, end_column=2)
    
    ws.cell(row=sig_row, column=3, value="CHỦ TỊCH HỘI ĐỒNG / TRƯỞNG ĐIỂM THI").font = font_header_bold
    ws.cell(row=sig_row, column=3).alignment = align_center
    ws.merge_cells(start_row=sig_row, start_column=3, end_row=sig_row, end_column=4)
    
    ws.cell(row=sig_row + 1, column=3, value="(Ký, đóng dấu và ghi rõ họ tên)").font = font_footer_italic
    ws.cell(row=sig_row + 1, column=3).alignment = align_center
    ws.merge_cells(start_row=sig_row + 1, start_column=3, end_row=sig_row + 1, end_column=4)
    
    # Độ rộng cột
    ws.column_dimensions['A'].width = 8
    ws.column_dimensions['B'].width = 18
    ws.column_dimensions['C'].width = 46
    ws.column_dimensions['D'].width = 22
    
    output_stream = io.BytesIO()
    wb.save(output_stream)
    output_stream.seek(0)
    return output_stream


def export_attendance_sheet_openpyxl(

    df_assigned: pd.DataFrame,
    exam_title: str,
    shift_name: str,
    subject_col: str,
    dept_name: str = "SỞ GD&ĐT GIA LAI",
    exam_center_code: str = "068"
) -> io.BytesIO:
    """
    Hàm tự động sinh file Excel Phiếu thu bài thi / Danh sách dán phòng đạt chuẩn A4.
    Mỗi phòng thi được tạo trên một Sheet riêng biệt để in ấn ngay.
    
    Đặc tả kỹ thuật Openpyxl:
    - Sử dụng Font Times New Roman hoặc Arial đồng bộ.
    - Hàm merge_cells: Ghép ô cho Tiêu ngữ, Quốc hiệu, Tên Sở, Tên Kỳ thi, Header phòng thi.
    - Border: Kẻ viền đen mỏng (thin) cho toàn bộ bảng thí sinh và viền đôi (double) nếu cần.
    - Footer: Thống kê số lượng bài thu, ghi chú giám thị và khu vực ký tên 2 Giám thị.
    - Cấu hình trang in: Khổ giấy A4, hướng giấy Dọc (Portrait), căn giữa theo chiều ngang (fit to page).
    """
    wb = Workbook()
    # Xóa sheet mặc định ban đầu
    wb.remove(wb.active)
    
    # Định nghĩa các style dùng chung
    font_header_bold = Font(name="Times New Roman", size=11, bold=True)
    font_header_regular = Font(name="Times New Roman", size=10, italic=True)
    font_title_main = Font(name="Times New Roman", size=14, bold=True, color="000000")
    font_sub_info = Font(name="Times New Roman", size=11, bold=True)
    font_table_header = Font(name="Times New Roman", size=10, bold=True)
    font_table_cell = Font(name="Times New Roman", size=10)
    font_table_cell_center = Font(name="Times New Roman", size=10)
    font_footer_italic = Font(name="Times New Roman", size=10, italic=True)
    font_signature_title = Font(name="Times New Roman", size=10, bold=True)
    
    # Định nghĩa Border (Đường viền)
    thin_border_side = Side(border_style="thin", color="000000")
    table_cell_border = Border(
        left=thin_border_side,
        right=thin_border_side,
        top=thin_border_side,
        bottom=thin_border_side
    )
    
    # Định nghĩa Background fill cho Header bảng
    header_fill = PatternFill(start_color="F1F5F9", end_color="F1F5F9", fill_type="solid")
    
    # Căn lề chuẩn
    align_center = Alignment(horizontal="center", vertical="center", wrap_text=True)
    align_left = Alignment(horizontal="left", vertical="center")
    align_right = Alignment(horizontal="right", vertical="center")
    
    # Lấy danh sách các phòng thi
    rooms = sorted(df_assigned['Phòng thi'].unique())
    
    for room_no in rooms:
        df_room = df_assigned[df_assigned['Phòng thi'] == room_no].copy()
        # Sắp xếp thí sinh trong phòng: Nhóm theo môn thi của ca hiện tại, trong từng môn sắp SBD tăng dần
        df_room['SBD_num'] = pd.to_numeric(df_room['SBD'], errors='coerce')
        df_room = df_room.sort_values(by=[subject_col, 'SBD_num', 'SBD']).drop(columns=['SBD_num'])
        
        # Đặt tên sheet ngắn gọn, thân thiện (Excel giới hạn tối đa 31 ký tự)
        sheet_title = f"Phòng_{room_no:02d}"
        ws = wb.create_sheet(title=sheet_title)
        
        # -------------------------------------------------------------
        # CẤU HÌNH TRANG IN (PAGE SETUP) CHO KHỔ A4
        # -------------------------------------------------------------
        ws.page_setup.paperSize = ws.PAPERSIZE_A4
        ws.page_setup.orientation = ws.ORIENTATION_PORTRAIT
        ws.sheet_properties.pageSetUpPr.fitToPage = True
        ws.page_setup.fitToWidth = 1
        ws.page_setup.fitToHeight = 0
        
        # Căn lề trang in (Margins tính theo inches)
        ws.page_margins.left = 0.5
        ws.page_margins.right = 0.4
        ws.page_margins.top = 0.6
        ws.page_margins.bottom = 0.5
        
        # -------------------------------------------------------------
        # 4.1 PHẦN HEADER: QUỐC HIỆU, TIÊU NGỮ & ĐƠN VỊ
        # -------------------------------------------------------------
        # Dòng 1 & Dòng 2 bên trái: Tên Sở & Tên đơn vị / Trường
        ws['A1'] = dept_name.upper()
        ws['A1'].font = font_header_bold
        ws['A1'].alignment = align_center
        ws.merge_cells('A1:D1')
        
        ws['A2'] = "TRƯỜNG THPT CHUYÊN HÙNG VƯƠNG"
        ws['A2'].font = Font(name="Times New Roman", size=10, bold=True, underline="single")
        ws['A2'].alignment = align_center
        ws.merge_cells('A2:D2')
        
        # Dòng 1 & Dòng 2 bên phải: Quốc hiệu & Tiêu ngữ
        ws['E1'] = "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM"
        ws['E1'].font = font_header_bold
        ws['E1'].alignment = align_center
        ws.merge_cells('E1:H1')
        
        ws['E2'] = "Độc lập - Tự do - Hạnh phúc"
        ws['E2'].font = Font(name="Times New Roman", size=10, bold=True, underline="single")
        ws['E2'].alignment = align_center
        ws.merge_cells('E2:H2')
        
        # Dòng 4: TIÊU ĐỀ CHÍNH CỦA BIỂU MẪU
        ws['A4'] = "DANH SÁCH THÍ SINH DÁN PHÒNG & PHIẾU THU BÀI THI"
        ws['A4'].font = font_title_main
        ws['A4'].alignment = align_center
        ws.merge_cells('A4:H4')
        
        # Dòng 5: Kỳ thi & Ca thi
        ws['A5'] = f"KỲ THI: {exam_title.upper()} - {shift_name.upper()}"
        ws['A5'].font = font_sub_info
        ws['A5'].alignment = align_center
        ws.merge_cells('A5:H5')
        
        # Lấy môn thi của phòng (xem xét môn trong ca thi)
        sample_mon = df_room[subject_col].iloc[0] if len(df_room) > 0 else ""
        unique_mons = df_room[subject_col].unique()
        mon_str = ", ".join([str(m) for m in unique_mons if pd.notna(m)])
        
        # Dòng 6: Thông tin Điểm thi, Phòng thi, Môn thi
        ws['A6'] = f"Điểm thi: {exam_center_code}   |   Phòng thi số: {room_no:02d}   |   Môn thi: {mon_str}"
        ws['A6'].font = font_sub_info
        ws['A6'].alignment = align_center
        ws.merge_cells('A6:H6')
        
        # -------------------------------------------------------------
        # 4.2 PHẦN BẢNG DỮ LIỆU THÍ SINH (TABLE DATA)
        # -------------------------------------------------------------
        headers = [
            'STT', 
            'Số báo danh', 
            'Họ và tên thí sinh', 
            'Ngày sinh', 
            'Lớp', 
            'Mã đề thi/ Số tờ', 
            'Ký nộp', 
            'Ghi chú'
        ]
        
        start_row = 8
        ws.row_dimensions[start_row].height = 28
        
        # Ghi Header của Bảng
        for col_idx, header_text in enumerate(headers, start=1):
            cell = ws.cell(row=start_row, column=col_idx, value=header_text)
            cell.font = font_table_header
            cell.alignment = align_center
            cell.fill = header_fill
            cell.border = table_cell_border
            
        # Ghi từng hàng dữ liệu thí sinh trong phòng
        current_row = start_row + 1
        for idx, (_, row_data) in enumerate(df_room.iterrows(), start=1):
            ws.row_dimensions[current_row].height = 22  # Chiều cao vừa vặn dòng viết tay
            
            # Cột 1: STT trong phòng
            c1 = ws.cell(row=current_row, column=1, value=idx)
            c1.alignment = align_center
            
            # Cột 2: SBD
            c2 = ws.cell(row=current_row, column=2, value=str(row_data.get('SBD', '')))
            c2.alignment = align_center
            
            # Cột 3: Họ và tên thí sinh
            c3 = ws.cell(row=current_row, column=3, value=str(row_data.get('Họ tên', '')))
            c3.alignment = align_left
            
            # Cột 4: Ngày sinh
            c4 = ws.cell(row=current_row, column=4, value=str(row_data.get('Ngày sinh', '')))
            c4.alignment = align_center
            
            # Cột 5: Lớp
            c5 = ws.cell(row=current_row, column=5, value=str(row_data.get('Lớp', '')))
            c5.alignment = align_center
            
            # Cột 6: Mã đề / Số tờ (Để trống cho Giám thị ghi khi thu bài)
            c6 = ws.cell(row=current_row, column=6, value="")
            c6.alignment = align_center
            
            # Cột 7: Ký nộp (Để trống cho thí sinh ký)
            c7 = ws.cell(row=current_row, column=7, value="")
            c7.alignment = align_center
            
            # Cột 8: Ghi chú (Thống nhất ghi rõ môn tự chọn cho 100% các phòng thi CA 1 / CA 2)
            ghi_chu = f"Môn: {row_data.get(subject_col, '')}"
            c8 = ws.cell(row=current_row, column=8, value=ghi_chu)
            c8.alignment = align_left
            
            # Đóng khung viền (border) và gán font cho tất cả các ô trong hàng
            for col_idx in range(1, 9):
                cell = ws.cell(row=current_row, column=col_idx)
                cell.border = table_cell_border
                cell.font = font_table_cell
                
            current_row += 1
            
        # -------------------------------------------------------------
        # 4.3 PHẦN FOOTER: THỐNG KÊ, NHẮC NHỞ & CHỮ KÝ GIÁM THỊ
        # -------------------------------------------------------------
        total_students_room = len(df_room)
        
        # Dòng tổng hợp số lượng thí sinh
        sum_row = current_row + 1
        ws.cell(row=sum_row, column=1, value=f"- Tổng số thí sinh theo danh sách phòng thi: {total_students_room:02d} thí sinh.")
        ws.cell(row=sum_row, column=1).font = font_header_bold
        ws.merge_cells(start_row=sum_row, start_column=1, end_row=sum_row, end_column=8)
        
        # Dòng ghi chú giám thị kiểm đếm
        sum_row2 = sum_row + 1
        ws.cell(row=sum_row2, column=1, value="- Số thí sinh có mặt: .......... | Số thí sinh vắng: .......... (Số báo danh vắng: .......................................)")
        ws.cell(row=sum_row2, column=1).font = font_header_bold
        ws.merge_cells(start_row=sum_row2, start_column=1, end_row=sum_row2, end_column=8)
        
        # Dòng nhắc nhở giám thị
        note_row = sum_row2 + 1
        ws.cell(row=note_row, column=1, value="* Lưu ý: Giám thị kiểm tra kỹ SBD, số tờ giấy thi và yêu cầu thí sinh ký nộp bài đầy đủ trước khi rời phòng thi.")
        ws.cell(row=note_row, column=1).font = font_footer_italic
        ws.merge_cells(start_row=note_row, start_column=1, end_row=note_row, end_column=8)
        
        # Khu vực chữ ký Giám thị 1 và Giám thị 2
        sig_date_row = note_row + 2
        ws.cell(row=sig_date_row, column=6, value="Ngày ..... tháng ..... năm 20.....")
        ws.cell(row=sig_date_row, column=6).font = font_footer_italic
        ws.cell(row=sig_date_row, column=6).alignment = align_center
        ws.merge_cells(start_row=sig_date_row, start_column=6, end_row=sig_date_row, end_column=8)
        
        sig_title_row = sig_date_row + 1
        # Cán bộ coi thi 1
        ws.cell(row=sig_title_row, column=2, value="CÁN BỘ COI THI 1")
        ws.cell(row=sig_title_row, column=2).font = font_signature_title
        ws.cell(row=sig_title_row, column=2).alignment = align_center
        ws.merge_cells(start_row=sig_title_row, start_column=2, end_row=sig_title_row, end_column=3)
        
        ws.cell(row=sig_title_row + 1, column=2, value="(Ký và ghi rõ họ tên)")
        ws.cell(row=sig_title_row + 1, column=2).font = font_footer_italic
        ws.cell(row=sig_title_row + 1, column=2).alignment = align_center
        ws.merge_cells(start_row=sig_title_row + 1, start_column=2, end_row=sig_title_row + 1, end_column=3)
        
        # Cán bộ coi thi 2
        ws.cell(row=sig_title_row, column=6, value="CÁN BỘ COI THI 2")
        ws.cell(row=sig_title_row, column=6).font = font_signature_title
        ws.cell(row=sig_title_row, column=6).alignment = align_center
        ws.merge_cells(start_row=sig_title_row, start_column=6, end_row=sig_title_row, end_column=8)
        
        ws.cell(row=sig_title_row + 1, column=6, value="(Ký và ghi rõ họ tên)")
        ws.cell(row=sig_title_row + 1, column=6).font = font_footer_italic
        ws.cell(row=sig_title_row + 1, column=6).alignment = align_center
        ws.merge_cells(start_row=sig_title_row + 1, start_column=6, end_row=sig_title_row + 1, end_column=8)
        
        # Thiết lập độ rộng cột (Column Widths) lý tưởng cho in giấy A4
        col_widths = {
            'A': 6,    # STT
            'B': 13,   # SBD
            'C': 26,   # Họ và tên
            'D': 13,   # Ngày sinh
            'E': 9,    # Lớp
            'F': 16,   # Mã đề thi/ Số tờ
            'G': 14,   # Ký nộp
            'H': 18    # Ghi chú
        }
        for col_name, width in col_widths.items():
            ws.column_dimensions[col_name].width = width
            
    # Lưu workbook vào buffer bộ nhớ BytesIO để trả về client tải về
    output_stream = io.BytesIO()
    wb.save(output_stream)
    output_stream.seek(0)
    return output_stream


def export_overall_list_excel(df_assigned: pd.DataFrame) -> io.BytesIO:
    """
    Xuất File 1: Danh sách chia phòng tổng thể kèm cột 'Phòng thi',
    sử dụng Pandas và ExcelWriter với định dạng tự động chỉnh độ rộng cột.
    """
    output_stream = io.BytesIO()
    with pd.ExcelWriter(output_stream, engine='openpyxl') as writer:
        # Sắp xếp theo Phòng thi và SBD
        export_df = df_assigned.sort_values(by=['Phòng thi', 'SBD']).copy()
        export_df.to_excel(writer, index=False, sheet_name="Danh_Sach_Tong_The")
        
        # Tự động canh chỉnh kích thước cột
        ws = writer.sheets["Danh_Sach_Tong_The"]
        for col in ws.columns:
            max_len = max(len(str(cell.value or '')) for cell in col)
            col_letter = get_column_letter(col[0].column)
            ws.column_dimensions[col_letter].width = max(max_len + 3, 11)
            
    output_stream.seek(0)
    return output_stream


# ------------------------------------------------------------------------------
# 5. GIAO DIỆN CHÍNH STREAMLIT (UI FLOW)
# ------------------------------------------------------------------------------
def main():
    st.markdown('<div class="main-title">🏛️ Hệ thống Tối ưu Xếp phòng thi & Xuất biểu mẫu</div>', unsafe_allow_html=True)
    st.markdown('<div class="sub-title">Tự động gom nhóm tổ hợp môn tự chọn, chia phòng thi chuẩn hóa và xuất biểu mẫu A4 với Openpyxl</div>', unsafe_allow_html=True)
    
    # --------------------------------------------------------------------------
    # SIDEBAR: CẤU HÌNH VÀ TẢI DỮ LIỆU
    # --------------------------------------------------------------------------
    with st.sidebar:
        st.header("⚙️ Cấu hình Kỳ thi & Dữ liệu")
        
        # 1. Loại kỳ thi
        exam_category = st.selectbox(
            "Loại kỳ thi:",
            options=["1. Kiểm tra định kỳ", "2. Thi thử / Khảo sát"],
            index=0
        )
        
        # Phụ lục theo loại kỳ thi
        if exam_category == "1. Kiểm tra định kỳ":
            sub_exam = st.selectbox("Giai đoạn kiểm tra:", options=["Giữa kỳ", "Cuối kỳ"])
            full_exam_title = f"Kiểm tra định kỳ ({sub_exam})"
        else:
            sub_exam = st.selectbox("Đợt khảo sát:", options=["Lần 1", "Lần 2", "Lần 3"])
            full_exam_title = f"Thi thử / Khảo sát ({sub_exam})"
            
        st.divider()
        
        # 2. Số thí sinh tối đa mỗi phòng
        max_per_room = st.number_input(
            "Số thí sinh tối đa / phòng:",
            min_value=12,
            max_value=50,
            value=24,
            step=1,
            help="Thông thường các kỳ thi chuẩn định mức 24 thí sinh/phòng."
        )
        
        # 3. Tùy chọn nâng cao (Mã điểm thi, Sở GD)
        with st.expander("Tùy chọn thông tin Tiêu đề In ấn", expanded=False):
            dept_input = st.text_input("Tên Sở GD&ĐT:", value="SỞ GD&ĐT GIA LAI")
            center_code = st.text_input("Mã Điểm thi:", value="068")
            
        st.divider()
        
        # 4. Upload file dữ liệu đầu vào
        st.subheader("📂 Dữ liệu Thí sinh")
        uploaded_file = st.file_uploader(
            "Tải lên file Excel danh sách thí sinh (.xlsx, .xls):",
            type=["xlsx", "xls"]
        )
        
        # Nút dùng dữ liệu mẫu
        use_sample = st.button("🧪 Sử dụng dữ liệu mẫu (684 thí sinh)")
        
    # --------------------------------------------------------------------------
    # XỬ LÝ NẠP DỮ LIỆU (DATA INGESTION)
    # --------------------------------------------------------------------------
    df_raw = None
    
    if uploaded_file is not None:
        try:
            df_raw = pd.read_excel(uploaded_file)
            st.sidebar.success(f"✅ Đã tải file: {len(df_raw)} thí sinh.")
        except Exception as e:
            st.error(f"❌ Lỗi khi đọc file Excel: {e}")
            return
    elif use_sample or "sample_df" in st.session_state:
        if "sample_df" not in st.session_state or use_sample:
            st.session_state["sample_df"] = generate_sample_candidate_data(684)
        df_raw = st.session_state["sample_df"]
        st.info("ℹ️ Đang sử dụng dữ liệu mẫu gồm 684 thí sinh từ THPT Chuyên Hùng Vương.")
    
    # --------------------------------------------------------------------------
    # HIỂN THỊ DỮ LIỆU & NÚT THỰC HIỆN XẾP PHÒNG
    # --------------------------------------------------------------------------
    if df_raw is not None:
        # Kiểm tra các cột cốt lõi
        required_cols = ['TT', 'SBD', 'CCD', 'Lớp', 'Họ tên', 'Ngày sinh', 'M1', 'M2', 'TC1', 'TC2']
        missing_cols = [c for c in required_cols if c not in df_raw.columns]
        
        if missing_cols:
            st.warning(f"⚠️ Dữ liệu tải lên thiếu các cột chuẩn: {missing_cols}. Hệ thống sẽ cố gắng thích ứng các cột sẵn có.")
        
        # Hiển thị Preview dữ liệu thô
        with st.expander("👀 Xem trước danh sách thí sinh đầu vào (Top 10 dòng)", expanded=False):
            st.dataframe(df_raw.head(10), use_container_width=True)
            
        col_btn, _ = st.columns([1, 2])
        with col_btn:
            run_btn = st.button("🚀 Thực hiện Xếp Phòng", type="primary", use_container_width=True)
            
        if run_btn or ("assigned_df" in st.session_state and st.session_state.get("last_max") == max_per_room):
            # Tiến hành thuật toán xếp phòng
            with st.spinner("Đang phân tích tổ hợp môn và tối ưu hóa số phòng..."):
                df_assigned, total_rooms = optimize_exam_room_assignment(df_raw, max_per_room=max_per_room)
                st.session_state["assigned_df"] = df_assigned
                st.session_state["total_rooms"] = total_rooms
                st.session_state["last_max"] = max_per_room
                
            st.success(f"🎉 Hoàn thành xếp phòng thành công! Đã phân phối {len(df_assigned)} thí sinh vào {total_rooms} phòng thi.")
            
            # ------------------------------------------------------------------
            # THỐNG KÊ TRỰC QUAN (METRICS & CHARTS)
            # ------------------------------------------------------------------
            m1, m2, m3, m4 = st.columns(4)
            last_room_count = len(df_assigned[df_assigned['Phòng thi'] == total_rooms])
            combo_counts = df_assigned['ToHop_ChuanHoa'].nunique()
            
            m1.metric("Tổng số thí sinh", f"{len(df_assigned):,} HS")
            m2.metric("Tổng số phòng thi", f"{total_rooms} Phòng")
            m3.metric("Số tổ hợp tự chọn", f"{combo_counts} Tổ hợp")
            m4.metric("Thí sinh phòng cuối", f"{last_room_count} / {max_per_room} HS")
            
            st.divider()
            
            # ------------------------------------------------------------------
            # XUẤT 3 FILE EXCEL THEO ĐÚNG YÊU CẦU ĐỀ BÀI
            # ------------------------------------------------------------------
            st.subheader("📥 Xuất file Dữ liệu & Biểu mẫu In ấn")
            
            col1, col2, col3 = st.columns(3)
            
            # FILE 1: Danh sách chia phòng tổng thể
            with col1:
                st.markdown("**File 1: Danh sách chia phòng tổng thể**")
                st.caption("Dữ liệu thô kèm cột 'Phòng thi' và 'Tổ hợp chuẩn hóa'.")
                file1_bytes = export_overall_list_excel(df_assigned)
                st.download_button(
                    label="📥 Tải File 1: Danh sách tổng thể (.xlsx)",
                    data=file1_bytes,
                    file_name="File1_Danh_Sach_Chia_Phong_Tong_The.xlsx",
                    mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    key="dl_file1"
                )
                
            # FILE 2: Phiếu thu bài CA 1 (Môn TC1)
            with col2:
                st.markdown("**File 2: Mẫu Phiếu thu bài / Dán phòng (CA 1)**")
                st.caption("Thi môn tự chọn 1 (TC1). Mỗi phòng 1 Sheet chuẩn A4.")
                file2_bytes = export_attendance_sheet_openpyxl(
                    df_assigned=df_assigned,
                    exam_title=full_exam_title,
                    shift_name="CA 1",
                    subject_col="TC1",
                    dept_name=dept_input,
                    exam_center_code=center_code
                )
                st.download_button(
                    label="📥 Tải File 2: Phiếu thu bài CA 1 (.xlsx)",
                    data=file2_bytes,
                    file_name="File2_Phieu_Thu_Bai_CA1_TC1.xlsx",
                    mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    key="dl_file2"
                )
                
            # FILE 3: Phiếu thu bài CA 2 (Môn TC2)
            with col3:
                st.markdown("**File 3: Mẫu Phiếu thu bài / Dán phòng (CA 2)**")
                st.caption("Thi môn tự chọn 2 (TC2). Mỗi phòng 1 Sheet chuẩn A4.")
                file3_bytes = export_attendance_sheet_openpyxl(
                    df_assigned=df_assigned,
                    exam_title=full_exam_title,
                    shift_name="CA 2",
                    subject_col="TC2",
                    dept_name=dept_input,
                    exam_center_code=center_code
                )
                st.download_button(
                    label="📥 Tải File 3: Phiếu thu bài CA 2 (.xlsx)",
                    data=file3_bytes,
                    file_name="File3_Phieu_Thu_Bai_CA2_TC2.xlsx",
                    mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    key="dl_file3"
                )
                
            # ------------------------------------------------------------------
            # KHU VỰC BỔ SUNG ĐẶC BIỆT: 2 MÔN BẮT BUỘC (M1: NGỮ VĂN & M2: TOÁN)
            # ------------------------------------------------------------------
            st.markdown("---")
            st.markdown("##### 📚 Môn thi bắt buộc: Ngữ văn (M1) & Toán (M2) — Tất cả thí sinh chung phòng")
            st.caption("Cả 2 môn bắt buộc thi chung danh sách xếp theo SBD tăng dần (24 thí sinh/phòng).")
            
            df_compulsory, total_comp_rooms = assign_rooms_for_compulsory_subjects(df_raw, max_per_room=max_per_room)
            
            c_comp1, c_comp2, c_comp3 = st.columns(3)
            with c_comp1:
                st.markdown("**Phiếu thu bài: Môn Ngữ văn (M1)**")
                st.caption(f"Tất cả {len(df_compulsory)} thí sinh ({total_comp_rooms} phòng).")
                van_bytes = export_attendance_sheet_openpyxl(
                    df_assigned=df_compulsory,
                    exam_title=full_exam_title,
                    shift_name="Môn bắt buộc",
                    subject_col="M1",
                    dept_name=dept_input,
                    exam_center_code=center_code
                )
                st.download_button(
                    label="📥 Tải Phiếu thu bài Ngữ văn (.xlsx)",
                    data=van_bytes,
                    file_name="File1_Phieu_Thu_Bai_NguVan.xlsx",
                    mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    key="dl_phieu_nguvan"
                )
            with c_comp2:
                st.markdown("**Phiếu thu bài: Môn Toán (M2)**")
                st.caption(f"Tất cả {len(df_compulsory)} thí sinh ({total_comp_rooms} phòng).")
                toan_bytes = export_attendance_sheet_openpyxl(
                    df_assigned=df_compulsory,
                    exam_title=full_exam_title,
                    shift_name="Môn bắt buộc",
                    subject_col="M2",
                    dept_name=dept_input,
                    exam_center_code=center_code
                )
                st.download_button(
                    label="📥 Tải Phiếu thu bài Toán (.xlsx)",
                    data=toan_bytes,
                    file_name="File1_Phieu_Thu_Bai_Toan.xlsx",
                    mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    key="dl_phieu_toan"
                )
            with c_comp3:
                st.markdown("**Bảng thống kê: Môn chung (Bắt buộc)**")
                st.caption("Tổng hợp thống kê phòng thi cho môn Ngữ văn / Toán.")
                stat_comp_bytes = export_shift_summary_openpyxl(
                    df_assigned=df_compulsory,
                    exam_title=full_exam_title,
                    shift_name="Môn chung (Toán - Ngữ văn)",
                    subject_col="M1",
                    dept_name=dept_input,
                    school_name="TRƯỜNG THPT CHUYÊN HÙNG VƯƠNG",
                    exam_center_code=center_code
                )
                st.download_button(
                    label="📥 Tải Bảng thống kê Môn chung (.xlsx)",
                    data=stat_comp_bytes,
                    file_name="Bang_Thong_Ke_Mon_Chung.xlsx",
                    mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    key="dl_stat_mon_chung"
                )

            # KHU VỰC BỔ SUNG: BẢNG THỐNG KÊ CA 1 & CA 2
            st.markdown("---")
            st.markdown("##### 📊 Bảng Thống kê Theo Phòng: Ca 1 & Ca 2 (Cột: TT, Phòng, Các môn, Tổng số thí sinh)")
            c_stat1, c_stat2 = st.columns(2)
            with c_stat1:
                stat_ca1_bytes = export_shift_summary_openpyxl(
                    df_assigned=df_assigned,
                    exam_title=full_exam_title,
                    shift_name="CA 1",
                    subject_col="TC1",
                    dept_name=dept_input,
                    school_name="TRƯỜNG THPT CHUYÊN HÙNG VƯƠNG",
                    exam_center_code=center_code
                )
                st.download_button(
                    label="📥 Tải Excel: Bảng Thống kê Ca 1 (Môn TC1)",
                    data=stat_ca1_bytes,
                    file_name="Bang_Thong_Ke_Phong_Thi_CA1_TC1.xlsx",
                    mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    key="dl_stat_ca1"
                )
            with c_stat2:
                stat_ca2_bytes = export_shift_summary_openpyxl(
                    df_assigned=df_assigned,
                    exam_title=full_exam_title,
                    shift_name="CA 2",
                    subject_col="TC2",
                    dept_name=dept_input,
                    school_name="TRƯỜNG THPT CHUYÊN HÙNG VƯƠNG",
                    exam_center_code=center_code
                )
                st.download_button(
                    label="📥 Tải Excel: Bảng Thống kê Ca 2 (Môn TC2)",
                    data=stat_ca2_bytes,
                    file_name="Bang_Thong_Ke_Phong_Thi_CA2_TC2.xlsx",
                    mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    key="dl_stat_ca2"
                )
                
            st.divider()
            
            # ------------------------------------------------------------------
            # XEM TRƯỚC PHÒNG THI VÀ PHÂN BỐ
            # ------------------------------------------------------------------
            tab_preview, tab_shift_stat, tab_combos = st.tabs([
                "📑 Chi tiết từng Phòng thi", 
                "📊 Thống kê Ca 1 & Ca 2 (Theo phòng)", 
                "📈 Phân bố theo Tổ hợp"
            ])
            
            with tab_preview:
                selected_room = st.selectbox("Chọn phòng thi để xem trước:", options=sorted(df_assigned['Phòng thi'].unique()))
                df_selected_room = df_assigned[df_assigned['Phòng thi'] == selected_room][
                    ['STT_Phong', 'SBD', 'Họ tên', 'Ngày sinh', 'Lớp', 'TC1', 'TC2', 'ToHop_ChuanHoa']
                ].rename(columns={'STT_Phong': 'STT'})
                
                st.write(f"**Danh sách thí sinh Phòng thi số {selected_room:02d} ({len(df_selected_room)} thí sinh):**")
                st.dataframe(df_selected_room, use_container_width=True)

            with tab_shift_stat:
                st.write("### 📋 Bảng Thống kê Phòng thi - Các môn & Số lượng Thí sinh")
                selected_shift_tab = st.radio("Chọn Ca thi cần xem thống kê:", options=["Ca 1 (Môn TC1)", "Ca 2 (Môn TC2)"], horizontal=True)
                
                curr_subj_col = "TC1" if "Ca 1" in selected_shift_tab else "TC2"
                curr_shift_label = "CA 1" if "Ca 1" in selected_shift_tab else "CA 2"
                
                st.info(f"KỲ THI: **{full_exam_title.upper()}** — MÔN: **{curr_subj_col}** (Điểm thi: {center_code} - {dept_input})")
                
                df_shift_table = generate_shift_statistics(df_assigned, curr_subj_col)
                st.dataframe(df_shift_table, use_container_width=True)
                
                # Dòng tổng kết
                total_cand = len(df_assigned)
                st.success(f"**Tổng số phòng:** {len(df_shift_table)} phòng | **Tổng số thí sinh toàn ca:** {total_cand} thí sinh")
                
            with tab_combos:
                st.write("**Thống kê số lượng thí sinh theo Tổ hợp môn tự chọn:**")
                combo_stat = df_assigned['ToHop_ChuanHoa'].value_counts().reset_index()
                combo_stat.columns = ['Tổ hợp tự chọn', 'Số lượng thí sinh']
                st.dataframe(combo_stat, use_container_width=True)

                
    else:
        st.info("👈 Vui lòng tải lên file Excel hoặc nhấn 'Sử dụng dữ liệu mẫu' ở thanh bên để bắt đầu.")


if __name__ == "__main__":
    main()
