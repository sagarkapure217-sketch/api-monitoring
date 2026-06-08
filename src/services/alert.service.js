'use strict';

const { Resend } = require('resend');
const env = require('../config/env');

const resend = new Resend(env.resendApiKey);

// ---------------------------------------------------------------------------
// Startup config verification
// Logs enough to confirm config is correct without exposing secrets.
// ---------------------------------------------------------------------------
console.log('[alert.service] Config:');
console.log(`  ALERT_FROM_EMAIL    : ${env.alertFromEmail}`);
console.log(`  ALERT_TO_EMAIL      : ${env.alertToEmail}`);
console.log(`  RESEND_API_KEY      : configured=${Boolean(env.resendApiKey)}`);

// ---------------------------------------------------------------------------
// Internal helper: send + log full Resend response
// ---------------------------------------------------------------------------

/**
 * Call resend.emails.send, log the full response, and surface any API errors.
 *
 * Resend SDK v4 does NOT throw on API errors. Instead it returns:
 *   { data: { id: '...' }, error: null }   ← success
 *   { data: null, error: { name, message, statusCode } }  ← API-level failure
 *
 * Without capturing the return value, API errors are silently swallowed.
 * This helper makes every outcome visible in logs.
 *
 * @param {{ from: string, to: string, subject: string, html: string }} payload
 * @throws {Error} if Resend returns an error object
 */
async function sendViaResend(payload) {
  console.log('[alert.service] Attempting send:');
  console.log(`  from    : ${payload.from}`);
  console.log(`  to      : ${payload.to}`);
  console.log(`  subject : ${payload.subject}`);

  const { data, error } = await resend.emails.send(payload);

  if (error) {
    console.error('[alert.service] Resend error:', error);
    throw new Error(`Resend API error: ${error.message || JSON.stringify(error)}`);
  }

  console.log('[alert.service] Resend success:', data);
}

// ---------------------------------------------------------------------------
// Public alert functions
// ---------------------------------------------------------------------------

/**
 * Send a "Monitor Down" alert email when a new incident is opened.
 *
 * @param {object}      params
 * @param {string}      params.recipientEmail - monitor owner's email (resolved by caller)
 * @param {string}      params.monitorName
 * @param {string}      params.url
 * @param {Date|string} params.startedAt
 * @returns {Promise<void>}
 */
async function sendDownAlert({ recipientEmail, monitorName, url, startedAt }) {
  const subject = `Monitor Down: ${monitorName}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #dc2626;">🔴 Monitor Down: ${monitorName}</h2>
      <p>Your monitor is currently <strong>DOWN</strong> and an incident has been opened.</p>
      <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 10px; font-weight: bold; color: #6b7280; width: 160px;">Monitor</td>
          <td style="padding: 10px;">${monitorName}</td>
        </tr>
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 10px; font-weight: bold; color: #6b7280;">URL</td>
          <td style="padding: 10px;"><a href="${url}" style="color: #2563eb;">${url}</a></td>
        </tr>
        <tr>
          <td style="padding: 10px; font-weight: bold; color: #6b7280;">Incident started</td>
          <td style="padding: 10px;">${new Date(startedAt).toUTCString()}</td>
        </tr>
      </table>
      <p style="margin-top: 24px; color: #6b7280; font-size: 13px;">
        You will receive another email when the monitor recovers.
      </p>
    </div>
  `;

  // TODO: Replace ALERT_TO_EMAIL with monitor owner email after email delivery testing is complete.
  //   Change to: recipientEmail
  await sendViaResend({
    from:    env.alertFromEmail,
    to:      env.alertToEmail,
    subject,
    html,
  });

  console.log(`[alert.service] Down alert sent — monitor=${monitorName} to=${env.alertToEmail} (test override)`);
}

/**
 * Send a "Monitor Recovered" alert email when an incident is resolved.
 *
 * @param {object}      params
 * @param {string}      params.recipientEmail - monitor owner's email (resolved by caller)
 * @param {string}      params.monitorName
 * @param {string}      params.url
 * @param {Date|string} params.startedAt
 * @param {Date|string} params.resolvedAt
 * @returns {Promise<void>}
 */
async function sendRecoveryAlert({ recipientEmail, monitorName, url, startedAt, resolvedAt }) {
  const subject = `Monitor Recovered: ${monitorName}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #16a34a;">🟢 Monitor Recovered: ${monitorName}</h2>
      <p>Your monitor has recovered and is now <strong>UP</strong>. The incident has been resolved.</p>
      <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 10px; font-weight: bold; color: #6b7280; width: 160px;">Monitor</td>
          <td style="padding: 10px;">${monitorName}</td>
        </tr>
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 10px; font-weight: bold; color: #6b7280;">URL</td>
          <td style="padding: 10px;"><a href="${url}" style="color: #2563eb;">${url}</a></td>
        </tr>
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 10px; font-weight: bold; color: #6b7280;">Incident started</td>
          <td style="padding: 10px;">${new Date(startedAt).toUTCString()}</td>
        </tr>
        <tr>
          <td style="padding: 10px; font-weight: bold; color: #6b7280;">Recovered at</td>
          <td style="padding: 10px;">${new Date(resolvedAt).toUTCString()}</td>
        </tr>
      </table>
    </div>
  `;

  // TODO: Replace ALERT_TO_EMAIL with monitor owner email after email delivery testing is complete.
  //   Change to: recipientEmail
  await sendViaResend({
    from:    env.alertFromEmail,
    to:      env.alertToEmail,
    subject,
    html,
  });

  console.log(`[alert.service] Recovery alert sent — monitor=${monitorName} to=${env.alertToEmail} (test override)`);
}

module.exports = { sendDownAlert, sendRecoveryAlert };
