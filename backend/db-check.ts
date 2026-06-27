import { db } from "./src/db";
import { user } from "./src/db/schema";

async function check() {
    const users = await db.select().from(user);
    console.log(users);
}
check();
