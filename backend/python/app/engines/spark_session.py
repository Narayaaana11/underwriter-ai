"""
spark_session.py — PySpark Singleton Session Manager
"""
import os
import sys
import shutil

_spark_instance = None

def get_spark_session():
    global _spark_instance
    if _spark_instance is not None:
        return _spark_instance

    # 1. Check if Java runtime (java.exe) exists on system PATH
    java_cmd = shutil.which("java")
    if not java_cmd and not os.environ.get("JAVA_HOME"):
        print("[PySpark Engine Note]: Java JVM runtime not detected on PATH. Running in high-performance Python engine mode.")
        return None

    # 2. Attempt PySpark initialization with exception protection
    try:
        os.environ["PYSPARK_PYTHON"] = sys.executable
        os.environ["PYSPARK_DRIVER_PYTHON"] = sys.executable

        import pyspark
        os.environ["SPARK_HOME"] = os.path.dirname(pyspark.__file__)

        from pyspark.sql import SparkSession

        _spark_instance = (
            SparkSession.builder
            .appName("UnderWriterAIPySpark")
            .master("local[1]")
            .config("spark.driver.host", "127.0.0.1")
            .config("spark.sql.shuffle.partitions", "2")
            .config("spark.ui.enabled", "false")
            .getOrCreate()
        )
        _spark_instance.sparkContext.setLogLevel("ERROR")
        print(f"[PySpark Engine] Successfully initialized PySpark {_spark_instance.version} Session.")
        return _spark_instance
    except Exception as e:
        print(f"[PySpark Engine Note]: Running in high-performance Python engine mode ({e})")
        return None
