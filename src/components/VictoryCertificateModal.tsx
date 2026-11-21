import { Award, RotateCcw, Star, X } from 'lucide-react';
import { SCHOOL_NAME } from '../data/campaignData';

interface VictoryCertificateModalProps {
  open: boolean;
  onClose: () => void;
  onResetAll: () => void;
}

export function VictoryCertificateModal({
  open,
  onClose,
  onResetAll,
}: VictoryCertificateModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="certificate-title"
    >
      <div className="animate-pop-in relative w-full max-w-2xl overflow-hidden rounded-3xl border-4 border-amber-400 bg-gradient-to-b from-[#FFFDF2] to-[#FEF3C7] p-6 text-center shadow-2xl md:p-8">
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng chứng nhận"
          className="absolute top-4 right-4 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-amber-300 bg-white text-slate-700 hover:bg-amber-50 cursor-pointer"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>

        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-600 text-amber-300 shadow-lg">
          <Award className="h-11 w-11" aria-hidden="true" />
        </div>

        <p className="mt-4 text-sm font-extrabold tracking-widest text-emerald-800 uppercase">
          {SCHOOL_NAME}
        </p>
        <p className="mt-1 text-xs font-extrabold tracking-wide text-red-700 sm:text-sm">
          CHỨNG NHẬN HOÀN THÀNH XUẤT SẮC · BÀI 15 LỊCH SỬ LỚP 5
        </p>
        <h2 id="certificate-title" className="mt-2 font-display text-3xl font-extrabold text-slate-950 md:text-4xl">
          Nhà Sử Học Nhí Điện Biên Phủ 1954
        </h2>

        <p className="mx-auto mt-3 max-w-xl text-lg leading-relaxed font-semibold text-slate-800">
          Chúc mừng em đã hoàn thành xuất sắc cả 3 thử thách khám phá Chiến dịch Điện Biên Phủ năm 1954!
        </p>

        <div className="mt-6 grid grid-cols-1 gap-3 text-left sm:grid-cols-3">
          {[
            'Xác định đúng 3 phân khu trên sa bàn lịch sử',
            'Sắp xếp đúng diễn biến 3 đợt tiến công',
            'Hiểu câu chuyện kéo pháo & các anh hùng',
          ].map((item) => (
            <div
              key={item}
              className="flex items-start gap-2 rounded-2xl border border-amber-300 bg-white/90 p-3.5 text-sm font-bold text-emerald-950 shadow-sm"
            >
              <Star className="mt-0.5 h-4 w-4 shrink-0 fill-amber-400 text-amber-500" aria-hidden="true" />
              <span>{item}</span>
            </div>
          ))}
        </div>

        <p className="mt-5 font-display text-lg font-bold text-red-800">
          “Chín năm làm một Điện Biên / Nên vành hoa đỏ, nên thiên sử vàng!”
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl bg-emerald-600 px-6 py-3 text-base font-extrabold text-white shadow-sm hover:bg-emerald-700 cursor-pointer"
          >
            Tiếp tục khám phá sa bàn
          </button>
          <button
            type="button"
            onClick={() => {
              onResetAll();
              onClose();
            }}
            className="inline-flex items-center gap-2 rounded-2xl border-2 border-amber-400 bg-white px-5 py-3 text-base font-bold text-amber-950 hover:bg-amber-50 cursor-pointer"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            <span>Chơi lại từ đầu</span>
          </button>
        </div>
      </div>
    </div>
  );
}
