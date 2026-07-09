import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read and parse backend/.env manually to avoid root npm dependencies
const envVars = {};
try {
    const envPath = path.join(__dirname, 'backend', '.env');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        envContent.split(/\r?\n/).forEach(line => {
            const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
            if (match) {
                let key = match[1];
                let value = match[2] || '';
                if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
                if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
                envVars[key] = value;
            }
        });
    }
} catch (err) {
    console.error("Failed to read backend/.env manually:", err);
}

function addEnv(name, value, env) {
    if (!value) {
        console.warn(`[Warning] No value found for ${name}, skipping.`);
        return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
        const proc = spawn('npx.cmd', ['vercel', 'env', 'add', name, env], { shell: true });
        
        proc.stdout.on('data', data => console.log(data.toString()));
        proc.stderr.on('data', data => console.error(data.toString()));
        
        proc.on('close', code => {
            if (code === 0) resolve();
            else reject(`Exited with ${code}`);
        });

        // Write the value to stdin
        proc.stdin.write(value + '\n');
        proc.stdin.end();
    });
}

function rmEnv(name, env) {
    return new Promise((resolve) => {
        const proc = spawn('npx.cmd', ['vercel', 'env', 'rm', name, env, '-y'], { shell: true });
        proc.on('close', () => resolve());
    });
}

async function main() {
    try {
        const url = envVars.DATABASE_URL || "libsql://hanlatopbase11v2-farhan11.aws-ap-northeast-1.turso.io";
        const token = envVars.DATABASE_AUTH_TOKEN;
        const betterAuthSecret = envVars.BETTER_AUTH_SECRET || "j2D8kLpQ9vX4mY7zW3aR6bN5tH1cC0eF2gU8jV4wS7mX9qR1";
        const betterAuthUrl = envVars.BETTER_AUTH_URL || "https://hanlaptop.vercel.app";

        if (!token) {
            console.error("FATAL ERROR: DATABASE_AUTH_TOKEN not found in backend/.env!");
            process.exit(1);
        }
        
        for (const env of ["production", "preview", "development"]) {
            console.log(`Removing existing variables for ${env}...`);
            await rmEnv("DATABASE_URL", env);
            await rmEnv("DATABASE_AUTH_TOKEN", env);
            await rmEnv("BETTER_AUTH_SECRET", env);
            await rmEnv("BETTER_AUTH_URL", env);

            console.log(`Adding DATABASE_URL to ${env}...`);
            await addEnv("DATABASE_URL", url, env);
            
            console.log(`Adding DATABASE_AUTH_TOKEN to ${env}...`);
            await addEnv("DATABASE_AUTH_TOKEN", token, env);

            console.log(`Adding BETTER_AUTH_SECRET to ${env}...`);
            await addEnv("BETTER_AUTH_SECRET", betterAuthSecret, env);

            console.log(`Adding BETTER_AUTH_URL to ${env}...`);
            await addEnv("BETTER_AUTH_URL", betterAuthUrl, env);
        }
        
        console.log("Done.");
    } catch(e) {
        console.error(e);
    }
}

main();
