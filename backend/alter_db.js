import { createClient } from "@libsql/client";

const client = createClient({
  url: "libsql://hanlatopbase11v2-farhan11.aws-ap-northeast-1.turso.io",
  authToken: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODE0MTEwMjYsImlkIjoiMDE5ZWM0NWUtYTAwMS03Y2I2LWFhOWUtYTI5YTMzMzkzYjg1IiwicmlkIjoiOTA1NDgyNzMtMGRhNy00MTdkLThmNmItOTMwOGRhYzc2M2Q0In0.YMhp7o1arFIALSGlLTklUb5mpLeA0Oxhp3Vtsv3Ty1vW2DIV6hkLzT45-Pe1yJpHmo5BqAU68-piDboDmQ6vCQ",
});

async function main() {
  try {
    await client.execute("ALTER TABLE service_orders ADD COLUMN customer_address TEXT;");
    console.log("Column customer_address added successfully.");
  } catch (error) {
    console.error("Error or already exists:", error.message);
  }
}

main();
