/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Plus, Trash, ArrowUp, ArrowDown, GripVertical, Sparkles, Settings, HelpCircle, Coffee } from 'lucide-react';

interface OrderListProps {
  orderList: number[];
  currentOrderIndex: number;
  currentLine?: number;
  patternLength?: number;
  isPlaying?: boolean;
  patternsCount: number;
  onSelectOrderIndex: (index: number) => void;
  onUpdateOrderValue: (index: number, patternId: number) => void;
  onAddOrderStep: () => void;
  onRemoveOrderStep: (index: number) => void;
  onReorderOrderList: (fromIndex: number, toIndex: number) => void;
  onOpenSupport?: () => void;
  showSupportButton?: boolean;
  onStartTutorial?: () => void;
  onOpenSettings?: () => void;
  onToggleHelp?: () => void;
}

const ITEM_HEIGHT = 34; // item height in px
const ITEM_GAP = 6;     // gap between items in px
const TOTAL_ITEM_STEP = ITEM_HEIGHT + ITEM_GAP; // 40px per item step

export const OrderList: React.FC<OrderListProps> = ({
  orderList,
  currentOrderIndex,
  currentLine = 0,
  patternLength = 64,
  isPlaying = false,
  patternsCount,
  onSelectOrderIndex,
  onUpdateOrderValue,
  onAddOrderStep,
  onRemoveOrderStep,
  onReorderOrderList,
  onOpenSupport,
  showSupportButton = true,
  onStartTutorial,
  onOpenSettings,
  onToggleHelp,
}) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = React.useState<number>(240);
  const [manualScrollOffset, setManualScrollOffset] = React.useState<number>(0);

  const [dragIndex, setDragIndex] = React.useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = React.useState<number | null>(null);

  // Measure container height dynamically
  React.useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let rafId: number | null = null;
    const updateHeight = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        if (el && el.clientHeight > 0) {
          setContainerHeight(el.clientHeight);
        }
      });
    };

    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(el);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, []);

  const visibleSlots = Math.max(1, Math.floor(containerHeight / TOTAL_ITEM_STEP));
  const maxScroll = Math.max(0, (orderList.length - visibleSlots) * TOTAL_ITEM_STEP);

  // During playback: calculate scroll directly in the render cycle.
  // The active item stays 100% stationary in the bottom slot once reached,
  // with ZERO frame delay, jumping, or repositioning artifacts.
  const playScrollOffset = Math.max(0, currentOrderIndex - (visibleSlots - 1)) * TOTAL_ITEM_STEP;
  const activeScrollOffset = isPlaying
    ? playScrollOffset
    : Math.max(0, Math.min(maxScroll, manualScrollOffset));

  // When stopped and user selects an item outside current view, scroll it into view
  React.useEffect(() => {
    if (!isPlaying) {
      setManualScrollOffset((prev) => {
        const itemTop = currentOrderIndex * TOTAL_ITEM_STEP;
        const currentTop = prev;
        const currentBottom = prev + containerHeight - TOTAL_ITEM_STEP;
        if (itemTop < currentTop) {
          return itemTop;
        } else if (itemTop > currentBottom) {
          return Math.max(0, itemTop - (containerHeight - TOTAL_ITEM_STEP));
        }
        return prev;
      });
    }
  }, [currentOrderIndex, isPlaying, containerHeight]);

  // Handle manual mouse wheel scrolling when not playing
  const handleWheel = (e: React.WheelEvent) => {
    if (isPlaying) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? TOTAL_ITEM_STEP : -TOTAL_ITEM_STEP;
    setManualScrollOffset((prev) => Math.max(0, Math.min(maxScroll, prev + delta)));
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', index.toString());
    e.dataTransfer.effectAllowed = 'move';
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (dragIndex !== null && dragIndex !== dropIndex) {
      onReorderOrderList(dragIndex, dropIndex);
    }
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div className="rounded-xl p-3 flex flex-col h-full min-h-0 overflow-hidden text-xs select-none glass-panel text-[#cbd5e1]">
      <div className="flex items-center justify-between border-b border-white/10 pb-2.5 mb-2 shrink-0">
        <h2 className="font-bold tracking-wider uppercase text-[11px] text-[#f8fafc] font-display">Patterns</h2>
        <button
          onClick={onAddOrderStep}
          className="h-6 px-2.5 rounded-md flex items-center gap-1 font-semibold cursor-pointer text-[11px] aqua-gloss aqua-dark text-[#e2e8f0] transition-all"
          title="Add pattern sequence step"
        >
          <Plus className="w-3.5 h-3.5" style={{ color: 'var(--theme-accent, #38bdf8)' }} />
          <span>Step</span>
        </button>
      </div>

      {/* Main List Viewport */}
      <div
        ref={containerRef}
        onWheel={handleWheel}
        className="relative flex-1 min-h-0 overflow-hidden"
      >
        <div
          className="w-full transition-transform duration-100 ease-out flex flex-col gap-[6px]"
          style={{ transform: `translateY(-${activeScrollOffset}px)` }}
        >
          {(orderList || []).map((patternId, index) => {
            const isActive = index === currentOrderIndex;
            const isDragging = dragIndex === index;
            const isDragOver = dragOverIndex === index && dragIndex !== null && dragIndex !== index;

            let dropHighlightClass = '';
            if (isDragOver && dragIndex !== null) {
              if (dragIndex < index) {
                dropHighlightClass = 'border-b-2 bg-white/10';
              } else {
                dropHighlightClass = 'border-t-2 bg-white/10';
              }
            }

            const progressPercent = isActive 
              ? Math.min(100, Math.max(2, ((currentLine + 1) / Math.max(1, patternLength)) * 100))
              : 0;

            return (
              <div
                key={index}
                data-order-index={index}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                onClick={() => onSelectOrderIndex(index)}
                style={{
                  height: `${ITEM_HEIGHT}px`,
                  ...(isActive ? {
                    backgroundColor: 'var(--theme-active-row-bg, rgba(56,189,248,0.16))',
                    borderColor: 'var(--theme-accent, #38bdf8)',
                    boxShadow: '0 0 10px var(--theme-accent-glow, rgba(56,189,248,0.25))',
                  } : {}),
                }}
                className={`relative overflow-hidden flex items-center justify-between px-2.5 rounded-lg cursor-pointer border transition-colors shrink-0 ${
                  isDragging ? 'opacity-30' : ''
                } ${dropHighlightClass} ${
                  isActive
                    ? 'text-[#f8fafc] font-bold'
                    : 'bg-[#0f151e]/40 border-white/5 hover:border-white/20 text-[#94a3b8]'
                }`}
              >
                {/* Pattern Progress Bar (Grows during playback) */}
                {isActive && (isPlaying || currentLine > 0) && (
                  <>
                    <div
                      className="absolute inset-y-0 left-0 pointer-events-none"
                      style={{
                        width: `${progressPercent}%`,
                        backgroundColor: 'var(--theme-accent-dim, rgba(56,189,248,0.2))',
                      }}
                    />
                    <div
                      className="absolute bottom-0 left-0 h-[2.5px] pointer-events-none"
                      style={{
                        width: `${progressPercent}%`,
                        backgroundColor: 'var(--theme-accent, #38bdf8)',
                        boxShadow: '0 0 8px var(--theme-accent, #38bdf8)',
                      }}
                    />
                  </>
                )}

                <div className="relative z-10 flex items-center gap-2 min-w-0">
                  {/* Drag Handle Icon */}
                  <div 
                    className="cursor-grab active:cursor-grabbing p-0.5 rounded text-white/90 hover:text-white shrink-0"
                    title="Drag to reorder step"
                  >
                    <GripVertical className="w-3.5 h-3.5 text-white" />
                  </div>

                  {/* Index label */}
                  <span 
                    className="text-[11px] font-mono font-bold tracking-tight shrink-0 min-w-[20px] tabular-nums"
                    style={isActive ? { color: 'var(--theme-accent, #38bdf8)' } : { color: '#94a3b8' }}
                  >
                    {index.toString().padStart(2, '0')}:
                  </span>
                  
                  {/* Pattern select controller */}
                  <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onUpdateOrderValue(index, Math.max(0, patternId - 1))}
                      disabled={patternId <= 0}
                      className="w-4 h-4 flex items-center justify-center rounded border border-[#334155] bg-[#16212e] text-white hover:bg-[#1e2d3d] hover:border-slate-500 disabled:opacity-30 disabled:pointer-events-none active:scale-95 shrink-0 cursor-pointer"
                      title="Previous Pattern"
                    >
                      <ArrowDown className="w-2.5 h-2.5 text-white" strokeWidth={2.5} />
                    </button>

                    {/* P00 Badge */}
                    <span 
                      className={`px-1.5 py-0.5 min-w-[32px] text-center font-mono font-bold text-[10.5px] rounded border tracking-tight shrink-0 tabular-nums ${
                        isActive
                          ? 'bg-[#090d13]'
                          : 'bg-[#090d13] border-[#1c2635] text-[#94a3b8]'
                      }`}
                      style={isActive ? {
                        borderColor: 'var(--theme-accent, #38bdf8)',
                        color: 'var(--theme-accent, #38bdf8)',
                        boxShadow: '0 0 6px var(--theme-accent-glow, rgba(56,189,248,0.4))',
                      } : undefined}
                    >
                      P{patternId.toString().padStart(2, '0')}
                    </span>

                    <button
                      onClick={() => onUpdateOrderValue(index, Math.min(patternsCount - 1, patternId + 1))}
                      disabled={patternId >= patternsCount - 1}
                      className="w-4 h-4 flex items-center justify-center rounded border border-[#334155] bg-[#16212e] text-white hover:bg-[#1e2d3d] hover:border-slate-500 disabled:opacity-30 disabled:pointer-events-none active:scale-95 shrink-0 cursor-pointer"
                      title="Next Pattern"
                    >
                      <ArrowUp className="w-2.5 h-2.5 text-white" strokeWidth={2.5} />
                    </button>
                  </div>
                </div>

                {/* Delete action */}
                <div className="relative z-10 pl-2 shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveOrderStep(index);
                    }}
                    disabled={orderList.length <= 1}
                    className="w-5 h-5 flex items-center justify-center rounded text-[#64748b] hover:text-[#f43f5e] hover:bg-[#3b1219]/80 transition-all disabled:opacity-0 disabled:pointer-events-none active:scale-95 cursor-pointer"
                    title="Remove step from sequence"
                  >
                    <Trash className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Utility Dock: Support / SynthekDesign, Tour, Settings, Help */}
      <div className="pt-2 mt-2 border-t border-white/10 shrink-0 select-none flex flex-col gap-1.5">
        <div className="grid grid-cols-2 gap-1.5">
          {showSupportButton && onOpenSupport ? (
            <button
              onClick={onOpenSupport}
              className="h-7 px-1.5 rounded-md flex items-center justify-center gap-1 cursor-pointer border border-amber-500/40 hover:border-amber-400 bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 hover:text-amber-200 font-mono text-[10px] sm:text-[10.5px] font-bold transition-all shadow-[0_0_8px_rgba(251,191,36,0.12)] active:scale-95"
              title="Support SYN-Tracker & Buy Me a Coffee"
            >
              <Coffee className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
              <span className="truncate">Support</span>
            </button>
          ) : (
            <a
              href="https://www.hj-wuethrich.cv"
              target="_blank"
              rel="noopener noreferrer"
              className="h-7 px-1.5 rounded-md flex items-center justify-center cursor-pointer aqua-gloss aqua-dark text-[#cbd5e1] hover:text-white transition-all active:scale-95 group border border-slate-700/80 hover:border-slate-500 bg-[#131b2b]/90 hover:bg-[#1a253a]"
              title="Synthek Design - www.hj-wuethrich.cv"
            >
              <img
                src="/SynthekDesign.png"
                alt="Synthek Design"
                className="h-4 max-h-[16px] w-auto max-w-[90%] object-contain filter brightness-105 group-hover:brightness-125 transition-all"
              />
            </a>
          )}

          {onStartTutorial && (
            <button
              onClick={onStartTutorial}
              className="h-7 px-1.5 rounded-md flex items-center justify-center gap-1 cursor-pointer border border-slate-700/80 hover:border-slate-500 bg-[#131b2b]/90 hover:bg-[#1a253a] text-slate-300 hover:text-white font-mono text-[10px] sm:text-[10.5px] transition-all active:scale-95"
              title="Interactive Tour"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="truncate">Tour</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="h-7 px-1.5 rounded-md flex items-center justify-center gap-1 cursor-pointer aqua-gloss aqua-dark text-[#cbd5e1] hover:text-white text-[10px] sm:text-[10.5px] font-medium transition-all active:scale-95"
              title="Settings & Audio-Setup"
            >
              <Settings className="w-3.5 h-3.5 text-[#94a3b8] shrink-0" />
              <span className="truncate">Settings</span>
            </button>
          )}
          {onToggleHelp && (
            <button
              onClick={onToggleHelp}
              className="h-7 px-1.5 rounded-md flex items-center justify-center gap-1 cursor-pointer aqua-gloss aqua-dark text-[#cbd5e1] hover:text-white text-[10px] sm:text-[10.5px] font-medium transition-all active:scale-95"
              title="ProTracker Manual & Keyboard Shortcuts (?)"
            >
              <HelpCircle className="w-3.5 h-3.5 text-[#38bdf8] shrink-0" />
              <span className="truncate">Help</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
