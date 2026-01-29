'use client';

import { WallMeasurements, MeasurementSystemType, MEASUREMENT_LABELS } from '@/types/measurements';

interface MeasurementDiagramProps {
  systemType: MeasurementSystemType;
  measurements: WallMeasurements;
  activeField?: keyof WallMeasurements | null;
  onFieldClick?: (field: keyof WallMeasurements) => void;
}

type MeasurementKey = keyof Omit<WallMeasurements, 'windowHeight' | 'windowWidth' | 'windowDepth'>;

export function MeasurementDiagram({
  systemType,
  measurements,
  activeField,
  onFieldClick,
}: MeasurementDiagramProps) {
  const title = systemType === 'tub_wall' ? 'Tub Wall System' : 'Shower Wall System';

  // Positions for measurement labels (based on diagram layout)
  const labelPositions: Record<MeasurementKey, { x: number; y: number; valueX: number; valueY: number }> = {
    leftSidewallHeight: { x: 45, y: 140, valueX: 20, valueY: 140 },      // A - left height
    leftSidewallDepth: { x: 85, y: 235, valueX: 85, valueY: 255 },       // B - left depth
    soapDishWallHeight: { x: 175, y: 50, valueX: 175, valueY: 25 },      // C - back height
    soapDishWallWidth: { x: 175, y: 85, valueX: 175, valueY: 105 },      // D - back width
    rightSidewallDepth: { x: 265, y: 235, valueX: 265, valueY: 255 },    // E - right depth
    rightSidewallHeight: { x: 305, y: 140, valueX: 330, valueY: 140 },   // F - right height
    leftLegDepth: { x: 115, y: 270, valueX: 115, valueY: 290 },          // G - left leg
    rightLegDepth: { x: 235, y: 270, valueX: 235, valueY: 290 },         // H - right leg
  };

  const formatValue = (value: number | null): string => {
    if (value === null || value === undefined) return '—';
    return `${value}"`;
  };

  const isActive = (field: MeasurementKey) => activeField === field;

  const handleClick = (field: MeasurementKey) => {
    if (onFieldClick) {
      onFieldClick(field);
    }
  };

  return (
    <div className="w-full">
      <h4 className="text-sm font-medium text-gray-300 mb-3 text-center">{title}</h4>
      <svg
        viewBox="0 0 350 310"
        className="w-full max-w-md mx-auto"
        style={{ maxHeight: '400px' }}
      >
        {/* Background */}
        <rect x="0" y="0" width="350" height="310" fill="#1a1a1a" rx="8" />

        {/* 3D isometric tub/shower enclosure */}
        {/* Back wall */}
        <polygon
          points="90,60 260,60 260,200 90,200"
          fill="#2d2d2d"
          stroke="#444"
          strokeWidth="2"
        />

        {/* Left wall */}
        <polygon
          points="60,80 90,60 90,200 60,220"
          fill="#252525"
          stroke="#444"
          strokeWidth="2"
        />

        {/* Right wall */}
        <polygon
          points="290,80 260,60 260,200 290,220"
          fill="#252525"
          stroke="#444"
          strokeWidth="2"
        />

        {/* Tub/shower base */}
        <polygon
          points="60,220 90,200 260,200 290,220 260,240 90,240"
          fill="#333"
          stroke="#444"
          strokeWidth="2"
        />

        {/* Left leg */}
        <polygon
          points="90,240 90,200 110,185 110,260"
          fill="#2a2a2a"
          stroke="#444"
          strokeWidth="1"
        />

        {/* Right leg */}
        <polygon
          points="260,200 260,240 240,260 240,185"
          fill="#2a2a2a"
          stroke="#444"
          strokeWidth="1"
        />

        {/* Measurement lines and labels */}
        {(Object.keys(MEASUREMENT_LABELS) as MeasurementKey[]).map((field) => {
          const label = MEASUREMENT_LABELS[field];
          const pos = labelPositions[field];
          const value = measurements[field];
          const active = isActive(field);

          return (
            <g
              key={field}
              onClick={() => handleClick(field)}
              className="cursor-pointer"
            >
              {/* Label circle */}
              <circle
                cx={pos.x}
                cy={pos.y}
                r="14"
                fill={active ? '#D4AF37' : '#3d3d3d'}
                stroke={active ? '#D4AF37' : '#666'}
                strokeWidth="2"
                className="transition-all duration-200"
              />
              <text
                x={pos.x}
                y={pos.y + 5}
                textAnchor="middle"
                fill={active ? '#000' : '#fff'}
                fontSize="12"
                fontWeight="bold"
                className="pointer-events-none"
              >
                {label}
              </text>

              {/* Value display */}
              <text
                x={pos.valueX}
                y={pos.valueY}
                textAnchor="middle"
                fill={value !== null ? '#D4AF37' : '#666'}
                fontSize="11"
                fontWeight="500"
                className="pointer-events-none"
              >
                {formatValue(value)}
              </text>

              {/* Hover effect */}
              <circle
                cx={pos.x}
                cy={pos.y}
                r="18"
                fill="transparent"
                className="hover:fill-white/10 transition-all duration-200"
              />
            </g>
          );
        })}

        {/* Legend */}
        <g transform="translate(10, 10)">
          <text x="0" y="0" fill="#888" fontSize="10">
            Click labels to edit
          </text>
        </g>
      </svg>

      {/* Label key */}
      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-400">
        <div><span className="text-brand-gold font-semibold">A</span> = Left Height</div>
        <div><span className="text-brand-gold font-semibold">B</span> = Left Depth</div>
        <div><span className="text-brand-gold font-semibold">C</span> = Back Height</div>
        <div><span className="text-brand-gold font-semibold">D</span> = Back Width</div>
        <div><span className="text-brand-gold font-semibold">E</span> = Right Depth</div>
        <div><span className="text-brand-gold font-semibold">F</span> = Right Height</div>
        <div><span className="text-brand-gold font-semibold">G</span> = Left Leg</div>
        <div><span className="text-brand-gold font-semibold">H</span> = Right Leg</div>
      </div>
    </div>
  );
}
