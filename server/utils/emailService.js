const nodemailer = require('nodemailer');

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set in environment`);
  }
  return value;
}

const emailHost = requireEnv('EMAIL_HOST');
const emailPortRaw = requireEnv('EMAIL_PORT');
const emailPort = Number(emailPortRaw);

if (Number.isNaN(emailPort)) {
  throw new Error('EMAIL_PORT must be a number');
}

const emailUser = requireEnv('EMAIL_USER');
const emailPassword = requireEnv('EMAIL_PASSWORD');
const frontendUrl = requireEnv('FRONTEND_URL');

// Create transporter
const transporter = nodemailer.createTransport({
  host: emailHost,
  port: emailPort,
  secure: false,
  auth: {
    user: emailUser,
    pass: emailPassword,
  },
});

// Send material request approval email
async function sendApprovalEmail(requestData) {
  if (!requestData.approverEmail) {
    throw new Error('approverEmail is required to send approval email');
  }

  const approvalLink = `${frontendUrl}/material-requests?action=approve&id=${requestData._id}`;
  
  const lineItemsHTML = requestData.lineItems.map(item => `
    <tr>
      <td style="padding: 8px; border: 1px solid #ddd;">${item.itemName}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${item.quantity} ${item.quantityType}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">$${item.amount || 0}</td>
    </tr>
  `).join('');

  const mailOptions = {
    from: emailUser,
    to: requestData.approverEmail,
    subject: `Material Request Approval Required - ${requestData.requestId}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0d6efd;">Material Request Approval Required</h2>
        <p>Dear ${requestData.approver},</p>
        <p>A new material request has been submitted and requires your approval.</p>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Request Details</h3>
          <p><strong>Request ID:</strong> ${requestData.requestId}</p>
          <p><strong>Requested By:</strong> ${requestData.requestedBy}</p>
          <p><strong>Department:</strong> ${requestData.department}</p>
          <p><strong>Date:</strong> ${requestData.date}</p>
          <p><strong>Type:</strong> ${requestData.requestType}</p>
        </div>

        <h3>Line Items</h3>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <thead>
            <tr style="background-color: #0d6efd; color: white;">
              <th style="padding: 10px; text-align: left;">Item</th>
              <th style="padding: 10px; text-align: left;">Quantity</th>
              <th style="padding: 10px; text-align: left;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${lineItemsHTML}
          </tbody>
        </table>

        ${requestData.message ? `<p><strong>Message:</strong> ${requestData.message}</p>` : ''}

        <div style="margin: 30px 0;">
          <a href="${approvalLink}" style="background-color: #198754; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Review & Approve Request
          </a>
        </div>

        <p style="color: #666; font-size: 12px;">
          This is an automated email. Please do not reply to this message.
        </p>
      </div>
    `,
  };

  try {
    // In development, just log the email
    if (process.env.NODE_ENV !== 'production') {
      console.log('📧 Email would be sent to:', mailOptions.to);
      console.log('Approval Link:', approvalLink);
      return { success: true, message: 'Email logged (dev mode)' };
    }
    
    await transporter.sendMail(mailOptions);
    return { success: true, message: 'Email sent successfully' };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message };
  }
}

// Send PO review notification
async function sendPOReviewEmail(poData) {
  if (!poData.requesterEmail) {
    throw new Error('requesterEmail is required to send PO review email');
  }

  const reviewLink = `${frontendUrl}/purchase-orders?action=review&id=${poData._id}`;
  
  const mailOptions = {
    from: emailUser,
    to: poData.requesterEmail,
    subject: `Purchase Order Ready for Review - ${poData.poNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0d6efd;">Purchase Order Ready for Review</h2>
        <p>Dear ${poData.requester},</p>
        <p>A purchase order has been created from your material request and is ready for review.</p>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0;">PO Details</h3>
          <p><strong>PO Number:</strong> ${poData.poNumber}</p>
          <p><strong>Vendor:</strong> ${poData.vendor}</p>
          <p><strong>Total Amount:</strong> $${poData.totalAmount.toFixed(2)}</p>
          <p><strong>Status:</strong> Pending Review</p>
        </div>

        <div style="margin: 30px 0;">
          <a href="${reviewLink}" style="background-color: #0d6efd; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Review Purchase Order
          </a>
        </div>

        <p style="color: #666; font-size: 12px;">
          This is an automated email. Please do not reply to this message.
        </p>
      </div>
    `,
  };

  try {
    if (process.env.NODE_ENV !== 'production') {
      console.log('📧 PO Review email would be sent to:', mailOptions.to);
      console.log('Review Link:', reviewLink);
      return { success: true, message: 'Email logged (dev mode)' };
    }
    
    await transporter.sendMail(mailOptions);
    return { success: true, message: 'Email sent successfully' };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendApprovalEmail,
  sendPOReviewEmail,
  transporter,
};
