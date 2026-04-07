/**
 * PressableDebug — drop-in wrapper to diagnose touch issues.
 *
 * Usage:
 *   import { PressableDebug } from "./PressableDebug";
 *
 *   <PressableDebug label="Login Button">
 *     <PrimaryButton title="Login" onPress={handleLogin} />
 *   </PressableDebug>
 *
 * What it does:
 *   - Wraps children in a Pressable with visual feedback
 *   - Logs every touch phase (pressIn, pressOut, press, longPress)
 *   - Flashes a colored border so you can SEE the touch target
 *   - Shows the component's measured layout (x, y, w, h) on mount
 *
 * Remove before production!
 */

import React, { useCallback, useRef, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from "react-native";

interface PressableDebugProps {
  label?: string;
  children: React.ReactNode;
  /** Pass-through onPress — fires AFTER logging */
  onPress?: () => void;
  /** Set false to disable the wrapper and render children directly */
  enabled?: boolean;
}

export const PressableDebug: React.FC<PressableDebugProps> = ({
  label = "unnamed",
  children,
  onPress,
  enabled = true,
}) => {
  const [layout, setLayout] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const [flash, setFlash] = useState(false);
  const pressCount = useRef(0);

  const tag = `[PressableDebug:${label}]`;

  const onLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const { x, y, width, height } = e.nativeEvent.layout;
      setLayout({ x, y, w: width, h: height });
      console.log(`${tag} layout — x:${x} y:${y} w:${width} h:${height}`);
      if (width === 0 || height === 0) {
        console.warn(`${tag} ⚠️  ZERO-SIZE touch target!`);
      }
    },
    [tag],
  );

  if (!enabled) return <>{children}</>;

  return (
    <Pressable
      onLayout={onLayout}
      onPressIn={() => {
        console.log(`${tag} ▶ pressIn`);
        setFlash(true);
      }}
      onPressOut={() => {
        console.log(`${tag} ◀ pressOut`);
        setFlash(false);
      }}
      onPress={() => {
        pressCount.current += 1;
        console.log(`${tag} ✅ PRESS #${pressCount.current}`);
        onPress?.();
      }}
      onLongPress={() => {
        console.log(`${tag} ⏳ longPress`);
      }}
      style={[styles.wrapper, flash && styles.wrapperActive]}
    >
      {children}
      {/* Layout badge — tiny overlay in the top-right corner */}
      <View style={styles.badge}>
        <Text style={styles.badgeText}>
          {`${label} ${layout.w}×${layout.h}`}
        </Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    borderWidth: 2,
    borderColor: "rgba(37, 99, 235, 0.3)",
    borderStyle: "dashed",
    borderRadius: 8,
  },
  wrapperActive: {
    borderColor: "red",
    backgroundColor: "rgba(255, 0, 0, 0.08)",
  },
  badge: {
    position: "absolute",
    top: -10,
    right: 4,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  badgeText: {
    color: "#fff",
    fontSize: 9,
    fontFamily: "monospace",
  },
});

export default PressableDebug;
