const postgres = require('postgres');
const sql = postgres('postgresql://postgres.ngdegapuwotvketfviyo:O4VuUsZkMUTkY5LR@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres');

async function main() {
    try {
        // 1. Check all journal entries for July grouped by account_name
        const julJournals = await sql`
            SELECT account_name, sum(credit) as total_credit, sum(debit) as total_debit,
                   sum(credit) - sum(debit) as net
            FROM journal_entries 
            WHERE created_at >= '2026-07-01'
            GROUP BY account_name
            ORDER BY account_name
        `;
        console.log("=== July Journal Entries by Account ===");
        julJournals.forEach(j => {
            console.log(`  ${j.account_name}: Credit=${j.total_credit}, Debit=${j.total_debit}, Net=${j.net}`);
        });

        // 2. Check which accounts match "Pendapatan" or "Penjualan" (the new fix)
        console.log("\n=== Accounts matching new fix (includes 'Pendapatan' OR 'Penjualan') ===");
        julJournals.forEach(j => {
            if (j.account_name.includes("Pendapatan") || j.account_name.includes("Penjualan")) {
                const isService = j.account_name === "Pendapatan Servis" || j.account_name.includes("Servis") || j.account_name.includes("Service");
                console.log(`  ${j.account_name}: Net=${j.net} -> ${isService ? "SERVICE" : "SALES"}`);
            }
        });

        // 3. Calculate what the chart values should be
        let sales = 0;
        let service = 0;
        julJournals.forEach(j => {
            if (j.account_name.includes("Pendapatan") || j.account_name.includes("Penjualan")) {
                const isService = j.account_name === "Pendapatan Servis" || j.account_name.includes("Servis") || j.account_name.includes("Service");
                if (isService) {
                    service += parseFloat(j.net);
                } else {
                    sales += parseFloat(j.net);
                }
            }
        });

        // 4. Get aksesoris from transaction_items
        const aksRes = await sql`
            SELECT COALESCE(SUM(ti.quantity * ti.unit_price), 0) as aksesoris_sales
            FROM transaction_items ti
            JOIN transactions t ON ti.transaction_id = t.id
            JOIN inventory i ON ti.inventory_id = i.id
            WHERE t.transaction_type = 'Penjualan'
              AND i.category = 'Aksesoris'
              AND t.transaction_date >= '2026-07-01'
        `;
        const aksesoris = parseFloat(aksRes[0].aksesoris_sales);

        console.log(`\n=== Chart Calculation ===`);
        console.log(`Sales (from journals): ${sales}`);
        console.log(`Service (from journals): ${service}`);
        console.log(`Aksesoris (from tx items): ${aksesoris}`);
        console.log(`\nChart values (divided by 1000):`);
        console.log(`  sales = Math.round((${sales} - ${aksesoris}) / 1000) = ${Math.round((sales - aksesoris) / 1000)}k`);
        console.log(`  service = Math.round(${service} / 1000) = ${Math.round(service / 1000)}k`);
        console.log(`  aksesoris = Math.round(${aksesoris} / 1000) = ${Math.round(aksesoris / 1000)}k`);
        console.log(`  totalRevenue = Math.round((${sales} + ${service}) / 1000) = ${Math.round((sales + service) / 1000)}k`);

    } catch (e) { console.error(e); } finally {
        await sql.end();
    }
}
main();
