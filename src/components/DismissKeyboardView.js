import React from 'react';
import { Keyboard, Platform, View } from 'react-native';

/**
 * Wraps children so that tapping outside any input dismisses the keyboard on Android.
 * On iOS the native behaviour already handles this in most cases.
 * Uses onStartShouldSetResponder returning false so scroll gestures are NOT blocked.
 */
export default function DismissKeyboardView({ children, style }) {
  if (Platform.OS !== 'android') {
    return children;
  }

  return (
    <View
      style={[{ flex: 1 }, style]}
      onStartShouldSetResponder={() => {
        Keyboard.dismiss();
        return false;
      }}
    >
      {children}
    </View>
  );
}
