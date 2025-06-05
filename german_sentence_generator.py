import os
import pandas as pd
import openai
import time
import requests
from urllib.parse import quote
import re
from typing import Optional
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from PIL import Image
import io
from gtts import gTTS
import pygame
from io import BytesIO

class GermanSentenceGenerator:
    def __init__(self, excel_path: str):
        self.excel_path = excel_path
        self.api_key = os.getenv("OPENAI_API_KEY")  # Replace with your OpenAI API key
        self.setup_api()
        self.create_images_folder()
        self.create_audio_folder()
        self.setup_driver()
        
    def setup_driver(self):
        """Remove WebDriver setup since we're not using it anymore"""
        print("📱 Using API-based image download instead of web scraping")
        self.driver = None

    def setup_api(self):
        """Configure the OpenAI API"""
        openai.api_key = self.api_key
        self.client = openai.OpenAI(api_key=self.api_key)
        
    def create_images_folder(self):
        """Create images folder if it doesn't exist"""
        self.images_folder = os.path.join(os.path.dirname(self.excel_path), "word_images")
        if not os.path.exists(self.images_folder):
            os.makedirs(self.images_folder)
            print(f"Created images folder: {self.images_folder}")
    
    def create_audio_folder(self):
        """Create audio folder if it doesn't exist"""
        self.audio_folder = os.path.join(os.path.dirname(self.excel_path), "word_audio")
        if not os.path.exists(self.audio_folder):
            os.makedirs(self.audio_folder)
            print(f"Created audio folder: {self.audio_folder}")
    
    def generate_pronunciation(self, word: str) -> Optional[str]:
        """Generate accurate IPA pronunciation for German words using ChatGPT"""
        
        prompt = f"""
        Generate the accurate IPA (International Phonetic Alphabet) pronunciation for the German word "{word}".
        
        Requirements:
        - Use standard German pronunciation rules
        - Provide only the IPA transcription in forward slashes, like /ˈvɔʁt/
        - Be precise with German phonemes (ɛ, œ, ʏ, ʊ, ɔ, a, etc.)
        - Include stress marks (ˈ for primary stress)
        - If it's a compound word, show the pronunciation for the whole word
        - Return only the IPA transcription, nothing else
        
        German word: {word}
        IPA pronunciation:
        """
        
        try:
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are a German linguistics expert specializing in phonetic transcription. Provide accurate IPA pronunciations for German words."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=100,
                temperature=0.1
            )
            
            pronunciation = response.choices[0].message.content.strip()
            
            # Clean up the response to ensure it's just the IPA
            pronunciation = re.sub(r'^[^\[/]*[\[/]', '/', pronunciation)
            pronunciation = re.sub(r'[\]/][^\]/]*$', '/', pronunciation)
            
            if not pronunciation.startswith('/'):
                pronunciation = '/' + pronunciation
            if not pronunciation.endswith('/'):
                pronunciation = pronunciation + '/'
                
            return pronunciation
            
        except Exception as e:
            print(f"Error generating pronunciation for '{word}': {e}")
            return None
    
    def generate_sentence(self, word: str, level: str, translation: str) -> Optional[str]:
        """Generate a level-appropriate German sentence for the given word"""
        
        level_instructions = {
            "A1": "sehr einfach, kurze Sätze, Präsens, einfache Wörter",
            "A2": "einfach, etwas längere Sätze, Präsens und Perfekt, alltägliche Wörter", 
            "B1": "mittleres Niveau, komplexere Sätze, verschiedene Zeiten, erweiterte Wörter"
        }
        
        instruction = level_instructions.get(level, level_instructions["A1"])
        
        prompt = f"""
        Erstelle einen deutschen Beispielsatz für das Wort "{word}" (Bedeutung: {translation}).
        
        Anforderungen:
        - Sprachniveau: {level} ({instruction})
        - Der Satz soll das Wort "{word}" enthalten
        - Natürlich und grammatisch korrekt
        - Passend zum {level}-Niveau
        - Nur den Satz zurückgeben, keine Erklärungen
        
        Beispielsatz:
        """
        
        try:
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are a German language teacher creating example sentences for language learners."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=150,
                temperature=0.3
            )
            
            sentence = response.choices[0].message.content.strip()
            # Remove quotes if present
            if sentence.startswith('"') and sentence.endswith('"'):
                sentence = sentence[1:-1]
            return sentence
        except Exception as e:
            print(f"Error generating sentence for '{word}': {e}")
            return None
    
    def search_and_download_image(self, word: str, english_word: str) -> Optional[str]:
        """Download relevant images using multiple free APIs"""
        try:
            # Method 1: Try The Noun Project API for icons (simple illustrations)
            icon_path = self.download_from_noun_project(english_word, word)
            if icon_path:
                return icon_path
            
            # Method 2: Try Pexels API for photos
            photo_path = self.download_from_pexels(english_word, word)
            if photo_path:
                return photo_path
            
            # Method 3: Generate a simple illustrated placeholder
            return self.create_illustrated_placeholder(word, english_word)
            
        except Exception as e:
            print(f"❌ Error in image search: {e}")
            return self.create_illustrated_placeholder(word, english_word)
    
    def download_from_noun_project(self, english_word: str, german_word: str) -> Optional[str]:
        """Download icon from The Noun Project (free tier)"""
        try:
            # The Noun Project API (you can get a free API key)
            # For demo, using their public preview URLs
            search_url = f"https://api.thenounproject.com/icon/{quote(english_word)}"
            
            # Alternative: Use iconify API which is completely free
            iconify_url = f"https://api.iconify.design/search?query={quote(english_word)}&limit=1"
            
            response = requests.get(iconify_url, timeout=10)
            if response.status_code == 200:
                data = response.json()
                if data.get('icons'):
                    icon_name = data['icons'][0]
                    # Get the SVG icon
                    svg_url = f"https://api.iconify.design/{icon_name}.svg?height=300&width=300"
                    
                    svg_response = requests.get(svg_url, timeout=10)
                    if svg_response.status_code == 200:
                        # Convert SVG to PNG using cairosvg
                        try:
                            import cairosvg
                            from io import BytesIO
                            
                            png_data = cairosvg.svg2png(bytestring=svg_response.content, 
                                                      output_width=300, output_height=300)
                            
                            # Save the PNG
                            safe_word = re.sub(r'[^\w\-_.]', '_', german_word)
                            filename = f"{safe_word}_icon.png"
                            filepath = os.path.join(self.images_folder, filename)
                            
                            with open(filepath, 'wb') as f:
                                f.write(png_data)
                            
                            print(f"✅ Downloaded icon: {filename}")
                            return filepath
                            
                        except ImportError:
                            print("⚠️ cairosvg not available for SVG conversion")
                        except Exception as e:
                            print(f"⚠️ SVG conversion failed: {e}")
            
        except Exception as e:
            print(f"⚠️ Icon download failed: {e}")
        
        return None
    
    def download_from_pexels(self, english_word: str, german_word: str) -> Optional[str]:
        """Download photo from Pexels API (free)"""
        try:
            # Pexels API (free but requires API key)
            # You can get a free API key from pexels.com/api
            pexels_api_key = "yrfjFz7Uqm3e9xK47qulVULHkxnAR1XQTJ2XTEUpcDd3OyxoSlIdRwp4"
            
            headers = {
                'Authorization': pexels_api_key
            }
            
            search_url = f"https://api.pexels.com/v1/search?query={quote(english_word)}&per_page=1&size=medium"
            
            response = requests.get(search_url, headers=headers, timeout=10)
            if response.status_code == 200:
                data = response.json()
                if data.get('photos'):
                    photo_url = data['photos'][0]['src']['medium']
                    
                    img_response = requests.get(photo_url, timeout=15)
                    if img_response.status_code == 200:
                        safe_word = re.sub(r'[^\w\-_.]', '_', german_word)
                        filename = f"{safe_word}_photo.jpg"
                        filepath = os.path.join(self.images_folder, filename)
                        
                        with open(filepath, 'wb') as f:
                            f.write(img_response.content)
                        
                        print(f"✅ Downloaded photo: {filename}")
                        return filepath
            
        except Exception as e:
            print(f"⚠️ Photo download failed: {e}")
        
        return None
    
    def create_illustrated_placeholder(self, word: str, english_word: str) -> Optional[str]:
        """Create an enhanced placeholder with better visual design"""
        try:
            from PIL import Image, ImageDraw, ImageFont
            import random
            
            # Create a colorful background based on word category
            colors = [
                (52, 152, 219),   # Blue
                (46, 204, 113),   # Green  
                (155, 89, 182),   # Purple
                (241, 196, 15),   # Yellow
                (230, 126, 34),   # Orange
                (231, 76, 60),    # Red
            ]
            
            # Choose color based on first letter
            color_index = ord(english_word[0].lower()) % len(colors)
            bg_color = colors[color_index]
            
            # Create image with gradient-like effect
            img = Image.new('RGB', (400, 300), bg_color)
            draw = ImageDraw.Draw(img)
            
            # Add a subtle pattern
            for i in range(0, 400, 20):
                for j in range(0, 300, 20):
                    if (i + j) % 40 == 0:
                        lighter_color = tuple(min(255, c + 30) for c in bg_color)
                        draw.rectangle([i, j, i+10, j+10], fill=lighter_color)
            
            # Try to load a better font
            try:
                font_large = ImageFont.truetype("arial.ttf", 32)
                font_small = ImageFont.truetype("arial.ttf", 24)
            except:
                font_large = ImageFont.load_default()
                font_small = ImageFont.load_default()
            
            # Add German word (main)
            german_bbox = draw.textbbox((0, 0), word, font=font_large)
            german_width = german_bbox[2] - german_bbox[0]
            german_x = (400 - german_width) // 2
            draw.text((german_x, 120), word, fill='white', font=font_large)
            
            # Add English word (smaller, below)
            english_text = f"({english_word})"
            english_bbox = draw.textbbox((0, 0), english_text, font=font_small)
            english_width = english_bbox[2] - english_bbox[0]
            english_x = (400 - english_width) // 2
            draw.text((english_x, 180), english_text, fill='lightgray', font=font_small)
            
            # Add decorative elements
            draw.ellipse([50, 50, 80, 80], fill='white', outline=None)
            draw.ellipse([320, 220, 350, 250], fill='white', outline=None)
            
            # Save the image
            safe_word = re.sub(r'[^\w\-_.]', '_', word)
            filename = f"{safe_word}_designed.jpg"
            filepath = os.path.join(self.images_folder, filename)
            img.save(filepath, 'JPEG', quality=90)
            
            print(f"✅ Created designed placeholder: {filename}")
            return filepath
            
        except Exception as e:
            print(f"❌ Error creating designed placeholder: {e}")
            return None

    def generate_voice_file(self, word: str) -> Optional[str]:
        """Generate voice file for German word using multiple TTS methods"""
        safe_word = re.sub(r'[^\w\-_.]', '_', word)
        filename = f"{safe_word}_voice.mp3"
        filepath = os.path.join(self.audio_folder, filename)
        
        # Skip if file already exists
        if os.path.exists(filepath):
            print(f"✅ Voice file already exists: {filename}")
            return filepath
        
        try:
            # Method 1: Try OpenAI TTS (most accurate)
            voice_path = self.generate_openai_voice(word, filepath)
            if voice_path:
                return voice_path
            
            # Method 2: Fallback to Google TTS
            voice_path = self.generate_google_voice(word, filepath)
            if voice_path:
                return voice_path
            
            print(f"❌ Failed to generate voice for '{word}'")
            return None
            
        except Exception as e:
            print(f"❌ Error generating voice file: {e}")
            return None
    
    def generate_openai_voice(self, word: str, filepath: str) -> Optional[str]:
        """Generate voice using OpenAI TTS (premium quality)"""
        try:
            response = self.client.audio.speech.create(
                model="tts-1",
                voice="alloy",  # You can use: alloy, echo, fable, onyx, nova, shimmer
                input=word,
                speed=0.9  # Slightly slower for learning
            )
            
            # Save the audio file
            with open(filepath, 'wb') as f:
                for chunk in response.iter_bytes():
                    f.write(chunk)
            
            print(f"✅ Generated OpenAI voice: {os.path.basename(filepath)}")
            return filepath
            
        except Exception as e:
            print(f"⚠️ OpenAI TTS failed: {e}")
            return None
    
    def generate_google_voice(self, word: str, filepath: str) -> Optional[str]:
        """Generate voice using Google TTS (free fallback)"""
        try:
            # Use German language for proper pronunciation
            tts = gTTS(text=word, lang='de', slow=False)
            tts.save(filepath)
            
            print(f"✅ Generated Google TTS voice: {os.path.basename(filepath)}")
            return filepath
            
        except Exception as e:
            print(f"⚠️ Google TTS failed: {e}")
            return None
    
    def test_voice_playback(self, filepath: str) -> bool:
        """Test if the generated voice file can be played"""
        try:
            pygame.mixer.init()
            pygame.mixer.music.load(filepath)
            # Don't actually play during processing, just test if it loads
            print(f"🔊 Voice file validated: {os.path.basename(filepath)}")
            return True
        except Exception as e:
            print(f"⚠️ Voice file validation failed: {e}")
            return False
        finally:
            try:
                pygame.mixer.quit()
            except:
                pass

    def process_excel(self, output_path: Optional[str] = None):
        """Process the Excel file and generate sentences, pronunciations, voice files and images"""
        try:
            # Read the Excel file
            df = pd.read_excel(self.excel_path)
            
            # Check if required columns exist
            required_columns = ['Wort', 'Übersetzung', 'Band']
            for col in required_columns:
                if col not in df.columns:
                    print(f"Error: Column '{col}' not found in Excel file")
                    return
            
            # Add sentence, pronunciation, voice and image columns if they don't exist
            if 'Sentence' not in df.columns:
                df['Sentence'] = ''
            if 'Pronunciation' not in df.columns:
                df['Pronunciation'] = ''
            if 'Voice_Path' not in df.columns:
                df['Voice_Path'] = ''
            if 'Image_Path' not in df.columns:
                df['Image_Path'] = ''
            
            # Count existing content
            existing_sentences = (df['Sentence'].notna() & (df['Sentence'] != '')).sum()
            existing_pronunciations = (df['Pronunciation'].notna() & (df['Pronunciation'] != '')).sum()
            existing_voices = (df['Voice_Path'].notna() & (df['Voice_Path'] != '')).sum()
            existing_images = (df['Image_Path'].notna() & (df['Image_Path'] != '')).sum()
            total_rows = len(df)
            
            print(f"Total rows: {total_rows}")
            print(f"Existing sentences: {existing_sentences}")
            print(f"Existing pronunciations: {existing_pronunciations}")
            print(f"Existing voice files: {existing_voices}")
            print(f"Existing images: {existing_images}")
            print(f"Rows to process: {total_rows - max(existing_sentences, existing_pronunciations, existing_voices, existing_images)}")
            print(f"Columns in DataFrame: {list(df.columns)}")
            
            # Process all rows, but skip those with existing content
            processed_count = 0
            for index, row in df.iterrows():
                english_word = str(row['Wort']).strip()
                german_word = str(row['Übersetzung']).strip()
                level = str(row['Band']).strip()
                
                has_sentence = pd.notna(row.get('Sentence')) and str(row['Sentence']).strip()
                has_pronunciation = pd.notna(row.get('Pronunciation')) and str(row['Pronunciation']).strip()
                has_voice = pd.notna(row.get('Voice_Path')) and str(row['Voice_Path']).strip()
                has_image = pd.notna(row.get('Image_Path')) and str(row['Image_Path']).strip()
                
                # Skip if all content already exists
                if has_sentence and has_pronunciation and has_voice and has_image:
                    continue
                
                print(f"\n--- Processing Row {index + 1} ---")
                print(f"English: '{english_word}' | German: '{german_word}' | Level: {level}")
                
                # Generate sentence if missing
                if not has_sentence:
                    print(f"🔄 Generating sentence for German word '{german_word}'...")
                    sentence = self.generate_sentence(german_word, level, english_word)
                    if sentence:
                        df.loc[index, 'Sentence'] = sentence
                        print(f"✅ Generated: {sentence}")
                    else:
                        print(f"❌ Failed to generate sentence for '{german_word}'")

                # Generate pronunciation if missing
                if not has_pronunciation:
                    print(f"🔄 Generating pronunciation for German word '{german_word}'...")
                    pronunciation = self.generate_pronunciation(german_word)
                    if pronunciation:
                        df.loc[index, 'Pronunciation'] = pronunciation
                        print(f"✅ Generated pronunciation: {pronunciation}")
                    else:
                        print(f"❌ Failed to generate pronunciation for '{german_word}'")

                # Generate voice file if missing
                if not has_voice:
                    print(f"🔄 Generating voice file for German word '{german_word}'...")
                    voice_path = self.generate_voice_file(german_word)
                    if voice_path:
                        df.loc[index, 'Voice_Path'] = voice_path
                        print(f"✅ Voice file saved to: {voice_path}")
                        # Test the voice file
                        self.test_voice_playback(voice_path)
                    else:
                        print(f"❌ Failed to generate voice file for '{german_word}'")
                
                # Screenshot image if missing
                if not has_image:
                    image_path = self.search_and_download_image(german_word, english_word)
                    if image_path:
                        df.loc[index, 'Image_Path'] = image_path
                        print(f"✅ Image saved to: {image_path}")
                    else:
                        print(f"❌ Failed to screenshot image for '{german_word}'")
                
                # Save after each row to avoid losing progress
                if not has_sentence or not has_pronunciation or not has_voice or not has_image:
                    df.to_excel(self.excel_path, index=False, engine='openpyxl')
                    print(f"💾 Saved to original file")
                    processed_count += 1
                
                # Add delay between searches
                time.sleep(2)
                
                # Stop after processing 250 rows for testing
                if processed_count >= 500:
                    print(f"\n🛑 Stopping after processing 250 rows")
                    break
            
            print(f"\n📊 Summary:")
            print(f"📊 Rows processed in this run: {processed_count}")
            final_sentences = (df['Sentence'].notna() & (df['Sentence'] != '')).sum()
            final_pronunciations = (df['Pronunciation'].notna() & (df['Pronunciation'] != '')).sum()
            final_voices = (df['Voice_Path'].notna() & (df['Voice_Path'] != '')).sum()
            final_images = (df['Image_Path'].notna() & (df['Image_Path'] != '')).sum()
            print(f"📊 Total sentences now in file: {final_sentences}")
            print(f"📊 Total pronunciations now in file: {final_pronunciations}")
            print(f"📊 Total voice files now in file: {final_voices}")
            print(f"📊 Total images now in file: {final_images}")
            print(f"✅ Changes saved to original file: {self.excel_path}")
            print(f"📁 Images saved in: {self.images_folder}")
            print(f"🔊 Voice files saved in: {self.audio_folder}")
                
        except Exception as e:
            print(f"Error processing Excel file: {e}")
        finally:
            # Clean up WebDriver
            if self.driver:
                self.driver.quit()
                print("🔚 WebDriver closed")

def main():
    # Path to your Excel file
    excel_file = r"C:\Users\ugury\Downloads\English Compass Wordlist A1_A2_B1 21 06 11.xlsx"
    # Create generator instance
    generator = GermanSentenceGenerator(excel_file)
    
    # Process the file
    generator.process_excel()

if __name__ == "__main__":
    main()
