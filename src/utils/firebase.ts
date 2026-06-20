import path from "path";
import { existsSync, readFileSync } from "fs";
import admin from "firebase-admin";

const resolveServiceAccountPath = () => {
  const candidates = [
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH
      ? path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH)
      : "",
    path.resolve(process.cwd(), "src/config/firebase-service-account.json"),
    path.resolve(process.cwd(), "dist/config/firebase-service-account.json"),
    path.join(__dirname, "../config/firebase-service-account.json"),
  ].filter(Boolean);

  return candidates.find((candidate) => existsSync(candidate)) || candidates[0];
};

try {
  if (!admin.apps.length) {
    const serviceAccountPath = resolveServiceAccountPath();

    const serviceAccount = JSON.parse(
      readFileSync(serviceAccountPath, "utf-8")
    );

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    console.log("Firebase Admin initialized successfully");
  }
} catch (error: any) {
  console.warn(
    `[Firebase] Admin initialization skipped: ${error?.message || error}`
  );
}

export default admin;
