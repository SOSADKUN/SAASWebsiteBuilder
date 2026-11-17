import { Mail, MessageCircle, ArrowUpRight } from "lucide-react";

export type SupportContacts = { email: string | null; whatsapp: string | null };

export function ContactServqoo({ contacts }: { contacts: SupportContacts }) {
  return (
    <section className="servqoo-contact-grid" aria-label="Contact options">
      {[
        {
          label: "Email",
          icon: Mail,
          description: "Send us a message using your email app.",
          href: contacts.email ? `mailto:${contacts.email}` : null,
          action: "Send email",
        },
        {
          label: "WhatsApp",
          icon: MessageCircle,
          description: "Start a conversation with SERVQOO on WhatsApp.",
          href: contacts.whatsapp,
          action: "Open WhatsApp",
        },
      ]
        .filter((method) => method.label !== "WhatsApp" || method.href)
        .map(({ label, icon: Icon, description, href, action }) => (
          <article className="panel servqoo-contact-card" key={label}>
            <Icon size={26} aria-hidden="true" />
            <h2>{label}</h2>
            <p>{description}</p>
            {href ? (
              <a
                className="button primary"
                href={href}
                {...(label === "WhatsApp"
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
              >
                {action} <ArrowUpRight size={16} aria-hidden="true" />
              </a>
            ) : (
              <>
                <button className="button" disabled>
                  {action}
                </button>
                <small>Contact details will be available soon.</small>
              </>
            )}
          </article>
        ))}
    </section>
  );
}
