/** Curated public messages; never send raw provider errors to the browser. */
export function registrationErrorMessage(error: {
  code?: string;
  status?: number;
}) {
  switch (error.code) {
    case "over_email_send_rate_limit":
      return "Too many confirmation emails have been requested. Please wait before trying again. Deleting an account does not reset the email limit.";
    case "over_request_rate_limit":
      return "Too many registration attempts. Please wait before trying again.";
    case "email_address_not_authorized":
      return "The current email service cannot send confirmation to this address. Contact the platform administrator to configure an email provider.";
    case "signup_disabled":
    case "email_provider_disabled":
      return "Email registration is currently disabled. Contact the platform administrator.";
    case "weak_password":
      return "Your password does not meet the security requirements. Choose a longer password with a mix of letters, numbers and symbols.";
    case "captcha_failed":
      return "The security check could not be completed. Please try again or contact support.";
    default:
      return error.status === 429
        ? "Too many registration attempts. Please wait before trying again."
        : "Unable to register. Please try again.";
  }
}
