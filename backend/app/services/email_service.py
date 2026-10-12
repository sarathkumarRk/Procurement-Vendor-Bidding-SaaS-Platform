import logging
import smtplib
from email.message import EmailMessage

from app.config import settings

logger = logging.getLogger(__name__)


def send_email(
    to_email: str,
    subject: str,
    body: str,
) -> bool:
    if not to_email:
        logger.warning("Email not sent: recipient address is empty")
        return False

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = settings.SMTP_EMAIL
    message["To"] = to_email
    message.set_content(body)

    try:
        with smtplib.SMTP(
            settings.SMTP_HOST,
            settings.SMTP_PORT,
            timeout=15,
        ) as server:
            server.starttls()
            server.login(
                settings.SMTP_EMAIL,
                settings.SMTP_PASSWORD,
            )
            server.send_message(message)

        return True

    except (smtplib.SMTPException, OSError):
        logger.exception("Email delivery failed")
        return False


def send_vendor_verification_email(
    to_email: str,
    company_name: str,
    approved: bool,
) -> bool:
    if approved:
        subject = "Vendor Verification Approved"
        body = (
            f"Hello {company_name},\n\n"
            "Your vendor profile has been verified. "
            "You can now participate in eligible RFQs."
        )
    else:
        subject = "Vendor Verification Rejected"
        body = (
            f"Hello {company_name},\n\n"
            "Your vendor verification was rejected. "
            "Please contact the procurement administrator "
            "for further information."
        )

    return send_email(to_email, subject, body)


def send_rfq_published_email(
    to_email: str,
    rfq_number: str,
    rfq_title: str | None = None,
    deadline: str | None = None,
    title: str | None = None,
    description: str | None = None,
    submission_deadline: str | None = None,
) -> bool:
    resolved_title = rfq_title or title or "New RFQ"
    resolved_deadline = submission_deadline or deadline or "See platform"

    subject = f"New RFQ Published: {rfq_number}"

    body = (
        "A new Request for Quotation is available.\n\n"
        f"RFQ Number: {rfq_number}\n"
        f"Title: {resolved_title}\n"
        f"Description: {description or 'Please log in to view details.'}\n"
        f"Submission Deadline: {resolved_deadline}\n\n"
        "Please log in to the platform to review the RFQ "
        "and submit your quotation before the deadline."
    )

    return send_email(to_email, subject, body)


def send_quotation_confirmation_email(
    to_email: str,
    rfq_number: str,
) -> bool:
    subject = "Quotation Submission Confirmation"
    body = (
        f"Your quotation for RFQ {rfq_number} "
        "has been submitted successfully."
    )

    return send_email(to_email, subject, body)


def send_quotation_submitted_email(
    to_email: str,
    quotation_number: str,
    rfq_number: str,
    rfq_title: str,
    total_amount: str,
) -> bool:
    subject = f"New Quotation Submitted: {quotation_number}"

    body = (
        "A vendor has submitted a quotation for your RFQ.\n\n"
        f"Quotation Number: {quotation_number}\n"
        f"RFQ Number: {rfq_number}\n"
        f"RFQ Title: {rfq_title}\n"
        f"Quoted Total: {total_amount}\n\n"
        "Please log in to the procurement platform "
        "to review the quotation."
    )

    return send_email(to_email, subject, body)


def send_bid_result_email(
    to_email: str,
    rfq_number: str,
    awarded: bool,
) -> bool:
    if awarded:
        subject = "Quotation Awarded"
        body = (
            f"Congratulations! Your quotation for RFQ "
            f"{rfq_number} has been selected."
        )
    else:
        subject = "Quotation Result"
        body = (
            f"Your quotation for RFQ {rfq_number} "
            "was not selected."
        )

    return send_email(to_email, subject, body)


def send_purchase_order_email(
    to_email: str,
    po_number: str,
    status: str,
) -> bool:
    subject = f"Purchase Order Update: {po_number}"

    body = (
        f"Purchase Order: {po_number}\n"
        f"Current Status: {status}\n\n"
        "Please log in to the platform for details."
    )

    return send_email(to_email, subject, body)


def send_rfq_deadline_reminder_email(
    to_email: str,
    rfq_number: str,
    deadline: str,
) -> bool:
    subject = f"RFQ Deadline Reminder: {rfq_number}"

    body = (
        f"The submission deadline for RFQ {rfq_number} "
        f"is approaching.\nDeadline: {deadline}\n\n"
        "Please submit your quotation before the deadline."
    )

    return send_email(to_email, subject, body)