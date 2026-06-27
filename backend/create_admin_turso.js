const path = require('path');
const dotenv = require('dotenv');

// Explicitly load .env from the backend directory
const envPath = path.join(__dirname, '.env');
dotenv.config({ path: envPath });

console.log('Using DATABASE_URL:', process.env.DATABASE_URL);

async function main() {
    const { auth } = await import('./src/lib/auth.js');
    try {
        const result = await auth.api.signUpEmail({
            body: {
                email: "admin@hanlaptop.com",
                password: "password123",
                name: "Administrator",
                role: "owner"
            }
        });
        console.log("Admin created successfully on Turso:", result);
    } catch (e) {
        console.error("Failed to create admin on Turso:", e);
    }
}

main();
