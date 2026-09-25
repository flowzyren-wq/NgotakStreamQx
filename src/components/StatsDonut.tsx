import React from 'react';
import {View} from 'react-native';
import Svg, {Circle, G} from 'react-native-svg';

export interface DonutSegment {
  label: string;
  /** Fraction of the whole ring, 0..1 */
  share: number;
  color: string;
}

interface StatsDonutProps {
  segments: DonutSegment[];
  size?: number;
  strokeWidth?: number;
  centerLabel?: string;
  centerCaption?: string;
  labelColor?: string;
  captionColor?: string;
}

const AppCenterText = ({
  children,
  color,
  size,
  weight,
}: {
  children: React.ReactNode;
  color: string;
  size: number;
  weight: '500' | '700';
}) => {
  // Loaded lazily to keep this chart independent from the text theme module.
  const AppText = require('./ui/Text').default;
  return (
    <AppText
      role={size >= 16 ? 'titleMedium' : 'labelSmall'}
      style={{color, fontSize: size, fontWeight: weight, textAlign: 'center'}}>
      {children}
    </AppText>
  );
};

const StatsDonut = ({
  segments,
  size = 168,
  strokeWidth = 22,
  centerLabel,
  centerCaption,
  labelColor = '#FFFFFF',
  captionColor = 'rgba(255,255,255,0.55)',
}: StatsDonutProps) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const cx = size / 2;
  const cy = size / 2;
  const visibleSegments = segments.filter(segment => segment.share > 0);
  const gap = visibleSegments.length > 1 ? 4 : 0;
  let offset = 0;
  const centerWidth = (size - strokeWidth) * 0.78;

  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Svg width={size} height={size}>
        <G transform={`rotate(-90 ${cx} ${cy})`}>
          <Circle
            cx={cx}
            cy={cy}
            r={radius}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={strokeWidth}
            fill="none"
          />
          {visibleSegments.map((segment, index) => {
            const length = Math.max(2, segment.share * circumference - gap);
            const dashOffset = -offset;
            offset += segment.share * circumference;
            return (
              <Circle
                key={`${segment.label}-${index}`}
                cx={cx}
                cy={cy}
                r={radius}
                stroke={segment.color}
                strokeWidth={strokeWidth}
                strokeLinecap="butt"
                fill="none"
                strokeDasharray={`${length} ${circumference - length}`}
                strokeDashoffset={dashOffset}
              />
            );
          })}
        </G>
      </Svg>
      {centerLabel || centerCaption ? (
        <View
          pointerEvents="none"
          style={{position: 'absolute', alignItems: 'center', width: centerWidth}}>
          {centerLabel ? (
            <AppCenterText color={labelColor} size={20} weight="700">
              {centerLabel}
            </AppCenterText>
          ) : null}
          {centerCaption ? (
            <AppCenterText color={captionColor} size={11} weight="500">
              {centerCaption}
            </AppCenterText>
          ) : null}
        </View>
      ) : null}
    </View>
  );
};

export default StatsDonut;
