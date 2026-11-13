"use server";
import { unstable_rethrow } from "next/navigation";
import { z } from "zod";
import { workspaceTrace } from "@/lib/workspace-diagnostics";
import { workspaceErrorCode } from "@/lib/workspace-errors";
import {
  OrderError,
  type CreateOrderInput,
  type orderChangeSchema,
} from "@/lib/order-policy";
import {
  createPosOrder,
  changePosOrder,
  acknowledgePosCancellation,
} from "./order-service";
type Result =
  | { ok: true; orderId: string; number: number }
  | { ok: false; error: string; code: string; reference: string };
async function execute(
  operation: string,
  run: () => Promise<{ orderId: string; number: number }>,
): Promise<Result> {
  const trace = workspaceTrace(operation);
  try {
    return { ok: true, ...(await trace.step("transaction", run)) };
  } catch (error) {
    unstable_rethrow(error);
    let message =
      "We could not confirm the order update. Refresh to check its current status before trying again.";
    let code = workspaceErrorCode(error);
    if (error instanceof OrderError) {
      message = error.message;
      code = error.code;
    } else if (error instanceof z.ZodError) {
      message = "Check the bill, quantities, table and notes, then try again.";
      code = "VALIDATION";
    } else if (["42P01", "42703"].includes(code)) {
      message =
        "POS setup is pending. The administrator needs to apply the orders database migration.";
      code = "SETUP_PENDING";
    } else if (
      error instanceof Error &&
      ["Business access denied", "Workspace permission required"].includes(
        error.message,
      )
    ) {
      message =
        "You do not have permission to manage orders for this business.";
      code = "FORBIDDEN";
    } else if (
      error instanceof Error &&
      error.message.startsWith("Subscription required:")
    ) {
      message =
        "Your trial has ended. Open Subscription & Billing to continue taking orders. Existing tickets remain visible.";
      code = "SUBSCRIPTION";
    }
    return { ok: false, error: message, code, reference: trace.reference };
  }
}
export async function placeOrder(merchantId: string, input: CreateOrderInput) {
  return execute("pos.order.create", () => createPosOrder(merchantId, input));
}
export async function changeOrder(
  merchantId: string,
  input: z.infer<typeof orderChangeSchema>,
) {
  return execute("pos.order.change", () => changePosOrder(merchantId, input));
}
export async function acknowledgeCancellation(
  merchantId: string,
  input: { orderId: string; version: number },
) {
  return execute("pos.order.acknowledge", () =>
    acknowledgePosCancellation(merchantId, input),
  );
}
