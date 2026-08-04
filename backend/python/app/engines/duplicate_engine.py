"""
duplicate_engine.py — PySpark Window Function Duplicate Invoice Detector
"""
from typing import List, Dict, Any
from .spark_session import get_spark_session

def detect_duplicate_invoices(claims: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Uses PySpark Window Partitioning to detect duplicate invoice numbers across claims.
    """
    spark = get_spark_session()
    
    # Python fallback if PySpark environment is unavailable
    if spark is None or not claims:
        return _python_fallback_duplicates(claims)

    try:
        from pyspark.sql import functions as F
        from pyspark.sql.window import Window

        # Extract invoice numbers from claims
        invoice_rows = []
        for c in claims:
            cid = c.get("id")
            cname = c.get("claimantName")
            pol = c.get("policyNumber")
            
            # Check OCR invoice number or documents
            ocr_inv = (c.get("ocrData") or {}).get("invoiceNumber")
            if ocr_inv:
                invoice_rows.append({"claimId": cid, "claimantName": cname, "policyNumber": pol, "invoiceNumber": str(ocr_inv).strip()})
            
            # Check attached invoice files
            for doc in c.get("documents") or []:
                d_inv = doc.get("invoiceNumber")
                if d_inv:
                    invoice_rows.append({"claimId": cid, "claimantName": cname, "policyNumber": pol, "invoiceNumber": str(d_inv).strip()})

        if not invoice_rows:
            return {"totalDuplicates": 0, "data": []}

        df = spark.createDataFrame(invoice_rows)
        window_spec = Window.partitionBy("invoiceNumber")
        
        df_dups = df.withColumn("count", F.count("invoiceNumber").over(window_spec)).filter(F.col("count") > 1)
        
        results_pd = df_dups.toPandas() if hasattr(df_dups, "toPandas") else None
        if results_pd is None or results_pd.empty:
            return {"totalDuplicates": 0, "data": []}

        groups = {}
        for _, row in results_pd.iterrows():
            inv = row["invoiceNumber"]
            if inv not in groups:
                groups[inv] = {"invoiceNumber": inv, "count": int(row["count"]), "claims": []}
            groups[inv]["claims"].append({"claimId": row["claimId"], "claimantName": row["claimantName"], "policyNumber": row["policyNumber"]})

        data_list = list(groups.values())
        return {
            "totalDuplicates": len(data_list),
            "data": data_list
        }

    except Exception as e:
        print(f"[PySpark Duplicate Detector Warning]: {e}")
        return _python_fallback_duplicates(claims)


def _python_fallback_duplicates(claims: List[Dict[str, Any]]) -> Dict[str, Any]:
    invoice_map = {}
    for c in claims:
        cid = c.get("id")
        cname = c.get("claimantName")
        pol = c.get("policyNumber")

        ocr_inv = (c.get("ocrData") or {}).get("invoiceNumber")
        if ocr_inv:
            inv = str(ocr_inv).strip()
            if inv not in invoice_map:
                invoice_map[inv] = []
            invoice_map[inv].append({"claimId": cid, "claimantName": cname, "policyNumber": pol})

    duplicates = []
    for inv, clist in invoice_map.items():
        if len(clist) > 1:
            duplicates.append({
                "invoiceNumber": inv,
                "count": len(clist),
                "claims": clist
            })

    return {
        "totalDuplicates": len(duplicates),
        "data": duplicates
    }
