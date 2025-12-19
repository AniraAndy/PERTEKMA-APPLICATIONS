import pandas as pd
import re

# Load Excel file
df = pd.read_excel("FULL LISTING PERTEKMA.xlsx")

# Rename columns (based on your file structure)
df.columns = [
    "empty1", "no", "name", "matric", "phone",
    "email", "course", "year", "docLink", "applied"
]

# Remove header row
df = df[df["name"] != "FULL NAME"]

# Drop duplicates by matric number
df = df.drop_duplicates(subset="matric")

# ---------- CLEANING FUNCTIONS ----------

def normalize_phone(phone):
    if pd.isna(phone):
        return ""
    phone = re.sub(r"\D", "", str(phone))  # remove non-digits
    if phone.startswith("6"):
        phone = phone[1:]
    return phone

def clean_email(email, matric):
    if pd.isna(email) or str(email).strip() == "":
        return f"{matric}@siswa.unimas.my"
    return str(email).strip()

def clean_applied(applied):
    if pd.isna(applied):
        return []
    return [x.strip() for x in str(applied).split(",")]

# ---------- APPLY CLEANING ----------

df["phone"] = df["phone"].apply(normalize_phone)
df["email"] = df.apply(lambda r: clean_email(r["email"], r["matric"]), axis=1)
df["year"] = df["year"].astype(str).str.extract(r"\((\d)\)")
df["applied"] = df["applied"].apply(clean_applied)

# ---------- GENERATE JS OBJECTS ----------

js_objects = []

for _, row in df.iterrows():
    js_objects.append(f"""
    {{
        name: "{row['name']}",
        matric: "{row['matric']}",
        phone: "{row['phone']}",
        email: "{row['email']}",
        course: "{row['course']}",
        year: "{row['year']}",
        applied: {row['applied']},
        docLink: "{row['docLink']}",
        isSuggested: false,
        suggested: null
    }}
    """)

js_code = "const applicants = [\n" + ",".join(js_objects) + "\n];"

# Save output
with open("applicants.js", "w", encoding="utf-8") as f:
    f.write(js_code)

print("✅ applicants.js generated successfully")
