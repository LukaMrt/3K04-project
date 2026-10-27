"""Wraps every Markdown table whose first column only holds short values (identifiers such
as FR-COM-01 or D-20) in <div class="short-first-col">, so that pdf.css keeps that column
on one line. Tables whose first column holds long text are left to wrap.
Usage: python3 mark-id-tables.py <file.md>   (the file is rewritten in place)"""
import sys

MAX_LENGTH = 30

def first_cell(row):
    return row.strip().strip('|').split('|')[0].strip()

def is_separator(row):
    return set(row.replace('|', '').strip()) <= set('-: ')

def short_first_column(table):
    return all(len(first_cell(row)) <= MAX_LENGTH for row in table if not is_separator(row))

path = sys.argv[1]
lines = open(path, encoding='utf-8').read().split('\n')
out, table, in_code = [], [], False

def flush():
    if table and short_first_column(table):
        out.extend(['<div class="short-first-col">', '', *table, '', '</div>'])
    else:
        out.extend(table)
    table.clear()

for line in lines:
    if line.lstrip().startswith('```'):
        in_code = not in_code
    if not in_code and line.lstrip().startswith('|'):
        table.append(line)
        continue
    flush()
    out.append(line)
flush()
open(path, 'w', encoding='utf-8').write('\n'.join(out))
