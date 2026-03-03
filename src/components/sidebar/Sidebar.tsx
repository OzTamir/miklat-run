import type { ReactNode } from 'react';
import { useRouteStore } from '@/stores/route-store';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { AddressSearch } from './AddressSearch';
import { ModeToggle } from './ModeToggle';
import { DistanceMode } from './DistanceMode';
import { PaceMode } from './PaceMode';
import { BiasToggle } from './BiasToggle';
import { GenerateButton } from './GenerateButton';
import { RouteInfo } from './RouteInfo';
import { HowItWorks } from './HowItWorks';
import { SidebarFooter } from './SidebarFooter';

function SidebarHeader() {
  return (
    <div className="flex items-center gap-3">
      <svg
        width="36"
        height="36"
        viewBox="0 0 36 36"
        fill="none"
        className="shrink-0"
      >
        <rect
          x="2"
          y="2"
          width="32"
          height="32"
          rx="8"
          fill="rgba(232,145,58,0.15)"
          stroke="#e8913a"
          strokeWidth="1.5"
        />
        <path
          d="M18 7L11 14v11h4v-6h6v6h4V14L18 7z"
          fill="#e8913a"
          opacity="0.9"
        />
        <circle cx="18" cy="17" r="3" fill="#141b2d" />
        <path
          d="M18 15v4M16 17h4"
          stroke="#e8913a"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M10 30h16"
          stroke="#e8913a"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.5"
        />
        <path
          d="M8 28c2-1 4-3 4-5M28 28c-2-1-4-3-4-5"
          stroke="#e8913a"
          strokeWidth="1"
          strokeLinecap="round"
          opacity="0.3"
        />
      </svg>
      <div className="text-start">
        <h1 className="text-[20px] font-semibold tracking-tight text-text-primary">
          {'מסלול מוגן'}
        </h1>
        <p className="text-[13px] text-text-secondary">
          {'תכנון ריצה בבטוחה בתל אביב'}
        </p>
      </div>
    </div>
  );
}

interface SidebarProps {
  children?: ReactNode;
}

export function Sidebar({ children }: SidebarProps) {
  const sidebarExpanded = useRouteStore((s) => s.sidebarExpanded);
  const toggleSidebar = useRouteStore((s) => s.toggleSidebar);

  return (
    <>
      {/* Desktop: fixed right panel */}
      <aside dir="rtl" className="hidden md:fixed md:inset-y-0 md:right-0 md:z-30 md:flex md:w-[340px] md:flex-col md:border-l md:border-white/[0.04] md:bg-bg-surface">
        <div className="px-5 py-4">
          <SidebarHeader />
        </div>
        <Separator className="bg-white/[0.04]" />
        <ScrollArea className="flex-1">
          <div data-sidebar-content className="flex flex-col gap-0">
            <SidebarSection>
              <AddressSearch />
            </SidebarSection>
            <SidebarSection>
              <div className="text-[13px] font-medium text-text-primary mb-3 text-start">
                {'תכנון מסלול'}
              </div>
              <ModeToggle />
              <DistanceMode />
              <PaceMode />
              <BiasToggle />
            </SidebarSection>
            <SidebarSection>
              <GenerateButton />
            </SidebarSection>
            <SidebarSection>
              <RouteInfo />
            </SidebarSection>
            <SidebarSection>
              <HowItWorks />
            </SidebarSection>
            {children}
          </div>
        </ScrollArea>
        <SidebarFooter />
      </aside>

      {/* Mobile: bottom sheet */}
      <aside
        dir="rtl"
        className={`fixed inset-x-0 bottom-0 z-40 flex flex-col bg-bg-surface rounded-t-2xl shadow-[0_-8px_32px_rgba(0,0,0,0.4)] transition-transform duration-300 ease-out md:hidden ${
          sidebarExpanded
            ? 'translate-y-0'
            : 'translate-y-[calc(100%-56px)]'
        }`}
        style={{ maxHeight: '70vh' }}
      >
        <button
          type="button"
          onClick={toggleSidebar}
          className="flex w-full cursor-pointer flex-col items-center px-5 py-3"
        >
          <div className="mb-3 h-1 w-9 rounded-full bg-white/20" />
          <SidebarHeader />
        </button>
        <Separator className="bg-white/[0.04]" />
        <ScrollArea className="flex-1 overflow-hidden">
          <div data-sidebar-content className="flex flex-col gap-0">
            <SidebarSection>
              <AddressSearch />
            </SidebarSection>
            <SidebarSection>
              <div className="text-[13px] font-medium text-text-primary mb-3 text-start">
                {'תכנון מסלול'}
              </div>
              <ModeToggle />
              <DistanceMode />
              <PaceMode />
              <BiasToggle />
            </SidebarSection>
            <SidebarSection>
              <GenerateButton />
            </SidebarSection>
            <SidebarSection>
              <RouteInfo />
            </SidebarSection>
            <SidebarSection>
              <HowItWorks />
            </SidebarSection>
            {children}
          </div>
        </ScrollArea>
        <SidebarFooter />
      </aside>
    </>
  );
}

function SidebarSection({ children }: { children: ReactNode }) {
  return (
    <div className="border-b border-white/[0.04] px-5 py-4 last:border-b-0">
      {children}
    </div>
  );
}
