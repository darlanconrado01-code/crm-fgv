
import { initializeApp, getApp, getApps } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { S3Client, PutBucketCorsCommand } from "@aws-sdk/client-s3";

const firebaseConfig = {
    apiKey: "AIzaSyC8Bswi9age_G9Lktb82QwA0QtixOdaEsc",
    authDomain: "crm-fgv-3868c.firebaseapp.com",
    projectId: "crm-fgv-3868c",
    storageBucket: "crm-fgv-3868c.firebasestorage.app",
    messagingSenderId: "501480125467",
    appId: "1:501480125467:web:dd834ac8eb8ad40a4a34be"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export default async function handler(req, res) {
    try {
        const settingsSnap = await getDoc(doc(db, "settings", "evolution"));
        if (!settingsSnap.exists()) {
            return res.status(404).json({ error: "Settings not found" });
        }
        const settings = settingsSnap.data();

        if (!settings.r2Bucket) {
            return res.status(400).json({ error: "R2 not configured" });
        }

        const r2Client = new S3Client({
            region: "auto",
            endpoint: `https://${settings.r2AccountId.trim()}.r2.cloudflarestorage.com`,
            credentials: {
                accessKeyId: settings.r2AccessKeyId.trim(),
                secretAccessKey: settings.r2SecretAccessKey.trim(),
            },
        });

        const command = new PutBucketCorsCommand({
            Bucket: settings.r2Bucket.trim(),
            CORSConfiguration: {
                CORSRules: [
                    {
                        AllowedHeaders: ["*"],
                        AllowedMethods: ["GET", "PUT", "POST", "HEAD", "DELETE"],
                        AllowedOrigins: ["*"],
                        ExposeHeaders: ["ETag"],
                        MaxAgeSeconds: 3000
                    }
                ]
            }
        });

        await r2Client.send(command);

        return res.status(200).json({ status: "CORS Fixed!", message: "Bucket properly configured to accept requests from all origins." });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: error.message });
    }
}
