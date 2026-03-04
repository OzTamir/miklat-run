import {
  useCallback,
  useEffect,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type TouchEvent as ReactTouchEvent,
} from 'react';

export type DrawerSize = 'half' | 'full';

interface MobileBottomDrawerProps {
  shown: boolean;
  expanded: boolean;
  size: DrawerSize;
  onStateChange: (expanded: boolean, size: DrawerSize) => void;
  onHandleTap?: () => void;
  handle: ReactNode;
  children: ReactNode;
  topGap?: number;
  collapsedHeight?: number;
  halfRatio?: number;
  zIndexClassName?: string;
  asideClassName?: string;
  handleContainerClassName?: string;
}

interface DragState {
  startY: number;
  startHeight: number;
  maxHeight: number;
  wasDragged: boolean;
  lastY: number;
  lastTime: number;
  velocity: number;
}

const DEFAULT_TOP_GAP = 64;
const DEFAULT_COLLAPSED_HEIGHT = 56;
const DEFAULT_HALF_RATIO = 0.48;
const VELOCITY_THRESHOLD = 0.4; // px/ms
const TRANSITION = 'max-height 300ms ease-out, transform 300ms ease-out';

function viewportHeight() {
  return window.visualViewport?.height ?? window.innerHeight;
}

function getSnapTarget(
  currentHeight: number,
  velocity: number,
  halfHeight: number,
  fullHeight: number,
  collapsedHeight: number,
) {
  if (Math.abs(velocity) > VELOCITY_THRESHOLD) {
    if (velocity > 0) {
      return currentHeight > (halfHeight + fullHeight) / 2
        ? { expanded: true, size: 'full' as const }
        : { expanded: true, size: 'half' as const };
    }

    return currentHeight < (collapsedHeight + halfHeight) / 2
      ? { expanded: false, size: 'half' as const }
      : { expanded: true, size: 'half' as const };
  }

  const distances = [
    { dist: Math.abs(currentHeight - collapsedHeight), expanded: false, size: 'half' as const },
    { dist: Math.abs(currentHeight - halfHeight), expanded: true, size: 'half' as const },
    { dist: Math.abs(currentHeight - fullHeight), expanded: true, size: 'full' as const },
  ];
  distances.sort((a, b) => a.dist - b.dist);
  return distances[0];
}

export function MobileBottomDrawer({
  shown,
  expanded,
  size,
  onStateChange,
  onHandleTap,
  handle,
  children,
  topGap = DEFAULT_TOP_GAP,
  collapsedHeight = DEFAULT_COLLAPSED_HEIGHT,
  halfRatio = DEFAULT_HALF_RATIO,
  zIndexClassName = 'z-40',
  asideClassName = '',
  handleContainerClassName = 'flex w-full shrink-0 cursor-pointer flex-col items-center px-5 py-3 touch-none',
}: MobileBottomDrawerProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const asideRef = useRef<HTMLElement>(null);
  const dragRef = useRef<DragState>({
    startY: 0,
    startHeight: 0,
    maxHeight: 0,
    wasDragged: false,
    lastY: 0,
    lastTime: 0,
    velocity: 0,
  });

  const fullHeightCss = `calc(100dvh - ${topGap}px)`;
  const halfHeightCss = `${halfRatio * 100}dvh`;
  const collapsedTranslate = `translateY(calc(100% - ${collapsedHeight}px))`;
  const baseTransform = shown
    ? expanded
      ? 'translateY(0)'
      : collapsedTranslate
    : 'translateY(100%)';

  const wrapperHeight = useCallback(
    () => wrapperRef.current?.getBoundingClientRect().height ?? (viewportHeight() - topGap),
    [topGap],
  );

  const snapToNearest = useCallback(() => {
    const aside = asideRef.current;
    if (!aside) return;

    const currentHeight = aside.getBoundingClientRect().height;
    const vh = viewportHeight();
    const halfHeight = vh * halfRatio;
    const fullHeight = wrapperHeight();
    const target = getSnapTarget(
      currentHeight,
      dragRef.current.velocity,
      halfHeight,
      fullHeight,
      collapsedHeight,
    );

    aside.style.transition = TRANSITION;
    aside.style.maxHeight = target.expanded
      ? target.size === 'full'
        ? fullHeightCss
        : halfHeightCss
      : `${collapsedHeight}px`;
    aside.style.transform = target.expanded ? 'translateY(0)' : collapsedTranslate;

    const cleanup = () => {
      // Keep maxHeight/transform in place to avoid stale state if no re-render occurs.
      aside.style.transition = '';
      aside.removeEventListener('transitionend', cleanup);
    };
    aside.addEventListener('transitionend', cleanup, { once: true });
    setTimeout(cleanup, 350);

    onStateChange(target.expanded, target.size);
  }, [
    collapsedHeight,
    collapsedTranslate,
    fullHeightCss,
    halfHeightCss,
    halfRatio,
    onStateChange,
    wrapperHeight,
  ]);

  const handleDocTouchMove = useCallback((e: TouchEvent) => {
    e.preventDefault();

    const touch = e.touches[0];
    const now = Date.now();
    const dt = now - dragRef.current.lastTime;
    if (dt > 0) {
      dragRef.current.velocity = (dragRef.current.lastY - touch.clientY) / dt;
    }

    dragRef.current.lastY = touch.clientY;
    dragRef.current.lastTime = now;

    const delta = dragRef.current.startY - touch.clientY;
    if (Math.abs(delta) > 5) {
      dragRef.current.wasDragged = true;
    }

    const newHeight = Math.max(
      collapsedHeight,
      Math.min(dragRef.current.maxHeight, dragRef.current.startHeight + delta),
    );

    const aside = asideRef.current;
    if (aside) {
      aside.style.maxHeight = `${newHeight}px`;
      aside.style.transform = 'translateY(0)';
    }
  }, [collapsedHeight]);

  const handleDocTouchEnd = useCallback(() => {
    document.removeEventListener('touchmove', handleDocTouchMove);
    document.removeEventListener('touchend', handleDocTouchEnd);

    if (dragRef.current.wasDragged) {
      snapToNearest();
    }
  }, [handleDocTouchMove, snapToNearest]);

  const onHandleTouchStart = useCallback((e: ReactTouchEvent) => {
    const aside = asideRef.current;
    if (!aside) return;

    const touch = e.touches[0];
    const startHeight = aside.getBoundingClientRect().height;
    dragRef.current = {
      startY: touch.clientY,
      startHeight,
      maxHeight: wrapperHeight(),
      wasDragged: false,
      lastY: touch.clientY,
      lastTime: Date.now(),
      velocity: 0,
    };

    aside.style.transition = 'none';
    aside.style.transform = 'translateY(0)';
    aside.style.maxHeight = `${startHeight}px`;

    document.addEventListener('touchmove', handleDocTouchMove, { passive: false });
    document.addEventListener('touchend', handleDocTouchEnd);
  }, [handleDocTouchEnd, handleDocTouchMove, wrapperHeight]);

  const onClickHandle = useCallback(() => {
    if (dragRef.current.wasDragged) {
      dragRef.current.wasDragged = false;
      return;
    }
    onHandleTap?.();
  }, [onHandleTap]);

  const onKeyDownHandle = useCallback((e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClickHandle();
    }
  }, [onClickHandle]);

  useEffect(() => {
    return () => {
      document.removeEventListener('touchmove', handleDocTouchMove);
      document.removeEventListener('touchend', handleDocTouchEnd);
    };
  }, [handleDocTouchEnd, handleDocTouchMove]);

  return (
    <div
      ref={wrapperRef}
      className={`pointer-events-none fixed inset-x-0 bottom-0 ${zIndexClassName} overflow-hidden md:hidden`}
      style={{ top: topGap }}
    >
      <aside
        ref={asideRef}
        dir="rtl"
        className={`pointer-events-auto absolute inset-x-0 bottom-0 flex flex-col overflow-hidden rounded-t-2xl bg-bg-surface shadow-[0_-8px_32px_rgba(0,0,0,0.4)] transition-[transform,max-height] duration-300 ease-out ${asideClassName}`}
        style={{
          maxHeight: expanded
            ? size === 'full'
              ? fullHeightCss
              : halfHeightCss
            : `${collapsedHeight}px`,
          transform: baseTransform,
        }}
        onTouchStart={(e) => e.stopPropagation()}
      >
        <div
          role="button"
          tabIndex={0}
          onClick={onClickHandle}
          onKeyDown={onKeyDownHandle}
          onTouchStart={onHandleTouchStart}
          className={handleContainerClassName}
        >
          <div className="mb-3 h-1 w-9 self-center rounded-full bg-white/20" />
          {handle}
        </div>
        {children}
      </aside>
    </div>
  );
}
