import { useLocale } from "@/lib/i18n";

export function TrialExpiredModal({ onClose }: { onClose: () => void }) {
  const { locale } = useLocale();
  const fa = locale === "fa";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg-0/85 backdrop-blur px-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl border border-cream/10 bg-bg-1 p-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-md text-cream/70 hover:text-cream-bright"
        >
          ✕
        </button>
        <h2 className={`text-2xl text-cream-bright ${fa ? "font-vazir" : "font-display"}`}>
          {fa ? "دوره آزمایشی شما پایان یافت" : "Your trial has ended"}
        </h2>
        <p className="mt-3 text-sm text-cream/70">
          {fa
            ? "برای ادامه تماشای محتوای ویژه، عضویت کامل را فعال کنید. حساب، فهرست تماشا و تاریخچه شما حفظ شده است."
            : "Activate full membership to keep watching premium content. Your account, watchlist, and viewing history are saved."}
        </p>
        <ul className="mt-5 space-y-2 text-sm text-cream/75">
          <li>• {fa ? "تماشای نامحدود کاتالوگ" : "Unlimited access to the catalog"}</li>
          <li>• {fa ? "هر زمان لغو کنید" : "Cancel anytime"}</li>
          <li>• {fa ? "ارتقای سریع" : "Quick, simple upgrade"}</li>
        </ul>
        <a
          href="/account"
          className="mt-7 block w-full rounded-md bg-amber px-5 py-3 text-center text-sm font-medium text-bg-0 hover:bg-amber/90"
        >
          {fa ? "ارتقا به عضویت" : "Upgrade to membership"}
        </a>
      </div>
    </div>
  );
}
