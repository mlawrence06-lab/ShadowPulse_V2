import sys
from PIL import Image, ImageChops

input_path = r"c:\Users\martin\.gemini\antigravity\brain\405205f4-9e44-47f1-b444-4767306522ef\media__1771038094640.png"
output_path = r"c:\Users\martin\.gemini\antigravity\brain\405205f4-9e44-47f1-b444-4767306522ef\fluidbody_logo_512.png"

try:
    img = Image.open(input_path).convert("RGBA")
    
    # Work on RGB copy for difference to avoid alpha issues
    rgb_img = img.convert("RGB")
    
    bg_color = rgb_img.getpixel((0, 0))
    print(f"Top-left pixel (RGB): {bg_color}")
    
    # Create background image 
    bg = Image.new("RGB", img.size, bg_color)
    diff = ImageChops.difference(rgb_img, bg)
    
    # Invert diff? No, difference is abs(a-b). 0 means match.
    # We want non-zero.
    
    # Add a threshold?
    # Convert diff to grayscale to check values
    diff = ImageChops.add(diff, diff, 2.0, -100) # Enhance contrast
    bbox = diff.getbbox()
    
    if bbox:
        print(f"Found bbox: {bbox}")
        # Crop original image with this bbox
        img = img.crop(bbox)
    else:
        print("Bbox not found with precise match. Trying thresholding.")
        # Threshold approach
        # Convert to grayscale
        gray = ImageChops.difference(rgb_img, bg).convert("L")
        # Let's say tolerance is 10
        # point(lambda x: 255 if x > 10 else 0)
        mask = gray.point(lambda x: 255 if x > 20 else 0)
        bbox = mask.getbbox()
        if bbox:
             print(f"Found bbox with threshold 20: {bbox}")
             img = img.crop(bbox)
        else:
             print("Still empty. Using center crop fallback.")
             w, h = img.size
             img = img.crop((w//4, h//4, 3*w//4, 3*h//4))

    # Resize to fit 512x512
    target_size = 512
    ratio = min(target_size / img.width, target_size / img.height)
    new_w = int(img.width * ratio)
    new_h = int(img.height * ratio)
    
    img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
    
    # Create final transparent canvas
    final = Image.new("RGBA", (target_size, target_size), (0, 0, 0, 0))
    x = (target_size - new_w) // 2
    y = (target_size - new_h) // 2
    final.paste(img, (x, y))
    
    final.save(output_path, "PNG")
    print(f"Saved to {output_path}")

except Exception as e:
    print(f"Error: {e}")
