from email_service import EmailService
import os

# Test bulk email functionality
email_service = EmailService()

# Create test participant data
participants_data = [
    {
        "name": "Sameer Katte",
        "email": "sameerkatte@gmail.com", 
        "certificate_path": "certificates/Sameer_Katte_QWERTY999_certificate.jpg",
        "token_id": "6"
    }
]

print("Testing bulk email functionality...")
print(f"Participants: {len(participants_data)}")

# Test bulk email sending
results = email_service.send_bulk_certificate_emails(
    participants_data=participants_data,
    event_name="QWERTY999",
    contract_address="0xf55562677316d7620d5ebee2d9691a7ce3485740"
)

print("\nBulk email results:")
for result in results:
    print(f"  {result['email']}: {result['result']}")

print("\nTesting duplicate prevention - sending same batch again:")
results2 = email_service.send_bulk_certificate_emails(
    participants_data=participants_data,
    event_name="QWERTY999", 
    contract_address="0xf55562677316d7620d5ebee2d9691a7ce3485740"
)

print("Second batch results:")
for result in results2:
    print(f"  {result['email']}: {result['result']}")