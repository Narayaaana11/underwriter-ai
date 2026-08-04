import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

OUT_DIR = r"c:\Users\naray\OneDrive\Desktop\Underwriter agent\sample_upload_files"
os.makedirs(OUT_DIR, exist_ok=True)

styles = getSampleStyleSheet()

# 1. Hospital Discharge Summary PDF
def create_discharge_summary():
    pdf_path = os.path.join(OUT_DIR, "Hospital_Discharge_Summary_Meena_Chowdhury.pdf")
    doc = SimpleDocTemplate(pdf_path, pagesize=letter)
    story = []

    title_style = ParagraphStyle('Title', parent=styles['Heading1'], fontSize=18, textColor=colors.HexColor("#14213D"), spaceAfter=12)
    h2_style = ParagraphStyle('Heading2', parent=styles['Heading2'], fontSize=12, textColor=colors.HexColor("#C8862A"), spaceAfter=6)
    body_style = ParagraphStyle('Body', parent=styles['Normal'], fontSize=10, leading=14, spaceAfter=8)

    story.append(Paragraph("APOLLO MULTISPECIALTY HOSPITAL", title_style))
    story.append(Paragraph("<b>DEPARTMENT OF INTERNAL MEDICINE — DISCHARGE SUMMARY</b>", h2_style))
    story.append(Spacer(1, 10))

    data = [
        ["Patient Name:", "Meena Chowdhury", "Age / Gender:", "62 / Female"],
        ["Policy Number:", "POL-77002", "Claimant ID:", "CLM-002"],
        ["Admission Date:", "16-Feb-2024", "Discharge Date:", "20-Feb-2024"],
        ["Attending Doctor:", "Dr. Elena Vasquez, MD", "Room No / Ward:", "Ward 402 (Deluxe Inpatient)"]
    ]
    t = Table(data, colWidths=[110, 160, 110, 160])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F7F6F1")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#D1E7DD")),
        ('FONTNAME', (0,0), (-1,-1), 'Helvetica'),
        ('FONTSIZE', (0,0), (-1,-1), 9),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('TOPPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t)
    story.append(Spacer(1, 15))

    story.append(Paragraph("<b>Primary Diagnosis (ICD-10):</b> E11.9 — Type 2 Diabetes Mellitus without complications", body_style))
    story.append(Paragraph("<b>Procedure / Treatment:</b> Insulin stabilization & glycemic monitoring protocol", body_style))
    story.append(Spacer(1, 8))

    story.append(Paragraph("<b>Clinical Summary & Treatment Notes:</b>", h2_style))
    story.append(Paragraph("Patient presented with elevated fasting blood glucose levels (280 mg/dL) and fatigue. Admitted for intensive glycemic control, intravenous fluid resuscitation, and insulin regimen titration under supervision of Dr. Elena Vasquez. Patient responded favorably to subcutaneous insulin protocol. Post-procedure recovery was uneventful. Discharged in stable condition with ambulatory follow-up advised in 1 week.", body_style))
    story.append(Spacer(1, 15))

    story.append(Paragraph("<b>Doctor Signature:</b> <i>Dr. Elena Vasquez, MD (Reg # 84920)</i>", body_style))

    doc.build(story)
    print(f"Created PDF: {pdf_path}")

# 2. Itemized Medical Bill PDF
def create_medical_bill():
    pdf_path = os.path.join(OUT_DIR, "Final_Itemized_Hospital_Bill_INV20002.pdf")
    doc = SimpleDocTemplate(pdf_path, pagesize=letter)
    story = []

    title_style = ParagraphStyle('Title', parent=styles['Heading1'], fontSize=18, textColor=colors.HexColor("#14213D"), spaceAfter=12)
    h2_style = ParagraphStyle('Heading2', parent=styles['Heading2'], fontSize=12, textColor=colors.HexColor("#C8862A"), spaceAfter=6)

    story.append(Paragraph("APOLLO MULTISPECIALTY HOSPITAL", title_style))
    story.append(Paragraph("<b>FINAL ITEMIZED MEDICAL BILL & TAX INVOICE</b>", h2_style))
    story.append(Spacer(1, 10))

    meta_data = [
        ["Invoice No:", "INV-20002", "Invoice Date:", "20-Feb-2024"],
        ["Patient Name:", "Meena Chowdhury", "Policy No:", "POL-77002"]
    ]
    t_meta = Table(meta_data, colWidths=[100, 170, 100, 170])
    t_meta.setStyle(TableStyle([
        ('FONTNAME', (0,0), (-1,-1), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,-1), 9),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(t_meta)
    story.append(Spacer(1, 15))

    line_items = [
        ["Description", "Qty / Days", "Rate (INR)", "Amount (INR)"],
        ["Deluxe Room Rent", "4 days", "15,000.00", "60,000.00"],
        ["ICU Monitoring Charge", "1 day", "25,000.00", "25,000.00"],
        ["Consultation Fee (Dr. Vasquez)", "4 visits", "3,000.00", "12,000.00"],
        ["Pharmacy & Insulin Supplies", "Lump sum", "14,500.00", "14,500.00"],
        ["Lab & Diagnostic Tests", "Lump sum", "8,000.00", "8,000.00"],
        ["Subtotal", "", "", "1,19,500.00"],
        ["Tax (GST 5%)", "", "", "5,975.00"],
        ["GRAND TOTAL BILLED", "", "", "Rs. 1,25,475.00"]
    ]
    t_bill = Table(line_items, colWidths=[240, 90, 100, 110])
    t_bill.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#14213D")),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CCCCCC")),
        ('BACKGROUND', (0,-1), (-1,-1), colors.HexColor("#F7F6F1")),
        ('FONTNAME', (0,-1), (-1,-1), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('TOPPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t_bill)
    story.append(Spacer(1, 20))
    story.append(Paragraph("<b>Payment Status:</b> Pending Insured Reimbursement", h2_style))

    doc.build(story)
    print(f"Created PDF: {pdf_path}")

# 3. Aadhaar ID Proof PDF
def create_id_proof():
    pdf_path = os.path.join(OUT_DIR, "Aadhaar_Identity_Proof_Meena_Chowdhury.pdf")
    doc = SimpleDocTemplate(pdf_path, pagesize=letter)
    story = []

    title_style = ParagraphStyle('Title', parent=styles['Heading1'], fontSize=16, textColor=colors.HexColor("#14213D"), spaceAfter=12)

    story.append(Paragraph("GOVERNMENT OF INDIA — UNIQUE IDENTIFICATION AUTHORITY", title_style))
    story.append(Paragraph("<b>AADHAAR IDENTITY VERIFICATION CARD</b>", styles['Heading2']))
    story.append(Spacer(1, 15))

    id_data = [
        ["Full Name:", "Meena Chowdhury"],
        ["Aadhaar Number:", "1711 8527 9785"],
        ["Date of Birth:", "26/01/1962"],
        ["Gender:", "Female"],
        ["Address:", "566 Lake Rd, Pune, Maharashtra 411001"]
    ]
    t_id = Table(id_data, colWidths=[140, 320])
    t_id.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F7F6F1")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CCCCCC")),
        ('FONTNAME', (0,0), (-1,-1), 'Helvetica'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('TOPPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(t_id)

    doc.build(story)
    print(f"Created PDF: {pdf_path}")

create_discharge_summary()
create_medical_bill()
create_id_proof()
print("🎉 Sample test files successfully generated!")
