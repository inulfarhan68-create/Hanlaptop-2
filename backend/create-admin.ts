import * as dotenv from "dotenv";
dotenv.config({ path: "./backend/.env" });

async function main() {
    const { auth } = await import("./src/lib/auth");
    try {
        const result = await auth.api.signUpEmail({
            body: {
                email: "admin@hanlaptop.com",
                password: "password123",
                name: "Administrator",
                role: "owner"
            }
        });
        console.log("Admin created successfully:", result);
    } catch (e) {
        console.error("Failed to create admin:", e);
    }
}

main();
