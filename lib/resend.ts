import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendTrialReminderEmail(email: string): Promise<void> {
  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || "noreply@keza.app",
    to: email,
    subject: "Votre essai gratuit KEZA Pro expire demain",
    html: `
      <p>Bonjour,</p>
      <p>Votre essai gratuit de 7 jours à KEZA Pro expire <strong>demain</strong>.</p>
      <p>Après l'expiration, vous perdrez l'accès à :</p>
      <ul>
        <li>Historique des prix sur 6 mois</li>
        <li>Alertes multi-passagers</li>
        <li>Alertes illimitées</li>
      </ul>
      <p><a href="https://keza-taupe.vercel.app/pro">Passer à KEZA Pro</a> maintenant pour continuer.</p>
    `,
  });
}
