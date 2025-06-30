import axios from "axios";

const RESEND_API_KEY = "re_8tso84pS_Ezpb4pbf3kzAL1fbTX1N2Cz9";
const RESEND_API_URL = "https://api.resend.com/v1/emails";

export async function sendResendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  try {
    const response = await axios.post(
      RESEND_API_URL,
      { from: "HopeBridge <noreply@hopebridge.org>", to, subject, html },
      {
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Resend email error:", error.response.data);
    } else {
      console.error("Resend email error:", error.message);
    }
    throw error;
  }
}
