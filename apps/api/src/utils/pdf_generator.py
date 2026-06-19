import os
from docx import Document
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

def convert_docx_to_pdf(docx_path: str, pdf_path: str):
    """
    Parses a DOCX file and converts it into a beautifully styled PDF resume.
    Preserves structural formatting (headings, bullet points, education, skills).
    """
    doc = Document(docx_path)
    
    # Setup document
    pdf_doc = SimpleDocTemplate(
        pdf_path,
        pagesize=letter,
        rightMargin=54,  # 0.75 in
        leftMargin=54,
        topMargin=54,
        bottomMargin=54
    )
    
    styles = getSampleStyleSheet()
    
    # Custom styles matching professional aesthetics
    title_style = ParagraphStyle(
        'ResumeTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=colors.HexColor('#121318'),
        alignment=1,  # Centered
        spaceAfter=6
    )
    
    contact_style = ParagraphStyle(
        'ResumeContact',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#4A4A4A'),
        alignment=1,  # Centered
        spaceAfter=15
    )
    
    heading_style = ParagraphStyle(
        'ResumeHeading',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor('#004A77'), # Darker blue/primary tone
        spaceBefore=12,
        spaceAfter=4,
        keepWithNext=True
    )
    
    body_style = ParagraphStyle(
        'ResumeBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#2A2B30'),
        spaceAfter=6
    )
    
    bullet_style = ParagraphStyle(
        'ResumeBullet',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13.5,
        textColor=colors.HexColor('#2A2B30'),
        leftIndent=15,
        firstLineIndent=-10,
        spaceAfter=4
    )
    
    story = []
    first_heading_found = False
    
    for i, p in enumerate(doc.paragraphs):
        text = p.text.strip()
        if not text:
            continue
            
        # Determine paragraph role based on index and styles
        if i == 0 and len(text) < 40 and not p.style.name.startswith("Heading"):
            story.append(Paragraph(text, title_style))
        elif i == 1 and ("email" in text.lower() or "@" in text or "|" in text) and not p.style.name.startswith("Heading"):
            story.append(Paragraph(text, contact_style))
        elif p.style.name.startswith("Heading") or (len(text) < 40 and text in ["Professional Experience", "Skills Summary", "Education", "Certifications", "Summary"]):
            if first_heading_found:
                story.append(Spacer(1, 4))
            first_heading_found = True
            story.append(Paragraph(text, heading_style))
            story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#8E9199'), spaceBefore=1, spaceAfter=8))
        else:
            is_bullet = p.style.name.startswith("List") or text.startswith("-") or text.startswith("•") or text.startswith("*")
            if is_bullet:
                bullet_text = text.lstrip("-•* ").strip()
                story.append(Paragraph(f"&bull; {bullet_text}", bullet_style))
            else:
                story.append(Paragraph(text, body_style))
                
    pdf_doc.build(story)

def generate_cover_letter_pdf(text: str, pdf_path: str):
    """
    Renders cover letter text into a beautifully formatted PDF document.
    """
    pdf_doc = SimpleDocTemplate(
        pdf_path,
        pagesize=letter,
        rightMargin=54,
        leftMargin=54,
        topMargin=54,
        bottomMargin=54
    )
    
    styles = getSampleStyleSheet()
    
    body_style = ParagraphStyle(
        'CoverLetterBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10.5,
        leading=15,
        textColor=colors.HexColor('#2A2B30'),
        spaceAfter=10
    )
    
    story = []
    
    paragraphs = text.split("\n")
    for p_text in paragraphs:
        p_text = p_text.strip()
        if p_text:
            story.append(Paragraph(p_text, body_style))
        else:
            story.append(Spacer(1, 6))
            
    pdf_doc.build(story)
