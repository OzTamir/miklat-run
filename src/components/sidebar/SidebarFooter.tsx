import { Github } from 'lucide-react';
import { BuyMeACoffee } from './BuyMeACoffee';
import { ThemeSelector } from './ThemeSelector';

const GITHUB_URL = 'https://github.com/OzTamir/miklat-run';
const SUPPORT_EMAIL = 'help@miklat.run';
const SUPPORT_EMAIL_SUBJECT = 'מסלול מוגן - טופס יצירת קשר';
const SUPPORT_EMAIL_URL = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(SUPPORT_EMAIL_SUBJECT)}`;

export function SidebarFooter() {
  return (
    <div className="mb-4 flex shrink-0 flex-col items-center gap-3 border-t app-border-soft px-5 py-4">
      <div className="flex items-center gap-3">
        <a
          href="https://oztamir.com?utm_source=miklat-run"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[12px] text-text-secondary hover:text-text-primary transition-colors text-center underline"
        >
          {'נבנה '}
          <span className="line-through opacity-50">{'ב❤️'}</span>
          {' במקלט על ידי עוז תמיר'}
        </a>
        <span className="text-[10px] text-text-secondary/25">|</span>
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-text-secondary hover:text-text-primary transition-colors p-1 rounded"
          aria-label="GitHub repository"
        >
          <Github className="size-5" />
        </a>
        <span className="text-[10px] text-text-secondary/25">|</span>
        <ThemeSelector />
      </div>
      <BuyMeACoffee />
      <div className="flex items-center gap-3">
        <a href={SUPPORT_EMAIL_URL} className="text-[12px] text-text-secondary hover:text-text-primary transition-colors text-center underline">
          {'בעיות? תקלות? הצעות? שלחו לי מייל!'}
        </a>
      </div>
    </div>
  );
}
