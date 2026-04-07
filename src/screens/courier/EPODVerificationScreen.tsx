import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { CheckCircle, RefreshCw, ShieldCheck } from "lucide-react-native";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PrimaryButton, ScreenHeader, StateView } from "../../components/ui";
import {
  Colors,
  FontSize,
  FontWeight,
  Layout,
  Radius,
  Shadow,
  Spacing,
} from "../../constants/design";
import { CourierRootStackParamList } from "../../navigation/CourierRootNavigator";
import {
  resendEpodOtp,
  verifyEpodOtp,
} from "../../services/deliveryTaskService";

type NavProp = NativeStackNavigationProp<
  CourierRootStackParamList,
  "EPODVerification"
>;
type RouteType = RouteProp<CourierRootStackParamList, "EPODVerification">;

const OTP_LENGTH = 6;

export default function EPODVerificationScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteType>();
  const { taskId } = route.params;

  const [otp, setOtp] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);

  const inputRef = useRef<TextInput>(null);

  const handleOtpChange = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, OTP_LENGTH);
    setOtp(digits);
    setError(null);
  };

  const handleVerify = async () => {
    if (otp.length < OTP_LENGTH) {
      setError("6 оронтой кодыг бүтнээр оруулна уу.");
      return;
    }

    setVerifying(true);
    setError(null);

    try {
      const result = await verifyEpodOtp(taskId, otp);

      if (result.success) {
        setVerified(true);
        return;
      }

      setError(result.message || "OTP код буруу байна. Дахин оролдоно уу.");
      setOtp("");
      inputRef.current?.focus();
    } catch (err: any) {
      setError(
        err?.message || "Баталгаажуулахад алдаа гарлаа. Дахин оролдоно уу.",
      );
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setError(null);
    setOtp("");

    try {
      await resendEpodOtp(taskId);
      Alert.alert(
        "Код дахин илгээгдлээ",
        "Шинэ OTP код харилцагчийн имэйл рүү илгээгдлээ.",
      );
    } catch (err: any) {
      setError(err?.message || "Код дахин илгээхэд алдаа гарлаа.");
    } finally {
      setResending(false);
    }
  };

  // ── Success state ──────────────────────────────────────────────────────────
  if (verified) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.stateWrap}>
          <StateView
            icon={
              <CheckCircle size={52} color={Colors.success} strokeWidth={1.8} />
            }
            title="Хүргэлт амжилттай!"
            description="ePOD баталгаажуулалт дууслаа. Орлого таны дансанд бүртгэгдлээ."
            actionLabel="Нүүр хуудас руу буцах"
            onActionPress={() => navigation.navigate("CourierMain")}
          />
        </View>
      </SafeAreaView>
    );
  }

  // ── OTP entry ──────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader
        title="Хүргэлт баталгаажуулах"
        subtitle="Харилцагч имэйлдээ хүлээн авсан кодыг оруулна уу."
        onBackPress={() => navigation.goBack()}
      />

      <View style={styles.content}>
        {/* Icon */}
        <View style={styles.iconWrap}>
          <ShieldCheck size={40} color={Colors.primary} strokeWidth={1.8} />
        </View>

        {/* Instructions */}
        <Text style={styles.heading}>OTP код оруулах</Text>
        <Text style={styles.description}>
          Харилцагчаас 6 оронтой нэг удаагийн кодыг асуугаад доор оруулна уу.
          Код 10 минутын дотор хүчинтэй.
        </Text>

        {/* OTP input */}
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => inputRef.current?.focus()}
          style={styles.otpContainer}
        >
          {Array.from({ length: OTP_LENGTH }).map((_, i) => {
            const char = otp[i] ?? "";
            const isCurrent = i === otp.length && otp.length < OTP_LENGTH;
            return (
              <View
                key={i}
                style={[
                  styles.otpCell,
                  char !== "" && styles.otpCellFilled,
                  isCurrent && styles.otpCellActive,
                  error !== null && styles.otpCellError,
                ]}
              >
                <Text style={styles.otpChar}>{char}</Text>
              </View>
            );
          })}
        </TouchableOpacity>

        {/* Hidden real input */}
        <TextInput
          ref={inputRef}
          value={otp}
          onChangeText={handleOtpChange}
          keyboardType="number-pad"
          maxLength={OTP_LENGTH}
          style={styles.hiddenInput}
          autoFocus
        />

        {/* Error */}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {/* Verify button */}
        <View style={styles.buttonWrap}>
          <PrimaryButton
            title="Баталгаажуулах"
            onPress={() => {
              void handleVerify();
            }}
            loading={verifying}
            disabled={otp.length < OTP_LENGTH || verifying}
            variant="success"
          />
        </View>

        {/* Resend */}
        <TouchableOpacity
          style={styles.resendRow}
          onPress={() => {
            void handleResend();
          }}
          disabled={resending}
          activeOpacity={0.7}
        >
          {resending ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <RefreshCw size={14} color={Colors.primary} strokeWidth={2} />
          )}
          <Text style={styles.resendText}>
            {resending ? "Илгээж байна..." : "Код дахин илгээх"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Bottom info card */}
      <View style={[styles.bottomCard, Shadow.float]}>
        <Text style={styles.bottomTitle}>Яаж ажилладаг вэ?</Text>
        <Text style={styles.bottomStep}>
          <Text style={styles.stepNum}>1. </Text>
          Харилцагч имэйлдээ 6 оронтой код хүлээн авсан.
        </Text>
        <Text style={styles.bottomStep}>
          <Text style={styles.stepNum}>2. </Text>
          Тэр кодыг танд хэлнэ.
        </Text>
        <Text style={styles.bottomStep}>
          <Text style={styles.stepNum}>3. </Text>
          Та кодыг оруулж баталгаажуулна.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  stateWrap: {
    flex: 1,
    paddingHorizontal: Layout.screenPadding,
    justifyContent: "center",
  },
  content: {
    flex: 1,
    paddingHorizontal: Layout.screenPadding,
    paddingTop: Spacing.xl,
    alignItems: "center",
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  heading: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  description: {
    fontSize: FontSize.sm,
    color: Colors.textSoft,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.md,
  },
  otpContainer: {
    flexDirection: "row",
    gap: 10,
    marginBottom: Spacing.sm,
  },
  otpCell: {
    width: 46,
    height: 56,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  otpCellFilled: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primarySoft,
  },
  otpCellActive: {
    borderColor: Colors.primary,
    borderWidth: 2,
  },
  otpCellError: {
    borderColor: Colors.danger,
    backgroundColor: Colors.dangerSoft ?? "#FFF0F0",
  },
  otpChar: {
    fontSize: FontSize.xxl ?? 26,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  hiddenInput: {
    position: "absolute",
    width: 1,
    height: 1,
    opacity: 0,
  },
  errorText: {
    fontSize: FontSize.sm,
    color: Colors.danger,
    textAlign: "center",
    marginTop: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  buttonWrap: {
    width: "100%",
    marginTop: Spacing.lg,
  },
  resendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  resendText: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: FontWeight.medium,
  },
  bottomCard: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  bottomTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textSoft,
    marginBottom: Spacing.sm,
  },
  bottomStep: {
    fontSize: FontSize.sm,
    color: Colors.textSoft,
    lineHeight: 22,
  },
  stepNum: {
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
});
