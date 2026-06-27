import { spawn } from 'child_process';

function addEnv(name, value, env) {
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
        const url = "libsql://hanlatopbase11v2-farhan11.aws-ap-northeast-1.turso.io";
        const token = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODE0MTEwMjYsImlkIjoiMDE5ZWM0NWUtYTAwMS03Y2I2LWFhOWUtYTI5YTMzMzkzYjg1IiwicmlkIjoiOTA1NDgyNzMtMGRhNy00MTdkLThmNmItOTMwOGRhYzc2M2Q0In0.YMhp7o1arFIALSGlLTklUb5mpLeA0Oxhp3Vtsv3Ty1vW2DIV6hkLzT45-Pe1yJpHmo5BqAU68-piDboDmQ6vCQ";
        
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
            await addEnv("BETTER_AUTH_SECRET", "j2D8kLpQ9vX4mY7zW3aR6bN5tH1cC0eF2gU8jV4wS7mX9qR1", env);

            console.log(`Adding BETTER_AUTH_URL to ${env}...`);
            await addEnv("BETTER_AUTH_URL", "https://hanlaptop.vercel.app", env);
        }
        
        console.log("Done.");
    } catch(e) {
        console.error(e);
    }
}

main();
