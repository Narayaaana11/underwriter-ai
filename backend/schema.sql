-- =============================================================================
-- UNDERWRITER AI SYSTEM — MICROSOFT SQL SERVER SCHEMA (schema.sql)
-- =============================================================================

IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = N'UnderwriterDB')
BEGIN
    CREATE DATABASE [UnderwriterDB];
END
GO

USE [UnderwriterDB];
GO

-- 1. Users Table
IF OBJECT_ID(N'dbo.Users', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Users (
        Id VARCHAR(50) PRIMARY KEY,
        Name NVARCHAR(100) NOT NULL,
        Email NVARCHAR(150) NOT NULL UNIQUE,
        Role VARCHAR(30) NOT NULL CHECK (Role IN ('underwriter', 'senior_underwriter', 'claimant', 'admin')),
        Company NVARCHAR(100) NULL,
        Specialty NVARCHAR(100) NULL,
        PasswordHash NVARCHAR(255) NOT NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME()
    );
END
GO

-- 2. Policies Master Table (Claimant & Coverage Baseline Data)
IF OBJECT_ID(N'dbo.Policies', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Policies (
        PolicyNumber VARCHAR(50) PRIMARY KEY,
        ClaimantName NVARCHAR(100) NOT NULL,
        ClaimantEmail NVARCHAR(150) NULL,
        ContactNumber VARCHAR(30) NULL,
        PolicyType VARCHAR(30) NOT NULL CHECK (PolicyType IN ('Health', 'Motor', 'Life', 'Travel', 'Property')),
        PolicyCompany NVARCHAR(100) NOT NULL,
        SumInsured DECIMAL(18,2) NOT NULL,
        PolicyStartDate DATE NOT NULL,
        PolicyEndDate DATE NOT NULL,
        PreExistingConditions NVARCHAR(MAX) NULL,
        DeductibleAmount DECIMAL(18,2) DEFAULT 0.00,
        CopayPercentage DECIMAL(5,2) DEFAULT 0.00,
        Status VARCHAR(20) DEFAULT 'Active' CHECK (Status IN ('Active', 'Lapsed', 'Cancelled', 'Suspended')),
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME()
    );
END
GO

-- 3. Claims Table
IF OBJECT_ID(N'dbo.Claims', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Claims (
        Id VARCHAR(50) PRIMARY KEY,
        PolicyNumber VARCHAR(50) NOT NULL FOREIGN KEY REFERENCES dbo.Policies(PolicyNumber),
        ClaimantName NVARCHAR(100) NOT NULL,
        PolicyType VARCHAR(30) NOT NULL,
        PolicyCompany NVARCHAR(100) NULL,
        SumInsured DECIMAL(18,2) NOT NULL,
        PolicyStartDate DATE NOT NULL,
        IncidentDate DATE NOT NULL,
        ClaimAmount DECIMAL(18,2) NOT NULL,
        ReserveAmount DECIMAL(18,2) NOT NULL,
        ContactNumber VARCHAR(30) NULL,
        Description NVARCHAR(MAX) NULL,
        Status VARCHAR(30) NOT NULL DEFAULT 'submitted' CHECK (Status IN ('submitted', 'review', 'approved', 'rejected', 'escalated', 'info_requested')),
        RiskScore INT DEFAULT 0,
        FraudDetectorScore INT NULL,
        AiSummary NVARCHAR(MAX) NULL,
        AiRecommendation NVARCHAR(100) NULL,
        AiReasoning NVARCHAR(MAX) NULL,
        CitedClause NVARCHAR(255) NULL,
        AiConfidenceScore VARCHAR(10) NULL,
        AssignedUnderwriterId VARCHAR(50) NULL FOREIGN KEY REFERENCES dbo.Users(Id),
        AssignedUnderwriterName NVARCHAR(100) NULL,
        SubmittedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        DecidedAt DATETIME2 NULL,
        DecidedBy NVARCHAR(100) NULL
    );
END
GO

-- 4. Claim Documents Table (S3 Storage References)
IF OBJECT_ID(N'dbo.ClaimDocuments', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ClaimDocuments (
        Id VARCHAR(50) PRIMARY KEY,
        ClaimId VARCHAR(50) NOT NULL FOREIGN KEY REFERENCES dbo.Claims(Id) ON DELETE CASCADE,
        Name NVARCHAR(255) NOT NULL,
        DocumentType NVARCHAR(50) NOT NULL,
        S3Bucket VARCHAR(100) NOT NULL DEFAULT 'underwriter-ai',
        S3Key NVARCHAR(500) NOT NULL,
        KmsEncrypted BIT NOT NULL DEFAULT 1,
        ExtractedFieldsJson NVARCHAR(MAX) NULL,
        UploadedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME()
    );
END
GO

-- 5. Audit Trail Table
IF OBJECT_ID(N'dbo.AuditTrail', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.AuditTrail (
        EventId VARCHAR(50) PRIMARY KEY,
        ClaimId VARCHAR(50) NOT NULL FOREIGN KEY REFERENCES dbo.Claims(Id) ON DELETE CASCADE,
        Action VARCHAR(100) NOT NULL,
        Actor NVARCHAR(150) NOT NULL,
        Details NVARCHAR(MAX) NULL,
        Timestamp DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        AwsRegion VARCHAR(30) DEFAULT 'us-east-1',
        IpAddress VARCHAR(50) NULL
    );
END
GO

-- Indexes
CREATE INDEX IX_Claims_PolicyNumber ON dbo.Claims(PolicyNumber);
CREATE INDEX IX_Claims_Status ON dbo.Claims(Status);
CREATE INDEX IX_ClaimDocuments_ClaimId ON dbo.ClaimDocuments(ClaimId);
CREATE INDEX IX_AuditTrail_ClaimId ON dbo.AuditTrail(ClaimId);
GO
