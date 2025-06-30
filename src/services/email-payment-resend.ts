import { sendResendEmail } from "./resend";

export async function sendPaymentConfirmation(
  email: string,
  name: string,
  amount: number,
  currency: string,
  transactionId: string,
  type: string
): Promise<boolean> {
  try {
    const html = `<p>Dear ${name},</p>
      <p>Thank you for your ${type || 'donation'} of <b>${currency} ${amount}</b>.</p>
      <p>Your transaction ID is <b>${transactionId}</b>.</p>
      <p>We appreciate your support!</p>`;
    await sendResendEmail({
      to: email,
      subject: "Payment Confirmation - HopeBridge Connect",
      html,
    });
    return true;
  } catch (error) {
    console.error("Error sending payment confirmation email:", error);
    return false;
  }
}
