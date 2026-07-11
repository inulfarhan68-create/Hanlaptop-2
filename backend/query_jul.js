const postgres = require('postgres');
const sql = postgres('postgresql://postgres.ngdegapuwotvketfviyo:O4VuUsZkMUTkY5LR@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres');
async function main() {
    try {
        const res1 = await sql`SELECT account_name, sum(credit) as credit, sum(debit) as debit FROM journal_entries WHERE created_at >= '2026-07-01' GROUP BY account_name`;
        console.log('Juli Journals:', res1);
    } catch (e) { console.error(e); } finally {
        await sql.end();
    }
}
main();
