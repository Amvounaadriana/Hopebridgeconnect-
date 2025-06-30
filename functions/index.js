const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

admin.initializeApp();

// Configure your email provider here
const transporter = nodemailer.createTransport({
  service: 'gmail', // Change to your provider if needed
  auth: {
    user: 'your-email@gmail.com', // TODO: Replace with your email
    pass: 'your-app-password-or-api-key', // TODO: Replace with your app password or API key
  },
});

exports.sendEmailOnLog = functions.firestore
  .document('emailLogs/{logId}')
  .onCreate(async (snap, context) => {
    const data = snap.data();
    if (!data || data.status !== 'pending') return null;

    const { to, subject, template, data: templateData } = data;
    // Basic template logic (customize as needed)
    let html = '';
    if (template === 'payment-confirmation') {
      html = `<p>Dear ${templateData.name},</p>
        <p>Thank you for your ${templateData.type || 'donation'} of <b>${templateData.currency} ${templateData.amount}</b>.</p>
        <p>Your transaction ID is <b>${templateData.transactionId}</b>.</p>
        <p>We appreciate your support!</p>`;
    } else {
      html = `<p>Dear ${templateData.name || ''},</p><p>${subject}</p>`;
    }

    try {
      await transporter.sendMail({
        from: 'HopeBridge <your-email@gmail.com>', // TODO: Replace with your sender email
        to,
        subject,
        html,
      });
      await snap.ref.update({ status: 'sent', sentAt: admin.firestore.FieldValue.serverTimestamp() });
      return true;
    } catch (error) {
      console.error('Email send error:', error);
      await snap.ref.update({ status: 'failed', error: error.message });
      return false;
    }
  });
