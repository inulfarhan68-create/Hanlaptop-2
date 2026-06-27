async function test() {
  try {
    const urls = [
      'https://hanlaptop.vercel.app/api/public/catalog/default',
    ];
    for (const url of urls) {
      console.log(`Fetching ${url}...`);
      const res = await fetch(url);
      console.log(`Status: ${res.status}`);
      const text = await res.text();
      console.log(`Response: ${text.substring(0, 500)}`);
      console.log('-------------------');
    }
  } catch (err) {
    console.error('Error:', err);
  }
}
test();
