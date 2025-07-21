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
      rejected: info.rejected
    });
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
cortespainter@gmail.com
884 Hayes Rd, Manson's Landing, BC V0P1K0`;

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
  receiptAttachments: Array<{ filename: string; path: string }>
): Promise<boolean> {
  const subject = `Invoice #${invoiceNumber} from A-Frame Painting`;
  
  const receiptText = receiptAttachments.length > 0 
    ? `\n\nI've also included ${receiptAttachments.length} receipt photo(s) showing the materials purchased for your project.`
    : '';
  
  const text = `Dear ${clientName},

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
cortespainter@gmail.com
884 Hayes Rd, Manson's Landing, BC V0P1K0`;

  const receiptHtml = receiptAttachments.length > 0 
    ? `<p>I've also included <strong>${receiptAttachments.length} receipt photo(s)</strong> showing the materials purchased for your project.</p>`
    : '';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #EA580C; margin: 0; font-size: 28px;">A-Frame Painting</h1>
        <p style="color: #666; margin: 5px 0 0 0;">Professional Painting Services</p>
      </div>
      
      <p style="color: #333; font-size: 16px;">Dear <strong>${clientName}</strong>,</p>
      
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

  return sendEmail({
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

  const text = `Dear ${clientName},

Thank you for considering A-Frame Painting for your project. Please find attached your detailed painting estimate for ${projectTitle}.
${customMessageSection}================================
TOTAL ESTIMATE: $${totalAmount}
================================

WHAT'S INCLUDED:
• Detailed work breakdown with labor estimates
• High-quality paint and primer calculations
• All necessary supplies and materials
• Professional preparation and finishing work
• Travel costs and project coordination

ESTIMATE DETAILS:
• Validity: This estimate is valid for 30 days from today's date
• Next Steps: Please review the attached detailed estimate and contact me with any questions

IMPORTANT NOTE: This is an estimate, not a final quote. Final costs may vary based on actual conditions discovered during the project. If the job scope changes significantly (exceeding 20% of this estimate), we will discuss options with you before proceeding to ensure complete transparency.

I'm excited about the opportunity to work with you on this project. A-Frame Painting is committed to delivering exceptional results with attention to detail and professional service.

Best regards,

A-Frame Painting
Licensed • Insured • Professional
cortespainter@gmail.com
884 Hayes Rd, Manson's Landing, BC V0P1K0`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #EA580C; margin: 0; font-size: 28px;">A-Frame Painting</h1>
        <p style="color: #666; margin: 5px 0 0 0;">Professional Painting Services</p>
      </div>
      
      <p style="color: #333; font-size: 16px;">Dear <strong>${clientName}</strong>,</p>
      
      <p style="color: #333; line-height: 1.6;">Thank you for considering A-Frame Painting for your project. Please find attached your detailed painting estimate for <strong>${projectTitle}</strong>.</p>
      
      ${customMessage ? `<div style="background-color: #f0f8ff; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #EA580C;">
        <h3 style="color: #EA580C; margin-top: 0; font-size: 16px;">Personal Message:</h3>
        <p style="margin: 0; font-style: italic; color: #333; line-height: 1.5;">${customMessage}</p>
      </div>` : ''}
      
      <div style="background-color: #ea580c; color: white; padding: 20px; border-radius: 8px; margin: 25px 0; text-align: center;">
        <h2 style="margin: 0; font-size: 24px;">Total Estimate: $${totalAmount}</h2>
        <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">Professional painting services with quality materials</p>
      </div>
      
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #EA580C; margin-top: 0;">What's Included:</h3>
        <ul style="color: #333; line-height: 1.6; margin: 10px 0; padding-left: 20px;">
          <li>Detailed work breakdown with labor estimates</li>
          <li>High-quality paint and primer calculations</li>
          <li>All necessary supplies and materials</li>
          <li>Professional preparation and finishing work</li>
          <li>Travel costs and project coordination</li>
        </ul>
      </div>
      
      <div style="background-color: #e8f5e8; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0; color: #333;"><strong>Estimate Validity:</strong> This estimate is valid for 30 days from the date above.</p>
        <p style="margin: 5px 0 0 0; color: #333;"><strong>Next Steps:</strong> Please review the attached detailed estimate and let me know if you have any questions.</p>
      </div>
      
      <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
        <p style="margin: 0; color: #856404; font-size: 14px;"><strong>Important Note:</strong> This is an estimate, not a final quote. Final costs may vary based on actual conditions discovered during the project. If the job scope changes significantly (exceeding 20% of this estimate), we will discuss options with you before proceeding to ensure complete transparency.</p>
      </div>
      
      <p style="color: #333; line-height: 1.6;">I'm excited about the opportunity to work with you on this project. A-Frame Painting is committed to delivering exceptional results with attention to detail and professional service.</p>
      
      <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #EA580C; text-align: center;">
        <p style="margin: 0; color: #333;"><strong>Best regards,</strong></p>
        <p style="margin: 10px 0 5px 0; color: #EA580C; font-size: 18px; font-weight: bold;">A-Frame Painting</p>
        <p style="margin: 0; color: #666;">
          <a href="mailto:cortespainter@gmail.com" style="color: #EA580C; text-decoration: none;">cortespainter@gmail.com</a><br>
          884 Hayes Rd, Manson's Landing, BC V0P1K0<br>
          <span style="font-size: 14px; font-style: italic;">Licensed • Insured • Professional</span>
        </p>
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
        filename: `Estimate-${estimateNumber}-${clientName.replace(/[^a-zA-Z0-9]/g, '')}.pdf`,
        content: pdfBuffer
      }
    ]
  });
}