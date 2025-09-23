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
        
        # Global tracking file to prevent duplicate emails across sessions
        self.tracking_file = "sent_emails.log"

    def _is_email_already_sent(self, to_email, participant_name, event_name, token_id):
        """Check if this exact email was already sent"""
        email_key = f"{to_email}|{participant_name}|{event_name}|{token_id}"
        if os.path.exists(self.tracking_file):
            with open(self.tracking_file, 'r') as f:
                sent_emails = f.read().splitlines()
                return email_key in sent_emails
        return False
    
    def _mark_email_as_sent(self, to_email, participant_name, event_name, token_id):
        """Mark this email as sent to prevent duplicates"""
        email_key = f"{to_email}|{participant_name}|{event_name}|{token_id}"
        with open(self.tracking_file, 'a') as f:
            f.write(f"{email_key}\n")

    def send_certificate_email(self, to_email, participant_name, event_name, certificate_path, contract_address, token_id, poa_token_id=None, force_resend=False):
        """Send certificate email with attachment and wallet instructions"""
        try:
            # Check if email was already sent (unless force_resend is True)
            if not force_resend and self._is_email_already_sent(to_email, participant_name, event_name, token_id):
                print(f"Email already sent to {to_email} for {event_name} token {token_id}. Skipping.")
                return {"success": True, "message": f"Email already sent to {to_email} (duplicate prevented)"}
            
            # Create message with proper multipart setup
            msg = MIMEMultipart('mixed')
            msg['From'] = self.from_email
            msg['To'] = to_email
            msg['Subject'] = f"0x.Day | Your {event_name} NFT Certificate is Ready"
            
            print(f"Preparing email for: {to_email} - {participant_name}")

            # HTML Email body with formatting
            html_body = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }}
        .header {{ background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%); color: white; padding: 30px 20px; text-align: center; border-radius: 10px 10px 0 0; }}
        .brand {{ font-size: 32px; font-weight: bold; margin-bottom: 5px; letter-spacing: 2px; color: #00ff7f; }}
        .content {{ padding: 30px 20px; background: white; }}
        .greeting {{ font-size: 20px; margin-bottom: 20px; color: #333; }}
        .section {{ margin: 25px 0; }}
        .section-title {{ font-size: 18px; font-weight: bold; color: #00cc66; margin-bottom: 15px; border-bottom: 2px solid #00cc66; padding-bottom: 5px; }}
        .info-box {{ background: #f0fff4; border-left: 4px solid #00cc66; padding: 15px; margin: 15px 0; border-radius: 5px; }}
        .highlight {{ background: #e6ffe6; padding: 15px; border-radius: 8px; margin: 10px 0; }}
        .contract-info {{ font-family: 'Courier New', monospace; font-size: 14px; background: #f0f0f0; padding: 10px; border-radius: 5px; word-break: break-all; }}
        .steps {{ background: #fff; }}
        .step {{ margin: 10px 0; padding: 10px; border-radius: 5px; }}
        .step-number {{ background: #00cc66; color: white; width: 25px; height: 25px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 10px; }}
        .wallet-section {{ background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 15px 0; }}
        .footer {{ background: #1a1a1a; color: white; padding: 25px 20px; text-align: center; border-radius: 0 0 10px 10px; }}
        .brand-footer {{ font-size: 24px; font-weight: bold; margin-bottom: 10px; color: #00ff7f; }}
        .disclaimer {{ font-size: 12px; color: #999; margin-top: 15px; }}
        .next-steps {{ background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%); color: white; padding: 20px; border-radius: 8px; margin: 20px 0; }}
        .attachment-box {{ background: #e6ffe6; border: 2px dashed #00cc66; padding: 15px; border-radius: 8px; text-align: center; margin: 15px 0; }}
    </style>
</head>
<body>
    <div class="header">
        <div class="brand">0x.Day</div>
    </div>
    
    <div class="content">
        <div class="greeting">Dear <strong>{participant_name}</strong>,</div>
        
        <div class="highlight">
            Your certificate for participating in <strong>{event_name}</strong> has been minted as an NFT and is ready for you to claim!
        </div>

        <div class="section">
            <div class="section-title">Proof of Attendance (PoA) NFT</div>
            <div class="info-box">
                <strong>You also received a PoA NFT for attending this event!</strong><br><br>
                <strong>PoA Contract Address:</strong><br>
                <div class="contract-info">{contract_address}</div><br>
                <strong>PoA Token ID:</strong> <span style="font-size: 18px; font-weight: bold; color: #ff6600;">{poa_token_id}</span><br>
                <strong>Note:</strong> Your PoA NFT was minted when you registered/attended the event.
            </div>
            
            <div class="wallet-section">
                <h4 style="color: #ff6600; margin-bottom: 15px;">Import Your PoA NFT (MetaMask):</h4>
                <div class="step">
                    <span class="step-number" style="background: #ff6600;">1</span> Open MetaMask → NFTs tab
                </div>
                <div class="step">
                    <span class="step-number" style="background: #ff6600;">2</span> Click "Import NFT"
                </div>
                <div class="step">
                    <span class="step-number" style="background: #ff6600;">3</span> Enter Contract Address: <code style="background: #fff0e6; padding: 2px 5px;">{contract_address}</code>
                </div>
                <div class="step">
                    <span class="step-number" style="background: #ff6600;">4</span> Enter Token ID: <strong>{poa_token_id}</strong>
                </div>
                <div class="step">
                    <span class="step-number" style="background: #ff6600;">5</span> Click "Import" - Your PoA logo should appear!
                </div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">Certificate Details</div>
            <div class="info-box">
                <strong>Event:</strong> {event_name}<br>
                <strong>Participant:</strong> {participant_name}<br>
                <strong>Certificate Type:</strong> NFT (Non-Fungible Token)
            </div>
        </div>

        <div class="section">
            <div class="section-title">NFT Information</div>
            <div class="info-box">
                <strong>Contract Address:</strong><br>
                <div class="contract-info">{contract_address}</div><br>
                <strong>Token ID:</strong> <span style="font-size: 18px; font-weight: bold; color: #00cc66;">{token_id}</span><br>
                <strong>Blockchain:</strong> Ethereum
            </div>
        </div>

        <div class="section">
            <div class="section-title">How to Add NFT to Your Wallet</div>
            
            <div class="wallet-section">
                <h4 style="color: #00cc66; margin-bottom: 15px;">For MetaMask Users:</h4>
                <div class="step">
                    <span class="step-number">1</span> Open your MetaMask wallet
                </div>
                <div class="step">
                    <span class="step-number">2</span> Navigate to the "NFTs" tab
                </div>
                <div class="step">
                    <span class="step-number">3</span> Click "Import NFT"
                </div>
                <div class="step">
                    <span class="step-number">4</span> Enter Contract Address: <code style="background: #f0f0f0; padding: 2px 5px; border-radius: 3px;">{contract_address}</code>
                </div>
                <div class="step">
                    <span class="step-number">5</span> Enter Token ID: <strong>{token_id}</strong>
                </div>
                <div class="step">
                    <span class="step-number">6</span> Click "Import"
                </div>
            </div>

            <div class="wallet-section">
                <h4 style="color: #00cc66; margin-bottom: 15px;">For Other Wallet Users:</h4>
                <div class="step">
                    <span class="step-number">1</span> Look for "Add NFT" or "Import Token" option in your wallet
                </div>
                <div class="step">
                    <span class="step-number">2</span> Select "NFT" or "ERC-721" token type
                </div>
                <div class="step">
                    <span class="step-number">3</span> Enter the contract address and token ID provided above
                </div>
                <div class="step">
                    <span class="step-number">4</span> Follow your wallet's import process
                </div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">Certificate Attachment</div>
            <div class="attachment-box">
                <strong>Your certificate is attached as a JPG image for your records</strong><br>
                <small>Save this file for offline access to your certificate</small>
            </div>
        </div>

        <div class="next-steps">
            <div style="font-size: 18px; font-weight: bold; margin-bottom: 15px;">Next Steps</div>
            <div class="step" style="color: white;">
                <span class="step-number" style="background: rgba(255,165,0,0.8);">1</span> Import your PoA NFT using the instructions above
            </div>
            <div class="step" style="color: white;">
                <span class="step-number" style="background: rgba(255,255,255,0.2);">2</span> Add the Certificate NFT to your wallet using the instructions above
            </div>
            <div class="step" style="color: white;">
                <span class="step-number" style="background: rgba(255,255,255,0.2);">3</span> Share your certificates on social media platforms
            </div>
            <div class="step" style="color: white;">
                <span class="step-number" style="background: rgba(255,255,255,0.2);">4</span> Keep these NFTs as proof of your participation and achievement
            </div>
        </div>

        <div style="text-align: center; margin: 30px 0; font-size: 16px;">
            Thank you for being part of <strong>{event_name}</strong>!
        </div>
    </div>

    <div class="footer">
        <div class="brand-footer">0x.Day</div>
        
        <div class="disclaimer">
            This is an automated message. Please do not reply to this email.<br>
            For assistance or inquiries, please contact the event organizers.
        </div>
    </div>
</body>
</html>
            """

            # Create plain text version for compatibility
            plain_body = f"""
Dear {participant_name},

Your certificate for participating in {event_name} has been minted as an NFT and is ready for you to claim.

Proof of Attendance (PoA) NFT
You also received a PoA NFT for attending this event!

PoA Contract Address: {contract_address}
PoA Token ID: {poa_token_id}
Note: Your PoA NFT was minted when you registered/attended the event.

Import Your PoA NFT (MetaMask):
1. Open MetaMask → NFTs tab
2. Click "Import NFT"
3. Enter Contract Address: {contract_address}
4. Enter Token ID: {poa_token_id}
5. Click "Import" - Your PoA logo should appear!

Certificate Details
Event: {event_name}
Participant: {participant_name} 
Certificate Type: NFT (Non-Fungible Token)

NFT Information
Contract Address: {contract_address}
Token ID: {token_id}
Blockchain: Ethereum

How to Add NFT to Your Wallet

For MetaMask Users:
1. Open your MetaMask wallet
2. Navigate to the "NFTs" tab
3. Click "Import NFT"
4. Enter Contract Address: {contract_address}
5. Enter Token ID: {token_id}
6. Click "Import"

For Other Wallet Users:
1. Look for "Add NFT" or "Import Token" option in your wallet
2. Select "NFT" or "ERC-721" token type
3. Enter the contract address and token ID provided above
4. Follow your wallet's import process

Certificate Attachment
Your certificate is also attached as a JPG image for your records.

Next Steps
1. Import your PoA NFT using the instructions above
2. Add the Certificate NFT to your wallet using the instructions above
3. Share your certificates on social media platforms
4. Keep these NFTs as proof of your participation and achievement

Thank you for being part of {event_name}.

Best regards,
0x.Day

This is an automated message. Please do not reply to this email.
For assistance or inquiries, please contact the event organizers.
            """

            # Attach HTML version only to avoid duplicate emails
            msg.attach(MIMEText(html_body, 'html'))

            # Attach certificate file (if provided)
            if certificate_path and os.path.exists(certificate_path):
                with open(certificate_path, "rb") as attachment:
                    # Use proper MIME type for JPEG images
                    part = MIMEBase('image', 'jpeg')
                    part.set_payload(attachment.read())
                    encoders.encode_base64(part)
                    
                    # Clean filename and proper header
                    filename = os.path.basename(certificate_path)
                    part.add_header(
                        'Content-Disposition',
                        f'attachment; filename="{filename}"'
                    )
                    part.add_header('Content-ID', f'<{filename}>')
                    msg.attach(part)
                    print(f"Certificate attached: {certificate_path} ({os.path.getsize(certificate_path)} bytes)")
            elif certificate_path:
                print(f"Certificate file not found: {certificate_path}")
            else:
                print("No certificate attachment for resend email")

            # Send email
            print(f"Sending email to: {to_email}")
            server = smtplib.SMTP(self.smtp_host, self.smtp_port)
            server.starttls()
            server.login(self.smtp_user, self.smtp_pass)
            text = msg.as_string()
            server.sendmail(self.from_email, [to_email], text)  # Ensure to_email is a list
            server.quit()
            print(f"Email successfully sent to: {to_email}")
            
            # Mark email as sent to prevent future duplicates
            self._mark_email_as_sent(to_email, participant_name, event_name, token_id)

            return {"success": True, "message": f"Email sent to {to_email}"}

        except Exception as e:
            return {"success": False, "error": str(e)}

    def send_bulk_certificate_emails(self, participants_data, event_name, contract_address):
        """Send certificate emails to multiple participants"""
        results = []
        sent_emails = set()  # Track sent emails to prevent duplicates
        
        for participant in participants_data:
            # Check for duplicates
            email_key = f"{participant['email']}_{participant['name']}_{event_name}"
            if email_key in sent_emails:
                print(f"Skipping duplicate email for: {participant['email']}")
                results.append({
                    "email": participant['email'],
                    "name": participant['name'],
                    "result": {"success": False, "error": "Duplicate email prevented"}
                })
                continue
            
            sent_emails.add(email_key)
            result = self.send_certificate_email(
                to_email=participant['email'],
                participant_name=participant['name'],
                event_name=event_name,
                certificate_path=participant['certificate_path'],
                contract_address=contract_address,
                token_id=participant['token_id'],
                poa_token_id=participant.get('poa_token_id')  # Add PoA token ID
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
        contract_address="0xF55562677316D7620d5eBeE2D9691a7CE3485740",
        token_id="1"
    )
    
    print("Email result:", result)