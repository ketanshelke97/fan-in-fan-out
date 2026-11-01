import os
import random
from pathlib import Path
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak


ORGANIZATIONS = [
    "Department of Justice", "Federal Trade Commission", "Acme Corporation",
    "Consolidated Global Industries", "Apex Financial Group", "BioTech Innovations Inc",
    "Vertex Cloud Systems", "OmniCorp International"
]

STATUTES = [
    ("Title 15 U.S.C. Section 1", "Sherman Antitrust Act - Restraint of Trade", "$100,000,000"),
    ("Title 18 U.S.C. Section 1001", "False Statements to Government Agencies", "$250,000"),
    ("Title 17 C.F.R. Section 240", "Securities Exchange Act Compliance", "$500,000"),
    ("GDPR Article 83", "Administrative Fines for Data Processing Violations", "€20,000,000"),
    ("Sarbanes-Oxley Section 404", "Internal Control Assessment Deficiencies", "$1,000,000")
]

CATEGORIES = ["Legal Filing", "Financial Audit", "Research Publication", "Regulatory Compliance Review"]


def generate_single_pdf(file_path: Path, doc_id: int):
    doc = SimpleDocTemplate(str(file_path), pagesize=letter, rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40)
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontSize=18,
        leading=22,
        textColor=colors.HexColor('#1E293B'),
        spaceAfter=12
    )
    h2_style = ParagraphStyle(
        'DocH2',
        parent=styles['Heading2'],
        fontSize=13,
        leading=16,
        textColor=colors.HexColor('#334155'),
        spaceBefore=10,
        spaceAfter=6
    )
    body_style = ParagraphStyle(
        'DocBody',
        parent=styles['Normal'],
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#475569')
    )

    category = CATEGORIES[doc_id % len(CATEGORIES)]
    org = ORGANIZATIONS[doc_id % len(ORGANIZATIONS)]
    date_str = f"2026-11-{10 + (doc_id % 18):02d}"
    pages_to_create = 2 if doc_id % 3 == 0 else 1

    story = []

    # Header section
    story.append(Paragraph(f"PROJECT ANTIGRAVITY | {category.upper()}", h2_style))
    story.append(Paragraph(f"Case Dossier #{doc_id:04d}: In Re {org}", title_style))
    story.append(Paragraph(f"<b>Filing Date:</b> {date_str} &nbsp;|&nbsp; <b>Jurisdiction:</b> High Court Appellate Division &nbsp;|&nbsp; <b>Status:</b> Under Review", body_style))
    story.append(Spacer(1, 14))

    # Executive Summary Paragraph
    summary_text = (
        f"This document represents an official {category.lower()} for <b>{org}</b>. "
        f"Pursuant to statutory regulatory mandates enacted on {date_str}, an exhaustive operational audit was conducted. "
        "The findings compiled below indicate strict structural compliance across internal operations, capital allocation, and transactional accounting. "
        "All key-value pairs, structured matrices, and relational tables must be verified by the serverless extraction pipeline."
    )
    story.append(Paragraph("1. Executive Summary & Legal Predicate", h2_style))
    story.append(Paragraph(summary_text, body_style))
    story.append(Spacer(1, 12))

    # Structured Data Table
    story.append(Paragraph("2. Financial Disclosures & Regulatory Impact Matrix", h2_style))
    table_data = [
        ["Statute Reference", "Regulatory Description", "Statutory Cap", "Risk Score"]
    ]
    for i in range(3):
        statute = STATUTES[(doc_id + i) % len(STATUTES)]
        risk_score = f"{70 + ((doc_id * 7 + i * 5) % 28)}/100"
        table_data.append([statute[0], statute[1], statute[2], risk_score])

    t = Table(table_data, colWidths=[130, 220, 100, 70])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0F172A')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
        ('TOPPADDING', (0, 0), (-1, 0), 6),
        ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#F8FAFC')),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
        ('FONTSIZE', (0, 1), (-1, -1), 8),
        ('ALIGN', (2, 1), (3, -1), 'CENTER'),
    ]))
    story.append(t)
    story.append(Spacer(1, 14))

    # Multi-page content if pages_to_create > 1
    if pages_to_create > 1:
        story.append(PageBreak())
        story.append(Paragraph("3. Addendum & Relational Clause Verification", h2_style))
        story.append(Paragraph(
            f"Continuation sheet for Case Dossier #{doc_id:04d}. The audited entities at {org} have submitted supplementary affidavits. "
            f"The total evaluated assets under consideration equal ${100_000 * (doc_id + 1):,}.00 USD. "
            "Verification protocols require zero data loss during cloud fan-in aggregation.",
            body_style
        ))

    doc.build(story)


def generate_benchmark_corpus(output_dir: Path, count: int = 25):
    output_dir.mkdir(parents=True, exist_ok=True)
    print(f"[Benchmark] Generating {count} realistic multi-page PDF documents in: {output_dir}")
    for i in range(1, count + 1):
        filename = f"sample_doc_{i:02d}.pdf"
        target_path = output_dir / filename
        generate_single_pdf(target_path, i)
    print(f"[Benchmark] Successfully created {count} test PDFs.")


if __name__ == "__main__":
    target = Path(__file__).resolve().parent / "sample_docs"
    generate_benchmark_corpus(target, count=25)
