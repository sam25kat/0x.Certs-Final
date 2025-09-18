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

class FontTestGenerator:
    def __init__(self):
        self.template_path = "../certificate_template/Dark Grey and White Elegant Appreciation Certificate.pdf"
        self.output_dir = "certificates"
        os.makedirs(self.output_dir, exist_ok=True)
    
    def format_date(self, date_string):
        """Convert various date formats to readable format like '15 Jan 2025'"""
        try:
            date_formats = [
                "%Y-%m-%d",           # 2025-01-15
                "%m/%d/%Y",           # 01/15/2025  
                "%d/%m/%Y",           # 15/01/2025
                "%B %d, %Y",          # January 15, 2025
                "%Y-%m-%d %H:%M:%S",  # 2025-01-15 10:30:00
                "%m-%d-%Y",           # 01-15-2025
            ]
            
            for date_format in date_formats:
                try:
                    parsed_date = datetime.strptime(date_string.strip(), date_format)
                    return parsed_date.strftime("%d %b %Y")  # Format as "15 Jan 2025"
                except ValueError:
                    continue
            
            return date_string
            
        except Exception:
            return date_string

    def generate_certificate_with_font(self, participant_name, event_name, event_date, font_name, font_paths, font_sizes):
        """Generate certificate with specific font"""
        try:
            formatted_date = self.format_date(event_date)
            
            doc = fitz.open(self.template_path)
            page = doc[0]
            
            mat = fitz.Matrix(2.0, 2.0)
            pix = page.get_pixmap(matrix=mat)
            img_data = pix.tobytes("png")
            
            image = Image.open(BytesIO(img_data))
            draw = ImageDraw.Draw(image)
            
            # Try to load the specified font
            try:
                name_font = ImageFont.truetype(font_paths[0], font_sizes[0])
                event_font = ImageFont.truetype(font_paths[1], font_sizes[1]) 
                date_font = ImageFont.truetype(font_paths[2], font_sizes[2])
            except:
                # Fallback to default
                name_font = ImageFont.load_default()
                event_font = ImageFont.load_default()
                date_font = ImageFont.load_default()
            
            width, height = image.size
            
            # Position text
            name_x = int(width * 0.50)
            name_y = int(height * 0.50)
            draw.text((name_x, name_y), participant_name, font=name_font, fill="white", anchor="mm")
            
            event_x = int(width * 0.62)
            event_y = int(height * 0.58)
            draw.text((event_x, event_y), event_name, font=event_font, fill="white", anchor="mm")
            
            date_x = int(width * 0.62)
            date_y = int(height * 0.63)
            draw.text((date_x, date_y), formatted_date, font=date_font, fill="white", anchor="mm")
            
            # Save with font name in filename
            output_filename = f"John_Doe_{font_name}_certificate.jpg"
            output_path = os.path.join(self.output_dir, output_filename)
            
            if image.mode == 'RGBA':
                rgb_image = Image.new('RGB', image.size, (255, 255, 255))
                rgb_image.paste(image, mask=image.split()[-1])
                image = rgb_image
            
            image.save(output_path, "JPEG", quality=95)
            doc.close()
            
            return {
                "success": True,
                "file_path": output_path,
                "filename": output_filename,
                "font_used": font_name
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "font_used": font_name
            }

# Test all 3 fonts
if __name__ == "__main__":
    generator = FontTestGenerator()
    
    # Font configurations: [font_path, sizes: [name, event, date]]
    font_configs = [
        {
            "name": "PerfectPixel",
            "paths": ["fonts/PerfectPixel.ttf"] * 3,
            "sizes": [48, 30, 24]
        },
        {
            "name": "PixelMix", 
            "paths": ["fonts/PixelMix.ttf"] * 3,
            "sizes": [52, 32, 26]
        },
        {
            "name": "PressStart2P",
            "paths": ["fonts/PressStart2P.ttf"] * 3, 
            "sizes": [40, 25, 20]
        }
    ]
    
    for config in font_configs:
        print(f"\nGenerating certificate with {config['name']} font...")
        result = generator.generate_certificate_with_font(
            participant_name="John Doe",
            event_name="Blockchain Hackathon 2025", 
            event_date="2025-09-08",
            font_name=config["name"],
            font_paths=config["paths"],
            font_sizes=config["sizes"]
        )
        print(f"Result: {result}")