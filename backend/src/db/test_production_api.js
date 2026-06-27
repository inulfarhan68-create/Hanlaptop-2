async function test() {
  console.log("Menghubungi API Produksi...");
  try {
    const res = await fetch("https://hanlaptop.vercel.app/api/inventory");
    console.log(`Status Code: ${res.status}`);
    const text = await res.text();
    console.log("Response Preview:");
    console.log(text.substring(0, 500));
  } catch (err) {
    console.error("Gagal menghubungi API:", err);
  }
}

test();
