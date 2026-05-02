"""
Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
"""

"""
Contact: Swank Canton
Email: chanwan@gmail.com
Website: https://www.github.com/swankchan
Instagram: @clooudycw
"""

"""
Tabular Data Handler for XLSX, XLS, and CSV files.
Implements Text-to-SQL and Pandas-based analysis for structured data.
"""
import os
import sqlite3
import json
import pandas as pd
import numpy as np
from typing import Optional, Dict, Any, List, Tuple
from datetime import datetime

# Load environment variables
from dotenv import load_dotenv
load_dotenv(override=True)


class TabularDataHandler:
    """
    Handles tabular data (XLSX, XLS, CSV) with Text-to-SQL and Pandas analysis.

    Features:
    - Load Excel/CSV files into pandas DataFrames
    - Convert to SQLite database for SQL queries
    - Generate statistical insights using pandas
    - Convert natural language to SQL queries (optional enhancement)
    """

    def __init__(self, collection_name: str):
        """
        Initialize the tabular data handler.

        Args:
            collection_name: Name of the collection (used for DB naming)
        """
        self.collection_name = collection_name.lower()
        self.db_path = os.getenv("APP_DB_PATH", "./rag_app.db")
        self.table_name = f"tabular_{self._sanitize_table_name(collection_name)}"

    def _sanitize_table_name(self, name: str) -> str:
        """Sanitize collection name for use as table name."""
        return ''.join(c if c.isalnum() else '_' for c in name.lower())

    def load_file(self, file_path: str) -> Tuple[pd.DataFrame, Dict[str, Any]]:
        """
        Load an Excel or CSV file into a pandas DataFrame.

        Args:
            file_path: Path to the file (XLSX, XLS, or CSV)

        Returns:
            Tuple of (DataFrame, metadata dict)
        """
        ext = file_path.lower().split('.')[-1]

        if ext in ['xlsx', 'xls']:
            df = pd.read_excel(file_path, engine='openpyxl' if ext == 'xlsx' else 'xlrd')
        elif ext == 'csv':
            df = pd.read_csv(file_path)
        else:
            raise ValueError(f"Unsupported file type: {ext}")

        # Generate metadata
        metadata = {
            'row_count': len(df),
            'column_count': len(df.columns),
            'columns': self._describe_columns(df),
            'loaded_at': datetime.now().isoformat(),
            'source_file': os.path.basename(file_path)
        }

        return df, metadata

    def _describe_columns(self, df: pd.DataFrame) -> Dict[str, Dict[str, Any]]:
        """Describe columns with their types and sample values."""
        columns = {}
        for col in df.columns:
            series = df[col]
            col_type = series.dtype

            # Determine type category
            if pd.api.types.is_numeric_dtype(series):
                type_category = 'numeric'
            elif pd.api.types.is_datetime64_any_dtype(series):
                type_category = 'datetime'
            elif pd.api.types.is_bool_dtype(series):
                type_category = 'boolean'
            else:
                type_category = 'string'

            # Get sample values (up to 3 unique values)
            unique_values = series.dropna().unique()
            sample_values = list(unique_values[:3]) if len(unique_values) <= 10 else list(unique_values[:3])

            # Convert to Python types for JSON serialization
            processed_values = []
            for v in sample_values:
                if isinstance(v, (np.integer, np.int64)):
                    processed_values.append(int(v))
                elif isinstance(v, (np.floating, np.float64)):
                    processed_values.append(float(v))
                elif isinstance(v, (pd.Timestamp, np.datetime64)):
                    processed_values.append(str(v))
                else:
                    processed_values.append(v)

            columns[col] = {
                'type': str(col_type),
                'category': type_category,
                'null_count': int(series.isna().sum()),
                'unique_count': int(series.nunique()),
                'sample_values': processed_values
            }

        return columns

    def create_sqlite_db(self, df: pd.DataFrame, table_name: str) -> sqlite3.Connection:
        """
        Create a SQLite database from a pandas DataFrame.

        Args:
            df: DataFrame to convert
            table_name: Name for the table

        Returns:
            SQLite connection object
        """
        # Create in-memory database
        conn = sqlite3.connect(':memory:')
        conn.row_factory = sqlite3.Row

        # Write DataFrame to SQLite
        df.to_sql(table_name, conn, if_exists='replace', index=False)

        return conn

    def query_sql(self, conn: sqlite3.Connection, sql_query: str) -> List[Dict[str, Any]]:
        """
        Execute an SQL query on the database.

        Args:
            conn: SQLite connection
            sql_query: SQL query string

        Returns:
            List of result rows as dictionaries
        """
        try:
            cursor = conn.execute(sql_query)
            columns = [desc[0] for desc in cursor.description] if cursor.description else []
            rows = cursor.fetchall()

            results = []
            for row in rows:
                results.append(dict(zip(columns, row)))

            return results
        except Exception as e:
            return [{'error': str(e)}]

    def analyze_with_pandas(self, df: pd.DataFrame, analysis_type: str,
                           **kwargs) -> Dict[str, Any]:
        """
        Perform analysis on the DataFrame using pandas.

        Args:
            df: DataFrame to analyze
            analysis_type: Type of analysis ('summary', 'stats', 'trend', 'correlation', etc.)
            **kwargs: Additional parameters for analysis

        Returns:
            Dictionary with analysis results
        """
        if analysis_type == 'summary':
            return self._analyze_summary(df)
        elif analysis_type == 'stats':
            return self._analyze_statistics(df, kwargs.get('columns'))
        elif analysis_type == 'trend':
            return self._analyze_trend(df, kwargs.get('x_column'), kwargs.get('y_column'))
        elif analysis_type == 'correlation':
            return self._analyze_correlation(df)
        elif analysis_type == 'groupby':
            return self._analyze_groupby(df, kwargs.get('group_columns'), kwargs.get('agg_columns'))
        else:
            return {'error': f'Unknown analysis type: {analysis_type}'}

    def _analyze_summary(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Generate a summary of the DataFrame."""
        return {
            'shape': {'rows': df.shape[0], 'columns': df.shape[1]},
            'memory_usage': str(df.memory_usage(deep=True).sum()),
            'dtypes': df.dtypes.astype(str).to_dict(),
            'null_counts': df.isna().sum().astype(int).to_dict(),
            'duplicates': int(df.duplicated().sum())
        }

    def _analyze_statistics(self, df: pd.DataFrame, columns: Optional[List[str]] = None) -> Dict[str, Any]:
        """Generate statistical summary for columns."""
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()

        if columns:
            numeric_cols = [c for c in numeric_cols if c in columns]

        stats = {}
        for col in numeric_cols:
            series = df[col].dropna()
            stats[col] = {
                'count': int(series.count()),
                'mean': float(series.mean()) if len(series) > 0 else None,
                'std': float(series.std()) if len(series) > 0 else None,
                'min': float(series.min()) if len(series) > 0 else None,
                'max': float(series.max()) if len(series) > 0 else None,
                'median': float(series.median()) if len(series) > 0 else None,
                'q1': float(series.quantile(0.25)) if len(series) > 0 else None,
                'q3': float(series.quantile(0.75)) if len(series) > 0 else None,
            }

        return {'numeric_columns': stats}

    def _analyze_trend(self, df: pd.DataFrame, x_column: Optional[str] = None,
                      y_column: Optional[str] = None) -> Dict[str, Any]:
        """Analyze trends in the data."""
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        datetime_cols = df.select_dtypes(include=['datetime64']).columns.tolist()

        # Auto-detect columns if not provided
        if not x_column and datetime_cols:
            x_column = datetime_cols[0]
        elif not x_column and numeric_cols:
            x_column = numeric_cols[0]

        if not y_column and numeric_cols:
            y_column = numeric_cols[-1]

        if not x_column or not y_column:
            return {'error': 'No suitable columns found for trend analysis'}

        # Sort by x column
        sorted_df = df.sort_values(x_column)

        # Calculate trend
        x_values = list(range(len(sorted_df)))
        y_values = sorted_df[y_column].dropna().values

        if len(y_values) < 2:
            return {'error': 'Not enough data points for trend analysis'}

        # Simple linear regression
        x_mean = np.mean(x_values)
        y_mean = np.mean(y_values)

        numerator = np.sum((x_values - x_mean) * (y_values - y_mean))
        denominator = np.sum((x_values - x_mean) ** 2)

        slope = numerator / denominator if denominator != 0 else 0
        intercept = y_mean - slope * x_mean

        # Calculate R-squared
        y_pred = slope * np.array(x_values) + intercept
        ss_res = np.sum((y_values - y_pred) ** 2)
        ss_tot = np.sum((y_values - y_mean) ** 2)
        r_squared = 1 - (ss_res / ss_tot) if ss_tot != 0 else 0

        trend_direction = 'increasing' if slope > 0 else 'decreasing' if slope < 0 else 'stable'

        return {
            'x_column': x_column,
            'y_column': y_column,
            'trend': {
                'direction': trend_direction,
                'slope': float(slope),
                'intercept': float(intercept),
                'r_squared': float(r_squared)
            },
            'first_value': float(y_values[0]) if len(y_values) > 0 else None,
            'last_value': float(y_values[-1]) if len(y_values) > 0 else None,
            'change_percent': float(((y_values[-1] - y_values[0]) / y_values[0] * 100) if y_values[0] != 0 else 0)
        }

    def _analyze_correlation(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Calculate correlation matrix for numeric columns."""
        numeric_df = df.select_dtypes(include=[np.number])

        if len(numeric_df.columns) < 2:
            return {'error': 'Need at least 2 numeric columns for correlation'}

        correlation_matrix = numeric_df.corr().to_dict()

        # Find top correlations
        correlations = []
        cols = numeric_df.columns.tolist()
        for i, col1 in enumerate(cols):
            for col2 in cols[i+1:]:
                corr = correlation_matrix[col1][col2]
                if abs(corr) >= 0.5:  # Only include moderate to strong correlations
                    correlations.append({
                        'column1': col1,
                        'column2': col2,
                        'correlation': float(corr)
                    })

        correlations.sort(key=lambda x: abs(x['correlation']), reverse=True)

        return {
            'correlation_matrix': correlation_matrix,
            'significant_correlations': correlations[:10]  # Top 10
        }

    def _analyze_groupby(self, df: pd.DataFrame, group_columns: Optional[List[str]] = None,
                        agg_columns: Optional[List[str]] = None) -> Dict[str, Any]:
        """Perform groupby analysis."""
        if not group_columns:
            # Use categorical/object columns for grouping
            group_columns = df.select_dtypes(include=['object', 'category']).columns.tolist()[:3]

        if not group_columns:
            return {'error': 'No columns available for grouping'}

        if not agg_columns:
            agg_columns = df.select_dtypes(include=[np.number]).columns.tolist()

        if not agg_columns:
            return {'error': 'No numeric columns available for aggregation'}

        # Perform groupby
        grouped = df.groupby(group_columns)[agg_columns].agg(['mean', 'sum', 'count', 'std'])
        grouped.columns = ['_'.join(col).strip() for col in grouped.columns.values]

        # Convert to dictionary
        results = grouped.to_dict(orient='index')

        return {
            'group_columns': group_columns,
            'agg_columns': agg_columns,
            'results': results,
            'n_groups': len(results)
        }

    def store_metadata(self, filename: str, metadata: Dict[str, Any],
                      conn: Optional[sqlite3.Connection] = None) -> int:
        """
        Store tabular file metadata in the database.

        Args:
            filename: Name of the file
            metadata: Metadata dictionary
            conn: Optional database connection

        Returns:
            ID of the inserted record
        """
        own = conn is None
        if own:
            conn = sqlite3.connect(self.db_path, check_same_thread=False)

        try:
            cur = conn.execute(
                """
                INSERT INTO tabular_files
                (collection_name, filename, table_name, row_count, columns_json, metadata_json, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    self.collection_name,
                    filename,
                    self.table_name,
                    metadata.get('row_count', 0),
                    json.dumps(metadata.get('columns', {})),
                    json.dumps(metadata),
                    datetime.now().timestamp()
                )
            )
            conn.commit()
            return int(cur.lastrowid)
        finally:
            if own:
                conn.close()

    def get_stored_files(self, conn: Optional[sqlite3.Connection] = None) -> List[Dict[str, Any]]:
        """List all stored tabular files for this collection."""
        own = conn is None
        if own:
            conn = sqlite3.connect(self.db_path, check_same_thread=False)

        try:
            cur = conn.execute(
                "SELECT * FROM tabular_files WHERE table_name LIKE ? ORDER BY created_at DESC",
                (f"{self.table_name}%",)
            )
            rows = cur.fetchall()
            # sqlite3.Row objects can be converted to dict
            result = []
            for row in rows:
                row_dict = {}
                for idx, col in enumerate(cur.description):
                    row_dict[col[0]] = row[idx]
                result.append(row_dict)
            return result
        finally:
            if own:
                conn.close()
