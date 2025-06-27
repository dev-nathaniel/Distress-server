import nodemailer from 'nodemailer';
import { transporter } from '../../index.js';
// import { transporter } from '../index.js';

// interface SendEmailOptions {
//     from: string;
//     to: string;
//     replyTo?: string;
//     subject: string;
//     html: string;
// }

export const sendEmail = async (options) => {  
    
    await transporter.sendMail({
        from: options.from,
        to: options.to,
        replyTo: options.replyTo,
        subject: options.subject,
        html: options.html,
    });
}