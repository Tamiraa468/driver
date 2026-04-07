import { zodResolver } from "@hookform/resolvers/zod";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Eye, EyeOff, UserPlus } from "lucide-react-native";
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
import { useAuth } from "../../context/AuthContext";
import { UserRole } from "../../types";

const registerSchema = z
  .object({
    email: z
      .string()
      .min(1, "И-мэйл хаяг оруулна уу")
      .email("И-мэйл хаяг буруу байна"),
    password: z.string().min(6, "Нууц үг хамгийн багадаа 6 тэмдэгт байх ёстой"),
    confirmPassword: z.string().min(1, "Нууц үгээ давтан оруулна уу"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Нууц үг таарахгүй байна",
    path: ["confirmPassword"],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

type RegisterScreenProps = {
  navigation: NativeStackNavigationProp<any>;
};

const RegisterScreen: React.FC<RegisterScreenProps> = ({ navigation }) => {
  const { signUp, isLoading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const courierRole: UserRole = "courier";

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    try {
      await signUp({
        email: data.email,
        password: data.password,
        role: courierRole,
      });
    } catch (error: any) {
      Alert.alert("Алдаа", error?.message || "Бүртгүүлэхэд алдаа гарлаа");
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
            title="Бүртгүүлэх"
            subtitle="Шинэ бүртгэл үүсгээд хүргэлтийн ажлын урсгал руу орно."
            onBackPress={() => navigation.goBack()}
          />

          <Card style={styles.introCard} variant="subtle">
            <View style={styles.introIcon}>
              <UserPlus size={24} color={Colors.text} strokeWidth={2} />
            </View>
            <Text style={styles.introTitle}>Курьерын бүртгэл</Text>
            <Text style={styles.introText}>
              Энэ урсгал нь курьерын профайл үүсгэж, дараагийн баталгаажуулалтын
              алхам руу шилжинэ.
            </Text>
            <StatusBadge label="Курьерын эрх" status="info" />
          </Card>

          <Card>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <FormField
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  containerStyle={styles.field}
                  editable={!isLoading}
                  errorText={errors.email?.message}
                  keyboardType="email-address"
                  label="И-мэйл"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  placeholder="example@email.com"
                  value={value}
                />
              )}
            />

            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <FormField
                  autoCapitalize="none"
                  autoCorrect={false}
                  containerStyle={styles.field}
                  editable={!isLoading}
                  errorText={errors.password?.message}
                  label="Нууц үг"
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
                  autoCapitalize="none"
                  autoCorrect={false}
                  containerStyle={styles.field}
                  editable={!isLoading}
                  errorText={errors.confirmPassword?.message}
                  label="Нууц үг давтах"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  placeholder="••••••••"
                  rightElement={passwordToggle}
                  secureTextEntry={!showPassword}
                  value={value}
                />
              )}
            />

            <PrimaryButton
              title="Курьерээр бүртгүүлэх"
              onPress={handleSubmit(onSubmit)}
              loading={isLoading}
            />
          </Card>

          <View style={styles.footer}>
            <PrimaryButton
              title="Нэвтрэх"
              onPress={() => navigation.replace("Login")}
              variant="ghost"
            />
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
    width: 56,
    height: 56,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  introTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.xs + 2,
  },
  introText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.regular,
    color: Colors.textSoft,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: Spacing.md,
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
  footer: {
    marginTop: Spacing.lg,
    alignItems: "center",
  },
});

export default RegisterScreen;
