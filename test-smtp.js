const nodemailer = require("nodemailer");

async function test() {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: "mindigenous.ai@gmail.com",
      pass: "mciwnfbzsffgigcz",
    },
  });

  try {
    await transporter.verify();
    console.log("SMTP connection verified successfully!");

    const info = await transporter.sendMail({
      from: '"JobCrab" <mindigenous.ai@gmail.com>',
      to: "faazrock345@gmail.com",
      subject: "JobCrab SMTP Test Email",
      text: "This is a test email from JobCrab to verify delivery.",
      html: "<b>This is a test email from JobCrab to verify delivery.</b>",
    });

    console.log("Email sent successfully! Message ID:", info.messageId);
  } catch (error) {
    console.error("SMTP verification or sending failed:", error);
  }
}

test();
