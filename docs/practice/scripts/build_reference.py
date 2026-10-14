"""Build reference.mjs, the Python and pandas reference of the practice site.

The entries are written here. Each has a short example, and this script runs every example in real
Python on the practice data and stores what it prints, so the output shown to students is real.

Run from the repository:
    uv run python docs/practice/scripts/build_reference.py           writes docs/practice/reference.mjs
    uv run python docs/practice/scripts/build_reference.py --check   fails if reference.mjs is out of date
"""
import ast
import contextlib
import io
import json
import os
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
PRACTICE = os.path.dirname(HERE)
TARGET = os.path.join(PRACTICE, "reference.mjs")


def E(id, code, does, week, skill, example, setup="none", **more):
    """One entry. setup names the data that is loaded before the example (see drillSetup in drills.mjs)."""
    return dict(id=id, code=code, does=does, week=week, skill=skill, setup=setup, example=example.strip("\n"), **more)


TEXTS = '''texts = [
    "the bus was late again",
    "the bus is always late",
    "my bike was stolen",
]'''

GROUPS = [
 ("python-basics", "Python basics", [
  E("import", "import pandas as pd", "Load a package and give it a short name.", 1, "import-packages", '''
import pandas as pd
print(pd.__name__)
'''),
  E("assign", "name = value", "Store a value under a name.", 1, "variables-and-assignment", '''
minutes = 18
city = "Berkeley"
print(minutes, city)
'''),
  E("print", "print(x)", "Show a value.", 1, "calling-functions", '''
name = "Ada"
print(name)
print("Rows:", 96)
'''),
  E("arithmetic", "+  -  *  /  //  %  **", "Add, subtract, multiply, divide, divide to a whole number, take the remainder, raise to a power.", 1, "operators", '''
print(7 + 2, 7 - 2, 7 * 2)
print(7 / 2, 7 // 2, 7 % 2)
print(7 ** 2)
'''),
  E("compare", "==  !=  >  >=  <  <=", "Compare two values. The result is True or False.", 1, "operators", '''
minutes = 18
print(minutes == 18, minutes != 18)
print(minutes > 20, minutes <= 18)
'''),
  E("and-or-not", "and, or, not", "Combine True and False values.", 1, "operators", '''
minutes = 18
days = 5
print(minutes > 15 and days > 3)
print(minutes > 60 or days > 3)
print(not minutes > 15)
'''),
  E("len", "len(x)", "Count the items in a list, the characters in text, or the rows in a table.", 1, "calling-functions", '''
print(len([4, 8, 15]))
print(len("Berkeley"))
'''),
  E("type", "type(x)", "Say what kind of value this is.", 1, "basic-data-types", '''
print(type(3))
print(type("3"))
print(type(3.0))
'''),
  E("convert", "str(x), int(x), float(x)", "Turn a value into text, a whole number or a decimal number.", 1, "basic-data-types", '''
print(int("42") + 1)
print(float("3.5") * 2)
print("Week " + str(5))
'''),
  E("round", "round(x, 2)", "Round a number to some decimals, or to a whole number.", 1, "calling-functions", '''
print(round(86.4671, 1))
print(round(86.4671))
'''),
  E("sum-min-max", "sum(xs), min(xs), max(xs)", "Add up a list, or find its smallest or largest item.", 1, "lists-and-indexing", '''
minutes = [18, 13, 16, 25]
print(sum(minutes), min(minutes), max(minutes))
'''),
  E("sorted", "sorted(xs)", "Return the items in order. The original list stays as it was.", 1, "lists-and-indexing", '''
minutes = [18, 13, 25, 16]
print(sorted(minutes))
print(sorted(minutes, reverse=True))
'''),
  E("f-string", 'f"{name} has {n}"', "Put values into text. A colon adds a format, such as two decimals.", 1, "strings", '''
name = "Ada"
n = 3
print(f"{name} has {n} classes")
print(f"{2 / 3:.2f}")
'''),
  E("if", "if / elif / else", "Run code only when a condition is true.", 2, "conditionals", '''
minutes = 35
if minutes < 15:
    print("short")
elif minutes < 45:
    print("medium")
else:
    print("long")
'''),
  E("for", "for item in items:", "Repeat code once for each item.", 2, "for-loops", '''
for mode in ["Walk", "Bike", "Drive"]:
    print(mode, len(mode))
'''),
  E("range", "range(n)", "The numbers 0 to n - 1, for a loop.", 2, "for-loops", '''
for i in range(3):
    print(i)
'''),
  E("def", "def name(x): ... return", "Make your own function. return hands back the result.", 2, "writing-functions", '''
def hours(minutes):
    return minutes / 60

print(hours(90))
'''),
  E("list-comprehension", "[x for x in xs]", "Build a list from another list in one line.", 2, "for-loops", '''
minutes = [18, 13, 25]
print([m / 60 for m in minutes])
print([m for m in minutes if m > 15])
'''),
  E("assert", "assert condition", "Stop with an error if something you expect is not true. Nothing happens when it is true.", 7, "test-your-code", '''
total = 3 + 4
assert total == 7
print("The check passed.")
'''),
 ]),
 ("lists-dictionaries", "Lists and dictionaries", [
  E("index", "xs[0], xs[-1]", "Pick one item by position. Python counts from 0, and -1 is the last item.", 1, "lists-and-indexing", '''
modes = ["Walk", "Bike", "Drive"]
print(modes[0], modes[-1])
'''),
  E("slice", "xs[1:3]", "Take part of a list or of text: from the first position up to, not including, the second.", 1, "lists-and-indexing", '''
modes = ["Walk", "Bike", "Drive", "Remote"]
print(modes[1:3])
print("2026-08-03"[:4])
'''),
  E("append", "xs.append(x)", "Add an item to the end of a list.", 1, "lists-and-indexing", '''
modes = ["Walk", "Bike"]
modes.append("Drive")
print(modes)
'''),
  E("in", "x in xs", "Test whether a list has an item, or text has a piece.", 1, "lists-and-indexing", '''
modes = ["Walk", "Bike"]
print("Bike" in modes, "Drive" in modes)
print("light" in "Streetlights")
'''),
  E("dict-key", 'd["key"]', "Get the value stored under a key, or set it.", 2, "dictionaries-and-keys", '''
work = {"title": "Lost in the Middle", "year": 2024}
print(work["title"])
work["cited_by"] = 1370
print(work)
'''),
  E("dict-get", 'd.get("key")', "Get a value, or None if the key is not there. d[\"key\"] would stop with an error.", 2, "dictionaries-and-keys", '''
work = {"title": "Lost in the Middle", "year": 2024}
print(work.get("year"))
print(work.get("doi"))
'''),
  E("dict-keys-items", "d.keys(), d.items()", "The keys of a dictionary, or its pairs of key and value.", 2, "dictionaries-and-keys", '''
work = {"title": "Lost in the Middle", "year": 2024}
print(list(work.keys()))
for key, value in work.items():
    print(key, "->", value)
'''),
  E("nested", 'data["results"][0]["title"]', "Follow a path through dictionaries and lists, one pair of brackets for each level.", 6, "web-apis", '''
data = {"meta": {"count": 2}, "results": [{"title": "A", "year": 2024}, {"title": "B", "year": 2025}]}
print(data["meta"]["count"])
print(data["results"][1]["title"])
'''),
  E("list-set", "list(x), set(x)", "Make a list, or a set that keeps each different value once.", 2, "data-structures", '''
modes = ["Walk", "Bike", "Walk"]
print(sorted(set(modes)))
print(len(set(modes)))
'''),
 ]),
 ("text", "Text", [
  E("lower-upper", "s.lower(), s.upper()", "Change the case of text.", 1, "strings", '''
print("Graffiti Public".lower())
print("ok".upper())
'''),
  E("strip", "s.strip()", "Remove spaces at both ends.", 1, "strings", '''
print("  Walk ".strip() == "Walk")
'''),
  E("split", 's.split(",")', "Cut text into a list of pieces.", 1, "strings", '''
print("Walk,Bike,Drive".split(","))
print("the bus was late".split())
'''),
  E("replace", 's.replace("a", "b")', "Swap one piece of text for another.", 1, "strings", '''
print("BART + walk".replace(" + ", " and "))
'''),
  E("startswith", 's.startswith("a"), s.endswith("b")', "Test how text begins or ends.", 2, "strings", '''
print("Graffiti Public".startswith("Graffiti"))
print("report.csv".endswith(".csv"))
'''),
  E("join", '", ".join(xs)', "Glue a list of pieces into one text.", 2, "strings", '''
print(", ".join(["Walk", "Bike", "Drive"]))
'''),
  E("str-lower-strip", 'df["col"].str.lower(), .str.strip()', "Change the case, or remove outer spaces, in every value of a column.", 5, "clean-and-document", '''
print(requests["channel"].str.lower().head(3))
''', setup="sf311"),
  E("str-contains", 'df["col"].str.contains("x")', "Test whether each value contains some text. It is case-sensitive unless you add case=False.", 8, "clean-text", '''
has_graffiti = requests["category"].str.contains("Graffiti")
print(has_graffiti.sum())
''', setup="sf311"),
  E("str-len", 'df["col"].str.len()', "The number of characters in each value.", 8, "clean-text", '''
print(requests["category"].str.len().head(3))
''', setup="sf311"),
  E("str-replace", 'df["col"].str.replace("a", "b")', "Swap text in every value of a column.", 8, "clean-text", '''
print(requests["category"].str.replace(" and ", " & ").head(3))
''', setup="sf311"),
  E("re-sub", 're.sub(pattern, "", s)', "Remove or replace every piece of text that matches a pattern.", 8, "clean-text", r'''
import re
text = "Bus 51B was 20 minutes late!!"
print(re.sub(r"[^a-z ]", "", text.lower()))
'''),
 ]),
 ("load-save", "Load and save data", [
  E("read-csv", "pd.read_csv(path)", "Load a CSV file as a table (a DataFrame).", 1, "load-tabular-data", '''
commute = pd.read_csv("commute.csv")
print(commute.shape)
''', setup="commute"),
  E("read-csv-dtype", 'pd.read_csv(path, dtype={"id": str})', "Load a file and keep an ID column as text, so that leading zeros and long numbers stay intact.", 2, "load-tabular-data", '''
requests = pd.read_csv("sf311_requests.csv", dtype={"request_id": str})
print(requests["request_id"].head(2))
''', setup="sf311"),
  E("dataframe", "pd.DataFrame(rows)", "Make a table from a list of dictionaries: one dictionary for each row.", 2, "data-structures", '''
rows = [{"title": "A", "year": 2024}, {"title": "B", "year": 2025}]
print(pd.DataFrame(rows))
''', setup="commute"),
  E("to-csv", "df.to_csv(path, index=False)", "Save a table as a CSV file. index=False leaves out the row numbers.", 4, "other-file-formats", '''
walkers = commute[commute["commute_mode"] == "Walk"]
walkers.to_csv("walkers.csv", index=False)
print(pd.read_csv("walkers.csv").shape)
''', setup="commute"),
  E("read-json", "pd.read_json(path)", "Load a JSON file as a table. Give dtype for ID columns here too.", 5, "csv-and-json", '''
import io
text = '[{"case_id": "0042", "minutes": 30}, {"case_id": "0117", "minutes": 12}]'
print(pd.read_json(io.StringIO(text), dtype={"case_id": str}))
''', setup="commute"),
  E("with-open", "with open(name) as f:", 'Open a file and close it afterwards. Add "w" to write to it.', 6, "web-apis", '''
with open("note.txt", "w") as f:
    f.write("saved on Monday")
with open("note.txt") as f:
    print(f.read())
'''),
  E("json-load-dump", "json.load(f), json.dump(data, f)", "Read JSON from a file into dictionaries and lists, or write them to a file.", 6, "web-apis", '''
import json
data = {"meta": {"count": 2}, "results": ["A", "B"]}
with open("reply.json", "w") as f:
    json.dump(data, f)
with open("reply.json") as f:
    print(json.load(f)["meta"])
'''),
  E("read-excel", "pd.read_excel(path)", "Load a spreadsheet. skiprows leaves out title rows above the header.", 7, "messy-spreadsheets", '''
table = pd.read_excel("budget.xlsx", sheet_name="2026", skiprows=2)
''', run=False, note="This needs a spreadsheet file, so it is not run here."),
 ]),
 ("look", "Look at a table", [
  E("head-tail", "df.head(), df.tail()", "The first or last rows. A number in the brackets says how many.", 2, "inspect-a-dataframe", '''
print(commute[["program", "commute_mode", "days_on_campus"]].head(3))
''', setup="commute"),
  E("shape", "df.shape", "The number of rows and of columns.", 2, "inspect-a-dataframe", '''
print(commute.shape)
print(len(commute))
''', setup="commute"),
  E("columns", "df.columns", "The column names.", 2, "inspect-a-dataframe", '''
print(list(commute.columns))
''', setup="commute"),
  E("dtypes", "df.dtypes", "The type of each column. object means text.", 2, "inspect-a-dataframe", '''
print(commute[["program", "days_on_campus", "wellbeing_score"]].dtypes)
''', setup="commute"),
  E("describe", "df.describe()", "Count, mean, smallest, largest and quartiles of each number column.", 2, "inspect-a-dataframe", '''
print(commute["commute_minutes_one_way"].describe())
''', setup="commute"),
  E("unique", 'df["col"].unique()', "Each different value, once. A missing value is one of them.", 2, "inspect-a-dataframe", '''
print(requests["channel"].unique())
''', setup="sf311"),
  E("nunique", 'df["col"].nunique()', "How many different values there are, not counting missing ones.", 2, "inspect-a-dataframe", '''
print(requests["category"].nunique())
''', setup="sf311"),
  E("value-counts", 'df["col"].value_counts()', "How often each value appears, most common first.", 2, "sort-and-count", '''
print(commute["commute_mode"].value_counts())
''', setup="commute"),
  E("value-counts-normalize", ".value_counts(normalize=True)", "The same as shares that add up to 1.", 2, "sort-and-count", '''
print(commute["commute_mode"].value_counts(normalize=True).round(2))
''', setup="commute"),
  E("is-unique", 'df["id"].is_unique', "True if no value repeats. Use it to check a key column.", 5, "explore-a-new-dataset", '''
print(requests["request_id"].is_unique)
print(len(requests), requests["request_id"].nunique())
''', setup="sf311"),
  E("duplicated", 'df["id"].duplicated()', "True for each value that repeats an earlier one.", 5, "explore-a-new-dataset", '''
print(requests["request_id"].duplicated().sum())
''', setup="sf311"),
 ]),
 ("choose", "Choose rows and columns", [
  E("column", 'df["col"], df[["a", "b"]]', "One column, or a table with several. Two pairs of brackets for several.", 2, "select-and-filter", '''
print(commute["commute_mode"].head(2))
print(commute[["program", "commute_mode"]].head(2))
''', setup="commute"),
  E("filter", 'df[df["a"] == "x"]', "Keep the rows that pass a test.", 2, "select-and-filter", '''
walkers = commute[commute["commute_mode"] == "Walk"]
print(len(commute), len(walkers))
''', setup="commute"),
  E("loc", 'df.loc[rows, ["a", "b"]]', "Choose rows and columns in one step.", 4, "select-and-filter", '''
phone = requests.loc[requests["channel"] == "Phone", ["request_id", "category"]]
print(phone.head(3))
''', setup="sf311"),
  E("and-or", "(test1) & (test2), (test1) | (test2)", "Keep rows where both tests pass, or where either one does. Each test needs its own brackets.", 2, "combining-conditions", '''
both = commute[(commute["days_on_campus"] >= 4) & (commute["commute_mode"] == "Bike")]
either = commute[(commute["commute_mode"] == "Bike") | (commute["commute_mode"] == "Walk")]
print(len(both), len(either))
''', setup="commute"),
  E("not", "~(test)", "Turn a test around: keep the rows where it fails.", 2, "combining-conditions", '''
not_remote = commute[~(commute["commute_mode"] == "Remote")]
print(len(commute), len(not_remote))
''', setup="commute"),
  E("isin", 'df["a"].isin(["x", "y"])', "Test whether each value is one of a list.", 2, "combining-conditions", '''
active = commute[commute["commute_mode"].isin(["Walk", "Bike"])]
print(len(active))
''', setup="commute"),
  E("sort-values", 'df.sort_values("a", ascending=False)', "Sort the rows. ascending=False puts the largest first.", 2, "sort-and-count", '''
longest = commute.sort_values("commute_minutes_one_way", ascending=False)
print(longest[["commute_mode", "commute_minutes_one_way"]].head(3))
''', setup="commute"),
  E("copy", "df.copy()", "Make a separate copy before you change a table, so the original stays as it was.", 2, "create-or-modify-columns", '''
walkers = commute[commute["commute_mode"] == "Walk"].copy()
walkers["hours"] = walkers["commute_minutes_one_way"] / 60
print("hours" in walkers.columns, "hours" in commute.columns)
''', setup="commute"),
 ]),
 ("change", "Make or change columns", [
  E("new-column", 'df["new"] = df["a"] * 2', "Add a column, or replace one, from a calculation on other columns.", 2, "create-or-modify-columns", '''
commute["minutes_per_week"] = commute["commute_minutes_one_way"] * 2 * commute["days_on_campus"]
print(commute[["commute_minutes_one_way", "days_on_campus", "minutes_per_week"]].head(3))
''', setup="commute"),
  E("rename", 'df.rename(columns={"old": "new"})', "Rename columns.", 2, "create-or-modify-columns", '''
renamed = commute.rename(columns={"commute_minutes_one_way": "minutes"})
print(list(renamed.columns)[:4])
''', setup="commute"),
  E("apply", 'df["a"].apply(function)', "Run your own function on every value of a column.", 2, "create-or-modify-columns", '''
def length(minutes):
    if minutes < 20:
        return "short"
    return "long"

print(commute["commute_minutes_one_way"].apply(length).value_counts())
''', setup="commute"),
  E("replace-values", 'df["a"].replace({"old": "new"})', "Swap some values for others. Values that are not listed stay as they are.", 5, "clean-and-document", '''
modes = commute["commute_mode"].replace({"BART + walk": "Transit", "AC Transit": "Transit"})
print(modes.value_counts())
''', setup="commute"),
  E("astype", 'df["a"].astype(str)', "Change the type of a column, here from numbers to text.", 5, "convert-data-types", '''
print(commute["days_on_campus"].dtype)
print(commute["days_on_campus"].astype(str).head(2))
''', setup="commute"),
  E("drop", 'df.drop(columns=["a"])', "Remove columns.", 5, "clean-and-document", '''
smaller = commute.drop(columns=["reliable_internet", "wellbeing_score"])
print(commute.shape, smaller.shape)
''', setup="commute"),
  E("drop-duplicates", "df.drop_duplicates()", "Remove rows that repeat an earlier row exactly.", 5, "clean-and-document", '''
print(len(requests), len(requests.drop_duplicates()))
''', setup="sf311"),
 ]),
 ("missing", "Missing values", [
  E("isna", 'df["a"].isna(), .notna()', "True where a value is missing, or where it is not.", 2, "missing-values", '''
print(requests["district"].isna().head(3))
''', setup="sf311"),
  E("isna-sum", 'df["a"].isna().sum()', "Count the missing values in a column. df.isna().sum() counts them in every column.", 2, "missing-values", '''
print(requests["district"].isna().sum())
print(requests[["channel", "district", "hours_to_close"]].isna().sum())
''', setup="sf311"),
  E("dropna", 'df.dropna(subset=["a"])', "Drop the rows where a column is missing.", 2, "missing-values", '''
with_district = requests.dropna(subset=["district"])
print(len(requests), len(with_district))
''', setup="sf311"),
  E("fillna", 'df["a"].fillna(value)', "Put a value in place of the missing ones.", 5, "missing-values", '''
print(requests["channel"].fillna("Not recorded").value_counts())
''', setup="sf311"),
 ]),
 ("summarise", "Summarise and group", [
  E("sum-mean", ".sum(), .mean(), .median()", "Add up a column, or find its average or its middle value. Missing values are left out.", 2, "summaries-and-grouping", '''
minutes = commute["commute_minutes_one_way"]
print(minutes.sum(), round(minutes.mean(), 1), minutes.median())
''', setup="commute"),
  E("min-max-count", ".min(), .max(), .count()", "The smallest and largest value, and the number of values that are not missing.", 2, "summaries-and-grouping", '''
minutes = commute["commute_minutes_one_way"]
print(minutes.min(), minutes.max(), minutes.count(), len(minutes))
''', setup="commute"),
  E("groupby-size", 'df.groupby("a").size()', "Count the rows in each group.", 2, "summaries-and-grouping", '''
print(commute.groupby("program").size())
''', setup="commute"),
  E("groupby-mean", 'df.groupby("a")["b"].mean()', "One summary of a column for each group.", 2, "summaries-and-grouping", '''
print(commute.groupby("program")["commute_minutes_one_way"].mean().round(1))
''', setup="commute"),
  E("agg", '.groupby("a").agg(name=("b", "mean"))', "Several summaries for each group, each with a name you choose.", 2, "summaries-and-grouping", '''
summary = commute.groupby("program").agg(
    people=("respondent_id", "size"),
    mean_minutes=("commute_minutes_one_way", "mean"),
)
print(summary.round(1))
''', setup="commute"),
  E("groupby-dropna", '.groupby("a", dropna=False)', "Keep the group whose key is missing. Without it, pandas leaves those rows out.", 4, "missing-values", '''
print(requests.groupby("channel").size().sum())
print(requests.groupby("channel", dropna=False).size().sum())
''', setup="sf311"),
  E("reset-index", ".reset_index()", "Turn the group labels back into an ordinary column. name= names the count column.", 2, "summaries-and-grouping", '''
counts = commute.groupby("program").size().reset_index(name="people")
print(counts)
''', setup="commute"),
  E("crosstab", 'pd.crosstab(df["a"], df["b"])', "Count every combination of two columns.", 9, "similarity-and-clustering", '''
print(pd.crosstab(requests["status"], requests["channel"]))
''', setup="sf311"),
 ]),
 ("combine", "Combine tables", [
  E("merge", 'left.merge(right, on="key", how="left")', "Add columns from another table by matching a key. how=\"left\" keeps every row of the first table.", 5, "join-tables", '''
joined = requests.merge(districts, on="district", how="left")
print(len(requests), len(joined))
print(joined[["request_id", "district", "district_name"]].head(2))
''', setup="sf311sql", packages=["sqlite3"]),
  E("merge-validate", '.merge(..., validate="many_to_one")', "Stop with an error if a key appears more than once in the second table.", 5, "join-tables", '''
joined = requests.merge(districts, on="district", how="left", validate="many_to_one")
print(joined["district_name"].isna().sum())
''', setup="sf311sql", packages=["sqlite3"]),
  E("merge-indicator", ".merge(..., indicator=True)", "Add a column, _merge, that says whether each row matched.", 5, "join-tables", '''
joined = requests.merge(districts, on="district", how="left", indicator=True)
print(joined["_merge"].value_counts())
''', setup="sf311sql", packages=["sqlite3"]),
  E("concat", "pd.concat([a, b])", "Stack two tables on top of each other.", 5, "data-structures", '''
walk = commute[commute["commute_mode"] == "Walk"]
bike = commute[commute["commute_mode"] == "Bike"]
print(len(walk), len(bike), len(pd.concat([walk, bike])))
''', setup="commute"),
 ]),
 ("types-dates", "Types and dates", [
  E("to-datetime", 'pd.to_datetime(df["a"])', "Turn text into real dates.", 5, "dates-and-times", '''
opened = pd.to_datetime(requests["opened_at"])
print(opened.min(), opened.max())
''', setup="sf311"),
  E("dt", 'df["a"].dt.date, .dt.day_name()', "The day, or the name of the weekday, of each date.", 5, "dates-and-times", '''
opened = pd.to_datetime(requests["opened_at"])
print(opened.dt.day_name().value_counts().head(3))
''', setup="sf311"),
  E("to-numeric", 'pd.to_numeric(df["a"], errors="coerce")', "Turn text into numbers. With errors=\"coerce\", what cannot be read becomes missing.", 5, "convert-data-types", '''
costs = pd.Series(["12.50", "free", "8"])
print(pd.to_numeric(costs, errors="coerce"))
''', setup="commute"),
 ]),
 ("sql", "SQL from Python", [
  E("sqlite-connect", 'sqlite3.connect(":memory:")', "Open a database that lives in memory while the notebook runs.", 5, "sql-basics", '''
import sqlite3
database = sqlite3.connect(":memory:")
print(type(database).__name__)
''', packages=["sqlite3"]),
  E("to-sql", 'df.to_sql("name", database, index=False)', "Copy a table into the database under a name.", 5, "sql-basics", '''
import sqlite3
database = sqlite3.connect(":memory:")
print(commute.to_sql("commute", database, index=False))
''', setup="commute", packages=["sqlite3"]),
  E("read-sql-query", "pd.read_sql_query(query, database)", "Run a SQL query and get the answer back as a table.", 5, "sql-basics", '''
print(pd.read_sql_query("""
    SELECT channel, COUNT(*) AS requests
    FROM requests
    GROUP BY channel
    ORDER BY requests DESC
""", database))
''', setup="sf311sql", packages=["sqlite3"]),
 ]),
 ("web-apis", "Web APIs", [
  E("requests-get", "requests.get(url, params=params, timeout=30)", "Send a request to a web address and wait for the reply.", 6, "web-apis", '''
import requests
params = {"filter": "institutions.id:I95457486,publication_year:2024", "per_page": 5}
response = requests.get("https://api.openalex.org/works", params=params, timeout=30)
print(response.status_code)
''', run=False, output="200\n", note="This sends a real request, so it is not run here. The output is from October 5, 2026."),
  E("status-code", "response.status_code", "200 means the server accepted the request. 404 means the address is wrong, and 429 means too many requests.", 6, "web-apis", '''
import requests
response = requests.get("https://api.openalex.org/worksz", timeout=30)
print(response.status_code)
''', run=False, output="404\n", note="This sends a real request, so it is not run here. The output is from October 5, 2026."),
  E("response-json", "response.json()", "The reply as dictionaries and lists.", 6, "web-apis", '''
data = response.json()
print(list(data.keys()))
print(data["meta"]["count"])
''', run=False, output="['meta', 'results', 'group_by']\n15838\n", note="This continues from a real request, so it is not run here. The output is from October 5, 2026."),
  E("response-text", "response.text", "The reply as plain text. Read it when a request fails: the server usually says why.", 6, "web-apis", '''
import requests
response = requests.get("https://api.openalex.org/works", params={"per_page": 500}, timeout=30)
print(response.status_code)
print(response.text)
''', run=False, output='400\n{"error":"Pagination error.","message":"per-page parameter must be between 1 and 200."}\n', note="This sends a real request, so it is not run here. The output is from October 5, 2026."),
  E("raise-for-status", "response.raise_for_status()", "Stop with an error if the request failed, so a bad reply cannot go unnoticed. Nothing happens when the request worked.", 6, "web-apis", '''
import requests
response = requests.get("https://api.openalex.org/works", params={"per_page": 500}, timeout=30)
response.raise_for_status()
''', run=False, output="requests.exceptions.HTTPError: 400 Client Error: Bad Request for url: https://api.openalex.org/works?per_page=500\n", note="This sends a real request, so it is not run here. The output is from October 5, 2026."),
 ]),
 ("text-analysis", "Text analysis", [
  E("tfidf", "TfidfVectorizer().fit_transform(texts)", "Turn texts into a table of numbers: one row for each text, one column for each word, weighted so that rare words count more.", 8, "word-counts-and-tf-idf", TEXTS + '''
from sklearn.feature_extraction.text import TfidfVectorizer
vectorizer = TfidfVectorizer()
matrix = vectorizer.fit_transform(texts)
print(matrix.shape)
''', packages=["scikit-learn"]),
  E("feature-names", "vectorizer.get_feature_names_out()", "The words behind the columns, in column order.", 8, "word-counts-and-tf-idf", TEXTS + '''
from sklearn.feature_extraction.text import TfidfVectorizer
vectorizer = TfidfVectorizer()
matrix = vectorizer.fit_transform(texts)
print(list(vectorizer.get_feature_names_out()))
''', packages=["scikit-learn"]),
  E("stop-words", 'TfidfVectorizer(stop_words="english")', "Leave out very common English words such as the and is.", 8, "stop-words-and-preprocessing-choices", TEXTS + '''
from sklearn.feature_extraction.text import TfidfVectorizer
vectorizer = TfidfVectorizer(stop_words="english")
vectorizer.fit_transform(texts)
print(list(vectorizer.get_feature_names_out()))
''', packages=["scikit-learn"]),
  E("cosine-similarity", "cosine_similarity(matrix)", "How alike every pair of texts is, from 0 (no words in common) to 1 (the same).", 9, "similarity-and-clustering", TEXTS + '''
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
matrix = TfidfVectorizer().fit_transform(texts)
print(cosine_similarity(matrix).round(2))
''', packages=["scikit-learn"]),
  E("kmeans", "KMeans(n_clusters=2).fit_predict(matrix)", "Sort the texts into groups of similar ones. The result is a group number for each text.", 9, "similarity-and-clustering", TEXTS + '''
from sklearn.cluster import KMeans
from sklearn.feature_extraction.text import TfidfVectorizer
matrix = TfidfVectorizer().fit_transform(texts)
groups = KMeans(n_clusters=2, n_init=10, random_state=0).fit_predict(matrix)
print(len(groups), len(set(groups)))
''', packages=["scikit-learn"]),
  E("fit-predict", "model.fit(X, y), model.predict(X)", "Train a model on examples with known labels, then use it to label texts.", 10, "evaluate-predictions", '''
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
texts = ["late bus", "bus late again", "nice bike ride", "sunny bike ride"]
labels = ["complaint", "complaint", "praise", "praise"]
vectorizer = TfidfVectorizer()
model = LogisticRegression().fit(vectorizer.fit_transform(texts), labels)
print(model.predict(vectorizer.transform(["the bus was late"])))
''', packages=["scikit-learn"]),
  E("accuracy", "(predicted == actual).mean()", "The share of predictions that match the true labels.", 10, "evaluate-predictions", '''
predicted = pd.Series(["YTA", "NTA", "NTA", "YTA"])
actual = pd.Series(["YTA", "NTA", "YTA", "YTA"])
print((predicted == actual).mean())
''', setup="commute"),
  E("generate-content", "client.models.generate_content(model=..., contents=prompt)", "Send a prompt to Gemini and get its reply. The text is in response.text.", 10, "use-an-llm-from-python", '''
from google import genai
client = genai.Client(api_key=api_key)
response = client.models.generate_content(model="gemini-3.5-flash-lite", contents="Say hello in five words.")
print(response.text)
''', run=False, note="This needs your Gemini key, so it is not run here."),
 ]),
]


def practice_data():
    """The setup code and data files of the code drills, so examples run on the same data as in the browser."""
    dump = ("import('./drills.mjs').then(async m => { const d = await import('./drill-data.mjs');"
            " console.log(JSON.stringify({setup: m.drillSetup, files: d.drillFiles})); })")
    return json.loads(subprocess.run(["node", "-e", dump], cwd=PRACTICE, capture_output=True, text=True, check=True).stdout)


def run_example(setup_code, code):
    """Run code the way the browser does: what it prints, then the value of the last line."""
    namespace = {"__name__": "__main__"}
    out = io.StringIO()
    with contextlib.redirect_stdout(out):
        exec(setup_code, namespace)
    out = io.StringIO()
    with contextlib.redirect_stdout(out):
        tree = ast.parse(code)
        last = None
        if tree.body and isinstance(tree.body[-1], ast.Expr):
            last = ast.Expression(tree.body.pop().value)
        exec(compile(tree, "<example>", "exec"), namespace)
        if last is not None:
            value = eval(compile(last, "<example>", "eval"), namespace)
            if value is not None:
                print(repr(value))
    return out.getvalue()


def build():
    data = practice_data()
    start = os.getcwd()
    os.chdir(tempfile.mkdtemp())
    for name, text in data["files"].items():
        with open(name, "w") as f:
            f.write(text)
    groups, seen = [], set()
    try:
        for group_id, title, entries in GROUPS:
            built = []
            for entry in entries:
                entry = dict(entry)
                assert entry["id"] not in seen, entry["id"]
                seen.add(entry["id"])
                entry.setdefault("run", True)
                entry.setdefault("packages", [])
                entry.setdefault("note", "")
                if entry["run"]:
                    try:
                        entry["output"] = run_example(data["setup"][entry["setup"]], entry["example"])
                    except Exception as error:
                        raise SystemExit(f"{entry['id']}: the example failed: {type(error).__name__}: {error}")
                    if not entry["output"].strip():
                        raise SystemExit(f"{entry['id']}: the example prints nothing")
                else:
                    entry.setdefault("output", "")
                built.append(entry)
            groups.append({"id": group_id, "title": title, "entries": built})
    finally:
        os.chdir(start)
    header = ("// The Python and pandas reference: what students write, what it does, and a short example with its real output.\n"
              "// Generated by scripts/build_reference.py. Edit the entries there, then run:\n"
              "//   uv run python docs/practice/scripts/build_reference.py\n"
              "// An entry appears when its week starts (schedule.mjs). skill links it to a skill in catalog.mjs.\n"
              "// setup names the practice data loaded before the example (drillSetup in drills.mjs).\n"
              "// run: false means the example is shown but cannot be run in the browser; note says why.\n")
    return header + "export const referenceGroups=" + json.dumps(groups, ensure_ascii=False, indent=1) + ";\n"


if __name__ == "__main__":
    text = build()
    if "--check" in sys.argv:
        current = open(TARGET).read() if os.path.exists(TARGET) else ""
        if current != text:
            raise SystemExit("reference.mjs is out of date. Run: uv run python docs/practice/scripts/build_reference.py")
        print("reference.mjs is up to date.")
    else:
        with open(TARGET, "w") as f:
            f.write(text)
        entries = sum(len(g["entries"]) for g in json.loads(text.split("referenceGroups=", 1)[1].rstrip(";\n")))
        print(f"Wrote reference.mjs: {entries} entries.")
