const BUY_ME_A_COFFEE_URL = 'https://ozt.am/bmc?utm_source=miklat-vite';

export function BuyMeACoffee() {
  return (
    <a
      href={BUY_ME_A_COFFEE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 rounded-lg bg-[#e8913a] px-4 py-2 text-xl text-white font-semibold shadow-sm transition hover:opacity-90"
      style={{ fontFamily: '"Cookie", cursive' }}
    >
      {'Pay my Claud Subscription'}
      <span aria-hidden className="mt-1">🤖</span>
    </a>
  );
}
