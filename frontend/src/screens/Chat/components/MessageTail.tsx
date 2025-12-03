import React from 'react';
import Svg, { Path } from 'react-native-svg';

type MessageTailProps = {
    color: string;
    side: 'left' | 'right';
    size?: number;
};

/**
 * SVG component that renders a tail/pointer for chat bubbles.
 * The tail points towards the sender's side of the screen.
 */
export const MessageTail: React.FC<MessageTailProps> = ({
    color,
    side,
    size = 8
}) => {
    // For left side (received messages), tail points left
    // For right side (sent messages), tail points right
    const pathData = side === 'left'
        ? `M 0 0 L ${size} 0 L ${size} ${size * 1.5} Q ${size} ${size * 1.5} 0 ${size * 1.5} Z`
        : `M ${size} 0 L 0 0 L 0 ${size * 1.5} Q 0 ${size * 1.5} ${size} ${size * 1.5} Z`;

    return (
        <Svg
            width={size}
            height={size * 1.5}
            viewBox={`0 0 ${size} ${size * 1.5}`}
            style={{
                position: 'absolute',
                bottom: 0,
                [side]: -size + 1, // Overlap by 1px to avoid gap
            }}
        >
            <Path d={pathData} fill={color} />
        </Svg>
    );
};
