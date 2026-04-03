import React from 'react';
import { Text, Platform } from 'react-native';

// Load glyph map (local copy, no native module dependency)
const glyphMap = require('../assets/MaterialIconsGlyphMap.json');

// Font family name differs per platform
const fontFamily = Platform.select({
  ios: 'Material Icons',
  android: 'MaterialIcons',
});

export default function SimpleIcon({ name, size = 24, color = '#000', style }) {
  // Glyph map keys use hyphens (e.g. 'arrow-back'), code uses underscores
  const key = name ? name.replace(/_/g, '-') : '';
  const glyph = glyphMap[key] ?? glyphMap[name];
  const char = glyph != null ? String.fromCodePoint(glyph) : '?';

  return (
    <Text
      style={[
        {
          fontFamily,
          fontSize: size,
          color,
          lineHeight: size,
          textAlign: 'center',
          textAlignVertical: 'center',
        },
        style,
      ]}
      allowFontScaling={false}
    >
      {char}
    </Text>
  );
}
