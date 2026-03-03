import { Github } from 'lucide-react';

const GITHUB_URL = 'https://github.com/OzTamir/miklat-run';

function BuyMeACoffee() {
  return (
    <a
      href="https://buymeacoffee.com/oztamir"
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

export function SidebarFooter() {
  return (
    <div className="flex shrink-0 flex-col items-center gap-3 border-t border-white/[0.04] px-5 py-4 mb-4">
      <div className="flex items-center gap-3">
        <a
          href="https://oztamir.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[12px] text-text-secondary hover:text-text-primary transition-colors text-center underline"
        >
          {'נבנה '}
          <span className="line-through opacity-50">{'ב❤️'}</span>
          {' מהמקלט על ידי עוז תמיר'}
        </a>
        <span className="text-[12px] text-text-secondary">|</span>
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-text-secondary hover:text-text-primary transition-colors p-1 rounded"
          aria-label="GitHub repository"
        >
          <Github className="size-5" />
        </a>
      </div>
      <BuyMeACoffee />
      <div className="flex items-center gap-3">
        <a href="mailto:help@miklat.run" className="text-[12px] text-text-secondary hover:text-text-primary transition-colors text-center underline">
          {'בעיות? תקלות? הצעות? שלחו לי מייל!'}
        </a>
      </div>
    </div>
  );
}
