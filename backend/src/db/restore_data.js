const { createClient } = require('@libsql/client');
const path = require('path');
const dotenv = require('dotenv');

const envPath = path.join(__dirname, '../../../backend/.env');
dotenv.config({ path: envPath });

const url = process.env.DATABASE_URL;
const authToken = process.env.DATABASE_AUTH_TOKEN;

const client = createClient({ url, authToken });

// Definisikan data pemulihan yang tepat untuk 7 item terdampak
const restoreData = [
  {
    id: '9330db9f-8399-44d2-89d5-e8e4502b8842',
    name: 'ASUS VivoBook 14 X1404FA',
    quantity: 2,
    costPrice: 4000000,
    sellingPrice: 5500000
  },
  {
    id: 'daf2ca14-565e-42eb-af93-b22caaa59097',
    name: 'Keyboard ASUS VivoBook 15 X509/X515',
    quantity: 3,
    costPrice: 200000,
    sellingPrice: 350000
  },
  {
    id: '8bc738b0-481c-4b0a-b0f7-1a92e0959277',
    name: 'RAM DDR4 8GB 3200MHz SODIMM',
    quantity: 6,
    costPrice: 300000,
    sellingPrice: 400000
  },
  {
    id: '2d526a50-803d-445e-ac02-1a555b6b4bc9',
    name: 'MSI Modern 14 C12MO',
    quantity: 4,
    costPrice: 3500000,
    sellingPrice: 4800000
  },
  {
    id: '0a8ca82b-f221-4422-839c-cdb4acc1c06d',
    name: 'Dell Latitude 5420',
    quantity: 3,
    costPrice: 3000000,
    sellingPrice: 4200000
  },
  {
    id: '35e500bf-51eb-4f8b-a398-c83c234b4b21',
    name: 'Dell Latitude 3540',
    quantity: 6,
    costPrice: 3000000,
    sellingPrice: 4000000
  },
  {
    id: 'd835b13c-512c-496a-991e-1de260ed2131',
    name: 'HP ProBook 440 G8',
    quantity: 3,
    costPrice: 3000000,
    sellingPrice: 4200000
  }
];

async function run() {
  console.log("Memulai pemulihan stok dan harga inventori di database Turso...");
  
  for (const item of restoreData) {
    console.log(`Mengembalikan data untuk: ${item.name}...`);
    
    const res = await client.execute({
      sql: `
        UPDATE inventory 
        SET quantity = ?, cost_price = ?, selling_price = ? 
        WHERE id = ?;
      `,
      args: [item.quantity, item.costPrice, item.sellingPrice, item.id]
    });
    
    console.log(`  -> Sukses! Baris terdampak: ${res.rowsAffected}`);
  }
  
  console.log("Semua data berhasil dipulihkan ke nilai aslinya!");
}

run().catch(console.error);
