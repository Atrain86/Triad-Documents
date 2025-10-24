import { OAuth2Client } from "google-auth-library";
import dotenv from "dotenv";

dotenv.config();

export async function getGmailClient() {
  try {
    const client = new OAuth2Client(
      process.env.CLIENT_ID,
      process.env.CLIENT_SECRET,
      process.env.REDIRECT_URI
    );

    client.setCredentials({
      refresh_token: process.env.GMAIL_REFRESH_TOKEN,
    });

    return client;
  } catch (err) {
    const error = err as any;
    if (error?.message) {
      console.error("OAuth error message:", error.message);
    }
    if (error?.response?.data) {
      console.error("OAuth error response:", error.response.data);
    }
    if (error?.code) {
      console.error("OAuth error code:", error.code);
    }

    if (error?.message?.includes("invalid_client")) {
      console.error("Invalid client credentials.");
    } else if (error?.message?.includes("access_denied")) {
      console.error("Access denied. Check Google Cloud permissions.");
    } else if (error?.message?.includes("invalid_grant")) {
      console.error("Invalid or expired refresh token.");
    } else {
      console.error("Unknown OAuth error:", error);
    }

    throw error;
  }
}
