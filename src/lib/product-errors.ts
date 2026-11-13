import { z } from "zod";
import { workspaceErrorCode } from "./workspace-errors";

export function productErrorMessage(error: unknown) {
  if (error instanceof z.ZodError)
    return "Check the product name, price, category and image URL. Image links must use HTTPS or a relative path.";
  const message = error instanceof Error ? error.message : "";
  if (message === "Invalid category")
    return "Choose a category from this business. The selected category may have been removed.";
  if (message === "Product not found")
    return "This product is no longer available. Reload the menu before editing it again.";
  if (
    ["Business access denied", "Workspace permission required"].includes(
      message,
    )
  )
    return "You do not have permission to manage products for this business.";
  if (message.startsWith("Subscription required:"))
    return "Your trial has ended. Open Subscription & Billing to continue editing your menu.";
  if (
    message ===
    "Subscription setup is incomplete. Contact the platform administrator."
  )
    return "Your business subscription needs attention. Contact support with the reference below.";
  const code = workspaceErrorCode(error);
  if (
    [
      "QUERY_TIMEOUT",
      "QUEUE_TIMEOUT",
      "57014",
      "55P03",
      "CANCEL_TIMEOUT",
      "CANCEL_UNANSWERED",
    ].includes(code)
  )
    return "The database did not respond in time. Check your menu before submitting again; the product may already have been saved.";
  if (["42P01", "42703", "42701"].includes(code))
    return "Product saving needs a server update. Contact support with the reference below.";
  if (code === "23503")
    return "The selected category is no longer available. Reload the menu and choose a category again.";
  return "We could not save your product. Check your menu before submitting again. If this continues, contact support with the reference below.";
}
