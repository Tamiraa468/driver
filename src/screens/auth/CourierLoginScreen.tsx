/**
 * Courier Login Screen
 *
 * Production-grade login screen for the courier app.
 * Handles email/password authentication with proper error handling
 * and access status checking.
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
const loginSchema = z.object({
  email: z
    .string()
    .min(1, "И-мэйл хаяг оруулна уу")
    .email("И-мэйл хаяг буруу байна"),
  password: z.string().min(6, "Нууц үг хамгийн багадаа 6 тэмдэгт байх ёстой"),
});

type LoginFormData = z.infer<typeof loginSchema>;

type CourierLoginScreenProps = {
  navigation: NativeStackNavigationProp<any>;
};

/**
 * Maps auth error codes to user-friendly Mongolian messages
 */
function getErrorMessage(error: AuthError): string {
  switch (error.code) {
    case "INVALID_CREDENTIALS":
      return "И-мэйл эсвэл нууц үг буруу байна";
    case "EMAIL_NOT_CONFIRMED":
      return "И-мэйл хаягаа баталгаажуулна уу";
    case "USER_NOT_FOUND":
      return "Энэ и-мэйл хаягаар бүртгэл олдсонгүй";
    case "NOT_A_COURIER":
      return "Энэ апп зөвхөн курьерт зориулагдсан. Та өөр апп ашиглана уу.";
    case "ACCOUNT_PENDING":
      return "Таны бүртгэл баталгаажуулалт хүлээж байна";
    case "ACCOUNT_BLOCKED":
      return "Таны бүртгэл блоклогдсон байна. Дэмжлэгтэй холбогдоно уу.";
    case "NETWORK_ERROR":
      return "Интернет холболтоо шалгана уу";
    default:
      return error.message || "Нэвтрэхэд алдаа гарлаа";
  }
}

const CourierLoginScreen: React.FC<CourierLoginScreenProps> = ({
  navigation,
}) => {
  const { signIn, isLoading } = useCourierAuth();
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
      // Navigation is handled automatically by RootNavigator
    } catch (error) {
      const authError = error as AuthError;
      Alert.alert("Алдаа", getErrorMessage(authError));
    }
  };

  const handleForgotPassword = () => {
    // Navigate to password reset screen
    navigation.navigate("ForgotPassword");
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
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
            <Text style={styles.title}>Курьер нэвтрэх</Text>
            <Text style={styles.subtitle}>Тавтай морил!</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Email Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>И-мэйл</Text>
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
              <Text style={styles.label}>Нууц үг</Text>
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
                      autoComplete="password"
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
            </View>

            {/* Forgot Password */}
            <TouchableOpacity
              onPress={handleForgotPassword}
              disabled={isLoading}
              style={styles.forgotPasswordButton}
            >
              <Text style={styles.forgotPasswordText}>Нууц үгээ мартсан?</Text>
            </TouchableOpacity>

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                isLoading && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit(onSubmit)}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Нэвтрэх</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Бүртгэл байхгүй юу? </Text>
            <TouchableOpacity
              onPress={() => navigation.replace("CourierRegister")}
              disabled={isLoading}
            >
              <Text style={styles.footerLink}>Бүртгүүлэх</Text>
            </TouchableOpacity>
          </View>
        </View>
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
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    marginTop: 20,
    marginBottom: 40,
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
    fontSize: 16,
    color: "#666",
  },
  form: {
    gap: 20,
  },
  inputContainer: {
    gap: 8,
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
  errorText: {
    color: "#ff3b30",
    fontSize: 12,
  },
  forgotPasswordButton: {
    alignSelf: "flex-end",
  },
  forgotPasswordText: {
    color: "#007AFF",
    fontSize: 14,
  },
  submitButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: "auto",
    marginBottom: 40,
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

export default CourierLoginScreen;
