require("dotenv").config({ path: ".env.local" });
const postgres = require("postgres");
const sql = postgres(process.env.DATABASE_URL, { prepare: false });

(async () => {
  try {
    console.log("=== Semua user yang ada ===");
    const users = await sql`select id, email, role, created_at from "user" order by created_at`;
    users.forEach(u => console.log(`  ${u.email} | role=${u.role} | created=${u.created_at}`));

    console.log("\n=== Riwayat session/login (siapa & kapan login) ===");
    const sessions = await sql`select s.id, s.user_id, u.email, s.ip_address, s.user_agent, s.created_at, s.expires_at
      from session s join "user" u on u.id = s.user_id order by s.created_at desc limit 20`;
    sessions.forEach(s => console.log(`  ${s.email} | ip=${s.ip_address || '-'} | created=${s.created_at} | ua=${(s.user_agent||'').slice(0,50)}`));
    console.log(`\nTotal sesi tercatat: ${sessions.length}`);
  } catch (e) {
    console.error("ERR", e.message);
    process.exitCode = 1;
  } finally {
    await sql.end();
  }
})();
