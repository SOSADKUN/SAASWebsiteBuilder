export const legalPages = {
  terms: {
    title: "Terms of Service",
    intro:
      "Draft structure for use of the SERVQOO workspace. This is not a claim of legal review or a finalized paid contract.",
    sections: [
      [
        "Service operator and effective date",
        "[REQUIRED: legal entity name, registration details if applicable, business address, jurisdiction, legal contact and effective date.] These details have not been confirmed.",
      ],
      [
        "Accounts and company access",
        "SERVQOO currently supports company workspaces with merchant membership and role checks. Keep sign-in details secure and use only company data you are authorized to manage. Employee invitations and company switching are not implemented.",
      ],
      [
        "Free and optional services",
        "Free Core includes one multi-page public website, basic catalog and quota-limited media. Optional implemented services follow the original company trial or verified company service entitlements. Coming Soon features are unavailable. Premium website designs have separate ownership rules.",
      ],
      [
        "Acceptable use and content",
        "[REVIEW REQUIRED: permitted use, prohibited content/activity, intellectual property, uploaded-content permissions, fair-use limits, abuse handling and suspension/appeal process.] Do not upload content you lack permission to use.",
      ],
      [
        "Availability, liability and disputes",
        "[REVIEW REQUIRED: service availability commitments, warranties, liability limits, governing law, dispute procedure, change notices and termination rights.] No guaranteed uptime, 24/7 support or custom development is offered by the current preview.",
      ],
    ],
  },
  privacy: {
    title: "Privacy Notice",
    intro:
      "Editable draft describing the current product and unresolved privacy details. Human/legal review is required before launch claims or paid contracts.",
    sections: [
      [
        "Who handles personal data",
        "[REQUIRED: data controller/operator identity, address, privacy contact, effective date and applicable jurisdiction.] No legal registration or reviewed compliance status is asserted.",
      ],
      [
        "Information used by the product",
        "The current application handles sign-in information through Supabase Auth, company profiles/memberships, uploaded website images, website content and POS order records/notes. Diagnostic logs use safe references and timing/error codes. Do not put sensitive customer records in public website images or order notes.",
      ],
      [
        "Hosting and public content",
        "The application uses Vercel hosting and Supabase Auth, PostgreSQL and Storage. Published websites and marketing images in the public media bucket can be read publicly. [CONFIRM: processing locations, subprocessors, contractual terms and cross-border arrangements for the actual deployment.]",
      ],
      [
        "Cookies and external channels",
        "Authentication uses necessary session cookies. No marketing analytics or advertising pixel was added in Phase C. Email and WhatsApp links, when configured, open external channels with their own handling. No public contact-form delivery integration is active. Existing verification and recovery emails use configured Supabase Auth settings.",
      ],
      [
        "Retention, deletion and requests",
        "Expiry does not automatically delete company data. Authorized users can export saved records and media URLs. [REQUIRED: final retention periods, account deletion procedure, backup deletion timing, rights/request verification, response process and privacy contact.] No indefinite-retention or legal-response-time promise is made.",
      ],
    ],
  },
  subscription: {
    title: "Subscription Terms",
    intro:
      "Proposed service terms for review. No payment, paid subscription or automatic renewal can be created from the public preview.",
    sections: [
      [
        "Company-level scope",
        "A service entitlement belongs to one company (merchant_id), shared only with authorized members under their roles. Proposed prices are in MYR per service/month/company. Orders includes order tracking plus kitchen queue and requires POS; POS + Orders totals the two centralized service prices, not three charges.",
      ],
      [
        "Trial and Free Core",
        "The original first 14 days authorize eligible implemented services without a card. Changing services does not restart the trial. Free Core remains available afterwards, including one website property with multiple pages. Coming Soon services cannot be enabled.",
      ],
      [
        "Exact service period",
        "Proposed: one calendar month from verified activation, ending at the same UTC time on the corresponding date in the following month, clamped to that month's final day if needed. Before any future purchase, show exact start/end timestamps and maintenance scope. No period or verified entitlement is created by this preview.",
      ],
      [
        "Maintenance and support",
        "Proposed active-period scope: the implemented hosted service, generally released maintenance/security updates and general issue reporting through configured channels. No custom work, hardware integration, 24/7 coverage, guaranteed response time or uptime commitment is included. Final obligations must be reviewed before paid launch.",
      ],
      [
        "Renewal and unresolved commercial terms",
        "Manual renewal is proposed; no recurring charge is enabled. [CONFIRM: seller identity, final price, taxes/invoice handling, activation latency, renewal extension timing, suspension notices and dispute handling.] No payment gateway, customer billing portal or refund processor is connected.",
      ],
    ],
  },
  cancellation: {
    title: "Cancellation & Refund Policy",
    intro:
      "Draft only. Payments are disabled; no money is collected and no refund can be processed here.",
    sections: [
      [
        "Cancellation and service configuration",
        "Proposed: stop future manual renewal rather than an automatic charge. Switching a service off is a configuration action, not a refund or deletion request. Resolve active tickets/unacknowledged cancellations before disabling operational services.",
      ],
      [
        "Remaining access and data",
        "Existing paid-period handling on cancellation must be finalized before launch. Free Core, existing saved data and authorized export remain available after normal trial/service expiry. New paid-service operations require active authorization; existing tickets can be safely completed under the current rules.",
      ],
      [
        "Refund eligibility and process",
        "[REQUIRED: applicable customer rights, eligibility, request window, evidence, exceptions, request channel, decision process and timing.] No blanket no-refund rule, automatic refund support or legally reviewed policy is claimed.",
      ],
      [
        "Responsible business contact",
        "[REQUIRED: confirmed operator and complaint/refund contact.] Public contact methods appear only when configured. Resolve this document with human/legal review before accepting payment.",
      ],
    ],
  },
  discontinuation: {
    title: "Service Discontinuation Policy",
    intro:
      "Draft structure for planned service closure or material feature retirement. Notice periods and operational commitments are not finalized.",
    sections: [
      [
        "Notice and communication",
        "[REQUIRED: notice period, communication channels, emergency/security exceptions and responsible operator.] Do not promise a notice duration until the business has confirmed it can be delivered.",
      ],
      [
        "Data access and export",
        "Plan a clearly communicated export window for saved company records and instructions for separately downloading original images. Existing JSON export contains media URLs, not image binaries. [CONFIRM: migration assistance scope, website availability, end-of-access date and backup/deletion timetable.]",
      ],
      [
        "Unfinished work and prepaid periods",
        "[REQUIRED: treatment of active tickets, remaining paid periods, any credit/refund eligibility and support during wind-down.] No automated credit or refund mechanism is currently implemented.",
      ],
      [
        "Final review",
        "This policy, operator identity and related subscription/privacy terms need human/legal approval before paid launch. A public preview is not evidence that these closure procedures or payment systems are already operational.",
      ],
    ],
  },
} as const;
export type LegalKey = keyof typeof legalPages;
