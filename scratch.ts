import { db } from "./backend/src/db";
import { transactions } from "./backend/src/db/schema";
try {
  const res = db.transaction((tx) => {
    return tx.select().from(transactions).limit(1).all();
  });
  console.log("Success:", res);
} catch (e) {
  console.error("Error:", e);
}
