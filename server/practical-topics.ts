import { defaultStudentSettings, type ContentColor, type TopicIcon } from '../shared/content';

// Stable IDs allow explicitly rerunning the seed without duplicating renamed topics.
const catalog: { title: string; category: string; icon: TopicIcon; description: string }[] = [
  {
    title: 'Biểu thức đại số, đa thức và hằng đẳng thức',
    category: 'Đại số',
    icon: 'square-power',
    description:
      'Lập và rút gọn biểu thức tính diện tích, chu vi, thể tích; hộp không nắp, lối đi, khung ảnh; tính nhanh bằng hằng đẳng thức.',
  },
  {
    title: 'Phân thức đại số',
    category: 'Đại số',
    icon: 'fraction',
    description:
      'Biểu diễn thời gian, vận tốc, năng suất và chi phí trung bình bằng phân thức; xác định điều kiện và rút gọn biểu thức.',
  },
  {
    title: 'Giải bài toán bằng cách lập phương trình',
    category: 'Đại số',
    icon: 'equation',
    description:
      'Lập phương trình bậc nhất một ẩn cho bài toán chuyển động, năng suất, mua bán, phần trăm, tuổi, pha trộn và chia tiền.',
  },
  {
    title: 'Giải bài toán bằng cách lập hệ phương trình',
    category: 'Đại số',
    icon: 'equals',
    description:
      'Lập hệ hai phương trình bậc nhất hai ẩn: mua hai loại hàng, vé người lớn và trẻ em, làm chung làm riêng, kế hoạch và chuyển động.',
  },
  {
    title: 'Phương trình bậc hai và bài toán lập phương trình',
    category: 'Đại số',
    icon: 'square-power',
    description:
      'Giải phương trình bậc hai và lập phương trình từ mảnh vườn có lối đi, khung ảnh, tăng trưởng hai kì, lãi gộp và thay đổi vận tốc.',
  },
  {
    title: 'Bất phương trình bậc nhất một ẩn',
    category: 'Đại số',
    icon: 'less-equal',
    description:
      'Lập bất phương trình để chọn gói cước, tính ngưỡng giảm giá, giới hạn ngân sách và điểm cần đạt; kiểm tra điều kiện thực tế.',
  },
  {
    title: 'Hàm số bậc nhất và đồ thị',
    category: 'Hàm số và đồ thị',
    icon: 'linear-graph',
    description:
      'Mô hình cước taxi, thuê xe, mực nước, nhiệt độ, chuyển động đều và tiết kiệm tăng đều; đọc đồ thị và so sánh hai gói dịch vụ.',
  },
  {
    title: 'Hàm số y = ax² (a ≠ 0)',
    category: 'Hàm số và đồ thị',
    icon: 'function',
    description:
      'Mô hình và đồ thị parabol: cổng trường, cầu dây võng, quỹ đạo bóng, quãng đường rơi và quãng đường phanh; kiểm tra kích thước vật đi qua cổng.',
  },
  {
    title: 'Định lí Thalès và đường trung bình',
    category: 'Hình học và đo lường',
    icon: 'parallel',
    description:
      'Đo chiều rộng sông, khoảng cách qua ao hồ, chiều cao cây hoặc cột bằng đường song song; tính thanh giằng thang chữ A bằng đường trung bình.',
  },
  {
    title: 'Tam giác đồng dạng và định lí Pythagore',
    category: 'Hình học và đo lường',
    icon: 'right-triangle',
    description:
      'Đo chiều cao bằng bóng nắng hoặc gương; bản đồ theo tỉ lệ; thang dựa tường, cây gãy, diều, đường chéo màn hình và khoảng cách theo hai hướng vuông góc.',
  },
  {
    title: 'Tỉ số lượng giác và hệ thức trong tam giác vuông',
    category: 'Hình học và đo lường',
    icon: 'protractor',
    description:
      'Góc nâng, góc hạ; đo gián tiếp bằng sin, cos, tan; thang chữa cháy, thang cuốn, độ dốc, bóng nắng, hải đăng và khoảng cách qua sông.',
  },
  {
    title: 'Đường tròn, cung, hình quạt và hình vành khuyên',
    category: 'Hình học và đo lường',
    icon: 'circle',
    description:
      'Độ dài đường tròn và cung, diện tích hình quạt và vành khuyên; bánh xe lăn, kim đồng hồ, quạt giấy, pizza, vòng xuyến và đĩa CD.',
  },
  {
    title: 'Hình chóp tam giác đều, hình chóp tứ giác đều',
    category: 'Hình học và đo lường',
    icon: 'geometry',
    description:
      'Tính diện tích vật liệu và thể tích lều trại, kim tự tháp, mái nhà, chụp đèn, hộp quà hình chóp; so sánh khả năng chứa với cùng lượng vật liệu.',
  },
  {
    title: 'Hình trụ, hình nón, hình cầu',
    category: 'Hình học và đo lường',
    icon: 'cylinder',
    description:
      'Diện tích, thể tích bồn nước, lon nước, nón lá và quả bóng; khối ghép bán cầu–trụ, ly kem, viên thuốc, silo; nước dâng khi thả vật vào cốc.',
  },
  {
    title: 'Dữ liệu và biểu đồ',
    category: 'Thống kê và xác suất',
    icon: 'chart',
    description:
      'Thu thập, phân loại dữ liệu khảo sát; chọn và chuyển đổi biểu đồ cột, cột kép, đoạn thẳng, hình quạt; phát hiện dữ liệu không hợp lí và biểu đồ gây hiểu nhầm.',
  },
  {
    title: 'Tần số và tần số tương đối',
    category: 'Thống kê và xác suất',
    icon: 'percent',
    description:
      'Lập bảng và biểu đồ tần số, tần số tương đối, dữ liệu ghép nhóm; khảo sát điểm số, chiều cao, thời gian tự học; so sánh hai nhóm hoặc hai thời điểm.',
  },
  {
    title: 'Xác suất thực nghiệm và biến cố đơn giản',
    category: 'Thống kê và xác suất',
    icon: 'probability-dice',
    description:
      'Tung đồng xu, gieo xúc xắc, rút thăm, bốc bi; tính xác suất biến cố đơn giản và xác suất thực nghiệm, dùng tần suất để ước lượng số lượng hoặc tỉ lệ thực tế.',
  },
  {
    title: 'Xác suất trong phép thử hai bước',
    category: 'Thống kê và xác suất',
    icon: 'venn',
    description:
      'Liệt kê không gian mẫu bằng bảng hoặc sơ đồ cây; gieo hai đồng xu, hai xúc xắc, rút hai thẻ, bốc bi có hoặc không hoàn lại; tính xác suất biến cố trong phép thử hai bước.',
  },
];
const colors: ContentColor[] = ['blue', 'red', 'yellow'];
export const practicalTopics = catalog.map((topic, index) => ({
  ...topic,
  id: `6d3c6200-28f6-4b7c-91a0-${String(index + 1).padStart(12, '0')}`,
  color: colors[index % colors.length],
}));
interface ExistingTopic {
  id: string;
  title: string;
  category: string;
  position: number;
  version: number;
}
export type TopicExecutor = (
  sql: string,
  params: unknown[],
) => Promise<{ results: Record<string, unknown>[]; meta?: { changes: number } }>;
const normalizedTitle = (value: string) =>
  value.normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('vi');

export async function seedPracticalTopics(execute: TopicExecutor, apply = false) {
  const existing = (
    await execute('SELECT id,title,category,position,version FROM topics ORDER BY position,id', [])
  ).results as unknown as ExistingTopic[];
  const byTitle = new Map(existing.map((topic) => [normalizedTitle(topic.title), topic]));
  const planned = practicalTopics.map((topic, position) => {
    const current =
      existing.find((item) => item.id === topic.id) || byTitle.get(normalizedTitle(topic.title));
    return {
      ...topic,
      id: current?.id || topic.id,
      position,
      version: current?.version || 1,
      existing: !!current,
    };
  });
  if (new Set(planned.map((topic) => topic.id)).size !== planned.length)
    throw new Error('Có chuyên đề trùng trong danh mục.');
  const added = planned.filter((topic) => !topic.existing).length;
  if (existing.length + added > 500) throw new Error('Vượt giới hạn 500 chuyên đề.');
  const summary = {
    added,
    reused: planned.length - added,
    total: planned.length,
    groups: [...new Set(planned.map((topic) => topic.category))],
  };
  if (!apply) return { ...summary, applied: false };
  // Insert as drafts; for an existing topic, update only ordering/category, never authored content or publication.
  await execute(
    `INSERT INTO topics(id,title,category,description,icon,color,position,version)
    SELECT json_extract(value,'$.id'),json_extract(value,'$.title'),json_extract(value,'$.category'),json_extract(value,'$.description'),json_extract(value,'$.icon'),json_extract(value,'$.color'),json_extract(value,'$.position'),json_extract(value,'$.version')
    FROM json_each(?) WHERE 1
    ON CONFLICT(id) DO UPDATE SET category=excluded.category,position=excluded.position,version=topics.version+1
    WHERE topics.version=excluded.version AND (topics.category!=excluded.category OR topics.position!=excluded.position)`,
    [JSON.stringify(planned)],
  );
  const saved = (await execute('SELECT id,category,position FROM topics ORDER BY position,id', []))
    .results;
  if (
    planned.some(
      (topic) =>
        !saved.some(
          (row) =>
            row.id === topic.id &&
            row.category === topic.category &&
            row.position === topic.position,
        ),
    )
  )
    throw new Error('Danh mục vừa được thay đổi ở cửa sổ khác. Chạy lại để đối chiếu.');
  const row = (await execute('SELECT content,version FROM student_settings WHERE id=1', []))
    .results[0];
  const content = JSON.parse(String(row.content));
  const tabs = content.tabs || defaultStudentSettings.tabs;
  const revised = tabs.map((tab: { key: string; label: string; description: string }) =>
    tab.key === 'topics'
      ? {
          ...tab,
          label:
            tab.label.replace(/\s*lớp\s*[89](?:\s*(?:và|&)\s*[89])?/gi, '').trim() || 'Chuyên đề',
          description: tab.description.replace(/\s*lớp\s*[89](?:\s*(?:và|&)\s*[89])?/gi, ''),
        }
      : tab,
  );
  if (JSON.stringify(tabs) !== JSON.stringify(revised)) {
    const updated = await execute(
      "UPDATE student_settings SET content=json_set(content,'$.tabs',json(?)),version=version+1 WHERE id=1 AND version=?",
      [JSON.stringify(revised), row.version],
    );
    if (updated.meta?.changes !== 1)
      throw new Error('Cấu hình tab vừa thay đổi. Chạy lại để đối chiếu.');
  }
  return { ...summary, applied: true };
}
