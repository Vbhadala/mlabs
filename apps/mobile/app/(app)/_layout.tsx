import * as React from "react";
import { Tabs } from "expo-router";
import { Text, View } from "react-native";
import { useUnreadCount } from "../../features/notifications/hooks";
import { useConversations } from "../../features/messages/hooks";

/**
 * Bottom tab bar — 4 tabs, icon + label always visible (Pass-4 design spec).
 * Badges on Messages (unread conversations count) + Notifications (unread).
 */
function TabIcon({ glyph, focused }: { glyph: string; focused: boolean }) {
  return (
    <Text
      style={{
        fontSize: 22,
        opacity: focused ? 1 : 0.6,
        // 48pt height inside ~60pt tap area enforced by Tabs default.
        lineHeight: 26,
      }}
    >
      {glyph}
    </Text>
  );
}

function Badge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <View
      accessibilityLabel={`${count} unread`}
      style={{
        position: "absolute",
        top: 2,
        right: -10,
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: "#dc2626",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 4,
      }}
    >
      <Text style={{ color: "white", fontSize: 11, fontWeight: "600" }}>
        {count > 99 ? "99+" : count}
      </Text>
    </View>
  );
}

export default function AppLayout() {
  const unread = useUnreadCount();
  const conversations = useConversations();
  const unreadConvos = (conversations.data ?? []).filter((c) => c.unread).length;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarLabelStyle: { fontSize: 11 },
        tabBarStyle: { height: 64 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarAccessibilityLabel: "Home tab",
          tabBarIcon: ({ focused }) => <TabIcon glyph="⌂" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: "Messages",
          tabBarAccessibilityLabel: "Messages tab",
          tabBarIcon: ({ focused }) => (
            <View>
              <TabIcon glyph="✉" focused={focused} />
              <Badge count={unreadConvos} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "Notifications",
          tabBarAccessibilityLabel: "Notifications tab",
          tabBarIcon: ({ focused }) => (
            <View>
              <TabIcon glyph="◉" focused={focused} />
              <Badge count={unread.data ?? 0} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarAccessibilityLabel: "Profile tab",
          tabBarIcon: ({ focused }) => <TabIcon glyph="◯" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
