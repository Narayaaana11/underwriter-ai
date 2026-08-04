-- Underwriter AI Seed SQL Script for MS SQL Server
USE [UnderwriterDB];
GO

INSERT INTO dbo.Policies (PolicyNumber, ClaimantName, ClaimantEmail, PolicyType, PolicyCompany, SumInsured, PolicyStartDate, PolicyEndDate, PreExistingConditions, DeductibleAmount, CopayPercentage, Status)
VALUES 
('POL-77788', 'Rajesh Kumar', 'rajesh.kumar@example.com', 'Health', 'Star Health & Allied Insurance', 500000.00, '2024-01-15', '2026-01-14', '["Hypertension (Declared 2022)"]', 5000.00, 10.00, 'Active'),
('POL-88213', 'Ananya Sharma', 'ananya.s@example.com', 'Motor', 'ICICI Lombard General Insurance', 800000.00, '2024-06-01', '2025-05-31', '[]', 2000.00, 0.00, 'Active');
GO

INSERT INTO dbo.Claims (Id, PolicyNumber, ClaimantName, PolicyType, PolicyCompany, SumInsured, PolicyStartDate, IncidentDate, ClaimAmount, ReserveAmount, Status, RiskScore, FraudDetectorScore, AiSummary, AiRecommendation, CitedClause, AiConfidenceScore)
VALUES
('CLM-77788-01', 'POL-77788', 'Rajesh Kumar', 'Health', 'Star Health & Allied Insurance', 500000.00, '2024-01-15', '2026-01-20', 125000.00, 125000.00, 'submitted', 15, 12, 'Health claim for ₹1,25,000 under active policy POL-77788.', 'Approve', 'Health Policy Schedule — Clause 4.2', '97.5%');
GO
