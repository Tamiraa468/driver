import React from "react";
import { StyleSheet, Switch, Text, View } from "react-native";

interface StatusToggleProps {
  isOnline: boolean;
  onToggle: (value: boolean) => void;
  label?: string;
}

const StatusToggle: React.FC<StatusToggleProps> = ({
  isOnline,
  onToggle,
  label = "Status",
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.labelContainer}>
        <Text style={styles.label}>{label}</Text>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: isOnline ? "#28a745" : "#dc3545" },
          ]}
        >
          <Text style={styles.statusText}>
            {isOnline ? "Online" : "Offline"}
          </Text>
        </View>
      </View>
      <Switch
        value={isOnline}
        onValueChange={onToggle}
        trackColor={{ false: "#d0d0d0", true: "#81c784" }}
        thumbColor={isOnline ? "#28a745" : "#999"}
        style={styles.switch}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 12,
  },
  labelContainer: {
    flex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 8,
  },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  switch: {
    marginLeft: 16,
  },
});

export default StatusToggle;
