import { zodResolver } from "@hookform/resolvers/zod";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Eye, EyeOff, Lock, Mail } from "lucide-react-native";
import React, { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { z } from "zod";
import { Card, FormField, PrimaryButton, ScreenHeader } from "../../components/ui";
import {
  Colors,
  Layout,
  Radius,
  Spacing,
} from "../../constants/design";
import { useAuth } from "../../context/AuthContext";

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "И-мэйл хаяг оруулна уу")
    .email("И-мэйл хаяг буруу байна"),
  password: z.string().min(6, "Нууц үг хамгийн багадаа 6 тэмдэгт байх ёстой"),
});

type LoginFormData = z.infer<typeof loginSchema>;

type LoginScreenProps = {
  navigation: NativeStackNavigationProp<any>;
};

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const { signIn, isLoading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      await signIn(data);
    } catch (error: any) {
      Alert.alert("Алдаа", error.message || "Нэвтрэхэд алдаа гарлаа");
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
            title="Нэвтрэх"
            subtitle="Хүргэлтийн бүртгэлдээ нэвтэрч үргэлжлүүлнэ үү."
            onBackPress={() => navigation.goBack()}
          />

          <Card style={styles.formCard}>
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
                  leftElement={
                    <Mail size={18} color={Colors.textSoft} strokeWidth={2} />
                  }
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
                  leftElement={
                    <Lock size={18} color={Colors.textSoft} strokeWidth={2} />
                  }
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
              title="Нэвтрэх"
              onPress={handleSubmit(onSubmit)}
              loading={isLoading}
              style={styles.submitButton}
            />
          </Card>

          <View style={styles.footer}>
            <PrimaryButton
              title="Бүртгүүлэх"
              onPress={() => navigation.replace("Register")}
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
  formCard: {
    marginTop: Spacing.xs,
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
  submitButton: {
    marginTop: Spacing.xs,
  },
  footer: {
    marginTop: Spacing.lg,
    alignItems: "center",
  },
});

export default LoginScreen;
