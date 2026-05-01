"use server";

import { sql } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function addAirport(formData) {
  const name = formData.get("name")?.toString().trim();
  const city = formData.get("city")?.toString().trim();
  if (!name || !city) return { error: "Both fields required." };

  await sql`INSERT INTO airports (name, city) VALUES (${name}, ${city})`;
  revalidatePath("/");  // refresh cached page data
  return { success: true };
}