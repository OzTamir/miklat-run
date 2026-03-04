import type { ReactNode } from 'react';
import { useRouteStore } from '@/stores/route-store';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { MobileBottomDrawer } from '@/components/ui/MobileBottomDrawer';
import { AddressSearch } from './AddressSearch';
import { ModeToggle } from './ModeToggle';
import { DistanceMode } from './DistanceMode';
import { PaceMode } from './PaceMode';
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

const TOP_GAP = 64;

function DrawerSections({ children, includeFooter }: { children?: ReactNode; includeFooter?: boolean }) {
  return (
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
      {includeFooter ? <SidebarFooter /> : null}
    </div>
  );
}

export function Sidebar({ children }: SidebarProps) {
  const sidebarExpanded = useRouteStore((s) => s.sidebarExpanded);
  const mobileDrawerSize = useRouteStore((s) => s.mobileDrawerSize);
  const toggleSidebar = useRouteStore((s) => s.toggleSidebar);
  const setMobileDrawer = useRouteStore((s) => s.setMobileDrawer);
  const routeData = useRouteStore((s) => s.routeData);

  const showMobileConfig = !routeData;

  return (
    <>
      {/* Desktop: fixed right panel */}
      <aside dir="rtl" className="hidden md:fixed md:inset-y-0 md:right-0 md:z-30 md:flex md:w-[340px] md:flex-col md:border-l md:border-white/[0.04] md:bg-bg-surface">
        <div className="px-5 py-4">
          <SidebarHeader />
        </div>
        <Separator className="bg-white/[0.04]" />
        <ScrollArea className="flex-1">
          <DrawerSections>{children}</DrawerSections>
        </ScrollArea>
        <SidebarFooter />
      </aside>

      {/* Mobile: bottom sheet with drag handle */}
      {showMobileConfig && (
        <MobileBottomDrawer
          shown
          expanded={sidebarExpanded}
          size={mobileDrawerSize}
          onStateChange={setMobileDrawer}
          onHandleTap={toggleSidebar}
          topGap={TOP_GAP}
          halfRatio={0.48}
          zIndexClassName="z-40"
          handle={<SidebarHeader />}
        >
          <Separator className="shrink-0 bg-white/[0.04]" />
          <div
            className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain touch-pan-y [-webkit-overflow-scrolling:touch]"
          >
            <DrawerSections includeFooter>{children}</DrawerSections>
          </div>
        </MobileBottomDrawer>
      )}
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
