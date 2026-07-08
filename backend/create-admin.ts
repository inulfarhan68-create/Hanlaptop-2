import * as path from "path";
import * as dotenv from "dotenv";

// Explicitly load .env from the backend directory to support running from either project root or backend folder
const envPath = path.join(__dirname, ".env");
dotenv.config({ path: envPath });

async function main() {
    const adminEmail = process.env.ADMIN_DEFAULT_EMAIL || "admin@hanlaptop.com";
    const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD;

    if (!adminPassword) {
        if (process.env.NODE_ENV === "production") {
            console.error("FATAL ERROR: ADMIN_DEFAULT_PASSWORD is required in production environment!");
            process.exit(1);
        }
        console.warn("⚠️  [WARNING] ADMIN_DEFAULT_PASSWORD is not set. Using fallback temporary password 'password123' for development.");
    }

    const passwordToUse = adminPassword || "password123";

    console.log(`Attempting to create admin user: ${adminEmail}`);

    const { auth } = await import("./src/lib/auth");
    try {
        const result = await auth.api.signUpEmail({
            body: {
                email: adminEmail,
                password: passwordToUse,
                name: "Administrator",
                role: "owner"
            }
        });
        console.log("Admin created successfully:", result);
    } catch (e: any) {
        console.error("Failed to create admin:", e?.message || e);
    }
}

main();
