import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Lock, Mail, Package } from "lucide-react-native";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Card, PrimaryButton, ScreenHeader } from "../../components/ui";
import {
  Colors,
  FontSize,
  FontWeight,
  Layout,
  Radius,
  Spacing,
} from "../../constants/design";
import { useCourierAuth } from "../../context/CourierAuthContext";

type CourierLoginScreenProps = {
  navigation: NativeStackNavigationProp<any>;
};

const CourierLoginScreen: React.FC<CourierLoginScreenProps> = ({
  navigation,
}) => {
  const { signIn } = useCourierAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError("Бүх талбарыг бөглөнө үү");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await signIn({ email: email.trim(), password: password.trim() });
    } catch (loginError: any) {
      setError(loginError?.message || "Нэвтрэхэд алдаа гарлаа. Дахин оролдоно уу.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <ScreenHeader
            title="Дахин тавтай морил"
            subtitle="Курьерын ажлаа үргэлжлүүлэхийн тулд нэвтэрнэ үү"
            onBackPress={() => navigation.goBack()}
          />

          <Card style={styles.formCard}>
            <View style={styles.logoWrap}>
              <View style={styles.logoCircle}>
                <Package size={28} color={Colors.primaryDark} strokeWidth={2} />
              </View>
            </View>

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>И-мэйл</Text>
              <View style={styles.inputWrapper}>
                <Mail
                  size={18}
                  color={Colors.textSoft}
                  strokeWidth={2}
                  style={styles.inputIcon}
                />
                <TextInput
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  onChangeText={setEmail}
                  placeholder="name@example.com"
                  placeholderTextColor={Colors.textMuted}
                  style={styles.input}
                  value={email}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Нууц үг</Text>
              <View style={styles.inputWrapper}>
                <Lock
                  size={18}
                  color={Colors.textSoft}
                  strokeWidth={2}
                  style={styles.inputIcon}
                />
                <TextInput
                  onChangeText={setPassword}
                  placeholder="Нууц үгээ оруулна уу"
                  placeholderTextColor={Colors.textMuted}
                  secureTextEntry
                  style={styles.input}
                  value={password}
                />
              </View>
            </View>

            <PrimaryButton
              title="Нэвтрэх"
              onPress={handleLogin}
              loading={loading}
              style={styles.loginButton}
            />

            <TouchableOpacity activeOpacity={0.72} style={styles.forgotButton}>
              <Text style={styles.forgotText}>Нууц үгээ мартсан уу?</Text>
            </TouchableOpacity>
          </Card>

          <View style={styles.registerRow}>
            <Text style={styles.registerText}>Бүртгэлгүй юу? </Text>
            <TouchableOpacity
              activeOpacity={0.72}
              onPress={() => navigation.navigate("CourierRegister")}
            >
              <Text style={styles.registerLink}>Бүртгүүлэх</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: Layout.screenPadding,
    paddingBottom: Spacing.xxl,
  },
  formCard: {
    marginTop: Spacing.sm,
  },
  logoWrap: {
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: Radius.full,
    backgroundColor: Colors.primarySoft,
    borderWidth: 1,
    borderColor: Colors.primarySoftStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  errorBox: {
    marginBottom: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.dangerSoft,
    borderWidth: 1,
    borderColor: "#F2C5C0",
  },
  errorText: {
    fontSize: FontSize.sm,
    color: Colors.danger,
    textAlign: "center",
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  inputLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textSoft,
    marginBottom: Spacing.xs + 4,
  },
  inputWrapper: {
    minHeight: Layout.inputHeight,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: Radius.input,
    borderWidth: 1,
    borderColor: Colors.primarySoftStrong,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
  },
  inputIcon: {
    marginRight: Spacing.sm + 2,
  },
  input: {
    flex: 1,
    fontSize: FontSize.base,
    color: Colors.text,
    paddingVertical: Platform.OS === "ios" ? 16 : 14,
  },
  loginButton: {
    marginTop: Spacing.sm,
  },
  forgotButton: {
    alignItems: "center",
    marginTop: Spacing.md,
  },
  forgotText: {
    fontSize: FontSize.sm,
    color: Colors.primaryDark,
    fontWeight: FontWeight.semibold,
  },
  registerRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: Spacing.lg,
  },
  registerText: {
    fontSize: FontSize.sm,
    color: Colors.textSoft,
  },
  registerLink: {
    fontSize: FontSize.sm,
    color: Colors.primaryDark,
    fontWeight: FontWeight.semibold,
  },
});

export default CourierLoginScreen;
