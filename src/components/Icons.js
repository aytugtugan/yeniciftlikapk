import React from 'react';
import { View } from 'react-native';
import { Colors } from '../theme';

// All icons are View-based, no emojis. Each accepts { size, color } props.
// Default size=20, color=Colors.textPrimary

// ── Search (magnifying glass) ──
export function SearchIcon({ size = 20, color = Colors.textTertiary }) {
  const s = size;
  const w = s * 0.1;
  return (
    <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{
        width: s * 0.55, height: s * 0.55, borderRadius: s * 0.3,
        borderWidth: w, borderColor: color,
      }} />
      <View style={{
        position: 'absolute', bottom: s * 0.08, right: s * 0.08,
        width: s * 0.3, height: w, backgroundColor: color,
        borderRadius: w / 2,
        transform: [{ rotate: '45deg' }],
      }} />
    </View>
  );
}

// ── Calendar ──
export function CalendarIcon({ size = 20, color = Colors.textPrimary }) {
  const w = size * 0.09;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{
        width: size * 0.8, height: size * 0.75, borderWidth: w, borderColor: color,
        borderRadius: size * 0.1, marginTop: size * 0.1,
      }}>
        <View style={{
          height: size * 0.2, backgroundColor: color,
          borderTopLeftRadius: size * 0.05, borderTopRightRadius: size * 0.05,
        }} />
      </View>
      <View style={{ position: 'absolute', top: size * 0.02, left: size * 0.25, width: w, height: size * 0.18, backgroundColor: color, borderRadius: w / 2 }} />
      <View style={{ position: 'absolute', top: size * 0.02, right: size * 0.25, width: w, height: size * 0.18, backgroundColor: color, borderRadius: w / 2 }} />
    </View>
  );
}

// ── Clipboard / Document ──
export function ClipboardIcon({ size = 20, color = Colors.textPrimary }) {
  const w = size * 0.09;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{
        width: size * 0.65, height: size * 0.8, borderWidth: w, borderColor: color,
        borderRadius: size * 0.08, marginTop: size * 0.1,
        justifyContent: 'center', alignItems: 'center', gap: size * 0.08,
      }}>
        <View style={{ width: size * 0.35, height: w, backgroundColor: color, borderRadius: 1 }} />
        <View style={{ width: size * 0.35, height: w, backgroundColor: color, borderRadius: 1 }} />
        <View style={{ width: size * 0.25, height: w, backgroundColor: color, borderRadius: 1, alignSelf: 'center' }} />
      </View>
      <View style={{
        position: 'absolute', top: 0, width: size * 0.35, height: size * 0.12,
        backgroundColor: color, borderRadius: size * 0.04,
      }} />
    </View>
  );
}

// ── Factory ──
export function FactoryIcon({ size = 20, color = Colors.textPrimary }) {
  const w = size * 0.09;
  return (
    <View style={{ width: size, height: size, alignItems: 'flex-end', justifyContent: 'flex-end', flexDirection: 'row' }}>
      <View style={{ width: size * 0.15, height: size * 0.75, backgroundColor: color, borderTopLeftRadius: size * 0.05, borderTopRightRadius: size * 0.05 }} />
      <View style={{ width: size * 0.05 }} />
      <View style={{ width: size * 0.35, height: size * 0.5, backgroundColor: color, borderTopLeftRadius: size * 0.05, borderTopRightRadius: size * 0.05 }} />
      <View style={{ width: size * 0.05 }} />
      <View style={{ width: size * 0.35, height: size * 0.65, backgroundColor: color, borderTopLeftRadius: size * 0.05, borderTopRightRadius: size * 0.05 }} />
    </View>
  );
}

// ── Lightning Bolt ──
export function BoltIcon({ size = 20, color = Colors.warning }) {
  const w = size * 0.12;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: size * 0.4, height: size * 0.45, backgroundColor: color, borderTopLeftRadius: size * 0.05, borderTopRightRadius: size * 0.15, transform: [{ skewX: '-10deg' }] }} />
      <View style={{ width: size * 0.4, height: size * 0.45, backgroundColor: color, borderBottomLeftRadius: size * 0.15, borderBottomRightRadius: size * 0.05, marginTop: -size * 0.05, transform: [{ skewX: '-10deg' }, { translateX: size * 0.05 }] }} />
    </View>
  );
}

// ── Circle / Produce (tomato) ──
export function ProduceIcon({ size = 20, color = Colors.danger }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{
        width: size * 0.75, height: size * 0.75, borderRadius: size * 0.4,
        backgroundColor: color, opacity: 0.85,
      }} />
      <View style={{
        position: 'absolute', top: size * 0.05, width: size * 0.12, height: size * 0.2,
        backgroundColor: Colors.success, borderRadius: size * 0.06,
        transform: [{ rotate: '-15deg' }],
      }} />
    </View>
  );
}

// ── Box / Package ──
export function BoxIcon({ size = 20, color = Colors.brandPrimary }) {
  const w = size * 0.09;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{
        width: size * 0.8, height: size * 0.6, borderWidth: w, borderColor: color,
        borderRadius: size * 0.06, marginTop: size * 0.15,
      }} />
      <View style={{
        position: 'absolute', top: size * 0.12,
        width: size * 0.9, height: size * 0.2, borderWidth: w, borderColor: color,
        borderRadius: size * 0.04, backgroundColor: color + '20',
      }} />
      <View style={{ position: 'absolute', top: size * 0.12, width: w, height: size * 0.68, backgroundColor: color }} />
    </View>
  );
}

// ── Flask / Beaker (lab/quality) ──
export function FlaskIcon({ size = 20, color = Colors.purple }) {
  const w = size * 0.09;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: size * 0.25, height: size * 0.35, borderLeftWidth: w, borderRightWidth: w, borderColor: color }} />
      <View style={{
        width: size * 0.7, height: size * 0.45, borderWidth: w, borderColor: color,
        borderBottomLeftRadius: size * 0.15, borderBottomRightRadius: size * 0.15,
        borderTopWidth: 0,
      }} />
      <View style={{
        position: 'absolute', top: 0, width: size * 0.4, height: w,
        backgroundColor: color, borderRadius: w / 2,
      }} />
    </View>
  );
}

// ── Barrel / Drum ──
export function BarrelIcon({ size = 20, color = Colors.textPrimary }) {
  const w = size * 0.09;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{
        width: size * 0.65, height: size * 0.8, borderWidth: w, borderColor: color,
        borderRadius: size * 0.12,
      }} />
      <View style={{ position: 'absolute', top: size * 0.25, width: size * 0.65, height: w, backgroundColor: color }} />
      <View style={{ position: 'absolute', bottom: size * 0.25, width: size * 0.65, height: w, backgroundColor: color }} />
    </View>
  );
}

// ── Bottle ──
export function BottleIcon({ size = 20, color = Colors.textPrimary }) {
  const w = size * 0.09;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: size * 0.2, height: size * 0.25, borderWidth: w, borderColor: color, borderTopLeftRadius: size * 0.04, borderTopRightRadius: size * 0.04 }} />
      <View style={{
        width: size * 0.45, height: size * 0.55, borderWidth: w, borderColor: color,
        borderBottomLeftRadius: size * 0.08, borderBottomRightRadius: size * 0.08,
        borderTopWidth: 0, marginTop: -1,
      }} />
    </View>
  );
}

// ── Pen / Signature ──
export function PenIcon({ size = 20, color = Colors.textPrimary }) {
  const w = size * 0.1;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-45deg' }] }}>
      <View style={{
        width: size * 0.2, height: size * 0.6, backgroundColor: color,
        borderTopLeftRadius: size * 0.05, borderTopRightRadius: size * 0.05,
      }} />
      <View style={{
        width: 0, height: 0,
        borderLeftWidth: size * 0.1, borderRightWidth: size * 0.1, borderTopWidth: size * 0.15,
        borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: color,
      }} />
    </View>
  );
}

// ── Close / X ──
export function CloseIcon({ size = 14, color = Colors.textTertiary }) {
  const w = size * 0.14;
  const len = size * 0.65;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ position: 'absolute', width: len, height: w, backgroundColor: color, borderRadius: w, transform: [{ rotate: '45deg' }] }} />
      <View style={{ position: 'absolute', width: len, height: w, backgroundColor: color, borderRadius: w, transform: [{ rotate: '-45deg' }] }} />
    </View>
  );
}

// ── Checkmark ──
export function CheckIcon({ size = 14, color = Colors.success }) {
  const w = size * 0.15;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{
        width: size * 0.35, height: size * 0.6,
        borderBottomWidth: w, borderRightWidth: w, borderColor: color,
        transform: [{ rotate: '45deg' }, { translateY: -size * 0.05 }],
      }} />
    </View>
  );
}

// ── Chevron Down ──
export function ChevronDownIcon({ size = 10, color = Colors.textTertiary }) {
  const w = size * 0.2;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{
        width: size * 0.6, height: size * 0.6,
        borderBottomWidth: w, borderRightWidth: w, borderColor: color,
        transform: [{ rotate: '45deg' }, { translateY: -size * 0.15 }],
      }} />
    </View>
  );
}

// ── Chevron Up ──
export function ChevronUpIcon({ size = 10, color = Colors.textTertiary }) {
  const w = size * 0.2;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{
        width: size * 0.6, height: size * 0.6,
        borderTopWidth: w, borderLeftWidth: w, borderColor: color,
        transform: [{ rotate: '0deg' }, { translateY: size * 0.15 }],
      }} />
    </View>
  );
}

// ── Info Circle ──
export function InfoIcon({ size = 14, color = Colors.brandPrimary }) {
  const w = size * 0.1;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{
        width: size * 0.85, height: size * 0.85, borderRadius: size * 0.5,
        borderWidth: w, borderColor: color, alignItems: 'center', justifyContent: 'center',
      }}>
        <View style={{ width: w * 1.3, height: w * 1.3, borderRadius: w, backgroundColor: color, marginBottom: size * 0.05 }} />
        <View style={{ width: w * 1.3, height: size * 0.25, backgroundColor: color, borderRadius: w / 2 }} />
      </View>
    </View>
  );
}

// ── Warning Triangle ──
export function WarningIcon({ size = 14, color = Colors.warning }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'flex-end' }}>
      <View style={{
        width: 0, height: 0,
        borderLeftWidth: size * 0.45, borderRightWidth: size * 0.45, borderBottomWidth: size * 0.8,
        borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: color,
        opacity: 0.2,
      }} />
      <View style={{
        position: 'absolute', bottom: size * 0.15,
        width: size * 0.1, height: size * 0.25, backgroundColor: color, borderRadius: 1,
      }} />
      <View style={{
        position: 'absolute', bottom: size * 0.45,
        width: size * 0.1, height: size * 0.1, backgroundColor: color, borderRadius: size * 0.05,
      }} />
    </View>
  );
}

// ── Inbox / Empty ──
export function InboxIcon({ size = 28, color = Colors.textTertiary }) {
  const w = size * 0.08;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'flex-end' }}>
      <View style={{
        width: size * 0.85, height: size * 0.5, borderWidth: w, borderColor: color,
        borderBottomLeftRadius: size * 0.1, borderBottomRightRadius: size * 0.1,
        borderTopWidth: 0,
      }} />
      <View style={{
        position: 'absolute', top: size * 0.15,
        width: size * 0.85, height: w, backgroundColor: color,
      }} />
      <View style={{
        position: 'absolute', bottom: size * 0.5,
        left: 0, width: size * 0.3, height: w, backgroundColor: color,
        transform: [{ rotate: '-35deg' }, { translateX: size * 0.05 }],
      }} />
      <View style={{
        position: 'absolute', bottom: size * 0.5,
        right: 0, width: size * 0.3, height: w, backgroundColor: color,
        transform: [{ rotate: '35deg' }, { translateX: -size * 0.05 }],
      }} />
    </View>
  );
}

// ── Filter Icon ──
export function FilterIcon({ size = 16, color = Colors.textPrimary }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', gap: size * 0.1 }}>
      <View style={{ width: size * 0.85, height: size * 0.12, backgroundColor: color, borderRadius: 1 }} />
      <View style={{ width: size * 0.6, height: size * 0.12, backgroundColor: color, borderRadius: 1 }} />
      <View style={{ width: size * 0.35, height: size * 0.12, backgroundColor: color, borderRadius: 1 }} />
    </View>
  );
}

// ── Aseptic (sealed container) ──
export function AsepticIcon({ size = 20, color = Colors.textPrimary }) {
  const w = size * 0.09;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{
        width: size * 0.7, height: size * 0.7, borderWidth: w, borderColor: color,
        borderRadius: size * 0.35,
      }} />
      <View style={{ position: 'absolute', width: size * 0.4, height: w, backgroundColor: color }} />
      <View style={{ position: 'absolute', width: w, height: size * 0.4, backgroundColor: color }} />
    </View>
  );
}
