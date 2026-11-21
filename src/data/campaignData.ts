export type ZoneId = 'north' | 'center' | 'south';
export type WaveId = 'wave1' | 'wave2' | 'wave3';
export type SequenceCardId = 'A' | 'B' | 'C';
export type HeroId = 'to_vinh_dien' | 'phan_dinh_giot' | 'be_van_dan' | 'ta_quoc_luat';

export interface MapZone {
  id: ZoneId;
  label: string;
  shortTitle: string;
  landmarks: string[];
  description: string;
  hint: string;
  accentBg: string;
  accentBorder: string;
  accentText: string;
  /** 3D position on the Dien Bien Phu valley map */
  worldPos: [number, number, number];
  /** Exact 2D percentage coordinates [x%, y%] aligned to the historical sa bàn relief map */
  mapPos2D: [number, number];
}

export interface CampaignWave {
  id: WaveId;
  waveNumber: 1 | 2 | 3;
  title: string;
  dateRange: string;
  historicalDateNote: string;
  headline: string;
  summary: string;
  narration: string;
  focusLandmarks: string[];
  keyFacts: string[];
  resultHighlight: string;
  imageUrl: string;
  imageCaption: string;
  colorHex: string;
  bgClass: string;
  borderClass: string;
  textClass: string;
  cameraPos: [number, number, number];
  cameraTarget: [number, number, number];
}

export interface SequenceCard {
  id: SequenceCardId;
  code: string;
  text: string;
  correctSlotIndex: 0 | 1 | 2;
  waveNumber: 1 | 2 | 3;
  dateRange: string;
  milestoneTitle: string;
  illustrationKey: 'him_lam' | 'doi_a1' | 'muong_thanh';
  imageUrl: string;
  statNote: string;
}

export interface HeroItem {
  id: HeroId;
  name: string;
  deed: string;
  shortTag: string;
  storyNote: string;
  colorClass: string;
}

export interface AdditionalHeroSpotlight {
  id: string;
  name: string;
  role: string;
  deed: string;
}

export interface CampaignVictoryStat {
  label: string;
  value: string;
  detail: string;
}

export interface RealisticLandmarkPin {
  id: string;
  label: string;
  sector: ZoneId;
  waveFocus?: WaveId;
  worldPos: [number, number, number];
  /** Exact 2D percentage coordinates [x%, y%] on the historical sa bàn relief map */
  mapPos2D: [number, number];
  note: string;
}

export interface HistoricalMessage {
  id: string;
  text: string;
  isHistorical: boolean;
  feedback: string;
}

export interface StoryChapter {
  id: number;
  startSec: number;
  endSec: number;
  title: string;
  narration: string;
  chant: string;
}

export const SCHOOL_NAME = 'Trường Tiểu học Đại Bản';

export const SA_BAN_MAP_IMAGE = '/src/assets/images/sa_ban_dien_bien_phu_1954_1795249272432.jpg';

export const WAVE_ILLUSTRATIONS = {
  him_lam: '/src/assets/images/wave1_him_lam_1795241721062.jpg',
  doi_a1: '/src/assets/images/wave2_trenches_a1_1795241721772.jpg',
  muong_thanh: '/src/assets/images/wave3_victory_flag_1795241722092.jpg',
} as const;

export const MAP_ZONES: MapZone[] = [
  {
    id: 'north',
    label: 'PHÂN KHU BẮC',
    shortTitle: 'Khu vực phía Bắc',
    landmarks: ['Cứ điểm Him Lam', 'Cứ điểm Độc Lập', 'Bản Kéo'],
    description:
      'Nằm ở phía Bắc lòng chảo Điện Biên Phủ, gồm 3 cứ điểm vòng ngoài Him Lam, Độc Lập và Bản Kéo che chắn cửa ngõ vào Mường Thanh.',
    hint: 'Gợi ý: Ở phía trên cùng của bản đồ, nơi có cứ điểm Him Lam, Độc Lập và Bản Kéo!',
    accentBg: 'bg-orange-50',
    accentBorder: 'border-orange-400',
    accentText: 'text-orange-800',
    worldPos: [-0.4, 1.0, -5.0],
    mapPos2D: [50, 21],
  },
  {
    id: 'center',
    label: 'PHÂN KHU TRUNG TÂM',
    shortTitle: 'Khu vực ở giữa thung lũng',
    landmarks: ['Mường Thanh', 'Hầm Đờ Ca-xtơ-ri', 'Đồi A1, C1, D1, E1', 'Sân bay & Cầu Mường Thanh'],
    description:
      'Nằm giữa cánh đồng Mường Thanh hai bên bờ sông Nậm Rốm, tập trung Sở chỉ huy tướng Đờ Ca-xtơ-ri, sân bay Mường Thanh và dãy đồi phòng ngự phía Đông.',
    hint: 'Gợi ý: Ở chính giữa lòng chảo, nơi có sân bay Mường Thanh, cầu Mường Thanh và hầm Đờ Ca-xtơ-ri!',
    accentBg: 'bg-sky-50',
    accentBorder: 'border-sky-400',
    accentText: 'text-sky-800',
    worldPos: [0.35, 0.55, 0.2],
    mapPos2D: [50, 52],
  },
  {
    id: 'south',
    label: 'PHÂN KHU NAM',
    shortTitle: 'Khu vực phía Nam',
    landmarks: ['Cứ điểm Hồng Cúm', 'Sân bay phụ & Cụm pháo Nam'],
    description:
      'Nằm ở phía Nam lòng chảo, có cụm cứ điểm Hồng Cúm, cụm pháo yểm trợ và sân bay phụ nhằm bảo vệ đường rút về Thượng Lào của địch.',
    hint: 'Gợi ý: Ở phía dưới cùng của bản đồ, nơi có cụm cứ điểm Hồng Cúm!',
    accentBg: 'bg-emerald-50',
    accentBorder: 'border-emerald-400',
    accentText: 'text-emerald-800',
    worldPos: [0.55, 0.7, 5.4],
    mapPos2D: [53, 83],
  },
];

/** Geographically accurate 3D landmark coordinates matching Dien Bien Phu 1954 terrain */
export const REALISTIC_MAP_LANDMARKS: RealisticLandmarkPin[] = [
  {
    id: 'him_lam',
    label: 'Him Lam',
    sector: 'north',
    waveFocus: 'wave1',
    worldPos: [2.1, 1.35, -4.6],
    mapPos2D: [67, 21],
    note: 'Cửa ngõ Đông Bắc — 17h05 ngày 13/3/1954, 40 khẩu pháo ta đồng loạt nổ súng mở màn chiến dịch.',
  },
  {
    id: 'doc_lap',
    label: 'Độc Lập',
    sector: 'north',
    waveFocus: 'wave1',
    worldPos: [-0.85, 1.4, -5.8],
    mapPos2D: [49, 15],
    note: 'Đồi dài án ngữ phía Bắc, bị bộ đội ta tiêu diệt gọn trong đêm 14–15/3/1954.',
  },
  {
    id: 'ban_keo',
    label: 'Bản Kéo',
    sector: 'north',
    waveFocus: 'wave1',
    worldPos: [-3.15, 1.1, -3.7],
    mapPos2D: [31, 20],
    note: 'Cứ điểm phía Tây Bắc, bị ta bao vây và bức hàng ngày 17/3/1954, quét sạch Phân khu Bắc.',
  },
  {
    id: 'airstrip',
    label: 'Sân bay Mường Thanh',
    sector: 'center',
    waveFocus: 'wave2',
    worldPos: [-1.45, 0.35, -0.8],
    mapPos2D: [30, 39],
    note: 'Đường băng tiếp viện chính của địch; 8h sáng 13/3 sơn pháo ta bắn cháy 2 máy bay Đa-cô-ta, Đợt 2 ta cắt đứt hoàn toàn.',
  },
  {
    id: 'bridge',
    label: 'Cầu Mường Thanh',
    sector: 'center',
    waveFocus: 'wave3',
    worldPos: [0.78, 0.42, 0.25],
    mapPos2D: [49, 48],
    note: 'Cầu sắt bắc qua sông Nậm Rốm nối khu đồi phía Đông với Sở chỉ huy trung tâm Mường Thanh.',
  },
  {
    id: 'bunker',
    label: 'Hầm Đờ Ca-xtơ-ri',
    sector: 'center',
    waveFocus: 'wave3',
    worldPos: [-0.65, 0.58, 0.92],
    mapPos2D: [30, 56],
    note: 'Sở chỉ huy vòm tôn uốn kiên cố; 17h30 ngày 7/5/1954 lá cờ "Quyết chiến – Quyết thắng" tung bay trên nóc hầm!',
  },
  {
    id: 'doi_d1_e1',
    label: 'Đồi D1 – E1',
    sector: 'center',
    waveFocus: 'wave2',
    worldPos: [2.45, 1.25, -1.75],
    mapPos2D: [67, 38],
    note: 'Cụm đồi cao phía Đông sông Nậm Rốm; chiếm được Đồi D1 giúp sơn pháo ta khống chế xuống Đồi C1 và Mường Thanh.',
  },
  {
    id: 'doi_c1',
    label: 'Đồi C1',
    sector: 'center',
    waveFocus: 'wave2',
    worldPos: [2.75, 1.32, -0.25],
    mapPos2D: [71, 50],
    note: 'Nơi quân ta và địch giằng co từng tấc đất suốt 20 ngày đêm ở Đợt 2 và giải quyết dứt điểm đêm 1/5/1954.',
  },
  {
    id: 'doi_a1',
    label: 'Đồi A1',
    sector: 'center',
    waveFocus: 'wave2',
    worldPos: [2.85, 1.48, 1.45],
    mapPos2D: [67, 63],
    note: '"Yết hầu" phía Đông: giằng co ác liệt 30 ngày đêm; đêm 6/5/1954 ta nổ khối thuốc nổ lớn làm chủ hoàn toàn Đồi A1!',
  },
  {
    id: 'hong_cum',
    label: 'Hồng Cúm',
    sector: 'south',
    waveFocus: 'wave3',
    worldPos: [0.55, 0.65, 5.45],
    mapPos2D: [53, 84],
    note: 'Cụm cứ điểm Phân khu Nam có cụm pháo và sân bay phụ; đêm 7/5/1954 toàn bộ địch tại đây bị bắt làm tù binh.',
  },
];

export const CAMPAIGN_WAVES: CampaignWave[] = [
  {
    id: 'wave1',
    waveNumber: 1,
    title: 'Đợt 1',
    dateRange: '13/3 – 17/3/1954',
    historicalDateNote: 'Mở màn bão táp · Phá vỡ cửa ngõ phía Bắc',
    headline: 'Tiêu diệt gọn Him Lam, Độc Lập và bức hàng Bản Kéo ở Phân khu Bắc',
    summary: 'Tiến công tiêu diệt các cứ điểm Him Lam, Độc Lập, Bản Kéo và quét sạch phân khu Bắc.',
    narration:
      'Sáng ngày 13 tháng 3 năm 1954, sơn pháo ta bắn cháy 2 máy bay Đa-cô-ta trên sân bay Mường Thanh. Đúng 17 giờ 5 phút, 40 khẩu pháo đồng loạt khai hỏa vào Him Lam! Quân ta tiêu diệt gọn Him Lam, Độc Lập và bức hàng Bản Kéo, phá vỡ hoàn toàn cửa ngõ phía Bắc!',
    focusLandmarks: ['Him Lam', 'Độc Lập', 'Bản Kéo', 'Sân bay Mường Thanh'],
    keyFacts: [
      '8h00 sáng 13/3/1954: Sơn pháo ta bắn cháy 2 máy bay Đa-cô-ta vừa hạ cánh trên sân bay Mường Thanh.',
      '17h05 ngày 13/3/1954: Sau hiệu lệnh Đại tướng Võ Nguyên Giáp, 40 khẩu pháo 75–120 ly đồng loạt bắn vào cứ điểm Him Lam.',
      'Tiêu diệt gọn Him Lam, Độc Lập và bức hàng Bản Kéo, mở toang cửa ngõ phía Bắc tập đoàn cứ điểm.',
    ],
    resultHighlight: 'Loại khỏi vòng chiến đấu trên 2.000 địch · Phá hủy 25 máy bay · Uy hiếp trực tiếp sân bay Mường Thanh',
    imageUrl: WAVE_ILLUSTRATIONS.him_lam,
    imageCaption: 'Bộ đội ta xung phong tiêu diệt cụm cứ điểm cửa ngõ Him Lam ở Phân khu Bắc (13/3 – 17/3/1954).',
    colorHex: '#EA580C',
    bgClass: 'bg-orange-600',
    borderClass: 'border-orange-500',
    textClass: 'text-orange-700',
    cameraPos: [-5.6, 7.6, -9.8],
    cameraTarget: [-0.2, 0.7, -4.7],
  },
  {
    id: 'wave2',
    waveNumber: 2,
    title: 'Đợt 2',
    dateRange: '30/3 – 26/4/1954',
    historicalDateNote: 'Đợt tấn công dai dẳng, quyết liệt nhất (chiến sự kéo dài tới 30/4/1954)',
    headline: 'Đào giao thông hào vây lấn, giành giật từng tấc đất trên các đồi phía Đông',
    summary: 'Tiến công và chiếm các cứ điểm phía đông phân khu Trung tâm, cắt đứt sân bay Mường Thanh.',
    narration:
      'Đợt 2 từ ngày 30 tháng 3 đến cuối tháng 4 là đợt tấn công dài ngày và quyết liệt nhất! Bộ đội ta đào mạng lưới giao thông hào khép chặt vòng vây, cắt đứt sân bay Mường Thanh và giành giật từng tấc đất trên các ngọn đồi phía Đông như Đồi D1, Đồi C1 và Đồi A1.',
    focusLandmarks: ['Đồi A1 (30 ngày đêm)', 'Đồi C1 (20 ngày đêm)', 'Đồi D1 – E1', 'Giao thông hào & Sân bay'],
    keyFacts: [
      'Đợt chiến đấu dai dẳng, dài ngày và gay go nhất: ta và địch giành giật nhau từng tấc đất, từng đoạn giao thông hào.',
      'Áp dụng chiến thuật "đánh lấn" đào hào cắt ngang, khống chế sân bay Mường Thanh, bóp nghẹt đường tiếp viện của địch.',
      'Tại Đồi C1 hai bên giằng co suốt 20 ngày đêm; tại Đồi A1 trận chiến ác liệt kéo dài tới 30 ngày đêm.',
    ],
    resultHighlight: 'Khu trung tâm Mường Thanh rơi vào tầm bắn mọi loại súng của ta · Vòng vây siết chặt',
    imageUrl: WAVE_ILLUSTRATIONS.doi_a1,
    imageCaption: 'Hệ thống giao thông hào vây lấn các cao điểm phía Đông (Đồi A1, C1) và chia cắt sân bay Mường Thanh.',
    colorHex: '#0284C7',
    bgClass: 'bg-sky-600',
    borderClass: 'border-sky-500',
    textClass: 'text-sky-700',
    cameraPos: [9.4, 7.0, -1.2],
    cameraTarget: [1.6, 0.8, 0.2],
  },
  {
    id: 'wave3',
    waveNumber: 3,
    title: 'Đợt 3',
    dateRange: '1/5 – 7/5/1954',
    historicalDateNote: 'Tổng công kích · Toàn thắng lịch sử 17h30 ngày 7/5/1954',
    headline: 'Đánh sập hầm ngầm Đồi A1, tổng công kích Mường Thanh và bắt sống tướng Đờ Ca-xtơ-ri!',
    summary: 'Tiến công vào trung tâm Mường Thanh và phân khu Nam; chiến dịch toàn thắng.',
    narration:
      'Đợt 3 bắt đầu lúc 17 giờ ngày 1 tháng 5 năm 1954! Đêm 6 tháng 5, quân ta đánh sập hầm ngầm kiên cố làm chủ hoàn toàn Đồi A1. Đúng 17 giờ 30 phút ngày 7 tháng 5, tướng Đờ Ca-xtơ-ri cùng toàn bộ Bộ Tham mưu ra hàng, lá cờ Quyết chiến Quyết thắng tung bay trên nóc hầm!',
    focusLandmarks: ['Đồi A1 (đêm 6/5)', 'Cầu & Hầm Đờ Ca-xtơ-ri (17h30 · 7/5)', 'Hồng Cúm (đêm 7/5)'],
    keyFacts: [
      '17h00 ngày 1/5/1954: Pháo ta đồng loạt nhả đạn làm tê liệt pháo Hồng Cúm; đêm đầu tiêu diệt gọn C1, 505, 505A và 311A.',
      'Đêm 6/5/1954: Dùng thuốc nổ phá sập hầm ngầm kiên cố trên Đồi A1, bắt sống khoảng 400 địch, mở toang đường vào trung tâm.',
      '17h30 ngày 7/5/1954: Cờ "Quyết chiến – Quyết thắng" tung bay trên nóc hầm Đờ Ca-xtơ-ri; 24h đêm 7/5 giải phóng hoàn toàn Hồng Cúm.',
    ],
    resultHighlight: '55–56 ngày đêm · Diệt & bắt sống 16.200 địch · Bắn rơi 62 máy bay · Toàn thắng lịch sử!',
    imageUrl: WAVE_ILLUSTRATIONS.muong_thanh,
    imageCaption: '17h30 ngày 7/5/1954: Lá cờ "Quyết chiến – Quyết thắng" tung bay rực rỡ trên nóc hầm tướng Đờ Ca-xtơ-ri.',
    colorHex: '#DC2626',
    bgClass: 'bg-red-600',
    borderClass: 'border-red-500',
    textClass: 'text-red-700',
    cameraPos: [4.8, 6.2, 8.8],
    cameraTarget: [0.1, 0.7, 0.7],
  },
];

export const CAMPAIGN_VICTORY_STATS: CampaignVictoryStat[] = [
  {
    value: '55–56',
    label: 'Ngày đêm chiến đấu',
    detail: 'Từ 13/3 đến 7/5/1954 (dũng cảm, mưu trí, sáng tạo)',
  },
  {
    value: '16.200',
    label: 'Quân địch bị loại',
    detail: 'Tiêu diệt và bắt sống toàn bộ Tập đoàn cứ điểm',
  },
  {
    value: '62',
    label: 'Máy bay bị bắn rơi',
    detail: 'Phá hủy cầu hàng không tiếp viện của địch',
  },
  {
    value: '64',
    label: 'Ô tô & toàn bộ vũ khí',
    detail: 'Thu giữ toàn bộ quân trang, đạn dược của địch',
  },
];

export const ADDITIONAL_HERO_SPOTLIGHTS: AdditionalHeroSpotlight[] = [
  {
    id: 'chu_van_mui',
    name: 'Chiến sĩ điện thanh Chu Văn Mùi',
    role: 'Thông tin pháo binh trên cao điểm',
    deed: 'Một mình bám trụ đỉnh đồi dù nhịn đói, vừa đánh địch bảo vệ thương binh, vừa dùng máy điện thanh chỉ mục tiêu cho pháo ta diệt địch chính xác.',
  },
  {
    id: 'le_van_dy',
    name: 'Đại đội trưởng Lê Văn Dỵ',
    role: 'Đại đội 811 phòng ngự Đồi C1',
    deed: 'Suốt 20 ngày đêm giữ vững công sự trên C1, tin tưởng tuyệt đối vào độ chính xác của pháo binh ta để chớp thời cơ xung phong tiêu diệt gọn cứ điểm.',
  },
  {
    id: 'hung_sinh',
    name: 'Trung đoàn trưởng Hùng Sinh',
    role: 'Chỉ huy kiên cường giữa trận địa',
    deed: 'Gan dạ, bình tĩnh trực tiếp chiến đấu cùng các chiến sĩ đẩy lùi nhiều đợt phản kích ác liệt của quân Pháp.',
  },
];

/** Cards intentionally ordered A, B, C so students sort them into B -> A -> C */
export const SEQUENCE_CARDS: SequenceCard[] = [
  {
    id: 'A',
    code: 'Thẻ A',
    text: 'Tiến công tiêu diệt các cứ điểm phía đông phân khu Trung tâm.',
    correctSlotIndex: 1,
    waveNumber: 2,
    dateRange: '30/3 – 26/4/1954',
    milestoneTitle: 'Đợt 2: Đào hào vây lấn, chiếm các đồi phía Đông',
    illustrationKey: 'doi_a1',
    imageUrl: WAVE_ILLUSTRATIONS.doi_a1,
    statNote: 'Giằng co 20 ngày ở Đồi C1, 30 ngày ở Đồi A1 và cắt đứt sân bay Mường Thanh.',
  },
  {
    id: 'B',
    code: 'Thẻ B',
    text: 'Tiến công tiêu diệt cứ điểm Him Lam và các cứ điểm ở phân khu Bắc.',
    correctSlotIndex: 0,
    waveNumber: 1,
    dateRange: '13/3 – 17/3/1954',
    milestoneTitle: 'Đợt 1: Mở màn thắng lợi ở Him Lam – Độc Lập – Bản Kéo',
    illustrationKey: 'him_lam',
    imageUrl: WAVE_ILLUSTRATIONS.him_lam,
    statNote: '17h05 ngày 13/3 khai hỏa 40 khẩu pháo; diệt trên 2.000 địch, phá hủy 25 máy bay.',
  },
  {
    id: 'C',
    code: 'Thẻ C',
    text: 'Tổng công kích vào trung tâm Mường Thanh, bắt sống tướng Đờ Ca-xtơ-ri, chiến dịch toàn thắng.',
    correctSlotIndex: 2,
    waveNumber: 3,
    dateRange: '1/5 – 7/5/1954',
    milestoneTitle: 'Đợt 3: Cờ Quyết thắng tung bay trên nóc hầm (17h30 · 7/5)',
    illustrationKey: 'muong_thanh',
    imageUrl: WAVE_ILLUSTRATIONS.muong_thanh,
    statNote: 'Toàn thắng sau 55–56 ngày đêm: loại 16.200 địch, bắn rơi 62 máy bay!',
  },
];

export const HERO_ITEMS: HeroItem[] = [
  {
    id: 'to_vinh_dien',
    name: 'Anh hùng Tô Vĩnh Diện',
    deed: 'Dũng cảm lấy thân mình chèn bánh pháo để bảo vệ khẩu pháo không rơi xuống vực sâu.',
    shortTag: 'Kéo pháo ở Điện Biên Phủ',
    storyNote: 'Tấm gương bất tử với lời thề "Thà hi sinh, quyết bảo vệ pháo!".',
    colorClass: 'bg-amber-50 border-amber-300 text-amber-900',
  },
  {
    id: 'phan_dinh_giot',
    name: 'Anh hùng Phan Đình Giót',
    deed: 'Lấy thân mình lấp lỗ châu mai ở cứ điểm Him Lam, mở đường cho đồng đội xung phong.',
    shortTag: 'Trận mở màn Him Lam (13/3/1954)',
    storyNote: 'Anh hô vang "Quyết hi sinh vì Đảng, vì dân!" trước khi dập tắt hỏa điểm địch.',
    colorClass: 'bg-rose-50 border-rose-300 text-rose-900',
  },
  {
    id: 'be_van_dan',
    name: 'Anh hùng Bế Văn Đàn',
    deed: 'Lấy vai và thân mình làm giá súng để đồng đội bắn tiêu diệt quân địch phản kích.',
    shortTag: 'Trận Mường Pồn',
    storyNote: 'Giữa tình thế cấp bách, anh kê hai chân súng lên vai mình và hô to "Bắn ngay!".',
    colorClass: 'bg-emerald-50 border-emerald-300 text-emerald-900',
  },
  {
    id: 'ta_quoc_luat',
    name: 'Đồng chí Tạ Quốc Luật',
    deed: 'Dẫn đầu tổ xung kích 5 người xông vào hầm chỉ huy, bắt sống tướng Đờ Ca-xtơ-ri.',
    shortTag: 'Chiều 7/5/1954 (17h30)',
    storyNote: 'Đánh dấu sự sụp đổ hoàn toàn của tập đoàn cứ điểm Điện Biên Phủ.',
    colorClass: 'bg-sky-50 border-sky-300 text-sky-900',
  },
];

export const HISTORICAL_MESSAGES: HistoricalMessage[] = [
  {
    id: 'msg_solidarity',
    text: 'Tinh thần đoàn kết, quyết tâm vượt qua khó khăn.',
    isHistorical: true,
    feedback: 'Chính xác! Hàng vạn bộ đội và dân công đã đồng lòng kéo pháo vượt núi cao, vực sâu.',
  },
  {
    id: 'msg_courage',
    text: 'Lòng dũng cảm và sự hi sinh vì Tổ quốc.',
    isHistorical: true,
    feedback: 'Tuyệt vời! Tấm gương anh hùng Tô Vĩnh Diện, Phan Đình Giót, Bế Văn Đàn mãi sáng ngời.',
  },
  {
    id: 'msg_resilience',
    text: 'Ý chí chiến đấu kiên cường của quân và dân ta.',
    isHistorical: true,
    feedback: 'Đúng rồi! 56 ngày đêm khoét núi, ngủ hầm, mưa dầm cơm vắt làm nên chiến thắng lừng lẫy.',
  },
  {
    id: 'msg_distractor',
    text: 'Bỏ cuộc ngay khi gặp đường núi dốc cao, trơn trượt.',
    isHistorical: false,
    feedback: 'Ồ, chưa đúng rồi! Bộ đội ta luôn kiên trì, không bao giờ lùi bước trước gian khổ đâu em nhé!',
  },
];

export const ARTILLERY_STORY_DURATION = 36;

export const ARTILLERY_STORY_CHAPTERS: StoryChapter[] = [
  {
    id: 1,
    startSec: 0,
    endSec: 12,
    title: 'Chặng 1: Dùng sức người mở đường, kéo pháo vào trận địa',
    narration:
      'Giữa núi rừng Tây Bắc hiểm trở, với tinh thần "Tất cả để chiến thắng", các chiến sĩ dùng dây tời kéo những khẩu pháo nặng hàng tấn vượt suối sâu, đèo cao, đường trơn trượt.',
    chant: 'Hò dô ta nào! Kéo pháo ta vượt qua đèo!',
  },
  {
    id: 2,
    startSec: 12,
    endSec: 24,
    title: 'Chặng 2: Kéo pháo ra – Tấm gương anh hùng Tô Vĩnh Diện',
    narration:
      'Để đảm bảo chắc thắng, bộ đội nhận lệnh kéo pháo ra. Trên con dốc dựng đứng đầy bom đạn, dây kéo đứt! Anh hùng Tô Vĩnh Diện đã dũng cảm lấy thân mình chèn bánh pháo để cứu pháo.',
    chant: 'Thà hi sinh, quyết bảo vệ pháo!',
  },
  {
    id: 3,
    startSec: 24,
    endSec: 36,
    title: 'Chặng 3: Vượt mọi gian khổ, làm nên chiến thắng lừng lẫy',
    narration:
      'Nhờ ý chí sắt đá và tình đoàn kết của bộ đội pháo binh, những khẩu pháo đã sẵn sàng nhả đạn, góp phần làm nên chiến thắng lịch sử Điện Biên Phủ ngày 7/5/1954!',
    chant: 'Quyết chiến – Quyết thắng!',
  },
];
