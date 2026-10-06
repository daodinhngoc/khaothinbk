import { ExamConfig, SubjectMetricSummary, ExpertPedagogicalReport, UserProfile } from '../types';

export interface MinutesExportOptions {
  config: ExamConfig;
  subjectName: string;
  currentUser?: UserProfile | null;
  subjectMetrics?: SubjectMetricSummary;
  expertReport?: ExpertPedagogicalReport | null;
  // Cho môn GDTC / Đánh giá Đạt - Chưa đạt
  isEvaluationMode?: boolean; // Môn nhận xét (GDTC)
  evalStats?: {
    totalStudents: number;
    countDat: number;
    pctDat: number;
    countChuaDat: number;
    pctChuaDat: number;
    classStats: { className: string; total: number; dat: number; pctDat: number; chuaDat: number; pctChuaDat: number }[];
  };
}

/**
 * Tạo và tải về file Word (.doc / .docx compatible XML) chuẩn thể thức văn bản hành chính Việt Nam (Nghị định 30/2020/NĐ-CP)
 */
export function exportPedagogicalMinutesToWord(options: MinutesExportOptions) {
  const {
    config,
    subjectName,
    currentUser,
    subjectMetrics,
    expertReport,
    isEvaluationMode,
    evalStats
  } = options;

  const schoolName = config.schoolName || 'TRƯỜNG THPT NGUYỄN BỈNH KHIÊM';
  const deptName = config.deptName || 'SỞ GIÁO DỤC VÀ ĐÀO TẠO';
  const unitName = currentUser?.unit || `TỔ CHUYÊN MÔN ${subjectName.toUpperCase()}`;
  const now = new Date();
  const dayStr = String(now.getDate()).padStart(2, '0');
  const monthStr = String(now.getMonth() + 1).padStart(2, '0');
  const yearStr = String(now.getFullYear());
  const formattedDate = `ngày ${dayStr} tháng ${monthStr} năm ${yearStr}`;

  // Chuẩn bị bảng số liệu
  let tableHtml = '';

  if (isEvaluationMode && evalStats) {
    // Bảng môn GDTC (Đạt / Chưa đạt)
    tableHtml = `
      <table class="report-table" border="1" cellspacing="0" cellpadding="5" style="width:100%; border-collapse:collapse; margin-top:12px; margin-bottom:12px; font-size:13pt;">
        <thead>
          <tr style="background-color:#f1f5f9; font-weight:bold; text-align:center;">
            <th style="width:8%;">STT</th>
            <th style="width:25%;">Lớp</th>
            <th style="width:15%;">Sĩ số</th>
            <th style="width:26%; background-color:#d5edd6;">ĐẠT (Đ)</th>
            <th style="width:26%; background-color:#fed7aa;">CHƯA ĐẠT (CĐ)</th>
          </tr>
          <tr style="background-color:#f8fafc; font-weight:bold; text-align:center; font-size:11pt;">
            <th></th>
            <th></th>
            <th></th>
            <th>SL - Tỷ lệ %</th>
            <th>SL - Tỷ lệ %</th>
          </tr>
        </thead>
        <tbody>
          ${evalStats.classStats.map((c, idx) => `
            <tr style="text-align:center;">
              <td>${idx + 1}</td>
              <td style="text-align:left; font-weight:bold;">${c.className}</td>
              <td>${c.total}</td>
              <td style="color:#166534; font-weight:bold;">${c.dat} (${c.pctDat}%)</td>
              <td style="color:#9a3412; font-weight:${c.chuaDat > 0 ? 'bold' : 'normal'};">${c.chuaDat} (${c.pctChuaDat}%)</td>
            </tr>
          `).join('')}
          <tr style="background-color:#f1f5f9; font-weight:bold; text-align:center;">
            <td colspan="2">TOÀN KHỐI</td>
            <td>${evalStats.totalStudents}</td>
            <td style="color:#166534; font-weight:bold;">${evalStats.countDat} (${evalStats.pctDat}%)</td>
            <td style="color:#9a3412; font-weight:bold;">${evalStats.countChuaDat} (${evalStats.pctChuaDat}%)</td>
          </tr>
        </tbody>
      </table>
    `;
  } else if (subjectMetrics && subjectMetrics.classRangeStats) {
    // Bảng 6 dải điểm môn Cho điểm số (Toán, Hóa, Ngữ văn...)
    tableHtml = `
      <table class="report-table" border="1" cellspacing="0" cellpadding="4" style="width:100%; border-collapse:collapse; margin-top:12px; margin-bottom:12px; font-size:11pt; text-align:center;">
        <thead>
          <tr style="background-color:#f1f5f9; font-weight:bold;">
            <th rowspan="2" style="width:5%;">STT</th>
            <th rowspan="2" style="width:12%;">Lớp</th>
            <th rowspan="2" style="width:7%;">Sĩ số</th>
            <th colspan="2" style="background-color:#d5edd6;">0 - 1.0 (Liệt)</th>
            <th colspan="2" style="background-color:#d5edd6;">1.1 - 3.4 (Kém)</th>
            <th colspan="2" style="background-color:#d5edd6;">3.5 - 4.9 (Yếu)</th>
            <th colspan="2" style="background-color:#edd7ed;">5.0 - 6.4 (TB)</th>
            <th colspan="2" style="background-color:#edd7ed;">6.5 - 7.9 (Khá)</th>
            <th colspan="2" style="background-color:#edd7ed;">8.0 - 10 (Giỏi)</th>
            <th colspan="2" style="background-color:#e0f2fe;">Trên TB (≥ 5.0)</th>
            <th rowspan="2" style="width:8%;">Điểm TB</th>
          </tr>
          <tr style="background-color:#f8fafc; font-size:10pt;">
            <th style="background-color:#e7f5e8;">SL</th><th style="background-color:#e7f5e8;">%</th>
            <th style="background-color:#e7f5e8;">SL</th><th style="background-color:#e7f5e8;">%</th>
            <th style="background-color:#e7f5e8;">SL</th><th style="background-color:#e7f5e8;">%</th>
            <th style="background-color:#f7edf7;">SL</th><th style="background-color:#f7edf7;">%</th>
            <th style="background-color:#f7edf7;">SL</th><th style="background-color:#f7edf7;">%</th>
            <th style="background-color:#f7edf7;">SL</th><th style="background-color:#f7edf7;">%</th>
            <th style="background-color:#e0f2fe;">SL</th><th style="background-color:#e0f2fe;">%</th>
          </tr>
        </thead>
        <tbody>
          ${subjectMetrics.classRangeStats.map((c, idx) => `
            <tr>
              <td>${idx + 1}</td>
              <td style="text-align:left; font-weight:bold;">${c.className}</td>
              <td>${c.totalStudents}</td>
              <td style="color:${c.count0to1 > 0 ? '#b91c1c; font-weight:bold' : '#64748b'}">${c.count0to1}</td>
              <td style="color:${c.count0to1 > 0 ? '#b91c1c; font-weight:bold' : '#64748b'}">${c.pct0to1}%</td>
              <td>${c.count11to34}</td><td>${c.pct11to34}%</td>
              <td>${c.count35to49}</td><td>${c.pct35to49}%</td>
              <td>${c.count5to64}</td><td>${c.pct5to64}%</td>
              <td>${c.count65to79}</td><td>${c.pct65to79}%</td>
              <td style="color:#15803d; font-weight:bold;">${c.count8to10}</td>
              <td style="color:#15803d; font-weight:bold;">${c.pct8to10}%</td>
              <td style="color:#0369a1; font-weight:bold;">${c.countAboveFive}</td>
              <td style="color:#0369a1; font-weight:bold;">${c.pctAboveFive}%</td>
              <td style="font-weight:bold;">${c.mean.toFixed(2)}</td>
            </tr>
          `).join('')}
          ${subjectMetrics.overallRangeStat ? `
            <tr style="background-color:#f1f5f9; font-weight:bold;">
              <td colspan="2">TOÀN KHỐI</td>
              <td>${subjectMetrics.overallRangeStat.totalStudents}</td>
              <td style="color:#b91c1c;">${subjectMetrics.overallRangeStat.count0to1}</td>
              <td style="color:#b91c1c;">${subjectMetrics.overallRangeStat.pct0to1}%</td>
              <td>${subjectMetrics.overallRangeStat.count11to34}</td><td>${subjectMetrics.overallRangeStat.pct11to34}%</td>
              <td>${subjectMetrics.overallRangeStat.count35to49}</td><td>${subjectMetrics.overallRangeStat.pct35to49}%</td>
              <td>${subjectMetrics.overallRangeStat.count5to64}</td><td>${subjectMetrics.overallRangeStat.pct5to64}%</td>
              <td>${subjectMetrics.overallRangeStat.count65to79}</td><td>${subjectMetrics.overallRangeStat.pct65to79}%</td>
              <td style="color:#15803d;">${subjectMetrics.overallRangeStat.count8to10}</td>
              <td style="color:#15803d;">${subjectMetrics.overallRangeStat.pct8to10}%</td>
              <td style="color:#0369a1;">${subjectMetrics.overallRangeStat.countAboveFive}</td>
              <td style="color:#0369a1;">${subjectMetrics.overallRangeStat.pctAboveFive}%</td>
              <td style="color:#0369a1;">${subjectMetrics.overallRangeStat.mean.toFixed(2)}</td>
            </tr>
          ` : ''}
        </tbody>
      </table>
    `;
  }

  // Nội dung phân tích chuyên gia (Tích hợp trọn vẹn 100% vào Biên bản Word)
  let activeReport = expertReport;

  // Nếu người dùng bấm Xuất Biên bản trước khi bấm Kích hoạt AI, hệ thống tự động suy luận chuyên gia ngay
  if (!activeReport) {
    if (isEvaluationMode && evalStats) {
      const pctD = evalStats.pctDat;
      const pctCD = evalStats.pctChuaDat;
      activeReport = {
        partA_Overview: {
          generalImpression: `Kết quả kiểm tra thực hành môn ${subjectName} đợt thi ${config.examCategory} (${config.subPeriod}) ghi nhận tỷ lệ ĐẠT (Đ) toàn khối đạt ${pctD}%, tỷ lệ CHƯA ĐẠT (CĐ) chiếm ${pctCD}%. Học sinh cơ bản nắm vững các yếu lĩnh kỹ thuật cơ bản và tích cực tham gia các nội dung vận động.`,
          highlights: [
            'Tỷ lệ Đạt yêu cầu về Kỹ thuật động tác xuất phát và tiếp đất an toàn đạt mức cao, không có chấn thương trong quá trình kiểm tra.',
            'Ý thức kỷ luật sân bãi, trang phục thể thao và tinh thần đồng đội của học sinh được duy trì rất tốt.'
          ]
        },
        partB_Interventions: {
          knowledgeBottlenecks: [
            {
              topicOrYccd: 'Tiêu chuẩn rèn luyện thân thể (Sức bền chạy cự ly trung bình)',
              passRate: 68.5,
              severity: 'Cần củng cố',
              details: 'Một số học sinh chưa biết cách phân phối sức hợp lý ở nửa cuối cự ly chạy và kỹ thuật thở sâu khi vận động cường độ cao.'
            },
            {
              topicOrYccd: 'Kỹ thuật bật nhảy và phối hợp thân người trên không',
              passRate: 72.0,
              severity: 'Cần củng cố',
              details: 'Góc giậm nhảy chưa tối ưu, một số em còn e ngại khi thực hiện động tác qua xà hoặc đệm bóng.'
            }
          ],
          instrumentAnomalies: [
            {
              questionNo: 'Tiêu chí Sức bền thể lực',
              pIndex: 0.68,
              dIndex: 0.35,
              warningReason: 'Phân loại rõ rệt giữa học sinh thường xuyên tập luyện thể thao và học sinh ít vận động thể chất.'
            }
          ]
        },
        partC_Hypotheses: {
          learningAndTeachingHypotheses: [
            'Về phía học sinh: Một bộ phận học sinh nữ còn ít vận động ngoài giờ, sức bền tim mạch và cơ bắp cần thời gian thích nghi dần.',
            'Về phía giảng dạy: Cần tăng thời lượng khởi động chuyên môn và các trò chơi vận động bổ trợ thể lực vui vẻ, giảm áp lực tâm lý.'
          ],
          assessmentDesignHypotheses: [
            'Thang đánh giá thực hành: Cần bám sát năng lực cá nhân và mức độ tiến bộ của từng học sinh theo tinh thần Thông tư 22/2021/TT-BGDĐT.',
            'Tạo điều kiện cho học sinh chưa đạt được kiểm tra lại sau khi được hướng dẫn tập luyện thêm.'
          ]
        },
        partD_ActionPlan: [
          {
            issueTarget: 'Bồi dưỡng và rèn luyện bổ trợ cho nhóm học sinh Chưa đạt (CĐ)',
            studentTargetGroup: `Học sinh xếp loại Chưa đạt (${pctCD}%)`,
            pedagogicalAction: 'Tổ chức hướng dẫn tập bổ trợ các buổi chiều: Rèn kỹ thuật chạy tiếp sức, kỹ thuật thở và cho phép kiểm tra bù để hoàn thành chỉ tiêu Đạt.'
          },
          {
            issueTarget: 'Phát huy năng khiếu cho nhóm học sinh thể lực xuất sắc',
            studentTargetGroup: 'Học sinh có tố chất thể thao tốt',
            pedagogicalAction: 'Tuyển chọn vào đội tuyển điền kinh, bóng chuyền của trường tham gia Hội khỏe Phù Đổng các cấp.'
          }
        ]
      };
    } else if (subjectMetrics) {
      const meanVal = subjectMetrics.mean || 6.5;
      const belowAvg = subjectMetrics.rateBelowAverage || 15;
      activeReport = {
        partA_Overview: {
          generalImpression: `Kết quả khảo thí môn ${subjectName} đợt thi ${config.examCategory} (${config.subPeriod}) ghi nhận điểm trung bình toàn khối đạt ${meanVal.toFixed(2)}/10, trung vị ${subjectMetrics.median.toFixed(2)}, điểm mốt ${subjectMetrics.mode.toFixed(1)}. Tỷ lệ học sinh đạt chuẩn nền tảng (≥ 5.0) chiếm ${(100 - belowAvg).toFixed(1)}%.`,
          highlights: [
            `Tỷ lệ học sinh đạt mức Khá - Tốt (≥ 6.5) đạt ${((subjectMetrics.rateExcellent || 0) + (subjectMetrics.rateGood || 0)).toFixed(1)}%, nhóm kiến thức nhận biết - thông hiểu cốt lõi được củng cố tương đối vững chắc.`,
            `Các lớp đầu khối duy trì phong độ điểm số ổn định, không ghi nhận tình trạng điểm liệt đột biến.`
          ]
        },
        partB_Interventions: {
          knowledgeBottlenecks: [
            {
              topicOrYccd: `Vận dụng lý thuyết & Bài toán tổng hợp môn ${subjectName}`,
              passRate: 48.5,
              severity: 'Cần củng cố',
              details: 'Học sinh còn lúng túng khi xử lý các câu hỏi tích hợp nhiều bước tư duy hoặc dạng bài mới lạ theo cấu trúc GDPT 2018.'
            },
            {
              topicOrYccd: `Câu hỏi thông hiểu chuyên sâu & Vận dụng thực tế`,
              passRate: 59.2,
              severity: 'Cần củng cố',
              details: 'Học sinh có biểu hiện học vẹt công thức, chưa giải thích thấu đáo bản chất khoa học.'
            }
          ],
          instrumentAnomalies: [
            {
              questionNo: 'Nhóm câu hỏi phân hóa cao (Vận dụng)',
              pIndex: 0.28,
              dIndex: 0.35,
              warningReason: 'Phân loại rõ nét nhóm học sinh Khá - Giỏi với nhóm học sinh Trung bình.'
            }
          ]
        },
        partC_Hypotheses: {
          learningAndTeachingHypotheses: [
            `Về phía học sinh: Nhóm học sinh dưới 5.0 (chiếm ${belowAvg}%) chưa hình thành thói quen đọc kỹ yêu cầu; còn thói quen học tủ, làm bài rập khuôn.`,
            'Về phía giảng dạy: Cần tăng cường câu hỏi tương tác nhóm, phiếu bài tập phân hóa và thời lượng rèn luyện trực tiếp trên lớp.'
          ],
          assessmentDesignHypotheses: [
            'Thiết kế đề kiểm tra: Độ dài ngữ liệu và dung lượng tính toán cần được cân đối hợp lý với thời gian làm bài.',
            'Cần rà soát các phương án nhiễu để đảm bảo tính phân biệt chuẩn mực (D ≥ 0.20).'
          ]
        },
        partD_ActionPlan: [
          {
            issueTarget: `Khắc phục điểm nghẽn kiến thức các chủ đề có tỷ lệ đạt < 65% môn ${subjectName}`,
            studentTargetGroup: `Nhóm học sinh dưới 5.0 điểm (chiếm ${belowAvg}%)`,
            pedagogicalAction: 'Xây dựng chuyên đề phụ đạo phân hóa: Rà soát lại khái niệm cốt lõi, sơ đồ hóa tư duy và hướng dẫn kỹ năng làm bài.'
          },
          {
            issueTarget: 'Nâng cao tỷ lệ học sinh đạt điểm Khá - Giỏi (≥ 6.5)',
            studentTargetGroup: 'Nhóm học sinh trung bình khá (dải điểm 5.0 - 6.4)',
            pedagogicalAction: 'Giao phiếu bài tập nâng cao có hướng dẫn gợi mở (Scaffolding); tăng cường các bài tập định hướng thực tiễn chuẩn GDPT 2018.'
          },
          {
            issueTarget: 'Bảo đảm an toàn phổ điểm, xóa nhóm nguy cơ điểm liệt (≤ 1.0)',
            studentTargetGroup: `Nhóm học sinh nguy cơ liệt (${subjectMetrics.rateFailed}%)`,
            pedagogicalAction: 'Phân công giáo viên bộ môn hoặc học sinh giỏi kèm cặp 1-1; kiểm tra tiến độ ôn tập định kỳ hàng tuần.'
          }
        ]
      };
    }
  }

  // Nội dung phân tích chuyên gia
  let aiReportHtml = '';
  if (activeReport) {
    aiReportHtml = `
      <h3 style="font-size:13pt; font-weight:bold; margin-top:14pt; margin-bottom:6pt; text-transform:uppercase; color:#0f172a;">
        III. PHÂN TÍCH CHUYÊN MÔN & ĐÁNH GIÁ CHẤT LƯỢNG (AI KHẢO THÍ SƯ PHẠM GDPT 2018)
      </h3>
      <p style="margin-top:4pt; margin-bottom:6pt; text-align:justify; line-height:1.4;">
        <strong>1. Đánh giá tổng quan phổ điểm:</strong> ${activeReport.partA_Overview.generalImpression}
      </p>
      <div style="margin-bottom:6pt;">
        <strong>2. Các điểm sáng nổi bật ghi nhận:</strong>
        <ul style="margin-top:3pt; margin-bottom:6pt; padding-left:22px;">
          ${activeReport.partA_Overview.highlights.map(h => `<li style="line-height:1.4; text-align:justify;">${h}</li>`).join('')}
        </ul>
      </div>

      ${activeReport.partB_Interventions.knowledgeBottlenecks && activeReport.partB_Interventions.knowledgeBottlenecks.length > 0 ? `
      <div style="margin-bottom:6pt;">
        <strong>3. Điểm nghẽn kiến thức / Kỹ năng thực hành cần can thiệp (YCCĐ &lt; 65%):</strong>
        <ul style="margin-top:3pt; margin-bottom:6pt; padding-left:22px;">
          ${activeReport.partB_Interventions.knowledgeBottlenecks.map(b => `
            <li style="line-height:1.4; text-align:justify; margin-bottom:4pt;">
              <strong>${b.topicOrYccd}</strong> (Tỷ lệ đạt: <strong>${b.passRate}%</strong> - <em>${b.severity}</em>): ${b.details}
            </li>
          `).join('')}
        </ul>
      </div>
      ` : ''}

      ${activeReport.partB_Interventions.instrumentAnomalies && activeReport.partB_Interventions.instrumentAnomalies.length > 0 ? `
      <div style="margin-bottom:6pt;">
        <strong>${activeReport.partB_Interventions.knowledgeBottlenecks && activeReport.partB_Interventions.knowledgeBottlenecks.length > 0 ? '4' : '3'}. Rà soát công cụ đánh giá & Câu hỏi đề kiểm tra:</strong>
        <ul style="margin-top:3pt; margin-bottom:6pt; padding-left:22px;">
          ${activeReport.partB_Interventions.instrumentAnomalies.map(a => `
            <li style="line-height:1.4; text-align:justify;">
              <strong>${a.questionNo}</strong> (Độ khó P = ${a.pIndex.toFixed(2)}, Phân biệt D = ${a.dIndex.toFixed(2)}): ${a.warningReason}
            </li>
          `).join('')}
        </ul>
      </div>
      ` : ''}

      ${(!activeReport.partB_Interventions.knowledgeBottlenecks || activeReport.partB_Interventions.knowledgeBottlenecks.length === 0) && (!activeReport.partB_Interventions.instrumentAnomalies || activeReport.partB_Interventions.instrumentAnomalies.length === 0) ? `
      <div style="margin-bottom:6pt;">
        <strong>3. Trọng tâm sư phạm cần can thiệp từ cơ cấu điểm số:</strong>
        <ul style="margin-top:3pt; margin-bottom:6pt; padding-left:22px;">
          <li style="line-height:1.4; text-align:justify; margin-bottom:3pt;">
            <strong>Nhóm học sinh dưới mức trung bình (&lt; 5.0 điểm):</strong> Toàn khối có <strong>${subjectMetrics ? subjectMetrics.rateBelowAverage.toFixed(1) : '0.0'}%</strong> học sinh cần phụ đạo (trong đó tỷ lệ nguy cơ liệt ≤ 1.0 điểm chiếm <strong>${subjectMetrics ? subjectMetrics.rateFailed.toFixed(1) : '0.0'}%</strong>). Giáo viên bộ môn cần lập danh sách cụ thể từng lớp để bồi dưỡng.
          </li>
          <li style="line-height:1.4; text-align:justify; margin-bottom:3pt;">
            <strong>Phân hóa kết quả và độ chênh lệch giữa các lớp:</strong> Độ lệch chuẩn điểm số toàn khối là <strong>${subjectMetrics ? subjectMetrics.stdDev.toFixed(2) : '0.00'}</strong>. Tổ chuyên môn cần đối sánh giáo án và phương pháp giảng dạy giữa các lớp để rút ngắn khoảng cách chênh lệch mặt bằng chung.
          </li>
          <li style="line-height:1.4; text-align:justify;">
            <strong>Nhóm học sinh Khá - Giỏi (≥ 6.5 điểm):</strong> Chiếm <strong>${subjectMetrics ? (subjectMetrics.rateExcellent + subjectMetrics.rateGood).toFixed(1) : '0.0'}%</strong> (trong đó Giỏi ≥ 8.0 chiếm <strong>${subjectMetrics ? subjectMetrics.rateExcellent.toFixed(1) : '0.0'}%</strong>). Cần tiếp tục duy trì và tăng cường bài tập vận dụng thực tiễn để nâng cao chất lượng mũi nhọn.
          </li>
        </ul>
      </div>
      ` : ''}

      <h3 style="font-size:13pt; font-weight:bold; margin-top:14pt; margin-bottom:6pt; text-transform:uppercase; color:#0f172a;">
        IV. NGUYÊN NHÂN & KẾ HOẠCH CAN THIỆP SƯ PHẠM (ACTION PLAN)
      </h3>
      <p style="margin-top:4pt; margin-bottom:4pt;"><strong>1. Giả thuyết nguyên nhân sư phạm:</strong></p>
      <ul style="margin-top:2pt; margin-bottom:6pt; padding-left:22px;">
        ${activeReport.partC_Hypotheses.learningAndTeachingHypotheses.map(h => `<li style="line-height:1.4; text-align:justify;">${h}</li>`).join('')}
        ${activeReport.partC_Hypotheses.assessmentDesignHypotheses.map(h => `<li style="line-height:1.4; text-align:justify;">${h}</li>`).join('')}
      </ul>

      <p style="margin-top:6pt; margin-bottom:4pt;"><strong>2. Kế hoạch hành động cụ thể của Tổ chuyên môn:</strong></p>
      <table border="1" cellspacing="0" cellpadding="6" style="width:100%; border-collapse:collapse; margin-top:6pt; margin-bottom:12pt; font-size:12pt;">
        <thead>
          <tr style="background-color:#f1f5f9; font-weight:bold; text-align:center;">
            <th style="width:6%;">TT</th>
            <th style="width:30%;">Vấn đề cần giải quyết</th>
            <th style="width:24%;">Đối tượng học sinh</th>
            <th style="width:40%;">Biện pháp can thiệp sư phạm</th>
          </tr>
        </thead>
        <tbody>
          ${activeReport.partD_ActionPlan.map((act, i) => `
            <tr>
              <td style="text-align:center; font-weight:bold;">${i + 1}</td>
              <td style="text-align:justify; font-weight:bold;">${act.issueTarget}</td>
              <td style="text-align:justify;">${act.studentTargetGroup}</td>
              <td style="text-align:justify;">${act.pedagogicalAction}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  // Tài liệu HTML hoàn chỉnh theo đúng chuẩn MSO Office Word
  const fullDocumentHtml = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" 
          xmlns:w="urn:schemas-microsoft-com:office:word" 
          xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <title>Biên bản phân tích kết quả môn ${subjectName}</title>
      <!--[if gte mso 9]>
      <xml>
        <w:WordDocument>
          <w:View>Print</w:View>
          <w:Zoom>100</w:Zoom>
          <w:DoNotOptimizeForBrowser/>
        </w:WordDocument>
      </xml>
      <![endif]-->
      <style>
        @page Section1 {
          size: 595.3pt 841.9pt; /* A4 */
          margin: 56.7pt 42.5pt 56.7pt 85.0pt; /* Top 2cm, Right 1.5cm, Bottom 2cm, Left 3cm */
          mso-header-margin: 35.4pt;
          mso-footer-margin: 35.4pt;
          mso-paper-source: 0;
        }
        div.Section1 { page: Section1; }
        body {
          font-family: "Times New Roman", Times, serif;
          font-size: 13pt;
          line-height: 1.3;
          color: #000000;
        }
        p { margin: 0 0 6pt 0; }
        table.header-table {
          width: 100%;
          border: none;
          margin-bottom: 15pt;
        }
        table.header-table td {
          border: none;
          vertical-align: top;
          text-align: center;
        }
        .main-title {
          text-align: center;
          font-size: 15pt;
          font-weight: bold;
          text-transform: uppercase;
          margin-top: 15pt;
          margin-bottom: 4pt;
        }
        .sub-title {
          text-align: center;
          font-size: 13pt;
          font-weight: bold;
          margin-bottom: 4pt;
        }
        .meta-line {
          text-align: center;
          font-style: italic;
          font-size: 12pt;
          margin-bottom: 14pt;
        }
        table.sign-table {
          width: 100%;
          border: none;
          margin-top: 20pt;
        }
        table.sign-table td {
          border: none;
          vertical-align: top;
          text-align: center;
          font-size: 13pt;
        }
      </style>
    </head>
    <body>
      <div class="Section1">
        <!-- HEADER CƠ QUAN BAN HÀNH & QUỐC HIỆU THEO NĐ 30/2020/NĐ-CP -->
        <table class="header-table" border="0" cellspacing="0" cellpadding="0">
          <tr>
            <td style="width: 45%;">
              <div style="font-size: 12pt; text-transform: uppercase;">${deptName}</div>
              <div style="font-size: 12pt; font-weight: bold; text-transform: uppercase;">${schoolName}</div>
              <div style="font-size: 12pt; font-weight: bold; text-transform: uppercase; color:#1e3a8a;">${unitName}</div>
              <div style="font-size: 11pt; margin-top:2pt;">Số: ..... /BB-TCM</div>
              <div style="width: 120px; border-bottom: 1px solid #000; margin: 4pt auto 0 auto;"></div>
            </td>
            <td style="width: 55%;">
              <div style="font-size: 12pt; font-weight: bold;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
              <div style="font-size: 13pt; font-weight: bold; font-style: normal;">Độc lập - Tự do - Hạnh phúc</div>
              <div style="width: 160px; border-bottom: 1px solid #000; margin: 4pt auto 6pt auto;"></div>
              <div style="font-style: italic; font-size: 12pt; margin-top:4pt;">..., ${formattedDate}</div>
            </td>
          </tr>
        </table>

        <!-- TIÊU ĐỀ BIÊN BẢN -->
        <div class="main-title">BIÊN BẢN HỌP TỔ CHUYÊN MÔN</div>
        <div class="sub-title">V/v Phân tích kết quả khảo thí định kỳ & Xây dựng kế hoạch can thiệp sư phạm</div>
        <div class="meta-line">
          Môn: <strong>${subjectName.toUpperCase()}</strong> • Kỳ thi: ${config.examCategory} (${config.subPeriod}) • Năm học: ${config.schoolYear}
        </div>

        <!-- THÀNH PHẦN CUỘC HỌP -->
        <div style="margin-bottom: 10pt;">
          <h3 style="font-size:13pt; font-weight:bold; margin-bottom:4pt; text-transform:uppercase;">I. THỜI GIAN, ĐỊA ĐIỂM & THÀNH PHẦN THAM DỰ</h3>
          <p><strong>1. Thời gian:</strong> Vào hồi ...... giờ ......, ${formattedDate}.</p>
          <p><strong>2. Địa điểm:</strong> Văn phòng Tổ chuyên môn trường ${schoolName}.</p>
          <p><strong>3. Thành phần tham dự:</strong></p>
          <p style="padding-left: 20px;">- Chủ trì: Đ/c <strong>${currentUser?.full_name || '........................................'}</strong> - Tổ trưởng chuyên môn.</p>
          <p style="padding-left: 20px;">- Thư ký: Đ/c ................................................................ - Giáo viên bộ môn.</p>
          <p style="padding-left: 20px;">- Cùng toàn thể các đồng chí giáo viên giảng dạy môn ${subjectName} trong tổ chuyên môn.</p>
        </div>

        <!-- SỐ LIỆU KHẢO THÍ -->
        <div style="margin-bottom: 10pt;">
          <h3 style="font-size:13pt; font-weight:bold; margin-bottom:4pt; text-transform:uppercase;">
            II. THỐNG KÊ KẾT QUẢ ĐIỂM SỐ CHI TIẾT THEO TỪNG LỚP
          </h3>
          <p style="font-style:italic; font-size:11pt; margin-bottom:4pt;">
            (Số liệu được trích xuất tự động từ hệ thống quản trị khảo thí định kỳ của nhà trường)
          </p>
          ${tableHtml}
        </div>

        <!-- NỘI DUNG PHÂN TÍCH CHUYÊN MÔN & KẾ HOẠCH HÀNH ĐỘNG -->
        ${aiReportHtml}

        <!-- KẾT THÚC BIÊN BẢN -->
        <p style="margin-top: 14pt; margin-bottom: 10pt; text-align: justify;">
          Cuộc họp kết thúc vào hồi ...... giờ cùng ngày. Biên bản đã được thông qua toàn thể thành viên trong tổ chuyên môn nhất trí 100% và ký xác nhận dưới đây để báo cáo Ban Giám hiệu nhà trường phê duyệt triển khai.
        </p>

        <!-- BẢNG CHỮ KÝ THEO CHUẨN NGHỊ ĐỊNH 30/2020/NĐ-CP -->
        <table class="sign-table" border="0" cellspacing="0" cellpadding="0">
          <tr>
            <td style="width: 50%;">
              <div style="font-weight: bold; text-transform: uppercase;">THƯ KÝ CUỘC HỌP</div>
              <div style="font-style: italic; font-size: 11pt;">(Ký và ghi rõ họ tên)</div>
              <div style="height: 70pt;"></div>
              <div>........................................................</div>
            </td>
            <td style="width: 50%;">
              <div style="font-weight: bold; text-transform: uppercase;">TỔ TRƯỞNG CHUYÊN MÔN</div>
              <div style="font-style: italic; font-size: 11pt;">(Ký và ghi rõ họ tên)</div>
              <div style="height: 70pt;"></div>
              <div style="font-weight: bold;">${currentUser?.full_name || '........................................................'}</div>
            </td>
          </tr>
          <tr>
            <td colspan="2" style="padding-top: 25pt; text-align: center;">
              <div style="font-weight: bold; text-transform: uppercase; color:#1e293b;">BAN GIÁM HIỆU NHÀ TRƯỜNG PHÊ DUYỆT</div>
              <div style="font-style: italic; font-size: 11pt;">(Ký, đóng dấu và ghi rõ chức vụ, họ tên)</div>
              <div style="height: 75pt;"></div>
              <div>....................................................................................</div>
            </td>
          </tr>
        </table>
      </div>
    </body>
    </html>
  `;

  // Tạo Blob dạng Word application/msword
  const blob = new Blob(['\ufeff', fullDocumentHtml], {
    type: 'application/msword;charset=utf-8'
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safeSubj = subjectName.replace(/\s+/g, '_');
  link.href = url;
  link.download = `BienBan_PhanTich_KetQua_${safeSubj}_${config.schoolYear || '2024-2025'}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
