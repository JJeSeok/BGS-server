import nodemailer from 'nodemailer';
import { config } from '../config.js';

export const mailer = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: config.mailer.user,
    pass: config.mailer.password,
  },
});

export async function sendMail({ to, subject, text, html }) {
  return mailer.sendMail({
    from: `'${config.mailer.appName}' <${config.mailer.user}>`,
    to,
    subject,
    text,
    html,
  });
}
