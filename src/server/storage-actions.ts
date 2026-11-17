"use server";
import { z } from "zod";
import { authorize } from "@/lib/auth";
import { storageSnapshot } from "./storage-service";
export async function companyStorage(merchantId: string) {
  await authorize(z.uuid().parse(merchantId), "media:view");
  return storageSnapshot(merchantId);
}
