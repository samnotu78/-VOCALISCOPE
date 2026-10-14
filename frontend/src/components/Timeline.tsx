import { useRef, useEffect, useState, MouseEvent, KeyboardEvent, TouchEvent, useId } from 'react';
import { formatDuration, formatNumber } from '../lib/utils';
import { TemporalEvidenceEvent } from '../lib/api';

interface TimelineProps {
  evidence: TemporalEvidenceEvent[];
  duration: number;
  onSelectEvent?: (event: TemporalEvidenceEvent | null) => void;
  selectedEvent: TemporalEvidenceEvent | null;
}

const PADDING_X = 40;
const HEIGHT = 110;
const TRACK_HEIGHT = 28;
const TRACK_Y = 40;

export function Timeline({ evidence, duration, onSelectEvent, selectedEvent }: TimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(800);
  const [hoveredEvent, setHoveredEvent] = useState<TemporalEvidenceEvent | null>(null);
  const gradientId = useId();

  // Dynamically observe container width for fluid responsive rendering
  useEffect(() => {
    if (!containerRef.current) return;
    const updateWidth = () => {
      if (containerRef.current) {
        setWidth(Math.max(340, containerRef.current.clientWidth));
      }
    };
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const safeDuration = duration > 0 ? duration : 1;
  const trackWidth = Math.max(100, width - PADDING_X * 2);

  const timeToX = (time: number) => PADDING_X + (Math.max(0, Math.min(time, safeDuration)) / safeDuration) * trackWidth;
  const xToTime = (x: number) => ((Math.max(PADDING_X, Math.min(x, PADDING_X + trackWidth)) - PADDING_X) / trackWidth) * safeDuration;

  const findEventAtX = (x: number): TemporalEvidenceEvent | null => {
    for (const event of evidence) {
      const startX = timeToX(event.start_seconds);
      const endX = timeToX(event.end_seconds);
      // Generous hit-test zone (+/- 4px)
      if (x >= startX - 4 && x <= endX + 4) {
        return event;
      }
    }
    return null;
  };

  const handleMouseMove = (e: MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    setHoveredEvent(findEventAtX(x));
  };

  const handleMouseLeave = () => {
    setHoveredEvent(null);
  };

  const handleClick = (e: MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const found = findEventAtX(x);
    if (found) {
      onSelectEvent?.(selectedEvent === found ? null : found);
    } else {
      onSelectEvent?.(null);
    }
  };

  const handleTouch = (e: TouchEvent<SVGSVGElement>) => {
    if (!e.touches[0]) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    const found = findEventAtX(x);
    if (found) {
      onSelectEvent?.(selectedEvent === found ? null : found);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<SVGGElement>, event: TemporalEvidenceEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelectEvent?.(selectedEvent === event ? null : event);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onSelectEvent?.(null);
    }
  };

  if (duration <= 0 || evidence.length === 0) {
    return (
      <div className="bg-bg-elevated border border-border rounded-xl p-8 text-center">
        <p className="text-text-secondary font-medium">No low-energy intervals detected</p>
        <p className="text-text-muted text-xs mt-1">
          Acoustic energy remained continuously above the recording-relative 5% peak threshold.
        </p>
      </div>
    );
  }

  // Generate 5 evenly spaced tick markers
  const ticks = [0, 0.25, 0.5, 0.75, 1];

  const getEventFill = (ev: TemporalEvidenceEvent, isSel: boolean, isHov: boolean) => {
    if (isSel) return `url(#${gradientId}-selected)`;
    if (isHov) {
      if (ev.event === 'hesitation_pause') return '#fbbf24';
      if (ev.event === 'pacing_surge_interval') return '#f43f5e';
      if (ev.event === 'pitch_monotony_interval') return '#c084fc';
      return 'var(--color-cyan-sonar)';
    }
    if (ev.event === 'hesitation_pause') return `url(#${gradientId}-hesitation)`;
    if (ev.event === 'pacing_surge_interval') return `url(#${gradientId}-surge)`;
    if (ev.event === 'pitch_monotony_interval') return `url(#${gradientId}-monotony)`;
    return `url(#${gradientId}-interval)`;
  };

  const getEventStroke = (ev: TemporalEvidenceEvent, isSel: boolean, isHov: boolean) => {
    if (isSel) return 'var(--color-lime-sonar)';
    if (isHov) {
      if (ev.event === 'hesitation_pause') return '#f59e0b';
      if (ev.event === 'pacing_surge_interval') return '#e11d48';
      if (ev.event === 'pitch_monotony_interval') return '#9333ea';
      return 'var(--color-cyan-sonar)';
    }
    if (ev.event === 'hesitation_pause') return 'rgba(251, 191, 36, 0.5)';
    if (ev.event === 'pacing_surge_interval') return 'rgba(244, 63, 94, 0.5)';
    if (ev.event === 'pitch_monotony_interval') return 'rgba(168, 85, 247, 0.5)';
    return 'rgba(0, 242, 254, 0.4)';
  };

  return (
    <div ref={containerRef} className="w-full select-none">
      <div className="overflow-x-auto rounded-xl bg-bg-surface border border-border p-2">
        <svg
          width={width}
          height={HEIGHT}
          viewBox={`0 0 ${width} ${HEIGHT}`}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onClick={handleClick}
          onTouchStart={handleTouch}
          className="block cursor-pointer focus:outline-none"
          role="region"
          aria-label="Interactive temporal evidence timeline"
        >
          <defs>
            <linearGradient id={`${gradientId}-track`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-bg-elevated)" />
              <stop offset="100%" stopColor="var(--color-bg-surface)" />
            </linearGradient>

            <linearGradient id={`${gradientId}-interval`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-cyan-sonar)" stopOpacity="0.85" />
              <stop offset="100%" stopColor="var(--color-cyan-sonar)" stopOpacity="0.45" />
            </linearGradient>

            <linearGradient id={`${gradientId}-hesitation`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.90" />
              <stop offset="100%" stopColor="#d97706" stopOpacity="0.55" />
            </linearGradient>

            <linearGradient id={`${gradientId}-surge`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.90" />
              <stop offset="100%" stopColor="#be123c" stopOpacity="0.55" />
            </linearGradient>

            <linearGradient id={`${gradientId}-monotony`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a855f7" stopOpacity="0.90" />
              <stop offset="100%" stopColor="#7e22ce" stopOpacity="0.55" />
            </linearGradient>

            <linearGradient id={`${gradientId}-selected`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-lime-sonar)" stopOpacity="0.95" />
              <stop offset="100%" stopColor="var(--color-lime-sonar)" stopOpacity="0.65" />
            </linearGradient>

            <filter id={`${gradientId}-glow`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="var(--color-cyan-sonar)" floodOpacity="0.6" />
            </filter>
          </defs>

          {/* Base Track Background */}
          <rect
            x={PADDING_X}
            y={TRACK_Y}
            width={trackWidth}
            height={TRACK_HEIGHT}
            rx={6}
            fill={`url(#${gradientId}-track)`}
            stroke="var(--color-border-strong)"
            strokeWidth="1"
          />

          {/* Center Reference Guide Line */}
          <line
            x1={PADDING_X}
            y1={TRACK_Y + TRACK_HEIGHT / 2}
            x2={PADDING_X + trackWidth}
            y2={TRACK_Y + TRACK_HEIGHT / 2}
            stroke="var(--color-border)"
            strokeWidth="1"
            strokeDasharray="2,2"
          />

          {/* Time Scale Axis Ticks & Labels */}
          {ticks.map((frac, idx) => {
            const x = PADDING_X + frac * trackWidth;
            const timeVal = frac * safeDuration;
            const isEdge = idx === 0 || idx === ticks.length - 1;
            const textAnchor = idx === 0 ? 'start' : idx === ticks.length - 1 ? 'end' : 'middle';

            return (
              <g key={idx} className="pointer-events-none">
                <line
                  x1={x}
                  y1={TRACK_Y + TRACK_HEIGHT + 3}
                  x2={x}
                  y2={TRACK_Y + TRACK_HEIGHT + (isEdge ? 9 : 6)}
                  stroke="var(--color-border-strong)"
                  strokeWidth={isEdge ? 1.5 : 1}
                />
                <text
                  x={x}
                  y={TRACK_Y + TRACK_HEIGHT + 22}
                  textAnchor={textAnchor}
                  fontSize="10"
                  fontFamily="monospace"
                  fill="var(--color-text-muted)"
                  className="tabular-nums"
                >
                  {formatDuration(timeVal)}
                </text>
              </g>
            );
          })}

          {/* Low-Energy Interval Rectangles */}
          {evidence.map((event, index) => {
            const startX = timeToX(event.start_seconds);
            const endX = timeToX(event.end_seconds);
            const eventWidth = Math.max(3, endX - startX);
            const isSelected = selectedEvent === event;
            const isHovered = hoveredEvent === event;

            return (
              <g
                key={index}
                tabIndex={0}
                role="button"
                aria-label={`Low energy interval ${index + 1}: ${event.start_seconds.toFixed(2)}s to ${event.end_seconds.toFixed(2)}s. Duration: ${event.measurement.duration_seconds.toFixed(2)}s.`}
                aria-pressed={isSelected}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectEvent?.(selectedEvent === event ? null : event);
                }}
                onKeyDown={(e) => handleKeyDown(e, event)}
                onFocus={() => setHoveredEvent(event)}
                onBlur={() => setHoveredEvent(null)}
                className="focus:outline-none cursor-pointer"
              >
                <rect
                  x={startX}
                  y={TRACK_Y + 2}
                  width={eventWidth}
                  height={TRACK_HEIGHT - 4}
                  rx={3}
                  fill={getEventFill(event, isSelected, isHovered)}
                  stroke={getEventStroke(event, isSelected, isHovered)}
                  strokeWidth={isSelected ? 2 : 1}
                  filter={isSelected ? `url(#${gradientId}-glow)` : 'none'}
                  className="transition-all duration-150"
                >
                  <title>
                    {`${event.event}: ${event.start_seconds.toFixed(2)}s – ${event.end_seconds.toFixed(2)}s (${event.measurement.duration_seconds.toFixed(2)}s)\nRMS: ${event.measurement.mean_frame_rms.toFixed(5)}`}
                  </title>
                </rect>

                {/* Event duration label inside bar if wide enough */}
                {eventWidth > 42 && (
                  <text
                    x={startX + eventWidth / 2}
                    y={TRACK_Y + TRACK_HEIGHT / 2 + 3}
                    textAnchor="middle"
                    fontSize="9"
                    fontFamily="monospace"
                    fill={isSelected ? '#05080d' : '#05080d'}
                    fontWeight={700}
                    pointerEvents="none"
                  >
                    {formatDuration(event.measurement.duration_seconds)}
                  </text>
                )}
              </g>
            );
          })}

          {/* Interactive Playhead Guides for Hovered Interval */}
          {hoveredEvent && (
            <g className="pointer-events-none">
              <line
                x1={timeToX(hoveredEvent.start_seconds)}
                y1={TRACK_Y - 14}
                x2={timeToX(hoveredEvent.start_seconds)}
                y2={TRACK_Y + TRACK_HEIGHT + 4}
                stroke="var(--color-cyan-sonar)"
                strokeWidth={1}
                strokeDasharray="2,2"
              />
              <line
                x1={timeToX(hoveredEvent.end_seconds)}
                y1={TRACK_Y - 14}
                x2={timeToX(hoveredEvent.end_seconds)}
                y2={TRACK_Y + TRACK_HEIGHT + 4}
                stroke="var(--color-cyan-sonar)"
                strokeWidth={1}
                strokeDasharray="2,2"
              />
              {/* Floating timestamp pill above hovered interval */}
              <rect
                x={Math.max(PADDING_X, timeToX(hoveredEvent.start_seconds) - 30)}
                y={TRACK_Y - 26}
                width={70}
                height={16}
                rx={3}
                fill="var(--color-bg-elevated)"
                stroke="var(--color-cyan-sonar)"
                strokeWidth={1}
              />
              <text
                x={Math.max(PADDING_X, timeToX(hoveredEvent.start_seconds) - 30) + 35}
                y={TRACK_Y - 14}
                textAnchor="middle"
                fontSize="9"
                fontFamily="monospace"
                fill="var(--color-cyan-sonar)"
                fontWeight={600}
              >
                {hoveredEvent.start_seconds.toFixed(2)}s
              </text>
            </g>
          )}

          {/* Selected Event Marker Highlights */}
          {selectedEvent && (
            <g className="pointer-events-none">
              <line
                x1={timeToX(selectedEvent.start_seconds)}
                y1={TRACK_Y - 16}
                x2={timeToX(selectedEvent.start_seconds)}
                y2={TRACK_Y + TRACK_HEIGHT + 4}
                stroke="var(--color-lime-sonar)"
                strokeWidth={2}
              />
              <line
                x1={timeToX(selectedEvent.end_seconds)}
                y1={TRACK_Y - 16}
                x2={timeToX(selectedEvent.end_seconds)}
                y2={TRACK_Y + TRACK_HEIGHT + 4}
                stroke="var(--color-lime-sonar)"
                strokeWidth={2}
              />
            </g>
          )}
        </svg>
      </div>

      {/* Timeline Controls & Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-2.5 px-1 text-xs font-mono text-text-muted">
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-cyan-sonar inline-block" />
            Pause (&lt; Threshold RMS)
          </span>
          {evidence.some((e) => e.event === 'hesitation_pause') && (
            <span className="flex items-center gap-1.5 text-amber-400">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-400 inline-block" />
              Hesitation Pause (&ge; 700ms)
            </span>
          )}
          {evidence.some((e) => e.event === 'pacing_surge_interval') && (
            <span className="flex items-center gap-1.5 text-rose-400">
              <span className="w-2.5 h-2.5 rounded-sm bg-rose-400 inline-block" />
              Pacing Surge Burst
            </span>
          )}
          {evidence.some((e) => e.event === 'pitch_monotony_interval') && (
            <span className="flex items-center gap-1.5 text-purple-400">
              <span className="w-2.5 h-2.5 rounded-sm bg-purple-400 inline-block" />
              Pitch Monotony
            </span>
          )}
          {selectedEvent && (
            <span className="flex items-center gap-1.5 text-lime-sonar">
              <span className="w-2.5 h-2.5 rounded-sm bg-lime-sonar inline-block" />
              Selected Event
            </span>
          )}
        </div>
        <div className="text-[11px] text-text-muted">
          <span>Click interval to inspect • Tab/Enter to navigate</span>
        </div>
      </div>
    </div>
  );
}