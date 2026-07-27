import { insertCheckoutOrder } from "../lib/db/orders";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function main() {
  try {
    const result = await insertCheckoutOrder({
      userId: null,
      lines: [
        {
          slug: "chocolate-chip-cookies",
          name: "Chocolate Chip Cookies",
          unitPrice: 100,
          quantity: 2,
          finalUnitPrice: 100,
        }
      ],
      subtotalEgp: 200,
      deliveryFeeEgp: 50,
      totalEgp: 250,
      paymentMethod: "card",
      paymentStatus: "unpaid",
      shippingAddress: {
        name: "Test User",
        phone: "01000000000",
        address: "Test St",
        city: "Test City"
      },
      notes: "Test order",
    });
    console.log("Success:", result);
  } catch (err) {
    console.error("Failed:", err);
  }
}

main();
