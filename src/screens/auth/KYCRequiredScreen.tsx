import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import {
  CheckCircle,
  ClipboardList,
  FileText,
  Loader,
} from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Card,
  FormField,
  PrimaryButton,
  ScreenHeader,
  SectionTitle,
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
import {
  debugStorageConnectivity,
  uploadKYCDocument,
} from "../../services/storageService";
import { AuthError } from "../../types";

type DocKey = "id_front" | "id_back" | "vehicle_registration" | "selfie";

type DocumentSlot = {
  key: DocKey;
  label: string;
  required: boolean;
  allowDocument: boolean;
  cameraOnly: boolean;
  localUri: string;
  uploadedUrl: string;
  mimeType: string;
  isUploading: boolean;
};

async function ensureCameraPermission(): Promise<boolean> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();

  if (status !== "granted") {
    Alert.alert(
      "Зөвшөөрөл шаардлагатай",
      "Камер ашиглахын тулд тохиргооноос зөвшөөрөл өгнө үү.",
    );
    return false;
  }

  return true;
}

async function ensureMediaLibraryPermission(): Promise<boolean> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (status !== "granted") {
    Alert.alert(
      "Зөвшөөрөл шаардлагатай",
      "Зураг сонгохын тулд тохиргооноос зөвшөөрөл өгнө үү.",
    );
    return false;
  }

  return true;
}

async function pickFromCamera(): Promise<ImagePicker.ImagePickerAsset | null> {
  if (!(await ensureCameraPermission())) {
    return null;
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    quality: 0.8,
  });

  if (result.canceled || !result.assets?.length) {
    return null;
  }

  return result.assets[0];
}

async function pickFromGallery(): Promise<ImagePicker.ImagePickerAsset | null> {
  if (!(await ensureMediaLibraryPermission())) {
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    quality: 0.8,
  });

  if (result.canceled || !result.assets?.length) {
    return null;
  }

  return result.assets[0];
}

async function pickDocument(): Promise<{
  uri: string;
  mimeType: string;
} | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ["image/*", "application/pdf"],
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets?.length) {
    return null;
  }

  const asset = result.assets[0];
  return { uri: asset.uri, mimeType: asset.mimeType || "application/pdf" };
}

const KYCRequiredScreen: React.FC = () => {
  const { user, submitKYC, signOut, isLoading } = useCourierAuth();
  const [documents, setDocuments] = useState<DocumentSlot[]>([
    {
      key: "id_front",
      label: "Иргэний үнэмлэх (урд тал)",
      required: true,
      allowDocument: true,
      cameraOnly: false,
      localUri: "",
      uploadedUrl: "",
      mimeType: "",
      isUploading: false,
    },
    {
      key: "id_back",
      label: "Иргэний үнэмлэх (ард тал)",
      required: true,
      allowDocument: true,
      cameraOnly: false,
      localUri: "",
      uploadedUrl: "",
      mimeType: "",
      isUploading: false,
    },
    {
      key: "vehicle_registration",
      label: "Тээврийн хэрэгслийн гэрчилгээ",
      required: false,
      allowDocument: true,
      cameraOnly: false,
      localUri: "",
      uploadedUrl: "",
      mimeType: "",
      isUploading: false,
    },
    {
      key: "selfie",
      label: "Селфи зураг (царай тод харагдахуйц)",
      required: false,
      allowDocument: false,
      cameraOnly: true,
      localUri: "",
      uploadedUrl: "",
      mimeType: "",
      isUploading: false,
    },
  ]);
  const [vehicleType, setVehicleType] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    void debugStorageConnectivity();
  }, []);

  const updateSlot = useCallback(
    (index: number, patch: Partial<DocumentSlot>) => {
      setDocuments((prev) =>
        prev.map((document, currentIndex) =>
          currentIndex === index ? { ...document, ...patch } : document,
        ),
      );
    },
    [],
  );

  const uploadFile = useCallback(
    async (
      index: number,
      uri: string,
      mimeType: string,
    ): Promise<string | null> => {
      if (!user?.id) {
        return null;
      }

      const document = documents[index];
      updateSlot(index, { localUri: uri, mimeType, isUploading: true });

      try {
        const result = await uploadKYCDocument(
          uri,
          user.id,
          document.key,
          mimeType,
        );

        updateSlot(index, {
          uploadedUrl: result.url,
          isUploading: false,
        });

        return result.url;
      } catch (error) {
        console.error("[KYCRequiredScreen] Upload error:", error);
        updateSlot(index, { isUploading: false });
        Alert.alert(
          "Алдаа",
          "Файл байршуулахад алдаа гарлаа. Дахин оролдоно уу.",
        );
        return null;
      }
    },
    [documents, updateSlot, user?.id],
  );

  const showPickerOptions = useCallback(
    (index: number) => {
      const document = documents[index];

      if (document.cameraOnly) {
        void (async () => {
          const asset = await pickFromCamera();
          if (asset) {
            await uploadFile(index, asset.uri, asset.mimeType || "image/jpeg");
          }
        })();
        return;
      }

      const options: string[] = ["Камераар авах", "Зургийн сангаас"];
      if (document.allowDocument) {
        options.push("Файл сонгох (PDF)");
      }
      options.push("Болих");
      const cancelButtonIndex = options.length - 1;

      const handleChoice = async (choiceIndex: number) => {
        if (choiceIndex === cancelButtonIndex) {
          return;
        }

        if (choiceIndex === 0) {
          const asset = await pickFromCamera();
          if (asset) {
            await uploadFile(index, asset.uri, asset.mimeType || "image/jpeg");
          }
        } else if (choiceIndex === 1) {
          const asset = await pickFromGallery();
          if (asset) {
            await uploadFile(index, asset.uri, asset.mimeType || "image/jpeg");
          }
        } else if (choiceIndex === 2 && document.allowDocument) {
          const picked = await pickDocument();
          if (picked) {
            await uploadFile(index, picked.uri, picked.mimeType);
          }
        }
      };

      if (Platform.OS === "ios") {
        ActionSheetIOS.showActionSheetWithOptions(
          {
            options,
            cancelButtonIndex,
            title: document.label,
          },
          (choiceIndex) => {
            void handleChoice(choiceIndex);
          },
        );
        return;
      }

      const buttons: { text: string; onPress?: () => void }[] = options
        .filter((_, choiceIndex) => choiceIndex !== cancelButtonIndex)
        .map((label, choiceIndex) => ({
          text: label,
          onPress: () => {
            void handleChoice(choiceIndex);
          },
        }));

      buttons.push({ text: "Болих" });

      Alert.alert(document.label, "Оруулах аргаа сонгоно уу", buttons);
    },
    [documents, uploadFile],
  );

  const requiredDocuments = useMemo(
    () => documents.filter((document) => document.required),
    [documents],
  );
  const uploadedRequiredCount = requiredDocuments.filter(
    (document) => Boolean(document.uploadedUrl),
  ).length;
  const uploadingCount = documents.filter((document) => document.isUploading).length;

  const canSubmit =
    requiredDocuments.every((document) => Boolean(document.uploadedUrl)) &&
    uploadingCount === 0 &&
    !isSubmitting;

  const handleSubmit = async () => {
    if (!canSubmit) {
      Alert.alert(
        "Анхааруулга",
        "Бүх шаардлагатай бичиг баримтуудыг оруулна уу.",
      );
      return;
    }

    try {
      setIsSubmitting(true);

      const docMap = Object.fromEntries(
        documents.map((document) => [document.key, document.uploadedUrl]),
      ) as Record<string, string>;

      await submitKYC({
        id_front_url: docMap.id_front,
        id_back_url: docMap.id_back,
        vehicle_registration_url: docMap.vehicle_registration || undefined,
        selfie_url: docMap.selfie || undefined,
        vehicle_type: vehicleType || undefined,
        license_plate: licensePlate || undefined,
      });

      Alert.alert(
        "Амжилттай илгээгдлээ!",
        "Таны бичиг баримтуудыг хянаж байна. Баталгаажсаны дараа та хүргэлт хийх боломжтой болно.",
        [{ text: "Ойлголоо" }],
      );
    } catch (error) {
      const authError = error as AuthError;
      Alert.alert(
        "Алдаа",
        authError.message || "KYC илгээхэд алдаа гарлаа. Дахин оролдоно уу.",
      );
    } finally {
      setIsSubmitting(false);
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
            title="KYC шаардлагатай"
            subtitle="Хүргэлт авч эхлэхээсээ өмнө шаардлагатай баталгаажуулалтын бичиг баримтаа оруулна уу."
          />

          <Card style={styles.heroCard} variant="subtle">
            <View style={styles.heroTop}>
              <View style={styles.heroIcon}>
                <ClipboardList
                  size={24}
                  color={Colors.primaryDark}
                  strokeWidth={2}
                />
              </View>
              <View style={styles.heroBody}>
                <Text style={styles.heroTitle}>Баталгаажуулалт шаардлагатай</Text>
                <Text style={styles.heroText}>
                  Хүргэлт эхлүүлэхийн өмнө бичиг баримтаа илгээж, хяналтад
                  оруулна уу.
                </Text>
              </View>
            </View>

            <View style={styles.heroMeta}>
              <StatusBadge
                label={`${uploadedRequiredCount}/${requiredDocuments.length} заавал оруулах файл бэлэн`}
                status={
                  uploadedRequiredCount === requiredDocuments.length
                    ? "success"
                    : "warning"
                }
              />
              <StatusBadge label="Хяналт хүлээж байна" status="warning" />
              {uploadingCount > 0 ? (
                <StatusBadge label={`${uploadingCount} файл байршуулж байна`} status="info" />
              ) : null}
            </View>

            <View style={styles.accountRow}>
              <Text style={styles.accountLabel}>И-мэйл</Text>
              <Text style={styles.accountValue}>{user?.email ?? "Мэдээлэлгүй"}</Text>
            </View>
            <View style={styles.accountRow}>
              <Text style={styles.accountLabel}>Нэр</Text>
              <Text style={styles.accountValue}>
                {user?.full_name || "Нэр оруулаагүй"}
              </Text>
            </View>
          </Card>

          <SectionTitle title="Бичиг баримт оруулах" />
          <Card style={styles.sectionCard} padding="none">
            {documents.map((document, index) => {
              const hasPicked = Boolean(document.localUri);
              const isImage = !document.mimeType || !document.mimeType.includes("pdf");

              return (
                <TouchableOpacity
                  key={document.key}
                  activeOpacity={0.82}
                  disabled={isSubmitting || document.isUploading}
                  onPress={() => showPickerOptions(index)}
                  style={[
                    styles.documentRow,
                    hasPicked ? styles.documentRowPicked : null,
                    index < documents.length - 1 ? styles.documentRowBorder : null,
                  ]}
                >
                  {hasPicked && isImage ? (
                    <Image source={{ uri: document.localUri }} style={styles.thumbnail} />
                  ) : (
                    <View
                      style={[
                        styles.documentIconWrap,
                        hasPicked ? styles.documentIconWrapPicked : null,
                      ]}
                    >
                      {document.isUploading ? (
                        <Loader
                          size={18}
                          color={Colors.warning}
                          strokeWidth={2}
                        />
                      ) : hasPicked ? (
                        <CheckCircle
                          size={18}
                          color={Colors.success}
                          strokeWidth={2}
                        />
                      ) : (
                        <FileText
                          size={18}
                          color={Colors.textSoft}
                          strokeWidth={2}
                        />
                      )}
                    </View>
                  )}

                  <View style={styles.documentBody}>
                    <View style={styles.documentHeader}>
                      <Text
                        style={[
                          styles.documentLabel,
                          hasPicked ? styles.documentLabelPicked : null,
                        ]}
                      >
                        {document.label}
                      </Text>
                      <StatusBadge
                        label={document.required ? "Шаардлагатай" : "Нэмэлт"}
                        status={document.required ? "warning" : "default"}
                      />
                    </View>
                    <Text style={styles.documentStatus}>
                      {document.isUploading
                        ? "Байршуулж байна..."
                        : hasPicked
                          ? "Файл сонгогдсон. Дахин дарж солих боломжтой."
                          : document.required
                            ? "Заавал оруулах бичиг баримт"
                            : "Нэмэлт мэдээлэл хэлбэрээр оруулж болно"}
                    </Text>
                  </View>

                  {document.isUploading ? (
                    <ActivityIndicator color={Colors.primary} size="small" />
                  ) : (
                    <Text style={styles.documentAction}>
                      {hasPicked ? "Солих" : "Сонгох"}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </Card>

          <SectionTitle title="Тээврийн хэрэгслийн мэдээлэл" />
          <Card style={styles.sectionCard} padding="none">
            <View style={styles.fieldGroup}>
              <FormField
                containerStyle={styles.field}
                editable={!isSubmitting}
                label="Төрөл"
                onChangeText={setVehicleType}
                placeholder="Жишээ: Мотоцикл, Машин, Дугуй"
                value={vehicleType}
              />
              <FormField
                autoCapitalize="characters"
                containerStyle={styles.fieldLast}
                editable={!isSubmitting}
                label="Улсын дугаар"
                onChangeText={setLicensePlate}
                placeholder="Жишээ: 1234 УБА"
                value={licensePlate}
              />
            </View>
          </Card>

          <Card style={styles.submitCard} variant="subtle">
            <Text style={styles.submitLabel}>Илгээхийн өмнө</Text>
            <Text style={styles.submitText}>
              Шаардлагатай {requiredDocuments.length} файлаас {uploadedRequiredCount}
              нь бэлэн байна. Нэмэлт файлуудыг одоо эсвэл дараа нэмж болно.
            </Text>
          </Card>

          <PrimaryButton
            title="KYC бичиг баримт илгээх"
            onPress={() => {
              void handleSubmit();
            }}
            disabled={!canSubmit}
            loading={isSubmitting || isLoading}
            style={styles.primaryButton}
          />

          <PrimaryButton
            title="Гарах"
            onPress={() => {
              void signOut();
            }}
            disabled={isLoading}
            variant="outline"
          />

          <TouchableOpacity
            activeOpacity={0.72}
            onPress={() => {
              void Linking.openURL("mailto:support@delivery.mn");
            }}
            style={styles.supportLinkWrap}
          >
            <Text style={styles.supportText}>
              Асуулт байвал support@delivery.mn рүү холбогдоно уу
            </Text>
          </TouchableOpacity>
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
  heroCard: {
    marginTop: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: Spacing.md,
  },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    backgroundColor: Colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.sm + 4,
  },
  heroBody: {
    flex: 1,
  },
  heroTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: 4,
  },
  heroText: {
    fontSize: FontSize.sm,
    color: Colors.textSoft,
    lineHeight: 20,
  },
  heroMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  accountRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  accountLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSoft,
  },
  accountValue: {
    flex: 1,
    textAlign: "right",
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  sectionCard: {
    marginBottom: Spacing.lg,
  },
  documentRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Layout.cardPadding,
    paddingVertical: Spacing.md,
  },
  documentRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  documentRowPicked: {
    backgroundColor: Colors.successSoft,
  },
  documentIconWrap: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.sm + 4,
  },
  documentIconWrapPicked: {
    backgroundColor: Colors.surface,
  },
  thumbnail: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: Colors.backgroundMuted,
    marginRight: Spacing.sm + 4,
  },
  documentBody: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  documentHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
    marginBottom: 4,
  },
  documentLabel: {
    flex: 1,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  documentLabelPicked: {
    color: Colors.success,
  },
  documentStatus: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    lineHeight: 17,
  },
  documentAction: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.primaryDark,
  },
  fieldGroup: {
    padding: Layout.cardPadding,
  },
  field: {
    marginBottom: Spacing.md,
  },
  fieldLast: {
    marginBottom: 0,
  },
  submitCard: {
    marginBottom: Spacing.md,
  },
  submitLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textSoft,
    marginBottom: 6,
  },
  submitText: {
    fontSize: FontSize.sm,
    color: Colors.textSoft,
    lineHeight: 20,
  },
  primaryButton: {
    marginBottom: Spacing.sm + 4,
  },
  supportLinkWrap: {
    marginTop: Spacing.lg,
    alignItems: "center",
  },
  supportText: {
    fontSize: FontSize.sm,
    color: Colors.primaryDark,
    fontWeight: FontWeight.medium,
    textAlign: "center",
  },
});

export default KYCRequiredScreen;
