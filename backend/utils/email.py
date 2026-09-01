import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from config import SMTP_HOST, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD, SMTP_FROM_EMAIL, SMTP_TLS, SMTP_SSL, RESEND_API_KEY
from logging_config import logger

def send_otp_email(to_email: str, otp: str):
    """
    Formulates a styled HTML email with a password reset OTP and sends it.
    It prioritizes sending via Resend API (if configured), then falls back to SMTP, 
    and finally logs to the server console if no email configuration is present.
    """
    subject = "Your Password Reset OTP"
    body = f"""
    <html>
      <body style="font-family: Arial, sans-serif; background-color: #f4f4f5; padding: 20px; color: #1f2937; margin: 0;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); border: 1px solid #e5e7eb;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #2563eb; margin: 0; font-size: 24px;">Reset Your Password</h2>
            <p style="color: #6b7280; margin: 5px 0 0 0; font-size: 14px;">Family Document Management System</p>
          </div>
          <p>Hello,</p>
          <p>We received a request to reset the password for your account. Please use the following 6-digit One-Time Password (OTP) to complete the verification:</p>
          <div style="text-align: center; margin: 30px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #2563eb; background-color: #f3f4f6; padding: 12px 24px; border-radius: 6px; border: 1px dashed #2563eb; display: inline-block;">{otp}</span>
          </div>
          <p style="color: #ef4444; font-weight: 500;">This OTP code is valid for 10 minutes. Do not share this code with anyone.</p>
          <p>If you did not request this password reset, please ignore this email. Your password will remain unchanged.</p>
          <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
          <p style="font-size: 12px; color: #9ca3af; text-align: center; margin: 0;">Family Document Management System &copy; 2026</p>
        </div>
      </body>
    </html>
    """

    # 1. Try sending via Resend SDK
    if RESEND_API_KEY:
        try:
            import resend
            resend.api_key = RESEND_API_KEY
            from_email = SMTP_FROM_EMAIL or "onboarding@resend.dev"
            
            logger.info(f"Attempting to send OTP email to {to_email} via Resend SDK...")
            r = resend.Emails.send({
                "from": from_email,
                "to": to_email,
                "subject": subject,
                "html": body
            })
            
            # Check if send succeeded (ID is returned)
            email_id = getattr(r, "id", None) or (r.get("id") if isinstance(r, dict) else None)
            if email_id:
                logger.info(f"Successfully sent OTP email to {to_email} via Resend (ID: {email_id})")
                logger.info(f"DEVELOPMENT INFO: Generated OTP for {to_email} is {otp}")
                return True
            else:
                logger.error(f"Resend SDK returned unexpected response: {r}. Falling back to SMTP/Console...")
        except Exception as e:
            logger.error(f"Resend SDK exception: {str(e)}. Falling back to SMTP/Console...", exc_info=True)

    # 2. Fall back to standard SMTP if configured
    if SMTP_HOST:
        try:
            logger.info(f"Attempting to send OTP email to {to_email} via SMTP...")
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = SMTP_FROM_EMAIL or SMTP_USERNAME
            msg["To"] = to_email

            html_part = MIMEText(body, "html")
            msg.attach(html_part)

            if SMTP_SSL:
                server = smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT)
            else:
                server = smtplib.SMTP(SMTP_HOST, SMTP_PORT)
                if SMTP_TLS:
                    server.starttls()

            if SMTP_USERNAME and SMTP_PASSWORD:
                server.login(SMTP_USERNAME, SMTP_PASSWORD)

            server.sendmail(msg["From"], [to_email], msg.as_string())
            server.quit()
            logger.info(f"Successfully sent OTP email to {to_email} via SMTP")
            return True
        except Exception as e:
            logger.error(f"SMTP delivery exception: {str(e)}. Falling back to console...", exc_info=True)

    # 3. Ultimate developer fallback: Log OTP to server console
    logger.warning("\n" + "=" * 60)
    logger.warning("NO EMAIL DELIVERY METHODS AVAILABLE. LOGGING OTP CODE FOR DEV ENVIRONMENT:")
    logger.warning(f"TO: {to_email}")
    logger.warning(f"OTP CODE: {otp}")
    logger.warning("=" * 60 + "\n")
    return True

