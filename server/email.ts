import nodemailer from 'nodemailer';
import fs from 'fs';

// Create reusable transporter object using Gmail
const createTransporter = () => {
  if (!process.env.GMAIL_APP_PASSWORD) {
    throw new Error("GMAIL_APP_PASSWORD environment variable is required");
  }
  
  if (!process.env.GMAIL_EMAIL) {
    throw new Error("GMAIL_EMAIL environment variable is required");
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_EMAIL,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
};

interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    content?: Buffer;
    path?: string;
  }>;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"A-Frame Painting" <${process.env.GMAIL_EMAIL}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
      attachments: options.attachments || [],
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully:", info.response);
    return true;
  } catch (error) {
    console.error("Email sending failed:", error);
    return false;
  }
}

export async function sendInvoiceEmail(
  recipientEmail: string,
  clientName: string,
  invoiceNumber: string,
  pdfBuffer: Buffer
): Promise<boolean> {
  const subject = `Invoice #${invoiceNumber} from A-Frame Painting`;
  
  const text = `Hello ${clientName},

Please find your invoice attached. Thank you for choosing A-Frame Painting for your project!

If you have any questions about this invoice, please don't hesitate to contact us.

Best regards,
A-Frame Painting
cortespainter@gmail.com
Phone: (Your phone number)`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #EA580C;">A-Frame Painting</h2>
      <p>Hello <strong>${clientName}</strong>,</p>
      
      <p>Please find your invoice attached. Thank you for choosing A-Frame Painting for your project!</p>
      
      <p>If you have any questions about this invoice, please don't hesitate to contact us.</p>
      
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
        <p><strong>Best regards,</strong><br>
        A-Frame Painting<br>
        <a href="mailto:cortespainter@gmail.com">cortespainter@gmail.com</a><br>
        884 Hayes Rd, Manson's Landing, BC V0P1K0</p>
      </div>
    </div>
  `;

  return sendEmail({
    to: recipientEmail,
    subject,
    text,
    html,
    attachments: [
      {
        filename: `Invoice-${invoiceNumber}-${clientName.replace(/[^a-zA-Z0-9]/g, '')}.pdf`,
        content: pdfBuffer,
      }
    ]
  });
}