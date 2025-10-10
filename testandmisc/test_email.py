from email_service import EmailService
import os

# Test the updated email template with real certificate
email_service = EmailService()

# Use the actual certificate file that exists
cert_path = "certificates/Sameer_Katte_QWERTY999_certificate.jpg"

print(f"Testing with certificate: {cert_path}")
print(f"File exists: {os.path.exists(cert_path)}")
if os.path.exists(cert_path):
    print(f"File size: {os.path.getsize(cert_path)} bytes")

result = email_service.send_certificate_email(
    to_email="sameerkatte@gmail.com",
    participant_name="Sameer Katte", 
    event_name="QWERTY999",
    certificate_path=cert_path,
    contract_address="0x96A4A39ae899cf43eEBDC980D0B87a07bc9211d7",
    token_id="6"
)

print("Email test result:", result)