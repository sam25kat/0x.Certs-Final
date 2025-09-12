import os
import json
import requests
from PIL import Image, ImageDraw, ImageFont
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from io import BytesIO
import fitz  # PyMuPDF for PDF processing
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()

class CertificateGenerator:
    def __init__(self):
        # Use absolute paths relative to this file's directory
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        self.default_template_path = os.path.join(base_dir, "certificate_template", "default.pdf")
        self.template_dir = os.path.join(base_dir, "certificate_template")
        self.output_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "certificates")
        self.pinata_api_key = os.getenv("PINATA_API_KEY")
        self.pinata_secret = os.getenv("PINATA_SECRET_API_KEY")
        self.pinata_jwt = os.getenv("PINATA_JWT")
        
        # Create output directory if it doesn't exist
        os.makedirs(self.output_dir, exist_ok=True)
    
    def format_date(self, date_string):
        """Convert various date formats to readable format like 'January 15, 2025'"""
        try:
            # Try to parse common date formats
            date_formats = [
                "%Y-%m-%d",           # 2025-01-15
                "%m/%d/%Y",           # 01/15/2025  
                "%d/%m/%Y",           # 15/01/2025
                "%B %d, %Y",          # January 15, 2025 (already formatted)
                "%Y-%m-%d %H:%M:%S",  # 2025-01-15 10:30:00
                "%m-%d-%Y",           # 01-15-2025
            ]
            
            for date_format in date_formats:
                try:
                    parsed_date = datetime.strptime(date_string.strip(), date_format)
                    return parsed_date.strftime("%d %b %Y")  # Format as "15 Jan 2025"
                except ValueError:
                    continue
            
            # If no format matches, return the original string
            return date_string
            
        except Exception:
            # Fallback to original string if anything goes wrong
            return date_string

    def generate_certificate(self, participant_name, event_name, event_date, participant_email, team_name="", template_filename=None):
        """Generate a personalized certificate"""
        try:
            # Format the date to be more readable
            formatted_date = self.format_date(event_date)
            
            # Determine template path
            if template_filename:
                template_path = os.path.join(self.template_dir, template_filename)
                if not os.path.exists(template_path):
                    print(f"Template {template_filename} not found, using default")
                    template_path = self.default_template_path
            else:
                template_path = self.default_template_path
            
            # Check if template exists
            if not os.path.exists(template_path):
                return {
                    'success': False,
                    'error': f'Template file not found: {template_path}'
                }
            
            # Open the PDF template
            doc = fitz.open(template_path)
            page = doc[0]  # First page
            
            # Convert PDF page to image
            mat = fitz.Matrix(2.0, 2.0)  # High resolution
            pix = page.get_pixmap(matrix=mat)
            img_data = pix.tobytes("png")
            
            # Load as PIL image
            image = Image.open(BytesIO(img_data))
            draw = ImageDraw.Draw(image)
            
            # Font settings - using RetroPixel font
            try:
                # Try RetroPixel font (retro pixel style)
                name_font = ImageFont.truetype("fonts/RetroPixel.ttf", 55)
                event_font = ImageFont.truetype("fonts/RetroPixel.ttf", 35) 
                date_font = ImageFont.truetype("fonts/RetroPixel.ttf", 28)
            except:
                try:
                    # Try PerfectPixel font (very compact pixel font)
                    name_font = ImageFont.truetype("fonts/PerfectPixel.ttf", 48)
                    event_font = ImageFont.truetype("fonts/PerfectPixel.ttf", 30) 
                    date_font = ImageFont.truetype("fonts/PerfectPixel.ttf", 24)
                except:
                    try:
                        # Try Press Start 2P font (classic arcade pixel font)
                        name_font = ImageFont.truetype("fonts/PressStart2P.ttf", 40)
                        event_font = ImageFont.truetype("fonts/PressStart2P.ttf", 25) 
                        date_font = ImageFont.truetype("fonts/PressStart2P.ttf", 20)
                    except:
                        try:
                            # Fallback to arial
                            name_font = ImageFont.truetype("arial.ttf", 80)
                            event_font = ImageFont.truetype("arial.ttf", 50) 
                            date_font = ImageFont.truetype("arial.ttf", 40)
                        except:
                            # Final fallback to default font
                            name_font = ImageFont.load_default()
                            event_font = ImageFont.load_default()
                            date_font = ImageFont.load_default()
            
            # Get image dimensions
            width, height = image.size
            
            # Position text precisely on the blank lines in your certificate template
            # Participant name goes on the underline after "Proudly presented to"
            name_x = int(width * 0.50)  # Center horizontally (moved 1 point left)
            name_y = int(height * 0.51)  # Position on the first underline (moved 1 point down)
            draw.text((name_x, name_y), participant_name, font=name_font, fill="white", anchor="mm")
            
            # Event name goes on the underline after "for participating in the"
            event_x = int(width * 0.61)  # Position after "for participating in the" (moved 1 point left)
            event_y = int(height * 0.58)  # Position on the second underline (moved 2 points down)
            draw.text((event_x, event_y), event_name, font=event_font, fill="white", anchor="mm")
            
            # Date goes on the underline after "held on"
            date_x = int(width * 0.61)  # Position after "held on" (moved 1 point left)
            date_y = int(height * 0.63)  # Position on the third underline (moved 2 points down)
            draw.text((date_x, date_y), formatted_date, font=date_font, fill="white", anchor="mm")
            
            # Save as JPG
            output_filename = f"{participant_name.replace(' ', '_')}_{event_name.replace(' ', '_')}_certificate.jpg"
            output_path = os.path.join(self.output_dir, output_filename)
            
            # Convert RGBA to RGB if needed
            if image.mode == 'RGBA':
                rgb_image = Image.new('RGB', image.size, (255, 255, 255))
                rgb_image.paste(image, mask=image.split()[-1])
                image = rgb_image
            
            image.save(output_path, "JPEG", quality=95)
            
            doc.close()
            
            return {
                "success": True,
                "file_path": output_path,
                "filename": output_filename
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

    def upload_to_ipfs(self, file_path, metadata):
        """Upload certificate to IPFS via Pinata"""
        try:
            # Upload image file
            with open(file_path, 'rb') as f:
                files = {
                    'file': (os.path.basename(file_path), f, 'image/jpeg')
                }
                
                headers = {
                    'pinata_api_key': self.pinata_api_key,
                    'pinata_secret_api_key': self.pinata_secret
                }
                
                response = requests.post(
                    'https://api.pinata.cloud/pinning/pinFileToIPFS',
                    files=files,
                    headers=headers
                )
                
                if response.status_code == 200:
                    ipfs_hash = response.json()['IpfsHash']
                    image_url = f"https://gateway.pinata.cloud/ipfs/{ipfs_hash}"
                    
                    # Create NFT metadata
                    nft_metadata = {
                        "name": f"{metadata['event_name']} - Participation Certificate",
                        "description": f"Certificate of participation for {metadata['event_name']} event issued to {metadata['participant_name']}",
                        "image": image_url,
                        "attributes": [
                            {"trait_type": "Type", "value": "Certificate"},
                            {"trait_type": "Event", "value": metadata['event_name']},
                            {"trait_type": "Participant", "value": metadata['participant_name']},
                            {"trait_type": "Date", "value": metadata['event_date']},
                            {"trait_type": "Team", "value": metadata.get('team_name', 'N/A')}
                        ]
                    }
                    
                    # Upload metadata to IPFS
                    metadata_response = requests.post(
                        'https://api.pinata.cloud/pinning/pinJSONToIPFS',
                        headers={
                            'Content-Type': 'application/json',
                            'pinata_api_key': self.pinata_api_key,
                            'pinata_secret_api_key': self.pinata_secret
                        },
                        json={
                            'pinataContent': nft_metadata,
                            'pinataMetadata': {
                                'name': f"{metadata['participant_name']}_certificate_metadata"
                            }
                        }
                    )
                    
                    if metadata_response.status_code == 200:
                        metadata_hash = metadata_response.json()['IpfsHash']
                        
                        return {
                            "success": True,
                            "image_hash": ipfs_hash,
                            "image_url": image_url,
                            "metadata_hash": metadata_hash,
                            "metadata_url": f"https://gateway.pinata.cloud/ipfs/{metadata_hash}"
                        }
                
                return {
                    "success": False,
                    "error": f"IPFS upload failed: {response.text}"
                }
                
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

# Test function
if __name__ == "__main__":
    generator = CertificateGenerator()
    
    # Test certificate generation with YYYY-MM-DD format
    result = generator.generate_certificate(
        participant_name="John Doe",
        event_name="Blockchain Hackathon 2025",
        event_date="2025-09-08",  # Testing with YYYY-MM-DD format
        participant_email="john@example.com"
    )
    
    print("Certificate generation result:", result)
    
    if result["success"]:
        # Test IPFS upload
        ipfs_result = generator.upload_to_ipfs(
            result["file_path"],
            {
                "participant_name": "John Doe",
                "event_name": "Blockchain Hackathon 2025",
                "event_date": "January 15, 2025"
            }
        )
        print("IPFS upload result:", ipfs_result)