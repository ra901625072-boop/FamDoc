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
    subject = "Your FamDoc Verification Code"
    body = f"""
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>FamDoc Security Code</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F2FBF6; padding: 28px 12px; color: #0B291D; margin: 0; line-height: 1.6;">
        <div style="max-width: 520px; margin: 0 auto; background-color: #FFFFFF; padding: 36px 32px; border-radius: 16px; box-shadow: 0 8px 24px rgba(4, 40, 25, 0.08); border: 1px solid #CBEAD7;">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-block; padding: 8px 16px; background-color: #E8F7EE; border-radius: 9999px; margin-bottom: 12px;">
              <span style="font-size: 13px; font-weight: 700; letter-spacing: 1px; color: #047857; text-transform: uppercase;">FamDoc Keepsake Vault</span>
            </div>
            <h2 style="color: #064E3B; margin: 0; font-size: 22px; font-weight: 800;">Password Reset Request</h2>
          </div>
          <p style="font-size: 15px; color: #436B59; margin-bottom: 16px;">Hello,</p>
          <p style="font-size: 15px; color: #436B59; margin-bottom: 24px;">We received a request to reset the password for your family vault account. Use the 6-digit one-time code below to verify your identity:</p>
          <div style="text-align: center; margin: 28px 0;">
            <div style="display: inline-block; font-family: 'JetBrains Mono', 'Courier New', monospace; font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #047857; background: #F0FAF4; padding: 16px 32px; border-radius: 12px; border: 2px dashed #10B981; box-shadow: 0 4px 14px rgba(4, 120, 87, 0.12);">
              {otp}
            </div>
          </div>
          <div style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 12px 16px; border-radius: 6px; margin: 24px 0;">
            <p style="color: #92400E; font-size: 13px; font-weight: 600; margin: 0;">⏱️ This verification code expires in 10 minutes. Never share this code with anyone.</p>
          </div>
          <p style="font-size: 13px; color: #6B7280; margin-top: 20px;">If you did not initiate this request, you can safely ignore this email. Your vault password will remain unchanged.</p>
          <hr style="border: 0; border-top: 1px solid #E5E7EB; margin: 28px 0 20px 0;" />
          <p style="font-size: 12px; color: #9CA3AF; text-align: center; margin: 0;">FamDoc — Private & Encrypted Family Keepsake Vault &copy; 2026</p>
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

