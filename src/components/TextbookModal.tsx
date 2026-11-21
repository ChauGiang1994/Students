import { useState } from 'react';
import { BookOpen, Medal, X } from 'lucide-react';
import {
  ADDITIONAL_HERO_SPOTLIGHTS,
  CAMPAIGN_VICTORY_STATS,
  CAMPAIGN_WAVES,
  SCHOOL_NAME,
} from '../data/campaignData';

interface TextbookModalProps {
  open: boolean;
  onClose: () => void;
}

const TEXTBOOK_PAGES = [
  {
    id: 'p65-66',
    label: 'SGK Trang 65 – 66: Lược đồ & Kéo pháo',
    src: '/assets/aistudio/image_f9cf3f66.png',
    alt: 'Sách giáo khoa Lịch sử và Địa lí lớp 5 Bài 15 trang 65 và 66 về lược đồ chiến dịch Điện Biên Phủ, sơ đồ 3 đợt tiến công và câu chuyện kéo pháo',
  },
  {
    id: 'p67-68',
    label: 'SGK Trang 67 – 68: Tướng Đờ Ca-xtơ-ri & Anh hùng',
    src: '/assets/aistudio/image_856ccc49.png',
    alt: 'Sách giáo khoa Lịch sử và Địa lí lớp 5 Bài 15 trang 67 và 68 về chuyện bắt sống tướng Đờ Ca-xtơ-ri và các anh hùng Bế Văn Đàn, Phan Đình Giót',
  },
];

export function TextbookModal({ open, onClose }: TextbookModalProps) {
  const [activeTab, setActiveTab] = useState<'p65-66' | 'p67-68' | 'archive'>('p65-66');
  const [imgFailed, setImgFailed] = useState<Record<string, boolean>>({});

  if (!open) return null;
  const page = TEXTBOOK_PAGES.find((p) => p.id === activeTab);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="textbook-modal-title"
    >
      <div className="animate-pop-in flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border-2 border-amber-300 bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 bg-amber-50 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <BookOpen className="h-6 w-6 shrink-0 text-amber-700" aria-hidden="true" />
            <div>
              <p className="text-xs font-extrabold tracking-wide text-emerald-800 uppercase">
                {SCHOOL_NAME}
              </p>
              <h2 id="textbook-modal-title" className="font-display text-lg font-extrabold text-slate-900 sm:text-xl">
                Kho tư liệu SGK Lớp 5 &amp; Báo Điện tử Chính phủ – Điện Biên Phủ 1954
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng cửa sổ tư liệu lịch sử"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="flex flex-wrap gap-2 border-b border-slate-200 bg-slate-50 px-5 py-3">
          {TEXTBOOK_PAGES.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setActiveTab(p.id as 'p65-66' | 'p67-68')}
              className={`rounded-xl px-4 py-2 text-sm font-bold transition-colors cursor-pointer ${
                activeTab === p.id
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'border border-slate-300 bg-white text-slate-700 hover:bg-emerald-50'
              }`}
            >
              {p.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setActiveTab('archive')}
            className={`rounded-xl px-4 py-2 text-sm font-bold transition-colors cursor-pointer ${
              activeTab === 'archive'
                ? 'bg-red-700 text-white shadow-sm'
                : 'border border-amber-300 bg-amber-50 text-amber-950 hover:bg-amber-100'
            }`}
          >
            Tư liệu mở rộng: 3 đợt tấn công & Con số lịch sử
          </button>
        </div>

        <div className="flex-1 overflow-auto bg-slate-100 p-4 md:p-5">
          {activeTab === 'archive' ? (
            <div className="space-y-5">
              {/* Campaign Victory Numbers */}
              <div className="rounded-2xl border border-amber-300 bg-white p-4 shadow-xs">
                <h3 className="font-display text-lg font-extrabold text-red-800">
                  Kết quả toàn Chiến dịch Điện Biên Phủ (13/3 – 7/5/1954)
                </h3>
                <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
                  {CAMPAIGN_VICTORY_STATS.map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-center"
                    >
                      <div className="font-display text-2xl font-extrabold text-red-700">
                        {stat.value}
                      </div>
                      <div className="text-sm font-extrabold text-slate-900">{stat.label}</div>
                      <div className="mt-0.5 text-xs font-medium text-slate-600">{stat.detail}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Illustrated 3 Attack Waves */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {CAMPAIGN_WAVES.map((wave) => (
                  <article
                    key={wave.id}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs"
                  >
                    <img
                      src={wave.imageUrl}
                      alt={wave.imageCaption}
                      referrerPolicy="no-referrer"
                      className="aspect-[4/3] w-full object-cover"
                    />
                    <div className="p-4">
                      <p className={`font-mono text-xs font-extrabold ${wave.textClass}`}>
                        {wave.title} · {wave.dateRange}
                      </p>
                      <h4 className="mt-1 font-display text-base font-extrabold text-slate-900">
                        {wave.headline}
                      </h4>
                      <ul className="mt-2 space-y-1.5 text-xs leading-relaxed font-medium text-slate-700">
                        {wave.keyFacts.map((fact, idx) => (
                          <li key={idx}>• {fact}</li>
                        ))}
                      </ul>
                    </div>
                  </article>
                ))}
              </div>

              {/* Additional Heroes from Bao Chinh Phu */}
              <div className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-xs">
                <div className="flex items-center gap-2 text-emerald-800">
                  <Medal className="h-5 w-5" aria-hidden="true" />
                  <h3 className="font-display text-lg font-extrabold">
                    Thêm những tấm gương quả cảm trong 3 đợt tấn công
                  </h3>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                  {ADDITIONAL_HERO_SPOTLIGHTS.map((hero) => (
                    <div
                      key={hero.id}
                      className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3.5"
                    >
                      <p className="font-display text-base font-extrabold text-slate-900">
                        {hero.name}
                      </p>
                      <p className="text-xs font-bold text-emerald-700">{hero.role}</p>
                      <p className="mt-1.5 text-xs leading-relaxed font-medium text-slate-700">
                        {hero.deed}
                      </p>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-xs font-semibold text-slate-500">
                  Tổng hợp từ Sách giáo khoa Lịch sử và Địa lí lớp 5 (Bài 15) và Báo Điện tử Chính phủ.
                </p>
              </div>
            </div>
          ) : page && imgFailed[page.id] ? (
            <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-slate-300 bg-white p-6 text-center">
              <p className="font-display text-lg font-bold text-slate-800">{page.label}</p>
              <p className="mt-2 text-sm text-slate-600">
                Không thể tải ảnh trang sách giáo khoa. Em hãy sử dụng các trạm tương tác 3D để khám phá đầy đủ kiến thức nhé!
              </p>
            </div>
          ) : page ? (
            <img
              src={page.src}
              alt={page.alt}
              referrerPolicy="no-referrer"
              onError={() => setImgFailed((prev) => ({ ...prev, [page.id]: true }))}
              className="mx-auto max-h-[65vh] w-auto rounded-xl border border-slate-200 bg-white object-contain shadow-sm"
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
