import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Colors, Typography, Spacing, Radius, Shadows } from '../theme';
import { SearchIcon, InboxIcon, InfoIcon, CheckIcon, WarningIcon, CloseIcon, ChevronDownIcon, ChevronUpIcon } from './Icons';

// ─── Screen Header (Instagram-style) ─────────────────────────
export function ScreenHeader({ title, subtitle, rightElement }) {
  return (
    <View style={headerStyles.container}>
      <View style={headerStyles.titleRow}>
        <View style={{ flex: 1 }}>
          <Text style={headerStyles.title}>{title}</Text>
          {subtitle ? <Text style={headerStyles.subtitle}>{subtitle}</Text> : null}
        </View>
        {rightElement || null}
      </View>
    </View>
  );
}

const headerStyles = StyleSheet.create({
  container: {
    backgroundColor: Colors.bgWhite,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.borderLight,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    ...Typography.title1,
  },
  subtitle: {
    ...Typography.subhead,
    marginTop: 2,
  },
});

// ─── Chip / Badge ─────────────────────────────────────────────
export function Chip({ label, color = Colors.brandPrimary, bgColor = Colors.brandPrimaryLight, size = 'md', icon }) {
  const isSmall = size === 'sm';
  return (
    <View style={[chipStyles.container, { backgroundColor: bgColor }, isSmall && chipStyles.containerSm]}>
      {icon || null}
      <Text style={[chipStyles.text, { color }, isSmall && chipStyles.textSm]}>{label}</Text>
    </View>
  );
}

const chipStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.round,
    gap: 4,
  },
  containerSm: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
  },
  textSm: {
    fontSize: 11,
  },
});

// ─── Card ─────────────────────────────────────────────────────
export function Card({ children, style, noPadding }) {
  return (
    <View style={[cardStyles.container, !noPadding && cardStyles.padded, style]}>
      {children}
    </View>
  );
}

const cardStyles = StyleSheet.create({
  container: {
    backgroundColor: Colors.bgWhite,
    borderRadius: Radius.lg,
    ...Shadows.sm,
    marginBottom: Spacing.sm,
  },
  padded: {
    padding: Spacing.lg,
  },
});

// ─── Section Card (for form sections) ─────────────────────────
export function SectionCard({ title, count, children, collapsible, collapsed, onToggle }) {
  return (
    <View style={sectionStyles.container}>
      <TouchableOpacity
        style={sectionStyles.header}
        onPress={collapsible ? onToggle : undefined}
        activeOpacity={collapsible ? 0.7 : 1}
      >
        <View style={sectionStyles.headerLeft}>
          <View style={sectionStyles.headerAccent} />
          <Text style={sectionStyles.headerTitle}>{title}</Text>
        </View>
        <View style={sectionStyles.headerRight}>
          {count !== undefined && (
            <View style={sectionStyles.countBadge}>
              <Text style={sectionStyles.countText}>{count}</Text>
            </View>
          )}
          {collapsible && (
            <View style={sectionStyles.chevron}>{collapsed ? <ChevronDownIcon size={10} /> : <ChevronUpIcon size={10} />}</View>
          )}
        </View>
      </TouchableOpacity>
      {(!collapsible || !collapsed) && (
        <View style={sectionStyles.body}>{children}</View>
      )}
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  container: {
    backgroundColor: Colors.bgWhite,
    borderRadius: Radius.lg,
    ...Shadows.sm,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
    marginRight: Spacing.sm,
  },
  headerAccent: {
    width: 3,
    height: 18,
    borderRadius: 2,
    backgroundColor: Colors.brandPrimary,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    flexShrink: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  countBadge: {
    backgroundColor: Colors.bgSurface,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.round,
  },
  countText: {
    ...Typography.footnote,
    fontWeight: '600',
  },
  chevron: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {},
});

// ─── Primary Button ───────────────────────────────────────────
export function PrimaryButton({ label, onPress, disabled, loading, icon, style, size = 'md' }) {
  const isLarge = size === 'lg';
  return (
    <TouchableOpacity
      style={[
        btnStyles.primary,
        isLarge && btnStyles.primaryLg,
        disabled && btnStyles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {icon || null}
      <Text style={[btnStyles.primaryText, isLarge && btnStyles.primaryTextLg]}>
        {loading ? '...' : label}
      </Text>
    </TouchableOpacity>
  );
}

export function SecondaryButton({ label, onPress, disabled, style }) {
  return (
    <TouchableOpacity
      style={[btnStyles.secondary, disabled && btnStyles.disabled, style]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <Text style={btnStyles.secondaryText}>{label}</Text>
    </TouchableOpacity>
  );
}

export function GhostButton({ label, onPress, disabled, color, style }) {
  return (
    <TouchableOpacity
      style={[btnStyles.ghost, disabled && btnStyles.disabled, style]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <Text style={[btnStyles.ghostText, color && { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const btnStyles = StyleSheet.create({
  primary: {
    backgroundColor: Colors.brandPrimary,
    borderRadius: Radius.sm,
    paddingVertical: 11,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  primaryLg: {
    paddingVertical: 14,
    borderRadius: Radius.md,
  },
  primaryText: {
    color: Colors.textWhite,
    fontWeight: '600',
    fontSize: 14,
  },
  primaryTextLg: {
    fontSize: 16,
    fontWeight: '700',
  },
  secondary: {
    backgroundColor: Colors.bgWhite,
    borderRadius: Radius.sm,
    paddingVertical: 11,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderColor,
  },
  secondaryText: {
    color: Colors.textPrimary,
    fontWeight: '600',
    fontSize: 14,
  },
  ghost: {
    paddingVertical: 11,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
  },
  ghostText: {
    color: Colors.brandPrimary,
    fontWeight: '600',
    fontSize: 14,
  },
  disabled: {
    opacity: 0.45,
  },
});

// ─── Search Input ─────────────────────────────────────────────
export function SearchInput({ value, onChangeText, placeholder }) {
  return (
    <View style={searchStyles.container}>
      <SearchIcon size={16} color={Colors.textTertiary} />
      <View style={searchStyles.inputWrap}>
        <View style={searchStyles.nativeInput}>
          <Text style={searchStyles.placeholder}>
            {/* Placeholder is handled by TextInput */}
          </Text>
        </View>
      </View>
    </View>
  );
}

const searchStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgSurface,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    height: 40,
    gap: 8,
  },
  icon: {
    fontSize: 14,
    opacity: 0.5,
  },
  inputWrap: {
    flex: 1,
  },
});

// ─── Empty State ──────────────────────────────────────────────
export function EmptyState({ icon, title, subtitle }) {
  return (
    <View style={emptyStyles.container}>
      <View style={emptyStyles.iconCircle}>
        {icon || <InboxIcon size={28} />}
      </View>
      <Text style={emptyStyles.title}>{title || 'Veri bulunamadı'}</Text>
      {subtitle && <Text style={emptyStyles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const emptyStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: Spacing.xxl,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.bgSurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  icon: {
    fontSize: 28,
  },
  title: {
    ...Typography.headline,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    ...Typography.callout,
    textAlign: 'center',
  },
});

// ─── Stat Card ────────────────────────────────────────────────
export function StatCard({ label, value, color, icon }) {
  return (
    <View style={statStyles.container}>
      {icon && (
        <View style={[statStyles.iconCircle, { backgroundColor: (color || Colors.brandPrimary) + '15' }]}>
          {typeof icon === 'string' ? <Text style={statStyles.icon}>{icon}</Text> : icon}
        </View>
      )}
      <Text style={statStyles.value}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgWhite,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
    ...Shadows.sm,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  icon: {
    fontSize: 16,
  },
  value: {
    ...Typography.title2,
    fontSize: 18,
    marginBottom: 2,
  },
  label: {
    ...Typography.caption1,
    fontSize: 10,
  },
});

// ─── Banner / Alert ───────────────────────────────────────────
export function Banner({ type = 'info', message, icon }) {
  const bgMap = { info: Colors.infoBg, success: Colors.successBg, warning: Colors.warningBg, error: Colors.dangerBg };
  const colorMap = { info: Colors.brandPrimary, success: Colors.success, warning: Colors.warning, error: Colors.danger };
  const iconComponents = {
    info: <InfoIcon size={14} color={Colors.brandPrimary} />,
    success: <CheckIcon size={14} color={Colors.success} />,
    warning: <WarningIcon size={14} color={Colors.warning} />,
    error: <CloseIcon size={14} color={Colors.danger} />,
  };
  return (
    <View style={[bannerStyles.container, { backgroundColor: bgMap[type] }]}>
      <View style={bannerStyles.icon}>{icon || iconComponents[type]}</View>
      <Text style={[bannerStyles.text, { color: colorMap[type] }]}>{message}</Text>
    </View>
  );
}

const bannerStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.md,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  icon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
});

// ─── Divider ──────────────────────────────────────────────────
export function Divider({ marginV = Spacing.sm }) {
  return <View style={{ height: 1, backgroundColor: Colors.borderLight, marginVertical: marginV }} />;
}

// ─── Progress Bar ─────────────────────────────────────────────
export function ProgressBar({ percent, height = 6, color, showLabel, trackColor }) {
  const pct = Math.min(Math.max(parseFloat(percent) || 0, 0), 100);
  const barColor = color || (pct >= 100 ? Colors.success : pct >= 50 ? Colors.warning : Colors.danger);

  return (
    <View style={progressStyles.wrapper}>
      <View style={[progressStyles.track, { height, backgroundColor: trackColor || Colors.bgSurface }]}>
        <View style={[progressStyles.fill, { width: `${pct}%`, backgroundColor: barColor, height }]} />
      </View>
      {showLabel !== false && (
        <Text style={[progressStyles.label, { color: barColor }]}>%{percent}</Text>
      )}
    </View>
  );
}

const progressStyles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  track: {
    flex: 1,
    backgroundColor: Colors.bgSurface,
    borderRadius: Radius.round,
    overflow: 'hidden',
  },
  fill: {
    borderRadius: Radius.round,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    minWidth: 42,
    textAlign: 'right',
  },
});

// ─── Dropdown Selector ────────────────────────────────────────
export function DropdownSelector({ label, value, placeholder, isOpen, onToggle, options, onSelect, selectedValue }) {
  return (
    <View>
      <TouchableOpacity style={dropStyles.button} onPress={onToggle} activeOpacity={0.7}>
        <View>
          <Text style={dropStyles.label}>{label}</Text>
          <Text style={[dropStyles.value, !value && dropStyles.placeholder]}>
            {value || placeholder || 'Seçiniz'}
          </Text>
        </View>
        <View style={dropStyles.arrow}>{isOpen ? <ChevronUpIcon size={10} /> : <ChevronDownIcon size={10} />}</View>
      </TouchableOpacity>
      {isOpen && options && (
        <View style={dropStyles.dropdown}>
          <ScrollView nestedScrollEnabled bounces={false}>
            {options.map((opt, idx) => (
              <TouchableOpacity
                key={opt.key || idx}
                style={[
                  dropStyles.option,
                  selectedValue === opt.value && dropStyles.optionActive,
                  idx < options.length - 1 && dropStyles.optionBorder,
                ]}
                onPress={() => onSelect(opt.value)}
                activeOpacity={0.6}
              >
                <Text style={[
                  dropStyles.optionText,
                  selectedValue === opt.value && dropStyles.optionTextActive,
                ]}>
                  {opt.label}
                </Text>
                {selectedValue === opt.value && (
                  <CheckIcon size={14} color={Colors.brandPrimary} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const dropStyles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.bgSurface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  label: {
    ...Typography.caption1,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  value: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  placeholder: {
    color: Colors.textTertiary,
  },
  arrow: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdown: {
    backgroundColor: Colors.bgWhite,
    borderRadius: Radius.md,
    ...Shadows.md,
    marginBottom: Spacing.sm,
    maxHeight: 240,
    overflow: 'hidden',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
  },
  optionBorder: {
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.borderLight,
  },
  optionActive: {
    backgroundColor: Colors.brandPrimaryLight,
  },
  optionText: {
    fontSize: 14,
    color: Colors.textPrimary,
  },
  optionTextActive: {
    color: Colors.brandPrimary,
    fontWeight: '600',
  },
  check: {
    color: Colors.brandPrimary,
    fontWeight: '700',
    fontSize: 14,
  },
});
