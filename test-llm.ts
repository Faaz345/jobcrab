import { complete } from "./lib/services/llm-service";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function run() {
  try {
    const res = await complete({
      messages: [{ role: "system", content: "You are a parser. Return JSON." }, { role: "user", content: "{}" }],
      responseFormat: { type: "json_object" }
    });
    console.log("Success:", res);
  } catch (e) {
    console.error("Error:", e);
  }
}
run();
