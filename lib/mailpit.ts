/** Mailpit's own HTTP API origin (see CLAUDE.md) - separate from the app's baseURL. */
const MAILPIT_BASE_URL = process.env.MAILPIT_BASE_URL ?? 'http://localhost:8025';

interface MailpitMessageSummary {
  ID: string;
  To: { Address: string }[];
  Subject: string;
}

interface MailpitMessagesResponse {
  messages: MailpitMessageSummary[];
}

interface MailpitMessageDetail {
  Text: string;
}

/**
 * The 6-digit code from the newest "Login Code" email Mailpit has for `email`, or `undefined` if
 * none is there yet. Requesting a new code deletes whatever was pending before it (see wde's
 * `Otp.create`), so the newest matching message is always the one that matters - callers poll
 * this (e.g. with `expect.poll`) rather than trust the very first read, since Mailpit indexes a
 * message some time after the app hands it to SMTP.
 */
export async function retrieveOtpCode(email: string): Promise<string | undefined> {
  const response = await fetch(`${MAILPIT_BASE_URL}/api/v1/messages`);
  const body = (await response.json()) as MailpitMessagesResponse;
  const matching = body.messages.find(
    (message) =>
      message.To.some((recipient) => recipient.Address === email) &&
      message.Subject.includes('Login Code'),
  );
  if (!matching) return undefined;

  const detailResponse = await fetch(`${MAILPIT_BASE_URL}/api/v1/message/${matching.ID}`);
  const detail = (await detailResponse.json()) as MailpitMessageDetail;
  return /\b(\d{6})\b/.exec(detail.Text)?.[1];
}

/**
 * Whether Mailpit has an order confirmation email for `orderId` addressed to `customerEmail`.
 * `orderConfirmationEmail.js` embeds the order id in the subject (`Order Confirmation (#<id>)`),
 * which is enough to be sure this is the email this specific purchase triggered, not a stray
 * message left over from a concurrently-running worker. Callers poll this (e.g. with
 * `expect.poll`) since Mailpit indexes an SMTP-delivered message some time after the app hands it
 * off, not the instant the success page renders.
 */
export async function hasOrderConfirmationEmail(
  orderId: string,
  customerEmail: string,
): Promise<boolean> {
  const response = await fetch(`${MAILPIT_BASE_URL}/api/v1/messages`);
  const body = (await response.json()) as MailpitMessagesResponse;
  return body.messages.some(
    (message) =>
      message.Subject.includes(orderId) &&
      message.To.some((recipient) => recipient.Address === customerEmail),
  );
}
