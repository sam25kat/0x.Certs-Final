import smtplib
import os
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from dotenv import load_dotenv

load_dotenv()

class EmailService:
    def __init__(self):
        self.smtp_host = os.getenv("SMTP_HOST")
        self.smtp_port = int(os.getenv("SMTP_PORT"))
        self.smtp_user = os.getenv("SMTP_USER")
        self.smtp_pass = os.getenv("SMTP_PASS")
        self.from_email = os.getenv("FROM_EMAIL")

    def send_certificate_email(self, to_email, participant_name, event_name, certificate_path, contract_address, token_id):
        """Send certificate email with attachment and wallet instructions"""
        try:
            # Create message
            msg = MIMEMultipart()
            msg['From'] = self.from_email
            msg['To'] = to_email
            msg['Subject'] = f"🎉 Your {event_name} Certificate NFT is Ready!"

            # Email body
            body = f"""
Dear {participant_name},

Congratulations! 🎉 Your certificate for participating in {event_name} has been minted as an NFT and is ready for you to claim.

📜 CERTIFICATE DETAILS:
- Event: {event_name}
- Participant: {participant_name}
- Certificate Type: NFT (Non-Fungible Token)

🔗 NFT DETAILS:
- Contract Address: {contract_address}
- Token ID: {token_id}

📱 HOW TO ADD TO YOUR WALLET:

For MetaMask:
1. Open MetaMask wallet
2. Go to NFTs tab
3. Click "Import NFT"
4. Enter Contract Address: {contract_address}
5. Enter Token ID: {token_id}
6. Click "Import"

For other wallets:
1. Look for "Add NFT" or "Import Token" option
2. Select "NFT" or "ERC-721" token type
3. Enter the contract address and token ID above

📎 CERTIFICATE ATTACHMENT:
Your certificate is also attached as a JPG image for your records.

🎯 WHAT'S NEXT:
- Add the NFT to your wallet using the instructions above
- Share your achievement on social media
- Keep this certificate as proof of your participation

Thank you for being part of {event_name}! 

Best regards,
The {event_name} Team

---
This is an automated message. Please do not reply to this email.
If you need assistance, please contact the event organizers.
            """

            msg.attach(MIMEText(body, 'plain'))

            # Attach certificate file
            if os.path.exists(certificate_path):
                with open(certificate_path, "rb") as attachment:
                    part = MIMEBase('application', 'octet-stream')
                    part.set_payload(attachment.read())
                    encoders.encode_base64(part)
                    part.add_header(
                        'Content-Disposition',
                        f'attachment; filename= {os.path.basename(certificate_path)}'
                    )
                    msg.attach(part)

            # Send email
            server = smtplib.SMTP(self.smtp_host, self.smtp_port)
            server.starttls()
            server.login(self.smtp_user, self.smtp_pass)
            text = msg.as_string()
            server.sendmail(self.from_email, to_email, text)
            server.quit()

            return {"success": True, "message": f"Email sent to {to_email}"}

        except Exception as e:
            return {"success": False, "error": str(e)}

    def send_bulk_certificate_emails(self, participants_data, event_name, contract_address):
        """Send certificate emails to multiple participants"""
        results = []
        
        for participant in participants_data:
            result = self.send_certificate_email(
                to_email=participant['email'],
                participant_name=participant['name'],
                event_name=event_name,
                certificate_path=participant['certificate_path'],
                contract_address=contract_address,
                token_id=participant['token_id']
            )
            
            results.append({
                "email": participant['email'],
                "name": participant['name'],
                "result": result
            })
        
        return results

# Test function
if __name__ == "__main__":
    email_service = EmailService()
    
    # Test email
    result = email_service.send_certificate_email(
        to_email="test@example.com",
        participant_name="Test User",
        event_name="Test Event",
        certificate_path="certificates/test_certificate.jpg",
        contract_address="0x5FbDB2315678afecb367f032d93F642f64180aa3",
        token_id="1"
    )
    
    print("Email result:", result)