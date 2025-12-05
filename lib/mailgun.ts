import FormData from 'form-data';
import Mailgun from 'mailgun.js';

const API_KEY = process.env.MAILGUN_API_KEY;
const DOMAIN = process.env.MAILGUN_DOMAIN;

if (!API_KEY || !DOMAIN) {
    console.warn("⚠️ Mailgun credentials missing. Emails will not send.");
}

const mailgun = new Mailgun(FormData);
const mg = mailgun.client({
    username: 'api',
    key: API_KEY || 'dummy-key',
    // url: 'https://api.eu.mailgun.net' // <--- UNCOMMENT IF YOU ARE IN EUROPE REGION
});

export { mg, DOMAIN };