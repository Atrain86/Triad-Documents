import nodemailer from 'nodemailer';
import fs from 'fs';
import { MailService } from '@sendgrid/mail';

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
    // Add explicit configuration for better reliability
    secure: true,
    port: 465,
    logger: true,
    debug: false
  });
};

// Test Gmail SMTP connection
export async function testEmailConnection(): Promise<boolean> {
  try {
    const transporter = createTransporter();
    console.log("Testing Gmail SMTP connection...");
    await transporter.verify();
    console.log("✅ Gmail SMTP connection verified successfully");
    return true;
  } catch (error) {
    console.error("❌ Gmail SMTP connection failed:", error);
    return false;
  }
}

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

// SendGrid email function
export async function sendEmailWithSendGrid(options: EmailOptions): Promise<boolean> {
  try {
    if (!process.env.SENDGRID_API_KEY) {
      console.log('SendGrid API key not found, falling back to nodemailer');
      return sendEmail(options);
    }

    const mailService = new MailService();
    mailService.setApiKey(process.env.SENDGRID_API_KEY);

    const sendGridOptions = {
      to: options.to,
      from: {
        email: 'cortespainter@gmail.com',
        name: 'A-Frame Painting'
      },
      reply_to: 'cortespainter@gmail.com',
      subject: options.subject,
      text: options.text,
      html: options.html,
      attachments: options.attachments?.filter(att => att.content).map(att => ({
        filename: att.filename,
        content: att.content!.toString('base64'),
        type: 'application/pdf',
        disposition: 'attachment'
      })) || []
    };

    console.log("Sending email via SendGrid:", {
      to: sendGridOptions.to,
      from: sendGridOptions.from,
      subject: sendGridOptions.subject,
      hasHtml: !!sendGridOptions.html,
      hasAttachments: sendGridOptions.attachments.length > 0
    });

    await mailService.send(sendGridOptions);
    console.log("SendGrid email sent successfully");
    return true;
  } catch (error) {
    console.error("SendGrid email failed:", error);
    console.error("SendGrid error details:", {
      message: (error as Error).message,
      code: (error as any).code,
      response: (error as any).response
    });
    console.log("Falling back to nodemailer");
    return sendEmail(options);
  }
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"A-Frame Painting" <${process.env.GMAIL_EMAIL}>`,
      replyTo: process.env.GMAIL_EMAIL,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
      attachments: options.attachments || [],
      // Add headers to improve deliverability
      headers: {
        'X-Mailer': 'A-Frame Painting System',
        'X-Priority': '3',
        'X-MSMail-Priority': 'Normal',
        'Importance': 'Normal'
      }
    };

    console.log("Sending email with options:", {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject,
      hasHtml: !!mailOptions.html,
      hasAttachments: mailOptions.attachments.length > 0
    });
    
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully:", info.response);
    console.log("Email info:", {
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
      envelope: info.envelope
    });

    // Check if email was actually accepted
    if (info.rejected && info.rejected.length > 0) {
      console.error("Email was rejected by server:", info.rejected);
      return false;
    }

    if (!info.accepted || info.accepted.length === 0) {
      console.error("Email was not accepted by server");
      return false;
    }

    console.log("✅ Email successfully delivered to mail server");
    return true;
  } catch (error) {
    console.error("Email sending failed:", error);
    console.error("Error details:", {
      message: (error as Error).message,
      code: (error as any).code,
      response: (error as any).response,
      responseCode: (error as any).responseCode
    });
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
  
  const text = `Dear ${clientName},

I hope this message finds you well. Please find attached Invoice #${invoiceNumber} for your recent painting project with A-Frame Painting.

This invoice includes:
- Professional painting services completed for your project
- All materials and supplies used
- Detailed breakdown of work performed

Payment terms: Net 30 days from invoice date
Accepted payment methods: E-transfer, cheque, or cash

If you have any questions regarding this invoice or our services, please feel free to contact me directly.

Thank you for choosing A-Frame Painting for your project. We appreciate your business and look forward to working with you again.

Best regards,

A-Frame Painting
cortespainter@gmail.com`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #EA580C;">A-Frame Painting</h2>
      <p>Hello <strong>${clientName}</strong>,</p>
      
      <p>Please find your invoice attached. Thank you for choosing A-Frame Painting for your project!</p>
      
      <p>If you have any questions about this invoice, please don't hesitate to contact us.</p>
      
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
        <p><strong>Best regards,</strong><br>
        A-Frame Painting<br>
        <a href="mailto:cortespainter@gmail.com">cortespainter@gmail.com</a></p>
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
        content: pdfBuffer
      }
    ]
  });
}

export async function sendInvoiceEmailWithReceipts(
  recipientEmail: string,
  clientName: string,
  invoiceNumber: string,
  pdfBuffer: Buffer,
  receiptAttachments: Array<{ filename: string; path: string }>,
  customMessage?: string
): Promise<boolean> {
  const subject = `Invoice #${invoiceNumber} from A-Frame Painting`;
  
  // Extract first name for casual greeting
  const firstName = clientName.split(' ')[0];
  
  const receiptText = receiptAttachments.length > 0 
    ? `\n\nI've also included ${receiptAttachments.length} receipt photo(s) showing the materials purchased for your project.`
    : '';
  
  // Use custom message if provided, otherwise use default professional message
  const emailBody = customMessage || `Hi ${firstName},

I hope this message finds you well. Please find attached Invoice #${invoiceNumber} for your recent painting project with A-Frame Painting.${receiptText}

This invoice includes:
- Professional painting services completed for your project
- All materials and supplies used
- Detailed breakdown of work performed

Payment terms: Net 30 days from invoice date
Accepted payment methods: E-transfer, cheque, or cash

If you have any questions regarding this invoice or our services, please feel free to contact me directly.

Thank you for choosing A-Frame Painting for your project. We appreciate your business and look forward to working with you again.

Best regards,

A-Frame Painting
cortespainter@gmail.com`;
  
  const text = emailBody;

  const receiptHtml = receiptAttachments.length > 0 
    ? `<p>I've also included <strong>${receiptAttachments.length} receipt photo(s)</strong> showing the materials purchased for your project.</p>`
    : '';

  // Create HTML version - use custom message if provided, otherwise use professional format
  const html = customMessage ? 
    // Simple HTML version for custom messages
    `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #EA580C; margin: 0; font-size: 28px;">A-Frame Painting</h1>
        <p style="color: #666; margin: 5px 0 0 0;">Professional Painting Services</p>
      </div>
      <div style="color: #333; line-height: 1.6; white-space: pre-line;">${customMessage}</div>
    </div>` :
    // Professional format for default messages
    `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #EA580C; margin: 0; font-size: 28px;">A-Frame Painting</h1>
        <p style="color: #666; margin: 5px 0 0 0;">Professional Painting Services</p>
      </div>
      
      <p style="color: #333; font-size: 16px;">Hi <strong>${firstName}</strong>,</p>
      
      <p style="color: #333; line-height: 1.6;">I hope this message finds you well. Please find attached <strong>Invoice #${invoiceNumber}</strong> for your recent painting project with A-Frame Painting.</p>
      
      ${receiptHtml}
      
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #EA580C; margin-top: 0;">This invoice includes:</h3>
        <ul style="color: #333; line-height: 1.6;">
          <li>Professional painting services completed for your project</li>
          <li>All materials and supplies used</li>
          <li>Detailed breakdown of work performed</li>
        </ul>
      </div>
      
      <div style="background-color: #e8f5e8; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0; color: #333;"><strong>Payment terms:</strong> Net 30 days from invoice date</p>
        <p style="margin: 5px 0 0 0; color: #333;"><strong>Accepted payment methods:</strong> E-transfer, cheque, or cash</p>
      </div>
      
      <p style="color: #333; line-height: 1.6;">If you have any questions regarding this invoice or our services, please feel free to contact me directly.</p>
      
      <p style="color: #333; line-height: 1.6;">Thank you for choosing A-Frame Painting for your project. We appreciate your business and look forward to working with you again.</p>
      
      <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #EA580C; text-align: center;">
        <p style="margin: 0; color: #333;"><strong>Best regards,</strong></p>
        <p style="margin: 10px 0 5px 0; color: #EA580C; font-size: 18px; font-weight: bold;">A-Frame Painting</p>
        <p style="margin: 0; color: #666;">
          <a href="mailto:cortespainter@gmail.com" style="color: #EA580C; text-decoration: none;">cortespainter@gmail.com</a><br>
          884 Hayes Rd, Manson's Landing, BC V0P1K0
        </p>
      </div>
    </div>
  `;

  // Prepare all attachments
  const attachments = [
    {
      filename: `Invoice-${invoiceNumber}-${clientName.replace(/[^a-zA-Z0-9]/g, '')}.pdf`,
      content: pdfBuffer,
      contentType: 'application/pdf',
      contentDisposition: 'attachment'
    },
    ...receiptAttachments
  ];

  return sendEmailWithSendGrid({
    to: recipientEmail,
    subject,
    text,
    html,
    attachments
  });
}



export async function sendEstimateEmail(
  recipientEmail: string,
  clientName: string,
  estimateNumber: string,
  projectTitle: string,
  totalAmount: string,
  customMessage: string,
  pdfBuffer: Buffer
): Promise<boolean> {
  const subject = `Your Painting Estimate from A-Frame Painting - ${projectTitle}`;
  
  const customMessageSection = customMessage 
    ? `\n\n${customMessage}\n\n` 
    : '\n\n';

  const firstName = clientName.split(' ')[0];
  
  const text = `Dear ${firstName},

Thank you for considering A-Frame Painting. Please find attached your detailed estimate.

Please review the attached detailed estimate and let me know if you have any questions.
${customMessageSection}================================
TOTAL ESTIMATE: $${totalAmount}
================================

IMPORTANT NOTE: This is an estimate, not a final quote. Final costs may vary based on actual conditions discovered during the project. If the job scope changes significantly (exceeding 20% of this estimate), we will discuss options with you before proceeding.

ESTIMATE VALIDITY: This estimate is valid for 30 days from today's date

Best regards,

A-Frame Painting
cortespainter@gmail.com`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #EA580C; margin: 0; font-size: 28px;">A-Frame Painting</h1>
        <p style="color: #666; margin: 5px 0 0 0;">Professional Painting Services</p>
      </div>
      
      <p style="color: #333; font-size: 16px;">Dear <strong>${firstName}</strong>,</p>
      
      <p style="color: #333; line-height: 1.6;">Thank you for considering A-Frame Painting. Please find attached your detailed estimate.</p>
      
      <p style="color: #333; line-height: 1.6;">Please review the attached detailed estimate and let me know if you have any questions.</p>
      
      ${customMessage ? `<div style="background-color: #f0f8ff; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #EA580C;">
        <h3 style="color: #EA580C; margin-top: 0; font-size: 16px;">Personal Message:</h3>
        <p style="margin: 0; font-style: italic; color: #333; line-height: 1.5;">${customMessage}</p>
      </div>` : ''}
      
      <div style="background-color: #ea580c; color: white; padding: 20px; border-radius: 8px; margin: 25px 0; text-align: center;">
        <h2 style="margin: 0; font-size: 24px;">Total Estimate: $${totalAmount}</h2>
      </div>
      
      <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
        <p style="margin: 0; color: #856404; font-size: 14px;"><strong>Important Note:</strong> This is an estimate, not a final quote. Final costs may vary based on actual conditions discovered during the project. If the job scope changes significantly (exceeding 20% of this estimate), we will discuss options with you before proceeding.</p>
      </div>
      
      <div style="background-color: #e8f5e8; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0; color: #333;"><strong>Estimate Validity:</strong> This estimate is valid for 30 days from the date above.</p>
      </div>
      
      <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #EA580C; text-align: center;">
        <p style="margin: 0; color: #333;"><strong>Best regards,</strong></p>
        <p style="margin: 10px 0 5px 0; color: #EA580C; font-size: 18px; font-weight: bold;">A-Frame Painting</p>
        <p style="margin: 0; color: #666;">
          <a href="mailto:cortespainter@gmail.com" style="color: #EA580C; text-decoration: none;">cortespainter@gmail.com</a>
        </p>
      </div>
    </div>
  `;

  console.log('Received PDF buffer, size:', pdfBuffer.length, 'bytes');

  // Use direct nodemailer instead of SendGrid for better reliability
  return sendEmail({
    to: recipientEmail,
    subject,
    text,
    html,
    attachments: [
      {
        filename: `Estimate-${estimateNumber}-${clientName.replace(/[^a-zA-Z0-9]/g, '')}.pdf`,
        content: pdfBuffer
      }
    ]
  });
}

export async function sendBasicEmail(
  to: string,
  subject: string,
  message: string
): Promise<boolean> {
  const text = message;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h2 style="color: #EA580C; margin: 0;">A-Frame Painting</h2>
      </div>
      <div style="white-space: pre-wrap; color: #333; line-height: 1.6;">${message}</div>
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
        <p style="margin: 0; color: #666;">
          <strong>A-Frame Painting</strong><br>
          <a href="mailto:cortespainter@gmail.com" style="color: #EA580C;">cortespainter@gmail.com</a>
        </p>
      </div>
    </div>
  `;

  return sendEmail({
    to,
    subject,
    text,
    html
  });
}