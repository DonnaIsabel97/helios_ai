import nodemailer from "nodemailer";

export const sendEmail =  async (req, res) => {
    try {
        const { fullName, email, organisation, message } = req.body;

        if ( !fullName || !email) {
            throw new Error("Full Name and Email is required");
        }

        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.CONTACT_EMAIL,
                pass: process.env.CONTACT_EMAIL_APP_PASSWORD,
            },
        });

        await transporter.sendMail({
            from: process.env.CONTACT_EMAIL,
            replyTo: email,
            to: "d.carschmit@gmail.com",
            subject: `Helios App contact form: ${fullName} ${organisation}`,
            text: `Name: ${fullName}
                    Email: ${email}
                    organisation: ${organisation}

                    Message:${message}
                        `,
                        html: `
                            <h2>New Helios Contact Message</h2>
                            <p><strong>Name:</strong> ${fullName}</p>
                            <p><strong>Email:</strong> ${email}</p>
                            <p><strong>Organisation:</strong> ${organisation}</p>
                            <p><strong>Message:</strong></p>
                            <p>${message.replace(/\n/g, "<br/>")}</p>
                        `,
        });

        res.status(200).json({
            message: "Message sent succesfully.",
        });

    } catch (error){
        res.status(500).json({
            error: "Failed to send message."
        });
    }
}