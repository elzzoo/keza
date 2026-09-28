import { Resend } from "resend";
import { EMAIL_DOMAIN } from "@/lib/brand";
import { SITE_URL } from "@/lib/siteConfig";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendTrialReminderEmail(email: string): Promise<void> {
  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || `noreply@${EMAIL_DOMAIN}`,
    to: email,
    subject: "Votre essai gratuit Xalifly Pro expire demain",
    html: `
      <p>Bonjour,</p>
      <p>Votre essai gratuit de 7 jours à Xalifly Pro expire <strong>demain</strong>.</p>
      <p>Après l'expiration, vous perdrez l'accès à :</p>
      <ul>
        <li>Historique des prix sur 6 mois</li>
        <li>Alertes multi-passagers</li>
        <li>Alertes illimitées</li>
      </ul>
      <p><a href="${SITE_URL}/pro">Passer à Xalifly Pro</a> maintenant pour continuer.</p>
    `,
  });
}
