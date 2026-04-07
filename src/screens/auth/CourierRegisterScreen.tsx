import { zodResolver } from "@hookform/resolvers/zod";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Bike, Eye, EyeOff } from "lucide-react-native";
import React, { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { z } from "zod";
import {
  Card,
  FormField,
  PrimaryButton,
  ScreenHeader,
  StatusBadge,
} from "../../components/ui";
import {
  Colors,
  FontSize,
  FontWeight,
  Layout,
  Radius,
  Spacing,
} from "../../constants/design";
import { useCourierAuth } from "../../context/CourierAuthContext";
import { AuthError } from "../../types";

const registerSchema = z
  .object({
    full_name: z
      .string()
      .min(2, "Нэр хамгийн багадаа 2 тэмдэгт байх ёстой")
      .max(100, "Нэр хэт урт байна"),
    phone: z
      .string()
      .regex(/^[0-9]{8}$/, "Утасны дугаар 8 оронтой тоо байх ёстой")
      .optional()
      .or(z.literal("")),
    email: z
      .string()
      .min(1, "И-мэйл хаяг оруулна уу")
      .email("И-мэйл хаяг буруу байна"),
    password: z
      .string()
      .min(8, "Нууц үг хамгийн багадаа 8 тэмдэгт байх ёстой")
      .regex(/[A-Z]/, "Нууц үгт том үсэг орсон байх ёстой")
      .regex(/[a-z]/, "Нууц үгт жижиг үсэг орсон байх ёстой")
      .regex(/[0-9]/, "Нууц үгт тоо орсон байх ёстой"),
    confirmPassword: z.string().min(1, "Нууц үгээ давтан оруулна уу"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Нууц үг таарахгүй байна",
    path: ["confirmPassword"],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

type CourierRegisterScreenProps = {
  navigation: NativeStackNavigationProp<any>;
};

function getErrorMessage(error: AuthError): string {
  switch (error.code) {
    case "INVALID_CREDENTIALS":
      return "Мэдээлэл буруу байна";
    case "EMAIL_NOT_CONFIRMED":
      return "И-мэйл хаягаа баталгаажуулсны дараа нэвтэрнэ үү";
    case "NETWORK_ERROR":
      return "Интернет холболтоо шалгана уу";
    default:
      return error.message || "Бүртгүүлэхэд алдаа гарлаа";
  }
}

const CourierRegisterScreen: React.FC<CourierRegisterScreenProps> = ({
  navigation,
}) => {
  const { signUp, isLoading } = useCourierAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      full_name: "",
      phone: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    if (!agreedToTerms) {
      Alert.alert("Анхааруулга", "Үйлчилгээний нөхцөлийг зөвшөөрнө үү");
      return;
    }

    try {
      await signUp({
        email: data.email,
        password: data.password,
        full_name: data.full_name,
        phone: data.phone || undefined,
      });
    } catch (error) {
      const authError = error as AuthError;
      Alert.alert("Алдаа", getErrorMessage(authError));
    }
  };

  const passwordToggle = (
    <TouchableOpacity
      activeOpacity={0.72}
      disabled={isLoading}
      onPress={() => setShowPassword((value) => !value)}
      style={styles.eyeButton}
    >
      {showPassword ? (
        <EyeOff size={18} color={Colors.textSoft} strokeWidth={2} />
      ) : (
        <Eye size={18} color={Colors.textSoft} strokeWidth={2} />
      )}
    </TouchableOpacity>
  );

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
            title="Курьер бүртгүүлэх"
            subtitle="Эхлээд курьерын бүртгэлээ үүсгэнэ. Дараагийн алхамд KYC бичиг баримтаа оруулна."
            onBackPress={() => navigation.goBack()}
          />

          <Card style={styles.introCard} variant="subtle">
            <View style={styles.introIcon}>
              <Bike size={28} color={Colors.primaryDark} strokeWidth={2} />
            </View>
            <Text style={styles.introTitle}>Курьер бүртгүүлэх</Text>
            <Text style={styles.introText}>
              Бүртгэлийг үүсгэсний дараа бичиг баримтаа илгээж, хяналтад оруулах
              дараагийн алхам руу орно.
            </Text>
            <StatusBadge label="2 алхмын 1" status="info" />
          </Card>

          <Card style={styles.formCard}>
            <Controller
              control={control}
              name="full_name"
              render={({ field: { onChange, onBlur, value } }) => (
                <FormField
                  autoCapitalize="words"
                  autoCorrect={false}
                  containerStyle={styles.field}
                  editable={!isLoading}
                  errorText={errors.full_name?.message}
                  label="Бүтэн нэр *"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  placeholder="Овог Нэр"
                  value={value}
                />
              )}
            />

            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <FormField
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect={false}
                  containerStyle={styles.field}
                  editable={!isLoading}
                  errorText={errors.email?.message}
                  keyboardType="email-address"
                  label="И-мэйл *"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  placeholder="courier@example.com"
                  value={value}
                />
              )}
            />

            <Controller
              control={control}
              name="phone"
              render={({ field: { onChange, onBlur, value } }) => (
                <FormField
                  autoCapitalize="none"
                  autoCorrect={false}
                  containerStyle={styles.field}
                  editable={!isLoading}
                  errorText={errors.phone?.message}
                  keyboardType="phone-pad"
                  label="Утасны дугаар"
                  maxLength={8}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  placeholder="99119911"
                  value={value}
                />
              )}
            />

            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <FormField
                  autoComplete="new-password"
                  containerStyle={styles.field}
                  editable={!isLoading}
                  errorText={errors.password?.message}
                  helperText="Хамгийн багадаа 8 тэмдэгт, том үсэг, жижиг үсэг, тоо орсон байх"
                  label="Нууц үг *"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  placeholder="••••••••"
                  rightElement={passwordToggle}
                  secureTextEntry={!showPassword}
                  value={value}
                />
              )}
            />

            <Controller
              control={control}
              name="confirmPassword"
              render={({ field: { onChange, onBlur, value } }) => (
                <FormField
                  autoComplete="new-password"
                  containerStyle={styles.field}
                  editable={!isLoading}
                  errorText={errors.confirmPassword?.message}
                  label="Нууц үг давтах *"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  placeholder="••••••••"
                  rightElement={passwordToggle}
                  secureTextEntry={!showPassword}
                  value={value}
                />
              )}
            />

            <TouchableOpacity
              activeOpacity={0.78}
              disabled={isLoading}
              onPress={() => setAgreedToTerms((value) => !value)}
              style={styles.termsRow}
            >
              <View
                style={[
                  styles.checkbox,
                  agreedToTerms ? styles.checkboxChecked : null,
                ]}
              >
                {agreedToTerms ? <Text style={styles.checkmark}>✓</Text> : null}
              </View>
              <View style={styles.termsBody}>
                <Text style={styles.termsText}>
                  <Text style={styles.termsLink}>Үйлчилгээний нөхцөл</Text> болон{" "}
                  <Text style={styles.termsLink}>Нууцлалын бодлого</Text>-г
                  зөвшөөрч байна
                </Text>
                <Text style={styles.termsHint}>
                  Бүртгэл баталгаажсаны дараа л хүргэлтийн ажил эхэлнэ.
                </Text>
              </View>
            </TouchableOpacity>

            <PrimaryButton
              title="Бүртгүүлэх"
              onPress={handleSubmit(onSubmit)}
              disabled={!agreedToTerms}
              loading={isLoading}
              style={styles.submitButton}
            />
          </Card>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Бүртгэлтэй юу? </Text>
            <TouchableOpacity
              activeOpacity={0.72}
              disabled={isLoading}
              onPress={() => navigation.replace("CourierLogin")}
            >
              <Text style={styles.footerLink}>Нэвтрэх</Text>
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
  introCard: {
    alignItems: "center",
    marginTop: Spacing.xs,
    marginBottom: Spacing.md,
  },
  introIcon: {
    width: 64,
    height: 64,
    borderRadius: Radius.full,
    backgroundColor: Colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  introTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.xs + 2,
    textAlign: "center",
  },
  introText: {
    fontSize: FontSize.sm,
    color: Colors.textSoft,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  formCard: {
    marginBottom: Spacing.lg,
  },
  field: {
    marginBottom: Spacing.md,
  },
  eyeButton: {
    width: 28,
    height: 28,
    borderRadius: Radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  termsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: Spacing.xs,
    marginBottom: Spacing.md,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: Colors.borderStrong,
    backgroundColor: Colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
    marginRight: Spacing.sm + 4,
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkmark: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.white,
  },
  termsBody: {
    flex: 1,
  },
  termsText: {
    fontSize: FontSize.sm,
    color: Colors.textSoft,
    lineHeight: 20,
  },
  termsLink: {
    color: Colors.primaryDark,
    fontWeight: FontWeight.semibold,
  },
  termsHint: {
    marginTop: 4,
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    lineHeight: 17,
  },
  submitButton: {
    marginTop: Spacing.xs,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
  },
  footerText: {
    fontSize: FontSize.sm,
    color: Colors.textSoft,
  },
  footerLink: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.primaryDark,
  },
});

export default CourierRegisterScreen;
