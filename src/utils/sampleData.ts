import { CandidateInput, ExamCategory } from '../types';

export function generateSampleCandidates(
  count: number = 240,
  category: ExamCategory = 'Kiểm tra định kỳ'
): CandidateInput[] {
  const lastNames = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Huỳnh", "Phan", "Vũ", "Võ", "Đặng", "Bùi", "Đỗ", "Hồ", "Ngô", "Dương", "Đào"];
  const middleNames = ["Văn", "Thị", "Hữu", "Đức", "Minh", "Thanh", "Quang", "Anh", "Bảo", "Gia", "Tuấn", "Hoài", "Phương", "Đình"];
  const firstNames = ["An", "Ánh", "Bình", "Cường", "Duy", "Đạt", "Hải", "Hương", "Khoa", "Linh", "Minh", "Nam", "Nhi", "Phúc", "Quân", "Sơn", "Tâm", "Thảo", "Trang", "Tùng", "Vinh", "Yến"];

  const classes = ["12A1", "12A2", "12A3", "12A4", "12A5", "12A6", "12A7", "12A8"];
  // Mã nhóm theo môn tự chọn thực tế của trường THPT (5 nhóm chuẩn người dùng cung cấp)
  const periodicGroups = [
    "Địa-GDKPTL-CNCN-Tin",
    "Sinh-GDKPTL-Địa-Tin",
    "Địa-GDKPTL-CNNN-Tin",
    "Lý-Hóa-Sinh-Tin",
    "Lý-Hóa-CNCN-Tin"
  ];

  // Cặp môn tự chọn
  const electivePairs = [
    ["Vật lí", "Hóa học"],
    ["Hóa học", "Vật lí"],
    ["Vật lí", "Sinh học"],
    ["Lịch sử", "Địa lí"],
    ["Địa lí", "Lịch sử"],
    ["Lịch sử", "GDKTPL"],
    ["Hóa học", "Sinh học"],
    ["Vật lí", "Tin học"]
  ];

  const result: CandidateInput[] = [];

  for (let i = 1; i <= count; i++) {
    const lName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const mName = middleNames[Math.floor(Math.random() * middleNames.length)];
    const fName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const fullName = `${lName} ${mName} ${fName}`;

    const ccd = `0642050${String(10000 + (i % 90000)).padStart(5, '0')}`;
    const className = classes[i % classes.length];

    const day = 1 + ((i * 7) % 28);
    const month = 1 + ((i * 3) % 12);
    const dob = `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/2008`;

    if (category.includes('Kiểm tra')) {
      const group = periodicGroups[i % periodicGroups.length];
      result.push({
        TT: i,
        SBD: '', // Chưa có SBD theo yêu cầu
        CCD: ccd,
        Lớp: className,
        'Họ tên': fullName,
        'Ngày sinh': dob,
        Nhóm: group,
      });
    } else {
      const pair = electivePairs[i % electivePairs.length];
      result.push({
        TT: i,
        SBD: '', // Chưa có SBD theo yêu cầu
        CCD: ccd,
        Lớp: className,
        'Họ tên': fullName,
        'Ngày sinh': dob,
        M1: "Toán",
        M2: "Ngữ văn",
        TC1: pair[0],
        TC2: pair[1],
      });
    }
  }

  return result;
}

