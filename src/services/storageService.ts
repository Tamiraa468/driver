/**
 * Storage Service — Supabase Storage helpers for file upload
 *
 * Handles uploading images and documents to Supabase Storage
 * and returning public/signed URLs for use in the app.
 *
 * Uses expo-file-system to read local files as base64 and
 * base64-arraybuffer to decode them into ArrayBuffers that
 * Supabase Storage accepts on React Native.
 */

import { decode } from "base64-arraybuffer";
import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";
import { supabase, supabaseUrl } from "../config/supabaseClient";

// ============================================================================
// CONSTANTS
// ============================================================================

/** Supabase Storage bucket name for KYC documents */
const KYC_BUCKET = "KYC";

// ============================================================================
// TYPES
// ============================================================================

export interface UploadResult {
  url: string;
  path: string;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Generates a unique storage path for a KYC document.
 */
function buildStoragePath(
  userId: string,
  docType: string,
  mimeType: string,
): string {
  const ext = mimeType.includes("pdf")
    ? "pdf"
    : mimeType.includes("png")
      ? "png"
      : "jpg";
  const timestamp = Date.now();
  return `${userId}/${docType}_${timestamp}.${ext}`;
}

// ============================================================================
// DEBUG
// ============================================================================

/**
 * Comprehensive diagnostic for Supabase Storage connectivity.
 * Tests: auth session → bucket list → signed URL → tiny upload.
 * Call once on mount to verify everything works e2e.
 */
export async function debugStorageConnectivity(): Promise<boolean> {
  console.log("========== STORAGE DEBUG START ==========");
  console.log("[Debug] Platform:", Platform.OS);
  console.log("[Debug] Supabase URL:", supabaseUrl);
  console.log("[Debug] Bucket:", KYC_BUCKET);

  // ---- Test 1: Auth session -------------------------------------------
  const {
    data: { session },
    error: sessionErr,
  } = await supabase.auth.getSession();

  if (sessionErr) {
    console.error("[Debug] Session error:", sessionErr.message);
  }
  if (!session) {
    console.error(
      "[Debug] ❌ Session is NULL — upload will fail for private buckets",
    );
  } else {
    console.log("[Debug] ✅ Session OK, user:", session.user.id);
    console.log("[Debug] Access token length:", session.access_token.length);
  }

  // ---- Test 2: Bucket list -------------------------------------------
  try {
    const { data, error } = await supabase.storage
      .from(KYC_BUCKET)
      .list("", { limit: 1 });

    if (error) {
      console.error("[Debug] ❌ Bucket list FAILED:", error.message);
      console.error("[Debug] Full error:", JSON.stringify(error));
    } else {
      console.log("[Debug] ✅ Bucket list OK, items:", data?.length ?? 0);
    }
  } catch (e: any) {
    console.error("[Debug] ❌ Bucket list NETWORK error:", e.message);
  }

  // ---- Test 3: Signed URL (tests server reachability) -----------------
  try {
    const { data, error } = await supabase.storage
      .from(KYC_BUCKET)
      .createSignedUrl("test/does-not-exist.jpg", 60);

    if (error) {
      // "Object not found" = good (network works, bucket reachable)
      // "Unauthorized" / 403 = policy issue
      // "Network request failed" = config/network broken
      const msg = error.message || "";
      if (msg.toLowerCase().includes("not found") || msg.includes("404")) {
        console.log(
          "[Debug] ✅ Signed URL test → Object not found (NETWORK OK)",
        );
      } else {
        console.error("[Debug] ❌ Signed URL test FAILED:", msg);
      }
    } else {
      console.log(
        "[Debug] ✅ Signed URL test OK:",
        data?.signedUrl?.substring(0, 80),
      );
    }
  } catch (e: any) {
    console.error("[Debug] ❌ Signed URL NETWORK error:", e.message);
  }

  // ---- Test 4: Tiny upload test (1x1 pixel JPEG) ----------------------
  try {
    // Minimal valid JPEG (1x1 red pixel, ~107 bytes)
    const tinyJpegBase64 =
      "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoH" +
      "BwYIDAoMCwsKCwsKDA0QDw4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/2wBDAQME" +
      "BAUEBQkFBQkUDQsNFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQU" +
      "FBQUFBQUFBQUFBT/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAA" +
      "AAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEG" +
      "E1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RF" +
      "RkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKj" +
      "pKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP0" +
      "9fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgEC" +
      "BAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLR" +
      "ChYkNOEl8RcYI4Q/RFhHRUYnJCgqNjc4OTpDREVGR0hJSlNUVVZXWFlaY2RlZmdo" +
      "aWpzdHV2d3h5eoKDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLD" +
      "xMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/9oADAMBAAIRAxEA" +
      "PwD9U6KKKAPz/9k=";

    const buf = decode(tinyJpegBase64);
    const testPath = `debug/test_${Date.now()}.jpg`;

    const { data, error } = await supabase.storage
      .from(KYC_BUCKET)
      .upload(testPath, buf, { contentType: "image/jpeg", upsert: true });

    if (error) {
      console.error("[Debug] ❌ Test upload FAILED:", error.message);
      console.error("[Debug] Full error:", JSON.stringify(error));
    } else {
      console.log("[Debug] ✅ Test upload OK:", data?.path);
      // Clean up test file
      await supabase.storage.from(KYC_BUCKET).remove([testPath]);
      console.log("[Debug] Cleaned up test file");
    }
  } catch (e: any) {
    console.error("[Debug] ❌ Test upload NETWORK error:", e.message);
  }

  console.log("========== STORAGE DEBUG END ==========");
  return true;
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Uploads a file to the KYC documents bucket.
 *
 * Reads the local file as base64 via expo-file-system, decodes it to an
 * ArrayBuffer, then uploads to Supabase Storage.
 *
 * @param uri       - Local file URI (file:// or content://)
 * @param userId    - Courier's user id (used as folder prefix)
 * @param docType   - Document type key, e.g. "id_front"
 * @param mimeType  - MIME type string, e.g. "image/jpeg"
 * @returns         - { url, path } where url is the public URL
 * @throws          - Error on upload failure
 */
export async function uploadKYCDocument(
  uri: string,
  userId: string,
  docType: string,
  mimeType: string = "image/jpeg",
): Promise<UploadResult> {
  console.log(`[Storage] Starting upload for ${docType}`, { uri, mimeType });

  // ---- Step 1: Read the file as base64 --------------------------------
  let arrayBuffer: ArrayBuffer;

  try {
    // Primary: use legacy FileSystem API (expo-file-system/legacy)
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    console.log(
      `[Storage] Read file OK (legacy API), base64 length: ${base64.length} chars`,
    );
    arrayBuffer = decode(base64);
  } catch (legacyErr: any) {
    console.warn(
      `[Storage] Legacy readAsStringAsync failed: ${legacyErr.message}`,
    );
    console.log(`[Storage] Trying fetch→blob fallback...`);

    // Fallback: fetch → arrayBuffer (works on some RN setups)
    try {
      const response = await fetch(uri);
      const blob = await response.blob();

      // Convert blob to ArrayBuffer via FileReader-like approach
      arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = () => reject(new Error("FileReader failed"));
        reader.readAsArrayBuffer(blob);
      });
      console.log(
        `[Storage] Fetch→blob OK, size: ${arrayBuffer.byteLength} bytes`,
      );
    } catch (fetchErr: any) {
      console.error(`[Storage] Both read methods failed for ${uri}`);
      console.error(`[Storage] Legacy error: ${legacyErr.message}`);
      console.error(`[Storage] Fetch error: ${fetchErr.message}`);
      throw new Error(
        `Файл уншихад алдаа гарлаа (${docType}). Дахин сонгоно уу.`,
      );
    }
  }

  console.log(`[Storage] ArrayBuffer size: ${arrayBuffer.byteLength} bytes`);

  // ---- Step 2: Upload to Supabase Storage -----------------------------
  const storagePath = buildStoragePath(userId, docType, mimeType);
  console.log(`[Storage] Uploading to: ${KYC_BUCKET}/${storagePath}`);

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from(KYC_BUCKET)
    .upload(storagePath, arrayBuffer, {
      contentType: mimeType,
      upsert: true,
    });

  if (uploadError) {
    console.error(`[Storage] Upload failed for ${docType}:`, uploadError);
    console.error(`[Storage] Error details:`, JSON.stringify(uploadError));
    throw new Error(
      `Файл байршуулахад алдаа гарлаа (${docType}): ${uploadError.message}`,
    );
  }

  console.log(`[Storage] Upload success:`, uploadData?.path);

  // ---- Step 4: Get public URL -----------------------------------------
  const {
    data: { publicUrl },
  } = supabase.storage.from(KYC_BUCKET).getPublicUrl(storagePath);

  console.log(`[Storage] Public URL: ${publicUrl}`);
  return { url: publicUrl, path: storagePath };
}

/**
 * Deletes a previously uploaded KYC document.
 */
export async function deleteKYCDocument(storagePath: string): Promise<void> {
  const { error } = await supabase.storage
    .from(KYC_BUCKET)
    .remove([storagePath]);

  if (error) {
    console.warn("[Storage] Delete failed:", error.message);
  }
}
