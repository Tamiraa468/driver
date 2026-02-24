/**
 * Courier Registration Screen
 *
 * Production-grade registration screen for the courier app.
 * Automatically registers users with role='courier' and status='pending'.
 * Includes full name and email/password fields for courier profile.
 */

import { zodResolver } from "@hookform/resolvers/zod";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { z } from "zod";
import { useCourierAuth } from "../../context/CourierAuthContext";
import { AuthError } from "../../types";

// Validation schema
const registerSchema = z
  .object({
    full_name: z
      .string()
      .min(2, "Нэр хамгийн багадаа 2 тэмдэгт байх ёстой")
      .max(100, "Нэр хэт урт байна"),
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

/**
 * Maps auth error codes to user-friendly Mongolian messages
 */
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
        // Role is automatically set to 'courier' by the service
      });

      // Show success message - user will see pending screen
      Alert.alert(
        "Амжилттай бүртгэгдлээ!",
        "Таны бүртгэл баталгаажуулалт хүлээж байна. Баталгаажсаны дараа та хүргэлт хийх боломжтой болно.",
        [{ text: "Ойлголоо", style: "default" }],
      );
    } catch (error) {
      const authError = error as AuthError;
      Alert.alert("Алдаа", getErrorMessage(authError));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <Text style={styles.backButtonText}>←</Text>
            </TouchableOpacity>
            <View style={styles.logoContainer}>
              <Text style={styles.logoEmoji}>🚴</Text>
            </View>
            <Text style={styles.title}>Курьер бүртгүүлэх</Text>
            <Text style={styles.subtitle}>
              Бүртгэлийг баталгаажуулсны дараа хүргэлт эхлүүлэх боломжтой
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Full Name Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Бүтэн нэр *</Text>
              <Controller
                control={control}
                name="full_name"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={[
                      styles.input,
                      errors.full_name && styles.inputError,
                    ]}
                    placeholder="Овог Нэр"
                    placeholderTextColor="#999"
                    autoCapitalize="words"
                    autoCorrect={false}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    editable={!isLoading}
                  />
                )}
              />
              {errors.full_name && (
                <Text style={styles.errorText}>{errors.full_name.message}</Text>
              )}
            </View>

            {/* Email Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>И-мэйл *</Text>
              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={[styles.input, errors.email && styles.inputError]}
                    placeholder="courier@example.com"
                    placeholderTextColor="#999"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="email"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    editable={!isLoading}
                  />
                )}
              />
              {errors.email && (
                <Text style={styles.errorText}>{errors.email.message}</Text>
              )}
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Нууц үг *</Text>
              <View style={styles.passwordContainer}>
                <Controller
                  control={control}
                  name="password"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      style={[
                        styles.input,
                        styles.passwordInput,
                        errors.password && styles.inputError,
                      ]}
                      placeholder="••••••••"
                      placeholderTextColor="#999"
                      secureTextEntry={!showPassword}
                      autoComplete="new-password"
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      editable={!isLoading}
                    />
                  )}
                />
                <TouchableOpacity
                  style={styles.showPasswordButton}
                  onPress={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  <Text style={styles.showPasswordText}>
                    {showPassword ? "🙈" : "👁️"}
                  </Text>
                </TouchableOpacity>
              </View>
              {errors.password && (
                <Text style={styles.errorText}>{errors.password.message}</Text>
              )}
              <Text style={styles.passwordHint}>
                Хамгийн багадаа 8 тэмдэгт, том үсэг, жижиг үсэг, тоо орсон байх
              </Text>
            </View>

            {/* Confirm Password Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Нууц үг давтах *</Text>
              <Controller
                control={control}
                name="confirmPassword"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={[
                      styles.input,
                      errors.confirmPassword && styles.inputError,
                    ]}
                    placeholder="••••••••"
                    placeholderTextColor="#999"
                    secureTextEntry={!showPassword}
                    autoComplete="new-password"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    editable={!isLoading}
                  />
                )}
              />
              {errors.confirmPassword && (
                <Text style={styles.errorText}>
                  {errors.confirmPassword.message}
                </Text>
              )}
            </View>

            {/* Terms Agreement */}
            <TouchableOpacity
              style={styles.termsContainer}
              onPress={() => setAgreedToTerms(!agreedToTerms)}
              disabled={isLoading}
            >
              <View
                style={[
                  styles.checkbox,
                  agreedToTerms && styles.checkboxChecked,
                ]}
              >
                {agreedToTerms && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.termsText}>
                <Text style={styles.termsLink}>Үйлчилгээний нөхцөл</Text> болон{" "}
                <Text style={styles.termsLink}>Нууцлалын бодлого</Text>-г
                зөвшөөрч байна
              </Text>
            </TouchableOpacity>

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                (isLoading || !agreedToTerms) && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit(onSubmit)}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Бүртгүүлэх</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Бүртгэлтэй юу? </Text>
            <TouchableOpacity
              onPress={() => navigation.replace("CourierLogin")}
              disabled={isLoading}
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
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  header: {
    marginTop: 20,
    marginBottom: 30,
    alignItems: "center",
  },
  backButton: {
    position: "absolute",
    left: 0,
    top: 0,
  },
  backButtonText: {
    fontSize: 28,
    color: "#007AFF",
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#f0f7ff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  logoEmoji: {
    fontSize: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    paddingHorizontal: 20,
  },
  form: {
    gap: 18,
  },
  inputContainer: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  input: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: "#f9f9f9",
    color: "#1a1a1a",
  },
  inputError: {
    borderColor: "#ff3b30",
  },
  passwordContainer: {
    position: "relative",
  },
  passwordInput: {
    paddingRight: 50,
  },
  showPasswordButton: {
    position: "absolute",
    right: 16,
    top: 14,
  },
  showPasswordText: {
    fontSize: 20,
  },
  passwordHint: {
    fontSize: 11,
    color: "#888",
    marginTop: 2,
  },
  errorText: {
    color: "#ff3b30",
    fontSize: 12,
  },
  termsContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginTop: 8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: "#e0e0e0",
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
  },
  checkboxChecked: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
  },
  checkmark: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  termsText: {
    flex: 1,
    fontSize: 13,
    color: "#666",
    lineHeight: 18,
  },
  termsLink: {
    color: "#007AFF",
  },
  submitButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 30,
  },
  footerText: {
    color: "#666",
    fontSize: 14,
  },
  footerLink: {
    color: "#007AFF",
    fontSize: 14,
    fontWeight: "600",
  },
});

export default CourierRegisterScreen;
