import { Mail, MessageCircle } from "lucide-react";
import { publicContacts, publicMetadata } from "@/lib/public-site";
export const metadata = publicMetadata(
  "Contact SERVQOO",
  "Configured contact channels for product questions and support.",
  "/contact",
);
export default function Contact() {
  const contact = publicContacts();
  return (
    <section className="p-section public-page-title public-contact">
      <span className="p-eyebrow">Let&apos;s talk business</span>
      <h1>Contact SERVQOO.</h1>
      <p>
        Questions about the website builder or product pickup workflow? Use an
        available channel below. Do not send passwords, payment details or
        private customer records.
      </p>
      <div className="public-contact-methods">
        {contact.email && (
          <a className="p-button" href={`mailto:${contact.email}`}>
            <Mail size={20} />
            Email SERVQOO
          </a>
        )}
        {contact.whatsapp && (
          <a
            className="p-button"
            href={contact.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageCircle size={20} />
            WhatsApp Business
          </a>
        )}
        {!contact.email && !contact.whatsapp && (
          <div className="p-notice">
            Our public contact channels are being prepared. No contact form is
            available yet. Please check this page again before making a purchase
            decision.
          </div>
        )}
      </div>
      <p className="p-muted">
        General product support only. No 24/7 coverage or guaranteed response
        time is offered. Contact-form delivery and email-provider integration
        are not connected.
      </p>
    </section>
  );
}
