import os
import re

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content

    # 1. Remove mssql import
    content = re.sub(r"import\s+\*\s+as\s+sql\s+from\s+['\"]mssql['\"];\s*", "", content)

    # 2. Remove type: sql.Something from params
    content = re.sub(r"type:\s*sql\.[a-zA-Z]+\s*(\([^)]*\))?\s*,?", "", content)

    # 3. Replace ISNULL with COALESCE
    content = re.sub(r"\bISNULL\s*\(", "COALESCE(", content)

    # 4. Replace OUTPUT inserted.* with RETURNING *
    content = re.sub(r"OUTPUT\s+inserted\.\*", "RETURNING *", content, flags=re.IGNORECASE)

    # 5. Replace OFFSET @Offset ROWS FETCH NEXT @Limit ROWS ONLY with LIMIT @Limit OFFSET @Offset
    content = re.sub(r"OFFSET\s+@(\w+)\s+ROWS\s+FETCH\s+NEXT\s+@(\w+)\s+ROWS\s+ONLY", r"LIMIT @\2 OFFSET @\1", content, flags=re.IGNORECASE)

    # 6. Replace TOP 1 with LIMIT 1
    content = re.sub(r"SELECT\s+TOP\s+1\b", "SELECT ", content, flags=re.IGNORECASE)
    # Note: TOP 1 replacement might need LIMIT 1 at the end, which is tricky with regex. We might need manual fixes for TOP.

    # 7. Replace FOR SYSTEM_TIME ALL (Products history)
    # The original query was: SELECT ... FROM Products FOR SYSTEM_TIME ALL WHERE ProductID = @ProductID ORDER BY SysStartTime DESC
    # We change it to query the ProductsHistory table and Products table via UNION ALL.
    # Actually, let's just query ProductsHistory for history.
    content = re.sub(
        r"FROM\s+Products\s+FOR\s+SYSTEM_TIME\s+ALL",
        "FROM (SELECT * FROM Products UNION ALL SELECT * FROM ProductsHistory) as p_all",
        content, flags=re.IGNORECASE
    )

    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {filepath}")

def main():
    src_dir = r"c:\Users\Admin\Desktop\DoAn\backend\src"
    for root, dirs, files in os.walk(src_dir):
        for file in files:
            if file.endswith('.ts'):
                process_file(os.path.join(root, file))

if __name__ == "__main__":
    main()
