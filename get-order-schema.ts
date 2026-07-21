import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });

async function run() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  const { data, error } = await supabase.from("orders").select("*").limit(1);
  console.log("Error:", error);
  if (data && data.length > 0) {
    console.log("Columns:", Object.keys(data[0]));
  }
}
run();
