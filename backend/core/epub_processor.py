"""EPUB Processor - Extract text from EPUB files"""
import html
from pathlib import Path
from typing import Optional

import ebooklib
from ebooklib import epub
from bs4 import BeautifulSoup
from loguru import logger


class EPUBProcessor:
    """EPUB File Processor"""
    
    def extract_text(self, epub_file: str | Path) -> Optional[str]:
        """
        Extract text content from EPUB file
        
        Args:
            epub_file: EPUB file path
            
        Returns:
            Extracted text if successful, None otherwise
        """
        try:
            epub_path = Path(epub_file)
            if not epub_path.exists():
                logger.error(f"EPUB file not found: {epub_path}")
                return None
            
            logger.debug(f"Reading EPUB file: {epub_path.name}")
            book = epub.read_epub(str(epub_path))
            
            # Extract text from all items
            text_parts = []
            
            for item in book.get_items():
                if item.get_type() == ebooklib.ITEM_DOCUMENT:
                    # Parse HTML content
                    content = item.get_content().decode('utf-8', errors='ignore')
                    soup = BeautifulSoup(content, 'html.parser')
                    
                    # Remove script and style elements
                    for script in soup(["script", "style"]):
                        script.decompose()
                    
                    # Get text
                    text = soup.get_text()
                    
                    # Clean up whitespace
                    lines = (line.strip() for line in text.splitlines())
                    chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
                    text = '\n'.join(chunk for chunk in chunks if chunk)
                    
                    if text:
                        text_parts.append(text)
            
            if not text_parts:
                logger.warning("No text content found in EPUB")
                return None
            
            full_text = '\n\n'.join(text_parts)
            logger.info(f"EPUB text extracted: {len(full_text)} characters")
            return full_text
            
        except Exception as e:
            logger.exception(f"Error extracting EPUB text: {e}")
            return None
    
    def get_metadata(self, epub_file: str | Path) -> dict:
        """
        Get EPUB metadata
        
        Args:
            epub_file: EPUB file path
            
        Returns:
            Metadata dictionary
        """
        try:
            epub_path = Path(epub_file)
            book = epub.read_epub(str(epub_path))
            
            metadata = {
                'title': book.get_metadata('DC', 'title'),
                'author': book.get_metadata('DC', 'creator'),
                'language': book.get_metadata('DC', 'language'),
                'publisher': book.get_metadata('DC', 'publisher'),
            }
            
            return metadata
            
        except Exception as e:
            logger.exception(f"Error getting EPUB metadata: {e}")
            return {}


# Global processor instance
epub_processor = EPUBProcessor()

